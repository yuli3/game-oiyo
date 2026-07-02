import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import type { Locale } from '../../lib/i18n';
import { checkersBestMove, checkersMoves, type CheckersPiece } from '../../lib/games/ai/checkers';
import type { AiLevel, GameMode } from '../../lib/games/ai/types';
import { getRecord, recordResult, type GameRecord } from '../../lib/games/records';

const SIZE = 8;

type Piece = CheckersPiece;
const AI_PLAYER = 2; // AI plays black; human opens as red
const AI_DELAY_MS = 500;

const i18n: Record<Locale, {
    title: string; turn: string; red: string; black: string; win: string; over: string; reset: string;
    modeLocal: string; modeAi: string; level1: string; level2: string; level3: string;
    thinking: string; youWin: string; aiWins: string; record: string;
}> = {
    ko: { title: "체커 (Checkers)", turn: "차례", red: "홍(Red)", black: "흑(Black)", win: "승리!", over: "게임 종료", reset: "판 갈기", modeLocal: "2인 대전", modeAi: "AI 대전", level1: "견습생", level2: "숙련가", level3: "명인", thinking: "상대가 수를 읽고 있습니다…", youWin: "당신의 승리!", aiWins: "AI 승리", record: "전적" },
    en: { title: "Checkers", turn: "Turn", red: "Red", black: "Black", win: "Wins!", over: "Game Over", reset: "New Match", modeLocal: "2 Players", modeAi: "vs AI", level1: "Apprentice", level2: "Adept", level3: "Master", thinking: "Your opponent is thinking…", youWin: "You win!", aiWins: "AI wins", record: "Record" },
    ja: { title: "チェッカー", turn: "手番", red: "赤", black: "黒", win: "勝利！", over: "ゲーム終了", reset: "新しい対局", modeLocal: "2人対戦", modeAi: "AI対戦", level1: "見習い", level2: "熟練者", level3: "名人", thinking: "相手が考えています…", youWin: "あなたの勝ち！", aiWins: "AIの勝ち", record: "戦績" },
    zh: { title: "跳棋 (Checkers)", turn: "回合", red: "红", black: "黑", win: "获胜！", over: "游戏结束", reset: "重新开局", modeLocal: "双人对战", modeAi: "人机对战", level1: "学徒", level2: "行家", level3: "大师", thinking: "对手正在思考…", youWin: "你赢了！", aiWins: "AI 获胜", record: "战绩" },
    fr: { title: "Jeu de dames", turn: "Tour", red: "Rouge", black: "Noir", win: "gagne !", over: "Partie terminée", reset: "Nouvelle partie", modeLocal: "2 joueurs", modeAi: "contre l'IA", level1: "Apprenti", level2: "Adepte", level3: "Maître", thinking: "Votre adversaire réfléchit…", youWin: "Vous gagnez !", aiWins: "L'IA gagne", record: "Bilan" },
    es: { title: "Damas", turn: "Turno", red: "Rojas", black: "Negras", win: "¡gana!", over: "Fin de la partida", reset: "Nueva partida", modeLocal: "2 jugadores", modeAi: "contra la IA", level1: "Aprendiz", level2: "Experto", level3: "Maestro", thinking: "Tu rival está pensando…", youWin: "¡Has ganado!", aiWins: "Gana la IA", record: "Historial" },
};

