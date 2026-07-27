# Data Flow Diagrams — VisualQA Inspector

> Detailed step-by-step data flow for each of the three analysis modes.

---

## Mode A — Regression Mode

Compares a baseline screenshot against a current screenshot using LLM semantic reasoning.

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant PW as Playwright
    participant S3 as Amazon S3
    participant APIGW as API Gateway
    participant LMB as Lambda
    participant BDR as Bedrock
    participant DDB as DynamoDB
    participant DASH as Dashboard

    Dev->>PW: npm run capture --mode regression
    activate PW
    PW->>PW: Launch Chromium at 1280px + 375px
    PW->>PW: Navigate to baseline URL, screenshot
    PW->>PW: Navigate to current URL, screenshot
    PW->>S3: PUT baseline/{run-id}/desktop/screenshot.png
    PW->>S3: PUT baseline/{run-id}/mobile/screenshot.png
    PW->>S3: PUT current/{run-id}/desktop/screenshot.png
    PW->>S3: PUT current/{run-id}/mobile/screenshot.png
    deactivate PW

    Dev->>APIGW: POST /analyze { mode: regression, runId }
    APIGW->>LMB: invoke

    activate LMB
    LMB->>S3: GET baseline/{run-id}/desktop/screenshot.png
    LMB->>S3: GET current/{run-id}/desktop/screenshot.png
    LMB->>S3: GET baseline/{run-id}/mobile/screenshot.png
    LMB->>S3: GET current/{run-id}/mobile/screenshot.png

    loop Per viewport (desktop, mobile)
        LMB->>BDR: InvokeModel (2 images + regression prompt)
        BDR-->>LMB: { summary, noise_filtered, diffs: [{description, severity, bbox}] }
        LMB->>LMB: Validate JSON schema
        LMB->>LMB: Draw bounding boxes via sharp
        LMB->>S3: PUT annotated/{run-id}/{viewport}/screenshot-annotated.png
    end

    LMB->>LMB: Aggregate results, compute overallSeverity
    LMB->>S3: PUT reports/{run-id}/report.json
    LMB->>DDB: PutItem run metadata
    LMB-->>APIGW: { runId, overallSeverity, viewportResults, reportUrl }
    deactivate LMB

    APIGW-->>Dev: 200 OK with report
    Dev->>DASH: Open dashboard, view run-id results
    DASH->>S3: Load annotated screenshots
    DASH->>Dev: Show annotated images + diff list
```

---

## Mode B — Intent Mode (Zero-Baseline)

Evaluates a single screenshot against component source code. No baseline required.

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant PW as Playwright
    participant S3 as Amazon S3
    participant APIGW as API Gateway
    participant LMB as Lambda
    participant BDR as Bedrock
    participant DDB as DynamoDB
    participant DASH as Dashboard

    Dev->>PW: npm run capture --mode intent --source ./src/components
    activate PW
    PW->>PW: Launch Chromium, screenshot at 1280px
    PW->>S3: PUT current/{run-id}/desktop/screenshot.png
    PW->>PW: Collect .jsx .tsx .css files from --source dir
    PW->>S3: PUT source-code/{run-id}/ComponentName.jsx
    PW->>S3: PUT source-code/{run-id}/ComponentName.css
    deactivate PW

    Dev->>APIGW: POST /analyze { mode: intent, runId, screenshotKey, sourcePrefix }
    APIGW->>LMB: invoke

    activate LMB
    LMB->>S3: GET current/{run-id}/desktop/screenshot.png
    LMB->>S3: GET source-code/{run-id}/* (all source files)
    LMB->>LMB: Combine source files into single text block
    LMB->>BDR: InvokeModel (1 image + source text + intent prompt)
    BDR-->>LMB: { verdict, summary, issues: [{description, severity, code_reference, bbox}] }
    LMB->>LMB: Validate JSON schema
    LMB->>LMB: Draw bounding boxes on screenshot
    LMB->>S3: PUT annotated/{run-id}/desktop/screenshot-annotated.png
    LMB->>S3: PUT reports/{run-id}/report.json
    LMB->>DDB: PutItem run metadata
    LMB-->>APIGW: { runId, verdict, issues, annotatedImageUrl, reportUrl }
    deactivate LMB

    APIGW-->>Dev: 200 OK
    Dev->>DASH: Open dashboard, Intent tab, view results
    DASH->>S3: Load annotated screenshot
    DASH->>Dev: Show annotated image + issues with code_reference
```

---

## Mode C — Accessibility Mode

