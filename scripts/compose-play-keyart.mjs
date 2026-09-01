#!/usr/bin/env node
/**
 * Compose 1200x630 text-free key art from in-game sprites so the social
 * image is the same medium as play, not a cinematic of another engine.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;
const pub = (...p) => resolve(root, "public", ...p);

async function layer(src, left, top, width, height) {
  const buf = await sharp(src)
    .ensureAlpha()
    .resize(Math.round(width), Math.round(height), {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  return { input: buf, left: Math.round(left), top: Math.round(top) };
}

async function canvas(bg, composites, out) {
  mkdirSync(dirname(out), { recursive: true });
  await sharp({
    create: { width: W, height: H, channels: 4, background: bg },
  })
    .composite(composites)
    .png()
    .toFile(out);
  const meta = await sharp(out).metadata();
  if (meta.width !== W || meta.height !== H) {
    throw new Error(`${out} is ${meta.width}x${meta.height}, need ${W}x${H}`);
  }
  console.log(out.replace(root + "/", ""), `${meta.width}x${meta.height}`);
}

async function starBlaster() {
  const s = pub("assets/sprites/star-blaster");
  await canvas(
    { r: 11, g: 16, b: 32, alpha: 1 },
    [
      await layer(`${s}/enemy-drone.png`, 250, 90, 140, 140),
      await layer(`${s}/enemy-warden.png`, 810, 110, 150, 150),
      await layer(`${s}/boss.png`, 510, 70, 180, 180),
      await layer(`${s}/burst.png`, 720, 200, 160, 160),
      await layer(`${s}/ship.png`, 470, 330, 260, 260),
    ],
    pub("games/star-blaster-social-play.png"),
  );
}

async function animalPop() {
  const a = pub("assets/sprites/animal-pop");
  const names = ["monkey", "cat", "pig", "mouse", "rabbit", "dog", "chick"];
  const comps = [];
  const size = 150;
  const gap = 148;
  const startX = (W - gap * 6 - size) / 2;
  for (let i = 0; i < names.length; i++) {
    const y = 240 + (i % 2 === 0 ? -28 : 28);
    comps.push(await layer(`${a}/${names[i]}.png`, startX + i * gap, y, size, size));
  }
  await canvas({ r: 237, g: 241, b: 223, alpha: 1 }, comps, pub("games/animal-pop-social-play.png"));
}

async function blockBurst() {
  const b = pub("assets/sprites/block-burst");
  const gems = ["gem-olive", "gem-amber", "gem-coral", "gem-teal", "gem-gold"];
  const comps = [];
  const size = 150;
  const startX = 210;
  for (let i = 0; i < gems.length; i++) {
    comps.push(await layer(`${b}/${gems[i]}.png`, startX + i * 156, 240, size, size));
  }
  comps.push(await layer(`${b}/burst.png`, 500, 80, 200, 200));
  await canvas({ r: 247, g: 241, b: 220, alpha: 1 }, comps, pub("games/block-burst-social-play.png"));
}

async function brickBreaker() {
  const b = pub("assets/sprites/brick-breaker");
  const comps = [];
  const hues = ["olive", "terracotta", "cream", "olive", "terracotta", "cream"];
  for (let i = 0; i < hues.length; i++) {
    comps.push(await layer(`${b}/brick-${hues[i]}.png`, 180 + i * 140, 120, 130, 70));
  }
  comps.push(await layer(`${b}/paddle.png`, 430, 480, 340, 70));
  comps.push(await layer(`${b}/ball.png`, 540, 300, 110, 110));
  await canvas({ r: 26, g: 36, b: 22, alpha: 1 }, comps, pub("games/brick-breaker-social-play.png"));
}

async function snake() {
  const s = pub("assets/sprites/snake");
  const comps = [];
  const size = 96;
  const y = 268;
  const start = 300;
  const step = 68;
  for (let i = 0; i < 5; i++) {
    comps.push(await layer(`${s}/body.png`, start + i * step, y, size, size));
  }
  comps.push(await layer(`${s}/head.png`, start + 5 * step - 8, y - 10, 118, 118));
  comps.push(await layer(`${s}/apple.png`, 820, 248, 128, 128));
  await canvas({ r: 232, g: 236, b: 228, alpha: 1 }, comps, pub("games/snake-game-social-play.png"));
}

async function jumpKing() {
  const j = pub("assets/sprites/dot-jumpking");
  await canvas(
    { r: 159, g: 212, b: 240, alpha: 1 },
    [
      await layer(`${j}/platform.png`, 360, 430, 480, 90),
      await layer(`${j}/jumper.png`, 500, 210, 200, 200),
    ],
    pub("games/dot-jumpking-social-play.png"),
  );
}

await starBlaster();
await animalPop();
await blockBurst();
await brickBreaker();
await snake();
await jumpKing();
