/**
 * BoardGames.tsx
 * ConnectFour and TierListMaker — ported from ahoxy.com with improvements.
 * Framework-agnostic (no Next.js imports). Inline i18n for ko/en/ja.
 * Named exports only. TypeScript strict, no `any`.
 */

'use client';
import React, {
  useState,
  useEffect,
  useCallback,
  useReducer,
  useRef,
  useMemo,
} from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─────────────────────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────────────────────

type Locale = 'ko' | 'en' | 'ja';

// ─────────────────────────────────────────────────────────────────────────────
// Component 1: ConnectFour
// ─────────────────────────────────────────────────────────────────────────────

const CF_COPY = {
  ko: {
    title: '사목 (Connect Four)',
    subtitle: 'AI와 대결하는 7×6 전략 보드게임',
    playerTurn: '당신의 차례 (빨간)',
    aiTurn: 'AI 생각 중... (노란)',
    playerWins: '당신이 이겼습니다!',
    aiWins: 'AI가 이겼습니다!',
    draw: '무승부!',
    newGame: '새 게임',
    reset: '점수 초기화',
    difficulty: '난이도',
    easy: '쉬움',
    hard: '어려움',
    playerScore: '플레이어',
    aiScore: 'AI',
    draws: '무승부',
    col: (c: number) => `${c + 1}열에 놓기`,
    ariaBoard: '7열 6행 사목 게임판',
    ariaCell: (r: number, c: number, v: number) =>
      v === 0 ? `행${r + 1} 열${c + 1} 빈칸` : v === 1 ? `행${r + 1} 열${c + 1} 플레이어` : `행${r + 1} 열${c + 1} AI`,
  },
  en: {
    title: 'Connect Four',
    subtitle: '7×6 strategy board game vs AI',
    playerTurn: 'Your turn (Red)',
    aiTurn: 'AI thinking... (Yellow)',
    playerWins: 'You win!',
    aiWins: 'AI wins!',
    draw: 'Draw!',
    newGame: 'New Game',
    reset: 'Reset Scores',
    difficulty: 'Difficulty',
    easy: 'Easy',
    hard: 'Hard',
    playerScore: 'Player',
    aiScore: 'AI',
    draws: 'Draws',
    col: (c: number) => `Drop in column ${c + 1}`,
    ariaBoard: '7 column 6 row Connect Four board',
    ariaCell: (r: number, c: number, v: number) =>
      v === 0 ? `Row${r + 1} Col${c + 1} empty` : v === 1 ? `Row${r + 1} Col${c + 1} player` : `Row${r + 1} Col${c + 1} AI`,
  },
  ja: {
    title: '四目並べ (Connect Four)',
    subtitle: 'AIと対戦する7×6戦略ボードゲーム',
    playerTurn: 'あなたの番 (赤)',
    aiTurn: 'AI思考中... (黄)',
    playerWins: 'あなたの勝ちです！',
    aiWins: 'AIの勝ちです！',
    draw: '引き分け！',
    newGame: '新しいゲーム',
    reset: 'スコアリセット',
    difficulty: '難易度',
    easy: '簡単',
    hard: '難しい',
    playerScore: 'プレイヤー',
    aiScore: 'AI',
    draws: '引き分け',
    col: (c: number) => `${c + 1}列目に置く`,
    ariaBoard: '7列6行の四目並べボード',
    ariaCell: (r: number, c: number, v: number) =>
      v === 0 ? `行${r + 1} 列${c + 1} 空` : v === 1 ? `行${r + 1} 列${c + 1} プレイヤー` : `行${r + 1} 列${c + 1} AI`,
  },
} as const;

const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER = 1;
const AI = 2;
const CONNECT = 4;

type CFCell = 0 | 1 | 2;
type CFBoard = CFCell[][];
type CFDifficulty = 'easy' | 'hard';
type CFStatus = 'playing' | 'player_win' | 'ai_win' | 'draw';

interface CFState {
  board: CFBoard;
  status: CFStatus;
  winCells: [number, number][];
  isAiTurn: boolean;
  difficulty: CFDifficulty;
  playerScore: number;
  aiScore: number;
  drawCount: number;
  droppingCol: number | null; // column currently animating
}

