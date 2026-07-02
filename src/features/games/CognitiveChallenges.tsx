'use client';
import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useReducer,
} from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Utilities
// ─────────────────────────────────────────────────────────────────────────────

function fishYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getLocalStorageItem(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v !== null ? Number(v) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalStorageItem(key: string, value: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* silently fail */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component 1: ChimpTest
// ─────────────────────────────────────────────────────────────────────────────

const CHIMP_COPY = {
  ko: {
    title: '침팬지 테스트',
    subtitle: '침팬지는 인간보다 강한 단기 기억력을 갖고 있습니다',
    desc: '숫자가 화면에 잠깐 나타납니다. 사라진 후 1번부터 순서대로 클릭하세요.',
    scienceNote: '2007년 마쓰자와 데쓰로(松沢哲郎) 연구팀의 연구에서 침팬지(아이)가 인간 대학생보다 월등히 높은 단기 기억력을 보였습니다.',
    startBtn: '게임 시작',
    retryBtn: '다시 시도',
    restartBtn: '처음부터',
    nextBtn: '다음 레벨',
    level: '레벨',
    highScore: '최고 기록',
    howToPlay: '플레이 방법',
    howToPlayItems: [
      '숫자들이 0.8초간 표시됩니다.',
      '숫자가 사라지면 1부터 순서대로 클릭하세요.',
      '성공하면 숫자가 1개 증가합니다.',
      '틀리면 정답 위치가 표시됩니다.',
    ],
    memorizing: '숫자를 기억하세요!',
    clicking: '순서대로 클릭하세요!',
    success: '통과!',
    successSub: '다음 레벨로 넘어갑니다.',
    fail: '틀렸습니다!',
    failSub: '정답 위치를 확인하세요.',
    levelLabel: (n: number) => `레벨 ${n} — 숫자 ${n + 3}개`,
    highScoreLabel: (n: number) => `최고: 레벨 ${n}`,
    shareText: (level: number) => `침팬지 테스트 레벨 ${level} 도달! blog.oiyo.net`,
    copyBtn: '결과 복사',
    copiedBtn: '복사됨',
  },
  en: {
    title: 'Chimp Test',
    subtitle: 'Chimpanzees have stronger short-term memory than humans',
    desc: 'Numbers appear briefly. After they vanish, click them from 1 in ascending order.',
    scienceNote: 'In the 2007 Matsuzawa study (Kyoto University), chimpanzee Ai outperformed university students in this exact task — pointing to unique chimp working-memory superiority.',
    startBtn: 'Start Game',
    retryBtn: 'Try Again',
    restartBtn: 'Start Over',
    nextBtn: 'Next Level',
    level: 'Level',
    highScore: 'Best',
    howToPlay: 'How to Play',
    howToPlayItems: [
      'Numbers flash on screen for 0.8 seconds.',
      'After they vanish, click them from 1 in order.',
      'Success → one more number added.',
      'Fail → correct positions are revealed.',
    ],
    memorizing: 'Memorize the numbers!',
    clicking: 'Click in order!',
    success: 'Level Clear!',
    successSub: 'Moving to the next level.',
    fail: 'Wrong!',
    failSub: 'See where the numbers were.',
    levelLabel: (n: number) => `Level ${n} — ${n + 3} numbers`,
    highScoreLabel: (n: number) => `Best: Level ${n}`,
    shareText: (level: number) => `Chimp Test — reached Level ${level}! blog.oiyo.net`,
    copyBtn: 'Copy Result',
    copiedBtn: 'Copied!',
  },
  ja: {
    title: 'チンパンジーテスト',
    subtitle: 'チンパンジーは人間より強力な短期記憶を持つ',
    desc: '数字が短時間表示されます。消えた後、1から順番にクリックしてください。',
    scienceNote: '2007年の松沢哲郎研究チームの研究で、チンパンジーの「アイ」が京大の大学生より大幅に優れた短期記憶能力を示しました。',
    startBtn: 'ゲームスタート',
    retryBtn: 'もう一度',
    restartBtn: '最初から',
    nextBtn: '次のレベルへ',
    level: 'レベル',
    highScore: 'ベスト',
    howToPlay: '遊び方',
    howToPlayItems: [
      '数字が0.8秒間表示されます。',
      '消えたら1から順番にクリックしてください。',
      '成功すると数字が1つ増えます。',
      '失敗すると正解の位置が表示されます。',
    ],
    memorizing: '数字を覚えてください！',
    clicking: '順番にクリック！',
    success: 'クリア！',
    successSub: '次のレベルに進みます。',
    fail: 'ミス！',
    failSub: '正解の位置を確認してください。',
    levelLabel: (n: number) => `レベル ${n} — 数字 ${n + 3}個`,
    highScoreLabel: (n: number) => `ベスト: レベル ${n}`,
    shareText: (level: number) => `チンパンジーテスト レベル${level}到達！ blog.oiyo.net`,
    copyBtn: '結果をコピー',
    copiedBtn: 'コピー済み',
  },
} as const;

interface ChimpTile {
  id: number;
  num: number;
  col: number;
  row: number;
  state: 'hidden' | 'shown' | 'correct' | 'wrong' | 'revealed';
}

type ChimpPhase = 'idle' | 'memorize' | 'recall' | 'success' | 'fail';

interface ChimpState {
  phase: ChimpPhase;
  level: number;
  tiles: ChimpTile[];
  nextExpected: number;
  highScore: number;
  showHow: boolean;
}

type ChimpAction =
  | { type: 'START'; level: number; tiles: ChimpTile[]; highScore: number }
  | { type: 'HIDE_NUMBERS' }
  | { type: 'CLICK_TILE'; id: number }
  | { type: 'NEXT_LEVEL'; tiles: ChimpTile[] }
  | { type: 'RETRY'; tiles: ChimpTile[] }
  | { type: 'RESTART'; tiles: ChimpTile[] }
  | { type: 'TOGGLE_HOW' };

const CHIMP_COLS = 5;
const CHIMP_ROWS = 5;
const CHIMP_LS_KEY = 'chimp-test-high-score';

function buildTiles(level: number): ChimpTile[] {
  const count = level + 3;
  const allPositions = Array.from({ length: CHIMP_COLS * CHIMP_ROWS }, (_, i) => ({
    col: i % CHIMP_COLS,
    row: Math.floor(i / CHIMP_COLS),
  }));
  const positions = fishYatesShuffle(allPositions).slice(0, count);
  return positions.map((pos, i) => ({
    id: i,
    num: i + 1,
    col: pos.col,
    row: pos.row,
    state: 'shown' as const,
  }));
}

function chimpReducer(state: ChimpState, action: ChimpAction): ChimpState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        phase: 'memorize',
        level: action.level,
        tiles: action.tiles,
        nextExpected: 1,
        highScore: action.highScore,
        showHow: false,
      };
    case 'HIDE_NUMBERS':
      return {
        ...state,
        phase: 'recall',
        tiles: state.tiles.map((t) => ({ ...t, state: 'hidden' as const })),
      };
    case 'CLICK_TILE': {
      const tile = state.tiles.find((t) => t.id === action.id);
      if (!tile || tile.state !== 'hidden') return state;
      if (tile.num === state.nextExpected) {
        const updatedTiles = state.tiles.map((t) =>
          t.id === action.id ? { ...t, state: 'correct' as const } : t,
        );
        const allDone = state.nextExpected === state.tiles.length;
        if (allDone) {
          const newHigh = Math.max(state.level, state.highScore);
          setLocalStorageItem(CHIMP_LS_KEY, newHigh);
          return {
            ...state,
            phase: 'success',
            tiles: updatedTiles,
            highScore: newHigh,
          };
        }
        return { ...state, tiles: updatedTiles, nextExpected: state.nextExpected + 1 };
      }
      // Wrong click — reveal all tiles
      const revealedTiles = state.tiles.map((t) =>
        t.id === action.id
          ? { ...t, state: 'wrong' as const }
          : t.state === 'hidden'
            ? { ...t, state: 'revealed' as const }
            : t,
      );
      return { ...state, phase: 'fail', tiles: revealedTiles };
    }
    case 'NEXT_LEVEL':
      return {
        ...state,
        phase: 'memorize',
        level: state.level + 1,
        tiles: action.tiles,
        nextExpected: 1,
      };
    case 'RETRY':
      return {
        ...state,
        phase: 'memorize',
        tiles: action.tiles,
        nextExpected: 1,
      };
    case 'RESTART':
      return {
        ...state,
        phase: 'memorize',
        level: 1,
        tiles: action.tiles,
        nextExpected: 1,
      };
    case 'TOGGLE_HOW':
      return { ...state, showHow: !state.showHow };
    default:
      return state;
  }
}

