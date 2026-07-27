# VisualQA Inspector – Playwright Capture Module

Playwright-based screenshot capture module for VisualQA Inspector.  
Captures full-page screenshots at multiple viewports and uploads them to S3.

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | ≥ 18    |
| npm         | ≥ 9     |
| Playwright Chromium browser | installed via `npm run install:browsers` |
| AWS credentials | env vars or `~/.aws/credentials` |

---

## Setup

```bash
# 1. Install Node dependencies
npm ci

# 2. Install Playwright's Chromium browser
npm run install:browsers

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your AWS credentials and S3 bucket name
```

---

## Environment Variables

| Variable               | Required | Description                                      |
|------------------------|----------|--------------------------------------------------|
| `AWS_ACCESS_KEY_ID`    | Yes      | AWS access key with S3 write permission          |
| `AWS_SECRET_ACCESS_KEY`| Yes      | AWS secret access key                            |
| `AWS_REGION`           | Yes      | AWS region (e.g. `us-east-1`)                   |
| `AWS_SESSION_TOKEN`    | No       | STS session token for temporary credentials      |
| `S3_BUCKET_NAME`       | Yes      | Target S3 bucket name                            |
| `BASELINE_URL`         | No       | Convenience var; pass to `--url` for baseline    |
| `CURRENT_URL`          | No       | Convenience var; pass to `--url` for current     |

---

## CLI Reference

```
Usage: node capture.js [options]

Options:
  --mode <mode>         Capture mode: regression | intent | accessibility  [required]
  --target <target>     regression target: baseline | current              [required for regression]
  --url <url>           URL to capture                                     [default: http://localhost:3000]
  --source <source>     Path to source files directory                     [required for intent mode]
  --viewports <list>    Comma-separated viewports: desktop,tablet,mobile   [default: desktop,mobile]
  --run-id <runId>      UUID for this run (auto-generated if omitted)
  --output <output>     Local output directory                             [default: ./screenshots]
  -V, --version         Output the version number
  -h, --help            Display help
```

---

## Usage Examples

### Regression Mode – Baseline

Capture the baseline version of the app at desktop and mobile:

```bash
node capture.js \
  --mode regression \
  --target baseline \
  --url http://localhost:3000 \
  --viewports desktop,mobile
```

Or use the npm script shortcut:

```bash
npm run capture:baseline -- --url http://localhost:3000
```

### Regression Mode – Current

Capture the current (under-review) version:

```bash
node capture.js \
  --mode regression \
  --target current \
  --url http://localhost:3001 \
  --viewports desktop,mobile
```

```bash
npm run capture:current -- --url http://localhost:3001
```

### All Three Viewports

```bash
node capture.js \
  --mode regression \
  --target baseline \
  --url http://localhost:3000 \
  --viewports desktop,tablet,mobile
```

### Intent Mode

Capture a desktop screenshot and bundle source files for AI intent analysis:

```bash
node capture.js \
  --mode intent \
  --url http://localhost:3000 \
  --source ./my-app/src
```

Intent mode always captures desktop only and copies `*.jsx`, `*.tsx`, `*.css`,  
`*.js`, and `*.ts` files (excluding tests, node_modules, and files > 100 KB)  
to `./source-code/` before uploading everything to S3.

### Accessibility Mode

Capture at all viewports for accessibility review:

```bash
node capture.js \
  --mode accessibility \
  --url http://localhost:3000 \
  --viewports desktop,tablet,mobile
```

### Provide a Specific Run ID

```bash
node capture.js \
  --mode regression \
  --target baseline \
  --url http://localhost:3000 \
  --run-id 550e8400-e29b-41d4-a716-446655440000
```

### Custom Output Directory

```bash
node capture.js \
  --mode regression \
  --target baseline \
  --url http://localhost:3000 \
  --output /tmp/qa-screenshots
```

---

## S3 Key Structure

All files are uploaded under the pattern:

```
{prefix}/{runId}/{viewport}/{filename}
```

| Mode          | Prefix         | Example key                                              |
|---------------|----------------|----------------------------------------------------------|
| regression    | `baseline`     | `baseline/abc-123/desktop/screenshot.png`                |
| regression    | `current`      | `current/abc-123/mobile/screenshot.png`                  |
| accessibility | `accessibility`| `accessibility/abc-123/tablet/screenshot.png`            |
| intent        | `intent`       | `intent/abc-123/desktop/screenshot.png`                  |
| intent source | `source-code`  | `source-code/abc-123/files/Button.tsx`                   |

---

## Local Output Structure

```
screenshots/
  baseline/
    desktop/
      screenshot.png
    mobile/
      screenshot.png
  current/
    desktop/
      screenshot.png
source-code/          ← intent mode only
  Button.tsx
  App.css
  ...
```

---

## Example Output

```
========================================
  VisualQA Inspector – Capture
  Mode      : regression
  Target    : baseline
  URL       : http://localhost:3000
  Viewports : desktop, mobile
  Run ID    : 7f3e8a1b-2c4d-4e5f-9a0b-1c2d3e4f5a6b
  Output    : ./screenshots/baseline
========================================

Step 1/2 – Capturing screenshots...

Launching Chromium (headless)...
  Navigating to http://localhost:3000 at desktop (1280x800)...
  ✓ Captured desktop → ./screenshots/baseline/desktop/screenshot.png
  Navigating to http://localhost:3000 at mobile (375x812)...
  ✓ Captured mobile → ./screenshots/baseline/mobile/screenshot.png

Step 2/2 – Uploading to S3...
  Uploading screenshot.png → s3://visual-qa-inspector-images/baseline/7f3e8a1b.../desktop/screenshot.png
  ✓ Uploaded → https://visual-qa-inspector-images.s3.us-east-1.amazonaws.com/baseline/...
  Uploading screenshot.png → s3://visual-qa-inspector-images/baseline/7f3e8a1b.../mobile/screenshot.png
  ✓ Uploaded → https://visual-qa-inspector-images.s3.us-east-1.amazonaws.com/baseline/...

✓ All 2 file(s) uploaded successfully.

✓ Run complete.
7f3e8a1b-2c4d-4e5f-9a0b-1c2d3e4f5a6b
```

The run-id is printed as the last line so CI pipelines can capture it:

```bash
RUN_ID=$(node capture.js --mode regression --target baseline --url $BASELINE_URL | tail -1)
echo "Captured run: $RUN_ID"
```

---

## Viewport Definitions

| Name    | Width | Height | Device Scale |
|---------|-------|--------|-------------|
| desktop | 1280  | 800    | 1×          |
| tablet  | 768   | 1024   | 1×          |
| mobile  | 375   | 812    | 2×          |

---

## File Structure

```
playwright/
  capture.js          Main CLI entry point
  multi-viewport.js   Chromium launch + multi-viewport capture
  upload-to-s3.js     S3 upload using @aws-sdk/client-s3 v3
  collect-source.js   Source file collection for Intent Mode
  config.js           Viewport definitions + S3 key helpers
  package.json
  .env.example
  README.md
  screenshots/        Local screenshot output (git-ignored except .gitkeep)
```
