variable "project_name" {
  description = "Project identifier used as a prefix for resource names"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging, dev)"
  type        = string
}

variable "dashboard_origin" {
  description = "Allowed CORS origin for the S3 bucket (e.g. https://your-dashboard.amplifyapp.com)"
  type        = string
  default     = "*"
}
