// ─── Town Hall Interior Renderer ──────────────────────────────────────────

import type { AgentName } from "../types";
import type { MeetingState } from "../store";
import { AGENT_DISPLAY } from "../store";

// ─── Image loader ─────────────────────────────────────────────────────────

const imgCache = new Map<string, HTMLImageElement | "loading" | "error">();

function loadImg(url: string): HTMLImageElement | null {
  const hit = imgCache.get(url);
  if (hit && hit !== "loading" && hit !== "error") return hit as HTMLImageElement;
  if (hit === "loading" || hit === "error") return null;
  imgCache.set(url, "loading");
  const img = new Image();
  img.onload  = () => imgCache.set(url, img);
  img.onerror = () => imgCache.set(url, "error");
  img.src = url;
  return null;
}

// ─── Assets ───────────────────────────────────────────────────────────────

const BG_URL      = "/assets/interior/TownHall.png";
const UNITS_URL   = "/assets/interior/Units.png";
const WARRIOR_URL = "/assets/units/Warrior/Warrior_Idle.png";

// Warrior_Idle.png: 1536×192, 8 frames of 192×192
const WARRIOR_FRAME = 192;
const WARRIOR_FRAMES = 8;

// ─── Agent colours (for labels / fallback) ────────────────────────────────

const AGENT_COLORS: Record<AgentName, string> = {
  hans: "#e8c87a", ida: "#f4b8d4", konrad: "#a8d48a", ulrich: "#c8a84a",
  bertram: "#d4a870", gerda: "#d4d4a0", anselm: "#f0d890", volker: "#c84c4c",
  wulf: "#a07040", liesel: "#d878a8", sybille: "#80c8d8", friedrich: "#80a850",
  otto: "#a8a0c8", pater_markus: "#c8c8e8", dieter: "#909090", magda: "#e8b090",
  heinrich: "#d8c060", elke: "#e878b8", rupert: "#b0b0b0",
  player: "#ffd700",
};

// ─── Unit sprite ──────────────────────────────────────────────────────────
// Units.png: 16×16 px frames, 8 cols × 4 rows
// Row 0 = villager, Row 3 = noble (Otto)

const UNIT_SRC  = 16;
const UNIT_DISP = 24;

function drawUnit(
  ctx: CanvasRenderingContext2D,
  units: HTMLImageElement,
  cx: number, cy: number,
  isOtto: boolean,
  frameIndex: number,
): void {
  const col = Math.floor(frameIndex / 12) % 4;
  const row = isOtto ? 3 : 0;
  ctx.drawImage(
    units,
    col * UNIT_SRC, row * UNIT_SRC, UNIT_SRC, UNIT_SRC,
    Math.floor(cx - UNIT_DISP / 2),
    Math.floor(cy - UNIT_DISP),
    UNIT_DISP, UNIT_DISP,
  );
}

// ─── Seat layout in mockup-space (0–200) ──────────────────────────────────
// Matches the Mockup-3 throne room: benches left+right of the center carpet

const SEAT_COLS_MX = [
  // left side (inner → outer)
  68, 52, 36,
  // right side (inner → outer)
  132, 148, 164,
];
const SEAT_ROW_MY = [76, 100, 124, 148];

function getSeatPositions(
  bgX: number, bgY: number, bgScale: number,
): Array<{ x: number; y: number }> {
  const seats: Array<{ x: number; y: number }> = [];
  for (const my of SEAT_ROW_MY) {
    for (const mx of SEAT_COLS_MX) {
      seats.push({ x: bgX + mx * bgScale, y: bgY + my * bgScale });
    }
  }
  return seats;
}

// ─── Main draw ────────────────────────────────────────────────────────────

