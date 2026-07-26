'use strict';

/**
 * collect-source.js
 * Recursively walks a source directory, collects relevant source files,
 * and copies them to a local staging folder for upload to S3.
 *
 * Used by Intent Mode to bundle source code alongside screenshots.
 */

const fs   = require('fs');
const path = require('path');

// File extensions to collect (non-test source files)
const ALLOWED_EXTENSIONS = new Set(['.jsx', '.tsx', '.css', '.js', '.ts']);

// Exact filename suffixes that identify test files (case-insensitive)
const TEST_SUFFIXES = ['.test.js', '.test.ts', '.test.jsx', '.test.tsx',
                       '.spec.js', '.spec.ts', '.spec.jsx', '.spec.tsx'];

// Directory names that should be skipped entirely
const EXCLUDED_DIRS = new Set(['node_modules', 'build', 'dist', '.next', '.git', 'coverage', '.cache']);

// Maximum file size to include (100 KB)
const MAX_FILE_SIZE_BYTES = 100 * 1024;

/**
 * Determine whether a file path should be collected.
 *
 * @param {string} filePath  - Absolute path to the file
 * @param {string} fileName  - Basename of the file
 * @returns {boolean}
 */
function shouldCollect(filePath, fileName) {
  const lowerName = fileName.toLowerCase();

  // Must have an allowed extension
  const ext = path.extname(lowerName);
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;

  // Skip test/spec files
  if (TEST_SUFFIXES.some(suffix => lowerName.endsWith(suffix))) return false;

  // Skip files that are too large
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      console.warn(`  Skipping large file (${Math.round(stat.size / 1024)}KB): ${filePath}`);
      return false;
    }
  } catch (_) {
    return false;
  }

  return true;
}

/**
 * Recursively walk a directory and return absolute paths of collectable files.
 *
 * @param {string}   dir      - Directory to walk
 * @param {string[]} [acc=[]] - Accumulator (used internally for recursion)
 * @returns {string[]}
 */
function walkDir(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(`  Cannot read directory ${dir}: ${err.message}`);
    return acc;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walkDir(fullPath, acc);
      }
    } else if (entry.isFile()) {
      if (shouldCollect(fullPath, entry.name)) {
        acc.push(fullPath);
      }
    }
  }

  return acc;
}

/**
 * Collect source files from a directory and copy them to a staging folder.
 *
 * When multiple source files share the same filename, the destination name is
 * made unique by prepending a counter (e.g. "2_Button.tsx").
 *
 * @param {object} options
 * @param {string} options.sourceDir   - Root of the project source tree to scan
 * @param {string} options.stagingDir  - Local folder to copy collected files into
 * @returns {Promise<string[]>} - Array of absolute paths of staged copies
 */
async function collectSource({ sourceDir, stagingDir }) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  fs.mkdirSync(stagingDir, { recursive: true });

  const collectedPaths = walkDir(path.resolve(sourceDir));

  if (collectedPaths.length === 0) {
    console.warn(`  No collectable source files found in ${sourceDir}`);
    return [];
  }

  console.log(`  Found ${collectedPaths.length} source file(s) in ${sourceDir}`);

  const stagedPaths = [];
  const usedNames   = new Map(); // basename → count

  for (const srcPath of collectedPaths) {
    const baseName  = path.basename(srcPath);
    const count     = (usedNames.get(baseName) || 0) + 1;
    usedNames.set(baseName, count);

    // Deduplicate: if we have seen this name before, prefix with counter
    const destName  = count === 1 ? baseName : `${count}_${baseName}`;
    const destPath  = path.join(stagingDir, destName);

    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  Staged: ${srcPath} → ${destPath}`);
      stagedPaths.push(destPath);
    } catch (err) {
      console.error(`  ✗ Could not stage ${srcPath}: ${err.message}`);
    }
  }

  return stagedPaths;
}

module.exports = { collectSource };
