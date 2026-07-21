# Observability — Prometheus, Grafana, Dashboards

Cách hệ eduvn được đo lường và **các dashboard cần xem** + cách mở.

## Thành phần
- **kube-prometheus-stack** (ns `monitoring`): Prometheus + Grafana + Alertmanager + node-exporter + kube-state-metrics.
- **course-service** phát metrics tại `/metrics` (prom-client): `http_request_duration_seconds`
  (histogram: RPS, error rate, p50/p95/p99) + default Node metrics.
- **ServiceMonitor** `course-service` → Prometheus scrape `/metrics` mỗi 15s.

## Mở Grafana
```bash
# (cần AWS_PROFILE=eduvn + aws trên PATH)
kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80
```
→ http://localhost:3000 · login **admin / eduvn-admin** (Grafana ClusterIP = private, Mandate #1).

Mở Prometheus (PromQL) nếu cần:
```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090
```
→ http://localhost:9090 (thử `http_request_duration_seconds_count` để chắc đang scrape course-service).

## Các dashboard cần xem

### 1. Course Service — SLO (custom, quan trọng nhất)
Trong Grafana: **Dashboards → Course Service — SLO** (uid `course-service-slo`). Panel:
| Panel | Ý nghĩa | Ngưỡng SLO |
|---|---|---|
| Availability (non-5xx) | % request không lỗi | ≥ 99.5% |
| Request rate | RPS đang phục vụ | — |
| Error rate (5xx %) | tỉ lệ lỗi | < 0.5% |
| Pods Ready | số pod sẵn sàng | = replicas |
| Request rate by route/status | traffic theo endpoint | — |
| **Latency p50/p95/p99** | độ trễ đuôi | p95 < 1s (Mandate #2/#16) |
| Replicas & HPA | co giãn theo tải | theo dõi lúc flash-sale |
| CPU & Memory | tài nguyên pod | — |

> Nguồn: file [`k8s/dashboards/course-service-slo.json`](../k8s/dashboards/course-service-slo.json).

### 2. Dashboard built-in (kube-prometheus-stack)
Có sẵn trong **Dashboards**:
- **Kubernetes / Compute Resources / Namespace (Workloads)** → chọn ns `default` → CPU/mem course-service.
- **Kubernetes / Compute Resources / Node (Pods)** → node Karpenter tạo/xoá.
- **Node Exporter / Nodes** → sức khoẻ node.
- **Kubernetes / Compute Resources / Cluster** → tổng quan.

## Dashboard SLO được nạp thế nào
Grafana (kube-prometheus-stack) có **sidecar** tự import mọi ConfigMap có label `grafana_dashboard: "1"`.
Nạp dashboard SLO:
```bash
kubectl -n monitoring create configmap course-service-slo-dashboard \
  --from-file=course-service-slo.json=k8s/dashboards/course-service-slo.json
kubectl -n monitoring label configmap course-service-slo-dashboard grafana_dashboard=1
```
Sidecar phát hiện → dashboard hiện trong Grafana sau ~30s (không cần restart).

## Verify đang có số
```bash
# Prometheus scrape course-service?
kubectl -n monitoring exec sts/prometheus-kube-prometheus-stack-prometheus -c prometheus -- \
  wget -qO- 'http://localhost:9090/api/v1/query?query=http_request_duration_seconds_count' | head -c 300
# Tạo traffic để thấy số:
for i in $(seq 1 50); do curl -s https://api.mywebsitelocle.click/courses > /dev/null; done
```
Rồi mở dashboard SLO → thấy RPS/latency nhảy.

## Ghi chú
- Prometheus dùng `emptyDir` (lab) → mất metric khi restart; prod dùng PVC/remote-write.
- Dashboard SLO đọc `http_request_duration_seconds` — chỉ có **sau khi deploy image có prom-client**.
