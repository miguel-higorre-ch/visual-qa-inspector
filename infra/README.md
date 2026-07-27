# VisualQA Inspector — AWS Infrastructure

This directory contains the Terraform configuration to provision all AWS resources needed by VisualQA Inspector.

## Architecture Overview

| Resource | Name pattern | Purpose |
|---|---|---|
| S3 Bucket | `visual-qa-inspector-images-prod` | Store baseline, current, annotated screenshots and reports |
| DynamoDB Table | `visual-qa-inspector-runs-prod` | Persist QA run metadata and results |
| Lambda Function | `visual-qa-inspector-analyzer-prod` | AI-powered analysis using Amazon Bedrock |
| API Gateway | `visual-qa-inspector-api-prod` | REST API exposing `/analyze`, `/presign`, `/history` |
| CloudWatch Log Group | `/aws/lambda/visual-qa-inspector-analyzer-prod` | Lambda execution logs |

## Prerequisites

- [Terraform >= 1.5](https://developer.hashicorp.com/terraform/downloads)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured with credentials that have sufficient IAM permissions
- AWS region: `us-east-1` (default; Amazon Bedrock with Claude 3.5 Sonnet v2 is required in this region)
- Node.js installed (to allow `archive_file` to zip the Lambda source at plan time)

## Setup Steps

### 1. Configure AWS credentials

```bash
aws configure
# or use environment variables:
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=us-east-1
```

### 2. Copy and edit variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
aws_region       = "us-east-1"
environment      = "prod"
dashboard_origin = "https://your-actual-amplify-url.amplifyapp.com"
project_name     = "visual-qa-inspector"
```

### 3. Initialize Terraform

```bash
terraform init
```

### 4. Review the execution plan

```bash
terraform plan
```

### 5. Apply

```bash
terraform apply
```

Type `yes` when prompted. The first apply typically takes 2–4 minutes.

### 6. Note the outputs

After a successful apply, Terraform prints the resource identifiers you need to configure the rest of the project:

```
api_gateway_url       = "https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod"
s3_bucket_name        = "visual-qa-inspector-images-prod"
dynamodb_table_name   = "visual-qa-inspector-runs-prod"
lambda_function_arn   = "arn:aws:lambda:us-east-1:123456789012:function:visual-qa-inspector-analyzer-prod"
cloudwatch_log_group  = "/aws/lambda/visual-qa-inspector-analyzer-prod"
```

You can retrieve outputs at any time with:

```bash
terraform output
```

## Module Reference

### `modules/s3`

| Variable | Default | Description |
|---|---|---|
| `project_name` | — | Resource name prefix |
| `environment` | — | Suffix for the bucket name |
| `dashboard_origin` | `*` | CORS allowed origin |

| Output | Description |
|---|---|
| `bucket_name` | S3 bucket name |
| `bucket_arn` | S3 bucket ARN |

### `modules/dynamodb`

| Output | Description |
|---|---|
| `table_name` | DynamoDB table name |
| `table_arn` | DynamoDB table ARN |

### `modules/lambda`

| Output | Description |
|---|---|
| `function_arn` | Lambda function ARN |
| `function_name` | Lambda function name |
| `role_arn` | IAM execution role ARN |
| `function_invoke_arn` | Invoke ARN (used by API Gateway) |

### `modules/api-gateway`

| Output | Description |
|---|---|
| `api_url` | Full invoke URL — `https://<id>.execute-api.<region>.amazonaws.com/prod` |

### `modules/cloudwatch`

| Output | Description |
|---|---|
| `log_group_name` | CloudWatch log group name |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/analyze` | Trigger a visual QA analysis run |
| `POST` | `/presign` | Generate a pre-signed S3 URL for direct upload |
| `GET` | `/history` | Retrieve past QA run results |
| `OPTIONS` | `*` | CORS preflight (handled by mock integrations) |

## Updating Lambda Code

When you modify the Lambda source in `lambda/`, re-deploy with:

```bash
terraform apply
```

Terraform detects the source code change via `source_code_hash` and updates the function automatically.

## Destroy

To tear down all provisioned resources:

```bash
terraform destroy
```

> **Warning:** This permanently deletes the S3 bucket (and all objects, because `force_destroy = true`), the DynamoDB table, and all associated resources. This action is irreversible.

## Cost Estimate

All resources use pay-per-use pricing with no minimum commitment:

- **S3**: Storage + request costs. Objects expire after 7 days.
- **DynamoDB**: `PAY_PER_REQUEST` — charged per read/write unit.
- **Lambda**: First 1M requests/month free; beyond that, ~$0.20 per 1M requests.
- **API Gateway**: First 1M calls/month free; ~$3.50 per million after that.
- **CloudWatch Logs**: First 5 GB/month ingestion free.
- **Bedrock (Claude 3.5 Sonnet v2)**: Charged per input/output token — see [AWS Bedrock pricing](https://aws.amazon.com/bedrock/pricing/).

For accurate estimates visit the [AWS Pricing Calculator](https://calculator.aws/pricing/2/home).
