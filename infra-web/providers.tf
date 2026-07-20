provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project   = "eduvn-web"
      ManagedBy = "terraform"
    }
  }
}

# CloudFront + ACM cert phải ở us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags {
    tags = {
      Project   = "eduvn-web"
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

data "aws_route53_zone" "this" {
  name         = var.domain_name
  private_zone = false
}
