# System Architecture — VisualQA Inspector

> Full system overview showing all components, their relationships, and the technology stack.

---

## High-Level System Diagram

```mermaid
graph TB
    subgraph TRIGGERS["Trigger Layer"]
        PR[GitHub Pull Request]
        UI[Dashboard Upload]
    end

    subgraph CAPTURE["Capture Layer — Playwright"]
        PW[playwright/capture.js<br/>Multi-viewport capture]
        SRC[playwright/collect-source.js<br/>Source file collector]
    end

    subgraph STORAGE["Storage Layer — Amazon S3"]
        S3B[S3 Bucket<br/>visual-qa-inspector-images]
        S3B --> S3BASE[/baseline/run-id/viewport/]
        S3B --> S3CUR[/current/run-id/viewport/]
        S3B --> S3SRC[/source-code/run-id/]
        S3B --> S3ANN[/annotated/run-id/viewport/]
        S3B --> S3RPT[/reports/run-id/]
    end

    subgraph API["API Layer — API Gateway"]
        APIGW[POST /analyze<br/>REST endpoint]
    end

    subgraph ORCHESTRATION["Orchestration Layer — AWS Lambda"]
        LMB_IDX[index.js<br/>Mode router]
        LMB_REG[modes/regression.js]
        LMB_INT[modes/intent.js]
        LMB_ACC[modes/accessibility.js]
        LMB_ANN[annotator.js<br/>Bounding box drawer]
        LMB_RPT[reporter.js<br/>Report builder]
    end

    subgraph AI["AI Reasoning Layer — Amazon Bedrock"]
        BDR[Claude 3.5 Sonnet v2<br/>anthropic.claude-3-5-sonnet-20241022-v2:0]
    end

    subgraph PERSISTENCE["Persistence Layer"]
        DDB[DynamoDB<br/>visual-qa-inspector-runs]
    end

    subgraph PRESENTATION["Presentation Layer"]
        DASH[React Dashboard<br/>AWS Amplify]
        GH_CMT[GitHub PR Comment<br/>Annotated report]
    end

    PR --> CAPTURE
    UI --> STORAGE
    CAPTURE --> STORAGE
    STORAGE --> APIGW
    APIGW --> LMB_IDX
    LMB_IDX --> LMB_REG
    LMB_IDX --> LMB_INT
    LMB_IDX --> LMB_ACC
    LMB_REG --> BDR
    LMB_INT --> BDR
    LMB_ACC --> BDR
    BDR --> LMB_ANN
    LMB_ANN --> STORAGE
    LMB_ANN --> LMB_RPT
    LMB_RPT --> PERSISTENCE
    LMB_RPT --> PRESENTATION
    DASH --> APIGW
    GH_CMT --> PR
```

---

## Component Responsibilities

```mermaid
graph LR
    subgraph Frontend
        A[Dashboard<br/>React + Tailwind]
    end

    subgraph Backend
        B[Lambda<br/>Node.js 20]
        C[Bedrock<br/>Claude 3.5 Sonnet]
    end

    subgraph Storage
        D[S3<br/>Images + Reports]
        E[DynamoDB<br/>Run Metadata]
    end

    subgraph CI
        F[GitHub Actions<br/>Workflow YAML]
        G[Playwright<br/>Capture Script]
    end

    A -- "POST /analyze" --> B
    B -- "InvokeModel" --> C
    B -- "GetObject / PutObject" --> D
    B -- "PutItem" --> E
    F --> G
    G -- "PutObject" --> D
    F -- "POST /analyze" --> B
    F -- "createComment" --> H[GitHub API]
```

---

## Technology Stack

```mermaid
graph TB
    subgraph Stack["Full Technology Stack"]
        subgraph FE["Frontend"]
            R[React 18]
            TW[Tailwind CSS]
            AX[Axios]
            AMP[AWS Amplify hosting]
        end

        subgraph BE["Backend"]
            NODE[Node.js 20]
            LAMBDA[AWS Lambda]
            SHARP[sharp — image annotation]
            AJV[ajv — JSON schema validation]
        end

        subgraph AI_STACK["AI / ML"]
            BEDROCK[Amazon Bedrock]
            CLAUDE[Claude 3.5 Sonnet v2]
            MULTI[Multimodal vision + text]
        end

        subgraph INFRA["Infrastructure"]
            TF[Terraform]
            S3_INFRA[Amazon S3]
            DDB_INFRA[Amazon DynamoDB]
            APIGW_INFRA[API Gateway REST]
            CW[CloudWatch Logs]
            IAM[IAM least-privilege roles]
        end

        subgraph TEST["Testing / Capture"]
            PW_STACK[Playwright]
            CHROMIUM[Chromium browser]
            GHACT[GitHub Actions]
        end
    end
```

---

## Deployment Topology

```mermaid
graph LR
    subgraph GitHub
        REPO[Repository<br/>main / develop]
        ACTIONS[GitHub Actions]
        PR_CMT[PR Comments]
    end

    subgraph AWS["AWS — us-east-1"]
        AMPLIFY[Amplify<br/>Dashboard SPA]
        APIGW2[API Gateway<br/>HTTPS endpoint]
        LAMBDA2[Lambda<br/>512MB / 30s]
        S3_DEP[S3 Bucket<br/>7-day lifecycle]
        DDB_DEP[DynamoDB<br/>On-demand]
        BEDROCK2[Bedrock<br/>Claude 3.5 Sonnet]
        CW2[CloudWatch<br/>Logs + Metrics]
    end

    REPO --> AMPLIFY
    ACTIONS --> APIGW2
    APIGW2 --> LAMBDA2
    LAMBDA2 --> S3_DEP
    LAMBDA2 --> DDB_DEP
    LAMBDA2 --> BEDROCK2
    LAMBDA2 --> CW2
    LAMBDA2 --> PR_CMT
    AMPLIFY --> APIGW2
```
