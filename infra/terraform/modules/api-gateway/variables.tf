variable "project_name" {
  description = "Project identifier used as a prefix for resource names"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging, dev)"
  type        = string
}

variable "aws_region" {
  description = "AWS region where the API is deployed"
  type        = string
}

variable "lambda_invoke_arn" {
  description = "Invoke ARN of the Lambda function (used in API Gateway integrations)"
  type        = string
}

variable "lambda_function_name" {
  description = "Name of the Lambda function (used for the resource-based permission)"
  type        = string
}

variable "dashboard_origin" {
  description = "Allowed CORS origin returned in OPTIONS responses"
  type        = string
  default     = "*"
}
