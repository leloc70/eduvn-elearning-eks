# DevOps K8s Lab — thực hành theo mandate (trên kind)

Bộ bài tập đóng vai **DevOps/SRE** vận hành course-service trên cluster kind. Mỗi mission bám một
mandate thật của dự án, có: **bối cảnh → nhiệm vụ → tiêu chí đạt → lời giải**. Làm tuần tự.

> Chuẩn bị: đã dựng lab theo [`README.md`](README.md) (course-service Synced/Healthy qua ArgoCD,
> Prometheus + Kyverno + Calico chạy). Kiểm tra nhanh:
> ```bash
> kubectl -n eduvn get deploy,hpa,pdb
> kubectl -n argocd get application course-service
> ```

Ký hiệu: 🎯 mục tiêu · 🛠️ việc cần làm · ✅ tiêu chí đạt · 💡 lời giải (bấm mở).

> **Windows/Git Bash:** nếu một lệnh có tham số bắt đầu bằng `/` (vd `/var/...`, `/readyz`) bị dịch
> nhầm thành đường dẫn Windows, thêm tiền tố `MSYS_NO_PATHCONV=1` trước lệnh đó. Trên Linux/macOS bỏ qua.

---

## Mission 0 — Recon (làm quen)
🎯 Nắm được topology trước khi đụng vào gì.

🛠️
1. Liệt kê mọi workload của course-service và node chúng đang chạy.
2. Tìm ServiceMonitor + xác nhận Prometheus đang scrape (target `up=1`).
3. Xem 20 dòng log gần nhất của một pod.

✅ Trả lời được: mấy replica? nằm trên mấy node/"zone"? endpoint metrics là gì?

<details><summary>💡 Lời giải</summary>

```bash
kubectl -n eduvn get pods -o wide
kubectl -n eduvn get servicemonitor course-service -o yaml | grep -A3 endpoints
kubectl -n eduvn logs deploy/course-service --tail=20
# 2 replica, trên worker + worker2 (zone local-a/local-b), scrape /metrics port http
```
</details>

---

## Mission 1 — Rollout không downtime + rollback (Mandate 03)
🎯 Cập nhật app mà **không rớt request**, và biết cứu khi deploy hỏng.

🛠️
1. Kích hoạt một rolling update (đổi một annotation trên pod template).
2. Trong lúc update, poll `/healthz` liên tục — chứng minh **không có request lỗi**.
3. Đẩy một bản "hỏng" (image không tồn tại) → rollout **kẹt** → **rollback** về bản tốt.

✅ `kubectl rollout status` báo complete; trong lúc rollout luôn có ≥1 pod Ready; sau khi đẩy bản
hỏng, rollout không bao giờ đạt, và `rollout undo` khôi phục Ready.

<details><summary>💡 Lời giải</summary>

```bash
# 1-2. rolling update + kiểm tra tính sẵn sàng
kubectl -n eduvn patch deploy course-service -p \
  '{"spec":{"template":{"metadata":{"annotations":{"lab/roll":"'$(date +%s)'"}}}}}'
kubectl -n eduvn rollout status deploy/course-service   # theo dõi maxUnavailable=0
# (song song 1 terminal khác) kiểm tra không downtime:
kubectl run poll --rm -it --image=curlimages/curl -n eduvn --restart=Never -- \
  sh -c 'for i in $(seq 1 60); do curl -s -o /dev/null -w "%{http_code} " http://course-service/healthz; sleep 0.5; done'
#   -> toàn 200

# 3. bản hỏng -> kẹt -> rollback
kubectl -n eduvn set image deploy/course-service course-service=course-service:doesnotexist
kubectl -n eduvn rollout status deploy/course-service --timeout=40s   # sẽ FAIL (ImagePullBackOff)
kubectl -n eduvn rollout undo deploy/course-service
kubectl -n eduvn rollout status deploy/course-service                 # OK trở lại
```
Vì `maxUnavailable=0` + `maxSurge=1` (chart), pod cũ chỉ bị xoá sau khi pod mới Ready → 0 downtime.
</details>

---

