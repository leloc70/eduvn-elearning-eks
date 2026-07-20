# course-service

Microservice quản lý khóa học (EduVN). Node.js 20 + Express + DynamoDB (qua IRSA).

## API
| Method | Path | Mô tả |
|---|---|---|
| GET | `/healthz` | Liveness probe |
| GET | `/readyz` | Readiness probe |
| GET | `/courses` | Danh sách khóa học |
| GET | `/courses/:id` | Chi tiết 1 khóa |
| POST | `/courses` | Tạo khóa (`{title, instructor, price}`) |

## Chạy local
```bash
cd services/course-service
npm install
npm start            # không set TABLE_NAME -> dùng in-memory store
```
Test nhanh:
```bash
curl localhost:8080/healthz
curl -X POST localhost:8080/courses -H "content-type: application/json" -d '{"title":"AWS EKS 101","price":49}'
curl localhost:8080/courses
```

## Build & push image (ECR)
```bash
ACCOUNT_ID=<account>
REGION=ap-southeast-1
REPO=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/eduvn/course-service

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
docker build -t $REPO:v1 .
docker push $REPO:v1
```
Rồi cập nhật `image.tag` trong `charts/course-service/values.yaml` → commit → ArgoCD tự deploy.

## Biến môi trường
| Biến | Mặc định | Ghi chú |
|---|---|---|
| `PORT` | 8080 | Khớp Helm targetPort |
| `AWS_REGION` | ap-southeast-1 | |
| `TABLE_NAME` | (rỗng) | Rỗng → in-memory; có → DynamoDB thật |
