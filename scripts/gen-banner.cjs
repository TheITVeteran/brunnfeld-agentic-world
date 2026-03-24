#!/usr/bin/env node
// Generates banner.png — terminal-window style BRUNNFELD header (no external deps)
'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── Canvas ────────────────────────────────────────────────────────────────
const W = 1200, H = 280;
const px = Buffer.alloc(W * H * 3, 0);

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
function fillRect(x1, y1, x2, y2, r, g, b) {
  for (let y = y1; y < y2; y++)
    for (let x = x1; x < x2; x++)
      set(x, y, r, g, b);
}
function hline(y, x1, x2, r, g, b) {
  for (let x = x1; x < x2; x++) set(x, y, r, g, b);
}
function vline(x, y1, y2, r, g, b) {
  for (let y = y1; y < y2; y++) set(x, y, r, g, b);
}
function circle(cx, cy, rad, r, g, b) {
  for (let y = -rad; y <= rad; y++)
    for (let x = -rad; x <= rad; x++)
      if (x*x + y*y <= rad*rad) set(cx+x, cy+y, r, g, b);
}

// ─── Terminal window frame ───────────────────────────────────────────────────
const TITLEBAR_H = 34;
const BORDER     = 2;
const RADIUS     = 8;  // rounded corner visual (approximated by clipping corners)

// Window background (main body)
fillRect(0, 0, W, H, 0x0d, 0x0d, 0x0d);

// Title bar
fillRect(0, 0, W, TITLEBAR_H, 0x2d, 0x2d, 0x2d);

// Separator line between titlebar and body
hline(TITLEBAR_H, 0, W, 0x1a, 0x1a, 0x1a);

// Round the top corners (blank them to simulate rounded corners)
const cornerR = 12;
for (let y = 0; y < cornerR; y++) {
  for (let x = 0; x < cornerR; x++) {
    const dx = cornerR - x, dy = cornerR - y;
    if (dx*dx + dy*dy > cornerR*cornerR) {
      set(x, y, 0, 0, 0);
      set(W-1-x, y, 0, 0, 0);
    }
  }
}

// Traffic-light dots (macOS style)
const dotY  = Math.floor(TITLEBAR_H / 2);
const dotR  = 6;
circle(20, dotY, dotR, 0xFF, 0x5F, 0x57); // red
circle(40, dotY, dotR, 0xFF, 0xBD, 0x2E); // yellow
circle(60, dotY, dotR, 0x28, 0xC8, 0x40); // green

// Title text in titlebar — 3×5 tiny pixel font for "brunnfeld.sh"
const TINY = {
  a:[0b010,0b101,0b111,0b101,0b101],
  b:[0b110,0b101,0b110,0b101,0b110],
  c:[0b011,0b100,0b100,0b100,0b011],
  d:[0b110,0b101,0b101,0b101,0b110],
  e:[0b111,0b100,0b110,0b100,0b111],
  f:[0b111,0b100,0b110,0b100,0b100],
  g:[0b011,0b100,0b101,0b101,0b011],
  h:[0b101,0b101,0b111,0b101,0b101],
  i:[0b111,0b010,0b010,0b010,0b111],
  j:[0b111,0b001,0b001,0b101,0b010],
  k:[0b101,0b110,0b100,0b110,0b101],
  l:[0b100,0b100,0b100,0b100,0b111],
  m:[0b101,0b111,0b101,0b101,0b101],
  n:[0b110,0b101,0b101,0b101,0b101],
  o:[0b010,0b101,0b101,0b101,0b010],
  p:[0b110,0b101,0b110,0b100,0b100],
  r:[0b110,0b101,0b110,0b101,0b101],
  s:[0b011,0b100,0b010,0b001,0b110],
  t:[0b111,0b010,0b010,0b010,0b010],
  u:[0b101,0b101,0b101,0b101,0b011],
  '.': [0b000,0b000,0b000,0b000,0b010],
};
const titleStr = 'brunnfeld.sh';
const TS = 2; // scale
const TW = 4 * TS, TH = 5 * TS, TGAP = TS;
const titlePxW = titleStr.length * (TW + TGAP) - TGAP;
const titleX = Math.floor((W - titlePxW) / 2);
const titleY = Math.floor((TITLEBAR_H - TH) / 2);
for (let ci = 0; ci < titleStr.length; ci++) {
  const g = TINY[titleStr[ci]];
  if (!g) continue;
  const cx = titleX + ci * (TW + TGAP);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (!((g[row] >> (2 - col)) & 1)) continue;
      for (let dy = 0; dy < TS; dy++)
        for (let dx = 0; dx < TS; dx++)
          set(cx + col*TS + dx, titleY + row*TS + dy, 0x99, 0x99, 0x99);
    }
  }
}

