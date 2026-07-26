'use strict';

/**
 * multi-viewport.js
 * Launches Chromium and captures full-page screenshots at one or more viewports.
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('@playwright/test');
const { VIEWPORTS } = require('./config');

const MAX_RETRIES = 2;

/**
 * Capture a single viewport with automatic retry on failure.
 *
 * @param {import('@playwright/test').Browser} browser
 * @param {string}  url          - Page URL to navigate to
 * @param {string}  viewportName - Key in VIEWPORTS (e.g. 'desktop')
 * @param {string}  outputDir    - Local directory where the PNG will be saved
 * @returns {Promise<{viewport: string, localPath: string}>}
 */
async function captureViewport(browser, url, viewportName, outputDir) {
  const viewportConfig = VIEWPORTS[viewportName];
  if (!viewportConfig) {
    throw new Error(`Unknown viewport "${viewportName}". Valid values: ${Object.keys(VIEWPORTS).join(', ')}`);
  }

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let context;
    let page;
    try {
      if (attempt > 0) {
        console.warn(`  [retry ${attempt}/${MAX_RETRIES}] viewport=${viewportName}`);
      }

      context = await browser.newContext({
        viewport: {
          width: viewportConfig.width,
          height: viewportConfig.height,
        },
        deviceScaleFactor: viewportConfig.deviceScaleFactor,
      });

      page = await context.newPage();

      console.log(`  Navigating to ${url} at ${viewportName} (${viewportConfig.width}x${viewportConfig.height})...`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

      // Ensure output directory exists
      const viewportDir = path.join(outputDir, viewportName);
      fs.mkdirSync(viewportDir, { recursive: true });

      const localPath = path.join(viewportDir, 'screenshot.png');

      await page.screenshot({
        path: localPath,
        fullPage: true,
        type: 'png',
      });

      console.log(`  ✓ Captured ${viewportName} → ${localPath}`);
      return { viewport: viewportName, localPath };
    } catch (err) {
      lastError = err;
      console.error(`  ✗ Attempt ${attempt + 1} failed for ${viewportName}: ${err.message}`);
    } finally {
      if (page) {
        try { await page.close(); } catch (_) {}
      }
      if (context) {
        try { await context.close(); } catch (_) {}
      }
    }
  }

  throw new Error(`Failed to capture viewport "${viewportName}" after ${MAX_RETRIES + 1} attempts: ${lastError.message}`);
}

/**
 * Capture screenshots at multiple viewports.
 *
 * @param {object} options
 * @param {string}   options.url        - URL to capture
 * @param {string[]} options.viewports  - Array of viewport names to capture
 * @param {string}   options.outputDir  - Root output directory; screenshots land in {outputDir}/{viewport}/screenshot.png
 * @returns {Promise<Array<{viewport: string, localPath: string}>>}
 */
async function captureMultiViewport({ url, viewports, outputDir }) {
  let browser;
  const results = [];

  try {
    console.log(`\nLaunching Chromium (headless)...`);
    browser = await chromium.launch({ headless: true });

    for (const viewportName of viewports) {
      const result = await captureViewport(browser, url, viewportName, outputDir);
      results.push(result);
    }
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
  }

  return results;
}

module.exports = { captureMultiViewport };
