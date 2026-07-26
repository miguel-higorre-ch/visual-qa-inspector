import React from 'react';
import CheckoutForm from './components/CheckoutForm';

/**
 * App — BASELINE entry point.
 * Renders the clean, correct checkout form used as the visual regression baseline.
 * Runs on port 3000 via vite.config.js.
 */
export default function App() {
  return <CheckoutForm />;
}
