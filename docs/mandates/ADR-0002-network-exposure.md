# ADR-0002 — Network exposure (Mandate #1)

- **Trạng thái:** Accepted · Applied
- **Ngày:** 2026-07-21
- **Mandate:** #1 — storefront/API công khai, cổng vận hành riêng tư

## Context
Cần: điểm vào khách (API/storefront) công khai; control-plane vận hành (ArgoCD, dashboard) không phơi internet.

## Decision
- **API công khai qua ALB HTTPS** (`api.mywebsitelocle.click`, cert ACM auto-discovery), chỉ route app.
- **ArgoCD private:** Service `ClusterIP` — chỉ vào qua `kubectl port-forward` (không có Ingress/LB public).
- **NetworkPolicy** cho course-service: ingress **chỉ từ CIDR VPC** (traffic ALB), egress **chỉ DNS + 443**
  (DynamoDB/STS). Chặn lateral movement từ pod khác.

## Consequences / trade-off
- (+) Giảm bề mặt tấn công; ops chỉ vào qua đường riêng.
- (−) NetworkPolicy egress mở 443 ra 0.0.0.0/0 (cần cho DynamoDB/STS công khai) — siết hơn được bằng
  VPC endpoint (xem #18/ADR-0010) để egress chỉ nội bộ VPC.
- (−) `ingressCIDRs` phải khớp CIDR subnet ALB — sai thì health check fail.

## Verify (xem VERIFICATION.md §M1)
`kubectl get networkpolicy` active; ArgoCD không có địa chỉ external; API public trả 200; port khác bị chặn.

## Rollback
Xoá NetworkPolicy (mở lại nội bộ, không phơi public). ArgoCD vẫn private.
