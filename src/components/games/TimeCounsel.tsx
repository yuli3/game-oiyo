// Counsel Against Time v2 (2026-11-23): a real-time cross-check on a canvas.
// Evidence is pinned above the witness stand; statements arrive as chips and
// you tap the one chip that contradicts the evidence before the jury loses
// patience. Hook (design lens): addictive one-more-trial + "spot the lie"
// clips. Logic: lib/games/time-counsel.

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
  CATS, GAME_ID, HEARTS, STAGE_COUNT, begin, newRun, object, stars, tick,
  type Cat, type Outcome, type RunState,
} from "../../lib/games/time-counsel";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";
const MUTE_KEY = "oiyo:time-counsel:muted";
const fill = (s: string, ...v: (string | number)[]) => v.reduce<string>((acc, x, i) => acc.replace(`{${i}}`, String(x)), s);

const ICON: Record<string, string> = {
  sun: "☀️", rain: "🌧️", snow: "❄️", fog: "🌫️",
  dawn: "🌅", noon: "🕛", dusk: "🌇", night: "🌙",
  market: "🛒", bridge: "🌉", harbor: "⚓", station: "🚉",
  walk: "🚶", bike: "🚲", taxi: "🚕", bus: "🚌",
};

type Words = Record<string, string>;
const WORDS: Record<L, Words & Record<Cat, string>> = {
  ko: { weather: "날씨", time: "시간", place: "장소", ride: "이동", sun: "맑음", rain: "비", snow: "눈", fog: "안개", dawn: "새벽", noon: "정오", dusk: "해질녘", night: "밤", market: "시장", bridge: "다리", harbor: "항구", station: "역", walk: "걸어서", bike: "자전거", taxi: "택시", bus: "버스" },
  en: { weather: "Weather", time: "Time", place: "Place", ride: "Travel", sun: "Sunny", rain: "Rain", snow: "Snow", fog: "Fog", dawn: "Dawn", noon: "Noon", dusk: "Dusk", night: "Night", market: "Market", bridge: "Bridge", harbor: "Harbor", station: "Station", walk: "On foot", bike: "Bike", taxi: "Taxi", bus: "Bus" },
  ja: { weather: "天気", time: "時間", place: "場所", ride: "移動", sun: "晴れ", rain: "雨", snow: "雪", fog: "霧", dawn: "夜明け", noon: "正午", dusk: "夕暮れ", night: "夜", market: "市場", bridge: "橋", harbor: "港", station: "駅", walk: "徒歩", bike: "自転車", taxi: "タクシー", bus: "バス" },
  zh: { weather: "天气", time: "时间", place: "地点", ride: "交通", sun: "晴", rain: "雨", snow: "雪", fog: "雾", dawn: "黎明", noon: "中午", dusk: "黄昏", night: "夜晚", market: "市场", bridge: "桥", harbor: "港口", station: "车站", walk: "步行", bike: "自行车", taxi: "出租车", bus: "公交" },
  fr: { weather: "Météo", time: "Heure", place: "Lieu", ride: "Trajet", sun: "Soleil", rain: "Pluie", snow: "Neige", fog: "Brouillard", dawn: "Aube", noon: "Midi", dusk: "Crépuscule", night: "Nuit", market: "Marché", bridge: "Pont", harbor: "Port", station: "Gare", walk: "À pied", bike: "Vélo", taxi: "Taxi", bus: "Bus" },
  es: { weather: "Clima", time: "Hora", place: "Lugar", ride: "Traslado", sun: "Sol", rain: "Lluvia", snow: "Nieve", fog: "Niebla", dawn: "Alba", noon: "Mediodía", dusk: "Atardecer", night: "Noche", market: "Mercado", bridge: "Puente", harbor: "Puerto", station: "Estación", walk: "A pie", bike: "Bici", taxi: "Taxi", bus: "Autobús" },
};

