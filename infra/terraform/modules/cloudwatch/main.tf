locals {
  log_group_name = "/aws/lambda/${var.project_name}-analyzer-${var.environment}"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = local.log_group_name
  retention_in_days = 30

  tags = {
    Name = local.log_group_name
  }
}
