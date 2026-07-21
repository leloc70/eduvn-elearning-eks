# DR Backup/Restore drill (Mandate #20)

Bảng `eduvn-courses` (serverless) bật **PITR** — khôi phục về bất kỳ mốc thời gian nào trong 35 ngày.
Runbook chứng minh restore được (DoD #20).

## RPO/RTO cam kết
| Tầng | RPO | RTO | Backup |
|---|---|---|---|
| DynamoDB (courses) | ~5 phút (PITR liên tục) | ~10-20 phút (restore ra bảng mới) | PITR 35 ngày + on-demand |
| Terraform state | theo commit/apply | vài phút | S3 versioned |
| Cấu hình cụm/IaC | theo commit | `lab-up` ~20 phút | GitOps (Git) |

## Backup an toàn (tách quyền)
- PITR/backup mã hoá at-rest (KMS mặc định).
- Người vận hành thường **không** có `dynamodb:DeleteBackup` / `DeleteTable` trên bảng prod (IAM tách quyền).

## Drill: mất dữ liệu có kiểm soát → restore → chứng minh
> Restore PITR luôn ra **bảng MỚI** (không đè production) → drill an toàn.

```bash
export AWS_PROFILE=eduvn; R=ap-southeast-1
# 1. Ghi lại trạng thái + số item hiện tại
aws dynamodb describe-continuous-backups --table-name eduvn-courses --region $R \
  --query "ContinuousBackupsDescription.PointInTimeRecoveryDescription"
aws dynamodb scan --table-name eduvn-courses --region $R --select COUNT --query Count

# 2. Restore về 1 mốc trước (vd 5 phút trước) ra bảng tách biệt
TS=$(python -c "import time;print(int(time.time())-300)")
aws dynamodb restore-table-to-point-in-time --region $R \
  --source-table-name eduvn-courses \
  --target-table-name eduvn-courses-restore-test \
  --restore-date-time $TS

# 3. Chờ ACTIVE rồi đối chiếu số item
aws dynamodb wait table-exists --table-name eduvn-courses-restore-test --region $R
aws dynamodb scan --table-name eduvn-courses-restore-test --region $R --select COUNT --query Count

# 4. (Đo RTO = từ lệnh restore đến ACTIVE). Dọn bảng test
aws dynamodb delete-table --table-name eduvn-courses-restore-test --region $R
```

## Kết quả drill (điền sau khi chạy) — xem VERIFICATION §DR
- Item trước/sau restore: khớp → ✅ dữ liệu trở lại đúng.
- RTO đo được: ~X phút.
