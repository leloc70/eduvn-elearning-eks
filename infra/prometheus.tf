# Observability: Prometheus + Grafana + Alertmanager (kube-prometheus-stack).
# Dùng emptyDir (không PVC) vì cluster không cài ebs-csi. Grafana ClusterIP -> private (Mandate #1).
resource "helm_release" "kube_prometheus_stack" {
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true
  version          = "62.7.0"
  timeout          = 900 # stack lớn, cần lâu hơn 5 phút mặc định

  values = [yamlencode({
    grafana = {
      adminPassword            = "eduvn-admin" # lab; prod dùng Secret
      service                  = { type = "ClusterIP" }
      defaultDashboardsEnabled = true
    }
    prometheus = {
      prometheusSpec = {
        retention = "6h" # lab: giữ ngắn, emptyDir
        resources = {
          requests = { cpu = "100m", memory = "400Mi" }
          limits   = { memory = "800Mi" }
        }
      }
    }
    alertmanager = {
      alertmanagerSpec = {
        resources = { requests = { cpu = "20m", memory = "64Mi" } }
      }
    }
    # Giảm footprint cho lab
    prometheusOperator = {
      resources = { requests = { cpu = "50m", memory = "128Mi" } }
    }
  })]

  depends_on = [module.eks]
}
