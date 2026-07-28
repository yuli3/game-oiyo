import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { getBest, recordBest } from '../../lib/games/records';
import { clearGame2048Save, loadGame2048Save, storeGame2048Save } from '../../lib/games/active-game-save';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';

type Tile = { id: number; value: number; x: number; y: number; mergedFrom?: number[] };
type Dir = 'up' | 'down' | 'left' | 'right';

const COPY = {
    ko: { title: "2048 게임", subtitle: "Growth Logic", score: "점수", best: "최고 점수", over: "게임 종료", win: "2048 달성!", reset: "다시 시작", hint: "방향키 또는 스와이프로 이동" },
    en: { title: "2048 Game", subtitle: "Growth Logic", score: "Score", best: "Best", over: "Game Over", win: "2048 reached!", reset: "Reset", hint: "Arrow keys or swipe to move" },
    ja: { title: "2048ゲーム", subtitle: "Growth Logic", score: "スコア", best: "ベスト", over: "ゲーム終了", win: "2048達成！", reset: "リスタート", hint: "矢印キーまたはスワイプで移動" },
    zh: { title: "2048游戏", subtitle: "Growth Logic", score: "分数", best: "最高分", over: "游戏结束", win: "达成2048！", reset: "重新开始", hint: "方向键或滑动操作" },
    fr: { title: "Jeu 2048", subtitle: "Growth Logic", score: "Score", best: "Record", over: "Partie terminée", win: "2048 atteint !", reset: "Recommencer", hint: "Flèches ou glissez pour jouer" },
    es: { title: "Juego 2048", subtitle: "Growth Logic", score: "Puntos", best: "Récord", over: "Fin del juego", win: "¡2048 logrado!", reset: "Reiniciar", hint: "Flechas o desliza para mover" },
} as const;

const LEGACY_BEST_KEY = 'oiyo-2048-best'; // pre-unification key, read once for migration

