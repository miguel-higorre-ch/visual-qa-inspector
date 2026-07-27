'use strict';

/**
 * annotator.js
 * Draws colored, numbered bounding boxes on screenshots using Jimp.
 * Jimp is pure JavaScript — no native binaries, works on any platform.
 *
 * Color coding:
 *   critical        → #FF3B30  red,    3px border
 *   minor           → #FF9500  orange, 2px border
 *   cosmetic        → #8E8E93  gray,   1px border
 *   wcag_violation  → #AF52DE  purple, 2px border
 *   warning         → #FF9500  orange, 2px border
 */

const Jimp = require('jimp');

const SEVERITY_COLORS = {
  critical:       { hex: 0xFF3B30FF, border: 3 },
  minor:          { hex: 0xFF9500FF, border: 2 },
  cosmetic:       { hex: 0x8E8E93FF, border: 1 },
  wcag_violation: { hex: 0xAF52DEFF, border: 2 },
  warning:        { hex: 0xFF9500FF, border: 2 },
};

/**
 * Draw a rectangle border on a Jimp image (in-place).
 * @param {Jimp} img
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} color  - 32-bit RGBA hex e.g. 0xFF3B30FF
 * @param {number} thickness
 */
function drawRect(img, x, y, w, h, color, thickness) {
  const imgW = img.getWidth();
  const imgH = img.getHeight();

  for (let t = 0; t < thickness; t++) {
    // Top edge
    for (let px = x; px < x + w; px++) {
      const py = y + t;
      if (px >= 0 && px < imgW && py >= 0 && py < imgH) img.setPixelColor(color, px, py);
    }
    // Bottom edge
    for (let px = x; px < x + w; px++) {
      const py = y + h - 1 - t;
      if (px >= 0 && px < imgW && py >= 0 && py < imgH) img.setPixelColor(color, px, py);
    }
    // Left edge
    for (let py = y; py < y + h; py++) {
      const px = x + t;
      if (px >= 0 && px < imgW && py >= 0 && py < imgH) img.setPixelColor(color, px, py);
    }
    // Right edge
    for (let py = y; py < y + h; py++) {
      const px = x + w - 1 - t;
      if (px >= 0 && px < imgW && py >= 0 && py < imgH) img.setPixelColor(color, px, py);
    }
  }
}

/**
 * Draw a filled rectangle (for number badges).
 */
function fillRect(img, x, y, w, h, color) {
  const imgW = img.getWidth();
  const imgH = img.getHeight();
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < imgW && py >= 0 && py < imgH) img.setPixelColor(color, px, py);
    }
  }
}

/**
 * Annotate a screenshot buffer with bounding boxes for each diff.
 *
 * @param {Buffer} screenshotBuffer - original PNG screenshot
 * @param {Array}  diffs            - array of diff objects with severity + bbox
 * @returns {Promise<Buffer>}       - annotated PNG buffer
 */
async function annotate(screenshotBuffer, diffs) {
  if (!diffs || diffs.length === 0) {
    return screenshotBuffer;
  }

  const img = await Jimp.read(screenshotBuffer);
  const imgW = img.getWidth();
  const imgH = img.getHeight();

  for (let i = 0; i < diffs.length; i++) {
    const diff = diffs[i];
    const severity = diff.severity || 'cosmetic';
    const colorDef = SEVERITY_COLORS[severity] || SEVERITY_COLORS.cosmetic;

    // Clamp bbox to image boundaries
    const bx = Math.max(0, Math.min(Math.round(diff.bbox.x), imgW - 1));
    const by = Math.max(0, Math.min(Math.round(diff.bbox.y), imgH - 1));
    const bw = Math.min(Math.round(diff.bbox.width),  imgW - bx);
    const bh = Math.min(Math.round(diff.bbox.height), imgH - by);

    if (bw <= 0 || bh <= 0) continue;

    // Draw bounding box border
    drawRect(img, bx, by, bw, bh, colorDef.hex, colorDef.border);

    // Draw number badge (filled square in top-left corner of bbox)
    const badgeSize = 18;
    const badgeX = bx;
    const badgeY = Math.max(0, by - badgeSize);
    fillRect(img, badgeX, badgeY, badgeSize, badgeSize, colorDef.hex);

    // Note: Jimp does not support text rendering without fonts loaded.
    // Badge shows as a colored square — number shown in the diff list.
    // For the hackathon demo this is sufficient.
  }

  return img.getBufferAsync(Jimp.MIME_PNG);
}

module.exports = { annotate };
