import { useState, useEffect, useRef, useCallback } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type TimeSig = "2/4" | "3/4" | "4/4" | "6/8";

const TIME_SIGS: TimeSig[] = ["2/4", "3/4", "4/4", "6/8"];

const BEATS_PER_MEASURE: Record<TimeSig, number> = {
  "2/4": 2,
  "3/4": 3,
  "4/4": 4,
  "6/8": 6,
};

const PRESETS = [
  { name: "Largo", bpm: 50 },
  { name: "Andante", bpm: 80 },
  { name: "Moderato", bpm: 108 },
  { name: "Allegro", bpm: 132 },
  { name: "Presto", bpm: 176 },
];

const translations: Record<Locale, Record<string, string>> = {
  ko: {
    title: "메트로놈",
    start: "시작",
    stop: "정지",
    tapTempo: "탭 템포",
    timeSig: "박자표",
    bpmLabel: "BPM",
    presets: "프리셋",
  },
  en: {
    title: "Metronome",
    start: "Start",
    stop: "Stop",
    tapTempo: "Tap Tempo",
    timeSig: "Time Signature",
    bpmLabel: "BPM",
    presets: "Presets",
  },
  ja: {
    title: "メトロノーム",
    start: "開始",
    stop: "停止",
    tapTempo: "タップテンポ",
    timeSig: "拍子記号",
    bpmLabel: "BPM",
    presets: "プリセット",
  },
  fr: {
    title: "Métronome",
    start: "Démarrer",
    stop: "Arrêter",
    tapTempo: "Tap Tempo",
    timeSig: "Signature Rythmique",
    bpmLabel: "BPM",
    presets: "Préréglages",
  },
  es: {
    title: "Metrónomo",
    start: "Iniciar",
    stop: "Detener",
    tapTempo: "Tap Tempo",
    timeSig: "Compás",
    bpmLabel: "BPM",
    presets: "Ajustes",
  },
  zh: {
    title: "节拍器",
    start: "开始",
    stop: "停止",
    tapTempo: "点击速度",
    timeSig: "拍号",
    bpmLabel: "BPM",
    presets: "预设",
  },
};

