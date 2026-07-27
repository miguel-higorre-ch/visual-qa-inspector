import React, { useState } from 'react';
import FormField from './FormField';

// ─── Validation helpers ────────────────────────────────────────────────────────

function validateEmail(value) {
  if (!value.trim()) return 'Email address is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

function validatePassword(value) {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * CheckoutForm — BASELINE version.
 * Clean, correct e-commerce checkout form used as the visual regression baseline.
 */
export default function CheckoutForm() {
  const [fields, setFields] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    email: touched.email || submitted ? validateEmail(fields.email) : null,
    password:
      touched.password || submitted ? validatePassword(fields.password) : null,
  };

  const isFormValid = !validateEmail(fields.email) && !validatePassword(fields.password);

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(e) {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setTouched({ email: true, password: true });

    if (isFormValid) {
      alert('Order placed successfully! (demo)');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Page header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 mb-4">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Secure Checkout
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Sign in to complete your purchase
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-gray-100 px-8 py-8">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          {/* Email field */}
          <FormField
            id="email"
            label="Email Address"
            type="email"
            value={fields.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />

          {/* Password field */}
          <FormField
            id="password"
            label="Password"
            type="password"
            value={fields.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.password}
            required
            autoComplete="current-password"
            placeholder="Min. 8 characters"
          />

          {/* Forgot password link */}
          <div className="-mt-2 text-right">
            <a
              href="#"
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:underline"
            >
              Forgot password?
            </a>
          </div>

          {/* Order summary mini-card */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Order Total
              </p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">$129.00</p>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Credit card icons placeholder */}
              <span className="inline-block w-10 h-6 rounded bg-blue-700 text-white text-[8px] font-bold flex items-center justify-center">
                VISA
              </span>
              <span className="inline-block w-10 h-6 rounded bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                MC
              </span>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            style={{
              backgroundColor: '#2563EB',
              borderRadius: '8px',
              padding: '16px',
              color: '#ffffff',
              width: '100%',
              fontWeight: 600,
              fontSize: '1rem',
              lineHeight: 1,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
          >
            Place Order
          </button>
        </form>
      </div>

      {/* Footer SSL notice */}
      <p className="mt-6 flex items-center gap-1.5 text-xs text-gray-400">
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
            clipRule="evenodd"
          />
        </svg>
        Your payment is secured with 256-bit SSL encryption
      </p>
    </div>
  );
}