const Checkers: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
    const t = i18n[locale] ?? i18n.en;

    const [board, setBoard] = useState<(Piece | null)[]>(Array(SIZE * SIZE).fill(null));
    const [isRedTurn, setIsRedTurn] = useState(true);
    const [selected, setSelected] = useState<number | null>(null);
    const [winner, setWinner] = useState<number | null>(null);
    const [mode, setMode] = useState<GameMode>('local');
    const [level, setLevel] = useState<AiLevel>(2);
    const [thinking, setThinking] = useState(false);
    const [record, setRecord] = useState<GameRecord | null>(null);
    const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const initGame = useCallback(() => {
        if (aiTimer.current) clearTimeout(aiTimer.current);
        const newBoard = Array(SIZE * SIZE).fill(null);
        for (let i = 0; i < SIZE * SIZE; i++) {
            const r = Math.floor(i / SIZE);
            const c = i % SIZE;
            if ((r + c) % 2 === 1) {
                if (r < 3) newBoard[i] = { player: 2, isKing: false };
                else if (r > 4) newBoard[i] = { player: 1, isKing: false };
            }
        }
        setBoard(newBoard);
        setIsRedTurn(true);
        setSelected(null);
        setWinner(null);
        setThinking(false);
    }, []);

    useEffect(() => { initGame(); }, [initGame]);
    useEffect(() => { setRecord(getRecord('checkers')); }, []);
    useEffect(() => () => { if (aiTimer.current) clearTimeout(aiTimer.current); }, []);

    const finish = (w: number) => {
        setWinner(w);
        if (mode === 'ai') setRecord(recordResult('checkers', w === AI_PLAYER ? 'l' : 'w'));
    };

    const handleSquareClick = (index: number) => {
        if (winner !== null || thinking) return;
        if (mode === 'ai' && !isRedTurn) return; // AI's turn
        const piece = board[index];

        if (selected !== null) {
            if (selected === index) { setSelected(null); return; }

            const sr = Math.floor(selected / SIZE);
            const sc = selected % SIZE;
            const r = Math.floor(index / SIZE);
            const c = index % SIZE;
            const dr = r - sr;
            const dc = Math.abs(c - sc);

            const sPiece = board[selected]!;
            const isForward = sPiece.player === 1 ? dr === -1 : dr === 1;

            if (board[index] === null && (r + c) % 2 === 1) {
                if (dc === 1 && (isForward || (sPiece.isKing && Math.abs(dr) === 1))) {
                    executeMove(selected, index);
                } else if (Math.abs(dr) === 2 && dc === 2) {
                    // Jump Logic
                    const mr = sr + dr / 2;
                    const mc = sc + (c - sc) / 2;
                    const mIndex = mr * SIZE + mc;
                    const mPiece = board[mIndex];
                    if (mPiece && mPiece.player !== sPiece.player) {
                        executeMove(selected, index, mIndex);
                    }
                }
            }
        } else if (piece && piece.player === (isRedTurn ? 1 : 2)) {
            setSelected(index);
        }
    };

    const executeMove = (from: number, to: number, jumpOver?: number) => {
        const newBoard = [...board];
        newBoard[to] = newBoard[from];
        newBoard[from] = null;
        if (jumpOver !== undefined) newBoard[jumpOver] = null;

        // Promotion to King
        const r = Math.floor(to / SIZE);
        if ((newBoard[to]?.player === 1 && r === 0) || (newBoard[to]?.player === 2 && r === 7)) {
            newBoard[to] = { ...newBoard[to]!, isKing: true };
        }

        setBoard(newBoard);
        setSelected(null);

        const mover = newBoard[to]!.player;
        const opponent = mover === 1 ? 2 : 1;
        const oppPieces = newBoard.filter(p => p?.player === opponent).length;
        if (oppPieces === 0 || checkersMoves(newBoard, opponent).length === 0) {
            finish(mover); // captured out or stalemated
        } else {
            setIsRedTurn(mover === 2);
        }
    };

    // AI turn
    useEffect(() => {
        if (mode !== 'ai' || winner !== null || isRedTurn) return;
        setThinking(true);
        aiTimer.current = setTimeout(() => {
            const move = checkersBestMove(board, AI_PLAYER, level);
            setThinking(false);
            if (move) executeMove(move.from, move.to, move.jumpOver);
            else finish(1); // AI has no moves — human wins
        }, AI_DELAY_MS);
        return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, isRedTurn, winner]);

    const switchMode = (m: GameMode) => {
        if (m === mode) return;
        setMode(m);
        initGame();
    };

    const winLabel = mode === 'ai'
        ? (winner === AI_PLAYER ? t.aiWins : t.youWin)
        : `${winner === 1 ? t.red : t.black} ${t.win}`;

    return (
        <GameContainer title={t.title} subtitle="Strategic Maneuver" onReset={initGame}>
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
                            <button key={lv} onClick={() => { setLevel(lv); initGame(); }}
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

            <div className="flex justify-between items-center mb-6">
                <div className={`flex items-center gap-2 p-2 rounded-xl border ${isRedTurn ? 'bg-destructive/10 border-destructive' : 'bg-muted border-transparent opacity-50'}`} aria-live="polite">
                    <div className="w-3 h-3 rounded-full bg-destructive shadow-sm" />
                    <span className="text-xs font-black uppercase tracking-widest">
                        {thinking ? t.thinking : `${isRedTurn ? t.red : t.black} ${t.turn}`}
                    </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase">
                    <span>{t.red}: {board.filter(p=>p?.player===1).length}</span>
                    <span>{t.black}: {board.filter(p=>p?.player===2).length}</span>
                </div>
            </div>

            <div className="grid grid-cols-8 grid-rows-8 aspect-square w-full border-4 border-stone-800 shadow-2xl overflow-hidden rounded-lg">
                {board.map((piece, i) => {
                    const r = Math.floor(i / SIZE), c = i % SIZE;
                    const isDark = (r + c) % 2 === 1;
                    const isSelected = selected === i;
                    return (
                        <div
                            key={i}
                            onClick={() => handleSquareClick(i)}
                            className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                                isDark ? 'bg-stone-700' : 'bg-stone-200'
                            }`}
                        >
                            {isSelected && <div className="absolute inset-0 bg-primary/20 ring-4 ring-primary ring-inset z-10" />}
                            {piece && (
                                <div className={`w-[80%] h-[80%] rounded-full shadow-lg border-b-4 transform transition-all animate-in zoom-in-75 ${
                                    piece.player === 1 ? 'bg-destructive border-destructive-foreground/30' : 'bg-slate-900 border-slate-700'
                                } flex items-center justify-center`}>
                                    {piece.isKing && <span className="text-white text-xs sm:text-lg">👑</span>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {winner && (
                <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm rounded-4xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                    <h4 className="text-4xl font-black text-foreground mb-4">{winLabel}</h4>
                    <button onClick={initGame} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">
                        {t.reset}
                    </button>
                </div>
            )}
        </GameContainer>
    );
};

export default Checkers;
