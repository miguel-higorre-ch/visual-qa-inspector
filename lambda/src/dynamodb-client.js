'use strict';

/**
 * dynamodb-client.js
 * Wrapper around AWS SDK v3 DynamoDB for persisting run metadata.
 */

const { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION_NAME || 'us-east-1' });
const TABLE = process.env.DYNAMODB_TABLE_NAME;

// TTL: 30 days from now in Unix epoch seconds
function computeTtl() {
  return Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
}

/**
 * Save a run record to DynamoDB.
 * @param {object} run
 */
async function saveRun(run) {
  const item = {
    runId:                { S: run.runId },
    timestamp:            { S: run.timestamp },
    mode:                 { S: run.mode },
    overallSeverity:      { S: run.overallSeverity },
    reportUrl:            { S: run.reportUrl || '' },
    diffsFound:           { N: String(run.diffsFound || 0) },
    criticalCount:        { N: String(run.criticalCount || 0) },
    minorCount:           { N: String(run.minorCount || 0) },
    cosmeticCount:        { N: String(run.cosmeticCount || 0) },
    triggeredBy:          { S: run.triggeredBy || 'manual' },
    durationMs:           { N: String(run.durationMs || 0) },
    ttl:                  { N: String(computeTtl()) },
  };

  // Optional fields — only add if present
  if (run.prNumber)      item.prNumber      = { S: String(run.prNumber) };
  if (run.repoFullName)  item.repoFullName  = { S: run.repoFullName };
  if (run.s3Prefix)      item.s3Prefix      = { S: run.s3Prefix };

  await client.send(new PutItemCommand({ TableName: TABLE, Item: item }));
}

/**
 * Get recent runs for the history panel (last N, sorted newest first).
 * Uses a scan — acceptable at hackathon scale.
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getRecentRuns(limit = 10) {
  const result = await client.send(new ScanCommand({
    TableName: TABLE,
    Limit: limit * 3, // over-fetch since scan doesn't sort
    ProjectionExpression: 'runId, #ts, #md, overallSeverity, diffsFound, triggeredBy, prNumber, reportUrl',
    ExpressionAttributeNames: { '#ts': 'timestamp', '#md': 'mode' },
  }));

  const runs = (result.Items || []).map(item => ({
    runId:           item.runId?.S,
    timestamp:       item.timestamp?.S,
    mode:            item.mode?.S,
    overallSeverity: item.overallSeverity?.S,
    diffsFound:      Number(item.diffsFound?.N || 0),
    triggeredBy:     item.triggeredBy?.S,
    prNumber:        item.prNumber?.S || null,
    reportUrl:       item.reportUrl?.S,
  }));

  // Sort newest first and slice
  return runs
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

module.exports = { saveRun, getRecentRuns };
