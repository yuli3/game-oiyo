import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
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
import { COLS, DALJIP_SLUG, DALJIP_STAGES, ROWS, STAGE_COUNT, burning, idx, light, newYard, starsFor, stepYard, toggleStraw, type Yard } from "../../lib/games/daljip-fire";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; straw: string; moon: string; start: string; light: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; full2: string; wind: string;
}> = {
  ko: {
    stage: "{0}단계", straw: "짚단 {0}/{1}", moon: "달 뜨기까지 {0}초", start: "달집에 짚단을 끼우고 '불 붙이기'를 눌러요!", light: "불 붙이기", win: "달이 뜰 때 달집이 활활 탔어요!", lose: "달이 먼저 떠 버렸어요", result: "꼭대기까지 {0}초 (달은 {1}초)",
    again: "다시 하기", next: "다음 단계", full2: "짚단을 다 썼어요", wind: "바람",
    help: "정월 대보름 밤, 마을 사람들은 생솔가지와 짚으로 달집을 쌓고 보름달이 떠오르는 순간 불을 붙여요. 달집이 높이 잘 타오를수록 한 해가 좋다고 여겼지요. 달집은 대부분 생솔가지라 불이 천천히 붙고, 눈에 젖은 칸은 더 느려요. 밤바람이 불을 한쪽으로 밀기도 해요. 마른 짚단 몇 단이 있어요. 달집 칸을 탭해 짚단을 끼우고(다시 탭하면 빼요), '불 붙이기'를 누르면 맨 아래에서 불이 붙어요. 불은 짚을 타고 순식간에 번지고, 위로는 잘 오르지만 아래로는 더뎌요. 달이 다 뜨기 전에 꼭대기 소원지까지 불이 닿으면 통과예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", straw: "Straw {0}/{1}", moon: "Moonrise in {0}s", start: "Pack straw into the daljip, then tap Light!", light: "Light", win: "The daljip blazed as the moon rose!", lose: "The moon rose first", result: "Top in {0}s (moon at {1}s)",
    again: "Try again", next: "Next stage", full2: "No straw left", wind: "Wind",
    help: "On the night of Jeongwol Daeboreum, villagers build a daljip — a tall cone of pine branches and straw — and light it the moment the first full moon of the year rises; the higher and brighter it burns, the better the year. Your daljip is mostly green pine, which catches slowly, and snow-damp cells are slower still; the night wind can push the fire to one side. You have a few bundles of dry straw. Tap cells of the cone to pack straw in (tap again to take it out), then tap Light to set fire to the base. Fire races through straw, climbs readily and creeps downward slowly. Get it to the wish paper at the top before the moon is up.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", straw: "わら {0}/{1}", moon: "月の出まで {0}秒", start: "タルチプにわらを詰めて「火をつける」！", light: "火をつける", win: "月の出とともにタルチプが燃え上がった！", lose: "月が先に昇ってしまった", result: "てっぺんまで {0}秒（月は {1}秒）",
    again: "もう一度", next: "次の面", full2: "わらがもうない", wind: "風",
    help: "旧暦1月15日のテボルムの夜、村人は松の枝とわらでタルチプ（月の家）を高く積み、満月が昇る瞬間に火をつけます。高く明るく燃えるほど良い年になるとされました。タルチプはほとんどが生の松で火のつきが遅く、雪で湿ったマスはさらに遅く、夜風が火を片側へ押すこともあります。乾いたわら束がいくつかあります。マスをタップしてわらを詰め（もう一度タップで外す）、「火をつける」で根元に火をつけます。火はわらを一気に伝い、上へはよく燃え広がり、下へはゆっくり。月が昇りきる前にてっぺんの願い紙まで火が届けばクリア。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", straw: "草捆 {0}/{1}", moon: "月出还有 {0}秒", start: "往月屋里塞草捆，再点“点火”！", light: "点火", win: "月亮升起时月屋熊熊燃烧！", lose: "月亮先升起来了", result: "烧到顶 {0}秒（月出 {1}秒）",
    again: "再来一次", next: "下一关", full2: "草捆用完了", wind: "风",
    help: "正月十五（大보름）夜里，村民们用松枝和稻草堆起高高的“月屋”（달집），在第一轮满月升起的那一刻点火；烧得越高越旺，这一年就越好。月屋大多是青松枝，着火慢，被雪打湿的格子更慢，夜风还会把火推向一边。你有几捆干草。点击月屋的格子塞进草捆（再点一下取出），然后点“点火”从底部点燃。火顺着干草飞快蔓延，往上烧得快，往下烧得慢。在月亮完全升起前让火烧到顶端的愿望纸即过关。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", straw: "Paille {0}/{1}", moon: "Lever de lune dans {0} s", start: "Garnissez la daljip de paille, puis touchez Allumer !", light: "Allumer", win: "La daljip s'embrase au lever de la lune !", lose: "La lune s'est levée avant", result: "Sommet en {0} s (lune à {1} s)",
    again: "Réessayer", next: "Niveau suivant", full2: "Plus de paille", wind: "Vent",
    help: "La nuit de Jeongwol Daeboreum, les villageois dressent une daljip — un haut cône de branches de pin et de paille — et l'allument au lever de la première pleine lune de l'année : plus elle brûle haut et clair, meilleure sera l'année. Votre daljip est surtout en pin vert, qui prend lentement, et les cases mouillées de neige sont plus lentes encore ; le vent de la nuit peut pousser les flammes d'un côté. Vous avez quelques bottes de paille sèche. Touchez des cases du cône pour y glisser de la paille (touchez à nouveau pour la retirer), puis Allumer pour mettre le feu à la base. Le feu file dans la paille, monte volontiers et descend lentement. Faites-le atteindre le papier des vœux au sommet avant que la lune soit levée.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", straw: "Paja {0}/{1}", moon: "Sale la luna en {0} s", start: "¡Mete paja en la daljip y toca Encender!", light: "Encender", win: "¡La daljip ardió al salir la luna!", lose: "La luna salió antes", result: "Cima en {0} s (luna a los {1} s)",
    again: "Reintentar", next: "Siguiente nivel", full2: "No queda paja", wind: "Viento",
    help: "La noche de Jeongwol Daeboreum, los vecinos levantan una daljip —un alto cono de ramas de pino y paja— y la encienden en el momento en que sale la primera luna llena del año: cuanto más alto y brillante arde, mejor será el año. Tu daljip es casi toda de pino verde, que prende despacio, y las casillas húmedas de nieve aún más; el viento de la noche puede empujar el fuego hacia un lado. Tienes unos haces de paja seca. Toca casillas del cono para meter paja (toca otra vez para quitarla) y luego Encender para prender la base. El fuego corre por la paja, sube con facilidad y baja despacio. Haz que llegue al papel de los deseos de la cima antes de que salga la luna.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:daljip-fire:muted";
const W = 360;
const H = 560;
const CW = 36;
const CH = 34;
const GX = (W - COLS * CW) / 2;
const GY = 82;

const STRAW: PixelArt = { palette: { y: "#fcc419", o: "#e67700", k: "#8c693c" }, rows: ["yoy", "yyy", "kkk", "yyy", "yoy"] };
const WISH: PixelArt = { palette: { w: "#fff9db", r: "#e03131" }, rows: ["www", "wrw", "www", "wrw"] };

interface Pop { text: string; t: number; color: string; x: number; y: number }

export default function DaljipFire({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; top: number; moon: number }>(null);
  const [touched, setTouched] = useState(false);
  const [lit, setLit] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const yRef = useRef<Yard>(newYard(DALJIP_STAGES[0]));
  const input = useRef<Array<number | "light">>([]);
  const cursor = useRef({ cell: idx(4, 8), shown: false });
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = DALJIP_STAGES[stage];

  useRunRecord(DALJIP_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    yRef.current = newYard(DALJIP_STAGES[s]);
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
    setLit(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(DALJIP_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (yRef.current.over) return;
      const cur = cursor.current;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (moves[ev.key]) {
        ev.preventDefault();
        const col = Math.max(0, Math.min(COLS - 1, (cur.cell % COLS) + moves[ev.key][0]));
        const row = Math.max(0, Math.min(ROWS - 1, Math.floor(cur.cell / COLS) + moves[ev.key][1]));
        cur.cell = idx(col, row);
        cur.shown = true;
        setTouched(true);
      } else if (ev.key === " ") {
        ev.preventDefault();
        input.current.push(cur.cell);
        setTouched(true);
      } else if (ev.key === "Enter" || ev.key === "l" || ev.key === "L") {
        input.current.push("light");
        setTouched(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let flick = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      flick += dt;
      const y = yRef.current;
      const cp = copyRef.current;
      // taps are read once per frame
      for (const e of input.current.splice(0)) {
        if (e === "light") {
          if (light(y)) {
            setLit(true);
            sfx("place");
          }
          continue;
        }
        const res = toggleStraw(y, e);
        if (res === "packed" || res === "removed") sfx("tap");
        else if (res === "full") pops.current.push({ text: cp.full2, t: 0.8, color: "#e8590c", x: W / 2, y: GY - 10 });
      }
      if (y.lit && !y.over) {
        const before = y.at.filter((a) => a <= y.t).length;
        stepYard(y, dt);
        if (y.at.filter((a) => a <= y.t).length > before) {
          // embers fly from the newest flames (visual only)
          const newest = y.at.findIndex((a) => a <= y.t && a > y.t - dt);
          if (newest >= 0) spawnBurst(parts.current, GX + (newest % COLS) * CW + CW / 2, GY + Math.floor(newest / COLS) * CH + CH / 2, ["#ffd43b", "#ff922b", "#fa5252"], 4, 50, Math.floor(y.t * 1000));
        }
        if (y.over) {
          setOver({ won: y.won, stars: starsFor(y), top: Math.round(y.at[y.stage.top] * 10) / 10, moon: y.stage.moonrise });
          if (y.won) {
            setCleared(markStageCleared(DALJIP_SLUG, y.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, GY + 10, ["#ffd43b", "#ff922b", "#fff3bf"], 30, 160, 7);
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, -60);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const s = y.stage;
        // a night sky over a dark ridge, and the moon climbing as the fire burns
        ctx.fillStyle = "#0c1633";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        for (let i = 0; i < 30; i++) ctx.fillRect((i * 97) % W, (i * 41) % 200, 2, 2);
        const rise = y.lit ? Math.min(1, y.t / s.moonrise) : 0;
        const my = 150 - rise * 110;
        ctx.fillStyle = "#fff3bf";
        ctx.beginPath();
        ctx.arc(300, my, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1b2a4a";
        ctx.beginPath();
        ctx.moveTo(0, 170);
        ctx.lineTo(120, 120);
        ctx.lineTo(240, 150);
        ctx.lineTo(W, 130);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.fill();
        ctx.fillStyle = "#e9ecef";
        ctx.fillRect(0, GY + ROWS * CH, W, H - GY - ROWS * CH);
        // the cone
        for (let i = 0; i < COLS * ROWS; i++) {
          const kind = s.cells[i];
          if (kind === "air") continue;
          const x = GX + (i % COLS) * CW;
          const yy = GY + Math.floor(i / COLS) * CH;
          const fire = burning(y, i);
          ctx.fillStyle = y.straw.has(i) ? "#e9c46a" : kind === "damp" ? "#4d6a5a" : "#2b5a3a";
          ctx.fillRect(x + 1, yy + 1, CW - 2, CH - 2);
          if (kind === "damp") {
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.fillRect(x + 4, yy + 3, CW - 8, 5);
          }
          if (y.straw.has(i)) drawSprite(ctx, STRAW, x + CW / 2, yy + CH / 2, { scale: 5 });
          else {
            ctx.fillStyle = kind === "damp" ? "#5f8070" : "#3c7a4e";
            ctx.fillRect(x + 6, yy + CH / 2 - 2, CW - 12, 4);
          }
          if (fire) {
            const f = 0.55 + 0.35 * Math.sin(flick * 12 + i);
            ctx.fillStyle = `rgba(255,${Math.round(120 + 80 * f)},43,${f.toFixed(2)})`;
            ctx.fillRect(x + 1, yy + 1, CW - 2, CH - 2);
          }
        }
        const tx = GX + (s.top % COLS) * CW + CW / 2;
        drawSprite(ctx, WISH, tx, GY - 10, { scale: 5 });
        // the wind
        ctx.fillStyle = "#a5d8ff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(cp.wind, 12, H - 40);
        const wl = Math.abs(s.wind) * 60;
        ctx.fillRect(56, H - 45, wl, 4);
        if (wl > 2) {
          ctx.beginPath();
          const ax = s.wind > 0 ? 56 + wl + 6 : 50;
          ctx.moveTo(ax, H - 43);
          ctx.lineTo(ax - Math.sign(s.wind) * 8, H - 49);
          ctx.lineTo(ax - Math.sign(s.wind) * 8, H - 37);
          ctx.fill();
        }
        if (cursor.current.shown && !y.lit) {
          const cc = cursor.current.cell;
          ctx.strokeStyle = "#fab005";
          ctx.lineWidth = 2;
          ctx.strokeRect(GX + (cc % COLS) * CW + 1, GY + Math.floor(cc / COLS) * CH + 1, CW - 2, CH - 2);
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#fff3bf";
        ctx.fillText(fill(cp.straw, s.straws - y.straw.size, s.straws), 12, 26);
        ctx.font = "14px sans-serif";
        ctx.fillText(fill(cp.moon, Math.max(0, s.moonrise - (y.lit ? y.t : 0)).toFixed(1)), 12, 46);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 15px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillRect(x - tw / 2, pp.y - 18, tw, 24);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, x, pp.y - 1);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="daljip-fire"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.moon, st.moonrise)}</Badge>
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
          onPointerDown={(ev) => {
            if (yRef.current.over) return;
            const r = ev.currentTarget.getBoundingClientRect();
            const x = ((ev.clientX - r.left) * W) / r.width;
            const yy = ((ev.clientY - r.top) * H) / r.height;
            const col = Math.floor((x - GX) / CW);
            const row = Math.floor((yy - GY) / CH);
            setTouched(true);
            if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
              cursor.current = { cell: idx(col, row), shown: false };
              input.current.push(idx(col, row));
            }
          }}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/2 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, Number.isFinite(over.top) ? over.top : "—", over.moon)}</p>
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
      <Button className="min-h-12 w-full" disabled={lit || Boolean(over)} onClick={() => input.current.push("light")}>
        <Flame className="size-4" />
        <span>{c.light}</span>
      </Button>
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
