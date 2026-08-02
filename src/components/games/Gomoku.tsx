import React, { useEffect, useRef, useState } from 'react';
import type { Locale } from '../../lib/i18n';
import { gomokuBestMove } from '../../lib/games/ai/gomoku';
import type { AiLevel, GameMode } from '../../lib/games/ai/types';
import { getRecord, recordResult, type GameRecord } from '../../lib/games/records';
import {
    clearGomokuSaveV2,
    loadGomokuSaveV2,
    storeGomokuSaveV2,
} from '../../lib/games/gomoku-save';
import { createGomokuBoard, GOMOKU_SIZE, placeGomokuStone, type GomokuCell, type GomokuPlayer } from '../../lib/games/gomoku';

const SIZE = GOMOKU_SIZE;

const i18n: Record<Locale, {
    title: string; turn: string; black: string; white: string; win: string; over: string; reset: string;
    modeLocal: string; modeAi: string; level1: string; level2: string; level3: string;
    thinking: string; youWin: string; aiWins: string; draw: string; record: string;
    boardLabel: string; empty: string; stone: string; lastMove: string;
}> = {
    ko: { title: "오목 (Gomoku)", turn: "차례", black: "흑", white: "백", win: "승리!", over: "게임 종료", reset: "판 갈기", modeLocal: "2인 대전", modeAi: "AI 대전", level1: "견습생", level2: "숙련가", level3: "명인", thinking: "상대가 수를 읽고 있습니다…", youWin: "당신의 승리!", aiWins: "AI 승리", draw: "무승부", record: "전적", boardLabel: "오목판. 화살표 키로 이동하고 Enter 또는 Space로 돌을 놓으세요.", empty: "빈 교차점", stone: "돌", lastMove: "마지막 수" },
    en: { title: "Gomoku", turn: "Turn", black: "Black", white: "White", win: "Wins!", over: "Game Over", reset: "New Match", modeLocal: "2 Players", modeAi: "vs AI", level1: "Apprentice", level2: "Adept", level3: "Master", thinking: "Your opponent is reading the board…", youWin: "You win!", aiWins: "AI wins", draw: "Draw", record: "Record", boardLabel: "Gomoku board. Use arrow keys to move and Enter or Space to place a stone.", empty: "Empty intersection", stone: "stone", lastMove: "last move" },
    ja: { title: "五目並べ", turn: "手番", black: "黒", white: "白", win: "勝利！", over: "ゲーム終了", reset: "新しい対局", modeLocal: "2人対戦", modeAi: "AI対戦", level1: "見習い", level2: "熟練者", level3: "名人", thinking: "相手が盤面を読んでいます…", youWin: "あなたの勝ち！", aiWins: "AIの勝ち", draw: "引き分け", record: "戦績", boardLabel: "五目並べ盤。矢印キーで移動し、EnterまたはSpaceで石を置きます。", empty: "空き交点", stone: "石", lastMove: "最後の手" },
    zh: { title: "五子棋", turn: "回合", black: "黑", white: "白", win: "获胜！", over: "游戏结束", reset: "重新开局", modeLocal: "双人对战", modeAi: "人机对战", level1: "学徒", level2: "行家", level3: "大师", thinking: "对手正在读盘…", youWin: "你赢了！", aiWins: "AI 获胜", draw: "平局", record: "战绩", boardLabel: "五子棋棋盘。使用方向键移动，按 Enter 或空格落子。", empty: "空交叉点", stone: "棋子", lastMove: "最后一手" },
    fr: { title: "Gomoku", turn: "Tour", black: "Noir", white: "Blanc", win: "gagne !", over: "Partie terminée", reset: "Nouvelle partie", modeLocal: "2 joueurs", modeAi: "contre l'IA", level1: "Apprenti", level2: "Adepte", level3: "Maître", thinking: "Votre adversaire lit le plateau…", youWin: "Vous gagnez !", aiWins: "L'IA gagne", draw: "Match nul", record: "Bilan", boardLabel: "Plateau de Gomoku. Utilisez les flèches puis Entrée ou Espace pour poser une pierre.", empty: "Intersection vide", stone: "pierre", lastMove: "dernier coup" },
    es: { title: "Gomoku", turn: "Turno", black: "Negras", white: "Blancas", win: "¡gana!", over: "Fin de la partida", reset: "Nueva partida", modeLocal: "2 jugadores", modeAi: "contra la IA", level1: "Aprendiz", level2: "Experto", level3: "Maestro", thinking: "Tu rival está leyendo el tablero…", youWin: "¡Has ganado!", aiWins: "Gana la IA", draw: "Tablas", record: "Historial", boardLabel: "Tablero de Gomoku. Usa las flechas y Enter o Espacio para colocar una piedra.", empty: "Intersección vacía", stone: "piedra", lastMove: "último movimiento" },
};

