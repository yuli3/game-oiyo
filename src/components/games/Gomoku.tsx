import React, { useEffect, useRef, useState } from 'react';
import type { Locale } from '../../lib/i18n';
import { gomokuBestMove } from '../../lib/games/ai/gomoku';
import type { AiLevel, GameMode } from '../../lib/games/ai/types';
import { getRecord, recordResult, type GameRecord } from '../../lib/games/records';

const SIZE = 15;

const i18n: Record<Locale, {
    title: string; turn: string; black: string; white: string; win: string; over: string; reset: string;
    modeLocal: string; modeAi: string; level1: string; level2: string; level3: string;
    thinking: string; youWin: string; aiWins: string; draw: string; record: string;
}> = {
    ko: { title: "오목 (Gomoku)", turn: "차례", black: "흑", white: "백", win: "승리!", over: "게임 종료", reset: "판 갈기", modeLocal: "2인 대전", modeAi: "AI 대전", level1: "견습생", level2: "숙련가", level3: "명인", thinking: "상대가 수를 읽고 있습니다…", youWin: "당신의 승리!", aiWins: "AI 승리", draw: "무승부", record: "전적" },
    en: { title: "Gomoku", turn: "Turn", black: "Black", white: "White", win: "Wins!", over: "Game Over", reset: "New Match", modeLocal: "2 Players", modeAi: "vs AI", level1: "Apprentice", level2: "Adept", level3: "Master", thinking: "Your opponent is reading the board…", youWin: "You win!", aiWins: "AI wins", draw: "Draw", record: "Record" },
    ja: { title: "五目並べ", turn: "手番", black: "黒", white: "白", win: "勝利！", over: "ゲーム終了", reset: "新しい対局", modeLocal: "2人対戦", modeAi: "AI対戦", level1: "見習い", level2: "熟練者", level3: "名人", thinking: "相手が盤面を読んでいます…", youWin: "あなたの勝ち！", aiWins: "AIの勝ち", draw: "引き分け", record: "戦績" },
    zh: { title: "五子棋", turn: "回合", black: "黑", white: "白", win: "获胜！", over: "游戏结束", reset: "重新开局", modeLocal: "双人对战", modeAi: "人机对战", level1: "学徒", level2: "行家", level3: "大师", thinking: "对手正在读盘…", youWin: "你赢了！", aiWins: "AI 获胜", draw: "平局", record: "战绩" },
    fr: { title: "Gomoku", turn: "Tour", black: "Noir", white: "Blanc", win: "gagne !", over: "Partie terminée", reset: "Nouvelle partie", modeLocal: "2 joueurs", modeAi: "contre l'IA", level1: "Apprenti", level2: "Adepte", level3: "Maître", thinking: "Votre adversaire lit le plateau…", youWin: "Vous gagnez !", aiWins: "L'IA gagne", draw: "Match nul", record: "Bilan" },
    es: { title: "Gomoku", turn: "Turno", black: "Negras", white: "Blancas", win: "¡gana!", over: "Fin de la partida", reset: "Nueva partida", modeLocal: "2 jugadores", modeAi: "contra la IA", level1: "Aprendiz", level2: "Experto", level3: "Maestro", thinking: "Tu rival está leyendo el tablero…", youWin: "¡Has ganado!", aiWins: "Gana la IA", draw: "Tablas", record: "Historial" },
};

const AI_PLAYER = 2; // AI plays white; human opens as black
const AI_DELAY_MS = 450;

