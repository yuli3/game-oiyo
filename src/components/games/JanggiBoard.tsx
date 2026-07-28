import React, { useEffect, useRef, useState } from 'react';
import type { Locale } from '../../lib/i18n';
import {
    janggiApply, janggiBestMove, janggiTargets, isChoPiece,
    type JanggiBoard as Board, type JanggiMove,
} from '../../lib/games/ai/janggi';
import type { AiLevel, GameMode } from '../../lib/games/ai/types';
import { getRecord, recordResult, type GameRecord } from '../../lib/games/records';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';

// ─── Janggi (Korean chess) with real movement rules ──────────────────────────
// Cho (초, blue, lowercase) opens from the top; Han (한, red, uppercase) from
// the bottom. Simplified endgame: capturing the enemy general wins
// (no check/bikjang/repetition rules). In AI mode the human plays Cho.

export const makeInitialBoard = (): Board => [
    ['r', 'n', 'b', 'g', null, 'g', 'b', 'n', 'r'],
    [null, null, null, null, 'k', null, null, null, null],
    [null, 'p', null, null, null, null, null, 'p', null],
    ['s', null, 's', null, 's', null, 's', null, 's'],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    ['S', null, 'S', null, 'S', null, 'S', null, 'S'],
    [null, 'P', null, null, null, null, null, 'P', null],
    [null, null, null, null, 'K', null, null, null, null],
    ['R', 'N', 'B', 'G', null, 'G', 'B', 'N', 'R'],
];

const PIECE_ICONS: Record<string, string> = {
    r: '車', n: '馬', b: '象', p: '包', k: '楚', s: '卒', g: '士',
    R: '車', N: '馬', B: '象', P: '包', K: '漢', S: '兵', G: '士',
};

const AI_IS_CHO = false; // AI plays Han; human opens as Cho
const AI_DELAY_MS = 500;

const i18n: Record<Locale, {
    title: string; turn: string; han: string; cho: string; reset: string;
    win: string; over: string; goal: string;
    modeLocal: string; modeAi: string; level1: string; level2: string; level3: string;
    thinking: string; youWin: string; aiWins: string; record: string;
}> = {
    ko: { title: "한국의 전략: 장기", turn: "차례", han: "한(漢)", cho: "초(楚)", reset: "판 갈기", win: "승리!", over: "대국 종료", goal: "상대 궁(楚/漢)을 잡으면 승리", modeLocal: "2인 대전", modeAi: "AI 대전", level1: "견습생", level2: "숙련가", level3: "명인", thinking: "상대가 수를 읽고 있습니다…", youWin: "당신의 승리!", aiWins: "AI 승리", record: "전적" },
    en: { title: "Korean Chess: Janggi", turn: "Turn", han: "Han", cho: "Cho", reset: "New Match", win: "Wins!", over: "Game Over", goal: "Capture the enemy general to win", modeLocal: "2 Players", modeAi: "vs AI", level1: "Apprentice", level2: "Adept", level3: "Master", thinking: "Your opponent is reading the board…", youWin: "You win!", aiWins: "AI wins", record: "Record" },
    ja: { title: "韓国の戦略: チャンギ", turn: "手番", han: "漢", cho: "楚", reset: "新しい対局", win: "勝利！", over: "対局終了", goal: "相手の宮(楚/漢)を取れば勝ち", modeLocal: "2人対戦", modeAi: "AI対戦", level1: "見習い", level2: "熟練者", level3: "名人", thinking: "相手が盤面を読んでいます…", youWin: "あなたの勝ち！", aiWins: "AIの勝ち", record: "戦績" },
    zh: { title: "韩国象棋：将棋", turn: "回合", han: "汉", cho: "楚", reset: "重新开局", win: "获胜！", over: "对局结束", goal: "吃掉对方主将即获胜", modeLocal: "双人对战", modeAi: "人机对战", level1: "学徒", level2: "行家", level3: "大师", thinking: "对手正在读盘…", youWin: "你赢了！", aiWins: "AI 获胜", record: "战绩" },
    fr: { title: "Échecs coréens : Janggi", turn: "Tour", han: "Han", cho: "Cho", reset: "Nouvelle partie", win: "gagne !", over: "Partie terminée", goal: "Capturez le général adverse pour gagner", modeLocal: "2 joueurs", modeAi: "contre l'IA", level1: "Apprenti", level2: "Adepte", level3: "Maître", thinking: "Votre adversaire lit le plateau…", youWin: "Vous gagnez !", aiWins: "L'IA gagne", record: "Bilan" },
    es: { title: "Ajedrez coreano: Janggi", turn: "Turno", han: "Han", cho: "Cho", reset: "Nueva partida", win: "¡gana!", over: "Fin de la partida", goal: "Captura al general enemigo para ganar", modeLocal: "2 jugadores", modeAi: "contra la IA", level1: "Aprendiz", level2: "Experto", level3: "Maestro", thinking: "Tu rival está leyendo el tablero…", youWin: "¡Has ganado!", aiWins: "Gana la IA", record: "Historial" },
};