## Mission 2 — PodDisruptionBudget + drain node (Mandate 03/21)
🎯 Bảo trì node (nâng cấp/patch) mà service **không rớt xuống 0**.

🛠️
1. Xem PDB hiện tại (`minAvailable`).
2. `drain` một worker đang chứa pod course-service.
3. Quan sát: pod bị evict và được xếp lại nơi khác, **luôn còn ≥1 pod Ready**.
4. `uncordon` trả node về.

✅ Trong lúc drain, số pod Available không bao giờ = 0; drain tôn trọng PDB (không evict cùng lúc
làm rớt dưới minAvailable).

<details><summary>💡 Lời giải</summary>

```bash
kubectl -n eduvn get pdb course-service          # minAvailable=1
NODE=$(kubectl -n eduvn get pod -l app.kubernetes.io/name=course-service \
        -o jsonpath='{.items[0].spec.nodeName}')
kubectl drain "$NODE" --ignore-daemonsets --delete-emptydir-data --pod-selector app.kubernetes.io/name=course-service
# (terminal khác) watch: kubectl -n eduvn get pods -o wide -w
kubectl -n eduvn get deploy course-service        # AVAILABLE luôn >=1
kubectl uncordon "$NODE"
```
PDB `minAvailable=1` chặn evict pod cuối cùng cho tới khi có pod thay thế Ready.
</details>

---

## Mission 3 — HPA scale dưới tải (Mandate 02/13)
🎯 Chứng minh app **tự scale** khi tải tăng, và co lại khi hết tải.

🛠️
1. Xem HPA (min2/max10, target CPU 70%).
2. Tạo tải liên tục vào `/courses` từ nhiều client.
3. Quan sát replica tăng; khi dừng tải, quan sát scale-down (sau vài phút cooldown).

> Endpoint rất nhẹ nên CPU có thể không vọt tới 70%. Để demo chắc ăn, tạm hạ target xuống ~20%.

✅ `REPLICAS` tăng > 2 khi có tải; giảm về 2 khi hết tải.

<details><summary>💡 Lời giải</summary>

```bash
# (tuỳ chọn) hạ ngưỡng cho dễ thấy
kubectl -n eduvn patch hpa course-service --type=json \
  -p='[{"op":"replace","path":"/spec/metrics/0/resource/target/averageUtilization","value":20}]'

# tạo tải bằng vài pod bắn liên tục
for i in 1 2 3; do
  kubectl -n eduvn run load$i --image=curlimages/curl --restart=Never -- \
    sh -c 'while true; do wget -q -O- http://course-service/courses >/dev/null; done'
done
watch kubectl -n eduvn get hpa course-service   # theo dõi TARGETS % và REPLICAS tăng

# dọn tải -> chờ scale-down
kubectl -n eduvn delete pod load1 load2 load3
# (khôi phục target 70 nếu đã đổi)
kubectl -n eduvn patch hpa course-service --type=json \
  -p='[{"op":"replace","path":"/spec/metrics/0/resource/target/averageUtilization","value":70}]'
```
</details>

---

## Mission 4 — NetworkPolicy least-exposure (Mandate 01)
🎯 Chỉ cho traffic hợp lệ vào pod; mọi thứ khác **bị chặn** (giảm bề mặt tấn công).

🛠️
1. Đọc NetworkPolicy của course-service: ingress cho gì? egress cho gì?
2. Chứng minh Calico **enforce**: một pod bị `deny-all` thì không gọi được, pod được phép thì gọi được.
3. Giải thích vì sao ở EKS thật `ingressCIDRs` là VPC CIDR (ALB) còn local là pod-CIDR.

✅ Thấy rõ 200 (được phép) vs 000/timeout (bị chặn).

<details><summary>💡 Lời giải</summary>

