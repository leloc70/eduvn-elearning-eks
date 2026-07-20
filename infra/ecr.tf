# ECR repo cho từng microservice
resource "aws_ecr_repository" "services" {
  for_each = toset(var.microservices)

  name                 = "${var.project}/${each.value}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true # quét lỗ hổng khi push
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# Lifecycle: chỉ giữ 10 image gần nhất để tiết kiệm chi phí
resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Giữ 10 image gần nhất"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
