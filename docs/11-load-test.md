# Load test — trần thông lượng & HPA (Mandate #16/#19/#02)

Đo **thông lượng tối đa**, **độ trễ dưới tải**, và **hiệu quả autoscale** của course-service.
Chạy trên lab kind (3 node) bằng **k6** in-cluster. Script: [`local-lab/k6-load.js`](../local-lab/k6-load.js).

## Cách chạy
```bash
kubectl -n eduvn create configmap k6-script --from-file=k6-load.js=local-lab/k6-load.js
kubectl apply -f - <<'YAML'
apiVersion: batch/v1
kind: Job
metadata: { name: k6-load, namespace: eduvn }
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: k6
          image: grafana/k6:latest
          args: ["run","--summary-trend-stats=avg,p(95),p(99),max","/scripts/k6-load.js"]
          volumeMounts: [{ name: s, mountPath: /scripts }]
      volumes:
        - { name: s, configMap: { name: k6-script } }
YAML
# theo dõi HPA scale ở terminal khác:
watch kubectl -n eduvn get hpa,pods -l app.kubernetes.io/name=course-service
# kết quả:
kubectl -n eduvn logs job/k6-load
```
Hồ sơ tải: ramping-vus `5 → 30 → 60 → 120 → 200 → 0` VU trong 2m30s, request `GET /courses`.

## Kết quả (2026-07-22)

| Chỉ số | Giá trị |
|---|---|
| Thông lượng | **14,475 req/s** (2,171,472 request / 2m30s) |
| Độ trễ avg | 5.89 ms |
| Độ trễ **p95** | **36.7 ms** (SLO < 500ms ✓) |
| Độ trễ p99 / max | 54.6 ms / 126 ms |
| Tỷ lệ lỗi | **0.00%** (0 / 2,171,472) ✓ |
| Data received | 803 MB (5.4 MB/s) |
| Ngưỡng k6 | `p(95)<500` ✓ · `http_req_failed<1%` ✓ |

### HPA scale dưới tải
| Thời điểm | CPU (avg) | Replicas |
|---|---|---|
| nghỉ | 3% | 2 |
| tải tăng | 24% → 441% | 2 → 4 |
| đỉnh | 500% | 4 → 8 → **10 (max)** |
| sau tải | về 70% | co dần về 2 |

`Deployment/course-service`: **2 → 10 pod** (chạm `maxReplicas`), CPU trên request 100m vọt tới ~500%
→ HPA phản ứng đúng, thêm pod để giữ độ trễ thấp.

## Nhận định
- **Không chạm breakpoint**: ở 200 VU / **14.5k RPS**, p95 vẫn 37ms và **0 lỗi** — service còn dư địa.
  Trần thực nằm cao hơn mức test này (giới hạn bởi CPU của kind trên Docker Desktop, không phải app).
- **HPA hiệu quả**: mở rộng kịp thời tới trần 10 pod; nếu cần thêm, nâng `maxReplicas` hoặc để Karpenter
  cấp node (trên EKS thật).
- **Lưu ý so với production**: endpoint `/courses` local chạy **in-memory** (Scan rẻ). Trên EKS thật,
  DynamoDB thêm ~vài ms I/O và có giới hạn RCU → nên đo lại với bảng thật để lấy trần chính xác
  (mandate #19). Ứng viên nút cổ chai kế tiếp: DynamoDB RCU, không phải CPU pod.

## Spike test — tải nhảy vọt (flash-sale)
Script [`local-lab/k6-spike.js`](../local-lab/k6-spike.js): nền 5 VU → **vọt 300 VU trong 5s** → giữ 45s → rớt.
Mục đích: đo "khe scale" — pod mới cần thời gian Ready trong khi tải đã ập tới.

| Chỉ số | Giá trị |
|---|---|
| Throughput | 5,274 req/s (527,498 req) |
| p95 / p99 | 85 / 96 ms |
| **max latency** | **1.74 s** (đuôi, đúng lúc khe scale) |
| Lỗi | **0.00%** (0 / 527,498) |

**HPA phản ứng** (đo thực): CPU vọt `3% → 108% → 338% → 501%`, pods `2 → 4 → 8 → 10`, `ready` **trễ**
sau `desired` (ready 2/4 → 4/8 → 8/10) — đây chính là **khe scale**. Kết quả: **0 lỗi**, chỉ vài request
đuôi chạm ~1.7s trong lúc pod đang Ready. 2 pod nền đủ hấp thụ burst tới khi HPA đuổi kịp.

> Bài học: muốn spike êm hơn → giữ headroom cao hơn (min replicas), hoặc pre-scale trước sự kiện,
> hoặc HPA theo RPS (custom metric) để scale sớm hơn CPU.

## Soak test — bền bỉ (phát hiện rò rỉ)
Script [`local-lab/k6-soak.js`](../local-lab/k6-soak.js): 40 VU **liên tục 6 phút** (prod nên 2–8h).

| Chỉ số | Giá trị |
|---|---|
| Throughput | 21,100 req/s (7,596,030 req) |
| p95 / p99 / max | 2.6 / 41.5 / 207 ms |
| Lỗi | **0.00%** (0 / 7,596,030) |
| **Memory/pod** | **~30Mi phẳng suốt 6 phút** → không rò rỉ |

Không thấy memory tăng dần (leak), latency ổn định → service **bền** dưới tải kéo dài.

## Việc tiếp (khi có AWS)
- Chạy cùng kịch bản trên EKS với DynamoDB thật → so p95 và tìm trần RCU.
- Bật Prometheus Adapter cho HPA theo **RPS** (custom metric) thay vì chỉ CPU.
- Thêm dashboard "load test" (đã có sẵn panel latency/RPS ở dashboard SLO).
