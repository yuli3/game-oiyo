/**
 * @file share-card.ts
 * @description Pillar 3: Retention & Viral Dynamic Canvas Share Card Engine.
 * Generates premium 600x600 social snapshot cards (Instagram/X/Discord/Kakao)
 * with studio badges, neon score typography, seed challenge hash, and tier ratings.
 */

export interface ShareCardOptions {
  title: string;
  subtitle?: string;
  score: number | string;
  bestScore?: number | string;
  slug: string;
  seedCode?: string;
  durationSeconds?: number;
  locale?: string;
  customStats?: Array<{ label: string; value: string | number }>;
}

/**
 * Formats numeric score with comma delimiters.
 */
export function formatCardScore(val: number | string): string {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (!Number.isFinite(num)) return "0";
  return Math.floor(num).toLocaleString();
}

/**
 * Resolves player skill tier based on game slug and achieved score.
 */
export function resolveRankTier(slug: string, score: number): string {
  if (slug === "snake-game") {
    if (score >= 300) return "LEGEND";
    if (score >= 200) return "MASTER";
    if (score >= 100) return "ACE";
    return "ROOKIE";
  }
  if (slug === "block-burst") {
    if (score >= 5000) return "GRANDMASTER";
    if (score >= 3000) return "ARCHITECT";
    if (score >= 1000) return "STACKER";
    return "APPRENTICE";
  }
  if (slug === "cosmic-merge") {
    if (score >= 10000) return "GODLIKE";
    if (score >= 5000) return "SUPERNOVA";
    if (score >= 2000) return "PULSAR";
    return "ASTEROID";
  }
  if (slug === "game-2048") {
    if (score >= 2048) return "MASTER";
    if (score >= 1024) return "EXPERT";
    if (score >= 512) return "APPRENTICE";
    return "NOVICE";
  }
  if (slug === "wordle") {
    if (score === 1) return "LUCKY GENIUS";
    if (score <= 3) return "GENIUS";
    if (score <= 4) return "MASTER";
    if (score <= 5) return "SHARP";
    return "SOLVER";
  }
  if (slug === "sudoku") {
    if (score <= 180) return "GRANDMASTER";
    if (score <= 300) return "MASTER";
    if (score <= 600) return "EXPERT";
    return "LOGICIAN";
  }
  if (slug === "minesweeper") {
    if (score <= 20) return "DEMOLITIONIST";
    if (score <= 60) return "SAPPER";
    if (score <= 120) return "EXPERT";
    return "SWEEPER";
  }
  if (score >= 1000) return "CHAMPION";
  if (score >= 500) return "VETERAN";
  return "PLAYER";
}

/**
 * Renders the full 600x600 social card onto a 2D canvas rendering context.
 */
