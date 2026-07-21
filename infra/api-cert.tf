# ACM cert cho ALB backend (api.<domain>) — region ap-southeast-1 (khác cert
# CloudFront ở us-east-1). AWS Load Balancer Controller tự gắn cert này vào
# HTTPS listener nhờ khớp host của Ingress (cert discovery).
resource "aws_acm_certificate" "api" {
  domain_name       = var.api_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

data "aws_route53_zone" "root" {
  name         = var.root_domain
  private_zone = false
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id         = data.aws_route53_zone.root.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for r in aws_route53_record.api_cert_validation : r.fqdn]
}

output "api_cert_arn" {
  value = aws_acm_certificate_validation.api.certificate_arn
}

output "root_zone_id" {
  value = data.aws_route53_zone.root.zone_id
}
