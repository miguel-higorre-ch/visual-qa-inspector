# AWS Infrastructure — VisualQA Inspector

> All AWS services, their configurations, relationships, and IAM permissions.

---

## Infrastructure Overview

```mermaid
graph TB
    subgraph INTERNET["Internet"]
        USER[User / Browser]
        GHACT[GitHub Actions]
    end

    subgraph AWS["AWS — us-east-1"]

        subgraph FRONTEND["Frontend Hosting"]
            AMP[AWS Amplify<br/>dashboard SPA<br/>auto-deploy from main]
        end

        subgraph API_LAYER["API Layer"]
            APIGW[API Gateway<br/>REST API<br/>POST /analyze<br/>HTTPS only]
        end

        subgraph COMPUTE["Compute"]
            LMB[AWS Lambda<br/>visual-qa-inspector-analyzer<br/>Node.js 20 / 512MB / 30s timeout]
        end

        subgraph AI_LAYER["AI Reasoning"]
            BDR[Amazon Bedrock<br/>Claude 3.5 Sonnet v2<br/>anthropic.claude-3-5-sonnet-20241022-v2:0<br/>us-east-1]
        end

        subgraph STORAGE_LAYER["Storage"]
            S3[Amazon S3<br/>visual-qa-inspector-images<br/>lifecycle: delete after 7 days]
            DDB[Amazon DynamoDB<br/>visual-qa-inspector-runs<br/>on-demand billing]
        end

        subgraph OBSERVABILITY["Observability"]
            CW[CloudWatch Logs<br/>/aws/lambda/visual-qa-inspector<br/>30-day retention]
        end

        subgraph SECURITY["Security"]
            IAM_LMB[IAM Role<br/>lambda-visual-qa-role]
            IAM_AMP[IAM Role<br/>amplify-deploy-role]
        end
    end

    USER --> AMP
    USER --> APIGW
    GHACT --> APIGW
    AMP --> APIGW
    APIGW --> LMB
    LMB --> BDR
    LMB --> S3
    LMB --> DDB
    LMB --> CW
    IAM_LMB --> LMB
    IAM_AMP --> AMP
```

---

## IAM Permissions

```mermaid
graph LR
    subgraph IAM_ROLE["IAM Role: lambda-visual-qa-role"]
        TRUST["Trust Policy:<br/>lambda.amazonaws.com"]
    end

    subgraph POLICIES["Attached Policies"]
        P1["S3 Policy<br/>s3:GetObject — baseline/*, current/*, source-code/*<br/>s3:PutObject — annotated/*, reports/*<br/>Resource: arn:aws:s3:::visual-qa-inspector-images/*"]
        P2["Bedrock Policy<br/>bedrock:InvokeModel<br/>Resource: claude-3-5-sonnet-20241022-v2:0"]
        P3["DynamoDB Policy<br/>dynamodb:PutItem<br/>dynamodb:GetItem<br/>dynamodb:Query<br/>Resource: visual-qa-inspector-runs"]
        P4["CloudWatch Policy<br/>logs:CreateLogGroup<br/>logs:CreateLogStream<br/>logs:PutLogEvents<br/>Resource: /aws/lambda/visual-qa-inspector-*"]
    end

    IAM_ROLE --> P1
    IAM_ROLE --> P2
    IAM_ROLE --> P3
    IAM_ROLE --> P4
```

---

## S3 Bucket Structure

```mermaid
graph TD
    BUCKET[S3 Bucket<br/>visual-qa-inspector-images]

    BUCKET --> BASE[/baseline/]
    BUCKET --> CUR[/current/]
    BUCKET --> SRC[/source-code/]
    BUCKET --> ANN[/annotated/]
    BUCKET --> RPT[/reports/]

    BASE --> BASE_RUN[/{run-id}/]
    BASE_RUN --> BASE_DESK[/desktop/screenshot.png]
    BASE_RUN --> BASE_MOB[/mobile/screenshot.png]

    CUR --> CUR_RUN[/{run-id}/]
    CUR_RUN --> CUR_DESK[/desktop/screenshot.png]
    CUR_RUN --> CUR_MOB[/mobile/screenshot.png]

    SRC --> SRC_RUN[/{run-id}/]
    SRC_RUN --> SRC_JSX[/ComponentName.jsx]
    SRC_RUN --> SRC_CSS[/ComponentName.css]

    ANN --> ANN_RUN[/{run-id}/]
    ANN_RUN --> ANN_DESK[/desktop/screenshot-annotated.png]
    ANN_RUN --> ANN_MOB[/mobile/screenshot-annotated.png]

    RPT --> RPT_RUN[/{run-id}/]
    RPT_RUN --> RPT_JSON[/report.json]
```

---

## DynamoDB Table Design

```mermaid
erDiagram
    RUNS {
        string runId PK "Partition Key — UUID"
        string timestamp SK "Sort Key — ISO 8601"
        string mode "regression OR intent OR accessibility"
        string overallSeverity "critical OR minor OR cosmetic OR pass"
        string reportUrl "S3 URL to report.json"
        number diffsFound "total diffs across all viewports"
        string prNumber "GitHub PR number if CI-triggered"
        string repoFullName "owner/repo if CI-triggered"
        string triggeredBy "ci OR manual"
        number durationMs "analysis duration in milliseconds"
        string baselinePrefix "S3 prefix for baseline images"
        string currentPrefix "S3 prefix for current images"
    }
```

---

## API Gateway Configuration

```mermaid
graph LR
    subgraph APIGW_DETAIL["API Gateway: visual-qa-inspector-api"]
        STAGE[Stage: prod]
        RESOURCE[Resource: /analyze]
        METHOD[Method: POST]
        THROTTLE["Throttling:<br/>Rate: 10 req/s<br/>Burst: 20"]
        TIMEOUT["Integration timeout: 29s<br/>(Lambda max: 30s)"]
        CORS["CORS enabled:<br/>Origin: Amplify domain<br/>Methods: POST, OPTIONS"]
    end

    CLIENT[Client] -- "POST /prod/analyze" --> STAGE
    STAGE --> RESOURCE
    RESOURCE --> METHOD
    METHOD --> LMB2[Lambda]
```

---

## Cost Estimate (Hackathon Scale)

```mermaid
pie title Monthly AWS Cost Estimate (~100 analysis runs)
    "S3 Storage + Transfer" : 1
    "Lambda Invocations" : 1
    "API Gateway Requests" : 1
    "Bedrock (Claude tokens)" : 85
    "DynamoDB On-demand" : 1
    "Amplify Hosting" : 11
```

> Estimated total: **~$5–15/month** at hackathon scale (100 runs/month).
> Bedrock cost dominates — Claude 3.5 Sonnet charges per input/output token.
> Each multimodal analysis call (2 images + prompt) ≈ $0.05–0.15 depending on image size.
