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
import { SAEALSIM_SLUG, SAEALSIM_STAGES, STAGE_COUNT, lift, newDough, starsFor, stepDough, type Dough } from "../../lib/games/saealsim-roll";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; balls: string; time: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; ball: string; crumble: string; tooFast: string; tooSlow: string; good: string;
}> = {
  ko: {
    stage: "{0}단계", balls: "새알심 {0}/{1}", time: "남은 시간 {0}초", start: "손가락으로 반죽 위에 동글동글 원을 그려요!", win: "팥죽에 새알심을 다 넣었어요!", lose: "팥죽이 끓어 넘쳤어요", result: "{0}개 · 부서진 반죽 {1}",
    again: "다시 빚기", next: "다음 단계", ball: "퐁당!", crumble: "부스러졌어요", tooFast: "너무 빨라요!", tooSlow: "조금 더 빠르게", good: "동글동글",
    help: "동지에는 팥죽에 찹쌀 새알심을 넣어 먹어요. 화면 위에 손가락으로 원을 그리면 반죽이 동그랗게 빚어져요. 아래 바늘이 초록 칸에 있는 빠르기로 일정하게 원을 그리면 반죽이 둥글어지고, 다 둥글어지면 팥죽에 퐁당 들어가고 다음 반죽이 나와요. 너무 빨리 돌리면 반죽에 금이 가다가 부스러지고, 너무 느리거나 앞뒤로 문지르기만 하면 빚어지지 않아요. 팥죽이 끓어 넘치기 전에 정해진 수만큼 빚으면 통과예요. 마우스로도 원을 그려서 할 수 있어요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", balls: "Balls {0}/{1}", time: "{0}s left", start: "Draw circles on the dough with your finger!", win: "All the rice balls are in the porridge!", lose: "The porridge boiled over", result: "{0} balls · {1} crumbled",
    again: "Roll again", next: "Next stage", ball: "Plop!", crumble: "It crumbled", tooFast: "Too fast!", tooSlow: "A little faster", good: "Nice and round",
    help: "On Dongji, the winter solstice, Koreans eat red bean porridge with little glutinous-rice balls (saealsim) in it. Draw circles on the screen with your finger to roll the dough round. Keep a steady pace that holds the needle below in the green band and the lump rounds off; when it is round it drops into the porridge and the next lump appears. Whirl too fast and the dough cracks and crumbles; go too slowly or just scrub back and forth and nothing happens. Roll the stage's count before the porridge boils over. A mouse works too: draw circles with it.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", balls: "団子 {0}/{1}", time: "残り {0}秒", start: "指で生地の上にくるくる円を描こう！", win: "小豆がゆに団子を全部入れた！", lose: "小豆がゆが吹きこぼれた", result: "{0}個 · 崩れた生地 {1}",
    again: "もう一度", next: "次の面", ball: "ポチャン！", crumble: "崩れちゃった", tooFast: "速すぎ！", tooSlow: "もう少し速く", good: "まんまる",
    help: "冬至(トンジ)には、もち米の団子(セアルシム)を入れた小豆がゆを食べます。画面の上で指で円を描くと生地が丸まります。下の針が緑の帯に入る速さで一定に円を描くと丸くなり、まん丸になると小豆がゆにポチャンと入って次の生地が出てきます。速く回しすぎると生地にひびが入って崩れ、遅すぎたり前後にこするだけだと丸まりません。小豆がゆが吹きこぼれる前に決められた数を丸めればクリア。マウスで円を描いても遊べます。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", balls: "汤圆 {0}/{1}", time: "剩余 {0}秒", start: "用手指在面团上画圈圈！", win: "汤圆都下进红豆粥了！", lose: "红豆粥煮溢了", result: "{0}个 · 搓碎 {1}",
    again: "再搓一次", next: "下一关", ball: "扑通！", crumble: "搓碎了", tooFast: "太快了！", tooSlow: "再快一点", good: "圆滚滚",
    help: "冬至时，韩国人吃加了糯米小圆子（새알심）的红豆粥。用手指在屏幕上画圈，就能把面团搓圆。保持让下方指针停在绿色区间的速度匀速画圈，面团就会变圆；搓圆后“扑通”掉进粥里，下一个面团出现。转得太快面团会裂开、搓碎；太慢或只是来回蹭则搓不圆。在红豆粥煮溢前搓够规定数量就过关。也可以用鼠标画圈。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", balls: "Boulettes {0}/{1}", time: "{0} s restantes", start: "Dessinez des cercles sur la pâte avec le doigt !", win: "Toutes les boulettes sont dans la soupe !", lose: "La soupe a débordé", result: "{0} boulettes · {1} émiettées",
    again: "Rouler à nouveau", next: "Niveau suivant", ball: "Plouf !", crumble: "Elle s'est émiettée", tooFast: "Trop vite !", tooSlow: "Un peu plus vite", good: "Bien ronde",
    help: "À Dongji, le solstice d'hiver, les Coréens mangent une soupe de haricots rouges avec de petites boulettes de riz gluant (saealsim). Dessinez des cercles du doigt sur l'écran pour arrondir la pâte. À un rythme régulier qui garde l'aiguille en bas dans la bande verte, la boule s'arrondit ; bien ronde, elle tombe dans la soupe et la suivante apparaît. Trop vite, la pâte se fendille et s'émiette ; trop lentement, ou en frottant d'avant en arrière, rien ne se passe. Roulez le nombre demandé avant que la soupe déborde. Ça marche aussi à la souris.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", balls: "Bolitas {0}/{1}", time: "Quedan {0} s", start: "¡Dibuja círculos sobre la masa con el dedo!", win: "¡Todas las bolitas están en la sopa!", lose: "La sopa se desbordó", result: "{0} bolitas · {1} deshechas",
    again: "Amasar otra vez", next: "Siguiente nivel", ball: "¡Plop!", crumble: "Se deshizo", tooFast: "¡Muy rápido!", tooSlow: "Un poco más rápido", good: "Bien redonda",
    help: "En Dongji, el solsticio de invierno, en Corea se come sopa de judías rojas con bolitas de arroz glutinoso (saealsim). Dibuja círculos con el dedo en la pantalla para redondear la masa. A un ritmo constante que mantenga la aguja de abajo en la franja verde, la bola se redondea; cuando está redonda cae en la sopa y aparece la siguiente. Demasiado rápido, la masa se agrieta y se deshace; demasiado lento, o solo frotando de ida y vuelta, no pasa nada. Haz las del nivel antes de que la sopa se desborde. También vale el ratón.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:saealsim-roll:muted";
const W = 360;
const H = 560;
const CX = 180;
const CY = 250;

const POT: PixelArt = {
  palette: { k: "#212529", g: "#495057", r: "#a61e4d", w: "#f8f9fa" },
  rows: ["..kkkkkkkk..", ".krrrrrrrrk.", "kgrrwrrrwrgk", "kggggggggggk", "kggggggggggk", ".kggggggggk.", "..kkkkkkkk.."],
};

interface Pop { text: string; t: number; color: string }

export default function SaealsimRoll({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [done, setDone] = useState(0);
  const [over, setOver] = useState<null | { won: boolean; stars: number; done: number; crumbled: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dRef = useRef<Dough>(newDough(SAEALSIM_STAGES[0]));
  const started = useRef(false);
  const down = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef({ x: 0, y: 0 });
  const lifted = useRef(false);
  const pendingDt = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = SAEALSIM_STAGES[stage];

  useRunRecord(SAEALSIM_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    dRef.current = newDough(SAEALSIM_STAGES[s]);
    started.current = false;
    down.current = false;
    last.current = null;
    moved.current = { x: 0, y: 0 };
    lifted.current = false;
    pendingDt.current = 0;
    parts.current = [];
    pops.current = [];
    setDone(0);
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneSaved = loadClearedStages(SAEALSIM_SLUG, STAGE_COUNT);
    setCleared(doneSaved);
    start(nextOpenStage(doneSaved, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    let wobble = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - prev) / 1000);
      prev = now;
      const d = dRef.current;
      const cp = copyRef.current;
      wobble += dt;
      // the finger's travel is read once per frame; a frame with no move while held waits for the next one
      if (started.current && !d.over) {
        if (lifted.current) {
          lift(d);
          lifted.current = false;
        }
        const m = moved.current;
        const step = dt + pendingDt.current;
        let ev = null;
        if (down.current && m.x === 0 && m.y === 0 && step < 0.1) pendingDt.current = step;
        else {
          ev = stepDough(d, m.x, m.y, step);
          pendingDt.current = 0;
          moved.current = { x: 0, y: 0 };
        }
        if (ev === "ball") {
          pops.current.push({ text: cp.ball, t: 0.7, color: "#a61e4d" });
          spawnBurst(parts.current, 290, 470, ["#a61e4d", "#f8f9fa"], 14, 90, Math.floor(d.t * 1000));
          setDone(d.done);
          sfx("success");
        } else if (ev === "crumble") {
          pops.current.push({ text: cp.crumble, t: 0.8, color: "#e03131" });
          spawnBurst(parts.current, CX, CY, ["#f8f9fa", "#dee2e6"], 22, 140, Math.floor(d.t * 1000));
          sfx("fail");
        } else if (ev === "end") {
          setDone(d.done);
          setOver({ won: d.won, stars: starsFor(d), done: d.done, crumbled: d.crumbled });
          if (d.won) {
            setCleared(markStageCleared(SAEALSIM_SLUG, d.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 300);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a warm kitchen at night and a wooden board
        ctx.fillStyle = "#3b2a20";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#c08a5a";
        ctx.fillRect(20, 110, W - 40, 290);
        ctx.fillStyle = "#a8744a";
        for (let k = 0; k < 6; k++) ctx.fillRect(20, 130 + k * 48, W - 40, 3);
        // the lump: squashed and lumpy until round, cracked when overworked
        const s = d.stage;
        const r = 46;
        const squash = 1 - d.round;
        ctx.fillStyle = "#fffdf7";
        ctx.beginPath();
        for (let k = 0; k <= 40; k++) {
          const a = (k / 40) * Math.PI * 2;
          const bump = squash * (6 * Math.sin(a * 3 + wobble * 2) + 4 * Math.sin(a * 5));
          const rr = r + bump;
          const x = CX + Math.cos(a) * rr * (1 + squash * 0.35);
          const y = CY + Math.sin(a) * rr * (1 - squash * 0.25);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.fill();
        ctx.strokeStyle = "#e9ecef";
        ctx.lineWidth = 3;
        ctx.stroke();
        if (d.crack > 0.15) {
          ctx.strokeStyle = `rgba(134,142,150,${Math.min(1, d.crack)})`;
          ctx.lineWidth = 2;
          for (let k = 0; k < 4; k++) {
            const a = k * 1.7 + 0.4;
            ctx.beginPath();
            ctx.moveTo(CX + Math.cos(a) * 14, CY + Math.sin(a) * 14);
            ctx.lineTo(CX + Math.cos(a + 0.3) * (14 + d.crack * 30), CY + Math.sin(a + 0.3) * (14 + d.crack * 30));
            ctx.stroke();
          }
        }
        // the pot of porridge with the balls rolled so far
        drawSprite(ctx, POT, 290, 470, { scale: 5 });
        ctx.fillStyle = "#fffdf7";
        for (let k = 0; k < Math.min(d.done, 12); k++) {
          ctx.beginPath();
          ctx.arc(262 + (k % 6) * 11, 456 + Math.floor(k / 6) * 8, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        // the pace gauge: the finger's turns per second against the green band
        const gx = 30;
        const gw = 200;
        const gy = 440;
        const maxRate = s.hi * 1.6;
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(gx, gy, gw, 16);
        ctx.fillStyle = "rgba(64,192,87,0.85)";
        ctx.fillRect(gx + (s.lo / maxRate) * gw, gy, ((s.hi - s.lo) / maxRate) * gw, 16);
        ctx.fillStyle = d.rate > s.hi ? "#e03131" : "#fab005";
        ctx.fillRect(gx + Math.min(1, d.rate / maxRate) * gw - 3, gy - 5, 6, 26);
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#f8f9fa";
        const hint = !down.current ? "" : d.rate > s.hi ? cp.tooFast : d.rate < s.lo ? cp.tooSlow : cp.good;
        ctx.fillText(hint, gx, gy + 40);
        // round-ness of this ball
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(CX - 60, CY + 80, 120, 8);
        ctx.fillStyle = "#ffd43b";
        ctx.fillRect(CX - 60, CY + 80, 120 * d.round, 8);
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(fill(cp.time, Math.max(0, s.limit - d.t).toFixed(1)), 14, 30);
        ctx.fillText(fill(cp.balls, d.done, s.need), 14, 56);
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          const tw = ctx.measureText(pp.text).width + 16;
          ctx.fillRect(CX - tw / 2, 90 - 22, tw, 30);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, CX, 90);
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

  const endStroke = () => {
    down.current = false;
    last.current = null;
    lifted.current = true;
  };

  return (
    <div
      ref={containerRef}
      data-game="saealsim-roll"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.balls, done, st.need)}</Badge>
        <Badge variant="outline">{st.limit.toFixed(1)}s</Badge>
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
            if (dRef.current.over) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            started.current = true;
            setTouched(true);
            down.current = true;
            last.current = toCanvas(e);
          }}
          onPointerMove={(e) => {
            if (!down.current || !last.current) return;
            const p = toCanvas(e);
            moved.current = { x: moved.current.x + p.x - last.current.x, y: moved.current.y + p.y - last.current.y };
            last.current = p;
          }}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.done, over.crumbled)}</p>
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
