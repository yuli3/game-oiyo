import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

// ─── Cat Fishing — catch the fish before they get away ───────────────────────
// Ported from ahoxy-legacy; play area is contained (was full-viewport) and the
// score is now time-to-catch-all, which makes "best" meaningful.

type Difficulty = 'normal' | 'hard' | 'hell';

interface FishState { id: number; x: number; y: number; vx: number; vy: number; caught: boolean }
interface Config { fishCount: number; baseSpeed: number; turnChance: number; escapeDistance: number }

const CONFIGS: Record<Difficulty, Config> = {
    normal: { fishCount: 5, baseSpeed: 1.6, turnChance: 0.02, escapeDistance: 0 },
    hard: { fishCount: 7, baseSpeed: 2.4, turnChance: 0.03, escapeDistance: 22 },
    hell: { fishCount: 10, baseSpeed: 3.2, turnChance: 0.04, escapeDistance: 30 },
};

const BEST_KEY = 'oiyo-cat-fishing-best'; // per difficulty: seconds

const COPY = {
    ko: { title: '고양이 낚시', subtitle: 'Cat Fishing', normal: '보통', hard: '어려움', hell: '헬', caught: '잡은 물고기', time: '시간', best: '최단 기록', win: '다 잡았다! 🐱', winSub: '오늘 밤 고양이들은 만찬입니다.', hintNormal: '물고기를 탭해서 잡으세요!', hintHard: '조심! 도망갑니다!', hintHell: '초고속 모드!', again: '다시 하기' },
    en: { title: 'Cat Fishing', subtitle: 'Cat Fishing', normal: 'Normal', hard: 'Hard', hell: 'Hell', caught: 'Caught', time: 'Time', best: 'Best', win: "Caught 'em all! 🐱", winSub: 'Your kitties feast tonight.', hintNormal: 'Tap the fish to catch them!', hintHard: 'Watch out! They run away!', hintHell: 'Super speed mode!', again: 'Play Again' },
    ja: { title: 'ねこ釣り', subtitle: 'Cat Fishing', normal: 'ふつう', hard: 'むずかしい', hell: '地獄', caught: '釣った魚', time: '時間', best: '最短記録', win: '全部釣った！ 🐱', winSub: '今夜は猫たちのごちそうです。', hintNormal: '魚をタップして捕まえよう！', hintHard: '注意！逃げます！', hintHell: '超高速モード！', again: 'もう一度' },
    zh: { title: '猫咪钓鱼', subtitle: 'Cat Fishing', normal: '普通', hard: '困难', hell: '地狱', caught: '已捕获', time: '时间', best: '最快记录', win: '全抓到了！🐱', winSub: '今晚猫咪们有大餐了。', hintNormal: '点击鱼来捕捉！', hintHard: '小心！它们会逃跑！', hintHell: '超高速模式！', again: '再玩一次' },
    fr: { title: 'Pêche au chat', subtitle: 'Cat Fishing', normal: 'Normal', hard: 'Difficile', hell: 'Enfer', caught: 'Attrapés', time: 'Temps', best: 'Record', win: 'Tous attrapés ! 🐱', winSub: 'Vos chats festoient ce soir.', hintNormal: 'Touchez les poissons pour les attraper !', hintHard: 'Attention ! Ils fuient !', hintHell: 'Mode super vitesse !', again: 'Rejouer' },
    es: { title: 'Pesca gatuna', subtitle: 'Cat Fishing', normal: 'Normal', hard: 'Difícil', hell: 'Infierno', caught: 'Atrapados', time: 'Tiempo', best: 'Récord', win: '¡Todos atrapados! 🐱', winSub: 'Tus gatitos festejan esta noche.', hintNormal: '¡Toca los peces para atraparlos!', hintHard: '¡Cuidado! ¡Se escapan!', hintHell: '¡Modo super velocidad!', again: 'Jugar otra vez' },
} as const;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// positions in % of the play area (0..100)
const makeFish = (count: number, speed: number): FishState[] =>
    Array.from({ length: count }, (_, id) => {
        const angle = Math.random() * Math.PI * 2;
        return {
            id,
            x: 10 + Math.random() * 80,
            y: 10 + Math.random() * 80,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            caught: false,
        };
    });

