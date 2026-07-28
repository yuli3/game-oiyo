import { useState, useEffect, useRef, useCallback } from "react";
import type { Locale } from "../../lib/i18n";
import { connectFourBestMove } from "../../lib/games/ai/connectfour";
import type { AiLevel, GameMode } from "../../lib/games/ai/types";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";
import { clearConnectFourSave, loadConnectFourSave, storeConnectFourSave } from "../../lib/games/active-game-save";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";

type Cell = 0 | 1 | 2; // 0=empty, 1=player1, 2=player2
type Board = Cell[][];
type GameStatus = "playing" | "won" | "draw";

interface Props {
  locale: Locale;
}

const ROWS = 6;
const COLS = 7;
const AI_PLAYER = 2; // AI plays yellow; human opens as red
const AI_DELAY_MS = 500;
const PLAYER_COLORS: Record<1 | 2, string> = { 1: "bg-red-500", 2: "bg-yellow-400" };
const PLAYER_TEXT_COLORS: Record<1 | 2, string> = { 1: "text-red-500", 2: "text-yellow-500" };
const PLAYER_EMOJI: Record<1 | 2, string> = { 1: "🔴", 2: "🟡" };

const i18n: Record<Locale, {
  title: string;
  player: string;
  turn: string;
  wins: string;
  draw: string;
  restart: string;
  desc: string;
  modeLocal: string;
  modeAi: string;
  level1: string;
  level2: string;
  level3: string;
  thinking: string;
  youWin: string;
  aiWins: string;
  record: string;
  column: string;
  columnFull: string;
  empty: string;
  red: string;
  yellow: string;
}> = {
  ko: {
    title: "커넥트 포",
    player: "플레이어",
    turn: "의 차례",
    wins: "승리!",
    draw: "무승부!",
    restart: "다시 시작",
    desc: "4개를 가로, 세로, 대각선으로 연결하면 승리합니다.",
    modeLocal: "2인 대전", modeAi: "AI 대전", level1: "견습생", level2: "숙련가", level3: "명인",
    thinking: "상대가 수를 읽고 있습니다…", youWin: "당신의 승리!", aiWins: "AI 승리", record: "전적",
    column: "열", columnFull: "가득 참", empty: "빈 칸", red: "빨간 말", yellow: "노란 말",
  },
  en: {
    title: "Connect Four",
    player: "Player",
    turn: "'s turn",
    wins: " wins!",
    draw: "It's a draw!",
    restart: "Play Again",
    desc: "Connect four discs horizontally, vertically, or diagonally to win.",
    modeLocal: "2 Players", modeAi: "vs AI", level1: "Apprentice", level2: "Adept", level3: "Master",
    thinking: "Your opponent is thinking…", youWin: "You win!", aiWins: "AI wins", record: "Record",
    column: "Column", columnFull: "full", empty: "empty", red: "red disc", yellow: "yellow disc",
  },
  ja: {
    title: "コネクトフォー",
    player: "プレイヤー",
    turn: "のターン",
    wins: "の勝利！",
    draw: "引き分け！",
    restart: "もう一度",
    desc: "横・縦・斜めに4つ並べたほうが勝ちです。",
    modeLocal: "2人対戦", modeAi: "AI対戦", level1: "見習い", level2: "熟練者", level3: "名人",
    thinking: "相手が考えています…", youWin: "あなたの勝ち！", aiWins: "AIの勝ち", record: "戦績",
    column: "列", columnFull: "満杯", empty: "空き", red: "赤いコマ", yellow: "黄色いコマ",
  },
  fr: {
    title: "Puissance 4",
    player: "Joueur",
    turn: " à jouer",
    wins: " gagne !",
    draw: "Match nul !",
    restart: "Rejouer",
    desc: "Alignez 4 jetons horizontalement, verticalement ou en diagonale.",
    modeLocal: "2 joueurs", modeAi: "contre l'IA", level1: "Apprenti", level2: "Adepte", level3: "Maître",
    thinking: "Votre adversaire réfléchit…", youWin: "Vous gagnez !", aiWins: "L'IA gagne", record: "Bilan",
    column: "Colonne", columnFull: "pleine", empty: "vide", red: "jeton rouge", yellow: "jeton jaune",
  },
  es: {
    title: "Conecta Cuatro",
    player: "Jugador",
    turn: " juega",
    wins: " gana!",
    draw: "¡Empate!",
    restart: "Reiniciar",
    desc: "Conecta cuatro fichas en línea horizontal, vertical o diagonal.",
    modeLocal: "2 jugadores", modeAi: "contra la IA", level1: "Aprendiz", level2: "Experto", level3: "Maestro",
    thinking: "Tu rival está pensando…", youWin: "¡Has ganado!", aiWins: "Gana la IA", record: "Historial",
    column: "Columna", columnFull: "llena", empty: "vacía", red: "ficha roja", yellow: "ficha amarilla",
  },
  zh: {
    title: "四子棋",
    player: "玩家",
    turn: "的回合",
    wins: "获胜！",
    draw: "平局！",
    restart: "再玩一次",
    desc: "在水平、垂直或对角线方向连接四个棋子即获胜。",
    modeLocal: "双人对战", modeAi: "人机对战", level1: "学徒", level2: "行家", level3: "大师",
    thinking: "对手正在思考…", youWin: "你赢了！", aiWins: "AI 获胜", record: "战绩",
    column: "列", columnFull: "已满", empty: "空格", red: "红色棋子", yellow: "黄色棋子",
  },
};

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);
}