```bash
kubectl -n eduvn get networkpolicy course-service -o yaml
# egress chỉ mở 53 (DNS) + 443 (HTTPS ra AWS). ingress chỉ từ allowlist CIDR tới port 8080.

# demo enforce (pod phụ + deny-all):
kubectl -n eduvn create deployment web --image=nginx && kubectl -n eduvn expose deploy web --port=80
kubectl -n eduvn run t --rm -it --image=curlimages/curl --restart=Never -- curl -m5 -o /dev/null -w "%{http_code}\n" http://web   # 200
kubectl -n eduvn apply -f - <<'YAML'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: web-deny, namespace: eduvn }
spec: { podSelector: { matchLabels: { app: web } }, policyTypes: [Ingress], ingress: [] }
YAML
kubectl -n eduvn run t --rm -it --image=curlimages/curl --restart=Never -- curl -m5 -o /dev/null -w "%{http_code}\n" http://web   # 000 (blocked)
kubectl -n eduvn delete deploy web svc web networkpolicy web-deny
```
kindnet mặc định **không** enforce NetworkPolicy — phải dùng CNI như Calico.
</details>

---

## Mission 5 — Runtime hardening + Kyverno Audit→Enforce (Mandate 05)
🎯 Chặn workload không an toàn ngay tại admission.

🛠️
1. Xem PolicyReport của namespace eduvn — course-service pass mấy policy?
2. Thử deploy một pod "xấu" (chạy root, dùng tag `latest`, không đặt resources) ở chế độ Audit → chỉ
   cảnh báo.
3. Chuyển các policy sang **Enforce** → deploy lại pod xấu → **bị chặn**. Rồi sửa cho đạt.
4. Trả policy về Audit.

✅ Audit: report có `fail/warn` cho pod xấu nhưng vẫn tạo. Enforce: `kubectl apply` bị từ chối kèm lý do.

<details><summary>💡 Lời giải</summary>

```bash
kubectl -n eduvn get policyreport -o custom-columns=NAME:.metadata.name,PASS:.summary.pass,FAIL:.summary.fail

# pod xấu (Audit -> tạo được nhưng bị ghi vi phạm)
kubectl -n eduvn run bad --image=nginx:latest   # root + latest + no resources

# chuyển Enforce
for p in require-run-as-nonroot disallow-latest-tag require-resources; do
  kubectl patch clusterpolicy $p --type=json -p='[{"op":"replace","path":"/spec/validationFailureAction","value":"Enforce"}]'
done
kubectl -n eduvn run bad2 --image=nginx:latest   # -> bị CHẶN, in rõ rule vi phạm

# bản đạt chuẩn
kubectl -n eduvn apply -f - <<'YAML'
apiVersion: v1
kind: Pod
metadata: { name: good, namespace: eduvn }
spec:
  securityContext: { runAsNonRoot: true, runAsUser: 1001 }
  containers:
  - name: app
    image: nginx:1.27
    securityContext: { runAsNonRoot: true, allowPrivilegeEscalation: false, capabilities: { drop: [ALL] } }
    resources: { requests: { cpu: 50m, memory: 64Mi }, limits: { memory: 128Mi } }
YAML

# dọn + trả Audit
kubectl -n eduvn delete pod bad good --ignore-not-found
for p in require-run-as-nonroot disallow-latest-tag require-resources; do
  kubectl patch clusterpolicy $p --type=json -p='[{"op":"replace","path":"/spec/validationFailureAction","value":"Audit"}]'
done
```
</details>

---

## Mission 6 — Observability & SLO (Mandate 07/16)
🎯 Đo được sức khỏe dịch vụ: RPS, error rate, latency p95.

🛠️
1. Port-forward Prometheus + Grafana.
2. Sinh chút traffic, rồi viết PromQL cho **RPS**, **error rate**, **p95 latency**.
3. (Bonus) Tạo một PrometheusRule cảnh báo khi p95 > 0.5s.

✅ PromQL trả số liệu; (bonus) rule xuất hiện trong Prometheus → Alerts.

<details><summary>💡 Lời giải</summary>

```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090:9090 &
kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80 &   # admin/admin

# sinh traffic
kubectl -n eduvn run gen --rm -it --image=curlimages/curl --restart=Never -- \
  sh -c 'for i in $(seq 1 300); do curl -s -o /dev/null http://course-service/courses; done'
```
PromQL (dán vào Prometheus/Grafana):
```promql
# RPS
sum(rate(http_request_duration_seconds_count{service="course-service"}[1m]))
# error rate (5xx)
sum(rate(http_request_duration_seconds_count{service="course-service",status=~"5.."}[5m]))
# p95 latency
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="course-service"}[5m])) by (le))
```
Bonus — alert:
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: course-service-slo
  namespace: monitoring
  labels: { release: kube-prometheus-stack }
