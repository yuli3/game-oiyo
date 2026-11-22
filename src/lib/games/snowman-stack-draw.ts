// Canvas renderer for Snowman Stack. Pure drawing: reads the game state, never changes it.
import { GROUND_SPRING, HAT, PLAT_Y, WORLD_H, WORLD_W, pieceAngle, tilt, trolleyX, trolleyY, windAt, type Game, type Piece } from "./snowman-stack";

const SKIES: Record<string, [string, string]> = {
  field: ["#9cc9f0", "#e8f4ff"],
  stump: ["#f6b38a", "#fde6c8"],
  ice: ["#1d2b55", "#4b5f9e"],
};

/** Deterministic snowflakes drifting with the wind. */
function snow(ctx: CanvasRenderingContext2D, g: Game, now: number): void {
  const wind = windAt(g);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 60; i++) {
    const speed = 18 + (i % 7) * 6;
    const y = ((i * 97 + (now / 1000) * speed) % (WORLD_H + 20)) - 10;
    const drift = (now / 1000) * (wind * 160 + 6) + Math.sin(now / 900 + i) * 10;
    const x = (((i * 53 + drift) % WORLD_W) + WORLD_W) % WORLD_W;
    const r = 1 + (i % 3) * 0.7;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function backdrop(ctx: CanvasRenderingContext2D, g: Game): void {
  const [top, bottom] = SKIES[g.plan.ground];
  const sky = ctx.createLinearGradient(0, 0, 0, PLAT_Y);
  sky.addColorStop(0, top);
  sky.addColorStop(1, bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  if (g.plan.ground === "ice") {
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.arc(380, 90, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d2b55";
    ctx.beginPath();
    ctx.arc(392, 82, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  // far hills with a village glow
  ctx.fillStyle = g.plan.ground === "ice" ? "#2d3d73" : "#d7e6f3";
  ctx.beginPath();
  ctx.moveTo(0, PLAT_Y - 40);
  for (let x = 0; x <= WORLD_W; x += 30) ctx.lineTo(x, PLAT_Y - 90 - Math.sin(x / 70) * 26 - Math.cos(x / 31) * 8);
  ctx.lineTo(WORLD_W, PLAT_Y);
  ctx.lineTo(0, PLAT_Y);
  ctx.fill();
  ctx.fillStyle = g.plan.ground === "ice" ? "#fcd34d" : "#f59e0b";
  for (let i = 0; i < 9; i++) ctx.fillRect(30 + i * 48 + (i % 2) * 9, PLAT_Y - 70 + (i % 3) * 6, 4, 4);
  // ground snow
  ctx.fillStyle = "#f8fbff";
  ctx.fillRect(0, PLAT_Y + 26, WORLD_W, WORLD_H - PLAT_Y);
}

function platform(ctx: CanvasRenderingContext2D, g: Game): void {
  const w = g.plan.platformW;
  const x = WORLD_W / 2 - w / 2;
  if (g.plan.ground === "stump") {
    ctx.fillStyle = "#7c4a24";
    ctx.fillRect(x, PLAT_Y, w, WORLD_H - PLAT_Y);
    ctx.fillStyle = "#c08552";
    ctx.beginPath();
    ctx.ellipse(WORLD_W / 2, PLAT_Y, w / 2, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 1.5;
    for (let r = 10; r < w / 2; r += 10) {
      ctx.beginPath();
      ctx.ellipse(WORLD_W / 2, PLAT_Y, r, r * 0.18, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (g.plan.ground === "ice") {
    const ice = ctx.createLinearGradient(x, PLAT_Y, x + w, PLAT_Y + 30);
    ice.addColorStop(0, "#bfe3f7");
    ice.addColorStop(1, "#7cc3e6");
    ctx.fillStyle = ice;
    ctx.beginPath();
    ctx.ellipse(WORLD_W / 2, PLAT_Y + 12, w / 2 + 20, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WORLD_W / 2 - 60, PLAT_Y + 8);
    ctx.lineTo(WORLD_W / 2 - 20, PLAT_Y + 14);
    ctx.moveTo(WORLD_W / 2 + 30, PLAT_Y + 6);
    ctx.lineTo(WORLD_W / 2 + 70, PLAT_Y + 12);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(WORLD_W / 2, PLAT_Y + 16, w / 2 + 30, 26, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#e3edf7";
    ctx.fillRect(0, PLAT_Y + 16, WORLD_W, 14);
  }
}

function ball(ctx: CanvasRenderingContext2D, r: number): void {
  const shade = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  shade.addColorStop(0, "#ffffff");
  shade.addColorStop(0.7, "#eef5fc");
  shade.addColorStop(1, "#c9d9ea");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,150,185,0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function face(ctx: CanvasRenderingContext2D, r: number, mood: "calm" | "happy" | "oops"): void {
  ctx.fillStyle = "#1f2937";
  for (const dx of [-0.3, 0.3]) {
    ctx.beginPath();
    ctx.arc(dx * r, -0.18 * r, Math.max(2.2, r * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
  // carrot nose
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(0, -0.02 * r);
  ctx.lineTo(r * 0.55, 0.06 * r);
  ctx.lineTo(0, 0.14 * r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.beginPath();
  if (mood === "oops") ctx.arc(0, 0.45 * r, r * 0.14, 0, Math.PI * 2);
  else ctx.arc(0, 0.22 * r, r * (mood === "happy" ? 0.36 : 0.26), 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
}

function hat(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#111827";
  ctx.fillRect(-HAT.w / 2 + 6, -HAT.h / 2, HAT.w - 12, HAT.h - 6);
  ctx.fillRect(-HAT.w / 2 - 4, HAT.h / 2 - 7, HAT.w + 8, 7);
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(-HAT.w / 2 + 6, HAT.h / 2 - 15, HAT.w - 12, 6);
}

function piece(ctx: CanvasRenderingContext2D, g: Game, p: Piece, role: "head" | "body" | "base" | "loose" | "hat", mood: "calm" | "happy" | "oops"): void {
  ctx.save();
  ctx.translate(p.body.position.x, p.body.position.y);
  ctx.rotate(pieceAngle(p));
  if (p.spec.kind === "hat") hat(ctx);
  else {
    const r = p.spec.r;
    ball(ctx, r);
    if (role === "head") face(ctx, r, mood);
    if (role === "body") {
      ctx.fillStyle = "#1f2937";
      for (const dy of [-0.35, 0, 0.35]) {
        ctx.beginPath();
        ctx.arc(0, dy * r, Math.max(2, r * 0.07), 0, Math.PI * 2);
        ctx.fill();
      }
      // twig arms
      ctx.strokeStyle = "#6b4423";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.1);
      ctx.lineTo(-r * 1.6, -r * 0.55);
      ctx.moveTo(-r * 1.35, -r * 0.4);
      ctx.lineTo(-r * 1.45, -r * 0.75);
      ctx.moveTo(r * 0.9, -r * 0.1);
      ctx.lineTo(r * 1.6, -r * 0.6);
      ctx.stroke();
    }
  }
  ctx.restore();
  void g;
}

export function drawScene(ctx: CanvasRenderingContext2D, g: Game, opts: { now: number; shake?: { x: number; y: number } }): void {
  ctx.save();
  if (opts.shake) ctx.translate(opts.shake.x, opts.shake.y);
  backdrop(ctx, g);
  snow(ctx, g, opts.now);
  platform(ctx, g);

  // rail + trolley with the next piece
  const ready = g.phase === "play" && g.next < g.plan.pieces.length;
  const tx = trolleyX(g);
  const ty = trolleyY(g);
  const railY = Math.max(24, ty - 60);
  ctx.strokeStyle = "#5b4636";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(WORLD_W / 2 - g.plan.amp - 40, railY);
  ctx.lineTo(WORLD_W / 2 + g.plan.amp + 40, railY);
  ctx.stroke();
  ctx.fillStyle = "#b91c1c";
  ctx.fillRect(tx - 16, railY - 9, 32, 16);
  if (ready) {
    const spec = g.plan.pieces[g.next];
    ctx.strokeStyle = "#78716c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, railY + 6);
    ctx.lineTo(tx, ty - (spec.kind === "hat" ? HAT.h / 2 : spec.r));
    ctx.stroke();
    // aim guide
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = "rgba(30,64,120,0.35)";
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx, PLAT_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(tx, ty);
    if (spec.kind === "hat") hat(ctx);
    else ball(ctx, spec.r);
    ctx.restore();
  }

  // pieces: the highest stuck ball is the head, the one under it gets buttons and arms
  const stuck = g.pieces.filter((p, i) => (i === 0 ? !!g.pivot : !!p.stuckTo) && p.spec.kind === "ball");
  const head = stuck[stuck.length - 1];
  const chest = stuck.length > 1 ? stuck[stuck.length - 2] : null;
  const mood = g.phase === "won" ? "happy" : g.phase === "lost" ? "oops" : "calm";
  for (const p of g.pieces) {
    const role = p.spec.kind === "hat" ? "hat" : p === head ? "head" : p === chest ? "body" : "base";
    piece(ctx, g, p, role, mood);
  }

  // tilt meter
  if (g.pivot && g.phase === "play") {
    const limit = GROUND_SPRING[g.plan.ground].tip;
    const ratio = Math.max(-1, Math.min(1, tilt(g) / limit));
    const mx = WORLD_W - 34;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(mx - 8, 120, 16, 200);
    ctx.fillStyle = Math.abs(ratio) > 0.7 ? "#dc2626" : Math.abs(ratio) > 0.4 ? "#f59e0b" : "#16a34a";
    const h = Math.abs(ratio) * 100;
    ctx.fillRect(mx - 6, ratio > 0 ? 220 - h : 220, 12, h);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(mx - 10, 219, 20, 2);
  }
  ctx.restore();
}
