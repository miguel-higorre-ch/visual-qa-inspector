locals {
  table_name = "${var.project_name}-runs-${var.environment}"
}

resource "aws_dynamodb_table" "runs" {
  name         = local.table_name
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

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  global_secondary_index {
    name            = "severity-timestamp-index"
    hash_key        = "overallSeverity"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  tags = {
    Name = local.table_name
  }
}