spec:
  groups:
  - name: course-service.slo
    rules:
    - alert: HighLatencyP95
      expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="course-service"}[5m])) by (le)) > 0.5
      for: 2m
      labels: { severity: warning }
      annotations: { summary: "p95 latency course-service > 500ms" }
```
</details>

---

## Mission 7 — Resilience & containment (Mandate 17)
🎯 Một pod hỏng không kéo sập service; giảm quyền pod tối đa.

🛠️
1. Chứng minh pod **không** mount token ServiceAccount (`automountServiceAccountToken=false`).
2. Làm một pod fail readiness (đổi readinessProbe sang path sai) → pod bị **loại khỏi Endpoints** →
   traffic vẫn được pod khỏe phục vụ.
3. Khôi phục.

✅ Không có file token trong pod; pod NotReady biến mất khỏi `endpoints`; `/healthz` qua Service vẫn 200.

<details><summary>💡 Lời giải</summary>

```bash
# 1. không có token — kiểm qua spec (không phụ thuộc shell dịch đường dẫn)
POD=$(kubectl -n eduvn get pod -l app.kubernetes.io/name=course-service -o name | head -1)
kubectl -n eduvn get $POD -o jsonpath='{.spec.automountServiceAccountToken}'; echo   # -> false
kubectl -n eduvn get $POD -o jsonpath='{range .spec.volumes[*]}{.name}{"\n"}{end}'    # KHÔNG có volume kube-api-access-*
# (cách khác, chạy TRONG pod — Git Bash cần MSYS_NO_PATHCONV=1 để không dịch đường dẫn):
MSYS_NO_PATHCONV=1 kubectl -n eduvn exec $POD -- ls /var/run/secrets/kubernetes.io/serviceaccount 2>&1 || echo "KHÔNG có token (đúng)"

# 2. phá readiness của 1 pod bằng cách sửa deploy tạm (probe path sai) rồi xem endpoints
kubectl -n eduvn patch deploy course-service --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/nope"}]'
kubectl -n eduvn get endpoints course-service -w   # số địa chỉ giảm dần khi pod NotReady
# service vẫn phục vụ nếu còn pod ready; nếu cả 2 NotReady thì rớt -> minh hoạ vì sao cần probe đúng

# 3. khôi phục
kubectl -n eduvn patch deploy course-service --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/readyz"}]'
```
> Lưu ý: ArgoCD selfHeal sẽ tự revert các patch trực tiếp trên deploy về đúng git — tính năng, không
> phải lỗi. Muốn giữ thay đổi thì sửa ở git (values) và để ArgoCD sync.
</details>

---

## Mission 8 (Capstone) — Điều tra sự cố
🎯 Đóng vai on-call: mình phá, bạn chẩn đoán & sửa.

🛠️ Chạy đoạn "gây sự cố" dưới đây (đọc sau khi đã thử tự tay). Triệu chứng: **course-service không
còn được Prometheus scrape** (target biến mất / down). Nhiệm vụ: tìm nguyên nhân gốc và khắc phục,
ghi lại theo mẫu [`docs/INCIDENTS.md`](../docs/INCIDENTS.md) (triệu chứng → điều tra → root cause → fix).

<details><summary>🔧 Đoạn gây sự cố (chạy rồi mới điều tra)</summary>

```bash
# Thắt NetworkPolicy: chỉ cho pod-CIDR /24 sai -> Prometheus (khác /24) bị chặn scrape
kubectl -n eduvn patch networkpolicy course-service --type=json \
  -p='[{"op":"replace","path":"/spec/ingress/0/from/0/ipBlock/cidr","value":"10.244.99.0/24"}]'
