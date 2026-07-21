output "api_url" {
  value = "https://${var.api_domain}"
}

output "api_gateway_url" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

output "table_name" {
  value = aws_dynamodb_table.courses.name
}
