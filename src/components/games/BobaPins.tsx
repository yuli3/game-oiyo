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
import { BOBA_SLUG, BOBA_STAGES, BROWN, CELL, CHILI, COLS, CUP_TOP, PIN, PLAIN, ROWS, STAGE_COUNT, WALL, newMachine, pull, starsFor, step, type Machine } from "../../lib/games/boba-pins";
import { CHILI_ART, KNOB_ART, PEARL_BROWN_ART, PEARL_WHITE_ART } from "../../lib/games/boba-pins-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; pins: string; start: string; win: string; plain: string; chili: string; spill: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    pins: "뽑은 핀 {0}",
    start: "핀을 눌러 뽑아요!",
    win: "버블티 완성!",
    plain: "하얀 펄이 컵에 들어갔어요",
    chili: "고추가 컵에 들어갔어요",
    spill: "펄이 통으로 굴러갔어요",
    result: "핀 {0}개로 완성했어요",
    help: "버블티 기계가 금색 핀 뒤에 펄을 담아 두고 있어요. 핀을 누르면 쏙 뽑히고, 핀이 받치던 것이 아래로 떨어져요. 갈색 흑당 펄은 바로 컵에 담아도 돼요. 하얀 펄은 갈색 펄에 닿는 순간 갈색으로 물들지만, 하얀 채로 컵에 들어가면 망쳐요. 고추가 컵에 들어가도 망치고, 양옆 통으로 굴러간 펄은 버려져요. 모든 펄을 갈색으로 컵에 담으면 통과, 적은 핀으로 끝낼수록 별이 많아요. 요령은 하얀 펄 위에 갈색 펄을 먼저 떨어뜨리는 것, 그리고 고추는 옆 통으로 먼저 보내는 것이에요. 키보드는 좌우 화살표로 핀을 고르고 Space로 뽑아요.",
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
    pins: "Pins {0}",
    start: "Tap a pin to pull it!",
    win: "Bubble tea's ready!",
    plain: "A white pearl got in the cup",
    chili: "Chili got in the cup",
    spill: "Pearls rolled into a bin",
    result: "Made with {0} pins",
    help: "A bubble-tea machine keeps its pearls behind golden pins. Tap a pin to pull it, and whatever it held falls. Brown sugar pearls can go straight into the cup. White pearls turn brown the moment a brown one touches them, but a white pearl in the cup spoils the drink. Chili in the cup spoils it too, and pearls that roll into the bins either side are wasted. Get every pearl into the cup, all brown, to pass; the fewer pins you pull, the more stars. The knack is dropping brown pearls onto the white ones first, and sending chili off to the side bins first. Keys: left and right arrows choose a pin, Space pulls it.",
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
    pins: "抜いたピン {0}",
    start: "ピンをタップして抜こう！",
    win: "タピオカミルクティー完成！",
    plain: "白いタピオカがカップに入った",
    chili: "唐辛子がカップに入った",
    spill: "タピオカが箱に転がった",
    result: "ピン{0}本で完成",
    help: "タピオカの機械が金色のピンの奥にタピオカをためています。ピンをタップすると抜けて、支えていたものが下に落ちます。茶色の黒糖タピオカはそのままカップへ入れてOK。白いタピオカは茶色にふれたとたん茶色に染まりますが、白いままカップに入るとだいなし。唐辛子が入ってもだいなしで、左右の箱に転がったタピオカはむだになります。全部のタピオカを茶色にしてカップに入れればクリア、少ないピンで終えるほど星が多くなります。コツは白いタピオカの上に茶色を先に落とすこと、そして唐辛子は先に横の箱へ送ること。キーボードは左右の矢印でピンを選び、Spaceで抜きます。",
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
    pins: "拔出的针 {0}",
    start: "点针把它拔出来！",
    win: "珍珠奶茶做好了！",
    plain: "白珍珠掉进杯子了",
    chili: "辣椒掉进杯子了",
    spill: "珍珠滚进旁边的桶了",
    result: "拔了 {0} 根针完成",
    help: "珍珠奶茶机把珍珠存在金色的针后面。点一下针就会拔出来，针托着的东西会往下掉。棕色黑糖珍珠可以直接进杯子。白珍珠一碰到棕色珍珠就会染成棕色，但白珍珠掉进杯子就毁了。辣椒进杯子也会毁掉，滚进两边桶里的珍珠就浪费了。把所有珍珠都变成棕色装进杯子即过关，拔的针越少星越多。诀窍是先把棕色珍珠落到白珍珠上，再先把辣椒送进旁边的桶。键盘用左右方向键选针，空格拔针。",
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
    pins: "Goupilles {0}",
    start: "Touchez une goupille pour la tirer !",
    win: "Le bubble tea est prêt !",
    plain: "Une perle blanche dans le gobelet",
    chili: "Du piment dans le gobelet",
    spill: "Des perles dans un bac",
    result: "Réussi avec {0} goupilles",
    help: "Une machine à bubble tea garde ses perles derrière des goupilles dorées. Touchez une goupille pour la tirer : ce qu'elle retenait tombe. Les perles au sucre brun peuvent aller tout droit dans le gobelet. Les perles blanches brunissent dès qu'une brune les touche, mais une perle blanche dans le gobelet gâche la boisson. Le piment aussi, et les perles qui roulent dans les bacs sur les côtés sont perdues. Mettez toutes les perles dans le gobelet, toutes brunes, pour réussir ; moins vous tirez de goupilles, plus vous gagnez d'étoiles. L'astuce : faire tomber les perles brunes sur les blanches d'abord, et envoyer le piment dans les bacs d'abord. Touches : flèches gauche et droite pour choisir une goupille, Espace pour la tirer.",
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
    pins: "Pasadores {0}",
    start: "¡Toca un pasador para sacarlo!",
    win: "¡El té de burbujas está listo!",
    plain: "Una perla blanca cayó en el vaso",
    chili: "Cayó guindilla en el vaso",
    spill: "Las perlas rodaron a un cubo",
    result: "Hecho con {0} pasadores",
    help: "Una máquina de té de burbujas guarda sus perlas detrás de pasadores dorados. Toca un pasador para sacarlo y lo que sostenía cae. Las perlas de azúcar moreno pueden ir directas al vaso. Las perlas blancas se vuelven marrones en cuanto las toca una marrón, pero una perla blanca en el vaso estropea la bebida. La guindilla también, y las perlas que ruedan a los cubos de los lados se pierden. Mete todas las perlas en el vaso, todas marrones, para superar el nivel; cuantos menos pasadores saques, más estrellas. El truco es dejar caer primero las perlas marrones sobre las blancas, y mandar primero la guindilla a los cubos de los lados. Teclas: flechas izquierda y derecha para elegir pasador, Espacio para sacarlo.",
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

