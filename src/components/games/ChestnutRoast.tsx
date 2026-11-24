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
import { BAG, BURN, CHESTNUT_SLUG, CHESTNUT_STAGES, GOLD_LO, PAN, STAGE_COUNT, dragTo, drop, golden, grab, newStall, starsFor, stepStall, type Stall } from "../../lib/games/chestnut-roast";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; sold: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; sale: string; rawBack: string; burnt: string; bag: string;
}> = {
  ko: {
    stage: "{0}단계", sold: "판 군밤 {0}/{1}", start: "밤을 끌어 가운데로 옮기고, 노릇해지면 봉투에 담아요!", win: "군밤 장사 대성공!", lose: "군밤을 너무 많이 태웠어요", result: "판 군밤 {0} · 탄 밤 {1} · 날밤 {2}",
    again: "다시 굽기", next: "다음 단계", sale: "군밤이요!", rawBack: "덜 익었대요", burnt: "탔어요!", bag: "봉투",
    help: "겨울 길거리 군밤 장수가 되어 봐요. 날밤이 숯불 위 철판 가장자리로 굴러 들어와요. 철판은 가운데가 가장 뜨겁고 가장자리가 덜 뜨거워요. 밤을 끌어 가운데로 옮기면 빨리 익고, 가장자리로 옮기면 천천히 익어요. 밤이 노릇하게 빛나면 봉투로 끌어다 팔아요. 그대로 두면 타 버리고, 덜 익은 밤을 봉투에 넣으면 손님이 돌려줘서 버려요. 여러 개가 한꺼번에 익으니 익는 때를 엇갈리게 하는 게 요령이에요. 정해진 수만큼 팔면 통과예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", sold: "Sold {0}/{1}", start: "Drag chestnuts to the middle, then into the bag when golden!", win: "A roaring trade!", lose: "Too many burnt", result: "{0} sold · {1} burnt · {2} raw",
    again: "Roast again", next: "Next stage", sale: "Hot chestnuts!", rawBack: "Not done yet", burnt: "Burnt!", bag: "Bag",
    help: "Run a winter street stall roasting chestnuts. Raw chestnuts roll onto the rim of an iron pan over the coals. The middle of the pan is hottest and the rim coolest: drag a chestnut into the middle to roast it fast, out toward the rim to slow it down. When one glows golden, drag it into the paper bag to sell it. Leave it and it burns; bag a raw one and the customer hands it back, wasted. Several roast at once, so the trick is to stagger them. Sell the stage's count to clear it.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", sold: "売れた焼き栗 {0}/{1}", start: "栗を真ん中へドラッグして、こんがりしたら袋へ！", win: "焼き栗屋、大繁盛！", lose: "焦がしすぎた", result: "売れた {0} · 焦げた {1} · 生 {2}",
    again: "もう一度", next: "次の面", sale: "焼き栗だよ！", rawBack: "まだ生だって", burnt: "焦げた！", bag: "袋",
    help: "冬の屋台の焼き栗屋になろう。生の栗が炭火にかけた鉄板のふちに転がってきます。鉄板は真ん中が一番熱く、ふちはそれほど熱くありません。栗を真ん中へドラッグすると早く焼け、ふちへ動かすとゆっくり焼けます。こんがり光ったら紙袋へドラッグして売りましょう。放っておくと焦げ、生の栗を袋に入れるとお客さんに返されて無駄になります。いくつも同時に焼けるので、焼き上がりをずらすのがこつ。決められた数を売ればクリア。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", sold: "卖出 {0}/{1}", start: "把栗子拖到中间，变金黄就拖进纸袋！", win: "生意兴隆！", lose: "烤焦太多了", result: "卖出 {0} · 烤焦 {1} · 生的 {2}",
    again: "再烤一次", next: "下一关", sale: "糖炒栗子！", rawBack: "还没熟呢", burnt: "焦了！", bag: "纸袋",
    help: "当一回冬天街头的烤栗子摊主。生栗子会滚到炭火上铁锅的边缘。锅中间最热，边缘没那么热：把栗子拖到中间烤得快，拖到边缘就慢下来。栗子烤得金黄发亮时，拖进纸袋卖掉。放着不管会烤焦；把生栗子装袋，客人会退回来，就浪费了。好几个栗子同时在烤，诀窍是让它们熟的时间错开。卖够规定数量就过关。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", sold: "Vendus {0}/{1}", start: "Glissez les châtaignes au centre, puis dans le sac quand elles sont dorées !", win: "Les affaires marchent !", lose: "Trop de châtaignes brûlées", result: "{0} vendues · {1} brûlées · {2} crues",
    again: "Griller à nouveau", next: "Niveau suivant", sale: "Chaud les marrons !", rawBack: "Pas encore cuite", burnt: "Brûlée !", bag: "Sac",
    help: "Tenez un étal de marrons chauds en plein hiver. Les châtaignes crues roulent au bord d'une poêle en fonte sur les braises. Le centre est le plus chaud, le bord le moins : glissez une châtaigne au centre pour la griller vite, vers le bord pour la ralentir. Quand l'une brille, dorée, glissez-la dans le sac en papier pour la vendre. Laissée là, elle brûle ; crue dans le sac, le client la rend et elle est perdue. Plusieurs grillent à la fois : l'astuce est de les décaler. Vendez le nombre demandé.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", sold: "Vendidas {0}/{1}", start: "¡Arrastra las castañas al centro y luego a la bolsa cuando estén doradas!", win: "¡Negocio redondo!", lose: "Se quemaron demasiadas", result: "{0} vendidas · {1} quemadas · {2} crudas",
    again: "Asar otra vez", next: "Siguiente nivel", sale: "¡Castañas calentitas!", rawBack: "Aún está cruda", burnt: "¡Quemada!", bag: "Bolsa",
    help: "Lleva un puesto de castañas asadas en pleno invierno. Las castañas crudas ruedan al borde de una sartén de hierro sobre las brasas. El centro es lo más caliente y el borde lo menos: arrastra una castaña al centro para asarla rápido, hacia el borde para frenarla. Cuando brille dorada, arrástrala a la bolsa de papel para venderla. Si la dejas, se quema; si metes una cruda, el cliente la devuelve y se pierde. Varias se asan a la vez: el truco es escalonarlas. Vende las del nivel para pasarlo.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:chestnut-roast:muted";
const W = 360;
const H = 560;

const NUT_RAW: PixelArt = { palette: { b: "#a0632f", d: "#6b4423", l: "#d9a066" }, rows: ["..d..", ".bbb.", "bblbb", "bbbbb", ".bbb."] };
const NUT_GOLD: PixelArt = { palette: { b: "#e8590c", d: "#5c3d2e", l: "#ffd43b" }, rows: ["..d..", ".blb.", "bllbb", "bbbbb", ".bbb."] };
const NUT_BURNT: PixelArt = { palette: { b: "#343a40", d: "#212529", l: "#495057" }, rows: ["..d..", ".bbb.", "bblbb", "bbbbb", ".bbb."] };

interface Pop { text: string; t: number; color: string; x: number; y: number }

export default function ChestnutRoast({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; gold: number; burnt: number; raw: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sRef = useRef<Stall>(newStall(CHESTNUT_STAGES[0]));
  const started = useRef(false);
  const input = useRef<Array<{ kind: "down" | "move"; x: number; y: number } | { kind: "up" }>>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = CHESTNUT_STAGES[stage];

  useRunRecord(CHESTNUT_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    sRef.current = newStall(CHESTNUT_STAGES[s]);
    started.current = false;
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(CHESTNUT_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let glow = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      glow += dt;
      const s = sRef.current;
      const cp = copyRef.current;
      // the finger is read once per frame
      for (const e of input.current.splice(0)) {
        started.current = true;
        if (e.kind === "down") grab(s, e.x, e.y);
        else if (e.kind === "move") dragTo(s, e.x, e.y);
        else {
          const i = s.held;
          const res = drop(s);
          if (i >= 0 && res === "sold") {
            pops.current.push({ text: cp.sale, t: 0.9, color: "#2f9e44", x: BAG.x, y: BAG.y - 60 });
            spawnBurst(parts.current, BAG.x, BAG.y - 20, ["#ffd43b", "#ff922b"], 12, 90, Math.floor(s.t * 1000));
            sfx("success");
          } else if (i >= 0 && res === "raw") {
            pops.current.push({ text: cp.rawBack, t: 0.9, color: "#e8590c", x: BAG.x, y: BAG.y - 60 });
            sfx("fail");
          }
        }
      }
      if (started.current && !s.over) {
        const ev = stepStall(s, dt);
        for (const i of ev.burnt) {
          pops.current.push({ text: cp.burnt, t: 0.9, color: "#e03131", x: s.x[i], y: s.y[i] - 20 });
          spawnBurst(parts.current, s.x[i], s.y[i], ["#495057", "#212529"], 14, 80, Math.floor(s.t * 1000));
          sfx("fail");
        }
        if (ev.end) {
          setOver({ won: s.won, stars: starsFor(s), gold: s.gold, burnt: s.burnt, raw: s.raw });
          if (s.won) {
            setCleared(markStageCleared(CHESTNUT_SLUG, s.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, -40);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a night street: the brazier glowing under an iron pan, and the paper bag
        ctx.fillStyle = "#1b1b2f";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#3b2a20";
        ctx.fillRect(0, 410, W, H - 410);
        const g = ctx.createRadialGradient(PAN.x, PAN.y, 10, PAN.x, PAN.y, PAN.r);
        g.addColorStop(0, "#5c3d2e");
        g.addColorStop(0.6, "#3d2b22");
        g.addColorStop(1, "#212529");
        ctx.fillStyle = "#e8590c";
        ctx.beginPath();
        ctx.arc(PAN.x, PAN.y, PAN.r + 10 + Math.sin(glow * 6) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(PAN.x, PAN.y, PAN.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,146,43,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(PAN.x, PAN.y, 60, 0, Math.PI * 2);
        ctx.stroke();
        // the bag
        ctx.fillStyle = "#e9c46a";
        ctx.fillRect(BAG.x - 40, BAG.y - 38, 80, 80);
        ctx.fillStyle = "#b8893a";
        ctx.fillRect(BAG.x - 40, BAG.y - 38, 80, 8);
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#5c3d2e";
        ctx.fillText(cp.bag, BAG.x, BAG.y + 10);
        // the chestnuts: raw, golden (glowing), or dark as they near burning
        for (let i = 0; i < s.d.length; i++) {
          if (s.state[i] !== "pan") continue;
          const gold = golden(s, i);
          const near = s.d[i] > s.stage.goldHi;
          if (gold) {
            ctx.fillStyle = `rgba(255,212,59,${0.35 + 0.25 * Math.sin(glow * 8)})`;
            ctx.beginPath();
            ctx.arc(s.x[i], s.y[i], 20, 0, Math.PI * 2);
            ctx.fill();
          }
          drawSprite(ctx, near ? NUT_BURNT : gold ? NUT_GOLD : NUT_RAW, s.x[i], s.y[i], { scale: 5, alpha: near ? 0.9 : 1 });
          // a small doneness bar under each
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(s.x[i] - 14, s.y[i] + 16, 28, 4);
          ctx.fillStyle = near ? "#e03131" : gold ? "#40c057" : "#fab005";
          ctx.fillRect(s.x[i] - 14, s.y[i] + 16, 28 * Math.min(1, s.d[i] / BURN), 4);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(s.x[i] - 14 + 28 * (GOLD_LO / BURN), s.y[i] + 14, 1, 8);
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(fill(cp.sold, s.gold, s.stage.need), 12, 30);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 16px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillRect(x - tw / 2, pp.y - 20, tw, 26);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, x, pp.y - 2);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="chestnut-roast"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.sold, st.need, st.arrivals.length)}</Badge>
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
          onPointerDown={(e) => {
            if (sRef.current.over) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setTouched(true);
            input.current.push({ kind: "down", ...toCanvas(e) });
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0 && e.pointerType === "mouse") return;
            input.current.push({ kind: "move", ...toCanvas(e) });
          }}
          onPointerUp={() => input.current.push({ kind: "up" })}
          onPointerCancel={() => input.current.push({ kind: "up" })}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/4 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.gold, over.burnt, over.raw)}</p>
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
