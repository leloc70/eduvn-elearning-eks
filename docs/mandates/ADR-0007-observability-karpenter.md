# ADR-0007 — Observability + Karpenter (nền cho #13/#16)

- **Trạng thái:** Accepted · Applied
- **Ngày:** 2026-07-21
- **Mandate:** #13 (cost elastic) + nền đo lường cho #16 (latency), #2/#3 (SLO dashboard)

## Decision
- **kube-prometheus-stack** (Prometheus + Grafana + Alertmanager + node-exporter + kube-state-metrics)
  ở namespace `monitoring`. Grafana **ClusterIP** (private — Mandate #1), truy cập qua port-forward.
  - `emptyDir` (không PVC) vì cluster không có ebs-csi; retention 6h (lab).
  - `timeout = 900` cho helm (stack lớn).
- **Karpenter** (v1.0.8) provision node theo tải:
  - IAM controller + node role + SQS interruption queue qua submodule `eks//modules/karpenter`,
    **Pod Identity** (namespace `karpenter` — phải khớp nơi cài helm).
  - **NodePool** cho phép `spot` + `on-demand`, arch `amd64` **và `arm64` (Graviton)** → chọn rẻ nhất.
  - `consolidationPolicy: WhenEmptyOrUnderutilized` → co node xuống lúc rảnh (trả tiền theo demand).
  - Discovery subnet/SG qua tag `karpenter.sh/discovery: eduvn-dev`.

## Consequences / trade-off
- (+) Grafana/Prometheus để đo SLO, p95/p99, theo dõi lúc drain/flash-sale.
- (+) Karpenter: Spot + Graviton + scale-down → rẻ theo demand (#13).
- (−) Prometheus `emptyDir` → mất metric khi pod restart (chấp nhận cho lab; prod cần PVC/remote-write).
- (−) Managed node group (2-3) vẫn tồn tại song song với Karpenter — có thể chuyển hẳn sang Karpenter sau.
- (−) Stack observability tốn ~1-2 pod nặng; cluster nhỏ dễ đụng **pod-density** (đã xử bằng thêm node).

## Verify (xem VERIFICATION.md §Obs)
`kubectl -n monitoring get pods` all Running; `kubectl get nodepool,ec2nodeclass` READY True;
`kubectl -n karpenter logs` không lỗi.

## Bài học (xem INCIDENTS #14/#15/#17)
Pod Identity association **phải khớp namespace**; Pending có thể do **pod-density**; YAML CRLF làm kubectl lỗi.