const MUTE_KEY = "oiyo:boba-pins:muted";
const W = 360;
const H = 560;
const STEP_S = 1 / 30;

/** Where a pin's knob sits: the right end of a floor pin, the top of a side pin. */
function knobOf(cells: number[]): [number, number] {
  const rs = cells.map((i) => Math.floor(i / COLS));
  const cs = cells.map((i) => i % COLS);
  const flat = rs.every((r) => r === rs[0]);
  if (flat) return [Math.max(...cs) * CELL + CELL / 2, rs[0] * CELL + CELL / 2];
  return [cs[0] * CELL + CELL / 2, Math.min(...rs) * CELL + CELL / 2];
}

export default function BobaPins({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; pulls: number; why: string }>(null);
  const [pulls, setPulls] = useState(0);
  const machineRef = useRef<Machine | null>(null);
  const acc = useRef(0);
  const pick = useRef<{ k: number; shown: boolean }>({ k: 0, shown: false });

  useRunRecord(BOBA_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    machineRef.current = newMachine(BOBA_STAGES[s]);
    acc.current = 0;
    pick.current = { k: 0, shown: false };
    setPulls(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(BOBA_SLUG, STAGE_COUNT);
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
      const m = machineRef.current;
      if (!m) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (!m.over) {
        acc.current += dt;
        while (acc.current >= STEP_S && !m.over) {
          acc.current -= STEP_S;
          step(m);
        }
        if (m.over) {
          setOver({ won: m.won, stars: starsFor(m), pulls: m.pulls, why: m.why });
          if (m.won) {
            setCleared(markStageCleared(BOBA_SLUG, m.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, 400, ["#e6c49a", "#5c3a1e", "#fff"], 30, 140, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#fff0f6";
        ctx.fillRect(0, 0, W, H);
        // the cup: milk tea in a clear cup
        ctx.fillStyle = "#f3e1c7";
        ctx.fillRect(4 * CELL, CUP_TOP * CELL, 10 * CELL, (ROWS - 1 - CUP_TOP) * CELL);
        ctx.fillStyle = "#e9cfa9";
        for (let y = CUP_TOP * CELL + 8; y < (ROWS - 1) * CELL; y += 16) ctx.fillRect(4 * CELL, y, 10 * CELL, 2);
        // the bins either side
        ctx.fillStyle = "#e9ecef";
        ctx.fillRect(CELL, CELL, 2 * CELL, (ROWS - 2) * CELL);
        ctx.fillRect(15 * CELL, CELL, 2 * CELL, (ROWS - 2) * CELL);
        const g = m.grid;
        for (let i = 0; i < g.length; i++) {
          const v = g[i];
          const x = (i % COLS) * CELL;
          const y = Math.floor(i / COLS) * CELL;
          if (v === WALL) {
            ctx.fillStyle = "#7048e8";
            ctx.fillRect(x, y, CELL, CELL);
            ctx.fillStyle = "#845ef7";
            ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
          } else if (v === PIN) {
            ctx.fillStyle = "#fab005";
            ctx.fillRect(x, y + 6, CELL, 8);
            ctx.fillStyle = "#fff3bf";
            ctx.fillRect(x, y + 7, CELL, 2);
          } else if (v === BROWN) drawSprite(ctx, PEARL_BROWN_ART, x + CELL / 2, y + CELL / 2, { scale: 4 });
          else if (v === PLAIN) drawSprite(ctx, PEARL_WHITE_ART, x + CELL / 2, y + CELL / 2, { scale: 4 });
          else if (v === CHILI) drawSprite(ctx, CHILI_ART, x + CELL / 2, y + CELL / 2, { scale: 4 });
        }
        // side pins stand upright: draw them as columns
        m.stage.pins.forEach((cells, k) => {
          if (m.pulled[k]) return;
          const rs = cells.map((i) => Math.floor(i / COLS));
          if (!rs.every((r) => r === rs[0])) {
            for (const i of cells) {
              const x = (i % COLS) * CELL;
              const y = Math.floor(i / COLS) * CELL;
              ctx.fillStyle = "#fff0f6";
              ctx.fillRect(x, y, CELL, CELL);
              ctx.fillStyle = "#fab005";
              ctx.fillRect(x + 6, y, 8, CELL);
            }
          }
          const [kx, ky] = knobOf(cells);
          drawSprite(ctx, KNOB_ART, kx, ky, { scale: 4 });
          if (pick.current.shown && pick.current.k === k) {
            ctx.strokeStyle = "#1c7ed6";
            ctx.lineWidth = 2;
            ctx.strokeRect(kx - 12, ky - 12, 24, 24);
          }
        });
        // the cup's rim
        ctx.fillStyle = "#adb5bd";
        ctx.fillRect(4 * CELL, CUP_TOP * CELL - 3, 10 * CELL, 3);
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
  const pullPin = (k: number) => {
    const m = machineRef.current;
    if (!m || !pull(m, k)) return;
    setPulls(m.pulls);
    const [kx, ky] = knobOf(m.stage.pins[k]);
    spawnBurst(parts.current, kx, ky, ["#fab005", "#fff3bf"], 10, 90, 2);
    sfx("tap");
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = machineRef.current;
    if (!m || m.over) return;
    setTouched(true);
    pick.current.shown = false;
    const p = toField(e);
    // the nearest pin cell within a cell's reach of the tap
    let best = -1;
    let bestD = CELL * 1.2;
    m.stage.pins.forEach((cells, k) => {
      if (m.pulled[k]) return;
      for (const i of cells) {
        const d = Math.hypot((i % COLS) * CELL + CELL / 2 - p.x, Math.floor(i / COLS) * CELL + CELL / 2 - p.y);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
    });
    if (best >= 0) pullPin(best);
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const m = machineRef.current;
    if (!m || m.over) return;
    const k = e.key;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter"].includes(k)) return;
    e.preventDefault();
    setTouched(true);
    const left = m.stage.pins.map((_, i) => i).filter((i) => !m.pulled[i]);
    if (!left.length) return;
    const pk = pick.current;
    if (!left.includes(pk.k)) pk.k = left[0];
    if (!pk.shown) {
      pk.shown = true;
      if (k !== " " && k !== "Enter") return;
    }
    const at = left.indexOf(pk.k);
    if (k === "ArrowLeft" || k === "ArrowUp") pk.k = left[(at - 1 + left.length) % left.length];
    else if (k === "ArrowRight" || k === "ArrowDown") pk.k = left[(at + 1) % left.length];
    else pullPin(pk.k);
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
      data-game="boba-pins"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.pins, pulls)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-6 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : over.why === "chili" ? c.chili : over.why === "spill" ? c.spill : c.plain}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.pulls)}</p> : null}
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
