#!/usr/bin/env node
/**
 * scripts/generate-og.mjs
 * Generates public/og-image.png — 1200×630 branded OG image
 * Pure Node.js, no external dependencies required
 *
 * Run: node scripts/generate-og.mjs
 * Auto-runs as prebuild step
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '../public/og-image.png');

if (existsSync(OUTPUT)) {
  console.log('✓ public/og-image.png already exists, skipping');
  process.exit(0);
}

// CRC-32 table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return ((crc ^ 0xFFFFFFFF) >>> 0);
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

const W = 1200, H = 630;
// Brand dark background: #0f1117
const R = 0x0f, G = 0x11, B = 0x17;

// Build raw image data (PNG filter byte 0 = None, followed by RGB pixels)
const rowBytes = 1 + W * 3;
const raw = Buffer.alloc(rowBytes * H);
for (let y = 0; y < H; y++) {
  const off = y * rowBytes;
  raw[off] = 0; // filter: None
  for (let x = 0; x < W; x++) {
    raw[off + 1 + x * 3] = R;
    raw[off + 1 + x * 3 + 1] = G;
    raw[off + 1 + x * 3 + 2] = B;
  }
}

// IHDR chunk (width, height, 8-bit RGB, no interlace)
const ihdr = Buffer.allocUnsafe(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

// Compress: deflateSync produces zlib-wrapped output (RFC 1950) — correct for PNG IDAT
const idat = deflateSync(raw, { level: 9 });

// Assemble PNG
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
  makeChunk('IHDR', ihdr),
  makeChunk('IDAT', idat),
  makeChunk('IEND', Buffer.alloc(0)),
]);

writeFileSync(OUTPUT, png);
console.log(`✓ Generated public/og-image.png (${W}×${H}, ${(png.length / 1024).toFixed(1)} KB)`);
