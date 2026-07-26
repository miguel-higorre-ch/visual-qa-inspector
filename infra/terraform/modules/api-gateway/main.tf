locals {
  api_name = "${var.project_name}-api-${var.environment}"

  # CORS response parameters shared by all OPTIONS integrations
  cors_response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.dashboard_origin}'"
  }

  cors_method_response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# ---------------------------------------------------------------------------
# REST API
# ---------------------------------------------------------------------------
resource "aws_api_gateway_rest_api" "main" {
  name        = local.api_name
  description = "VisualQA Inspector API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = local.api_name
  }
}

# ---------------------------------------------------------------------------
# Resource: /analyze
# ---------------------------------------------------------------------------
resource "aws_api_gateway_resource" "analyze" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "analyze"
}

# POST /analyze — Lambda proxy
resource "aws_api_gateway_method" "analyze_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.analyze.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "analyze_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.analyze.id
  http_method             = aws_api_gateway_method.analyze_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn
}

# OPTIONS /analyze — CORS preflight mock
resource "aws_api_gateway_method" "analyze_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.analyze.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "analyze_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.analyze.id
  http_method = aws_api_gateway_method.analyze_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "analyze_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.analyze.id
  http_method = aws_api_gateway_method.analyze_options.http_method
  status_code = "200"

  response_parameters = local.cors_method_response_parameters

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "analyze_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.analyze.id
  http_method = aws_api_gateway_method.analyze_options.http_method
  status_code = aws_api_gateway_method_response.analyze_options_200.status_code

  response_parameters = local.cors_response_parameters

  depends_on = [aws_api_gateway_integration.analyze_options]
}

# ---------------------------------------------------------------------------
# Resource: /presign
# ---------------------------------------------------------------------------
resource "aws_api_gateway_resource" "presign" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "presign"
}

# POST /presign — Lambda proxy
resource "aws_api_gateway_method" "presign_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.presign.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "presign_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.presign.id
  http_method             = aws_api_gateway_method.presign_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn
}

# OPTIONS /presign — CORS preflight mock
resource "aws_api_gateway_method" "presign_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.presign.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "presign_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.presign.id
  http_method = aws_api_gateway_method.presign_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "presign_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.presign.id
  http_method = aws_api_gateway_method.presign_options.http_method
  status_code = "200"

  response_parameters = local.cors_method_response_parameters

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "presign_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.presign.id
  http_method = aws_api_gateway_method.presign_options.http_method
  status_code = aws_api_gateway_method_response.presign_options_200.status_code

  response_parameters = local.cors_response_parameters

  depends_on = [aws_api_gateway_integration.presign_options]
}

# ---------------------------------------------------------------------------
# Resource: /history
# ---------------------------------------------------------------------------
resource "aws_api_gateway_resource" "history" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "history"
}

# GET /history — Lambda proxy
resource "aws_api_gateway_method" "history_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.history.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "history_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.history.id
  http_method             = aws_api_gateway_method.history_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn
}

# OPTIONS /history — CORS preflight mock
resource "aws_api_gateway_method" "history_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.history.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "history_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.history_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "history_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.history_options.http_method
  status_code = "200"

  response_parameters = local.cors_method_response_parameters

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "history_options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.history.id
  http_method = aws_api_gateway_method.history_options.http_method
  status_code = aws_api_gateway_method_response.history_options_200.status_code

  response_parameters = local.cors_response_parameters

  depends_on = [aws_api_gateway_integration.history_options]
}

# ---------------------------------------------------------------------------
# Deployment & Stage
# ---------------------------------------------------------------------------
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.analyze.id,
      aws_api_gateway_resource.presign.id,
      aws_api_gateway_resource.history.id,
      aws_api_gateway_method.analyze_post.id,
      aws_api_gateway_method.presign_post.id,
      aws_api_gateway_method.history_get.id,
      aws_api_gateway_method.analyze_options.id,
      aws_api_gateway_method.presign_options.id,
      aws_api_gateway_method.history_options.id,
      aws_api_gateway_integration.analyze_post.id,
      aws_api_gateway_integration.presign_post.id,
      aws_api_gateway_integration.history_get.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.analyze_post,
    aws_api_gateway_integration.analyze_options,
    aws_api_gateway_integration.presign_post,
    aws_api_gateway_integration.presign_options,
    aws_api_gateway_integration.history_get,
    aws_api_gateway_integration.history_options,
    aws_api_gateway_integration_response.analyze_options_200,
    aws_api_gateway_integration_response.presign_options_200,
    aws_api_gateway_integration_response.history_options_200,
  ]
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  deployment_id = aws_api_gateway_deployment.main.id
  stage_name    = "prod"

  default_route_settings {
    throttling_rate_limit  = 10
    throttling_burst_limit = 20
  }

  tags = {
    Name = "${local.api_name}-prod"
  }
}

# ---------------------------------------------------------------------------
# Lambda permission — allow API Gateway to invoke the function
# ---------------------------------------------------------------------------
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