```
</details>

<details><summary>💡 Hướng điều tra + fix</summary>

- `kubectl -n eduvn get endpoints course-service` → vẫn có pod (app sống).
- Prometheus UI → Status/Targets → course-service **down**, lỗi context deadline/timeout khi scrape.
- App healthy nhưng scrape fail ⇒ nghi **network**. Xem `kubectl -n eduvn describe networkpolicy course-service`
  → ingress allowlist CIDR không chứa IP của Prometheus.
- **Root cause:** allowlist NetworkPolicy bị thu hẹp sai, chặn luôn scrape từ pod-network.
- **Fix:** trả CIDR về pod-subnet của kind:
  ```bash
  kubectl -n eduvn patch networkpolicy course-service --type=json \
    -p='[{"op":"replace","path":"/spec/ingress/0/from/0/ipBlock/cidr","value":"10.244.0.0/16"}]'
  ```
  (hoặc `kubectl -n argocd app sync course-service` để ArgoCD trả về đúng git.)
</details>

---

# 🚀 Phần nâng cao (Advanced)

> Mỗi mission dưới đây cần cài thêm 1 công cụ. Đánh dấu 🐏 = tốn RAM nhiều (làm chọn lọc, xong thì gỡ).
> Các lệnh đã được **kiểm chứng trên cluster này** ở những mission ghi ✔️.

## Mission 9 ✔️ — Progressive delivery: Canary với Argo Rollouts (Mandate 03)
🎯 Phát hành an toàn hơn RollingUpdate: đưa % traffic sang bản mới theo bước, **có cổng người duyệt**,
tự rollback nếu hỏng.

🛠️
1. Cài Argo Rollouts controller (+ kubectl plugin).
2. Triển khai một `Rollout` (canary 25%→50%→100%, pause chờ duyệt) dùng image course-service.
3. Trigger một bản mới → quan sát **dừng ở 25%** (1 canary + 3 stable) → `promote` → hoàn tất.
4. (Bonus) `abort` giữa chừng → tự trả về bản stable.

✅ Rollout dừng đúng ở step canary; sau `promote` mới đi tiếp; `abort` khôi phục stable ngay.

<details><summary>💡 Lời giải (đã chạy thật)</summary>

```bash
# 1. controller + plugin
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
# plugin (Linux/mac; Windows tải bản .exe tương ứng và để vào PATH)
curl -sSLo kubectl-argo-rollouts https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x kubectl-argo-rollouts && sudo mv kubectl-argo-rollouts /usr/local/bin/

# 2. Rollout canary
kubectl create namespace lab
kubectl apply -f - <<'YAML'
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: { name: course-canary, namespace: lab }
spec:
  replicas: 4
  strategy:
    canary:
      steps: [ {setWeight: 25}, {pause: {}}, {setWeight: 50}, {pause: {duration: 20}}, {setWeight: 100} ]
  selector: { matchLabels: { app: course-canary } }
  template:
    metadata: { labels: { app: course-canary } }
    spec:
      containers:
      - name: app
        image: course-service:local
        imagePullPolicy: IfNotPresent
        ports: [ { containerPort: 8080 } ]
        readinessProbe: { httpGet: { path: /readyz, port: 8080 } }
        resources: { requests: { cpu: 50m, memory: 64Mi }, limits: { memory: 128Mi } }
        securityContext: { runAsNonRoot: true, runAsUser: 1001, allowPrivilegeEscalation: false, capabilities: { drop: [ALL] } }
YAML

# 3. trigger bản mới -> dừng ở canary 25%
kubectl -n lab patch rollout course-canary --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/env","value":[{"name":"VERSION","value":"v2"}]}]'
kubectl argo rollouts get rollout course-canary -n lab --watch   # thấy Paused, Step 1/5, SetWeight 25
kubectl argo rollouts promote course-canary -n lab              # đẩy tiếp -> Healthy 5/5

# 4. bonus: abort
# kubectl argo rollouts abort course-canary -n lab   # trả về stable ngay

