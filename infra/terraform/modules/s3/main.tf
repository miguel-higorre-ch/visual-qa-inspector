locals {
  bucket_name = "${var.project_name}-images-${var.environment}"
}

# ---------------------------------------------------------------------------
# S3 Bucket
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "images" {
  bucket        = local.bucket_name
  force_destroy = true

  tags = {
    Name = local.bucket_name
  }
}

# ---------------------------------------------------------------------------
# Block all public access
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_public_access_block" "images" {
  bucket = aws_s3_bucket.images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ---------------------------------------------------------------------------
# Versioning — disabled
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_versioning" "images" {
  bucket = aws_s3_bucket.images.id

  versioning_configuration {
    status = "Disabled"
  }
}

# ---------------------------------------------------------------------------
# Lifecycle — expire ALL objects after 7 days
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_lifecycle_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  rule {
    id     = "expire-all-objects-7-days"
    status = "Enabled"

    filter {
      prefix = ""
    }

    expiration {
      days = 7
    }
  }
}

# ---------------------------------------------------------------------------
# CORS — allow GET, PUT, POST from dashboard_origin
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_cors_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = [var.dashboard_origin]
    max_age_seconds = 3600
  }
}
