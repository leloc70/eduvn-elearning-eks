# Bảng khóa học cho course-service (khớp TABLE_NAME=eduvn-dev-courses).
resource "aws_dynamodb_table" "courses" {
  name         = "${local.name}-courses"
  billing_mode = "PAY_PER_REQUEST" # on-demand, rẻ cho lab
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

# IRSA least-privilege: course-service chỉ thao tác trên bảng courses.
resource "aws_iam_role_policy" "course_service_ddb" {
  name = "dynamodb-courses"
  role = module.course_service_irsa.iam_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Scan",
        "dynamodb:Query",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
      ]
      Resource = [aws_dynamodb_table.courses.arn]
    }]
  })
}
