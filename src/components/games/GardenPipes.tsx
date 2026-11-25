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
import { drawParticles, spawnBurst, stepParticles, type PixelParticle } from "../../lib/games/pixel-kit";
import { E, N, PIPES_SLUG, PIPES_STAGES, S, STAGE_COUNT, W as WEST, newGarden, starsFor, tap, wet, type Garden, type PipeStage } from "../../lib/games/garden-pipes";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; taps: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    taps: "돌리기 {0}/{1}",
    start: "타일을 눌러 파이프를 돌려요!",
    win: "꽃이 모두 물을 마셨어요!",
    lose: "돌릴 수 있는 횟수를 다 썼어요",
    result: "{0}번 돌려서 완성",
    help: "정원에 파이프 타일이 깔려 있고, 위쪽 수도꼭지에서 물이 나와요. 타일을 누르면 시계 방향으로 4분의 1바퀴 돌아요. 모든 파이프가 서로 이어져 막힌 끝이 없고 수도꼭지에서 물이 모든 타일까지 흐르면, 파이프 끝의 꽃이 모두 피어나요. 물이 닿은 파이프는 파랗게 바뀌어서 어디까지 이어졌는지 바로 보여요. 요령은 수도꼭지에서부터 차례로 맞추는 것이에요. 가장자리 타일은 바깥을 향할 수 없으니 방향이 거의 정해져 있어요. 정해진 횟수 안에 완성하면 통과, 적게 돌릴수록 별이 늘어요. 키보드는 화살표로 고르고 Space로 돌려요.",
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
    taps: "Turns {0}/{1}",
    start: "Tap a tile to turn its pipe!",
    win: "Every flower is watered!",
    lose: "Out of turns",
    result: "Joined up in {0} turns",
    help: "Pipe tiles cover the garden, and water comes from the tap at the top. Tap a tile and it turns a quarter turn clockwise. When every pipe joins up — no open ends, all of it fed from the tap — the flowers at the ends of the pipes bloom. Pipes the water reaches turn blue, so you can see at once how far it gets. The knack is working out from the tap. Tiles on the edge can't face outward, so their way round is nearly settled. Join it all up within the turns to pass; fewer turns, more stars. Keys: arrows to choose, Space to turn.",
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
    taps: "回転 {0}/{1}",
    start: "タイルをタップしてパイプを回そう！",
    win: "花がみんな水を飲んだ！",
    lose: "回せる回数がなくなった",
    result: "{0}回で完成",
    help: "庭にパイプのタイルが並び、上の蛇口から水が出ます。タイルをタップすると時計回りに4分の1回転します。すべてのパイプがつながって行き止まりがなく、蛇口からの水が全部のタイルに届くと、パイプの先の花がみんな咲きます。水が届いたパイプは青くなるので、どこまでつながったかひと目でわかります。コツは蛇口から順に合わせること。はしのタイルは外を向けないので、向きがほぼ決まっています。決まった回数で完成すればクリア、少ない回数ほど星が増えます。キーボードは矢印で選び、Spaceで回します。",
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
    taps: "转动 {0}/{1}",
    start: "点一块砖转动水管！",
    win: "所有的花都喝到水了！",
    lose: "转动次数用完了",
    result: "转了 {0} 次完成",
    help: "花园里铺满水管砖，水从上方的水龙头流出。点一块砖，它就顺时针转四分之一圈。所有水管都接通、没有断口，水从水龙头流到每一块砖时，水管末端的花就全部开放。水流到的水管会变蓝，一眼就能看出接到了哪里。诀窍是从水龙头开始依次对准。边上的砖不能朝外，方向几乎是定的。在规定次数内完成即过关，转得越少星越多。键盘用方向键选择，空格转动。",
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
    taps: "Tours {0}/{1}",
    start: "Touchez une tuile pour tourner son tuyau !",
    win: "Toutes les fleurs sont arrosées !",
    lose: "Plus de tours",
    result: "Raccordé en {0} tours",
    help: "Des tuiles de tuyaux couvrent le jardin, et l'eau sort du robinet en haut. Touchez une tuile : elle tourne d'un quart de tour dans le sens horaire. Quand tous les tuyaux se raccordent — aucune extrémité ouverte, tout alimenté par le robinet — les fleurs au bout des tuyaux s'ouvrent. Les tuyaux où l'eau arrive deviennent bleus : on voit tout de suite jusqu'où elle va. L'astuce : partir du robinet. Les tuiles du bord ne peuvent pas regarder dehors, leur sens est presque décidé. Raccordez tout dans la limite pour réussir ; moins de tours, plus d'étoiles. Touches : flèches pour choisir, Espace pour tourner.",
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
    taps: "Giros {0}/{1}",
    start: "¡Toca una baldosa para girar su tubería!",
    win: "¡Todas las flores tienen agua!",
    lose: "Sin giros",
    result: "Conectado en {0} giros",
    help: "Baldosas con tuberías cubren el jardín, y el agua sale del grifo de arriba. Toca una baldosa y gira un cuarto de vuelta en el sentido de las agujas del reloj. Cuando todas las tuberías se conectan —sin extremos abiertos y todo alimentado desde el grifo— florecen las flores del final de las tuberías. Las tuberías a las que llega el agua se vuelven azules, así ves enseguida hasta dónde llega. El truco es empezar desde el grifo. Las baldosas del borde no pueden mirar hacia fuera, así que su orientación casi está decidida. Conecta todo dentro del límite para superar el nivel; menos giros, más estrellas. Teclas: flechas para elegir, Espacio para girar.",
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

