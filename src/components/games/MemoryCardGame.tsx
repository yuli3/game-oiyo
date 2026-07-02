import React, { useReducer, useEffect, useCallback, useState } from 'react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';

type GridSize = '4x4' | '6x4' | '6x6';
type GameStatus = 'idle' | 'playing' | 'won';

interface GridConfig {
  cols: number;
  rows: number;
  label: string;
}

const GRID_CONFIG: Record<GridSize, GridConfig> = {
  '4x4': { cols: 4, rows: 4, label: '4×4' },
  '6x4': { cols: 6, rows: 4, label: '6×4' },
  '6x6': { cols: 6, rows: 6, label: '6×6' },
};

const EMOJI_POOL = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐙', '🦋', '🌸', '⭐', '🍎', '🍊', '🍋', '🍇', '🍓', '🌈', '🎸', '🚀', '🎃', '🔮', '🎯', '💎', '🏆', '🎪', '🌴', '🦄', '🐝', '🦀'];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface State {
  gridSize: GridSize;
  cards: Card[];
  flipped: number[];
  matched: number;
  flips: number;
  status: GameStatus;
  startTime: number | null;
  elapsedMs: number;
  locked: boolean;
}

type Action =
  | { type: 'START'; gridSize: GridSize }
  | { type: 'FLIP'; cardId: number }
  | { type: 'CHECK_MATCH' }
  | { type: 'TICK'; elapsedMs: number }
  | { type: 'RESET' };

function buildCards(gridSize: GridSize): Card[] {
  const { cols, rows } = GRID_CONFIG[gridSize];
  const total = cols * rows;
  const pairCount = total / 2;
  const emojis = EMOJI_POOL.slice(0, pairCount);
  const doubled = [...emojis, ...emojis];
  // Fisher-Yates shuffle
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled.map((emoji, i) => ({ id: i, emoji, isFlipped: false, isMatched: false }));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        gridSize: action.gridSize,
        cards: buildCards(action.gridSize),
        flipped: [],
        matched: 0,
        flips: 0,
        status: 'playing',
        startTime: Date.now(),
        elapsedMs: 0,
        locked: false,
      };
    case 'FLIP': {
      if (state.locked || state.status !== 'playing') return state;
      if (state.flipped.includes(action.cardId)) return state;
      const card = state.cards.find((c) => c.id === action.cardId);
      if (!card || card.isMatched || card.isFlipped) return state;

      const newCards = state.cards.map((c) =>
        c.id === action.cardId ? { ...c, isFlipped: true } : c
      );
      const newFlipped = [...state.flipped, action.cardId];
      const locked = newFlipped.length === 2;

      return {
        ...state,
        cards: newCards,
        flipped: newFlipped,
        flips: state.flips + 1,
        locked,
      };
    }
    case 'CHECK_MATCH': {
      if (state.flipped.length !== 2) return state;
      const [a, b] = state.flipped.map((id) => state.cards.find((c) => c.id === id)!);
      const isMatch = a.emoji === b.emoji;

      const newCards = state.cards.map((c) => {
        if (c.id === a.id || c.id === b.id) {
          return isMatch ? { ...c, isMatched: true } : { ...c, isFlipped: false };
        }
        return c;
      });

      const newMatched = state.matched + (isMatch ? 1 : 0);
      const totalPairs = (GRID_CONFIG[state.gridSize].cols * GRID_CONFIG[state.gridSize].rows) / 2;
      const won = newMatched === totalPairs;

      return {
        ...state,
        cards: newCards,
        flipped: [],
        matched: newMatched,
        locked: false,
        status: won ? 'won' : 'playing',
      };
    }
    case 'TICK':
      return state.status === 'playing' ? { ...state, elapsedMs: action.elapsedMs } : state;
    case 'RESET':
      return { ...state, ...{ cards: buildCards(state.gridSize), flipped: [], matched: 0, flips: 0, status: 'playing' as GameStatus, startTime: Date.now(), elapsedMs: 0, locked: false } };
    default:
      return state;
  }
}

const initialState: State = {
  gridSize: '4x4',
  cards: [],
  flipped: [],
  matched: 0,
  flips: 0,
  status: 'idle',
  startTime: null,
  elapsedMs: 0,
  locked: false,
};

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

