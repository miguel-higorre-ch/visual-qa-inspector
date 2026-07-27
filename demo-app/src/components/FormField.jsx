import React from 'react';
import ErrorMessage from './ErrorMessage';

/**
 * FormField — a labeled input wrapper with inline error display.
 *
 * Props:
 *  id          {string}    — input id (also used for label htmlFor)
 *  label       {string}    — label text
 *  type        {string}    — input type (text, email, password, …)
 *  value       {string}    — controlled value
 *  onChange    {function}  — change handler
 *  onBlur      {function}  — blur handler
 *  error       {string}    — error message (falsy = hidden)
 *  required    {boolean}   — shows red asterisk when true
 *  autoComplete{string}    — autocomplete hint
 *  placeholder {string}    — placeholder text
 */
export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required = false,
  autoComplete,
  placeholder,
}) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? 'true' : 'false'}
        className={[
          'w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400',
          'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          error
            ? 'border-red-400 bg-red-50 focus:ring-red-400'
            : 'border-gray-300 bg-white hover:border-gray-400',
        ].join(' ')}
      />

      <ErrorMessage message={error} id={errorId} />
    </div>
  );
}
