# Well-Architected Review — EduVN

Rà soát hệ thống theo **AWS Well-Architected Framework** (6 trụ). Mỗi trụ: **đã có** (bằng chứng) ·
**thiếu/rủi ro** · **khuyến nghị**. Dùng để bàn giao khách + định hướng cải tiến.

Phạm vi: stack LIVE (serverless) + stack EKS (on-demand). Bằng chứng trỏ tới file/PR trong repo.

---

## 1. Operational Excellence
**Đã có**
- **IaC 100%** (Terraform): `infra/`, `infra-web/`, `infra-serverless/` — remote state (S3+lock).
- **GitOps**: ArgoCD (EKS) · CI/CD (GitHub Actions) · branch ruleset bắt buộc check.
- **Tài liệu vận hành**: runbook, INCIDENTS (20 sự cố + fix), ADR, SYSTEM-COMPONENTS.
- **Observability**: Prometheus/Grafana + SLO dashboard (EKS); CloudWatch (serverless).

**Thiếu/rủi ro**: chưa có alerting tự động (Alertmanager rule) · chưa có on-call runbook chuẩn hóa.
**Khuyến nghị**: thêm PrometheusRule (SLO burn-rate alert) → Alertmanager → Slack/email.

## 2. Security
**Đã có**
- **Không key tĩnh**: OIDC (CI→AWS) · IRSA (pod→AWS) · SSO (người) · Lambda role least-privilege.
- **Runtime hardening** (EKS): non-root, drop caps, RO rootfs, seccomp · Kyverno admission.
- **Supply chain** (#10): cosign ký image + SBOM/provenance · verify-images admission · pin SHA/digest.
- **Mạng**: storefront public, ops private (ArgoCD/Grafana ClusterIP) · NetworkPolicy · HTTPS mọi nơi (ACM).
- **Data**: DynamoDB mã hoá at-rest · S3 private (OAC) · state encrypted.

**Thiếu/rủi ro**: Kyverno mới **Audit** (chưa Enforce) · chưa có WAF trước CloudFront · secret rotation.
**Khuyến nghị**: chuyển Kyverno Enforce sau khi audit sạch · thêm AWS WAF · External Secrets nếu có secret.

## 3. Reliability
**Đã có**
- **No-downtime** (#3): replicas≥2 · PDB · rollout maxUnavailable 0 + preStop · probes · topologySpread.
- **Multi-AZ** (#21): node group 3 AZ · DynamoDB multi-AZ.
- **DR** (#20): DynamoDB **PITR** + restore drill **đã verify thật** (data khớp).
- **Resilience** (#17): SDK timeout/retry (fail-fast) · dependency degrade.
- Serverless: Lambda + DynamoDB vốn multi-AZ, managed.

**Thiếu/rủi ro**: chưa test AZ-failover dưới tải · chưa có multi-region.
**Khuyến nghị**: chạy bài mất-1-AZ dưới tải (lab-up) · cân nhắc DynamoDB Global Table nếu cần multi-region.

## 4. Performance Efficiency
**Đã có**
- **HPA** (CPU 70%, min2/max10) + metrics-server · **Karpenter** (scale node theo tải).
- **SLO đo được**: p50/p95/p99 latency (prom-client + Grafana).
- Serverless auto-scale (Lambda concurrency) · CloudFront CDN cache.

**Thiếu/rủi ro**: chưa tìm trần thông lượng (#19) · HPA chỉ theo CPU (chưa custom metric RPS) · chưa fix nghẽn latency (#16).
**Khuyến nghị**: load test tìm breakpoint · Prometheus Adapter cho HPA theo RPS · trace Jaeger tìm nghẽn.

## 5. Cost Optimization
**Đã có**
- **Stack LIVE ~$0.50/tháng** (pay-per-request, free tier) — serverless thay EKS 24/7.
- **EKS on-demand**: Spot + Graviton (Karpenter) · scale-down · gp3 · **VPC endpoints** cắt NAT (#18).
- **Budget alarm** (Terraform) · lab-up/down (không để cluster chạy 24/7).

**Thiếu/rủi ro**: chưa dọn orphan tự động · chưa có Cost Anomaly Detection.
**Khuyến nghị**: script `find-orphans` định kỳ · bật Cost Anomaly Detection · Savings Plan nếu tải ổn định.

## 6. Sustainability
**Đã có**: **Graviton (arm64)** — hiệu năng/watt tốt hơn · scale-to-zero-ish (serverless) · Spot tận dụng capacity dư · right-size requests.
**Khuyến nghị**: ưu tiên Graviton cho mọi workload · tắt môi trường non-prod ngoài giờ.

---

## Tổng kết & ưu tiên
| Trụ | Mức trưởng thành | Ưu tiên tiếp theo |
|---|---|---|
| Operational Excellence | 🟢 Tốt | Alerting (burn-rate) |
| Security | 🟢 Tốt | Kyverno Enforce · WAF |
| Reliability | 🟢 Tốt | AZ-failover test dưới tải |
| Performance | 🟡 Khá | Trần thông lượng · custom-metric HPA |
| Cost | 🟢 Tốt | Cost Anomaly · dọn orphan |
| Sustainability | 🟢 Tốt | Graviton toàn bộ |

**Điểm mạnh nổi bật**: không credential tĩnh, supply-chain ký số, DR đã drill thật, cost ~$0 khi idle
(serverless) — đúng chuẩn một hệ delivery production-grade.
