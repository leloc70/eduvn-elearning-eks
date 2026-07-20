# 02 — Kiến trúc giải pháp (EKS)

## Sơ đồ kiến trúc

```mermaid
flowchart TB
    User([Học viên / Giảng viên])
    Dev([Dev team])

    subgraph Edge["Edge"]
        CF[CloudFront + WAF]
    end
    S3W[S3: React SPA]

    subgraph VPC["VPC - Multi AZ"]
        ALB[ALB via LB Controller]

        subgraph EKS["EKS Cluster - private subnets"]
            direction TB
            ING[Ingress]
            subgraph NS["Microservices"]
                P1[Course svc]
                P2[Progress/Quiz svc]
                P3[Payment svc]
                P4[Upload svc]
                P5[Notification svc]
            end
            KA[Karpenter]
            HPA[HPA]
            ARGO[ArgoCD]
        end
    end

    subgraph Data["Data Layer"]
        DDB[(DynamoDB)]
        AUR[(Aurora Serverless v2)]
        RED[(ElastiCache Redis)]
        S3V[(S3: video)]
    end

    subgraph Media["Video Pipeline"]
        EB[EventBridge]
        MC[MediaConvert HLS]
    end

    subgraph Platform["Platform / Ops"]
        ECR[ECR]
        SM[Secrets Manager]
        COG[Cognito]
        OBS[Container Insights / Prometheus / Grafana]
    end

    STRIPE([Stripe])
    GIT([Git repo])

    User --> CF --> S3W
    User --> CF --> ALB --> ING --> NS
    User -. login .-> COG

    P1 --> DDB
    P2 --> DDB & RED
    P3 --> AUR
    P3 <-. webhook .-> STRIPE
    P4 --> S3V

    S3V -- ObjectCreated --> EB --> MC --> S3V --> CF

    GIT -. sync .-> ARGO -. deploy .-> NS
    Dev -- push image --> ECR --> NS
    NS -. IRSA .-> DDB & AUR & S3V
    NS -.-> SM
    NS -.-> OBS
    KA -. scale nodes .-> EKS
    HPA -. scale pods .-> NS
```

## Các luồng chính (để present cho khách)

### 1. Truy cập web
Học viên → CloudFront (+ WAF chống tấn công) → React SPA trên S3. API đi qua CloudFront → ALB → Ingress → microservice trong EKS.

### 2. Xác thực
Đăng nhập qua **Cognito** (email hoặc Google/Facebook). Token JWT được service verify.

### 3. Deploy (GitOps)
Dev push code → CI build image → đẩy **ECR** (scan bảo mật) → cập nhật Helm chart trong Git → **ArgoCD** tự đồng bộ vào cluster. Trạng thái hệ thống = trạng thái trong Git (tái lập được, rollback dễ).

### 4. Video pipeline
Giảng viên upload → **S3** → sự kiện `ObjectCreated` → **EventBridge** → **MediaConvert** transcode ra HLS nhiều độ phân giải → lưu lại S3 → phát qua **CloudFront + signed URL** (chống tải lậu).

### 5. Thanh toán
Mua khóa học → **Stripe** xử lý (không tự lưu thẻ → giảm rủi ro PCI) → webhook về Payment service → ghi đơn vào **Aurora Serverless v2**.

### 6. Autoscaling (2 tầng)
Tải tăng → **HPA** thêm pod → **Karpenter** thêm node phù hợp → tải giảm thì thu về → tối ưu chi phí.

## Bảo mật
- **IRSA:** mỗi microservice có ServiceAccount gắn IAM Role least-privilege (pod truy cập DynamoDB/S3 không cần access key).
- **Secrets Manager + CSI driver:** secret mount vào pod, không hardcode.
- **Network:** node ở private subnet, chỉ ALB ở public; network policy giới hạn traffic pod-to-pod.
- **Mã hóa:** S3/EBS/RDS at-rest (KMS), TLS in-transit.

## Multi-AZ & DR
- EKS node group trải trên ≥2 AZ.
- Aurora multi-AZ, DynamoDB tự replicate, S3 durability 11 số 9.
- Backup: Aurora snapshot tự động, S3 versioning.
