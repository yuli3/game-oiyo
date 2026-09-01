import React, { useState, useEffect, useRef, type CSSProperties } from 'react';
import type { Locale } from '../../lib/i18n';
import {
  chessApplyState, chessBestStateMoveIterative, chessDrawReason, chessInCheck, chessLegalStateMoves,
  chessPositionKey, createInitialChessState, isWhitePiece,
  type ChessMove, type ChessDrawReason, type PromotionPiece,
} from '../../lib/games/ai/chess';
import type { AiLevel, GameMode } from '../../lib/games/ai/types';
import { getRecord, recordResult, type GameRecord } from '../../lib/games/records';
import { clearChessSave, loadChessSave, storeChessSave, type ChessMoveRecord } from '../../lib/games/chess-save';
import { capturedChessPiece, chessMaterialBalance, chessReviewMoment, formatChessMove } from '../../lib/games/chess-notation';
import {
  CHESS_AI_BUDGET_MS, CHESS_AI_MAX_DEPTH, isCurrentChessSearchResponse,
  type ChessSearchRequest, type ChessSearchResponse,
} from '../../lib/games/chess-worker-protocol';
import { CHESS_SPRITES } from '../../lib/games/sprites';
import { castleRookDelta, visualSquare } from '../../lib/games/piece-tween';

function ChessPiece({ piece, className }: { piece: string; className?: string }) {
  const src = CHESS_SPRITES[piece];
  if (!src) return null;
  return <img src={src} alt="" draggable={false} className={`pointer-events-none select-none object-contain ${className ?? 'h-[86%] w-[86%]'}`} />;
}

const AI_IS_WHITE = false; // AI plays black; human opens as white
const AI_DELAY_MS = 180;

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
const C2_COPY: Record<Locale, { flip: string; moves: string; captured: string; material: string; lastMove: string; noMoves: string }> = {
  ko: { flip: "판 뒤집기", moves: "수 기록", captured: "잡힌 기물", material: "기물 점수", lastMove: "마지막 수", noMoves: "아직 둔 수가 없습니다" },
  en: { flip: "Flip board", moves: "Move history", captured: "Captured", material: "Material", lastMove: "Last move", noMoves: "No moves yet" },
  ja: { flip: "盤を反転", moves: "棋譜", captured: "取られた駒", material: "駒得", lastMove: "直前の手", noMoves: "まだ指し手はありません" },
  fr: { flip: "Retourner", moves: "Historique", captured: "Capturées", material: "Matériel", lastMove: "Dernier coup", noMoves: "Aucun coup" },
  es: { flip: "Girar tablero", moves: "Historial", captured: "Capturadas", material: "Material", lastMove: "Última jugada", noMoves: "Sin jugadas" },
  zh: { flip: "翻转棋盘", moves: "棋谱", captured: "被吃棋子", material: "子力", lastMove: "上一步", noMoves: "尚未走棋" },
};

const AI_DESC: Record<Locale, Record<AiLevel, string>> = {
  ko: { 1: "최대 2 ply · 80ms", 2: "최대 4 ply · 250ms", 3: "최대 6 ply · 800ms" },
  en: { 1: "Up to 2 ply · 80ms", 2: "Up to 4 ply · 250ms", 3: "Up to 6 ply · 800ms" },
  ja: { 1: "最大2 ply · 80ms", 2: "最大4 ply · 250ms", 3: "最大6 ply · 800ms" },
  zh: { 1: "最多2 ply · 80ms", 2: "最多4 ply · 250ms", 3: "最多6 ply · 800ms" },
  fr: { 1: "Jusqu’à 2 ply · 80ms", 2: "Jusqu’à 4 ply · 250ms", 3: "Jusqu’à 6 ply · 800ms" },
  es: { 1: "Hasta 2 ply · 80ms", 2: "Hasta 4 ply · 250ms", 3: "Hasta 6 ply · 800ms" },
};