const JanggiBoard: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
    const t = i18n[locale] ?? i18n.en;
    const reducedMotion = usePrefersReducedMotion();

    const [board, setBoard] = useState<Board>(makeInitialBoard);
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [isChoTurn, setIsChoTurn] = useState(true); // Cho moves first
    const [winner, setWinner] = useState<'cho' | 'han' | null>(null);
    const [mode, setMode] = useState<GameMode>('local');
    const [level, setLevel] = useState<AiLevel>(2);
    const [thinking, setThinking] = useState(false);
    const [record, setRecord] = useState<GameRecord | null>(null);
    const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { setRecord(getRecord('janggi')); }, []);
    useEffect(() => () => { if (aiTimer.current) clearTimeout(aiTimer.current); }, []);

    const targets = selected ? janggiTargets(board, selected[0], selected[1]) : [];

    const reset = () => {
        if (aiTimer.current) clearTimeout(aiTimer.current);
        setBoard(makeInitialBoard());
        setSelected(null);
        setIsChoTurn(true);
        setWinner(null);
        setThinking(false);
    };

    const finish = (win: 'cho' | 'han') => {
        setWinner(win);
        if (mode === 'ai') {
            const aiWon = (win === 'cho') === AI_IS_CHO;
            setRecord(recordResult('janggi', aiWon ? 'l' : 'w'));
        }
    };

    const applyMove = (current: Board, m: JanggiMove, moverIsCho: boolean) => {
        const captured = current[m.to[0]][m.to[1]];
        setBoard(janggiApply(current, m));
        setSelected(null);
        if (captured && captured.toLowerCase() === 'k') finish(moverIsCho ? 'cho' : 'han');
        else setIsChoTurn(!moverIsCho);
    };

    const handleSquareClick = (r: number, c: number) => {
        if (winner || thinking) return;
        if (mode === 'ai' && isChoTurn === AI_IS_CHO) return; // AI's turn
        const piece = board[r][c];

        if (selected) {
            const [sr, sc] = selected;
            if (sr === r && sc === c) { setSelected(null); return; }
            if (targets.some(([tr, tc]) => tr === r && tc === c)) {
                applyMove(board, { from: [sr, sc], to: [r, c] }, isChoTurn);
                return;
            }
            // reselect own piece, otherwise deselect
            if (piece && isChoPiece(piece) === isChoTurn) setSelected([r, c]);
            else setSelected(null);
        } else if (piece && isChoPiece(piece) === isChoTurn) {
            setSelected([r, c]);
        }
    };

    // AI turn: after the human moves, think briefly then place.
    useEffect(() => {
        if (mode !== 'ai' || winner || isChoTurn !== AI_IS_CHO) return;
        setThinking(true);
        aiTimer.current = setTimeout(() => {
            const move = janggiBestMove(board, AI_IS_CHO, level);
            setThinking(false);
            if (move) applyMove(board, move, AI_IS_CHO);
            else setIsChoTurn(!AI_IS_CHO); // no legal move — pass (extremely rare)
        }, AI_DELAY_MS);
        return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, isChoTurn, winner]);

    const switchMode = (m: GameMode) => {
        if (m === mode) return;
        setMode(m);
        reset();
    };

    const winLabel = winner
        ? mode === 'ai'
            ? ((winner === 'cho') === AI_IS_CHO ? t.aiWins : t.youWin)
            : `${winner === 'cho' ? t.cho : t.han} ${t.win}`
        : null;

    return (
        <div className="not-prose my-12 p-4 sm:p-8 bg-[#e8dcc4] border-8 border-[#c4a484] rounded-xl shadow-xl max-w-lg mx-auto overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-black text-stone-800">{t.title}</h3>
                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isChoTurn ? 'text-blue-600' : 'text-red-600'}`} aria-live="polite">
                        {thinking ? t.thinking : `${isChoTurn ? t.cho : t.han} ${t.turn}`}
                    </p>
                </div>
                <button onClick={reset} className="px-4 py-2 bg-stone-800 text-[#e8dcc4] rounded-lg font-bold text-xs uppercase hover:opacity-90 transition-opacity">
                    {t.reset}
                </button>
            </div>

            {/* Mode + difficulty */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-stone-800/30 overflow-hidden" role="group" aria-label={`${t.modeLocal} / ${t.modeAi}`}>
                    {(['local', 'ai'] as GameMode[]).map((m) => (
                        <button key={m} onClick={() => switchMode(m)}
                            aria-pressed={mode === m}
                            className={`px-3 py-1.5 text-xs font-bold transition-colors ${mode === m ? 'bg-stone-800 text-[#e8dcc4]' : 'bg-[#f4ebd0] text-stone-600 hover:bg-[#e8dcc4]'}`}>
                            {m === 'local' ? t.modeLocal : t.modeAi}
                        </button>
                    ))}
                </div>
                {mode === 'ai' && (
                    <div className="inline-flex gap-1">
                        {([1, 2, 3] as AiLevel[]).map((lv) => (
                            <button key={lv} onClick={() => { setLevel(lv); reset(); }}
                                aria-pressed={level === lv}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${level === lv ? 'border-stone-800 text-stone-800 bg-stone-800/10' : 'border-stone-800/30 text-stone-500 hover:bg-[#f4ebd0]'}`}>
                                {lv === 1 ? t.level1 : lv === 2 ? t.level2 : t.level3}
                            </button>
                        ))}
                    </div>
                )}
                {mode === 'ai' && record && (record.w + record.l + record.d > 0) && (
                    <span className="ml-auto text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                        {t.record} {record.w}–{record.l}{record.d ? `–${record.d}` : ''}
                    </span>
                )}
            </div>

            <div className="relative aspect-[9/10] w-full border-2 border-stone-800 bg-[#f4ebd0]">
                {/* Board Lines (Grid) */}
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-9 pointer-events-none p-[5.5%]">
                    {Array.from({ length: 72 }).map((_, i) => (
                        <div key={i} className="border-r border-b border-stone-800/40" />
                    ))}
                    {/* Palace Lines Simplified */}
                    <div className="absolute top-[5%] left-[38.9%] w-[22.2%] h-[20%] border-2 border-stone-800/20" />
                    <div className="absolute bottom-[5%] left-[38.9%] w-[22.2%] h-[20%] border-2 border-stone-800/20" />
                </div>

                {/* Pieces */}
                <div className={`relative grid grid-cols-9 grid-rows-10 w-full h-full ${!reducedMotion ? 'transition-opacity' : ''} ${thinking ? 'opacity-80' : ''}`}>
                    {board.map((row, r) => row.map((piece, c) => {
                        const isSelected = selected?.[0] === r && selected?.[1] === c;
                        const isTarget = targets.some(([tr, tc]) => tr === r && tc === c);
                        return (
                            <button
                                key={`${r}-${c}`}
                                onClick={() => handleSquareClick(r, c)}
                                aria-label={piece ? PIECE_ICONS[piece] : `${r},${c}`}
                                className="relative flex items-center justify-center cursor-pointer p-0.5 sm:p-1"
                            >
                                {isTarget && (
                                    piece
                                        ? <div className="absolute inset-0.5 rounded-full ring-2 ring-primary/70 z-10 pointer-events-none" />
                                        : <div className="absolute w-1/3 h-1/3 rounded-full bg-primary/40 z-10 pointer-events-none" />
                                )}
                                {piece && (
                                    <div className={`w-full aspect-square flex items-center justify-center rounded-full border-2 font-black text-xs sm:text-lg ${!reducedMotion ? 'transition-transform' : ''} ${
                                        isSelected ? `${!reducedMotion ? 'scale-110 ' : ''}ring-2 ring-primary bg-yellow-100 z-10` : 'bg-[#e8dcc4]'
                                    } ${isChoPiece(piece) ? 'text-blue-700 border-blue-700' : 'text-red-700 border-red-700'}`}>
                                        {PIECE_ICONS[piece]}
                                    </div>
                                )}
                            </button>
                        );
                    }))}
                </div>

                {winner && (
                    <div className={`absolute inset-0 z-20 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center ${!reducedMotion ? 'animate-in fade-in zoom-in-95' : ''}`} role="status" aria-live="polite">
                        <div className="bg-card p-8 rounded-3xl shadow-xl border border-border text-center">
                            <h4 className="text-3xl font-black text-foreground mb-2">{winLabel}</h4>
                            <p className="text-muted-foreground mb-6 uppercase tracking-widest font-bold text-xs">{t.over}</p>
                            <button onClick={reset} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity">
                                {t.reset}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
                <div className="flex justify-center gap-8 text-[10px] font-black text-stone-600 uppercase tracking-widest">
                    <div className="flex items-center gap-2"><span className="text-blue-600">{t.cho}</span> Blue</div>
                    <div className="flex items-center gap-2"><span className="text-red-600">{t.han}</span> Red</div>
                </div>
                <p className="text-[10px] text-stone-500 font-medium">{t.goal}</p>
            </div>
        </div>
    );
};

export default JanggiBoard;
