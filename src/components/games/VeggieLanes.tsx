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
import { COLS, LANES_SLUG, LANE_STAGES, PLANTS, ROWS, STAGE_COUNT, canPlant, newGarden, plant, starsFor, step, type Garden, type PlantKind } from "../../lib/games/veggie-lanes";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; pests: string; start: string; win: string; lose: string; lost: string; again: string; next: string;
  plants: [string, string, string, string]; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", pests: "해충 {0}/{1}", start: "씨앗 카드를 고르고 칸을 눌러 심어요!", win: "텃밭을 지켰어요!", lose: "해충이 창고에 닿았어요", lost: "잃은 작물 {0}",
    again: "다시 하기", next: "다음 단계", plants: ["이슬꽃", "무 대포", "호박 벽", "고추 폭탄"],
    help: "달팽이·민달팽이·딱정벌레가 오른쪽에서 다섯 줄 텃밭을 기어와요. 하늘에서 이슬이 내리고 이슬꽃이 이슬을 더 만들어요. 아래 카드를 고르고 칸을 눌러 심어요: 무 대포는 그 줄로 씨앗을 쏘고, 호박 벽은 오래 버티며 길을 막고, 고추 폭탄은 잠시 뒤 주변 세 줄을 한꺼번에 날려요. 해충이 왼쪽 창고에 닿으면 끝, 마지막 무리까지 막으면 통과예요. 작물을 하나도 안 잃으면 별 셋이에요. 키보드는 1~4로 카드, 화살표로 칸, Space로 심기예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", pests: "Pests {0}/{1}", start: "Pick a seed card, then tap a square to plant!", win: "The garden is safe!", lose: "A pest reached the shed", lost: "Crops lost: {0}",
    again: "Try again", next: "Next stage", plants: ["Dewflower", "Radish", "Pumpkin", "Chili"],
    help: "Snails, slugs and beetles creep in from the right across five rows of garden. Dew falls from the sky, and dewflowers make more. Pick a card below and tap a square to plant: radishes fire seeds down their row, pumpkins hold the line for a long time, and a chili bursts a moment later on everything across three rows. A pest that reaches the shed on the left ends the day; stop the last wave to clear it. Lose no crops for three stars. Keys: 1–4 for cards, arrows to move, Space to plant.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", pests: "害虫 {0}/{1}", start: "タネのカードを選んでマスをタップ！", win: "畑を守った！", lose: "害虫が小屋に着いた", lost: "失った作物 {0}",
    again: "もう一度", next: "次の面", plants: ["つゆ花", "大根砲", "かぼちゃ壁", "とうがらし"],
    help: "カタツムリ・ナメクジ・カブトムシが右から5列の畑をはってきます。空からつゆが降り、つゆ花がさらにつゆを作ります。下のカードを選んでマスをタップして植えましょう。大根砲はその列にタネを撃ち、かぼちゃ壁は長く持ちこたえ、とうがらしは少しあとに周り3列をまとめて吹き飛ばします。害虫が左の小屋に着いたら終わり、最後の群れまで止めればクリア。作物を1つも失わなければ星3つ。キーボードは1〜4でカード、矢印でマス、Spaceで植えます。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", pests: "害虫 {0}/{1}", start: "选一张种子卡，再点格子种下！", win: "菜园守住了！", lose: "害虫爬到了小屋", lost: "损失作物 {0}",
    again: "再来一次", next: "下一关", plants: ["露水花", "萝卜炮", "南瓜墙", "辣椒弹"],
    help: "蜗牛、鼻涕虫和甲虫从右边爬过五排菜园。天上会落下露水，露水花还能产出更多。选下方卡片再点格子种下：萝卜炮沿本排发射种子，南瓜墙能长时间挡住去路，辣椒弹稍后会炸开周围三排。害虫爬到左边小屋就失败，挡住最后一波即过关。一株作物都不损失可得三星。键盘：1~4 选卡，方向键移动，空格种下。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", pests: "Nuisibles {0}/{1}", start: "Choisissez une graine, puis touchez une case !", win: "Le potager est sauvé !", lose: "Un nuisible a atteint la cabane", lost: "Plants perdus : {0}",
    again: "Réessayer", next: "Niveau suivant", plants: ["Fleur de rosée", "Radis", "Citrouille", "Piment"],
    help: "Escargots, limaces et scarabées arrivent par la droite sur cinq rangs de potager. La rosée tombe du ciel et les fleurs de rosée en produisent davantage. Choisissez une carte et touchez une case pour planter : le radis tire des graines dans son rang, la citrouille tient longtemps la ligne, et le piment éclate un instant plus tard sur trois rangs. Un nuisible qui atteint la cabane à gauche termine la journée ; arrêtez la dernière vague pour réussir. Aucun plant perdu : trois étoiles. Touches : 1–4 pour les cartes, flèches pour bouger, Espace pour planter.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", pests: "Plagas {0}/{1}", start: "¡Elige una semilla y toca una casilla para plantar!", win: "¡El huerto está a salvo!", lose: "Una plaga llegó al cobertizo", lost: "Plantas perdidas: {0}",
    again: "Reintentar", next: "Siguiente nivel", plants: ["Flor de rocío", "Rábano", "Calabaza", "Guindilla"],
    help: "Caracoles, babosas y escarabajos llegan por la derecha a cinco hileras de huerto. El rocío cae del cielo y las flores de rocío producen más. Elige una carta y toca una casilla para plantar: el rábano dispara semillas por su hilera, la calabaza aguanta mucho tiempo y la guindilla estalla poco después sobre tres hileras. Si una plaga llega al cobertizo de la izquierda, se acaba el día; frena la última oleada para superarlo. Sin perder plantas, tres estrellas. Teclas: 1–4 para cartas, flechas para moverte, Espacio para plantar.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:veggie-lanes:muted";
