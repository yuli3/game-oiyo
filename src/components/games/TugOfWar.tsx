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
import { STAGE_COUNT, TUG_SLUG, TUG_STAGES, newTug, phaseAt, starsFor, stepTug, type Tug } from "../../lib/games/tug-of-war";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; time: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; shout: string; yanked: string; pull: string; brace: string; you: string; them: string;
}> = {
  ko: {
    stage: "{0}단계", time: "남은 시간 {0}초", start: "상대가 쉴 때 꾹 눌러 당기고, '영차!' 소리가 나면 떼요!", win: "깃발을 우리 쪽으로 넘겼어요!", lose: "줄다리기에 졌어요", result: "{0}초 걸렸어요",
    again: "다시 하기", next: "다음 단계", shout: "영차!", yanked: "끌려가요!", pull: "당겨!", brace: "버텨!", you: "우리 마을", them: "건너 마을",
    help: "정월 대보름 마을 줄다리기예요. 건너 마을은 '영차!' 하고 외친 뒤 힘껏 당기고, 그다음엔 손을 고쳐 잡으며 잠깐 쉬어요. 화면을 누르고 있으면 우리 마을이 줄을 당겨요. 상대가 쉴 때 당기면 줄이 우리 쪽으로 오지만, 상대가 당길 때 같이 당기면 발이 미끄러져 크게 끌려가요. 손을 떼면 다들 버티며 자리를 지켜요. '영차!' 소리가 나면 바로 떼고, 상대의 힘이 빠지면 다시 당기세요. 시간 안에 가운데 깃발을 우리 선까지 끌어오면 이겨요. 키보드는 스페이스.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", time: "{0}s left", start: "Hold to pull while they rest, and let go when they shout 'Yeongcha!'", win: "The flag crossed your line!", lose: "You lost the tug of war", result: "Won in {0}s",
    again: "Pull again", next: "Next stage", shout: "Yeongcha!", yanked: "Yanked!", pull: "Pull!", brace: "Brace!", you: "Your village", them: "Their village",
    help: "The village tug of war of Jeongwol Daeboreum, the first full moon of the lunar year. The other village shouts 'Yeongcha!' and heaves, then rests a moment while they reset their grip. Hold the screen and your village pulls. Pull while they rest and the rope comes your way, but pull into their heave and your team loses its footing and gets dragged. Let go and everyone braces and holds their ground. Let go as soon as you hear the shout, and pull again when their heave fades. Haul the middle flag to your line before time runs out. Keyboard: Space.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", time: "残り {0}秒", start: "相手が休む間に長押しで引き、「ヨンチャ！」の声で離そう！", win: "旗をこちらの線まで引き寄せた！", lose: "綱引きに負けた", result: "{0}秒で勝利",
    again: "もう一度", next: "次の面", shout: "ヨンチャ！", yanked: "引きずられる！", pull: "引け！", brace: "踏ん張れ！", you: "わが村", them: "向こうの村",
    help: "旧暦の最初の満月、正月テボルムの村の綱引き。向こうの村は「ヨンチャ！」と叫んでから力いっぱい引き、そのあと握り直す間ひと休みします。画面を押している間、こちらの村が綱を引きます。相手が休んでいる間に引けば綱はこちらへ来ますが、相手が引くときに一緒に引くと足が滑って大きく引きずられます。指を離すと皆が踏ん張ってその場を守ります。掛け声が聞こえたらすぐ離し、相手の力が抜けたらまた引きましょう。時間内に真ん中の旗をこちらの線まで引き寄せれば勝ち。キーボードはスペース。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", time: "剩余 {0}秒", start: "对方休息时按住拉，听到“嘿哟！”就松手！", win: "把旗子拉过了我方的线！", lose: "拔河输了", result: "{0}秒获胜",
    again: "再拉一次", next: "下一关", shout: "嘿哟！", yanked: "被拖走了！", pull: "拉！", brace: "顶住！", you: "我们村", them: "对面村",
    help: "正月十五（正月大满月）的村庄拔河。对面村先喊“嘿哟！”再用力一拉，然后换手重新握绳、稍作休息。按住屏幕，我们村就拉绳。趁对方休息时拉，绳子会往我们这边来；在对方发力时一起拉，脚下会打滑被大幅拖走。松开手，大家就蹲稳守住位置。一听到口号马上松手，对方的劲一泄就再拉。在时间内把中间的旗子拉到我方的线就赢了。键盘用空格。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", time: "{0} s restantes", start: "Maintenez pour tirer pendant qu'ils soufflent, lâchez quand ils crient « Yeongcha ! »", win: "Le drapeau a passé votre ligne !", lose: "Vous avez perdu le tir à la corde", result: "Gagné en {0} s",
    again: "Tirer à nouveau", next: "Niveau suivant", shout: "Yeongcha !", yanked: "Entraînés !", pull: "Tirez !", brace: "Tenez bon !", you: "Votre village", them: "L'autre village",
    help: "Le tir à la corde des villages pour Jeongwol Daeboreum, la première pleine lune de l'année lunaire. L'autre village crie « Yeongcha ! » et tire de toutes ses forces, puis souffle un instant en reprenant la corde. Maintenez l'écran et votre village tire. Tirez pendant qu'ils soufflent et la corde vient vers vous, mais tirer pendant leur effort fait perdre l'équilibre et vous êtes entraînés. Lâchez et tout le monde s'arc-boute pour tenir. Lâchez dès le cri, et tirez de nouveau quand leur effort retombe. Amenez le drapeau du milieu jusqu'à votre ligne avant la fin du temps. Clavier : Espace.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", time: "Quedan {0} s", start: "¡Mantén para tirar mientras descansan y suelta cuando griten «Yeongcha»!", win: "¡La bandera cruzó tu línea!", lose: "Perdiste el tira y afloja", result: "Ganado en {0} s",
    again: "Tirar otra vez", next: "Siguiente nivel", shout: "¡Yeongcha!", yanked: "¡Arrastrados!", pull: "¡Tira!", brace: "¡Aguanta!", you: "Tu aldea", them: "La otra aldea",
    help: "El tira y afloja entre aldeas de Jeongwol Daeboreum, la primera luna llena del año lunar. La otra aldea grita «¡Yeongcha!» y tira con todo, y luego descansa un momento mientras vuelve a agarrar la cuerda. Mantén la pantalla y tu aldea tira. Si tiras mientras descansan, la cuerda viene hacia ti, pero si tiras durante su esfuerzo pierdes el equilibrio y te arrastran. Suelta y todos se afianzan para aguantar. Suelta en cuanto oigas el grito y vuelve a tirar cuando su esfuerzo se apague. Lleva la bandera del centro hasta tu línea antes de que se acabe el tiempo. Teclado: Espacio.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:tug-of-war:muted";
const W = 360;
const H = 560;
const ROPE_Y = 320;
const LINE_DX = 120; // screen px from the middle to each line

const US: PixelArt = {
  palette: { k: "#212529", s: "#f1c27d", b: "#1971c2", w: "#f8f9fa", r: "#e03131" },
  rows: ["..kk..", ".kssk.", "..ss..", ".bbbb.", "bbbbbb", ".bwwb.", ".b..b.", "kk..kk"],
};
const THEM: PixelArt = {
  palette: { k: "#212529", s: "#f1c27d", b: "#c92a2a", w: "#f8f9fa", r: "#e03131" },
  rows: ["..kk..", ".kssk.", "..ss..", ".bbbb.", "bbbbbb", ".bwwb.", ".b..b.", "kk..kk"],
};

interface Pop { text: string; t: number; color: string }

export default function TugOfWar({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; time: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gRef = useRef<Tug>(newTug(TUG_STAGES[0]));
  const started = useRef(false);
  const input = useRef<Array<"down" | "up">>([]);
  const lastPhase = useRef<string>("slack");
  const yankT = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = TUG_STAGES[stage];

  useRunRecord(TUG_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    gRef.current = newTug(TUG_STAGES[s]);
    started.current = false;
    input.current = [];
    lastPhase.current = "slack";
    yankT.current = 0;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(TUG_SLUG, STAGE_COUNT);
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
      const g = gRef.current;
      const cp = copyRef.current;
      // the button is read once per frame
      for (const e of input.current.splice(0)) {
        if (e === "down") started.current = true;
        g.holding = e === "down";
      }
      const phase = started.current ? phaseAt(g.stage, g.t) : "slack";
      if (phase === "warn" && lastPhase.current !== "warn") sfx("tap");
      lastPhase.current = phase;
      if (started.current && !g.over) {
        if (g.holding && phase === "heave" && (yankT.current -= dt) <= 0) {
          yankT.current = 0.6;
          pops.current.push({ text: cp.yanked, t: 0.6, color: "#e03131" });
          spawnBurst(parts.current, W / 2 + 90, ROPE_Y + 34, ["#ced4da", "#ffffff"], 8, 80, Math.floor(g.t * 1000));
          haptics.current?.fire("fail");
        }
        if (stepTug(g, dt)) {
          setOver({ won: g.won, stars: starsFor(g), time: g.t });
          if (g.won) {
            setCleared(markStageCleared(TUG_SLUG, g.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 200);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a full-moon night over the village field
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#1b1f3b");
        sky.addColorStop(0.6, "#364fc7");
        sky.addColorStop(1, "#5c7cfa");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff3bf";
        ctx.beginPath();
        ctx.arc(290, 80, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#e9ecef";
        ctx.fillRect(0, ROPE_Y + 30, W, H - ROPE_Y - 30);
        ctx.fillStyle = "#adb5bd";
        ctx.fillRect(0, ROPE_Y + 30, W, 4);
        // the lines and the middle marker
        const mid = W / 2;
        ctx.fillStyle = "#c92a2a";
        ctx.fillRect(mid - LINE_DX - 2, ROPE_Y + 10, 4, 60);
        ctx.fillStyle = "#1971c2";
        ctx.fillRect(mid + LINE_DX - 2, ROPE_Y + 10, 4, 60);
        // the rope moves with the flag: x = 1 puts the flag on your line
        const off = g.x * LINE_DX;
        ctx.strokeStyle = "#d9a066";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(0, ROPE_Y);
        ctx.lineTo(W, ROPE_Y);
        ctx.stroke();
        ctx.strokeStyle = "#a0522d";
        ctx.lineWidth = 2;
        for (let k = -20; k < 40; k++) {
          const x = ((k * 14 + off) % W + W) % W;
          ctx.beginPath();
          ctx.moveTo(x, ROPE_Y - 4);
          ctx.lineTo(x + 6, ROPE_Y + 4);
          ctx.stroke();
        }
        ctx.fillStyle = "#fab005";
        ctx.fillRect(mid + off - 2, ROPE_Y - 40, 4, 40);
        ctx.fillStyle = "#e03131";
        ctx.fillRect(mid + off + 2, ROPE_Y - 40, 18, 12);
        // teams: they lean back in a heave, you lean back while pulling
        const theirLean = phase === "heave" ? 0.45 : phase === "warn" ? 0.15 : 0.05;
        const ourLean = g.holding ? (phase === "heave" ? -0.3 : 0.45) : 0.15;
        for (let k = 0; k < 4; k++) {
          drawSprite(ctx, THEM, 30 + k * 26 + off * 0.3, ROPE_Y + 14, { scale: 3, rotate: -theirLean });
          drawSprite(ctx, US, W - 30 - k * 26 + off * 0.3, ROPE_Y + 14, { scale: 3, rotate: ourLean });
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#ffc9c9";
        ctx.fillText(cp.them, 70, ROPE_Y + 100);
        ctx.fillStyle = "#a5d8ff";
        ctx.fillText(cp.you, W - 70, ROPE_Y + 100);
        if (phase === "warn" || phase === "heave") {
          ctx.font = "bold 26px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          const w = ctx.measureText(cp.shout).width + 20;
          ctx.fillRect(70 - w / 2, ROPE_Y - 110, w, 40);
          ctx.fillStyle = "#c92a2a";
          ctx.fillText(cp.shout, 70, ROPE_Y - 80);
        }
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(fill(cp.time, Math.max(0, g.stage.limit - g.t).toFixed(1)), W / 2, 36);
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = g.holding ? "#69db7c" : "#dee2e6";
        ctx.fillText(g.holding ? cp.pull : cp.brace, W - 70, ROPE_Y - 80);
        for (const pp of pops.current) {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.88)";
          const w = ctx.measureText(pp.text).width + 16;
          ctx.fillRect(W / 2 - w / 2, 180 - 22, w, 30);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2, 180);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const down = useCallback(() => {
    if (gRef.current.over) return;
    setTouched(true);
    input.current.push("down");
  }, []);
  const up = useCallback(() => {
    input.current.push("up");
  }, []);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key !== " " || e.repeat) return;
      e.preventDefault();
      down();
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      e.preventDefault();
      up();
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [down, up]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="tug-of-war"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
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
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); down(); }}
          onPointerUp={up}
          onPointerCancel={up}
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
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.time.toFixed(1))}</p> : null}
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
