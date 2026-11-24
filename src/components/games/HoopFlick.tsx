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
import { BOARD_GAP, BOARD_TOP, GRAVITY, HOOP_SLUG, HOOP_STAGES, MAX_SPEED, RIM, STAGE_COUNT, boardSide, flick, hoopX, newCourt, starsFor, step, type Court } from "../../lib/games/hoop-flick";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    goal: "{0}점 목표",
    start: "공에서 골대 쪽으로 쓱 밀어 던져요!",
    win: "목표 점수 달성!",
    lose: "점수가 모자라요",
    result: "{0}점 · 클린슛 {1}번",
    help: "공이 코트 여기저기에 놓여요. 공에서 골대 쪽으로 화면을 쓱 밀었다 떼면 던져져요. 민 방향이 던지는 방향, 민 길이가 힘이에요(점선이 날아갈 길을 보여 줘요). 공은 림과 백보드에 튕기고, 위에서 아래로 링을 통과하면 2점, 아무 데도 안 닿고 쏙 들어가면 클린슛 3점이에요. 높이 띄워 위에서 떨어뜨리는 게 잘 들어가요. 6단계부터 골대가 좌우로 움직이니 떨어질 즈음의 자리를 노려요. 공을 다 던진 뒤 목표 점수를 넘기면 통과, 점수가 높을수록 별이 늘어요. 키보드는 ←/→로 각도, ↑/↓로 힘, Space로 던져요.",
    again: "다시 하기",
    next: "다음 단계",
    stages: "단계 고르기",
    full: "전체화면",
    exitFull: "나가기",
    mute: "소리 끄기",
    unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}",
    goal: "Goal {0}",
    start: "Flick from the ball toward the hoop!",
    win: "Goal reached!",
    lose: "Not enough points",
    result: "{0} points · {1} swishes",
    help: "Balls sit here and there on the court. Swipe from the ball toward the hoop and let go to throw: the swipe's direction is the throw's direction and its length the power (the dotted line shows the path). The ball bounces off the rim and backboard; dropping down through the ring scores 2, and a clean swish that touches nothing scores 3. A high arc that drops in from above goes in best. From stage 6 the hoop slides from side to side, so aim where it will be as the ball comes down. Reach the goal once every ball is thrown to pass; more points, more stars. Keys: ← / → for angle, ↑ / ↓ for power, Space to throw.",
    again: "Try again",
    next: "Next stage",
    stages: "Choose a stage",
    full: "Fullscreen",
    exitFull: "Exit",
    mute: "Mute",
    unmute: "Unmute",
  },
  ja: {
    stage: "{0}面",
    goal: "目標 {0}点",
    start: "ボールからゴールへスッとはじこう！",
    win: "目標達成！",
    lose: "点数が足りない",
    result: "{0}点 · ノータッチ {1}本",
    help: "ボールがコートのあちこちに置かれます。ボールからゴールの方へ画面をスッとなぞって離すと投げます。なぞった向きが投げる向き、長さが強さです（点線が飛ぶ道すじを示します）。ボールはリングとボードにはね、上からリングを通れば2点、どこにもふれずに入ればノータッチで3点。高く上げて上から落とすのがよく入ります。6面からはゴールが左右に動くので、落ちてくるころの位置をねらいます。全部投げたあと目標点を超えればクリア、点が高いほど星が増えます。キーボードは←/→で角度、↑/↓で強さ、Spaceで投げます。",
    again: "もう一度",
    next: "次の面",
    stages: "ステージ選択",
    full: "全画面",
    exitFull: "戻る",
    mute: "ミュート",
    unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关",
    goal: "目标 {0} 分",
    start: "从球往篮筐方向一划就投！",
    win: "达到目标分数！",
    lose: "分数不够",
    result: "{0} 分 · 空心 {1} 球",
    help: "球摆在球场各处。从球往篮筐方向划一下再松手就会投出：划的方向是投篮方向，划的长度是力度（虚线显示飞行路线）。球会被篮圈和篮板弹开，从上往下穿过篮圈得2分，什么都没碰到的空心球得3分。高高抛起、从上方落下最容易进。第6关起篮筐会左右移动，要瞄准球落下时它所在的位置。把球全部投完后达到目标分数即过关，分数越高星越多。键盘用 ←/→ 调角度，↑/↓ 调力度，空格投篮。",
    again: "再来一次",
    next: "下一关",
    stages: "选择关卡",
    full: "全屏",
    exitFull: "退出",
    mute: "静音",
    unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}",
    goal: "Objectif {0}",
    start: "Glissez du ballon vers le panier !",
    win: "Objectif atteint !",
    lose: "Pas assez de points",
    result: "{0} points · {1} paniers propres",
    help: "Des ballons sont posés çà et là sur le terrain. Glissez du ballon vers le panier puis lâchez pour tirer : la direction du geste est celle du tir, sa longueur la puissance (les pointillés montrent la trajectoire). Le ballon rebondit sur le cercle et la planche ; traverser le cercle vers le bas rapporte 2, un panier propre sans rien toucher rapporte 3. Une haute parabole qui retombe d'en haut rentre le mieux. Dès le niveau 6 le panier glisse de côté : visez là où il sera quand le ballon redescendra. Atteignez l'objectif une fois tous les ballons tirés pour réussir ; plus de points, plus d'étoiles. Touches : ← / → pour l'angle, ↑ / ↓ pour la puissance, Espace pour tirer.",
    again: "Réessayer",
    next: "Niveau suivant",
    stages: "Choisir un niveau",
    full: "Plein écran",
    exitFull: "Quitter",
    mute: "Couper le son",
    unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}",
    goal: "Meta {0}",
    start: "¡Desliza desde el balón hacia la canasta!",
    win: "¡Meta alcanzada!",
    lose: "Faltan puntos",
    result: "{0} puntos · {1} limpias",
    help: "Los balones están aquí y allá en la pista. Desliza desde el balón hacia la canasta y suelta para tirar: la dirección del gesto es la del tiro y su largo, la fuerza (la línea de puntos muestra el camino). El balón rebota en el aro y el tablero; bajar por el aro suma 2 y una canasta limpia que no toca nada suma 3. Un tiro alto que cae desde arriba entra mejor. Desde el nivel 6 la canasta se desliza de lado: apunta a donde estará cuando baje el balón. Alcanza la meta tras lanzar todos los balones para superar el nivel; más puntos, más estrellas. Teclas: ← / → para el ángulo, ↑ / ↓ para la fuerza, Espacio para tirar.",
    again: "Reintentar",
    next: "Siguiente nivel",
    stages: "Elegir nivel",
    full: "Pantalla completa",
    exitFull: "Salir",
    mute: "Silenciar",
    unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:hoop-flick:muted";
