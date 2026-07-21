# Mandate #13: Karpenter — provision node theo tải, co xuống, Spot + Graviton.
# IAM controller + node role + SQS interruption queue do submodule lo (Pod Identity).
module "karpenter" {
  source  = "terraform-aws-modules/eks/aws//modules/karpenter"
  version = "~> 21.24"

  cluster_name = module.eks.cluster_name

  # Namespace phải khớp nơi cài helm (mặc định module là kube-system) -> nếu không
  # association lệch namespace, Karpenter không nhận được creds Pod Identity.
  namespace = "karpenter"

  # Karpenter v1 permissions + Pod Identity association cho SA karpenter/karpenter
  enable_v1_permissions           = true
  enable_pod_identity             = true
  create_pod_identity_association = true

  node_iam_role_additional_policies = {
    AmazonSSMManagedInstanceCore = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  }
}

resource "helm_release" "karpenter" {
  namespace        = "karpenter"
  create_namespace = true
  name             = "karpenter"
  repository       = "oci://public.ecr.aws/karpenter"
  chart            = "karpenter"
  version          = "1.0.8"

  values = [yamlencode({
    settings = {
      clusterName       = module.eks.cluster_name
      interruptionQueue = module.karpenter.queue_name
    }
    controller = {
      resources = {
        requests = { cpu = "200m", memory = "256Mi" }
        limits   = { memory = "512Mi" }
      }
    }
    replicas = 1
  })]

  depends_on = [module.eks, module.karpenter]
}

output "karpenter_node_role_name" {
  value = module.karpenter.node_iam_role_name
}
