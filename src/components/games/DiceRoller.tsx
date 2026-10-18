import React, { useState, useCallback, useReducer, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { GameContainer, Die, type DieType } from '@/components/ui/game/GamePrimitives';
import { useArcadePortal } from '@/lib/games/arcade-portal';
import { usePrefersReducedMotion } from '@/lib/games/reduced-motion';

interface RollRecord {
  dice: DieType[];
  results: number[];
  sum: number;
  timestamp: number;
}

interface State {
  selectedDice: DieType[];
  rolling: boolean;
  lastResults: number[];
  history: RollRecord[];
}

type Action =
  | { type: 'ADD_DIE'; die: DieType }
  | { type: 'REMOVE_DIE'; index: number }
  | { type: 'CLEAR_DICE' }
  | { type: 'ROLL_START' }
  | { type: 'ROLL_END'; results: number[] };

const DICE_SIDES: Record<DieType, number> = { D4: 4, D6: 6, D8: 8, D10: 10, D12: 12, D20: 20 };
const DICE_ORDER: DieType[] = ['D4', 'D6', 'D8', 'D10', 'D12', 'D20'];
const MAX_DICE = 6;
const MAX_HISTORY = 10;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_DIE':
      if (state.selectedDice.length >= MAX_DICE) return state;
      return { ...state, selectedDice: [...state.selectedDice, action.die] };
    case 'REMOVE_DIE': {
      const next = [...state.selectedDice];
      next.splice(action.index, 1);
      return { ...state, selectedDice: next };
    }
    case 'CLEAR_DICE':
      return { ...state, selectedDice: [], lastResults: [] };
    case 'ROLL_START':
      return { ...state, rolling: true };
    case 'ROLL_END': {
      const sum = action.results.reduce((a, b) => a + b, 0);
      const record: RollRecord = {
        dice: [...state.selectedDice],
        results: action.results,
        sum,
        timestamp: Date.now(),
      };
      return {
        ...state,
        rolling: false,
        lastResults: action.results,
        history: [record, ...state.history].slice(0, MAX_HISTORY),
      };
    }
    default:
      return state;
  }
}

const initialState: State = {
  selectedDice: [],
  rolling: false,
  lastResults: [],
  history: [],
};

const COPY = {
  ko: { title: '주사위 굴리기', subtitle: 'D4 ~ D20 온라인 주사위 롤러', addDie: '주사위 추가', roll: '굴리기', sum: '합계', history: '기록', maxDice: `최대 ${MAX_DICE}개까지 추가할 수 있습니다`, noDice: '주사위를 추가해주세요', rolling: '굴리는 중...' },
  en: { title: 'Dice Roller', subtitle: 'D4 to D20 Online Dice Roller', addDie: 'Add Die', roll: 'Roll', sum: 'Sum', history: 'History', maxDice: `Maximum ${MAX_DICE} dice allowed`, noDice: 'Add dice to roll', rolling: 'Rolling...' },
  ja: { title: 'サイコロを振る', subtitle: 'D4〜D20 オンラインダイスローラー', addDie: 'サイコロ追加', roll: '振る', sum: '合計', history: '履歴', maxDice: `最大${MAX_DICE}個まで追加できます`, noDice: 'サイコロを追加してください', rolling: '振っています...' },
  zh: { title: '掷骰子', subtitle: 'D4~D20 在线骰子', addDie: '添加骰子', roll: '掷', sum: '合计', history: '记录', maxDice: `最多可添加${MAX_DICE}个`, noDice: '请添加骰子', rolling: '掷骰中...' },
  fr: { title: 'Lanceur de dés', subtitle: 'Lanceur de dés D4 à D20', addDie: 'Ajouter un dé', roll: 'Lancer', sum: 'Total', history: 'Historique', maxDice: `Maximum ${MAX_DICE} dés`, noDice: 'Ajoutez des dés', rolling: 'Lancement...' },
  es: { title: 'Lanzador de dados', subtitle: 'Lanzador de dados D4 a D20', addDie: 'Añadir dado', roll: 'Lanzar', sum: 'Suma', history: 'Historial', maxDice: `Máximo ${MAX_DICE} dados`, noDice: 'Añade dados', rolling: 'Lanzando...' },
} as const;

