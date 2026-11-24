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
import { SCARF_SLUG, SCARF_STAGES, STAGE_COUNT, forward, newKnitting, starsFor, stepKnitting, type Knitting } from "../../lib/games/scarf-knit";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; good: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; red: string; cream: string; row: string;
}> = {
  ko: {
    stage: "{0}단계", goal: "목표 {0}코", good: "맞은 코 {0}/{1}", start: "누르고 있으면 빨간 실, 떼면 흰 실! 도안 색이 바뀌는 곳에서 바꿔요", win: "목도리 완성! 설 선물로 딱이에요", lose: "도안과 다른 코가 많아요", result: "맞은 코 {0}/{1}",
    again: "다시 뜨기", next: "다음 단계", red: "빨간 실", cream: "흰 실", row: "{0}/{1}단",
    help: "할머니의 두 색 도안대로 목도리를 떠요. 바늘은 한 단을 한 코씩 지나가고, 다음 단에서는 반대로 돌아와요(평뜨기처럼요). 누르고 있으면(스페이스도 돼요) 빨간 실로, 떼면 흰 실로 떠요. 바늘이 코의 가운데를 지날 때 잡고 있던 실 색으로 그 코가 떠져요. 위의 도안이 색을 바꾸는 바로 그곳에서 실을 바꿔야 해요. 단이 넓어지고 바늘이 빨라지며 무늬가 잘아져요. 도안대로 뜬 코가 목표만큼 모이면 통과예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", goal: "Goal {0}", good: "True stitches {0}/{1}", start: "Hold for red yarn, let go for cream! Change where the chart changes", win: "The scarf is done — perfect for Seollal!", lose: "Too many stitches off the chart", result: "True stitches {0}/{1}",
    again: "Knit again", next: "Next stage", red: "Red", cream: "Cream", row: "Row {0}/{1}",
    help: "Knit a scarf from Grandma's two-colour chart. The needle runs along a row one stitch at a time, then back along the next, the way flat knitting goes. Hold (or press Space) to knit with red yarn; let go for cream. Each stitch takes whichever yarn you hold as the needle passes its middle. Change yarn right where the chart above changes colour. Rows grow wider, the needle quicker and the motifs finer. Knit enough stitches true to the chart to finish the scarf.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", goal: "目標 {0}目", good: "合った目 {0}/{1}", start: "押すと赤い毛糸、離すと白い毛糸！図案の色が変わる所で替えよう", win: "マフラー完成！お正月の贈り物にぴったり", lose: "図案と違う目が多い", result: "合った目 {0}/{1}",
    again: "もう一度", next: "次の面", red: "赤", cream: "白", row: "{0}/{1}段",
    help: "おばあちゃんの2色の図案どおりにマフラーを編みます。針は1段を1目ずつ進み、次の段では逆向きに戻ります（平編みのように）。押している間（スペースでも可）は赤い毛糸、離すと白い毛糸で編みます。針が目の真ん中を通るときに持っている色でその目が編まれます。上の図案が色を変えるちょうどその場所で毛糸を替えましょう。段は広く、針は速く、模様は細かくなります。図案どおりの目が目標に届けばクリア。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", goal: "目标 {0}针", good: "对的针 {0}/{1}", start: "按住用红线，松开用白线！在图样变色处换线", win: "围巾织好了！正好当新年礼物", lose: "和图样不一样的针太多了", result: "对的针 {0}/{1}",
    again: "再织一次", next: "下一关", red: "红线", cream: "白线", row: "第{0}/{1}行",
    help: "照着奶奶的双色图样织围巾。织针一针一针走过一行，下一行再反着走回来（就像平针织法）。按住（或按空格）用红线织，松开用白线织。织针经过某一针中间时手里是什么颜色的线，那一针就是什么颜色。要在上方图样变色的地方正好换线。行越来越宽，织针越来越快，花纹越来越细。按图样织对的针达到目标即过关。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", goal: "Objectif {0}", good: "Mailles justes {0}/{1}", start: "Maintenez pour la laine rouge, relâchez pour la crème ! Changez là où la grille change", win: "L'écharpe est finie, parfaite pour Seollal !", lose: "Trop de mailles hors de la grille", result: "Mailles justes {0}/{1}",
    again: "Retricoter", next: "Niveau suivant", red: "Rouge", cream: "Crème", row: "Rang {0}/{1}",
    help: "Tricotez une écharpe d'après la grille bicolore de Grand-mère. L'aiguille parcourt un rang maille par maille, puis revient dans l'autre sens au rang suivant, comme en tricot à plat. Maintenez (ou Espace) pour la laine rouge, relâchez pour la crème. Chaque maille prend la laine que vous tenez quand l'aiguille passe en son milieu. Changez de laine exactement là où la grille change de couleur. Les rangs s'élargissent, l'aiguille accélère et les motifs s'affinent. Tricotez assez de mailles fidèles à la grille pour finir l'écharpe.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", goal: "Meta {0}", good: "Puntos fieles {0}/{1}", start: "¡Mantén para lana roja, suelta para crema! Cambia donde cambia el patrón", win: "¡Bufanda terminada, perfecta para Seollal!", lose: "Demasiados puntos fuera del patrón", result: "Puntos fieles {0}/{1}",
    again: "Tejer otra vez", next: "Siguiente nivel", red: "Roja", cream: "Crema", row: "Fila {0}/{1}",
    help: "Teje una bufanda con el patrón de dos colores de la abuela. La aguja recorre una fila punto a punto y vuelve en sentido contrario en la siguiente, como al tejer en plano. Mantén pulsado (o Espacio) para tejer con lana roja; suelta para la crema. Cada punto toma la lana que sostienes cuando la aguja pasa por su centro. Cambia de lana justo donde el patrón de arriba cambia de color. Las filas se ensanchan, la aguja se acelera y los motivos se afinan. Teje suficientes puntos fieles al patrón para terminar la bufanda.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:scarf-knit:muted";
const W = 360;
const H = 560;
const RED = "#c92a2a";
const CREAM = "#f8f1e0";

const NEEDLE: PixelArt = { palette: { s: "#adb5bd", d: "#495057", k: "#e9c46a" }, rows: ["k", "s", "s", "s", "s", "s", "d"] };
const BALL_R: PixelArt = { palette: { r: "#c92a2a", d: "#8b1a1a" }, rows: [".rr.", "rdrr", "rrdr", ".rr."] };
const BALL_C: PixelArt = { palette: { r: "#f8f1e0", d: "#d6ccb4" }, rows: [".rr.", "rdrr", "rrdr", ".rr."] };

interface Pop { text: string; t: number; color: string; x: number; y: number }

export default function ScarfKnit({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; good: number; total: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const kRef = useRef<Knitting>(newKnitting(SCARF_STAGES[0]));
  const started = useRef(false);
  const hold = useRef({ pointer: false, key: false });
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = SCARF_STAGES[stage];

  useRunRecord(SCARF_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    kRef.current = newKnitting(SCARF_STAGES[s]);
    started.current = false;
    hold.current = { pointer: false, key: false };
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(SCARF_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if (ev.key !== " " || kRef.current.over) return;
      ev.preventDefault();
      hold.current.key = true;
      started.current = true;
      setTouched(true);
    };
    const up = (ev: KeyboardEvent) => {
      if (ev.key === " ") hold.current.key = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const k = kRef.current;
      const cp = copyRef.current;
      const s = k.stage;
      // the yarn held is read once per frame
      const red = hold.current.pointer || hold.current.key;
      const w = s.rows[0].length;
      const cell = Math.min(18, Math.floor(340 / w));
      const rx = (W - cell * w) / 2;
      const ry = 380;
      if (started.current && !k.over) {
        const ev = stepKnitting(k, red, dt);
        for (const e of ev.stitched) {
          if (!e.good) spawnBurst(parts.current, rx + e.col * cell + cell / 2, ry + cell / 2, ["#868e96"], 4, 40, Math.floor(k.t * 1000) + e.col);
        }
        if (ev.rowDone && !ev.end) sfx("place");
        if (ev.end) {
          setOver({ won: k.won, stars: starsFor(k), good: k.good, total: s.total });
          if (k.won) {
            setCleared(markStageCleared(SCARF_SLUG, s.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 120);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a warm room, the chart pinned up top, the scarf so far, and the row on the needle
        ctx.fillStyle = "#5c3d2e";
        ctx.fillRect(0, 0, W, H);
        const cc = Math.min(14, Math.floor(300 / w));
        const cx = (W - cc * w) / 2;
        const cy = 64;
        ctx.fillStyle = "#f4e3c1";
        ctx.fillRect(cx - 8, cy - 8, cc * w + 16, cc * s.rows.length + 16);
        s.rows.forEach((row, r) => {
          row.forEach((v, col) => {
            const made = k.made[r][col];
            const knitted = made !== undefined && made >= 0;
            ctx.fillStyle = v === 1 ? RED : CREAM;
            ctx.globalAlpha = knitted ? 1 : r === k.row ? 0.95 : 0.55;
            ctx.fillRect(cx + col * cc + 1, cy + r * cc + 1, cc - 2, cc - 2);
            if (knitted && made !== v) {
              ctx.globalAlpha = 1;
              ctx.fillStyle = "#212529";
              ctx.fillRect(cx + col * cc + cc / 2 - 2, cy + r * cc + cc / 2 - 2, 4, 4);
            }
          });
          ctx.globalAlpha = 1;
          if (r === k.row && !k.over) {
            ctx.strokeStyle = "#fab005";
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - 3, cy + r * cc - 1, cc * w + 6, cc + 2);
          }
        });
        // the row on the needle: the chart for it above, what's knitted below
        if (!k.over) {
          const row = s.rows[k.row];
          for (let col = 0; col < w; col++) {
            ctx.fillStyle = row[col] === 1 ? RED : CREAM;
            ctx.fillRect(rx + col * cell + 1, ry - cell - 8, cell - 2, cell - 2);
            const made = k.made[k.row][col];
            ctx.fillStyle = made === undefined || made < 0 ? "rgba(255,255,255,0.12)" : made === 1 ? RED : CREAM;
            ctx.fillRect(rx + col * cell + 1, ry + 1, cell - 2, cell * 1.4);
            if (made !== undefined && made >= 0 && made !== row[col]) {
              ctx.fillStyle = "#212529";
              ctx.fillRect(rx + col * cell + cell / 2 - 2, ry + cell * 0.7 - 2, 4, 4);
            }
          }
          // the needle: where along the row it is now (it waits at the edge while turning)
          const pos = Math.max(0, Math.min(w, k.t * s.speed));
          const nx = forward(k.row) ? rx + pos * cell : rx + (w - pos) * cell;
          drawSprite(ctx, NEEDLE, nx, ry + cell * 0.7, { scale: 4 });
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(forward(k.row) ? "→" : "←", W / 2, ry + cell * 2.3);
        }
        // the yarn in hand
        drawSprite(ctx, red ? BALL_R : BALL_C, W / 2, H - 50, { scale: 10 });
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff4e6";
        ctx.fillText(red ? cp.red : cp.cream, W / 2, H - 12);
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(fill(cp.good, k.good, s.need), 12, 26);
        ctx.textAlign = "right";
        ctx.font = "14px sans-serif";
        ctx.fillText(fill(cp.row, Math.min(k.row + 1, s.rows.length), s.rows.length), W - 12, 26);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 15px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillRect(pp.x - tw / 2, pp.y - 18, tw, 24);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, pp.x, pp.y - 1);
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
      data-game="scarf-knit"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, st.need)}</Badge>
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
            if (kRef.current.over) return;
            ev.currentTarget.setPointerCapture(ev.pointerId);
            hold.current.pointer = true;
            started.current = true;
            setTouched(true);
          }}
          onPointerUp={() => {
            hold.current.pointer = false;
          }}
          onPointerCancel={() => {
            hold.current.pointer = false;
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.good, over.total)}</p>
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
