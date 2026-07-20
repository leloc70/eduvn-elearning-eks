variable "project" {
  description = "Tên project (dùng để đặt tên tài nguyên)"
  type        = string
  default     = "eduvn"
}

variable "environment" {
  description = "Môi trường: dev | staging | prod"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "vpc_cidr" {
  description = "CIDR cho VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Danh sách Availability Zones"
  type        = list(string)
  default     = ["ap-southeast-1a", "ap-southeast-1b"]
}

variable "cluster_version" {
  description = "Phiên bản Kubernetes cho EKS"
  type        = string
  default     = "1.30"
}

variable "node_instance_types" {
  description = "Loại instance cho managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  type    = number
  default = 2
}

variable "node_min_size" {
  type    = number
  default = 2
}

variable "node_max_size" {
  type    = number
  default = 4
}

variable "node_capacity_type" {
  description = "ON_DEMAND hoặc SPOT"
  type        = string
  default     = "SPOT"
}

variable "github_repo" {
  description = "GitHub repo dạng owner/name (dùng cho OIDC trust)"
  type        = string
  default     = "leloc70/eduvn-elearning-eks"
}

variable "microservices" {
  description = "Danh sách microservice cần tạo ECR repo"
  type        = list(string)
  default     = ["course-service", "progress-service", "payment-service", "upload-service", "notification-service"]
}
