/** Uniform-cell sprite sheets. No divider lines. Engine state stays elsewhere. */

export interface SpriteSheetSpec {
  cols: number;
  rows: number;
  frameCount: number;
  fps: number;
  loop: boolean;
}

export function sheetCell(
  spec: SpriteSheetSpec,
  frame: number,
  imageWidth: number,
  imageHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const cols = Math.max(1, spec.cols);
  const rows = Math.max(1, spec.rows);
  const sw = imageWidth / cols;
  const sh = imageHeight / rows;
  const last = Math.max(0, spec.frameCount - 1);
  const i = Math.min(last, Math.max(0, Math.trunc(frame)));
  const col = i % cols;
  const row = Math.min(rows - 1, Math.floor(i / cols));
  return { sx: col * sw, sy: row * sh, sw, sh };
}

export function sheetFrameIndex(
  spec: SpriteSheetSpec,
  elapsedMs: number,
  reducedMotion = false,
): number {
  if (reducedMotion || spec.frameCount <= 1) return 0;
  const raw = Math.floor((Math.max(0, elapsedMs) / 1000) * spec.fps);
  if (spec.loop) {
    const n = spec.frameCount;
    return ((raw % n) + n) % n;
  }
  return Math.min(spec.frameCount - 1, raw);
}

export function blitSheetFrame(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { complete?: boolean; naturalWidth?: number; naturalHeight?: number },
  spec: SpriteSheetSpec,
  frame: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): boolean {
  if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement && (!image.complete || image.naturalWidth === 0)) return false;
  const width = "naturalWidth" in image && typeof image.naturalWidth === "number" && image.naturalWidth > 0
    ? image.naturalWidth
    : 0;
  const height = "naturalHeight" in image && typeof image.naturalHeight === "number" && image.naturalHeight > 0
    ? image.naturalHeight
    : 0;
  if (width === 0 || height === 0) return false;
  const cell = sheetCell(spec, frame, width, height);
  ctx.drawImage(image, cell.sx, cell.sy, cell.sw, cell.sh, dx, dy, dw, dh);
  return true;
}
