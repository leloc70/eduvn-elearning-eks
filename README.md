# EduVN — Nền tảng học trực tuyến trên AWS EKS

> Dự án delivery mẫu (end-to-end) cho vai trò **Technical Lead – Customer Delivery**, mảng Cloud/AWS.
> Domain: nền tảng e-learning. Compute: **Amazon EKS** (Kubernetes) + GitOps.

## Bối cảnh khách hàng
**EduVN** — startup edtech, ~5.000 học viên, cần nền tảng riêng chịu được **50.000 học viên**:
giảng viên upload video khóa học, học viên xem video/làm quiz/theo dõi tiến độ, thanh toán online, admin quản lý.

**Ràng buộc:** hạ tầng < **$1.500/tháng** giai đoạn đầu · ra mắt **3 tháng** · tối ưu chi phí lúc ít user
nhưng scale được · dữ liệu học viên bảo mật · tái lập bằng IaC + CI/CD.

## Kiến trúc tổng quan
Xem chi tiết trong [`docs/02-architecture.md`](docs/02-architecture.md).

- **Edge:** CloudFront + WAF; frontend React trên S3.
- **Compute:** EKS (managed control plane) + Karpenter, microservices deploy bằng Helm + ArgoCD (GitOps).
- **Auth:** Amazon Cognito (email + social login).
- **Data:** DynamoDB (users/progress) · Aurora Serverless v2 (orders) · ElastiCache Redis (cache).
- **Video:** S3 → EventBridge → MediaConvert (HLS) → CloudFront (signed URL, chống tải lậu).
- **Bảo mật:** IRSA (pod → AWS least-privilege) · Secrets Manager · network policy.
- **Observability:** Container Insights + Prometheus + Grafana.

## Cấu trúc repo
```
eduvn-elearning-eks/
├── docs/          # Brief, kiến trúc, ADR, kế hoạch delivery, ước lượng chi phí
├── infra/         # Terraform: VPC, EKS, ECR, IRSA, ArgoCD (Sprint 0)
├── charts/        # Helm chart mẫu cho 1 microservice (course-service)
├── gitops/        # ArgoCD Application manifests
└── README.md
```

## Bắt đầu nhanh
1. Đọc [`docs/01-project-brief.md`](docs/01-project-brief.md) → hiểu yêu cầu như khách gửi.
2. Xem [`docs/02-architecture.md`](docs/02-architecture.md) → present cho khách.
3. Dựng hạ tầng: xem [`infra/README.md`](infra/README.md).
4. Deploy service mẫu: xem [`charts/course-service/`](charts/course-service/) + [`gitops/`](gitops/).

## Trạng thái
| Phần | Trạng thái |
|---|---|
| Docs (brief, kiến trúc, ADR, plan, cost) | ✅ Đã có |
| Terraform skeleton (VPC + EKS + ECR + IRSA + ArgoCD) | ✅ Skeleton — cần điền biến & `terraform apply` |
| Helm chart mẫu | ✅ course-service |
| GitOps (ArgoCD) | ✅ Application manifest mẫu |
| Microservice code thật | ⬜ Chưa (giai đoạn tiếp theo) |

> ⚠️ Đây là **project học/delivery mẫu**. `terraform apply` sẽ tạo tài nguyên **tính phí** (EKS control plane, NAT, node...). Đọc `docs/05-cost-estimate.md` và đặt billing alarm trước khi chạy.
