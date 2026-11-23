// Untranslatable Creature v2 (2026-11-23): call-and-response rhythm on a
// canvas. The creature drums a phrase, then you tap it back on its belly in
// time. Hook (design lens): cute creature + "one more phrase" rhythm loop.
// Logic and timing judge: lib/games/untranslatable-creature.

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { readMutedPref, writeMutedPref } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { recordBest, recordResult } from "../../lib/games/records";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  GAME_ID, GOOD_MS, MOODS, STAGE_COUNT, answer, begin, judge, newRun, stars,
  type Grade, type Judged, type RunState,
} from "../../lib/games/untranslatable-creature";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";
const MUTE_KEY = "oiyo:untranslatable-creature:muted";
const fill = (s: string, ...v: (string | number)[]) => v.reduce<string>((acc, x, i) => acc.replace(`{${i}}`, String(x)), s);

const COPY: Record<L, {
  stage: string; phrase: string; score: string; listen: string; yours: string; ready: string; start: string; next: string; retry: string;
  won: string; lost: string; hint: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
  grade: Record<Grade, string>; pass: string; fail: string; tap: string;
}> = {
  ko: {
    stage: "{0}번째 만남", phrase: "말 {0} / {1}", score: "점수 {0}", listen: "듣는 중…", yours: "따라 치세요!", ready: "준비…",
    start: "만나러 가기", next: "다음 만남", retry: "다시 하기", won: "생물이 당신 말을 알아들었어요!", lost: "생물이 토라져서 숨었어요",
    hint: "생물이 배를 두드려 리듬으로 말해요. 끝나면 같은 리듬을 박자에 맞춰 화면(생물 배)을 톡톡 두드려 대답하세요. 스페이스 키도 돼요.",
    stages: "만남 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    grade: { perfect: "완벽", good: "좋아", miss: "놓침" }, pass: "통했다! ♥", fail: "갸우뚱?", tap: "두드리기",
  },
  en: {
    stage: "Meeting {0}", phrase: "Phrase {0} / {1}", score: "Score {0}", listen: "Listening…", yours: "Your turn!", ready: "Ready…",
    start: "Go meet it", next: "Next meeting", retry: "Try again", won: "The creature understood you!", lost: "The creature got upset and hid",
    hint: "The creature talks by drumming its belly. When it stops, tap the same rhythm back on the screen (its belly) in time. Space works too.",
    stages: "Pick a meeting", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    grade: { perfect: "Perfect", good: "Good", miss: "Miss" }, pass: "Understood! ♥", fail: "Huh?", tap: "Tap",
  },
  ja: {
    stage: "{0}回目の出会い", phrase: "ことば {0} / {1}", score: "スコア {0}", listen: "聞いています…", yours: "まねして！", ready: "準備…",
    start: "会いに行く", next: "次の出会い", retry: "もう一度", won: "生き物があなたの言葉をわかってくれました！", lost: "生き物がすねて隠れました",
    hint: "生き物はお腹をたたいてリズムで話します。終わったら同じリズムを拍に合わせて画面（お腹）をトントンたたいて答えましょう。スペースキーでもOK。",
    stages: "出会いを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    grade: { perfect: "完璧", good: "いいね", miss: "ミス" }, pass: "通じた！♥", fail: "はて？", tap: "たたく",
  },
  zh: {
    stage: "第{0}次见面", phrase: "话语 {0} / {1}", score: "得分 {0}", listen: "正在听…", yours: "跟着敲！", ready: "准备…",
    start: "去见它", next: "下一次见面", retry: "再来一次", won: "小生物听懂你的话了！", lost: "小生物生气躲起来了",
    hint: "小生物拍肚子用节奏说话。它停下后，按节拍在屏幕（它的肚子）上敲出同样的节奏来回答。空格键也可以。",
    stages: "选择见面", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    grade: { perfect: "完美", good: "不错", miss: "错过" }, pass: "听懂了！♥", fail: "嗯？", tap: "敲",
  },
  fr: {
    stage: "Rencontre {0}", phrase: "Phrase {0} / {1}", score: "Score {0}", listen: "Écoute…", yours: "À vous !", ready: "Prêt…",
    start: "Aller le voir", next: "Rencontre suivante", retry: "Réessayer", won: "La créature vous a compris !", lost: "La créature s'est vexée et cachée",
    hint: "La créature parle en tapant sur son ventre. Quand elle s'arrête, tapez le même rythme sur l'écran (son ventre), en mesure. La barre d'espace marche aussi.",
    stages: "Choisir une rencontre", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    grade: { perfect: "Parfait", good: "Bien", miss: "Raté" }, pass: "Compris ! ♥", fail: "Hein ?", tap: "Taper",
  },
  es: {
    stage: "Encuentro {0}", phrase: "Frase {0} / {1}", score: "Puntos {0}", listen: "Escuchando…", yours: "¡Tu turno!", ready: "Listo…",
    start: "Ir a verla", next: "Siguiente encuentro", retry: "Reintentar", won: "¡La criatura te entendió!", lost: "La criatura se enfadó y se escondió",
    hint: "La criatura habla tamborileando su barriga. Cuando pare, toca el mismo ritmo en la pantalla (su barriga) a tiempo. La barra espaciadora también vale.",
    stages: "Elegir encuentro", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    grade: { perfect: "Perfecto", good: "Bien", miss: "Fallo" }, pass: "¡Entendido! ♥", fail: "¿Eh?", tap: "Tocar",
  },
};

