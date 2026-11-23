// Patch Dungeon v2 (2026-11-23): a grid crawl on a canvas where the game
// patches its own controls. Each floor posts patch notes that remap the
// arrows, and deeper floors hot-patch mid-floor with a glitch. Swipe, arrow
// keys, or the on-screen pad. Hook (design lens): high concept, "the game
// patches itself while you play". Logic: lib/games/patch-dungeon.

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { recordBest, recordResult } from "../../lib/games/records";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  COLS, FLOOR_COUNT, GAME_ID, HEARTS, ROWS, activeMap, begin, newRun, patchIndex, patchNote, press, spikeOn, stars, tileAt,
  type Dir, type RunState,
} from "../../lib/games/patch-dungeon";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";
const MUTE_KEY = "oiyo:patch-dungeon:muted";
const ARROW: Record<Dir, string> = { up: "↑", down: "↓", left: "←", right: "→" };
const fill = (s: string, ...v: (string | number)[]) => v.reduce<string>((acc, x, i) => acc.replace(`{${i}}`, String(x)), s);

const COPY: Record<L, {
  floor: string; moves: string; par: string; notes: string; version: string; press: string; hot: string; hotIn: string;
  start: string; next: string; retry: string; won: string; lost: string; hint: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; pad: string; keyHeld: string;
}> = {
  ko: {
    floor: "{0}층", moves: "이동 {0}", par: "목표 {0}", notes: "패치 노트", version: "v1.{0}.{1}", press: "{0} 누르면 {1}로 이동",
    hot: "⚡ 핫픽스 적용! 조작이 또 바뀌었어요", hotIn: "{0}걸음 뒤 핫픽스 예정",
    start: "입장", next: "다음 층", retry: "다시 하기", won: "출구 도착! 패치를 이겨냈어요", lost: "하트가 다 떨어졌어요",
    hint: "화면을 밀거나 방향키·아래 패드로 움직여요. 누른 방향과 실제 이동 방향은 패치 노트대로 바뀌어 있어요. 가시(빨강)와 슬라임을 피하고 열쇠로 문을 열어 출구(계단)로 가세요.",
    stages: "층 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기", pad: "방향 패드", keyHeld: "열쇠 {0}",
  },
  en: {
    floor: "Floor {0}", moves: "Moves {0}", par: "Par {0}", notes: "Patch notes", version: "v1.{0}.{1}", press: "Press {0} → moves {1}",
    hot: "⚡ Hotfix deployed! The controls changed again", hotIn: "Hotfix in {0} moves",
    start: "Enter", next: "Next floor", retry: "Try again", won: "Exit reached! You beat the patch", lost: "Out of hearts",
    hint: "Swipe, use arrow keys, or the pad below. The direction you press and the way you move are remapped as the patch notes say. Dodge spikes (red) and slimes, open doors with keys, reach the stairs.",
    stages: "Pick a floor", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on", pad: "Direction pad", keyHeld: "Keys {0}",
  },
  ja: {
    floor: "{0}階", moves: "移動 {0}", par: "目標 {0}", notes: "パッチノート", version: "v1.{0}.{1}", press: "{0}を押すと{1}へ移動",
    hot: "⚡ ホットフィックス適用！操作がまた変わりました", hotIn: "あと{0}歩でホットフィックス",
    start: "入る", next: "次の階", retry: "もう一度", won: "出口到着！パッチに勝ちました", lost: "ハートがなくなりました",
    hint: "スワイプ、矢印キー、下のパッドで移動。押した方向と実際の移動はパッチノートどおりに入れ替わっています。トゲ（赤）とスライムを避け、鍵で扉を開けて階段へ。",
    stages: "階を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン", pad: "方向パッド", keyHeld: "鍵 {0}",
  },
  zh: {
    floor: "第{0}层", moves: "移动 {0}", par: "目标 {0}", notes: "补丁说明", version: "v1.{0}.{1}", press: "按{0} → 往{1}走",
    hot: "⚡ 热修复上线！操作又变了", hotIn: "{0}步后热修复",
    start: "进入", next: "下一层", retry: "再来一次", won: "到达出口！你战胜了补丁", lost: "心用完了",
    hint: "滑动屏幕、用方向键或下方方向盘移动。按下的方向和实际移动方向按补丁说明被调换了。避开尖刺（红色）和史莱姆，用钥匙开门，走到楼梯。",
    stages: "选择楼层", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音", pad: "方向盘", keyHeld: "钥匙 {0}",
  },
  fr: {
    floor: "Étage {0}", moves: "Pas {0}", par: "Objectif {0}", notes: "Notes de patch", version: "v1.{0}.{1}", press: "Appuyer {0} → va {1}",
    hot: "⚡ Correctif déployé ! Les commandes ont encore changé", hotIn: "Correctif dans {0} pas",
    start: "Entrer", next: "Étage suivant", retry: "Réessayer", won: "Sortie atteinte ! Vous avez battu le patch", lost: "Plus de cœurs",
    hint: "Glissez, utilisez les flèches ou le pavé ci-dessous. La direction pressée et le déplacement réel sont échangés selon les notes de patch. Évitez les pics (rouges) et les slimes, ouvrez les portes avec des clés, rejoignez l'escalier.",
    stages: "Choisir un étage", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son", pad: "Pavé directionnel", keyHeld: "Clés {0}",
  },
  es: {
    floor: "Piso {0}", moves: "Pasos {0}", par: "Meta {0}", notes: "Notas del parche", version: "v1.{0}.{1}", press: "Pulsar {0} → va {1}",
    hot: "⚡ ¡Hotfix aplicado! Los controles cambiaron otra vez", hotIn: "Hotfix en {0} pasos",
    start: "Entrar", next: "Piso siguiente", retry: "Reintentar", won: "¡Salida alcanzada! Venciste al parche", lost: "Sin corazones",
    hint: "Desliza, usa las flechas o el pad de abajo. La dirección que pulsas y la que recorres están cambiadas según las notas del parche. Esquiva pinchos (rojos) y slimes, abre puertas con llaves y llega a la escalera.",
    stages: "Elegir piso", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido", pad: "Pad direccional", keyHeld: "Llaves {0}",
  },
};

