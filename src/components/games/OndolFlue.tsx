import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
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
import { ONDOL_SLUG, PUZZLES, STAGE_COUNT, canTurn, heatOf, newBoard, shapeAt, starsFor, tap, undo, type Heat, type OndolBoard } from "../../lib/games/ondol-flue";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; taps: string; best: string; start: string; win: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; undo: string; reset: string; leaks: string; warm: string;
}> = {
  ko: {
    stage: "{0}단계", taps: "{0}번 돌림", best: "목표 {0}", start: "돌을 눌러 고래를 이어요", win: "온 집이 뜨끈해졌어요!", result: "{0}번 돌려 완성 (목표 {1}번)",
    again: "다시 하기", next: "다음 단계", undo: "한 번 되돌리기", reset: "처음부터", leaks: "연기 새는 곳 {0}", warm: "따뜻한 방 {0}/{1}",
    help: "구들장 돌을 누르면 시계 방향으로 한 번 돌아가요. 아래 아궁이 불에서 시작한 고래(불길)를 이어서 굴뚝까지 열이 가게 하세요. 모든 고래가 서로 맞물리고 끊긴 끝이 하나도 없으면 연기가 굴뚝으로 빠지고 온 방이 따뜻해져요. 끊긴 끝에서는 연기가 새요. 아궁이 돌은 돌지 않고, 검은 돌은 고래가 없는 막힌 돌이에요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", taps: "{0} turns", best: "Goal {0}", start: "Tap stones to join the flues", win: "The whole house is toasty!", result: "Done in {0} turns (goal {1})",
    again: "Play again", next: "Next stage", undo: "Undo one turn", reset: "Start over", leaks: "Smoke leaks {0}", warm: "Warm rooms {0}/{1}",
    help: "Tap a floor stone to turn it a quarter clockwise. Join the flue channels so the heat from the kitchen fire below runs all the way to the chimney. When every channel meets another and no end is left open, the smoke goes up the chimney and the whole floor warms up. Open ends leak smoke. The stone over the fire never turns, and black stones are solid.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", taps: "{0}回", best: "目標 {0}", start: "石をタップして煙道をつなごう", win: "家じゅうぽかぽか！", result: "{0}回で完成 (目標 {1}回)",
    again: "もう一度", next: "次の面", undo: "一回戻す", reset: "最初から", leaks: "煙もれ {0}", warm: "暖かい部屋 {0}/{1}",
    help: "床石をタップすると時計回りに90度回ります。下のかまどの火から煙道をつないで、熱を煙突まで届けましょう。すべての煙道がかみ合って開いた端がなくなると、煙が煙突から抜けて床全体が暖まります。開いた端からは煙がもれます。かまどの上の石は回らず、黒い石は道のない石です。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", taps: "转了{0}次", best: "目标 {0}", start: "点石头接通烟道", win: "整个屋子都暖和了！", result: "转{0}次完成 (目标{1}次)",
    again: "再玩一次", next: "下一关", undo: "撤回一次", reset: "重新开始", leaks: "漏烟 {0}", warm: "暖房 {0}/{1}",
    help: "点一下地板石，它会顺时针转90度。把烟道接起来，让下方灶火的热一直通到烟囱。所有烟道都互相接上、没有断开的口时，烟从烟囱冒出，整片地板都会变暖。断开的口会漏烟。灶口上的石头不能转，黑色石头没有烟道。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", taps: "{0} tours", best: "Objectif {0}", start: "Touchez les pierres pour relier les conduits", win: "Toute la maison est bien chaude !", result: "Fini en {0} tours (objectif {1})",
    again: "Rejouer", next: "Niveau suivant", undo: "Annuler un tour", reset: "Recommencer", leaks: "Fuites de fumée {0}", warm: "Pièces chaudes {0}/{1}",
    help: "Touchez une pierre du sol pour la tourner d'un quart dans le sens des aiguilles. Reliez les conduits pour que la chaleur du feu de cuisine, en bas, aille jusqu'à la cheminée. Quand chaque conduit en rejoint un autre sans aucune extrémité ouverte, la fumée sort par la cheminée et tout le sol se réchauffe. Les extrémités ouvertes laissent fuir la fumée. La pierre au-dessus du feu ne tourne pas ; les pierres noires sont pleines.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", taps: "{0} giros", best: "Meta {0}", start: "Toca las piedras para unir los conductos", win: "¡Toda la casa está calentita!", result: "Hecho en {0} giros (meta {1})",
    again: "Otra vez", next: "Siguiente nivel", undo: "Deshacer un giro", reset: "Empezar de nuevo", leaks: "Fugas de humo {0}", warm: "Cuartos calientes {0}/{1}",
    help: "Toca una piedra del suelo para girarla un cuarto en el sentido del reloj. Une los conductos para que el calor del fogón de abajo llegue hasta la chimenea. Cuando todos los conductos encajan y no queda ningún extremo abierto, el humo sale por la chimenea y todo el suelo se calienta. Los extremos abiertos dejan escapar humo. La piedra sobre el fuego no gira y las piedras negras son macizas.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:ondol-flue:muted";
const W = 360;
const H = 450;
const TOP = 50;
const BOTTOM = 58;
const GRID = 344;

const SLEEPER: PixelArt = {
  palette: { s: "#f1c27d", k: "#343a40", r: "#e03131", p: "#f783ac", w: "#fff5f5", b: "#1c7ed6" },
  rows: ["..kk......", ".ksskwwww.", ".ksskwwww.", "rrrrrrrrrr", "rpprpprppr", "rrrrrrrrrr"],
};
const FIRE: PixelArt = {
  palette: { r: "#e03131", o: "#f76707", y: "#ffd43b", w: "#fff9db" },
  rows: ["...r....", "..ro..r.", ".roor.or", ".royyoor", "royywyor", "roywwyor", ".ryyyyr."],
};
const POT: PixelArt = {
  palette: { k: "#212529", g: "#495057", l: "#868e96" },
  rows: ["....kk....", "..kkkkkk..", "kkkkkkkkkk", ".gggggggg.", ".gllggggg.", "..gggggg.."],
};
const CHIMNEY: PixelArt = {
  palette: { b: "#8a5a3b", d: "#5c3d2e", w: "#ffffff", g: "#adb5bd" },
  rows: ["dddddd", ".bbbb.", ".bgbb.", ".bbbb.", ".bbgb.", ".bbbb.", ".bbbb."],
};

function layout(b: OndolBoard) {
  const p = b.puzzle;
  const cs = Math.floor(Math.min(GRID / p.w, (H - TOP - BOTTOM) / p.h));
  const ox = Math.floor((W - cs * p.w) / 2);
  const oy = TOP + Math.floor((H - TOP - BOTTOM - cs * p.h) / 2);
  return { cs, ox, oy };
}

export default function OndolFlue({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [taps, setTaps] = useState(0);
  const [leaks, setLeaks] = useState(0);
  const [warmRooms, setWarmRooms] = useState(0);
  const [won, setWon] = useState<null | { stars: number; taps: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardRef = useRef<OndolBoard>(newBoard(PUZZLES[0]));
  const heatRef = useRef<Heat>(heatOf(boardRef.current));
  const spinRef = useRef<number[]>([]); // leftover turn animation per tile (radians)
  const glowRef = useRef<number[]>([]); // 0..1 warmth shown per tile
  const downRef = useRef<null | { id: number; x: number; y: number }>(null);
  const wonAt = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const puzzle = PUZZLES[stage];
  useRunRecord(ONDOL_SLUG, Boolean(won), won?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const sync = useCallback(() => {
    const b = boardRef.current;
    const heat = heatOf(b);
    heatRef.current = heat;
    setTaps(b.taps);
    setLeaks(heat.leaks.length);
    setWarmRooms(b.puzzle.sleepers.filter((i) => heat.warm[i]).length);
    return heat;
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    const b = newBoard(PUZZLES[s]);
    boardRef.current = b;
    spinRef.current = new Array(b.turn.length).fill(0);
    glowRef.current = new Array(b.turn.length).fill(0);
    parts.current = [];
    setWon(null);
    setTouched(false);
    sync();
  }, [sync]);

  useEffect(() => {
    const done = loadClearedStages(ONDOL_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let smoke = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      stepParticles(parts.current, dt, -30);
      const ctx = canvasRef.current?.getContext("2d");
      const b = boardRef.current;
      const p = b.puzzle;
      const heat = heatRef.current;
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const { cs, ox, oy } = layout(b);
        // night sky over the eaves, kitchen below
        ctx.fillStyle = "#1b1f3b";
        ctx.fillRect(0, 0, W, TOP);
        for (let k = 0; k < 18; k++) {
          ctx.fillStyle = k % 3 ? "#dee2e6" : "#ffd43b";
          ctx.fillRect((k * 61) % W, 4 + ((k * 23) % (TOP - 20)), 2, 2);
        }
        ctx.fillStyle = "#343a40";
        ctx.fillRect(0, TOP - 10, W, 10);
        ctx.fillStyle = "#495057";
        for (let x = 0; x < W; x += 12) ctx.fillRect(x, TOP - 10, 8, 4);
        ctx.fillStyle = "#f3d9b1";
        ctx.fillRect(0, TOP, W, H - TOP - BOTTOM);
        ctx.fillStyle = "#5c3d2e";
        ctx.fillRect(0, H - BOTTOM, W, BOTTOM);
        ctx.fillStyle = "#3b2a20";
        for (let x = 0; x < W; x += 24) ctx.fillRect(x + ((Math.floor(x / 24) % 2) * 12), H - BOTTOM + 18, 12, 4);

        const fx = ox + (p.fire % p.w) * cs + cs / 2;
        const chx = ox + (p.chimney % p.w) * cs + cs / 2;
        drawSprite(ctx, CHIMNEY, chx, TOP - 22, { scale: 4 });
        for (let i = 0; i < p.solved.length; i++) {
          const x = ox + (i % p.w) * cs;
          const y = oy + Math.floor(i / p.w) * cs;
          const m = p.solved[i];
          // glow eases toward the heat
          const target = heat.warm[i] ? 1 : 0;
          glowRef.current[i] = (glowRef.current[i] ?? 0) + (target - (glowRef.current[i] ?? 0)) * Math.min(1, dt * 5);
          const g = glowRef.current[i];
          if (!m) {
            ctx.fillStyle = "#343a40";
            ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
            ctx.fillStyle = "#495057";
            ctx.fillRect(x + 5, y + 5, cs / 3, cs / 4);
            ctx.fillRect(x + cs / 2, y + cs / 2, cs / 3, cs / 5);
            continue;
          }
          const cr = Math.round(206 + (255 - 206) * g);
          const cg = Math.round(212 + (192 - 212) * g);
          const cb = Math.round(218 + (120 - 218) * g);
          ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
          ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
          ctx.fillStyle = "rgba(0,0,0,0.08)";
          ctx.fillRect(x + 1, y + cs - 5, cs - 2, 4);
          // the channel, turning smoothly after a tap
          const shape = shapeAt(b, i);
          spinRef.current[i] = (spinRef.current[i] ?? 0) * Math.max(0, 1 - dt * 14);
          ctx.save();
          ctx.translate(x + cs / 2, y + cs / 2);
          ctx.rotate(spinRef.current[i]);
          const cw = Math.max(8, Math.round(cs * 0.28));
          const flick = 0.75 + 0.25 * Math.sin(t * 9 + i);
          ctx.fillStyle = g > 0.5 ? `rgba(240,${Math.round(110 + 40 * flick)},20,1)` : "#6c4a36";
          ctx.fillRect(-cw / 2, -cw / 2, cw, cw);
          if (shape & 1) ctx.fillRect(-cw / 2, -cs / 2, cw, cs / 2);
          if (shape & 2) ctx.fillRect(0, -cw / 2, cs / 2, cw);
          if (shape & 4) ctx.fillRect(-cw / 2, 0, cw, cs / 2);
          if (shape & 8) ctx.fillRect(-cs / 2, -cw / 2, cs / 2, cw);
          ctx.fillStyle = g > 0.5 ? "#ffd43b" : "#3b2a20";
          const ln = Math.max(2, Math.round(cw / 4));
          if (shape & 1) ctx.fillRect(-ln / 2, -cs / 2, ln, cs / 2);
          if (shape & 2) ctx.fillRect(0, -ln / 2, cs / 2, ln);
          if (shape & 4) ctx.fillRect(-ln / 2, 0, ln, cs / 2);
          if (shape & 8) ctx.fillRect(-cs / 2, -ln / 2, cs / 2, ln);
          ctx.restore();
          if (!canTurn(p, i)) {
            ctx.strokeStyle = i === p.fire ? "#c92a2a" : "#868e96";
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 3, y + 3, cs - 6, cs - 6);
          }
        }
        // sleepers shiver until their room is warm
        for (const i of p.sleepers) {
          const x = ox + (i % p.w) * cs + cs / 2;
          const y = oy + Math.floor(i / p.w) * cs + cs / 2;
          const warm = heat.warm[i];
          const jig = warm ? 0 : Math.round(Math.sin(t * 30 + i) * 1.5);
          drawSprite(ctx, SLEEPER, x + jig, y + cs * 0.18, { scale: Math.max(3, Math.floor(cs / 14)) });
          if (warm) {
            ctx.fillStyle = "#1c7ed6";
            ctx.font = "bold 12px monospace";
            ctx.fillText("z", x + cs * 0.22, y - cs * 0.2 - ((t * 8) % 6));
          }
        }
        // the kitchen fire and pot under the fire stone
        drawSprite(ctx, POT, fx, H - BOTTOM + 14, { scale: 3 });
        drawSprite(ctx, FIRE, fx, H - 16 + Math.round(Math.sin(t * 12)), { scale: 3 });
        // smoke: from leaks while unsolved, from the chimney once solved
        smoke += dt;
        if (smoke > 0.12) {
          smoke = 0;
          if (won) spawnBurst(parts.current, chx, TOP - 50, ["#ced4da", "#f1f3f5"], 2, 20, Math.floor(t * 100));
          else {
            for (const lk of heat.leaks) {
              if (!heat.warm[lk.cell] || Math.random() > 0.35) continue;
              const x = ox + (lk.cell % p.w) * cs + cs / 2 + [0, 1, 0, -1][lk.dir] * cs * 0.45;
              const y = oy + Math.floor(lk.cell / p.w) * cs + cs / 2 + [-1, 0, 1, 0][lk.dir] * cs * 0.45;
              spawnBurst(parts.current, x, y, ["#868e96", "#adb5bd"], 2, 18, Math.floor(t * 1000) + lk.cell);
            }
          }
        }
        drawParticles(ctx, parts.current);
        if (won && now - wonAt.current < 1500) {
          ctx.fillStyle = `rgba(255,192,120,${0.35 * (1 - (now - wonAt.current) / 1500)})`;
          ctx.fillRect(0, TOP, W, H - TOP - BOTTOM);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [won]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (won) return;
    setTouched(true);
    const p = toField(e);
    downRef.current = { id: e.pointerId, x: p.x, y: p.y };
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = downRef.current;
    downRef.current = null;
    if (!d || d.id !== e.pointerId || won) return;
    const p = toField(e);
    if (Math.hypot(p.x - d.x, p.y - d.y) > 18) return;
    const b = boardRef.current;
    const { cs, ox, oy } = layout(b);
    const gx = Math.floor((d.x - ox) / cs);
    const gy = Math.floor((d.y - oy) / cs);
    if (gx < 0 || gy < 0 || gx >= b.puzzle.w || gy >= b.puzzle.h) return;
    const i = gy * b.puzzle.w + gx;
    if (!tap(b, i)) {
      sfx("fail");
      return;
    }
    spinRef.current[i] = (spinRef.current[i] ?? 0) - Math.PI / 2;
    const heat = sync();
    if (heat.done) {
      const stars = starsFor(b.taps, b.puzzle);
      wonAt.current = performance.now();
      setWon({ stars, taps: b.taps });
      setCleared(markStageCleared(ONDOL_SLUG, b.puzzle.stage, STAGE_COUNT));
      spawnBurst(parts.current, W / 2, H / 2, ["#ffd43b", "#ff922b", "#fff9db"], 30, 160, b.taps);
      sfx("win");
    } else sfx(heat.warm[i] ? "place" : "tap");
  };

  const onUndo = () => {
    if (won) return;
    const b = boardRef.current;
    const i = b.history[b.history.length - 1];
    if (undo(b)) {
      spinRef.current[i] = (spinRef.current[i] ?? 0) + Math.PI / 2;
      sfx("tap");
      sync();
    }
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
      data-game="ondol-flue"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.taps, taps)}</Badge>
        <Badge variant="outline">{fill(c.best, puzzle.par)}</Badge>
        <Badge variant="outline">{fill(c.warm, warmRooms, puzzle.sleepers.length)}</Badge>
        <Badge variant="outline">{fill(c.leaks, leaks)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={onUndo} aria-label={c.undo} disabled={taps === 0 || Boolean(won)}>
            <Undo2 className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage)} aria-label={c.reset}>
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
          width={W}
          height={H}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={() => (downRef.current = null)}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !won ? (
          <div className="pointer-events-none absolute inset-x-0 top-14 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {won ? (
          <div className="absolute inset-x-4 bottom-4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{c.win}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, won.taps, puzzle.par)}</p>
            <p className="text-2xl tracking-widest text-warning" aria-label={`${won.stars}/3`}>{"★".repeat(won.stars)}{"☆".repeat(3 - won.stars)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
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
