import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import { elapsedSeconds } from '../../lib/games/time-contracts';

// ─── Maze — recursive-backtracker generator, ported from ahoxy-legacy ────────
// 0 = path, 1 = wall. Odd dimensions; start (0,0) → exit (rows-1, cols-1).

type Difficulty = 'easy' | 'medium' | 'hard';
const SIZES: Record<Difficulty, number> = { easy: 11, medium: 15, hard: 21 };
const BEST_KEY = 'oiyo-maze-best'; // {"easy": seconds, ...}

export function generateMaze(rows: number, cols: number): number[][] {
    const maze: number[][] = Array.from({ length: rows }, () => Array(cols).fill(1));
    const stack: [number, number][] = [[0, 0]];
    maze[0][0] = 0;

    while (stack.length > 0) {
        const [r, c] = stack[stack.length - 1];
        const nbrs: [number, number][] = [];
        for (const [dr, dc] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && maze[nr][nc] === 1) nbrs.push([nr, nc]);
        }
        if (nbrs.length === 0) { stack.pop(); continue; }
        const [nr, nc] = nbrs[Math.floor(Math.random() * nbrs.length)];
        maze[r + (nr - r) / 2][c + (nc - c) / 2] = 0;
        maze[nr][nc] = 0;
        stack.push([nr, nc]);
    }

    // exit must be reachable: carve a neighbor if the corner ended up sealed
    maze[rows - 1][cols - 1] = 0;
    if (maze[rows - 2][cols - 1] === 1 && maze[rows - 1][cols - 2] === 1) {
        maze[rows - 2][cols - 1] = 0;
    }
    return maze;
}

export function isSolvable(maze: number[][]): boolean {
    const rows = maze.length, cols = maze[0].length;
    const visited = maze.map((row) => row.map(() => false));
    const stack: [number, number][] = [[0, 0]];
    visited[0][0] = true;
    while (stack.length) {
        const [r, c] = stack.pop()!;
        if (r === rows - 1 && c === cols - 1) return true;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && maze[nr][nc] === 0) {
                visited[nr][nc] = true;
                stack.push([nr, nc]);
            }
        }
    }
    return false;
}

