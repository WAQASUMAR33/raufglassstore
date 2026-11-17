const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// 1. Create modern SVG Favicon (Vector, infinite resolution for all modern browsers)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c1e4a" />
      <stop offset="50%" stop-color="#1A55E3" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="facetTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7dd3fc" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <linearGradient id="facetLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
    <linearGradient id="facetRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="facetCore" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#bae6fd" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#00D284" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect x="6" y="6" width="116" height="116" rx="28" fill="url(#bgGrad)" stroke="#38bdf8" stroke-width="2.5" stroke-opacity="0.45" />

  <!-- Glass Crystal / Prism Emblem -->
  <g transform="translate(64, 64) scale(0.95)" filter="url(#glow)">
    <!-- Top Apex Facets -->
    <polygon points="0,-44 -38,-12 0,-3" fill="url(#facetTop)" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" />
    <polygon points="0,-44 38,-12 0,-3" fill="url(#facetRight)" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" />

    <!-- Center Facets -->
    <polygon points="-38,-12 0,-3 0,36 -38,16" fill="url(#facetLeft)" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" />
    <polygon points="38,-12 0,-3 0,36 38,16" fill="url(#facetCore)" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" opacity="0.95" />

    <!-- Bottom Point Facets -->
    <polygon points="0,36 -38,16 0,46" fill="#0369a1" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" />
    <polygon points="0,36 38,16 0,46" fill="#0284c7" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round" />

    <!-- Specular Diamond Shine / Sparkle -->
    <circle cx="-12" cy="-20" r="3.5" fill="#ffffff" />
    <path d="M-12,-27 L-12,-13 M-19,-20 L-5,-20" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" />
  </g>
</svg>
`;

fs.writeFileSync(path.join(__dirname, '../src/app/icon.svg'), svgContent);
fs.writeFileSync(path.join(__dirname, '../public/icon.svg'), svgContent);

// 2. Generate Multi-size ICO using pure Node + pngjs
function renderGlassIconPng(size) {
  const png = new PNG({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Squircle distance formula: |dx/r|^4 + |dy/r|^4 <= 1
      const nx = Math.abs(dx) / (size * 0.46);
      const ny = Math.abs(dy) / (size * 0.46);
      const sqDist = Math.pow(nx, 4) + Math.pow(ny, 4);

      if (sqDist <= 1.0) {
        // Inside icon squircle
        const t = (x + y) / (2 * size);
        // Gradient: #0c1e4a to #0284c7
        let r = Math.round(12 * (1 - t) + 2 * t);
        let g = Math.round(30 * (1 - t) + 132 * t);
        let b = Math.round(74 * (1 - t) + 199 * t);

        // Center glass diamond emblem
        const ndx = Math.abs(dx) / (size * 0.28);
        const ndy = Math.abs(dy) / (size * 0.34);
        const isDiamond = (ndx + ndy) <= 1.0;

        if (isDiamond) {
          if (dx < 0 && dy < 0) {
            // Top left facet: cyan-300
            r = 125; g = 211; b = 252;
          } else if (dx >= 0 && dy < 0) {
            // Top right facet: sky-400
            r = 56; g = 189; b = 248;
          } else if (dx < 0 && dy >= 0) {
            // Bottom left facet: sky-600
            r = 2; g = 132; b = 199;
          } else {
            // Bottom right facet: pure white core
            r = 240; g = 249; b = 255;
          }
          // Border highlight
          if (Math.abs((ndx + ndy) - 1.0) < 0.15 || Math.abs(dx) < 1 || Math.abs(dy) < 1) {
            r = 255; g = 255; b = 255;
          }
        } else if (sqDist > 0.82) {
          // Subtle border glow
          r = Math.min(255, r + 60);
          g = Math.min(255, g + 80);
          b = Math.min(255, b + 90);
        }

        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      } else if (sqDist <= 1.25) {
        // Anti-aliased outer edge
        const alpha = Math.round(255 * (1 - (sqDist - 1.0) / 0.25));
        png.data[idx] = 12;
        png.data[idx + 1] = 60;
        png.data[idx + 2] = 150;
        png.data[idx + 3] = Math.max(0, Math.min(255, alpha));
      } else {
        // Transparent outside
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
      }
    }
  }

  return PNG.sync.write(png);
}

// 3. Package into Windows .ICO
function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + count * dirEntrySize;

  let offset = dirSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // Number of images

  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 0); // width
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    entries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

const sizes = [16, 32, 48];
const pngItems = sizes.map(sz => ({ size: sz, buffer: renderGlassIconPng(sz) }));
const icoBuffer = createIco(pngItems);

fs.writeFileSync(path.join(__dirname, '../src/app/favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(__dirname, '../public/favicon.ico'), icoBuffer);

console.log('Successfully generated new Favicon SVG & Multi-size ICO files!');
