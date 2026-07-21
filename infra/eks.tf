module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8"

  cluster_name    = local.name
  cluster_version = var.cluster_version

  cluster_endpoint_public_access = true

  # Mandate #4: ghi audit log control-plane -> CloudWatch (ai gọi API K8s, khi nào).
  cluster_enabled_log_types              = ["api", "audit", "authenticator"]
  cloudwatch_log_group_retention_in_days = 30

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
    # Pod Identity: Karpenter controller nhận quyền AWS qua đây
    eks-pod-identity-agent = {}
  }

  eks_managed_node_groups = {
    default = {
      instance_types = var.node_instance_types
      capacity_type  = var.node_capacity_type

      desired_size = var.node_desired_size
      min_size     = var.node_min_size
      max_size     = var.node_max_size

      # Mandate #18: EBS gp3 (rẻ hơn gp2 cùng hiệu năng) + mã hoá.
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size = 30
            volume_type = "gp3"
            encrypted   = true
          }
        }
      }

      labels = {
        role = "general"
      }
    }
  }

  # Karpenter discover security group qua tag này
  node_security_group_tags = {
    "karpenter.sh/discovery" = local.name
  }

  tags = {
    "karpenter.sh/discovery" = local.name
  }
}