const REVIEW_COPY: Record<Locale, { title: string; move: string; capture: string; check: string; last: string; difficulty: string }> = {
  ko: { title: "패배 복기", move: "번째 수", capture: "이 수에서 기물을 잃었습니다. 다음 판에는 상대가 공격하는 칸을 먼저 확인해 보세요.", check: "이 체크가 응수 범위를 좁혔습니다. 체크를 막기 전에 킹이 갈 수 있는 칸도 함께 보세요.", last: "마지막 수에서 선택지가 닫혔습니다. 한 수 전의 안전한 대안을 찾아보세요.", difficulty: "AI 난이도" },
  en: { title: "Loss review", move: "move", capture: "This move lost material. Next game, scan every square the opponent attacks before committing.", check: "This check narrowed your replies. Before blocking, also count the king’s escape squares.", last: "Choices closed on the final move. Look for a safer alternative one move earlier.", difficulty: "AI difficulty" },
  ja: { title: "敗局の振り返り", move: "手目", capture: "この手で駒を失いました。次は相手の利いているマスを先に確認しましょう。", check: "このチェックで応手が狭まりました。受ける前にキングの逃げ道も確認しましょう。", last: "最後の手で選択肢が閉じました。一手前の安全な代案を探しましょう。", difficulty: "AI難易度" },
  zh: { title: "败局复盘", move: "回合", capture: "这一步损失了子力。下次落子前先检查对手控制的格子。", check: "这次将军缩小了应对范围。挡将前也要查看王的逃生格。", last: "最后一步使选择关闭。回看前一步是否有更安全的方案。", difficulty: "AI难度" },
  fr: { title: "Revoir la défaite", move: "coup", capture: "Ce coup a perdu du matériel. Vérifiez d’abord toutes les cases attaquées par l’adversaire.", check: "Cet échec a réduit vos réponses. Comptez aussi les cases de fuite du roi avant de parer.", last: "Les choix se sont fermés au dernier coup. Cherchez une option plus sûre un coup avant.", difficulty: "Difficulté IA" },
  es: { title: "Revisión de la derrota", move: "jugada", capture: "Esta jugada perdió material. Revisa primero todas las casillas atacadas por el rival.", check: "Este jaque redujo tus respuestas. Cuenta también las casillas de escape del rey antes de bloquear.", last: "Las opciones se cerraron en la última jugada. Busca una alternativa segura un turno antes.", difficulty: "Dificultad IA" },
};

const C3_COPY: Record<Locale, { summary: string; movesPlayed: string; finalMaterial: string; keyMoment: string; noKeyMoment: string; playAgain: string }> = {
  ko: { summary: "대국 결과", movesPlayed: "총 수", finalMaterial: "최종 기물 점수", keyMoment: "마지막 결정적 장면", noKeyMoment: "기물 손실 없이 승부가 결정됐습니다", playAgain: "다시 대국" },
  en: { summary: "Game summary", movesPlayed: "Moves played", finalMaterial: "Final material", keyMoment: "Last key moment", noKeyMoment: "The game ended without a capture", playAgain: "Play again" },
  ja: { summary: "対局結果", movesPlayed: "総手数", finalMaterial: "最終駒得", keyMoment: "最後の重要局面", noKeyMoment: "駒を取らずに決着しました", playAgain: "もう一局" },
  fr: { summary: "Résumé", movesPlayed: "Coups joués", finalMaterial: "Matériel final", keyMoment: "Dernier moment clé", noKeyMoment: "La partie s'est terminée sans capture", playAgain: "Rejouer" },
  es: { summary: "Resumen", movesPlayed: "Jugadas", finalMaterial: "Material final", keyMoment: "Último momento clave", noKeyMoment: "La partida terminó sin capturas", playAgain: "Jugar de nuevo" },
  zh: { summary: "对局结果", movesPlayed: "总步数", finalMaterial: "最终子力", keyMoment: "最后关键时刻", noKeyMoment: "本局未发生吃子", playAgain: "再来一局" },
};

