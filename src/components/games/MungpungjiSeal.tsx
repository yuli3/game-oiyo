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
import { COLS, MUNGPUNGJI_SLUG, MUNG_STAGES, ROWS, STAGE_COUNT, WARMTH, newRoom, paste, shade, starsFor, stepRoom, type Room } from "../../lib/games/mungpungji-seal";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; paper: string; start: string; win: string; cold: string; out: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; sealed: string; wasted: string; gust: string;
}> = {
  ko: {
    stage: "{0}단계", goal: "바람구멍 {0}곳", paper: "문풍지 {0}장", start: "성에가 가장 짙은 곳을 탭해 문풍지를 발라요!", win: "방이 따뜻해졌어요!", cold: "방이 식어 버렸어요", out: "문풍지가 떨어졌어요", result: "온기 {0}% · 헛바른 종이 {1}장",
    again: "다시 하기", next: "다음 단계", sealed: "바람 막음!", wasted: "여긴 아니었어요", gust: "휘잉! 새 바람구멍",
    help: "한옥 문은 나무 문살에 한지를 바른 것이라, 겨울이면 찬 바람이 작은 틈마다 새어 들어와요. 그래서 틈에 종이 띠를 덧바르는데 이것이 문풍지예요. 틈은 너무 작아서 눈에 안 보이지만, 바람이 드는 곳 둘레 종이에는 성에가 껴요. 틈 바로 옆이 가장 짙어요. 성에가 짙은 칸을 탭(또는 방향키와 스페이스)해 문풍지를 바르면 그 칸의 바람을 막아요. 바람구멍이 열려 있는 동안 방의 온기가 줄어들고, 온기가 다 떨어지거나 문풍지가 모자라면 실패예요. 바람구멍 두 곳이 가까우면 성에가 겹쳐서 헷갈리고, 높은 단계에서는 바람이 새 구멍을 내요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", goal: "{0} drafts", paper: "{0} paper strips", start: "Tap where the frost is thickest to paste a strip!", win: "The room is warm again!", cold: "The room went cold", out: "Out of paper", result: "Warmth {0}% · {1} strips wasted",
    again: "Try again", next: "Next stage", sealed: "Draft stopped!", wasted: "Not here", gust: "Whoosh! A new draft",
    help: "A hanok door is a wooden lattice covered in hanji paper, and in winter cold air seeps through every tiny gap. People paste strips of paper over the cracks — mungpungji. The gaps are too small to see, but frost gathers on the paper around a draft, thickest right next to it. Tap the frostiest patch (or use the arrows and Space) to paste a strip there; if the draft is under it, it stops. While drafts are open the room loses warmth: run out of warmth or paper and the stage is lost. Two drafts close together blur their frost, and on later stages gusts tear new gaps while you work.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", goal: "すきま風 {0}か所", paper: "目張り紙 {0}枚", start: "霜がいちばん濃いところをタップして紙を貼ろう！", win: "部屋が暖かくなった！", cold: "部屋が冷えてしまった", out: "紙がなくなった", result: "ぬくもり {0}% · むだに貼った紙 {1}枚",
    again: "もう一度", next: "次の面", sealed: "すきま風を止めた！", wasted: "ここじゃなかった", gust: "ひゅう！新しいすきま",
    help: "韓屋の戸は木の格子に韓紙を貼ったもので、冬には冷たい風が小さなすきまから入り込みます。そこですきまに紙の帯を重ね貼りします。これがムンプンジ（目張り紙）です。すきまは小さすぎて見えませんが、風が入るところの周りの紙には霜がつき、すきまのすぐそばが最も濃くなります。霜の濃いマスをタップ（または矢印とスペース）すると紙を貼り、その下にすきまがあれば風が止まります。すきまが開いている間は部屋のぬくもりが減り、ぬくもりか紙がなくなると失敗です。すきまが2か所近いと霜が重なってまぎらわしく、後半の面では風が新しいすきまを開けます。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", goal: "漏风处 {0}个", paper: "封条纸 {0}张", start: "点霜最浓的地方贴封条纸！", win: "屋里暖和了！", cold: "屋里变冷了", out: "纸用完了", result: "暖意 {0}% · 白贴的纸 {1}张",
    again: "再来一次", next: "下一关", sealed: "挡住了风！", wasted: "不是这里", gust: "呼——又漏风了",
    help: "韩屋的门是在木格子上糊韩纸做成的，冬天冷风会从每条小缝钻进来。所以人们会在缝上加贴纸条，这就是“门风纸”（문풍지）。缝太小看不见，但漏风处周围的纸上会结霜，紧挨着缝的地方最浓。点击霜最浓的格子（或用方向键和空格）贴上纸条，如果缝就在下面，风就挡住了。有漏风处开着时屋里的暖意会下降，暖意或纸用完就失败。两个漏风处靠得近时霜会叠在一起让人分不清，后面的关卡里风还会吹出新的缝。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", goal: "{0} courants d'air", paper: "{0} bandes de papier", start: "Touchez là où le givre est le plus épais pour coller une bande !", win: "La pièce est de nouveau chaude !", cold: "La pièce s'est refroidie", out: "Plus de papier", result: "Chaleur {0} % · {1} bandes perdues",
    again: "Réessayer", next: "Niveau suivant", sealed: "Courant d'air bloqué !", wasted: "Pas ici", gust: "Fiou ! Un nouveau courant d'air",
    help: "Une porte de hanok est un treillis de bois tendu de papier hanji ; en hiver, l'air froid passe par la moindre fente. On colle alors des bandes de papier sur les jointures : le mungpungji. Les fentes sont trop fines pour être vues, mais le givre se forme sur le papier autour d'un courant d'air, plus épais tout près. Touchez la case la plus givrée (ou flèches et Espace) pour y coller une bande ; si la fente est dessous, l'air est bloqué. Tant que des fentes sont ouvertes, la pièce perd sa chaleur : à court de chaleur ou de papier, c'est perdu. Deux fentes proches brouillent leur givre, et plus tard des rafales ouvrent de nouvelles fentes.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", goal: "{0} corrientes", paper: "{0} tiras de papel", start: "¡Toca donde la escarcha es más espesa para pegar una tira!", win: "¡La habitación vuelve a estar caliente!", cold: "La habitación se enfrió", out: "Se acabó el papel", result: "Calor {0} % · {1} tiras perdidas",
    again: "Reintentar", next: "Siguiente nivel", sealed: "¡Corriente detenida!", wasted: "Aquí no era", gust: "¡Fiu! Una corriente nueva",
    help: "La puerta de un hanok es un enrejado de madera cubierto de papel hanji, y en invierno el aire frío se cuela por cada rendija. Por eso se pegan tiras de papel sobre las juntas: el mungpungji. Las rendijas son demasiado finas para verlas, pero la escarcha se forma en el papel alrededor de una corriente, más espesa justo al lado. Toca la casilla más escarchada (o usa flechas y Espacio) para pegar una tira; si la rendija está debajo, la corriente se detiene. Mientras haya rendijas abiertas la habitación pierde calor: si se acaba el calor o el papel, pierdes. Dos rendijas cercanas mezclan su escarcha, y más adelante las ráfagas abren rendijas nuevas.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:mungpungji-seal:muted";
const W = 360;
const H = 560;
const GX = 30;
const GY = 70;
const CW = 50;
const CH = 52;

const CANDLE: PixelArt = { palette: { f: "#ffd43b", o: "#ff922b", w: "#f8f9fa", b: "#ced4da" }, rows: ["..f..", ".fof.", ".fof.", "..o..", ".www.", ".www.", ".www.", ".bbb."] };

interface Pop { text: string; t: number; color: string; x: number; y: number }

export default function MungpungjiSeal({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; warmth: number; wasted: number; fail: Room["fail"] }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rRef = useRef<Room>(newRoom(MUNG_STAGES[0]));
  const started = useRef(false);
  const input = useRef<number[]>([]); // cells tapped since the last frame
  const cursor = useRef({ cell: 21, shown: false });
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = MUNG_STAGES[stage];

  useRunRecord(MUNGPUNGJI_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    rRef.current = newRoom(MUNG_STAGES[s]);
    started.current = false;
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(MUNGPUNGJI_SLUG, STAGE_COUNT);
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
      if (rRef.current.over) return;
      const cur = cursor.current;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (moves[ev.key]) {
        ev.preventDefault();
        const col = Math.max(0, Math.min(COLS - 1, (cur.cell % COLS) + moves[ev.key][0]));
        const row = Math.max(0, Math.min(ROWS - 1, Math.floor(cur.cell / COLS) + moves[ev.key][1]));
        cur.cell = row * COLS + col;
        cur.shown = true;
        setTouched(true);
      } else if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        input.current.push(cur.cell);
        cur.shown = true;
        setTouched(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let flicker = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      flicker += dt;
      const r = rRef.current;
      const cp = copyRef.current;
      // taps are read once per frame
      for (const cell of input.current.splice(0)) {
        started.current = true;
        const res = paste(r, cell);
        const x = GX + (cell % COLS) * CW + CW / 2;
        const y = GY + Math.floor(cell / COLS) * CH + CH / 2;
        if (res === "sealed") {
          pops.current.push({ text: cp.sealed, t: 0.9, color: "#2f9e44", x, y: y - 24 });
          spawnBurst(parts.current, x, y, ["#fff3bf", "#ffffff"], 10, 70, Math.floor(r.t * 1000) + cell);
          sfx("success");
        } else if (res === "wasted") {
          pops.current.push({ text: cp.wasted, t: 0.7, color: "#868e96", x, y: y - 24 });
          sfx("fail");
        }
        if (r.over) {
          setOver({ won: r.won, stars: starsFor(r), warmth: Math.round(r.warmth), wasted: r.wasted, fail: r.fail });
          if (r.won) {
            setCleared(markStageCleared(MUNGPUNGJI_SLUG, r.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      if (started.current && !r.over) {
        const ev = stepRoom(r, dt);
        if (ev.opened.length) {
          pops.current.push({ text: cp.gust, t: 1.1, color: "#1971c2", x: W / 2, y: GY - 14 });
          sfx("tap");
        }
        if (ev.end) {
          setOver({ won: r.won, stars: starsFor(r), warmth: Math.round(r.warmth), wasted: r.wasted, fail: r.fail });
          if (r.won) {
            setCleared(markStageCleared(MUNGPUNGJI_SLUG, r.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 60);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a warm ondol room seen from inside, the paper door filling the wall
        ctx.fillStyle = "#5c3d2e";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#3d2b1f";
        ctx.fillRect(GX - 12, GY - 12, COLS * CW + 24, ROWS * CH + 24);
        for (let i = 0; i < COLS * ROWS; i++) {
          const x = GX + (i % COLS) * CW;
          const y = GY + Math.floor(i / COLS) * CH;
          ctx.fillStyle = "#f8f1e0";
          ctx.fillRect(x + 3, y + 3, CW - 6, CH - 6);
          // the frost as the eye sees it: a few shades of white-blue
          const s = shade(r, i);
          if (s > 0) {
            ctx.fillStyle = `rgba(165,216,255,${(0.15 + 0.75 * (s / r.stage.shades)).toFixed(2)})`;
            ctx.fillRect(x + 3, y + 3, CW - 6, CH - 6);
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            for (let k = 0; k < s * 2; k++) ctx.fillRect(x + 6 + ((k * 13 + i * 7) % (CW - 14)), y + 6 + ((k * 23 + i * 5) % (CH - 14)), 3, 3);
          }
          if (r.patched.has(i)) {
            ctx.fillStyle = "rgba(233,196,106,0.85)";
            ctx.fillRect(x + 6, y + CH / 2 - 8, CW - 12, 16);
            ctx.fillStyle = "rgba(184,137,58,0.8)";
            ctx.fillRect(x + 6, y + CH / 2 - 8, CW - 12, 2);
          }
        }
        // the lattice
        ctx.fillStyle = "#6b4423";
        for (let col = 0; col <= COLS; col++) ctx.fillRect(GX + col * CW - 3, GY, 6, ROWS * CH);
        for (let row = 0; row <= ROWS; row++) ctx.fillRect(GX, GY + row * CH - 3, COLS * CW, 6);
        if (cursor.current.shown && !r.over) {
          const cc = cursor.current.cell;
          ctx.strokeStyle = "#fab005";
          ctx.lineWidth = 3;
          ctx.strokeRect(GX + (cc % COLS) * CW + 2, GY + Math.floor(cc / COLS) * CH + 2, CW - 4, CH - 4);
        }
        // the candle and the room's warmth
        const lean = Math.sin(flicker * 7) * (r.warmth < 40 ? 3 : 1);
        drawSprite(ctx, CANDLE, 40 + lean, H - 32, { scale: 4 });
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(70, H - 40, W - 90, 12);
        ctx.fillStyle = r.warmth > 50 ? "#ff922b" : r.warmth > 25 ? "#fab005" : "#4dabf7";
        ctx.fillRect(70, H - 40, (W - 90) * (r.warmth / WARMTH), 12);
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#fff4e6";
        ctx.fillText(fill(cp.paper, r.paperLeft), 12, 26);
        ctx.textAlign = "right";
        ctx.fillText(`${Math.round(r.warmth)}%`, W - 12, 26);
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

  const headline = (o: NonNullable<typeof over>) => (o.won ? c.win : o.fail === "paper" ? c.out : c.cold);

  return (
    <div
      ref={containerRef}
      data-game="mungpungji-seal"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, st.drafts.length)}</Badge>
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
            if (rRef.current.over) return;
            const rect = ev.currentTarget.getBoundingClientRect();
            const x = ((ev.clientX - rect.left) * W) / rect.width;
            const y = ((ev.clientY - rect.top) * H) / rect.height;
            const col = Math.floor((x - GX) / CW);
            const row = Math.floor((y - GY) / CH);
            setTouched(true);
            if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
              cursor.current = { cell: row * COLS + col, shown: false };
              input.current.push(row * COLS + col);
            } else started.current = true;
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
            <p className="text-lg font-bold">{headline(over)}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.warmth, over.wasted)}</p>
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
