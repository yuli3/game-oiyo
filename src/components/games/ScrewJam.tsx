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
import { BOX_SIZE, SCREW_SLUG, SCREW_STAGES, STAGE_COUNT, blocked, newBench, starsFor, unscrew, type Bench } from "../../lib/games/screw-jam";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; tray: string; left: string; start: string; stuck: string; win: string; lose: string; result: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", tray: "보관함 {0}/{1}", left: "남은 나사 {0}", start: "위를 덮은 판이 없는 나사를 눌러 빼요!", stuck: "위에 판이 덮여 있어요", win: "나사를 다 뺐어요!", lose: "보관함이 꽉 찼어요", result: "보관함을 가장 많이 쓴 때 {0}칸",
    again: "다시 하기", next: "다음 단계",
    help: "나무판이 겹겹이 나사로 박혀 있어요. 나사를 누르면 빠지는데, 위에 다른 판이 덮고 있으면 빠지지 않아요. 뺀 나사는 위쪽에 기다리는 같은 색 상자로 들어가고, 상자가 세 개로 꽉 차면 실려 나가고 다음 상자가 들어와요. 같은 색 상자가 없으면 아래 보관함에 들어가는데, 보관함이 넘치면 끝이에요. 판의 마지막 나사를 빼면 판이 떨어져 아래 나사가 드러나요. 판을 모두 비우면 통과이고, 보관함을 적게 쓸수록 별이 늘어요. 다음에 올 상자 색을 보며 순서를 정해요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", tray: "Tray {0}/{1}", left: "{0} screws left", start: "Tap a screw with no plate over it to take it out!", stuck: "A plate is over it", win: "Every screw is out!", lose: "The tray is full", result: "Most screws in the tray at once: {0}",
    again: "Try again", next: "Next stage",
    help: "Wooden plates are screwed down on top of one another. Tap a screw to take it out — unless another plate lies over it. Each screw goes into a waiting box of its colour at the top; a full box of three is carted off and the next one slides in. With no box of its colour waiting, a screw goes into the spare tray below, and when the tray overflows you're stuck. Take a plate's last screw out and it drops away, freeing the screws under it. Empty the board to clear the stage; the less you use the tray, the more stars. Watch which box colours come next to plan your order.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", tray: "置き場 {0}/{1}", left: "残りのネジ {0}", start: "上に板が重なっていないネジを押して抜こう！", stuck: "上に板が重なっている", win: "ネジを全部抜いた！", lose: "置き場がいっぱい", result: "置き場を一番使ったとき {0}個",
    again: "もう一度", next: "次の面",
    help: "木の板が何枚も重なってネジで留められています。ネジを押すと抜けますが、上に別の板が重なっていると抜けません。抜いたネジは上で待っている同じ色の箱に入り、3本で満杯になると運ばれて次の箱が来ます。同じ色の箱がないと下の置き場に入り、置き場があふれると終わり。板の最後のネジを抜くと板が落ちて、下のネジが現れます。盤面を空にすればクリア、置き場を使わないほど星が増えます。次に来る箱の色を見て順番を決めよう。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", tray: "暂存 {0}/{1}", left: "剩余螺丝 {0}", start: "点上面没有板子压着的螺丝把它拧出来！", stuck: "上面压着板子", win: "螺丝全拧出来了！", lose: "暂存区满了", result: "暂存区最多放了 {0} 个",
    again: "再来一次", next: "下一关",
    help: "木板一层层叠着用螺丝固定。点螺丝就能拧出来，但上面若压着别的板子就拧不动。拧下的螺丝会进入上方等待的同色盒子，盒子装满三颗就运走，下一个盒子补上。没有同色盒子时螺丝进下方暂存区，暂存区溢出就失败。拧下板子的最后一颗螺丝，板子会掉下，露出下面的螺丝。清空棋盘即过关，暂存区用得越少星越多。看着接下来的盒子颜色安排顺序吧。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", tray: "Plateau {0}/{1}", left: "{0} vis restantes", start: "Touchez une vis qu'aucune planche ne recouvre pour la retirer !", stuck: "Une planche la recouvre", win: "Toutes les vis sont sorties !", lose: "Le plateau est plein", result: "Au plus {0} vis sur le plateau",
    again: "Réessayer", next: "Niveau suivant",
    help: "Des planches sont vissées les unes sur les autres. Touchez une vis pour la retirer — sauf si une planche la recouvre. Chaque vis va dans une boîte de sa couleur qui attend en haut ; une boîte pleine (trois) part et la suivante arrive. Sans boîte de sa couleur, une vis va sur le plateau de secours en bas ; s'il déborde, c'est bloqué. Retirez la dernière vis d'une planche et elle tombe, libérant les vis dessous. Videz le plateau de jeu pour réussir ; moins vous utilisez le plateau de secours, plus d'étoiles. Regardez les couleurs des prochaines boîtes pour choisir l'ordre.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", tray: "Bandeja {0}/{1}", left: "Quedan {0} tornillos", start: "¡Toca un tornillo sin tabla encima para sacarlo!", stuck: "Tiene una tabla encima", win: "¡Todos los tornillos fuera!", lose: "La bandeja está llena", result: "Como mucho {0} tornillos en la bandeja",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Hay tablas de madera atornilladas unas sobre otras. Toca un tornillo para sacarlo, salvo que otra tabla lo tape. Cada tornillo va a una caja de su color que espera arriba; una caja llena (tres) se va y llega la siguiente. Si no hay caja de su color, el tornillo va a la bandeja de abajo, y si se desborda te quedas atascado. Saca el último tornillo de una tabla y cae, liberando los de debajo. Vacía el tablero para superar el nivel; cuanto menos uses la bandeja, más estrellas. Mira los colores de las próximas cajas para decidir el orden.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:screw-jam:muted";
