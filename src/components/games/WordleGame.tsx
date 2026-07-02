import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type TileState = 'empty' | 'tbd' | 'correct' | 'present' | 'absent';
type GameStatus = 'playing' | 'won' | 'lost' | 'loading';
type WordLength = 4 | 5 | 6;

interface TileData { letter: string; state: TileState }

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_GUESSES = 6;
const WORD_LENGTH: WordLength = 5;
const DATA_BASE = '/data/wordle';

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Pick today's word deterministically from the list */
function getDailyWord(list: string[]): string {
  const epoch = new Date('2024-01-01').getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayIndex = Math.floor((today.getTime() - epoch) / 86400000);
  return list[((dayIndex % list.length) + list.length) % list.length].toUpperCase();
}

function evaluateGuess(guess: string, target: string): TileState[] {
  const result: TileState[] = Array(WORD_LENGTH).fill('absent');
  const targetArr = target.split('');
  const guessArr = guess.split('');
  const used = Array(WORD_LENGTH).fill(false);

  // First pass: correct positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }
  // Second pass: present but wrong position
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    const idx = targetArr.findIndex((c, j) => c === guessArr[i] && !used[j]);
    if (idx !== -1) {
      result[i] = 'present';
      used[idx] = true;
    }
  }
  return result;
}

// ─── Tile ─────────────────────────────────────────────────────────────────────
const TILE_CLASSES: Record<TileState, string> = {
  empty: 'border-2 border-muted bg-background text-foreground',
  tbd: 'border-2 border-muted-foreground bg-background text-foreground',
  correct: 'border-2 border-emerald-600 bg-emerald-600 text-white',
  present: 'border-2 border-amber-500 bg-amber-500 text-white',
  absent: 'border-2 border-muted bg-muted/50 text-muted-foreground',
};

