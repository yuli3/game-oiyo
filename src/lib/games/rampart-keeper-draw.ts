// Canvas painter for Rampart Keeper. All art is drawn here (no image files), so the
// physics bodies and what you see always line up.
import type Matter from "matter-js";
import { BLOCKS, COLUMN_X, GATE_X, GROUND_Y, INVADERS, WORLD_H, WORLD_W, type BlockKind, type Era, type InvaderKind, type Siege } from "./rampart-keeper";

const SKY: Record<Era, [string, string]> = {
  0: ["#f7c59f", "#fbe7c6"], // dawn over the mountain fortress
  1: ["#7f5a83", "#f6a77f"], // dusk at the earthen rampart
  2: ["#141c3a", "#3b3f6b"], // night at the walled town
};
const HILL: Record<Era, string> = { 0: "#8fb98b", 1: "#7a6a5c", 2: "#262b47" };
const TUNIC: Record<Era, string> = { 0: "#3d5a80", 1: "#6a994e", 2: "#7b2cbf" };

export function drawScene(ctx: CanvasRenderingContext2D, s: Siege, opts: { aimX: number | null; column: number | null; now: number }): void {
  const era = s.plan.era;
  const [top, bottom] = SKY[era];
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  if (era === 2) {
    ctx.fillStyle = "#fdf0c4";
    for (let i = 0; i < 26; i++) ctx.fillRect((i * 97) % WORLD_W, (i * 53) % 180, 2, 2);
    ctx.beginPath();
    ctx.arc(660, 70, 26, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = era === 0 ? "#fff3d6" : "#ffd29d";
    ctx.beginPath();
    ctx.arc(640, era === 0 ? 110 : 150, 34, 0, Math.PI * 2);
    ctx.fill();
  }
  // far hills
  ctx.fillStyle = HILL[era];
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= WORLD_W; x += 40) ctx.lineTo(x, GROUND_Y - 70 - Math.sin(x / 90) * 30 - Math.cos(x / 37) * 10);
  ctx.lineTo(WORLD_W, GROUND_Y);
  ctx.fill();
  // ground
  ctx.fillStyle = era === 2 ? "#3a3326" : "#7c5b3a";
  ctx.fillRect(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y);
  ctx.fillStyle = era === 2 ? "#4b5b3a" : "#6f9a4b";
  ctx.fillRect(0, GROUND_Y, WORLD_W, 6);

  drawWall(ctx, s, era);

  // build zone hint
  if (s.phase === "build") {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(COLUMN_X[0] - 15, 120, COLUMN_X[COLUMN_X.length - 1] - COLUMN_X[0] + 30, GROUND_Y - 120);
    COLUMN_X.forEach((x, i) => {
      ctx.fillStyle = i === opts.column ? "rgba(255,210,80,0.55)" : "rgba(255,255,255,0.22)";
      ctx.fillRect(x - 13, GROUND_Y - 4, 26, 4);
    });
  }

  for (const b of s.blocks) drawBlock(ctx, b.kind, b.body, b.hp / BLOCKS[b.kind].hp, era);
  for (const inv of s.invaders) {
    if (!s.engine.world.bodies.includes(inv.body)) continue;
    drawInvader(ctx, inv.kind, inv.body, era, inv.out, opts.now);
  }
  for (const boulder of s.boulders) drawBoulder(ctx, boulder);
  for (const blast of s.blasts) {
    const t = (s.time - blast.at) / 600;
    ctx.fillStyle = `rgba(255,${Math.round(180 - t * 120)},60,${0.8 - t * 0.8})`;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, 20 + t * 70, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const br of s.breaks) {
    const t = (s.time - br.at) / 500;
    ctx.fillStyle = br.kind === "stone" ? `rgba(120,120,130,${1 - t})` : `rgba(160,110,60,${1 - t})`;
    for (let i = 0; i < 6; i++) ctx.fillRect(br.x + Math.cos(i * 1.1) * t * 30, br.y + Math.sin(i * 1.7) * t * 20 + t * t * 30, 5, 5);
  }
  if (s.phase === "siege" && opts.aimX !== null) {
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(opts.aimX, 10);
    ctx.lineTo(opts.aimX, GROUND_Y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawWall(ctx: CanvasRenderingContext2D, s: Siege, era: Era): void {
  const stone = era === 1 ? "#a68a64" : era === 2 ? "#5c6378" : "#9a9a8e";
  ctx.fillStyle = stone;
  ctx.fillRect(0, GROUND_Y - 220, GATE_X, 220);
  for (let i = 0; i < 4; i++) ctx.fillRect(i * 22, GROUND_Y - 236, 14, 16);
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  for (let y = GROUND_Y - 200; y < GROUND_Y; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GATE_X, y);
    ctx.stroke();
  }
  // gate, darker as it takes damage
  const dmg = 1 - s.gateHp / 100;
  ctx.fillStyle = `rgb(${110 - dmg * 50},${60 - dmg * 30},${30 - dmg * 15})`;
  ctx.beginPath();
  ctx.moveTo(30, GROUND_Y);
  ctx.lineTo(30, GROUND_Y - 70);
  ctx.quadraticCurveTo(55, GROUND_Y - 100, GATE_X, GROUND_Y - 70);
  ctx.lineTo(GATE_X, GROUND_Y);
  ctx.fill();
  ctx.fillStyle = "#d4a017";
  ctx.fillRect(GATE_X - 12, GROUND_Y - 40, 6, 6);
  // banner
  ctx.fillStyle = era === 0 ? "#c1121f" : era === 1 ? "#1d3557" : "#e9c46a";
  ctx.fillRect(40, GROUND_Y - 290, 3, 60);
  ctx.beginPath();
  ctx.moveTo(43, GROUND_Y - 290);
  ctx.lineTo(78, GROUND_Y - 280);
  ctx.lineTo(43, GROUND_Y - 268);
  ctx.fill();
  if (era === 2) {
    ctx.fillStyle = "rgba(255,190,80,0.9)";
    ctx.beginPath();
    ctx.arc(70, GROUND_Y - 150, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function withBody(ctx: CanvasRenderingContext2D, body: Matter.Body, draw: () => void): void {
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  draw();
  ctx.restore();
}

function drawBlock(ctx: CanvasRenderingContext2D, kind: BlockKind, body: Matter.Body, health: number, era: Era): void {
  const { w, h } = BLOCKS[kind];
  withBody(ctx, body, () => {
    if (kind === "stone") {
      ctx.fillStyle = era === 2 ? "#7d8597" : "#a9a9a0";
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(-w / 2, -h / 2, w, 4);
    } else {
      ctx.fillStyle = kind === "beam" ? "#8d5524" : "#c68642";
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = "rgba(60,30,10,0.4)";
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 2 + (h * i) / 3);
        ctx.lineTo(w / 2, -h / 2 + (h * i) / 3);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    if (health < 0.66) {
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.moveTo(-w / 4, -h / 2);
      ctx.lineTo(0, 0);
      ctx.lineTo(-w / 6, h / 2);
      if (health < 0.33) {
        ctx.moveTo(w / 2, -h / 4);
        ctx.lineTo(0, 0);
      }
      ctx.stroke();
    }
  });
}

function drawInvader(ctx: CanvasRenderingContext2D, kind: InvaderKind, body: Matter.Body, era: Era, out: boolean, now: number): void {
  const { w, h } = INVADERS[kind];
  const bob = out ? 0 : Math.sin(now / 90 + body.id) * 1.5;
  withBody(ctx, body, () => {
    ctx.globalAlpha = out ? 0.75 : 1;
    if (kind === "ram") {
      ctx.fillStyle = "#6b4226";
      ctx.fillRect(-w / 2, -h / 2 + 4, w, h - 12);
      ctx.fillStyle = "#3e2a1a";
      ctx.beginPath();
      ctx.arc(-w / 2, -h / 2 + 4 + (h - 12) / 2, (h - 12) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#222";
      for (const x of [-w / 4, w / 4]) {
        ctx.beginPath();
        ctx.arc(x, h / 2 - 6, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = TUNIC[era];
      ctx.fillRect(w / 6, -h / 2 - 10, 10, 14);
    } else if (kind === "bomb") {
      ctx.fillStyle = "#5c4033";
      ctx.fillRect(-w / 2, 0, w, h / 2 - 4);
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(0, -2, w / 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = Math.floor(now / 120) % 2 ? "#ffb703" : "#fb8500";
      ctx.fillRect(4, -h / 2 - 4, 4, 6);
      ctx.fillStyle = "#111";
      for (const x of [-w / 3, w / 3]) {
        ctx.beginPath();
        ctx.arc(x, h / 2 - 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const big = kind === "giant";
      // legs
      ctx.fillStyle = "#3b2f2f";
      ctx.fillRect(-w / 3, h / 4 + bob, w / 4, h / 4 - bob);
      ctx.fillRect(w / 12, h / 4 - bob, w / 4, h / 4 + bob);
      // body
      ctx.fillStyle = big ? "#8b5e34" : TUNIC[era];
      ctx.fillRect(-w / 2, -h / 6, w, h / 2.4);
      // head
      ctx.fillStyle = "#f1c27d";
      ctx.beginPath();
      ctx.arc(0, -h / 3, big ? w / 2.6 : w / 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.fillRect(-w / 5, -h / 3 - 2, 3, 3);
      // helmet
      ctx.fillStyle = big ? "#4a4e69" : "#2b2d42";
      ctx.beginPath();
      ctx.arc(0, -h / 3 - 2, big ? w / 2.5 : w / 2.1, Math.PI, 0);
      ctx.fill();
      if (out) {
        ctx.strokeStyle = "#111";
        ctx.beginPath();
        ctx.moveTo(-w / 4, -h / 3 - 4);
        ctx.lineTo(-w / 8, -h / 3);
        ctx.moveTo(-w / 8, -h / 3 - 4);
        ctx.lineTo(-w / 4, -h / 3);
        ctx.stroke();
      }
      if (kind === "shield") {
        ctx.fillStyle = "#c9a227";
        ctx.fillRect(-w / 2 - 4, -h / 6, 8, h / 2.2);
      }
      if (big) {
        ctx.fillStyle = "#5e3c1a";
        ctx.fillRect(-w / 2 - 8, -h / 2, 6, h / 1.6);
      } else {
        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 8);
        ctx.lineTo(-w / 2 - 10, -h / 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  });
}

function drawBoulder(ctx: CanvasRenderingContext2D, body: Matter.Body): void {
  withBody(ctx, body, () => {
    const r = (body.bounds.max.x - body.bounds.min.x) / 2;
    ctx.fillStyle = "#6c6f73";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8d9096";
    ctx.beginPath();
    ctx.arc(-r / 3, -r / 3, r / 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3d3f42";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  });
}
