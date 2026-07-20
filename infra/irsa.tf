# IRSA cho AWS Load Balancer Controller (tạo ALB từ Ingress)
module "lb_controller_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.39"

  role_name                              = "${local.name}-lb-controller"
  attach_load_balancer_controller_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }
}

# Cài AWS Load Balancer Controller qua Helm
resource "helm_release" "lb_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.7.2"

  set {
    name  = "clusterName"
    value = module.eks.cluster_name
  }
  set {
    name  = "serviceAccount.create"
    value = "true"
  }
  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = module.lb_controller_irsa.iam_role_arn
  }

  depends_on = [module.eks]
}

# --- Ví dụ IRSA cho một microservice (course-service) truy cập DynamoDB/S3 ---
# Nhân bản block này cho từng service, gắn policy least-privilege phù hợp.
module "course_service_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.39"

  role_name = "${local.name}-course-service"

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["default:course-service"]
    }
  }
}

# Policy least-privilege mẫu (chỉ đọc/ghi 1 bảng DynamoDB) — điền ARN thật khi có bảng
# resource "aws_iam_role_policy" "course_service_ddb" { ... }
