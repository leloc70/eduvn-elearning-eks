# SLO / SLA — course-service

Định nghĩa mục tiêu độ tin cậy, cách đo, và cơ chế **đảm bảo** (error budget + burn-rate alert).
Bổ trợ: [`06-observability`](OBSERVABILITY.md) · [`11-load-test`](11-load-test.md) · dashboard SLO (Grafana).

## 1. SLI — đo cái gì
Nguồn: histogram `http_request_duration_seconds` (prom-client), label `service="course-service"`.

| SLI | Công thức |
|---|---|
| **Availability** | `1 − (rate(count{status=~"5.."}) / rate(count))` — tỷ lệ request non-5xx |
| **Latency** | `histogram_quantile(0.95, rate(bucket))` — p95 |

> 4xx (client sai) **không** tính vào lỗi availability — đó là lỗi phía người dùng, không phải hệ.

## 2. SLO — mục tiêu nội bộ

| SLO | Mục tiêu | Cửa sổ | Error budget |
|---|---|---|---|
| **Availability** | **99.9%** request thành công | 30 ngày | **0.1% ≈ 43 phút/tháng** |
| **Latency** | **95%** request **< 300ms** | 30 ngày | — |

## 3. SLA — cam kết với khách (lỏng hơn SLO)

| SLA | Cam kết | Ghi chú |
|---|---|---|
| Uptime | **99.5%** / tháng (≈ 3.6h) | buffer so với SLO 99.9% → còn thời gian sửa trước khi vi phạm |
| Bồi thường | credit theo bậc uptime | ví dụ < 99.5% hoàn 10%, < 99.0% hoàn 25% |

**Vì sao SLA < SLO:** nội bộ nhắm cao hơn để **không bao giờ** chạm mức hợp đồng. Khoảng đệm 99.5%↔99.9%
là "vùng an toàn" của đội vận hành.

## 4. Error-budget policy (quy tắc tổ chức)
- **Còn budget** → được release feature nhanh, chấp nhận rủi ro có kiểm soát.
- **Sắp cạn / đã cạn** (burn-rate cao) → **đóng băng feature**, ưu tiên reliability (sửa bug, thêm test,
  tăng redundancy) cho tới khi budget hồi.
- Mỗi sự cố ăn budget → **postmortem** (xem [`INCIDENTS.md`](INCIDENTS.md)).

## 5. Cơ chế cảnh báo — multi-window burn-rate (Google SRE)
Không cảnh báo theo ngưỡng lỗi thô, mà theo **tốc độ đốt budget** (burn rate = error_ratio / 0.001).
Yêu cầu **cả cửa sổ dài lẫn ngắn** vượt ngưỡng → ít báo động giả, tự tắt khi đã hồi phục.

| Alert | Burn | Cửa sổ (dài/ngắn) | Budget đốt | Hành động |
|---|---|---|---|---|
| `...FastBurn` | **14.4×** | 1h / 5m | ~2% trong 1h | **PAGE** ngay |
| `...SlowBurn` | **6×** | 6h / 30m | ~5% trong 6h | **PAGE** |
| `...Ticket` | **1×** | 3d / 6h | ~10% trong 3 ngày | **TICKET** |

Định nghĩa như code: [`charts/course-service/templates/prometheusrule.yaml`](../charts/course-service/templates/prometheusrule.yaml)
(recording rules `course_service:sli_error:ratio_rate*` + 3 alert). Deploy qua ArgoCD.

Xem trên Prometheus:
```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090:9090
# UI → Alerts: 3 alert burn-rate (inactive khi khỏe)
# UI → Graph: course_service:sli_error:ratio_rate5m   (SLI đang đo)
```

## 6. "Đảm bảo" — bức tranh đầy đủ
| Lớp | Thành phần | Trạng thái |
|---|---|---|
| Đo | SLI recording rules, dashboard RED | ✅ |
| Cảnh báo | multi-window burn-rate | ✅ (mục này) |
| Chịu tải | HPA 2→10, load test 14.5k RPS | ✅ ([11](11-load-test.md)) |
| Redundancy | replicas≥2, PDB, multi-AZ, rollout zero-downtime | ✅ |
| DR | DynamoDB PITR + restore drill | ✅ ([DR drill](mandates/DR-RESTORE-DRILL.md)) |
| Quy trình | error-budget policy, runbook, postmortem | ✅ ([runbook](07-runbook-p1.md)) |

## 7. Định tuyến cảnh báo (Alertmanager)
Burn-rate `severity=critical` (FastBurn/SlowBurn/Down) → Alertmanager → **kênh nhận**.
Cấu hình: [`local-lab/kps-values.yaml`](../local-lab/kps-values.yaml) (`alertmanager.config`).

| Môi trường | Receiver |
|---|---|
| Local (lab) | webhook → `alert-sink` ([`local-lab/alert-sink.yaml`](../local-lab/alert-sink.yaml)) — chứng minh pipe |
| Production | Slack (`#eduvn-alerts`) + PagerDuty (mẫu comment sẵn trong kps-values) |

Đã verify: alert `severity=critical` chạy tới webhook (`receiver: webhook-local`, `status: firing`).
Watchdog (dead-man's switch) route tới `null`. Xem:
```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-alertmanager 9093:9093   # UI
kubectl -n monitoring logs deploy/alert-sink                                           # payload nhận được
```

## 8. Còn thiếu / việc tiếp
- **Soak + spike test** (rò rỉ, tải nhảy vọt) — bổ sung bộ load test.
- **Đo lại SLI với DynamoDB thật** (RCU) khi có AWS — trần thông lượng thật.
- **Báo cáo SLA hàng tháng** tự động từ recording rules (uptime %).
- **Nối Slack/PagerDuty thật** (điền webhook/routing key vào receiver mẫu).

> Ngưỡng burn-rate tính cho SLO 99.9% (1−SLO = 0.001). Đổi SLO thì cập nhật cả ngưỡng trong PrometheusRule.
