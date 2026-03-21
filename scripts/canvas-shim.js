/**
 * Creates a "canvas" shim in node_modules that re-exports @napi-rs/canvas.
 * This is needed because pdfjs-dist internally does require("canvas")
 * and @napi-rs/canvas is our pre-built replacement.
 */
const fs = require('fs');
const path = require('path');

const shimDir = path.join(__dirname, '..', 'node_modules', 'canvas');
const shimIndex = path.join(shimDir, 'index.js');
const shimPkg = path.join(shimDir, 'package.json');

// Don't overwrite if real canvas is installed (has binding.gyp or prebuilds)
if (fs.existsSync(path.join(shimDir, 'binding.gyp')) || fs.existsSync(path.join(shimDir, 'prebuilds'))) {
  console.log('[canvas-shim] Real canvas package detected, skipping shim.');
  process.exit(0);
}

try {
  fs.mkdirSync(shimDir, { recursive: true });

  fs.writeFileSync(shimIndex,
    `// Auto-generated shim: re-exports @napi-rs/canvas as "canvas" for pdfjs-dist
const napi = require('@napi-rs/canvas');
module.exports = napi;
module.exports.createCanvas = napi.createCanvas;
module.exports.default = napi;
`);

  fs.writeFileSync(shimPkg, JSON.stringify({
    name: 'canvas',
    version: '0.0.0-shim',
    main: 'index.js',
    description: 'Shim re-exporting @napi-rs/canvas for pdfjs-dist compatibility'
  }, null, 2) + '\n');

  console.log('[canvas-shim] Created canvas shim -> @napi-rs/canvas');
} catch (err) {
  console.warn('[canvas-shim] Failed to create shim:', err.message);
}
