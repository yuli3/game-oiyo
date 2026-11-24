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
import { HEAT_SLUG, HEAT_STAGES, STAGE_COUNT, WINDOWS, activeAt, handUp, newMorning, score, starsFor, stepMorning, tap, type Morning } from "../../lib/games/sell-the-heat";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; score: string; time: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; sold: string; bought: string; rude: string;
}> = {
  ko: {
    stage: "{0}단계", score: "판 더위 {0}/{1}", time: "남은 시간 {0}초", start: "손을 든 이웃을 먼저 톡! 손을 안 들면 기다려요", win: "더위를 다 팔았어요!", lose: "올여름은 더울 것 같아요", result: "판 더위 {0} · 산 더위 {1} · 실례 {2}",
    again: "다시 하기", next: "다음 단계", sold: "내 더위 사 가라!", bought: "앗, 더위를 샀어요", rude: "실례!",
    help: "정월 대보름 아침의 더위팔기예요. 친구 이름을 불러 대답하면 '내 더위 사 가라!' 하고 여름 더위를 넘기는 풍습이에요. 다섯 창문에서 이웃이 내다봐요. 이웃이 나를 돌아보고 손을 들면 곧 내 이름을 부르려는 거예요. 먼저 그 창문을 톡 누르면 더위를 팔아요. 이웃이 먼저 부르면 그 집 더위를 사게 돼요. 어떤 이웃은 손을 들지 않고 돌아보기만 하다가 고개를 돌리는데, 그때 누르거나 빈 창문을 누르면 실례라 점수가 깎여요. 아침이 끝날 때 판 더위가 목표를 넘으면 통과예요. 키보드는 1~5.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", score: "Heat sold {0}/{1}", time: "{0}s left", start: "Tap a neighbour who raises a hand, first! No hand, no tap", win: "You sold all your heat!", lose: "It's going to be a hot summer", result: "{0} sold · {1} bought · {2} rude",
    again: "Play again", next: "Next stage", sold: "Buy my heat!", bought: "Oops, you bought their heat", rude: "Rude!",
    help: "Deowi-palgi, the 'heat selling' of Jeongwol Daeboreum morning: call a friend's name, and if they answer, shout 'Buy my summer heat!' and the coming summer's heat is theirs. Neighbours lean out of five windows. When one turns to you and raises a hand, they are about to call your name: tap their window first to sell your heat. If they call first, you buy theirs. Some neighbours only turn and look, with no raised hand, then turn away; tapping them, or an empty window, is rude and costs you a point. Sell enough heat by the end of the morning. Keyboard: 1 to 5.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", score: "売った暑さ {0}/{1}", time: "残り {0}秒", start: "手を挙げた隣人を先にタップ！ 手を挙げなければ待つ", win: "暑さを全部売った！", lose: "今年の夏は暑そう", result: "売った {0} · 買った {1} · 失礼 {2}",
    again: "もう一度", next: "次の面", sold: "私の暑さを買って！", bought: "あっ、暑さを買っちゃった", rude: "失礼！",
    help: "正月テボルムの朝の「暑さ売り(トウィパルギ)」。友だちの名前を呼んで返事をしたら「私の暑さを買って！」と言って夏の暑さを渡す風習です。5つの窓から隣人がのぞきます。こちらを向いて手を挙げたら、もうすぐあなたの名前を呼ぶ合図。先にその窓をタップすれば暑さを売れます。相手が先に呼ぶと、その家の暑さを買うことに。手を挙げずに見るだけで向き直る人もいて、そのときタップしたり空の窓をタップしたりすると失礼で減点です。朝が終わるまでに売った暑さが目標を超えればクリア。キーボードは1〜5。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", score: "卖出暑气 {0}/{1}", time: "剩余 {0}秒", start: "先点举手的邻居！没举手就等等", win: "暑气全卖出去了！", lose: "今年夏天要热了", result: "卖出 {0} · 买入 {1} · 失礼 {2}",
    again: "再来一次", next: "下一关", sold: "买走我的暑气吧！", bought: "哎呀，买了他的暑气", rude: "失礼！",
    help: "正月十五早上的“卖暑气”：喊朋友的名字，对方一答应，就说“买走我的暑气吧！”，把夏天的暑气让给他。五扇窗户里有邻居探出头来。邻居转向你并举起手，就是要喊你的名字了，先点那扇窗就能把暑气卖出去。要是对方先喊，你就买下了他家的暑气。有的邻居只是转头看看、不举手，然后又转回去；这时点他或点空窗户都算失礼，要扣分。早上结束时卖出的暑气达到目标就过关。键盘用1~5。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", score: "Chaleur vendue {0}/{1}", time: "{0} s restantes", start: "Touchez d'abord un voisin qui lève la main ! Pas de main, pas de toucher", win: "Vous avez vendu toute votre chaleur !", lose: "L'été s'annonce chaud", result: "{0} vendues · {1} achetées · {2} impolitesses",
    again: "Rejouer", next: "Niveau suivant", sold: "Achète ma chaleur !", bought: "Oups, vous avez acheté sa chaleur", rude: "Impoli !",
    help: "Le deowi-palgi, la « vente de chaleur » du matin de Jeongwol Daeboreum : on appelle un ami, et s'il répond, on lui lance « Achète ma chaleur d'été ! » pour qu'il ait chaud à votre place. Des voisins se penchent à cinq fenêtres. Quand l'un se tourne vers vous et lève la main, il va vous appeler : touchez sa fenêtre en premier pour vendre votre chaleur. S'il appelle avant, c'est vous qui achetez la sienne. Certains se tournent juste pour regarder, sans lever la main, puis se détournent ; les toucher, ou toucher une fenêtre vide, est impoli et coûte un point. Vendez assez de chaleur avant la fin de la matinée. Clavier : 1 à 5.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", score: "Calor vendido {0}/{1}", time: "Quedan {0} s", start: "¡Toca primero al vecino que levanta la mano! Sin mano, no toques", win: "¡Vendiste todo tu calor!", lose: "Este verano va a hacer calor", result: "{0} vendidos · {1} comprados · {2} groserías",
    again: "Jugar otra vez", next: "Siguiente nivel", sold: "¡Cómprame el calor!", bought: "Uy, compraste su calor", rude: "¡Qué grosero!",
    help: "El deowi-palgi, la «venta del calor» de la mañana de Jeongwol Daeboreum: llamas a un amigo y, si responde, le gritas «¡Cómprame el calor del verano!» para que lo pase él. Los vecinos se asoman por cinco ventanas. Cuando uno se gira hacia ti y levanta la mano, va a llamarte: toca su ventana primero para venderle tu calor. Si te llama antes, compras el suyo. Algunos solo se giran a mirar, sin levantar la mano, y vuelven a darse la vuelta; tocarlos, o tocar una ventana vacía, es una grosería y te quita un punto. Vende suficiente calor antes de que acabe la mañana. Teclado: 1 a 5.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:sell-the-heat:muted";
const W = 360;
const H = 560;
// three windows on the upper floor, two below
const WIN_RECTS = [
  { x: 14, y: 120, w: 100, h: 112 },
  { x: 130, y: 120, w: 100, h: 112 },
  { x: 246, y: 120, w: 100, h: 112 },
  { x: 72, y: 290, w: 100, h: 112 },
  { x: 188, y: 290, w: 100, h: 112 },
];

const FACE: PixelArt = {
  palette: { k: "#212529", s: "#f1c27d", r: "#e64980", w: "#f8f9fa", h: "#5c3d2e" },
  rows: ["..hhhh..", ".hhhhhh.", ".hsssh..", ".skssks.", ".ssssss.", "..srrs..", "..ssss..", ".rrrrrr."],
};
const SIDE: PixelArt = {
  palette: { k: "#212529", s: "#f1c27d", r: "#e64980", h: "#5c3d2e" },
  rows: ["..hhhh..", ".hhhhhh.", ".hhhhss.", ".hhhksk.", ".hhssss.", "..hsss..", "..ssss..", ".rrrrrr."],
};
const HAND: PixelArt = {
  palette: { s: "#f1c27d", k: "#5c3d2e" },
  rows: ["s.s.s", "sssss", "sssss", ".sss.", ".sss.", ".kkk."],
};

interface Pop { text: string; t: number; color: string; x: number; y: number }

export default function SellTheHeat({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; sold: number; bought: number; rude: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mRef = useRef<Morning>(newMorning(HEAT_STAGES[0]));
  const started = useRef(false);
  const input = useRef<number[]>([]);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = HEAT_STAGES[stage];

  useRunRecord(HEAT_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    mRef.current = newMorning(HEAT_STAGES[s]);
    started.current = false;
    input.current = [];
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(HEAT_SLUG, STAGE_COUNT);
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
      const m = mRef.current;
      const cp = copyRef.current;
      // taps are read once per frame
      for (const win of input.current.splice(0)) {
        if (!started.current) {
          started.current = true;
          continue; // the first tap only starts the morning
        }
        const r = WIN_RECTS[win];
        const res = tap(m, win);
        if (res === "sold") {
          pops.current.push({ text: cp.sold, t: 0.9, color: "#2f9e44", x: r.x + r.w / 2, y: r.y - 6 });
          spawnBurst(parts.current, r.x + r.w / 2, r.y + 40, ["#ffd43b", "#ff922b"], 14, 100, Math.floor(m.t * 1000));
          sfx("success");
        } else if (res === "rude") {
          pops.current.push({ text: cp.rude, t: 0.7, color: "#e03131", x: r.x + r.w / 2, y: r.y - 6 });
          sfx("fail");
        }
      }
      if (started.current && !m.over) {
        const ev = stepMorning(m, dt);
        for (const i of ev.bought) {
          const r = WIN_RECTS[m.stage.turns[i].win];
          pops.current.push({ text: cp.bought, t: 1, color: "#e8590c", x: r.x + r.w / 2, y: r.y - 6 });
          sfx("fail");
        }
        if (ev.end) {
          setOver({ won: m.won, stars: starsFor(m), sold: m.sold, bought: m.bought, rude: m.rude });
          if (m.won) {
            setCleared(markStageCleared(HEAT_SLUG, m.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 200);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a winter morning in the village: sky, a hanok wall with paper windows
        ctx.fillStyle = "#a5d8ff";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#212529";
        ctx.fillRect(0, 70, W, 26);
        ctx.fillStyle = "#e9ecef";
        ctx.fillRect(0, 96, W, 340);
        ctx.fillStyle = "#8b5a2b";
        ctx.fillRect(0, 96, W, 8);
        ctx.fillRect(0, 262, W, 8);
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(0, 436, W, H - 436);
        for (let wi = 0; wi < WINDOWS; wi++) {
          const r = WIN_RECTS[wi];
          const i = started.current ? activeAt(m, wi) : -1;
          ctx.fillStyle = "#6b4423";
          ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
          ctx.fillStyle = i >= 0 ? "#fff9db" : "#f1e7d0";
          ctx.fillRect(r.x, r.y, r.w, r.h);
          if (i < 0) {
            // closed paper lattice
            ctx.fillStyle = "#c9a37a";
            for (let k = 1; k < 4; k++) ctx.fillRect(r.x + (k * r.w) / 4 - 1, r.y, 2, r.h);
            for (let k = 1; k < 4; k++) ctx.fillRect(r.x, r.y + (k * r.h) / 4 - 1, r.w, 2);
            continue;
          }
          const up = handUp(m, i);
          drawSprite(ctx, FACE, r.x + r.w / 2, r.y + r.h / 2 + 8, { scale: 6 });
          if (up) drawSprite(ctx, HAND, r.x + r.w - 16, r.y + 26, { scale: 4 });
        }
        // neighbours peeking but not yet turned show from the side (the next one to watch)
        ctx.globalAlpha = 0.55;
        for (const tr of m.stage.turns) {
          if (!started.current || m.t < tr.at - 0.6 || m.t >= tr.at) continue;
          const r = WIN_RECTS[tr.win];
          if (activeAt(m, tr.win) >= 0) continue;
          drawSprite(ctx, SIDE, r.x + r.w / 2 - 18, r.y + r.h / 2 + 8, { scale: 5 });
        }
        ctx.globalAlpha = 1;
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#212529";
        ctx.fillText(fill(cp.time, Math.max(0, m.stage.length - m.t).toFixed(1)), 12, 30);
        ctx.fillText(fill(cp.score, Math.max(0, score(m)), m.stage.need), 12, 56);
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#495057";
        ctx.textAlign = "center";
        for (let wi = 0; wi < WINDOWS; wi++) ctx.fillText(String(wi + 1), WIN_RECTS[wi].x + WIN_RECTS[wi].w / 2, WIN_RECTS[wi].y + WIN_RECTS[wi].h + 22);
        for (const pp of pops.current) {
          ctx.font = "bold 15px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.fillRect(x - tw / 2, pp.y - 20, tw, 24);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, x, pp.y - 3);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const hit = (e: React.PointerEvent<HTMLCanvasElement>): number => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    return WIN_RECTS.findIndex((w) => x >= w.x - 6 && x <= w.x + w.w + 6 && y >= w.y - 6 && y <= w.y + w.h + 6);
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > WINDOWS || e.repeat) return;
      if (mRef.current.over) return;
      setTouched(true);
      input.current.push(n - 1);
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
      data-game="sell-the-heat"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.score, st.need, st.need)}</Badge>
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
            if (mRef.current.over) return;
            setTouched(true);
            const win = hit(e);
            if (!started.current) input.current.push(Math.max(0, win));
            else if (win >= 0) input.current.push(win);
          }}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-8 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.sold, over.bought, over.rude)}</p>
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
