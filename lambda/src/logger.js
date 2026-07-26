'use strict';

/**
 * logger.js
 * Structured JSON logger for CloudWatch Logs.
 * Every log line is a JSON object with a runId field so logs
 * from a single analysis can be filtered in CloudWatch Insights.
 */

function log(level, runId, message, extra = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    runId: runId || 'unknown',
    message,
    ...extra,
  };
  // Lambda captures stdout → CloudWatch Logs
  console.log(JSON.stringify(entry));
}

module.exports = {
  info: (runId, message, extra) => log('INFO', runId, message, extra),
  warn: (runId, message, extra) => log('WARN', runId, message, extra),
  error: (runId, message, extra) => log('ERROR', runId, message, extra),
};
