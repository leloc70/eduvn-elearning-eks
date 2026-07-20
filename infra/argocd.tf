# Cài ArgoCD (GitOps) qua Helm
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
  create_namespace = true
  version          = "6.7.11"

  # Cấu hình tối giản cho dev; prod nên bật SSO, HA, ingress riêng
  values = [yamlencode({
    server = {
      service = {
        type = "ClusterIP"
      }
    }
  })]

  depends_on = [module.eks]
}

# Lấy mật khẩu admin ban đầu:
#   kubectl -n argocd get secret argocd-initial-admin-secret \
#     -o jsonpath="{.data.password}" | base64 -d
#
# Truy cập UI:
#   kubectl -n argocd port-forward svc/argocd-server 8080:443
