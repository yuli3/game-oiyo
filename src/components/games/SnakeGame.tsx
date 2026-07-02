import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 20;

const SnakeGame: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "커리어 성장 스네이크", score: "경력(경험치)", best: "최고 커리어", start: "게임 시작", over: "번아웃 발생!", reset: "재충전 후 다시 시작", food: "지식" },
        en: { title: "Career Growth Snake", score: "Exp", best: "Best Career", start: "Start", over: "Burnout!", reset: "Restart after Recharge", food: "Know-how" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
    const [food, setFood] = useState({ x: 5, y: 5 });
    const [direction, setDirection] = useState({ x: 0, y: -1 });
    const [status, setStatus] = useState<'idle' | 'playing' | 'over'>('idle');
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);
    const lastDirection = useRef({ x: 0, y: -1 });

    const generateFood = useCallback((currentSnake: {x:number, y:number}[]) => {
        let newFood: {x:number, y:number} = { x: 0, y: 0 };
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
            if (!currentSnake.some(s => s.x === newFood.x && s.y === newFood.y)) break;
        }
        return newFood;
    }, []);

    const initGame = () => {
        setSnake([{ x: 10, y: 10 }]);
        setFood({ x: 5, y: 5 });
        setDirection({ x: 0, y: -1 });
        setScore(0);
        setStatus('playing');
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const dir = lastDirection.current;
        switch (e.key) {
            case 'ArrowUp': if (dir.y === 0) setDirection({ x: 0, y: -1 }); break;
            case 'ArrowDown': if (dir.y === 0) setDirection({ x: 0, y: 1 }); break;
            case 'ArrowLeft': if (dir.x === 0) setDirection({ x: -1, y: 0 }); break;
            case 'ArrowRight': if (dir.x === 0) setDirection({ x: 1, y: 0 }); break;
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (status !== 'playing') return;

        const moveSnake = () => {
            setSnake(prev => {
                const head = prev[0];
                const newHead = { x: head.x + direction.x, y: head.y + direction.y };
                lastDirection.current = direction;

                // Wall Collision
                if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                    setStatus('over');
                    return prev;
                }

                // Self Collision
                if (prev.some(s => s.x === newHead.x && s.y === newHead.y)) {
                    setStatus('over');
                    return prev;
                }

                const newSnake = [newHead, ...prev];

                // Food Consumption
                if (newHead.x === food.x && newHead.y === food.y) {
                    setScore(s => s + 10);
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
        if (score > best) setBest(score);
    }, [score, best]);

    return (
        <div className="not-prose my-12 p-8 bg-card border border-border rounded-4xl shadow-sm max-w-sm mx-auto">
            <div className="flex justify-between items-end mb-8 text-foreground">
                <div>
                    <h3 className="text-xl font-black">{t.title}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase">{t.food} Accumulation</p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">{t.score}</span>
                    <div className="text-2xl font-black text-primary">{score}</div>
                </div>
            </div>

            <div className="relative aspect-square w-full bg-muted/30 rounded-2xl border border-border overflow-hidden backdrop-blur-sm">
                {/* SVG Grid for Snake */}
                <svg viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`} className="w-full h-full">
                    {/* Food */}
                    <rect 
                        x={food.x + 0.1} y={food.y + 0.1} width={0.8} height={0.8} rx="0.2"
                        className="fill-chart-1 animate-pulse"
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
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95">
                        {status === 'idle' ? (
                            <div className="space-y-4">
                                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">🚀</span>
                                </div>
                                <button 
                                    onClick={initGame}
                                    className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg"
                                >
                                    {t.start}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h4 className="text-2xl font-black text-destructive">{t.over}</h4>
                                <p className="text-sm font-medium text-muted-foreground">Final Rank: {score / 10} Stars</p>
                                <button 
                                    onClick={initGame}
                                    className="px-8 py-3 bg-destructive text-destructive-foreground rounded-full font-bold shadow-lg"
                                >
                                    {t.reset}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-8 flex justify-between text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                <span>Directing with arrows</span>
                <span>Best Career: {best}</span>
            </div>
        </div>
    );
};

export default SnakeGame;