const COPY = {
    ko: { title: '미로 찾기', subtitle: 'Maze Escape', easy: '쉬움', medium: '보통', hard: '어려움', time: '시간', best: '최단 기록', win: '탈출 성공!', hint: '방향키 또는 스와이프로 이동 · 🏁 도착점', newMaze: '새 미로' },
    en: { title: 'Maze Escape', subtitle: 'Maze Escape', easy: 'Easy', medium: 'Medium', hard: 'Hard', time: 'Time', best: 'Best', win: 'Escaped!', hint: 'Arrow keys or swipe to move · reach 🏁', newMaze: 'New Maze' },
    ja: { title: '迷路脱出', subtitle: 'Maze Escape', easy: 'かんたん', medium: 'ふつう', hard: 'むずかしい', time: '時間', best: '最短記録', win: '脱出成功！', hint: '矢印キーまたはスワイプで移動 · 🏁がゴール', newMaze: '新しい迷路' },
    zh: { title: '走出迷宫', subtitle: 'Maze Escape', easy: '简单', medium: '普通', hard: '困难', time: '时间', best: '最快记录', win: '成功逃出！', hint: '方向键或滑动移动 · 抵达🏁', newMaze: '新迷宫' },
    fr: { title: 'Évasion du labyrinthe', subtitle: 'Maze Escape', easy: 'Facile', medium: 'Moyen', hard: 'Difficile', time: 'Temps', best: 'Record', win: 'Évadé !', hint: 'Flèches ou glisser pour bouger · atteignez 🏁', newMaze: 'Nouveau labyrinthe' },
    es: { title: 'Escape del laberinto', subtitle: 'Maze Escape', easy: 'Fácil', medium: 'Normal', hard: 'Difícil', time: 'Tiempo', best: 'Récord', win: '¡Escapaste!', hint: 'Flechas o desliza para moverte · llega a 🏁', newMaze: 'Nuevo laberinto' },
} as const;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const MazeGame: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const reducedMotion = usePrefersReducedMotion();

    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [maze, setMaze] = useState<number[][]>(() => generateMaze(SIZES.easy, SIZES.easy));
    const [pos, setPos] = useState<[number, number]>([0, 0]);
    const [seconds, setSeconds] = useState(0);
    const [won, setWon] = useState(false);
    const [best, setBest] = useState<Record<string, number>>({});
    const started = useRef(false);
    const startedAt = useRef<number | null>(null);
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
            if (stored && typeof stored === 'object') setBest(stored);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (won || !started.current) return;
        const id = setInterval(() => setSeconds(elapsedSeconds(startedAt.current, performance.now())), 100);
        return () => clearInterval(id);
    }, [won, pos]);

    const restart = useCallback((diff: Difficulty = difficulty) => {
        const n = SIZES[diff];
        setDifficulty(diff);
        setMaze(generateMaze(n, n));
        setPos([0, 0]);
        setSeconds(0);
        setWon(false);
        started.current = false;
        startedAt.current = null;
    }, [difficulty]);

    const move = useCallback((dr: number, dc: number) => {
        if (won) return;
        setPos(([r, c]) => {
            const nr = r + dr, nc = c + dc;
            const n = maze.length;
            if (nr < 0 || nr >= n || nc < 0 || nc >= n || maze[nr][nc] === 1) return [r, c];
            started.current = true;
            if (startedAt.current === null) startedAt.current = performance.now();
            if (nr === n - 1 && nc === n - 1) {
                setWon(true);
                setBest((prev) => {
                    if (prev[difficulty] !== undefined && prev[difficulty] <= seconds) return prev;
                    const next = { ...prev, [difficulty]: seconds };
                    try { localStorage.setItem(BEST_KEY, JSON.stringify(next)); } catch { /* ignore */ }
                    return next;
                });
            }
            return [nr, nc];
        });
    }, [maze, won, difficulty, seconds]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp': e.preventDefault(); move(-1, 0); break;
                case 'ArrowDown': e.preventDefault(); move(1, 0); break;
                case 'ArrowLeft': e.preventDefault(); move(0, -1); break;
                case 'ArrowRight': e.preventDefault(); move(0, 1); break;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [move]);

    const onTouchStart = (e: React.TouchEvent) => {
        const tch = e.touches[0];
        touchStart.current = { x: tch.clientX, y: tch.clientY };
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const tch = e.changedTouches[0];
        const dx = tch.clientX - touchStart.current.x;
        const dy = tch.clientY - touchStart.current.y;
        touchStart.current = null;
        const absX = Math.abs(dx), absY = Math.abs(dy);
        if (Math.max(absX, absY) < 24) return;
        if (absX > absY) move(0, dx > 0 ? 1 : -1);
        else move(dy > 0 ? 1 : -1, 0);
    };

    const n = maze.length;

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={() => restart()}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex gap-1">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                        <button key={d} onClick={() => restart(d)}
                            aria-pressed={difficulty === d}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${difficulty === d ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            {t[d]} {SIZES[d]}×{SIZES[d]}
                        </button>
                    ))}
                </div>
                <div className="ml-auto flex gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>{t.time} {fmt(seconds)}</span>
                    {best[difficulty] !== undefined && <span>{t.best} {fmt(best[difficulty])}</span>}
                </div>
            </div>

            <div
                className="relative mx-auto max-w-sm aspect-square touch-none select-none"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                <div
                    className="grid w-full h-full rounded-xl overflow-hidden border-2 border-foreground/70"
                    style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
                    role="grid" aria-label={t.title}
                >
                    {maze.map((row, r) => row.map((cell, c) => {
                        const isPlayer = pos[0] === r && pos[1] === c;
                        const isExit = r === n - 1 && c === n - 1;
                        return (
                            <div
                                key={`${r}-${c}`}
                                className={`flex items-center justify-center ${cell === 1 ? 'bg-foreground/80' : 'bg-background'}`}
                            >
                                {isPlayer ? (
                                    <div className="w-3/4 h-3/4 rounded-full bg-primary shadow-md" aria-label="player" />
                                ) : isExit ? (
                                    <span className={n > 15 ? 'text-[10px]' : 'text-sm'}>🏁</span>
                                ) : null}
                            </div>
                        );
                    }))}
                </div>

                {won && (
                    <div className={`absolute inset-0 z-10 bg-background/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3 ${!reducedMotion ? 'animate-in fade-in zoom-in-95' : ''}`} role="status" aria-live="polite">
                        <p className="text-2xl font-black text-success">🎉 {t.win}</p>
                        <p className="text-sm font-bold text-muted-foreground">{t.time} {fmt(seconds)}</p>
                        <button onClick={() => restart()} className="mt-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity">
                            {t.newMaze}
                        </button>
                    </div>
                )}
            </div>

            <p className="mt-4 text-center text-[10px] text-muted-foreground font-medium">{t.hint}</p>
        </GameContainer>
    );
};

export default MazeGame;
