import React, { useState, useEffect, useRef } from 'react';
import type { Locale } from '../../lib/i18n';
import {
  chessApplyState, chessBestStateMove, chessDrawReason, chessInCheck, chessLegalStateMoves,
  chessPositionKey, createInitialChessState, isWhitePiece,
  type ChessMove, type ChessDrawReason, type PromotionPiece,
} from '../../lib/games/ai/chess';
import type { AiLevel, GameMode } from '../../lib/games/ai/types';
import { getRecord, recordResult, type GameRecord } from '../../lib/games/records';
import { clearChessSave, loadChessSave, storeChessSave } from '../../lib/games/chess-save';

const AI_IS_WHITE = false; // AI plays black; human opens as white
const AI_DELAY_MS = 500;

const i18n: Record<Locale, {
  title: string; turn: string; white: string; black: string; reset: string;
  pawn: string; knight: string; bishop: string; rook: string; queen: string; king: string;
  modeLocal: string; modeAi: string; level1: string; level2: string; level3: string;
  thinking: string; youWin: string; aiWins: string; draw: string; check: string; checkmate: string; stalemate: string; record: string;
  board: string; empty: string; selectedLabel: string; legalLabel: string;
  promote: string; fiftyMove: string; threefold: string; insufficientMaterial: string;
  localSave: string; restored: string;
}> = {
  ko: { title: "전략의 정수: 체스", turn: "차례", white: "백", black: "흑", reset: "초기화", pawn: "폰", knight: "나이트", bishop: "비숍", rook: "룩", queen: "퀸", king: "킹", modeLocal: "2인 대전", modeAi: "AI 대전", level1: "견습생", level2: "숙련가", level3: "명인", thinking: "상대가 수를 읽고 있습니다…", youWin: "당신의 승리!", aiWins: "AI 승리", draw: "무승부", check: "체크!", checkmate: "체크메이트", stalemate: "스테일메이트", record: "전적", board: "체스판. 화살표 키로 이동하고 Enter 또는 Space로 선택하세요.", empty: "빈 칸", selectedLabel: "선택됨", legalLabel: "이동 가능", promote: "승격할 기물을 선택하세요", fiftyMove: "50수 규칙", threefold: "3회 반복", insufficientMaterial: "기물 부족", localSave: "진행 상황은 이 브라우저에만 자동 저장됩니다.", restored: "이 브라우저에 저장된 게임을 복원했습니다." },
  en: { title: "Chess Strategy", turn: "Turn", white: "White", black: "Black", reset: "Reset", pawn: "Pawn", knight: "Knight", bishop: "Bishop", rook: "Rook", queen: "Queen", king: "King", modeLocal: "2 Players", modeAi: "vs AI", level1: "Apprentice", level2: "Adept", level3: "Master", thinking: "Your opponent is thinking…", youWin: "You win!", aiWins: "AI wins", draw: "Draw", check: "Check!", checkmate: "Checkmate", stalemate: "Stalemate", record: "Record", board: "Chess board. Use arrow keys to move and Enter or Space to select.", empty: "Empty", selectedLabel: "Selected", legalLabel: "Legal move", promote: "Choose a promotion piece", fiftyMove: "Fifty-move rule", threefold: "Threefold repetition", insufficientMaterial: "Insufficient material", localSave: "Progress is saved only in this browser.", restored: "Restored the game saved in this browser." },
  ja: { title: "チェス戦略", turn: "手番", white: "白", black: "黒", reset: "リセット", pawn: "ポーン", knight: "ナイト", bishop: "ビショップ", rook: "ルーク", queen: "クイーン", king: "キング", modeLocal: "2人対戦", modeAi: "AI対戦", level1: "見習い", level2: "熟練者", level3: "名人", thinking: "相手が考えています…", youWin: "あなたの勝ち！", aiWins: "AIの勝ち", draw: "引き分け", check: "チェック！", checkmate: "チェックメイト", stalemate: "ステイルメイト", record: "戦績", board: "チェス盤。矢印キーで移動し、EnterまたはSpaceで選択します。", empty: "空き", selectedLabel: "選択中", legalLabel: "移動可能", promote: "昇格する駒を選択", fiftyMove: "50手ルール", threefold: "同一局面3回", insufficientMaterial: "戦力不足", localSave: "進行状況はこのブラウザ内だけに自動保存されます。", restored: "このブラウザに保存された対局を復元しました。" },
  zh: { title: "国际象棋策略", turn: "回合", white: "白", black: "黑", reset: "重置", pawn: "兵", knight: "马", bishop: "象", rook: "车", queen: "后", king: "王", modeLocal: "双人对战", modeAi: "人机对战", level1: "学徒", level2: "行家", level3: "大师", thinking: "对手正在思考…", youWin: "你赢了！", aiWins: "AI 获胜", draw: "平局", check: "将军！", checkmate: "将死", stalemate: "逼和", record: "战绩", board: "国际象棋棋盘。使用方向键移动，按 Enter 或空格选择。", empty: "空格", selectedLabel: "已选择", legalLabel: "可移动", promote: "选择升变棋子", fiftyMove: "五十回合规则", threefold: "三次重复", insufficientMaterial: "子力不足", localSave: "进度仅自动保存在此浏览器中。", restored: "已恢复此浏览器中保存的对局。" },
  fr: { title: "Stratégie d'échecs", turn: "Tour", white: "Blancs", black: "Noirs", reset: "Réinitialiser", pawn: "Pion", knight: "Cavalier", bishop: "Fou", rook: "Tour", queen: "Dame", king: "Roi", modeLocal: "2 joueurs", modeAi: "contre l'IA", level1: "Apprenti", level2: "Adepte", level3: "Maître", thinking: "Votre adversaire réfléchit…", youWin: "Vous gagnez !", aiWins: "L'IA gagne", draw: "Match nul", check: "Échec !", checkmate: "Échec et mat", stalemate: "Pat", record: "Bilan", board: "Échiquier. Utilisez les flèches puis Entrée ou Espace pour sélectionner.", empty: "Vide", selectedLabel: "Sélectionnée", legalLabel: "Coup possible", promote: "Choisissez la promotion", fiftyMove: "Règle des cinquante coups", threefold: "Triple répétition", insufficientMaterial: "Matériel insuffisant", localSave: "La progression est enregistrée uniquement dans ce navigateur.", restored: "Partie enregistrée dans ce navigateur restaurée." },
  es: { title: "Estrategia de ajedrez", turn: "Turno", white: "Blancas", black: "Negras", reset: "Reiniciar", pawn: "Peón", knight: "Caballo", bishop: "Alfil", rook: "Torre", queen: "Dama", king: "Rey", modeLocal: "2 jugadores", modeAi: "contra la IA", level1: "Aprendiz", level2: "Experto", level3: "Maestro", thinking: "Tu rival está pensando…", youWin: "¡Has ganado!", aiWins: "Gana la IA", draw: "Tablas", check: "¡Jaque!", checkmate: "Jaque mate", stalemate: "Rey ahogado", record: "Historial", board: "Tablero de ajedrez. Usa las flechas y Enter o Espacio para seleccionar.", empty: "Vacía", selectedLabel: "Seleccionada", legalLabel: "Movimiento posible", promote: "Elige la pieza de promoción", fiftyMove: "Regla de cincuenta movimientos", threefold: "Triple repetición", insufficientMaterial: "Material insuficiente", localSave: "El progreso se guarda solo en este navegador.", restored: "Se restauró la partida guardada en este navegador." },
};

