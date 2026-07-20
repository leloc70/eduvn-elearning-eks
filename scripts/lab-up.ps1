# Dựng lab EKS (credit-safe). Chạy trong buổi học rồi lab-down.ps1 khi xong.
# Yêu cầu: terraform, aws, kubectl trên PATH + đã `aws configure`.
$ErrorActionPreference = "Stop"
$infra = Join-Path $PSScriptRoot "..\infra"

Write-Host "==> Kiểm tra danh tính AWS..." -ForegroundColor Cyan
aws sts get-caller-identity | Out-Host

Push-Location $infra
try {
    Write-Host "==> terraform init..." -ForegroundColor Cyan
    terraform init -input=false

    Write-Host "==> terraform apply (tạo VPC/EKS/... ~15-20 phút)..." -ForegroundColor Cyan
    terraform apply -auto-approve -input=false

    $cluster = terraform output -raw cluster_name
    $region  = terraform output -raw region
    Write-Host "==> Cấu hình kubectl cho cluster $cluster ($region)..." -ForegroundColor Cyan
    aws eks update-kubeconfig --name $cluster --region $region
    kubectl get nodes

    Write-Host ""
    Write-Host "LAB ĐANG CHẠY (đang tính tiền). Xong việc nhớ: scripts\lab-down.ps1" -ForegroundColor Yellow
}
finally {
    Pop-Location
}
