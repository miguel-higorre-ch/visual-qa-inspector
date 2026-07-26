import React from 'react';

/**
 * ErrorMessage — displays a validation error with a warning icon.
 * Renders nothing when `message` is falsy (hidden by default).
 *
 * Props:
 *  message  {string|null}  — error text to display
 *  id       {string}       — id attribute for aria-describedby linking
 */
export default function ErrorMessage({ message, id }) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600"
    >
      {/* Warning triangle icon */}
      <svg
        className="h-4 w-4 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </p>
  );
}
