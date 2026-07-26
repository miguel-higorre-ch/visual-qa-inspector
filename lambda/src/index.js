'use strict';

/**
 * index.js
 * Main Lambda handler. Routes incoming requests to the correct analysis
 * mode and returns a structured report.
 *
 * Supported routes (determined by event.path or event.mode):
 *   POST /analyze  → regression | intent | accessibility analysis
 *   POST /presign  → generate pre-signed S3 PUT URLs for browser uploads
 *   GET  /history  → return last N runs from DynamoDB
 */

const { v4: uuidv4 }          = require('uuid');
const { runRegression }        = require('./modes/regression');
const { runIntent }            = require('./modes/intent');
const { runAccessibility }     = require('./modes/accessibility');
const { buildAndSaveReport }   = require('./reporter');
const { getPresignedPutUrl }   = require('./s3-client');
const { getRecentRuns }        = require('./dynamodb-client');
const logger                   = require('./logger');

// ─── Response helpers ─────────────────────────────────────────────────────────

function ok(body) {
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify(body),
  };
}

function err(statusCode, message, extra = {}) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify({ error: true, message, ...extra }),
  };
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}

// ─── Request body parser ──────────────────────────────────────────────────────

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

// ─── Route: OPTIONS (CORS preflight) ─────────────────────────────────────────

function handleOptions() {
  return { statusCode: 200, headers: corsHeaders(), body: '' };
}

// ─── Route: POST /presign ─────────────────────────────────────────────────────

async function handlePresign(event) {
  const body   = parseBody(event);
  const runId  = body.runId || uuidv4();
  const keys   = body.keys; // array of S3 keys to pre-sign

  if (!Array.isArray(keys) || keys.length === 0) {
    return err(400, 'keys must be a non-empty array of S3 keys');
  }

  const urls = {};
  await Promise.all(
    keys.map(async key => {
      urls[key] = await getPresignedPutUrl(key);
    })
  );

  return ok({ runId, urls });
}

// ─── Route: GET /history ──────────────────────────────────────────────────────

async function handleHistory(event) {
  const limit = parseInt(event.queryStringParameters?.limit || '10', 10);
  const runs  = await getRecentRuns(Math.min(limit, 50));
  return ok({ runs, count: runs.length });
}

// ─── Route: POST /analyze ─────────────────────────────────────────────────────

async function handleAnalyze(event) {
  const body  = parseBody(event);
  const start = Date.now();

  // Validate required fields
  const { mode, runId: providedRunId } = body;

  if (!mode || !['regression', 'intent', 'accessibility'].includes(mode)) {
    return err(400, 'mode must be regression, intent, or accessibility');
  }

  const runId       = providedRunId || uuidv4();
  const viewports   = body.viewports || ['desktop', 'mobile'];
  const triggeredBy = body.prNumber ? 'ci' : 'manual';

  logger.info(runId, 'Analysis started', {
    mode,
    viewports,
    triggeredBy,
    prNumber: body.prNumber || null,
  });

  try {
    let modeResult;

    // ── Regression ──────────────────────────────────────────────────────────
    if (mode === 'regression') {
      if (!body.baselinePrefix || !body.currentPrefix) {
        return err(400, 'regression mode requires baselinePrefix and currentPrefix');
      }
      modeResult = await runRegression({
        runId,
        viewports,
        baselinePrefix: body.baselinePrefix,
        currentPrefix:  body.currentPrefix,
      });

    // ── Intent ──────────────────────────────────────────────────────────────
    } else if (mode === 'intent') {
      if (!body.screenshotKey || !body.sourcePrefix) {
        return err(400, 'intent mode requires screenshotKey and sourcePrefix');
      }
      modeResult = await runIntent({
        runId,
        screenshotKey: body.screenshotKey,
        sourcePrefix:  body.sourcePrefix,
      });

    // ── Accessibility ────────────────────────────────────────────────────────
    } else if (mode === 'accessibility') {
      if (!body.currentPrefix) {
        return err(400, 'accessibility mode requires currentPrefix');
      }
      modeResult = await runAccessibility({
        runId,
        viewports,
        currentPrefix: body.currentPrefix,
      });
    }

    const durationMs = Date.now() - start;

    // Build + save report
    const report = await buildAndSaveReport({
      runId,
      mode,
      viewportResults: modeResult.viewportResults,
      summary:         modeResult.summary,
      noiseFiltered:   modeResult.noiseFiltered,
      verdict:         modeResult.verdict,
      wcagSummary:     modeResult.wcagSummary,
      durationMs,
      prNumber:        body.prNumber || null,
      repoFullName:    body.repoFullName || null,
      triggeredBy,
    });

    logger.info(runId, 'Analysis completed', {
      overallSeverity: report.overallSeverity,
      diffsFound:      report.diffsFound,
      durationMs,
    });

    return ok(report);

  } catch (error) {
    const durationMs = Date.now() - start;
    logger.error(runId, 'Analysis failed', {
      error:   error.message,
      code:    error.code || 'UNKNOWN',
      durationMs,
    });

    // Map known error codes to HTTP status codes
    if (error.code === 'S3_NOT_FOUND') return err(404, error.message);
    if (error.code === 'VALIDATION_ERROR') return err(502, error.message);
    if (error.name === 'ThrottlingException') return err(503, 'Bedrock is throttled — please retry in a moment');

    return err(500, `Internal error: ${error.message}`);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

exports.handler = async function handler(event) {
  const method = event.httpMethod || event.requestContext?.http?.method || 'POST';
  const path   = event.path || event.rawPath || '/analyze';

  logger.info(null, 'Request received', { method, path });

  if (method === 'OPTIONS') return handleOptions();

  if (path.includes('/presign') && method === 'POST') return handlePresign(event);
  if (path.includes('/history') && method === 'GET')  return handleHistory(event);
  if (path.includes('/analyze') && method === 'POST') return handleAnalyze(event);

  return err(404, `Route not found: ${method} ${path}`);
};