export function ChimpTest({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const copy = CHIMP_COPY[locale];
  const [state, dispatch] = useReducer(chimpReducer, {
    phase: 'idle',
    level: 1,
    tiles: [],
    nextExpected: 1,
    highScore: 0,
    showHow: false,
  });
  const [copied, setCopied] = useState(false);
  const memorizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (memorizeTimerRef.current) clearTimeout(memorizeTimerRef.current);
    };
  }, []);

  // When phase becomes memorize, schedule auto-hide after 800ms
  useEffect(() => {
    if (state.phase === 'memorize') {
      if (memorizeTimerRef.current) clearTimeout(memorizeTimerRef.current);
      memorizeTimerRef.current = setTimeout(() => {
        dispatch({ type: 'HIDE_NUMBERS' });
      }, 800);
    }
  }, [state.phase, state.level]);

  const handleStart = useCallback(() => {
    const highScore = getLocalStorageItem(CHIMP_LS_KEY, 0);
    dispatch({ type: 'START', level: 1, tiles: buildTiles(1), highScore });
  }, []);

  const handleTileClick = useCallback((id: number) => {
    dispatch({ type: 'CLICK_TILE', id });
  }, []);

  const handleNextLevel = useCallback(() => {
    dispatch({ type: 'NEXT_LEVEL', tiles: buildTiles(state.level + 1) });
  }, [state.level]);

  const handleRetry = useCallback(() => {
    dispatch({ type: 'RETRY', tiles: buildTiles(state.level) });
  }, [state.level]);

  const handleRestart = useCallback(() => {
    dispatch({ type: 'RESTART', tiles: buildTiles(1) });
  }, []);

  const handleCopy = useCallback(() => {
    if (copied) return;
    const text = copy.shareText(state.level);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }, [copied, copy, state.level]);

  const tileStateClass = (tile: ChimpTile): string => {
    if (tile.state === 'shown')
      return 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-105 cursor-default';
    if (tile.state === 'hidden')
      return 'bg-slate-100 border-slate-200 text-transparent hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer';
    if (tile.state === 'correct')
      return 'bg-emerald-400 border-emerald-500 text-white opacity-60 cursor-default pointer-events-none';
    if (tile.state === 'wrong')
      return 'bg-red-500 border-red-600 text-white cursor-default';
    if (tile.state === 'revealed')
      return 'bg-orange-100 border-orange-300 text-orange-700 cursor-default';
    return '';
  };

  return (
    <Card className="not-prose mt-8 overflow-hidden border-2 border-emerald-100 shadow-2xl rounded-2xl max-w-lg mx-auto">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-slate-50 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl font-bold text-slate-900">{copy.title}</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5 font-bold">{copy.subtitle}</p>
          </div>
          {state.phase !== 'idle' && (
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {copy.level}
              </p>
              <p className="text-2xl font-bold text-emerald-600 leading-none">{state.level}</p>
              {state.highScore > 0 && (
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  {copy.highScoreLabel(state.highScore)}
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* Idle Screen */}
        {state.phase === 'idle' && (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center justify-center">
              <span className="text-4xl" role="img" aria-label="brain">🧠</span>
            </div>
            <p className="text-center text-slate-600 font-bold text-sm leading-relaxed max-w-xs">
              {copy.desc}
            </p>

            {/* How to play toggle */}
            <button
              onClick={() => dispatch({ type: 'TOGGLE_HOW' })}
              className="text-xs font-bold text-emerald-600 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
              aria-expanded={state.showHow}
              aria-controls="chimp-how-to-play"
            >
              {copy.howToPlay}
            </button>

            {state.showHow && (
              <ol
                id="chimp-how-to-play"
                className="text-sm text-slate-600 space-y-1 list-decimal list-inside bg-emerald-50 rounded-xl p-4 border border-emerald-100 w-full"
              >
                {copy.howToPlayItems.map((item, i) => (
                  <li key={i} className="font-bold">
                    {item}
                  </li>
                ))}
              </ol>
            )}

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-500 font-bold leading-relaxed">
              {copy.scienceNote}
            </div>

            <Button
              onClick={handleStart}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-10 font-bold text-base"
              aria-label={copy.startBtn}
            >
              {copy.startBtn}
            </Button>
          </div>
        )}

        {/* Game Board (memorize + recall) */}
        {(state.phase === 'memorize' || state.phase === 'recall' || state.phase === 'success' || state.phase === 'fail') && (
          <>
            {/* Phase Banner */}
            {(state.phase === 'memorize' || state.phase === 'recall') && (
              <div
                className={`text-center py-2 rounded-xl font-bold text-sm transition-colors duration-300 ${
                  state.phase === 'memorize'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-sky-100 text-sky-700'
                }`}
                role="status"
                aria-live="polite"
              >
                {state.phase === 'memorize' ? copy.memorizing : copy.clicking}
              </div>
            )}

            {(state.phase === 'success' || state.phase === 'fail') && (
              <div
                className={`text-center py-2 rounded-xl font-bold text-sm ${
                  state.phase === 'success'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
                role="alert"
                aria-live="assertive"
              >
                {state.phase === 'success' ? (
                  <>
                    {copy.success}{' '}
                    <span className="font-bold opacity-75">{copy.successSub}</span>
                  </>
                ) : (
                  <>
                    {copy.fail}{' '}
                    <span className="font-bold opacity-75">{copy.failSub}</span>
                  </>
                )}
              </div>
            )}

            {/* Level label */}
            <p className="text-xs text-center text-slate-400 font-bold tracking-wide">
              {copy.levelLabel(state.level)}
            </p>

            {/* Grid */}
            <div
              className="relative mx-auto bg-slate-50 border-2 border-slate-100 rounded-2xl overflow-hidden"
              style={{ width: '100%', maxWidth: 320, aspectRatio: '1 / 1' }}
              role="grid"
              aria-label={`Chimp Test board, level ${state.level}`}
            >
              {state.tiles.map((tile) => (
                <button
                  key={tile.id}
                  onClick={() => handleTileClick(tile.id)}
                  disabled={
                    state.phase !== 'recall' || tile.state !== 'hidden'
                  }
                  aria-label={
                    tile.state === 'shown' || tile.state === 'revealed'
                      ? `Number ${tile.num}`
                      : tile.state === 'correct'
                        ? `Correct ${tile.num}`
                        : `Tile ${tile.id + 1}`
                  }
                  role="gridcell"
                  style={{
                    position: 'absolute',
                    left: `${tile.col * 20 + 1}%`,
                    top: `${tile.row * 20 + 1}%`,
                    width: '18%',
                    height: '18%',
                  }}
                  className={`flex items-center justify-center rounded-xl border-2 font-bold text-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${tileStateClass(tile)}`}
                >
                  {tile.state === 'shown' ||
                  tile.state === 'correct' ||
                  tile.state === 'wrong' ||
                  tile.state === 'revealed'
                    ? tile.num
                    : ''}
                </button>
              ))}
            </div>
          </>
        )}
      </CardContent>

      {/* Footer actions */}
      {(state.phase === 'success' || state.phase === 'fail') && (
        <CardFooter className="flex flex-wrap gap-2 justify-center bg-slate-50 border-t border-slate-100 pt-4">
          {state.phase === 'success' && (
            <Button
              onClick={handleNextLevel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold"
              aria-label={copy.nextBtn}
            >
              {copy.nextBtn}
            </Button>
          )}
          {state.phase === 'fail' && (
            <>
              <Button
                onClick={handleRetry}
                variant="outline"
                className="rounded-full font-bold border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                aria-label={copy.retryBtn}
              >
                {copy.retryBtn}
              </Button>
              <Button
                onClick={handleRestart}
                variant="outline"
                className="rounded-full font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label={copy.restartBtn}
              >
                {copy.restartBtn}
              </Button>
            </>
          )}
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="rounded-full font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5"
            aria-label={copied ? copy.copiedBtn : copy.copyBtn}
          >
            {copied ? copy.copiedBtn : copy.copyBtn}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component 2: KeyboardReactionTest
// ─────────────────────────────────────────────────────────────────────────────

const KBD_COPY = {
  ko: {
    title: '키보드 반응 속도 테스트',
    subtitle: '정확도와 반응 속도를 동시에 측정합니다',
    desc: '화면에 표시된 키를 최대한 빠르고 정확하게 누르세요. 실수는 연속 콤보를 초기화합니다.',
    startBtn: '테스트 시작',
    modeLabel: '모드 선택',
    mode30: '30초',
    mode60: '60초',
    timeLeft: '남은 시간',
    accuracy: '정확도',
    avgReaction: '평균 반응 시간',
    streak: '연속 정답',
    attempts: '시도',
    correct: '정답',
    pressKey: '을(를) 누르세요',
    result: '결과',
    tryAgain: '다시 도전',
    totalAttempts: '총 시도',
    finalAccuracy: '최종 정확도',
    finalAvgMs: '평균 반응 시간',
    finalStreak: '최고 연속 기록',
    gradeExcellent: '최상위 반응 속도',
    gradeGood: '우수한 반응 속도',
    gradeAverage: '평균적인 반응 속도',
    gradeSlow: '반응 속도 개선 필요',
    gradeDesc: {
      excellent: '상위 10% 수준의 반응 속도입니다. 침팬지처럼 빠른 처리 속도를 가지고 있습니다.',
      good: '훈련된 타이피스트 수준의 반응 속도입니다.',
      average: '일반 성인의 평균적인 반응 속도 범위에 해당합니다.',
      slow: '계속 연습하면 반응 속도를 향상시킬 수 있습니다.',
    },
    scienceNote: '인간의 평균 키보드 반응 시간은 약 200–250ms입니다. 시각 처리(~100ms) + 신경 전달 + 근육 반응이 합쳐진 결과입니다.',
    copyBtn: '결과 복사',
    copiedBtn: '복사됨',
    shareText: (accuracy: number, avgMs: number) =>
      `키보드 반응 테스트 — 정확도 ${accuracy}%, 평균 ${avgMs}ms | blog.oiyo.net`,
    readyMsg: '준비...',
    goMsg: '시작!',
  },
  en: {
    title: 'Keyboard Reaction Test',
    subtitle: 'Measure accuracy and reaction speed simultaneously',
    desc: 'Press the displayed key as fast and accurately as possible. Mistakes reset your combo streak.',
    startBtn: 'Start Test',
    modeLabel: 'Mode',
    mode30: '30 sec',
    mode60: '60 sec',
    timeLeft: 'Time Left',
    accuracy: 'Accuracy',
    avgReaction: 'Avg Reaction',
    streak: 'Streak',
    attempts: 'Attempts',
    correct: 'Correct',
    pressKey: 'Press',
    result: 'Results',
    tryAgain: 'Try Again',
    totalAttempts: 'Total Attempts',
    finalAccuracy: 'Accuracy',
    finalAvgMs: 'Avg Reaction',
    finalStreak: 'Best Streak',
    gradeExcellent: 'Elite Reaction Speed',
    gradeGood: 'Good Reaction Speed',
    gradeAverage: 'Average Reaction Speed',
    gradeSlow: 'Keep Practicing',
    gradeDesc: {
      excellent: 'Top 10% reaction speed. Your processing speed rivals a chimpanzee!',
      good: 'Trained typist-level reaction speed.',
      average: 'Within the average adult reaction time range.',
      slow: 'Keep practicing — reaction speed improves with training.',
    },
    scienceNote: 'Average human keyboard reaction time is ~200–250ms, combining visual processing (~100ms), neural transmission, and muscle response.',
    copyBtn: 'Copy Result',
    copiedBtn: 'Copied!',
    shareText: (accuracy: number, avgMs: number) =>
      `Keyboard Reaction Test — Accuracy ${accuracy}%, Avg ${avgMs}ms | blog.oiyo.net`,
    readyMsg: 'Ready...',
    goMsg: 'Go!',
  },
  ja: {
    title: 'キーボード反応速度テスト',
    subtitle: '正確さと反応速度を同時に測定します',
    desc: '画面に表示されたキーをできるだけ速く正確に押してください。ミスはコンボをリセットします。',
    startBtn: 'テスト開始',
    modeLabel: 'モード',
    mode30: '30秒',
    mode60: '60秒',
    timeLeft: '残り時間',
    accuracy: '正確率',
    avgReaction: '平均反応時間',
    streak: '連続正解',
    attempts: '試行',
    correct: '正解',
    pressKey: 'を押してください',
    result: '結果',
    tryAgain: 'もう一度',
    totalAttempts: '総試行数',
    finalAccuracy: '最終正確率',
    finalAvgMs: '平均反応時間',
    finalStreak: '最高連続記録',
    gradeExcellent: '最高水準の反応速度',
    gradeGood: '優秀な反応速度',
    gradeAverage: '平均的な反応速度',
    gradeSlow: '練習で改善できます',
    gradeDesc: {
      excellent: '上位10%の反応速度です。チンパンジー並みの処理速度を持っています。',
      good: '熟練タイピスト水準の反応速度です。',
      average: '一般成人の平均的な反応時間の範囲内です。',
      slow: '練習を続けることで反応速度は向上します。',
    },
    scienceNote: '人間の平均キーボード反応時間は約200〜250msです。視覚処理（約100ms）＋神経伝達＋筋肉反応の合計です。',
    copyBtn: '結果をコピー',
    copiedBtn: 'コピー済み',
    shareText: (accuracy: number, avgMs: number) =>
      `キーボード反応テスト — 正確率 ${accuracy}%、平均 ${avgMs}ms | blog.oiyo.net`,
    readyMsg: '準備中...',
    goMsg: 'スタート！',
  },
} as const;

// Keys to display — alphanumeric, easy to see
const KBD_KEYS = 'ASDFJKLZXCVBNMQWERTYUIOP'.split('');

interface KbdStats {
  attempts: number;
  correct: number;
  reactionTimes: number[];
  streak: number;
  bestStreak: number;
}

type KbdPhase = 'idle' | 'countdown' | 'playing' | 'done';

interface KbdState {
  phase: KbdPhase;
  duration: 30 | 60;
  timeLeft: number;
  currentKey: string;
  pressStartMs: number;
  stats: KbdStats;
  lastResult: 'correct' | 'wrong' | null;
  countdownTick: number;
}

type KbdAction =
  | { type: 'SET_MODE'; duration: 30 | 60 }
  | { type: 'START_COUNTDOWN' }
  | { type: 'TICK_COUNTDOWN' }
  | { type: 'BEGIN_PLAYING'; currentKey: string; now: number }
  | { type: 'TICK_TIMER' }
  | { type: 'KEY_PRESS'; key: string; now: number }
  | { type: 'NEXT_KEY'; key: string; now: number }
  | { type: 'FINISH' }
  | { type: 'RESET' };

function pickKey(exclude?: string): string {
  const pool = KBD_KEYS.filter((k) => k !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

const KBD_LS_KEY_SCORE = 'kbd-reaction-best-ms';

function kbdReducer(state: KbdState, action: KbdAction): KbdState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, duration: action.duration, timeLeft: action.duration };
    case 'START_COUNTDOWN':
      return { ...state, phase: 'countdown', countdownTick: 3 };
    case 'TICK_COUNTDOWN': {
      const next = state.countdownTick - 1;
      if (next <= 0) return state; // BEGIN_PLAYING takes over
      return { ...state, countdownTick: next };
    }
    case 'BEGIN_PLAYING':
      return {
        ...state,
        phase: 'playing',
        currentKey: action.currentKey,
        pressStartMs: action.now,
        timeLeft: state.duration,
        stats: {
          attempts: 0,
          correct: 0,
          reactionTimes: [],
          streak: 0,
          bestStreak: 0,
        },
        lastResult: null,
      };
    case 'TICK_TIMER': {
      const newTime = state.timeLeft - 1;
      if (newTime <= 0) return { ...state, timeLeft: 0, phase: 'done' };
      return { ...state, timeLeft: newTime };
    }
    case 'KEY_PRESS': {
      const reactionMs = action.now - state.pressStartMs;
      const isCorrect = action.key.toUpperCase() === state.currentKey;
      const newStats: KbdStats = {
        attempts: state.stats.attempts + 1,
        correct: state.stats.correct + (isCorrect ? 1 : 0),
        reactionTimes: isCorrect
          ? [...state.stats.reactionTimes, reactionMs]
          : state.stats.reactionTimes,
        streak: isCorrect ? state.stats.streak + 1 : 0,
        bestStreak: isCorrect
          ? Math.max(state.stats.bestStreak, state.stats.streak + 1)
          : state.stats.bestStreak,
      };
      if (isCorrect && reactionMs < 600) {
        const prev = getLocalStorageItem(KBD_LS_KEY_SCORE, 9999);
        if (reactionMs < prev) setLocalStorageItem(KBD_LS_KEY_SCORE, reactionMs);
      }
      return {
        ...state,
        stats: newStats,
        lastResult: isCorrect ? 'correct' : 'wrong',
      };
    }
    case 'NEXT_KEY':
      return {
        ...state,
        currentKey: action.key,
        pressStartMs: action.now,
        lastResult: null,
      };
    case 'FINISH':
      return { ...state, phase: 'done' };
    case 'RESET':
      return {
        phase: 'idle',
        duration: state.duration,
        timeLeft: state.duration,
        currentKey: '',
        pressStartMs: 0,
        stats: {
          attempts: 0,
          correct: 0,
          reactionTimes: [],
          streak: 0,
          bestStreak: 0,
        },
        lastResult: null,
        countdownTick: 3,
      };
    default:
      return state;
  }
}

export function KeyboardReactionTest({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const copy = KBD_COPY[locale];
  const [state, dispatch] = useReducer(kbdReducer, {
    phase: 'idle',
    duration: 30,
    timeLeft: 30,
    currentKey: '',
    pressStartMs: 0,
    stats: {
      attempts: 0,
      correct: 0,
      reactionTimes: [],
      streak: 0,
      bestStreak: 0,
    },
    lastResult: null,
    countdownTick: 3,
  });
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  // Derived stats
  const avgMs =
    state.stats.reactionTimes.length > 0
      ? Math.round(
          state.stats.reactionTimes.reduce((a, b) => a + b, 0) /
            state.stats.reactionTimes.length,
        )
      : 0;

  const accuracyPct =
    state.stats.attempts > 0
      ? Math.round((state.stats.correct / state.stats.attempts) * 100)
      : 0;

  const grade =
    avgMs > 0 && avgMs < 200
      ? 'excellent'
      : avgMs >= 200 && avgMs < 280
        ? 'good'
        : avgMs >= 280 && avgMs < 400
          ? 'average'
          : 'slow';

  // Countdown logic
  useEffect(() => {
    if (state.phase !== 'countdown') return;

    let tick = 3;
    const run = () => {
      tick -= 1;
      if (tick <= 0) {
        dispatch({ type: 'BEGIN_PLAYING', currentKey: pickKey(), now: Date.now() });
      } else {
        dispatch({ type: 'TICK_COUNTDOWN' });
        countdownRef.current = setTimeout(run, 1000);
      }
    };
    countdownRef.current = setTimeout(run, 1000);

    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [state.phase]);

  // Game timer
  useEffect(() => {
    if (state.phase !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.phase]);

  // Focus game area when playing for keyboard capture
  useEffect(() => {
    if (state.phase === 'playing' && gameAreaRef.current) {
      gameAreaRef.current.focus();
    }
  }, [state.phase]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (state.phase !== 'playing') return;
      const key = e.key.toUpperCase();
      if (!KBD_KEYS.includes(key)) return;
      e.preventDefault();

      const now = Date.now();
      dispatch({ type: 'KEY_PRESS', key, now });

      // Schedule next key after brief feedback delay
      setTimeout(() => {
        dispatch({ type: 'NEXT_KEY', key: pickKey(state.currentKey), now: Date.now() });
      }, 150);
    },
    [state.phase, state.currentKey],
  );

  const handleStart = useCallback(() => {
    dispatch({ type: 'START_COUNTDOWN' });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const handleCopy = useCallback(() => {
    if (copied) return;
    const text = copy.shareText(accuracyPct, avgMs);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }, [copied, copy, accuracyPct, avgMs]);

  const gradeLabel =
    grade === 'excellent'
      ? copy.gradeExcellent
      : grade === 'good'
        ? copy.gradeGood
        : grade === 'average'
          ? copy.gradeAverage
          : copy.gradeSlow;

  const gradeColor =
    grade === 'excellent'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : grade === 'good'
        ? 'text-sky-700 bg-sky-50 border-sky-200'
        : grade === 'average'
          ? 'text-amber-700 bg-amber-50 border-amber-200'
          : 'text-slate-600 bg-slate-50 border-slate-200';

  return (
    <Card className="not-prose mt-8 overflow-hidden border-2 border-emerald-100 shadow-2xl rounded-2xl max-w-lg mx-auto">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-slate-50 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl font-bold text-slate-900">{copy.title}</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5 font-bold">{copy.subtitle}</p>
          </div>
          {state.phase === 'playing' && (
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {copy.timeLeft}
              </p>
              <p
                className={`text-2xl font-bold leading-none ${
                  state.timeLeft <= 10 ? 'text-red-500' : 'text-emerald-600'
                }`}
              >
                {state.timeLeft}s
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* Idle Screen */}
        {state.phase === 'idle' && (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex items-center justify-center">
              <span className="text-4xl" role="img" aria-label="keyboard">⌨️</span>
            </div>
            <p className="text-center text-slate-600 font-bold text-sm leading-relaxed max-w-xs">
              {copy.desc}
            </p>

            {/* Mode selector */}
            <div className="flex gap-3 items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {copy.modeLabel}
              </span>
              {([30, 60] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => dispatch({ type: 'SET_MODE', duration: d })}
                  className={`px-5 py-2 rounded-full text-sm font-bold border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    state.duration === d
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                  aria-pressed={state.duration === d}
                  aria-label={d === 30 ? copy.mode30 : copy.mode60}
                >
                  {d === 30 ? copy.mode30 : copy.mode60}
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-500 font-bold leading-relaxed">
              {copy.scienceNote}
            </div>

            <Button
              onClick={handleStart}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-10 font-bold text-base"
              aria-label={copy.startBtn}
            >
              {copy.startBtn}
            </Button>
          </div>
        )}

        {/* Countdown Screen */}
        {state.phase === 'countdown' && (
          <div className="flex flex-col items-center justify-center gap-4 py-10">
            <div
              key={state.countdownTick}
              className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-300 flex items-center justify-center"
              role="status"
              aria-live="polite"
              aria-label={`${copy.readyMsg} ${state.countdownTick}`}
            >
              <span className="text-5xl font-bold text-emerald-700">{state.countdownTick}</span>
            </div>
            <p className="text-slate-500 font-bold">{copy.readyMsg}</p>
          </div>
        )}

        {/* Playing Screen */}
        {state.phase === 'playing' && (
          <div
            ref={gameAreaRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="focus:outline-none"
            aria-label="Keyboard reaction game area — press the displayed key"
            role="application"
          >
            {/* Live stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                {
                  label: copy.accuracy,
                  value: `${accuracyPct}%`,
                  color: accuracyPct >= 90 ? 'text-emerald-600' : accuracyPct >= 70 ? 'text-amber-600' : 'text-red-500',
                },
                {
                  label: copy.avgReaction,
                  value: avgMs > 0 ? `${avgMs}ms` : '—',
                  color: 'text-sky-600',
                },
                {
                  label: copy.streak,
                  value: String(state.stats.streak),
                  color: 'text-violet-600',
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="text-center bg-slate-50 rounded-xl border border-slate-100 py-2 px-1"
                >
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {label}
                  </p>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Key display */}
            <div className="flex flex-col items-center gap-4 py-6">
              <p className="text-sm font-bold text-slate-500">
                {locale === 'ko'
                  ? `'${state.currentKey}' ${copy.pressKey}`
                  : locale === 'ja'
                    ? `'${state.currentKey}' ${copy.pressKey}`
                    : `${copy.pressKey} '${state.currentKey}'`}
              </p>
              <div
                className={`w-28 h-28 rounded-2xl border-4 flex items-center justify-center font-bold text-6xl transition-all duration-100 ${
                  state.lastResult === 'correct'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-700 scale-110'
                    : state.lastResult === 'wrong'
                      ? 'bg-red-100 border-red-400 text-red-700 scale-95'
                      : 'bg-white border-slate-300 text-slate-700'
                }`}
                role="img"
                aria-label={`Target key: ${state.currentKey}`}
              >
                {state.currentKey}
              </div>
              <p className="text-xs text-slate-400 font-bold">
                {copy.correct}: {state.stats.correct} / {copy.attempts}: {state.stats.attempts}
              </p>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {state.phase === 'done' && (
          <div className="space-y-4">
            <h3 className="text-center text-lg font-bold text-slate-800">{copy.result}</h3>

            {/* Grade badge */}
            {avgMs > 0 && (
              <div className={`rounded-xl border-2 p-4 text-center ${gradeColor}`}>
                <p className="font-bold text-base">{gradeLabel}</p>
                <p className="text-xs mt-1 opacity-80">{copy.gradeDesc[grade]}</p>
              </div>
            )}

            {/* Stat grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: copy.finalAccuracy, value: `${accuracyPct}%` },
                { label: copy.finalAvgMs, value: avgMs > 0 ? `${avgMs}ms` : '—' },
                { label: copy.totalAttempts, value: String(state.stats.attempts) },
                { label: copy.finalStreak, value: String(state.stats.bestStreak) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-center"
                >
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {label}
                  </p>
                  <p className="text-2xl font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 font-bold leading-relaxed">
              {copy.scienceNote}
            </div>
          </div>
        )}
      </CardContent>

      {state.phase === 'done' && (
        <CardFooter className="flex flex-wrap gap-2 justify-center bg-slate-50 border-t border-slate-100 pt-4">
          <Button
            onClick={handleReset}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold"
            aria-label={copy.tryAgain}
          >
            {copy.tryAgain}
          </Button>
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="rounded-full font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5"
            aria-label={copied ? copy.copiedBtn : copy.copyBtn}
          >
            {copied ? copy.copiedBtn : copy.copyBtn}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