const extra: Record<Locale, { pause: string; resume: string; restored: string; paused: string; sound: string; moves: string; nextGoal: string; overview: string }> = {
    ko: { pause: '일시정지', resume: '계속', restored: '저장된 대국 복원', paused: '대국 일시정지', sound: '소리', moves: '수', nextGoal: '다음 목표: 세 개를 양쪽이 열린 채로 만들어 보세요', overview: '전체판 보기' },
    en: { pause: 'Pause', resume: 'Resume', restored: 'Saved match restored', paused: 'Match paused', sound: 'Sound', moves: 'moves', nextGoal: 'Next goal: open a three on both ends', overview: 'Full board' },
    ja: { pause: '一時停止', resume: '再開', restored: '保存した対局を復元', paused: '対局を一時停止', sound: '音', moves: '手', nextGoal: '次の目標: 両端が開いた三を作りましょう', overview: '全体盤' },
    zh: { pause: '暂停', resume: '继续', restored: '已恢复保存的对局', paused: '对局已暂停', sound: '声音', moves: '步', nextGoal: '下个目标：做出两端都开放的活三', overview: '整体棋盘' },
    fr: { pause: 'Pause', resume: 'Reprendre', restored: 'Partie restaurée', paused: 'Partie en pause', sound: 'Son', moves: 'coups', nextGoal: 'Prochain objectif : ouvrez un alignement de trois des deux côtés', overview: 'Vue d’ensemble' },
    es: { pause: 'Pausa', resume: 'Continuar', restored: 'Partida restaurada', paused: 'Partida en pausa', sound: 'Sonido', moves: 'jugadas', nextGoal: 'Siguiente objetivo: abre una fila de tres por ambos lados', overview: 'Tablero completo' },
};

const AI_PLAYER = 2; // AI plays white; human opens as black
const AI_DELAY_MS = 450;
// A fixed, generously-sized cell (matching Connect Four's dense-board precedent)
// beats shrinking 15 columns to fit any viewport: at ~21px a tap becomes
// unreliable. The always-visible overview above gives full-board context, so
// the interactive board below can stay scrollable without losing the player's
// place.
const CELL = 36;
const BOARD_PX = SIZE * CELL;

