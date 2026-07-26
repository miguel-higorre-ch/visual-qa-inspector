variable "project_name" {
  description = "Project identifier used as a prefix for resource names"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging, dev)"
  type        = string
}

variable "aws_region" {
  description = "AWS region where the Lambda function is deployed"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for image storage"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket for image storage"
  type        = string
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table for QA run results"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table for QA run results"
  type        = string
}
