# Xem nhanh trạng thái lab + tài nguyên đang tính tiền.
$ErrorActionPreference = "SilentlyContinue"

Write-Host "==> AWS identity" -ForegroundColor Cyan
aws sts get-caller-identity --query "Account" --output text

Write-Host "==> EKS clusters" -ForegroundColor Cyan
aws eks list-clusters --query "clusters" --output text

Write-Host "==> NAT Gateways (available = đang tính tiền)" -ForegroundColor Cyan
aws ec2 describe-nat-gateways --filter "Name=state,Values=available" --query "NatGateways[].NatGatewayId" --output text

Write-Host "==> Load Balancers" -ForegroundColor Cyan
aws elbv2 describe-load-balancers --query "LoadBalancers[].LoadBalancerName" --output text

Write-Host "==> EC2 instances (running)" -ForegroundColor Cyan
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query "Reservations[].Instances[].InstanceType" --output text

Write-Host ""
Write-Host "Nếu còn cluster/NAT/ALB => đang tính tiền. Chạy scripts\lab-down.ps1 nếu không dùng." -ForegroundColor Yellow
