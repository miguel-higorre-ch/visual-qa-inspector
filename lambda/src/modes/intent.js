'use strict';

/**
 * modes/intent.js
 * Intent Mode pipeline: zero-baseline evaluation.
 * Evaluates a single screenshot against component source code.
 *
 * Steps:
 *   1. Download screenshot from S3
 *   2. Download all source files from S3 source prefix
 *   3. Combine source files into a single text block
 *   4. Call Bedrock with intent prompt
 *   5. Annotate screenshot with bounding boxes
 *   6. Upload annotated image to S3
 *   7. Return result
 */

const { getObject, putObject, getS3Url } = require('../s3-client');
const { analyze }                         = require('../bedrock-client');
const { annotate }                        = require('../annotator');
const logger                              = require('../logger');

// AWS SDK for listing S3 objects under a prefix
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({ region: process.env.AWS_REGION_NAME || 'us-east-1' });

/**
 * List all S3 keys under a given prefix.
 */
async function listKeys(prefix) {
  const result = await s3Client.send(new ListObjectsV2Command({
    Bucket: process.env.S3_BUCKET_NAME,
    Prefix: prefix,
  }));
  return (result.Contents || []).map(obj => obj.Key).filter(k => !k.endsWith('/'));
}

/**
 * Run Intent Mode analysis.
 *
 * @param {object} opts
 * @param {string}   opts.runId
 * @param {string}   opts.screenshotKey   - S3 key of the screenshot
 * @param {string}   opts.sourcePrefix    - S3 prefix containing source files
 * @returns {Promise<object>} - { viewportResults, summary, verdict }
 */
async function runIntent(opts) {
  const { runId, screenshotKey, sourcePrefix } = opts;

  logger.info(runId, 'Intent: loading screenshot and source files', { screenshotKey, sourcePrefix });

  // Download screenshot
  let screenshotBuffer;
  try {
    screenshotBuffer = await getObject(screenshotKey);
  } catch (err) {
    throw Object.assign(
      new Error(`Could not load screenshot: ${err.message}`),
      { code: 'S3_NOT_FOUND', key: screenshotKey }
    );
  }

  // Download and combine all source files
  let sourceText = '';
  try {
    const keys = await listKeys(sourcePrefix);
    if (keys.length === 0) {
      throw new Error(`No source files found under prefix: ${sourcePrefix}`);
    }

    const fileContents = await Promise.all(
      keys.map(async key => {
        const buf = await getObject(key);
        const filename = key.split('/').pop();
        return `// === ${filename} ===\n${buf.toString('utf8')}`;
      })
    );
    sourceText = fileContents.join('\n\n');
    logger.info(runId, `Intent: loaded ${keys.length} source file(s)`, {
      files: keys.map(k => k.split('/').pop()),
    });
  } catch (err) {
    throw Object.assign(
      new Error(`Could not load source files: ${err.message}`),
      { code: 'SOURCE_LOAD_ERROR' }
    );
  }

  // Call Bedrock
  const bedrockResult = await analyze('intent', { screenshotBuffer, sourceText }, runId);
  const { issues = [], summary = '', verdict = 'fail' } = bedrockResult;

  // Annotate screenshot
  let annotatedImageUrl = null;
  try {
    const annotatedBuffer = await annotate(screenshotBuffer, issues);
    const annotatedKey    = `annotated/${runId}/desktop/screenshot-annotated.png`;
    await putObject(annotatedKey, annotatedBuffer, 'image/png');
    annotatedImageUrl = getS3Url(annotatedKey);
  } catch (err) {
    logger.warn(runId, 'Intent: annotation failed — continuing', { error: err.message });
  }

  const viewportResults = [{
    viewport: 'desktop',
    annotatedImageUrl,
    diffs: issues,   // use 'diffs' key for consistency with the response contract
    issues,          // also expose as 'issues' for intent-specific fields (code_reference)
    summary,
  }];

  return { viewportResults, summary, verdict };
}

module.exports = { runIntent };
