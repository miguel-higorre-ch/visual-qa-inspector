locals {
  function_name = "${var.project_name}-analyzer-${var.environment}"
  role_name     = "${var.project_name}-analyzer-role-${var.environment}"
}

# ---------------------------------------------------------------------------
# Package the Lambda source code
# ---------------------------------------------------------------------------
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../../lambda"
  output_path = "${path.module}/lambda.zip"
  excludes    = ["tests", "*.test.js", "*.spec.js", "node_modules/.cache"]
}

# ---------------------------------------------------------------------------
# IAM Role — trust policy
# ---------------------------------------------------------------------------
resource "aws_iam_role" "lambda" {
  name = local.role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = local.role_name
  }
}

# ---------------------------------------------------------------------------
# Inline policy 1 — S3 access (scoped read/write)
# ---------------------------------------------------------------------------
resource "aws_iam_role_policy" "s3_access" {
  name = "s3-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3BucketList"
        Effect = "Allow"
        Action = ["s3:ListBucket"]
        Resource = [var.s3_bucket_arn]
      },
      {
        Sid    = "S3GetObjects"
        Effect = "Allow"
        Action = ["s3:GetObject"]
        Resource = ["${var.s3_bucket_arn}/*"]
      },
      {
        Sid    = "S3PutObjects"
        Effect = "Allow"
        Action = ["s3:PutObject"]
        Resource = [
          "${var.s3_bucket_arn}/annotated/*",
          "${var.s3_bucket_arn}/reports/*"
        ]
      }
    ]
  })
}

# ---------------------------------------------------------------------------
# Inline policy 2 — Bedrock access
# ---------------------------------------------------------------------------
resource "aws_iam_role_policy" "bedrock_access" {
  name = "bedrock-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockInvokeModel"
        Effect = "Allow"
        Action = ["bedrock:InvokeModel"]
        Resource = [
          "arn:aws:bedrock:us-east-1::foundation-model/anthropic.*"
        ]
      }
    ]
  })
}

# ---------------------------------------------------------------------------
# Inline policy 3 — DynamoDB access
# ---------------------------------------------------------------------------
resource "aws_iam_role_policy" "dynamodb_access" {
  name = "dynamodb-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBTableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
        ]
      }
    ]
  })
}

# ---------------------------------------------------------------------------
# Inline policy 4 — CloudWatch Logs
# ---------------------------------------------------------------------------
resource "aws_iam_role_policy" "cloudwatch_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "arn:aws:logs:*:*:log-group:/aws/lambda/${var.project_name}-*"
        ]
      }
    ]
  })
}

# ---------------------------------------------------------------------------
# Lambda Function
# ---------------------------------------------------------------------------
resource "aws_lambda_function" "main" {
  function_name    = local.function_name
  description      = "VisualQA Inspector — AI-powered screenshot analysis via Amazon Bedrock"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs20.x"
  architectures    = ["arm64"]
  handler          = "src/index.handler"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size      = 512
  timeout          = 30

  environment {
    variables = {
      S3_BUCKET_NAME     = var.s3_bucket_name
      DYNAMODB_TABLE_NAME = var.dynamodb_table_name
      BEDROCK_MODEL_ID   = "anthropic.claude-sonnet-4-5"
      AWS_REGION_NAME    = var.aws_region
    }
  }

  depends_on = [
    aws_iam_role_policy.s3_access,
    aws_iam_role_policy.bedrock_access,
    aws_iam_role_policy.dynamodb_access,
    aws_iam_role_policy.cloudwatch_logs,
  ]

  tags = {
    Name = local.function_name
  }
}
