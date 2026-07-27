'use strict';

/**
 * upload-to-s3.js
 * Uploads local files to S3 using @aws-sdk/client-s3 v3.
 * Credentials are read from environment variables.
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getS3Url } = require('./config');

/**
 * Build a content-type string from a file extension.
 *
 * @param {string} filePath
 * @returns {string}
 */
function inferContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.json': 'application/json',
    '.js':   'text/javascript',
    '.ts':   'text/typescript',
    '.jsx':  'text/javascript',
    '.tsx':  'text/typescript',
    '.css':  'text/css',
    '.html': 'text/html',
    '.txt':  'text/plain',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * Upload an array of local files to S3.
 *
 * @param {Array<{localPath: string, s3Key: string}>} uploads
 *   Each entry maps a local file path to its desired S3 object key.
 * @returns {Promise<Array<{s3Key: string, s3Url: string}>>}
 *   Resolves with the S3 key and URL of every successfully uploaded object.
 */
async function uploadToS3(uploads) {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error('S3_BUCKET_NAME environment variable is not set.');
  }

  const region = process.env.AWS_REGION || 'us-east-1';

  // Validate required credentials
  if (!process.env.AWS_ACCESS_KEY_ID) {
    throw new Error('AWS_ACCESS_KEY_ID environment variable is not set.');
  }
  if (!process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS_SECRET_ACCESS_KEY environment variable is not set.');
  }

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
    },
  });

  const results = [];

  for (const { localPath, s3Key } of uploads) {
    try {
      console.log(`  Uploading ${path.basename(localPath)} → s3://${bucket}/${s3Key}`);

      if (!fs.existsSync(localPath)) {
        throw new Error(`Local file not found: ${localPath}`);
      }

      const fileContent = fs.readFileSync(localPath);
      const contentType = inferContentType(localPath);

      const command = new PutObjectCommand({
        Bucket:      bucket,
        Key:         s3Key,
        Body:        fileContent,
        ContentType: contentType,
      });

      await client.send(command);

      const s3Url = getS3Url(bucket, s3Key);
      console.log(`  ✓ Uploaded → ${s3Url}`);
      results.push({ s3Key, s3Url });
    } catch (err) {
      console.error(`  ✗ Failed to upload ${localPath}: ${err.message}`);
      throw err;
    }
  }

  return results;
}

module.exports = { uploadToS3 };
