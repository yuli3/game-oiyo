import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { getBestForConditions, recordBestForConditions, type BestConditions } from '../../lib/games/records';

// ─── 15 Puzzle (sliding puzzle) — ported from ahoxy-legacy ────────────────────
// Shuffled by random moves from the solved state, so every board is solvable.

type Board = number[]; // row-major, 0 = empty
type Size = 3 | 4 | 5;

const gameKey = (size: Size) => `puzzle15-${size}`;
const boardSeed = (board: Board) => board.join('-');
const conditionsFor = (size: Size, seed: string): BestConditions => ({ seed, difficulty: `${size}x${size}`, assist: 'none' });

const solved = (size: Size): Board => Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size));

function shuffle(size: Size, steps: number): Board {
    const b = solved(size);
    let empty = b.indexOf(0);
    let prev = -1;
    for (let i = 0; i < steps; i++) {
        const r = Math.floor(empty / size), c = empty % size;
        const nbrs: number[] = [];
        if (r > 0) nbrs.push(empty - size);
        if (r < size - 1) nbrs.push(empty + size);
        if (c > 0) nbrs.push(empty - 1);
        if (c < size - 1) nbrs.push(empty + 1);
        const pick = nbrs.filter((n) => n !== prev)[Math.floor(Math.random() * nbrs.filter((n) => n !== prev).length)];
        b[empty] = b[pick];
        b[pick] = 0;
        prev = empty;
        empty = pick;
    }
    return b;
}

const isSolved = (b: Board) => b.every((v, i) => v === (i + 1) % b.length);

const COPY = {
    ko: { title: '15 퍼즐', subtitle: 'Sliding Puzzle', moves: '이동', time: '시간', best: '최고 기록', win: '퍼즐 완성!', hint: '빈 칸 옆 타일을 누르거나 방향키로 미세요', sizes: { 3: '3×3', 4: '4×4', 5: '5×5' } },
    en: { title: '15 Puzzle', subtitle: 'Sliding Puzzle', moves: 'Moves', time: 'Time', best: 'Best', win: 'Puzzle solved!', hint: 'Tap a tile next to the gap, or use arrow keys', sizes: { 3: '3×3', 4: '4×4', 5: '5×5' } },
    ja: { title: '15パズル', subtitle: 'Sliding Puzzle', moves: '手数', time: '時間', best: 'ベスト', win: 'パズル完成！', hint: '空きマスの隣をタップ、または矢印キー', sizes: { 3: '3×3', 4: '4×4', 5: '5×5' } },
    zh: { title: '数字华容道', subtitle: 'Sliding Puzzle', moves: '步数', time: '时间', best: '最佳', win: '拼图完成！', hint: '点击空格旁的方块，或用方向键', sizes: { 3: '3×3', 4: '4×4', 5: '5×5' } },
    fr: { title: 'Taquin (15 Puzzle)', subtitle: 'Sliding Puzzle', moves: 'Coups', time: 'Temps', best: 'Record', win: 'Puzzle résolu !', hint: 'Touchez une tuile voisine du vide, ou les flèches', sizes: { 3: '3×3', 4: '4×4', 5: '5×5' } },
    es: { title: 'Puzle 15', subtitle: 'Sliding Puzzle', moves: 'Movs', time: 'Tiempo', best: 'Récord', win: '¡Puzle resuelto!', hint: 'Toca una ficha junto al hueco, o usa las flechas', sizes: { 3: '3×3', 4: '4×4', 5: '5×5' } },
} as const;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const Puzzle15: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const initialBoard = useRef<Board | null>(null);
    if (!initialBoard.current) initialBoard.current = shuffle(4, 300);

    const [size, setSize] = useState<Size>(4);
    const [board, setBoard] = useState<Board>(() => initialBoard.current!);
    const [puzzleSeed, setPuzzleSeed] = useState(() => boardSeed(initialBoard.current!));
    const [moves, setMoves] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [won, setWon] = useState(false);
    const [best, setBest] = useState<Record<string, { moves: number; seconds: number }>>({});
    const started = useRef(false);

    useEffect(() => {
        const existing = getBestForConditions(gameKey(size), conditionsFor(size, puzzleSeed));
        setBest(existing ? { [size]: { moves: Number(existing.extra) || 0, seconds: existing.value } } : {});
    }, [puzzleSeed, size]);

    useEffect(() => {
        if (won || !started.current) return;
        const id = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [won, moves]); // moves>0 starts the timer via started ref

    const restart = useCallback((sz: Size = size) => {
        const nextBoard = shuffle(sz, sz * sz * 20);
        setSize(sz);
        setBoard(nextBoard);
        setPuzzleSeed(boardSeed(nextBoard));
        setMoves(0);
        setSeconds(0);
        setWon(false);
        started.current = false;
    }, [size]);

    const finish = (finalMoves: number) => {
        setWon(true);
        const saved = recordBestForConditions(gameKey(size), seconds, 'seconds', conditionsFor(size, puzzleSeed), String(finalMoves));
        setBest((prev) => ({ ...prev, [size]: { moves: Number(saved.extra) || finalMoves, seconds: saved.value } }));
    };

    const slide = useCallback((tileIdx: number) => {
        if (won) return;
        setBoard((b) => {
            const empty = b.indexOf(0);
            const [tr, tc] = [Math.floor(tileIdx / size), tileIdx % size];
            const [er, ec] = [Math.floor(empty / size), empty % size];
            if (Math.abs(tr - er) + Math.abs(tc - ec) !== 1) return b;
            const next = [...b];
            next[empty] = next[tileIdx];
            next[tileIdx] = 0;
            started.current = true;
            setMoves((m) => {
                const nm = m + 1;
                if (isSolved(next)) finish(nm);
                return nm;
            });
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [size, won, seconds]);

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
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${size === sz ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            {t.sizes[sz]}
                        </button>
                    ))}
                </div>
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
                        className={`rounded-xl font-black flex items-center justify-center transition-all active:scale-95 ${
                            size === 3 ? 'text-2xl' : size === 4 ? 'text-xl' : 'text-base'
                        } ${v === (i + 1) % (size * size)
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'bg-card text-foreground border border-border shadow-sm hover:bg-muted'}`}
                    >
                        {v}
                    </button>
                ))}

                {won && (
                    <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in-95" role="status" aria-live="polite">
                        <p className="text-2xl font-black text-success">🎉 {t.win}</p>
                        <p className="text-sm font-bold text-muted-foreground">{t.moves} {moves} · {t.time} {fmt(seconds)}</p>
                        <button onClick={() => restart()} className="mt-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity">
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
