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
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelParticle } from "../../lib/games/pixel-kit";
import { STAGE_COUNT, VACUUM_SLUG, VACUUM_STAGES, newRoom, slide, starsFor, type Dir, type Room, type VacuumStage } from "../../lib/games/vacuum-dash";
import { DUST_ART, FURNITURE_ART, ROBOT_ART } from "../../lib/games/vacuum-dash-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; moves: string; dust: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    moves: "이동 {0}/{1}",
    dust: "남은 먼지 {0}",
    start: "밀어서 청소기를 출발시켜요!",
    win: "청소 끝!",
    lose: "이동 횟수를 다 썼어요",
    result: "{0}번 만에 청소 끝",
    help: "가구로 가득한 방에 로봇청소기가 있어요. 화면을 위·아래·왼쪽·오른쪽으로 밀면 청소기가 그쪽으로 쭉 달려가 무언가에 부딪혀야 멈추고, 지나간 칸의 먼지를 모두 빨아들여요. 정해진 횟수 안에 바닥의 먼지를 전부 치우면 통과, 적은 횟수일수록 별이 늘어요. 막힌 쪽으로 밀면 움직이지 않고 횟수도 줄지 않아요. 요령은 멈추는 자리를 먼저 보는 것이에요. 어디서 멈출지 알면 다음에 어느 길로 갈 수 있는지도 보여요. 키보드는 화살표나 WASD예요.",
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
    moves: "Moves {0}/{1}",
    dust: "Dust left {0}",
    start: "Swipe to send the vacuum off!",
    win: "All clean!",
    lose: "Out of moves",
    result: "Clean in {0} moves",
    help: "A robot vacuum sits in a room full of furniture. Swipe up, down, left or right and it zooms that way until it bumps into something, sucking up the dust on every square it passes. Clean the whole floor within the moves to pass; fewer moves, more stars. A swipe toward something in the way doesn't move it and costs nothing. The knack is looking at where it will stop: once you know that, you can see which way it can go next. Keys: arrows or WASD.",
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
    moves: "移動 {0}/{1}",
    dust: "残りのほこり {0}",
    start: "スワイプして掃除機を走らせよう！",
    win: "おそうじ完了！",
    lose: "移動回数がなくなった",
    result: "{0}回でおそうじ完了",
    help: "家具でいっぱいの部屋にロボット掃除機がいます。上下左右にスワイプすると、掃除機はその方向へ何かにぶつかるまでまっすぐ走り、通ったマスのほこりを全部吸い取ります。決まった回数のうちに床のほこりを全部取ればクリア、少ない回数ほど星が増えます。ふさがった方向へスワイプしても動かず、回数も減りません。コツは止まる場所を先に見ること。どこで止まるかがわかれば、次にどの道へ行けるかも見えてきます。キーボードは矢印かWASDです。",
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
    moves: "移动 {0}/{1}",
    dust: "剩余灰尘 {0}",
    start: "滑动让扫地机器人出发！",
    win: "打扫完毕！",
    lose: "移动次数用完了",
    result: "{0} 步打扫完毕",
    help: "满是家具的房间里有一台扫地机器人。向上下左右滑动，它就会朝那个方向一直冲，撞到东西才停下，经过的格子上的灰尘全部吸走。在规定次数内把地板上的灰尘清干净即过关，步数越少星越多。朝被挡住的方向滑不会移动，也不算次数。诀窍是先看它会停在哪里：知道停在哪，就能看出下一步能走哪条路。键盘用方向键或 WASD。",
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
    moves: "Coups {0}/{1}",
    dust: "Poussière restante {0}",
    start: "Glissez pour lancer l'aspirateur !",
    win: "Tout est propre !",
    lose: "Plus de coups",
    result: "Propre en {0} coups",
    help: "Un robot aspirateur attend dans une pièce pleine de meubles. Glissez vers le haut, le bas, la gauche ou la droite : il fonce dans cette direction jusqu'à heurter quelque chose, en aspirant la poussière de chaque case traversée. Nettoyez tout le sol dans la limite de coups pour réussir ; moins de coups, plus d'étoiles. Un glissement vers un obstacle ne le déplace pas et ne coûte rien. L'astuce : regarder d'abord où il s'arrêtera ; on voit alors quel chemin il peut prendre ensuite. Touches : flèches ou WASD.",
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
    moves: "Movimientos {0}/{1}",
    dust: "Polvo restante {0}",
    start: "¡Desliza para lanzar la aspiradora!",
    win: "¡Todo limpio!",
    lose: "Sin movimientos",
    result: "Limpio en {0} movimientos",
    help: "Una aspiradora robot espera en una habitación llena de muebles. Desliza hacia arriba, abajo, izquierda o derecha y saldrá disparada en esa dirección hasta chocar con algo, aspirando el polvo de cada casilla por la que pase. Limpia todo el suelo dentro del límite para superar el nivel; menos movimientos, más estrellas. Deslizar hacia un obstáculo no la mueve ni gasta movimientos. El truco es mirar primero dónde se parará: así ves qué camino puede tomar después. Teclas: flechas o WASD.",
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

const MUTE_KEY = "oiyo:vacuum-dash:muted";
const W = 360;
const H = 560;
const TOP = 70;
const KEY_DIR: Record<string, Dir> = { ArrowUp: 0, w: 0, W: 0, ArrowRight: 1, d: 1, D: 1, ArrowDown: 2, s: 2, S: 2, ArrowLeft: 3, a: 3, A: 3 };
const layout = (st: VacuumStage) => {
  const cell = Math.floor(Math.min(44, 336 / st.cols, 470 / st.rows));
  return { cell, x: Math.round((W - st.cols * cell) / 2), y: TOP + Math.round((470 - st.rows * cell) / 2) };
};

