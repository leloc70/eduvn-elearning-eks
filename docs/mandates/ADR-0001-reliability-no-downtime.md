# ADR-0001 — Reliability / bảo trì no-downtime (Mandate #3)

- **Trạng thái:** Accepted · Applied
- **Ngày:** 2026-07-21
- **Mandate:** #3 — bảo trì trong giờ vận hành, luồng ra tiền không rớt

## Context
course-service ban đầu chỉ có probes cơ bản, không PDB, không chiến lược rollout an toàn →
drain node / rolling-restart có thể rớt request khách.

## Decision
Áp lên chart `course-service`:
- **replicas ≥ 2** (qua HPA minReplicas: 2) — bỏ single-point-of-failure.
- **readiness/liveness probe** (`/readyz`, `/healthz`) — pod chưa sẵn sàng không nhận traffic.
- **Rollout zero-downtime:** `strategy.rollingUpdate.maxUnavailable: 0`, `maxSurge: 1`,
  `minReadySeconds: 10`, `preStop: sleep 5` (drain kết nối), `terminationGracePeriodSeconds: 30`.
- **PodDisruptionBudget** `minAvailable: 1` — drain node luôn giữ ≥1 pod sống.
- **topologySpreadConstraints** theo `topology.kubernetes.io/zone` — trải pod nhiều AZ.

## Consequences / trade-off
- (+) Drain node / rollout không rớt request; nền cho #21 (mất AZ).
- (−) `maxUnavailable: 0` làm rollout chậm hơn chút (chờ pod mới Ready). Chấp nhận để bảo vệ SLO.
- (−) +1 replica tốn thêm ~½ node — trong ngân sách (service nhẹ).

## Verify (xem VERIFICATION.md §M3)
`kubectl get pdb,deploy` → PDB allowed-disruptions 1, deploy 2/2. `rollout restart deploy/course-service`
dưới tải → không rớt request.

## Rollback
`helm rollback` / xoá PDB. Không ảnh hưởng dữ liệu (DynamoDB tách khỏi pod).
