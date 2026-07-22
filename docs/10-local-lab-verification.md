# Local Lab — Kết quả verify (kind, không AWS)

Dựng lại stack trên **kind** (3 node, Calico CNI) để test miễn phí những phần không neo vào AWS.
Cách dựng: [`local-lab/README.md`](../local-lab/README.md). Ngày chạy: 2026-07-22.

## Thành phần đã chạy

| Namespace | Pods | Thành phần |
|---|---|---|
| `eduvn` | 2× Running | course-service (Helm, in-memory) |
| `monitoring` | 7× Running | kube-prometheus-stack (Prometheus, Grafana, operator, node-exporter, kube-state-metrics) |
| `kyverno` | 4× Running | Kyverno admission + background + cleanup + reports |
| `argocd` | 5× Running | ArgoCD (server, repo, redis, controller, ...) |

Cluster: 3 node (`control-plane` + 2 worker gán `topology.kubernetes.io/zone=local-a/local-b`).

## Bằng chứng verify

### 1. GitOps (ArgoCD) — ✅
ArgoCD deploy course-service **từ git** (không `helm install` tay):
```
NAME             SYNC     HEALTH    REVISION
course-service   Synced   Healthy   7dc775f...
```
Nguồn: repo path `charts/course-service`, values `values-local.yaml`, branch `chore/local-lab`.

### 2. Deployment + hardening (Helm chart) — ✅
- 2 replica **Running**, trải trên 2 worker khác "zone" → `topologySpread` hoạt động.
- `PodDisruptionBudget minAvailable=1` (ALLOWED DISRUPTIONS ban đầu 0 khi mới 1 pod, lên 1 khi đủ 2).
- securityContext non-root / drop caps / RO rootfs áp dụng (xác nhận gián tiếp qua Kyverno pass — mục 5).

### 3. HPA + metrics-server — ✅
```
course-service   Deployment/course-service   cpu: 3%/70%   2   10   2
```
metrics-server đọc được CPU thật (`--kubelet-insecure-tls` cho kind) → HPA hoạt động.

### 4. Observability (Prometheus + ServiceMonitor) — ✅
ServiceMonitor do ArgoCD tạo; Prometheus discover và scrape cả 2 pod:
```
scrapePool: serviceMonitor/eduvn/course-service/0
up{namespace="eduvn", pod="course-service-...zvrps"} = 1
up{namespace="eduvn", pod="course-service-...twbl4"} = 1
```
→ `/metrics` (prom-client) được thu thập, sẵn cho dashboard SLO trong Grafana.

### 5. Kyverno admission — ✅
**Audit**: PolicyReport cho pod course-service = **4 PASS / 0 FAIL** (chart tuân thủ non-root,
có resources, không dùng tag `latest`).

**Enforce** (chuyển `require-run-as-nonroot` sang Enforce, thử tạo pod root):
```
Error: validation error: Container phải chạy non-root
  (securityContext.runAsNonRoot=true). rule run-as-non-root failed
```
→ Admission **chặn thật** pod vi phạm. (Đã revert về Audit sau khi test.)

### 6. NetworkPolicy (Calico enforce) — ✅
Cùng một pod đích, trước/sau khi áp `deny-all ingress`:
```
TEST 1 (chưa policy):  curl http://web  -> HTTP 200
TEST 2 (deny-all):     curl http://web  -> HTTP 000 (timeout) = BLOCKED
```
→ Calico enforce NetworkPolicy (kindnet mặc định thì không).

### 7. API course-service (in-memory) — ✅
Gọi qua Service từ pod trong cluster:
```
POST /courses -> 201 {"id":"...","title":"local-test",...}
GET  /courses -> [ ... ]
GET  /healthz -> {"status":"ok"}
```
State in-memory **không chia sẻ giữa replica** (POST vào pod A, GET có thể trúng pod B) — đúng như
thiết kế; trên EKS thật DynamoDB làm state dùng chung.

## Không test được ở local (đã biết trước)
IRSA/OIDC · Karpenter · VPC endpoints · ALB Ingress · cosign verify-images (04-verify-images).
Riêng `04-verify-images`: Kyverno mới yêu cầu `mutateDigest:false` khi failureAction=Audit — bỏ qua ở
local vì không có ECR/chữ ký; vẫn áp trên EKS thật.

## Dọn dẹp
```bash
kind delete cluster --name eduvn-local
```
