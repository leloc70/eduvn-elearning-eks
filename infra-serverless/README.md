# infra-serverless — Backend always-on (Lambda + API Gateway + DynamoDB)

Backend rẻ (~$0, pay-per-request) cho website live, **không cần EKS 24/7**. Trả lời tại
`https://api.mywebsitelocle.click` → frontend hiện tại (đã trỏ domain này) tự có **data thật**.

## Thành phần
| | |
|---|---|
| Lambda (`nodejs20.x`) | API khóa học: `GET/POST /courses`, `GET /courses/:id`, `/healthz` |
| API Gateway HTTP API | HTTPS sẵn, CORS, custom domain `api.mywebsitelocle.click` |
| DynamoDB `eduvn-courses` | PAY_PER_REQUEST + **PITR** (Mandate #20) + encryption |
| IAM | Lambda role least-privilege (chỉ bảng courses) |

## Deploy
```powershell
$env:AWS_PROFILE="eduvn"; aws sso login --sso-session eduvn
cd infra-serverless
terraform init
terraform apply     # ~2-3 phút (ACM DNS validation)
```
Xong → mở `https://mywebsitelocle.click` (data thật).

## Chi phí
Lambda + DynamoDB on-demand + API Gateway = **pay-per-request** → gần như **$0** khi ít traffic.
Không có tài nguyên chạy 24/7. An toàn để bật lâu dài.

## Gỡ
```powershell
terraform destroy
```
> ⚠️ Xoá bảng có PITR: cân nhắc export/backup trước nếu là data thật.
