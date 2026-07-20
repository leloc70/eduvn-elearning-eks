# 03 — Architecture Decision Records (ADR)

Ghi lại các quyết định kiến trúc quan trọng + lý do. Đây là tài liệu Tech Lead dùng để bảo vệ giải pháp trước khách.

---

## ADR-001: Chọn EKS thay vì Serverless / ECS
- **Context:** Khách muốn nhiều dịch vụ độc lập, chuẩn công nghiệp, tránh khóa nhà cung cấp, lộ trình dài hạn.
- **Decision:** Dùng **Amazon EKS**.
- **Lý do:** Portability (đa cloud/on-prem), hệ sinh thái K8s giàu, chuẩn hóa cho nhiều microservice.
- **Trade-off:** Chi phí nền + độ phức tạp vận hành cao hơn serverless → cần năng lực DevOps của team.
- **Khi nào nên xét lại:** Nếu team quá nhỏ hoặc tải rất thất thường → cân nhắc Fargate/serverless.

## ADR-002: Karpenter thay Cluster Autoscaler
- **Decision:** Dùng **Karpenter** để provision node.
- **Lý do:** Chọn instance tối ưu theo nhu cầu pod, tận dụng Spot, scale nhanh, giảm chi phí.
- **Trade-off:** Mới hơn, cần cấu hình NodePool cẩn thận.

## ADR-003: GitOps bằng ArgoCD + Helm
- **Decision:** Deploy qua **ArgoCD**, đóng gói bằng **Helm**.
- **Lý do:** Trạng thái = Git → audit, rollback, tái lập dễ; tách CI (build) khỏi CD (deploy).
- **Trade-off:** Thêm một thành phần platform phải vận hành.

## ADR-004: IRSA cho quyền pod → AWS
- **Decision:** Dùng **IAM Roles for Service Accounts**.
- **Lý do:** Least-privilege theo từng service, không hardcode access key, xoay vòng tự động.

## ADR-005: Polyglot persistence (DynamoDB + Aurora + Redis)
- **Decision:** DynamoDB cho users/progress (scale rẻ, key-value), Aurora Serverless v2 cho orders (quan hệ, giao dịch), Redis cache session/leaderboard.
- **Lý do:** Dùng đúng công cụ cho đúng dữ liệu.
- **Trade-off:** Nhiều loại store → vận hành phức tạp hơn; chấp nhận để tối ưu chi phí + hiệu năng.

## ADR-006: Thanh toán qua Stripe (không tự lưu thẻ)
- **Decision:** Tích hợp **Stripe**, xử lý webhook.
- **Lý do:** Tránh gánh nặng tuân thủ PCI-DSS, giảm rủi ro bảo mật.

## ADR-007: Video streaming S3 + CloudFront signed URL
- **Decision:** Transcode bằng **MediaConvert**, phát HLS qua **CloudFront signed URL**.
- **Lý do:** Managed transcode, CDN toàn cầu, chống tải lậu bằng URL có hạn.
