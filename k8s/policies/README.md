# Kyverno policies (Mandate #5 — runtime hardening)

Admission policy-as-code: chặn manifest nguy hiểm ngay lúc `apply`.

| File | Luật |
|---|---|
| `01-require-nonroot.yaml` | Container phải `runAsNonRoot: true` |
| `02-disallow-latest.yaml` | Image phải có tag & không `:latest` |
| `03-require-resources.yaml` | Phải khai requests+limits cpu/memory |

> Loại trừ namespace hệ thống: `kube-system`, `kyverno`, `argocd`.

## Cắt chuyển audit → enforce (an toàn, không rớt SLO)
```bash
# 1) Cài engine: đã có qua Terraform (infra/kyverno.tf)
# 2) Apply ở Audit (mặc định trong file) — chỉ ghi vi phạm, không chặn
kubectl apply -f k8s/policies/

# 3) Quan sát vi phạm trên workload đang chạy
kubectl get clusterpolicyreport
kubectl get policyreport -A

# 4) Khi PolicyReport ~0 fail -> đổi validationFailureAction: Audit -> Enforce, apply lại
kubectl apply -f k8s/policies/
```

## Chứng minh (DoD Mandate #5)
```bash
kubectl apply -f k8s/policies/_test-violations.yaml   # PHẢI bị từ chối cả 3 luật khi Enforce
```

## Rollback
Đổi `Enforce` -> `Audit` rồi apply lại (ngừng chặn tức thì nếu chặn nhầm production).