export default function VacuumDash({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; moves: number }>(null);
  const [moves, setMoves] = useState(0);
  const [dust, setDust] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const queue = useRef<Dir[]>([]);
  const pos = useRef({ x: 0, y: 0 });
  const bump = useRef(0);
  const down = useRef<{ x: number; y: number } | null>(null);
  const st = VACUUM_STAGES[stage];

  useRunRecord(VACUUM_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    const r = newRoom(VACUUM_STAGES[s]);
    roomRef.current = r;
    queue.current = [];
    pos.current = { x: r.at % r.stage.cols, y: Math.floor(r.at / r.stage.cols) };
    bump.current = 0;
    down.current = null;
    setMoves(0);
    setDust(r.left);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(VACUUM_SLUG, STAGE_COUNT);
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
      const r = roomRef.current;
      if (!r) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const L = layout(r.stage);
      const tx = r.at % r.stage.cols;
      const ty = Math.floor(r.at / r.stage.cols);
      const moving = Math.hypot(tx - pos.current.x, ty - pos.current.y) > 0.01;
      // swipes are read once per frame, once the robot has arrived
      if (!moving && queue.current.length && !r.over) {
        const d = queue.current.shift() as Dir;
        const path = slide(r, d);
        if (!path.length) {
          bump.current = 0.2;
          sfx("tap");
        } else {
          setMoves(r.moves);
          setDust(r.left);
          sfx("place");
          if (r.over) {
            setOver({ won: r.won, stars: starsFor(r), moves: r.moves });
            if (r.won) {
              setCleared(markStageCleared(VACUUM_SLUG, r.stage.stage, STAGE_COUNT));
              spawnBurst(parts.current, W / 2, 200, ["#74c0fc", "#fff", "#ffd43b"], 30, 140, 3);
              sfx("win");
            } else sfx("lose");
          }
        }
      }
      // glide toward where the robot stopped
      const dx = tx - pos.current.x;
      const dy = ty - pos.current.y;
      const dist = Math.hypot(dx, dy);
      const stepLen = Math.min(dist, dt * 16);
      if (dist > 0.001) {
        pos.current.x += (dx / dist) * stepLen;
        pos.current.y += (dy / dist) * stepLen;
        if (Math.random() < 0.5) spawnBurst(parts.current, L.x + (pos.current.x + 0.5) * L.cell, L.y + (pos.current.y + 0.5) * L.cell, ["#cbb89d", "#a68b6b"], 1, 30, 2);
      }
      bump.current = Math.max(0, bump.current - dt);
      stepParticles(parts.current, dt, 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#e9ecef";
        ctx.fillRect(0, 0, W, H);
        const { cols, rows, floor } = r.stage;
        ctx.fillStyle = "#495057";
        ctx.fillRect(L.x - 6, L.y - 6, cols * L.cell + 12, rows * L.cell + 12);
        for (let i = 0; i < cols * rows; i++) {
          const x = L.x + (i % cols) * L.cell;
          const y = L.y + Math.floor(i / cols) * L.cell;
          if (!floor[i]) {
            ctx.fillStyle = "#f1e3d3";
            ctx.fillRect(x, y, L.cell, L.cell);
            drawSprite(ctx, FURNITURE_ART[(i * 7 + r.stage.stage) % FURNITURE_ART.length], x + L.cell / 2, y + L.cell / 2, { scale: Math.max(2, Math.floor(L.cell / 9)) });
            continue;
          }
          // wooden floor boards, shiny once clean
          ctx.fillStyle = (Math.floor(i / cols) + (i % cols)) % 2 ? "#d9a066" : "#cf9557";
          ctx.fillRect(x, y, L.cell, L.cell);
          ctx.fillStyle = "rgba(0,0,0,0.08)";
          ctx.fillRect(x, y + L.cell - 2, L.cell, 2);
          if (!r.clean[i]) drawSprite(ctx, DUST_ART, x + L.cell / 2, y + L.cell / 2, { scale: Math.max(2, Math.floor(L.cell / 10)) });
          else {
            ctx.fillStyle = "rgba(255,255,255,0.18)";
            ctx.fillRect(x + 4, y + 4, 6, 3);
          }
        }
        const shake = bump.current > 0 ? Math.sin(bump.current * 80) * 3 : 0;
        drawSprite(ctx, ROBOT_ART, L.x + (pos.current.x + 0.5) * L.cell + shake, L.y + (pos.current.y + 0.5) * L.cell, { scale: Math.max(3, Math.floor(L.cell / 9)) });
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (roomRef.current?.over) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    down.current = toField(e);
    setTouched(true);
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d0 = down.current;
    down.current = null;
    if (!d0 || roomRef.current?.over) return;
    const p = toField(e);
    const dx = p.x - d0.x;
    const dy = p.y - d0.y;
    if (Math.hypot(dx, dy) < 18) return;
    queue.current.push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const d = KEY_DIR[e.key];
    if (d === undefined || roomRef.current?.over) return;
    e.preventDefault();
    queue.current.push(d);
    setTouched(true);
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
      data-game="vacuum-dash"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.moves, moves, st.limit)}</Badge>
        <Badge variant="outline">{fill(c.dust, dust)}</Badge>
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
          onPointerUp={onUp}
          onPointerCancel={() => (down.current = null)}
          onKeyDown={onKey}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-6 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.moves)}</p> : null}
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
