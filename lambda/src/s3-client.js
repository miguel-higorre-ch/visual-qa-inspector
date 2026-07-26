'use strict';

/**
 * s3-client.js
 * Wrapper around AWS SDK v3 S3 operations used by the Lambda.
 */

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const client = new S3Client({ region: process.env.AWS_REGION_NAME || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET_NAME;

/**
 * Download an object from S3 and return it as a Buffer.
 * @param {string} key - S3 object key
 * @returns {Promise<Buffer>}
 */
async function getObject(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await client.send(command);

  // Convert readable stream to Buffer
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Upload a Buffer or string to S3.
 * @param {string} key - S3 object key
 * @param {Buffer|string} body - content to upload
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} - the S3 key on success
 */
async function putObject(key, body, contentType = 'application/octet-stream') {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await client.send(command);
  return key;
}

/**
 * Generate a pre-signed PUT URL for direct browser upload.
 * @param {string} key - S3 object key
 * @param {number} expiresIn - seconds until expiry (default 300)
 * @returns {Promise<string>} - pre-signed URL
 */
async function getPresignedPutUrl(key, expiresIn = 300) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Build a public-style S3 URL (works if bucket has public read or CloudFront).
 * @param {string} key
 * @returns {string}
 */
function getS3Url(key) {
  const region = process.env.AWS_REGION_NAME || 'us-east-1';
  return `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`;
}

module.exports = { getObject, putObject, getPresignedPutUrl, getS3Url };