# dọn
kubectl delete ns lab
```
Kết quả đã verify: `Paused | Step 1/5 | SetWeight 25` với **1 canary + 3 stable pod**, sau `promote` → `Healthy 5/5`.
</details>

---

## Mission 10 ✔️ — Kyverno nâng cao: mutate + generate (Mandate 05/01)
🎯 Không chỉ *chặn* (validate) mà còn *tự sửa* (mutate) và *tự tạo tài nguyên bảo vệ* (generate).

🛠️
1. **Mutate**: viết policy tự thêm `runAsNonRoot`, `drop: [ALL]` vào mọi pod thiếu — tạo pod trần, xác nhận đã được vá.
2. **Generate**: viết policy tự tạo một `NetworkPolicy default-deny` cho mỗi namespace mới.

✅ Pod trần sau khi tạo đã có securityContext; namespace mới tự có NetworkPolicy deny-all.

<details><summary>💡 Lời giải (mutate đã chạy thật)</summary>

```bash
# 1. MUTATE — auto-harden pod ở ns 'lab'
kubectl apply -f - <<'YAML'
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: auto-add-securitycontext }
spec:
  rules:
  - name: add-nonroot
    match: { any: [ { resources: { kinds: [Pod], namespaces: [lab] } } ] }
    mutate:
      patchStrategicMerge:
        spec:
          securityContext: { runAsNonRoot: true, runAsUser: 1001 }
          containers:
          - (name): "*"
            securityContext: { allowPrivilegeEscalation: false, capabilities: { drop: [ALL] } }
YAML
kubectl -n lab run bare --image=nginx:1.27 --restart=Never
kubectl -n lab get pod bare -o jsonpath='{.spec.securityContext.runAsNonRoot} {.spec.containers[0].securityContext.capabilities.drop}{"\n"}'
#   -> true ["ALL"]   (Kyverno tự thêm)

# 2. GENERATE — default-deny NetworkPolicy cho mọi namespace mới
kubectl apply -f - <<'YAML'
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: default-deny-netpol }
spec:
  rules:
  - name: gen-deny
    match: { any: [ { resources: { kinds: [Namespace] } } ] }
    generate:
      apiVersion: networking.k8s.io/v1
      kind: NetworkPolicy
      name: default-deny
      namespace: "{{request.object.metadata.name}}"
      synchronize: true
      data:
        spec: { podSelector: {}, policyTypes: [Ingress] }
YAML
kubectl create ns tenant-x
kubectl -n tenant-x get networkpolicy default-deny   # tự sinh ra

# dọn
kubectl delete ns tenant-x; kubectl -n lab delete pod bare
kubectl delete clusterpolicy auto-add-securitycontext default-deny-netpol
```
</details>

---

## Mission 11 ✔️ — Pod Security Admission built-in (Mandate 05)
🎯 Dùng cơ chế **có sẵn của Kubernetes** (không cần Kyverno) để ép chuẩn bảo mật pod theo namespace.

🛠️
1. Gán nhãn một namespace mức `restricted` (enforce).
2. Thử tạo pod nginx thường → bị từ chối; đọc kỹ danh sách vi phạm.
3. Tạo pod đạt chuẩn restricted → được nhận.

✅ Pod không hardening bị Forbidden với lý do rõ (runAsNonRoot, drop caps, seccomp...).

<details><summary>💡 Lời giải (đã chạy thật)</summary>

```bash
kubectl create ns psa-test
kubectl label ns psa-test pod-security.kubernetes.io/enforce=restricted
kubectl -n psa-test run bad --image=nginx:1.27 --restart=Never   # -> Forbidden, liệt kê vi phạm
kubectl -n psa-test apply -f - <<'YAML'
apiVersion: v1
kind: Pod
metadata: { name: good }
spec:
  securityContext: { runAsNonRoot: true, seccompProfile: { type: RuntimeDefault } }
  containers:
  - name: app
    image: nginx:1.27
    securityContext: { allowPrivilegeEscalation: false, runAsUser: 1001, capabilities: { drop: [ALL] } }
