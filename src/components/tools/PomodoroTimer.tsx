import { useState, useEffect, useRef, useCallback } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type Mode = "focus" | "short" | "long";

const translations: Record<Locale, Record<string, string>> = {
  ko: {
    title: "뽀모도로 타이머",
    focus: "🍅 집중",
    short: "☕ 짧은 휴식",
    long: "🌙 긴 휴식",
    start: "시작",
    pause: "일시정지",
    reset: "초기화",
    focusMin: "집중 시간(분)",
    shortMin: "짧은 휴식(분)",
    longMin: "긴 휴식(분)",
    session: "세션",
    todayFocus: "오늘 총 집중",
    todaySessions: "완료 세션",
    min: "분",
    count: "회",
    settingsTitle: "설정",
    cycleInfo: "집중 4회 → 긴 휴식",
  },
  en: {
    title: "Pomodoro Timer",
    focus: "🍅 Focus",
    short: "☕ Short Break",
    long: "🌙 Long Break",
    start: "Start",
    pause: "Pause",
    reset: "Reset",
    focusMin: "Focus (min)",
    shortMin: "Short Break (min)",
    longMin: "Long Break (min)",
    session: "Session",
    todayFocus: "Today's Focus",
    todaySessions: "Sessions Done",
    min: "min",
    count: "times",
    settingsTitle: "Settings",
    cycleInfo: "4 focus → long break",
  },
  ja: {
    title: "ポモドーロタイマー",
    focus: "🍅 集中",
    short: "☕ 短い休憩",
    long: "🌙 長い休憩",
    start: "開始",
    pause: "一時停止",
    reset: "リセット",
    focusMin: "集中時間(分)",
    shortMin: "短い休憩(分)",
    longMin: "長い休憩(分)",
    session: "セッション",
    todayFocus: "今日の集中時間",
    todaySessions: "完了セッション",
    min: "分",
    count: "回",
    settingsTitle: "設定",
    cycleInfo: "集中4回 → 長い休憩",
  },
  fr: {
    title: "Minuterie Pomodoro",
    focus: "🍅 Concentration",
    short: "☕ Pause courte",
    long: "🌙 Pause longue",
    start: "Démarrer",
    pause: "Pause",
    reset: "Réinitialiser",
    focusMin: "Concentration (min)",
    shortMin: "Pause courte (min)",
    longMin: "Pause longue (min)",
    session: "Session",
    todayFocus: "Concentration aujourd'hui",
    todaySessions: "Sessions terminées",
    min: "min",
    count: "fois",
    settingsTitle: "Paramètres",
    cycleInfo: "4 focus → longue pause",
  },
  es: {
    title: "Temporizador Pomodoro",
    focus: "🍅 Enfoque",
    short: "☕ Pausa corta",
    long: "🌙 Pausa larga",
    start: "Iniciar",
    pause: "Pausar",
    reset: "Reiniciar",
    focusMin: "Enfoque (min)",
    shortMin: "Pausa corta (min)",
    longMin: "Pausa larga (min)",
    session: "Sesión",
    todayFocus: "Enfoque de hoy",
    todaySessions: "Sesiones completadas",
    min: "min",
    count: "veces",
    settingsTitle: "Ajustes",
    cycleInfo: "4 enfoque → pausa larga",
  },
  zh: {
    title: "番茄钟计时器",
    focus: "🍅 专注",
    short: "☕ 短暂休息",
    long: "🌙 长休息",
    start: "开始",
    pause: "暂停",
    reset: "重置",
    focusMin: "专注时间(分钟)",
    shortMin: "短休息(分钟)",
    longMin: "长休息(分钟)",
    session: "会话",
    todayFocus: "今日专注时间",
    todaySessions: "完成会话",
    min: "分钟",
    count: "次",
    settingsTitle: "设置",
    cycleInfo: "专注4次 → 长休息",
  },
};

const MODE_COLORS: Record<Mode, { stroke: string; bg: string; text: string; badge: string }> = {
  focus: {
    stroke: "#ef4444",
    bg: "bg-destructive/10",
    text: "text-destructive",
    badge: "bg-destructive/15 text-destructive",
  },
  short: {
    stroke: "#22c55e",
    bg: "bg-success/10",
    text: "text-success",
    badge: "bg-success/15 text-success",
  },
  long: {
    stroke: "#3b82f6",
    bg: "bg-info/10",
    text: "text-info",
    badge: "bg-info/15 text-info",
  },
};

const CIRCUMFERENCE = 2 * Math.PI * 90; // r=90

