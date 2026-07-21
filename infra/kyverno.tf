# Mandate #5: admission policy-as-code — chặn manifest nguy hiểm ngay lúc apply.
# Chỉ cài engine ở đây; ClusterPolicy áp riêng (audit trước, enforce sau) — xem k8s/policies/.
resource "helm_release" "kyverno" {
  name             = "kyverno"
  repository       = "https://kyverno.github.io/kyverno/"
  chart            = "kyverno"
  namespace        = "kyverno"
  create_namespace = true
  version          = "3.2.6"

  # HA nhẹ cho lab: 1 replica mỗi controller (giảm chi phí)
  set {
    name  = "admissionController.replicas"
    value = "1"
  }

  depends_on = [module.eks]
}
