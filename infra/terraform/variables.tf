variable "aws_region" {
  description = "AWS region where all resources will be deployed"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "dashboard_origin" {
  description = "Allowed CORS origin for S3 and API Gateway (e.g. https://your-dashboard.amplifyapp.com)"
  type        = string
  default     = "*"
}

variable "project_name" {
  description = "Project identifier used as a prefix for all resource names"
  type        = string
  default     = "visual-qa-inspector"
}
