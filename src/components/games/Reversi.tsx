import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import type { Locale } from '../../lib/i18n';
import { reversiBestMove, reversiFlips, reversiMoves } from '../../lib/games/ai/reversi';
import type { AiLevel, GameMode } from '../../lib/games/ai/types';
import { getRecord, recordResult, type GameRecord } from '../../lib/games/records';

const SIZE = 8;
const AI_PLAYER = 2; // AI plays white; human opens as black
const AI_DELAY_MS = 500;

const i18n: Record<Locale, {
    title: string; turn: string; black: string; white: string; win: string; over: string; reset: string; score: string;
    modeLocal: string; modeAi: string; level1: string; level2: string; level3: string;
    thinking: string; youWin: string; aiWins: string; draw: string; record: string;
}> = {
    ko: { title: "오델로 (Othello)", turn: "차례", black: "흑", white: "백", win: "승리!", over: "게임 종료", reset: "새 게임", score: "점수", modeLocal: "2인 대전", modeAi: "AI 대전", level1: "견습생", level2: "숙련가", level3: "명인", thinking: "상대가 수를 읽고 있습니다…", youWin: "당신의 승리!", aiWins: "AI 승리", draw: "무승부", record: "전적" },
    en: { title: "Othello", turn: "Turn", black: "Black", white: "White", win: "Wins!", over: "Game Over", reset: "New Game", score: "Score", modeLocal: "2 Players", modeAi: "vs AI", level1: "Apprentice", level2: "Adept", level3: "Master", thinking: "Your opponent is reading the board…", youWin: "You win!", aiWins: "AI wins", draw: "Draw", record: "Record" },
    ja: { title: "オセロ", turn: "手番", black: "黒", white: "白", win: "勝利！", over: "ゲーム終了", reset: "新しい対局", score: "スコア", modeLocal: "2人対戦", modeAi: "AI対戦", level1: "見習い", level2: "熟練者", level3: "名人", thinking: "相手が盤面を読んでいます…", youWin: "あなたの勝ち！", aiWins: "AIの勝ち", draw: "引き分け", record: "戦績" },
    zh: { title: "黑白棋", turn: "回合", black: "黑", white: "白", win: "获胜！", over: "游戏结束", reset: "新对局", score: "分数", modeLocal: "双人对战", modeAi: "人机对战", level1: "学徒", level2: "行家", level3: "大师", thinking: "对手正在读盘…", youWin: "你赢了！", aiWins: "AI 获胜", draw: "平局", record: "战绩" },
    fr: { title: "Othello", turn: "Tour", black: "Noir", white: "Blanc", win: "gagne !", over: "Partie terminée", reset: "Nouvelle partie", score: "Score", modeLocal: "2 joueurs", modeAi: "contre l'IA", level1: "Apprenti", level2: "Adepte", level3: "Maître", thinking: "Votre adversaire lit le plateau…", youWin: "Vous gagnez !", aiWins: "L'IA gagne", draw: "Match nul", record: "Bilan" },
    es: { title: "Othello", turn: "Turno", black: "Negras", white: "Blancas", win: "¡gana!", over: "Fin de la partida", reset: "Nueva partida", score: "Puntos", modeLocal: "2 jugadores", modeAi: "contra la IA", level1: "Aprendiz", level2: "Experto", level3: "Maestro", thinking: "Tu rival está leyendo el tablero…", youWin: "¡Has ganado!", aiWins: "Gana la IA", draw: "Tablas", record: "Historial" },
};

