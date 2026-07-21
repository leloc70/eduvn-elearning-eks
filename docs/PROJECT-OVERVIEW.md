# EduVN — Tổng quan dự án (chi tiết)

Tài liệu tổng hợp toàn bộ dự án tới hiện tại: kiến trúc, trạng thái, mandate, vận hành, chi phí.
Cập nhật: 2026-07-21.

> **Một câu:** Nền tảng e-learning (EduVN) triển khai theo phong cách **Customer Delivery** — có **2 backend
> có thể hoán đổi** (serverless always-on + EKS on-demand), frontend trên CloudFront, đầy đủ CI/CD GitOps,
> hardening theo mandate Phase 3, observability, và bộ tài liệu ADR/verify/incidents.

---

## 1. Đang LIVE ngay bây giờ (chi phí ~$0)
| Thành phần | URL / Vị trí | Ghi chú |
|---|---|---|
| **Frontend** | https://mywebsitelocle.click | React SPA + dark mode, CloudFront + S3 + ACM |
| **Backend (serverless)** | https://api.mywebsitelocle.click | Lambda + API Gateway + DynamoDB (PITR) — **data thật** |
| **Terraform state** | S3 `eduvn-tf-state-500519358149` | versioned + encrypted + DynamoDB lock |
| **Repo** | github.com/leloc70/eduvn-elearning-eks | public, ~33 PR merged |

→ Website là **sản phẩm thật, always-on, pay-per-request** (~$0). Không cần EKS chạy 24/7.

## 2. Kiến trúc — 2 chế độ backend

```
                      ┌─ Chế độ A (LIVE, rẻ): API Gateway → Lambda → DynamoDB (PITR)
Browser → CloudFront ─┤     (api.mywebsitelocle.click)
  (mywebsitelocle)    └─ Chế độ B (on-demand): ALB HTTPS → EKS (course-service) → DynamoDB
                            (bật bằng lab-up khi cần demo kiến trúc container)
```
Frontend **cùng một build** trỏ `api.mywebsitelocle.click` → chỉ cần đổi cái gì đứng sau domain đó.

- **Chế độ A — Serverless** (`infra-serverless/`): always-on, rẻ nhất, cho website công khai.
- **Chế độ B — EKS** (`infra/` + `charts/`): thể hiện năng lực container/K8s (GitOps, IRSA, Karpenter,
  hardening) — dựng khi demo rồi `lab-down`.

## 3. Cấu trúc repo
```
frontend/            React SPA (Vite) + dark theme + SLO instrumentation-aware
services/            course-service (Node+Express+DynamoDB+prom-client /metrics) — dùng cho EKS
infra-serverless/    Chế độ A: Lambda + API Gateway + DynamoDB (PITR) + custom domain  ← LIVE
infra-web/           CloudFront + S3 + ACM + Route53 (frontend hosting)               ← LIVE
infra/               Chế độ B: Terraform EKS (VPC/EKS/ECR/IRSA/DynamoDB/Karpenter/Prometheus/audit)
charts/course-service/  Helm (securityContext, PDB, HPA, NetworkPolicy, ServiceMonitor)
k8s/                 Kyverno policies + Karpenter NodePool + Grafana dashboards
.github/             CI/CD (ci/cd/terraform-plan) + security scan + dependabot + branch ruleset
scripts/             lab-up/down/status, deploy-web
docs/                brief→cost→runbook · mandates/ (ADR+plan+verify) · INCIDENTS · OBSERVABILITY · PROJECT-OVERVIEW
```

## 4. Mandates (Phase 3) — trạng thái
| # | Mandate | eduvn | Chứng minh / ADR |
|---|---|---|---|
| 01 | Network exposure | ✅ | NetworkPolicy + ArgoCD private · ADR-0002 |
| 02 | Scale under budget | ✅ | HPA + metrics-server (cpu%/70%) · ADR-0003 |
| 03 | Maintenance no-downtime | ✅ | PDB + rollout + topologySpread + probes · ADR-0001 |
| 04 | Auditability (TF4) | 🟡 | EKS audit log→CloudWatch (phần WORM/detection cần TF4) · ADR-0005 |
| 05 | Runtime hardening | ✅ | securityContext non-root + Kyverno (Audit) · ADR-0004 |
| 08/09 | Managed data | ✅ N/A | DynamoDB + IRSA (không self-host) · ADR-0006 |
| 13 | Cost efficiency (elastic) | ✅ | Karpenter Spot+Graviton, demo scale up/down · ADR-0007 |
| 20 | DR backup/restore | 🟡 | DynamoDB **PITR bật** + remote state; restore drill cần làm |
| 06,07,14,15,22 | AI/AIO | ⛔ | Bỏ theo yêu cầu |
| 11,12 | Audit detection/anti-defeat | ⏭️ | Chỉ TF4 |
| 10,16,17,18,19,21 | Secure pipeline / latency / resilience / cost / throughput / DR failover | 🔜 | Plan trong [`mandates/APPLY-PLAN.md`](mandates/APPLY-PLAN.md) — cần `lab-up` để apply+verify |