export default function Metronome({ locale }: Props) {
  const t = translations[locale] ?? translations.en;

  const [bpm, setBpm] = useState(120);
  const [bpmInput, setBpmInput] = useState("120");
  const [running, setRunning] = useState(false);
  const [timeSig, setTimeSig] = useState<TimeSig>("4/4");
  const [currentBeat, setCurrentBeat] = useState(0); // 0-indexed visual beat
  const [flash, setFlash] = useState(false);

  const audioCtxRef = useRef<AudioContext | undefined>(undefined);
  const nextBeatTimeRef = useRef<number>(0);
  const currentBeatRef = useRef<number>(0);
  const schedulerTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const bpmRef = useRef(bpm);
  const timeSigRef = useRef(timeSig);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep refs in sync
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { timeSigRef.current = timeSig; }, [timeSig]);

  const tapTimesRef = useRef<number[]>([]);

  const scheduleClick = useCallback((time: number, isAccent: boolean) => {
    const ctx = audioCtxRef.current!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = isAccent ? 1000 : 800;
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);
  }, []);

  const scheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const beats = BEATS_PER_MEASURE[timeSigRef.current];

    while (nextBeatTimeRef.current < ctx.currentTime + 0.1) {
      const isAccent = currentBeatRef.current % beats === 0;
      scheduleClick(nextBeatTimeRef.current, isAccent);

      // Schedule visual update
      const beatIndex = currentBeatRef.current % beats;
      const delay = Math.max(0, (nextBeatTimeRef.current - ctx.currentTime) * 1000);
      setTimeout(() => {
        setCurrentBeat(beatIndex);
        setFlash(true);
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setFlash(false), 80);
      }, delay);

      nextBeatTimeRef.current += 60.0 / bpmRef.current;
      currentBeatRef.current++;
    }
  }, [scheduleClick]);

  const startMetronome = useCallback(() => {
    if (typeof window === "undefined") return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;
    currentBeatRef.current = 0;
    nextBeatTimeRef.current = ctx.currentTime + 0.05;
    schedulerTimerRef.current = setInterval(scheduler, 25);
    setRunning(true);
  }, [scheduler]);

  const stopMetronome = useCallback(() => {
    clearInterval(schedulerTimerRef.current);
    schedulerTimerRef.current = undefined;
    setRunning(false);
    setCurrentBeat(0);
    setFlash(false);
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = undefined;
    }
  }, []);

  const handleToggle = () => {
    if (running) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  // Restart when timeSig changes while running
  useEffect(() => {
    if (running) {
      stopMetronome();
      // Small delay to allow state update
      setTimeout(() => startMetronome(), 50);
    }
  }, [timeSig]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(schedulerTimerRef.current);
      clearTimeout(flashTimerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const handleBpmSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setBpm(val);
    setBpmInput(String(val));
  };

  const handleBpmInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpmInput(e.target.value);
    const val = Number(e.target.value);
    if (val >= 40 && val <= 240) {
      setBpm(val);
    }
  };

  const handleBpmInputBlur = () => {
    const val = Math.max(40, Math.min(240, Number(bpmInput) || 120));
    setBpm(val);
    setBpmInput(String(val));
  };

  const handleTapTempo = () => {
    const now = Date.now();
    const taps = tapTimesRef.current;
    taps.push(now);
    // Keep last 5 taps
    if (taps.length > 5) taps.shift();
    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      // Use last 4 intervals
      const recent = intervals.slice(-4);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const newBpm = Math.round(60000 / avg);
      const clamped = Math.max(40, Math.min(240, newBpm));
      setBpm(clamped);
      setBpmInput(String(clamped));
    }
  };

  const beats = BEATS_PER_MEASURE[timeSig];

  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-3xl font-bold text-center">{t.title}</h1>

      {/* Beat indicator */}
      <div className="flex gap-3 justify-center">
        {Array.from({ length: beats }, (_, i) => {
          const isActive = running && i === currentBeat;
          const isAccent = i === 0;
          return (
            <div
              key={i}
              className={`rounded-full transition-all duration-75 ${
                isAccent ? "border-2 border-warning" : "border-2 border-border"
              } ${
                isActive && flash
                  ? isAccent
                    ? "bg-warning/40 scale-125 shadow-lg shadow-warning"
                    : "bg-background0 scale-110 shadow-md"
                  : isAccent
                  ? "bg-warning/15"
                  : "bg-muted"
              }`}
              style={{ width: 28, height: 28 }}
            />
          );
        })}
      </div>

      {/* BPM Display */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-muted-foreground">{t.bpmLabel}</span>
          <input
            type="number"
            value={bpmInput}
            min={40}
            max={240}
            onChange={handleBpmInput}
            onBlur={handleBpmInputBlur}
            className="w-20 text-center text-3xl font-bold border-b-2 border-border bg-transparent focus:outline-none focus:border-primary"
          />
        </div>
        <input
          type="range"
          min={40}
          max={240}
          value={bpm}
          onChange={handleBpmSlider}
          className="w-full accent-foreground cursor-pointer"
        />
        <div className="flex justify-between w-full text-xs text-muted-foreground">
          <span>40</span>
          <span>240</span>
        </div>
      </div>

      {/* Time signature */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <p className="text-sm font-semibold text-muted-foreground">{t.timeSig}</p>
        <div className="flex gap-2">
          {TIME_SIGS.map((sig) => (
            <button
              key={sig}
              onClick={() => setTimeSig(sig)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
                timeSig === sig
                  ? "bg-foreground text-white border-foreground/20"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {sig}
            </button>
          ))}
        </div>
      </div>

      {/* Start / Stop */}
      <button
        onClick={handleToggle}
        className={`px-12 py-4 rounded-full font-bold text-xl shadow-lg transition-all active:scale-95 ${
          running
            ? "bg-destructive hover:bg-destructive text-white"
            : "bg-foreground hover:bg-foreground/90 text-white"
        }`}
      >
        {running ? t.stop : t.start}
      </button>

      {/* Tap Tempo */}
      <button
        onClick={handleTapTempo}
        className="px-8 py-3 rounded-full font-semibold border-2 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95 select-none"
      >
        🥁 {t.tapTempo}
      </button>

      {/* BPM Presets */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <p className="text-sm font-semibold text-muted-foreground">{t.presets}</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {PRESETS.map(({ name, bpm: presetBpm }) => (
            <button
              key={name}
              onClick={() => {
                setBpm(presetBpm);
                setBpmInput(String(presetBpm));
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                bpm === presetBpm
                  ? "bg-foreground text-white border-foreground/20"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {name} <span className="opacity-70">{presetBpm}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
