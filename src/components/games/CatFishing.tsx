import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { elapsedSeconds, frameScale } from '../../lib/games/time-contracts';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import {
    CONFIGS,
    allCaught,
    catchFish as catchFishAt,
    createFish,
    formatElapsed,
    stepFish,
    type Difficulty,
    type FishState,
} from '../../lib/games/cat-fishing';

// ─── Cat Fishing — catch the fish before they get away ───────────────────────
// Ported from ahoxy-legacy; play area is contained (was full-viewport) and the
// score is now time-to-catch-all, which makes "best" meaningful.

const BEST_KEY = 'oiyo-cat-fishing-best'; // per difficulty: seconds

const COPY = {
    ko: { title: '고양이 낚시', subtitle: 'Cat Fishing', normal: '보통', hard: '어려움', hell: '헬', caught: '잡은 물고기', time: '시간', best: '최단 기록', win: '다 잡았다! 🐱', winSub: '오늘 밤 고양이들은 만찬입니다.', hintNormal: '물고기를 탭해서 잡으세요!', hintHard: '조심! 도망갑니다!', hintHell: '초고속 모드!', again: '다시 하기', sound: '소리' },
    en: { title: 'Cat Fishing', subtitle: 'Cat Fishing', normal: 'Normal', hard: 'Hard', hell: 'Hell', caught: 'Caught', time: 'Time', best: 'Best', win: "Caught 'em all! 🐱", winSub: 'Your kitties feast tonight.', hintNormal: 'Tap the fish to catch them!', hintHard: 'Watch out! They run away!', hintHell: 'Super speed mode!', again: 'Play Again', sound: 'Sound' },
    ja: { title: 'ねこ釣り', subtitle: 'Cat Fishing', normal: 'ふつう', hard: 'むずかしい', hell: '地獄', caught: '釣った魚', time: '時間', best: '最短記録', win: '全部釣った！ 🐱', winSub: '今夜は猫たちのごちそうです。', hintNormal: '魚をタップして捕まえよう！', hintHard: '注意！逃げます！', hintHell: '超高速モード！', again: 'もう一度', sound: '音' },
    zh: { title: '猫咪钓鱼', subtitle: 'Cat Fishing', normal: '普通', hard: '困难', hell: '地狱', caught: '已捕获', time: '时间', best: '最快记录', win: '全抓到了！🐱', winSub: '今晚猫咪们有大餐了。', hintNormal: '点击鱼来捕捉！', hintHard: '小心！它们会逃跑！', hintHell: '超高速模式！', again: '再玩一次', sound: '声音' },
    fr: { title: 'Pêche au chat', subtitle: 'Cat Fishing', normal: 'Normal', hard: 'Difficile', hell: 'Enfer', caught: 'Attrapés', time: 'Temps', best: 'Record', win: 'Tous attrapés ! 🐱', winSub: 'Vos chats festoient ce soir.', hintNormal: 'Touchez les poissons pour les attraper !', hintHard: 'Attention ! Ils fuient !', hintHell: 'Mode super vitesse !', again: 'Rejouer', sound: 'Son' },
    es: { title: 'Pesca gatuna', subtitle: 'Cat Fishing', normal: 'Normal', hard: 'Difícil', hell: 'Infierno', caught: 'Atrapados', time: 'Tiempo', best: 'Récord', win: '¡Todos atrapados! 🐱', winSub: 'Tus gatitos festejan esta noche.', hintNormal: '¡Toca los peces para atraparlos!', hintHard: '¡Cuidado! ¡Se escapan!', hintHell: '¡Modo super velocidad!', again: 'Jugar otra vez', sound: 'Sonido' },
} as const;

