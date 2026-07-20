# Build frontend -> sync lên S3 -> invalidate CloudFront.
# Chạy sau khi infra-web đã terraform apply.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$web = Join-Path $root "infra-web"
$fe = Join-Path $root "frontend"

Write-Host "==> Lấy output từ infra-web..." -ForegroundColor Cyan
Push-Location $web
$bucket = terraform output -raw bucket_name
$dist = terraform output -raw distribution_id
Pop-Location

Write-Host "==> Build frontend..." -ForegroundColor Cyan
Push-Location $fe
npm run build
Pop-Location

Write-Host "==> Sync lên s3://$bucket ..." -ForegroundColor Cyan
# assets có hash -> cache lâu; index.html -> no-cache để luôn lấy bản mới
aws s3 sync "$fe\dist" "s3://$bucket" --delete --cache-control "public,max-age=31536000,immutable" --exclude "index.html"
aws s3 cp "$fe\dist\index.html" "s3://$bucket/index.html" --cache-control "no-cache"

Write-Host "==> Invalidate CloudFront ($dist)..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $dist --paths "/*" | Out-Null

Write-Host "Xong. Mở: https://mywebsitelocle.click" -ForegroundColor Green