const COPY: Record<L, {
  trial: string; stmt: string; score: string; start: string; next: string; retry: string; won: string; lost: string; hint: string;
  stages: string; full: string; exitFull: string; mute: string; unmute: string; evidence: string; unknown: string;
  out: Record<Outcome, string>;
}> = {
  ko: {
    trial: "{0}번째 재판", stmt: "증언 {0} / {1}", score: "점수 {0}", start: "법정 입장", next: "다음 재판", retry: "다시 하기",
    won: "무죄 판결! 의뢰인을 지켰어요.", lost: "배심원이 등을 돌렸어요.", evidence: "증거", unknown: "모름",
    hint: "위의 증거판이 실제로 있었던 일이에요. 증인의 말이 도착하면 증거와 다른 칸 하나를 톡 눌러 반박하세요. 맞는 말에는 손대지 말고 흘려보내요. 숫자 키 1~4도 돼요.",
    stages: "재판 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    out: { caught: "반박 성공!", passed: "사실이네요", wrong: "기각!", missed: "거짓말이 통과했어요" },
  },
  en: {
    trial: "Trial {0}", stmt: "Statement {0} / {1}", score: "Score {0}", start: "Enter court", next: "Next trial", retry: "Try again",
    won: "Not guilty! Your client walks free.", lost: "The jury turned against you.", evidence: "Evidence", unknown: "Unknown",
    hint: "The evidence board above is what really happened. When a statement arrives, tap the one chip that contradicts the evidence. Leave true statements alone and let them pass. Keys 1–4 work too.",
    stages: "Pick a trial", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    out: { caught: "Contradiction!", passed: "That checks out", wrong: "Overruled!", missed: "A lie slipped by" },
  },
  ja: {
    trial: "{0}番目の裁判", stmt: "証言 {0} / {1}", score: "スコア {0}", start: "法廷に入る", next: "次の裁判", retry: "もう一度",
    won: "無罪判決！依頼人を守りました。", lost: "陪審員にそっぽを向かれました。", evidence: "証拠", unknown: "不明",
    hint: "上の証拠ボードが本当にあったことです。証言が届いたら、証拠と食い違うチップを一つタップして反論しましょう。正しい証言には触れずに通します。数字キー1〜4でもOK。",
    stages: "裁判を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    out: { caught: "矛盾を指摘！", passed: "事実ですね", wrong: "却下！", missed: "うそが通りました" },
  },
  zh: {
    trial: "第{0}场审判", stmt: "证词 {0} / {1}", score: "得分 {0}", start: "进入法庭", next: "下一场审判", retry: "再来一次",
    won: "无罪！你保护了委托人。", lost: "陪审团不再相信你。", evidence: "证据", unknown: "未知",
    hint: "上方的证据板是真实发生的事。证词出现后，点一下与证据矛盾的那一格来反驳。真话不要碰，让它过去。数字键1–4也可以。",
    stages: "选择审判", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    out: { caught: "找到矛盾！", passed: "属实", wrong: "驳回！", missed: "谎言溜过去了" },
  },
  fr: {
    trial: "Procès {0}", stmt: "Déclaration {0} / {1}", score: "Score {0}", start: "Entrer au tribunal", next: "Procès suivant", retry: "Réessayer",
    won: "Non coupable ! Votre client est libre.", lost: "Le jury s'est retourné contre vous.", evidence: "Preuves", unknown: "Inconnu",
    hint: "Le tableau des preuves montre ce qui s'est vraiment passé. Quand une déclaration arrive, touchez la pastille qui contredit les preuves. Laissez passer les déclarations vraies. Les touches 1–4 marchent aussi.",
    stages: "Choisir un procès", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    out: { caught: "Contradiction !", passed: "C'est exact", wrong: "Rejeté !", missed: "Un mensonge est passé" },
  },
  es: {
    trial: "Juicio {0}", stmt: "Declaración {0} / {1}", score: "Puntos {0}", start: "Entrar al tribunal", next: "Siguiente juicio", retry: "Reintentar",
    won: "¡Inocente! Tu cliente sale libre.", lost: "El jurado se volvió en tu contra.", evidence: "Pruebas", unknown: "Desconocido",
    hint: "El tablero de pruebas muestra lo que pasó de verdad. Cuando llegue una declaración, toca la ficha que contradice las pruebas. No toques las declaraciones verdaderas y déjalas pasar. Las teclas 1–4 también valen.",
    stages: "Elegir juicio", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    out: { caught: "¡Contradicción!", passed: "Es cierto", wrong: "¡Denegado!", missed: "Se coló una mentira" },
  },
};

