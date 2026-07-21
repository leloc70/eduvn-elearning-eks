# ADR-0004 — Runtime hardening (Mandate #5)

- **Trạng thái:** Accepted · Applied (Kyverno ở Audit; enforce là bước tiếp)
- **Ngày:** 2026-07-21
- **Mandate:** #5 — chặn cấu hình nguy hiểm ngay khi apply

## Context
Container chạy root, tag trôi, thiếu requests/limits là rủi ro. Cần dọn hiện trạng + **chặn tái diễn** bằng admission.

## Decision
- **securityContext** course-service: `runAsNonRoot`, `runAsUser 1001`, `drop ALL caps`,
  `readOnlyRootFilesystem: true` (+ `/tmp` emptyDir), `seccompProfile: RuntimeDefault`.
- **Dockerfile** pin **UID số 1001** (`USER 1001`) để `runAsNonRoot` verify được.
- **Image** tham chiếu tag `sha-<commit>` (không `latest`); ECR immutable.
- **requests/limits** đầy đủ (xem ADR-0003).
- **Kyverno** engine + 3 ClusterPolicy: `require-run-as-nonroot`, `disallow-latest-tag`,
  `require-resources` — bắt đầu **Audit** (loại trừ kube-system/kyverno/argocd).

## Consequences / trade-off
- (+) Pod chạy non-root, rootfs read-only → giảm blast radius.
- (−) **Audit trước, enforce sau**: chưa chặn thật cho tới khi PolicyReport sạch → đổi `Enforce`.
  Đây là chủ ý (RULES: audit→enforce có kiểm soát, không rớt SLO).
- (−) `readOnlyRootFilesystem` cần `/tmp` writable — đã mount emptyDir.

## Verify (xem VERIFICATION.md §M5)
Pod chạy uid 1001; `kubectl get clusterpolicy` 3 policy; (sau enforce) `kubectl apply -f
k8s/policies/_test-violations.yaml` **bị từ chối** cả 3 luật.

## Rollback
Kyverno: `Enforce → Audit`. securityContext: revert chart (rollback helm).
