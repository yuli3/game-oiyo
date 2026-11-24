import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { CELL, COLS, FIELD_H, FIELD_W, ROLL_SLUG, ROWS, SPOT_R, STAGE_COUNT, ballR, levelFor, newRoll, starsFor, steer, stepRoll, type Roll, type RollEvents } from "../../lib/games/snow-roll";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; size: string; head: string; time: string; start: string; startHead: string; win: string; lose: string; big: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; parked: string; mud: string;
}> = {
  ko: {
    stage: "{0}단계", size: "몸통 {0}/{1}", head: "머리 {0} ({1}~{2})", time: "남은 시간 {0}초", start: "누른 채 끌어서 눈덩이를 굴려요", startHead: "이제 머리! 너무 크면 못 올려요", win: "눈사람 완성!", lose: "시간이 다 됐어요", big: "머리가 너무 커져서 못 올려요", result: "{0}초 만에 완성",
    again: "다시 하기", next: "다음 단계", parked: "몸통 자리 잡았어요!", mud: "흙이 묻어요",
    help: "눈 쌓인 마당에서 눈사람을 만들어요. 화면을 누른 채 끌면 눈덩이가 손가락 쪽으로 굴러가요. 새하얀 눈 위를 지나면 눈이 묻어 눈덩이가 커지고, 지나간 자리는 맨땅이 드러나요. 커질수록 무거워져 천천히 굴러가요. 흙탕에 들어가면 눈이 떨어져 작아지고, 바위와 울타리에는 막혀요. 몸통을 목표 크기까지 키워 눈사람 자리(동그라미)에 세우면 통과예요. 11단계부터는 머리도 굴려서 몸통 위에 올려야 하는데, 머리가 정해진 크기보다 커지면 들어 올릴 수 없으니 조심하세요. 키보드는 방향키로 굴려요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", size: "Body {0}/{1}", head: "Head {0} ({1}–{2})", time: "{0}s left", start: "Hold and drag to roll the snowball", startHead: "Now the head! Too big and you can't lift it", win: "Snowman built!", lose: "Out of time", big: "The head got too big to lift", result: "Built in {0}s",
    again: "Play again", next: "Next stage", parked: "Body in place!", mud: "Mud sticks",
    help: "Build a snowman in a snowy yard. Hold and drag and the snowball rolls toward your finger. Rolling over fresh snow packs it on and the ball grows, leaving bare ground behind; the bigger it gets, the heavier and slower it rolls. Mud knocks snow off, and rocks and fences block the way. Grow the body to the target size and park it on the snowman spot (the circle) to clear the stage. From stage 11 you also roll a head and lift it onto the body, but a head that grows past its size limit is too heavy to lift. Keyboard: arrow keys roll the ball.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", size: "胴 {0}/{1}", head: "頭 {0}（{1}〜{2}）", time: "残り {0}秒", start: "押したままドラッグして雪玉を転がそう", startHead: "次は頭！大きすぎると載せられない", win: "雪だるま完成！", lose: "時間切れ", big: "頭が大きくなりすぎて持ち上がらない", result: "{0}秒で完成",
    again: "もう一度", next: "次の面", parked: "胴が決まった！", mud: "泥がつく",
    help: "雪の積もった庭で雪だるまを作ろう。押したままドラッグすると、雪玉が指の方へ転がります。新雪の上を通ると雪がついて大きくなり、通ったあとは地面が出ます。大きくなるほど重くゆっくりに。泥に入ると雪が落ちて小さくなり、岩や柵には止められます。胴を目標の大きさまで育てて雪だるまの場所（丸印）に置けばクリア。11面からは頭も転がして胴の上に載せますが、頭が決められた大きさを超えると重くて持ち上がりません。キーボードは矢印キー。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", size: "身体 {0}/{1}", head: "头 {0}（{1}~{2}）", time: "剩余 {0}秒", start: "按住拖动来滚雪球", startHead: "该做头了！太大就搬不上去", win: "雪人堆好了！", lose: "时间到了", big: "头太大，搬不上去了", result: "{0}秒完成",
    again: "再玩一次", next: "下一关", parked: "身体放好了！", mud: "沾上泥了",
    help: "在积雪的院子里堆雪人。按住拖动，雪球就会朝手指滚过去。滚过新雪会粘上雪越滚越大，滚过的地方露出地面；雪球越大越重、滚得越慢。滚进泥地会掉雪变小，石头和篱笆会挡路。把身体滚到目标大小，停到雪人位置（圆圈）上就过关。第11关起还要滚一个头放到身体上，但头超过规定大小就太重搬不上去了。键盘用方向键滚动。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", size: "Corps {0}/{1}", head: "Tête {0} ({1}–{2})", time: "{0} s restantes", start: "Maintenez et glissez pour rouler la boule", startHead: "La tête maintenant ! Trop grosse, impossible de la soulever", win: "Bonhomme de neige terminé !", lose: "Temps écoulé", big: "La tête est trop grosse à soulever", result: "Terminé en {0} s",
    again: "Rejouer", next: "Niveau suivant", parked: "Le corps est en place !", mud: "La boue colle",
    help: "Construisez un bonhomme de neige dans une cour enneigée. Maintenez et glissez : la boule roule vers votre doigt. Sur la neige fraîche, elle grossit et laisse la terre à nu derrière elle ; plus elle grossit, plus elle est lourde et lente. La boue lui fait perdre de la neige, rochers et clôtures bloquent le passage. Faites grossir le corps jusqu'à la taille voulue et garez-le sur l'emplacement (le cercle). Dès le niveau 11, roulez aussi une tête et posez-la sur le corps, mais une tête qui dépasse sa taille limite devient trop lourde à soulever. Clavier : flèches.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", size: "Cuerpo {0}/{1}", head: "Cabeza {0} ({1}–{2})", time: "Quedan {0} s", start: "Mantén y arrastra para rodar la bola", startHead: "¡Ahora la cabeza! Si crece mucho no podrás subirla", win: "¡Muñeco terminado!", lose: "Se acabó el tiempo", big: "La cabeza es demasiado grande para subirla", result: "Hecho en {0} s",
    again: "Otra vez", next: "Siguiente nivel", parked: "¡Cuerpo en su sitio!", mud: "Se pega el barro",
    help: "Haz un muñeco de nieve en un patio nevado. Mantén y arrastra: la bola rueda hacia tu dedo. Al pasar por nieve fresca se le pega y crece, dejando el suelo al descubierto; cuanto más grande, más pesada y lenta rueda. El barro le quita nieve, y las rocas y vallas cortan el paso. Haz crecer el cuerpo hasta el tamaño pedido y aparcarlo en el sitio del muñeco (el círculo) para superar el nivel. Desde el nivel 11 también ruedas una cabeza y la subes al cuerpo, pero si crece más de su límite pesa demasiado para levantarla. Teclado: flechas.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:snow-roll:muted";

const KID: PixelArt = {
  palette: { k: "#212529", h: "#e03131", s: "#f1c27d", c: "#364fc7", m: "#ffd43b", b: "#495057" },
  rows: ["..hhhh..", ".hhhhhh.", ".kssssk.", "..ssss..", "mcccccm.", ".cccccc.", ".cc..cc.", ".bb..bb."],
};
const ROCK: PixelArt = { palette: { a: "#868e96", b: "#adb5bd", d: "#495057", w: "#ffffff" }, rows: ["..wwww..", ".wwbbaa.", "abbbaaad", "abaaaadd", "aaaadddd", ".dddddd."] };
const FACE: PixelArt = { palette: { k: "#212529", o: "#f76707" }, rows: ["k...k", ".....", "..oo.", ".k.k.", "..k.."] };
const SCARF: PixelArt = { palette: { r: "#e03131", d: "#a51111" }, rows: ["rrrrrrrr", "drrrrrrd", "......rr", "......rd"] };

interface Pop { x: number; y: number; text: string; t: number; color: string }

export default function SnowRoll({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ r: 7, left: 0, phase: "body" as Roll["phase"] });
  const [over, setOver] = useState<null | { won: boolean; stars: number; time: number; big: boolean }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<Roll | null>(null);
  const live = useRef(false);
  const finger = useRef<null | { id: number; x: number; y: number }>(null);
  const keys = useRef({ x: 0, y: 0 });
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;

  useRunRecord(ROLL_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((st: number) => {
    setStage(st);
    const s = newRoll(levelFor(st));
    sRef.current = s;
    live.current = false;
    finger.current = null;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
    setHud({ r: Math.round(ballR(s)), left: s.level.timeLimit, phase: "body" });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(ROLL_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const handle = useCallback((s: Roll, ev: RollEvents) => {
    if (ev.parked) {
      pops.current.push({ x: s.level.spot.x, y: s.level.spot.y - 40, text: copyRef.current.parked, t: 1.2, color: "#1c7ed6" });
      spawnBurst(parts.current, s.level.spot.x, s.level.spot.y, ["#ffffff", "#d0ebff", "#ffd43b"], 24, 140, 5);
      sfx(s.over ? "win" : "combo");
    }
    if (ev.mud && Math.random() < 0.04) pops.current.push({ x: s.ball.x, y: s.ball.y - 30, text: copyRef.current.mud, t: 0.6, color: "#8a5a3b" });
    if (ev.bump && Math.random() < 0.3) sfx("place");
    if (s.over) {
      setOver({ won: s.won, stars: starsFor(s), time: Math.ceil(s.time), big: s.cause === "big" });
      if (s.won) {
        setCleared(markStageCleared(ROLL_SLUG, s.level.stage, STAGE_COUNT));
        spawnBurst(parts.current, s.level.spot.x, s.level.spot.y - 30, ["#ffd43b", "#e03131", "#ffffff", "#74c0fc"], 40, 200, 3);
        if (!ev.parked) sfx("win");
      } else sfx("lose");
    }
  }, [sfx]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let hudT = 0;
    let trailT = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const s = sRef.current;
      if (s && live.current && !s.over) {
        // the finger (or the arrow keys) is read once per frame
        const f = finger.current;
        const k = keys.current;
        if (f) steer(s, f.x, f.y);
        else if (k.x || k.y) steer(s, s.ball.x + k.x * 80, s.ball.y + k.y * 80);
        else steer(s, null);
        const ev = stepRoll(s, dt);
        handle(s, ev);
        if (ev.grew > 0 && (trailT -= dt) <= 0) {
          trailT = 0.12;
          spawnBurst(parts.current, s.ball.x, s.ball.y + ballR(s) * 0.6, ["#ffffff", "#e7f5ff"], 2, 30, Math.floor(now));
        }
        if ((hudT -= dt) <= 0 || s.over) {
          hudT = 0.15;
          setHud({ r: Math.round(ballR(s)), left: Math.max(0, Math.ceil(s.level.timeLimit - s.time)), phase: s.phase });
        }
      }
      stepParticles(parts.current, dt, 60);
      pops.current = pops.current.filter((p) => (p.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && s) {
        ctx.imageSmoothingEnabled = false;
        const l = s.level;
        // the yard: snow depth per cell over the frozen ground
        ctx.fillStyle = "#7d8f69";
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);
        for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
          const d = s.snow[r * COLS + cc];
          if (d <= 0.02) {
            ctx.fillStyle = (r + cc) % 3 ? "#8a9a73" : "#7a8963";
          } else {
            const v = Math.round(200 + d * 55);
            ctx.fillStyle = `rgb(${v - 8},${v - 2},${Math.min(255, v + 6)})`;
          }
          ctx.fillRect(cc * CELL, r * CELL, CELL, CELL);
        }
        for (const m of l.mud) {
          ctx.fillStyle = "rgba(110,72,40,0.85)";
          ctx.beginPath();
          ctx.ellipse(m.x, m.y, m.r, m.r * 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(160,110,70,0.6)";
          ctx.fillRect(Math.round(m.x - m.r * 0.4), Math.round(m.y - 3), Math.round(m.r * 0.5), 3);
        }
        for (const f of l.fences) {
          ctx.fillStyle = "#8a5a3b";
          ctx.fillRect(f.x, f.y, f.w, f.h);
          ctx.fillStyle = "#5c3a21";
          if (f.w > f.h) for (let x = f.x; x < f.x + f.w; x += 18) ctx.fillRect(Math.round(x), f.y - 6, 6, f.h + 12);
          else for (let y = f.y; y < f.y + f.h; y += 18) ctx.fillRect(f.x - 6, Math.round(y), f.w + 12, 6);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(f.x, f.y - 2, f.w, 2);
        }
        for (const k of l.rocks) drawSprite(ctx, ROCK, k.x, k.y, { scale: Math.max(3, Math.round((k.r * 2) / 8)) });
        // the snowman spot
        ctx.strokeStyle = s.phase === "body" ? "#1c7ed6" : "rgba(28,126,214,0.3)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(l.spot.x, l.spot.y, Math.max(SPOT_R, l.body), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        const ball = (x: number, y: number, r: number) => {
          ctx.fillStyle = "rgba(40,60,80,0.25)";
          ctx.beginPath();
          ctx.ellipse(x + r * 0.2, y + r * 0.75, r * 0.95, r * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e9f1f8";
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.65, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#c5d8ea";
          for (let k = 0; k < 5; k++) ctx.fillRect(Math.round(x + Math.cos(k * 1.7 + x * 0.05) * r * 0.6), Math.round(y + Math.sin(k * 2.3 + y * 0.05) * r * 0.6), 3, 3);
        };
        if (s.phase !== "body") {
          ball(l.spot.x, l.spot.y, s.bodyR);
          drawSprite(ctx, SCARF, l.spot.x, l.spot.y - s.bodyR + 4, { scale: 3 });
        }
        if (s.phase === "done" && l.head) {
          const hr = ballR(s);
          ball(l.spot.x, l.spot.y - s.bodyR - hr * 0.7, hr);
          drawSprite(ctx, FACE, l.spot.x, l.spot.y - s.bodyR - hr * 0.7, { scale: 3 });
        } else if (!(s.phase === "done" && !l.head)) {
          const r = ballR(s);
          ball(s.ball.x, s.ball.y, r);
          // the kid pushes from behind the ball
          const sp = Math.hypot(s.ball.vx, s.ball.vy);
          const dx = sp > 5 ? -s.ball.vx / sp : 0;
          const dy = sp > 5 ? -s.ball.vy / sp : 1;
          drawSprite(ctx, KID, s.ball.x + dx * (r + 12), s.ball.y + dy * (r + 12), { scale: 3 });
          if (s.phase === "head" && l.head) {
            // the head's size window
            ctx.strokeStyle = r > l.head.max * 0.92 ? "#e03131" : "rgba(47,158,68,0.8)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(s.ball.x, s.ball.y, l.head.max, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          drawSprite(ctx, FACE, l.spot.x, l.spot.y - s.bodyR * 0.3, { scale: 3 });
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const p of pops.current) {
          ctx.font = "bold 17px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          const w = ctx.measureText(p.text).width + 12;
          const py = p.y - (1.2 - p.t) * 16;
          ctx.fillRect(Math.max(4, Math.min(FIELD_W - w - 4, p.x - w / 2)), py - 17, w, 23);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, Math.max(w / 2 + 4, Math.min(FIELD_W - w / 2 - 4, p.x)), py);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [handle]);

  useEffect(() => {
    const set = (e: KeyboardEvent, on: boolean) => {
      const k = keys.current;
      if (e.key === "ArrowLeft") k.x = on ? -1 : k.x === -1 ? 0 : k.x;
      else if (e.key === "ArrowRight") k.x = on ? 1 : k.x === 1 ? 0 : k.x;
      else if (e.key === "ArrowUp") k.y = on ? -1 : k.y === -1 ? 0 : k.y;
      else if (e.key === "ArrowDown") k.y = on ? 1 : k.y === 1 ? 0 : k.y;
      else return;
      e.preventDefault();
      if (on && sRef.current && !sRef.current.over) { live.current = true; setTouched(true); }
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * FIELD_W, y: ((e.clientY - rect.top) / rect.height) * FIELD_H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sRef.current;
    if (!s || s.over || finger.current) return;
    live.current = true;
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    finger.current = { id: e.pointerId, ...toField(e) };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const f = finger.current;
    if (!f || f.id !== e.pointerId) return;
    Object.assign(f, toField(e));
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (finger.current?.id === e.pointerId) finger.current = null;
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const level = sRef.current?.level;
  return (
    <div
      ref={containerRef}
      data-game="snow-roll"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        {level && hud.phase === "head" && level.head ? (
          <Badge variant="outline">{fill(c.head, hud.r, level.head.min, level.head.max)}</Badge>
        ) : (
          <Badge variant="outline">{fill(c.size, hud.r, level?.body ?? 0)}</Badge>
        )}
        <Badge variant="outline">{fill(c.time, hud.left)}</Badge>
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
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {(!touched || hud.phase === "head") && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-4 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{hud.phase === "head" ? c.startHead : c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/3 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : over.big ? c.big : c.lose}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.time)}</p> : null}
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