const CatFishing: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const prefersReducedMotion = usePrefersReducedMotion();

    const [difficulty, setDifficulty] = useState<Difficulty>('normal');
    // Starts empty rather than calling createFish() (which uses Math.random())
    // during the initial render: that value would differ between the
    // server-rendered HTML and the client's first render and tear hydration.
    // The real fish spawn is chosen after mount, client-only, below.
    const [fish, setFish] = useState<FishState[]>([]);
    const [seconds, setSeconds] = useState(0);
    const [best, setBest] = useState<Record<string, number>>({});
    const [muted, setMuted] = useState(false);
    const mutedRef = useRef(false);
    useEffect(() => { mutedRef.current = muted; }, [muted]);
    const audioRef = useRef<AudioContext | null>(null);
    const tone = useCallback((frequency: number, duration = 0.08) => {
        if (mutedRef.current || typeof window === 'undefined') return;
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
    }, []);
    useEffect(() => () => { void audioRef.current?.close(); }, []);
    const started = useRef(false);
    const startedAt = useRef<number | null>(null);
    const areaRef = useRef<HTMLDivElement>(null);
    const pointer = useRef({ x: -1000, y: -1000 });
    const fishRef = useRef(fish);
    fishRef.current = fish;

    const remaining = fish.filter((f) => !f.caught).length;
    const won = fish.length > 0 && remaining === 0;

    useEffect(() => {
        setFish(createFish(CONFIGS.normal.fishCount, CONFIGS.normal.baseSpeed));
        try {
            const stored = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
            if (stored && typeof stored === 'object') setBest(stored);
        } catch { /* ignore */ }
    }, []);

    // timer
    useEffect(() => {
        if (won || !started.current) return;
        const id = setInterval(() => setSeconds(elapsedSeconds(startedAt.current, performance.now())), 100);
        return () => clearInterval(id);
    }, [won, remaining]);

    // movement loop — deltaScale keeps speed and turn frequency the same on a
    // 60Hz and a 120Hz display instead of doubling with the refresh rate.
    useEffect(() => {
        if (won) return;
        const cfg = CONFIGS[difficulty];
        let raf: number;
        let previous: number | null = null;
        const step = (now: number) => {
            const deltaScale = frameScale(previous, now);
            previous = now;
            setFish((prev) => prev.map((f) => stepFish(f, cfg, pointer.current, deltaScale)));
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
        if (startedAt.current === null) startedAt.current = performance.now();
        setFish((prev) => {
            const next = catchFishAt(prev, id);
            if (allCaught(next)) {
                tone(880, 0.22);
                setBest((b) => {
                    if (b[difficulty] !== undefined && b[difficulty] <= seconds) return b;
                    const nb = { ...b, [difficulty]: seconds };
                    try { localStorage.setItem(BEST_KEY, JSON.stringify(nb)); } catch { /* ignore */ }
                    return nb;
                });
            } else {
                tone(520, 0.06);
            }
            return next;
        });
    };

    const restart = useCallback((diff: Difficulty = difficulty) => {
        const cfg = CONFIGS[diff];
        setDifficulty(diff);
        setFish(createFish(cfg.fishCount, cfg.baseSpeed));
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
                <button
                    type="button"
                    onClick={() => setMuted((value) => !value)}
                    aria-pressed={muted}
                    className="min-h-11 min-w-11 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted"
                >
                    <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
                    <span className="sr-only">{t.sound}</span>
                </button>
                <div className="ml-auto flex gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>🐟 {CONFIGS[difficulty].fishCount - remaining}/{CONFIGS[difficulty].fishCount}</span>
                    <span>{t.time} {formatElapsed(seconds)}</span>
                    {best[difficulty] !== undefined && <span>{t.best} {formatElapsed(best[difficulty])}</span>}
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
                        className="absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                        style={{ left: `${f.x}%`, top: `${f.y}%`, transform: `translate(-50%,-50%) scaleX(${f.vx < 0 ? 1 : -1})` }}
                    >
                        {/* Hitbox above is 44px regardless of difficulty; only this inner
                            glyph shrinks/grows, so the tap target never shrinks with it. */}
                        <span className="text-2xl transition-transform hover:scale-110 sm:text-3xl">🐟</span>
                    </button>
                ))}

                {won && (
                    <div className={`absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 ${prefersReducedMotion ? '' : 'animate-in fade-in zoom-in-95'}`} role="status" aria-live="polite">
                        <p className="text-2xl font-black text-primary">{t.win}</p>
                        <p className="text-sm text-muted-foreground">{t.winSub}</p>
                        <p className="text-sm font-bold text-muted-foreground">{t.time} {formatElapsed(seconds)}</p>
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
