import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Locale } from "../../lib/i18n";
import { connectFourBestMove } from "../../lib/games/ai/connectfour";
import type { AiLevel, GameMode } from "../../lib/games/ai/types";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";
import {
  clearConnectFourSaveV2,
  loadConnectFourSaveV2,
  storeConnectFourSaveV2,
  type ConnectFourLastMove,
} from "../../lib/games/connect-four-save";
import { createConnectFourBoard, dropDisc, findDropRow, type ConnectFourBoard } from "../../lib/games/connect-four";
import { opponentBlurb, opponentName, pickOpponent } from '../../lib/games/opponents';
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";

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

const extra: Record<Locale, { pause: string; resume: string; restored: string; paused: string; sound: string; moves: string; nextGoal: string }> = {
  ko: { pause: "일시정지", resume: "계속", restored: "저장된 대국 복원", paused: "대국 일시정지", sound: "소리", moves: "수", nextGoal: "다음 목표: 중앙 열을 장악해 다양한 방향으로 4개를 노리세요" },
  en: { pause: "Pause", resume: "Resume", restored: "Saved match restored", paused: "Match paused", sound: "Sound", moves: "moves", nextGoal: "Next goal: control the center column to threaten in multiple directions" },
  ja: { pause: "一時停止", resume: "再開", restored: "保存した対局を復元", paused: "対局を一時停止", sound: "音", moves: "手", nextGoal: "次の目標: 中央の列を制し、複数方向に4つを狙いましょう" },
  zh: { pause: "暂停", resume: "继续", restored: "已恢复保存的对局", paused: "对局已暂停", sound: "声音", moves: "步", nextGoal: "下个目标：控制中间列，威胁多个方向连四" },
  fr: { pause: "Pause", resume: "Reprendre", restored: "Partie restaurée", paused: "Partie en pause", sound: "Son", moves: "coups", nextGoal: "Prochain objectif : contrôlez la colonne centrale pour menacer dans plusieurs directions" },
  es: { pause: "Pausa", resume: "Continuar", restored: "Partida restaurada", paused: "Partida en pausa", sound: "Sonido", moves: "jugadas", nextGoal: "Siguiente objetivo: controla la columna central para amenazar en varias direcciones" },
};

// Falling animation state per cell
interface FallingCell {
  row: number;
  col: number;
  player: 1 | 2;
  fromRow: number; // start row for animation (0 = top)
}

