'use strict';

/**
 * annotator.js
 * Draws colored, numbered bounding boxes on screenshots using sharp.
 * Returns an annotated PNG Buffer ready to upload to S3.
 *
 * Color coding:
 *   critical        → #FF3B30  red,    3px border
 *   minor           → #FF9500  orange, 2px border
 *   cosmetic        → #8E8E93  gray,   1px border
 *   wcag_violation  → #AF52DE  purple, 2px border
 */

const sharp = require('sharp');

const SEVERITY_COLORS = {
  critical:       { hex: '#FF3B30', border: 3 },
  minor:          { hex: '#FF9500', border: 2 },
  cosmetic:       { hex: '#8E8E93', border: 1 },
  wcag_violation: { hex: '#AF52DE', border: 2 },
  warning:        { hex: '#FF9500', border: 2 }, // WCAG "warning" maps to orange
};

/** Parse "#RRGGBB" to { r, g, b } */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Build an SVG overlay for a single bounding box with a number badge.
 * @param {object} bbox   - { x, y, width, height }
 * @param {string} color  - hex color string
 * @param {number} border - border width in px
 * @param {number} index  - 1-based diff number
 * @returns {string} SVG markup
 */
function buildBoxSvg(bbox, color, border, index) {
  const { x, y, width, height } = bbox;
  const rgb = hexToRgb(color);
  const fill = `rgb(${rgb.r},${rgb.g},${rgb.b})`;

  // Badge size
  const badgeSize = 20;
  const badgeX = x;
  const badgeY = Math.max(0, y - badgeSize);

  return `
    <rect
      x="${x}" y="${y}" width="${width}" height="${height}"
      fill="none"
      stroke="${fill}"
      stroke-width="${border}"
      rx="2"
    />
    <rect
      x="${badgeX}" y="${badgeY}" width="${badgeSize}" height="${badgeSize}"
      fill="${fill}" rx="3"
    />
    <text
      x="${badgeX + badgeSize / 2}" y="${badgeY + badgeSize / 2 + 5}"
      font-family="Arial, sans-serif" font-size="11" font-weight="bold"
      fill="white" text-anchor="middle"
    >${index}</text>
  `;
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
    // Nothing to annotate — return original
    return screenshotBuffer;
  }

  const img = sharp(screenshotBuffer);
  const meta = await img.metadata();
  const { width, height } = meta;

  // Build one SVG with all boxes
  const boxesSvg = diffs.map((diff, i) => {
    const severity = diff.severity || 'cosmetic';
    const colorDef = SEVERITY_COLORS[severity] || SEVERITY_COLORS.cosmetic;

    // Clamp bbox to image boundaries
    const bbox = {
      x:      Math.max(0, Math.min(diff.bbox.x, width - 1)),
      y:      Math.max(0, Math.min(diff.bbox.y, height - 1)),
      width:  Math.min(diff.bbox.width,  width  - diff.bbox.x),
      height: Math.min(diff.bbox.height, height - diff.bbox.y),
    };

    return buildBoxSvg(bbox, colorDef.hex, colorDef.border, i + 1);
  }).join('\n');

  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${boxesSvg}
    </svg>
  `;

  const annotated = await sharp(screenshotBuffer)
    .composite([{
      input: Buffer.from(svgOverlay),
      top: 0,
      left: 0,
    }])
    .png()
    .toBuffer();

  return annotated;
}

module.exports = { annotate };
