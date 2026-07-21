# ADR-0005 — Auditability (Mandate #4, phần hạ tầng)

- **Trạng thái:** Accepted · Partially applied
- **Ngày:** 2026-07-21
- **Mandate:** #4 (TF4) — dựng lại "ai làm gì khi nào" từ dấu vết không sửa được

> eduvn không nhất thiết là TF4; áp phần audit log vì đây là hardening chung tốt.

## Decision (đã làm)
- **EKS control-plane audit log** → CloudWatch: `cluster_enabled_log_types = ["api","audit","authenticator"]`,
  retention 30 ngày. Ghi mọi call K8s API (ai, khi nào, làm gì).
- **CloudTrail** (đã có sẵn ở account) — ghi API cloud.
- **Change trail = Git**: mọi thay đổi qua PR + ArgoCD (GitOps), có tên người + link commit.
- **Danh tính cá nhân**: đăng nhập AWS bằng **IAM Identity Center (SSO)**, không access key tĩnh, không shared account.

## Còn thiếu để đạt full #4/#11/#12 (TF4)
- **Tamper-evident**: CloudTrail → **S3 Object Lock (WORM)** + KMS, tách quyền xoá (người vận hành không xoá được vết).
- **Detection** (#11): alert khi có hành động bất thường (không chỉ điều tra sau).
- **Anti-defeat** (#12): chống vô hiệu hóa audit.
→ Chỉ làm nếu là TF4 (xem APPLY-PLAN).

## Verify (xem VERIFICATION.md §M4)
`aws eks describe-cluster --name eduvn-dev --query cluster.logging` → audit=true; log group
`/aws/eks/eduvn-dev/cluster` có stream `kube-apiserver-audit`.

## Rollback
Tắt log types (mất khả năng forensic — không khuyến nghị).
