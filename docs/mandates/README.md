# Mandates — áp dụng vào eduvn

Áp các directive Phase 3 (TechX Corp) vào kiến trúc **eduvn** (course-service trên EKS + DynamoDB,
frontend CloudFront). Bỏ các mandate AI/AIO theo yêu cầu.

- **Plan apply mandate mới:** [`APPLY-PLAN.md`](APPLY-PLAN.md)
- **Cách verify + bằng chứng:** [`VERIFICATION.md`](VERIFICATION.md)
- **ADR:** thư mục này (`ADR-00xx-*.md`)

## Trạng thái 22 mandate

| # | Mandate | Nhóm | eduvn | ADR |
|---|---|---|---|---|
| 01 | Network exposure | Security | ✅ applied | [ADR-0002](ADR-0002-network-exposure.md) |
| 02 | Scale under budget | Perf/Cost | ✅ applied | [ADR-0003](ADR-0003-scale-hpa.md) |
| 03 | Maintenance no-downtime | Reliability | ✅ applied | [ADR-0001](ADR-0001-reliability-no-downtime.md) |
| 04 | Auditability (TF4) | Audit | 🟡 partial (audit log) | [ADR-0005](ADR-0005-audit-logging.md) |
| 05 | Runtime hardening | Security | ✅ applied (Kyverno audit) | [ADR-0004](ADR-0004-runtime-hardening.md) |
| 06 | AI trust & safety | AI | ⛔ bỏ (AI) | — |
| 07 | AIOps detection | AIO | ⛔ bỏ (AI) | — |
| 08 | Managed migration | Data | ✅ N/A — eduvn đã managed (DynamoDB) | [ADR-0006](ADR-0006-managed-data.md) |
| 09 | Managed zero-downtime ops | Data | 🟡 phần lớn N/A (DynamoDB) | [ADR-0006](ADR-0006-managed-data.md) |
| 10 | Secure delivery pipeline | Security/OpEx | 🔜 planned (gap lớn nhất) | — |
| 11 | Audit detection (TF4) | Audit | ⏭️ TF4-only | — |
| 12 | Audit anti-defeat (TF4) | Audit | ⏭️ TF4-only | — |
| 13 | Cost efficiency (elastic) | Cost | 🔜 planned (có spot, thêm autoscaler+Graviton) | — |
| 14 | AI eval standard | AIO | ⛔ bỏ (AI) | — |
| 15 | AIOps detection standard | AIO | ⛔ bỏ (AI) | — |
| 16 | Latency under load | Perf | 🟡 hạn chế (cần tracing) | — |
| 17 | Resilience & containment | Reliability/Security | 🔜 planned (thêm RBAC + fallback) | — |
| 18 | Cost beyond compute | Cost | 🔜 planned (VPC endpoints, gp3) | — |
| 19 | Throughput ceiling | Perf | 🟡 hạn chế (cần load infra) | — |
| 20 | DR backup/restore | Reliability | 🔜 planned (DynamoDB PITR + drill) | — |
| 21 | DR failover | Reliability | 🟡 phần lớn có (multi-AZ), verify | — |

Chú thích: ✅ đã apply · 🟡 một phần / hạn chế · 🔜 có plan · ⛔ bỏ · ⏭️ chỉ TF4.
