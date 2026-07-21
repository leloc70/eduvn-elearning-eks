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

## §Obs — Prometheus / Grafana / Karpenter (#13, nền #16)
```bash
# Prometheus + Grafana + Alertmanager
kubectl -n monitoring get pods
kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090   # http://localhost:9090
kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80   # http://localhost:3000 (admin/eduvn-admin)

# Karpenter
kubectl -n karpenter get pods                 # Running
kubectl get nodepool,ec2nodeclass             # READY True
kubectl -n karpenter logs deploy/karpenter -f # xem quyết định provision/consolidate
kubectl get nodes -L karpenter.sh/nodepool,node.kubernetes.io/instance-type,kubernetes.io/arch
```
**Bằng chứng (2026-07-21):** monitoring pods all Running; `nodepool/default` + `ec2nodeclass/default` READY True;
karpenter Running (sau khi sửa Pod Identity namespace).

## §DR — Backup/Restore (#20) — ĐÃ VERIFIED
Drill PITR trên bảng live `eduvn-courses` (2026-07-21):
```
PITR status: ENABLED
Item count production: 2
restore-table-to-point-in-time -> eduvn-courses-restore-test (ACTIVE)
Item count bảng restore: 2  ← KHỚP -> dữ liệu khôi phục đúng ✓
delete-table eduvn-courses-restore-test (dọn)
```
Runbook: [`DR-RESTORE-DRILL.md`](DR-RESTORE-DRILL.md). Restore ra bảng mới → không đụng production.

## §Pipeline/Resilience/Cost/DR (B — verify khi cluster chạy)
```bash
# #10 image đã ký:
cosign verify --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp "https://github.com/leloc70/.*" \
  <registry>/eduvn/course-service:sha-xxxx
kubectl apply -f k8s/policies/04-verify-images.yaml   # Audit -> Enforce
# #17: automountServiceAccountToken=false
kubectl get pod -l app.kubernetes.io/name=course-service -o jsonpath='{.items[0].spec.automountServiceAccountToken}'
# #18: VPC endpoints
aws ec2 describe-vpc-endpoints --query "VpcEndpoints[].ServiceName"
# #21: node trải 3 AZ
kubectl get nodes -L topology.kubernetes.io/zone
```

## Ghi chú
- Kyverno đang **Audit** → để đạt DoD #5 (chặn thật) đổi `validationFailureAction: Audit → Enforce`
  trong `k8s/policies/*.yaml` rồi `kubectl apply -f k8s/policies/`.
- Mỗi mandate mới apply → thêm mục ở đây kèm lệnh + output thật.
