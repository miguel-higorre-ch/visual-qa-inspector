'use strict';

/**
 * bedrock-client.js
 * Wrapper around Amazon Bedrock Runtime for multimodal Claude calls.
 *
 * Features:
 * - Selects the correct prompt for the analysis mode
 * - Encodes images as base64 for the Anthropic Messages API
 * - Retries on ThrottlingException with exponential backoff (max 3 retries)
 * - Returns parsed + validated JSON or throws a structured error
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { REGRESSION_PROMPT }    = require('./prompts/regression');
const { INTENT_PROMPT }         = require('./prompts/intent');
const { ACCESSIBILITY_PROMPT }  = require('./prompts/accessibility');
const { parseAndValidate }      = require('./validator');
const logger                    = require('./logger');

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION_NAME || 'us-east-1',
});

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

const PROMPTS = {
  regression:    REGRESSION_PROMPT,
  intent:        INTENT_PROMPT,
  accessibility: ACCESSIBILITY_PROMPT,
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/** Sleep for ms milliseconds */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Invoke Bedrock with retry on throttling.
 * @param {object} payload - Anthropic Messages API body
 * @param {number} attempt - current attempt number (1-based)
 * @returns {Promise<string>} - raw response text
 */
async function invokeWithRetry(payload, attempt = 1) {
  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    const bodyText = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(bodyText);

    // Anthropic Messages API: content[0].text holds the assistant reply
    const text = parsed?.content?.[0]?.text;
    if (!text) {
      throw new Error('Bedrock response missing content[0].text');
    }
    return text;

  } catch (err) {
    const isThrottle = err.name === 'ThrottlingException' ||
                       err.$metadata?.httpStatusCode === 429;

    if (isThrottle && attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      await sleep(delay);
      return invokeWithRetry(payload, attempt + 1);
    }
    throw err;
  }
}

/**
 * Build the Anthropic Messages API payload for regression mode.
 * Sends two images (baseline + current) with the system prompt.
 */
function buildRegressionPayload(baselineBuffer, currentBuffer) {
  return {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    temperature: 0,
    system: PROMPTS.regression,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: baselineBuffer.toString('base64'),
            },
          },
          {
            type: 'text',
            text: 'This is IMAGE 1 (baseline — approved version).',
          },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: currentBuffer.toString('base64'),
            },
          },
          {
            type: 'text',
            text: 'This is IMAGE 2 (current — version under review). Analyze the differences and respond with JSON only.',
          },
        ],
      },
    ],
  };
}

/**
 * Build payload for intent mode.
 * Sends one screenshot + source code text.
 */
function buildIntentPayload(screenshotBuffer, sourceText) {
  return {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    temperature: 0,
    system: PROMPTS.intent,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshotBuffer.toString('base64'),
            },
          },
          {
            type: 'text',
            text: `This is IMAGE 1 (the rendered UI screenshot).\n\nHere is the component source code:\n\n${sourceText}\n\nEvaluate whether the screenshot correctly implements the source code. Respond with JSON only.`,
          },
        ],
      },
    ],
  };
}

/**
 * Build payload for accessibility mode.
 * Sends one screenshot with the WCAG ruleset.
 */
function buildAccessibilityPayload(screenshotBuffer) {
  return {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    temperature: 0,
    system: PROMPTS.accessibility,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshotBuffer.toString('base64'),
            },
          },
          {
            type: 'text',
            text: 'Evaluate this screenshot for WCAG 2.1 AA accessibility violations. Respond with JSON only.',
          },
        ],
      },
    ],
  };
}

/**
 * Run a Bedrock analysis for the given mode.
 *
 * @param {string} mode - 'regression' | 'intent' | 'accessibility'
 * @param {object} inputs
 *   regression:    { baselineBuffer, currentBuffer }
 *   intent:        { screenshotBuffer, sourceText }
 *   accessibility: { screenshotBuffer }
 * @param {string} runId - for logging
 * @returns {Promise<object>} - validated parsed result
 */
async function analyze(mode, inputs, runId) {
  const start = Date.now();
  logger.info(runId, 'Bedrock call initiated', { modelId: MODEL_ID, mode });

  let payload;
  if (mode === 'regression') {
    payload = buildRegressionPayload(inputs.baselineBuffer, inputs.currentBuffer);
  } else if (mode === 'intent') {
    payload = buildIntentPayload(inputs.screenshotBuffer, inputs.sourceText);
  } else if (mode === 'accessibility') {
    payload = buildAccessibilityPayload(inputs.screenshotBuffer);
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }

  const rawText = await invokeWithRetry(payload);
  const durationMs = Date.now() - start;

  logger.info(runId, 'Bedrock response received', {
    mode,
    durationMs,
    responseLength: rawText.length,
  });

  const result = parseAndValidate(mode, rawText);
  if (!result.valid) {
    logger.error(runId, 'Bedrock response failed validation', {
      errors: result.errors,
      rawText: rawText.substring(0, 500), // log first 500 chars only
    });
    throw Object.assign(
      new Error(`Bedrock response validation failed: ${result.errors.join(', ')}`),
      { code: 'VALIDATION_ERROR', rawText }
    );
  }

  return result.data;
}

module.exports = { analyze };
