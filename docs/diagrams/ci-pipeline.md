# CI Pipeline — VisualQA Inspector

> GitHub Actions workflow design, job dependencies, and quality gate logic.

---

## Pipeline Overview

```mermaid
flowchart TD
    PUSH[Developer pushes to PR branch] --> TRIGGER

    TRIGGER[GitHub Actions triggered<br/>on: pull_request to main or develop]

    TRIGGER --> JOB1
    TRIGGER --> JOB2

    subgraph JOB1["Job 1: lint-and-test (parallel)"]
        J1A[Checkout code]
        J1B[npm ci — all packages]
        J1C[Run ESLint]
        J1D[Run unit tests]
        J1A --> J1B --> J1C --> J1D
    end

    subgraph JOB2["Job 2: visual-qa (parallel)"]
        J2A[Checkout code]
        J2B[Setup Node.js 20]
        J2C[Install Playwright + Chromium]
        J2D[Start demo-app on main branch — baseline]
        J2E[Capture baseline screenshots<br/>desktop 1280px + mobile 375px]
        J2F[Switch to PR branch]
        J2G[Start demo-app on PR branch — current]
        J2H[Capture current screenshots]
        J2I[Upload all screenshots to S3]
        J2J[POST /analyze to API Gateway]
        J2K[Parse overallSeverity from response]
        J2L[Post PR comment with annotated report]
        J2M{overallSeverity<br/>== critical?}
        J2N[Set check FAILURE ❌<br/>Block merge]
        J2O[Set check SUCCESS ✅<br/>Allow merge]

        J2A --> J2B --> J2C --> J2D --> J2E
        J2E --> J2F --> J2G --> J2H --> J2I
        J2I --> J2J --> J2K --> J2L --> J2M
        J2M -- yes --> J2N
        J2M -- no --> J2O
    end

    JOB1 --> SUMMARY
    JOB2 --> SUMMARY

    SUMMARY[All checks reported to GitHub<br/>PR merge button reflects results]
```

---

## Job 2 Detail — Visual QA Steps

```mermaid
sequenceDiagram
    participant GA as GitHub Actions Runner
    participant DEMO as demo-app process
    participant PW as Playwright
    participant S3 as Amazon S3
    participant API as API Gateway
    participant GH as GitHub API

    GA->>GA: git checkout main
    GA->>DEMO: npm start (port 3000)
    GA->>GA: wait-on http://localhost:3000

    GA->>PW: capture.js --target baseline --viewports desktop,mobile
    PW->>DEMO: navigate + screenshot x2
    PW->>S3: PUT baseline/run_id/desktop + mobile

    GA->>DEMO: kill process
    GA->>GA: git checkout PR branch
    GA->>DEMO: npm start (port 3000)
    GA->>GA: wait-on http://localhost:3000

    GA->>PW: capture.js --target current --viewports desktop,mobile
    PW->>DEMO: navigate + screenshot x2
    PW->>S3: PUT current/run_id/desktop + mobile

    GA->>API: POST /analyze { mode, runId, prNumber, repoFullName }
    API-->>GA: { overallSeverity, viewportResults, reportUrl }

    GA->>GA: build markdown comment from report
    GA->>GH: issues.createComment(prNumber, markdownBody)

    alt critical issues found
        GA->>GA: exit 1 (fails check)
    else no critical issues
        GA->>GA: exit 0 (passes check)
    end
```

---

## Quality Gate Logic

```mermaid
flowchart LR
    RESULT[Analysis Result<br/>overallSeverity] --> GATE

    GATE{Severity Level}

    GATE -- critical --> BLOCK[CI FAILS ❌<br/>Merge blocked<br/>Dev must fix before merging]
    GATE -- minor --> WARN[CI PASSES ✅<br/>Warning comment posted<br/>Merge allowed]
    GATE -- cosmetic --> INFO[CI PASSES ✅<br/>Info in comment<br/>No action required]
    GATE -- pass --> CLEAN[CI PASSES ✅<br/>Clean report posted<br/>No issues found]
```

---

## Config File — `.visualqa.config.json`

Placed in the root of any repo using VisualQA Inspector CI.

```mermaid
graph TD
    subgraph CONFIG[".visualqa.config.json"]
        FA[failOn<br/>default: critical<br/>options: critical, minor, cosmetic]
        VP[viewports<br/>default: desktop + mobile<br/>options: desktop, tablet, mobile]
        MD[modes<br/>default: regression<br/>options: regression, accessibility, intent]
        BU[baseUrl<br/>default: http://localhost:3000]
        IS[ignoreSelectors<br/>default: empty array<br/>CSS selectors to exclude from capture]
    end

    CONFIG --> GA_STEP[GitHub Actions reads config<br/>before running capture]
    GA_STEP --> OVERRIDE[Overrides default behavior<br/>per-repo customization]
```

Example config:
```json
{
  "failOn": "critical",
  "viewports": ["desktop", "mobile"],
  "modes": ["regression", "accessibility"],
  "baseUrl": "http://localhost:3000",
  "ignoreSelectors": [".cookie-banner", "#ad-container", ".timestamp"]
}
```

---

## Branch Protection Integration

```mermaid
graph LR
    subgraph BRANCH_RULES["GitHub Branch Protection Rules — main"]
        R1[Require status checks to pass before merging]
        R2[Required checks:<br/>lint-and-test<br/>visual-qa]
        R3[Require branches to be up to date]
        R4[No direct pushes to main]
    end

    PR_OPEN[PR opened to main] --> R1
    R1 --> R2
    R2 --> BOTH_PASS{Both checks pass?}
    BOTH_PASS -- yes --> MERGE_OK[Merge button enabled ✅]
    BOTH_PASS -- no --> MERGE_BLOCK[Merge button disabled ❌]
```
