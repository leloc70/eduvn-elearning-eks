# Infra — Terraform (Sprint 0: Platform)

Dựng nền tảng: **VPC → EKS → ECR → IRSA (LB Controller) → ArgoCD**.

## Yêu cầu
- Terraform >= 1.5
- AWS CLI đã cấu hình credential (`aws configure`)
- `kubectl`, `helm` (để thao tác cluster sau khi tạo)
- Quyền IAM đủ tạo VPC/EKS/IAM/ECR

## Thứ tự chạy
```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # sửa biến cho phù hợp
terraform init
terraform plan
terraform apply
```

Sau khi apply xong, cấu hình kubectl:
```bash
aws eks update-kubeconfig --name $(terraform output -raw cluster_name) --region <region>
kubectl get nodes
```

## Thành phần tạo ra
| File | Nội dung |
|---|---|
| `versions.tf` | Ràng buộc version Terraform & provider |
| `providers.tf` | AWS + Kubernetes + Helm provider |
| `variables.tf` | Biến cấu hình |
| `vpc.tf` | VPC multi-AZ (public + private subnet, NAT) |
| `eks.tf` | EKS cluster + managed node group |
| `ecr.tf` | Registry cho các microservice |
| `irsa.tf` | IRSA + AWS Load Balancer Controller |
| `argocd.tf` | Cài ArgoCD qua Helm |
| `outputs.tf` | Output quan trọng |

## ⚠️ Chi phí
`terraform apply` tạo tài nguyên **tính phí** (EKS control plane ~$73/tháng, NAT, node...).
Đọc `../docs/05-cost-estimate.md`. Khi học xong nhớ `terraform destroy`.

## Ghi chú
- Đây là **skeleton học tập** dùng community modules chính thống (`terraform-aws-modules`).
- Chưa cấu hình remote state (S3 + DynamoDB lock) — production nên thêm, xem `backend.tf.example`.
