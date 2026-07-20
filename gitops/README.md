# GitOps — ArgoCD

ArgoCD theo dõi repo Git và tự đồng bộ trạng thái vào cluster.

## Áp dụng Application
Sau khi ArgoCD đã cài (xem `infra/argocd.tf`):

```bash
kubectl apply -f gitops/apps/course-service.yaml
```

ArgoCD sẽ pull chart từ `charts/course-service` và deploy vào namespace `default`.

## Luồng làm việc
1. Dev sửa code → CI build image → push ECR với tag mới.
2. Cập nhật `image.tag` trong `charts/course-service/values.yaml` (hoặc qua CI) → commit.
3. ArgoCD phát hiện thay đổi → tự sync → rollout.
4. Rollback = revert commit trong Git.

> Đổi `repoURL` trong manifest thành URL repo Git thật của bạn.
