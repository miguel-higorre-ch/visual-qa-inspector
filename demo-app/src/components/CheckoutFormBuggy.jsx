import React, { useState } from 'react';
import ErrorMessage from './ErrorMessage';

/*
 * CheckoutFormBuggy — CURRENT / BUGGY version.
 *
 * Bug Set A deliberately injected:
 *   A1 (critical)  — Submit button has marginLeft: '-80px', shifting it left
 *                    and partially hiding it behind the sidebar div.
 *   A2 (critical)  — Error message rendered at the bottom of the page,
 *                    outside the form, not adjacent to its field.
 *   A3 (critical)  — 'Email Address' label is removed entirely.
 *   A4 (minor)     — Button text changed from 'Place Order' to 'Submit'.
 *   A5 (noise)     — Card shadow bumped from shadow-md to shadow-xl.
 *   A6 (noise)     — -webkit-font-smoothing set to 'auto' instead of 'antialiased'.
 */

// ─── Validation helpers (same as baseline) ─────────────────────────────────────

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

export default function CheckoutFormBuggy() {
  const [fields, setFields] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    email: touched.email || submitted ? validateEmail(fields.email) : null,
    password:
      touched.password || submitted ? validatePassword(fields.password) : null,
  };

  const isFormValid =
    !validateEmail(fields.email) && !validatePassword(fields.password);

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
    /*
     * BUG A6 — font-smoothing: auto applied to body-level wrapper.
     * This is a cosmetic noise difference; Percy may or may not flag it.
     */
    <div
      className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12"
      style={{ WebkitFontSmoothing: 'auto' }}
    >
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

      {/* Layout wrapper: sidebar added for BUG A1 context */}
      <div className="flex w-full max-w-2xl gap-0">
        {/*
         * Sidebar div — exists only in the buggy version.
         * When the button is shifted left via marginLeft: '-80px' (BUG A1),
         * it slides behind/over this sidebar area.
         */}
        <div
          className="hidden sm:block w-20 flex-shrink-0 bg-gray-200 rounded-l-2xl"
          aria-hidden="true"
          data-testid="sidebar-bug-a1"
        />

        {/*
         * BUG A5 — shadow-xl instead of shadow-md (cosmetic noise).
         */}
        <div className="flex-1 bg-white rounded-r-2xl shadow-xl border border-gray-100 px-8 py-8">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            {/*
             * BUG A3 — Email input has NO label element.
             * Baseline has <label>Email Address</label>; this version omits it.
             */}
            <div className="flex flex-col gap-1">
              {/* label intentionally removed — BUG A3 */}
              <input
                id="email"
                name="email"
                type="email"
                value={fields.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={errors.email ? 'true' : 'false'}
                className={[
                  'w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400',
                  'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                  errors.email
                    ? 'border-red-400 bg-red-50 focus:ring-red-400'
                    : 'border-gray-300 bg-white hover:border-gray-400',
                ].join(' ')}
              />
              {/*
               * BUG A2 — ErrorMessage NOT rendered here (moved to bottom of page).
               * Baseline renders it directly below the field.
               */}
            </div>

            {/* Password field — label kept, error also displaced by BUG A2 */}
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
                <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={fields.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                autoComplete="current-password"
                placeholder="Min. 8 characters"
                aria-invalid={errors.password ? 'true' : 'false'}
                className={[
                  'w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400',
                  'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                  errors.password
                    ? 'border-red-400 bg-red-50 focus:ring-red-400'
                    : 'border-gray-300 bg-white hover:border-gray-400',
                ].join(' ')}
              />
              {/* No error message here — BUG A2 displaces it to bottom */}
            </div>

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
                <span className="inline-block w-10 h-6 rounded bg-blue-700 text-white text-[8px] font-bold flex items-center justify-center">
                  VISA
                </span>
                <span className="inline-block w-10 h-6 rounded bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                  MC
                </span>
              </div>
            </div>

            {/*
             * BUG A1 — marginLeft: '-80px' shifts button left, hiding it behind the sidebar.
             * BUG A4 — Button text changed from 'Place Order' to 'Submit'.
             */}
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
                marginLeft: '-80px', // BUG A1
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = '#1d4ed8')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = '#2563EB')
              }
            >
              Submit {/* BUG A4 — was 'Place Order' */}
            </button>
          </form>
        </div>
      </div>

      {/*
       * BUG A2 — Error messages rendered here at the bottom of the page,
       * far from their respective fields.
       */}
      {(errors.email || errors.password) && (
        <div
          className="mt-6 w-full max-w-md space-y-2"
          data-testid="displaced-errors-bug-a2"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-1">
            Form errors (BUG A2 — displayed at bottom):
          </p>
          {errors.email && <ErrorMessage message={errors.email} id="email-error" />}
          {errors.password && (
            <ErrorMessage message={errors.password} id="password-error" />
          )}
        </div>
      )}

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