YAML
kubectl delete ns psa-test
```
So sánh: PSA = 3 mức chuẩn cố định (privileged/baseline/restricted), gọn; Kyverno = policy tuỳ biến +
mutate/generate. Thực tế hay **dùng cả hai**.
</details>

---

## Mission 12 — Chaos drill: pod-killer + SLO giữ vững (Mandate 17/21)
🎯 Kiểm chứng khả năng tự phục hồi dưới lỗi ngẫu nhiên (SRE game day).

🛠️
1. Chạy vòng lặp **xóa ngẫu nhiên** 1 pod course-service mỗi ~15s trong vài phút.
2. Song song, bắn traffic liên tục và đo tỷ lệ lỗi (`/healthz`).
3. Xác nhận: Deployment luôn kéo pod về đủ replica, PDB giữ ≥1 Ready, error rate ~0.
4. (Bonus) Cài **Chaos Mesh** để inject lỗi mạng/CPU có kiểm soát.

✅ Không có (hoặc rất ít) request lỗi dù pod bị giết liên tục; `kubectl get deploy` luôn hồi phục.

<details><summary>💡 Lời giải</summary>

```bash
# 1. pod-killer (terminal A) — chạy ~2 phút
end=$((SECONDS+120))
while [ $SECONDS -lt $end ]; do
  P=$(kubectl -n eduvn get pod -l app.kubernetes.io/name=course-service -o name | shuf -n1)
  echo "kill $P"; kubectl -n eduvn delete $P --grace-period=5 >/dev/null; sleep 15
done

# 2. đo lỗi (terminal B)
kubectl -n eduvn run probe --rm -it --image=curlimages/curl --restart=Never -- \
  sh -c 'ok=0; err=0; for i in $(seq 1 120); do curl -sf -m2 http://course-service/healthz >/dev/null && ok=$((ok+1)) || err=$((err+1)); sleep 1; done; echo "OK=$ok ERR=$err"'
#   -> ERR ~0 vì luôn còn pod Ready (PDB) + traffic né pod đang chết (readiness/preStop)

# 4. bonus Chaos Mesh (🐏):
# helm repo add chaos-mesh https://charts.chaos-mesh.org
# helm install chaos-mesh chaos-mesh/chaos-mesh -n chaos-mesh --create-namespace
```
</details>

---

## Mission 13 🐏 — Log tập trung với Loki + Grafana (Mandate 16/04)
🎯 Gom log mọi pod về một nơi, truy vấn bằng LogQL trong Grafana (thay vì `kubectl logs` từng pod).

🛠️
1. Cài **Loki + Promtail** (hoặc Grafana Alloy) vào namespace monitoring.
2. Trong Grafana, thêm data source Loki, xem log của course-service.
3. Viết LogQL lọc log lỗi.

✅ Grafana → Explore (Loki) trả log course-service; lọc được theo namespace/pod/level.

<details><summary>💡 Lời giải</summary>

```bash
helm repo add grafana https://grafana.github.io/helm-charts && helm repo update
helm upgrade --install loki grafana/loki-stack -n monitoring \
  --set loki.singleBinary.replicas=1 --set promtail.enabled=true --set grafana.enabled=false
# Grafana đã có sẵn (kube-prometheus-stack). Thêm data source:
#   URL: http://loki.monitoring.svc:3100
kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80
```
LogQL (Explore → Loki):
```logql
{namespace="eduvn", pod=~"course-service.*"}                 # tất cả log
{namespace="eduvn"} |= "error"                                # chỉ dòng có 'error'
sum(rate({namespace="eduvn"} |= "error" [5m]))                # tần suất lỗi
```
Gỡ khi xong: `helm -n monitoring uninstall loki`.
</details>

---

## Mission 14 🐏 — Right-sizing & tiết kiệm với VPA (Mandate 13/18)
🎯 Tìm requests/limits "vừa vặn" thay vì đoán — nền tảng để giảm chi phí (Mandate cost).

🛠️
1. Cài **Vertical Pod Autoscaler** ở chế độ **recommender** (không tự sửa pod → an toàn).
2. Tạo VPA `updateMode: "Off"` cho course-service, để chạy vài phút.
3. Đọc khuyến nghị CPU/memory và so với requests hiện tại (100m/128Mi).

✅ `kubectl describe vpa` cho ra Target/Lower/Upper bound → biết nên chỉnh request lên/xuống.

<details><summary>💡 Lời giải</summary>

```bash
# 1. cài VPA (chỉ recommender)
git clone https://github.com/kubernetes/autoscaler.git
./autoscaler/vertical-pod-autoscaler/hack/vpa-up.sh