type GameEnd = { result: 'white' | 'black' | 'draw'; reason: 'checkmate' | 'stalemate' | ChessDrawReason } | null;

const ChessBoard: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
  const t = i18n[locale] ?? i18n.en;

  const [position, setPosition] = useState(createInitialChessState);
  const board = position.board;
  const isWhiteTurn = position.whiteToMove;
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<ChessMove[] | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEnd>(null);
  const [mode, setMode] = useState<GameMode>('local');
  const [level, setLevel] = useState<AiLevel>(2);
  const [thinking, setThinking] = useState(false);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [restored, setRestored] = useState(false);
  const [focusIndex, setFocusIndex] = useState(56);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const squareRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const promotionTriggerRef = useRef<HTMLElement | null>(null);
  const promotionDialogRef = useRef<HTMLDivElement | null>(null);
  const positionHistory = useRef<string[]>([chessPositionKey(createInitialChessState())]);

  useEffect(() => { setRecord(getRecord('chess')); }, []);
  useEffect(() => {
    const saved = loadChessSave();
    if (!saved) return;
    setPosition(saved.state);
    positionHistory.current = saved.positionHistory;
    setMode(saved.mode);
    setLevel(saved.level);
    setRestored(true);
  }, []);
  useEffect(() => () => { if (aiTimer.current) clearTimeout(aiTimer.current); }, []);
  useEffect(() => {
    if (pendingPromotion) promotionDialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [pendingPromotion]);

  const pieceIcons: Record<string, string> = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
  };

  const reset = () => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    const initial = createInitialChessState();
    setPosition(initial);
    positionHistory.current = [chessPositionKey(initial)];
    setSelected(null);
    setPendingPromotion(null);
    setGameEnd(null);
    setThinking(false);
    setRestored(false);
    clearChessSave();
  };

  const finish = (end: NonNullable<GameEnd>) => {
    clearChessSave();
    setGameEnd(end);
    if (mode === 'ai') {
      const aiColor = AI_IS_WHITE ? 'white' : 'black';
      setRecord(recordResult('chess', end.result === 'draw' ? 'd' : end.result === aiColor ? 'l' : 'w'));
    }
  };

  const applyMove = (current: typeof position, m: ChessMove, moverIsWhite: boolean) => {
    const next = chessApplyState(current, m);
    const nextKey = chessPositionKey(next);
    const nextHistory = [...positionHistory.current, nextKey];
    positionHistory.current = nextHistory;
    storeChessSave({ state: next, positionHistory: nextHistory, mode, level });
    setPosition(next);
    setSelected(null);
    setPendingPromotion(null);
    setRestored(false);
    // opponent's position after the move: mate / stalemate / continue
    if (chessLegalStateMoves(next).length === 0) {
      if (chessInCheck(next.board, !moverIsWhite)) finish({ result: moverIsWhite ? 'white' : 'black', reason: 'checkmate' });
      else finish({ result: 'draw', reason: 'stalemate' });
      return;
    }
    const drawReason = chessDrawReason(next, nextHistory);
    if (drawReason) finish({ result: 'draw', reason: drawReason });
  };

  const legalTargets = selected ? chessLegalStateMoves(position).filter(
    (m) => m.from[0] === selected[0] && m.from[1] === selected[1]
  ) : [];

  const handleSquareClick = (r: number, c: number) => {
    if (gameEnd || thinking) return;
    if (mode === 'ai' && isWhiteTurn === AI_IS_WHITE) return; // AI's turn
    const piece = board[r][c];

    if (selected) {
      if (selected[0] === r && selected[1] === c) { setSelected(null); return; }
      const moves = legalTargets.filter((m) => m.to[0] === r && m.to[1] === c);
      if (moves.length > 1 && moves.every((move) => move.promotion)) { promotionTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setPendingPromotion(moves); return; }
      if (moves[0]) { applyMove(position, moves[0], isWhiteTurn); return; }
      // reselect own piece, otherwise deselect
      if (piece && isWhitePiece(piece) === isWhiteTurn) setSelected([r, c]);
      else setSelected(null);
    } else if (piece && isWhitePiece(piece) === isWhiteTurn) {
      setSelected([r, c]);
    }
  };

  const moveBoardFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const row = Math.floor(index / 8), col = index % 8;
    let next = index;
    if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * 8 + col;
    else if (event.key === 'ArrowDown') next = Math.min(7, row + 1) * 8 + col;
    else if (event.key === 'ArrowLeft') next = row * 8 + Math.max(0, col - 1);
    else if (event.key === 'ArrowRight') next = row * 8 + Math.min(7, col + 1);
    else if (event.key === 'Home') next = event.ctrlKey ? 0 : row * 8;
    else if (event.key === 'End') next = event.ctrlKey ? 63 : row * 8 + 7;
    else return;
    event.preventDefault();
    setFocusIndex(next);
    squareRefs.current[next]?.focus();
  };

  const closePromotion = () => {
    setPendingPromotion(null);
    requestAnimationFrame(() => promotionTriggerRef.current?.focus());
  };
  const trapPromotionFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); closePromotion(); return; }
    if (event.key !== 'Tab') return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
    if (!buttons.length) return;
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  // AI turn
  useEffect(() => {
    if (mode !== 'ai' || gameEnd || isWhiteTurn !== AI_IS_WHITE) return;
    setThinking(true);
    aiTimer.current = setTimeout(() => {
      const move = chessBestStateMove(position, level);
      setThinking(false);
      if (move) applyMove(position, move, AI_IS_WHITE);
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
  const drawLabel = gameEnd?.reason === 'stalemate' ? t.stalemate
    : gameEnd?.reason === 'fiftyMove' ? t.fiftyMove
      : gameEnd?.reason === 'threefold' ? t.threefold
        : gameEnd?.reason === 'insufficientMaterial' ? t.insufficientMaterial : '';
  const endLabel = gameEnd
    ? gameEnd.result === 'draw'
      ? `${t.draw} · ${drawLabel}`
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
        <button type="button" onClick={reset} className="px-4 py-2 bg-muted text-muted-foreground rounded-xl text-xs font-bold border border-border">
          {t.reset}
        </button>
      </div>

      {/* Mode + difficulty */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-border overflow-hidden" role="group" aria-label={`${t.modeLocal} / ${t.modeAi}`}>
          {(['local', 'ai'] as GameMode[]).map((m) => (
            <button type="button" key={m} onClick={() => switchMode(m)}
              aria-pressed={mode === m}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
              {m === 'local' ? t.modeLocal : t.modeAi}
            </button>
          ))}
        </div>
        {mode === 'ai' && (
          <div className="inline-flex gap-1">
            {([1, 2, 3] as AiLevel[]).map((lv) => (
              <button type="button" key={lv} onClick={() => { setLevel(lv); reset(); }}
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
      <p className="mb-3 text-[11px] text-muted-foreground" aria-live="polite">
        {restored ? t.restored : t.localSave}
      </p>

      <div className="relative overflow-x-auto pb-2">
        <div className="grid min-w-[352px] grid-cols-8 grid-rows-8 border-4 border-stone-800 shadow-2xl aspect-square w-full" role="grid" aria-label={t.board}>
          {board.map((row, r) => row.map((piece, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isTarget = legalTargets.some((m) => m.to[0] === r && m.to[1] === c);
            return (
              <button
                key={`${r}-${c}`}
                ref={(node) => { squareRefs.current[r * 8 + c] = node; }}
                onClick={() => handleSquareClick(r, c)}
                onFocus={() => setFocusIndex(r * 8 + c)}
                onKeyDown={(event) => moveBoardFocus(event, r * 8 + c)}
                tabIndex={focusIndex === r * 8 + c ? 0 : -1}
                role="gridcell"
                aria-selected={Boolean(isSelected)}
                aria-label={`${String.fromCharCode(65 + c)}${8 - r}, ${piece ? `${isWhitePiece(piece) ? t.white : t.black} ${t[{ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[piece.toLowerCase()] as 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king']}` : t.empty}${isSelected ? `, ${t.selectedLabel}` : ''}${isTarget ? `, ${t.legalLabel}` : ''}`}
                className={`relative flex min-h-11 min-w-11 items-center justify-center text-3xl sm:text-4xl cursor-pointer transition-colors motion-reduce:transition-none focus-visible:z-20 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-sky-500 ${
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
              </button>
            );
          }))}
        </div>

        {pendingPromotion && (
          <div ref={promotionDialogRef} onKeyDown={trapPromotionFocus} className="absolute inset-0 z-20 min-w-[352px] bg-background/70 backdrop-blur-sm flex items-center justify-center" role="dialog" aria-modal="true" aria-label={t.promote}>
            <div className="bg-card p-5 rounded-2xl border border-border shadow-xl text-center">
              <p className="font-bold mb-3">{t.promote}</p>
              <div className="flex gap-2">
                {(['q', 'r', 'b', 'n'] as PromotionPiece[]).map((promotion) => {
                  const move = pendingPromotion.find((candidate) => candidate.promotion === promotion)!;
                  const key = promotion as 'queen' | 'rook' | 'bishop' | 'knight';
                  return <button type="button" key={promotion} onClick={() => applyMove(position, move, isWhiteTurn)} aria-label={t[key]} className="min-h-11 min-w-11 rounded-xl border border-border bg-muted text-3xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-primary">{pieceIcons[isWhiteTurn ? promotion.toUpperCase() : promotion]}</button>;
                })}
              </div>
            </div>
          </div>
        )}

        {gameEnd && (
          <div className="absolute inset-0 z-20 min-w-[352px] bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in-95 motion-reduce:animate-none" role="status" aria-live="assertive">
            <div className="bg-card p-8 rounded-3xl shadow-xl border border-border text-center">
              <h4 className="text-3xl font-black text-foreground mb-2">{endLabel}</h4>
              <p className="text-muted-foreground mb-6 uppercase tracking-widest font-bold text-xs">
                {gameEnd.reason === 'checkmate' ? t.checkmate : drawLabel}
              </p>
              <button type="button" onClick={reset} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">
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
