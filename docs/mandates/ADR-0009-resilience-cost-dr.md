# ADR-0009 — Resilience + Cost-non-compute + DR (Mandate #17, #18, #21)

- **Trạng thái:** Accepted · Code ready (verify cần cluster)
- **Ngày:** 2026-07-21

## #17 Resilience & containment
- **Least-privilege token**: `automountServiceAccountToken: false` — app không gọi K8s API, chỉ cần AWS
  qua **IRSA** (webhook vẫn inject token AWS riêng, không ảnh hưởng). Pod bị chiếm không gọi được K8s API.
- **Chịu dependency chậm/chết**: AWS SDK `maxAttempts: 3` + `requestTimeout: 2000ms` — DynamoDB lag không
  treo request (fail-fast, giữ SLO).
- **Containment mạng**: NetworkPolicy (ADR-0002) đã khoá đông-tây + egress.
- **Mất 1 AZ**: topologySpread + PDB (ADR-0001) + node group **3 AZ** (xem #21).

## #18 Cost beyond compute
- **VPC endpoints**: DynamoDB/S3 **gateway** (miễn phí) + ECR **interface** → traffic nội bộ, **không qua NAT**
  (cắt giờ NAT + data processing) và an toàn hơn.
- **EBS gp3** (thay gp2) + mã hoá cho node volume — rẻ hơn cùng hiệu năng.
- Telemetry retention hữu hạn (audit log 30d, Prometheus 6h).

## #21 DR failover
- **Node group 3 AZ** (a/b/c) + topologySpread theo zone + PDB → mất 1 AZ luồng ra tiền vẫn giữ SLO.
- **DynamoDB** vốn multi-AZ. Karpenter NodePool trải nhiều AZ.
- Tiên quyết #20 (backup) — xem [`DR-RESTORE-DRILL.md`](DR-RESTORE-DRILL.md).

## Trade-off
- 3 AZ + gp3 tăng chi phí **vừa phải** (chấp nhận cho chịu lỗi). VPC endpoint interface có phí giờ nhỏ
  nhưng bù lại cắt NAT — net rẻ hơn khi traffic AWS-nội-bộ nhiều.

## Verify (khi lab-up)
- `kubectl get pod -o jsonpath=...automountServiceAccountToken` = false.
- `aws ec2 describe-vpc-endpoints` — dynamodb/s3/ecr active; NAT data giảm.
- `kubectl get nodes -L topology.kubernetes.io/zone` — trải 3 AZ.
- Cordon+drain toàn bộ node 1 AZ dưới tải → luồng phục hồi trong RTO.