const Game2048: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const reducedMotion = usePrefersReducedMotion();

    const [board, setBoard] = useState<(Tile | null)[][]>(Array(4).fill(null).map(() => Array(4).fill(null)));
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);
    const [status, setStatus] = useState<'playing' | 'won' | 'over'>('playing');
    const idCounter = useRef(0);
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    const addRandomTile = (currentBoard: (Tile | null)[][]) => {
        const emptyCells = [];
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                if (!currentBoard[y][x]) emptyCells.push({ x, y });
            }
        }
        if (emptyCells.length > 0) {
            const { x, y } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            currentBoard[y][x] = { id: idCounter.current++, value: Math.random() < 0.9 ? 2 : 4, x, y };
        }
    };

    const initGame = useCallback(() => {
        clearGame2048Save();
        const newBoard: (Tile | null)[][] = Array(4).fill(null).map(() => Array(4).fill(null));
        addRandomTile(newBoard);
        addRandomTile(newBoard);
        setBoard(newBoard);
        setScore(0);
        setStatus('playing');
    }, []);

    useEffect(() => {
        const saved = loadGame2048Save();
        if (saved) {
            const restored: (Tile | null)[][] = Array(4).fill(null).map(() => Array(4).fill(null));
            saved.board.forEach((value, index) => {
                if (value !== null) {
                    const x = index % 4, y = Math.floor(index / 4);
                    restored[y][x] = { id: idCounter.current++, value, x, y };
                }
            });
            setBoard(restored);
            setScore(saved.score);
            setStatus('playing');
        } else {
            initGame();
        }
        const existing = getBest('game-2048');
        if (existing) { setBest(existing.value); return; }
        // One-time migration from the pre-unification per-game key
        try {
            const legacy = Number(localStorage.getItem(LEGACY_BEST_KEY));
            if (Number.isFinite(legacy) && legacy > 0) setBest(recordBest('game-2048', legacy, 'score', undefined, { trackPlay: false }).value);
        } catch { /* ignore */ }
    }, [initGame]);

    // Persist the active board after every applied move; terminal states are not resumable.
    useEffect(() => {
        const tiles = board.flat();
        if (tiles.every((tile) => tile === null)) return; // pre-init render
        if (status !== 'playing') { clearGame2048Save(); return; }
        storeGame2048Save({
            board: Array.from({ length: 16 }, (_, index) => board[Math.floor(index / 4)][index % 4]?.value ?? null),
            score,
        });
    }, [board, score, status]);

    // No move possible → game over
    const canMove = (b: (Tile | null)[][]) => {
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                if (!b[y][x]) return true;
                const v = b[y][x]!.value;
                if (x < 3 && b[y][x + 1] && b[y][x + 1]!.value === v) return true;
                if (y < 3 && b[y + 1][x] && b[y + 1][x]!.value === v) return true;
            }
        }
        return false;
    };

    const move = useCallback((direction: Dir) => {
        if (status !== 'playing') return;
        let moved = false;
        const newBoard = board.map((row) => [...row]);
        let newScore = score;

        const isVertical = direction === 'up' || direction === 'down';
        const isForward = direction === 'right' || direction === 'down';

        for (let i = 0; i < 4; i++) {
            const line = [];
            for (let j = 0; j < 4; j++) {
                const x = isVertical ? i : j;
                const y = isVertical ? j : i;
                if (newBoard[y][x]) line.push(newBoard[y][x]);
            }

            if (isForward) line.reverse();

            const mergedLine: (Tile | null)[] = [];
            for (let j = 0; j < line.length; j++) {
                const current = line[j]!;
                if (j + 1 < line.length && line[j + 1]!.value === current.value) {
                    const newValue = current.value * 2;
                    mergedLine.push({ ...current, value: newValue, mergedFrom: [current.id, line[j + 1]!.id] });
                    newScore += newValue;
                    j++;
                    moved = true;
                } else {
                    mergedLine.push(current);
                }
            }

            while (mergedLine.length < 4) mergedLine.push(null);
            if (isForward) mergedLine.reverse();

            for (let j = 0; j < 4; j++) {
                const x = isVertical ? i : j;
                const y = isVertical ? j : i;
                const oldTile = newBoard[y][x];
                const newTile = mergedLine[j];
                if (newTile) newTile.x = x;
                if (newTile) newTile.y = y;
                if (JSON.stringify(oldTile) !== JSON.stringify(newTile)) moved = true;
                newBoard[y][x] = newTile;
            }
        }

        if (!moved) return;

        addRandomTile(newBoard);
        setBoard(newBoard);
        setScore(newScore);
        if (newScore > best) {
            setBest(recordBest('game-2048', newScore, 'score').value);
        }
        if (newBoard.flat().some((tl) => tl?.value === 2048)) {
            setStatus('won');
        } else if (!canMove(newBoard)) {
            setStatus('over');
        }
    }, [board, score, best, status]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (status !== 'playing') return;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                move(e.key.replace('Arrow', '').toLowerCase() as Dir);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [move, status]);

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
        if (Math.max(absX, absY) < 24) return; // ignore taps
        if (absX > absY) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
    };

    const getTileColor = (val: number) => {
        const colors: Record<number, string> = {
            2: 'bg-muted text-muted-foreground',
            4: 'bg-accent/50 text-accent-foreground',
            8: 'bg-primary/20 text-primary',
            16: 'bg-primary/40 text-primary-foreground',
            32: 'bg-primary/60 text-primary-foreground',
            64: 'bg-primary/80 text-primary-foreground',
            128: 'bg-primary text-primary-foreground shadow-md',
            256: 'bg-chart-1 text-foreground shadow-md',
            512: 'bg-chart-2 text-foreground shadow-md',
            1024: 'bg-chart-3 text-foreground shadow-lg',
            2048: `bg-chart-4 text-foreground shadow-xl ${reducedMotion ? '' : 'animate-pulse'}`,
        };
        return colors[val] || 'bg-slate-900 text-white';
    };

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={initGame}>
            <div className="flex justify-end gap-2 mb-6">
                <div className="px-3 py-1.5 bg-muted rounded-xl text-center min-w-[72px]">
                    <div className="text-[10px] font-black text-muted-foreground uppercase leading-none">{t.score}</div>
                    <div className="text-lg font-black text-primary leading-tight">{score.toLocaleString()}</div>
                </div>
                <div className="px-3 py-1.5 bg-muted rounded-xl text-center min-w-[72px]">
                    <div className="text-[10px] font-black text-muted-foreground uppercase leading-none">{t.best}</div>
                    <div className="text-lg font-black text-chart-2 leading-tight">{best.toLocaleString()}</div>
                </div>
            </div>

            <div
                className="relative aspect-square w-full max-w-sm mx-auto bg-muted/50 rounded-2xl p-2 grid grid-cols-4 grid-rows-4 gap-2 border border-border touch-none"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                role="grid"
                aria-label={t.title}
            >
                {/* Background Grid */}
                {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="bg-muted/80 rounded-lg" />
                ))}

                {/* Real Tiles */}
                <div className="absolute inset-0 p-2 pointer-events-none">
                    {board.flat().map((tile) => tile && (
                        <div
                            key={tile.id}
                            style={{
                                left: `${tile.x * 25}%`,
                                top: `${tile.y * 25}%`,
                                width: '25%',
                                height: '25%',
                                padding: '4px',
                            }}
                            className={`absolute transition-all ease-in-out ${reducedMotion ? 'duration-50' : 'duration-100'}`}
                        >
                            <div className={`w-full h-full rounded-lg flex items-center justify-center font-black text-lg sm:text-2xl ${reducedMotion ? 'animate-in fade-in duration-75' : 'animate-in zoom-in-50'} ${getTileColor(tile.value)}`}>
                                {tile.value}
                            </div>
                        </div>
                    ))}
                </div>

                {status !== 'playing' && (
                    <div className={`absolute inset-0 z-10 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-4 animate-in fade-in ${reducedMotion ? 'duration-75' : 'zoom-in-95'}`} role="status" aria-live="polite">
                        <h4 className="text-3xl font-black text-foreground">{status === 'won' ? t.win : t.over}</h4>
                        <button
                            onClick={initGame}
                            className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
                        >
                            {t.reset}
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 text-center text-[10px] text-muted-foreground font-medium italic">
                {t.hint}
            </div>
        </GameContainer>
    );
};

export default Game2048;
