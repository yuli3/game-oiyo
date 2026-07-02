import React, { useState, useEffect, useRef } from 'react';
import type { Locale } from '../../lib/i18n';
import {
  chessApply, chessBestMove, chessInCheck, chessLegalMoves, isWhitePiece,
  type ChessBoard as Board, type ChessMove,
} from '../../lib/games/ai/chess';
import type { AiLevel, GameMode } from '../../lib/games/ai/types';
import { getRecord, recordResult, type GameRecord } from '../../lib/games/records';

const makeInitialBoard = (): Board => [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  Array(8).fill(null), Array(8).fill(null), Array(8).fill(null), Array(8).fill(null),
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

const AI_IS_WHITE = false; // AI plays black; human opens as white
const AI_DELAY_MS = 500;

const i18n: Record<Locale, {
  title: string; turn: string; white: string; black: string; reset: string;
  pawn: string; knight: string; bishop: string; rook: string; queen: string; king: string;
  modeLocal: string; modeAi: string; level1: string; level2: string; level3: string;
  thinking: string; youWin: string; aiWins: string; draw: string; check: string; checkmate: string; stalemate: string; record: string;
}> = {
  ko: { title: "전략의 정수: 체스", turn: "차례", white: "백", black: "흑", reset: "초기화", pawn: "폰", knight: "나이트", bishop: "비숍", rook: "룩", queen: "퀸", king: "킹", modeLocal: "2인 대전", modeAi: "AI 대전", level1: "견습생", level2: "숙련가", level3: "명인", thinking: "상대가 수를 읽고 있습니다…", youWin: "당신의 승리!", aiWins: "AI 승리", draw: "무승부", check: "체크!", checkmate: "체크메이트", stalemate: "스테일메이트", record: "전적" },
  en: { title: "Chess Strategy", turn: "Turn", white: "White", black: "Black", reset: "Reset", pawn: "Pawn", knight: "Knight", bishop: "Bishop", rook: "Rook", queen: "Queen", king: "King", modeLocal: "2 Players", modeAi: "vs AI", level1: "Apprentice", level2: "Adept", level3: "Master", thinking: "Your opponent is thinking…", youWin: "You win!", aiWins: "AI wins", draw: "Draw", check: "Check!", checkmate: "Checkmate", stalemate: "Stalemate", record: "Record" },
  ja: { title: "チェス戦略", turn: "手番", white: "白", black: "黒", reset: "リセット", pawn: "ポーン", knight: "ナイト", bishop: "ビショップ", rook: "ルーク", queen: "クイーン", king: "キング", modeLocal: "2人対戦", modeAi: "AI対戦", level1: "見習い", level2: "熟練者", level3: "名人", thinking: "相手が考えています…", youWin: "あなたの勝ち！", aiWins: "AIの勝ち", draw: "引き分け", check: "チェック！", checkmate: "チェックメイト", stalemate: "ステイルメイト", record: "戦績" },
  zh: { title: "国际象棋策略", turn: "回合", white: "白", black: "黑", reset: "重置", pawn: "兵", knight: "马", bishop: "象", rook: "车", queen: "后", king: "王", modeLocal: "双人对战", modeAi: "人机对战", level1: "学徒", level2: "行家", level3: "大师", thinking: "对手正在思考…", youWin: "你赢了！", aiWins: "AI 获胜", draw: "平局", check: "将军！", checkmate: "将死", stalemate: "逼和", record: "战绩" },
  fr: { title: "Stratégie d'échecs", turn: "Tour", white: "Blancs", black: "Noirs", reset: "Réinitialiser", pawn: "Pion", knight: "Cavalier", bishop: "Fou", rook: "Tour", queen: "Dame", king: "Roi", modeLocal: "2 joueurs", modeAi: "contre l'IA", level1: "Apprenti", level2: "Adepte", level3: "Maître", thinking: "Votre adversaire réfléchit…", youWin: "Vous gagnez !", aiWins: "L'IA gagne", draw: "Match nul", check: "Échec !", checkmate: "Échec et mat", stalemate: "Pat", record: "Bilan" },
  es: { title: "Estrategia de ajedrez", turn: "Turno", white: "Blancas", black: "Negras", reset: "Reiniciar", pawn: "Peón", knight: "Caballo", bishop: "Alfil", rook: "Torre", queen: "Dama", king: "Rey", modeLocal: "2 jugadores", modeAi: "contra la IA", level1: "Aprendiz", level2: "Experto", level3: "Maestro", thinking: "Tu rival está pensando…", youWin: "¡Has ganado!", aiWins: "Gana la IA", draw: "Tablas", check: "¡Jaque!", checkmate: "Jaque mate", stalemate: "Rey ahogado", record: "Historial" },
};

type GameEnd = { result: 'white' | 'black' | 'draw'; reason: 'checkmate' | 'stalemate' } | null;

const ChessBoard: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
  const t = i18n[locale] ?? i18n.en;

  const [board, setBoard] = useState<Board>(makeInitialBoard);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [isWhiteTurn, setIsWhiteTurn] = useState(true);
  const [gameEnd, setGameEnd] = useState<GameEnd>(null);
  const [mode, setMode] = useState<GameMode>('local');
  const [level, setLevel] = useState<AiLevel>(2);
  const [thinking, setThinking] = useState(false);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setRecord(getRecord('chess')); }, []);
  useEffect(() => () => { if (aiTimer.current) clearTimeout(aiTimer.current); }, []);

  const pieceIcons: Record<string, string> = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
  };

  const reset = () => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    setBoard(makeInitialBoard());
    setSelected(null);
    setIsWhiteTurn(true);
    setGameEnd(null);
    setThinking(false);
  };

  const finish = (end: NonNullable<GameEnd>) => {
    setGameEnd(end);
    if (mode === 'ai') {
      const aiColor = AI_IS_WHITE ? 'white' : 'black';
      setRecord(recordResult('chess', end.result === 'draw' ? 'd' : end.result === aiColor ? 'l' : 'w'));
    }
  };

  const applyMove = (current: Board, m: ChessMove, moverIsWhite: boolean) => {
    const next = chessApply(current, m);
    setBoard(next);
    setSelected(null);
    // opponent's position after the move: mate / stalemate / continue
    if (chessLegalMoves(next, !moverIsWhite).length === 0) {
      if (chessInCheck(next, !moverIsWhite)) finish({ result: moverIsWhite ? 'white' : 'black', reason: 'checkmate' });
      else finish({ result: 'draw', reason: 'stalemate' });
    } else {
      setIsWhiteTurn(!moverIsWhite);
    }
  };

  const legalTargets = selected ? chessLegalMoves(board, isWhiteTurn).filter(
    (m) => m.from[0] === selected[0] && m.from[1] === selected[1]
  ) : [];

  const handleSquareClick = (r: number, c: number) => {
    if (gameEnd || thinking) return;
    if (mode === 'ai' && isWhiteTurn === AI_IS_WHITE) return; // AI's turn
    const piece = board[r][c];

    if (selected) {
      if (selected[0] === r && selected[1] === c) { setSelected(null); return; }
      const move = legalTargets.find((m) => m.to[0] === r && m.to[1] === c);
      if (move) { applyMove(board, move, isWhiteTurn); return; }
      // reselect own piece, otherwise deselect
      if (piece && isWhitePiece(piece) === isWhiteTurn) setSelected([r, c]);
      else setSelected(null);
    } else if (piece && isWhitePiece(piece) === isWhiteTurn) {
      setSelected([r, c]);
    }
  };

  // AI turn
  useEffect(() => {
    if (mode !== 'ai' || gameEnd || isWhiteTurn !== AI_IS_WHITE) return;
    setThinking(true);
    aiTimer.current = setTimeout(() => {
      const move = chessBestMove(board, AI_IS_WHITE, level);
      setThinking(false);
      if (move) applyMove(board, move, AI_IS_WHITE);
      // no legal move is already handled by applyMove's mate/stalemate detection
    }, AI_DELAY_MS);
    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isWhiteTurn, gameEnd]);

  const switchMode = (m: GameMode) => {
    if (m === mode) return;
    setMode(m);
    reset();
  };

  const inCheck = !gameEnd && chessInCheck(board, isWhiteTurn);
  const endLabel = gameEnd
    ? gameEnd.result === 'draw'
      ? `${t.draw} · ${t.stalemate}`
      : mode === 'ai'
        ? (gameEnd.result === (AI_IS_WHITE ? 'white' : 'black') ? t.aiWins : t.youWin)
        : `${gameEnd.result === 'white' ? t.white : t.black} ${t.checkmate}`
    : null;

  return (
    <div className="not-prose my-12 p-4 sm:p-8 bg-card border border-border rounded-4xl shadow-sm max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-black text-foreground">{t.title}</h3>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1" aria-live="polite">
            {thinking ? t.thinking : `${isWhiteTurn ? t.white : t.black} ${t.turn}${inCheck ? ` · ${t.check}` : ''}`}
          </p>
        </div>
        <button onClick={reset} className="px-4 py-2 bg-muted text-muted-foreground rounded-xl text-xs font-bold border border-border">
          {t.reset}
        </button>
      </div>

      {/* Mode + difficulty */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-border overflow-hidden" role="group" aria-label={`${t.modeLocal} / ${t.modeAi}`}>
          {(['local', 'ai'] as GameMode[]).map((m) => (
            <button key={m} onClick={() => switchMode(m)}
              aria-pressed={mode === m}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
              {m === 'local' ? t.modeLocal : t.modeAi}
            </button>
          ))}
        </div>
        {mode === 'ai' && (
          <div className="inline-flex gap-1">
            {([1, 2, 3] as AiLevel[]).map((lv) => (
              <button key={lv} onClick={() => { setLevel(lv); reset(); }}
                aria-pressed={level === lv}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${level === lv ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                {lv === 1 ? t.level1 : lv === 2 ? t.level2 : t.level3}
              </button>
            ))}
          </div>
        )}
        {mode === 'ai' && record && (record.w + record.l + record.d > 0) && (
          <span className="ml-auto text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {t.record} {record.w}–{record.l}{record.d ? `–${record.d}` : ''}
          </span>
        )}
      </div>

      <div className="relative">
        <div className="grid grid-cols-8 grid-rows-8 border-4 border-stone-800 shadow-2xl aspect-square w-full">
          {board.map((row, r) => row.map((piece, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isTarget = legalTargets.some((m) => m.to[0] === r && m.to[1] === c);
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleSquareClick(r, c)}
                className={`relative flex items-center justify-center text-3xl sm:text-4xl cursor-pointer transition-colors ${
                  isDark ? 'bg-[#b58863]' : 'bg-[#f0d9b5]'
                } ${isSelected ? 'ring-4 ring-primary inset-0 z-10' : ''}`}
              >
                {isTarget && (
                  piece
                    ? <div className="absolute inset-0 ring-4 ring-inset ring-primary/60 z-10 pointer-events-none" />
                    : <div className="absolute w-1/4 h-1/4 rounded-full bg-primary/40 z-10 pointer-events-none" />
                )}
                <span className={`select-none transform ${piece && piece === piece.toLowerCase() ? 'text-black' : 'text-white drop-shadow-sm'}`}>
                  {piece ? pieceIcons[piece] : ''}
                </span>
              </div>
            );
          }))}
        </div>

        {gameEnd && (
          <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
            <div className="bg-card p-8 rounded-3xl shadow-xl border border-border text-center">
              <h4 className="text-3xl font-black text-foreground mb-2">{endLabel}</h4>
              <p className="text-muted-foreground mb-6 uppercase tracking-widest font-bold text-xs">
                {gameEnd.reason === 'checkmate' ? t.checkmate : t.stalemate}
              </p>
              <button onClick={reset} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">
                {t.reset}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2">
        {([['p', t.pawn], ['n', t.knight], ['b', t.bishop], ['r', t.rook], ['q', t.queen], ['k', t.king]] as const).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded-xl">
            <span className="text-xl">{pieceIcons[key]}</span>
            <span className="text-[10px] font-black text-muted-foreground uppercase">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChessBoard;
