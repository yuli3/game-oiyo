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
import { BANDS, EDGE, FRICTION, LEFT, MAX_SPEED, RIGHT, SLIDE_SLUG, SLIDE_STAGES, STAGE_COUNT, START, TOKEN, moving, newTable, pointsAt, score, slide, starsFor, step, type Table } from "../../lib/games/coin-slide";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    goal: "{0}점 목표",
    start: "토큰을 위로 쓱 밀어 보내요!",
    win: "목표 점수 달성!",
    lose: "점수가 모자라요",
    result: "{0}점",
    help: "카페의 긴 테이블 끝으로 큰 토큰을 미끄러뜨려요. 화면을 위로 쓱 밀었다 떼면 토큰이 출발해요. 민 방향이 나아갈 방향, 민 길이가 힘이에요(점선이 멈출 자리를 보여 줘요). 토큰이 멈춘 자리에 따라 점수가 나요. 점선 위 첫 칸 1점, 가운데 칸 2점, 끝자락 칸 3점이에요. 너무 세게 밀면 끝에서 떨어지고, 옆으로 벗어나도 떨어져요. 4단계부터 설탕 단지가 놓여 부딪히면 튕겨요. 먼저 놓은 토큰에도 부딪히니, 비어 있는 길로 보내요. 토큰을 다 보낸 뒤 목표 점수를 넘기면 통과, 점수가 높을수록 별이 늘어요. 키보드는 ←/→로 방향, ↑/↓로 힘, Space로 보내요.",
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
    start: "Swipe up to slide the token!",
    win: "Goal reached!",
    lose: "Not enough points",
    result: "{0} points",
    help: "Slide big tokens up a long café table. Swipe up and let go to send one: the swipe's direction is where it goes and its length the power (the dotted line shows where it will stop). A token scores where it comes to rest: 1 in the first band past the line, 2 in the middle band, 3 at the very edge. Slide too hard and it drops off the end; stray off the side and it drops too. From stage 4, sugar pots sit on the table and knock tokens aside; tokens already down get in the way too, so send each along a clear path. Reach the goal once every token is down to pass; more points, more stars. Keys: ← / → to aim, ↑ / ↓ for power, Space to slide.",
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
    start: "上へスッとなぞってコインをすべらせよう！",
    win: "目標達成！",
    lose: "点数が足りない",
    result: "{0}点",
    help: "カフェの長いテーブルの先へ大きなコインをすべらせます。上へスッとなぞって離すとコインが進みます。なぞった向きが進む向き、長さが強さです（点線が止まる場所を示します）。止まった場所で点が決まります。線の先の最初の帯が1点、真ん中の帯が2点、いちばん端の帯が3点。強すぎると端から落ち、横にそれても落ちます。4面からは砂糖つぼが置かれ、当たるとはじかれます。先に置いたコインにもぶつかるので、空いた道へ送りましょう。全部すべらせたあと目標点を超えればクリア、点が高いほど星が増えます。キーボードは←/→で向き、↑/↓で強さ、Spaceで送ります。",
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
    start: "往上一划把代币滑出去！",
    win: "达到目标分数！",
    lose: "分数不够",
    result: "{0} 分",
    help: "把大代币沿着咖啡馆的长桌滑向桌端。往上划一下再松手，代币就滑出去：划的方向是前进方向，划的长度是力度（虚线显示会停下的位置）。代币停在哪里就得几分：过线后的第一格1分，中间格2分，最边上那格3分。太用力会从桌端掉下去，偏到侧边也会掉。第4关起桌上放着糖罐，撞上会被弹开；先放好的代币也会挡路，所以要从空着的路线送出。代币全部送完后达到目标分数即过关，分数越高星越多。键盘用 ←/→ 调方向，↑/↓ 调力度，空格发出。",
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
    start: "Glissez vers le haut pour lancer le jeton !",
    win: "Objectif atteint !",
    lose: "Pas assez de points",
    result: "{0} points",
    help: "Faites glisser de gros jetons sur une longue table de café. Glissez vers le haut puis lâchez pour en lancer un : la direction du geste est sa direction, sa longueur la puissance (les pointillés montrent où il s'arrêtera). Un jeton marque selon l'endroit où il s'arrête : 1 dans la première bande après la ligne, 2 dans la bande du milieu, 3 tout au bord. Trop fort et il tombe au bout ; trop de côté et il tombe aussi. Dès le niveau 4, des sucriers posés sur la table font dévier les jetons ; les jetons déjà posés gênent aussi : visez un passage libre. Atteignez l'objectif une fois tous les jetons lancés pour réussir ; plus de points, plus d'étoiles. Touches : ← / → pour viser, ↑ / ↓ pour la puissance, Espace pour lancer.",
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
    start: "¡Desliza hacia arriba para lanzar la ficha!",
    win: "¡Meta alcanzada!",
    lose: "Faltan puntos",
    result: "{0} puntos",
    help: "Desliza fichas grandes por una larga mesa de café. Desliza hacia arriba y suelta para lanzar una: la dirección del gesto es hacia donde va y su largo, la fuerza (la línea de puntos muestra dónde se parará). Una ficha puntúa según dónde se detiene: 1 en la primera franja tras la línea, 2 en la del medio, 3 justo en el borde. Demasiado fuerte y cae por el final; si se desvía por un lado, también cae. Desde el nivel 4 hay azucareros en la mesa que desvían las fichas; las fichas ya colocadas también estorban, así que busca un camino libre. Alcanza la meta tras lanzar todas para superar el nivel; más puntos, más estrellas. Teclas: ← / → para apuntar, ↑ / ↓ para la fuerza, Espacio para lanzar.",
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