Chi tiết + cách verify: [`mandates/`](mandates/) (README, APPLY-PLAN, ADR-0001..0007, VERIFICATION).

## 5. CI/CD & GitOps
- **Branch ruleset** trên `main`: bắt buộc PR + 3 required check (build/helm-lint/tf-validate) mới merge.
- **ci.yml** (PR): build+smoke-test service · helm lint · terraform fmt+validate.
- **cd.yml** (push): OIDC (không key tĩnh) → build → push ECR (sha tag, immutable) → bump manifest.
- **terraform-plan.yml**: plan-on-PR (required-safe, skip khi chưa cấu hình AWS).
- **security.yml**: npm audit + Trivy + Checkov. **dependabot**: update deps.
- **ArgoCD**: GitOps — cluster khớp Git; `gitops/apps/course-service.yaml`.

## 6. Bảo mật (đã áp)
- OIDC federation cho CI (không access key tĩnh) · **IRSA** cho pod · **IAM SSO** cho người (không shared).
- securityContext non-root, drop caps, RO rootfs · Kyverno admission (audit) · NetworkPolicy.
- ECR immutable + scan · HTTPS mọi nơi (ACM) · ArgoCD/Grafana private.

## 7. Observability
- **kube-prometheus-stack** (khi EKS chạy): Prometheus + Grafana + Alertmanager.
- **SLO dashboard** `course-service-slo` (RPS, error rate, p50/p95/p99, replicas/HPA, CPU/mem).
- Backend phát `/metrics` (prom-client) → ServiceMonitor → Prometheus. Chi tiết: [`OBSERVABILITY.md`](OBSERVABILITY.md).

## 8. Chi phí
| Đang chạy | ~$/tháng |
|---|---|
| CloudFront + S3 (web) | ~$0 (free tier) |
| Lambda + API Gateway + DynamoDB | ~$0 (pay-per-request) |
| Route 53 hosted zone | $0.50 |
| S3 state bucket | vài cent |
| **Tổng LIVE** | **< $1/tháng** |

EKS (chế độ B) chỉ tốn khi `lab-up` (~$0.21/giờ) — luôn `lab-down` sau khi dùng.

## 9. Cách chạy
**Website (đã live):** mở https://mywebsitelocle.click.
**Cập nhật serverless backend:** sửa `infra-serverless/lambda/` → `terraform -chdir=infra-serverless apply`.
**Cập nhật frontend:** `.\scripts\deploy-web.ps1` (build → S3 → invalidate).
**Bật EKS (chế độ B):**
```powershell
$env:AWS_PROFILE="eduvn"; aws sso login --sso-session eduvn
.\scripts\lab-up.ps1          # ~15-20 phút
# build/push image + kubectl apply gitops/apps/course-service.yaml + tạo DNS api → ALB
.\scripts\lab-down.ps1        # xong nhớ destroy
```
Runbook đầy đủ: [`07-runbook-p1.md`](07-runbook-p1.md).

## 10. Sự cố đã gặp
19 lỗi thực chiến (OIDC immutable subject, Karpenter Pod-Identity namespace, pod-density, Kyverno
uninstall treo destroy...) + nguyên nhân gốc + fix: [`INCIDENTS.md`](INCIDENTS.md).

## 11. Việc còn lại (cần buổi `lab-up`)
- **#10 secure pipeline**: cosign+SBOM+provenance, Kyverno verifyImages (enforce), pin action theo SHA.
- **Kyverno Audit→Enforce** (hoàn tất DoD #5).
- **#17 resilience** (RBAC least-priv, fallback), **#18 cost** (VPC endpoints), **#20 restore drill**, **#21 DR failover** (3 AZ).
- Plan chi tiết + verify: [`mandates/APPLY-PLAN.md`](mandates/APPLY-PLAN.md).

## Chỉ mục tài liệu
`01-project-brief` · `02-architecture` (+`.drawio`) · `03-adr` · `04-delivery-plan` · `05-cost-estimate` ·
`06-cicd` · `07-runbook-p1` · `OBSERVABILITY` · `INCIDENTS` · `mandates/` · **`PROJECT-OVERVIEW` (file này)**.