const CatFishing: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;

    const [difficulty, setDifficulty] = useState<Difficulty>('normal');
    const [fish, setFish] = useState<FishState[]>(() => makeFish(CONFIGS.normal.fishCount, CONFIGS.normal.baseSpeed));
    const [seconds, setSeconds] = useState(0);
    const [best, setBest] = useState<Record<string, number>>({});
    const started = useRef(false);
    const areaRef = useRef<HTMLDivElement>(null);
    const pointer = useRef({ x: -1000, y: -1000 });
    const fishRef = useRef(fish);
    fishRef.current = fish;

    const remaining = fish.filter((f) => !f.caught).length;
    const won = remaining === 0;

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
            if (stored && typeof stored === 'object') setBest(stored);
        } catch { /* ignore */ }
    }, []);

    // timer
    useEffect(() => {
        if (won || !started.current) return;
        const id = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [won, remaining]);

    // movement loop
    useEffect(() => {
        if (won) return;
        const cfg = CONFIGS[difficulty];
        let raf: number;
        const step = () => {
            setFish((prev) => prev.map((f) => {
                if (f.caught) return f;
                let { x, y, vx, vy } = f;

                if (cfg.escapeDistance > 0) {
                    const dx = x - pointer.current.x, dy = y - pointer.current.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 0 && dist < cfg.escapeDistance) {
                        const m = ((cfg.escapeDistance - dist) / cfg.escapeDistance) * 0.9;
                        vx += (dx / dist) * m;
                        vy += (dy / dist) * m;
                    }
                }

                const speed = Math.hypot(vx, vy);
                if (speed > cfg.baseSpeed) { vx = (vx / speed) * cfg.baseSpeed; vy = (vy / speed) * cfg.baseSpeed; }
                if (Math.random() < cfg.turnChance) {
                    const a = Math.random() * Math.PI * 2;
                    vx = Math.cos(a) * cfg.baseSpeed;
                    vy = Math.sin(a) * cfg.baseSpeed;
                }

                x += vx * 0.4;
                y += vy * 0.4;
                if (x < 2 || x > 94) { vx *= -1; x = Math.max(2, Math.min(94, x)); }
                if (y < 2 || y > 92) { vy *= -1; y = Math.max(2, Math.min(92, y)); }
                return { ...f, x, y, vx, vy };
            }));
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [difficulty, won]);

    const trackPointer = (clientX: number, clientY: number) => {
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return;
        pointer.current = {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100,
        };
    };

    const catchFish = (id: number) => {
        if (won) return;
        started.current = true;
        setFish((prev) => {
            const next = prev.map((f) => (f.id === id ? { ...f, caught: true } : f));
            if (next.every((f) => f.caught)) {
                setBest((b) => {
                    if (b[difficulty] !== undefined && b[difficulty] <= seconds) return b;
                    const nb = { ...b, [difficulty]: seconds };
                    try { localStorage.setItem(BEST_KEY, JSON.stringify(nb)); } catch { /* ignore */ }
                    return nb;
                });
            }
            return next;
        });
    };

    const restart = useCallback((diff: Difficulty = difficulty) => {
        const cfg = CONFIGS[diff];
        setDifficulty(diff);
        setFish(makeFish(cfg.fishCount, cfg.baseSpeed));
        setSeconds(0);
        started.current = false;
    }, [difficulty]);

    const hint = difficulty === 'normal' ? t.hintNormal : difficulty === 'hard' ? t.hintHard : t.hintHell;

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={() => restart()}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex gap-1">
                    {(['normal', 'hard', 'hell'] as Difficulty[]).map((d) => (
                        <button key={d} onClick={() => restart(d)}
                            aria-pressed={difficulty === d}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${difficulty === d ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            {t[d]}
                        </button>
                    ))}
                </div>
                <div className="ml-auto flex gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>🐟 {CONFIGS[difficulty].fishCount - remaining}/{CONFIGS[difficulty].fishCount}</span>
                    <span>{t.time} {fmt(seconds)}</span>
                    {best[difficulty] !== undefined && <span>{t.best} {fmt(best[difficulty])}</span>}
                </div>
            </div>

            <div
                ref={areaRef}
                onMouseMove={(e) => trackPointer(e.clientX, e.clientY)}
                onTouchMove={(e) => trackPointer(e.touches[0].clientX, e.touches[0].clientY)}
                className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-gradient-to-b from-sky-100 to-blue-200 cursor-crosshair touch-none select-none"
                aria-label={t.title}
            >
                {fish.map((f) => !f.caught && (
                    <button
                        key={f.id}
                        onPointerDown={() => catchFish(f.id)}
                        aria-label="fish"
                        className="absolute text-2xl sm:text-3xl -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
                        style={{ left: `${f.x}%`, top: `${f.y}%`, transform: `translate(-50%,-50%) scaleX(${f.vx < 0 ? 1 : -1})` }}
                    >
                        🐟
                    </button>
                ))}

                {won && (
                    <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 animate-in fade-in zoom-in-95" role="status" aria-live="polite">
                        <p className="text-2xl font-black text-primary">{t.win}</p>
                        <p className="text-sm text-muted-foreground">{t.winSub}</p>
                        <p className="text-sm font-bold text-muted-foreground">{t.time} {fmt(seconds)}</p>
                        <button onClick={() => restart()} className="mt-3 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity">
                            {t.again}
                        </button>
                    </div>
                )}
            </div>

            <p className="mt-4 text-center text-[10px] text-muted-foreground font-medium">{hint}</p>
        </GameContainer>
    );
};

export default CatFishing;
