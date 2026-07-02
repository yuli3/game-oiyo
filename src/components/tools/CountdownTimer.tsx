import { useState, useEffect, useRef, useCallback } from "react";
import type { Locale } from "../../lib/i18n";

// ── Labels ──────────────────────────────────────────────────────────────────

interface Labels {
  title: string;
  tabStopwatch: string;
  tabCountdown: string;
  start: string;
  pause: string;
  reset: string;
  lap: string;
  lapNum: string;
  lapTime: string;
  totalTime: string;
  hours: string;
  minutes: string;
  seconds: string;
  spaceHint: string;
}

const L: Record<Locale, Labels> = {
  ko: {
    title: "타이머",
    tabStopwatch: "스톱워치",
    tabCountdown: "카운트다운",
    start: "시작",
    pause: "일시정지",
    reset: "리셋",
    lap: "랩",
    lapNum: "랩",
    lapTime: "랩 시간",
    totalTime: "누적 시간",
    hours: "시간",
    minutes: "분",
    seconds: "초",
    spaceHint: "스페이스바: 시작/일시정지",
  },
  en: {
    title: "Timer",
    tabStopwatch: "Stopwatch",
    tabCountdown: "Countdown",
    start: "Start",
    pause: "Pause",
    reset: "Reset",
    lap: "Lap",
    lapNum: "Lap",
    lapTime: "Lap Time",
    totalTime: "Total",
    hours: "h",
    minutes: "m",
    seconds: "s",
    spaceHint: "Spacebar: Start / Pause",
  },
  ja: {
    title: "タイマー",
    tabStopwatch: "ストップウォッチ",
    tabCountdown: "カウントダウン",
    start: "スタート",
    pause: "一時停止",
    reset: "リセット",
    lap: "ラップ",
    lapNum: "ラップ",
    lapTime: "ラップタイム",
    totalTime: "累計",
    hours: "時",
    minutes: "分",
    seconds: "秒",
    spaceHint: "スペース: スタート/一時停止",
  },
  fr: {
    title: "Minuteur",
    tabStopwatch: "Chronomètre",
    tabCountdown: "Compte à rebours",
    start: "Démarrer",
    pause: "Pause",
    reset: "Réinitialiser",
    lap: "Tour",
    lapNum: "Tour",
    lapTime: "Temps du tour",
    totalTime: "Total",
    hours: "h",
    minutes: "min",
    seconds: "s",
    spaceHint: "Espace : Démarrer / Pause",
  },
  es: {
    title: "Temporizador",
    tabStopwatch: "Cronómetro",
    tabCountdown: "Cuenta regresiva",
    start: "Iniciar",
    pause: "Pausar",
    reset: "Restablecer",
    lap: "Vuelta",
    lapNum: "Vuelta",
    lapTime: "Tiempo de vuelta",
    totalTime: "Total",
    hours: "h",
    minutes: "m",
    seconds: "s",
    spaceHint: "Espacio: Iniciar / Pausar",
  },
  zh: {
    title: "计时器",
    tabStopwatch: "秒表",
    tabCountdown: "倒计时",
    start: "开始",
    pause: "暂停",
    reset: "重置",
    lap: "计次",
    lapNum: "圈",
    lapTime: "圈速",
    totalTime: "总计",
    hours: "时",
    minutes: "分",
    seconds: "秒",
    spaceHint: "空格键：开始 / 暂停",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Format ms → HH:MM:SS.cc */
function fmtStopwatch(ms: number): string {
  const cs = Math.floor((ms % 1000) / 10);
  const totalSec = Math.floor(ms / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}.${pad2(cs)}`;
}

/** Format ms → HH:MM:SS */
function fmtCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
}

function playBeep() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    let time = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, time);
      osc.start(time);
      osc.stop(time + 0.2);
      time += 0.35;
    }
  } catch {
    // audio not available
  }
}

// ── Stopwatch ────────────────────────────────────────────────────────────────

interface LapRecord {
  lapNum: number;
  lapMs: number;
  totalMs: number;
}

const Stopwatch: React.FC<{ t: Labels }> = ({ t }) => {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<LapRecord[]>([]);

  const startTimeRef = useRef<number>(undefined);
  const baseRef = useRef<number>(0);
  const rafRef = useRef<number>(undefined);

  const tick = useCallback(() => {
    if (startTimeRef.current !== undefined) {
      setElapsed(baseRef.current + (Date.now() - startTimeRef.current));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleStartPause = useCallback(() => {
    if (running) {
      // pause
      if (startTimeRef.current !== undefined) {
        baseRef.current += Date.now() - startTimeRef.current;
        startTimeRef.current = undefined;
      }
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      setRunning(false);
    } else {
      startTimeRef.current = Date.now();
      rafRef.current = requestAnimationFrame(tick);
      setRunning(true);
    }
  }, [running, tick]);

  const handleReset = useCallback(() => {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    startTimeRef.current = undefined;
    baseRef.current = 0;
    setElapsed(0);
    setRunning(false);
    setLaps([]);
  }, []);

  const handleLap = useCallback(() => {
    if (!running && elapsed === 0) return;
    const prevTotal = laps.length > 0 ? laps[laps.length - 1].totalMs : 0;
    setLaps(prev => [
      ...prev,
      { lapNum: prev.length + 1, lapMs: elapsed - prevTotal, totalMs: elapsed },
    ]);
  }, [running, elapsed, laps]);

  // Spacebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        handleStartPause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleStartPause]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Display */}
      <div className="rounded-3xl bg-foreground p-8 text-center select-none">
        <p className="font-mono text-5xl sm:text-6xl font-black text-background tracking-tight">
          {fmtStopwatch(elapsed)}
        </p>
        <p className="text-[10px] font-medium text-background/60 mt-2">{t.spaceHint}</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={handleLap}
          disabled={!running && elapsed === 0}
          aria-label={t.lap}
          className="py-3 rounded-2xl border border-border bg-muted/40 text-sm font-black uppercase tracking-widest hover:bg-accent transition-colors disabled:opacity-40"
        >
          {t.lap}
        </button>
        <button
          onClick={handleStartPause}
          aria-label={running ? t.pause : t.start}
          aria-pressed={running}
          className={`py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-colors ${
            running
              ? "bg-warning text-background hover:bg-warning"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
        >
          {running ? t.pause : t.start}
        </button>
        <button
          onClick={handleReset}
          aria-label={t.reset}
          className="py-3 rounded-2xl border border-border bg-muted/40 text-sm font-black uppercase tracking-widest hover:bg-accent transition-colors"
        >
          {t.reset}
        </button>
      </div>

      {/* Laps */}
      {laps.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-3 px-4 py-2 bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span>{t.lapNum}</span>
            <span className="text-center">{t.lapTime}</span>
            <span className="text-right">{t.totalTime}</span>
          </div>
          <div className="divide-y divide-border max-h-52 overflow-y-auto">
            {[...laps].reverse().map(lap => (
              <div key={lap.lapNum} className="grid grid-cols-3 px-4 py-2.5 text-sm font-mono">
                <span className="text-xs font-bold text-muted-foreground">{t.lapNum} {lap.lapNum}</span>
                <span className="text-center font-medium">{fmtStopwatch(lap.lapMs)}</span>
                <span className="text-right text-muted-foreground">{fmtStopwatch(lap.totalMs)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Countdown ────────────────────────────────────────────────────────────────

const Countdown: React.FC<{ t: Labels }> = ({ t }) => {
  const [inputH, setInputH] = useState(0);
  const [inputM, setInputM] = useState(5);
  const [inputS, setInputS] = useState(0);

  const [totalMs, setTotalMs] = useState(0); // total configured ms
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false); // whether timer has been started at least once

  const endTimeRef = useRef<number>(undefined);
  const rafRef = useRef<number>(undefined);

  const configuredMs = (inputH * 3600 + inputM * 60 + inputS) * 1000;

  const tick = useCallback(() => {
    if (endTimeRef.current !== undefined) {
      const left = endTimeRef.current - Date.now();
      if (left <= 0) {
        setRemaining(0);
        setRunning(false);
        setFinished(true);
        if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
        playBeep();
        return;
      }
      setRemaining(left);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleStartPause = useCallback(() => {
    if (finished) return;
    if (running) {
      // pause: save remaining
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      endTimeRef.current = undefined;
      setRunning(false);
    } else {
      const ms = started ? remaining : configuredMs;
      if (ms <= 0) return;
      if (!started) {
        setTotalMs(configuredMs);
        setRemaining(configuredMs);
      }
      endTimeRef.current = Date.now() + (started ? remaining : configuredMs);
      setStarted(true);
      setRunning(true);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [running, finished, started, remaining, configuredMs, tick]);

  const handleReset = useCallback(() => {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    endTimeRef.current = undefined;
    setRunning(false);
    setFinished(false);
    setStarted(false);
    setRemaining(0);
    setTotalMs(0);
  }, []);

  // Spacebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        handleStartPause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleStartPause]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const displayMs = started ? remaining : configuredMs;
  const progress = totalMs > 0 ? Math.max(0, Math.min(1, remaining / totalMs)) : 0;

  // SVG circle progress
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const strokeDash = circumference * progress;

  return (
    <div className="flex flex-col gap-6">
      {/* Time inputs — only when not started */}
      {!started && (
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { label: t.hours, value: inputH, set: setInputH, max: 23 },
              { label: t.minutes, value: inputM, set: setInputM, max: 59 },
              { label: t.seconds, value: inputS, set: setInputS, max: 59 },
            ] as const
          ).map(({ label, value, set, max }) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
                {label}
              </label>
              <input
                type="number"
                min={0}
                max={max}
                value={value}
                onChange={e => set(Math.max(0, Math.min(max, Number(e.target.value))))}
                className="w-full text-center text-2xl font-black bg-muted/30 rounded-2xl border border-border py-3 outline-none focus:border-primary transition-colors"
              />
            </div>
          ))}
        </div>
      )}

      {/* Circular progress + display */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60" cy="60" r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/30"
            />
            <circle
              cx="60" cy="60" r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeLinecap="round"
              className={finished ? "text-destructive" : "text-primary"}
              style={{ transition: running ? "none" : "stroke-dasharray 0.3s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <p className={`font-mono text-3xl font-black ${finished ? "text-destructive animate-pulse" : ""}`}>
              {fmtCountdown(displayMs)}
            </p>
            {finished && <p className="text-xs font-black text-destructive mt-1">🔔</p>}
          </div>
        </div>
        <p className="text-[10px] font-medium text-muted-foreground">{t.spaceHint}</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleStartPause}
          disabled={configuredMs === 0 && !started}
          className={`py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-colors ${
            running
              ? "bg-warning text-background hover:bg-warning"
              : finished
              ? "bg-muted/40 border border-border opacity-40 cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          }`}
        >
          {running ? t.pause : t.start}
        </button>
        <button
          onClick={handleReset}
          className="py-3 rounded-2xl border border-border bg-muted/40 text-sm font-black uppercase tracking-widest hover:bg-accent transition-colors"
        >
          {t.reset}
        </button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

type Tab = "stopwatch" | "countdown";

const CountdownTimer: React.FC<{ locale?: Locale }> = ({ locale = "en" }) => {
  const t = L[locale] ?? L.en;
  const [tab, setTab] = useState<Tab>("stopwatch");

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-black">{t.title}</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-2xl border border-border overflow-hidden">
        {(["stopwatch", "countdown"] as const).map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${
              tab === tb
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {tb === "stopwatch" ? t.tabStopwatch : t.tabCountdown}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "stopwatch" ? <Stopwatch t={t} /> : <Countdown t={t} />}
    </div>
  );
};

export default CountdownTimer;
