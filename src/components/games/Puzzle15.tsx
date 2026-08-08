import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { createSolvedPuzzle15Board, movePuzzle15Tile, shufflePuzzle15 } from '../../lib/games/puzzle15';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import { getBestForConditions, recordBestForConditions, type BestConditions } from '../../lib/games/records';
import { clearPuzzle15Save, loadPuzzle15Save, storePuzzle15Save } from '../../lib/games/active-game-save';
import { elapsedSeconds } from '../../lib/games/time-contracts';

// ─── 15 Puzzle (sliding puzzle) — ported from ahoxy-legacy ────────────────────
// Shuffled by random moves from the solved state, so every board is solvable.

type Board = number[]; // row-major, 0 = empty
type Size = 3 | 4 | 5;

const gameKey = (size: Size) => `puzzle15-${size}`;
const boardSeed = (board: Board) => board.join('-');
const conditionsFor = (size: Size, seed: string): BestConditions => ({ seed, difficulty: `${size}x${size}`, assist: 'none' });

const shuffle = (size: Size, steps: number): Board => shufflePuzzle15(size, steps);

const COPY = {
    ko: { title: '15 퍼즐', subtitle: 'Sliding Puzzle', moves: '이동', time: '시간', best: '최고 기록', win: '퍼즐 완성!', hint: '빈 칸 옆 타일을 누르거나 방향키로 미세요', sizes: { 3: '3×3', 4: '4×4', 5: '5×5' }, sound: '소리' },
    en: { title: '15 Puzzle', subtitle: 'Sliding Puzzle', moves: 'Moves', time: 'Time', best: 'Best', win: 'Puzzle solved!', hint: 'Tap a tile next to the gap, or use arrow keys', sizes: { 3: '3×3', 4: '4×4', 5: '5×5' }, sound: 'Sound' },
    ja: { title: '15パズル', subtitle: 'Sliding Puzzle', moves: '手数', time: '時間', best: 'ベスト', win: 'パズル完成！', hint: '空きマスの隣をタップ、または矢印キー', sizes: { 3: '3×3', 4: '4×4', 5: '5×5' }, sound: '音' },
    zh: { title: '数字华容道', subtitle: 'Sliding Puzzle', moves: '步数', time: '时间', best: '最佳', win: '拼图完成！', hint: '点击空格旁的方块，或用方向键', sizes: { 3: '3×3', 4: '4×4', 5: '5×5' }, sound: '声音' },
    fr: { title: 'Taquin (15 Puzzle)', subtitle: 'Sliding Puzzle', moves: 'Coups', time: 'Temps', best: 'Record', win: 'Puzzle résolu !', hint: 'Touchez une tuile voisine du vide, ou les flèches', sizes: { 3: '3×3', 4: '4×4', 5: '5×5' }, sound: 'Son' },
    es: { title: 'Puzle 15', subtitle: 'Sliding Puzzle', moves: 'Movs', time: 'Tiempo', best: 'Récord', win: '¡Puzle resuelto!', hint: 'Toca una ficha junto al hueco, o usa las flechas', sizes: { 3: '3×3', 4: '4×4', 5: '5×5' }, sound: 'Sonido' },
} as const;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const Puzzle15: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const reducedMotion = usePrefersReducedMotion();
    const hydrationBoard = createSolvedPuzzle15Board(4);
    const [size, setSize] = useState<Size>(4);
    const [board, setBoard] = useState<Board>(hydrationBoard);
    const [puzzleSeed, setPuzzleSeed] = useState(() => boardSeed(hydrationBoard));
    const [moves, setMoves] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [won, setWon] = useState(false);
    const [best, setBest] = useState<Record<string, { moves: number; seconds: number }>>({});
    const [muted, setMuted] = useState(false);
    const started = useRef(false);
    const startedAt = useRef<number | null>(null);
    const audioRef = useRef<AudioContext | null>(null);

    const tone = useCallback((frequency: number, duration = 0.05) => {
        if (muted || typeof window === 'undefined') return;
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
    useEffect(() => () => { void audioRef.current?.close(); }, []);

    useEffect(() => {
        const restored = loadPuzzle15Save();
        const nextBoard = restored?.board ?? shuffle(4, 300);
        setSize(restored?.size ?? 4);
        setBoard(nextBoard);
        setPuzzleSeed(restored?.puzzleSeed ?? boardSeed(nextBoard));
        setMoves(restored?.moves ?? 0);
        setSeconds(restored?.seconds ?? 0);
        started.current = Boolean(restored && restored.moves > 0);
        startedAt.current = restored && restored.moves > 0
            ? performance.now() - restored.seconds * 1000
            : null;
    }, []);

    useEffect(() => {
        const existing = getBestForConditions(gameKey(size), conditionsFor(size, puzzleSeed));
        setBest(existing ? { [size]: { moves: Number(existing.extra) || 0, seconds: existing.value } } : {});
    }, [puzzleSeed, size]);

    useEffect(() => {
        if (won || !started.current) return;
        const id = setInterval(() => setSeconds(elapsedSeconds(startedAt.current, performance.now())), 100);
        return () => clearInterval(id);
    }, [won, moves]); // moves>0 starts the timer via started ref

    useEffect(() => {
        if (won) return;
        storePuzzle15Save({ size, board, puzzleSeed, moves, seconds });
    }, [size, board, puzzleSeed, moves, seconds, won]);

    const restart = useCallback((sz: Size = size) => {
        clearPuzzle15Save();
        const nextBoard = shuffle(sz, sz * sz * 20);
        setSize(sz);
        setBoard(nextBoard);
        setPuzzleSeed(boardSeed(nextBoard));
        setMoves(0);
        setSeconds(0);
        setWon(false);
        started.current = false;
        startedAt.current = null;
    }, [size]);

    const finish = (finalMoves: number) => {
        setWon(true);
        clearPuzzle15Save();
        tone(660, 0.18);
        const saved = recordBestForConditions(gameKey(size), seconds, 'seconds', conditionsFor(size, puzzleSeed), String(finalMoves));
        setBest((prev) => ({ ...prev, [size]: { moves: Number(saved.extra) || finalMoves, seconds: saved.value } }));
    };

    const slide = useCallback((tileIdx: number) => {
        if (won) return;
        const transition = movePuzzle15Tile(board, tileIdx, size);
        if (!transition.moved) return;
        started.current = true;
        if (startedAt.current === null) startedAt.current = performance.now();
        const nextMoves = moves + 1;
        setBoard(transition.board);
        setMoves(nextMoves);
        if (transition.solved) finish(nextMoves);
        else tone(300, 0.04);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [board, moves, size, won, seconds, tone]);

    // arrow keys move the tile INTO the gap (arrow = direction the tile slides)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (won) return;
            const empty = board.indexOf(0);
            const r = Math.floor(empty / size), c = empty % size;
            let target = -1;
            if (e.key === 'ArrowUp' && r < size - 1) target = empty + size;
            else if (e.key === 'ArrowDown' && r > 0) target = empty - size;
            else if (e.key === 'ArrowLeft' && c < size - 1) target = empty + 1;
            else if (e.key === 'ArrowRight' && c > 0) target = empty - 1;
            if (target >= 0) { e.preventDefault(); slide(target); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [board, size, won, slide]);

    const b = best[size];

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={() => restart()}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex gap-1">
                    {([3, 4, 5] as Size[]).map((sz) => (
                        <button key={sz} onClick={() => restart(sz)}
                            aria-pressed={size === sz}
                            className={`min-h-11 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${size === sz ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            {t.sizes[sz]}
                        </button>
                    ))}
                </div>
                <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} className="min-h-11 px-3 rounded-lg border border-border text-[11px] font-bold text-muted-foreground">
                    {muted ? '🔇' : '🔊'} {t.sound}
                </button>
                <div className="ml-auto flex gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>{t.moves} {moves}</span>
                    <span>{t.time} {fmt(seconds)}</span>
                </div>
            </div>

            <div
                className="relative grid gap-1.5 p-2 bg-muted/40 rounded-2xl border border-border mx-auto max-w-sm aspect-square"
                style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
                role="grid" aria-label={t.title}
            >
                {board.map((v, i) => v === 0 ? (
                    <div key="empty" className="rounded-xl bg-muted/40" />
                ) : (
                    <button
                        key={v}
                        onClick={() => slide(i)}
                        aria-label={String(v)}
                        className={`min-h-11 min-w-11 rounded-xl font-black flex items-center justify-center ${!reducedMotion ? 'transition-all active:scale-95' : ''} ${
                            size === 3 ? 'text-2xl' : size === 4 ? 'text-xl' : 'text-base'
                        } ${v === (i + 1) % (size * size)
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'bg-card text-foreground border border-border shadow-sm hover:bg-muted'}`}
                    >
                        {v}
                    </button>
                ))}

                {won && (
                    <div className={`absolute inset-0 z-10 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 ${!reducedMotion ? 'animate-in fade-in zoom-in-95' : ''}`} role="status" aria-live="polite">
                        <p className="text-2xl font-black text-success">🎉 {t.win}</p>
                        <p className="text-sm font-bold text-muted-foreground">{t.moves} {moves} · {t.time} {fmt(seconds)}</p>
                        <button onClick={() => restart()} className="mt-2 min-h-11 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity">
                            ↺
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-4 flex justify-between text-[10px] text-muted-foreground font-medium">
                <span>{t.hint}</span>
                {b && <span className="font-bold">{t.best}: {b.moves} / {fmt(b.seconds)}</span>}
            </div>
        </GameContainer>
    );
};

export default Puzzle15;