function findDropRow(board: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) return r;
  }
  return -1;
}

function checkWin(board: Board, row: number, col: number, player: 1 | 2): number[][] | null {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal down-left
  ];

  for (const [dr, dc] of directions) {
    const cells: number[][] = [[row, col]];

    for (let step = 1; step < 4; step++) {
      const r = row + dr * step;
      const c = col + dc * step;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        cells.push([r, c]);
      } else break;
    }
    for (let step = 1; step < 4; step++) {
      const r = row - dr * step;
      const c = col - dc * step;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        cells.push([r, c]);
      } else break;
    }

    if (cells.length >= 4) return cells.slice(0, 4);
  }
  return null;
}

function isBoardFull(board: Board): boolean {
  return board[0].every((cell) => cell !== 0);
}

// Falling animation state per cell
interface FallingCell {
  row: number;
  col: number;
  player: 1 | 2;
  fromRow: number; // start row for animation (0 = top)
}

const ConnectFour: React.FC<Props> = ({ locale }) => {
  const t = i18n[locale] ?? i18n.en;
  const reducedMotion = usePrefersReducedMotion();

  const [board, setBoard] = useState<Board>(emptyBoard);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [winCells, setWinCells] = useState<number[][] | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [fallingCell, setFallingCell] = useState<FallingCell | null>(null);
  const [animating, setAnimating] = useState(false);
  const [mode, setMode] = useState<GameMode>("local");
  const [level, setLevel] = useState<AiLevel>(2);
  const [thinking, setThinking] = useState(false);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [activeCol, setActiveCol] = useState(0);
  const animFrameRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const columnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setRecord(getRecord("connectfour"));
    const restored = loadConnectFourSave();
    if (restored) {
      setBoard(restored.board);
      setCurrentPlayer(restored.currentPlayer);
      setMode(restored.mode);
      setLevel(restored.level);
    }
  }, []);
  useEffect(() => {
    if (board.some((row) => row.some((cell) => cell !== 0)) && status === "playing" && !animating) {
      storeConnectFourSave({ board, currentPlayer, mode, level });
    }
  }, [board, currentPlayer, mode, level, status, animating]);

  const resetGame = useCallback(() => {
    if (animFrameRef.current) clearTimeout(animFrameRef.current);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setBoard(emptyBoard());
    setCurrentPlayer(1);
    setStatus("playing");
    setWinCells(null);
    setHoveredCol(null);
    setFallingCell(null);
    setAnimating(false);
    setThinking(false);
    setActiveCol(0);
    clearConnectFourSave();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) clearTimeout(animFrameRef.current);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  const dropDisc = useCallback(
    (col: number) => {
      if (status !== "playing" || animating) return;

      const dropRow = findDropRow(board, col);
      if (dropRow === -1) return; // column full

      setAnimating(true);
      setFallingCell({ row: dropRow, col, player: currentPlayer, fromRow: 0 });

      // After animation settles, commit
      animFrameRef.current = setTimeout(() => {
        const newBoard = board.map((r) => [...r]) as Board;
        newBoard[dropRow][col] = currentPlayer;
        setBoard(newBoard);
        setFallingCell(null);

        const winning = checkWin(newBoard, dropRow, col, currentPlayer);
        if (winning) {
          clearConnectFourSave();
          setWinCells(winning);
          setStatus("won");
          if (mode === "ai") setRecord(recordResult("connectfour", currentPlayer === AI_PLAYER ? "l" : "w"));
        } else if (isBoardFull(newBoard)) {
          clearConnectFourSave();
          setStatus("draw");
          if (mode === "ai") setRecord(recordResult("connectfour", "d"));
        } else {
          setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
        }
        setAnimating(false);
      }, reducedMotion ? 60 : 320);
    },
    [board, currentPlayer, status, animating, mode, reducedMotion]
  );

  const handleColClick = useCallback(
    (col: number) => {
      if (mode === "ai" && (currentPlayer === AI_PLAYER || thinking)) return; // AI's turn
      dropDisc(col);
    },
    [mode, currentPlayer, thinking, dropDisc]
  );

  // AI turn: think briefly, then drop (reuses the same falling animation).
  useEffect(() => {
    if (mode !== "ai" || status !== "playing" || currentPlayer !== AI_PLAYER || animating) return;
    setThinking(true);
    aiTimerRef.current = setTimeout(() => {
      const col = connectFourBestMove(board.map((r) => [...r]) as Board, AI_PLAYER, level);
      setThinking(false);
      if (col >= 0) dropDisc(col);
    }, AI_DELAY_MS);
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status, currentPlayer, animating]);

  const switchMode = (m: GameMode) => {
    if (m === mode) return;
    setMode(m);
    resetGame();
  };

  const isWinCell = (r: number, c: number): boolean => {
    if (!winCells) return false;
    return winCells.some(([wr, wc]) => wr === r && wc === c);
  };

  const focusColumn = (column: number) => {
    const next = Math.max(0, Math.min(COLS - 1, column));
    setActiveCol(next);
    columnRefs.current[next]?.focus();
  };

  const handleColumnKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, column: number) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusColumn(column - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusColumn(column + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusColumn(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusColumn(COLS - 1);
    }
  };

  const cellSize = 52; // px per cell
  const cellGap = 6;

  return (
    <div className="not-prose my-12 p-4 sm:p-6 bg-card text-card-foreground rounded-3xl border border-border shadow-sm max-w-xl mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          {t.title}
        </span>
        <button
          type="button"
          onClick={resetGame}
          className="min-h-11 text-xs px-3 py-2 rounded-full border border-border hover:bg-muted transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {t.restart}
        </button>
      </div>

      {/* Mode + difficulty */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-border overflow-hidden" role="group" aria-label={`${t.modeLocal} / ${t.modeAi}`}>
          {(["local", "ai"] as GameMode[]).map((m) => (
            <button type="button" key={m} onClick={() => switchMode(m)}
              aria-pressed={mode === m}
              className={`min-h-11 px-3 py-1.5 text-xs font-bold transition-colors motion-reduce:transition-none ${mode === m ? "bg-blue-600 text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
              {m === "local" ? t.modeLocal : t.modeAi}
            </button>
          ))}
        </div>
        {mode === "ai" && (
          <div className="inline-flex gap-1">
            {([1, 2, 3] as AiLevel[]).map((lv) => (
              <button type="button" key={lv} onClick={() => { setLevel(lv); resetGame(); }}
                aria-pressed={level === lv}
                className={`min-h-11 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors motion-reduce:transition-none ${level === lv ? "border-blue-600 text-blue-600 bg-blue-600/10" : "border-border text-muted-foreground hover:bg-muted"}`}>
                {lv === 1 ? t.level1 : lv === 2 ? t.level2 : t.level3}
              </button>
            ))}
          </div>
        )}
        {mode === "ai" && record && record.w + record.l + record.d > 0 && (
          <span className="ml-auto text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {t.record} {record.w}–{record.l}{record.d ? `–${record.d}` : ""}
          </span>
        )}
      </div>

      {/* Status bar */}
      <div className="mb-3 h-8 flex items-center justify-center" aria-live="polite">
        {status === "playing" && thinking && (
          <span className={`text-sm font-semibold text-muted-foreground ${reducedMotion ? '' : 'animate-pulse'}`}>{t.thinking}</span>
        )}
        {status === "playing" && !thinking && (
          <span className="text-sm font-semibold">
            <span className={PLAYER_TEXT_COLORS[currentPlayer]}>
              {PLAYER_EMOJI[currentPlayer]} {t.player} {currentPlayer}
            </span>
            <span className="text-foreground">{t.turn}</span>
          </span>
        )}
        {status === "won" && (
          <span className={`text-sm font-black ${PLAYER_TEXT_COLORS[currentPlayer]}`}>
            {mode === "ai"
              ? (currentPlayer === AI_PLAYER ? `${PLAYER_EMOJI[currentPlayer]} ${t.aiWins}` : `${PLAYER_EMOJI[currentPlayer]} ${t.youWin}`)
              : <>{PLAYER_EMOJI[currentPlayer]} {t.player} {currentPlayer}{t.wins}</>}
          </span>
        )}
        {status === "draw" && (
          <span className="text-sm font-black text-muted-foreground">{t.draw}</span>
        )}
      </div>

      {/* Board */}
      <div className="overflow-x-auto pb-2" tabIndex={-1}>
      <div
        className="relative mx-auto"
        style={{
          width: `${COLS * cellSize + (COLS - 1) * cellGap + 16}px`,
        }}
      >
        {/* Hover preview row */}
        <div
          className="flex mb-1"
          style={{ gap: `${cellGap}px`, paddingLeft: "8px", paddingRight: "8px" }}
        >
          {Array.from({ length: COLS }, (_, c) => {
            const dropRow = status === "playing" ? findDropRow(board, c) : -1;
            const showPreview =
              hoveredCol === c && dropRow !== -1 && status === "playing" && !animating;
            return (
              <div
                key={c}
                style={{ width: `${cellSize}px`, height: `${cellSize * 0.55}px` }}
                className="flex items-center justify-center"
              >
                <div
                  className={`rounded-full transition-opacity motion-reduce:transition-none ${
                    PLAYER_COLORS[currentPlayer]
                  } ${showPreview ? "opacity-30" : "opacity-0"}`}
                  style={{ width: `${cellSize - 10}px`, height: `${cellSize - 10}px` }}
                />
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div
          className="bg-blue-700 rounded-2xl p-2 shadow-xl"
          style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`, gap: `${cellGap}px` }}
        >
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => {
              const cell = board[r][c];
              const isFalling =
                fallingCell !== null &&
                fallingCell.col === c &&
                fallingCell.row === r;
              const winHighlight = isWinCell(r, c);

              let diskClass = "bg-blue-900/60";
              if (isFalling) {
                diskClass = PLAYER_COLORS[fallingCell!.player];
              } else if (cell === 1) {
                diskClass = "bg-red-500";
              } else if (cell === 2) {
                diskClass = "bg-yellow-400";
              }

              return (
                <div
                  key={`${r}-${c}`}
                  aria-label={`${t.column} ${c + 1}, ${r + 1}: ${cell === 1 ? t.red : cell === 2 ? t.yellow : t.empty}`}
                  role="img"
                  className="relative flex items-center justify-center"
                  style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                >
                  {/* Hole background */}
                  <div
                    className="absolute inset-0 rounded-full bg-card/90"
                    style={{ margin: "4px" }}
                  />
                  {/* Disk */}
                  <div
                    className={`absolute rounded-full ${reducedMotion ? 'transition-opacity' : 'transition-all'} ${diskClass} ${
                      isFalling && !reducedMotion ? "animate-fall" : ""
                    } ${winHighlight ? `ring-4 ring-white ring-offset-1 ring-offset-blue-700 ${reducedMotion ? '' : 'scale-110'} z-10` : ""}`}
                    style={{
                      margin: "5px",
                      inset: "0",
                      ...(isFalling && !reducedMotion
                        ? {
                            transform: `translateY(${-(fallingCell!.row * (cellSize + cellGap))}px)`,
                            transition: "transform 0.3s cubic-bezier(0.55, 0, 1, 0.45)",
                          }
                        : {}),
                    }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Click columns overlay */}
        <div
          className="absolute top-0 left-0 right-0 bottom-0 flex"
          style={{
            paddingTop: `${cellSize * 0.55 + 4}px`,
            paddingLeft: "8px",
            paddingRight: "8px",
            gap: `${cellGap}px`,
          }}
        >
          {Array.from({ length: COLS }, (_, c) => (
            <button
              key={c}
              ref={(node) => { columnRefs.current[c] = node; }}
              type="button"
              className="flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/90 aria-disabled:cursor-not-allowed"
              style={{ height: `${ROWS * cellSize + (ROWS - 1) * cellGap}px` }}
              onClick={() => handleColClick(c)}
              onFocus={() => setActiveCol(c)}
              onKeyDown={(event) => handleColumnKeyDown(event, c)}
              onMouseEnter={() => setHoveredCol(c)}
              onMouseLeave={() => setHoveredCol(null)}
              tabIndex={activeCol === c ? 0 : -1}
              aria-disabled={status !== "playing" || findDropRow(board, c) === -1 || (mode === "ai" && (currentPlayer === AI_PLAYER || thinking))}
              aria-label={`${t.column} ${c + 1}${findDropRow(board, c) === -1 ? `, ${t.columnFull}` : ""}`}
            />
          ))}
        </div>
      </div>
      </div>

      {/* Player legend */}
      <div className="mt-4 flex justify-center gap-6 text-xs text-muted-foreground">
        <span>
          🔴 {t.player} 1
        </span>
        <span>
          🟡 {t.player} 2
        </span>
      </div>

      {status !== "playing" && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={resetGame}
            className="min-h-11 px-10 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {t.restart}
          </button>
        </div>
      )}

      <style>{`
        @keyframes fall {
          from { transform: translateY(-200px); }
          to { transform: translateY(0); }
        }
        .animate-fall {
          animation: fall 0.32s cubic-bezier(0.55, 0, 1, 0.45);
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-fall {
            animation: none;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ConnectFour;
