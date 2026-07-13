import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";

/* ────────────────────────────────────────────────────────────────────────────
 * Star Blaster — a mobile-first canvas space shooter. Drag (touch) or move the
 * mouse to steer; the ship auto-fires. Survive waves, rack up score, beat your
 * best. Self-contained (one component per game, all 6 locales inline, PB via
 * records.ts). No heavy engine — a lightweight requestAnimationFrame loop.
 * ────────────────────────────────────────────────────────────────────────── */

const W = 360;
const H = 540;
const GAME_KEY = "star-blaster";

type Phase = "menu" | "playing" | "over";
interface Vec { x: number; y: number }
interface Bullet extends Vec { }
interface Enemy extends Vec { r: number; vy: number; vx: number; hue: number }
interface Particle extends Vec { vx: number; vy: number; life: number; hue: number }

interface GS {
  shipX: number;
  targetX: number;
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  score: number;
  lives: number;
  wave: number;
  lastShot: number;
  lastSpawn: number;
  started: number;
}

type I18n = {
  title: string; subtitle: string; tapStart: string; controls: string;
  score: string; best: string; wave: string; lives: string;
  gameOver: string; restart: string; newBest: string;
};

const T: Record<Locale, I18n> = {
  ko: { title: "스타 블래스터", subtitle: "드래그로 조준, 자동 발사 — 웨이브를 버텨라", tapStart: "탭하여 시작", controls: "손가락(또는 마우스)으로 우주선을 좌우로 움직이세요. 발사는 자동입니다.", score: "점수", best: "최고", wave: "웨이브", lives: "생명", gameOver: "게임 오버", restart: "다시 하기", newBest: "🎉 신기록!" },
  en: { title: "Star Blaster", subtitle: "Drag to aim, auto-fire — survive the waves", tapStart: "Tap to start", controls: "Move the ship left/right with your finger (or mouse). Firing is automatic.", score: "Score", best: "Best", wave: "Wave", lives: "Lives", gameOver: "Game Over", restart: "Play again", newBest: "🎉 New best!" },
  ja: { title: "スターブラスター", subtitle: "ドラッグで狙い、自動発射 — ウェーブを耐えろ", tapStart: "タップで開始", controls: "指(またはマウス)で宇宙船を左右に動かします。発射は自動です。", score: "スコア", best: "ベスト", wave: "ウェーブ", lives: "残機", gameOver: "ゲームオーバー", restart: "もう一度", newBest: "🎉 新記録！" },
  fr: { title: "Star Blaster", subtitle: "Visez en glissant, tir auto — survivez aux vagues", tapStart: "Touchez pour commencer", controls: "Déplacez le vaisseau avec le doigt (ou la souris). Le tir est automatique.", score: "Score", best: "Record", wave: "Vague", lives: "Vies", gameOver: "Game Over", restart: "Rejouer", newBest: "🎉 Nouveau record !" },
  es: { title: "Star Blaster", subtitle: "Apunta arrastrando, disparo auto — sobrevive a las oleadas", tapStart: "Toca para empezar", controls: "Mueve la nave con el dedo (o el ratón). El disparo es automático.", score: "Puntos", best: "Récord", wave: "Oleada", lives: "Vidas", gameOver: "Fin del juego", restart: "Jugar de nuevo", newBest: "🎉 ¡Nuevo récord!" },
  zh: { title: "星际爆破", subtitle: "拖动瞄准，自动开火 — 挺过一波波敌人", tapStart: "点击开始", controls: "用手指(或鼠标)左右移动飞船。开火是自动的。", score: "得分", best: "最佳", wave: "波次", lives: "生命", gameOver: "游戏结束", restart: "再玩一次", newBest: "🎉 新纪录！" },
};

interface Props { locale: Locale }

