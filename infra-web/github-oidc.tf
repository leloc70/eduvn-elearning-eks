# OIDC để GitHub Actions deploy frontend (không key tĩnh). Tách khỏi EKS (luôn tồn tại).
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "web_deploy" {
  name = "eduvn-web-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        # Khớp cả sub cũ lẫn immutable (repo:owner@ID/name@ID:...) — xem INCIDENTS #3.
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:leloc70*/eduvn-elearning-eks*:ref:refs/heads/main"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "web_deploy" {
  name = "s3-cloudfront-deploy"
  role = aws_iam_role.web_deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "S3Sync"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket", "s3:GetObject"]
        Resource = [aws_s3_bucket.site.arn, "${aws_s3_bucket.site.arn}/*"]
      },
      {
        Sid      = "CloudFrontInvalidate"
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = aws_cloudfront_distribution.site.arn
      }
    ]
  })
}

output "web_deploy_role_arn" {
  description = "Gán vào biến repo AWS_WEB_ROLE_ARN"
  value       = aws_iam_role.web_deploy.arn
}
