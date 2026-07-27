import React from 'react';
import CheckoutFormBuggy from './components/CheckoutFormBuggy';

/**
 * AppBuggy — CURRENT (buggy) entry point.
 * Renders the checkout form with Bug Set A injected for regression demo.
 * Runs on port 3001 via vite.config.buggy.js.
 *
 * Bug Set A:
 *   A1 (critical)  — Submit button shifted 80px left, partially hidden
 *   A2 (critical)  — Error message at bottom of page, not adjacent to field
 *   A3 (critical)  — Email Address label removed entirely
 *   A4 (minor)     — Button text changed from "Place Order" to "Submit"
 *   A5 (noise)     — Card shadow increased (shadow-xl vs shadow-md) — NOT a real issue
 *   A6 (noise)     — Font antialiasing changed — NOT a real issue
 */
export default function AppBuggy() {
  return <CheckoutFormBuggy />;
}