const Gomoku: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
    const t = i18n[locale] ?? i18n.en;

    const [board, setBoard] = useState<(number | null)[]>(Array(SIZE * SIZE).fill(null));
    const [isBlackTurn, setIsBlackTurn] = useState(true);
    const [winner, setWinner] = useState<number | null>(null); // 1|2 winner, 0 = draw
    const [mode, setMode] = useState<GameMode>('local');
    const [level, setLevel] = useState<AiLevel>(2);
    const [thinking, setThinking] = useState(false);
    const [record, setRecord] = useState<GameRecord | null>(null);
    const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { setRecord(getRecord('gomoku')); }, []);
    useEffect(() => () => { if (aiTimer.current) clearTimeout(aiTimer.current); }, []);

    const checkWinner = (newBoard: (number | null)[], index: number) => {
        const player = newBoard[index];
        if (player === null) return false;

        const x = index % SIZE;
        const y = Math.floor(index / SIZE);

        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (const [dx, dy] of directions) {
            let count = 1;
            // Check one side
            for (let i = 1; i < 5; i++) {
                const nx = x + dx * i, ny = y + dy * i;
                if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && newBoard[ny * SIZE + nx] === player) count++;
                else break;
            }
            // Check other side
            for (let i = 1; i < 5; i++) {
                const nx = x - dx * i, ny = y - dy * i;
                if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && newBoard[ny * SIZE + nx] === player) count++;
                else break;
            }
            if (count >= 5) return true;
        }
        return false;
    };

    const finish = (result: number) => {
        setWinner(result);
        if (mode === 'ai') {
            const outcome = result === 0 ? 'd' : result === AI_PLAYER ? 'l' : 'w';
            setRecord(recordResult('gomoku', outcome));
        }
    };

    const place = (index: number, player: number) => {
        if (board[index] !== null || winner !== null) return;
        const newBoard = [...board];
        newBoard[index] = player;
        setBoard(newBoard);
        if (checkWinner(newBoard, index)) finish(player);
        else if (newBoard.every((c) => c !== null)) finish(0);
        else setIsBlackTurn(player !== 1);
    };

    const handleClick = (index: number) => {
        if (board[index] !== null || winner !== null || thinking) return;
        if (mode === 'ai' && !isBlackTurn) return; // AI's turn — human input locked
        place(index, isBlackTurn ? 1 : 2);
    };

    // AI turn: after the human moves, think briefly then place.
    useEffect(() => {
        if (mode !== 'ai' || winner !== null || isBlackTurn) return;
        setThinking(true);
        aiTimer.current = setTimeout(() => {
            const move = gomokuBestMove(board, AI_PLAYER, level);
            setThinking(false);
            place(move, AI_PLAYER);
        }, AI_DELAY_MS);
        return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, isBlackTurn, winner]);

    const reset = () => {
        if (aiTimer.current) clearTimeout(aiTimer.current);
        setBoard(Array(SIZE * SIZE).fill(null));
        setIsBlackTurn(true);
        setWinner(null);
        setThinking(false);
    };

    const switchMode = (m: GameMode) => {
        if (m === mode) return;
        setMode(m);
        reset();
    };

    const winLabel = winner === 0 ? t.draw
        : mode === 'ai' ? (winner === AI_PLAYER ? t.aiWins : t.youWin)
        : `${winner === 1 ? t.black : t.white} ${t.win}`;

    return (
        <div className="not-prose my-12 p-4 sm:p-8 bg-card border border-border rounded-4xl shadow-sm max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-black text-foreground">{t.title}</h3>
                    <div className="flex items-center gap-2 mt-1" aria-live="polite">
                        <div className={`w-3 h-3 rounded-full ${isBlackTurn ? 'bg-slate-900' : 'bg-slate-200 border border-slate-400'}`} />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            {thinking ? t.thinking : `${isBlackTurn ? t.black : t.white} ${t.turn}`}
                        </span>
                    </div>
                </div>
                <button onClick={reset} className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl text-xs font-bold transition-colors border border-border">
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

            <div className="relative aspect-square w-full bg-[#f3e5ab] rounded-sm p-[2%] shadow-inner border-[6px] border-[#d4c38d]">
                {/* Board Lines */}
                <div className="absolute inset-0 grid grid-cols-14 grid-rows-14 pointer-events-none p-[calc(2%+1.3%)]">
                    {Array.from({ length: 196 }).map((_, i) => (
                        <div key={i} className="border-t border-l border-slate-900/20" />
                    ))}
                </div>

                {/* Stone Layer */}
                <div className={`relative grid grid-cols-15 grid-rows-15 w-full h-full transition-opacity ${thinking ? 'opacity-80' : ''}`}>
                    {board.map((stone, i) => (
                        <button
                            key={i}
                            onClick={() => handleClick(i)}
                            className="relative flex items-center justify-center group"
                        >
                            {/* Hover Ghost */}
                            {stone === null && winner === null && !thinking && (
                                <div className={`absolute w-[80%] h-[80%] rounded-full opacity-0 group-hover:opacity-30 transition-opacity ${isBlackTurn ? 'bg-slate-900' : 'bg-white shadow-sm'}`} />
                            )}
                            {/* Real Stone */}
                            {stone !== null && (
                                <div className={`w-[85%] h-[85%] rounded-full shadow-md transform transition-transform animate-in zoom-in-75 ${
                                    stone === 1
                                        ? 'bg-gradient-to-br from-slate-700 to-slate-900'
                                        : 'bg-gradient-to-br from-white to-slate-200 border border-slate-300'
                                }`} />
                            )}
                        </button>
                    ))}
                </div>

                {winner !== null && (
                    <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                        <div className="bg-card p-8 rounded-3xl shadow-xl border border-border text-center">
                            <h4 className="text-3xl font-black text-foreground mb-2">{winLabel}</h4>
                            <p className="text-muted-foreground mb-6 uppercase tracking-widest font-bold text-xs">{t.over}</p>
                            <button onClick={reset} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">
                                {t.reset}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-center gap-6 text-[10px] text-muted-foreground font-medium uppercase tracking-widest opacity-50">
                <div className="flex items-center gap-1"><span>⚫</span> {t.black}</div>
                <div className="flex items-center gap-1"><span>⚪</span> {t.white}</div>
            </div>
        </div>
    );
};

export default Gomoku;
