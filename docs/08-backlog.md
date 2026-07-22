# Backlog — việc còn lại

Cập nhật 2026-07-22. Ký hiệu: 💻 không cần AWS (làm/commit ngay) · 🖥️ cần `lab-up` (tốn tiền) ·
🔒 đang bị chặn (AWS CLI blocked / SSO hết hạn — xem dưới).

## 🔒 Blocker hiện tại
AWS CLI bị **Application Control** chặn (`_awscrt` DLL) → `aws sso login` không chạy → **không apply/deploy/verify
AWS được từ máy local**. Web vẫn live. **Fix:** allow `C:\Program Files\Amazon\AWSCLIV2\` trong Smart App
Control/WDAC, rồi `aws sso login --sso-session eduvn`. Sau đó chạy được các item 🖥️/🔒.

## P0 — Automation & hoàn thiện web
- [x] 💻 Serverless backend live · Remote state · Search/filter catalog
- [ ] 💻 **CI/CD frontend** (`deploy-web.yml` + OIDC role) — code **đã có**; cần: `terraform -chdir=infra-web apply`
      (tạo role) + set vars `AWS_WEB_ROLE_ARN/AWS_WEB_BUCKET/AWS_CF_DIST_ID`. 🔒 (chờ AWS)
- [x] 💻 Web features: **DELETE + PUT (update)** endpoint (Lambda + EKS service) · nút Sửa/Xóa trên trang chi tiết · form dùng lại cho tạo & sửa
- [x] 💻 **Test cho Lambda** (unit, `node --test`, 13 case) + job CI `Serverless Lambda — test`

## P1 — CI/CD & bảo mật (code)
- [ ] 💻 Trivy/Checkov thành **cổng chặn** (required check) khi codebase sạch
- [ ] 💻 Fix CD auto-bump (PAT/GitHub App) — INCIDENTS #5
- [ ] 💻 Well-Architected Review doc (6 trụ)

## P2 — Verify mandate P1 (cần cluster)
- [x] 💻 **Lab local (kind)** verify MIỄN PHÍ: Helm chart + hardening · Kyverno Audit→**Enforce**
      (chặn pod root) · NetworkPolicy (Calico enforce) · Prometheus scrape · ArgoCD GitOps · HPA/PDB/topologySpread.
      Xem [`docs/10-local-lab-verification.md`](10-local-lab-verification.md) · [`local-lab/`](../local-lab/).
- [ ] 🖥️ Chỉ còn cần AWS thật: #10 cosign verify-images (ECR+ký) · #18 VPC endpoints · #21 3-AZ (mất 1 AZ dưới tải) · IRSA · Karpenter
- [ ] 🖥️ Bài thủ công: flash-sale load test (#2) · drain/AZ-failover (#3/#21)
> Code đã sẵn (B). Chi tiết: [`mandates/APPLY-PLAN.md`](mandates/APPLY-PLAN.md) + ADR-0008/0009.

## P3 — Sản phẩm (nếu làm thật)
- [ ] Auth (Cognito) · quiz + tiến độ · video (S3→MediaConvert→CloudFront) · thanh toán (Stripe)

## P4 — Dọn dẹp
- [ ] Xóa GitHub vars trỏ role EKS đã destroy (hoặc giữ — tên role cố định, tái tạo khi lab-up)
- [ ] Cập nhật README trạng thái (web live)

## Trạng thái mandate (tóm tắt)
✅ verified: #1,2,3,5,13 (khi EKS chạy) · #20 (DR drill thật) · #8/9 (N/A DynamoDB)
🟡 code-ready, chờ verify: #10,17,18,21 + Kyverno enforce
⛔ bỏ: AI (#6,7,14,15,22) · ⏭️ TF4: #11,12