const DiceRoller: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
  const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || 'ko' });

  const [state, dispatch] = useReducer(reducer, initialState);
  const [throttled, setThrottled] = useState(false);
  const [preview, setPreview] = useState<number[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [muted, setMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('dice_roller_sound_muted') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('dice_roller_sound_muted', String(muted));
    } catch {
      // SSR-safe fallback
    }
  }, [muted]);

  const audioRef = useRef<AudioContext | null>(null);
  const playClack = useCallback((freq = 320, duration = 0.04) => {
    if (muted || typeof window === 'undefined') return;
    try {
      const ctx = audioRef.current ?? new AudioContext();
      audioRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore
    }
  }, [muted]);
  useEffect(() => () => { void audioRef.current?.close(); }, []);

  const rollDice = useCallback(() => {
    if (throttled || state.rolling || state.selectedDice.length === 0) return;
    setThrottled(true);
    dispatch({ type: 'ROLL_START' });
    playClack(280, 0.05);

    if (reducedMotion) {
      const results = state.selectedDice.map((die) => Math.floor(Math.random() * DICE_SIDES[die]) + 1);
      dispatch({ type: 'ROLL_END', results });
      playClack(520, 0.09);
      setThrottled(false);
      return;
    }

    // Tumble: cycle random faces while rolling for a real dice feel
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setPreview(state.selectedDice.map((die) => Math.floor(Math.random() * DICE_SIDES[die]) + 1));
      playClack(260 + Math.random() * 120, 0.03);
    }, 70);

    setTimeout(() => {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      setPreview([]);
      const results = state.selectedDice.map((die) => Math.floor(Math.random() * DICE_SIDES[die]) + 1);
      dispatch({ type: 'ROLL_END', results });
      playClack(520, 0.09);
      setTimeout(() => setThrottled(false), 400);
    }, 700);
  }, [reducedMotion, state.selectedDice, state.rolling, throttled, playClack]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        void togglePortal();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setMuted((v) => !v);
      } else if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        rollDice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePortal, rollDice]);

  const sum = state.lastResults.reduce((a, b) => a + b, 0);

  return (
    <div
      ref={containerRef}
      className={`relative w-full transition-all duration-300 ${
        isImmersive ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-y-auto p-4' : ''
      }`}
    >
      <div className="w-full max-w-xl mx-auto mb-2 flex items-center justify-end gap-2 px-1">
        <button
          type="button"
          onClick={() => setMuted((v) => !v)}
          className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={muted ? portalLabels.unmute : portalLabels.mute}
          title={muted ? portalLabels.unmute : portalLabels.mute}
        >
          {muted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-primary" />}
          <span className="sr-only">{muted ? portalLabels.unmute : portalLabels.mute}</span>
        </button>
        <button
          type="button"
          onClick={togglePortal}
          className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
          title={isImmersive ? portalLabels.exit : portalLabels.enter}
        >
          {isImmersive ? <Minimize2 className="h-4 w-4 text-primary" /> : <Maximize2 className="h-4 w-4" />}
          <span className="sr-only">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
        </button>
      </div>

      <GameContainer
        title={t.title}
        subtitle={t.subtitle}
        onReset={() => dispatch({ type: 'CLEAR_DICE' })}
      >
      {/* Die selector */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{t.addDie}</p>
        <div className="flex flex-wrap gap-2">
          {DICE_ORDER.map((die) => (
            <button
              key={die}
              onClick={() => dispatch({ type: 'ADD_DIE', die })}
              disabled={state.selectedDice.length >= MAX_DICE}
              aria-label={`Add ${die}`}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 border-border bg-muted hover:bg-accent hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all gap-0.5"
            >
              <Die type={die} value={die === 'D6' ? 6 : DICE_SIDES[die]} size={30} />
              <span className="text-[10px] font-black text-muted-foreground">{die}</span>
            </button>
          ))}
        </div>
        {state.selectedDice.length >= MAX_DICE && (
          <p className="text-xs text-muted-foreground mt-2" role="status" aria-live="polite">{t.maxDice}</p>
        )}
      </div>

      {/* Selected dice tray */}
      <div className="mb-6 min-h-[4rem] p-4 rounded-2xl bg-muted/50 border border-border flex flex-wrap gap-3 items-center">
        {state.selectedDice.length === 0 ? (
          <span className="text-sm text-muted-foreground">{t.noDice}</span>
        ) : (
          state.selectedDice.map((die, i) => {
            const shown = state.rolling ? (preview[i] ?? DICE_SIDES[die]) : state.lastResults[i];
            return (
              <button
                key={i}
                onClick={() => dispatch({ type: 'REMOVE_DIE', index: i })}
                aria-label={`Remove ${die} (${shown ?? ''})`}
                title={die}
                className="relative flex items-center justify-center rounded-2xl p-1 hover:bg-destructive/10 transition-all group"
              >
                <Die type={die} value={shown ?? null} rolling={state.rolling} size={56} />
                <span className="absolute -top-1 -right-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-black text-white">✕</span>
              </button>
            );
          })
        )}
      </div>

      {/* Sum display */}
      {state.lastResults.length > 0 && !state.rolling && (
        <div className="mb-6 flex items-center justify-center gap-4 p-4 rounded-2xl bg-primary/10 border border-primary/20">
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t.sum}</span>
          <span className="text-4xl font-black text-primary" aria-live="polite" aria-label={`${t.sum}: ${sum}`}>{sum}</span>
        </div>
      )}

      {/* Roll button */}
      <button
        onClick={rollDice}
        disabled={state.selectedDice.length === 0 || state.rolling || throttled}
        aria-label={t.roll}
        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg tracking-wide hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
      >
        {state.rolling ? t.rolling : t.roll}
      </button>

      {/* History */}
      {state.history.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{t.history}</p>
          <div className="space-y-2 max-h-64 overflow-y-auto" role="log" aria-label={t.history}>
            {state.history.map((record) => (
              <div
                key={record.timestamp}
                className="flex items-center justify-between px-4 py-2 rounded-xl bg-muted/50 border border-border text-sm"
              >
                <span className="font-bold text-muted-foreground">{record.dice.join(', ')}</span>
                <span className="font-bold">{record.results.join(' + ')}</span>
                <span className="font-black text-primary">= {record.sum}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </GameContainer>
    </div>
  );
};

export default DiceRoller;
