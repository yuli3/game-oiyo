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
import { FLIGHT, STAGE_COUNT, YEONTAN_SLUG, YEONTAN_STAGES, newAlley, pass, starsFor, stepAlley, type Alley } from "../../lib/games/yeontan-relay";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; shed: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; slip: string; drop: string; truck: string;
}> = {
  ko: {
    stage: "{0}단계", goal: "목표 {0}장", shed: "광 {0}/{1}", start: "초록불인 사람을 탭해 위로 넘겨요!", win: "연탄 광이 가득 찼어요!", lose: "트럭이 떠났어요", result: "나른 연탄 {0} · 깨진 연탄 {1}",
    again: "다시 하기", next: "다음 단계", slip: "앗, 미끄러졌어요!", drop: "팔이 아파 놓쳤어요", truck: "남은 시간 {0}초",
    help: "겨울이 오면 언덕 동네 좁은 계단에 봉사자들이 줄지어 서서, 트럭에서 내린 연탄을 손에서 손으로 넘겨 연탄을 때는 집 광까지 올려요. 여러분은 줄을 이끌어요. 사람을 탭(또는 숫자 키, 맨 아래가 1)하면 그 사람이 든 연탄을 바로 위 사람에게 넘겨요. 연탄을 받은 사람은 잠깐 자세를 잡아야 해요(머리 위 불이 초록으로 바뀌어요). 빨간불일 때 넘기면 미끄러져 깨져요. 넘긴 뒤에도 잠깐 있어야 다시 받을 수 있고, 위 사람 손이 차 있으면 넘길 수 없어요. 너무 오래 들고 있으면 팔이 아파 놓쳐요. 자세 잡는 시간은 매번 조금씩 달라요. 트럭이 떠나기 전에 광을 채우면 통과예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", goal: "Goal {0}", shed: "Shed {0}/{1}", start: "Tap someone with a green light to pass it up!", win: "The coal shed is full!", lose: "The truck had to leave", result: "{0} carried · {1} broken",
    again: "Try again", next: "Next stage", slip: "Oops, it slipped!", drop: "Arms gave out", truck: "{0}s left",
    help: "When winter comes, volunteers line the narrow stairs of hillside neighbourhoods and pass yeontan (coal briquettes) hand to hand from the truck up to the shed of a home that still heats with them. You lead the line. Tap a person (or press a number; the bottom one is 1) to pass their briquette to the person just above. Whoever catches one needs a moment to get a grip — the light over their head turns green. Pass on a red light and it slips and breaks. After passing they need a moment before they can catch again, and you can't pass to someone whose hands are full. Hold one too long and their arms give out. The grip time varies a little each catch. Fill the shed before the truck has to leave.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", goal: "目標 {0}個", shed: "物置 {0}/{1}", start: "青ランプの人をタップして上へ渡そう！", win: "練炭小屋がいっぱいになった！", lose: "トラックが行ってしまった", result: "運んだ練炭 {0} · 割れた練炭 {1}",
    again: "もう一度", next: "次の面", slip: "あっ、すべった！", drop: "腕が限界で落とした", truck: "残り {0}秒",
    help: "冬が来ると、坂の町の細い階段にボランティアが並び、トラックから降ろした練炭（ヨンタン）を手から手へ渡して、練炭で暖をとる家の物置まで運び上げます。あなたは列を率います。人をタップ（または数字キー、いちばん下が1）すると、その人の練炭をすぐ上の人へ渡します。受け取った人は少しの間かまえ直す必要があり、頭上のランプが緑になります。赤ランプのときに渡すと滑って割れます。渡したあとも少しの間は受け取れず、上の人の手がふさがっていると渡せません。長く持ちすぎると腕が限界で落としてしまいます。かまえ直す時間は毎回少しずつ違います。トラックが出る前に物置を満たせばクリア。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", goal: "目标 {0}块", shed: "煤棚 {0}/{1}", start: "点亮绿灯的人把煤递上去！", win: "煤棚装满了！", lose: "卡车开走了", result: "运上去 {0} · 摔碎 {1}",
    again: "再来一次", next: "下一关", slip: "哎呀，滑了！", drop: "手臂酸了，掉了", truck: "剩余 {0}秒",
    help: "冬天一到，志愿者们就在山坡社区的窄台阶上排成一列，把从卡车上卸下的蜂窝煤（연탄）一块块手递手地往上传，送进还靠蜂窝煤取暖的人家的煤棚。你负责指挥这一列人。点击某人（或按数字键，最下面是1），他就把手里的煤递给正上方的人。接到煤的人要稍微站稳拿好，头上的灯变成绿色才行；红灯时递出会滑手摔碎。递出后也要等一下才能再接，上面的人手里有煤时也递不过去。拿太久手臂会酸得掉下来。每次站稳所需的时间都略有不同。在卡车开走前装满煤棚即过关。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", goal: "Objectif {0}", shed: "Remise {0}/{1}", start: "Touchez quelqu'un au voyant vert pour passer plus haut !", win: "La remise à charbon est pleine !", lose: "Le camion a dû partir", result: "{0} montées · {1} cassées",
    again: "Réessayer", next: "Niveau suivant", slip: "Oups, ça a glissé !", drop: "Bras à bout", truck: "{0} s restantes",
    help: "Quand l'hiver arrive, des bénévoles s'alignent dans les escaliers étroits des quartiers en pente et se passent de main en main les yeontan (briquettes de charbon), du camion jusqu'à la remise d'un foyer qui se chauffe encore ainsi. Vous menez la chaîne. Touchez une personne (ou un chiffre ; celle du bas est 1) pour qu'elle passe sa briquette à celle juste au-dessus. Qui en reçoit une doit d'abord bien la tenir : le voyant au-dessus de sa tête passe au vert. Passée au rouge, elle glisse et se casse. Après une passe, il faut un instant avant de pouvoir recevoir, et on ne passe pas à quelqu'un qui a déjà les mains pleines. Tenue trop longtemps, les bras lâchent. Le temps de prise varie un peu à chaque fois. Remplissez la remise avant le départ du camion.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", goal: "Meta {0}", shed: "Carbonera {0}/{1}", start: "¡Toca a alguien con luz verde para pasarlo arriba!", win: "¡La carbonera está llena!", lose: "El camión tuvo que irse", result: "{0} subidas · {1} rotas",
    again: "Reintentar", next: "Siguiente nivel", slip: "¡Uy, se resbaló!", drop: "Brazos agotados", truck: "Quedan {0} s",
    help: "Cuando llega el invierno, voluntarios se ponen en fila en las estrechas escaleras de los barrios de ladera y se pasan de mano en mano los yeontan (briquetas de carbón), desde el camión hasta la carbonera de un hogar que aún se calienta con ellos. Tú diriges la fila. Toca a una persona (o pulsa un número; la de abajo es 1) para que pase su briqueta a la de justo arriba. Quien recibe una necesita un momento para sujetarla bien: la luz sobre su cabeza se pone verde. Si la pasas en rojo, resbala y se rompe. Tras pasar, hace falta un momento para poder recibir otra, y no se puede pasar a quien ya tiene las manos ocupadas. Si la sujeta demasiado, los brazos ceden. El tiempo de agarre varía un poco cada vez. Llena la carbonera antes de que se vaya el camión.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:yeontan-relay:muted";
const W = 360;
const H = 560;

const PERSON: PixelArt = { palette: { h: "#343a40", f: "#ffd8a8", c: "#e8590c", v: "#fab005", l: "#495057" }, rows: [".hhh.", ".fff.", "ccvcc", "ccvcc", ".c.c.", ".l.l."] };
const COAL: PixelArt = { palette: { k: "#212529", g: "#495057" }, rows: ["kkkk", "kgkg", "kkkk", "gkgk"] };

/** Where volunteer i stands: up the stairs from bottom-left to top-right. */
function spot(n: number, i: number) {
  const f = n === 1 ? 0 : i / (n - 1);
  return { x: 60 + f * 230, y: 470 - f * 330 };
}

interface Pop { text: string; t: number; color: string; x: number; y: number }

export default function YeontanRelay({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; delivered: number; broken: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const aRef = useRef<Alley>(newAlley(YEONTAN_STAGES[0]));
  const started = useRef(false);
  const input = useRef<number[]>([]); // volunteers tapped since the last frame
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = YEONTAN_STAGES[stage];

  useRunRecord(YEONTAN_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    aRef.current = newAlley(YEONTAN_STAGES[s]);
    started.current = false;
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(YEONTAN_SLUG, STAGE_COUNT);
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
      const n = Number(ev.key);
      const a = aRef.current;
      if (Number.isInteger(n) && n >= 1 && n <= a.stage.line.length && !a.over) {
        input.current.push(n - 1);
        setTouched(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const finish = (a: Alley) => {
      setOver({ won: a.won, stars: starsFor(a), delivered: a.delivered, broken: a.broken });
      if (a.won) {
        setCleared(markStageCleared(YEONTAN_SLUG, a.stage.stage, STAGE_COUNT));
        sfx("win");
      } else sfx("lose");
    };
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const a = aRef.current;
      const cp = copyRef.current;
      const n = a.stage.line.length;
      // taps are read once per frame
      for (const i of input.current.splice(0)) {
        if (!started.current) {
          started.current = true;
          continue;
        }
        const res = pass(a, i);
        const p = spot(n, i);
        if (res === "passed") sfx("tap");
        else if (res === "fumbled") {
          pops.current.push({ text: cp.slip, t: 0.8, color: "#e03131", x: p.x, y: p.y - 40 });
          spawnBurst(parts.current, p.x, p.y, ["#212529", "#495057"], 12, 90, Math.floor(a.t * 1000) + i);
          sfx("fail");
        }
      }
      if (started.current && !a.over) {
        const ev = stepAlley(a, dt);
        if (ev.delivered) sfx("place");
        for (const i of ev.dropped) {
          const p = spot(n, i);
          pops.current.push({ text: cp.drop, t: 0.8, color: "#e03131", x: p.x, y: p.y - 40 });
          spawnBurst(parts.current, p.x, p.y, ["#212529", "#495057"], 12, 90, Math.floor(a.t * 1000) + i);
          sfx("fail");
        }
        if (ev.end) finish(a);
      }
      stepParticles(parts.current, dt, 300);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a winter hillside alley: walls, a stone stair winding up, the truck below and the shed above
        ctx.fillStyle = "#cfd8e3";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#adb5bd";
        ctx.fillRect(0, 0, 40, H);
        ctx.fillRect(W - 30, 0, 30, H);
        for (let k = 0; k < 24; k++) {
          const f = k / 23;
          ctx.fillStyle = k % 2 ? "#868e96" : "#9aa0a6";
          ctx.fillRect(40 + f * 240, 500 - f * 370, 70, 16);
          ctx.fillStyle = "#f8f9fa";
          ctx.fillRect(40 + f * 240, 500 - f * 370, 70, 3);
        }
        // truck and pile
        ctx.fillStyle = "#1c7ed6";
        ctx.fillRect(4, 506, 110, 44);
        ctx.fillStyle = "#a5d8ff";
        ctx.fillRect(80, 512, 26, 16);
        for (let k = 0; k < Math.min(a.pile + a.stage.arrivals.length - a.unloaded, 12); k++) drawSprite(ctx, COAL, 14 + (k % 6) * 10, 520 + Math.floor(k / 6) * 12, { scale: 2 });
        // shed at the top
        ctx.fillStyle = "#6b4423";
        ctx.fillRect(282, 56, 70, 60);
        ctx.fillStyle = "#495057";
        ctx.fillRect(276, 46, 82, 12);
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff4e6";
        ctx.fillText(`${a.delivered}/${a.stage.need}`, 317, 92);
        // the line of volunteers, their lights and what they hold
        for (let i = 0; i < n; i++) {
          const p = spot(n, i);
          drawSprite(ctx, PERSON, p.x, p.y, { scale: 6 });
          if (a.holding[i]) drawSprite(ctx, COAL, p.x, p.y - 2, { scale: 4 });
          const ready = a.holding[i] && a.t >= a.readyAt[i];
          ctx.fillStyle = !a.holding[i] ? "rgba(255,255,255,0.4)" : ready ? "#40c057" : "#fa5252";
          ctx.beginPath();
          ctx.arc(p.x, p.y - 30, 6, 0, Math.PI * 2);
          ctx.fill();
          if (a.holding[i]) {
            const left = 1 - Math.min(1, (a.t - a.heldSince[i]) / a.stage.line[i].hold);
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(p.x - 16, p.y + 22, 32, 4);
            ctx.fillStyle = left > 0.35 ? "#fab005" : "#fa5252";
            ctx.fillRect(p.x - 16, p.y + 22, 32 * left, 4);
          }
          ctx.font = "11px sans-serif";
          ctx.fillStyle = "#212529";
          ctx.fillText(String(i + 1), p.x - 22, p.y + 4);
        }
        // briquettes in the air
        for (const f of a.inFlight) {
          const from = spot(n, f.to - 1);
          const to = f.to >= n ? { x: 317, y: 80 } : spot(n, f.to);
          const k = 1 - Math.max(0, f.at - a.t) / FLIGHT;
          drawSprite(ctx, COAL, from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 18, { scale: 4 });
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#212529";
        ctx.fillText(fill(cp.shed, a.delivered, a.stage.need), 48, 26);
        ctx.font = "14px sans-serif";
        ctx.fillText(fill(cp.truck, Math.max(0, Math.ceil(a.stage.time - a.t))), 48, 46);
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
      data-game="yeontan-relay"
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
            const a = aRef.current;
            if (a.over) return;
            const r = ev.currentTarget.getBoundingClientRect();
            const x = ((ev.clientX - r.left) * W) / r.width;
            const y = ((ev.clientY - r.top) * H) / r.height;
            // the nearest volunteer to the finger
            let best = 0;
            let bd = Infinity;
            for (let i = 0; i < a.stage.line.length; i++) {
              const p = spot(a.stage.line.length, i);
              const d = Math.hypot(p.x - x, p.y - y);
              if (d < bd) {
                bd = d;
                best = i;
              }
            }
            setTouched(true);
            input.current.push(best);
          }}
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.delivered, over.broken)}</p>
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