const MUTE_KEY = "oiyo:garden-pipes:muted";
const W = 360;
const H = 560;
const TOP = 110;
const layout = (st: PipeStage) => {
  const cell = Math.floor(Math.min(64, 320 / st.cols, 400 / st.rows));
  return { cell, x: Math.round((W - st.cols * cell) / 2), y: TOP + Math.round((400 - st.rows * cell) / 2) };
};
const DIRS: Array<[number, number, number]> = [[N, 0, -1], [E, 1, 0], [S, 0, 1], [WEST, -1, 0]];

export default function GardenPipes({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; taps: number }>(null);
  const [taps, setTaps] = useState(0);
  const gardenRef = useRef<Garden | null>(null);
  const presses = useRef<number[]>([]);
  const spin = useRef<number[]>([]);
  const cursor = useRef(0);
  const keyed = useRef(false);
  const st = PIPES_STAGES[stage];

  useRunRecord(PIPES_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    const g = newGarden(PIPES_STAGES[s]);
    gardenRef.current = g;
    presses.current = [];
    spin.current = g.tiles.map(() => 0);
    cursor.current = g.stage.source;
    keyed.current = false;
    setTaps(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(PIPES_SLUG, STAGE_COUNT);
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
      const g = gardenRef.current;
      if (!g) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const L = layout(g.stage);
      // taps are read once per frame
      for (const i of presses.current.splice(0)) {
        if (g.over) break;
        const before = wet(g.stage, g.tiles).filter(Boolean).length;
        tap(g, i);
        spin.current[i] = 1;
        setTaps(g.taps);
        const after = wet(g.stage, g.tiles).filter(Boolean).length;
        sfx(after > before ? "place" : "tap");
        if (g.over) {
          setOver({ won: g.won, stars: starsFor(g), taps: g.taps });
          if (g.won) {
            setCleared(markStageCleared(PIPES_SLUG, g.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, 300, ["#ff8fab", "#ffd43b", "#74c0fc"], 30, 140, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      spin.current = spin.current.map((v) => Math.max(0, v - dt * 8));
      stepParticles(parts.current, dt, 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#d3f9d8";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#b2f2bb";
        for (let k = 0; k < 50; k++) ctx.fillRect((k * 151 + ((k * k * 37) % 89)) % W, (k * 263 + ((k * k * 53) % 97)) % H, 4, 4);
        const { cols, rows } = g.stage;
        const w = wet(g.stage, g.tiles);
        ctx.fillStyle = "#8a5a2b";
        ctx.fillRect(L.x - 6, L.y - 6, cols * L.cell + 12, rows * L.cell + 12);
        // the tap above its tile
        const sx = L.x + (g.stage.source % cols) * L.cell + L.cell / 2;
        ctx.fillStyle = "#868e96";
        ctx.fillRect(sx - 6, L.y - 34, 12, 30);
        ctx.fillRect(sx - 16, L.y - 40, 32, 10);
        ctx.fillStyle = "#e03131";
        ctx.fillRect(sx - 6, L.y - 46, 12, 8);
        for (let i = 0; i < g.tiles.length; i++) {
          const x = L.x + (i % cols) * L.cell;
          const y = L.y + Math.floor(i / cols) * L.cell;
          ctx.fillStyle = (i % cols) % 2 === Math.floor(i / cols) % 2 ? "#a9e34b" : "#94d82d";
          ctx.fillRect(x, y, L.cell, L.cell);
          const m = g.tiles[i];
          const cx = x + L.cell / 2;
          const cy = y + L.cell / 2;
          const pw = Math.max(6, Math.round(L.cell / 5));
          const wob = spin.current[i] * 4;
          ctx.fillStyle = w[i] ? "#339af0" : "#adb5bd";
          ctx.fillRect(cx - pw / 2 - wob / 2, cy - pw / 2 - wob / 2, pw + wob, pw + wob);
          for (const [bit, dx, dy] of DIRS) {
            if (!(m & bit)) continue;
            if (dx) ctx.fillRect(dx > 0 ? cx : x, cy - pw / 2, L.cell / 2, pw);
            else ctx.fillRect(cx - pw / 2, dy > 0 ? cy : y, pw, L.cell / 2);
          }
          // a flower at the end of a pipe: a bud while dry, open once watered
          const ends = DIRS.filter(([bit]) => m & bit).length;
          if (ends === 1 && i !== g.stage.source) {
            const r = w[i] ? Math.round(L.cell / 4) : Math.round(L.cell / 7);
            ctx.fillStyle = w[i] ? "#ff8fab" : "#69db7c";
            ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
            ctx.fillStyle = w[i] ? "#ffd43b" : "#2f9e44";
            ctx.fillRect(cx - r / 2, cy - r / 2, r, r);
          }
          if (keyed.current && cursor.current === i) {
            ctx.strokeStyle = "#212529";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2, y + 2, L.cell - 4, L.cell - 4);
            ctx.lineWidth = 1;
          }
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gardenRef.current;
    if (!g || g.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    const L = layout(g.stage);
    const c = Math.floor((x - L.x) / L.cell);
    const rr = Math.floor((y - L.y) / L.cell);
    if (c >= 0 && c < g.stage.cols && rr >= 0 && rr < g.stage.rows) {
      cursor.current = rr * g.stage.cols + c;
      presses.current.push(cursor.current);
    }
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const g = gardenRef.current;
    if (!g || g.over) return;
    const { cols, rows } = g.stage;
    const r = Math.floor(cursor.current / cols);
    const c = cursor.current % cols;
    if (e.key === "ArrowUp") cursor.current = Math.max(0, r - 1) * cols + c;
    else if (e.key === "ArrowDown") cursor.current = Math.min(rows - 1, r + 1) * cols + c;
    else if (e.key === "ArrowLeft") cursor.current = r * cols + Math.max(0, c - 1);
    else if (e.key === "ArrowRight") cursor.current = r * cols + Math.min(cols - 1, c + 1);
    else if (e.key === " " || e.key === "Enter") presses.current.push(cursor.current);
    else return;
    e.preventDefault();
    keyed.current = true;
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
      data-game="garden-pipes"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.taps, taps, st.limit)}</Badge>
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
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.taps)}</p> : null}
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