const StarBlaster: React.FC<Props> = ({ locale }) => {
  const t = T[locale] ?? T.en;
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState<number>(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gsRef = useRef<GS | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const phaseRef = useRef<Phase>("menu");
  phaseRef.current = phase;
  const waveRef = useRef(1);

  useEffect(() => {
    const b = getBest(GAME_KEY);
    setBest(b ? b.value : 0);
  }, []);

  const endGame = useCallback((finalScore: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const prev = getBest(GAME_KEY);
    const beat = !prev || finalScore > prev.value;
    const saved = recordBest(GAME_KEY, finalScore, "score");
    setBest(saved.value);
    setIsNewBest(beat && finalScore > 0);
    if (beat && finalScore > 0) confetti({ particleCount: 100, spread: 75, origin: { y: 0.6 } });
    setPhase("over");
  }, []);

  const loop = useCallback(() => {
    const gs = gsRef.current;
    const canvas = canvasRef.current;
    if (!gs || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const now = performance.now();
    const elapsed = (now - gs.started) / 1000;
    gs.wave = Math.min(12, 1 + Math.floor(elapsed / 12));

    // ship follows target
    gs.shipX += (gs.targetX - gs.shipX) * 0.25;
    gs.shipX = Math.max(18, Math.min(W - 18, gs.shipX));
    const shipY = H - 44;

    // auto-fire
    const fireGap = 180;
    if (now - gs.lastShot > fireGap) {
      gs.bullets.push({ x: gs.shipX, y: shipY - 14 });
      gs.lastShot = now;
    }
    // spawn enemies (rate scales with wave)
    const spawnGap = Math.max(360, 900 - gs.wave * 55);
    if (now - gs.lastSpawn > spawnGap) {
      const r = 12 + Math.random() * 12;
      gs.enemies.push({
        x: r + Math.random() * (W - 2 * r),
        y: -r,
        r,
        vy: 1.0 + gs.wave * 0.18 + Math.random() * 0.6,
        vx: (Math.random() - 0.5) * (0.4 + gs.wave * 0.08),
        hue: 190 + Math.random() * 120,
      });
      gs.lastSpawn = now;
    }

    // update bullets
    gs.bullets = gs.bullets.filter((b) => (b.y -= 8) > -12);
    // update enemies + collisions
    let scored = false;
    let hit = false;
    const survivors: Enemy[] = [];
    for (const e of gs.enemies) {
      e.y += e.vy;
      e.x += e.vx;
      if (e.x < e.r || e.x > W - e.r) e.vx *= -1;
      // bullet hit?
      let dead = false;
      for (let i = gs.bullets.length - 1; i >= 0; i--) {
        const b = gs.bullets[i];
        if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (e.r + 4) ** 2) {
          gs.bullets.splice(i, 1);
          dead = true;
          gs.score += 10;
          scored = true;
          for (let p = 0; p < 8; p++) {
            const a = Math.random() * Math.PI * 2;
            gs.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4, life: 1, hue: e.hue });
          }
          break;
        }
      }
      if (dead) continue;
      // reached ship line or bottom?
      if (e.y + e.r >= shipY - 10 && Math.abs(e.x - gs.shipX) < e.r + 16) {
        hit = true;
        for (let p = 0; p < 12; p++) {
          const a = Math.random() * Math.PI * 2;
          gs.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 1, hue: 0 });
        }
        continue;
      }
      if (e.y - e.r > H) { hit = true; continue; } // slipped past = lose life
      survivors.push(e);
    }
    gs.enemies = survivors;
    if (hit) gs.lives -= 1;

    // particles
    gs.particles = gs.particles.filter((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= 0.03;
      return p.life > 0;
    });

    // ── draw ──
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, W, H);
    // starfield
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 30; i++) {
      const sy = (i * 53 + (now / 18)) % H;
      ctx.fillRect((i * 71) % W, sy, 1.5, 1.5);
    }
    // particles
    for (const p of gs.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = `hsl(${p.hue} 90% 60%)`;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
    // bullets
    ctx.fillStyle = "#a78bfa";
    for (const b of gs.bullets) ctx.fillRect(b.x - 1.5, b.y - 8, 3, 10);
    // enemies
    for (const e of gs.enemies) {
      ctx.beginPath();
      ctx.fillStyle = `hsl(${e.hue} 70% 55%)`;
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(e.x - e.r * 0.4, e.y - 2, e.r * 0.8, 3);
    }
    // ship (triangle)
    ctx.fillStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.moveTo(gs.shipX, shipY - 16);
    ctx.lineTo(gs.shipX - 14, shipY + 12);
    ctx.lineTo(gs.shipX + 14, shipY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c4b5fd";
    ctx.fillRect(gs.shipX - 3, shipY - 6, 6, 10);

    // sync HUD (cheap: only setState on actual change)
    if (scored) setScore(gs.score);
    if (hit) setLives(gs.lives);
    if (gs.wave !== waveRef.current) { waveRef.current = gs.wave; setWave(gs.wave); }

    if (gs.lives <= 0) { endGame(gs.score); return; }
    rafRef.current = requestAnimationFrame(loop);
  }, [endGame]);

  const begin = useCallback(() => {
    gsRef.current = {
      shipX: W / 2, targetX: W / 2, bullets: [], enemies: [], particles: [],
      score: 0, lives: 3, wave: 1, lastShot: 0, lastSpawn: 0, started: performance.now(),
    };
    waveRef.current = 1;
    setScore(0); setLives(3); setWave(1); setIsNewBest(false);
    setPhase("playing");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const steer = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    const gs = gsRef.current;
    if (!canvas || !gs) return;
    const rect = canvas.getBoundingClientRect();
    gs.targetX = ((clientX - rect.left) / rect.width) * W;
  }, []);

  return (
    <div className="not-prose my-10 mx-auto max-w-md rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-sm select-none">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</div>
          <div className="text-[11px] text-muted-foreground">{t.subtitle}</div>
        </div>
        <div className="text-right text-xs font-bold">
          <div>{t.score}: <b className="text-primary">{score}</b></div>
          <div className="text-muted-foreground">{t.best}: {best}</div>
        </div>
      </div>

      <div className="relative mx-auto" style={{ maxWidth: `${W}px` }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded-2xl border border-border touch-none [cursor:none] bg-[#0b1020]"
          style={{ aspectRatio: `${W} / ${H}` }}
          onPointerMove={(e) => phaseRef.current === "playing" && steer(e.clientX)}
          onPointerDown={(e) => { if (phaseRef.current === "playing") steer(e.clientX); }}
        />

        {phase === "playing" && (
          <div className="pointer-events-none absolute left-2 top-2 flex gap-2 text-[11px] font-bold text-white/90">
            <span>{t.wave} {wave}</span>
            <span>{"❤️".repeat(Math.max(0, lives))}</span>
          </div>
        )}

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/55 px-6 text-center backdrop-blur-sm">
            {phase === "over" && (
              <>
                {isNewBest && <div className="text-sm font-black text-violet-300">{t.newBest}</div>}
                <div className="text-xl font-black text-white">{t.gameOver}</div>
                <div className="text-sm text-white/80">{t.score}: <b>{score}</b> · {t.best}: {best}</div>
              </>
            )}
            {phase === "menu" && (
              <>
                <div className="text-4xl">🚀</div>
                <p className="max-w-xs text-xs leading-relaxed text-white/80">{t.controls}</p>
              </>
            )}
            <button
              onClick={begin}
              className="rounded-full bg-violet-500 px-8 py-2.5 font-bold text-white transition-colors hover:bg-violet-600"
            >
              {phase === "over" ? t.restart : t.tapStart}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StarBlaster;