const W = 360;
const H = 560;
const SCREW_COLOURS = ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#7048e8", "#0c8599", "#d6336c"];
const PLATE_COLOURS = ["#d9b38c", "#c9a27a", "#e0c097", "#b88a5c", "#d4a373", "#c19a6b"];

interface Pop { text: string; t: number; x: number; y: number }

export default function ScrewJam({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; most: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bRef = useRef<Bench>(newBench(SCREW_STAGES[0]));
  const input = useRef<number[]>([]);
  const shake = useRef(new Map<number, number>());
  const cursor = useRef(-1);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = SCREW_STAGES[stage];

  useRunRecord(SCREW_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    bRef.current = newBench(SCREW_STAGES[s]);
    input.current = [];
    shake.current = new Map();
    cursor.current = -1;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(SCREW_SLUG, STAGE_COUNT);
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
      const b = bRef.current;
      const s = b.stage;
      const cp = copyRef.current;
      // taps are read once per frame
      for (const i of input.current.splice(0)) {
        if (b.over) break;
        const fallenBefore = b.fallen.filter(Boolean).length;
        const r = unscrew(b, i);
        const sc = s.screws[i];
        if (r === "stuck") {
          shake.current.set(i, 0.35);
          pops.current = [{ text: cp.stuck, t: 0.8, x: sc.x, y: sc.y - 18 }];
          sfx("fail");
        } else if (r) {
          spawnBurst(parts.current, sc.x, sc.y, [SCREW_COLOURS[sc.colour], "#dee2e6"], 6, 70, 2);
          sfx(r === "boxed" ? "place" : "tap");
          if (b.fallen.filter(Boolean).length > fallenBefore) sfx("success");
        }
        if (b.over) {
          setOver({ won: b.won, stars: starsFor(b), most: b.most });
          if (b.won) {
            setCleared(markStageCleared(SCREW_SLUG, s.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, 280, ["#ffd43b", "#fff", "#e03131", "#1971c2"], 30, 150, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      for (const [k, v] of shake.current) {
        if (v - dt <= 0) shake.current.delete(k);
        else shake.current.set(k, v - dt);
      }
      stepParticles(parts.current, dt, 120);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#343a40";
        ctx.fillRect(0, 0, W, H);
        // the boxes waiting at the top, and the ones still to come
        b.active.forEach((box, k) => {
          const x = 30 + k * 160;
          ctx.fillStyle = "#495057";
          ctx.fillRect(x, 14, 140, 56);
          if (!box) return;
          ctx.fillStyle = SCREW_COLOURS[box.colour];
          ctx.fillRect(x + 4, 18, 132, 48);
          for (let j = 0; j < BOX_SIZE; j++) {
            ctx.fillStyle = j < box.filled ? "#f8f9fa" : "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.arc(x + 30 + j * 40, 42, 11, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        s.boxes.slice(b.nextBox, b.nextBox + 4).forEach((col, k) => {
          ctx.fillStyle = SCREW_COLOURS[col];
          ctx.fillRect(W / 2 - 46 + k * 24, 76, 18, 10);
        });
        // the plates, lowest first; fallen ones are gone
        s.plates.forEach((p, k) => {
          if (b.fallen[k]) return;
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(p.x + 4, p.y + 5, p.w, p.h);
          ctx.fillStyle = PLATE_COLOURS[k % PLATE_COLOURS.length];
          ctx.globalAlpha = 0.92;
          ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#7f5539";
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x, p.y, p.w, p.h);
          // the screws of this plate, drawn with it so the plates above cover them
          s.screws.forEach((sc, i) => {
            if (sc.plate !== k || b.out[i]) return;
            const jig = shake.current.has(i) ? Math.sin(now / 25) * 3 : 0;
            ctx.fillStyle = SCREW_COLOURS[sc.colour];
            ctx.beginPath();
            ctx.arc(sc.x + jig, sc.y, 10, 0, Math.PI * 2);
            ctx.fill();
            if (cursor.current === i) {
              ctx.strokeStyle = "#ffd43b";
              ctx.lineWidth = 3;
              ctx.strokeRect(sc.x - 14, sc.y - 14, 28, 28);
            }
            ctx.strokeStyle = blocked(b, i) ? "rgba(0,0,0,0.5)" : "#f8f9fa";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sc.x + jig - 5, sc.y);
            ctx.lineTo(sc.x + jig + 5, sc.y);
            ctx.moveTo(sc.x + jig, sc.y - 5);
            ctx.lineTo(sc.x + jig, sc.y + 5);
            ctx.stroke();
          });
        });
        // the spare tray
        ctx.fillStyle = "#212529";
        ctx.fillRect(20, 470, W - 40, 60);
        for (let k = 0; k < s.tray; k++) {
          const x = 20 + (k + 0.5) * ((W - 40) / s.tray);
          ctx.fillStyle = k < b.tray.length ? SCREW_COLOURS[b.tray[k]] : "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.arc(x, 500, 14, 0, Math.PI * 2);
          ctx.fill();
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 13px sans-serif";
        ctx.fillStyle = "#f8f9fa";
        ctx.fillText(fill(cp.tray, b.tray.length, s.tray), 22, 464);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.left, b.out.filter((o) => !o).length), W - 22, 464);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 13px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.94)";
          ctx.fillRect(x - tw / 2, pp.y - 15, tw, 20);
          ctx.fillStyle = "#e8590c";
          ctx.fillText(pp.text, x, pp.y);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = bRef.current;
    if (b.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    // the topmost screw under the finger: a free one first, else the one on the highest plate
    let best = -1;
    let bestLayer = -1;
    b.stage.screws.forEach((sc, i) => {
      if (b.out[i] || Math.hypot(sc.x - x, sc.y - y) > 18) return;
      const layer = b.stage.plates[sc.plate].layer + (blocked(b, i) ? 0 : 100);
      if (layer > bestLayer) {
        best = i;
        bestLayer = layer;
      }
    });
    if (best >= 0) input.current.push(best);
  };

  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const b = bRef.current;
    if (b.over) return;
    const left = b.stage.screws.map((_, i) => i).filter((i) => !b.out[i]);
    if (!left.length) return;
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      const at = left.indexOf(cursor.current);
      cursor.current = left[(at + step + left.length) % left.length];
      setTouched(true);
    } else if ((e.key === "Enter" || e.key === " ") && left.includes(cursor.current)) {
      e.preventDefault();
      input.current.push(cursor.current);
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
      data-game="screw-jam"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.left, st.screws.length)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-24 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.most)}</p>
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