const W = 360;
const H = 560;
const FLICK = 3.2; // throw speed per px of swipe
const BALL_ART: PixelArt = { palette: { o: "#f76707", d: "#a63f00", h: "#ffa94d" }, rows: ["..oooo..", ".ohoood.", "ohooddoo", "oooddooo", "dddoodod", "ooodoooo", ".oooood.", "..oooo.."] };

/** Where a throw would go (no bounces), for the dotted guide. */
function guide(x: number, y: number, vx: number, vy: number): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let k = 1; k <= 14; k++) {
    const t = k * 0.07;
    pts.push({ x: x + vx * t, y: y + vy * t + (GRAVITY * t * t) / 2 });
  }
  return pts;
}

export default function HoopFlick({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const [over, setOver] = useState<null | { won: boolean; stars: number; points: number; swishes: number }>(null);
  const [points, setPoints] = useState(0);
  const courtRef = useRef<Court | null>(null);
  const throws = useRef<Array<{ vx: number; vy: number }>>([]);
  const drag = useRef<{ x0: number; y0: number; x: number; y: number } | null>(null);
  const keyAim = useRef<{ deg: number; power: number } | null>(null);
  const banner = useRef<{ text: string; t: number } | null>(null);
  const st = HOOP_STAGES[stage];

  useRunRecord(HOOP_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    courtRef.current = newCourt(HOOP_STAGES[s]);
    throws.current = [];
    drag.current = null;
    keyAim.current = null;
    banner.current = null;
    setPoints(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(HOOP_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const c = courtRef.current;
      if (!c) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const st = c.stage;
      // throws are read once per frame
      for (const v of throws.current.splice(0)) if (flick(c, v.vx, v.vy)) sfx("tap");
      for (const ev of step(c, dt)) {
        if (ev === "swish" || ev === "score") {
          spawnBurst(parts.current, hoopX(st, c.t), st.hy + 10, ev === "swish" ? ["#ffd43b", "#fff", "#4dabf7"] : ["#fff", "#ffa94d"], ev === "swish" ? 24 : 12, 140, 3);
          banner.current = { text: ev === "swish" ? "+3" : "+2", t: 0.9 };
          setPoints(c.points);
          sfx(ev === "swish" ? "combo" : "success");
        } else if (ev === "rim") sfx("place");
        else if (ev === "miss") sfx("fail");
      }
      if (c.over && touchedRef.current) {
        touchedRef.current = false;
        setOver({ won: c.won, stars: starsFor(c), points: c.points, swishes: c.swishes });
        if (c.won) {
          setCleared(markStageCleared(HOOP_SLUG, st.stage, STAGE_COUNT));
          sfx("win");
        } else sfx("lose");
      }
      if (banner.current && (banner.current.t -= dt) <= 0) banner.current = null;
      stepParticles(parts.current, dt, 200);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // the gym: a wall, a wooden floor, the key painted on it
        ctx.fillStyle = "#e7f5ff";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#d0ebff";
        for (let y = 0; y < 380; y += 40) ctx.fillRect(0, y, W, 2);
        ctx.fillStyle = "#e8b77d";
        ctx.fillRect(0, 380, W, H - 380);
        ctx.fillStyle = "#d9a066";
        for (let x = 0; x < W; x += 30) ctx.fillRect(x, 380, 2, H - 380);
        const hx = hoopX(st, c.t);
        const side = boardSide(st, Math.min(c.shot, st.shots.length - 1));
        // backboard, ring, net
        const bx = hx + side * BOARD_GAP;
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(Math.round(bx) - 3, st.hy - BOARD_TOP, 6, BOARD_TOP + 10);
        ctx.fillStyle = "#adb5bd";
        ctx.fillRect(Math.round(bx) - 3 + side * 3, st.hy - BOARD_TOP, 3, BOARD_TOP + 10);
        ctx.fillStyle = "#f8f9fa";
        for (let k = 0; k < 5; k++) ctx.fillRect(Math.round(hx - RIM + 4 + k * 2), st.hy + 4 + k * 6, Math.round(RIM * 2 - 8 - k * 4), 2);
        ctx.fillStyle = "#e8590c";
        ctx.fillRect(Math.round(hx - RIM - 3), st.hy - 2, RIM * 2 + 6, 5);
        // the ball in flight, or waiting on its spot
        const b = c.ball ?? (c.shot < st.shots.length ? { x: st.shots[c.shot].x, y: st.shots[c.shot].y, vx: 0, vy: 0 } : null);
        if (b) {
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          ctx.fillRect(Math.round(b.x) - 10, (c.ball ? 470 : b.y) + 10, 20, 4);
          drawSprite(ctx, BALL_ART, b.x, b.y, { scale: 3 });
        }
        // the guide while aiming
        const aim = !c.ball && c.shot < st.shots.length ? (drag.current ? { vx: (drag.current.x - drag.current.x0) * FLICK, vy: (drag.current.y - drag.current.y0) * FLICK } : keyAim.current ? { vx: Math.cos((keyAim.current.deg * Math.PI) / 180) * keyAim.current.power, vy: -Math.sin((keyAim.current.deg * Math.PI) / 180) * keyAim.current.power } : null) : null;
        if (aim && b) {
          ctx.fillStyle = "rgba(33,37,41,0.45)";
          for (const p of guide(b.x, b.y, aim.vx, aim.vy)) ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4);
        }
        // balls left
        for (let k = c.shot + 1; k < st.shots.length; k++) drawSprite(ctx, BALL_ART, 20 + (k - c.shot - 1) * 26, 540, { scale: 2 });
        if (banner.current) {
          ctx.fillStyle = "#f08c00";
          ctx.font = "bold 28px monospace";
          ctx.textAlign = "center";
          ctx.fillText(banner.current.text, hx, st.hy - 30 - (0.9 - banner.current.t) * 40);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const touchedRef = useRef(false);
  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (courtRef.current?.over) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = toField(e);
    drag.current = { x0: p.x, y0: p.y, x: p.x, y: p.y };
    setTouched(true);
    touchedRef.current = true;
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const p = toField(e);
    drag.current = { ...drag.current, x: p.x, y: p.y };
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || Math.hypot(d.x - d.x0, d.y - d.y0) < 12) return;
    throws.current.push({ vx: (d.x - d.x0) * FLICK, vy: (d.y - d.y0) * FLICK });
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const c = courtRef.current;
    if (!c || c.over) return;
    const toward = c.shot < c.stage.shots.length && c.stage.shots[c.shot].x > c.stage.hx ? 110 : 70;
    const a = keyAim.current ?? { deg: toward, power: 700 };
    if (e.key === "ArrowLeft") a.deg = Math.min(170, a.deg + 1);
    else if (e.key === "ArrowRight") a.deg = Math.max(10, a.deg - 1);
    else if (e.key === "ArrowUp") a.power = Math.min(MAX_SPEED, a.power + 10);
    else if (e.key === "ArrowDown") a.power = Math.max(100, a.power - 10);
    else if (e.key === " " || e.key === "Enter") {
      throws.current.push({ vx: Math.cos((a.deg * Math.PI) / 180) * a.power, vy: -Math.sin((a.deg * Math.PI) / 180) * a.power });
      keyAim.current = null;
      e.preventDefault();
      setTouched(true);
      touchedRef.current = true;
      return;
    } else return;
    keyAim.current = a;
    e.preventDefault();
    setTouched(true);
    touchedRef.current = true;
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  return (
    <div
      ref={containerRef}
      data-game="hoop-flick"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, st.need)}</Badge>
        <Badge variant="outline">{points}</Badge>
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
          width={W}
          height={H}
          tabIndex={0}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-28 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.points, over.swishes)}</p>
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
