# 07 — Runbook P1: Dựng hạ tầng thật (credit-safe)

Mục tiêu: dựng EKS + deploy `course-service`, verify, rồi **destroy** để ngừng tính tiền.
Ước tính: **~$0.21/giờ** khi chạy → buổi 3 giờ ≈ **$0.63**. Đủ dư với credit $58.90.

> ⚠️ Vàng: **luôn `lab-down` sau mỗi buổi**. EKS control plane + NAT + ALB tính tiền theo giờ dù không dùng.

## 0. Chuẩn bị một lần
| Việc | Lệnh / Ghi chú |
|---|---|
| Cài AWS CLI | `winget install Amazon.AWSCLI` |
| Cài kubectl | `winget install Kubernetes.kubectl` |
| Đăng nhập AWS | `aws configure` (Access Key của IAM user có quyền admin lab) |
| Kiểm tra | `aws sts get-caller-identity` |

> Terraform đã cài sẵn (winget). Mở terminal mới để `terraform` có trên PATH.

## 1. Bật cảnh báo chi phí TRƯỚC (đã có sẵn trong `budget.tf`)
Budget $20/tháng, cảnh báo email ở 50/80/100%. Nó được tạo ngay khi `apply` đầu tiên.
Muốn ngưỡng khác: sửa `monthly_budget_usd` trong `terraform.tfvars`.

## 2. Dựng lab
```powershell
.\scripts\lab-up.ps1
```
Script sẽ: kiểm tra identity → `terraform init` → `apply` (~15–20 phút) → cấu hình `kubectl` → `kubectl get nodes`.

## 3. Nối GitHub Actions (một lần, sau apply)
```powershell
cd infra
gh variable set AWS_REGION        --body "ap-southeast-1"
gh variable set AWS_ROLE_ARN      --body "$(terraform output -raw github_actions_role_arn)"
gh variable set AWS_PLAN_ROLE_ARN --body "$(terraform output -raw github_actions_plan_role_arn)"
cd ..
```
Từ đây `cd.yml` (build→push ECR) và `terraform-plan` trên PR sẽ chạy thật.

## 4. Build & deploy course-service
```powershell
$acct   = aws sts get-caller-identity --query Account --output text
$region = "ap-southeast-1"
$repo   = "$acct.dkr.ecr.$region.amazonaws.com/eduvn/course-service"

aws ecr get-login-password --region $region | docker login --username AWS --password-stdin "$acct.dkr.ecr.$region.amazonaws.com"
docker build -t "${repo}:v1" services/course-service
docker push "${repo}:v1"

# Cài ArgoCD Application (ArgoCD đã có sẵn từ terraform)
kubectl apply -f gitops/apps/course-service.yaml
```

## 5. Verify
```powershell
kubectl get pods
kubectl -n argocd get applications
# Lấy URL ALB (đợi ingress cấp)
kubectl get ingress
```
Truy cập ALB DNS → `/healthz` trả `{"status":"ok"}`.

## 6. Kiểm tra chi phí đang phát sinh
```powershell
.\scripts\status.ps1
```

## 7. DESTROY khi xong (bắt buộc)
```powershell
.\scripts\lab-down.ps1
```
Script destroy + liệt kê lại EKS/NAT/ALB để chắc không sót.

## Xử lý sự cố nhanh
| Triệu chứng | Xử lý |
|---|---|
| `apply` treo ở EKS | Bình thường, control plane mất ~10–15 phút |
| Pod `ImagePullBackOff` | Chưa push image / sai `image.repository` trong `values.yaml` |
| Ingress không có ADDRESS | Đợi 2–3 phút; kiểm tra `aws-load-balancer-controller` pod trong `kube-system` |
| `destroy` lỗi do ENI/ALB còn giữ | Xóa Ingress trước (`kubectl delete -f gitops/apps/course-service.yaml`) rồi destroy lại |
| Lỡ quên tắt | `.\scripts\status.ps1` mỗi ngày; hoặc destroy ngay |

## Checklist mỗi buổi
- [ ] `aws sts get-caller-identity` OK
- [ ] `.\scripts\lab-up.ps1`
- [ ] Làm việc / present
- [ ] `.\scripts\lab-down.ps1`
- [ ] `.\scripts\status.ps1` xác nhận sạch