type CFAction =
  | { type: 'DROP'; col: number }
  | { type: 'AI_MOVE'; col: number }
  | { type: 'NEW_GAME' }
  | { type: 'RESET_SCORES' }
  | { type: 'SET_DIFFICULTY'; difficulty: CFDifficulty };

function emptyBoard(): CFBoard {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY) as CFCell[]);
}

function findRow(board: CFBoard, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) return r;
  }
  return -1;
}

function checkWin(board: CFBoard, row: number, col: number, player: CFCell): [boolean, [number, number][]] {
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const cells: [number, number][] = [[row, col]];
    for (let i = 1; i < CONNECT; i++) {
      const nr = row + i * dr, nc = col + i * dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) cells.push([nr, nc]);
      else break;
    }
    for (let i = 1; i < CONNECT; i++) {
      const nr = row - i * dr, nc = col - i * dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) cells.push([nr, nc]);
      else break;
    }
    if (cells.length >= CONNECT) return [true, cells];
  }
  return [false, []];
}

function isDraw(board: CFBoard): boolean {
  return board[0].every((c) => c !== EMPTY);
}

function evalWindow(pCount: number, oCount: number, eCount: number): number {
  if (pCount === CONNECT) return 100;
  if (pCount === 3 && eCount === 1) return 5;
  if (pCount === 2 && eCount === 2) return 2;
  if (oCount === 3 && eCount === 1) return -4;
  return 0;
}

function evalBoard(board: CFBoard, player: CFCell): number {
  const opp = (player === AI ? PLAYER : AI) as CFCell;
  let score = 0;

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - CONNECT; c++) {
      let p = 0, o = 0, e = 0;
      for (let i = 0; i < CONNECT; i++) {
        const v = board[r][c + i];
        if (v === player) p++;
        else if (v === opp) o++;
        else e++;
      }
      score += evalWindow(p, o, e);
    }
  }
  // Vertical
  for (let r = 0; r <= ROWS - CONNECT; r++) {
    for (let c = 0; c < COLS; c++) {
      let p = 0, o = 0, e = 0;
      for (let i = 0; i < CONNECT; i++) {
        const v = board[r + i][c];
        if (v === player) p++;
        else if (v === opp) o++;
        else e++;
      }
      score += evalWindow(p, o, e);
    }
  }
  // Diagonal down-right
  for (let r = 0; r <= ROWS - CONNECT; r++) {
    for (let c = 0; c <= COLS - CONNECT; c++) {
      let p = 0, o = 0, e = 0;
      for (let i = 0; i < CONNECT; i++) {
        const v = board[r + i][c + i];
        if (v === player) p++;
        else if (v === opp) o++;
        else e++;
      }
      score += evalWindow(p, o, e);
    }
  }
  // Diagonal down-left
  for (let r = 0; r <= ROWS - CONNECT; r++) {
    for (let c = CONNECT - 1; c < COLS; c++) {
      let p = 0, o = 0, e = 0;
      for (let i = 0; i < CONNECT; i++) {
        const v = board[r + i][c - i];
        if (v === player) p++;
        else if (v === opp) o++;
        else e++;
      }
      score += evalWindow(p, o, e);
    }
  }
  // Center column bonus
  const center = Math.floor(COLS / 2);
  for (let r = 0; r < ROWS; r++) {
    if (board[r][center] === player) score += 3;
  }
  return score;
}

