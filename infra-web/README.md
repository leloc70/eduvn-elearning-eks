# infra-web — Hosting frontend (S3 + CloudFront + Route 53)

Hạ tầng tĩnh cho `frontend/`, **tách riêng** khỏi EKS (rẻ, để chạy được lâu dài).

## Thành phần
| File | Tạo gì |
|---|---|
| `s3.tf` | Bucket private (OAC, chặn public) chứa file build |
| `cloudfront.tf` | CloudFront + OAC + SPA rewrite (403/404 → index.html) |
| `acm.tf` | Chứng chỉ HTTPS (us-east-1), validate qua DNS Route 53 |
| `route53.tf` | Alias A/AAAA cho `mywebsitelocle.click` + `www` → CloudFront |

## Triển khai
```powershell
$env:AWS_PROFILE = "eduvn"
cd infra-web
terraform init
terraform apply        # ~15-20 phút (CloudFront deploy toàn cầu)
```
Rồi build + upload frontend:
```powershell
..\scripts\deploy-web.ps1
```
Mở: **https://mywebsitelocle.click**

## Chi phí (rất rẻ, có thể để chạy)
- CloudFront: free tier 1TB/tháng → ~$0
- S3: vài cent
- ACM: miễn phí
- Route 53 hosted zone: $0.50/tháng (đã tính sẵn vì domain đã đăng ký)

> ⚠️ Backend `course-service` hiện đã destroy → frontend sẽ hiển thị **dữ liệu mẫu**
> (demo fallback). Muốn dữ liệu thật: deploy lại backend rồi set `VITE_API_URL`.

## Gỡ
```powershell
terraform destroy
```
