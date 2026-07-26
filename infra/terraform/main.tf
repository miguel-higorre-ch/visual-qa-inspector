terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# CloudWatch module (must be created before Lambda)
# ---------------------------------------------------------------------------
module "cloudwatch" {
  source = "./modules/cloudwatch"

  project_name = var.project_name
  environment  = var.environment
}

# ---------------------------------------------------------------------------
# S3 module
# ---------------------------------------------------------------------------
module "s3" {
  source = "./modules/s3"

  project_name      = var.project_name
  environment       = var.environment
  dashboard_origin  = var.dashboard_origin
}

# ---------------------------------------------------------------------------
# DynamoDB module
# ---------------------------------------------------------------------------
module "dynamodb" {
  source = "./modules/dynamodb"

  project_name = var.project_name
  environment  = var.environment
}

# ---------------------------------------------------------------------------
# Lambda module
# ---------------------------------------------------------------------------
module "lambda" {
  source = "./modules/lambda"

  project_name        = var.project_name
  environment         = var.environment
  aws_region          = var.aws_region
  s3_bucket_name      = module.s3.bucket_name
  s3_bucket_arn       = module.s3.bucket_arn
  dynamodb_table_name = module.dynamodb.table_name
  dynamodb_table_arn  = module.dynamodb.table_arn

  depends_on = [module.cloudwatch]
}

# ---------------------------------------------------------------------------
# API Gateway module
# ---------------------------------------------------------------------------
module "api_gateway" {
  source = "./modules/api-gateway"

  project_name         = var.project_name
  environment          = var.environment
  aws_region           = var.aws_region
  lambda_invoke_arn    = module.lambda.function_invoke_arn
  lambda_function_name = module.lambda.function_name
  dashboard_origin     = var.dashboard_origin
}
