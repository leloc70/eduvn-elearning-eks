# Trỏ domain (apex + www) về CloudFront bằng alias record.
resource "aws_route53_record" "a" {
  for_each = toset(concat([var.domain_name], var.subject_alternative_names))

  zone_id         = data.aws_route53_zone.this.zone_id
  name            = each.value
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "aaaa" {
  for_each = toset(concat([var.domain_name], var.subject_alternative_names))

  zone_id         = data.aws_route53_zone.this.zone_id
  name            = each.value
  type            = "AAAA"
  allow_overwrite = true

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
