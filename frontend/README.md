# EduVN Frontend

React SPA cho nền tảng học trực tuyến EduVN — tiêu thụ API của `course-service`.

**Thiết kế:** "Warm Editorial Academy" — giấy ngà ấm, mực đậm, đỏ son, serif Fraunces + Hanken Grotesk, grain texture, reveal so le (framer-motion).

## Trang
| Route | Nội dung |
|---|---|
| `/` | Catalog — hero + ticker + lưới khóa học (`GET /courses`) |
| `/course/:id` | Chi tiết khóa học (`GET /courses/:id`) |
| `/new` | Form giảng viên tạo khóa (`POST /courses`) |

## Chạy local
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```
Mặc định gọi backend ở `http://localhost:8080`. Đổi bằng `.env`:
```
VITE_API_URL=http://localhost:8080
```
> Chạy backend song song: `cd services/course-service && npm start`.
> Nếu backend chưa chạy, frontend tự hiển thị **dữ liệu mẫu** (demo mode) để xem giao diện.

## Build
```bash
npm run build        # -> dist/
npm run preview
```

## Kết nối backend
- Backend đã bật **CORS** (`Access-Control-Allow-Origin`).
- Model khóa học: `{ id, title, instructor, price, description, category, level, durationHours, createdAt }`.

## Deploy lên EKS (tương lai)
Build tĩnh → S3 + CloudFront (như trong sơ đồ kiến trúc `docs/02-architecture.md`),
`VITE_API_URL` trỏ tới URL ALB của course-service.