const W = 360;
const H = 560;
const GX = 12; // the garden's left edge (the shed sits left of it)
const GY = 96;
const CW = 42;
const CH = 64;
const CARD_Y = 432;
const PLANT_COLOURS = ["#74c0fc", "#e64980", "#fd7e14", "#e03131"];
const PEST_COLOURS = ["#a9805b", "#5f3dc4", "#c0a36e"];

function drawPlant(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, t: number) {
  const bob = Math.round(Math.sin(t * 3 + x) * 1.5);
  ctx.fillStyle = "#2f9e44";
  ctx.fillRect(x + 18, y + 30 + bob, 6, 22);
  if (kind === 0) {
    ctx.fillStyle = "#e7f5ff";
    for (const [dx, dy] of [[-8, 0], [8, 0], [0, -8], [0, 8]]) ctx.fillRect(x + 15 + dx, y + 18 + dy + bob, 12, 12);
    ctx.fillStyle = PLANT_COLOURS[0];
    ctx.fillRect(x + 15, y + 18 + bob, 12, 12);
  } else if (kind === 1) {
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(x + 9, y + 20 + bob, 22, 20);
    ctx.fillStyle = PLANT_COLOURS[1];
    ctx.fillRect(x + 9, y + 14 + bob, 22, 10);
    ctx.fillStyle = "#212529";
    ctx.fillRect(x + 27, y + 26 + bob, 6, 6);
  } else if (kind === 2) {
    ctx.fillStyle = PLANT_COLOURS[2];
    ctx.fillRect(x + 4, y + 16, 34, 36);
    ctx.fillStyle = "#e8590c";
    ctx.fillRect(x + 12, y + 16, 4, 36);
    ctx.fillRect(x + 26, y + 16, 4, 36);
  } else {
    ctx.fillStyle = PLANT_COLOURS[3];
    ctx.fillRect(x + 13, y + 18 + bob, 16, 30);
    ctx.fillStyle = "#ffd43b";
    ctx.fillRect(x + 17, y + 22 + bob, 4, 4);
  }
}

