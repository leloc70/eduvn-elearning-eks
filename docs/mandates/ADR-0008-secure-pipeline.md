# ADR-0008 — Secure delivery pipeline (Mandate #10)

- **Trạng thái:** Accepted · Code ready (verify admission cần cluster)
- **Ngày:** 2026-07-21

## Context
"Không tin image mù": cần cổng chặn CI, ký + xác thực nguồn gốc image, không tag/action trôi.

## Decision
- **Cổng chặn**: branch ruleset + 3 required check (đã có); scan Trivy/Checkov sẽ nâng thành blocking.
- **Ký image**: `cd.yml` dùng **cosign keyless** (OIDC) ký image theo digest; **SBOM + provenance mode=max**
  (buildx attestation) đính kèm registry.
- **Admission verify**: `k8s/policies/04-verify-images.yaml` (Kyverno `verifyImages`) — chỉ chạy image
  **đã ký bởi workflow cd.yml** (issuer GitHub OIDC, subject = `.../.github/workflows/*`), `mutateDigest`
  ghim theo digest. Audit trước → Enforce sau.
- **Pin nguồn**: GitHub Actions trong `cd.yml` pin theo **commit SHA**; base image trong Dockerfile pin
  theo **digest** (`node:20-alpine@sha256:...`).
- **Scope**: `cd.yml` chỉ trigger `services/**` (không rebuild cả hệ mỗi merge).

## Consequences / trade-off
- (+) Chuỗi cung ứng: commit → digest → chữ ký → SBOM truy ngược được.
- (−) verifyImages cần Kyverno gọi Fulcio/Rekor (mạng) — Audit trước để không chặn nhầm.
- (−) Bump-PR do GITHUB_TOKEN không trigger checks → merge tay (INCIDENTS #5); fix đúng = PAT/App.

## Verify (khi lab-up)
- Deploy image chưa ký → Kyverno (Enforce) **từ chối**.
- `cosign verify --certificate-identity-regexp ... --certificate-oidc-issuer https://token.actions.githubusercontent.com <image>` pass.
- `cosign download sbom <image>` ra SBOM. Truy: pod → digest → commit → PR → chữ ký.
