# Demo App — VisualQA Inspector

A realistic e-commerce checkout form used to demonstrate all three VisualQA Inspector analysis modes. Ships with two versions: a clean baseline and a buggy current version with pre-injected defects.

---

## Running the App

### Prerequisites
```bash
cd demo-app
npm install
```

### Baseline (port 3000) — clean, correct form
```bash
npm start
# Open http://localhost:3000
```

### Current / Buggy (port 3001) — Bug Set A injected
```bash
npm run start:buggy
# Open http://localhost:3001
```

Run both simultaneously in separate terminals to capture regression screenshots.

---

## Bug Set A — Regression Mode Demo

The buggy version has six intentional defects across two categories:

| Bug | Element | What's Wrong | Severity | Percy detects? | VisualQA detects? |
|---|---|---|---|---|---|
| A1 | Submit button | Shifted 80px left via `margin-left: -80px`, partially hidden behind sidebar | Critical | ✅ pixel diff | ✅ semantic |
| A2 | Error message | Rendered at bottom of page instead of adjacent to email field | Critical | ✅ pixel diff | ✅ semantic |
| A3 | Email label | `"Email Address"` label element removed entirely | Critical | ✅ pixel diff | ✅ semantic |
| A4 | Button text | Text changed from `"Place Order"` to `"Submit"` | Minor | ❌ misses text | ✅ semantic |
| A5 | Card shadow | `shadow-md` → `shadow-xl` (subtle visual noise) | Cosmetic/Noise | ❌ false positive | ✅ filtered |
| A6 | Font smoothing | `-webkit-font-smoothing: auto` vs `antialiased` | Cosmetic/Noise | ❌ false positive | ✅ filtered |

**Key demo point:** A4 shows VisualQA catching a text regression that pixel-diff tools miss. A5 and A6 show false positive filtering — VisualQA correctly ignores them while pixel-diff tools flag them.

---

## Project Structure

```
demo-app/
├── src/
│   ├── components/
│   │   ├── CheckoutForm.jsx       ← baseline form (clean)
│   │   ├── CheckoutFormBuggy.jsx  ← current form (Bug Set A)
│   │   ├── ErrorMessage.jsx       ← reusable error display
│   │   └── FormField.jsx          ← reusable input + label
│   ├── App.jsx                    ← baseline root
│   ├── AppBuggy.jsx               ← buggy root
│   ├── main.jsx                   ← baseline entry (port 3000)
│   ├── main-buggy.jsx             ← buggy entry (port 3001)
│   └── index.css                  ← Tailwind directives
├── index.html                     ← baseline HTML shell
├── index-buggy.html               ← buggy HTML shell
├── vite.config.js                 ← baseline Vite config
├── vite.config.buggy.js           ← buggy Vite config
├── tailwind.config.js
└── postcss.config.js
```

---

## Using with Playwright Capture

From the `playwright/` directory, after both versions are running:

```bash
# Capture baseline (port 3000)
npm run capture -- --mode regression --target baseline --url http://localhost:3000

# Capture current (port 3001)
npm run capture -- --mode regression --target current --url http://localhost:3001
```

For accessibility mode (single screenshot, Bug Set A already has some accessibility issues):
```bash
npm run capture -- --mode accessibility --url http://localhost:3001
```

---

## Tech Stack

- React 18
- Vite 5
- Tailwind CSS 3
