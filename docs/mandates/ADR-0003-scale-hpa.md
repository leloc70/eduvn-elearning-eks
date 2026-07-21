# ADR-0003 — Scale under budget (Mandate #2)

- **Trạng thái:** Accepted · Applied
- **Ngày:** 2026-07-21
- **Mandate:** #2 — chịu tải tăng vọt trong ngân sách, co lên rồi co xuống

## Context
Cần chịu tải cao điểm mà không neo tài nguyên (và tiền) ở đỉnh. HPA cần `requests.cpu` + metrics-server.

## Decision
- **requests + limits** cpu/mem cho course-service (requests 100m/128Mi, limits 500m/256Mi) — điều kiện
  để HPA + scheduler bin-pack.
- **HPA** `minReplicas: 2, maxReplicas: 10, targetCPUUtilization: 70%`.
- **metrics-server** (Helm) — EKS không cài sẵn; HPA cần nó để đọc CPU.
- Node group **SPOT** + (kế hoạch #13) autoscaler để co node xuống.

## Consequences / trade-off
- (+) Tải lên → HPA thêm pod; tải xuống → về min 2. Cost theo demand.
- (−) Chưa có cluster-autoscaler → node group cố định min2/max4 (kế hoạch #13 bổ sung Karpenter + Graviton).
- (−) HPA theo CPU đơn thuần; custom metric (RPS) chính xác hơn — để sau.

## Verify (xem VERIFICATION.md §M2)
`kubectl get hpa` → hiện `cpu: X%/70%` (không `<unknown>`) = metrics-server chạy, HPA hoạt động.

## Rollback
`kubectl delete hpa course-service` → về replica tĩnh.
