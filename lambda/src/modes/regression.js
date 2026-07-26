'use strict';

/**
 * modes/regression.js
 * Regression Mode pipeline: baseline vs. current screenshot comparison.
 *
 * Per viewport:
 *   1. Download baseline + current screenshots from S3
 *   2. Call Bedrock with regression prompt
 *   3. Annotate current screenshot with bounding boxes
 *   4. Upload annotated image to S3
 *   5. Return viewport result
 */

const { getObject, putObject, getS3Url } = require('../s3-client');
const { analyze }                         = require('../bedrock-client');
const { annotate }                        = require('../annotator');
const logger                              = require('../logger');

/**
 * Run regression analysis for all requested viewports.
 *
 * @param {object} opts
 * @param {string}   opts.runId
 * @param {string[]} opts.viewports         - e.g. ['desktop', 'mobile']
 * @param {string}   opts.baselinePrefix    - S3 prefix for baseline images
 * @param {string}   opts.currentPrefix     - S3 prefix for current images
 * @returns {Promise<object>} - { viewportResults, summary, noiseFiltered }
 */
async function runRegression(opts) {
  const { runId, viewports, baselinePrefix, currentPrefix } = opts;

  const viewportResults = [];
  let combinedSummary   = '';
  let combinedNoise     = '';

  for (const viewport of viewports) {
    logger.info(runId, `Regression: processing viewport ${viewport}`);

    // Build S3 keys
    const baselineKey = `${baselinePrefix}${viewport}/screenshot.png`;
    const currentKey  = `${currentPrefix}${viewport}/screenshot.png`;

    // Download both images
    let baselineBuffer, currentBuffer;
    try {
      [baselineBuffer, currentBuffer] = await Promise.all([
        getObject(baselineKey),
        getObject(currentKey),
      ]);
    } catch (err) {
      logger.error(runId, `Failed to load images for viewport ${viewport}`, {
        error: err.message,
        baselineKey,
        currentKey,
      });
      viewportResults.push({
        viewport,
        error: `Could not load images: ${err.message}`,
        diffs: [],
      });
      continue;
    }

    // Call Bedrock
    let bedrockResult;
    try {
      bedrockResult = await analyze('regression', { baselineBuffer, currentBuffer }, runId);
    } catch (err) {
      logger.error(runId, `Bedrock failed for viewport ${viewport}`, { error: err.message });
      viewportResults.push({
        viewport,
        error: `Analysis failed: ${err.message}`,
        diffs: [],
      });
      continue;
    }

    const { diffs = [], summary = '', noise_filtered = '' } = bedrockResult;

    // Annotate current screenshot with bounding boxes
    let annotatedImageUrl = null;
    try {
      const annotatedBuffer = await annotate(currentBuffer, diffs);
      const annotatedKey    = `annotated/${runId}/${viewport}/screenshot-annotated.png`;
      await putObject(annotatedKey, annotatedBuffer, 'image/png');
      annotatedImageUrl = getS3Url(annotatedKey);
      logger.info(runId, `Annotated image saved`, { annotatedKey, diffsDrawn: diffs.length });
    } catch (err) {
      logger.warn(runId, `Annotation failed for ${viewport} — continuing without annotated image`, {
        error: err.message,
      });
    }

    viewportResults.push({
      viewport,
      annotatedImageUrl,
      diffs,
      summary,
    });

    // Accumulate for top-level summary
    if (summary) combinedSummary = combinedSummary ? `${combinedSummary}; ${summary}` : summary;
    if (noise_filtered) combinedNoise = noise_filtered;
  }

  // Build a concise top-level summary
  const totalDiffs   = viewportResults.reduce((n, vp) => n + (vp.diffs?.length || 0), 0);
  const criticalCount = viewportResults.reduce((n, vp) =>
    n + (vp.diffs?.filter(d => d.severity === 'critical').length || 0), 0);

  const topSummary = totalDiffs === 0
    ? 'No visual regressions detected.'
    : `${totalDiffs} regression(s) found across ${viewportResults.length} viewport(s) — ${criticalCount} critical.`;

  return {
    viewportResults,
    summary:       topSummary,
    noiseFiltered: combinedNoise,
  };
}

module.exports = { runRegression };
