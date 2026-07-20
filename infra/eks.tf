module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8"

  cluster_name    = local.name
  cluster_version = var.cluster_version

  cluster_endpoint_public_access = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Cho phép người chạy terraform có quyền admin cluster
  enable_cluster_creator_admin_permissions = true

  # Add-ons quản lý bởi EKS
  # aws-ebs-csi-driver bỏ qua: lab không dùng EBS PVC (ArgoCD non-HA + service
  # đều không cần). Muốn dùng volume thật thì thêm lại kèm IRSA service_account_role_arn.
  cluster_addons = {
    coredns    = {}
    kube-proxy = {}
    vpc-cni    = {}
  }

  eks_managed_node_groups = {
    default = {
      instance_types = var.node_instance_types
      capacity_type  = var.node_capacity_type

      desired_size = var.node_desired_size
      min_size     = var.node_min_size
      max_size     = var.node_max_size

      labels = {
        role = "general"
      }
    }
  }

  tags = {
    "karpenter.sh/discovery" = local.name
  }
}
