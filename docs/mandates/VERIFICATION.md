# Verification — bằng chứng đã apply mandate (eduvn)

Cách verify từng mandate + output thật đã chụp (2026-07-21, cluster `eduvn-dev`).
Prereq: `aws sso login --sso-session eduvn`; `aws eks update-kubeconfig --name eduvn-dev --region ap-southeast-1`.

---

## §M1 — Network exposure (#1)
```bash
kubectl get networkpolicy course-service        # phải có
kubectl -n argocd get svc argocd-server          # type ClusterIP, KHÔNG external IP
curl -s https://api.mywebsitelocle.click/healthz # storefront/API public 200
```
**Bằng chứng:**
```
networkpolicy.networking.k8s.io/course-service   app.kubernetes.io/name=course-service
https://api.mywebsitelocle.click/healthz -> {"status":"ok"}
ArgoCD: ClusterIP, chỉ vào qua kubectl port-forward
```

## §M2 — Scale under budget (#2)
```bash
kubectl get hpa course-service
kubectl get pods -n kube-system -l app.kubernetes.io/name=metrics-server
```
**Bằng chứng (HPA đọc được CPU = metrics-server chạy, HPA hoạt động):**
```
course-service   Deployment/course-service   cpu: 3%/70%   2   10   2
metrics-server-...  1/1  Running
```

## §M3 — Reliability / no-downtime (#3)
```bash
kubectl get pdb,deploy -l app.kubernetes.io/name=course-service
# demo bảo trì (làm dưới tải, xem SLO):
kubectl rollout restart deploy/course-service      # không rớt request
kubectl drain <node> --ignore-daemonsets --delete-emptydir-data   # PDB giữ ≥1 pod
```
**Bằng chứng:**
```
poddisruptionbudget/course-service   MIN AVAILABLE 1   ALLOWED DISRUPTIONS 1
deployment/course-service            2/2 ready
```

## §M4 — Auditability (#4, phần audit log)
```bash
aws eks describe-cluster --name eduvn-dev --query "cluster.logging.clusterLogging" --output json
aws logs describe-log-streams --log-group-name /aws/eks/eduvn-dev/cluster \
  --log-stream-name-prefix kube-apiserver-audit --query "logStreams[0].logStreamName"
```
**Kỳ vọng:** `enabled: true` cho `["api","audit","authenticator"]`; có log stream audit.

## §M5 — Runtime hardening (#5)
```bash
kubectl get pod -l app.kubernetes.io/name=course-service \
  -o jsonpath='{.items[0].spec.containers[0].securityContext}'   # runAsNonRoot, uid 1001, drop ALL
kubectl exec deploy/course-service -- id                          # uid=1001 (không phải 0)
kubectl get clusterpolicy                                         # 3 policy
# sau khi đổi Audit->Enforce:
kubectl apply -f k8s/policies/_test-violations.yaml               # PHẢI bị từ chối cả 3 luật
```
**Bằng chứng:**
```
pods 2/2 Running (image sha-52475b9, non-root)
clusterpolicy: require-run-as-nonroot, disallow-latest-tag, require-resources  (Audit)
```

## §M8/#9 — Managed data
```bash
kubectl get pods | grep -iE "postgres|redis|kafka|valkey"   # RỖNG (không tự host)
aws dynamodb describe-table --table-name eduvn-dev-courses --query "Table.TableStatus"
```
**Bằng chứng:** không có pod data; DynamoDB `ACTIVE`, managed, mã hoá mặc định, truy cập qua IRSA.

---

## Ghi chú
- Kyverno đang **Audit** → để đạt DoD #5 (chặn thật) đổi `validationFailureAction: Audit → Enforce`
  trong `k8s/policies/*.yaml` rồi `kubectl apply -f k8s/policies/`.
- Mỗi mandate mới apply → thêm mục ở đây kèm lệnh + output thật.
