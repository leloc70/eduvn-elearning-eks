# Incidents & Fixes — nhật ký lỗi thực chiến

Các lỗi thật gặp khi dựng eduvn (EKS + CI/CD + CloudFront + mandate hardening), nguyên nhân gốc và cách
xử. Ghi để nộp bài và tránh lặp lại. Ký hiệu trụ: Rel=Reliability, Sec=Security, Ops=OpEx.

## Bảng tóm tắt
| # | Triệu chứng | Nguyên nhân gốc | Fix |
|---|---|---|---|
| 1 | Addon `aws-ebs-csi-driver` timeout CREATING (20') | Addon cần IRSA role mới ACTIVE; lab không dùng EBS | Bỏ addon khỏi `cluster_addons` |
| 2 | `no endpoints available for aws-load-balancer-webhook-service` | ArgoCD tạo Service trước khi LB Controller pod Ready | `depends_on = [helm_release.lb_controller]` |
| 3 | `Not authorized to perform sts:AssumeRoleWithWebIdentity` | GitHub 2026 dùng **immutable OIDC subject** (`repo:owner@ID/repo@ID:...`) | Trust dùng wildcard `repo:owner*/repo*:...` |
| 4 | `RepositoryNotEmptyException` khi destroy | ECR có image, không xoá được | `force_delete = true` trên ECR repo |
| 5 | CD bump PR kẹt `BLOCKED` mãi | PR do `GITHUB_TOKEN` tạo **không trigger** required checks | Bump thủ công (commit của người) |
| 6 | `InvalidChangeBatch: A record already exists` | Registrar tạo sẵn apex A record trong hosted zone | `allow_overwrite = true` |
| 7 | `Plan & comment` fail trong CI | Local state → CI không có state; plan role không vào được cluster | Bỏ khỏi required; cần remote state |
| 8 | Trang localhost trắng | Vite re-optimize deps giữa phiên → chunk cũ 404 | Restart dev sạch (xoá `.vite`); prod không dính |
| 9 | Web HTTPS gọi API HTTP bị chặn (mixed content) | Trình duyệt chặn `http://` từ trang `https://` | ALB HTTPS + ACM cert (`api.` subdomain) |
| 10 | `kubectl: executable aws not found` | kubeconfig exec gọi `aws` chưa có trên PATH | Sửa `command:` thành đường dẫn đầy đủ aws.exe |
| 11 | `NoCredentials` sáng hôm sau | SSO token hết hạn (TTL) | `aws sso login --sso-session eduvn` |
| 12 | Trivy action `unable to find version 0.24.0/0.28.0` | Tag đoán sai; tag có tiền tố `v` | Dùng tag thật `v0.36.0` |
| 13 | Warning "Node.js 20 deprecated" | Action wrapper chạy Node 20 runtime | Bump lên major Node 24 (đọc `runs.using`) |
| 14 | Karpenter CrashLoopBackOff `NonExistentQueue` | **Pod Identity association lệch namespace** (kube-system vs karpenter) | Module `namespace = "karpenter"` |
| 15 | `prometheus-operator` Pending (CPU/mem còn nhiều) | **Pod-density limit** t3.medium (~17 pod/node) | Scale node group 2→3 (+ Karpenter) |
| 16 | Helm `context deadline exceeded` | kube-prometheus-stack lớn > timeout 5' mặc định | `timeout = 900` trên helm_release |
| 17 | `kubectl apply`: "control characters are not allowed" | File YAML có **CRLF** (Windows/git autocrlf) | `tr -d '\r'` trước khi apply (hoặc ghi LF) |

---

## Chi tiết đáng nhớ (vì sao)

### #3 — OIDC immutable subject (bug khó nhất)
`sts:AssumeRoleWithWebIdentity` bị từ chối dù trust policy nhìn đúng. Tra `gh api .../actions/oidc/customization/sub`
thấy `sub_claim_prefix: repo:leloc70@72958498/eduvn-elearning-eks@1306434961`. GitHub (bản 2026) đã chuyển
sang **immutable subject** — chèn ID số của owner/repo vào `sub`. Trust policy dùng `repo:owner/name:...`
(dạng cũ) không khớp → denied. **Fix:** StringLike wildcard `repo:owner*/repo*:...` khớp cả 2 dạng.
**Bài học:** khi assume-role OIDC bị denied mà trust "nhìn đúng", kiểm claim `sub` thật, đừng đoán.

### #5 — CD auto-bump PR không bao giờ merge
Pattern "CD mở PR bump image rồi auto-merge" chết vì: **PR/commit do `GITHUB_TOKEN` tạo không kích hoạt
workflow** (GitHub chặn để tránh loop) → required checks không bao giờ chạy → `BLOCKED` vĩnh viễn.
**Fix ngắn hạn:** bump bằng commit của người. **Fix đúng:** dùng PAT/GitHub App, hoặc bump bằng `[skip ci]`
+ không đưa manifest-path vào trigger CD (đã tách `charts/` khỏi paths cd.yml).

### #14 — Karpenter Pod Identity namespace mismatch
Karpenter panic `NonExistentQueue` dù SQS queue tồn tại → thực ra là **không có creds**. Nguyên nhân:
`list-pod-identity-associations` cho `kube-system/karpenter`, nhưng helm cài ở namespace `karpenter`
→ association lệch → pod không nhận role. Module `terraform-aws-modules/eks//modules/karpenter` mặc định
association ở **kube-system**. **Fix:** set `namespace = "karpenter"` cho module khớp nơi cài helm.
**Bài học:** "does not exist OR you do not have access" thường là **access**, không phải existence.

### #15 — Pod Pending mà CPU/mem còn nhiều = pod-density
`prometheus-operator` Pending dù node CPU 33%, mem 15%. Nguyên nhân: **vpc-cni giới hạn số pod/node**
theo số IP/ENI (t3.medium ~17). Hai node đã 16+17 pod → pod thứ 34 không có chỗ. **Fix tạm:** thêm node;
**đúng bài:** Karpenter tự thêm node theo nhu cầu (Mandate #13). **Bài học:** Pending ≠ luôn do CPU/mem —
kiểm `Too many pods` / max-pods.

### #1 — EBS CSI addon timeout
Addon `aws-ebs-csi-driver` kẹt `CREATING` 20' rồi timeout. Health check của addon cần controller khỏe,
mà controller cần IRSA role để gọi EC2 volume API. Không gắn role → degraded → không ACTIVE.
**Fix:** bỏ addon (lab không dùng PVC). Nếu cần EBS: thêm lại kèm `service_account_role_arn` (IRSA).

## Nguyên tắc rút ra
1. **OIDC/IAM denied** → xem claim thật (`sub`, `aud`), đừng tin trust "nhìn đúng".
2. **Pod Pending** → phân biệt CPU/mem vs **pod-density** vs **policy admission**.
3. **Helm timeout** → tăng `timeout`, và kiểm pod có Pending vì thiếu chỗ/PVC không.
4. **"NonExistentQueue/Resource ... or access"** → 90% là **quyền**, kiểm creds trước.
5. **GITHUB_TOKEN** không trigger workflow → đừng xây pipeline phụ thuộc điều đó.
6. **Pin đúng tag** (action/image) — verify tồn tại (`gh api releases/latest`, `runs.using`).