# 2. VPA recommend-only cho course-service
kubectl apply -f - <<'YAML'
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata: { name: course-service, namespace: eduvn }
spec:
  targetRef: { apiVersion: apps/v1, kind: Deployment, name: course-service }
  updatePolicy: { updateMode: "Off" }
YAML

# 3. (chờ ~5 phút, tạo chút traffic) đọc khuyến nghị
kubectl -n eduvn describe vpa course-service | sed -n '/Recommendation/,/Events/p'
```
`Target` là mức request VPA đề xuất; nếu thấp hơn 100m/128Mi hiện tại → có thể hạ để tiết kiệm; cao hơn → tránh throttle/OOM.
</details>

---

## Mission 15 🐏 — DR: backup & restore cụm với Velero + MinIO (Mandate 20)
🎯 Bản địa hóa bài **DR restore drill** (vốn làm trên DynamoDB PITR) sang cấp Kubernetes: backup toàn
bộ manifest một namespace, xóa, rồi khôi phục.

🛠️
1. Dựng object storage local (**MinIO**) làm đích backup (thay S3).
2. Cài **Velero** trỏ vào MinIO.
3. Backup namespace `eduvn` → xóa một tài nguyên → **restore** → xác nhận trở lại.

✅ Sau restore, tài nguyên đã xóa xuất hiện lại; `velero backup describe` = Completed.

<details><summary>💡 Lời giải (khung)</summary>

```bash
# 1. MinIO (S3 giả) trong cluster
helm repo add minio https://charts.min.io/ && helm repo update
helm install minio minio/minio -n velero --create-namespace \
  --set rootUser=minio,rootPassword=minio123,replicas=1,mode=standalone,buckets[0].name=velero,buckets[0].policy=none

# 2. Velero (dùng plugin aws trỏ MinIO)
cat > /tmp/creds <<'EOF'
[default]
aws_access_key_id=minio
aws_secret_access_key=minio123
EOF
velero install --provider aws --plugins velero/velero-plugin-for-aws:v1.10.0 \
  --bucket velero --secret-file /tmp/creds --use-volume-snapshots=false \
  --backup-location-config region=minio,s3ForcePathStyle=true,s3Url=http://minio.velero.svc:9000

# 3. drill
velero backup create eduvn-bk --include-namespaces eduvn --wait
kubectl -n eduvn delete pdb course-service            # "mất" 1 tài nguyên
velero restore create --from-backup eduvn-bk --wait
kubectl -n eduvn get pdb course-service               # trở lại
```
> Đây là bản K8s-level của [`docs/mandates/DR-RESTORE-DRILL.md`](../docs/mandates/DR-RESTORE-DRILL.md).
> Gỡ khi xong: `velero uninstall`; `helm -n velero uninstall minio`.
</details>

---

## Tổng kết kỹ năng luyện được
| Mission | Kỹ năng DevOps/SRE | Mandate |
|---|---|---|
| 1 | Rolling update, rollback, zero-downtime | 03 |
| 2 | Node drain, PDB, bảo trì an toàn | 03/21 |
| 3 | HPA, autoscale, load | 02/13 |
| 4 | NetworkPolicy, least-exposure, CNI | 01 |
| 5 | Policy-as-code (Kyverno), admission, hardening | 05 |
| 6 | Prometheus/PromQL, SLO, alerting | 07/16 |
| 7 | Probes, endpoints, least-privilege SA | 17 |
| 8 | Điều tra sự cố, root-cause, viết postmortem | (all) |
| **9** | **Canary / progressive delivery (Argo Rollouts)** | 03 |
| **10** | **Kyverno mutate + generate (policy nâng cao)** | 05/01 |
| **11** | **Pod Security Admission built-in** | 05 |
| **12** | **Chaos engineering, game day** | 17/21 |
| **13** | **Log tập trung (Loki/LogQL)** | 16/04 |
| **14** | **Right-sizing / cost (VPA)** | 13/18 |
| **15** | **DR backup/restore cụm (Velero)** | 20 |

> Sau khi xong: `kind delete cluster --name eduvn-local` để giải phóng RAM (gỡ cả các add-on 🐏 đã cài).
