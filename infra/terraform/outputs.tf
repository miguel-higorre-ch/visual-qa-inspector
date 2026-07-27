output "api_gateway_url" {
  description = "Full invoke URL for the API Gateway prod stage"
  value       = module.api_gateway.api_url
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket used for image storage"
  value       = module.s3.bucket_name
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table storing QA run results"
  value       = module.dynamodb.table_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda analyzer function"
  value       = module.lambda.function_arn
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name for Lambda logs"
  value       = module.cloudwatch.log_group_name
}
