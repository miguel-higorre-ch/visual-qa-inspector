output "api_url" {
  description = "Full invoke URL for the API Gateway prod stage"
  value       = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/prod"
}

output "api_id" {
  description = "ID of the REST API"
  value       = aws_api_gateway_rest_api.main.id
}

output "execution_arn" {
  description = "Execution ARN of the REST API"
  value       = aws_api_gateway_rest_api.main.execution_arn
}
