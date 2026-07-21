# Plan apply — mandate mới cho eduvn

Bỏ AI/AIO (#6,7,14,15,22). TF4-only (#11,12) chỉ làm nếu là TF4. Dưới đây là các mandate **áp dụng
được cho eduvn**, xếp theo giá trị × độ khớp. Mỗi mục: **làm gì · artifact · ADR · verify**.

Ràng buộc chung: giữ trong ngân sách, không hạ SLO, mỗi thay đổi lớn → **ADR ký tên** + cập nhật
[`VERIFICATION.md`](VERIFICATION.md).

---

## P0 — #10 Secure delivery pipeline (gap lớn nhất)
**Đã có:** branch protection + 3 required check, immutable ECR, build theo service (cd chỉ trigger `services/`), tag sha (≠latest).
**Cần thêm:**
1. **Scan là cổng chặn** (không phải informational): Trivy image + Checkov IaC **fail trên HIGH/CRITICAL** → đưa vào **required checks**.
2. **Ký image (cosign) + SBOM + provenance** trong `cd.yml`; ECR immutable (đã có).
3. **Admission verify image**: Kyverno `verifyImages` — chỉ chạy image **đã ký + tham chiếu digest** (enforce).
4. **Pin nguồn**: GitHub Actions theo **commit SHA**; base image theo **digest** trong Dockerfile.
5. **Provenance traceable**: từ pod → digest → commit → PR duyệt → scan pass → chữ ký → SBOM.
- **Artifact:** `cd.yml` (cosign+SBOM), `k8s/policies/04-verify-images.yaml`, Dockerfile digest, `.github/workflows/*` SHA-pin.
- **ADR:** ADR-0007-secure-pipeline.
- **Verify:** mở PR CI đỏ → chặn merge; deploy image chưa ký → admission từ chối; `cosign verify` + `cosign download sbom` chạy được cho 1 pod.

## P0 — #13 Cost efficiency elastic (spot/Graviton/autoscaler)
**Đã có:** node group SPOT, PDB, HPA, topologySpread.
**Cần thêm:**
1. **Cluster Autoscaler / Karpenter** — scale node theo tải, **co xuống thật** lúc rảnh (hiện node group cố định min2/max4).
2. **Graviton (arm64)**: thêm node group `t4g`/`c7g` (build image multi-arch hoặc arm64).
3. **Sống sót spot interruption**: kill 1 spot node dưới tải → 0 request rớt (PDB + replicas + drain — đã có nền).
- **Artifact:** `infra/karpenter.tf` (hoặc cluster-autoscaler helm), node group arm64, Dockerfile buildx arm64.
- **ADR:** ADR-0008-cost-elastic.
- **Verify:** EC2 console cột Lifecycle=spot + Architecture=arm64; `kubectl get nodes` co xuống lúc rảnh; kill spot node → app không rớt.

## P1 — #17 Resilience & containment
**Đã có:** NetworkPolicy, topologySpread by zone, multi-AZ node group, securityContext.
**Cần thêm:**
1. **RBAC least-privilege**: `automountServiceAccountToken: false` cho course-service (không cần K8s API); Role tối thiểu nếu cần.
2. **Chịu dependency chết**: course-service → DynamoDB timeout + fallback (trả cache / danh sách rỗng thay vì treo).
3. **Chịu mất 1 AZ**: đã có topologySpread + PDB + 2 AZ → verify.
- **Artifact:** chart `automountServiceAccountToken`, backend timeout/retry AWS SDK, ADR.
- **ADR:** ADR-0009-resilience-containment.
- **Verify:** pod "attacker" không quét được service khác / không egress tùy tiện; giết dependency → luồng vẫn giữ SLO.

## P1 — #18 Cost beyond compute
**Cần thêm:**
1. **VPC endpoints** cho **DynamoDB (gateway) + ECR + S3** → cắt giờ NAT + data processing (và an toàn hơn).
2. **EBS gp3** (node volume), lifecycle snapshot.
3. **Dọn orphan** (EBS available, EIP, LB thừa) — script kiểm.
4. **Telemetry retention hữu hạn** (audit log 30d — đã set).
- **Artifact:** `infra/vpc-endpoints.tf`, gp3 trong node group, script `scripts/find-orphans.ps1`.
- **ADR:** ADR-0010-cost-beyond-compute.
- **Verify:** VPC endpoint active; NAT data giảm; `find-orphans` ra rỗng.

## P1 — #20 DR backup/restore
**Cần thêm:**
1. **DynamoDB PITR** (point-in-time recovery) cho bảng courses + on-demand backup.
2. **Remote Terraform state** (S3 + DynamoDB lock) — hiện local, không backup được.
3. **Restore drill**: xoá item → restore PITR ra bảng tách biệt → chứng minh data trở lại; đo RTO.
4. **Backup an toàn**: tách quyền xoá backup (IAM).
- **Artifact:** `infra/dynamodb.tf` (`point_in_time_recovery`), `infra/backend.tf` (S3 state), runbook drill.
- **ADR:** ADR-0011-dr-backup-restore (RPO/RTO, retention, ai được xoá backup).
- **Verify:** console DynamoDB PITR ON; drill: xoá → restore → data đúng, đo RTO.

## P2 — #21 DR failover (tiên quyết #20)
**Đã có:** DynamoDB multi-AZ, node group 2 AZ, topologySpread + PDB.
**Cần thêm:** nâng node group **3 AZ**; verify mất 1 AZ dưới tải → SLO dip rồi recover, 0 mất đơn.
- **ADR:** ADR-0012-dr-failover (RTO/RPO khi mất 1 AZ).
- **Verify:** cordon+drain toàn bộ node 1 AZ dưới tải → luồng phục hồi trong RTO.

---

## Hạn chế cho eduvn (ghi rõ, không cố nhồi)
- **#8/#9 managed:** eduvn dùng **DynamoDB** (đã managed, multi-AZ, IRSA không creds tĩnh) → phần lớn **đã thỏa/N-A**. Không có Postgres/Redis/Kafka pod để migrate. Xem [ADR-0006](ADR-0006-managed-data.md).
- **#16 latency / #19 throughput:** cần OpenTelemetry tracing + load infra mà eduvn (1 service đơn giản) chưa có. Làm được nhưng ROI thấp — để sau; nếu làm: thêm OTel + Locust load test.

## Thứ tự đề xuất
```
#10 secure pipeline  →  #13 cost elastic  →  #17 resilience  →  #18 cost-non-compute
→  #20 DR backup  →  #21 DR failover
```
Mỗi bước: apply → viết ADR → cập nhật VERIFICATION.md (lệnh + output thật).
