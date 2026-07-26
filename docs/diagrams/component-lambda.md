# Component Design — Lambda Orchestrator

> Core backend service. Routes analysis requests to the correct mode, orchestrates S3 reads, Bedrock calls, image annotation, report generation, and DynamoDB persistence.

---

## Module Structure

```mermaid
graph TD
    subgraph lambda["lambda/src/"]
        IDX[index.js<br/>Main handler + mode router]

        subgraph MODES["modes/"]
            REG[regression.js<br/>Baseline vs current pipeline]
            INT[intent.js<br/>Zero-baseline pipeline]
            ACC[accessibility.js<br/>WCAG evaluation pipeline]
        end

        subgraph PROMPTS["prompts/"]
            PREG[regression.js<br/>Diff analysis prompt]
            PINT[intent.js<br/>Code-to-UI evaluation prompt]
            PACC[accessibility.js<br/>WCAG ruleset prompt]
        end

        BDR_CLIENT[bedrock-client.js<br/>Bedrock API wrapper]
        S3_CLIENT[s3-client.js<br/>S3 read/write wrapper]
        DDB_CLIENT[dynamodb-client.js<br/>DynamoDB put/get wrapper]
        ANNOTATOR[annotator.js<br/>Draws bounding boxes via sharp]
        REPORTER[reporter.js<br/>Builds final report JSON]
        VALIDATOR[validator.js<br/>JSON schema validation via ajv]
        LOGGER[logger.js<br/>Structured CloudWatch logging]
    end

    IDX --> REG
    IDX --> INT
    IDX --> ACC
    REG --> BDR_CLIENT
    INT --> BDR_CLIENT
    ACC --> BDR_CLIENT
    REG --> S3_CLIENT
    INT --> S3_CLIENT
    ACC --> S3_CLIENT
    BDR_CLIENT --> PREG
    BDR_CLIENT --> PINT
    BDR_CLIENT --> PACC
    REG --> ANNOTATOR
    INT --> ANNOTATOR
    ACC --> ANNOTATOR
    REG --> VALIDATOR
    INT --> VALIDATOR
    ACC --> VALIDATOR
    REG --> REPORTER
    INT --> REPORTER
    ACC --> REPORTER
    REPORTER --> DDB_CLIENT
    REPORTER --> S3_CLIENT
    IDX --> LOGGER
```

---

## Handler — `index.js`

### Input Contract

```json
{
  "mode": "regression | intent | accessibility",
  "runId": "uuid-string",
  "viewports": ["desktop", "mobile"],
  "baselinePrefix": "baseline/run-id/",
  "currentPrefix": "current/run-id/",
  "sourcePrefix": "source-code/run-id/",
  "prNumber": 42,
  "repoFullName": "owner/repo",
  "githubToken": "ghp_..."
}
```

### Output Contract

```json
{
  "runId": "uuid-string",
  "mode": "regression",
  "overallSeverity": "critical | minor | cosmetic | pass",
  "summary": "3 issues found across 2 viewports",
  "viewportResults": [
    {
      "viewport": "desktop",
      "annotatedImageUrl": "https://s3.../annotated/run-id/desktop/screenshot-annotated.png",
      "diffs": [
        {
          "description": "Submit button displaced 40px left, partially hidden",
          "severity": "critical",
          "bbox": { "x": 100, "y": 200, "width": 120, "height": 40 },
          "suggested_fix": "Remove negative margin-left from .submit-btn",
          "wcagRule": null
        }
      ]
    }
  ],
  "noiseFiltered": "Ignored antialiasing differences on card shadow",
  "reportUrl": "https://s3.../reports/run-id/report.json",
  "durationMs": 4200
}
```

### Routing Logic

```mermaid
flowchart TD
    EVENT[Lambda event received] --> LOG_START[Log: analysis started]
    LOG_START --> VALIDATE_INPUT{Valid request<br/>body?}
    VALIDATE_INPUT -- no --> RET_400[Return 400 Bad Request]
    VALIDATE_INPUT -- yes --> ROUTE{event.mode}
    ROUTE -- regression --> REG_MOD[modes/regression.js]
    ROUTE -- intent --> INT_MOD[modes/intent.js]
    ROUTE -- accessibility --> ACC_MOD[modes/accessibility.js]
    ROUTE -- unknown --> RET_400B[Return 400 Unknown mode]
    REG_MOD --> RESULT[Merge viewport results]
    INT_MOD --> RESULT
    ACC_MOD --> RESULT
    RESULT --> COMPUTE_SEV[Compute overallSeverity<br/>worst across all viewports]
    COMPUTE_SEV --> SAVE_REPORT[reporter.js — save to S3 + DynamoDB]
    SAVE_REPORT --> LOG_DONE[Log: analysis completed]
    LOG_DONE --> RET_200[Return 200 with report]
```

