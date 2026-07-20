variable "region" {
  type    = string
  default = "ap-southeast-1"
}

variable "domain_name" {
  description = "Domain gốc đã đăng ký trong Route 53"
  type        = string
  default     = "mywebsitelocle.click"
}

variable "subject_alternative_names" {
  description = "Tên miền phụ (www...)"
  type        = list(string)
  default     = ["www.mywebsitelocle.click"]
}