const Gomoku: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
    const t = i18n[locale] ?? i18n.en;
    const x = extra[locale] ?? extra.en;

    const [board, setBoard] = useState<GomokuCell[]>(createGomokuBoard);
    const [isBlackTurn, setIsBlackTurn] = useState(true);
    const [winner, setWinner] = useState<number | null>(null); // 1|2 winner, 0 = draw
    const [mode, setMode] = useState<GameMode>('local');
    const [level, setLevel] = useState<AiLevel>(2);
    const [thinking, setThinking] = useState(false);
    const [paused, setPaused] = useState(false);
    const [restored, setRestored] = useState(false);
    const [muted, setMuted] = useState(false);
    const [record, setRecord] = useState<GameRecord | null>(null);
    const [focusIndex, setFocusIndex] = useState(112);
    const [lastMove, setLastMove] = useState<number | null>(null);
    const [moveCount, setMoveCount] = useState(0);
    const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const startedAtRef = useRef<number>(Date.now());
    const audio = useRef<AudioContext | null>(null);

    const tone = (frequency: number, duration = 0.05) => {
        if (muted || typeof window === 'undefined') return;
        const context = audio.current ?? new AudioContext();
        audio.current = context;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.05, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
    };

    useEffect(() => {
        setRecord(getRecord('gomoku'));
        const restoredSave = loadGomokuSaveV2();
        if (restoredSave) {
            setBoard(restoredSave.board);
            setIsBlackTurn(restoredSave.isBlackTurn);
            setMode(restoredSave.mode);
            setLevel(restoredSave.level);
            setLastMove(restoredSave.lastMove);
            setMoveCount(restoredSave.board.filter((cell) => cell !== null).length);
            startedAtRef.current = restoredSave.startedAtEpochMs;
            setPaused(true);
            setRestored(true);
        }
    }, []);
    useEffect(() => {
        if (board.some((cell) => cell !== null) && winner === null) {
            storeGomokuSaveV2({
                board: board as (1 | 2 | null)[],
                isBlackTurn,
                mode,
                level,
                lastMove,
                startedAtEpochMs: startedAtRef.current,
                savedAtEpochMs: Date.now(),
            });
        } else if (winner !== null) {
            clearGomokuSaveV2();
        }
    }, [board, isBlackTurn, mode, level, winner, lastMove]);
    useEffect(() => () => { if (aiTimer.current) clearTimeout(aiTimer.current); void audio.current?.close(); }, []);
    useEffect(() => {
        const onHidden = () => {
            if (document.hidden) {
                setPaused(true);
                if (aiTimer.current) clearTimeout(aiTimer.current);
                setThinking(false);
            }
        };
        document.addEventListener('visibilitychange', onHidden);
        return () => document.removeEventListener('visibilitychange', onHidden);
    }, []);

    const finish = (result: number) => {
        clearGomokuSaveV2();
        setWinner(result);
        tone(result === 0 ? 220 : 660, result === 0 ? 0.08 : 0.18);
        if (mode === 'ai') {
            const outcome = result === 0 ? 'd' : result === AI_PLAYER ? 'l' : 'w';
            setRecord(recordResult('gomoku', outcome));
        }
    };

    const place = (index: number, player: GomokuPlayer) => {
        if (board[index] !== null || winner !== null) return;
        const move = placeGomokuStone(board, index, player);
        if (!move) return;
        if (!board.some((cell) => cell !== null)) startedAtRef.current = Date.now();
        setBoard(move.board);
        setLastMove(index);
        setMoveCount((count) => count + 1);
        tone(move.result !== null && move.result !== 0 ? 660 : 300, 0.05);
        if (move.result !== null) finish(move.result);
        else setIsBlackTurn(move.nextPlayer === 1);
    };

    const handleClick = (index: number) => {
        if (paused || board[index] !== null || winner !== null || thinking) return;
        if (mode === 'ai' && !isBlackTurn) return; // AI's turn — human input locked
        place(index, isBlackTurn ? 1 : 2);
    };

    // AI turn: after the human moves, think briefly then place.
    useEffect(() => {
        if (mode !== 'ai' || winner !== null || isBlackTurn || paused) return;
        setThinking(true);
        aiTimer.current = setTimeout(() => {
            const move = gomokuBestMove(board, AI_PLAYER, level);
            setThinking(false);
            place(move, AI_PLAYER);
        }, AI_DELAY_MS);
        return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, isBlackTurn, winner, paused]);

    const reset = () => {
        if (aiTimer.current) clearTimeout(aiTimer.current);
        setBoard(createGomokuBoard());
        setIsBlackTurn(true);
        setWinner(null);
        setThinking(false);
        setPaused(false);
        setRestored(false);
        setFocusIndex(112);
        setLastMove(null);
        setMoveCount(0);
        startedAtRef.current = Date.now();
        clearGomokuSaveV2();
    };

    const moveBoardFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        const row = Math.floor(index / SIZE), col = index % SIZE;
        let next = index;
        if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * SIZE + col;
        else if (event.key === 'ArrowDown') next = Math.min(SIZE - 1, row + 1) * SIZE + col;
        else if (event.key === 'ArrowLeft') next = row * SIZE + Math.max(0, col - 1);
        else if (event.key === 'ArrowRight') next = row * SIZE + Math.min(SIZE - 1, col + 1);
        else if (event.key === 'Home') next = event.ctrlKey ? 0 : row * SIZE;
        else if (event.key === 'End') next = event.ctrlKey ? SIZE * SIZE - 1 : row * SIZE + SIZE - 1;
        else return;
        event.preventDefault();
        setFocusIndex(next);
        cellRefs.current[next]?.focus();
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
                <button type="button" onClick={reset} className="min-h-11 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl text-xs font-bold transition-colors motion-reduce:transition-none border border-border">
                    {t.reset}
                </button>
            </div>

            {/* Mode + difficulty */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-border overflow-hidden" role="group" aria-label={`${t.modeLocal} / ${t.modeAi}`}>
                    {(['local', 'ai'] as GameMode[]).map((m) => (
                        <button type="button" key={m} onClick={() => switchMode(m)}
                            aria-pressed={mode === m}
                            className={`min-h-11 px-3 py-1.5 text-xs font-bold transition-colors motion-reduce:transition-none ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                            {m === 'local' ? t.modeLocal : t.modeAi}
                        </button>
                    ))}
                </div>
                {mode === 'ai' && (
                    <div className="inline-flex gap-1">
                        {([1, 2, 3] as AiLevel[]).map((lv) => (
                            <button type="button" key={lv} onClick={() => { setLevel(lv); reset(); }}
                                aria-pressed={level === lv}
                                className={`min-h-11 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors motion-reduce:transition-none ${level === lv ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                                {lv === 1 ? t.level1 : lv === 2 ? t.level2 : t.level3}
                            </button>
                        ))}
                    </div>
                )}
                {moveCount > 0 && winner === null && (
                    <button type="button" onClick={() => setPaused((value) => !value)} className="min-h-11 px-3 rounded-lg border border-border text-xs font-bold text-muted-foreground">
                        {paused ? `▶ ${x.resume}` : `Ⅱ ${x.pause}`}
                    </button>
                )}
                <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} className="min-h-11 px-3 rounded-lg border border-border text-xs font-bold text-muted-foreground">
                    {muted ? '🔇' : '🔊'} {x.sound}
                </button>
                {mode === 'ai' && record && (record.w + record.l + record.d > 0) && (
                    <span className="ml-auto text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {t.record} {record.w}–{record.l}{record.d ? `–${record.d}` : ''}
                    </span>
                )}
            </div>

            {(paused || restored) && (
                <div className="mb-3 rounded-xl border border-border bg-muted/40 p-3 text-center text-xs font-bold text-muted-foreground" role="status">
                    {restored ? `${x.restored} · ` : ''}{x.paused}
                </div>
            )}

            {/* Always-visible full-board overview: color-independent shapes so the whole
                tactical picture stays legible even when the interactive board below is
                scrolled to a corner. */}
            <div className="mb-3 flex justify-center" aria-hidden="true">
                <div className="grid gap-px bg-[#d4c38d]/60 p-1 rounded-lg" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, width: 180, height: 180 }}>
                    {board.map((stone, i) => (
                        <div key={i} className={`relative flex items-center justify-center bg-[#f3e5ab] ${i === lastMove ? 'ring-1 ring-primary z-10' : ''}`}>
                            {stone === 1 && <div className="w-[70%] h-[70%] rounded-full bg-slate-900" />}
                            {stone === 2 && <div className="w-[70%] h-[70%] rounded-full border-2 border-slate-600 bg-white" />}
                        </div>
                    ))}
                </div>
            </div>
            <p className="mb-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{x.overview}</p>

            <div className="overflow-x-auto pb-2">
            <div className="relative bg-[#f3e5ab] rounded-sm shadow-inner border-[6px] border-[#d4c38d]" style={{ width: BOARD_PX + 16, height: BOARD_PX + 16, padding: 8 }}>
                {/* Board Lines */}
                <div className="absolute inset-2 grid grid-cols-14 grid-rows-14 pointer-events-none">
                    {Array.from({ length: 196 }).map((_, i) => (
                        <div key={i} className="border-t border-l border-slate-900/20" />
                    ))}
                </div>

                {/* Stone Layer */}
                <div
                    className={`relative grid transition-opacity motion-reduce:transition-none ${thinking || paused ? 'opacity-70' : ''}`}
                    style={{ gridTemplateColumns: `repeat(${SIZE}, ${CELL}px)`, gridTemplateRows: `repeat(${SIZE}, ${CELL}px)`, width: BOARD_PX, height: BOARD_PX }}
                    role="grid" aria-label={t.boardLabel}
                >
                    {board.map((stone, i) => (
                        <button
                            type="button"
                            key={i}
                            ref={(node) => { cellRefs.current[i] = node; }}
                            onClick={() => handleClick(i)}
                            onFocus={() => setFocusIndex(i)}
                            onKeyDown={(event) => moveBoardFocus(event, i)}
                            tabIndex={focusIndex === i ? 0 : -1}
                            role="gridcell"
                            aria-label={`${String.fromCharCode(65 + (i % SIZE))}${Math.floor(i / SIZE) + 1}, ${stone === null ? t.empty : `${stone === 1 ? t.black : t.white} ${t.stone}`}${i === lastMove ? `, ${t.lastMove}` : ''}`}
                            className="relative flex items-center justify-center group focus-visible:z-20 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-sky-600"
                        >
                            {/* Hover Ghost */}
                            {stone === null && winner === null && !thinking && !paused && (
                                <div className={`absolute w-[80%] h-[80%] rounded-full opacity-0 group-hover:opacity-30 transition-opacity motion-reduce:transition-none ${isBlackTurn ? 'bg-slate-900' : 'bg-white shadow-sm'}`} />
                            )}
                            {/* Real Stone */}
                            {stone !== null && (
                                <div className={`relative w-[85%] h-[85%] rounded-full shadow-md transform transition-transform animate-in zoom-in-75 motion-reduce:transform-none motion-reduce:transition-none motion-reduce:animate-none ${
                                    stone === 1
                                        ? 'bg-gradient-to-br from-slate-700 to-slate-900'
                                        : 'bg-gradient-to-br from-white to-slate-200 border border-slate-300'
                                }`}>
                                    {i === lastMove && <div className="absolute inset-[-3px] rounded-full ring-2 ring-primary" />}
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {winner !== null && (
                    <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in-95 motion-reduce:animate-none" role="status" aria-live="assertive">
                        <div className="bg-card p-8 rounded-3xl shadow-xl border border-border text-center">
                            <h4 className="text-3xl font-black text-foreground mb-2">{winLabel}</h4>
                            <p className="text-muted-foreground mb-2 uppercase tracking-widest font-bold text-xs">{t.over}</p>
                            <p className="text-sm text-muted-foreground mb-1">{moveCount} {x.moves}</p>
                            {winner !== 0 && <p className="text-[11px] text-muted-foreground mb-6 max-w-xs">{x.nextGoal}</p>}
                            <button type="button" onClick={reset} className="min-h-11 px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                                {t.reset}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            </div>

            <div className="mt-6 flex justify-center gap-6 text-[10px] text-muted-foreground font-medium uppercase tracking-widest opacity-50">
                <div className="flex items-center gap-1"><span>⚫</span> {t.black}</div>
                <div className="flex items-center gap-1"><span>⚪</span> {t.white}</div>
            </div>
        </div>
    );
};

export default Gomoku;
