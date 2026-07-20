output "cluster_name" {
  description = "Tên EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint API server"
  value       = module.eks.cluster_endpoint
}

output "region" {
  value = var.region
}

output "configure_kubectl" {
  description = "Lệnh cấu hình kubectl"
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.region}"
}

output "ecr_repository_urls" {
  description = "URL các ECR repo"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
