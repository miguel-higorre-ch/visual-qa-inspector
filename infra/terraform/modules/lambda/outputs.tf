output "function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.main.arn
}

output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.main.function_name
}

output "role_arn" {
  description = "ARN of the IAM execution role attached to the Lambda function"
  value       = aws_iam_role.lambda.arn
}

output "function_invoke_arn" {
  description = "Invoke ARN of the Lambda function (used by API Gateway)"
  value       = aws_lambda_function.main.invoke_arn
}
