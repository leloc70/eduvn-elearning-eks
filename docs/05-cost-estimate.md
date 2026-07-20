# 05 — Ước lượng chi phí AWS

> Con số **tham khảo** (region ap-southeast-1 / us-east-1, giá on-demand, làm tròn). Dùng để present khách, không thay cho AWS Pricing Calculator. Luôn xác nhận lại bằng calculator chính chủ.

## Chi phí nền (luôn có, kể cả 0 user)
| Thành phần | Ước lượng/tháng |
|---|---|
| EKS control plane | ~$73 ($0.10/giờ) |
| NAT Gateway (1) | ~$32 + data |
| ALB | ~$18 + LCU |
| **Nền tối thiểu** | **~$120–150** |

## Theo mốc user

### Mốc 1 — 5.000 user (ra mắt)
| Nhóm | Ước lượng/tháng |
|---|---|
| Nền (control plane, NAT, ALB) | ~$130 |
| EKS nodes (2–3 × t3.medium, có Spot) | ~$60–120 |
| DynamoDB (on-demand) | ~$25 |
| Aurora Serverless v2 (0.5–2 ACU) | ~$50–120 |
| ElastiCache (t4g.small) | ~$25 |
| S3 + CloudFront (video) | ~$50–150 |
| MediaConvert (transcode) | ~$30–80 |
| Cognito (MAU) | Free tier phần lớn |
| **Tổng** | **~$400–700/tháng** ✅ trong ngân sách |

### Mốc 2 — 20.000 user
| Nhóm | Ước lượng/tháng |
|---|---|
| Nền + nodes (4–6 node, Spot mix) | ~$400 |
| DynamoDB | ~$100 |
| Aurora (2–8 ACU) | ~$300 |
| Redis | ~$60 |
| S3 + CloudFront | ~$300–500 |
| MediaConvert | ~$100 |
| **Tổng** | **~$1.300–1.500/tháng** |

### Mốc 3 — 50.000 user
| Nhóm | Ước lượng/tháng |
|---|---|
| Nền + nodes (auto-scale) | ~$900 |
| DynamoDB | ~$250 |
| Aurora | ~$600 |
| Redis (cluster) | ~$150 |
| S3 + CloudFront | ~$800–1.500 |
| MediaConvert | ~$200 |
| **Tổng** | **~$3.000–3.700/tháng** |

## Đòn bẩy tối ưu chi phí (điểm cộng khi present)
- **Spot instances** qua Karpenter cho workload stateless → giảm 50–70% chi phí node.
- **Compute Savings Plan** khi tải ổn định → giảm ~30% node on-demand.
- **CloudFront** giảm data-out từ S3 + cache → rẻ hơn phục vụ trực tiếp.
- **DynamoDB/Aurora Serverless** co giãn theo tải → không trả cho lúc rảnh.
- **Tắt môi trường dev/staging ngoài giờ** → tiết kiệm ~65% cho non-prod.
- **S3 lifecycle** chuyển video ít xem sang Infrequent Access/Glacier.