export function renderShareCardToContext(
  ctx: CanvasRenderingContext2D,
  options: ShareCardOptions
): void {
  const {
    title,
    subtitle = "OIYO ARCADE STUDIOS",
    score,
    bestScore,
    slug,
    seedCode,
    durationSeconds,
    customStats = [],
  } = options;

  const width = 600;
  const height = 600;

  // 1. Deep Space Dark Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#080b14");
  bgGrad.addColorStop(0.5, "#0f172a");
  bgGrad.addColorStop(1, "#020617");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Neon Grid & Ambient Glow
  ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Radial highlight in center-top
  const glow = ctx.createRadialGradient(
    width / 2,
    180,
    10,
    width / 2,
    180,
    280
  );
  glow.addColorStop(0, "rgba(59, 130, 246, 0.15)");
  glow.addColorStop(1, "rgba(59, 130, 246, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // 3. Card Border Frame (Neon Bevel)
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // 4. Header: Studio Brand & Badge
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("✦ OIYO ARCADE STUDIOS ✦", width / 2, 54);

  // 5. Game Title & Subtitle
  ctx.font = "900 28px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(title.toUpperCase(), width / 2, 94);

  ctx.font = "600 12px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(subtitle.toUpperCase(), width / 2, 122);

  // 6. Center Stage: Score Display Box
  const numScore =
    typeof score === "number" ? score : parseFloat(score) || 0;
  const tier = resolveRankTier(slug, numScore);

  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
  ctx.lineWidth = 2;
  const boxX = 60;
  const boxY = 150;
  const boxW = 480;
  const boxH = 170;

  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 16);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);
  }

  // Tier Badge inside Box
  ctx.font = "900 11px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(`★ RANK TIER : ${tier} ★`, width / 2, boxY + 28);

  // Main Neon Score Number
  ctx.font = "900 56px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(formatCardScore(score), width / 2, boxY + 84);

  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("FINAL SCORE ACHIEVED", width / 2, boxY + 132);

  // 7. Stats Grid (Best Score, Seed, Time)
  const statY = 360;
  const statsList: Array<{ label: string; val: string }> = [];

  if (bestScore !== undefined) {
    statsList.push({ label: "BEST", val: formatCardScore(bestScore) });
  }
  if (seedCode) {
    statsList.push({ label: "SEED HASH", val: `#${seedCode}` });
  }
  if (durationSeconds !== undefined && durationSeconds > 0) {
    const min = Math.floor(durationSeconds / 60);
    const sec = durationSeconds % 60;
    statsList.push({
      label: "TIME",
      val: `${min}:${sec < 10 ? "0" : ""}${sec}`,
    });
  }
  for (const cs of customStats.slice(0, 2)) {
    statsList.push({ label: cs.label.toUpperCase(), val: String(cs.value) });
  }

  const statCols = Math.min(3, Math.max(1, statsList.length));
  const colWidth = 480 / statCols;

  for (let i = 0; i < statsList.length && i < 3; i++) {
    const cx = 60 + i * colWidth + colWidth / 2;
    ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(statsList[i].label, cx, statY);

    ctx.font = "900 16px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(statsList[i].val, cx, statY + 24);
  }

  // 8. Challenge Callout Box
  const calloutY = 440;
  ctx.fillStyle = "rgba(30, 41, 59, 0.6)";
  ctx.fillRect(60, calloutY, 480, 58);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
  ctx.strokeRect(60, calloutY, 480, 58);

  ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#f1f5f9";
  ctx.fillText("⚡ CAN YOU BEAT MY SCORE? ⚡", width / 2, calloutY + 24);

  ctx.font = "600 11px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("Challenge me on the exact same puzzle seed!", width / 2, calloutY + 44);

  // 9. Footer Watermark
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText("PLAY FREE AT GAME.OIYO.NET", width / 2, 545);
}

/**
 * Creates an offscreen 600x600 canvas and renders the card.
 */
export function createShareCardCanvas(options: ShareCardOptions): HTMLCanvasElement {
  if (typeof document === "undefined") {
    throw new Error("createShareCardCanvas requires a DOM document environment");
  }

  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to obtain 2D canvas context");
  }

  renderShareCardToContext(ctx, options);
  return canvas;
}

/**
 * Copies the canvas image directly to the system clipboard (PNG).
 * Returns true on success, false if blocked or unsupported.
 */
export async function copyShareCardToClipboard(
  canvas: HTMLCanvasElement
): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof ClipboardItem === "undefined"
  ) {
    return false;
  }

  try {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) return false;

    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Triggers a file download of the share card.
 */
export function downloadShareCard(
  canvas: HTMLCanvasElement,
  filename = "oiyo-arcade-result.png"
): void {
  if (typeof document === "undefined") return;

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Native Web Share API caller (with image file attachment if supported).
 */
export async function shareShareCard(
  canvas: HTMLCanvasElement,
  shareData: { title: string; text: string; url?: string }
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return false;
  }

  try {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    if (blob && navigator.canShare) {
      const file = new File([blob], "game-result.png", { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          ...shareData,
          files: [file],
        });
        return true;
      }
    }

    await navigator.share(shareData);
    return true;
  } catch {
    return false;
  }
}