function drawPest(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, t: number, eating: boolean) {
  const wig = Math.round(Math.sin(t * (eating ? 14 : 5)) * 2);
  ctx.fillStyle = PEST_COLOURS[kind];
  if (kind === 0) {
    ctx.fillRect(x - 4, y + 38, 30, 10);
    ctx.fillStyle = "#e8590c";
    ctx.fillRect(x + 4 + wig, y + 22, 20, 18);
    ctx.fillStyle = "#ffa94d";
    ctx.fillRect(x + 10 + wig, y + 28, 8, 6);
  } else if (kind === 1) {
    ctx.fillRect(x - 2, y + 24, 30, 24);
    ctx.fillStyle = "#9775fa";
    ctx.fillRect(x + 12, y + 24, 2, 24);
    ctx.fillStyle = "#212529";
    ctx.fillRect(x - 6 + wig, y + 30, 6, 6);
  } else {
    ctx.fillRect(x - 4 + wig, y + 38, 34, 10);
    ctx.fillRect(x - 4 + wig, y + 30, 8, 10);
  }
  ctx.fillStyle = "#212529";
  ctx.fillRect(x - 2 + (kind === 1 ? 0 : wig), y + (kind === 1 ? 28 : 34), 3, 3);
}

export default function VeggieLanes({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; lost: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gardenRef = useRef<Garden | null>(null);
  const pick = useRef<PlantKind>(1);
  const cursor = useRef({ row: 2, col: 1 });
  const taps = useRef<Array<{ kind: "cell"; row: number; col: number } | { kind: "card"; card: PlantKind } | { kind: "plant" }>>([]);
  const started = useRef(false);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;

  useRunRecord(LANES_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    const g = newGarden(LANE_STAGES[s]);
    gardenRef.current = g;
    pick.current = g.stage.locked.includes(0) ? 1 : 0;
    taps.current = [];
    parts.current = [];
    started.current = false;
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(LANES_SLUG, STAGE_COUNT);
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
      // taps are read once per frame
      for (const tp of taps.current.splice(0)) {
        if (g.over) break;
        started.current = true;
        if (tp.kind === "card") {
          if (!g.stage.locked.includes(tp.card)) {
            pick.current = tp.card;
            sfx("tap");
          }
          continue;
        }
        if (tp.kind === "cell") cursor.current = { row: tp.row, col: tp.col };
        const { row, col } = cursor.current;
        if (plant(g, pick.current, row, col)) {
          spawnBurst(parts.current, GX + col * CW + CW / 2, GY + row * CH + CH - 10, ["#8ce99a", "#ffe066"], 10, 60, 2);
          sfx("place");
        } else sfx("fail");
      }
      if (started.current && !g.over) {
        const ev = step(g, dt);
        for (const b of ev.burst) {
          spawnBurst(parts.current, GX + b.col * CW + CW / 2, GY + b.row * CH + CH / 2, ["#ff6b6b", "#ffd43b", "#fff"], 36, 180, 3);
          sfx("combo");
        }
        if (ev.killed) sfx("success");
        if (ev.eaten) sfx("fail");
        if (g.over) {
          const stars = starsFor(g);
          setOver({ won: g.won, stars, lost: g.lost });
          if (g.won) {
            setCleared(markStageCleared(LANES_SLUG, g.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 160);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#a5d8ff";
        ctx.fillRect(0, 0, W, H);
        // dew and the wave bar
        ctx.fillStyle = "#1864ab";
        ctx.fillRect(10, 10, 92, 34);
        ctx.fillStyle = "#74c0fc";
        ctx.fillRect(18, 18, 18, 18);
        ctx.fillStyle = "#f8f9fa";
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "left";
        ctx.fillText(String(g.dew), 42, 34);
        const total = g.stage.spawns.length;
        ctx.fillStyle = "#495057";
        ctx.fillRect(116, 22, 232, 10);
        ctx.fillStyle = "#f76707";
        ctx.fillRect(116, 22, Math.round((232 * g.next) / Math.max(1, total)), 10);
        ctx.fillStyle = "#212529";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(fill(copyRef.current.pests, g.next, total), 116, 56);
        // the shed
        ctx.fillStyle = "#862e9c";
        ctx.fillRect(0, GY, GX, ROWS * CH);
        // the garden
        for (let r = 0; r < ROWS; r++)
          for (let k = 0; k < COLS; k++) {
            ctx.fillStyle = (r + k) % 2 ? "#69db7c" : "#8ce99a";
            ctx.fillRect(GX + k * CW, GY + r * CH, CW, CH);
            ctx.fillStyle = "#94d82d";
            ctx.fillRect(GX + k * CW, GY + r * CH + CH - 6, CW, 6);
          }
        const cur = cursor.current;
        const okHere = canPlant(g, pick.current, cur.row, cur.col);
        ctx.strokeStyle = okHere ? "#f8f9fa" : "#fa5252";
        ctx.lineWidth = 3;
        ctx.strokeRect(GX + cur.col * CW + 2, GY + cur.row * CH + 2, CW - 4, CH - 4);
        ctx.lineWidth = 1;
        for (const p of g.plants) {
          drawPlant(ctx, p.kind, GX + p.col * CW, GY + p.row * CH, now / 1000);
          if (p.hp < PLANTS[p.kind].hp) {
            ctx.fillStyle = "#c92a2a";
            ctx.fillRect(GX + p.col * CW + 4, GY + p.row * CH + 4, Math.round(((CW - 8) * p.hp) / PLANTS[p.kind].hp), 3);
          }
        }
        ctx.fillStyle = "#f8f9fa";
        for (const s of g.seeds) ctx.fillRect(Math.round(GX + s.x * CW) - 4, GY + s.row * CH + 24, 8, 8);
        for (const e of g.pests) {
          const x = Math.round(GX + e.x * CW);
          drawPest(ctx, e.kind, x, GY + e.row * CH, now / 1000, e.eating);
          ctx.fillStyle = "#212529";
          ctx.fillRect(x - 2, GY + e.row * CH + 12, 28, 4);
          ctx.fillStyle = "#fa5252";
          ctx.fillRect(x - 2, GY + e.row * CH + 12, Math.round((28 * Math.max(0, e.hp)) / e.max), 4);
        }
        // seed cards
        for (let k = 0 as PlantKind; k < 4; k = (k + 1) as PlantKind) {
          const x = 10 + k * 86;
          const locked = g.stage.locked.includes(k);
          ctx.fillStyle = locked ? "#868e96" : pick.current === k ? "#fff3bf" : "#f1f3f5";
          ctx.fillRect(x, CARD_Y, 80, 112);
          ctx.strokeStyle = pick.current === k && !locked ? "#f08c00" : "#495057";
          ctx.lineWidth = 3;
          ctx.strokeRect(x, CARD_Y, 80, 112);
          ctx.lineWidth = 1;
          if (!locked) {
            drawPlant(ctx, k, x + 19, CARD_Y + 4, 0);
            const wait = g.ready[k] / PLANTS[k].recharge;
            if (wait > 0) {
              ctx.fillStyle = "rgba(33,37,41,0.5)";
              ctx.fillRect(x, CARD_Y, 80, Math.round(112 * wait));
            }
          }
          ctx.fillStyle = g.dew >= PLANTS[k].cost ? "#212529" : "#c92a2a";
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center";
          ctx.fillText(locked ? "🔒" : String(PLANTS[k].cost), x + 40, CARD_Y + 78);
          ctx.fillStyle = "#212529";
          ctx.font = "bold 11px sans-serif";
          ctx.fillText(copyRef.current.plants[k], x + 40, CARD_Y + 100);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gardenRef.current?.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    if (y >= CARD_Y) {
      const card = Math.floor((x - 10) / 86);
      if (card >= 0 && card < 4) taps.current.push({ kind: "card", card: card as PlantKind });
      return;
    }
    const col = Math.floor((x - GX) / CW);
    const row = Math.floor((y - GY) / CH);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) taps.current.push({ kind: "cell", row, col });
    else taps.current.push({ kind: "card", card: pick.current });
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const cur = cursor.current;
    let handled = true;
    if (e.key >= "1" && e.key <= "4") taps.current.push({ kind: "card", card: (Number(e.key) - 1) as PlantKind });
    else if (e.key === "ArrowUp") cursor.current = { ...cur, row: Math.max(0, cur.row - 1) };
    else if (e.key === "ArrowDown") cursor.current = { ...cur, row: Math.min(ROWS - 1, cur.row + 1) };
    else if (e.key === "ArrowLeft") cursor.current = { ...cur, col: Math.max(0, cur.col - 1) };
    else if (e.key === "ArrowRight") cursor.current = { ...cur, col: Math.min(COLS - 1, cur.col + 1) };
    else if (e.key === " " || e.key === "Enter") taps.current.push({ kind: "plant" });
    else handled = false;
    if (handled) {
      e.preventDefault();
      setTouched(true);
      started.current = true;
    }
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
      data-game="veggie-lanes"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.lost, over.lost)}</p>
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