function minimax(
  board: CFBoard,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  const validCols = Array.from({ length: COLS }, (_, i) => i).filter((c) => board[0][c] === EMPTY);
  if (depth === 0 || validCols.length === 0) return evalBoard(board, AI);

  if (maximizing) {
    let best = Number.NEGATIVE_INFINITY;
    for (const col of validCols) {
      const row = findRow(board, col);
      const copy: CFBoard = board.map((r) => [...r] as CFCell[]);
      copy[row][col] = AI;
      const val = minimax(copy, depth - 1, alpha, beta, false);
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Number.POSITIVE_INFINITY;
    for (const col of validCols) {
      const row = findRow(board, col);
      const copy: CFBoard = board.map((r) => [...r] as CFCell[]);
      copy[row][col] = PLAYER;
      const val = minimax(copy, depth - 1, alpha, beta, true);
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function findMediumMove(board: CFBoard, validCols: number[]): number {
  // Win immediately
  for (const col of validCols) {
    const row = findRow(board, col);
    const copy: CFBoard = board.map((r) => [...r] as CFCell[]);
    copy[row][col] = AI;
    const [win] = checkWin(copy, row, col, AI);
    if (win) return col;
  }
  // Block player win
  for (const col of validCols) {
    const row = findRow(board, col);
    const copy: CFBoard = board.map((r) => [...r] as CFCell[]);
    copy[row][col] = PLAYER;
    const [win] = checkWin(copy, row, col, PLAYER);
    if (win) return col;
  }
  // Prefer center
  const center = Math.floor(COLS / 2);
  if (validCols.includes(center)) return center;
  return validCols[Math.floor(Math.random() * validCols.length)];
}

function getBestMove(board: CFBoard, difficulty: CFDifficulty): number {
  const validCols = Array.from({ length: COLS }, (_, i) => i).filter((c) => board[0][c] === EMPTY);
  if (validCols.length === 0) return 0;

  if (difficulty === 'easy') {
    // 30% chance smart move, 70% random
    if (Math.random() < 0.3) return findMediumMove(board, validCols);
    return validCols[Math.floor(Math.random() * validCols.length)];
  }

  // Hard: full minimax depth 5
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestCol = validCols[Math.floor(Math.random() * validCols.length)];
  for (const col of validCols) {
    const row = findRow(board, col);
    const copy: CFBoard = board.map((r) => [...r] as CFCell[]);
    copy[row][col] = AI;
    const score = minimax(copy, 5, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, false);
    if (score > bestScore) { bestScore = score; bestCol = col; }
  }
  return bestCol;
}

function applyMove(state: CFState, col: number, player: CFCell): Partial<CFState> {
  const board: CFBoard = state.board.map((r) => [...r] as CFCell[]);
  const row = findRow(board, col);
  if (row === -1) return {};
  board[row][col] = player;
  const [won, winCells] = checkWin(board, row, col, player);
  if (won) {
    const status: CFStatus = player === PLAYER ? 'player_win' : 'ai_win';
    return {
      board,
      status,
      winCells: winCells as [number, number][],
      playerScore: player === PLAYER ? state.playerScore + 1 : state.playerScore,
      aiScore: player === AI ? state.aiScore + 1 : state.aiScore,
      isAiTurn: false,
      droppingCol: null,
    };
  }
  if (isDraw(board)) {
    return { board, status: 'draw', drawCount: state.drawCount + 1, isAiTurn: false, droppingCol: null };
  }
  return { board, isAiTurn: player === PLAYER, droppingCol: null };
}

function cfReducer(state: CFState, action: CFAction): CFState {
  switch (action.type) {
    case 'DROP': {
      if (state.status !== 'playing' || state.isAiTurn) return state;
      if (state.board[0][action.col] !== EMPTY) return state;
      const updates = applyMove(state, action.col, PLAYER);
      return { ...state, ...updates, droppingCol: action.col };
    }
    case 'AI_MOVE': {
      if (state.status !== 'playing' || !state.isAiTurn) return state;
      const updates = applyMove(state, action.col, AI);
      return { ...state, ...updates, droppingCol: action.col };
    }
    case 'NEW_GAME':
      return {
        ...state,
        board: emptyBoard(),
        status: 'playing',
        winCells: [],
        isAiTurn: false,
        droppingCol: null,
      };
    case 'RESET_SCORES':
      return {
        ...state,
        board: emptyBoard(),
        status: 'playing',
        winCells: [],
        isAiTurn: false,
        droppingCol: null,
        playerScore: 0,
        aiScore: 0,
        drawCount: 0,
      };
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.difficulty };
    default:
      return state;
  }
}

function cfInitState(): CFState {
  return {
    board: emptyBoard(),
    status: 'playing',
    winCells: [],
    isAiTurn: false,
    difficulty: 'hard',
    playerScore: 0,
    aiScore: 0,
    drawCount: 0,
    droppingCol: null,
  };
}

export function ConnectFour({ locale = 'ko' }: { locale?: Locale }) {
  const copy = CF_COPY[locale];
  const [state, dispatch] = useReducer(cfReducer, undefined, cfInitState);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI move trigger
  useEffect(() => {
    if (state.status !== 'playing' || !state.isAiTurn) return;
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      const col = getBestMove(state.board, state.difficulty);
      dispatch({ type: 'AI_MOVE', col });
    }, 600);
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [state.isAiTurn, state.status, state.board, state.difficulty]);

  const handleColClick = useCallback((col: number) => {
    dispatch({ type: 'DROP', col });
  }, []);

  const statusMsg = useMemo(() => {
    if (state.status === 'player_win') return copy.playerWins;
    if (state.status === 'ai_win') return copy.aiWins;
    if (state.status === 'draw') return copy.draw;
    if (state.isAiTurn) return copy.aiTurn;
    return copy.playerTurn;
  }, [state.status, state.isAiTurn, copy]);

  const statusColor = useMemo(() => {
    if (state.status === 'player_win') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (state.status === 'ai_win') return 'bg-red-100 text-red-800 border-red-200';
    if (state.status === 'draw') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (state.isAiTurn) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  }, [state.status, state.isAiTurn]);

  const isWinCell = useCallback((r: number, c: number) =>
    state.winCells.some(([wr, wc]) => wr === r && wc === c),
    [state.winCells]
  );

  const cellClass = useCallback((r: number, c: number): string => {
    const v = state.board[r][c];
    const win = isWinCell(r, c);
    if (win) return 'bg-emerald-400 border-2 border-emerald-600 scale-110';
    if (v === PLAYER) return 'bg-red-500 border-2 border-red-600 shadow-inner';
    if (v === AI) return 'bg-yellow-400 border-2 border-yellow-500 shadow-inner';
    return 'bg-slate-100 border-2 border-slate-200 hover:bg-slate-200';
  }, [state.board, isWinCell]);

  const canDrop = state.status === 'playing' && !state.isAiTurn;

  return (
    <Card className="not-prose mt-8 overflow-hidden border-2 border-emerald-100 shadow-2xl rounded-2xl max-w-lg mx-auto">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-slate-50 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl font-bold text-slate-900">{copy.title}</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5 font-bold">{copy.subtitle}</p>
          </div>
          {/* Difficulty selector */}
          <div className="flex gap-1 shrink-0">
            {(['easy', 'hard'] as CFDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => dispatch({ type: 'SET_DIFFICULTY', difficulty: d })}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  state.difficulty === d
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                }`}
                aria-pressed={state.difficulty === d}
                aria-label={d === 'easy' ? copy.easy : copy.hard}
              >
                {d === 'easy' ? copy.easy : copy.hard}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {/* Score row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-red-50 rounded-xl border border-red-100 py-2 px-1">
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest">{copy.playerScore}</p>
            <p className="text-2xl font-bold text-red-600">{state.playerScore}</p>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-100 py-2 px-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{copy.draws}</p>
            <p className="text-2xl font-bold text-slate-600">{state.drawCount}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl border border-yellow-100 py-2 px-1">
            <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest">{copy.aiScore}</p>
            <p className="text-2xl font-bold text-yellow-500">{state.aiScore}</p>
          </div>
        </div>

        {/* Status bar */}
        <div
          className={`rounded-xl border px-3 py-2 text-center text-sm font-bold transition-colors duration-300 ${statusColor}`}
          role="status"
          aria-live="polite"
        >
          {statusMsg}
        </div>

        {/* Board */}
        <div
          className="bg-blue-700 rounded-2xl p-2 shadow-inner"
          role="grid"
          aria-label={copy.ariaBoard}
        >
          {/* Column drop buttons (hidden visually but accessible) */}
          <div className="grid mb-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: '0.375rem' }}>
            {Array.from({ length: COLS }, (_, c) => (
              <button
                key={c}
                onClick={() => handleColClick(c)}
                disabled={!canDrop || state.board[0][c] !== EMPTY}
                aria-label={copy.col(c)}
                className={`h-3 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  canDrop && state.board[0][c] === EMPTY
                    ? 'bg-white/30 hover:bg-white/60 cursor-pointer'
                    : 'bg-transparent cursor-default'
                }`}
              />
            ))}
          </div>

          {/* Cells */}
          {state.board.map((row, r) => (
            <div
              key={r}
              className="grid"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: '0.375rem', marginBottom: '0.375rem' }}
            >
              {row.map((cell, c) => (
                <button
                  key={c}
                  onClick={() => handleColClick(c)}
                  disabled={!canDrop || state.board[0][c] === (r === 0 ? cell : EMPTY) === false ? false : !canDrop}
                  aria-label={copy.ariaCell(r, c, cell)}
                  role="gridcell"
                  className={`aspect-square rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${cellClass(r, c)} ${canDrop && cell === EMPTY ? 'cursor-pointer' : 'cursor-default'}`}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 justify-center bg-slate-50 border-t border-slate-100 pt-4">
        <Button
          onClick={() => dispatch({ type: 'NEW_GAME' })}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold"
          aria-label={copy.newGame}
        >
          {copy.newGame}
        </Button>
        <Button
          onClick={() => dispatch({ type: 'RESET_SCORES' })}
          variant="outline"
          className="rounded-full font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label={copy.reset}
        >
          {copy.reset}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component 2: TierListMaker
// ─────────────────────────────────────────────────────────────────────────────

const TL_COPY = {
  ko: {
    title: '티어 리스트 메이커',
    subtitle: '아이템을 S~D 등급으로 분류하세요',
    unranked: '미분류',
    addItem: '아이템 추가',
    addItemPlaceholder: '새 아이템 이름...',
    add: '추가',
    reset: '초기화',
    copyResults: '결과 복사',
    copied: '복사됨!',
    removeItem: '아이템 삭제',
    moveToTier: (tier: string) => `${tier} 등급으로 이동`,
    moveToUnranked: '미분류로 이동',
    selectItemHint: '아이템을 클릭하여 선택한 후, 등급 헤더를 클릭하면 이동합니다.',
    selected: '선택됨',
    tierLabel: (t: string) => `${t} 등급`,
    empty: '(비어있음)',
    duplicateWarning: '이미 존재하는 아이템입니다.',
    ariaBoard: '티어 리스트 보드',
  },
  en: {
    title: 'Tier List Maker',
    subtitle: 'Rank items from S to D tier',
    unranked: 'Unranked',
    addItem: 'Add Item',
    addItemPlaceholder: 'New item name...',
    add: 'Add',
    reset: 'Reset',
    copyResults: 'Copy Results',
    copied: 'Copied!',
    removeItem: 'Remove item',
    moveToTier: (tier: string) => `Move to ${tier} tier`,
    moveToUnranked: 'Move to Unranked',
    selectItemHint: 'Click an item to select it, then click a tier header to move it.',
    selected: 'Selected',
    tierLabel: (t: string) => `${t} Tier`,
    empty: '(empty)',
    duplicateWarning: 'Item already exists.',
    ariaBoard: 'Tier list board',
  },
  ja: {
    title: 'ティアリストメーカー',
    subtitle: 'アイテムをS〜Dランクに分類',
    unranked: '未分類',
    addItem: 'アイテム追加',
    addItemPlaceholder: '新しいアイテム名...',
    add: '追加',
    reset: 'リセット',
    copyResults: '結果をコピー',
    copied: 'コピー済み！',
    removeItem: 'アイテムを削除',
    moveToTier: (tier: string) => `${tier}ランクへ移動`,
    moveToUnranked: '未分類へ移動',
    selectItemHint: 'アイテムをクリックして選択し、ランクヘッダーをクリックすると移動します。',
    selected: '選択中',
    tierLabel: (t: string) => `${t}ランク`,
    empty: '（空）',
    duplicateWarning: 'すでに存在するアイテムです。',
    ariaBoard: 'ティアリストボード',
  },
} as const;

interface TLItem {
  id: string;
  label: string;
}

interface TLTier {
  id: string;
  name: string;
  color: string;
  headerColor: string;
  items: TLItem[];
}

const UNRANKED_ID = 'unranked';

const DEFAULT_ANIMALS: TLItem[] = [
  { id: 'a1', label: '🦁 Lion' },
  { id: 'a2', label: '🐬 Dolphin' },
  { id: 'a3', label: '🦊 Fox' },
  { id: 'a4', label: '🐧 Penguin' },
  { id: 'a5', label: '🦅 Eagle' },
  { id: 'a6', label: '🐘 Elephant' },
  { id: 'a7', label: '🦒 Giraffe' },
  { id: 'a8', label: '🐺 Wolf' },
  { id: 'a9', label: '🦦 Otter' },
  { id: 'a10', label: '🐼 Panda' },
  { id: 'a11', label: '🦓 Zebra' },
  { id: 'a12', label: '🐙 Octopus' },
  { id: 'a13', label: '🦜 Parrot' },
  { id: 'a14', label: '🐻‍❄️ Polar Bear' },
  { id: 'a15', label: '🦈 Shark' },
  { id: 'a16', label: '🦋 Butterfly' },
  { id: 'a17', label: '🐸 Frog' },
  { id: 'a18', label: '🦔 Hedgehog' },
  { id: 'a19', label: '🐢 Turtle' },
  { id: 'a20', label: '🦘 Kangaroo' },
];

const TIER_DEFS = [
  { id: 's', name: 'S', color: 'bg-red-100 border-red-200', headerColor: 'bg-red-500 text-white' },
  { id: 'a', name: 'A', color: 'bg-orange-100 border-orange-200', headerColor: 'bg-orange-500 text-white' },
  { id: 'b', name: 'B', color: 'bg-yellow-100 border-yellow-200', headerColor: 'bg-yellow-400 text-slate-800' },
  { id: 'c', name: 'C', color: 'bg-emerald-100 border-emerald-200', headerColor: 'bg-emerald-500 text-white' },
  { id: 'd', name: 'D', color: 'bg-blue-100 border-blue-200', headerColor: 'bg-blue-400 text-white' },
];

function buildInitialTiers(): TLTier[] {
  return [
    ...TIER_DEFS.map((t) => ({ ...t, items: [] })),
    {
      id: UNRANKED_ID,
      name: UNRANKED_ID,
      color: 'bg-slate-50 border-slate-200',
      headerColor: 'bg-slate-300 text-slate-700',
      items: [...DEFAULT_ANIMALS],
    },
  ];
}

interface TLState {
  tiers: TLTier[];
  selectedItemId: string | null;
  newItemLabel: string;
  copied: boolean;
  warning: string | null;
}

type TLAction =
  | { type: 'SELECT_ITEM'; id: string }
  | { type: 'MOVE_TO_TIER'; tierId: string }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'SET_NEW_LABEL'; label: string }
  | { type: 'ADD_ITEM' }
  | { type: 'RESET' }
  | { type: 'SET_COPIED'; value: boolean }
  | { type: 'CLEAR_WARNING' };

function tlReducer(state: TLState, action: TLAction): TLState {
  switch (action.type) {
    case 'SELECT_ITEM':
      return {
        ...state,
        selectedItemId: state.selectedItemId === action.id ? null : action.id,
      };
    case 'MOVE_TO_TIER': {
      const { selectedItemId } = state;
      if (!selectedItemId) return state;
      // Find source tier
      const sourceTier = state.tiers.find((t) => t.items.some((item) => item.id === selectedItemId));
      if (!sourceTier || sourceTier.id === action.tierId) return { ...state, selectedItemId: null };
      const movingItem = sourceTier.items.find((item) => item.id === selectedItemId)!;
      const newTiers = state.tiers.map((t) => {
        if (t.id === sourceTier.id) return { ...t, items: t.items.filter((i) => i.id !== selectedItemId) };
        if (t.id === action.tierId) return { ...t, items: [...t.items, movingItem] };
        return t;
      });
      return { ...state, tiers: newTiers, selectedItemId: null };
    }
    case 'REMOVE_ITEM': {
      const newTiers = state.tiers.map((t) => ({
        ...t,
        items: t.items.filter((i) => i.id !== action.id),
      }));
      return { ...state, tiers: newTiers, selectedItemId: state.selectedItemId === action.id ? null : state.selectedItemId };
    }
    case 'SET_NEW_LABEL':
      return { ...state, newItemLabel: action.label, warning: null };
    case 'ADD_ITEM': {
      const label = state.newItemLabel.trim();
      if (!label) return state;
      const exists = state.tiers.some((t) => t.items.some((i) => i.label.toLowerCase() === label.toLowerCase()));
      if (exists) return { ...state, warning: 'duplicate' };
      const newItem: TLItem = { id: `custom-${Date.now()}`, label };
      const newTiers = state.tiers.map((t) =>
        t.id === UNRANKED_ID ? { ...t, items: [...t.items, newItem] } : t
      );
      return { ...state, tiers: newTiers, newItemLabel: '', warning: null };
    }
    case 'RESET':
      return { ...state, tiers: buildInitialTiers(), selectedItemId: null, warning: null };
    case 'SET_COPIED':
      return { ...state, copied: action.value };
    case 'CLEAR_WARNING':
      return { ...state, warning: null };
    default:
      return state;
  }
}

export function TierListMaker({ locale = 'ko' }: { locale?: Locale }) {
  const copy = TL_COPY[locale];
  const [state, dispatch] = useReducer(tlReducer, undefined, () => ({
    tiers: buildInitialTiers(),
    selectedItemId: null,
    newItemLabel: '',
    copied: false,
    warning: null,
  }));
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-clear warning
  useEffect(() => {
    if (!state.warning) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_WARNING' }), 3000);
    return () => clearTimeout(t);
  }, [state.warning]);

  // Auto-clear copied
  useEffect(() => {
    if (!state.copied) return;
    const t = setTimeout(() => dispatch({ type: 'SET_COPIED', value: false }), 2000);
    return () => clearTimeout(t);
  }, [state.copied]);

  const handleCopyResults = useCallback(() => {
    const rankedTiers = state.tiers.filter((t) => t.id !== UNRANKED_ID);
    const lines = rankedTiers.map((t) => {
      const items = t.items.map((i) => i.label).join(', ');
      return `[${t.name}] ${items || copy.empty}`;
    });
    const unranked = state.tiers.find((t) => t.id === UNRANKED_ID);
    if (unranked && unranked.items.length > 0) {
      lines.push(`[${copy.unranked}] ${unranked.items.map((i) => i.label).join(', ')}`);
    }
    navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => dispatch({ type: 'SET_COPIED', value: true }))
      .catch(() => {});
  }, [state.tiers, copy]);

  const handleAddItem = useCallback(() => {
    dispatch({ type: 'ADD_ITEM' });
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAddItem();
  }, [handleAddItem]);

  const selectedItem = useMemo(() => {
    if (!state.selectedItemId) return null;
    for (const tier of state.tiers) {
      const item = tier.items.find((i) => i.id === state.selectedItemId);
      if (item) return item;
    }
    return null;
  }, [state.selectedItemId, state.tiers]);

  // Separate ranked tiers and unranked bucket
  const rankedTiers = state.tiers.filter((t) => t.id !== UNRANKED_ID);
  const unrankedBucket = state.tiers.find((t) => t.id === UNRANKED_ID)!;

  return (
    <Card className="not-prose mt-8 overflow-hidden border-2 border-emerald-100 shadow-2xl rounded-2xl max-w-2xl mx-auto">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-slate-50 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl font-bold text-slate-900">{copy.title}</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5 font-bold">{copy.subtitle}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={handleCopyResults}
              variant="outline"
              size="sm"
              className="rounded-full font-bold border-2 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label={state.copied ? copy.copied : copy.copyResults}
            >
              {state.copied ? copy.copied : copy.copyResults}
            </Button>
            <Button
              onClick={() => dispatch({ type: 'RESET' })}
              variant="outline"
              size="sm"
              className="rounded-full font-bold border-2 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label={copy.reset}
            >
              {copy.reset}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {/* Hint bar */}
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700 font-bold">
          {copy.selectItemHint}
        </div>

        {/* Selected item indicator */}
        {selectedItem && (
          <div
            className="rounded-xl bg-amber-50 border-2 border-amber-300 px-3 py-2 text-sm font-bold text-amber-700 text-center"
            role="status"
            aria-live="polite"
          >
            {copy.selected}: {selectedItem.label}
          </div>
        )}

        {/* Warning */}
        {state.warning && (
          <div
            className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-red-600 text-center"
            role="alert"
          >
            {copy.duplicateWarning}
          </div>
        )}

        {/* Tier rows */}
        <div role="region" aria-label={copy.ariaBoard} className="space-y-1">
          {rankedTiers.map((tier) => (
            <div key={tier.id} className={`flex rounded-xl border overflow-hidden ${tier.color}`}>
              {/* Tier header — click to move selected item here */}
              <button
                className={`w-16 shrink-0 font-bold text-xl flex items-center justify-center cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white hover:brightness-110 active:scale-95 ${tier.headerColor}`}
                onClick={() => selectedItem && dispatch({ type: 'MOVE_TO_TIER', tierId: tier.id })}
                aria-label={selectedItem ? copy.moveToTier(tier.name) : copy.tierLabel(tier.name)}
                aria-disabled={!selectedItem}
                title={selectedItem ? copy.moveToTier(tier.name) : undefined}
              >
                {tier.name}
              </button>

              {/* Items in tier */}
              <div className="flex flex-wrap gap-1.5 flex-1 p-2 min-h-[52px] items-center">
                {tier.items.length === 0 && (
                  <span className="text-xs text-slate-400 font-bold pl-1">{copy.empty}</span>
                )}
                {tier.items.map((item) => (
                  <TLItemChip
                    key={item.id}
                    item={item}
                    isSelected={state.selectedItemId === item.id}
                    onSelect={() => dispatch({ type: 'SELECT_ITEM', id: item.id })}
                    onRemove={() => dispatch({ type: 'REMOVE_ITEM', id: item.id })}
                    removeLabel={copy.removeItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Unranked bucket */}
        <div className={`rounded-xl border overflow-hidden ${unrankedBucket.color}`}>
          <button
            className={`w-full text-left px-4 py-2 font-bold text-sm flex items-center justify-between cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 hover:brightness-105 ${unrankedBucket.headerColor}`}
            onClick={() => selectedItem && dispatch({ type: 'MOVE_TO_TIER', tierId: UNRANKED_ID })}
            aria-label={selectedItem ? copy.moveToUnranked : copy.unranked}
            aria-disabled={!selectedItem}
          >
            <span>{copy.unranked}</span>
            <span className="text-xs opacity-60">{unrankedBucket.items.length}</span>
          </button>
          <div className="flex flex-wrap gap-1.5 p-2 min-h-[52px] items-center">
            {unrankedBucket.items.length === 0 && (
              <span className="text-xs text-slate-400 font-bold pl-1">{copy.empty}</span>
            )}
            {unrankedBucket.items.map((item) => (
              <TLItemChip
                key={item.id}
                item={item}
                isSelected={state.selectedItemId === item.id}
                onSelect={() => dispatch({ type: 'SELECT_ITEM', id: item.id })}
                onRemove={() => dispatch({ type: 'REMOVE_ITEM', id: item.id })}
                removeLabel={copy.removeItem}
              />
            ))}
          </div>
        </div>

        {/* Add item input */}
        <div className="flex gap-2 pt-1">
          <input
            ref={inputRef}
            type="text"
            value={state.newItemLabel}
            onChange={(e) => dispatch({ type: 'SET_NEW_LABEL', label: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder={copy.addItemPlaceholder}
            maxLength={40}
            className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 transition-colors"
            aria-label={copy.addItem}
          />
          <Button
            onClick={handleAddItem}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shrink-0"
            aria-label={copy.add}
          >
            {copy.add}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sub-component: TLItemChip ──────────────────────────────────────────────

interface TLItemChipProps {
  item: TLItem;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  removeLabel: string;
}

function TLItemChip({ item, isSelected, onSelect, onRemove, removeLabel }: TLItemChipProps) {
  return (
    <div
      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold border-2 transition-all duration-150 cursor-pointer select-none ${
        isSelected
          ? 'bg-amber-400 border-amber-500 text-amber-900 scale-105 shadow-md'
          : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={item.label}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
    >
      <span>{item.label}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs hover:bg-red-100 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
        aria-label={`${removeLabel}: ${item.label}`}
        tabIndex={-1}
      >
        x
      </button>
    </div>
  );
}