const W = 360;
const H = 380;
const DPR = 2;
const CHIP_W = 80;
const CHIP_H = 70;
const CHIP_GAP = 6;
const BUBBLE_Y = 186;
const ENTER_S = 0.25;

function boop(ctx: AudioContext | null, freq: number, vol = 0.14, type: OscillatorType = "triangle", len = 0.12) {
  if (!ctx) return;
  const when = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  o.frequency.exponentialRampToValueAtTime(freq * 0.7, when + len);
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + len + 0.02);
  o.connect(g).connect(ctx.destination);
  o.start(when);
  o.stop(when + len + 0.04);
}

/** Left x of chip j for a statement of n chips, given the bubble's slide offset. */
function chipX(n: number, j: number, offset: number): number {
  const total = n * CHIP_W + (n - 1) * CHIP_GAP;
  return (W - total) / 2 + j * (CHIP_W + CHIP_GAP) + offset;
}

function slideOffset(t: number, travel: number): number {
  if (t < 0) return W;
  if (t < ENTER_S) return W * (1 - t / ENTER_S) ** 2;
  if (t > travel - ENTER_S) return -W * ((t - (travel - ENTER_S)) / ENTER_S) ** 2;
  return 0;
}

export default function TimeCounsel({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const w = WORDS[locale] ?? WORDS.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });
  const [run, setRun] = useState<RunState>(() => newRun(0));
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const runRef = useRef(run);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const flash = useRef<{ outcome: Outcome; t: number; chip: number; chips: { cat: Cat; val: string }[] } | null>(null);
  const prevStatus = useRef(run.status);

  const load = useCallback((i: number) => {
    const s = newRun(i);
    runRef.current = s;
    flash.current = null;
    setRun(s);
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
      setCleared(markStageCleared(GAME_ID, run.trial.index, STAGE_COUNT));
      try { recordResult(GAME_ID, "w"); recordBest(GAME_ID, run.trial.index + 1, "score"); } catch { /* storage blocked */ }
      haptics.current?.fire("win");
    } else if (run.status === "lost") {
      try { recordResult(GAME_ID, "l"); } catch { /* storage blocked */ }
      haptics.current?.fire("fail");
    }
  }, [run.status, run.trial.index]);

  const ensureAudio = () => {
    if (audio.current) return audio.current;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audio.current = Ctx ? new Ctx() : null;
    } catch { audio.current = null; }
    return audio.current;
  };
  const sound = (f: number, v?: number, t?: OscillatorType, l?: number) => { if (!mutedRef.current) boop(audio.current, f, v, t, l); };

  const react = (before: RunState, after: RunState, chip: number) => {
    const outcome = after.outcomes[after.outcomes.length - 1];
    if (!outcome || after.outcomes.length === before.outcomes.length) return;
    const st = before.trial.statements[before.at]!;
    flash.current = { outcome, t: 0, chip, chips: st.chips };
    if (outcome === "caught") { sound(660, 0.16, "square", 0.08); setTimeout(() => sound(990, 0.14, "square", 0.1), 80); haptics.current?.fire("success"); }
    else if (outcome === "passed") sound(440, 0.06, "sine", 0.06);
    else { sound(120, 0.2, "sawtooth", 0.3); haptics.current?.fire("fail"); }
  };

  const start = () => {
    ensureAudio();
    void audio.current?.resume().catch(() => undefined);
    const s = begin(runRef.current);
    runRef.current = s;
    setRun(s);
    canvasRef.current?.focus();
  };

  const objectTo = (j: number) => {
    const s = runRef.current;
    const next = object(s, j);
    if (next === s) return;
    runRef.current = next;
    react(s, next, j);
    setRun(next);
  };
  const objectToRef = useRef(objectTo);
  objectToRef.current = objectTo;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let time = 0;
    let hudAt = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      let s = runRef.current;
      if (s.status === "play") {
        const next = tick(s, dt);
        if (next.outcomes.length !== s.outcomes.length) { react(s, next, -1); setRun(next); }
        else if (now - hudAt > 150) { hudAt = now; setRun(next); }
        s = next;
        runRef.current = s;
      }
      if (flash.current) { flash.current.t += dt; if (flash.current.t > 0.9) flash.current = null; }

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        // courtroom wood
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, "#3b2a20");
        bg.addColorStop(1, "#6b4a32");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
        for (let y = 0; y < H; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + 4); ctx.stroke(); }
        // evidence board
        ctx.fillStyle = "#e8dcc0";
        ctx.beginPath(); ctx.roundRect(10, 10, W - 20, 112, 10); ctx.fill();
        ctx.fillStyle = "#5b4636"; ctx.font = "800 12px system-ui"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText(`📌 ${c.evidence}`, 20, 28);
        CATS.forEach((cat, k) => {
          const x = 18 + k * 82;
          const val = s.trial.evidence[cat];
          ctx.fillStyle = val ? "#fffaf0" : "rgba(255,255,255,0.35)";
          ctx.beginPath(); ctx.roundRect(x, 36, 76, 78, 8); ctx.fill();
          ctx.strokeStyle = val ? "#8a6d4c" : "rgba(90,70,54,0.35)"; ctx.setLineDash(val ? [] : [4, 3]); ctx.lineWidth = 1.5;
          ctx.stroke(); ctx.setLineDash([]);
          ctx.textAlign = "center";
          ctx.fillStyle = "#7a6450"; ctx.font = "700 10px system-ui";
          ctx.fillText(w[cat], x + 38, 50);
          ctx.font = "26px system-ui";
          ctx.fillText(val ? ICON[val]! : "❔", x + 38, 84);
          ctx.fillStyle = "#3b2f25"; ctx.font = "700 11px system-ui";
          ctx.fillText(val ? w[val]! : c.unknown, x + 38, 104);
        });
        // witness stand
        ctx.fillStyle = "#4a3324";
        ctx.fillRect(0, 330, W, 50);
        ctx.fillStyle = "#7d5a3c";
        ctx.fillRect(0, 322, W, 10);
        const bob = Math.sin(time * 3) * 2;
        ctx.font = "44px system-ui"; ctx.textAlign = "center";
        const face = flash.current?.outcome === "caught" ? "😰" : flash.current?.outcome === "missed" ? "😏" : "🧐";
        ctx.fillText(face, 60, 318 + bob);
        ctx.fillText("⚖️", W - 50, 315);
        // statement bubble
        const st = s.trial.statements[Math.min(s.at, s.trial.statements.length - 1)];
        if (s.status === "play" && st && s.t >= 0) {
          const off = slideOffset(s.t, s.trial.travelS);
          const n = st.chips.length;
          const x0 = chipX(n, 0, off) - 10;
          const bw = n * CHIP_W + (n - 1) * CHIP_GAP + 20;
          ctx.fillStyle = "#fffdf6";
          ctx.beginPath(); ctx.roundRect(x0, BUBBLE_Y - 12, bw, CHIP_H + 24, 14); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x0 + 30, BUBBLE_Y + CHIP_H + 12); ctx.lineTo(x0 + 18, BUBBLE_Y + CHIP_H + 34); ctx.lineTo(x0 + 50, BUBBLE_Y + CHIP_H + 12); ctx.fill();
          st.chips.forEach((ch, j) => {
            const x = chipX(n, j, off);
            ctx.fillStyle = "#f1ebe0";
            ctx.beginPath(); ctx.roundRect(x, BUBBLE_Y, CHIP_W, CHIP_H, 10); ctx.fill();
            ctx.strokeStyle = "#c9b79c"; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.textAlign = "center";
            ctx.fillStyle = "#9a8670"; ctx.font = "700 9px system-ui";
            ctx.fillText(`${j + 1} · ${w[ch.cat]}`, x + CHIP_W / 2, BUBBLE_Y + 13);
            ctx.font = "24px system-ui";
            ctx.fillText(ICON[ch.val]!, x + CHIP_W / 2, BUBBLE_Y + 42);
            ctx.fillStyle = "#2b211a"; ctx.font = "800 11px system-ui";
            ctx.fillText(w[ch.val]!, x + CHIP_W / 2, BUBBLE_Y + 61);
          });
          // jury patience fuse
          const left = 1 - s.t / s.trial.travelS;
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.beginPath(); ctx.roundRect(30, 140, W - 60, 10, 5); ctx.fill();
          ctx.fillStyle = left > 0.35 ? "#ffd166" : "#ef476f";
          ctx.beginPath(); ctx.roundRect(30, 140, Math.max(4, (W - 60) * left), 10, 5); ctx.fill();
          ctx.font = "16px system-ui"; ctx.fillText("🔥", 30 + (W - 60) * left, 152);
        }
        // outcome flash
        const f = flash.current;
        if (f) {
          const k = f.t / 0.9;
          const good = f.outcome === "caught" || f.outcome === "passed";
          if (f.outcome === "caught" || f.outcome === "wrong") {
            const n = f.chips.length;
            const x = chipX(n, Math.max(0, f.chip), 0);
            ctx.strokeStyle = f.outcome === "caught" ? `rgba(47,158,68,${1 - k})` : `rgba(224,49,49,${1 - k})`;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.roundRect(x - k * 8, BUBBLE_Y - k * 8, CHIP_W + k * 16, CHIP_H + k * 16, 12); ctx.stroke();
          }
          ctx.save();
          ctx.translate(W / 2, BUBBLE_Y + 44);
          ctx.rotate(-0.12);
          const scale = 1 + (1 - Math.min(1, f.t * 6)) * 0.6;
          ctx.scale(scale, scale);
          ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
          ctx.fillStyle = good ? (f.outcome === "caught" ? "#2f9e44" : "rgba(255,255,255,0.75)") : "#e03131";
          ctx.font = f.outcome === "passed" ? "700 18px system-ui" : "900 30px system-ui";
          ctx.textAlign = "center";
          if (f.outcome !== "passed") { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 5; ctx.strokeText(c.out[f.outcome], 0, 0); }
          ctx.fillText(c.out[f.outcome], 0, 0);
          ctx.restore();
          ctx.globalAlpha = 1;
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // copy is stable per locale; sim state lives in refs
  }, [c, w]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const s = runRef.current;
    if (s.status !== "play" || s.t < 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    const st = s.trial.statements[s.at];
    if (!st || y < BUBBLE_Y - 14 || y > BUBBLE_Y + CHIP_H + 14) return;
    const off = slideOffset(s.t, s.trial.travelS);
    for (let j = 0; j < st.chips.length; j++) {
      const cx = chipX(st.chips.length, j, off);
      if (x >= cx - 3 && x <= cx + CHIP_W + 3) { objectTo(j); return; }
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (runRef.current.status === "ready" && (e.key === " " || e.key === "Enter")) { e.preventDefault(); start(); }
  };

  // number keys object anywhere on the page while a trial is running
  useEffect(() => {
    const onDocKey = (e: KeyboardEvent) => {
      if (runRef.current.status !== "play") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) { e.preventDefault(); objectToRef.current(n - 1); }
    };
    window.addEventListener("keydown", onDocKey);
    return () => window.removeEventListener("keydown", onDocKey);
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const st = stars(run);
  const total = run.trial.statements.length;

  return (
    <div
      ref={containerRef}
      data-game="time-counsel"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.trial, run.trial.index + 1)} / {STAGE_COUNT}</Badge>
        <Badge variant="outline">{fill(c.stmt, Math.min(run.at + 1, total), total)}</Badge>
        <Badge variant="outline" aria-label={`${run.hearts}/${HEARTS}`}>{"♥".repeat(Math.max(0, run.hearts))}{"♡".repeat(Math.max(0, HEARTS - run.hearts))}</Badge>
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
          onPointerDown={onPointerDown}
          className="mx-auto block w-full max-w-md touch-none select-none rounded-xl border border-border"
          aria-label={c.hint}
        />
        {run.status === "ready" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/80 p-4 text-center">
            <p className="text-2xl font-black">{fill(c.trial, run.trial.index + 1)}</p>
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
              <Button variant="outline" className="min-h-12" onClick={() => load(run.trial.index)}><RotateCcw className="size-4" /><span>{c.retry}</span></Button>
              <Button className="min-h-12" onClick={() => load(run.trial.index >= STAGE_COUNT - 1 ? 0 : run.trial.index + 1)}>
                {run.trial.index >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}
              </Button>
            </div>
          ) : (
            <Button className="min-h-12 w-full" onClick={() => load(run.trial.index)}><RotateCcw className="size-4" /><span>{c.retry}</span></Button>
          )}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{c.hint}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={run.trial.index} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
