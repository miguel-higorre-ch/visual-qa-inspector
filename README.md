# VisualQA Inspector

> **AI-powered visual regression testing that understands intent, not just pixels.**

🔗 **Live Demo:** [https://develop.d3i53kp2f893z1.amplifyapp.com](https://develop.d3i53kp2f893z1.amplifyapp.com)  
🎥 **Demo Video:** [Coming soon]  
🏆 **Hackathon:** Código Facilito × AWS × Kiro — Challenge 4 (Developer Productivity Tools)

---

## 🎯 Problem

Every visual testing tool on the market — Percy, Applitools, Chromatic, BackstopJS — shares the same fundamental limitation: **they compare pixels against a stored baseline**. This means:

- Every 1px antialiasing change triggers a false positive alert
- Teams waste hours reviewing irrelevant diffs to find the one that matters
- Text content changes go undetected if pixels don't shift dramatically
- There's zero understanding of semantic meaning or accessibility

**VisualQA Inspector uses AI multimodal reasoning (Amazon Bedrock) to semantically understand visual differences** — not just detect pixel changes, but interpret what changed, classify its severity, and explain the impact in natural language.

---

## 💡 Solution

Upload a baseline and current screenshot → AI analyzes the semantic differences → Get a structured report with annotated images.

### What makes it different

| Capability | Percy / Applitools | VisualQA Inspector |
|---|---|---|
| Detection method | Pixel diff | AI multimodal reasoning |
| False positive rate | High (flags antialiasing, shadows) | Low (filters rendering noise) |
| Severity classification | None (all diffs equal) | Critical / Minor / Cosmetic |
| Natural language explanations | ❌ | ✅ |
| Suggested fixes | ❌ | ✅ |
| Accessibility evaluation | ❌ | ✅ (WCAG 2.1 AA) |
| Requires baseline | Always | Optional (Intent Mode) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TRIGGER LAYER                            │
│   Dashboard Upload  │  Playwright CLI  │  GitHub Actions    │
└──────────┬──────────┴────────┬─────────┴──────────┬─────────┘
           │                   │                    │
           ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   STORAGE — Amazon S3                        │
│   /baseline/{run-id}/  /current/{run-id}/  /annotated/      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              API Gateway → AWS Lambda (Node.js 20)           │
│   Routes: POST /analyze  │  POST /presign  │  GET /history  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Amazon Bedrock — Claude Sonnet 4.5              │
│   Multimodal vision + structured JSON response              │
│   Semantic diff · Noise filtering · Severity classification │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    REPORTING LAYER                           │
│   Annotated images (S3) │ DynamoDB metadata │ JSON reports  │
└──────────────────────────────┬──────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     React Dashboard     PR Comments      CLI Output
      (AWS Amplify)     (GitHub Actions)
```

---

## 🚀 Live Demo

### Dashboard
**URL:** [https://develop.d3i53kp2f893z1.amplifyapp.com](https://develop.d3i53kp2f893z1.amplifyapp.com)

1. Upload a baseline screenshot (the correct version)
2. Upload a current screenshot (the version to check)
3. Click "Analyze Differences"
4. View the AI-powered report with severity classification and annotated images

### Sample Results

From our demo app with intentional bugs:

| Bug | What Changed | AI Severity | Detected? |
|---|---|---|---|
| Email label removed | Required label missing entirely | 🔴 Critical | ✅ |
| Button text changed | "Place Order" → "Submit" | 🟠 Minor | ✅ |
| Button shifted left | 80px displacement, partially hidden | 🟠 Minor | ✅ |
| Shadow increased | shadow-md → shadow-xl | — | ✅ Filtered (noise) |
| Font antialiasing | webkit-font-smoothing changed | — | ✅ Filtered (noise) |

---

## 📂 Project Structure

```
visual-qa-inspector/
├── dashboard/         → React web app (AWS Amplify)
├── demo-app/          → Demo checkout form with baseline + buggy versions
├── playwright/        → Screenshot capture CLI (multi-viewport, S3 upload)
├── lambda/            → AWS Lambda orchestrator (Bedrock, S3, DynamoDB)
│   └── src/
│       ├── index.js           → Main handler + routing
│       ├── modes/             → regression.js, intent.js, accessibility.js
│       ├── prompts/           → AI prompts for each analysis mode
│       ├── bedrock-client.js  → Bedrock API with retry logic
│       ├── annotator.js       → Bounding box drawing (jimp)
│       ├── validator.js       → JSON schema validation (ajv)
│       └── reporter.js        → Report builder + DynamoDB persistence
├── infra/             → Terraform IaC for all AWS resources
└── docs/              → Architecture diagrams (Mermaid)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Tailwind CSS, Vite 5 |
| **Backend** | Node.js 20, AWS Lambda (arm64) |
| **AI** | Amazon Bedrock — Claude Sonnet 4.5 (multimodal) |
| **Storage** | Amazon S3 (screenshots + reports) |
| **Database** | Amazon DynamoDB (run metadata, on-demand) |
| **API** | Amazon API Gateway (REST, throttled) |
| **Hosting** | AWS Amplify (CDN, HTTPS, auto-deploy) |
| **IaC** | Terraform |
| **Testing** | Playwright (multi-viewport capture) |
| **Observability** | Amazon CloudWatch Logs |

---

## ☁️ AWS Services Used

| Service | Purpose |
|---|---|
| **Amazon Bedrock** | Claude Sonnet 4.5 multimodal AI for semantic visual analysis |
| **Amazon S3** | Screenshot storage, annotated images, JSON reports |
| **AWS Lambda** | Serverless orchestration (zero idle cost) |
| **Amazon API Gateway** | REST API with CORS and throttling |
| **Amazon DynamoDB** | Run metadata persistence with TTL |
| **AWS Amplify** | Dashboard hosting with CDN and auto-deploy |
| **Amazon CloudWatch** | Structured logging and monitoring |
| **AWS IAM** | Least-privilege roles for Lambda |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- AWS account with Bedrock access (Claude Sonnet 4.5)
- Terraform 1.5+

### 1. Clone and install
```bash
git clone https://github.com/miguel-higorre-ch/visual-qa-inspector.git
cd visual-qa-inspector
```

### 2. Deploy infrastructure
```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init && terraform apply
```

### 3. Run the demo app
```bash
cd demo-app && npm install
npm start          # baseline on port 3000
npm run start:buggy # buggy version on port 3001
```

### 4. Capture and analyze
```bash
cd playwright && npm install && npx playwright install chromium
node capture.js --mode regression --target baseline --url http://localhost:3000
node capture.js --mode regression --target current --url http://localhost:3001 --run-id <run-id-from-above>
```

### 5. Trigger analysis via API
```bash
curl -X POST https://your-api-gateway-url/prod/analyze \
  -H "Content-Type: application/json" \
  -d '{"mode":"regression","runId":"<run-id>","viewports":["desktop"],"baselinePrefix":"baseline/<run-id>/","currentPrefix":"current/<run-id>/"}'
```

---

## 🔍 Analysis Modes

### Regression Mode (baseline vs. current)
Compares two screenshots semantically. Detects layout shifts, missing elements, text changes, and color deviations — while filtering antialiasing, shadow, and compression noise.

### Intent Mode (zero-baseline) — *Planned*
Evaluates a single screenshot against component source code. No baseline needed — catches defects in code that was never visually approved.

### Accessibility Mode — *Planned*
Evaluates screenshots against WCAG 2.1 AA rules. Detects contrast violations, missing labels, small touch targets, and color-only information.

---

## 👥 Team

**Miguel Higorre** — SDET / QA Automation Engineer  
8+ years in test automation, Selenium, Playwright, REST Assured, AWS  
[GitHub](https://github.com/miguel-higorre-ch) · [LinkedIn](https://linkedin.com/in/miguel-higorre)

---

## 📝 License

MIT License — see LICENSE file for details.

---

**Built with 🔍 VisualQA Inspector × Amazon Bedrock × Kiro**
