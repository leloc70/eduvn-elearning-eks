# 04 — Kế hoạch Delivery

Thời gian: ~3–3.5 tháng · Team: 4 dev + 1 Tech Lead.

| Sprint | Tuần | Hạng mục chính | Deliverable |
|---|---|---|---|
| **0 — Platform** | 1–2 | IaC: VPC, EKS, ECR, IAM/IRSA, ArgoCD, LB Controller | Cluster chạy được, GitOps sẵn sàng |
| **1 — CI/CD + Auth** | 3–4 | Pipeline build→ECR→ArgoCD; Cognito; deploy frontend | Đăng nhập chạy, deploy tự động |
| **2 — Core services** | 5–7 | Course + Progress/Quiz svc, Helm chart, ALB Ingress, HPA | Xem khóa học, làm quiz, theo dõi tiến độ |
| **3 — Video pipeline** | 8–9 | Upload svc, S3, MediaConvert, signed URL | Upload → transcode → xem video |
| **4 — Payment + Cache** | 10–11 | Payment svc, Aurora, Redis, Stripe | Mua khóa học end-to-end |
| **5 — Hardening** | 12–13 | Karpenter, WAF, Prometheus/Grafana, network policy, load test, WA review | Sẵn sàng go-live |

## Rủi ro & giảm thiểu
| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Chi phí EKS vượt ngân sách lúc ít user | Cao | Karpenter + Spot, node nhỏ, tắt môi trường dev ngoài giờ, billing alarm |
| Team chưa quen K8s | Trung bình | Tech Lead training + runbook + pair |
| Video file lớn timeout upload | Trung bình | S3 multipart / presigned URL upload trực tiếp |
| Vendor lock Stripe | Thấp | Trừu tượng hóa payment interface |

## Definition of Done (mỗi hạng mục)
- Code review + test pass.
- Triển khai qua GitOps (không thao tác tay).
- Có metric/log/alert.
- Cập nhật tài liệu + runbook.

## Milestone bàn giao khách
- **M1 (cuối tuần 4):** Demo login + frontend.
- **M2 (cuối tuần 7):** Demo học + quiz.
- **M3 (cuối tuần 9):** Demo video.
- **M4 (cuối tuần 11):** Demo thanh toán.
- **Go-live (tuần 13):** WA review + load test + bàn giao tài liệu.