const MUTE_KEY = "oiyo:coin-slide:muted";
const W = 360;
const H = 560;
const PUSH = 3.2; // slide speed per px of swipe
const FOUL = 220; // the line a token must cross to count
const COIN_ART: PixelArt = { palette: { g: "#fcc419", d: "#e67700", h: "#fff3bf" }, rows: ["..gggg..", ".gghhgg.", "gghggdgg", "ggdddggg", "gggddggg", "ggdggdgg", ".ggddgg.", "..gggg.."] };
const POT_ART: PixelArt = { palette: { w: "#f8f9fa", b: "#74c0fc", k: "#495057" }, rows: [".kkk.", "wwwww", "wbbbw", "wwwww", ".www."] };

export default function CoinSlide({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; points: number }>(null);
  const [points, setPoints] = useState(0);
  const tableRef = useRef<Table | null>(null);
  const slides = useRef<Array<{ vx: number; vy: number }>>([]);
  const drag = useRef<{ x0: number; y0: number; x: number; y: number } | null>(null);
  const keyAim = useRef<{ deg: number; power: number } | null>(null);
  const reported = useRef(false);
  const st = SLIDE_STAGES[stage];

  useRunRecord(SLIDE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    tableRef.current = newTable(SLIDE_STAGES[s]);
    slides.current = [];
    drag.current = null;
    keyAim.current = null;
    reported.current = false;
    setPoints(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(SLIDE_SLUG, STAGE_COUNT);
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
      const tb = tableRef.current;
      if (!tb) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // slides are read once per frame
      for (const v of slides.current.splice(0)) if (slide(tb, v.vx, v.vy)) sfx("tap");
      for (const ev of step(tb, dt)) {
        if (ev === "knock" || ev === "post") sfx("place");
        else if (ev === "drop") sfx("fail");
        else if (ev === "stop") {
          setPoints(score(tb));
          const p = tb.pucks[tb.pucks.length - 1];
          if (p?.on && pointsAt(p.y) === 3) spawnBurst(parts.current, p.x, p.y, ["#ffd43b", "#fff"], 16, 120, 3);
          sfx(p?.on && pointsAt(p.y) > 0 ? "success" : "tap");
        }
      }
      if (tb.over && !reported.current) {
        reported.current = true;
        setOver({ won: tb.won, stars: starsFor(tb), points: score(tb) });
        if (tb.won) {
          setCleared(markStageCleared(SLIDE_SLUG, tb.stage.stage, STAGE_COUNT));
          sfx("win");
        } else sfx("lose");
      }
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // café floor, then the long wooden table
        ctx.fillStyle = "#5c3a1e";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#c47d34";
        ctx.fillRect(LEFT - 8, 20, RIGHT - LEFT + 16, H - 20);
        ctx.fillStyle = "#e0a96d";
        ctx.fillRect(LEFT, EDGE, RIGHT - LEFT, H - EDGE);
        for (let x = LEFT + 35; x < RIGHT; x += 35) {
          ctx.fillStyle = "#d4995a";
          ctx.fillRect(x, EDGE, 2, H - EDGE);
        }
        // score bands
        const tones = ["#ffd8a8", "#ffe8cc", "#fff4e6"];
        BANDS.forEach(([a, b, p], k) => {
          ctx.fillStyle = tones[k];
          ctx.fillRect(LEFT, a, RIGHT - LEFT, b - a);
          ctx.fillStyle = "#a6611a";
          ctx.font = "bold 18px monospace";
          ctx.textAlign = "left";
          ctx.fillText(String(p), LEFT + 6, (a + b) / 2 + 6);
        });
        ctx.fillStyle = "#862e9c";
        ctx.fillRect(LEFT, FOUL, RIGHT - LEFT, 3);
        ctx.fillStyle = "#212529";
        ctx.fillRect(LEFT, EDGE - 4, RIGHT - LEFT, 4);
        for (const q of tb.stage.posts) drawSprite(ctx, POT_ART, q.x, q.y, { scale: 4 });
        for (const p of tb.pucks) if (p.on) drawSprite(ctx, COIN_ART, p.x, p.y, { scale: 4 });
        // the next token waiting, and the guide while aiming
        if (!moving(tb) && tb.thrown < tb.stage.tokens) {
          drawSprite(ctx, COIN_ART, START.x, START.y, { scale: 4 });
          const aim = drag.current ? { vx: (drag.current.x - drag.current.x0) * PUSH, vy: (drag.current.y - drag.current.y0) * PUSH } : keyAim.current ? { vx: Math.cos((keyAim.current.deg * Math.PI) / 180) * keyAim.current.power, vy: -Math.sin((keyAim.current.deg * Math.PI) / 180) * keyAim.current.power } : null;
          if (aim) {
            const sp = Math.min(MAX_SPEED, Math.hypot(aim.vx, aim.vy));
            const d = (sp * sp) / (2 * FRICTION);
            const ux = aim.vx / (Math.hypot(aim.vx, aim.vy) || 1);
            const uy = aim.vy / (Math.hypot(aim.vx, aim.vy) || 1);
            ctx.fillStyle = "rgba(33,37,41,0.5)";
            for (let k = 20; k < d; k += 14) ctx.fillRect(Math.round(START.x + ux * k) - 2, Math.round(START.y + uy * k) - 2, 4, 4);
            ctx.strokeStyle = "#212529";
            ctx.strokeRect(Math.round(START.x + ux * d) - TOKEN, Math.round(START.y + uy * d) - TOKEN, TOKEN * 2, TOKEN * 2);
          }
        }
        // tokens left
        for (let k = 0; k < tb.stage.tokens - tb.thrown - (moving(tb) ? 0 : 1); k++) drawSprite(ctx, COIN_ART, 18, 540 - k * 22, { scale: 2 });
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
    if (tableRef.current?.over) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = toField(e);
    drag.current = { x0: p.x, y0: p.y, x: p.x, y: p.y };
    setTouched(true);
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
    slides.current.push({ vx: (d.x - d.x0) * PUSH, vy: (d.y - d.y0) * PUSH });
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const tb = tableRef.current;
    if (!tb || tb.over) return;
    const a = keyAim.current ?? { deg: 90, power: 800 };
    if (e.key === "ArrowLeft") a.deg = Math.min(120, a.deg + 0.5);
    else if (e.key === "ArrowRight") a.deg = Math.max(60, a.deg - 0.5);
    else if (e.key === "ArrowUp") a.power = Math.min(MAX_SPEED, a.power + 8);
    else if (e.key === "ArrowDown") a.power = Math.max(100, a.power - 8);
    else if (e.key === " " || e.key === "Enter") {
      slides.current.push({ vx: Math.cos((a.deg * Math.PI) / 180) * a.power, vy: -Math.sin((a.deg * Math.PI) / 180) * a.power });
      e.preventDefault();
      setTouched(true);
      return;
    } else return;
    keyAim.current = a;
    e.preventDefault();
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
      data-game="coin-slide"
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.points)}</p>
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