const Reversi: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
    const t = i18n[locale] ?? i18n.en;

    const [board, setBoard] = useState<(number | null)[]>(Array(SIZE * SIZE).fill(null));
    const [isBlackTurn, setIsBlackTurn] = useState(true);
    const [winner, setWinner] = useState<number | null>(null);
    const [mode, setMode] = useState<GameMode>('local');
    const [level, setLevel] = useState<AiLevel>(2);
    const [thinking, setThinking] = useState(false);
    const [record, setRecord] = useState<GameRecord | null>(null);
    const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const initGame = useCallback(() => {
        if (aiTimer.current) clearTimeout(aiTimer.current);
        const newBoard = Array(SIZE * SIZE).fill(null);
        newBoard[27] = 2; newBoard[28] = 1;
        newBoard[35] = 1; newBoard[36] = 2;
        setBoard(newBoard);
        setIsBlackTurn(true);
        setWinner(null);
        setThinking(false);
    }, []);

    useEffect(() => { initGame(); }, [initGame]);
    useEffect(() => { setRecord(getRecord('reversi')); }, []);
    useEffect(() => () => { if (aiTimer.current) clearTimeout(aiTimer.current); }, []);

    const finish = (newBoard: (number | null)[]) => {
        const bCount = newBoard.filter(v => v === 1).length;
        const wCount = newBoard.filter(v => v === 2).length;
        const w = bCount > wCount ? 1 : wCount > bCount ? 2 : 0;
        setWinner(w);
        if (mode === 'ai') setRecord(recordResult('reversi', w === 0 ? 'd' : w === AI_PLAYER ? 'l' : 'w'));
    };

    const applyMove = (current: (number | null)[], index: number, player: number): boolean => {
        const flips = reversiFlips(current, index, player);
        if (flips.length === 0) return false;
        const opponent = player === 1 ? 2 : 1;
        const newBoard = [...current];
        newBoard[index] = player;
        flips.forEach(i => newBoard[i] = player);
        setBoard(newBoard);

        if (reversiMoves(newBoard, opponent).length > 0) {
            setIsBlackTurn(player === 2); // opponent's turn
        } else if (reversiMoves(newBoard, player).length === 0) {
            finish(newBoard); // neither side can move
        }
        // else: opponent passes, same player moves again (turn state unchanged)
        return true;
    };

    const handleClick = (index: number) => {
        if (winner !== null || thinking) return;
        if (mode === 'ai' && !isBlackTurn) return; // AI's turn
        applyMove(board, index, isBlackTurn ? 1 : 2);
    };

    // AI turn — also refires after a human pass (board dep) since turn may stay with the AI.
    useEffect(() => {
        if (mode !== 'ai' || winner !== null || isBlackTurn) return;
        setThinking(true);
        aiTimer.current = setTimeout(() => {
            const move = reversiBestMove(board, AI_PLAYER, level);
            setThinking(false);
            if (move >= 0) applyMove(board, move, AI_PLAYER);
        }, AI_DELAY_MS);
        return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, isBlackTurn, winner, board]);

    const switchMode = (m: GameMode) => {
        if (m === mode) return;
        setMode(m);
        initGame();
    };

    const bCount = board.filter(v => v === 1).length;
    const wCount = board.filter(v => v === 2).length;
    const validMoves = winner === null && !(mode === 'ai' && !isBlackTurn)
        ? reversiMoves(board, isBlackTurn ? 1 : 2)
        : [];

    const winLabel = winner === 0 ? t.draw
        : mode === 'ai' ? (winner === AI_PLAYER ? t.aiWins : t.youWin)
        : `${winner === 1 ? t.black : t.white} ${t.win}`;

    return (
        <GameContainer title={t.title} subtitle="Reversal Strategy" onReset={initGame}>
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
                <div className="flex gap-4">
                    <div className={`flex items-center gap-2 p-3 rounded-2xl border transition-all ${isBlackTurn ? 'bg-primary/10 border-primary' : 'bg-muted border-transparent opacity-50'}`}>
                        <div className="w-4 h-4 rounded-full bg-slate-900" />
                        <span className="text-xs font-black">{t.black}: {bCount}</span>
                    </div>
                    <div className={`flex items-center gap-2 p-3 rounded-2xl border transition-all ${!isBlackTurn ? 'bg-primary/10 border-primary' : 'bg-muted border-transparent opacity-50'}`}>
                        <div className="w-4 h-4 rounded-full bg-white border border-slate-300" />
                        <span className="text-xs font-black">{t.white}: {wCount}</span>
                    </div>
                </div>
                {thinking && <span className="text-xs font-semibold text-muted-foreground animate-pulse" aria-live="polite">{t.thinking}</span>}
            </div>

            <div className="relative aspect-square w-full bg-chart-1/30 rounded-2xl p-2 grid grid-cols-8 grid-rows-8 gap-1 border border-chart-1/50 shadow-inner">
                {board.map((cell, i) => (
                    <button
                        key={i}
                        onClick={() => handleClick(i)}
                        className={`relative rounded-md flex items-center justify-center transition-all ${
                            validMoves.includes(i) ? 'bg-primary/5 hover:bg-primary/10 cursor-pointer' : 'bg-chart-1/20'
                        }`}
                    >
                        {validMoves.includes(i) && <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />}
                        {cell !== null && (
                            <div className={`w-[85%] h-[85%] rounded-full shadow-lg transform transition-all animate-in zoom-in-75 duration-300 ${
                                cell === 1 ? 'bg-slate-900 border-b-4 border-slate-700' : 'bg-white border-b-4 border-slate-200'
                            }`} />
                        )}
                    </button>
                ))}

                {winner !== null && (
                    <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                        <div className="bg-card p-10 rounded-3xl shadow-xl border-4 border-primary/20 text-center">
                            <h4 className="text-4xl font-black text-foreground mb-2">{winLabel}</h4>
                            <p className="text-muted-foreground mb-8 font-bold uppercase tracking-widest">{t.over}</p>
                            <button onClick={initGame} className="px-12 py-4 bg-primary text-primary-foreground rounded-full font-black shadow-lg hover:scale-105 transition-transform">
                                {t.reset}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default Reversi;
