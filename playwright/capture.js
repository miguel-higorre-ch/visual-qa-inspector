#!/usr/bin/env node
'use strict';

/**
 * capture.js
 * Main CLI entry point for the VisualQA Inspector screenshot capture module.
 *
 * Usage:
 *   node capture.js --mode regression  --target baseline --url http://localhost:3000
 *   node capture.js --mode intent      --url http://localhost:3000 --source ./src
 *   node capture.js --mode accessibility --url http://localhost:3000
 */

require('dotenv').config();

const path = require('path');
const fs   = require('fs');
const { Command } = require('commander');
const { v4: uuidv4 } = require('uuid');

const { captureMultiViewport }  = require('./multi-viewport');
const { uploadToS3 }            = require('./upload-to-s3');
const { collectSource }         = require('./collect-source');
const { VIEWPORTS, getS3Key }   = require('./config');

// ---------------------------------------------------------------------------
// CLI definition
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name('capture')
  .description('VisualQA Inspector – Playwright screenshot capture module')
  .version('1.0.0')
  .requiredOption('--mode <mode>', 'Capture mode: regression | intent | accessibility')
  .option('--target <target>', 'regression target: baseline | current (required for regression mode)')
  .option('--url <url>', 'URL to capture', 'http://localhost:3000')
  .option('--source <source>', 'Path to source files directory (required for intent mode)')
  .option('--viewports <viewports>', 'Comma-separated list: desktop,tablet,mobile', 'desktop,mobile')
  .option('--run-id <runId>', 'UUID for this run (auto-generated if omitted)')
  .option('--output <output>', 'Local output directory', './screenshots')
  .parse(process.argv);

const opts = program.opts();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // ── Validate mode ──────────────────────────────────────────────────────────
  const validModes = ['regression', 'intent', 'accessibility'];
  if (!validModes.includes(opts.mode)) {
    console.error(`Error: --mode must be one of: ${validModes.join(', ')}`);
    process.exit(1);
  }

  // ── Validate mode-specific options ─────────────────────────────────────────
  if (opts.mode === 'regression' && !opts.target) {
    console.error('Error: --target (baseline|current) is required for regression mode.');
    process.exit(1);
  }
  if (opts.target && !['baseline', 'current'].includes(opts.target)) {
    console.error('Error: --target must be "baseline" or "current".');
    process.exit(1);
  }
  if (opts.mode === 'intent' && !opts.source) {
    console.error('Error: --source is required for intent mode.');
    process.exit(1);
  }

  // ── Run ID ─────────────────────────────────────────────────────────────────
  const runId = opts.runId || uuidv4();

  // ── Determine viewports ────────────────────────────────────────────────────
  let viewportNames;
  if (opts.mode === 'intent') {
    // Intent mode always captures desktop only
    viewportNames = ['desktop'];
  } else {
    viewportNames = opts.viewports
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);

    // Validate each viewport name
    for (const vp of viewportNames) {
      if (!VIEWPORTS[vp]) {
        console.error(`Error: Unknown viewport "${vp}". Valid values: ${Object.keys(VIEWPORTS).join(', ')}`);
        process.exit(1);
      }
    }
  }

  // ── Determine output directory ─────────────────────────────────────────────
  // For regression: ./screenshots/{target}/{viewport}/screenshot.png
  // For others:     ./screenshots/{viewport}/screenshot.png
  const outputBase = opts.mode === 'regression'
    ? path.join(opts.output, opts.target)
    : opts.output;

  console.log(`\n========================================`);
  console.log(`  VisualQA Inspector – Capture`);
  console.log(`  Mode      : ${opts.mode}`);
  if (opts.target)  console.log(`  Target    : ${opts.target}`);
  console.log(`  URL       : ${opts.url}`);
  console.log(`  Viewports : ${viewportNames.join(', ')}`);
  console.log(`  Run ID    : ${runId}`);
  console.log(`  Output    : ${outputBase}`);
  console.log(`========================================\n`);

  const allUploads = []; // { localPath, s3Key }[]

  // ── Screenshot capture ─────────────────────────────────────────────────────
  try {
    console.log('Step 1/2 – Capturing screenshots...');
    const captures = await captureMultiViewport({
      url:        opts.url,
      viewports:  viewportNames,
      outputDir:  outputBase,
    });

    // Determine S3 prefix for screenshots
    const screenshotPrefix = opts.mode === 'regression' ? opts.target : opts.mode;

    for (const { viewport, localPath } of captures) {
      const s3Key = getS3Key(screenshotPrefix, runId, viewport, 'screenshot.png');
      allUploads.push({ localPath, s3Key });
    }
  } catch (err) {
    console.error(`\nCapture failed: ${err.message}`);
    process.exit(1);
  }

  // ── Source file collection (intent mode only) ──────────────────────────────
  if (opts.mode === 'intent') {
    try {
      console.log('\nStep 1b – Collecting source files...');
      const stagingDir  = path.join(process.cwd(), 'source-code');
      const stagedFiles = await collectSource({
        sourceDir:  path.resolve(opts.source),
        stagingDir,
      });

      for (const localPath of stagedFiles) {
        const filename = path.basename(localPath);
        const s3Key    = getS3Key('source-code', runId, 'files', filename);
        allUploads.push({ localPath, s3Key });
      }
    } catch (err) {
      console.error(`\nSource collection failed: ${err.message}`);
      process.exit(1);
    }
  }

  // ── S3 upload ──────────────────────────────────────────────────────────────
  try {
    console.log('\nStep 2/2 – Uploading to S3...');
    const uploaded = await uploadToS3(allUploads);
    console.log(`\n✓ All ${uploaded.length} file(s) uploaded successfully.`);
  } catch (err) {
    console.error(`\nS3 upload failed: ${err.message}`);
    process.exit(1);
  }

  // ── Success ────────────────────────────────────────────────────────────────
  console.log(`\n✓ Run complete.`);
  // Print run-id last so CI can capture it with e.g. tail -1
  console.log(runId);
  process.exit(0);
}

main().catch(err => {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
