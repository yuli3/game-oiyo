import React, { useReducer, useCallback, useState } from 'react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';

type Difficulty = 'easy' | 'normal' | 'hard';
type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

interface DifficultyConfig {
  max: number;
  tries: number | null;
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy:   { max: 50,   tries: null },
  normal: { max: 100,  tries: 10 },
  hard:   { max: 1000, tries: 7 },
};

interface State {
  difficulty: Difficulty;
  secret: number;
  guess: string;
  attempts: number;
  maxTries: number | null;
  history: { guess: number; hint: 'hot' | 'warm' | 'cold' | 'exact' }[];
  status: GameStatus;
}

type Action =
  | { type: 'START'; difficulty: Difficulty }
  | { type: 'SET_GUESS'; value: string }
  | { type: 'SUBMIT' }
  | { type: 'RESET' };

function getHint(guess: number, secret: number): 'hot' | 'warm' | 'cold' | 'exact' {
  if (guess === secret) return 'exact';
  const diff = Math.abs(guess - secret);
  const range = secret;
  if (diff <= range * 0.05) return 'hot';
  if (diff <= range * 0.2)  return 'warm';
  return 'cold';
}

function createGame(difficulty: Difficulty): Partial<State> {
  const config = DIFFICULTY_CONFIG[difficulty];
  const secret = Math.floor(Math.random() * config.max) + 1;
  return {
    difficulty,
    secret,
    guess: '',
    attempts: 0,
    maxTries: config.tries,
    history: [],
    status: 'playing',
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START':
      return { ...state, ...createGame(action.difficulty) };
    case 'SET_GUESS':
      return { ...state, guess: action.value };
    case 'SUBMIT': {
      const val = parseInt(state.guess, 10);
      const config = DIFFICULTY_CONFIG[state.difficulty];
      if (isNaN(val) || val < 1 || val > config.max) return state;
      const hint = getHint(val, state.secret);
      const newAttempts = state.attempts + 1;
      const newHistory = [{ guess: val, hint }, ...state.history];
      let status: GameStatus = 'playing';
      if (hint === 'exact') status = 'won';
      else if (state.maxTries !== null && newAttempts >= state.maxTries) status = 'lost';
      return { ...state, guess: '', attempts: newAttempts, history: newHistory, status };
    }
    case 'RESET':
      return { ...state, ...createGame(state.difficulty) };
    default:
      return state;
  }
}

const initialState: State = {
  difficulty: 'normal',
  secret: 0,
  guess: '',
  attempts: 0,
  maxTries: 10,
  history: [],
  status: 'idle',
};

