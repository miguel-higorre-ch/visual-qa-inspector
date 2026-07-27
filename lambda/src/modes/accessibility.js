'use strict';

/**
 * modes/accessibility.js
 * Accessibility Mode pipeline: WCAG AA evaluation.
 * Takes a single screenshot — no baseline or source code needed.
 *
 * Steps:
 *   1. Download screenshot(s) from S3 per viewport
 *   2. Call Bedrock with WCAG ruleset prompt
 *   3. Annotate screenshot with purple bounding boxes for violations
 *   4. Upload annotated image to S3
 *   5. Return result
 */

const { getObject, putObject, getS3Url } = require('../s3-client');
const { analyze }                         = require('../bedrock-client');
const { annotate }                        = require('../annotator');
const logger                              = require('../logger');

/**
 * Run Accessibility Mode analysis across requested viewports.
 *
 * @param {object} opts
 * @param {string}   opts.runId
 * @param {string[]} opts.viewports        - e.g. ['desktop', 'mobile']
 * @param {string}   opts.currentPrefix    - S3 prefix containing screenshots
 * @returns {Promise<object>} - { viewportResults, wcagSummary }
 */
async function runAccessibility(opts) {
  const { runId, viewports, currentPrefix } = opts;

  const viewportResults = [];

  for (const viewport of viewports) {
    logger.info(runId, `Accessibility: processing viewport ${viewport}`);

    const screenshotKey = `${currentPrefix}${viewport}/screenshot.png`;

    // Download screenshot
    let screenshotBuffer;
    try {
      screenshotBuffer = await getObject(screenshotKey);
    } catch (err) {
      logger.error(runId, `Failed to load screenshot for ${viewport}`, { error: err.message });
      viewportResults.push({
        viewport,
        error: `Could not load screenshot: ${err.message}`,
        diffs: [],
        violations: [],
      });
      continue;
    }

    // Call Bedrock
    let bedrockResult;
    try {
      bedrockResult = await analyze('accessibility', { screenshotBuffer }, runId);
    } catch (err) {
      logger.error(runId, `Bedrock failed for viewport ${viewport}`, { error: err.message });
      viewportResults.push({
        viewport,
        error: `Analysis failed: ${err.message}`,
        diffs: [],
        violations: [],
      });
      continue;
    }

    const { violations = [], wcag_summary = '' } = bedrockResult;

    // Map violations to the annotator format
    // Violations use "severity: critical | warning" — map "warning" → "minor" for colors
    const diffsForAnnotation = violations.map(v => ({
      ...v,
      severity: v.severity === 'critical' ? 'wcag_violation' : 'minor',
    }));

    // Annotate screenshot
    let annotatedImageUrl = null;
    try {
      const annotatedBuffer = await annotate(screenshotBuffer, diffsForAnnotation);
      const annotatedKey    = `annotated/${runId}/${viewport}/screenshot-annotated.png`;
      await putObject(annotatedKey, annotatedBuffer, 'image/png');
      annotatedImageUrl = getS3Url(annotatedKey);
    } catch (err) {
      logger.warn(runId, `Accessibility: annotation failed for ${viewport}`, { error: err.message });
    }

    viewportResults.push({
      viewport,
      annotatedImageUrl,
      diffs:      violations,   // use diffs for consistency with response contract
      violations,               // also expose as violations for WCAG-specific fields
      wcagSummary: wcag_summary,
    });
  }

  // Build top-level WCAG summary
  const totalViolations  = viewportResults.reduce((n, vp) => n + (vp.violations?.length || 0), 0);
  const criticalCount    = viewportResults.reduce((n, vp) =>
    n + (vp.violations?.filter(v => v.severity === 'critical').length || 0), 0);

  const wcagSummary = totalViolations === 0
    ? 'No accessibility violations detected.'
    : `${totalViolations} violation(s) found — ${criticalCount} critical.`;

  return { viewportResults, wcagSummary };
}

module.exports = { runAccessibility };
