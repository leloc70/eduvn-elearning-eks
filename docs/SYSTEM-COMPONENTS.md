# Thành phần hệ thống — vai trò · truy cập · monitoring

Mỗi thành phần: **làm gì**, **truy cập thế nào**, **monitor ở đâu**. Hệ có 2 chế độ backend:
**A (serverless, LIVE)** và **B (EKS, on-demand — chỉ khi `lab-up`)**.

> Prereq lệnh CLI: `$env:AWS_PROFILE="eduvn"; aws sso login --sso-session eduvn` + `aws` trên PATH.

---

## A. Stack LIVE (serverless — đang chạy, ~$0.50/tháng)

### A1. Frontend (React SPA)
- **Làm gì:** giao diện web EduVN (catalog, chi tiết khóa, tạo khóa) + dark mode. Build tĩnh (`frontend/` → `dist/`).
- **Truy cập:** 🌐 **https://mywebsitelocle.click** (và `www.`). Không cần đăng nhập.
- **Monitor:**
  - CloudFront console → distribution `E1E6O1NUJXRV37` → **Monitoring** (requests, error rate 4xx/5xx, data transfer).
  - `aws cloudfront get-distribution --id E1E6O1NUJXRV37`.
- **Deploy lại:** `.\scripts\deploy-web.ps1` (build → S3 sync → invalidate).

### A2. CloudFront (CDN) + S3 (hosting)
- **Làm gì:** CloudFront phân phối toàn cầu + HTTPS + cache; S3 (`eduvn-web-500519358149`) chứa file tĩnh (private, chỉ CloudFront đọc qua OAC).
- **Truy cập:** người dùng qua CloudFront; S3 **không** public.
- **Monitor:** CloudFront metrics (CloudWatch namespace `AWS/CloudFront`, region us-east-1): `Requests`, `4xxErrorRate`, `5xxErrorRate`, `BytesDownloaded`.

### A3. API Gateway (HTTP API)
- **Làm gì:** cổng HTTPS cho backend, route mọi request → Lambda, CORS. Custom domain `api.mywebsitelocle.click`.
- **Truy cập:** `https://api.mywebsitelocle.click/{healthz,courses,courses/:id}`.
- **Monitor:** CloudWatch namespace `AWS/ApiGateway` → `Count`, `4xx`, `5xx`, `Latency`, `IntegrationLatency`.

### A4. Lambda (`eduvn-courses-api`)
- **Làm gì:** business logic API khóa học (GET/POST /courses, /healthz) — đọc/ghi DynamoDB.
- **Truy cập:** gọi gián tiếp qua API Gateway (không expose trực tiếp).
- **Monitor:**
  - **CloudWatch Logs:** `aws logs tail /aws/lambda/eduvn-courses-api --follow`
  - **Metrics** (`AWS/Lambda`): `Invocations`, `Errors`, `Duration`, `Throttles`, `ConcurrentExecutions`.
  - Bật X-Ray nếu cần trace chi tiết.

### A5. DynamoDB (`eduvn-courses`)
- **Làm gì:** lưu khóa học (key-value, `id`). PAY_PER_REQUEST + **PITR** (khôi phục 35 ngày) + mã hoá.
- **Truy cập:** chỉ Lambda (qua IAM role least-privilege). `aws dynamodb scan --table-name eduvn-courses`.
- **Monitor:** `AWS/DynamoDB` → `ConsumedRead/WriteCapacityUnits`, `ThrottledRequests`, `SuccessfulRequestLatency`.
- **Backup/DR:** PITR — xem [`mandates/DR-RESTORE-DRILL.md`](mandates/DR-RESTORE-DRILL.md).

---

## B. Stack EKS (chế độ B — chỉ khi `lab-up`, ~$0.21/giờ)

> Bật: `.\scripts\lab-up.ps1` → `aws eks update-kubeconfig --name eduvn-dev --region ap-southeast-1`.
> Tắt: `.\scripts\lab-down.ps1`. Chi tiết: [`07-runbook-p1.md`](07-runbook-p1.md).

### B1. course-service (microservice trên EKS)
- **Làm gì:** cùng API khóa học nhưng chạy dạng container (Node+Express) trên EKS, đọc/ghi DynamoDB qua **IRSA**. Có `/metrics` (Prometheus).
- **Truy cập:** qua ALB HTTPS `api.mywebsitelocle.click` (khi ingress được apply); nội bộ `kubectl port-forward svc/course-service 9090:80`.
- **Monitor:** `kubectl get pods,hpa,pdb` · Grafana SLO dashboard (xem B4) · `kubectl logs deploy/course-service`.

