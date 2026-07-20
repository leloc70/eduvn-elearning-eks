# Xóa sạch lab EKS để NGỪNG tính tiền. Chạy sau mỗi buổi học.
$ErrorActionPreference = "Stop"
$infra = Join-Path $PSScriptRoot "..\infra"

Push-Location $infra
try {
    Write-Host "==> terraform destroy (xóa EKS/NAT/ALB/...)..." -ForegroundColor Cyan
    terraform destroy -auto-approve -input=false

    Write-Host ""
    Write-Host "Đã destroy. Kiểm tra nhanh còn sót tài nguyên tính tiền không:" -ForegroundColor Yellow
    Write-Host "  - EKS cluster:" -ForegroundColor DarkGray
    aws eks list-clusters 2>$null | Out-Host
    Write-Host "  - NAT Gateway (không được còn 'available'):" -ForegroundColor DarkGray
    aws ec2 describe-nat-gateways --filter "Name=state,Values=available" --query "NatGateways[].NatGatewayId" 2>$null | Out-Host
    Write-Host "  - Load Balancer:" -ForegroundColor DarkGray
    aws elbv2 describe-load-balancers --query "LoadBalancers[].LoadBalancerName" 2>$null | Out-Host
}
finally {
    Pop-Location
}
