'use strict';

/**
 * reporter.js
 * Builds the final report JSON, saves it to S3, and persists
 * run metadata to DynamoDB.
 */

const { putObject, getS3Url } = require('./s3-client');
const { saveRun }             = require('./dynamodb-client');
const logger                  = require('./logger');

/**
 * Compute the worst severity across all viewport results.
 * Order: critical > minor > cosmetic > pass
 */
function computeOverallSeverity(viewportResults) {
  const order = ['critical', 'minor', 'cosmetic'];

  for (const level of order) {
    const found = viewportResults.some(vp => {
      const diffs = vp.diffs || vp.issues || vp.violations || [];
      return diffs.some(d => d.severity === level);
    });
    if (found) return level;
  }
  return 'pass';
}

/**
 * Count diffs by severity across all viewports.
 */
function countBySeverity(viewportResults) {
  const counts = { critical: 0, minor: 0, cosmetic: 0, warning: 0 };
  for (const vp of viewportResults) {
    const diffs = vp.diffs || vp.issues || vp.violations || [];
    for (const d of diffs) {
      if (counts[d.severity] !== undefined) counts[d.severity]++;
    }
  }
  return counts;
}

/**
 * Build and save the full report.
 *
 * @param {object} opts
 * @param {string}   opts.runId
 * @param {string}   opts.mode
 * @param {Array}    opts.viewportResults   - array of per-viewport results
 * @param {string}   [opts.summary]         - optional top-level summary
 * @param {string}   [opts.noiseFiltered]   - noise filtered description (regression)
 * @param {string}   [opts.verdict]         - pass/fail (intent mode)
 * @param {string}   [opts.wcagSummary]     - WCAG summary (accessibility mode)
 * @param {number}   opts.durationMs
 * @param {string}   [opts.prNumber]
 * @param {string}   [opts.repoFullName]
 * @param {string}   [opts.triggeredBy]     - 'ci' or 'manual'
 * @returns {Promise<object>} - the final report object including reportUrl
 */
async function buildAndSaveReport(opts) {
  const {
    runId, mode, viewportResults, summary, noiseFiltered,
    verdict, wcagSummary, durationMs, prNumber, repoFullName,
    triggeredBy = 'manual',
  } = opts;

  const timestamp        = new Date().toISOString();
  const overallSeverity  = computeOverallSeverity(viewportResults);
  const counts           = countBySeverity(viewportResults);
  const diffsFound       = counts.critical + counts.minor + counts.cosmetic + counts.warning;

  // Build the report object
  const report = {
    runId,
    timestamp,
    mode,
    overallSeverity,
    summary:        summary || `${diffsFound} issue(s) found`,
    noiseFiltered:  noiseFiltered || '',
    verdict:        verdict || null,
    wcagSummary:    wcagSummary || null,
    viewportResults,
    diffsFound,
    criticalCount:  counts.critical,
    minorCount:     counts.minor,
    cosmeticCount:  counts.cosmetic,
    durationMs,
    triggeredBy,
    prNumber:       prNumber || null,
    repoFullName:   repoFullName || null,
  };

  // Save report JSON to S3
  const reportKey = `reports/${runId}/report.json`;
  let reportUrl = '';
  try {
    await putObject(reportKey, JSON.stringify(report, null, 2), 'application/json');
    reportUrl = getS3Url(reportKey);
    report.reportUrl = reportUrl;
    logger.info(runId, 'Report saved to S3', { reportKey });
  } catch (err) {
    logger.warn(runId, 'Failed to save report to S3 — continuing', { error: err.message });
  }

  // Persist metadata to DynamoDB
  try {
    await saveRun({
      runId,
      timestamp,
      mode,
      overallSeverity,
      reportUrl,
      diffsFound,
      criticalCount:  counts.critical,
      minorCount:     counts.minor,
      cosmeticCount:  counts.cosmetic,
      triggeredBy,
      durationMs,
      prNumber,
      repoFullName,
      s3Prefix:       runId,
    });
    logger.info(runId, 'Run metadata saved to DynamoDB');
  } catch (err) {
    logger.warn(runId, 'Failed to save to DynamoDB — continuing', { error: err.message });
  }

  return report;
}

module.exports = { buildAndSaveReport, computeOverallSeverity };