### B2. ArgoCD (GitOps CD)
- **Làm gì:** đồng bộ trạng thái cluster theo Git (deploy course-service từ `charts/`).
- **Truy cập (private):** `kubectl -n argocd port-forward svc/argocd-server 8080:443` → https://localhost:8080. User `admin`, mật khẩu: `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d`.
- **Monitor:** `kubectl -n argocd get applications` (SYNC/HEALTH) · UI xem cây tài nguyên + history.

### B3. AWS Load Balancer Controller
- **Làm gì:** tạo/quản lý ALB từ Ingress (course-service).
- **Truy cập:** không có UI; điều khiển qua Ingress annotations.
- **Monitor:** `kubectl -n kube-system logs deploy/aws-load-balancer-controller` · `kubectl get ingress`.

### B4. Prometheus + Grafana + Alertmanager (observability)
- **Làm gì:** thu metrics (Prometheus scrape `/metrics` + node/kube-state), dashboard (Grafana), cảnh báo (Alertmanager).
- **Truy cập (private):**
  - Grafana: `kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80` → http://localhost:3000 (admin/eduvn-admin).
  - Prometheus: `kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090` → http://localhost:9090 (PromQL).
- **Monitor / dashboard cần xem:** **Course Service — SLO** (RPS, error rate, p50/p95/p99, replicas/HPA, CPU/mem) + built-in (Compute Resources, Node Exporter). Chi tiết: [`OBSERVABILITY.md`](OBSERVABILITY.md).

### B5. Karpenter (node autoscaler)
- **Làm gì:** tạo node theo tải (Spot + Graviton), co node xuống khi rảnh.
- **Truy cập:** CRD `nodepool`/`ec2nodeclass`.
- **Monitor:** `kubectl -n karpenter logs deploy/karpenter -f` (quyết định provision/consolidate) · `kubectl get nodeclaim,nodes -L karpenter.sh/nodepool,kubernetes.io/arch`.

### B6. Kyverno (admission policy)
- **Làm gì:** chặn manifest nguy hiểm lúc apply (non-root, no-latest, require-resources, verify chữ ký cosign).
- **Truy cập:** ClusterPolicy.
- **Monitor:** `kubectl get clusterpolicy` · `kubectl get clusterpolicyreport,policyreport -A` (vi phạm) · `kubectl -n kyverno logs deploy/kyverno-admission-controller`.

### B7. metrics-server
- **Làm gì:** cấp CPU/mem cho **HPA**.
- **Monitor:** `kubectl top nodes` / `kubectl top pods` · `kubectl get hpa`.

---

## C. Xuyên suốt (cả 2 chế độ)

### C1. Route 53 + ACM
- **Làm gì:** DNS (`mywebsitelocle.click`, `api.`, `www.`) + chứng chỉ HTTPS (ACM).
- **Monitor:** `aws route53 list-resource-record-sets --hosted-zone-id Z05324758M52AV05XAAF` · ACM console (trạng thái cert).

### C2. CI/CD (GitHub Actions) + branch ruleset
- **Làm gì:** ci.yml (test/lint/validate trên PR) · cd.yml (build→ký cosign→push ECR) · security.yml · terraform-plan · dependabot. Ruleset bắt buộc check pass mới merge `main`.
- **Truy cập/monitor:** GitHub → Actions tab · PR checks · `gh run list`, `gh pr checks <n>`.

### C3. Terraform state
- **Làm gì:** state hạ tầng — **remote** S3 `eduvn-tf-state-500519358149` (versioned+encrypted) + DynamoDB lock `eduvn-tf-locks`. Key: `eks/`, `web/`, `serverless/`.
- **Monitor:** `aws s3 ls s3://eduvn-tf-state-500519358149 --recursive` · `terraform -chdir=<module> state list`.

### C4. IAM / bảo mật
- **Làm gì:** IRSA (pod→AWS), OIDC (CI→AWS, không key tĩnh), Lambda role least-privilege, IAM SSO (người).
- **Monitor:** CloudTrail (ai gọi API cloud) · (khi EKS) EKS audit log → CloudWatch `/aws/eks/eduvn-dev/cluster`.

---

## Bảng tra nhanh "monitor ở đâu"
| Muốn xem | Lệnh / nơi |
|---|---|
| Web có sống không | `curl https://mywebsitelocle.click` · CloudFront Monitoring |
| API lỗi/độ trễ | CloudWatch `AWS/ApiGateway` · `aws logs tail /aws/lambda/eduvn-courses-api` |
| Data trong DB | `aws dynamodb scan --table-name eduvn-courses` |
| SLO course-service (EKS) | Grafana → "Course Service — SLO" |
| Node scale (EKS) | `kubectl get nodes` · Karpenter logs |
| Deploy trạng thái (EKS) | ArgoCD UI · `kubectl -n argocd get applications` |
| Vi phạm policy (EKS) | `kubectl get policyreport -A` |
| CI/CD | GitHub Actions · `gh run list` |
| Chi phí | AWS Cost Explorer · Budget alert (email) |
