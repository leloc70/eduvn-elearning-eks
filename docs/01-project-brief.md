# 01 — Project Brief (như khách gửi)

## Khách hàng
**EduVN** — startup edtech Việt Nam. Hiện dùng WordPress + video nhúng YouTube, ~5.000 học viên, đang quá tải.

## Mục tiêu
Xây nền tảng học trực tuyến riêng, chịu được **50.000 học viên**, làm chủ dữ liệu và trải nghiệm.

## Yêu cầu chức năng
- Đăng ký / đăng nhập (email + social login: Google, Facebook).
- Giảng viên upload video khóa học (file lớn), tự động transcode nhiều độ phân giải.
- Học viên xem video streaming mượt, **chống tải lậu**.
- Làm quiz, theo dõi tiến độ học.
- Mua khóa học (thanh toán online).
- Dashboard cho giảng viên & admin.

## Yêu cầu phi chức năng (trách nhiệm Tech Lead)
| Nhóm | Yêu cầu |
|---|---|
| Scale | 5k → 50k user; chịu tải giờ cao điểm (tối 19–22h) |
| Availability | Uptime 99.9%, multi-AZ, backup, DR |
| Bảo mật | Mã hóa at-rest/in-transit, least-privilege, không lưu thẻ (PCI) |
| Chi phí | < $1.500/tháng giai đoạn đầu; pay-per-use lúc thấp điểm |
| Vận hành | IaC 100%, CI/CD, observability, runbook |

## Ràng buộc
- **Ngân sách hạ tầng:** < $1.500/tháng giai đoạn đầu.
- **Thời gian:** ra mắt trong 3 tháng.
- **Team:** 4 dev + 1 Tech Lead (bạn).

## Ngoài phạm vi (Out of scope) — giai đoạn 1
- App mobile native (chỉ responsive web).
- Livestream (chỉ video on-demand).
- AI gợi ý khóa học.

## Tiêu chí nghiệm thu (Acceptance)
- Học viên đăng ký → mua → xem hết 1 khóa → làm quiz → thấy tiến độ.
- Giảng viên upload video → tự transcode → phát được qua CDN.
- Load test 5.000 user đồng thời không lỗi, p95 < 500ms cho API.
- Toàn bộ hạ tầng dựng lại được từ IaC trong 1 lệnh.