const Tile: React.FC<{ data: TileData; animate?: boolean }> = ({ data, animate }) => (
  <div
    className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-black rounded-lg transition-all duration-200 select-none ${TILE_CLASSES[data.state]} ${animate && data.state === 'tbd' ? 'scale-110' : ''}`}
    aria-label={`${data.letter || 'empty'} ${data.state}`}
  >
    {data.letter}
  </div>
);

// ─── Keyboard key ─────────────────────────────────────────────────────────────
function keyClass(letter: string, usedMap: Record<string, TileState>): string {
  const s = usedMap[letter];
  if (s === 'correct') return 'bg-emerald-600 text-white border-emerald-600';
  if (s === 'present') return 'bg-amber-500 text-white border-amber-500';
  if (s === 'absent') return 'bg-muted/60 text-muted-foreground border-muted';
  return 'bg-muted/30 text-foreground border-border hover:bg-muted/60';
}

// ─── Main component ───────────────────────────────────────────────────────────
const WordleGame: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>('loading');
  const [targetWord, setTargetWord] = useState('');
  const [validWords, setValidWords] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<TileData[][]>(
    Array.from({ length: MAX_GUESSES }, () => Array(WORD_LENGTH).fill({ letter: '', state: 'empty' as TileState }))
  );
  const [currentRow, setCurrentRow] = useState(0);
  const [currentGuess, setCurrentGuess] = useState('');
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState('');
  const [usedKeys, setUsedKeys] = useState<Record<string, TileState>>({});
  const msgTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load words
  useEffect(() => {
    async function load() {
      try {
        const [targets, valids] = await Promise.all([
          fetch(`${DATA_BASE}/target-words-5.json`).then(r => r.json() as Promise<string[]>),
          fetch(`${DATA_BASE}/valid-words-5.json`).then(r => r.json() as Promise<string[]>),
        ]);
        setTargetWord(getDailyWord(targets));
        setValidWords(new Set(valids.map((w: string) => w.toUpperCase())));
        setStatus('playing');
      } catch {
        setMessage('Failed to load word data.');
      }
    }
    load();
  }, []);

  const showMessage = useCallback((msg: string, duration = 2000) => {
    setMessage(msg);
    clearTimeout(msgTimeout.current);
    msgTimeout.current = setTimeout(() => setMessage(''), duration);
  }, []);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const submitGuess = useCallback(() => {
    if (status !== 'playing') return;
    if (currentGuess.length < WORD_LENGTH) {
      triggerShake();
      showMessage('Not enough letters');
      return;
    }
    if (!validWords.has(currentGuess) && !validWords.has(currentGuess.toLowerCase())) {
      triggerShake();
      showMessage('Not in word list');
      return;
    }

    const evaluation = evaluateGuess(currentGuess, targetWord);
    const newRow = currentGuess.split('').map((letter, i) => ({ letter, state: evaluation[i] }));

    setRows(prev => {
      const next = [...prev];
      next[currentRow] = newRow;
      return next;
    });

    // Update used keys
    setUsedKeys(prev => {
      const next = { ...prev };
      currentGuess.split('').forEach((letter, i) => {
        const prevState = next[letter];
        const newState = evaluation[i];
        if (prevState !== 'correct') {
          if (newState === 'correct' || !prevState) next[letter] = newState;
          else if (newState === 'present') next[letter] = newState;
        }
      });
      return next;
    });

    if (currentGuess === targetWord) {
      const msgs = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
      setTimeout(() => { setStatus('won'); showMessage(msgs[currentRow] ?? 'Nice!', 4000); }, 300);
    } else if (currentRow + 1 >= MAX_GUESSES) {
      setTimeout(() => { setStatus('lost'); showMessage(targetWord, 6000); }, 300);
    }

    setCurrentRow(r => r + 1);
    setCurrentGuess('');
  }, [status, currentGuess, currentRow, targetWord, validWords, triggerShake, showMessage]);

  const handleKey = useCallback((key: string) => {
    if (status !== 'playing') return;
    if (key === 'ENTER') { submitGuess(); return; }
    if (key === '⌫' || key === 'BACKSPACE') {
      setCurrentGuess(g => g.slice(0, -1));
      return;
    }
    if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
      setCurrentGuess(g => g + key);
    }
  }, [status, currentGuess, submitGuess]);

  // Physical keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      handleKey(e.key.toUpperCase());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleKey]);

  // Build display rows
  const displayRows = rows.map((row, ri) => {
    if (ri === currentRow && status === 'playing') {
      return Array.from({ length: WORD_LENGTH }, (_, ci) => ({
        letter: currentGuess[ci] ?? '',
        state: (currentGuess[ci] ? 'tbd' : 'empty') as TileState,
      }));
    }
    return row;
  });

  const resetGame = () => {
    setRows(Array.from({ length: MAX_GUESSES }, () => Array(WORD_LENGTH).fill({ letter: '', state: 'empty' as TileState })));
    setCurrentRow(0);
    setCurrentGuess('');
    setUsedKeys({});
    setMessage('');
    // Pick a different random word
    fetch(`${DATA_BASE}/target-words-5.json`).then(r => r.json()).then((list: string[]) => {
      const rand = list[Math.floor(Math.random() * list.length)].toUpperCase();
      setTargetWord(rand);
      setStatus('playing');
    });
  };

  if (status === 'loading') {
    return (
      <div className="not-prose flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-bold">Loading words…</p>
      </div>
    );
  }

  return (
    <div className="not-prose flex flex-col items-center gap-6 py-8 px-4 max-w-lg mx-auto select-none">
      {/* Header */}
      <div className="w-full text-center border-b border-border pb-4">
        <h1 className="text-3xl font-black tracking-widest">WORDLE</h1>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">Daily 5-letter word puzzle</p>
      </div>

      {/* Message toast */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${message ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <div className="bg-foreground text-background px-5 py-2.5 rounded-xl font-black text-sm shadow-xl whitespace-nowrap">
          {message}
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-2" role="grid" aria-label="Wordle game board">
        {displayRows.map((row, ri) => (
          <div
            key={ri}
            className={`flex gap-2 ${shake && ri === currentRow ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
            role="row"
          >
            {row.map((tile, ci) => <Tile key={ci} data={tile} animate={ri === currentRow} />)}
          </div>
        ))}
      </div>

      {/* Status */}
      {status !== 'playing' && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={resetGame}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-colors"
          >
            {status === 'won' ? '🎉 Play Again' : '🔄 Try Again'}
          </button>
          {status === 'lost' && (
            <p className="text-sm text-muted-foreground font-bold">The word was: <span className="font-black text-foreground">{targetWord}</span></p>
          )}
        </div>
      )}

      {/* Keyboard */}
      <div className="flex flex-col items-center gap-2 w-full" aria-label="Keyboard">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-1.5 justify-center">
            {row.map(key => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                aria-label={key === '⌫' ? 'Backspace' : key}
                className={`h-14 rounded-lg border font-black text-xs sm:text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${key.length > 1 ? 'px-2 sm:px-3 text-[10px] sm:text-xs' : 'w-9 sm:w-10'} ${keyClass(key, usedKeys)}`}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        A new word is available each day. Use physical keyboard or tap letters above.
      </p>
    </div>
  );
};

export default WordleGame;