const ChessBoard: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
  const t = i18n[locale] ?? i18n.en;
  const c2 = C2_COPY[locale] ?? C2_COPY.en;
  const c3 = C3_COPY[locale] ?? C3_COPY.en;
  const reviewCopy = REVIEW_COPY[locale] ?? REVIEW_COPY.en;

  const [position, setPosition] = useState(createInitialChessState);
  const board = position.board;
  const isWhiteTurn = position.whiteToMove;
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<ChessMove[] | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEnd>(null);
  const [mode, setMode] = useState<GameMode>('local');
  const [level, setLevel] = useState<AiLevel>(2);
  const aiDescription = (AI_DESC[locale] ?? AI_DESC.en)[level];
  const [thinking, setThinking] = useState(false);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [restored, setRestored] = useState(false);
  const [focusIndex, setFocusIndex] = useState(56);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [moveHistory, setMoveHistory] = useState<ChessMoveRecord[]>([]);
  const [lastMove, setLastMove] = useState<ChessMove | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiWorker = useRef<Worker | null>(null);
  const aiRequestId = useRef(0);
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
    setMoveHistory(saved.moveHistory);
    setOrientation(saved.orientation);
    setRestored(true);
  }, []);
  useEffect(() => () => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    aiWorker.current?.terminate();
  }, []);
  useEffect(() => {
    if (pendingPromotion) promotionDialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [pendingPromotion]);

  const reset = () => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    aiWorker.current?.terminate();
    aiWorker.current = null;
    aiRequestId.current += 1;
    const initial = createInitialChessState();
    setPosition(initial);
    positionHistory.current = [chessPositionKey(initial)];
    setSelected(null);
    setPendingPromotion(null);
    setGameEnd(null);
    setThinking(false);
    setMoveHistory([]);
    setLastMove(null);
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
    const captured = capturedChessPiece(current, m);
    const nextMoveHistory = [...moveHistory, { notation: formatChessMove(current, m, next), captured, white: moverIsWhite }];
    setMoveHistory(nextMoveHistory);
    setLastMove(m);
    const nextKey = chessPositionKey(next);
    const nextHistory = [...positionHistory.current, nextKey];
    positionHistory.current = nextHistory;
    storeChessSave({ state: next, positionHistory: nextHistory, mode, level, moveHistory: nextMoveHistory, orientation });
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
    const requestId = ++aiRequestId.current;
    const positionKey = chessPositionKey(position);
    let disposed = false;

    const applyResponse = (response: ChessSearchResponse) => {
      if (disposed || !isCurrentChessSearchResponse(response, requestId, positionKey)) return;
      aiWorker.current?.terminate();
      aiWorker.current = null;
      setThinking(false);
      if (response.move) applyMove(position, response.move, AI_IS_WHITE);
    };

    aiTimer.current = setTimeout(() => {
      try {
        const worker = new Worker(new URL('../../workers/chess-ai.worker.ts', import.meta.url), { type: 'module' });
        aiWorker.current = worker;
        worker.onmessage = (event: MessageEvent<ChessSearchResponse>) => applyResponse(event.data);
        worker.onerror = () => {
          worker.terminate();
          if (disposed) return;
          const startedAt = performance.now();
          const result = chessBestStateMoveIterative(position, Math.min(2, CHESS_AI_MAX_DEPTH[level]), () => performance.now() - startedAt >= Math.min(80, CHESS_AI_BUDGET_MS[level]));
          applyResponse({ type: 'result', requestId, positionKey, ...result, elapsedMs: performance.now() - startedAt });
        };
        const request: ChessSearchRequest = { type: 'search', requestId, positionKey, state: position, level };
        worker.postMessage(request);
      } catch {
        const startedAt = performance.now();
        const result = chessBestStateMoveIterative(position, 1, () => performance.now() - startedAt >= 50);
        applyResponse({ type: 'result', requestId, positionKey, ...result, elapsedMs: performance.now() - startedAt });
      }
    }, AI_DELAY_MS);
    return () => {
      disposed = true;
      if (aiTimer.current) clearTimeout(aiTimer.current);
      aiWorker.current?.terminate();
      aiWorker.current = null;
    };
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
  const displaySquares = Array.from({ length: 64 }, (_, displayIndex) => {
    const logicalIndex = orientation === 'white' ? displayIndex : 63 - displayIndex;
    return { displayIndex, r: Math.floor(logicalIndex / 8), c: logicalIndex % 8 };
  });
  const flipped = orientation === 'black';
  const rookSlide = lastMove ? castleRookDelta(lastMove.from[0], lastMove.from[1], lastMove.to[0], lastMove.to[1]) : null;
  const capturedPieces = moveHistory.flatMap((entry) => entry.captured ? [entry.captured] : []);
  const material = chessMaterialBalance(capturedPieces);
  const keyMoment = [...moveHistory].reverse().find((entry) => entry.captured || /[+#]$/.test(entry.notation));
  const humanLost = Boolean(gameEnd && mode === 'ai' && gameEnd.result === (AI_IS_WHITE ? 'white' : 'black'));
  const reviewMoment = humanLost ? chessReviewMoment(moveHistory, !AI_IS_WHITE) : null;
  const reviewTip = reviewMoment?.kind === 'capture' ? reviewCopy.capture : reviewMoment?.kind === 'check' ? reviewCopy.check : reviewCopy.last;
  const turnSummary = thinking ? t.thinking : `${isWhiteTurn ? t.white : t.black} ${t.turn}${inCheck ? ` · ${t.check}` : ''}${moveHistory.length ? ` · ${c2.lastMove}: ${moveHistory.at(-1)?.notation}` : ''}`;

  const flipBoard = () => {
    const nextOrientation = orientation === 'white' ? 'black' : 'white';
    setOrientation(nextOrientation);
    setFocusIndex(56);
    storeChessSave({ state: position, positionHistory: positionHistory.current, mode, level, moveHistory, orientation: nextOrientation });
  };

  return (
    <div className="not-prose my-12 p-4 sm:p-8 bg-card border border-border rounded-4xl shadow-sm max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-black text-foreground">{t.title}</h3>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1" aria-live="polite">
            {turnSummary}
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
        {mode === 'ai' && (
          <p className="basis-full text-[11px] font-medium text-muted-foreground">
            {reviewCopy.difficulty}: {level === 1 ? t.level1 : level === 2 ? t.level2 : t.level3} · {aiDescription}
          </p>
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

      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-muted-foreground" aria-live="polite">
          {c2.lastMove}: {moveHistory.at(-1)?.notation ?? c2.noMoves}
        </span>
        <button type="button" onClick={flipBoard}
          className="min-h-11 rounded-xl border border-border bg-muted px-3 text-xs font-bold" aria-pressed={orientation === 'black'}>
          ↕ {c2.flip}
        </button>
      </div>

      <div className="relative pb-2">
        <div className="grid grid-cols-8 grid-rows-8 border-4 border-stone-800 shadow-2xl aspect-square w-full" role="grid" aria-label={t.board}>
          {displaySquares.map(({ displayIndex, r, c }) => {
            const piece = board[r][c];
            const isDark = (r + c) % 2 === 1;
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isTarget = legalTargets.some((m) => m.to[0] === r && m.to[1] === c);
            const isLastMove = lastMove && ((lastMove.from[0] === r && lastMove.from[1] === c) || (lastMove.to[0] === r && lastMove.to[1] === c));
            return (
              <button
                key={`${r}-${c}`}
                ref={(node) => { squareRefs.current[displayIndex] = node; }}
                onClick={() => handleSquareClick(r, c)}
                onFocus={() => setFocusIndex(displayIndex)}
                onKeyDown={(event) => moveBoardFocus(event, displayIndex)}
                tabIndex={focusIndex === displayIndex ? 0 : -1}
                role="gridcell"
                aria-selected={Boolean(isSelected)}
                aria-label={`${String.fromCharCode(65 + c)}${8 - r}, ${piece ? `${isWhitePiece(piece) ? t.white : t.black} ${t[{ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[piece.toLowerCase()] as 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king']}` : t.empty}${isSelected ? `, ${t.selectedLabel}` : ''}${isTarget ? `, ${t.legalLabel}` : ''}${isLastMove ? `, ${c2.lastMove}` : ''}`}
                className={`relative flex min-h-0 min-w-0 items-center justify-center text-[clamp(1.45rem,8vw,2.25rem)] cursor-pointer transition-colors motion-reduce:transition-none focus-visible:z-20 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-sky-500 ${
                  isDark ? 'bg-[#b58863]' : 'bg-[#f0d9b5]'
                } ${isSelected ? 'ring-4 ring-primary inset-0 z-10' : ''} ${isLastMove ? 'after:absolute after:inset-1 after:border-2 after:border-amber-400 after:pointer-events-none' : ''}`}
              >
                {isTarget && (
                  piece
                    ? <div className="absolute inset-0 ring-4 ring-inset ring-primary/60 z-10 pointer-events-none" />
                    : <div className="absolute w-1/4 h-1/4 rounded-full bg-primary/40 z-10 pointer-events-none" />
                )}
                {piece ? (
                  lastMove && lastMove.to[0] === r && lastMove.to[1] === c ? (
                    <span
                      key={`slide-${moveHistory.length}`}
                      className="oiyo-piece-slide absolute inset-0 z-20 flex items-center justify-center"
                      style={{
                        '--dx': visualSquare(lastMove.from[0], lastMove.from[1], flipped).col - visualSquare(r, c, flipped).col,
                        '--dy': visualSquare(lastMove.from[0], lastMove.from[1], flipped).row - visualSquare(r, c, flipped).row,
                      } as CSSProperties}
                    >
                      <ChessPiece piece={piece} />
                    </span>
                  ) : rookSlide && rookSlide.toRow === r && rookSlide.toCol === c ? (
                    <span
                      key={`rook-${moveHistory.length}`}
                      className="oiyo-piece-slide absolute inset-0 z-20 flex items-center justify-center"
                      style={{
                        '--dx': visualSquare(rookSlide.fromRow, rookSlide.fromCol, flipped).col - visualSquare(r, c, flipped).col,
                        '--dy': visualSquare(rookSlide.fromRow, rookSlide.fromCol, flipped).row - visualSquare(r, c, flipped).row,
                      } as CSSProperties}
                    >
                      <ChessPiece piece={piece} />
                    </span>
                  ) : (
                    <ChessPiece piece={piece} />
                  )
                ) : null}
              </button>
            );
          })}
        </div>

        {pendingPromotion && (
          <div ref={promotionDialogRef} onKeyDown={trapPromotionFocus} className="absolute inset-0 z-20 bg-background/70 backdrop-blur-sm flex items-center justify-center" role="dialog" aria-modal="true" aria-label={t.promote}>
            <div className="bg-card p-5 rounded-2xl border border-border shadow-xl text-center">
              <p className="font-bold mb-3">{t.promote}</p>
              <div className="flex gap-2">
                {(['q', 'r', 'b', 'n'] as PromotionPiece[]).map((promotion) => {
                  const move = pendingPromotion.find((candidate) => candidate.promotion === promotion)!;
                  const key = promotion as 'queen' | 'rook' | 'bishop' | 'knight';
                  return <button type="button" key={promotion} onClick={() => applyMove(position, move, isWhiteTurn)} aria-label={t[key]} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-muted focus-visible:outline focus-visible:outline-4 focus-visible:outline-primary"><ChessPiece piece={isWhiteTurn ? promotion.toUpperCase() : promotion} className="h-8 w-8" /></button>;
                })}
              </div>
            </div>
          </div>
        )}

        {gameEnd && (
          <div className="absolute inset-0 z-20 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in-95 motion-reduce:animate-none" role="dialog" aria-modal="true" aria-labelledby="chess-result-title">
            <div className="mx-3 max-w-sm bg-card p-5 sm:p-8 rounded-3xl shadow-xl border border-border text-center">
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{c3.summary}</p>
              <h4 id="chess-result-title" className="text-2xl sm:text-3xl font-black text-foreground mb-2">{endLabel}</h4>
              <p className="text-muted-foreground mb-6 uppercase tracking-widest font-bold text-xs">
                {gameEnd.reason === 'checkmate' ? t.checkmate : drawLabel}
              </p>
              <dl className="mb-5 grid grid-cols-2 gap-2 text-left text-xs">
                <div className="rounded-xl bg-muted p-2"><dt className="text-muted-foreground">{c3.movesPlayed}</dt><dd className="font-black">{moveHistory.length}</dd></div>
                <div className="rounded-xl bg-muted p-2"><dt className="text-muted-foreground">{c3.finalMaterial}</dt><dd className="font-black">{material > 0 ? `+${material}` : material}</dd></div>
                <div className="col-span-2 rounded-xl bg-muted p-2"><dt className="text-muted-foreground">{c3.keyMoment}</dt><dd className="font-black">{keyMoment?.notation ?? c3.noKeyMoment}</dd></div>
              </dl>
              {humanLost && reviewMoment && (
                <div className="mb-5 rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-left text-xs text-stone-800">
                  <p className="font-black text-amber-900">{reviewCopy.title} · {reviewMoment.moveNumber}{reviewCopy.move} · {reviewMoment.notation}</p>
                  <p className="mt-1 leading-5">{reviewTip}</p>
                  <p className="mt-2 text-[10px] font-bold text-stone-500">{reviewCopy.difficulty}: {level === 1 ? t.level1 : level === 2 ? t.level2 : t.level3} · {aiDescription}</p>
                </div>
              )}
              <button type="button" onClick={reset} autoFocus className="min-h-11 px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">
                {c3.playAgain}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-muted/35 p-3" aria-label={c2.moves}>
          <h4 className="mb-2 text-xs font-black uppercase tracking-wider">{c2.moves}</h4>
          {moveHistory.length === 0 ? <p className="text-xs text-muted-foreground">{c2.noMoves}</p> : (
            <ol className="max-h-28 overflow-y-auto text-xs font-mono" aria-live="polite">
              {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, index) => (
                <li key={index} className="grid grid-cols-[2rem_1fr_1fr] gap-1 py-0.5">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  <span>{moveHistory[index * 2]?.notation}</span>
                  <span>{moveHistory[index * 2 + 1]?.notation ?? ''}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-muted/35 p-3" aria-label={c2.captured}>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider">{c2.captured}</h4>
            <span className="text-xs font-black">{c2.material}: {material > 0 ? `+${material}` : material}</span>
          </div>
          <div className="min-h-7 text-xl" aria-live="polite">
            {capturedPieces.length ? capturedPieces.map((piece, index) => <ChessPiece key={`${piece}-${index}`} piece={piece} className="inline-block h-6 w-6" />) : <span className="text-xs text-muted-foreground">—</span>}
          </div>
        </section>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2">
        {([['p', t.pawn], ['n', t.knight], ['b', t.bishop], ['r', t.rook], ['q', t.queen], ['k', t.king]] as const).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded-xl">
            <ChessPiece piece={key.toUpperCase()} className="h-7 w-7" />
            <span className="text-[10px] font-black text-muted-foreground uppercase">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChessBoard;