export function drawInterior(
  ctx: CanvasRenderingContext2D,
  meeting: MeetingState,
  frameIndex: number,
): void {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const cx = W / 2;

  const bg    = loadImg(BG_URL);
  const units = loadImg(UNITS_URL);

  const warrior = loadImg(WARRIOR_URL);

  // ── 1. Background — zoomed-in, top-anchored ───────────────────
  ctx.fillStyle = "#12111e";
  ctx.fillRect(0, 0, W, H);

  const BG_SIZE = 200;
  // 1.2× zoom: clips bottom edge slightly, keeps throne at top visible
  const bgScale = Math.min(W / BG_SIZE, H / BG_SIZE) * 1.2;
  const bgW = BG_SIZE * bgScale;
  const bgH = BG_SIZE * bgScale;
  const bgX = (W - bgW) / 2;          // centre horizontally
  const bgY = Math.max(0, (H - bgH) / 2); // anchor top, never clip throne

  if (bg) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bg, bgX, bgY, bgW, bgH);
  }

  // Helper: convert mockup-space coords (0-200) to canvas coords
  const mc = (mx: number, my: number) => ({
    x: bgX + mx * bgScale,
    y: bgY + my * bgScale,
  });

  // ── 2. Otto on the throne ─────────────────────────────────────
  const ottoPos = mc(100, 90);
  const DISP = 64;

  if (warrior) {
    const frame = Math.floor(frameIndex / 10) % WARRIOR_FRAMES;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      warrior,
      frame * WARRIOR_FRAME, 0, WARRIOR_FRAME, WARRIOR_FRAME,
      ottoPos.x - DISP / 2, ottoPos.y - DISP, DISP, DISP,
    );
  } else {
    ctx.fillStyle = AGENT_COLORS["otto"];
    ctx.beginPath();
    ctx.arc(ottoPos.x, ottoPos.y - 8, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillText("★ Otto ★", ottoPos.x, ottoPos.y + 6);

  // ── 3. Attendees in pew positions ─────────────────────────────
  const seats = getSeatPositions(bgX, bgY, bgScale);
  const nonOtto = meeting.attendees.filter(a => a !== "otto");

  for (let i = 0; i < nonOtto.length; i++) {
    const agent = nonOtto[i]!;
    const seat  = seats[i];
    if (!seat) continue;
    const { x, y } = seat;

    if (units) {
      drawUnit(ctx, units, x, y, false, frameIndex);
    } else {
      ctx.fillStyle = AGENT_COLORS[agent] ?? "#888";
      ctx.beginPath();
      ctx.arc(x, y - 8, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = "8px monospace";
    ctx.fillStyle = "#f0e8c8";
    ctx.textAlign = "center";
    ctx.fillText(AGENT_DISPLAY[agent]?.split(" ")[0] ?? agent, x, y + 5);

    // Vote badge
    if (meeting.phase === "vote" || meeting.phase === "result") {
      const vote = meeting.votes[agent];
      if (vote === "agree") {
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(x + 10, y - 20, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px monospace";
        ctx.fillText("✓", x + 10, y - 17);
      } else if (vote === "disagree") {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(x + 10, y - 20, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px monospace";
        ctx.fillText("✗", x + 10, y - 17);
      } else {
        ctx.fillStyle = "#4b5563";
        ctx.beginPath();
        ctx.arc(x + 10, y - 20, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── 4. Vote tally bar ─────────────────────────────────────────
  if (meeting.phase === "vote" || meeting.phase === "result") {
    const agreeCount    = Object.values(meeting.votes).filter(v => v === "agree").length;
    const disagreeCount = Object.values(meeting.votes).filter(v => v === "disagree").length;
    const remaining     = 19 - agreeCount - disagreeCount;

    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(32, H - 44, W - 64, 32);
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#22c55e";
    ctx.fillText(`${agreeCount} agree`, cx - 110, H - 22);
    ctx.fillStyle = "#6b7280";
    ctx.fillText("|", cx - 30, H - 22);
    ctx.fillStyle = "#ef4444";
    ctx.fillText(`${disagreeCount} disagree`, cx + 50, H - 22);
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(`| ${remaining} pending (need 11)`, cx + 170, H - 22);
  }

  // ── 5. Result overlay ─────────────────────────────────────────
  if (meeting.phase === "result" && meeting.result) {
    const passed = meeting.result.passed;
    ctx.fillStyle = passed ? "rgba(0,70,0,0.88)" : "rgba(70,0,0,0.88)";
    ctx.fillRect(48, H / 2 - 56, W - 96, 112);
    ctx.strokeStyle = passed ? "#22c55e" : "#ef4444";
    ctx.lineWidth = 2;
    ctx.strokeRect(48, H / 2 - 56, W - 96, 112);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px monospace";
    ctx.textAlign = "center";
    ctx.fillText(passed ? "⚖ LAW PASSED" : "✗ VOTE FAILED", cx, H / 2 - 20);

    ctx.font = "12px monospace";
    ctx.fillStyle = "#e5e7eb";
    const desc  = meeting.proposal ?? meeting.description;
    const words = desc.split(" ");
    let line = "";
    let lineY = H / 2 + 4;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (test.length > 54 && line) {
        ctx.fillText(line, cx, lineY);
        line  = word;
        lineY += 18;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, cx, lineY);

    ctx.fillStyle = passed ? "#86efac" : "#fca5a5";
    ctx.font = "11px monospace";
    ctx.fillText(`${meeting.result.agreeCount} agreed of 11 needed`, cx, H / 2 + 44);
  }
}
