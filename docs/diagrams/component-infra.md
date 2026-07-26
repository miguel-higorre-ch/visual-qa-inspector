# Component Design — Infrastructure

> Terraform configuration for all AWS resources. Manages S3, Lambda, API Gateway, DynamoDB, IAM, and CloudWatch.

---

## Terraform Module Structure

```mermaid
graph TD
    subgraph infra["infra/terraform/"]
        MAIN[main.tf<br/>Provider config + module calls]
        VARS[variables.tf<br/>Input variables]
        OUT[outputs.tf<br/>API URL, S3 bucket name, etc.]
        TFVARS[terraform.tfvars.example<br/>Variable values template]

        subgraph MODULES["modules/"]
            S3_MOD[s3/main.tf<br/>Bucket + lifecycle + CORS]
            LMB_MOD[lambda/main.tf<br/>Function + IAM role + policies]
            APIGW_MOD[api-gateway/main.tf<br/>REST API + stage + throttling]
            DDB_MOD[dynamodb/main.tf<br/>Table + indexes]
            CW_MOD[cloudwatch/main.tf<br/>Log group + metric alarms]
        end
    end

    MAIN --> S3_MOD
    MAIN --> LMB_MOD
    MAIN --> APIGW_MOD
    MAIN --> DDB_MOD
    MAIN --> CW_MOD
    LMB_MOD --> S3_MOD
    LMB_MOD --> DDB_MOD
    APIGW_MOD --> LMB_MOD
```

---

## Resource Dependency Graph

```mermaid
graph LR
    IAM_ROLE[aws_iam_role<br/>lambda-visual-qa-role]
    IAM_S3[aws_iam_role_policy<br/>s3-access]
    IAM_BDR[aws_iam_role_policy<br/>bedrock-access]
    IAM_DDB[aws_iam_role_policy<br/>dynamodb-access]
    IAM_CW[aws_iam_role_policy<br/>cloudwatch-logs]

    S3[aws_s3_bucket<br/>visual-qa-inspector-images]
    S3_CORS[aws_s3_bucket_cors_configuration]
    S3_LIFE[aws_s3_bucket_lifecycle_configuration<br/>7-day expiry]
    S3_PUBLIC[aws_s3_bucket_public_access_block]

    DDB[aws_dynamodb_table<br/>visual-qa-inspector-runs]

    LMB[aws_lambda_function<br/>visual-qa-inspector-analyzer]
    LMB_LOG[aws_cloudwatch_log_group<br/>/aws/lambda/visual-qa-inspector]
    LMB_PERM[aws_lambda_permission<br/>allow-api-gateway]

    APIGW[aws_api_gateway_rest_api]
    APIGW_RES[aws_api_gateway_resource<br/>/analyze]
    APIGW_POST[aws_api_gateway_method<br/>POST]
    APIGW_INT[aws_api_gateway_integration<br/>Lambda proxy]
    APIGW_STAGE[aws_api_gateway_stage<br/>prod]
    APIGW_DEPLOY[aws_api_gateway_deployment]

    IAM_ROLE --> LMB
    IAM_S3 --> IAM_ROLE
    IAM_BDR --> IAM_ROLE
    IAM_DDB --> IAM_ROLE
    IAM_CW --> IAM_ROLE
    S3 --> IAM_S3
    S3 --> S3_CORS
    S3 --> S3_LIFE
    S3 --> S3_PUBLIC
    DDB --> IAM_DDB
    LMB --> LMB_PERM
    LMB --> LMB_LOG
    APIGW --> APIGW_RES
    APIGW_RES --> APIGW_POST
    APIGW_POST --> APIGW_INT
    APIGW_INT --> LMB
    LMB_PERM --> APIGW
    APIGW_INT --> APIGW_DEPLOY
    APIGW_DEPLOY --> APIGW_STAGE
```

---

## Key Resource Configurations

### S3 Bucket

```hcl
resource "aws_s3_bucket" "images" {
  bucket = "visual-qa-inspector-images-${var.environment}"
}

resource "aws_s3_bucket_lifecycle_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  rule {
    id     = "expire-screenshots"
    status = "Enabled"
    expiration { days = 7 }
  }
}

resource "aws_s3_bucket_cors_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = [var.dashboard_origin]
    max_age_seconds = 3000
  }
}
```

### Lambda Function

```hcl
resource "aws_lambda_function" "analyzer" {
  function_name = "visual-qa-inspector-analyzer-${var.environment}"
  runtime       = "nodejs20.x"
  handler       = "src/index.handler"
  role          = aws_iam_role.lambda.arn
  timeout       = 30
  memory_size   = 512
  architectures = ["arm64"]

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      S3_BUCKET_NAME     = aws_s3_bucket.images.bucket
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.runs.name
      BEDROCK_MODEL_ID   = "anthropic.claude-3-5-sonnet-20241022-v2:0"
      AWS_REGION_NAME    = var.aws_region
    }
  }
}
```

### DynamoDB Table

```hcl
resource "aws_dynamodb_table" "runs" {
  name         = "visual-qa-inspector-runs-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "runId"
  range_key    = "timestamp"

  attribute {
    name = "runId"
    type = "S"
  }
  attribute {
    name = "timestamp"
    type = "S"
  }
  attribute {
    name = "overallSeverity"
    type = "S"
  }

  global_secondary_index {
    name            = "severity-timestamp-index"
    hash_key        = "overallSeverity"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}
```

---

## Input Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `aws_region` | string | `us-east-1` | AWS region for all resources |
| `environment` | string | `prod` | Environment suffix for resource names |
| `dashboard_origin` | string | `*` | Allowed CORS origin for S3 (set to Amplify URL) |
| `lambda_zip_path` | string | — | Path to Lambda deployment zip |
| `bedrock_model_id` | string | `anthropic.claude-3-5-sonnet-20241022-v2:0` | Bedrock model to use |

---

## Outputs

| Output | Description |
|---|---|
| `api_gateway_url` | Base URL for POST /analyze — set as `REACT_APP_API_URL` in Amplify |
| `s3_bucket_name` | Bucket name — set as `S3_BUCKET_NAME` in GitHub Secrets |
| `dynamodb_table_name` | Table name |
| `lambda_function_arn` | Lambda ARN |
| `cloudwatch_log_group` | Log group name for debugging |

---

## Deployment Commands

```bash
cd infra/terraform

# First time setup
terraform init

# Preview changes
terraform plan -var-file="terraform.tfvars"

# Apply
terraform apply -var-file="terraform.tfvars"

# Tear down (after hackathon)
terraform destroy -var-file="terraform.tfvars"
```

---

## CloudWatch Alarms

```mermaid
graph TD
    subgraph ALARMS["CloudWatch Metric Alarms"]
        A1[LambdaErrors<br/>Threshold: >5 errors in 5min<br/>Action: log only]
        A2[LambdaDuration<br/>Threshold: >25000ms p99<br/>Action: log only]
        A3[BedrockThrottles<br/>Threshold: >10 throttles in 5min<br/>Action: log only]
    end
```

Alarms are informational only — no SNS notifications to keep setup simple for the hackathon.
