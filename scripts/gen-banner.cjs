#!/usr/bin/env node
// Generates cover.png — BRUNNFELD pixel-art banner (no external deps)
'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── Canvas ────────────────────────────────────────────────────────────────
const W = 1200, H = 240;
const px = Buffer.alloc(W * H * 3, 0x08);   // near-black background

function set(x, y, r, g, b) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = r; px[i+1] = g; px[i+2] = b;
}
function add(x, y, r, g, b) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i]   = Math.min(255, px[i]   + r);
  px[i+1] = Math.min(255, px[i+1] + g);
  px[i+2] = Math.min(255, px[i+2] + b);
}

// ─── Background: subtle diagonal scanlines ──────────────────────────────────
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const v = ((x + y) % 4 === 0) ? 0x12 : 0x08;
    set(x, y, v, v, v);
  }
}

// ─── 5×7 Bitmap font ────────────────────────────────────────────────────────
const G = {
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
};

const S = 16;           // pixel scale
const CW = 5, CH = 7;  // glyph cell
const GAP = 2;          // pixels between chars
const TEXT = 'BRUNNFELD';

const totalW = TEXT.length * (CW + GAP) * S - GAP * S;
const startX = Math.floor((W - totalW) / 2);
const startY = Math.floor((H - CH * S) / 2);

// ── Pass 1: Glow ─────────────────────────────────────────────────────────────
const GLOW = 10;   // glow radius in screen pixels
for (let ci = 0; ci < TEXT.length; ci++) {
  const g = G[TEXT[ci]];
  if (!g) continue;
  const cx = startX + ci * (CW + GAP) * S;
  for (let row = 0; row < CH; row++) {
    const t = row / (CH - 1);
    // dim amber glow: gold (255,140,0) → brown (80,30,0)
    const gr = Math.round((80 + (1-t)*100) * 0.18);
    const gg = Math.round((30 + (1-t)*70 ) * 0.15);
    for (let col = 0; col < CW; col++) {
      if (!((g[row] >> (CW - 1 - col)) & 1)) continue;
      for (let dy = -GLOW; dy < S + GLOW; dy++) {
        for (let dx = -GLOW; dx < S + GLOW; dx++) {
          // falloff based on distance from pixel block
          const ex = Math.max(0, Math.abs(dx - S/2) - S/2);
          const ey = Math.max(0, Math.abs(dy - S/2) - S/2);
          const dist = Math.sqrt(ex*ex + ey*ey);
          if (dist > GLOW) continue;
          const fade = (1 - dist / GLOW) ** 2;
          add(cx + col*S + dx, startY + row*S + dy,
              Math.round(gr * fade), Math.round(gg * fade), 0);
        }
      }
    }
  }
}

// ── Pass 2: Crisp text ───────────────────────────────────────────────────────
for (let ci = 0; ci < TEXT.length; ci++) {
  const g = G[TEXT[ci]];
  if (!g) continue;
  const cx = startX + ci * (CW + GAP) * S;
  for (let row = 0; row < CH; row++) {
    const t = row / (CH - 1);
    // Gradient: #FFD700 gold → #8B4513 saddle-brown
    const r = Math.round(255 - 116 * t);
    const gr = Math.round(215 - 146 * t);
    const b  = Math.round(       19 * t);
    for (let col = 0; col < CW; col++) {
      if (!((g[row] >> (CW - 1 - col)) & 1)) continue;
      // Fill S×S block, add 1-px lighter highlight on top row
      for (let dy = 0; dy < S; dy++) {
        for (let dx = 0; dx < S; dx++) {
          const rr = (dy === 0 && dx !== 0 && dx !== S-1) ? Math.min(255, r + 30) : r;
          const gg = (dy === 0 && dx !== 0 && dx !== S-1) ? Math.min(255, gr + 20) : gr;
          set(cx + col*S + dx, startY + row*S + dy, rr, gg, b);
        }
      }
    }
  }
}

// ── Decorative lines ─────────────────────────────────────────────────────────
const lineTop = startY - Math.round(S * 0.8);
const lineBtm = startY + CH * S + Math.round(S * 0.4);
for (let x = startX; x < startX + totalW; x++) {
  const t = (x - startX) / totalW;
  const r = Math.round(180 - 60 * t);
  const g = Math.round(100 - 40 * t);
  set(x, lineTop,     r, g, 0);
  set(x, lineTop + 1, Math.round(r*0.5), Math.round(g*0.5), 0);
  set(x, lineBtm,     r, g, 0);
  set(x, lineBtm + 1, Math.round(r*0.5), Math.round(g*0.5), 0);
}

// ─── PNG encoder ─────────────────────────────────────────────────────────────
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

const raw = Buffer.alloc((1 + W * 3) * H);
let p = 0;
for (let y = 0; y < H; y++) {
  raw[p++] = 0;
  px.copy(raw, p, y * W * 3, (y + 1) * W * 3);
  p += W * 3;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

const out = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const dest = path.join(__dirname, '..', 'cover.png');
fs.writeFileSync(dest, out);
console.log(`cover.png written (${out.length} bytes, ${W}×${H})`);
