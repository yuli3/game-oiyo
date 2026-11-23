import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, mulberry, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { COURSES, COURSE_COUNT, FIELD_H, FIELD_W, SLED_SCREEN_Y, SLED_SLUG, finalTime, newRun, starsFor, steer, stepRun, type Run } from "../../lib/games/snow-sled";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  course: string; par: string; best: string; time: string; missed: string; pouch: string; go: string; finish: string; slow: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string; detail: string;
}> = {
  ko: {
    course: "{0}번 코스", par: "목표 {0}초", best: "최고 {0}초", time: "{0}초", missed: "깃발 놓침 {0}", pouch: "복주머니 {0}", go: "출발", finish: "결승! {0}초", slow: "너무 느렸어요 · {0}초",
    again: "다시 타기", next: "다음 코스", detail: "깃발 놓침 +{0}초 · 복주머니 −{1}초",
    help: "화면을 누른 채 좌우로 끌면 썰매가 손가락 쪽으로 방향을 틉니다. 빨강·파랑 깃발 사이를 지나가고, 소나무와 눈사람은 피하세요. 깃발을 놓치면 2초, 복주머니를 주우면 0.5초 줄어듭니다. 얼음판에서는 방향이 잘 안 바뀌고, 나무판 점프대를 밟으면 날아올라 장애물을 넘습니다.",
    stages: "코스 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    course: "Course {0}", par: "Par {0}s", best: "Best {0}s", time: "{0}s", missed: "Missed {0}", pouch: "Pouches {0}", go: "Go", finish: "Finish! {0}s", slow: "Too slow · {0}s",
    again: "Ride again", next: "Next course", detail: "Missed flags +{0}s · pouches −{1}s",
    help: "Hold and drag left or right and the sled turns toward your finger. Pass between the red and blue flags and dodge pines and snowmen. A missed flag costs 2 seconds and each lucky pouch takes off 0.5. Ice patches barely steer, and a wooden ramp launches you over obstacles.",
    stages: "Pick a course", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    course: "コース{0}", par: "目標 {0}秒", best: "最高 {0}秒", time: "{0}秒", missed: "旗ミス {0}", pouch: "福袋 {0}", go: "スタート", finish: "ゴール！ {0}秒", slow: "遅すぎました · {0}秒",
    again: "もう一度", next: "次のコース", detail: "旗ミス +{0}秒 · 福袋 −{1}秒",
    help: "画面を押したまま左右にドラッグすると、そりが指の方へ曲がります。赤と青の旗の間を通り、松の木と雪だるまはよけましょう。旗を逃すと2秒、福袋（ポクチュモニ）を取ると0.5秒縮みます。氷の上は曲がりにくく、木のジャンプ台を踏むと飛んで障害物を越えます。",
    stages: "コースを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    course: "第{0}赛道", par: "目标 {0}秒", best: "最佳 {0}秒", time: "{0}秒", missed: "漏旗 {0}", pouch: "福袋 {0}", go: "出发", finish: "到达终点！{0}秒", slow: "太慢了 · {0}秒",
    again: "再滑一次", next: "下一赛道", detail: "漏旗 +{0}秒 · 福袋 −{1}秒",
    help: "按住屏幕左右拖动，雪橇就会转向手指的方向。从红蓝旗之间穿过，避开松树和雪人。漏过一面旗加2秒，捡到一个福袋减0.5秒。冰面上很难转向，压上木制跳台会飞起来越过障碍。",
    stages: "选择赛道", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    course: "Piste {0}", par: "Objectif {0} s", best: "Record {0} s", time: "{0} s", missed: "Portes ratées {0}", pouch: "Bourses {0}", go: "Partir", finish: "Arrivée ! {0} s", slow: "Trop lent · {0} s",
    again: "Rejouer", next: "Piste suivante", detail: "Portes ratées +{0} s · bourses −{1} s",
    help: "Maintenez et glissez à gauche ou à droite : la luge tourne vers votre doigt. Passez entre les drapeaux rouges et bleus, évitez sapins et bonshommes de neige. Une porte ratée coûte 2 secondes, chaque bourse porte-bonheur en retire 0,5. Sur la glace on tourne mal, et un tremplin en bois vous fait sauter par-dessus les obstacles.",
    stages: "Choisir une piste", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    course: "Pista {0}", par: "Meta {0} s", best: "Récord {0} s", time: "{0} s", missed: "Puertas falladas {0}", pouch: "Bolsitas {0}", go: "Salir", finish: "¡Meta! {0} s", slow: "Demasiado lento · {0} s",
    again: "Otra bajada", next: "Siguiente pista", detail: "Puertas falladas +{0} s · bolsitas −{1} s",
    help: "Mantén pulsado y arrastra a izquierda o derecha: el trineo gira hacia tu dedo. Pasa entre las banderas roja y azul y esquiva pinos y muñecos de nieve. Cada puerta fallada suma 2 segundos y cada bolsita de la suerte resta 0,5. En el hielo apenas se gira y una rampa de madera te hace saltar los obstáculos.",
    stages: "Elegir pista", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:snow-sled:muted";
const BEST_KEY = "oiyo:snow-sled:best";

const SLED: PixelArt = {
  palette: { k: "#2b1d16", h: "#e03131", w: "#fff4e6", s: "#f3c9a0", r: "#8a4b22", b: "#5c3317", y: "#ffd43b", c: "#1c7ed6" },
  rows: [
    "..b....b..",
    ".bbbbbbbb.",
    ".rrrrrrrr.",
    ".rrhhhhrr.",
    ".rhhwwhhr.",
    ".rhcccchr.",
    ".rhcsschr.",
    ".rhkkkkhr.",
    ".rrhyyhrr.",
    ".rrrrrrrr.",
    ".rrrrrrrr.",
    ".bbbbbbbb.",
    "..b....b..",
  ],
};
const SLED_TUMBLE: PixelArt = {
  palette: SLED.palette,
  rows: [
    "....kk....",
    "..ckkkkc..",
    ".cshhhhsc.",
    "..hhwwhh..",
    "...hyyh...",
    "..rrrrrr..",
    ".rr....rr.",
    "bb......bb",
  ],
};
const PINE: PixelArt = {
  palette: { g: "#2b8a3e", d: "#1e5f2c", w: "#ffffff", t: "#6b4423" },
  rows: [
    ".....w.....",
    "....wgw....",
    "....ggg....",
    "...wgggw...",
    "...ggdgg...",
    "..wgggggw..",
    "..gggdggg..",
    ".wggggdggw.",
    ".ggdgggggg.",
    "wgggggggdgw",
    "ggggdgggggg",
    ".....t.....",
    ".....t.....",
  ],
};
const SNOWMAN: PixelArt = {
  palette: { w: "#ffffff", g: "#d0dbe6", k: "#1f2937", o: "#f76707", r: "#e03131" },
  rows: [
    "...kkkk...",
    "...kkkk...",
    "..kkkkkk..",
    "..wwwwww..",
    "..wkwwkw..",
    "..wwwoow..",
    "..rrrrrr..",
    ".wwwwwwwg.",
    "wwwwkwwwwg",
    "wwwwwwwwwg",
    "wwwwkwwwwg",
    ".wwwwwwgg.",
  ],
};
const POUCH: PixelArt = {
  palette: { r: "#e03131", p: "#f783ac", y: "#ffd43b", d: "#a61e4d" },
  rows: ["..y..y..", "...yy...", "..rrrr..", ".rrpprr.", "rrpyyprr", "rrryyrrr", "drrrrrrd", ".dddddd."],
};
const FLAG_RED: PixelArt = { palette: { r: "#e03131", d: "#a51111", k: "#4a3728" }, rows: ["krrrr", "krrrd", "krrd.", "k....", "k....", "k....", "k...."] };
const FLAG_BLUE: PixelArt = { palette: { r: "#1c7ed6", d: "#0b4f8a", k: "#4a3728" }, rows: ["krrrr", "krrrd", "krrd.", "k....", "k....", "k....", "k...."] };
const RAMP: PixelArt = {
  palette: { b: "#8a5a3b", d: "#5c3a21", y: "#c98d5b" },
  rows: ["yyyyyyyyyyy", "bbbbbbbbbbb", "byybyybyybb", "bbbbbbbbbbb", "ddddddddddd"],
};

interface Pop { x: number; y: number; text: string; t: number; color: string }

function readBest(): Record<number, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}") as Record<number, number>;
  } catch {
    return {};
  }
}
function writeBest(v: Record<number, number>): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(v));
  } catch {
    // storage blocked
  }
}

