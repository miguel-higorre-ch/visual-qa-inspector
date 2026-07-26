'use strict';

/**
 * validator.js
 * JSON schema validation for Bedrock responses using ajv.
 * Each analysis mode has its own schema. If validation fails,
 * a structured error is returned instead of throwing.
 */

const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, strict: false });

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const bboxSchema = {
  type: 'object',
  required: ['x', 'y', 'width', 'height'],
  properties: {
    x:      { type: 'number', minimum: 0 },
    y:      { type: 'number', minimum: 0 },
    width:  { type: 'number', minimum: 0 },
    height: { type: 'number', minimum: 0 },
  },
};

const severityEnum = { type: 'string', enum: ['critical', 'minor', 'cosmetic'] };

// ─── Regression response schema ───────────────────────────────────────────────

const regressionSchema = {
  type: 'object',
  required: ['summary', 'diffs'],
  properties: {
    summary:        { type: 'string', minLength: 1 },
    noise_filtered: { type: 'string' },
    diffs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['description', 'severity', 'bbox'],
        properties: {
          description:   { type: 'string', minLength: 1 },
          severity:      severityEnum,
          bbox:          bboxSchema,
          suggested_fix: { type: 'string' },
        },
      },
    },
  },
};

// ─── Intent response schema ───────────────────────────────────────────────────

const intentSchema = {
  type: 'object',
  required: ['verdict', 'summary', 'issues'],
  properties: {
    verdict:  { type: 'string', enum: ['pass', 'fail'] },
    summary:  { type: 'string', minLength: 1 },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        required: ['description', 'severity', 'bbox'],
        properties: {
          description:    { type: 'string', minLength: 1 },
          severity:       severityEnum,
          code_reference: { type: 'string' },
          bbox:           bboxSchema,
          suggested_fix:  { type: 'string' },
        },
      },
    },
  },
};

// ─── Accessibility response schema ────────────────────────────────────────────

const accessibilitySchema = {
  type: 'object',
  required: ['wcag_summary', 'violations'],
  properties: {
    wcag_summary: { type: 'string', minLength: 1 },
    violations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['rule', 'wcag_criterion', 'description', 'severity', 'bbox'],
        properties: {
          rule:           { type: 'string', minLength: 1 },
          wcag_criterion: { type: 'string', minLength: 1 },
          description:    { type: 'string', minLength: 1 },
          severity:       { type: 'string', enum: ['critical', 'warning'] },
          bbox:           bboxSchema,
          suggestion:     { type: 'string' },
        },
      },
    },
  },
};

// ─── Compiled validators ──────────────────────────────────────────────────────

const validators = {
  regression:    ajv.compile(regressionSchema),
  intent:        ajv.compile(intentSchema),
  accessibility: ajv.compile(accessibilitySchema),
};

/**
 * Validate a parsed Bedrock response against the schema for the given mode.
 *
 * @param {string} mode - 'regression' | 'intent' | 'accessibility'
 * @param {object} data - parsed JSON from Bedrock
 * @returns {{ valid: boolean, errors?: string[], data?: object }}
 */
function validate(mode, data) {
  const validator = validators[mode];
  if (!validator) {
    return { valid: false, errors: [`Unknown mode: ${mode}`] };
  }

  const valid = validator(data);
  if (!valid) {
    const errors = validator.errors.map(e => `${e.instancePath} ${e.message}`);
    return { valid: false, errors };
  }

  return { valid: true, data };
}

/**
 * Parse a raw Bedrock response string into JSON, then validate.
 * Handles models that wrap JSON in markdown code fences.
 *
 * @param {string} mode
 * @param {string} rawText - raw text from Bedrock response
 * @returns {{ valid: boolean, errors?: string[], data?: object, rawText?: string }}
 */
function parseAndValidate(mode, rawText) {
  // Strip markdown code fences if present: ```json ... ```
  let cleaned = rawText.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    return {
      valid: false,
      errors: [`JSON parse error: ${err.message}`],
      rawText,
    };
  }

  return validate(mode, parsed);
}

module.exports = { validate, parseAndValidate };