const ConnectFour: React.FC<Props> = ({ locale }) => {
  const t = i18n[locale] ?? i18n.en;
  const x = extra[locale] ?? extra.en;
  const reducedMotion = usePrefersReducedMotion();

  const [board, setBoard] = useState<ConnectFourBoard>(createConnectFourBoard);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [winCells, setWinCells] = useState<number[][] | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [fallingCell, setFallingCell] = useState<FallingCell | null>(null);
  const [animating, setAnimating] = useState(false);
  const [mode, setMode] = useState<GameMode>("local");
  const [level, setLevel] = useState<AiLevel>(2);
  const opponent = useMemo(() => pickOpponent(level, `connect-four:${level}`), [level]);
  const [thinking, setThinking] = useState(false);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [activeCol, setActiveCol] = useState(0);
  const [paused, setPaused] = useState(false);
  const [restored, setRestored] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lastMove, setLastMove] = useState<ConnectFourLastMove | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const animFrameRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const columnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const startedAtRef = useRef<number>(Date.now());
  const audioRef = useRef<AudioContext | null>(null);

  const tone = useCallback((frequency: number, duration = 0.05) => {
    if (muted || typeof window === "undefined") return;
    const context = audioRef.current ?? new AudioContext();
    audioRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.05, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, [muted]);

  useEffect(() => {
    setRecord(getRecord("connectfour"));
    const restoredSave = loadConnectFourSaveV2();
    if (restoredSave) {
      setBoard(restoredSave.board);
      setCurrentPlayer(restoredSave.currentPlayer);
      setMode(restoredSave.mode);
      setLevel(restoredSave.level);
      setLastMove(restoredSave.lastMove);
      setMoveCount(restoredSave.board.flat().filter((cell) => cell !== 0).length);
      startedAtRef.current = restoredSave.startedAtEpochMs;
      setPaused(true);
      setRestored(true);
    }
  }, []);
  useEffect(() => {
    if (board.some((row) => row.some((cell) => cell !== 0)) && status === "playing" && !animating) {
      storeConnectFourSaveV2({
        board, currentPlayer, mode, level, lastMove,
        startedAtEpochMs: startedAtRef.current,
        savedAtEpochMs: Date.now(),
      });
    }
  }, [board, currentPlayer, mode, level, status, animating, lastMove]);

  // Pause on hidden tab: stop the AI's pending timer rather than let it fire
  // into a backgrounded, possibly-stale board.
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) {
        setPaused(true);
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        setThinking(false);
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);

  const resetGame = useCallback(() => {
    if (animFrameRef.current) clearTimeout(animFrameRef.current);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setBoard(createConnectFourBoard());
    setCurrentPlayer(1);
    setStatus("playing");
    setWinCells(null);
    setHoveredCol(null);
    setFallingCell(null);
    setAnimating(false);
    setThinking(false);
    setActiveCol(0);
    setPaused(false);
    setRestored(false);
    setLastMove(null);
    setMoveCount(0);
    startedAtRef.current = Date.now();
    clearConnectFourSaveV2();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) clearTimeout(animFrameRef.current);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      void audioRef.current?.close();
    };
  }, []);

  const dropDiscAt = useCallback(
    (col: number) => {
      if (status !== "playing" || animating || paused) return;

      const dropRow = findDropRow(board, col);
      if (dropRow === -1) return; // column full

      setAnimating(true);
      setFallingCell({ row: dropRow, col, player: currentPlayer, fromRow: 0 });
      if (!board.some((row) => row.some((cell) => cell !== 0))) startedAtRef.current = Date.now();

      // After animation settles, commit
      animFrameRef.current = setTimeout(() => {
        const move = dropDisc(board, col, currentPlayer);
        if (!move) { setAnimating(false); setFallingCell(null); return; }
        setBoard(move.board);
        setFallingCell(null);
        setLastMove({ row: dropRow, col });
        setMoveCount((count) => count + 1);

        if (move.result !== null) {
          clearConnectFourSaveV2();
          if (move.result === 0) {
            setStatus("draw");
            tone(220, 0.08);
            if (mode === "ai") setRecord(recordResult("connectfour", "d"));
          } else {
            setWinCells(move.winCells);
            setStatus("won");
            tone(660, 0.18);
            if (mode === "ai") setRecord(recordResult("connectfour", currentPlayer === AI_PLAYER ? "l" : "w"));
          }
        } else {
          tone(300, 0.05);
          setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
        }
        setAnimating(false);
      }, reducedMotion ? 60 : 320);
    },
    [board, currentPlayer, status, animating, paused, mode, reducedMotion, tone]
  );

  const handleColClick = useCallback(
    (col: number) => {
      if (paused) return;
      if (mode === "ai" && (currentPlayer === AI_PLAYER || thinking)) return; // AI's turn
      dropDiscAt(col);
    },
    [mode, currentPlayer, thinking, paused, dropDiscAt]
  );

  // AI turn: think briefly, then drop (reuses the same falling animation).
  useEffect(() => {
    if (mode !== "ai" || status !== "playing" || currentPlayer !== AI_PLAYER || animating || paused) return;
    setThinking(true);
    aiTimerRef.current = setTimeout(() => {
      const col = connectFourBestMove(board.map((r) => [...r]) as ConnectFourBoard, AI_PLAYER, level);
      setThinking(false);
      if (col >= 0) dropDiscAt(col);
    }, AI_DELAY_MS);
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status, currentPlayer, animating, paused]);

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
        {moveCount > 0 && status === "playing" && (
          <button type="button" onClick={() => setPaused((value) => { if (value) setRestored(false); return !value; })} className="min-h-11 px-3 rounded-lg border border-border text-xs font-bold text-muted-foreground">
            {paused ? `▶ ${x.resume}` : `Ⅱ ${x.pause}`}
          </button>
        )}
        <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} className="min-h-11 px-3 rounded-lg border border-border text-xs font-bold text-muted-foreground">
          {muted ? "🔇" : "🔊"} {x.sound}
        </button>
        {mode === "ai" && record && record.w + record.l + record.d > 0 && (
          <span className="ml-auto text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {t.record} {record.w}–{record.l}{record.d ? `–${record.d}` : ""}
          </span>
        )}
      </div>

      {/* Who you are actually playing. Seeded by slug+tier so the name is stable
          across re-renders and across visits, not reshuffled mid-match. */}
      {mode === "ai" && (
        <p className="mb-3 text-xs text-muted-foreground">
          <span className="font-black text-foreground">{opponentName(opponent, locale)}</span>
          <span className="mx-1.5 opacity-40">·</span>
          {opponentBlurb(opponent, locale)}
        </p>
      )}

      {(paused || restored) && (
        <div className="mb-3 rounded-xl border border-border bg-muted/40 p-3 text-center text-xs font-bold text-muted-foreground" role="status">
          {restored ? `${x.restored} · ` : ""}{x.paused}
        </div>
      )}

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
              hoveredCol === c && dropRow !== -1 && status === "playing" && !animating && !paused;
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
          className={`bg-blue-700 rounded-2xl p-2 shadow-xl transition-opacity motion-reduce:transition-none ${paused ? "opacity-70" : ""}`}
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
              const isLastMove = lastMove !== null && lastMove.row === r && lastMove.col === c;

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
                    } ${winHighlight ? `ring-4 ring-white ring-offset-1 ring-offset-blue-700 ${reducedMotion ? '' : 'scale-110'} z-10` : isLastMove ? "ring-2 ring-white/80 ring-offset-1 ring-offset-blue-700 z-10" : ""}`}
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
              aria-disabled={status !== "playing" || paused || findDropRow(board, c) === -1 || (mode === "ai" && (currentPlayer === AI_PLAYER || thinking))}
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
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">{moveCount} {x.moves}</p>
          {status === "won" && <p className="text-[11px] text-muted-foreground max-w-xs text-center">{x.nextGoal}</p>}
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
