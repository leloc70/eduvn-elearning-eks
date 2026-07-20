locals {
  name = "${var.project}-${var.environment}"

  # Tag để EKS/LB Controller nhận diện subnet
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    # Karpenter discovery
    "karpenter.sh/discovery" = local.name
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "${local.name}-vpc"
  cidr = var.vpc_cidr
  azs  = var.azs

  private_subnets = [for i, az in var.azs : cidrsubnet(var.vpc_cidr, 4, i)]
  public_subnets  = [for i, az in var.azs : cidrsubnet(var.vpc_cidr, 4, i + 8)]

  enable_nat_gateway   = true
  single_nat_gateway   = true # dev: 1 NAT tiết kiệm chi phí; prod nên bật 1 NAT/AZ
  enable_dns_hostnames = true

  public_subnet_tags  = local.public_subnet_tags
  private_subnet_tags = local.private_subnet_tags
}
