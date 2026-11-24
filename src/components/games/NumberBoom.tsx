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
import { BOOM_SLUG, BOOM_STAGES, RUN_SECONDS, STAGE_COUNT, buy, cost, newRun, rate, shortNumber, starsFor, step, tap, type Run } from "../../lib/games/number-boom";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; target: string; time: string; perSec: string; start: string; tap: string; add: string; mul: string; win: string; lose: string; result: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}번째 판", target: "목표 {0}", time: "{0}초", perSec: "초당 {0}", start: "기계를 눌러 업그레이드하고, 큰 버튼을 두드려요!", tap: "두드리기", add: "+{0}/초", mul: "×{0}",
    win: "펑! 목표 돌파", lose: "1분이 끝났어요", result: "{0} 모음", again: "다시 하기", next: "다음 판",
    help: "1분짜리 판 30개, 다 합쳐 30분이면 숫자가 백에서 '양'(10의 28제곱)을 넘어가요. 판마다 기계가 한 줄로 이어져 있어요. 첫 기계는 1초마다 동전을 만들고, 뒤의 기계는 흘러오는 양을 곱해요. 기계를 누르면 동전을 내고 한 단계 올려요. 첫 기계는 더하고, 나머지는 곱하고, 단계가 오를수록 값이 비싸져요. 같은 값이면 어디에 쓰는 게 가장 많이 늘리는지가 판의 승부예요. 기다리는 동안 큰 버튼을 두드리면 조금 더 모여요. 1분 안에 목표 숫자를 넘기면 통과예요. (키보드: 숫자 1~6 업그레이드, 스페이스 두드리기)",
    stages: "판 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Run {0}", target: "Target {0}", time: "{0}s", perSec: "{0}/s", start: "Tap a machine to upgrade it, and drum the big button!", tap: "TAP", add: "+{0}/s", mul: "×{0}",
    win: "Boom! Target smashed", lose: "The minute is up", result: "{0} collected", again: "Try again", next: "Next run",
    help: "Thirty one-minute runs — half an hour in all — and the number climbs from hundreds to thirty-odd zeros. Each run is a chain of machines: the first makes coins every second, every one after it multiplies what flows through. Tap a machine to pay for its next level: the first adds, the rest multiply, and each level costs more than the last. Where your coins do the most good is the whole game. Drum the big button for a little extra while you wait. Pass the target within the minute. (Keyboard: 1–6 to upgrade, Space to tap.)",
    stages: "Choose a run", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "第{0}ラン", target: "目標 {0}", time: "{0}秒", perSec: "毎秒 {0}", start: "機械を押して強化、大きなボタンを連打！", tap: "連打", add: "+{0}/秒", mul: "×{0}",
    win: "ドカン！目標突破", lose: "1分が終わった", result: "{0} 集めた", again: "もう一度", next: "次のラン",
    help: "1分のランが30本、全部で30分で、数字は百から「穣」（10の28乗）を超えます。各ランは機械が一列につながっています。最初の機械は毎秒コインを作り、その後の機械は流れてくる量を掛け算します。機械を押すとコインを払って1段階上げます。最初の機械は足し算、残りは掛け算で、段階が上がるほど高くなります。コインをどこに使えば一番増えるかが勝負。待つ間は大きなボタンを連打すると少し増えます。1分以内に目標を超えればクリア。（キーボード：1〜6で強化、スペースで連打）",
    stages: "ランを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}局", target: "目标 {0}", time: "{0}秒", perSec: "每秒 {0}", start: "点机器升级，再狂点大按钮！", tap: "狂点", add: "+{0}/秒", mul: "×{0}",
    win: "砰！突破目标", lose: "1分钟到了", result: "攒了 {0}", again: "再来一次", next: "下一局",
    help: "30局各1分钟，合起来30分钟，数字从几百一路涨过“穰”（10的28次方）。每局是一排连起来的机器：第一台每秒造金币，后面每一台都把流过来的量乘上去。点机器就付钱升一级：第一台是加，其余是乘，等级越高越贵。钱花在哪里涨得最多，就是这局的关键。等待时狂点大按钮能多攒一点。1分钟内超过目标就过关。（键盘：数字1~6升级，空格狂点）",
    stages: "选择局", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Partie {0}", target: "Objectif {0}", time: "{0} s", perSec: "{0}/s", start: "Touchez une machine pour l'améliorer, et martelez le gros bouton !", tap: "TAPER", add: "+{0}/s", mul: "×{0}",
    win: "Boum ! Objectif pulvérisé", lose: "La minute est finie", result: "{0} récoltés", again: "Réessayer", next: "Partie suivante",
    help: "Trente parties d'une minute — une demi-heure en tout — et le nombre grimpe des centaines à plus de trente zéros. Chaque partie est une chaîne de machines : la première fabrique des pièces chaque seconde, chacune des suivantes multiplie ce qui passe. Touchez une machine pour payer son niveau suivant : la première additionne, les autres multiplient, et chaque niveau coûte plus cher. Tout l'enjeu est de placer vos pièces là où elles rapportent le plus. Martelez le gros bouton pour un petit bonus en attendant. Dépassez l'objectif dans la minute. (Clavier : 1–6 pour améliorer, Espace pour taper.)",
    stages: "Choisir une partie", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Partida {0}", target: "Meta {0}", time: "{0} s", perSec: "{0}/s", start: "¡Toca una máquina para mejorarla y aporrea el botón grande!", tap: "TOCA", add: "+{0}/s", mul: "×{0}",
    win: "¡Bum! Meta superada", lose: "Se acabó el minuto", result: "{0} reunidas", again: "Reintentar", next: "Siguiente partida",
    help: "Treinta partidas de un minuto —media hora en total— y el número sube de cientos a más de treinta ceros. Cada partida es una cadena de máquinas: la primera fabrica monedas cada segundo y cada una de las siguientes multiplica lo que pasa. Toca una máquina para pagar su siguiente nivel: la primera suma, las demás multiplican, y cada nivel cuesta más. Todo el juego es gastar donde más rinde. Aporrea el botón grande para sacar algo extra mientras esperas. Supera la meta dentro del minuto. (Teclado: 1–6 para mejorar, Espacio para tocar.)",
    stages: "Elegir partida", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:number-boom:muted";
