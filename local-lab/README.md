# Lab local (kind) — test stack không cần AWS

Dựng lại phần lớn stack EKS trên máy local bằng **kind** để test **Helm chart, Kyverno,
Prometheus/Grafana, ArgoCD, NetworkPolicy, HPA, PDB** — miễn phí, không đụng AWS.

> 🧪 **Muốn thực hành như một DevOps K8s?** Sau khi dựng xong, làm bộ bài tập theo mandate ở
> [`LABS.md`](LABS.md): rollout không downtime, drain+PDB, HPA dưới tải, NetworkPolicy, Kyverno
> Audit→Enforce, PromQL/SLO, điều tra sự cố.
>
> 🌐 **Full-stack local**: `bash local-lab/fullstack-up.sh` — chạy frontend React trỏ vào
> course-service trong kind (port-forward), mở `http://localhost:5173`.
>
> 🔥 **Load test**: xem [`../docs/11-load-test.md`](../docs/11-load-test.md) (k6 → 14.5k RPS, HPA 2→10 pod).

## Test được / không test được

| Thành phần | Local? | Ghi chú |
|---|---|---|
| Helm chart course-service | ✅ | chạy in-memory (không cần DynamoDB) |
| Kyverno admission (4 policy) | ✅ | Audit → Enforce |
| kube-prometheus-stack | ✅ | ServiceMonitor scrape `/metrics`, Grafana |
| ArgoCD GitOps | ✅ | sync chart từ git |
| NetworkPolicy | ✅ | cần **Calico** (kindnet không enforce) |
| HPA / PDB / topologySpread | ✅ | metrics-server + 3 node (2 "zone") |
| IRSA / OIDC | ❌ | neo vào AWS IAM |
| Karpenter / VPC endpoints / ALB | ❌ | neo vào AWS |
| cosign verify-images | ❌ | cần ECR + ký thật |

## Yêu cầu
- Docker Desktop đang chạy
- `kind`, `kubectl`, `helm`

## Các bước

```bash
# 1. Cluster 3 node, CNI = Calico (để NetworkPolicy enforce)
kind create cluster --config local-lab/kind-config.yaml
kubectl apply --server-side -f https://raw.githubusercontent.com/projectcalico/calico/v3.29.1/manifests/tigera-operator.yaml
kubectl apply -f local-lab/calico-installation.yaml   # CIDR khớp podSubnet 10.244.0.0/16

# 2. Build + nạp image vào kind
docker build -t course-service:local services/course-service
kind load docker-image course-service:local --name eduvn-local

# 3. Nền tảng
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add kyverno https://kyverno.github.io/kyverno
helm repo add argo https://argoproj.github.io/argo-helm
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server
helm repo update

helm upgrade --install metrics-server metrics-server/metrics-server -n kube-system \
  --set 'args={--kubelet-insecure-tls}'
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace -f local-lab/kps-values.yaml
helm upgrade --install kyverno kyverno/kyverno -n kyverno --create-namespace
kubectl apply -f k8s/policies/         # 4 policy (Audit)
helm upgrade --install argocd argo/argo-cd -n argocd --create-namespace \
  --set dex.enabled=false --set notifications.enabled=false --set applicationSet.enabled=false

# 4. GitOps: ArgoCD deploy course-service từ git
kubectl apply -f local-lab/argocd-app.yaml
```

## Truy cập (port-forward)

```bash
# course-service API
kubectl -n eduvn port-forward svc/course-service 8080:80
curl localhost:8080/healthz && curl localhost:8080/courses

# Grafana (admin / admin)
kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80

# Prometheus
kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090:9090

# ArgoCD UI (admin / lấy mật khẩu bên dưới)
kubectl -n argocd port-forward svc/argocd-server 8081:443
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

## Kiểm chứng nhanh

```bash
# NetworkPolicy enforce: pod ngoài allowlist bị chặn
kubectl run probe --rm -it --image=curlimages/curl --restart=Never -- \
  curl -m 5 http://course-service.eduvn.svc.cluster.local/healthz   # timeout (bị chặn)

# HPA
kubectl -n eduvn get hpa

# Kyverno: thử tạo pod chạy root -> bị policy bắt (Audit: cảnh báo; Enforce: chặn)
kubectl -n eduvn run bad --image=nginx --dry-run=server 2>&1 | grep -i policy
```

## Dọn dẹp

```bash
kind delete cluster --name eduvn-local
```