// fixed snow speckles for the scrolling texture
const SPECKS = (() => {
  const r = mulberry(4242);
  return Array.from({ length: 70 }, () => ({ x: Math.floor(r() * FIELD_W), y: Math.floor(r() * 900), s: r() < 0.3 ? 3 : 2 }));
})();

export default function SnowSled({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [course, setCourse] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [phase, setPhase] = useState<"ready" | "ride" | "done">("ready");
  const [hud, setHud] = useState({ time: 0, missed: 0, pouches: 0 });
  const [result, setResult] = useState<{ time: number; stars: 0 | 1 | 2 | 3 } | null>(null);
  const [best, setBest] = useState<Record<number, number>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runRef = useRef<Run>(newRun(COURSES[0]));
  const phaseRef = useRef<"ready" | "ride" | "done">("ready");
  const trail = useRef<Array<[number, number]>>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  useRunRecord(SLED_SLUG, phase === "done" && (result?.stars ?? 0) > 0, result?.time ?? 0, "seconds", `course-${course + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((i: number) => {
    setCourse(i);
    runRef.current = newRun(COURSES[i]);
    trail.current = [];
    parts.current = [];
    pops.current = [];
    phaseRef.current = "ready";
    setPhase("ready");
    setResult(null);
    setHud({ time: 0, missed: 0, pouches: 0 });
  }, []);

  const go = useCallback(() => {
    if (phaseRef.current !== "ready") return;
    phaseRef.current = "ride";
    setPhase("ride");
    cues.current?.play("tap");
  }, []);

  useEffect(() => {
    const done = loadClearedStages(SLED_SLUG, COURSE_COUNT);
    setCleared(done);
    setBest(readBest());
    load(nextOpenStage(done, COURSE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let hudTimer = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const r = runRef.current;
      const co = r.course;
      if (phaseRef.current === "ride") {
        for (let k = 0; k < 2; k++) {
          const ev = stepRun(r, dt / 2);
          const sy = SLED_SCREEN_Y;
          if (ev.gate === "pass") sfx("tap");
          if (ev.gate === "miss") {
            sfx("fail");
            pops.current.push({ x: r.x, y: sy - 20, text: "+2", t: 0.8, color: "#e03131" });
          }
          if (ev.pouch) {
            sfx("success");
            spawnBurst(parts.current, r.x, sy, ["#ffd43b", "#f783ac", "#ffffff"], 10, 110, Math.floor(now));
            pops.current.push({ x: r.x, y: sy - 20, text: "-0.5", t: 0.8, color: "#2f9e44" });
          }
          if (ev.ramp) sfx("combo");
          if (ev.crash) {
            sfx("lose");
            spawnBurst(parts.current, r.x, sy + 8, ev.crash === "tree" ? ["#2b8a3e", "#ffffff", "#6b4423"] : ["#ffffff", "#f76707", "#1f2937"], 22, 160, Math.floor(now) + 3);
          }
          if (ev.finish) {
            const t = finalTime(r);
            const stars = starsFor(t, co.par);
            phaseRef.current = "done";
            setPhase("done");
            setResult({ time: Math.round(t * 10) / 10, stars });
            if (stars > 0) {
              setCleared(markStageCleared(SLED_SLUG, co.index, COURSE_COUNT));
              setBest((b) => {
                if (b[co.index] !== undefined && b[co.index] <= t) return b;
                const nb = { ...b, [co.index]: Math.round(t * 10) / 10 };
                writeBest(nb);
                return nb;
              });
              sfx("win");
            } else sfx("lose");
            spawnBurst(parts.current, FIELD_W / 2, SLED_SCREEN_Y + 60, ["#e03131", "#ffd43b", "#1c7ed6", "#ffffff"], 40, 220, Math.floor(now) + 9);
            break;
          }
        }
        trail.current.push([r.x, r.y]);
        if (trail.current.length > 80) trail.current.shift();
      }
      hudTimer -= dt;
      if (hudTimer <= 0) {
        hudTimer = 0.1;
        setHud({ time: Math.round(r.time * 10) / 10, missed: r.missed, pouches: r.pouches });
      }
      stepParticles(parts.current, dt, 160);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const cam = r.y - SLED_SCREEN_Y;
        const sy = (wy: number) => wy - cam;
        // snow
        ctx.fillStyle = co.night ? "#c8d3ea" : "#f4f8fc";
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);
        ctx.fillStyle = co.night ? "#aebbd8" : "#dde7f1";
        for (const p of SPECKS) {
          const yy = ((p.y - cam * 1) % 900 + 900) % 900 - 150;
          ctx.fillRect(p.x, Math.round(yy), p.s, p.s);
        }
        // start and finish lines
        for (const ly of [0, co.length]) {
          const y0 = sy(ly);
          if (y0 < -20 || y0 > FIELD_H + 20) continue;
          for (let x = 0; x < FIELD_W; x += 12) {
            ctx.fillStyle = (x / 12 + (ly ? 1 : 0)) % 2 ? "#1f2937" : "#ffffff";
            ctx.fillRect(x, Math.round(y0) - 6, 12, 6);
            ctx.fillStyle = (x / 12 + (ly ? 0 : 1)) % 2 ? "#1f2937" : "#ffffff";
            ctx.fillRect(x, Math.round(y0), 12, 6);
          }
        }
        // sled trail
        ctx.fillStyle = co.night ? "#9fb0d0" : "#c9d7e6";
        for (const [tx, ty] of trail.current) {
          const yy = Math.round(sy(ty));
          ctx.fillRect(Math.round(tx) - 9, yy, 2, 2);
          ctx.fillRect(Math.round(tx) + 7, yy, 2, 2);
        }
        // objects
        for (const o of co.objs) {
          const y0 = sy(o.y);
          if (y0 < -60 || y0 > FIELD_H + 60) continue;
          if (o.kind === "ice") {
            ctx.fillStyle = "rgba(116,192,252,0.45)";
            ctx.fillRect(Math.round(o.x - o.w / 2), Math.round(y0 - o.h / 2), o.w, o.h);
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.fillRect(Math.round(o.x - o.w / 2) + 10, Math.round(y0 - o.h / 2) + 12, 24, 3);
            ctx.fillRect(Math.round(o.x) + 6, Math.round(y0) + 10, 18, 3);
          } else if (o.kind === "ramp") drawSprite(ctx, RAMP, o.x, y0, { scale: 4 });
          else if (o.kind === "pouch") {
            if (!o.taken) drawSprite(ctx, POUCH, o.x, y0 + Math.sin(r.time * 5 + o.y) * 2, { scale: 3 });
          } else if (o.kind === "tree") drawSprite(ctx, PINE, o.x, y0 - 6, { scale: 3, rotate: o.taken ? 0.5 : 0 });
          else drawSprite(ctx, SNOWMAN, o.x, y0 - 4, { scale: 3, rotate: o.taken ? -1.2 : 0 });
        }
        // gates
        for (const g of co.gates) {
          const y0 = sy(g.y);
          if (y0 < -40 || y0 > FIELD_H + 40) continue;
          const alpha = g.passed === false ? 0.4 : 1;
          drawSprite(ctx, FLAG_RED, g.x - g.half, y0 - 10, { scale: 3, alpha });
          drawSprite(ctx, FLAG_BLUE, g.x + g.half, y0 - 10, { scale: 3, alpha, flipX: true });
          if (g.passed) {
            ctx.fillStyle = "rgba(47,158,68,0.35)";
            ctx.fillRect(Math.round(g.x - g.half), Math.round(y0), Math.round(g.half * 2), 3);
          }
        }
        // sled (shadow, then lifted while airborne)
        const lift = r.air > 0 ? Math.sin(Math.min(1, r.air / 0.8) * Math.PI) * 18 : 0;
        ctx.fillStyle = "rgba(30,40,60,0.18)";
        ctx.fillRect(Math.round(r.x) - 12, SLED_SCREEN_Y + 14, 24, 6);
        drawSprite(ctx, r.tumble > 0 ? SLED_TUMBLE : SLED, r.x, SLED_SCREEN_Y - lift, {
          scale: 3 + (lift > 0 ? 1 : 0),
          rotate: r.tumble > 0 ? r.time * 14 : Math.max(-0.45, Math.min(0.45, -r.vx / 500)),
        });
        if (r.v > 260 && r.tumble <= 0 && phaseRef.current === "ride") {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillRect(Math.round(r.x) - 14, SLED_SCREEN_Y - 26, 2, 8);
          ctx.fillRect(Math.round(r.x) + 12, SLED_SCREEN_Y - 30, 2, 10);
        }
        drawParticles(ctx, parts.current);
        if (co.night) {
          const g = ctx.createRadialGradient(r.x, SLED_SCREEN_Y + 120, 40, r.x, SLED_SCREEN_Y + 120, 300);
          g.addColorStop(0, "rgba(10,16,40,0)");
          g.addColorStop(1, "rgba(10,16,40,0.6)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, FIELD_W, FIELD_H);
        }
        ctx.textAlign = "center";
        ctx.font = "bold 18px sans-serif";
        for (const p of pops.current) {
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y - (0.8 - p.t) * 30);
        }
        // progress bar
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(FIELD_W - 10, 20, 4, FIELD_H - 40);
        ctx.fillStyle = "#e03131";
        ctx.fillRect(FIELD_W - 12, 20 + Math.round((FIELD_H - 40) * Math.min(1, r.y / co.length)) - 3, 8, 6);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toX = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * FIELD_W;
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current === "done") return;
    go();
    steer(runRef.current, toX(e));
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons === 0 && e.pointerType === "mouse") return;
    if (phaseRef.current !== "ride") return;
    steer(runRef.current, toX(e));
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const co = COURSES[course];
  const myBest = best[course];

  return (
    <div
      ref={containerRef}
      data-game="snow-sled"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.course, course + 1)}</Badge>
        <Badge variant="outline">{fill(c.time, hud.time.toFixed(1))}</Badge>
        <Badge variant="outline">{fill(c.par, co.par)}</Badge>
        {myBest !== undefined ? <Badge variant="outline">{fill(c.best, myBest)}</Badge> : null}
        {hud.missed > 0 ? <Badge variant="destructive">{fill(c.missed, hud.missed)}</Badge> : null}
        {hud.pouches > 0 ? <Badge variant="outline">{fill(c.pouch, hud.pouches)}</Badge> : null}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={FIELD_W}
          height={FIELD_H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {phase === "ready" ? (
          <button type="button" onClick={go} className="game-btn game-btn-live absolute inset-x-1/4 bottom-1/3 flex min-h-14 items-center justify-center gap-2 text-lg font-bold">
            <Play className="size-5" />
            <span>{c.go}</span>
          </button>
        ) : null}
        {phase === "done" && result ? (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{result.stars > 0 ? fill(c.finish, result.time) : fill(c.slow, result.time)}</p>
            <p className="text-2xl tracking-widest text-warning" aria-label={`${result.stars}/3`}>{"★".repeat(result.stars)}{"☆".repeat(3 - result.stars)}</p>
            <p className="text-xs text-muted-foreground">{fill(c.detail, hud.missed * 2, hud.pouches * 0.5)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => load(course)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" disabled={result.stars === 0} onClick={() => load(course >= COURSE_COUNT - 1 ? 0 : course + 1)}>
                <span>{course >= COURSE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={COURSE_COUNT} current={course} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