---

## Bedrock Client — `bedrock-client.js`

### Responsibilities
- Wraps `@aws-sdk/client-bedrock-runtime`
- Accepts mode name and payload, selects correct prompt
- Encodes images as base64 for the multimodal API
- Implements exponential backoff retry for `ThrottlingException` (max 3 retries)
- Returns parsed JSON or throws structured error

### Model Configuration

| Setting | Value |
|---|---|
| Model ID | `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| Max tokens | `4096` |
| Temperature | `0` (deterministic — critical for consistent QA results) |
| Top P | `0.999` |

### Image Encoding
Images read from S3 as `Buffer`, converted to base64 string, sent as `image/png` media type in the `content` array of the Anthropic Messages API format.

---

## Image Annotator — `annotator.js`

### Responsibility
Draws colored, numbered bounding boxes directly on screenshots using the `sharp` library. Returns annotated image as a `Buffer`.

### Bounding Box Spec

| Severity | Border color | Border width | Label background |
|---|---|---|---|
| `critical` | `#FF3B30` red | 3px | `#FF3B30` |
| `minor` | `#FF9500` orange | 2px | `#FF9500` |
| `cosmetic` | `#8E8E93` gray | 1px | `#8E8E93` |
| `wcag_violation` | `#AF52DE` purple | 2px | `#AF52DE` |

### Process Flow

```mermaid
flowchart LR
    IMG[Screenshot Buffer] --> SHARP[sharp instance]
    DIFFS[Diffs array with bbox] --> LOOP[For each diff]
    LOOP --> RECT[Draw rectangle overlay]
    RECT --> BADGE[Draw number badge<br/>top-left corner of bbox]
    BADGE --> NEXT{More diffs?}
    NEXT -- yes --> LOOP
    NEXT -- no --> OUTPUT[Composite all overlays]
    OUTPUT --> BUFFER[Return annotated Buffer]
    SHARP --> COMPOSITE
    BUFFER --> COMPOSITE[sharp composite]
    COMPOSITE --> FINAL[Final PNG Buffer]
```

---

## Validator — `validator.js`

### JSON Schemas (ajv)

**Regression response schema:**
```json
{
  "type": "object",
  "required": ["summary", "diffs"],
  "properties": {
    "summary": { "type": "string" },
    "noise_filtered": { "type": "string" },
    "diffs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["description", "severity", "bbox"],
        "properties": {
          "description": { "type": "string" },
          "severity": { "enum": ["critical", "minor", "cosmetic"] },
          "bbox": {
            "type": "object",
            "required": ["x", "y", "width", "height"],
            "properties": {
              "x": { "type": "number" },
              "y": { "type": "number" },
              "width": { "type": "number" },
              "height": { "type": "number" }
            }
          },
          "suggested_fix": { "type": "string" }
        }
      }
    }
  }
}
```

On validation failure: logs raw response to CloudWatch, returns `{ error: true, message, rawResponse }`.

---

## Lambda Configuration

| Setting | Value | Reason |
|---|---|---|
| Runtime | Node.js 20.x | LTS, native ESM support |
| Memory | 512MB | sharp needs memory for image processing |
| Timeout | 30s | Bedrock calls can take 10–20s |
| Architecture | arm64 | Cheaper + faster for Node workloads |
| Environment | See below | |

### Environment Variables

| Variable | Value |
|---|---|
| `S3_BUCKET_NAME` | `visual-qa-inspector-images` |
| `DYNAMODB_TABLE_NAME` | `visual-qa-inspector-runs` |
| `BEDROCK_MODEL_ID` | `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| `AWS_REGION` | `us-east-1` |

---

## Dependencies

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "3.x",
    "@aws-sdk/client-bedrock-runtime": "3.x",
    "@aws-sdk/client-dynamodb": "3.x",
    "sharp": "0.33.x",
    "ajv": "8.x",
    "uuid": "9.x"
  },
  "devDependencies": {
    "jest": "29.x",
    "@types/node": "20.x"
  }
}
```