Evaluates a single screenshot against WCAG AA rules. No baseline, no source code needed.

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant PW as Playwright
    participant S3 as Amazon S3
    participant APIGW as API Gateway
    participant LMB as Lambda
    participant BDR as Bedrock
    participant DDB as DynamoDB
    participant DASH as Dashboard

    Dev->>PW: npm run capture --mode accessibility
    activate PW
    PW->>PW: Launch Chromium, screenshot at 1280px + 375px
    PW->>S3: PUT current/{run-id}/desktop/screenshot.png
    PW->>S3: PUT current/{run-id}/mobile/screenshot.png
    deactivate PW

    Dev->>APIGW: POST /analyze { mode: accessibility, runId }
    APIGW->>LMB: invoke

    activate LMB

    loop Per viewport (desktop, mobile)
        LMB->>S3: GET current/{run-id}/{viewport}/screenshot.png
        LMB->>BDR: InvokeModel (1 image + WCAG ruleset prompt)
        BDR-->>LMB: { wcag_summary, violations: [{rule, wcag_criterion, description, severity, bbox, suggestion}] }
        LMB->>LMB: Validate JSON schema
        LMB->>LMB: Draw purple bounding boxes for violations
        LMB->>S3: PUT annotated/{run-id}/{viewport}/screenshot-annotated.png
    end

    LMB->>S3: PUT reports/{run-id}/report.json
    LMB->>DDB: PutItem run metadata
    LMB-->>APIGW: { runId, wcag_summary, viewportResults, reportUrl }
    deactivate LMB

    APIGW-->>Dev: 200 OK
    Dev->>DASH: Open dashboard, Accessibility tab, view results
    DASH->>S3: Load annotated screenshots
    DASH->>Dev: Show violations with WCAG rule citations + fix suggestions
```

---

## CI Mode — Automated PR Flow

How all three modes integrate with the GitHub Actions pipeline.

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant GH as GitHub
    participant GA as GitHub Actions
    participant PW as Playwright Runner
    participant S3 as Amazon S3
    participant APIGW as API Gateway
    participant LMB as Lambda
    participant BDR as Bedrock

    Dev->>GH: git push (open PR)
    GH->>GA: trigger: pull_request

    activate GA
    GA->>GA: checkout main branch
    GA->>GA: npm ci + start demo-app (port 3000)
    GA->>PW: capture --target baseline --url http://localhost:3000
    PW->>S3: PUT baseline/{github.run_id}/...

    GA->>GA: checkout PR branch
    GA->>GA: npm ci + start demo-app (port 3000)
    GA->>PW: capture --target current --url http://localhost:3000
    PW->>S3: PUT current/{github.run_id}/...

    GA->>APIGW: POST /analyze { mode: regression, runId: github.run_id, prNumber }
    APIGW->>LMB: invoke
    LMB->>BDR: multimodal analysis
    BDR-->>LMB: diff results
    LMB-->>APIGW: { overallSeverity, viewportResults }
    APIGW-->>GA: report JSON

    GA->>GA: format report as markdown table
    GA->>GH: issues.createComment (PR comment with annotated images)

    alt overallSeverity == critical
        GA->>GH: set check status = FAILURE
        GA->>Dev: CI blocks merge ❌
    else overallSeverity != critical
        GA->>GH: set check status = SUCCESS
        GA->>Dev: CI passes ✅
    end
    deactivate GA
```

---

## Error Handling Flow

```mermaid
flowchart TD
    REQ[Incoming /analyze request] --> VAL{Validate<br/>request body}
    VAL -- invalid --> ERR1[400 Bad Request<br/>missing required fields]
    VAL -- valid --> S3READ[Read images from S3]
    S3READ -- not found --> ERR2[404 Image not found<br/>check S3 key]
    S3READ -- ok --> BDR_CALL[Call Bedrock]
    BDR_CALL -- ThrottlingException --> RETRY{Retry count<br/>< 3?}
    RETRY -- yes --> BDR_CALL
    RETRY -- no --> ERR3[503 Bedrock throttled<br/>try again later]
    BDR_CALL -- timeout >30s --> ERR4[504 Analysis timed out]
    BDR_CALL -- ok --> JSON_VAL{Valid JSON<br/>response?}
    JSON_VAL -- no --> ERR5[502 Bad AI response<br/>logged to CloudWatch]
    JSON_VAL -- yes --> ANNOTATE[Draw bounding boxes]
    ANNOTATE --> S3WRITE[Save to S3]
    S3WRITE -- fail --> WARN[200 with warning<br/>partial response]
    S3WRITE -- ok --> DDB_WRITE[Save to DynamoDB]
    DDB_WRITE --> SUCCESS[200 OK — full report]
```
