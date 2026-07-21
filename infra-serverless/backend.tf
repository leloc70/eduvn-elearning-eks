terraform {
  backend "s3" {
    bucket         = "eduvn-tf-state-500519358149"
    key            = "serverless/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "eduvn-tf-locks"
    encrypt        = true
  }
}
