# Component Design — React Dashboard

> Web UI for manual analysis submissions and viewing results. Deployed on AWS Amplify.

---

## Component Tree

```mermaid
graph TD
    APP[App.jsx<br/>Root — mode state, API calls]

    APP --> HEADER[Header.jsx<br/>Logo + nav]
    APP --> MODE_SEL[ModeSelector.jsx<br/>Regression / Intent / Accessibility tabs]
    APP --> UPLOAD[UploadPanel.jsx<br/>File inputs per mode]
    APP --> RESULTS[ResultsPanel.jsx<br/>Shown after analysis completes]
    APP --> HISTORY[HistoryPanel.jsx<br/>Recent runs from DynamoDB]

    MODE_SEL --> TAB_REG[Tab: Regression]
    MODE_SEL --> TAB_INT[Tab: Intent]
    MODE_SEL --> TAB_ACC[Tab: Accessibility]

    UPLOAD --> UP_REG[RegressionUploader.jsx<br/>Baseline + current file inputs]
    UPLOAD --> UP_INT[IntentUploader.jsx<br/>Screenshot + source files]
    UPLOAD --> UP_ACC[AccessibilityUploader.jsx<br/>Single screenshot]

    RESULTS --> VP_SEL[ViewportSelector.jsx<br/>Desktop / Mobile toggle]
    RESULTS --> IMG_VIEW[AnnotatedImageView.jsx<br/>Shows annotated screenshot]
    RESULTS --> DIFF_LIST[DiffList.jsx<br/>Numbered list of issues]
    RESULTS --> NOISE_PANEL[NoisePanel.jsx<br/>Filtered false positives — collapsible]
    RESULTS --> SEVERITY_BADGE[SeverityBadge.jsx<br/>Overall severity indicator]

    DIFF_LIST --> DIFF_ITEM[DiffItem.jsx<br/>Single diff row]
    DIFF_ITEM --> SEV_BADGE[SeverityBadge.jsx]
    DIFF_ITEM --> FIX[SuggestedFix.jsx<br/>Collapsible fix suggestion]
```

---

## State Management

```mermaid
stateDiagram-v2
    [*] --> Idle : App loads

    Idle --> Uploading : User submits files
    Uploading --> Analyzing : Files uploaded to S3

    Analyzing --> Results : Lambda returns report
    Analyzing --> Error : Lambda returns error

    Results --> Idle : User clicks "New Analysis"
    Error --> Idle : User clicks "Try Again"

    Results --> ViewportSwitch : User clicks viewport tab
    ViewportSwitch --> Results : Viewport updated

    Results --> DiffHighlight : User clicks diff item
    DiffHighlight --> Results : User clicks elsewhere
```

---

## Component Specifications

### `ModeSelector.jsx`
- Renders three tab buttons
- Active tab stored in `App` state: `mode: 'regression' | 'intent' | 'accessibility'`
- Tab switch resets upload state and results state

### `AnnotatedImageView.jsx`
- Receives `annotatedImageUrl` from results
- Renders `<img>` tag — bounding boxes are pre-drawn on server side
- On hover over a bounding box area, highlights the corresponding diff in `DiffList`
- Uses an invisible overlay grid mapped from `bbox` coordinates to enable hover detection
- Scales image to fit container, preserves aspect ratio

### `DiffList.jsx`
- Renders numbered list sorted by severity: critical first, then minor, then cosmetic
- Each item shows: number badge, description, severity badge, WCAG rule (accessibility mode only)
- Clicking an item scrolls `AnnotatedImageView` to the corresponding bbox
- `SuggestedFix` is collapsed by default, expands on click

### `NoisePanel.jsx`
- Only shown in regression mode when `noiseFiltered` field is present in response
- Collapsed by default with label "Filtered Noise — not flagged (click to expand)"
- Expands to show the noise_filtered explanation from Bedrock
- Styled with muted gray — visually distinct from the diffs list

### `HistoryPanel.jsx`
- Fetches `GET /history` endpoint which queries DynamoDB for last 10 runs
- Shows: run date, mode, overall severity badge, link to re-view report
- Loads on mount, refreshes after each new analysis

---

## API Service — `services/api.js`

### Endpoints

```javascript
// Trigger analysis
POST /analyze
Body: { mode, runId, baselinePrefix, currentPrefix, sourcePrefix }
Returns: { runId, overallSeverity, viewportResults, reportUrl, durationMs }

// Get run history
GET /history?limit=10
Returns: { runs: [{ runId, timestamp, mode, overallSeverity, reportUrl }] }
```

### Upload Flow (pre-analysis)
The dashboard uploads files directly to S3 via pre-signed URLs to avoid routing large binary files through Lambda:

```mermaid
sequenceDiagram
    participant UI as Dashboard
    participant API as API Gateway
    participant LMB as Lambda
    participant S3 as Amazon S3

    UI->>API: GET /presign { runId, keys[] }
    API->>LMB: generate pre-signed URLs
    LMB->>S3: createPresignedPost per key
    LMB-->>UI: { urls: { key: presignedUrl } }

    loop Per file
        UI->>S3: PUT file directly to pre-signed URL
    end

    UI->>API: POST /analyze { runId, mode, ... }
```

---

## Routing

```mermaid
graph LR
    HOME[/ — Home<br/>Mode selector + upload]
    REPORT[/report/:runId — Report view<br/>Loads specific run from DynamoDB]
    HISTORY[/history — History<br/>All past runs]

    HOME -- analysis complete --> REPORT
    HISTORY -- click run --> REPORT
    REPORT -- new analysis --> HOME
```

---

## Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| < 640px (mobile) | Single column — image above diff list |
| 640–1024px (tablet) | Single column — viewport selector shown |
| > 1024px (desktop) | Two column — image left, diff list right |

---

## Dependencies

```json
{
  "dependencies": {
    "react": "18.x",
    "react-dom": "18.x",
    "react-router-dom": "6.x",
    "axios": "1.x",
    "tailwindcss": "3.x",
    "@headlessui/react": "1.x",
    "clsx": "2.x"
  },
  "devDependencies": {
    "vite": "5.x",
    "@vitejs/plugin-react": "4.x",
    "autoprefixer": "10.x",
    "postcss": "8.x"
  }
}
```

---

## Amplify Deployment

```mermaid
graph LR
    MAIN[main branch push] --> AMPLIFY_BUILD[Amplify build trigger]
    AMPLIFY_BUILD --> BUILD_CMD[npm run build<br/>vite build]
    BUILD_CMD --> DIST[dist/ output]
    DIST --> CDN[Amplify CDN<br/>Global edge distribution]
    CDN --> PUBLIC_URL[https://main.xxxx.amplifyapp.com]
```

### `amplify.yml`
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd dashboard
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dashboard/dist
    files:
      - "**/*"
  cache:
    paths:
      - dashboard/node_modules/**/*
```
