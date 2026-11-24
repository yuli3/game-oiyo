import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { FIELD_H, FIELD_W, LEVELS, SLEDGE_SLUG, SLED_SCREEN_Y, STAGE_COUNT, centerX, lineX, newSledge, push, rivalD, starsFor, stepSledge, type Side, type Sledge, type SledgeEvents } from "../../lib/games/ice-sledge";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; time: string; par: string; kids: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; fell: string; slush: string; bump: string; go: string;
}> = {
  ko: {
    stage: "{0}단계", time: "{0}초", par: "목표 {0}초", kids: "동네 친구 {0}명", start: "왼쪽·오른쪽을 번갈아 톡톡! 꼬챙이로 얼음을 밀어요", win: "1등으로 건넜어요!", lose: "친구가 먼저 도착했어요", result: "{0}초 · 빠졌다 {1}번",
    again: "다시 하기", next: "다음 단계", fell: "풍덩!", slush: "질척질척", bump: "쿵!", go: "출발!",
    help: "얼어붙은 개울에서 썰매를 타요. 화면 왼쪽을 누르면 왼손 꼬챙이로, 오른쪽을 누르면 오른손 꼬챙이로 얼음을 밀어요. 왼쪽·오른쪽을 번갈아 밀어야 썰매가 쭉쭉 나가고, 한쪽만 밀면 힘이 덜 실려요. 왼쪽 꼬챙이를 밀면 썰매가 오른쪽으로, 오른쪽을 밀면 왼쪽으로 돌아요. 질척한 얼음은 썰매를 붙잡고, 얼음 구멍에 빠지면 조금 뒤에서 다시 출발하며, 볏짚 더미에 부딪히면 멈칫해요. 동네 친구들보다 먼저 건너편에 도착하면 통과예요. 키보드는 ← →(또는 A·D)예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", time: "{0}s", par: "Par {0}s", kids: "{0} village kids", start: "Tap left, right, left, right! Pole across the ice", win: "First across the stream!", lose: "A kid got there first", result: "{0}s · fell in {1}×",
    again: "Play again", next: "Next stage", fell: "Splash!", slush: "Slush", bump: "Bonk!", go: "Go!",
    help: "Race a little sledge across a frozen stream. Tap the left half of the screen to push with the left stick, the right half for the right stick. Alternate left and right to build speed; pushing the same side twice bites less. A left push turns the sledge right, a right push turns it left, so you steer by pushing a little more on one side. Slush grabs the runners, a hole in the ice drops you in and you climb out a little way back, and straw bundles stop you dead. Beat the village kids to the far bank to clear the stage. Keyboard: ← → (or A and D).",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", time: "{0}秒", par: "目標 {0}秒", kids: "村の子 {0}人", start: "左右交互にトントン！ 棒で氷を押そう", win: "一番乗りで渡った！", lose: "先を越された", result: "{0}秒 · 落ちた {1}回",
    again: "もう一度", next: "次の面", fell: "ドボン！", slush: "ぬかるみ", bump: "ゴツン！", go: "スタート！",
    help: "凍った小川でそり競争。画面の左を押すと左手の棒で、右を押すと右手の棒で氷を押します。左右交互に押すとぐんぐん進み、同じ側ばかりだと力が入りません。左の棒で押すとそりは右へ、右で押すと左へ向きが変わるので、片側を少し多めに押して曲がります。ぬかるんだ氷はそりをつかまえ、氷の穴に落ちると少し手前からやり直し、わら束にぶつかると止まってしまいます。村の子より先に向こう岸に着けばクリア。キーボードは ← →(A・D)。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", time: "{0}秒", par: "目标 {0}秒", kids: "村里小孩 {0}人", start: "左右交替点！用钎子撑冰前进", win: "第一个过河！", lose: "被别人抢先了", result: "{0}秒 · 掉进冰窟 {1}次",
    again: "再玩一次", next: "下一关", fell: "扑通！", slush: "湿冰", bump: "咚！", go: "出发！",
    help: "在结冰的小溪上滑冰车。点屏幕左半边用左手钎子撑冰，点右半边用右手钎子。左右交替撑冰车跑得飞快，同一边连撑力气就小。撑左边冰车向右转，撑右边向左转，所以多撑一边就能转弯。湿冰会拖住冰车，掉进冰窟要从稍后面重新出发，撞到稻草捆会停住。比村里的小孩先到对岸就过关。键盘用 ← →（或 A、D）。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", time: "{0} s", par: "Objectif {0} s", kids: "{0} enfants du village", start: "Tapez gauche, droite ! Poussez sur la glace", win: "Premier sur l'autre rive !", lose: "Un enfant est arrivé avant vous", result: "{0} s · tombé {1} fois",
    again: "Rejouer", next: "Niveau suivant", fell: "Plouf !", slush: "Neige fondue", bump: "Bonk !", go: "Partez !",
    help: "Faites la course en petite luge sur un ruisseau gelé. Touchez la moitié gauche de l'écran pour pousser avec le bâton gauche, la droite pour le bâton droit. Alternez gauche et droite pour prendre de la vitesse ; deux poussées du même côté mordent moins. Une poussée à gauche tourne la luge vers la droite et inversement : on dirige en poussant un peu plus d'un côté. La neige fondue freine les patins, un trou dans la glace vous fait tomber et repartir un peu en arrière, et les bottes de paille vous arrêtent net. Arrivez sur l'autre rive avant les enfants du village. Clavier : ← → (ou A et D).",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", time: "{0} s", par: "Meta {0} s", kids: "{0} niños del pueblo", start: "¡Toca izquierda, derecha! Empuja sobre el hielo", win: "¡Primero en cruzar!", lose: "Un niño llegó antes", result: "{0} s · caíste {1} veces",
    again: "Otra vez", next: "Siguiente nivel", fell: "¡Chof!", slush: "Aguanieve", bump: "¡Pum!", go: "¡Ya!",
    help: "Corre en un trineo pequeño sobre un arroyo helado. Toca la mitad izquierda de la pantalla para empujar con el palo izquierdo y la derecha para el palo derecho. Alterna izquierda y derecha para ganar velocidad; dos empujes del mismo lado muerden menos. Un empuje a la izquierda gira el trineo a la derecha y al revés, así que diriges empujando un poco más de un lado. El aguanieve frena los patines, un agujero en el hielo te hace caer y salir un poco atrás, y las balas de paja te paran en seco. Llega a la otra orilla antes que los niños del pueblo. Teclado: ← → (o A y D).",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:ice-sledge:muted";

// Seen from above: the kid kneeling on the sledge, two sticks at the sides.
const SLEDGE: PixelArt = {
  palette: { k: "#212529", h: "#c92a2a", s: "#f1c27d", c: "#1c7ed6", w: "#8a5a3b", d: "#5c3a21", m: "#adb5bd" },
  rows: ["..kkkk..", ".khhhhk.", ".hhsshh.", "cccssccc", "cccccccc", ".cccccc.", "wwwwwwww", "wdwwwwdw", "wwwwwwww", "m......m"],
};
const RIVAL: PixelArt = { palette: { ...SLEDGE.palette, h: "#2f9e44", c: "#f08c00" }, rows: SLEDGE.rows };
const STRAW: PixelArt = {
  palette: { y: "#e0b85a", b: "#b8893a", d: "#8a6526" },
  rows: [".yyyyyy.", "yybyybyy", "dddddddd", "ybyyybyy", "yyybyyyb", ".yyyyyy."],
};
const REED: PixelArt = { palette: { g: "#868e96", b: "#a37a3f" }, rows: ["b.b", "g.g", "gbg", ".g.", ".g."] };

interface Pop { x: number; y: number; text: string; t: number; color: string }

export default function IceSledge({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ time: 0 });
  const [over, setOver] = useState<null | { won: boolean; stars: number; time: number; falls: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<Sledge>(newSledge(0));
  const started = useRef(false);
  const poles = useRef({ L: 0, R: 0 });
  const queued = useRef<Side[]>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const level = LEVELS[stage];

  useRunRecord(SLEDGE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    sRef.current = newSledge(st);
    started.current = false;
    queued.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
    setHud({ time: 0 });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(SLEDGE_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const handle = useCallback((ev: SledgeEvents) => {
    const s = sRef.current;
    const sy = SLED_SCREEN_Y;
    if (ev.push) {
      poles.current[ev.push] = 0.18;
      sfx("tap");
      spawnBurst(parts.current, s.x + (ev.push === "L" ? -14 : 14), sy + 12, ["#ffffff", "#d0ebff"], 4, 50, Math.floor(s.time * 1000));
    }
    if (ev.fell) {
      pops.current.push({ x: s.x, y: sy - 30, text: copyRef.current.fell, t: 1, color: "#1864ab" });
      spawnBurst(parts.current, s.x, sy, ["#74c0fc", "#ffffff", "#1c7ed6"], 26, 150, 9);
      sfx("fail");
    }
    if (ev.slush) pops.current.push({ x: s.x, y: sy - 30, text: copyRef.current.slush, t: 0.7, color: "#868e96" });
    if (ev.straw || ev.bank) {
      pops.current.push({ x: s.x, y: sy - 30, text: copyRef.current.bump, t: 0.6, color: "#e8590c" });
      sfx("place");
    }
    if (ev.finish) {
      const stars = starsFor(s);
      setOver({ won: s.won, stars, time: Math.round(s.time * 10) / 10, falls: s.falls });
      setHud({ time: Math.round(s.time * 10) / 10 });
      if (s.won) {
        setCleared(markStageCleared(SLEDGE_SLUG, s.level.stage, STAGE_COUNT));
        spawnBurst(parts.current, s.x, sy - 40, ["#ffd43b", "#e03131", "#1c7ed6", "#ffffff"], 40, 200, 3);
        sfx("win");
      } else sfx("lose");
    }
  }, [sfx]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let hudT = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const s = sRef.current;
      const l = s.level;
      // taps are applied once per frame, in order
      for (const side of queued.current.splice(0)) handle(push(s, side));
      if (started.current && !s.finished) {
        handle(stepSledge(s, dt));
        hudT -= dt;
        if (hudT <= 0) {
          hudT = 0.1;
          setHud({ time: Math.round(s.time * 10) / 10 });
        }
      }
      poles.current.L = Math.max(0, poles.current.L - dt);
      poles.current.R = Math.max(0, poles.current.R - dt);
      stepParticles(parts.current, dt, 120);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const Y = (d: number) => SLED_SCREEN_Y - (d - s.d); // screen y of a distance along the stream
        // snowy banks, then the ice strip row by row
        ctx.fillStyle = "#f1f6fb";
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);
        for (let sy = 0; sy < FIELD_H; sy += 6) {
          const d = s.d + (SLED_SCREEN_Y - sy);
          const cx = centerX(l, d);
          ctx.fillStyle = "#cfe3f3";
          ctx.fillRect(Math.round(cx - l.half - 6), sy, Math.round(l.half * 2 + 12), 6);
          ctx.fillStyle = ((Math.floor(d / 6) % 23) === 0) ? "#d8ecfa" : "#a9d2ee";
          ctx.fillRect(Math.round(cx - l.half), sy, Math.round(l.half * 2), 6);
          if (Math.floor(d / 6) % 31 === 0) {
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.fillRect(Math.round(cx - l.half * 0.6 + ((d * 7) % 40)), sy + 2, 26, 2);
          }
        }
        // reeds along the banks
        for (let d = Math.floor((s.d - 160) / 70) * 70; d < s.d + 520; d += 70) {
          const cx = centerX(l, d);
          drawSprite(ctx, REED, cx - l.half - 14, Y(d), { scale: 3 });
          drawSprite(ctx, REED, cx + l.half + 14, Y(d + 35), { scale: 3 });
        }
        // start and finish lines
        for (const ld of [0, l.length]) {
          const y = Y(ld);
          if (y < -10 || y > FIELD_H + 10) continue;
          const cx = centerX(l, ld);
          for (let x = cx - l.half; x < cx + l.half; x += 10) {
            ctx.fillStyle = Math.floor((x - cx) / 10) % 2 ? "#212529" : "#ffffff";
            ctx.fillRect(Math.round(x), Math.round(y) - 4, 10, 8);
          }
        }
        // hazards
        for (const h of l.hazards) {
          const y = Y(h.d);
          if (y < -60 || y > FIELD_H + 60) continue;
          if (h.kind === "slush") {
            ctx.fillStyle = "rgba(134,142,150,0.45)";
            ctx.beginPath();
            ctx.ellipse(h.x, y, h.r, h.r * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fillRect(Math.round(h.x - h.r * 0.4), Math.round(y - 3), 8, 3);
          } else if (h.kind === "hole") {
            ctx.fillStyle = "#e7f5ff";
            ctx.beginPath();
            ctx.arc(h.x, y, h.r + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#1c3d5a";
            ctx.beginPath();
            ctx.arc(h.x, y, h.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(116,192,252,0.5)";
            ctx.fillRect(Math.round(h.x - h.r * 0.5), Math.round(y - 2 + Math.sin(t * 3 + h.d) * 2), Math.round(h.r), 2);
          } else drawSprite(ctx, STRAW, h.x, y, { scale: 4 });
        }
        // rivals on the clean line, side by side
        if (started.current || s.finished) {
          l.rivals.forEach((_, k) => {
            const d = rivalD(l, k, s.time);
            const y = Y(d);
            if (y < -30 || y > FIELD_H + 30) return;
            const x = lineX(l, d) + (k % 2 ? -1 : 1) * (22 + k * 10);
            drawSprite(ctx, RIVAL, x, y, { scale: 3 });
          });
        }
        // the sledge (tilted along its heading) and its sticks
        if (s.fallen > 0) {
          ctx.fillStyle = "#1c7ed6";
          ctx.beginPath();
          ctx.arc(s.x, SLED_SCREEN_Y, 16 + Math.sin(t * 12) * 2, 0, Math.PI * 2);
          ctx.fill();
          drawSprite(ctx, SLEDGE, s.x, SLED_SCREEN_Y, { scale: 3, alpha: 0.5, rotate: Math.sin(t * 6) * 0.3 });
        } else {
          drawSprite(ctx, SLEDGE, s.x, SLED_SCREEN_Y, { scale: 3, rotate: s.heading });
          ctx.fillStyle = "#495057";
          for (const side of ["L", "R"] as const) {
            const k = poles.current[side] > 0 ? 1 : 0;
            const sx = s.x + (side === "L" ? -16 : 16);
            ctx.fillRect(Math.round(sx), SLED_SCREEN_Y - 10 + k * 8, 3, 18);
          }
        }
        drawParticles(ctx, parts.current);
        // touch halves
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(0, FIELD_H - 54, FIELD_W / 2 - 2, 54);
        ctx.fillRect(FIELD_W / 2 + 2, FIELD_H - 54, FIELD_W / 2 - 2, 54);
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = poles.current.L > 0 ? "#1c7ed6" : "rgba(33,37,41,0.5)";
        ctx.fillText("◀ L", FIELD_W / 4, FIELD_H - 20);
        ctx.fillStyle = poles.current.R > 0 ? "#1c7ed6" : "rgba(33,37,41,0.5)";
        ctx.fillText("R ▶", (FIELD_W * 3) / 4, FIELD_H - 20);
        // progress strip: you and the kids
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(FIELD_W - 10, 20, 4, FIELD_H - 100);
        const py = (d: number) => 20 + (FIELD_H - 100) * (1 - Math.min(1, d / l.length));
        l.rivals.forEach((_, k) => {
          ctx.fillStyle = "#2f9e44";
          ctx.fillRect(FIELD_W - 13, Math.round(py(rivalD(l, k, s.time))) - 2, 10, 4);
        });
        ctx.fillStyle = "#c92a2a";
        ctx.fillRect(FIELD_W - 14, Math.round(py(s.d)) - 3, 12, 6);
        for (const p of pops.current) {
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y - (1 - p.t) * 24);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [handle]);

  const pole = useCallback((side: Side) => {
    const s = sRef.current;
    if (s.finished) return;
    if (!started.current) {
      started.current = true;
      setTouched(true);
    }
    queued.current.push(side);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { pole("L"); e.preventDefault(); }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { pole("R"); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pole]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pole(e.clientX - rect.left < rect.width / 2 ? "L" : "R");
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="ice-sledge"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.time, hud.time.toFixed(1))}</Badge>
        <Badge variant="outline">{fill(c.par, level.par)}</Badge>
        <Badge variant="outline">{fill(c.kids, level.rivals.length)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage)} aria-label={c.again}>
            <RotateCcw className="size-5" />
          </Button>
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
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.time.toFixed(1), over.falls)}</p>
            {over.won ? <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" disabled={!over.won} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={stage} cleared={cleared} locale={locale} onSelect={(i) => start(i)} />
        </div>
      </details>
    </div>
  );
}
