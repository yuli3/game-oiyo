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
import { STAGE_COUNT, TRAY_SIZE, TRAY_SLUG, TRAY_STAGES, freeTiles, isFree, newPicnic, pick, starsFor, type Picnic } from "../../lib/games/trio-tray";
import { SNACKS } from "../../lib/games/trio-tray-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; tiles: string; start: string; win: string; lose: string; peak: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", tiles: "간식 {0}개", start: "위에 놓인 간식을 눌러 쟁반에 담아요!", win: "돗자리를 다 치웠어요!", lose: "쟁반이 꽉 찼어요", peak: "쟁반 최대 {0}칸",
    again: "다시 하기", next: "다음 단계",
    help: "돗자리 위에 간식 타일이 여러 겹 쌓여 있어요. 위에 아무것도 없는 타일을 누르면 아래 일곱 칸 쟁반으로 옮겨지고, 같은 간식 셋이 모이면 펑 사라져요. 쟁반 일곱 칸이 다 차면 끝이에요. 쟁반에 둘 있는 간식부터 찾아 채우고, 짝이 안 보이면 아래 타일을 많이 가린 타일을 먼저 치워요. 돗자리를 다 치우면 통과, 쟁반을 덜 채우고 끝내면 별이 늘어요. 키보드는 ←/→로 고르고 Space로 담아요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", tiles: "{0} snacks", start: "Tap a snack on top to put it on the tray!", win: "The blanket is clear!", lose: "The tray is full", peak: "Tray peaked at {0}",
    again: "Try again", next: "Next stage",
    help: "Snack tiles lie in layers on a picnic blanket. Tap a tile with nothing on it and it moves to the seven-slot tray below; three of the same snack pop away. Fill all seven slots and the picnic is over. Finish snacks you already have two of first, and when no match is in sight, clear the tiles that cover the most. Clear the blanket to pass; keep the tray emptier for more stars. Keys: ← / → to choose, Space to take.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", tiles: "おやつ {0}個", start: "上にあるおやつをタップしてトレーへ！", win: "シートが片づいた！", lose: "トレーがいっぱい", peak: "トレー最大 {0}マス",
    again: "もう一度", next: "次の面",
    help: "レジャーシートの上におやつのタイルが何層も重なっています。上に何もないタイルをタップすると下の7マスのトレーへ移り、同じおやつが3つそろうとポンと消えます。7マスが全部うまると終わり。トレーに2つあるおやつから先にそろえ、組が見えないときは下を多く隠しているタイルから片づけましょう。シートを全部片づければクリア、トレーを空けたまま終えるほど星が増えます。キーボードは←/→で選び、Spaceで取ります。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", tiles: "零食 {0} 个", start: "点上面没被压住的零食放进托盘！", win: "野餐垫清空了！", lose: "托盘满了", peak: "托盘最多 {0} 格",
    again: "再来一次", next: "下一关",
    help: "野餐垫上叠着好几层零食方块。点一块上面没有东西压着的方块，它就移到下方七格托盘里，凑齐三个相同零食就会消掉。七格全满就结束。先补齐托盘里已有两个的零食，看不到配对时，先拿走压住最多方块的那块。清空野餐垫即过关，托盘越空星越多。键盘用 ←/→ 选择，空格拿取。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", tiles: "{0} en-cas", start: "Touchez un en-cas du dessus pour le poser sur le plateau !", win: "La nappe est vide !", lose: "Le plateau est plein", peak: "Plateau au plus à {0}",
    again: "Réessayer", next: "Niveau suivant",
    help: "Des tuiles d'en-cas sont empilées sur une nappe de pique-nique. Touchez une tuile que rien ne recouvre : elle va sur le plateau de sept cases en bas, et trois en-cas identiques disparaissent. Sept cases pleines et le pique-nique est fini. Complétez d'abord les en-cas que vous avez déjà en double, et sans paire en vue, retirez les tuiles qui en cachent le plus. Videz la nappe pour réussir ; plus le plateau reste vide, plus d'étoiles. Touches : ← / → pour choisir, Espace pour prendre.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", tiles: "{0} meriendas", start: "¡Toca una merienda de arriba para ponerla en la bandeja!", win: "¡El mantel está despejado!", lose: "La bandeja está llena", peak: "Bandeja como mucho a {0}",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Hay fichas de merienda apiladas en capas sobre un mantel de picnic. Toca una ficha que nada tape y pasa a la bandeja de siete huecos de abajo; tres meriendas iguales desaparecen. Si se llenan los siete huecos, se acaba. Completa primero las meriendas de las que ya tienes dos, y si no ves pareja, quita las fichas que tapan más. Despeja el mantel para superar el nivel; cuanto más vacía la bandeja, más estrellas. Teclas: ← / → para elegir, Espacio para coger.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:trio-tray:muted";
