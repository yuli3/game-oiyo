import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const GRID_SIZE = 20;
const BEST_KEY = 'oiyo-snake-best';

const COPY = {
    ko: { title: "커리어 성장 스네이크", subtitle: "Know-how Accumulation", score: "경력(경험치)", best: "최고 커리어", start: "게임 시작", over: "번아웃 발생!", reset: "재충전 후 다시 시작", hint: "방향키 또는 스와이프", rank: (n: number) => `최종 등급: ${n}성` },
    en: { title: "Career Growth Snake", subtitle: "Know-how Accumulation", score: "Exp", best: "Best Career", start: "Start", over: "Burnout!", reset: "Restart after Recharge", hint: "Arrow keys or swipe", rank: (n: number) => `Final Rank: ${n} Stars` },
    ja: { title: "キャリア成長スネーク", subtitle: "Know-how Accumulation", score: "経験値", best: "ベストキャリア", start: "スタート", over: "バーンアウト発生！", reset: "充電して再スタート", hint: "矢印キーまたはスワイプ", rank: (n: number) => `最終ランク: ${n}つ星` },
    zh: { title: "职业成长贪吃蛇", subtitle: "Know-how Accumulation", score: "经验值", best: "最佳职业", start: "开始游戏", over: "职业倦怠！", reset: "充电后重新开始", hint: "方向键或滑动", rank: (n: number) => `最终评级: ${n}星` },
    fr: { title: "Snake de carrière", subtitle: "Know-how Accumulation", score: "XP", best: "Meilleure carrière", start: "Démarrer", over: "Burnout !", reset: "Recharger et recommencer", hint: "Flèches ou glisser", rank: (n: number) => `Rang final : ${n} étoiles` },
    es: { title: "Snake de carrera", subtitle: "Know-how Accumulation", score: "XP", best: "Mejor carrera", start: "Empezar", over: "¡Burnout!", reset: "Recargar y reiniciar", hint: "Flechas o desliza", rank: (n: number) => `Rango final: ${n} estrellas` },
} as const;

const SnakeGame: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;

    const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
    const [food, setFood] = useState({ x: 5, y: 5 });
    const [direction, setDirection] = useState({ x: 0, y: -1 });
    const [status, setStatus] = useState<'idle' | 'playing' | 'over'>('idle');
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);
    const lastDirection = useRef({ x: 0, y: -1 });
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    const generateFood = useCallback((currentSnake: { x: number, y: number }[]) => {
        let newFood: { x: number, y: number } = { x: 0, y: 0 };
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
            if (!currentSnake.some((s) => s.x === newFood.x && s.y === newFood.y)) break;
        }
        return newFood;
    }, []);

    const initGame = () => {
        setSnake([{ x: 10, y: 10 }]);
        setFood({ x: 5, y: 5 });
        setDirection({ x: 0, y: -1 });
        lastDirection.current = { x: 0, y: -1 };
        setScore(0);
        setStatus('playing');
    };

    // Guarded direction change — cannot reverse into itself.
    const changeDir = useCallback((nx: number, ny: number) => {
        const dir = lastDirection.current;
        if (nx !== 0 && dir.x === 0) setDirection({ x: nx, y: 0 });
        else if (ny !== 0 && dir.y === 0) setDirection({ x: 0, y: ny });
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (status !== 'playing') return;
            switch (e.key) {
                case 'ArrowUp': e.preventDefault(); changeDir(0, -1); break;
                case 'ArrowDown': e.preventDefault(); changeDir(0, 1); break;
                case 'ArrowLeft': e.preventDefault(); changeDir(-1, 0); break;
                case 'ArrowRight': e.preventDefault(); changeDir(1, 0); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [changeDir, status]);

    useEffect(() => {
        if (status !== 'playing') return;

        const moveSnake = () => {
            setSnake((prev) => {
                const head = prev[0];
                const newHead = { x: head.x + direction.x, y: head.y + direction.y };
                lastDirection.current = direction;

                // Wall Collision
                if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                    setStatus('over');
                    return prev;
                }

                // Self Collision
                if (prev.some((s) => s.x === newHead.x && s.y === newHead.y)) {
                    setStatus('over');
                    return prev;
                }

                const newSnake = [newHead, ...prev];

                // Food Consumption
                if (newHead.x === food.x && newHead.y === food.y) {
                    setScore((s) => s + 10);
                    setFood(generateFood(newSnake));
                } else {
                    newSnake.pop();
                }

                return newSnake;
            });
        };

        const interval = setInterval(moveSnake, Math.max(50, 150 - score / 5));
        return () => clearInterval(interval);
    }, [status, direction, food, score, generateFood]);

    useEffect(() => {
        if (score > best) {
            setBest(score);
            try { localStorage.setItem(BEST_KEY, String(score)); } catch { /* ignore */ }
        }
    }, [score, best]);

    useEffect(() => {
        try {
            const stored = Number(localStorage.getItem(BEST_KEY));
            if (Number.isFinite(stored) && stored > 0) setBest(stored);
        } catch { /* ignore */ }
    }, []);

    const onTouchStart = (e: React.TouchEvent) => {
        const tch = e.touches[0];
        touchStart.current = { x: tch.clientX, y: tch.clientY };
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current || status !== 'playing') return;
        const tch = e.changedTouches[0];
        const dx = tch.clientX - touchStart.current.x;
        const dy = tch.clientY - touchStart.current.y;
        touchStart.current = null;
        const absX = Math.abs(dx), absY = Math.abs(dy);
        if (Math.max(absX, absY) < 24) return; // ignore taps
        if (absX > absY) changeDir(dx > 0 ? 1 : -1, 0);
        else changeDir(0, dy > 0 ? 1 : -1);
    };

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={status === 'idle' ? undefined : initGame}>
            <div className="flex justify-end mb-6 text-right">
                <div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase">{t.score}</span>
                    <div className="text-2xl font-black text-primary leading-none">{score}</div>
                </div>
            </div>

            <div
                className="relative aspect-square w-full max-w-sm mx-auto bg-muted/30 rounded-2xl border border-border overflow-hidden touch-none"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {/* SVG Grid for Snake */}
                <svg viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`} className="w-full h-full" aria-label={t.title}>
                    {/* Food */}
                    <rect
                        x={food.x + 0.1} y={food.y + 0.1} width={0.8} height={0.8} rx="0.2"
                        className="fill-chart-1 animate-pulse motion-reduce:animate-none"
                    />
                    {/* Snake */}
                    {snake.map((s, i) => (
                        <rect
                            key={i} x={s.x + 0.05} y={s.y + 0.05} width={0.9} height={0.9} rx="0.25"
                            className={i === 0 ? "fill-primary" : "fill-primary/60"}
                        />
                    ))}
                </svg>

                {status !== 'playing' && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95" role="status" aria-live="polite">
                        {status === 'idle' ? (
                            <div className="space-y-4">
                                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">🚀</span>
                                </div>
                                <button
                                    onClick={initGame}
                                    className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
                                >
                                    {t.start}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h4 className="text-2xl font-black text-destructive">{t.over}</h4>
                                <p className="text-sm font-medium text-muted-foreground">{t.rank(score / 10)}</p>
                                <button
                                    onClick={initGame}
                                    className="px-8 py-3 bg-destructive text-destructive-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
                                >
                                    {t.reset}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-between text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                <span>{t.hint}</span>
                <span>{t.best}: {best}</span>
            </div>
        </GameContainer>
    );
};

export default SnakeGame;
