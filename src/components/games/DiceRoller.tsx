import React, { useState, useCallback, useReducer } from 'react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';

type DieType = 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20';

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
const MAX_DICE = 6;
const MAX_HISTORY = 10;

const DIE_FACES: Record<DieType, string> = {
  D4: '▲',
  D6: '⬡',
  D8: '◆',
  D10: '⬟',
  D12: '⬠',
  D20: '⬣',
};

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

const DiceRoller: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = {
    ko: {
      title: '주사위 굴리기',
      subtitle: 'D4 ~ D20 온라인 주사위 롤러',
      addDie: '주사위 추가',
      roll: '굴리기',
      clear: '초기화',
      result: '결과',
      sum: '합계',
      history: '기록',
      noHistory: '아직 기록이 없습니다',
      maxDice: `최대 ${MAX_DICE}개까지 추가할 수 있습니다`,
      noDice: '주사위를 추가해주세요',
      rolling: '굴리는 중...',
    },
    en: {
      title: 'Dice Roller',
      subtitle: 'D4 to D20 Online Dice Roller',
      addDie: 'Add Die',
      roll: 'Roll',
      clear: 'Clear',
      result: 'Result',
      sum: 'Sum',
      history: 'History',
      noHistory: 'No rolls yet',
      maxDice: `Maximum ${MAX_DICE} dice allowed`,
      noDice: 'Add dice to roll',
      rolling: 'Rolling...',
    },
  }[locale === 'ko' ? 'ko' : 'en'];

  const [state, dispatch] = useReducer(reducer, initialState);
  const [throttled, setThrottled] = useState(false);

  const rollDice = useCallback(() => {
    if (throttled || state.rolling || state.selectedDice.length === 0) return;
    setThrottled(true);
    dispatch({ type: 'ROLL_START' });

    setTimeout(() => {
      const results = state.selectedDice.map((die) => {
        const sides = DICE_SIDES[die];
        return Math.floor(Math.random() * sides) + 1;
      });
      dispatch({ type: 'ROLL_END', results });
      setTimeout(() => setThrottled(false), 600);
    }, 600);
  }, [state.selectedDice, state.rolling, throttled]);

  const sum = state.lastResults.reduce((a, b) => a + b, 0);

  return (
    <GameContainer
      title={t.title}
      subtitle={t.subtitle}
      onReset={() => dispatch({ type: 'CLEAR_DICE' })}
    >
      {/* Die selector */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{t.addDie}</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DICE_SIDES) as DieType[]).map((die) => (
            <button
              key={die}
              onClick={() => dispatch({ type: 'ADD_DIE', die })}
              disabled={state.selectedDice.length >= MAX_DICE}
              aria-label={`Add ${die}`}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-2 border-border bg-muted hover:bg-accent hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all font-black text-xs gap-1"
            >
              <span className="text-lg">{DIE_FACES[die]}</span>
              <span>{die}</span>
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
            const result = state.lastResults[i];
            return (
              <button
                key={i}
                onClick={() => dispatch({ type: 'REMOVE_DIE', index: i })}
                aria-label={`Remove ${die}`}
                className="relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 border-primary/40 bg-card hover:border-destructive hover:bg-destructive/10 transition-all group"
              >
                <span className="text-xs font-black text-muted-foreground group-hover:hidden">{die}</span>
                {result !== undefined && !state.rolling && (
                  <span className="text-xl font-black text-foreground group-hover:hidden">{result}</span>
                )}
                {state.rolling && (
                  <span className="text-xl font-black text-primary animate-bounce">{DIE_FACES[die]}</span>
                )}
                <span className="hidden group-hover:flex text-xs font-black text-destructive">✕</span>
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
  );
};

export default DiceRoller;
