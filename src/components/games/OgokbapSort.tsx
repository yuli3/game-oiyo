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
import { BOWLS, BOWL_W, BOWL_Y, FIELD_W, OGOK_SLUG, OGOK_STAGES, STAGE_COUNT, bowlCentre, dragTo, grab, letGo, newPour, starsFor, stepPour, type Pour } from "../../lib/games/ogokbap-sort";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; score: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; right: string; wrong: string; grains: [string, string, string, string, string];
}> = {
  ko: {
    stage: "{0}단계", score: "제대로 {0}/{1}", start: "떨어지는 곡식을 잡아 같은 그릇 위로 끌어요!", win: "오곡밥 준비 끝!", lose: "곡식이 너무 섞였어요", result: "제대로 {0} · 섞임 {1}",
    again: "다시 담기", next: "다음 단계", right: "좋아요!", wrong: "섞였어요", grains: ["쌀", "보리", "조", "검은콩", "팥"],
    help: "정월 대보름에는 다섯 곡식으로 지은 오곡밥을 먹어요. 자루에서 쌀·보리·조·검은콩·팥이 쏟아져 내려와요. 떨어지는 곡식을 손가락으로 잡고 옆으로 끌어 같은 곡식 그릇 위로 옮겨요. 곡식은 끌리는 동안에도 계속 떨어지고, 한 번에 하나만 잡을 수 있어요. 다른 그릇에 떨어지면 섞여서 점수가 깎여요. 11단계부터는 그릇 순서가 바뀌니 잘 보세요. 자루가 다 비었을 때 제대로 담은 수가 목표를 넘으면 통과예요. 키보드는 1~5로 가장 먼저 떨어질 곡식을 그 그릇으로 보내요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", score: "Sorted {0}/{1}", start: "Grab a falling grain and drag it over its bowl!", win: "The ogokbap is ready!", lose: "Too many grains got mixed", result: "{0} sorted · {1} mixed",
    again: "Sort again", next: "Next stage", right: "Nice!", wrong: "Mixed!", grains: ["Rice", "Barley", "Millet", "Black bean", "Red bean"],
    help: "On Jeongwol Daeboreum, Koreans eat ogokbap, rice cooked with five grains. Rice, barley, millet, black beans and red beans pour down from the sacks. Grab a falling grain with your finger and drag it sideways over the bowl for that grain. It keeps falling while you drag, and you can hold only one at a time. A grain in the wrong bowl gets mixed in and costs a point. From stage 11 the bowls swap places, so look carefully. When the sacks are empty, sort enough to clear the stage. Keyboard: 1 to 5 send the grain landing soonest to that bowl.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", score: "正しく {0}/{1}", start: "落ちてくる穀物をつかんで同じ器の上へドラッグ！", win: "五穀ご飯の準備完了！", lose: "穀物が混ざりすぎた", result: "正しく {0} · 混ざった {1}",
    again: "もう一度", next: "次の面", right: "いいね！", wrong: "混ざった！", grains: ["米", "麦", "粟", "黒豆", "小豆"],
    help: "正月テボルムには、五つの穀物で炊いた五穀ご飯(オゴクパプ)を食べます。袋から米・麦・粟・黒豆・小豆が降ってきます。落ちてくる穀物を指でつかみ、横へドラッグして同じ穀物の器の上へ運びます。ドラッグ中も穀物は落ち続け、一度に一つしかつかめません。違う器に落ちると混ざって減点。11面からは器の並びが変わるのでよく見て。袋が空になったとき、正しく入れた数が目標を超えればクリア。キーボードは1〜5で一番先に落ちる穀物をその器へ送ります。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", score: "装对 {0}/{1}", start: "抓住落下的谷物，拖到对应的碗上方！", win: "五谷饭准备好了！", lose: "谷物混得太多了", result: "装对 {0} · 混了 {1}",
    again: "再装一次", next: "下一关", right: "好！", wrong: "混了！", grains: ["大米", "大麦", "小米", "黑豆", "红豆"],
    help: "正月十五要吃用五种谷物煮的五谷饭。大米、大麦、小米、黑豆、红豆从袋子里倾泻而下。用手指抓住落下的谷物，横向拖到装那种谷物的碗上方。拖动时谷物仍会继续下落，一次只能抓一粒。落进别的碗就混了，要扣分。第11关起碗的顺序会变，要看仔细。袋子倒空时装对的数量达到目标就过关。键盘按1~5把最先落地的谷物送到那个碗。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", score: "Triés {0}/{1}", start: "Attrapez un grain qui tombe et glissez-le au-dessus de son bol !", win: "L'ogokbap est prêt !", lose: "Trop de grains mélangés", result: "{0} triés · {1} mélangés",
    again: "Trier à nouveau", next: "Niveau suivant", right: "Bien !", wrong: "Mélangé !", grains: ["Riz", "Orge", "Millet", "Haricot noir", "Haricot rouge"],
    help: "À Jeongwol Daeboreum, les Coréens mangent l'ogokbap, du riz cuit avec cinq grains. Riz, orge, millet, haricots noirs et haricots rouges tombent des sacs. Attrapez un grain du doigt et glissez-le de côté au-dessus du bol de ce grain. Il continue de tomber pendant que vous le déplacez, et vous n'en tenez qu'un à la fois. Un grain dans le mauvais bol s'y mélange et coûte un point. Dès le niveau 11, les bols changent de place : regardez bien. Quand les sacs sont vides, triez-en assez pour réussir. Clavier : 1 à 5 envoient le grain qui tombera le premier dans ce bol.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", score: "Bien {0}/{1}", start: "¡Agarra un grano que cae y arrástralo sobre su cuenco!", win: "¡El ogokbap está listo!", lose: "Se mezclaron demasiados granos", result: "{0} bien · {1} mezclados",
    again: "Ordenar otra vez", next: "Siguiente nivel", right: "¡Bien!", wrong: "¡Mezclado!", grains: ["Arroz", "Cebada", "Mijo", "Frijol negro", "Frijol rojo"],
    help: "En Jeongwol Daeboreum se come ogokbap, arroz cocido con cinco granos. Arroz, cebada, mijo, frijoles negros y rojos caen de los sacos. Agarra un grano con el dedo y arrástralo de lado sobre el cuenco de ese grano. Sigue cayendo mientras lo arrastras, y solo puedes llevar uno a la vez. Un grano en el cuenco equivocado se mezcla y cuesta un punto. Desde el nivel 11 los cuencos cambian de sitio: mira bien. Cuando los sacos estén vacíos, ordena suficientes para pasar el nivel. Teclado: 1 a 5 mandan el grano que caerá primero a ese cuenco.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:ogokbap-sort:muted";
const W = FIELD_W;
const H = 560;
// rice, barley, millet, black bean, red bean
const GRAIN_ART: PixelArt[] = [
  { palette: { w: "#f8f9fa", g: "#dee2e6" }, rows: [".ww.", "wwww", "wwgw", ".ww."] },
  { palette: { y: "#e9c46a", d: "#b8893a" }, rows: [".yy.", "yyyy", "ydyy", "yyyy", ".yy."] },
  { palette: { y: "#ffd43b", o: "#f59f00" }, rows: ["yy", "yo"] },
  { palette: { k: "#212529", g: "#495057" }, rows: [".kkk.", "kkgkk", "kkkkk", ".kkk."] },
  { palette: { r: "#a61e4d", p: "#e64980" }, rows: [".rr.", "rrpr", "rrrr", ".rr."] },
];
const BOWL_COL = ["#f8f9fa", "#e9c46a", "#ffd43b", "#343a40", "#a61e4d"];

interface Pop { text: string; t: number; color: string; x: number }

export default function OgokbapSort({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; right: number; wrong: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pRef = useRef<Pour>(newPour(OGOK_STAGES[0]));
  const started = useRef(false);
  const input = useRef<Array<{ kind: "down" | "move"; x: number; y: number } | { kind: "up" } | { kind: "key"; bowl: number }>>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = OGOK_STAGES[stage];

  useRunRecord(OGOK_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    pRef.current = newPour(OGOK_STAGES[s]);
    started.current = false;
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(OGOK_SLUG, STAGE_COUNT);
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
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const p = pRef.current;
      const s = p.stage;
      const cp = copyRef.current;
      // the finger is read once per frame
      for (const e of input.current.splice(0)) {
        started.current = true;
        if (e.kind === "down") grab(p, e.x, e.y);
        else if (e.kind === "move") dragTo(p, e.x);
        else if (e.kind === "up") letGo(p);
        else if (e.kind === "key") {
          // keyboard: the grain landing soonest goes to the chosen bowl
          let pick = -1;
          let low = -1;
          for (let i = 0; i < s.grains.length; i++) if (p.state[i] === "falling" && p.y[i] > low) { low = p.y[i]; pick = i; }
          if (pick >= 0) {
            p.held = pick;
            dragTo(p, bowlCentre(e.bowl));
            letGo(p);
          }
        }
      }
      if (started.current && !p.over) {
        const ev = stepPour(p, dt);
        for (const l of ev.landed) {
          pops.current.push({ text: l.right ? cp.right : cp.wrong, t: 0.6, color: l.right ? "#2f9e44" : "#e03131", x: p.x[l.i] });
          spawnBurst(parts.current, p.x[l.i], BOWL_Y, l.right ? ["#ffd43b", "#ffffff"] : ["#868e96", "#495057"], 8, 70, Math.floor(p.t * 1000));
          if (l.right) cues.current?.play("place");
          else sfx("fail");
        }
        if (ev.end) {
          setOver({ won: p.won, stars: starsFor(p), right: p.right, wrong: p.wrong });
          if (p.won) {
            setCleared(markStageCleared(OGOK_SLUG, s.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 240);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a kitchen floor mat, the sacks along the top and the five bowls
        ctx.fillStyle = "#fff4e6";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#e8c39e";
        for (let k = 0; k < 8; k++) ctx.fillRect(0, 80 + k * 54, W, 2);
        ctx.fillStyle = "#c08a5a";
        ctx.fillRect(0, 0, W, 34);
        for (let b = 0; b < BOWLS; b++) {
          const x0 = b * BOWL_W;
          ctx.fillStyle = "#8b5a2b";
          ctx.beginPath();
          ctx.moveTo(x0 + 6, BOWL_Y);
          ctx.lineTo(x0 + BOWL_W - 6, BOWL_Y);
          ctx.lineTo(x0 + BOWL_W - 16, BOWL_Y + 50);
          ctx.lineTo(x0 + 16, BOWL_Y + 50);
          ctx.fill();
          const kind = s.order[b];
          ctx.fillStyle = BOWL_COL[kind];
          ctx.fillRect(x0 + 10, BOWL_Y - 6, BOWL_W - 20, 10);
          drawSprite(ctx, GRAIN_ART[kind], x0 + BOWL_W / 2, BOWL_Y + 24, { scale: 4 });
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#5c3d2e";
          ctx.fillText(cp.grains[kind], x0 + BOWL_W / 2, BOWL_Y + 70);
        }
        // the falling grains; the held one gets a ring
        for (let i = 0; i < s.grains.length; i++) {
          if (p.state[i] !== "falling") continue;
          if (p.held === i) {
            ctx.strokeStyle = "#1c7ed6";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.x[i], p.y[i], 18, 0, Math.PI * 2);
            ctx.stroke();
          }
          drawSprite(ctx, GRAIN_ART[s.grains[i].kind], p.x[i], p.y[i], { scale: 5 });
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(fill(cp.score, Math.max(0, p.right - p.wrong), s.need), 10, 23);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 15px sans-serif";
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, Math.max(30, Math.min(W - 30, pp.x)), BOWL_Y - 20 - (0.6 - pp.t) * 30);
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

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > BOWLS || e.repeat || pRef.current.over) return;
      setTouched(true);
      input.current.push({ kind: "key", bowl: n - 1 });
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="ogokbap-sort"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.score, st.need, st.grains.length)}</Badge>
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
            if (pRef.current.over) return;
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
          <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.right, over.wrong)}</p>
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