export default function PomodoroTimer({ locale }: Props) {
  const t = translations[locale] ?? translations.en;

  const [focusDur, setFocusDur] = useState(25);
  const [shortDur, setShortDur] = useState(5);
  const [longDur, setLongDur] = useState(15);

  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [focusCount, setFocusCount] = useState(0); // within current cycle (0-3)
  const [totalTodayMin, setTotalTodayMin] = useState(0);
  const [totalTodaySessions, setTotalTodaySessions] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const modeRef = useRef<Mode>("focus");
  const focusCountRef = useRef(0);

  const getDuration = useCallback(
    (m: Mode) => {
      if (m === "focus") return focusDur * 60;
      if (m === "short") return shortDur * 60;
      return longDur * 60;
    },
    [focusDur, shortDur, longDur]
  );

  const playBeep = useCallback(() => {
    if (typeof window === "undefined") return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.3, 0.6].forEach((time) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = time === 0.6 ? 880 : 660;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.3);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + 0.3);
    });
  }, []);

  const switchMode = useCallback(
    (finishedMode: Mode) => {
      playBeep();
      let nextMode: Mode;
      if (finishedMode === "focus") {
        const newCount = focusCountRef.current + 1;
        focusCountRef.current = newCount % 4;
        setFocusCount(newCount % 4);
        setTotalTodaySessions((s) => s + 1);
        setTotalTodayMin((m) => m + focusDur);
        if (newCount % 4 === 0) {
          nextMode = "long";
        } else {
          nextMode = "short";
        }
      } else {
        nextMode = "focus";
      }
      modeRef.current = nextMode;
      setMode(nextMode);
      setSecondsLeft(getDuration(nextMode));
      setRunning(false);
    },
    [playBeep, focusDur, getDuration]
  );

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            switchMode(modeRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, switchMode]);

  // When durations change, reset seconds if not running
  useEffect(() => {
    if (!running) {
      setSecondsLeft(getDuration(mode));
    }
  }, [focusDur, shortDur, longDur]); // eslint-disable-line

  const totalSeconds = getDuration(mode);
  const progress = secondsLeft / totalSeconds;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const handleReset = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    setSecondsLeft(getDuration(mode));
  };

  const handleModeChange = (m: Mode) => {
    setRunning(false);
    clearInterval(intervalRef.current);
    modeRef.current = m;
    setMode(m);
    setSecondsLeft(getDuration(m));
  };

  const colors = MODE_COLORS[mode];

  const tomatoIcons = Array.from({ length: 4 }, (_, i) => (
    <span
      key={i}
      className={`text-2xl transition-all ${i < focusCount ? "opacity-100" : "opacity-25"}`}
    >
      🍅
    </span>
  ));

  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-3xl font-bold text-center">{t.title}</h1>

      {/* Mode selector */}
      <div className="flex gap-2 flex-wrap justify-center">
        {(["focus", "short", "long"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border-2 ${
              mode === m
                ? `${colors.badge} border-current`
                : "bg-transparent border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            {t[m]}
          </button>
        ))}
      </div>

      {/* SVG ring timer */}
      <div className={`rounded-3xl p-8 ${colors.bg} w-full max-w-xs flex justify-center`}>
        <div className="relative w-52 h-52 flex items-center justify-center">
          <svg
            viewBox="0 0 200 200"
            className="absolute inset-0 w-full h-full -rotate-90"
          >
            {/* Background track */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-background"
            />
            {/* Progress arc */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={colors.stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div className="z-10 flex flex-col items-center gap-1">
            <span className={`text-4xl font-mono font-bold ${colors.text}`}>
              {mm}:{ss}
            </span>
            <span className="text-xs text-muted-foreground">{t[mode]}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          className={`px-8 py-3 rounded-full font-bold text-white text-lg shadow transition-all active:scale-95 ${
            running
              ? "bg-warning hover:bg-warning"
              : "bg-foreground hover:bg-foreground/90"
          }`}
        >
          {running ? t.pause : t.start}
        </button>
        <button
          onClick={handleReset}
          className="px-5 py-3 rounded-full font-semibold border border-border text-muted-foreground hover:bg-muted transition-all active:scale-95"
        >
          {t.reset}
        </button>
      </div>

      {/* Cycle progress */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-xs text-muted-foreground">{t.cycleInfo}</p>
        <div className="flex gap-2">{tomatoIcons}</div>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        <div className="bg-muted rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold">{totalTodayMin}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.todayFocus} ({t.min})</p>
        </div>
        <div className="bg-muted rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold">{totalTodaySessions}</p>
          <p className="text-xs text-muted-foreground mt-1">{t.todaySessions}</p>
        </div>
      </div>

      {/* Settings */}
      <details className="w-full max-w-xs">
        <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-2">
          <span>⚙️</span> {t.settingsTitle}
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-4 p-4 bg-muted rounded-2xl">
          {(
            [
              { key: "focusMin", val: focusDur, set: setFocusDur, min: 1, max: 60 },
              { key: "shortMin", val: shortDur, set: setShortDur, min: 1, max: 30 },
              { key: "longMin", val: longDur, set: setLongDur, min: 1, max: 60 },
            ] as const
          ).map(({ key, val, set, min, max }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <label className="text-sm text-muted-foreground flex-1">{t[key]}</label>
              <input
                type="number"
                value={val}
                min={min}
                max={max}
                onChange={(e) => {
                  const n = Math.max(min, Math.min(max, Number(e.target.value)));
                  set(n);
                }}
                className="w-16 text-center border border-border rounded-lg p-1 bg-background text-sm font-semibold"
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