const NumberGuessingGame: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
  const COPY = {
    ko: {
      title: '숫자 맞추기',
      subtitle: '숨겨진 숫자를 찾아라',
      easy:    '쉬움 (1~50, 무제한)',
      normal:  '보통 (1~100, 10번)',
      hard:    '어려움 (1~1000, 7번)',
      start:   '게임 시작',
      reset:   '다시 시작',
      placeholder: (max: number) => `1에서 ${max} 사이 숫자 입력`,
      submit:  '확인',
      attemptsLeft: (n: number) => `남은 기회: ${n}번`,
      unlimited: '무제한 기회',
      won:  '정답! 🎯',
      lost: (n: number) => `아쉽! 정답은 ${n}이었습니다`,
      hint: { exact: '정답!', hot: '매우 뜨거워요!', warm: '따뜻해요', cold: '차가워요' },
      chooseLevel: '난이도를 선택하세요',
      history: '시도 기록',
      wonIn: (n: number) => `${n}번 만에 정답!`,
      changeLevel: '난이도 변경',
    },
    en: {
      title: 'Number Guessing',
      subtitle: 'Find the hidden number',
      easy:    'Easy (1–50, unlimited)',
      normal:  'Normal (1–100, 10 tries)',
      hard:    'Hard (1–1000, 7 tries)',
      start:   'Start Game',
      reset:   'Play Again',
      placeholder: (max: number) => `Enter a number from 1 to ${max}`,
      submit:  'Guess',
      attemptsLeft: (n: number) => `Tries left: ${n}`,
      unlimited: 'Unlimited tries',
      won:  'Correct! 🎯',
      lost: (n: number) => `The answer was ${n}`,
      hint: { exact: 'Exact!', hot: 'Very hot!', warm: 'Warm', cold: 'Cold' },
      chooseLevel: 'Choose difficulty',
      history: 'Guess History',
      wonIn: (n: number) => `${n} attempt${n !== 1 ? 's' : ''}`,
      changeLevel: 'Change Level',
    },
    ja: {
      title: '数当てゲーム',
      subtitle: '隠された数字を探せ',
      easy:    'かんたん (1〜50, 無制限)',
      normal:  'ふつう (1〜100, 10回)',
      hard:    'むずかしい (1〜1000, 7回)',
      start:   'ゲーム開始',
      reset:   'もう一度',
      placeholder: (max: number) => `1から${max}までの数字を入力`,
      submit:  '判定',
      attemptsLeft: (n: number) => `残りチャンス: ${n}回`,
      unlimited: '無制限',
      won:  '正解！ 🎯',
      lost: (n: number) => `残念！正解は${n}でした`,
      hint: { exact: '正解！', hot: 'とても熱い！', warm: '暖かい', cold: '冷たい' },
      chooseLevel: '難易度を選んでください',
      history: '試行履歴',
      wonIn: (n: number) => `${n}回で正解！`,
      changeLevel: '難易度変更',
    },
    zh: {
      title: '猜数字',
      subtitle: '找出隐藏的数字',
      easy:    '简单 (1~50, 无限次)',
      normal:  '普通 (1~100, 10次)',
      hard:    '困难 (1~1000, 7次)',
      start:   '开始游戏',
      reset:   '再玩一次',
      placeholder: (max: number) => `输入1到${max}之间的数字`,
      submit:  '确认',
      attemptsLeft: (n: number) => `剩余机会: ${n}次`,
      unlimited: '无限次机会',
      won:  '答对了！ 🎯',
      lost: (n: number) => `可惜！答案是${n}`,
      hint: { exact: '正确！', hot: '非常热！', warm: '温暖', cold: '很冷' },
      chooseLevel: '请选择难度',
      history: '尝试记录',
      wonIn: (n: number) => `${n}次猜中！`,
      changeLevel: '更改难度',
    },
    fr: {
      title: 'Devine le nombre',
      subtitle: 'Trouvez le nombre caché',
      easy:    'Facile (1–50, illimité)',
      normal:  'Normal (1–100, 10 essais)',
      hard:    'Difficile (1–1000, 7 essais)',
      start:   'Commencer',
      reset:   'Rejouer',
      placeholder: (max: number) => `Entrez un nombre de 1 à ${max}`,
      submit:  'Deviner',
      attemptsLeft: (n: number) => `Essais restants : ${n}`,
      unlimited: 'Essais illimités',
      won:  'Correct ! 🎯',
      lost: (n: number) => `La réponse était ${n}`,
      hint: { exact: 'Exact !', hot: 'Très chaud !', warm: 'Tiède', cold: 'Froid' },
      chooseLevel: 'Choisissez la difficulté',
      history: 'Historique',
      wonIn: (n: number) => `en ${n} essai${n > 1 ? 's' : ''} !`,
      changeLevel: 'Changer de niveau',
    },
    es: {
      title: 'Adivina el número',
      subtitle: 'Encuentra el número oculto',
      easy:    'Fácil (1–50, ilimitado)',
      normal:  'Normal (1–100, 10 intentos)',
      hard:    'Difícil (1–1000, 7 intentos)',
      start:   'Empezar',
      reset:   'Jugar de nuevo',
      placeholder: (max: number) => `Escribe un número del 1 al ${max}`,
      submit:  'Probar',
      attemptsLeft: (n: number) => `Intentos restantes: ${n}`,
      unlimited: 'Intentos ilimitados',
      won:  '¡Correcto! 🎯',
      lost: (n: number) => `La respuesta era ${n}`,
      hint: { exact: '¡Exacto!', hot: '¡Muy caliente!', warm: 'Templado', cold: 'Frío' },
      chooseLevel: 'Elige la dificultad',
      history: 'Historial',
      wonIn: (n: number) => `¡en ${n} intento${n !== 1 ? 's' : ''}!`,
      changeLevel: 'Cambiar nivel',
    },
  };
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;

  const [state, dispatch] = useReducer(reducer, initialState);
  const [throttled, setThrottled] = useState(false);

  const handleSubmit = useCallback(() => {
    if (throttled || state.status !== 'playing') return;
    setThrottled(true);
    dispatch({ type: 'SUBMIT' });
    setTimeout(() => setThrottled(false), 400);
  }, [throttled, state.status]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const config = DIFFICULTY_CONFIG[state.difficulty];
  const triesLeft = state.maxTries !== null ? state.maxTries - state.attempts : null;

  const HINT_COLORS: Record<string, string> = {
    exact: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    hot:   'bg-red-100 text-red-800 border-red-300',
    warm:  'bg-orange-100 text-orange-800 border-orange-300',
    cold:  'bg-blue-100 text-blue-800 border-blue-300',
  };

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
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => dispatch({ type: 'START', difficulty: d })}
                aria-label={t[d]}
                className="w-full py-3 px-4 rounded-2xl border-2 border-border bg-muted hover:bg-accent hover:border-primary font-bold text-sm transition-all text-left"
              >
                {t[d]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active game */}
      {state.status !== 'idle' && (
        <>
          {/* Status bar */}
          <div className="flex items-center justify-between mb-6 text-sm font-bold">
            <span className="text-muted-foreground capitalize">{t[state.difficulty]}</span>
            <span className="text-primary" aria-live="polite">
              {triesLeft !== null ? t.attemptsLeft(triesLeft) : t.unlimited}
            </span>
          </div>

          {/* Result message */}
          {state.status === 'won' && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center" role="status" aria-live="assertive">
              <p className="text-lg font-black text-emerald-700">{t.won}</p>
              <p className="text-sm text-emerald-600">{t.wonIn(state.attempts)}</p>
            </div>
          )}

          {state.status === 'lost' && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-center" role="status" aria-live="assertive">
              <p className="text-lg font-black text-red-700">{t.lost(state.secret)}</p>
            </div>
          )}

          {/* Input */}
          {state.status === 'playing' && (
            <div className="mb-6 flex gap-3">
              <input
                type="number"
                min={1}
                max={config.max}
                value={state.guess}
                onChange={(e) => dispatch({ type: 'SET_GUESS', value: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder={t.placeholder(config.max)}
                aria-label={t.placeholder(config.max)}
                className="flex-1 px-4 py-3 rounded-2xl border-2 border-border bg-background font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
              />
              <button
                onClick={handleSubmit}
                disabled={!state.guess || throttled}
                aria-label={t.submit}
                className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {t.submit}
              </button>
            </div>
          )}

          {/* Change difficulty button */}
          {(state.status === 'won' || state.status === 'lost') && (
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => dispatch({ type: 'RESET' })}
                className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-all"
              >
                {t.reset}
              </button>
              <button
                onClick={() => dispatch({ type: 'START', difficulty: state.difficulty === 'easy' ? 'normal' : state.difficulty === 'normal' ? 'hard' : 'easy' })}
                className="flex-1 py-3 rounded-2xl border-2 border-border bg-muted font-bold hover:bg-accent transition-all text-sm"
              >
                {t.changeLevel}
              </button>
            </div>
          )}

          {/* History */}
          {state.history.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{t.history}</p>
              <div className="space-y-2 max-h-56 overflow-y-auto" role="log" aria-label={t.history}>
                {state.history.map((entry, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-4 py-2 rounded-xl border text-sm font-bold ${HINT_COLORS[entry.hint]}`}
                  >
                    <span>{entry.guess}</span>
                    <span>{t.hint[entry.hint]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </GameContainer>
  );
};

export default NumberGuessingGame;
