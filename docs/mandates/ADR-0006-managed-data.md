# ADR-0006 — Managed data layer (Mandate #8 / #9)

- **Trạng thái:** Accepted — eduvn đã managed từ đầu
- **Ngày:** 2026-07-21
- **Mandate:** #8 (migrate lên managed) / #9 (vận hành managed zero-downtime) — mỗi đội làm 1 trong 2

## Context / Decision
eduvn **không tự host** Postgres/Redis/Kafka. course-service dùng **DynamoDB** (fully managed) cho dữ liệu
khóa học. → yêu cầu cốt lõi của #8 ("không còn pod DB/cache/queue tự host") **đã thỏa sẵn**.

Đối chiếu #8:
- Store lên managed → **DynamoDB** ✅ (không có pod data trong cluster).
- TLS in-transit + encryption at-rest → DynamoDB mặc định ✅.
- Credential không plaintext → **IRSA** (không access key tĩnh trong env/manifest) ✅.
- Endpoint riêng tư → sẽ siết bằng **VPC Gateway Endpoint cho DynamoDB** (#18/ADR-0010).

## #9 (managed zero-downtime ops) — phần lớn N/A cho DynamoDB
- Online schema migration: DynamoDB **schemaless** → không có "add NOT NULL/alter column".
- Engine version upgrade / param reboot: DynamoDB **serverless**, AWS lo, không downtime khách.
- Rotate credential live: **IRSA** cấp token ngắn hạn tự xoay → không có credential tĩnh để rotate.
- App chịu blip kết nối: AWS SDK có retry/backoff mặc định.

→ Với eduvn, #9 gần như **đã thỏa bằng thiết kế serverless + IRSA**. Không dựng RDS/ElastiCache/MSK chỉ để
"có cái migrate" — đó là phá kiến trúc lấy điểm ngắn hạn (RULES).

## Consequences
- (+) Không gánh vận hành DB/cache/queue; rẻ, multi-AZ sẵn.
- (−) Không demo được "expand→contract migration" như RDS — vì kiến trúc không cần. Ghi rõ trong ADR.

## Verify
`kubectl get pods` — không có pod postgres/redis/kafka. `aws dynamodb describe-table --table-name
eduvn-dev-courses` — managed, encryption ON.