const T = 48;
const W = COLS * T;
const H = ROWS * T;
const DPR = 2;

interface Fx { glitch: number; hurt: number; fromX: number; fromY: number; t: number; bump: number }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }

function drawTile(ctx: CanvasRenderingContext2D, s: RunState, x: number, y: number, time: number) {
  const t = tileAt(s, x, y);
  const px = x * T;
  const py = y * T;
  const shade = (x + y) % 2 ? "#3b3355" : "#40385c";
  if (t === "#") {
    ctx.fillStyle = "#1f1a30"; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = "#2c2542"; ctx.fillRect(px + 3, py + 3, T - 6, T / 2 - 4); ctx.fillRect(px + 3, py + T / 2 + 1, T / 2 - 4, T / 2 - 4); ctx.fillRect(px + T / 2 + 1, py + T / 2 + 1, T / 2 - 4, T / 2 - 4);
    return;
  }
  ctx.fillStyle = shade; ctx.fillRect(px, py, T, T);
  ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
  if (t === "^" || t === "~") {
    const on = spikeOn(t, s.moves);
    ctx.fillStyle = on ? "#ff6b6b" : "rgba(255,107,107,0.25)";
    for (let k = 0; k < 3; k++) {
      const bx = px + 8 + k * 12;
      ctx.beginPath(); ctx.moveTo(bx, py + T - 10); ctx.lineTo(bx + 6, py + (on ? 12 : T - 16)); ctx.lineTo(bx + 12, py + T - 10); ctx.fill();
    }
    if (t === "~") { ctx.fillStyle = "rgba(255,212,59,0.8)"; ctx.beginPath(); ctx.arc(px + T - 8, py + 8, 3, 0, Math.PI * 2); ctx.fill(); }
  } else if (t === "E") {
    for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? "#b197fc" : "#d0bfff"; ctx.fillRect(px + 6 + k * 4, py + 8 + k * 8, T - 12 - k * 8, 8); }
    ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(time * 4) * 0.15})`; ctx.fillRect(px + 4, py + 4, T - 8, T - 8);
  } else if (t === "K") {
    const bob = Math.sin(time * 4) * 3;
    ctx.strokeStyle = "#fcc419"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(px + 18, py + 22 + bob, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 25, py + 22 + bob); ctx.lineTo(px + 38, py + 22 + bob); ctx.lineTo(px + 38, py + 29 + bob); ctx.stroke();
  } else if (t === "D") {
    ctx.fillStyle = "#8d5a2b"; ctx.fillRect(px + 6, py + 4, T - 12, T - 6);
    ctx.fillStyle = "#fcc419"; ctx.fillRect(px + T / 2 - 4, py + T / 2 - 4, 8, 10);
  } else if (t === "S") {
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2; ctx.strokeRect(px + 8, py + 8, T - 16, T - 16);
  }
}

function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, hurt: number) {
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 6) * 1.5);
  if (hurt > 0 && Math.floor(time * 20) % 2) ctx.globalAlpha = 0.4;
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(0, 17, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4dabf7"; ctx.fillRect(-11, -4, 22, 20);
  ctx.fillStyle = "#ffe8cc"; ctx.beginPath(); ctx.arc(0, -10, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#adb5bd"; ctx.beginPath(); ctx.arc(0, -13, 11, Math.PI, 0); ctx.fill(); ctx.fillRect(-12, -14, 24, 4);
  ctx.fillStyle = "#212529"; ctx.fillRect(-5, -10, 3, 3); ctx.fillRect(3, -10, 3, 3);
  ctx.fillStyle = "#dee2e6"; ctx.fillRect(10, -2, 3, 16); // sword
  ctx.restore();
}

function drawSlime(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const sq = Math.sin(time * 5) * 2;
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(x, y + 15, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#69db7c";
  ctx.beginPath(); ctx.ellipse(x, y + 4 - sq / 2, 16 + sq, 13 - sq, 0, Math.PI, 0); ctx.lineTo(x + 16 + sq, y + 14); ctx.lineTo(x - 16 - sq, y + 14); ctx.fill();
  ctx.fillStyle = "#212529"; ctx.fillRect(x - 6, y - 1, 3, 4); ctx.fillRect(x + 3, y - 1, 3, 4);
}

export default function PatchDungeon({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });
  const [run, setRun] = useState<RunState>(() => newRun(0));
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const runRef = useRef(run);
  runRef.current = run;
  const fx = useRef<Fx>({ glitch: 0, hurt: 0, fromX: run.x, fromY: run.y, t: 1, bump: 0 });
  const sparks = useRef<Spark[]>([]);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const prevStatus = useRef(run.status);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((i: number) => {
    const r = newRun(i);
    setRun(r);
    fx.current = { glitch: 0, hurt: 0, fromX: r.x, fromY: r.y, t: 1, bump: 0 };
    sparks.current = [];
    setToast("");
  }, []);

  useEffect(() => {
    const done = loadClearedStages(GAME_ID, FLOOR_COUNT);
    setCleared(done);
    load(nextOpenStage(done, FLOOR_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => { cues.current?.close(); window.clearTimeout(toastTimer.current); };
  }, [load]);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = run.status;
    if (prev === run.status) return;
    if (run.status === "won") {
      setCleared(markStageCleared(GAME_ID, run.floor.index, FLOOR_COUNT));
      try { recordResult(GAME_ID, "w"); recordBest(GAME_ID, run.floor.index + 1, "score"); } catch { /* storage blocked */ }
      sfx("win");
    } else if (run.status === "lost") {
      try { recordResult(GAME_ID, "l"); } catch { /* storage blocked */ }
      sfx("lose");
    }
  }, [run.status, run.floor.index, sfx]);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1800);
  }, []);

  const go = useCallback((pressed: Dir) => {
    const s = runRef.current;
    if (s.status === "ready") { setRun(begin(s)); sfx("tap"); return; }
    if (s.status !== "play") return;
    const n = press(s, pressed);
    fx.current = { ...fx.current, fromX: s.x, fromY: s.y, t: 0, bump: n.x === s.x && n.y === s.y ? 0.18 : 0 };
    if (n.lastHurt) { fx.current.hurt = 0.6; sfx("fail"); }
    else if (n.keys > s.keys) sfx("success");
    else if (n.opened.length > s.opened.length) sfx("combo");
    else sfx("place");
    if (n.lastPatch) { fx.current.glitch = 0.7; showToast(c.hot); sfx("combo"); }
    if (n.status === "won") {
      for (let k = 0; k < 30; k++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 200;
        sparks.current.push({ x: n.x * T + T / 2, y: n.y * T + T / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color: ["#ffd43b", "#b197fc", "#69db7c"][k % 3]! });
      }
    }
    setRun(n);
  }, [c.hot, sfx, showToast]);

  // render loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let time = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      const f = fx.current;
      f.t = Math.min(1, f.t + dt * 7);
      f.glitch = Math.max(0, f.glitch - dt);
      f.hurt = Math.max(0, f.hurt - dt);
      f.bump = Math.max(0, f.bump - dt);
      const ctx = canvasRef.current?.getContext("2d");
      const s = runRef.current;
      if (ctx) {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        if (f.hurt > 0.3) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawTile(ctx, s, x, y, time);
        for (const sl of s.slimes) drawSlime(ctx, sl.x * T + T / 2, sl.y * T + T / 2, time);
        const e = 1 - Math.pow(1 - f.t, 3);
        let hx = (f.fromX + (s.x - f.fromX) * e) * T + T / 2;
        const hy = (f.fromY + (s.y - f.fromY) * e) * T + T / 2;
        if (f.bump > 0) hx += Math.sin(f.bump * 80) * 4;
        drawHero(ctx, hx, hy, time, f.hurt);
        // torch light: darken far tiles
        const g = ctx.createRadialGradient(hx, hy, T * 1.2, hx, hy, T * 5);
        g.addColorStop(0, "rgba(10,8,20,0)");
        g.addColorStop(1, "rgba(10,8,20,0.55)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        if (f.hurt > 0) { ctx.fillStyle = `rgba(250,82,82,${f.hurt * 0.4})`; ctx.fillRect(0, 0, W, H); }
        // glitch: RGB slices
        if (f.glitch > 0) {
          for (let k = 0; k < 6; k++) {
            const gy = Math.random() * H;
            const gh = 4 + Math.random() * 18;
            ctx.fillStyle = k % 2 ? `rgba(0,255,255,${f.glitch * 0.35})` : `rgba(255,0,200,${f.glitch * 0.35})`;
            ctx.fillRect((Math.random() - 0.5) * 30, gy, W, gh);
          }
        }
        sparks.current = sparks.current.filter((p) => p.life > 0);
        for (const p of sparks.current) {
          p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const k: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
    const d = k[e.key];
    if (d) { go(d); e.preventDefault(); }
    else if ((e.key === "Enter" || e.key === " ") && runRef.current.status === "ready") { go("up"); e.preventDefault(); }
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = swipe.current;
    swipe.current = null;
    if (!st) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (Math.hypot(dx, dy) < 18) {
      // tap: step toward the tapped side of the hero (pressed direction, still patched)
      const rect = e.currentTarget.getBoundingClientRect();
      const tx = ((e.clientX - rect.left) / rect.width) * W - (runRef.current.x * T + T / 2);
      const ty = ((e.clientY - rect.top) / rect.height) * H - (runRef.current.y * T + T / 2);
      if (Math.hypot(tx, ty) < T * 0.4) return;
      go(Math.abs(tx) > Math.abs(ty) ? (tx > 0 ? "right" : "left") : (ty > 0 ? "down" : "up"));
      return;
    }
    go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const map = activeMap(run.floor, run.moves);
  const pIdx = patchIndex(run.floor, run.moves);
  const upcoming = run.floor.patches[pIdx + 1];
  const st = stars(run);

  return (
    <div
      ref={containerRef}
      data-game="patch-dungeon"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.floor, run.floor.index + 1)} / {FLOOR_COUNT}</Badge>
        <Badge variant="outline" aria-label={`${run.hearts}/${HEARTS}`}>{"♥".repeat(Math.max(0, run.hearts))}{"♡".repeat(Math.max(0, HEARTS - run.hearts))}</Badge>
        <Badge variant="outline">{fill(c.moves, run.moves)} · {fill(c.par, run.floor.par)}</Badge>
        {run.keys > 0 ? <Badge>{fill(c.keyHeld, run.keys)}</Badge> : null}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted p-2" aria-live="polite">
        <p className="text-xs font-bold text-muted-foreground">
          {c.notes} · {fill(c.version, run.floor.index, pIdx)}
          {upcoming && run.status === "play" ? <span> · {fill(c.hotIn, Math.max(0, upcoming.at - run.moves))}</span> : null}
        </p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {patchNote(map).map(([from, to]) => (
            <li key={from}><Badge>{fill(c.press, ARROW[from], ARROW[to])}</Badge></li>
          ))}
        </ul>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W * DPR}
          height={H * DPR}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={() => { swipe.current = null; }}
          className="mx-auto block w-full max-w-md touch-none select-none rounded-xl border border-border"
          aria-label={c.hint}
        />
        {toast ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="rounded-full bg-background px-3 py-1 text-sm font-bold text-foreground shadow">{toast}</span>
          </div>
        ) : null}
        {run.status === "ready" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/80 p-4 text-center">
            <p className="text-2xl font-black">{fill(c.floor, run.floor.index + 1)}</p>
            <Button className="min-h-12 min-w-40" onClick={() => go("up")}>{c.start}</Button>
          </div>
        ) : null}
      </div>

      {run.status === "play" ? (
        <div className="mx-auto grid w-44 grid-cols-3 gap-1" role="group" aria-label={c.pad}>
          <span />
          <Button variant="secondary" className="size-14" onClick={() => go("up")} aria-label="up"><ArrowUp className="size-6" /></Button>
          <span />
          <Button variant="secondary" className="size-14" onClick={() => go("left")} aria-label="left"><ArrowLeft className="size-6" /></Button>
          <span />
          <Button variant="secondary" className="size-14" onClick={() => go("right")} aria-label="right"><ArrowRight className="size-6" /></Button>
          <span />
          <Button variant="secondary" className="size-14" onClick={() => go("down")} aria-label="down"><ArrowDown className="size-6" /></Button>
          <span />
        </div>
      ) : null}

      {run.status === "won" || run.status === "lost" ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center" aria-live="polite">
          <p className="text-lg font-bold">{run.status === "won" ? c.won : c.lost}</p>
          {run.status === "won" ? <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p> : null}
          <p className="text-sm tabular-nums">{fill(c.moves, run.moves)} · {fill(c.par, run.floor.par)}</p>
          {run.status === "won" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => load(run.floor.index)}><RotateCcw className="size-4" /><span>{c.retry}</span></Button>
              <Button className="min-h-12" onClick={() => load(run.floor.index >= FLOOR_COUNT - 1 ? 0 : run.floor.index + 1)}>
                {run.floor.index >= FLOOR_COUNT - 1 ? finaleLabel(locale) : c.next}
              </Button>
            </div>
          ) : (
            <Button className="min-h-12 w-full" onClick={() => load(run.floor.index)}><RotateCcw className="size-4" /><span>{c.retry}</span></Button>
          )}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{c.hint}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={FLOOR_COUNT} current={run.floor.index} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