const MemoryCardGame: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = {
    ko: {
      title: '카드 짝 맞추기',
      subtitle: '기억력 훈련 메모리 게임',
      easy:   '쉬움 — 4×4',
      medium: '보통 — 6×4',
      hard:   '어려움 — 6×6',
      start:  '게임 시작',
      reset:  '다시 시작',
      flips:  '뒤집기',
      matched: '맞춘 쌍',
      time:   '시간',
      won:    '모두 맞췄습니다!',
      chooseLevel: '난이도를 선택하세요',
      pairs: (n: number, total: number) => `${n} / ${total} 쌍`,
    },
    en: {
      title: 'Memory Cards',
      subtitle: 'Memory Card Matching Game',
      easy:   'Easy — 4×4',
      medium: 'Medium — 6×4',
      hard:   'Hard — 6×6',
      start:  'Start Game',
      reset:  'Play Again',
      flips:  'Flips',
      matched: 'Matched',
      time:   'Time',
      won:    'All matched!',
      chooseLevel: 'Choose difficulty',
      pairs: (n: number, total: number) => `${n} / ${total} pairs`,
    },
  }[locale === 'ko' ? 'ko' : 'en'];

  const [state, dispatch] = useReducer(reducer, initialState);
  const [throttledFlip, setThrottledFlip] = useState(false);

  // Timer tick
  useEffect(() => {
    if (state.status !== 'playing' || !state.startTime) return;
    const id = setInterval(() => {
      dispatch({ type: 'TICK', elapsedMs: Date.now() - (state.startTime ?? 0) });
    }, 500);
    return () => clearInterval(id);
  }, [state.status, state.startTime]);

  // Auto check match after 2 flips
  useEffect(() => {
    if (state.flipped.length === 2) {
      const id = setTimeout(() => dispatch({ type: 'CHECK_MATCH' }), 800);
      return () => clearTimeout(id);
    }
  }, [state.flipped]);

  const handleFlip = useCallback((cardId: number) => {
    if (throttledFlip || state.locked) return;
    setThrottledFlip(true);
    dispatch({ type: 'FLIP', cardId });
    setTimeout(() => setThrottledFlip(false), 200);
  }, [throttledFlip, state.locked]);

  const { cols } = state.status !== 'idle' ? GRID_CONFIG[state.gridSize] : GRID_CONFIG['4x4'];
  const totalPairs = state.status !== 'idle' ? (GRID_CONFIG[state.gridSize].cols * GRID_CONFIG[state.gridSize].rows) / 2 : 0;

  return (
    <GameContainer
      title={t.title}
      subtitle={t.subtitle}
      onReset={state.status !== 'idle' ? () => dispatch({ type: 'RESET' }) : undefined}
    >
      {/* Difficulty selection */}
      {state.status === 'idle' && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">{t.chooseLevel}</p>
          <div className="flex flex-col gap-3">
            {(['4x4', '6x4', '6x6'] as GridSize[]).map((size, i) => (
              <button
                key={size}
                onClick={() => dispatch({ type: 'START', gridSize: size })}
                aria-label={[t.easy, t.medium, t.hard][i]}
                className="w-full py-3 px-4 rounded-2xl border-2 border-border bg-muted hover:bg-accent hover:border-primary font-bold text-sm transition-all text-left"
              >
                {[t.easy, t.medium, t.hard][i]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Game board */}
      {state.status !== 'idle' && (
        <>
          {/* Stats bar */}
          <div className="flex items-center justify-between mb-4 text-sm font-bold text-muted-foreground">
            <span>{t.flips}: <span className="text-foreground">{state.flips}</span></span>
            <span aria-live="polite">{t.matched}: <span className="text-primary">{t.pairs(state.matched, totalPairs)}</span></span>
            <span>{t.time}: <span className="text-foreground">{formatTime(state.elapsedMs)}</span></span>
          </div>

          {/* Win message */}
          {state.status === 'won' && (
            <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center" role="status" aria-live="assertive">
              <p className="text-lg font-black text-emerald-700">{t.won}</p>
              <p className="text-sm text-emerald-600">
                {formatTime(state.elapsedMs)} — {state.flips} {locale === 'ko' ? '번' : 'flips'}
              </p>
              <button
                onClick={() => dispatch({ type: 'RESET' })}
                className="mt-3 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:bg-primary/90 transition-all"
              >
                {t.reset}
              </button>
            </div>
          )}

          {/* Card grid */}
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            aria-label={t.title}
          >
            {state.cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleFlip(card.id)}
                disabled={card.isMatched || card.isFlipped || state.locked || state.status === 'won'}
                aria-label={card.isFlipped || card.isMatched ? card.emoji : locale === 'ko' ? '카드' : 'Card'}
                aria-pressed={card.isFlipped || card.isMatched}
                className={[
                  'aspect-square rounded-xl border-2 flex items-center justify-center text-2xl transition-all duration-200',
                  card.isMatched
                    ? 'bg-emerald-50 border-emerald-300 scale-95'
                    : card.isFlipped
                    ? 'bg-card border-primary shadow-sm scale-105'
                    : 'bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary cursor-pointer active:scale-95',
                ].join(' ')}
              >
                {card.isFlipped || card.isMatched ? card.emoji : ''}
              </button>
            ))}
          </div>
        </>
      )}
    </GameContainer>
  );
};

export default MemoryCardGame;