const W = 360;
const H = 560;
const HALF = 24; // px per half-tile
const BX = 12;
const BY = 36;
const TRAY_Y = 470;
const SLOT = 48;

export default function TrioTray({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; peak: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const picnicRef = useRef<Picnic | null>(null);
  const taps = useRef<number[]>([]);
  const cursor = useRef(-1);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const st = TRAY_STAGES[stage];

  useRunRecord(TRAY_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    picnicRef.current = newPicnic(TRAY_STAGES[s]);
    taps.current = [];
    cursor.current = -1;
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(TRAY_SLUG, STAGE_COUNT);
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
      const p = picnicRef.current;
      if (!p) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const tiles = p.stage.tiles;
      // taps are read once per frame
      for (const i of taps.current.splice(0)) {
        if (p.over) break;
        const r = pick(p, i);
        if (r === "blocked") sfx("fail");
        else if (r === "matched") {
          spawnBurst(parts.current, W / 2, TRAY_Y + 28, ["#ffd43b", "#ff8787", "#fff"], 20, 140, 3);
          sfx("combo");
        } else sfx("place");
        if (p.over) {
          setOver({ won: p.won, stars: starsFor(p), peak: p.peak });
          if (p.won) {
            setCleared(markStageCleared(TRAY_SLUG, p.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 160);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // the blanket: red and white checks
        for (let y = 0; y < TRAY_Y - 12; y += 24)
          for (let x = 0; x < W; x += 24) {
            ctx.fillStyle = ((x + y) / 24) % 2 ? "#ffe3e3" : "#ff8787";
            ctx.fillRect(x, y, 24, 24);
          }
        const ox = BX + ((14 - p.stage.cols) * HALF) / 2;
        const order = tiles.map((_, i) => i).filter((i) => !p.gone[i]).sort((a, b) => tiles[a].z - tiles[b].z || tiles[a].y - tiles[b].y);
        for (const i of order) {
          const t = tiles[i];
          const x = ox + t.x * HALF - t.z * 2;
          const y = BY + t.y * HALF - t.z * 3;
          const free = isFree(p, i);
          ctx.fillStyle = "#7f5539";
          ctx.fillRect(x + 2, y + 5, HALF * 2 - 2, HALF * 2 - 2);
          ctx.fillStyle = free ? "#fff9db" : "#ced4da";
          ctx.fillRect(x, y, HALF * 2 - 2, HALF * 2 - 2);
          ctx.strokeStyle = cursor.current === i ? "#1971c2" : "#495057";
          ctx.lineWidth = cursor.current === i ? 3 : 1;
          ctx.strokeRect(x + 0.5, y + 0.5, HALF * 2 - 3, HALF * 2 - 3);
          drawSprite(ctx, SNACKS[t.kind], x + HALF - 1, y + HALF - 1, { scale: 5, alpha: free ? 1 : 0.45 });
        }
        ctx.lineWidth = 1;
        // the tray
        ctx.fillStyle = "#a87545";
        ctx.fillRect(4, TRAY_Y - 8, W - 8, 76);
        for (let k = 0; k < TRAY_SIZE; k++) {
          const x = 12 + k * SLOT;
          ctx.fillStyle = k === TRAY_SIZE - 1 && p.tray.length >= TRAY_SIZE - 1 ? "#ffc9c9" : "#f1f3f5";
          ctx.fillRect(x, TRAY_Y, SLOT - 4, 58);
          if (k < p.tray.length) drawSprite(ctx, SNACKS[p.tray[k]], x + (SLOT - 4) / 2, TRAY_Y + 29, { scale: 5 });
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = picnicRef.current;
    if (!p || p.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    const tiles = p.stage.tiles;
    const ox = BX + ((14 - p.stage.cols) * HALF) / 2;
    // the topmost tile under the finger
    let best = -1;
    tiles.forEach((t, i) => {
      if (p.gone[i]) return;
      const tx = ox + t.x * HALF - t.z * 2;
      const ty = BY + t.y * HALF - t.z * 3;
      if (x >= tx && x < tx + HALF * 2 && y >= ty && y < ty + HALF * 2 && (best < 0 || t.z > tiles[best].z)) best = i;
    });
    if (best >= 0) taps.current.push(best);
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const p = picnicRef.current;
    if (!p || p.over) return;
    const free = freeTiles(p).sort((a, b) => p.stage.tiles[a].y - p.stage.tiles[b].y || p.stage.tiles[a].x - p.stage.tiles[b].x);
    if (!free.length) return;
    const at = free.indexOf(cursor.current);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") cursor.current = free[(at + 1) % free.length];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") cursor.current = free[(at - 1 + free.length) % free.length];
    else if (e.key === " " || e.key === "Enter") {
      if (at >= 0) taps.current.push(cursor.current);
    } else return;
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
      data-game="trio-tray"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.tiles, st.tiles.length)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 bottom-24 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.peak, over.peak)}</p>
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