// ─── Terminal body background — subtle scanline ──────────────────────────────
for (let y = TITLEBAR_H + 1; y < H; y++) {
  const even = (y % 2 === 0);
  for (let x = 0; x < W; x++) {
    set(x, y, even ? 0x10 : 0x0a, even ? 0x10 : 0x0a, even ? 0x10 : 0x0a);
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

const S   = 16;          // pixel scale
const CW  = 5, CH = 7;  // glyph cell
const GAP = 2;
const TEXT = 'BRUNNFELD';

const totalW = TEXT.length * (CW + GAP) * S - GAP * S;
const startX = Math.floor((W - totalW) / 2);
const bodyH  = H - TITLEBAR_H - 1;
const startY = TITLEBAR_H + 1 + Math.floor((bodyH - CH * S) / 2);

// ── Glow pass ────────────────────────────────────────────────────────────────
const GLOW = 12;
for (let ci = 0; ci < TEXT.length; ci++) {
  const g = G[TEXT[ci]];
  if (!g) continue;
  const cx = startX + ci * (CW + GAP) * S;
  for (let row = 0; row < CH; row++) {
    const t = row / (CH - 1);
    const gr = Math.round((80 + (1-t)*100) * 0.20);
    const gg = Math.round((30 + (1-t)*70 ) * 0.16);
    for (let col = 0; col < CW; col++) {
      if (!((g[row] >> (CW - 1 - col)) & 1)) continue;
      for (let dy = -GLOW; dy < S + GLOW; dy++) {
        for (let dx = -GLOW; dx < S + GLOW; dx++) {
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

// ── Crisp text ───────────────────────────────────────────────────────────────
for (let ci = 0; ci < TEXT.length; ci++) {
  const g = G[TEXT[ci]];
  if (!g) continue;
  const cx = startX + ci * (CW + GAP) * S;
  for (let row = 0; row < CH; row++) {
    const t = row / (CH - 1);
    const r  = Math.round(255 - 116 * t);
    const gr = Math.round(215 - 146 * t);
    const b  = Math.round(       19 * t);
    for (let col = 0; col < CW; col++) {
      if (!((g[row] >> (CW - 1 - col)) & 1)) continue;
      for (let dy = 0; dy < S; dy++) {
        for (let dx = 0; dx < S; dx++) {
          const rr = (dy === 0 && dx > 0 && dx < S-1) ? Math.min(255, r+30) : r;
          const gg = (dy === 0 && dx > 0 && dx < S-1) ? Math.min(255, gr+20) : gr;
          set(cx + col*S + dx, startY + row*S + dy, rr, gg, b);
        }
      }
    }
  }
}

// ── Cursor block after last character ────────────────────────────────────────
const cursorX = startX + TEXT.length * (CW + GAP) * S + GAP * S;
const cursorW = CW * S - 2;
const cursorY = startY + (CH - 1) * S;          // bottom row of text
for (let dy = 0; dy < S; dy++)
  for (let dx = 0; dx < cursorW; dx++)
    set(cursorX + dx, cursorY + dy, 0xFF, 0xD7, 0x00);

// ── Decorative lines ─────────────────────────────────────────────────────────
const lineTop = startY - Math.round(S * 0.8);
const lineBtm = startY + CH * S + Math.round(S * 0.4);
for (let x = startX; x < startX + totalW + cursorW + GAP * S; x++) {
  const t = (x - startX) / (totalW + cursorW);
  const lr = Math.round(180 - 60 * t);
  const lg = Math.round(100 - 40 * t);
  set(x, lineTop,     lr, lg, 0);
  set(x, lineTop + 1, Math.round(lr*0.5), Math.round(lg*0.5), 0);
  set(x, lineBtm,     lr, lg, 0);
  set(x, lineBtm + 1, Math.round(lr*0.5), Math.round(lg*0.5), 0);
}

// ── Bottom prompt line ─────────────────────────────────────────────────────
// ">_" caret drawn at bottom of terminal
const promptY = lineBtm + Math.round(S * 0.6);
const PS = 8;  // prompt pixel scale
const CARET = [0b10000, 0b11000, 0b11100, 0b11110, 0b11100, 0b11000, 0b10000]; // ">" arrow
for (let row = 0; row < 7; row++) {
  for (let col = 0; col < 5; col++) {
    if (!((CARET[row] >> (4 - col)) & 1)) continue;
    for (let dy = 0; dy < PS; dy++)
      for (let dx = 0; dx < PS; dx++)
        set(startX + col*PS + dx, promptY + row*PS + dy, 0xFF, 0xD7, 0x00);
  }
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
ihdr[8] = 8; ihdr[9] = 2;

const out = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const dest = path.join(__dirname, '..', 'banner.png');
fs.writeFileSync(dest, out);
console.log(`banner.png written (${out.length} bytes, ${W}×${H})`);
