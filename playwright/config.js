'use strict';

/**
 * config.js
 * Central configuration for viewport definitions and S3 key helpers.
 */

/**
 * Viewport definitions used for multi-viewport capture.
 * @type {Object.<string, {width: number, height: number, deviceScaleFactor: number}>}
 */
const VIEWPORTS = {
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1 },
  tablet:  { width: 768,  height: 1024, deviceScaleFactor: 1 },
  mobile:  { width: 375,  height: 812,  deviceScaleFactor: 2 },
};

/**
 * Build an S3 object key from its components.
 *
 * Pattern: {prefix}/{runId}/{viewport}/{filename}
 *
 * @param {string} prefix   - e.g. 'baseline', 'current', 'annotated', 'source-code'
 * @param {string} runId    - UUID that identifies this run
 * @param {string} viewport - e.g. 'desktop', 'tablet', 'mobile'
 * @param {string} filename - e.g. 'screenshot.png'
 * @returns {string}
 */
function getS3Key(prefix, runId, viewport, filename) {
  return `${prefix}/${runId}/${viewport}/${filename}`;
}

/**
 * Build a public-style S3 URL from a bucket name and key.
 *
 * @param {string} bucket - S3 bucket name
 * @param {string} key    - S3 object key (from getS3Key)
 * @returns {string}
 */
function getS3Url(bucket, key) {
  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

module.exports = { VIEWPORTS, getS3Key, getS3Url };