const W = 360;
const H = 420;
const DPR = 2;
const CX = 180;
const CY = 200;

type Phase = "idle" | "listen" | "gap" | "answer" | "result";
interface Timeline { phase: Phase; t0: number; result: Judged | null; taps: number[]; pulse: number; tapPulse: number; ripples: { t: number }[] }

function boop(ctx: AudioContext | null, when: number, freq: number, vol = 0.18, type: OscillatorType = "triangle") {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, when + 0.12);
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
  o.connect(g).connect(ctx.destination);
  o.start(when);
  o.stop(when + 0.18);
}

function drawCreature(ctx: CanvasRenderingContext2D, time: number, pulse: number, mood: "idle" | "happy" | "confused" | "listening", hue: number) {
  const squash = 1 + pulse * 0.12;
  const breathe = Math.sin(time * 2) * 3;
  ctx.save();
  ctx.translate(CX, CY + breathe);
  // glow
  const glow = ctx.createRadialGradient(0, 0, 20, 0, 0, 140);
  glow.addColorStop(0, `hsla(${hue},90%,75%,${0.35 + pulse * 0.4})`);
  glow.addColorStop(1, `hsla(${hue},90%,60%,0)`);
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, 140, 0, Math.PI * 2); ctx.fill();
  // antennae
  ctx.strokeStyle = `hsl(${hue},55%,45%)`; ctx.lineWidth = 4; ctx.lineCap = "round";
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 22, -62); ctx.quadraticCurveTo(s * 40, -100 - pulse * 10, s * 30 + Math.sin(time * 3 + s) * 6, -112);
    ctx.stroke();
    ctx.fillStyle = `hsl(${(hue + 60) % 360},95%,70%)`;
    ctx.beginPath(); ctx.arc(s * 30 + Math.sin(time * 3 + s) * 6, -114, 7 + pulse * 3, 0, Math.PI * 2); ctx.fill();
  }
  // body
  ctx.scale(squash, 1 / squash);
  const body = ctx.createRadialGradient(-20, -30, 10, 0, 0, 80);
  body.addColorStop(0, `hsl(${hue},90%,88%)`);
  body.addColorStop(1, `hsl(${hue},60%,58%)`);
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(0, 0, 76, 70, 0, 0, Math.PI * 2); ctx.fill();
  // belly drum
  ctx.fillStyle = `hsla(${(hue + 30) % 360},80%,92%,${0.7 + pulse * 0.3})`;
  ctx.beginPath(); ctx.ellipse(0, 26, 38, 28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `hsla(${hue},50%,40%,0.4)`; ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 26, 10 + k * 8, 0.2, Math.PI - 0.2); ctx.stroke(); }
  // eyes
  const blink = Math.sin(time * 0.9) > 0.97;
  for (const s of [-1, 1]) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(s * 26, -18, 16, blink ? 2 : 18, 0, 0, Math.PI * 2); ctx.fill();
    if (!blink) {
      ctx.fillStyle = "#1c1b2e";
      const look = mood === "listening" ? -3 : 0;
      ctx.beginPath(); ctx.arc(s * 26 + (mood === "confused" ? s * 4 : 0), -14 + look, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(s * 26 + 3, -18 + look, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  // mouth
  ctx.strokeStyle = "#1c1b2e"; ctx.lineWidth = 3;
  ctx.beginPath();
  if (mood === "happy") ctx.arc(0, 2, 10, 0.1 * Math.PI, 0.9 * Math.PI);
  else if (mood === "confused") { ctx.moveTo(-8, 8); ctx.quadraticCurveTo(-2, 2, 2, 8); ctx.quadraticCurveTo(6, 13, 10, 7); }
  else ctx.arc(0, 4, 5 + pulse * 6, 0, Math.PI * 2);
  ctx.stroke();
  // cheeks
  ctx.fillStyle = "rgba(255,120,160,0.45)";
  ctx.beginPath(); ctx.ellipse(-46, 4, 9, 5, 0, 0, Math.PI * 2); ctx.ellipse(46, 4, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export default function UntranslatableCreature({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });
  const [run, setRun] = useState<RunState>(() => newRun(0));
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const runRef = useRef(run);
  runRef.current = run;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const tl = useRef<Timeline>({ phase: "idle", t0: 0, result: null, taps: [], pulse: 0, tapPulse: 0, ripples: [] });
  const prevStatus = useRef(run.status);

  const load = useCallback((i: number) => {
    setRun(newRun(i));
    tl.current = { phase: "idle", t0: 0, result: null, taps: [], pulse: 0, tapPulse: 0, ripples: [] };
    setPhase("idle");
  }, []);

  useEffect(() => {
    const done = loadClearedStages(GAME_ID, STAGE_COUNT);
    setCleared(done);
    load(nextOpenStage(done, STAGE_COUNT));
    setMuted(readMutedPref(MUTE_KEY));
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => { void audio.current?.close().catch(() => undefined); };
  }, [load]);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = run.status;
    if (prev === run.status) return;
    if (run.status === "won") {
      setCleared(markStageCleared(GAME_ID, run.stage.index, STAGE_COUNT));
      try { recordResult(GAME_ID, "w"); recordBest(GAME_ID, run.score, "score"); } catch { /* storage blocked */ }
      haptics.current?.fire("win");
    } else if (run.status === "lost") {
      try { recordResult(GAME_ID, "l"); } catch { /* storage blocked */ }
      haptics.current?.fire("fail");
    }
  }, [run.status, run.stage.index, run.score]);

  const ensureAudio = () => {
    if (audio.current) return audio.current;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audio.current = Ctx ? new Ctx() : null;
    } catch { audio.current = null; }
    return audio.current;
  };

  /** Start the creature's phrase for the current index. */
  const playPhrase = useCallback(() => {
    const s = runRef.current;
    const p = s.stage.phrases[s.at];
    if (!p) return;
    const a = ensureAudio();
    const now = performance.now();
    tl.current = { ...tl.current, phase: "listen", t0: now + 400, result: null, taps: [] };
    setPhase("listen");
    if (a && !mutedRef.current) {
      const base = a.currentTime + 0.4;
      p.beats.forEach((b, i) => { if (b) boop(a, base + (i * s.stage.stepMs) / 1000, 196, 0.22, "sine"); });
    }
  }, []);

  const start = () => {
    ensureAudio();
    void audio.current?.resume().catch(() => undefined);
    setRun((r) => begin(r));
    runRef.current = begin(runRef.current);
    playPhrase();
  };

  const tap = useCallback(() => {
    const t = tl.current;
    t.tapPulse = 1;
    t.ripples.push({ t: 0 });
    const a = audio.current;
    if (a && !mutedRef.current) boop(a, a.currentTime, 392, 0.16, "triangle");
    haptics.current?.fire("tap");
    if (t.phase === "answer") t.taps.push(performance.now() - t.t0);
  }, []);

  // timeline + render
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let time = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      const t = tl.current;
      const s = runRef.current;
      const p = s.stage.phrases[Math.min(s.at, s.stage.phrases.length - 1)]!;
      const step = s.stage.stepMs;
      const len = p.beats.length * step;
      const elapsed = now - t.t0;
      // creature drum pulse during listen
      if (t.phase === "listen") {
        const i = Math.floor(elapsed / step);
        const into = elapsed - i * step;
        if (i >= 0 && i < p.beats.length && p.beats[i] && into < 60) t.pulse = 1;
        if (elapsed >= len) { t.phase = "gap"; t.t0 = now; setPhase("gap"); }
      } else if (t.phase === "gap") {
        // two-step count-in with soft ticks
        const gapLen = step * 4;
        if (elapsed >= gapLen) { t.phase = "answer"; t.t0 = now; t.taps = []; setPhase("answer"); }
      } else if (t.phase === "answer") {
        if (elapsed >= len + GOOD_MS + 60) {
          const j = judge(p, step, t.taps);
          t.result = j;
          t.phase = "result";
          t.t0 = now;
          setPhase("result");
          const a = audio.current;
          if (a && !mutedRef.current) {
            if (j.passed) { boop(a, a.currentTime, 523, 0.14); boop(a, a.currentTime + 0.1, 784, 0.14); }
            else boop(a, a.currentTime, 150, 0.16, "sawtooth");
          }
          haptics.current?.fire(j.passed ? "success" : "fail");
          const next = answer(runRef.current, j);
          runRef.current = next;
          setRun(next);
        }
      } else if (t.phase === "result" && elapsed > 1100) {
        if (runRef.current.status === "play") playPhrase();
        else { t.phase = "idle"; setPhase("idle"); }
      }
      t.pulse = Math.max(0, t.pulse - dt * 6);
      t.tapPulse = Math.max(0, t.tapPulse - dt * 6);
      t.ripples = t.ripples.filter((r) => (r.t += dt) < 0.6);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#1b1638");
        sky.addColorStop(1, "#3b2d6b");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        for (let k = 0; k < 40; k++) {
          const sx = (k * 97) % W;
          const sy = (k * 53) % 220;
          ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(time * 2 + k)})`;
          ctx.fillRect(sx, sy, 2, 2);
        }
        ctx.fillStyle = "#2b5d4a";
        ctx.beginPath(); ctx.ellipse(CX, H + 40, 260, 120, 0, 0, Math.PI * 2); ctx.fill();
        // ripples from taps
        for (const r of t.ripples) {
          ctx.strokeStyle = `rgba(255,236,153,${1 - r.t / 0.6})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(CX, CY + 26, 30 + r.t * 120, 0, Math.PI * 2); ctx.stroke();
        }
        const mood = t.phase === "result" && t.result ? (t.result.passed ? "happy" : "confused") : t.phase === "answer" ? "listening" : "idle";
        drawCreature(ctx, time, Math.max(t.pulse, t.tapPulse), mood, 190 + s.stage.index * 5);
        // speech glyphs while it talks
        if (t.phase === "listen" && t.pulse > 0.6) {
          ctx.fillStyle = "rgba(255,236,153,0.9)";
          ctx.font = "700 22px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(["◉", "✦", "◈", "❖"][Math.floor(elapsed / step) % 4]!, CX + 70, CY - 80);
        }
        // beat lights
        const n = p.beats.length;
        const gapX = Math.min(40, (W - 40) / n);
        const x0 = CX - ((n - 1) * gapX) / 2;
        const curStep = t.phase === "listen" || t.phase === "answer" ? Math.floor(elapsed / step) : -1;
        const grades = t.result?.grades ?? [];
        let gi = 0;
        for (let i = 0; i < n; i++) {
          const x = x0 + i * gapX;
          const y = H - 44;
          const isDrum = p.beats[i] === 1;
          const showPattern = t.phase === "listen" || t.phase === "result";
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
          if (isDrum && showPattern) {
            let col = "#ffe066";
            if (t.phase === "result") { const g = grades[gi]; col = g === "perfect" ? "#69db7c" : g === "good" ? "#4dabf7" : "#ff6b6b"; }
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(x, y, i === curStep ? 12 : 9, 0, Math.PI * 2); ctx.fill();
          }
          if (isDrum) gi++;
          if (i === curStep) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.stroke(); }
        }
        if (t.phase === "gap") {
          const k = Math.floor(elapsed / step);
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.font = "800 30px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(k < 2 ? "…" : String(4 - k), CX, 60);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playPhrase]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter" || e.key === "j" || e.key === "f") { e.preventDefault(); if (run.status === "ready") start(); else tap(); }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const label = phase === "listen" ? c.listen : phase === "gap" ? c.ready : phase === "answer" ? c.yours : phase === "result" ? (tl.current.result?.passed ? c.pass : c.fail) : "";
  const st = stars(run);

  return (
    <div
      ref={containerRef}
      data-game="untranslatable-creature"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, run.stage.index + 1)} / {STAGE_COUNT}</Badge>
        <Badge variant="outline">{fill(c.phrase, Math.min(run.at + 1, run.stage.phrases.length), run.stage.phrases.length)}</Badge>
        <Badge variant="outline" aria-label={`${run.moods}/${MOODS}`}>{"♥".repeat(Math.max(0, run.moods))}{"♡".repeat(Math.max(0, MOODS - run.moods))}</Badge>
        <Badge variant="outline">{fill(c.score, run.score)}</Badge>
        <div className="ml-auto flex gap-1">
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
          width={W * DPR}
          height={H * DPR}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerDown={(e) => { e.preventDefault(); if (run.status === "play") tap(); }}
          className="mx-auto block w-full max-w-md touch-none select-none rounded-xl border border-border"
          aria-label={c.hint}
        />
        {label ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center" aria-live="polite">
            <span className="rounded-full bg-background px-3 py-1 text-sm font-bold text-foreground shadow">{label}</span>
          </div>
        ) : null}
        {run.status === "ready" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/80 p-4 text-center">
            <p className="text-2xl font-black">{fill(c.stage, run.stage.index + 1)}</p>
            <Button className="min-h-12 min-w-40" onClick={start}>{c.start}</Button>
          </div>
        ) : null}
      </div>

      {run.status === "won" || run.status === "lost" ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center" aria-live="polite">
          <p className="text-lg font-bold">{run.status === "won" ? c.won : c.lost}</p>
          {run.status === "won" ? <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p> : null}
          <p className="text-sm tabular-nums">{fill(c.score, run.score)}</p>
          {run.status === "won" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => load(run.stage.index)}><RotateCcw className="size-4" /><span>{c.retry}</span></Button>
              <Button className="min-h-12" onClick={() => load(run.stage.index >= STAGE_COUNT - 1 ? 0 : run.stage.index + 1)}>
                {run.stage.index >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}
              </Button>
            </div>
          ) : (
            <Button className="min-h-12 w-full" onClick={() => load(run.stage.index)}><RotateCcw className="size-4" /><span>{c.retry}</span></Button>
          )}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{c.hint}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={run.stage.index} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