const W = 360;
const H = 560;
const ROW_Y = 150;
const ROW_H = 46;
const TAP_BOX = { x: 70, y: 450, w: 220, h: 90 };
const MACHINE_COLOURS = ["#ffd43b", "#ff922b", "#ff6b6b", "#cc5de8", "#5c7cfa", "#22b8cf"];

interface Pop { text: string; t: number; x: number; y: number }
type Input = { kind: "buy"; i: number } | { kind: "tap" };

export default function NumberBoom({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; coins: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rRef = useRef<Run>(newRun(BOOM_STAGES[0]));
  const input = useRef<Input[]>([]);
  const started = useRef(false);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const st = BOOM_STAGES[stage];

  useRunRecord(BOOM_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    rRef.current = newRun(BOOM_STAGES[s]);
    input.current = [];
    started.current = false;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(BOOM_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if (ev.key === " ") {
        ev.preventDefault();
        if (!ev.repeat) input.current.push({ kind: "tap" });
        setTouched(true);
      } else if (/^[1-6]$/.test(ev.key)) {
        input.current.push({ kind: "buy", i: Number(ev.key) - 1 });
        setTouched(true);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const r = rRef.current;
      const s = r.stage;
      const loc = localeRef.current;
      const cp = copyRef.current;
      const end = () => {
        setOver({ won: r.won, stars: starsFor(r), coins: r.peak });
        if (r.won) {
          setCleared(markStageCleared(BOOM_SLUG, s.stage, STAGE_COUNT));
          spawnBurst(parts.current, W / 2, 70, ["#ffd43b", "#ff6b6b", "#fff", "#cc5de8"], 40, 180, 3);
          sfx("win");
        } else sfx("lose");
      };
      // input is read once per frame
      for (const e of input.current.splice(0)) {
        if (r.over) break;
        started.current = true;
        if (e.kind === "tap") {
          const g = tap(r);
          pops.current.push({ text: `+${shortNumber(g, loc)}`, t: 0.6, x: TAP_BOX.x + 30 + ((r.taps * 37) % (TAP_BOX.w - 60)), y: TAP_BOX.y });
          sfx("tap");
        } else if (e.i < s.machines.length && buy(r, e.i)) {
          spawnBurst(parts.current, W - 60, ROW_Y + e.i * (ROW_H + 8) + ROW_H / 2, [MACHINE_COLOURS[e.i]], 8, 90, 2);
          sfx("place");
        }
        if (r.over) end();
      }
      if (started.current && !r.over) {
        step(r, dt);
        if (r.over) end();
      }
      stepParticles(parts.current, dt, 40);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#1a1b2e";
        ctx.fillRect(0, 0, W, H);
        // the big number, and how far it is to the target
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 40px sans-serif";
        ctx.fillText(shortNumber(r.coins, loc), W / 2, 64);
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#ced4da";
        ctx.fillText(`${fill(cp.perSec, shortNumber(rate(r), loc))} · ${fill(cp.target, shortNumber(s.target, loc))}`, W / 2, 88);
        const prog = Math.min(1, Math.log10(1 + r.peak) / Math.log10(1 + s.target));
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(20, 102, W - 40, 10);
        ctx.fillStyle = "#ffd43b";
        ctx.fillRect(20, 102, (W - 40) * prog, 10);
        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(20, 118, (W - 40) * Math.max(0, 1 - r.t / RUN_SECONDS), 4);
        // the chain of machines, each with what it does and what its next level costs
        s.machines.forEach((m, i) => {
          const y = ROW_Y + i * (ROW_H + 8);
          const c0 = cost(r, i);
          const can = r.coins >= c0 && !r.over;
          ctx.fillStyle = can ? "#2b2d4a" : "#212238";
          ctx.fillRect(14, y, W - 28, ROW_H);
          ctx.fillStyle = MACHINE_COLOURS[i];
          ctx.fillRect(14, y, 8, ROW_H);
          ctx.textAlign = "left";
          ctx.font = "bold 15px sans-serif";
          ctx.fillStyle = "#fff";
          const effect = i === 0 ? fill(cp.add, shortNumber(m.base * r.levels[0], loc)) : fill(cp.mul, (1 + m.step * r.levels[i]).toFixed(2));
          ctx.fillText(`${i + 1}  Lv${r.levels[i]}  ${effect}`, 30, y + 20);
          ctx.font = "12px sans-serif";
          ctx.fillStyle = can ? "#8ce99a" : "#868e96";
          ctx.fillText(`→ ${shortNumber(c0, loc)}`, 30, y + 38);
          if (i < s.machines.length - 1) {
            ctx.fillStyle = "#495057";
            ctx.fillRect(W / 2 - 2, y + ROW_H, 4, 8);
          }
        });
        // the big button
        ctx.fillStyle = "#e03131";
        ctx.fillRect(TAP_BOX.x, TAP_BOX.y + 6, TAP_BOX.w, TAP_BOX.h - 6);
        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(TAP_BOX.x, TAP_BOX.y, TAP_BOX.w, TAP_BOX.h - 12);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(cp.tap, W / 2, TAP_BOX.y + 48);
        ctx.font = "13px sans-serif";
        ctx.fillText(fill(cp.time, Math.max(0, Math.ceil(RUN_SECONDS - r.t))), W / 2, TAP_BOX.y + 68);
        drawParticles(ctx, parts.current);
        for (const pp of pops.current) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = `rgba(255,224,102,${Math.min(1, pp.t * 2)})`;
          ctx.fillText(pp.text, pp.x, pp.y - (0.6 - pp.t) * 50);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = rRef.current;
    if (r.over) return;
    const b = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - b.left) * W) / b.width;
    const y = ((e.clientY - b.top) * H) / b.height;
    setTouched(true);
    if (x >= TAP_BOX.x && x <= TAP_BOX.x + TAP_BOX.w && y >= TAP_BOX.y && y <= TAP_BOX.y + TAP_BOX.h) {
      input.current.push({ kind: "tap" });
      return;
    }
    const i = Math.floor((y - ROW_Y) / (ROW_H + 8));
    if (i >= 0 && i < r.stage.machines.length && y - ROW_Y - i * (ROW_H + 8) <= ROW_H) input.current.push({ kind: "buy", i });
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
      data-game="number-boom"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.target, shortNumber(st.target, locale))}</Badge>
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
          onPointerDown={onDown}
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
            <p className="text-sm text-muted-foreground">{fill(c.result, shortNumber(over.coins, locale))}</p>
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
