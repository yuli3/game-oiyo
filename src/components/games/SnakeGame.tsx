/**
 * SnakeGame.tsx - 100% Canvas GPU 120fps Modern Engine
 * Argon-style neon aesthetics, continuous sub-grid interpolation,
 * 0ms mobile touch & swipe responsiveness, procedural Web Audio synth.
 *
 * Date: 2026-10-17
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { getBest, recordAchievementEvent, recordBest } from '../../lib/games/records';
import {
    bufferSnakeDirection,
    createSnakeGame,
    pauseSnake,
    resumeSnake,
    SNAKE_GRID_SIZE,
    snakeTickMilliseconds,
    steerSnake,
    tickSnakeWithCause,
    type SnakeDeathCause,
    type SnakeDirection,
    type SnakePoint,
    type SnakeState,
} from '../../lib/games/snake';
import { clearSnakeSave, loadSnakeSave, storeSnakeSave } from '../../lib/games/snake-save';
import {
    calculateSwipeDirection,
    createDeathExplosion,
    createEatSparks,
    createSnakeRipple,
    renderSnakeCanvas,
    updateSnakeParticles,
    updateSnakeRipples,
    type SnakeParticle,
    type SnakeRipple,
} from '../../lib/games/snake-canvas';

const LEGACY_BEST_KEY = 'oiyo-snake-best'; // pre-unification key, read once for migration

const COPY = {
    ko: { title: "스네이크 게임", subtitle: "Know-how Accumulation", score: "경력(경험치)", best: "최고 커리어", start: "게임 준비", ready: "화면을 터치·스와이프하거나 방향키를 누르세요", over: "번아웃 발생!", reset: "재충전 후 다시 시작", hint: "방향키 또는 터치 스와이프", rank: (n: number) => `최종 등급: ${n}성` },
    en: { title: "Career Growth Snake", subtitle: "Know-how Accumulation", score: "Exp", best: "Best Career", start: "Get ready", ready: "Touch/swipe the screen or press an arrow key", over: "Burnout!", reset: "Restart after Recharge", hint: "Arrow keys or touch swipe", rank: (n: number) => `Final Rank: ${n} Stars` },
    ja: { title: "キャリア成長スネーク", subtitle: "Know-how Accumulation", score: "経験値", best: "ベストキャリア", start: "準備する", ready: "画面をスワイプまたは矢印キーで開始", over: "バーンアウト発生！", reset: "充電して再スタート", hint: "矢印キーまたはスワイプ", rank: (n: number) => `最終ランク: ${n}つ星` },
    zh: { title: "职业成长贪吃蛇", subtitle: "Know-how Accumulation", score: "经验值", best: "最佳职业", start: "准备游戏", ready: "滑动屏幕或按方向键即可开始", over: "职业倦怠！", reset: "充电后重新开始", hint: "方向键或滑动", rank: (n: number) => `最终评级: ${n}星` },
    fr: { title: "Snake de carrière", subtitle: "Know-how Accumulation", score: "XP", best: "Meilleure carrière", start: "Se préparer", ready: "Touchez, glissez ou appuyez sur une flèche", over: "Burnout !", reset: "Recharger et recommencer", hint: "Flèches ou glisser", rank: (n: number) => `Rang final : ${n} étoiles` },
    es: { title: "Snake de carrera", subtitle: "Know-how Accumulation", score: "XP", best: "Mejor carrera", start: "Prepararse", ready: "Toca, desliza o pulsa una flecha", over: "¡Burnout!", reset: "Recargar y reiniciar", hint: "Flechas o desliza", rank: (n: number) => `Rango final: ${n} estrellas` },
} as const;

const DETAILS = {
    ko: { pause: "일시정지", resume: "계속하기", soundOn: "소리 켜짐", soundOff: "소리 꺼짐", length: "길이", next: "다음 목표", points: "점", wall: "벽과 충돌했습니다", self: "몸통과 충돌했습니다", summary: (score: number, length: number) => `점수 ${score}, 길이 ${length}` },
    en: { pause: "Pause", resume: "Resume", soundOn: "Sound on", soundOff: "Sound off", length: "Length", next: "Next target", points: "pts", wall: "You hit the wall", self: "You crossed your own body", summary: (score: number, length: number) => `Score ${score}, length ${length}` },
    ja: { pause: "一時停止", resume: "続ける", soundOn: "サウンドオン", soundOff: "サウンドオフ", length: "長さ", next: "次の目標", points: "点", wall: "壁に衝突しました", self: "自分の体に衝突しました", summary: (score: number, length: number) => `スコア ${score}、長さ ${length}` },
    zh: { pause: "暂停", resume: "继续", soundOn: "声音开启", soundOff: "声音关闭", length: "长度", next: "下一个目标", points: "分", wall: "撞到了墙", self: "撞到了自己的身体", summary: (score: number, length: number) => `得分 ${score}，长度 ${length}` },
    fr: { pause: "Pause", resume: "Continuer", soundOn: "Son activé", soundOff: "Son coupé", length: "Longueur", next: "Prochain objectif", points: "pts", wall: "Vous avez heurté le mur", self: "Vous avez croisé votre propre corps", summary: (score: number, length: number) => `Score ${score}, longueur ${length}` },
    es: { pause: "Pausa", resume: "Continuar", soundOn: "Sonido activado", soundOff: "Sonido desactivado", length: "Longitud", next: "Próximo objetivo", points: "pts", wall: "Chocaste contra la pared", self: "Chocaste contra tu propio cuerpo", summary: (score: number, length: number) => `Puntuación ${score}, longitud ${length}` },
} as const;

const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

const SnakeGame: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const d = DETAILS[(locale as keyof typeof DETAILS)] ?? DETAILS.en;

    const [game, setGame] = useState<SnakeState | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [best, setBest] = useState(0);
    const [muted, setMuted] = useState(false);
    const [deathCause, setDeathCause] = useState<SnakeDeathCause | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const gameRef = useRef<SnakeState | null>(null);
    const prevSnakeRef = useRef<SnakePoint[]>([]);
    const audioRef = useRef<AudioContext | null>(null);
    const previousScoreRef = useRef(0);
    const previousStatusRef = useRef<string>('idle');
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const queuedDirectionRef = useRef<SnakeDirection | null>(null);
    const activeTouchDirRef = useRef<SnakeDirection | null>(null);
    const touchTimerRef = useRef<number | null>(null);

    // VFX Refs
    const particlesRef = useRef<SnakeParticle[]>([]);
    const ripplesRef = useRef<SnakeRipple[]>([]);
    const recoilShakeRef = useRef<number>(0);
    const streakRef = useRef<number>(0);

    const score = game?.score ?? 0;
    const status = game?.status ?? 'idle';
    const length = game?.snake.length ?? 1;
    gameRef.current = game;

    const initAudio = useCallback(() => {
        if (!muted && !audioRef.current && typeof window !== 'undefined') {
            try {
                const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                if (AudioCtx) audioRef.current = new AudioCtx();
            } catch {
                /* audio is optional */
            }
        }
        if (audioRef.current && audioRef.current.state === 'suspended') {
            audioRef.current.resume().catch(() => {});
        }
    }, [muted]);

    const playEatSound = useCallback((streak: number) => {
        if (muted || !audioRef.current) return;
        const ctx = audioRef.current;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const note = PENTATONIC[(streak - 1) % PENTATONIC.length];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(note * 1.4, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    }, [muted]);

    const playDeathSound = useCallback(() => {
        if (muted || !audioRef.current) return;
        const ctx = audioRef.current;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    }, [muted]);

    const vibrate = useCallback((pattern: number | number[]) => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate(pattern); } catch { /* ignore */ }
        }
    }, []);

    const initGame = useCallback(() => {
        initAudio();
        queuedDirectionRef.current = null;
        particlesRef.current = [];
        ripplesRef.current = [];
        recoilShakeRef.current = 0;
        streakRef.current = 0;
        setDeathCause(null);
        const newGame = createSnakeGame(Date.now());
        prevSnakeRef.current = newGame.snake.map((pt) => ({ ...pt }));
        setGame(newGame);
    }, [initAudio]);

    const changeDir = useCallback((nx: number, ny: number) => {
        initAudio();
        const requested = { x: nx, y: ny };
        setGame((current) => {
            if (!current) return current;
            const buffered = bufferSnakeDirection(current.direction, queuedDirectionRef.current, requested, current.snake.length);
            if (!buffered) return current;
            if (current.status === 'playing') {
                queuedDirectionRef.current = buffered;
                return current;
            }
            queuedDirectionRef.current = null;
            return steerSnake(current, buffered);
        });
    }, [initAudio]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (status !== 'ready' && status !== 'playing' && status !== 'paused') return;
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    changeDir(0, -1);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    changeDir(0, 1);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    changeDir(-1, 0);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    changeDir(1, 0);
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [changeDir, status]);

    // 120fps continuous RAF loop with sub-grid interpolation
    useEffect(() => {
        let raf = 0;
        let lastTime: number | null = null;
        let accumulator = 0;

        const loop = (now: number) => {
            const canvas = canvasRef.current;
            if (!canvas) {
                raf = requestAnimationFrame(loop);
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                raf = requestAnimationFrame(loop);
                return;
            }

            const delta = lastTime === null ? 0 : Math.min(250, Math.max(0, now - lastTime));
            lastTime = now;

            // Handle game ticks if playing
            let current = gameRef.current;
            let changed = false;

            if (current?.status === 'playing') {
                accumulator += delta;
                let steps = 0;
                while (current?.status === 'playing' && accumulator >= snakeTickMilliseconds(current.score) && steps < 4) {
                    const interval = snakeTickMilliseconds(current.score);
                    prevSnakeRef.current = current.snake.map((pt) => ({ ...pt }));

                    const queued = queuedDirectionRef.current;
                    if (queued) {
                        current = steerSnake(current, queued);
                        queuedDirectionRef.current = null;
                    }

                    const result = tickSnakeWithCause(current);
                    current = result.state;
                    if (result.deathCause) setDeathCause(result.deathCause);

                    accumulator -= interval;
                    steps += 1;
                    changed = true;
                }
                if (steps === 4 && current) {
                    accumulator = Math.min(accumulator, snakeTickMilliseconds(current.score));
                }
                if (changed && current) {
                    gameRef.current = current;
                    setGame(current);
                }
            }

            // High-DPI Canvas Resolution
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const targetW = Math.floor(rect.width * dpr);
            const targetH = Math.floor(rect.height * dpr);

            if (canvas.width !== targetW || canvas.height !== targetH) {
                canvas.width = targetW;
                canvas.height = targetH;
            }

            // Update VFX
            particlesRef.current = updateSnakeParticles(particlesRef.current, delta);
            ripplesRef.current = updateSnakeRipples(ripplesRef.current, delta);
            recoilShakeRef.current *= 0.9;

            // Calculate interpolation progress (0.0 to 1.0)
            const tickInterval = current ? snakeTickMilliseconds(current.score) : 150;
            const progress = current?.status === 'playing' ? Math.min(1, Math.max(0, accumulator / tickInterval)) : 1;

            ctx.save();
            ctx.scale(dpr, dpr);

            const activeSnake = current?.snake ?? [{ x: 10, y: 10 }];
            const prevSnake = prevSnakeRef.current.length > 0 ? prevSnakeRef.current : activeSnake;

            renderSnakeCanvas(ctx, rect.width, rect.height, {
                snake: activeSnake,
                prevSnake,
                progress,
                food: current?.food ?? { x: 5, y: 5 },
                direction: current?.direction ?? { x: 1, y: 0 },
                status: current?.status ?? 'idle',
                particles: particlesRef.current,
                ripples: ripplesRef.current,
                now,
                recoilShake: recoilShakeRef.current,
                gridSize: SNAKE_GRID_SIZE,
                activeTouchDir: activeTouchDirRef.current,
            });

            ctx.restore();

            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    // Load save
    useEffect(() => {
        const saved = loadSnakeSave();
        if (saved) {
            const restored = saved.state.status === 'playing' ? pauseSnake(saved.state) : saved.state;
            prevSnakeRef.current = restored.snake.map((pt) => ({ ...pt }));
            setGame(restored);
        }
        setHydrated(true);
    }, []);

    // Sync save
    useEffect(() => {
        if (!hydrated) return;
        if (status === 'over') {
            clearSnakeSave();
            return;
        }
        if (game && (status === 'ready' || status === 'paused')) storeSnakeSave(game);
    }, [game, hydrated, status]);

    useEffect(() => {
        if (!hydrated) return;
        const saveInterval = window.setInterval(() => {
            const current = gameRef.current;
            if (current && current.status !== 'over') storeSnakeSave(current);
        }, 1000);
        return () => window.clearInterval(saveInterval);
    }, [hydrated]);

    // Visibility change
    useEffect(() => {
        const handleVisibility = () => {
            if (!document.hidden) return;
            queuedDirectionRef.current = null;
            setGame((current) => {
                if (!current) return current;
                const paused = pauseSnake(current);
                if (paused.status !== 'over') storeSnakeSave(paused);
                return paused;
            });
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // High score recording
    useEffect(() => {
        if (score > best) {
            recordAchievementEvent('snake-game', 'personal-best');
            setBest(recordBest('snake-game', score, 'score', undefined, { trackPlay: false }).value);
        }
    }, [score, best]);

    // Score & Over sound / VFX triggers
    useEffect(() => {
        const canvas = canvasRef.current;
        const rect = canvas ? canvas.getBoundingClientRect() : null;
        const cellW = rect ? rect.width / SNAKE_GRID_SIZE : 16;
        const cellH = rect ? rect.height / SNAKE_GRID_SIZE : 16;

        if (score > previousScoreRef.current) {
            streakRef.current += 1;
            playEatSound(streakRef.current);
            vibrate(12);
            recoilShakeRef.current = 4;

            if (rect && game?.snake[0]) {
                const head = game.snake[0];
                const pxX = (head.x + 0.5) * cellW;
                const pxY = (head.y + 0.5) * cellH;
                particlesRef.current.push(...createEatSparks(pxX, pxY, '#38bdf8', 22));
                ripplesRef.current.push(createSnakeRipple(pxX, pxY, '#38bdf8', 46));
            }
        }
        if (status === 'over' && previousStatusRef.current !== 'over') {
            streakRef.current = 0;
            playDeathSound();
            vibrate([40, 40, 80]);
            recoilShakeRef.current = 10;
            recordAchievementEvent('snake-game', 'played');

            if (rect && game?.snake[0]) {
                const head = game.snake[0];
                const pxX = (head.x + 0.5) * cellW;
                const pxY = (head.y + 0.5) * cellH;
                particlesRef.current.push(...createDeathExplosion(pxX, pxY, 36));
                ripplesRef.current.push(createSnakeRipple(pxX, pxY, '#ef4444', 60));
            }
        }
        previousScoreRef.current = score;
        previousStatusRef.current = status;
    }, [game?.snake, playDeathSound, playEatSound, score, status, vibrate]);

    // Load best
    useEffect(() => {
        const existing = getBest('snake-game');
        if (existing) {
            setBest(existing.value);
            return;
        }
        try {
            const legacy = Number(localStorage.getItem(LEGACY_BEST_KEY));
            if (Number.isFinite(legacy) && legacy > 0) {
                setBest(recordBest('snake-game', legacy, 'score', undefined, { trackPlay: false }).value);
            }
        } catch {
            /* ignore */
        }
    }, []);

    // Sub-millisecond touch/swipe handlers directly on the canvas surface
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        initAudio();
        touchStart.current = { x: e.clientX, y: e.clientY };

        // If ready, any touch starts the game in default or tapped direction
        if (status === 'ready' || status === 'idle') {
            if (status === 'idle') {
                initGame();
                return;
            }
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                const midX = rect.width / 2;
                const midY = rect.height / 2;
                const dir = calculateSwipeDirection(clickX - midX, clickY - midY, 15);
                changeDir(dir?.x ?? 1, dir?.y ?? 0);
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!touchStart.current) return;
        if (status !== 'playing' && status !== 'ready' && status !== 'paused') return;

        const dx = e.clientX - touchStart.current.x;
        const dy = e.clientY - touchStart.current.y;
        const dir = calculateSwipeDirection(dx, dy, 18);

        if (dir) {
            changeDir(dir.x, dir.y);
            activeTouchDirRef.current = dir;
            if (touchTimerRef.current) window.clearTimeout(touchTimerRef.current);
            touchTimerRef.current = window.setTimeout(() => {
                activeTouchDirRef.current = null;
            }, 180);
            // Continuous swipe tracking
            touchStart.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handlePointerUp = () => {
        touchStart.current = null;
    };

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={status === 'idle' ? undefined : initGame}>
            <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex gap-2">
                    {status === 'playing' && (
                        <button
                            type="button"
                            onClick={() => setGame((current) => current ? pauseSnake(current) : current)}
                            className="min-h-11 rounded-xl border border-border bg-muted px-4 text-xs font-bold"
                        >
                            {d.pause}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setMuted((value) => !value)}
                        aria-pressed={muted}
                        className="min-h-11 rounded-xl border border-border bg-muted px-4 text-xs font-bold"
                    >
                        {muted ? d.soundOff : d.soundOn}
                    </button>
                </div>
                <div>
                    <span className="text-xs font-black text-muted-foreground uppercase">{t.score}</span>
                    <div className="text-2xl font-black text-primary leading-none">{score}</div>
                </div>
            </div>

            {/* 100% Canvas GPU Game Arena */}
            <div
                data-game-surface
                className="relative aspect-square w-full max-w-sm mx-auto rounded-2xl border border-border overflow-hidden touch-none select-none bg-[#03060c] shadow-xl"
            >
                <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="w-full h-full block cursor-pointer touch-none"
                    aria-label={t.title}
                />

                {status !== 'playing' && (
                    <div
                        className={`absolute inset-0 bg-background/70 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 ${status === 'ready' ? 'pointer-events-none' : ''}`}
                        role="status"
                        aria-live="polite"
                    >
                        {status === 'idle' ? (
                            <div className="space-y-4">
                                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
                                    <span className="text-3xl">🚀</span>
                                </div>
                                <button
                                    onClick={initGame}
                                    className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
                                >
                                    {t.start}
                                </button>
                            </div>
                        ) : status === 'ready' ? (
                            <p className="max-w-64 rounded-2xl bg-background/90 px-5 py-4 text-sm font-bold text-foreground shadow-sm border border-border">
                                {t.ready}
                            </p>
                        ) : status === 'paused' ? (
                            <button
                                type="button"
                                onClick={() => setGame((current) => current ? resumeSnake(current) : current)}
                                className="pointer-events-auto min-h-11 rounded-full bg-primary px-8 font-bold text-primary-foreground shadow-lg"
                            >
                                {d.resume}
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <h4 className="text-2xl font-black text-destructive">{t.over}</h4>
                                {deathCause && <p className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-black text-destructive">{d[deathCause]}</p>}
                                <p className="text-sm font-medium text-muted-foreground">{t.rank(Math.floor(score / 10))}</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="rounded-xl bg-background/80 p-3 border border-border"><strong>{score}</strong><br />{d.points}</div>
                                    <div className="rounded-xl bg-background/80 p-3 border border-border"><strong>{length}</strong><br />{d.length}</div>
                                </div>
                                <p className="text-xs font-bold text-muted-foreground">{d.next}: {Math.max(best, score) + 10} {d.points}</p>
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

            {/* Mobile Virtual Direction Pad */}
            <div className="mt-4 flex flex-col items-center gap-2 sm:pointer-fine:hidden touch-none" aria-label="터치 방향키">
                <button
                    type="button"
                    data-game-control
                    aria-label="위로 이동"
                    onPointerDown={(e) => { e.preventDefault(); changeDir(0, -1); }}
                    className="w-12 h-12 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-lg font-black text-foreground shadow-xs active:bg-primary/20 active:border-primary active:scale-95 transition-all"
                >
                    ▲
                </button>
                <div className="flex gap-4">
                    <button
                        type="button"
                        data-game-control
                        aria-label="왼쪽 이동"
                        onPointerDown={(e) => { e.preventDefault(); changeDir(-1, 0); }}
                        className="w-12 h-12 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-lg font-black text-foreground shadow-xs active:bg-primary/20 active:border-primary active:scale-95 transition-all"
                    >
                        ◀
                    </button>
                    <button
                        type="button"
                        data-game-control
                        aria-label="아래로 이동"
                        onPointerDown={(e) => { e.preventDefault(); changeDir(0, 1); }}
                        className="w-12 h-12 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-lg font-black text-foreground shadow-xs active:bg-primary/20 active:border-primary active:scale-95 transition-all"
                    >
                        ▼
                    </button>
                    <button
                        type="button"
                        data-game-control
                        aria-label="오른쪽 이동"
                        onPointerDown={(e) => { e.preventDefault(); changeDir(1, 0); }}
                        className="w-12 h-12 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-lg font-black text-foreground shadow-xs active:bg-primary/20 active:border-primary active:scale-95 transition-all"
                    >
                        ▶
                    </button>
                </div>
            </div>

            <div className="mt-6 flex justify-between text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                <span>{t.hint}</span>
                <span>{t.best}: {best}</span>
            </div>
            <p className="sr-only" aria-live="polite">{d.summary(score, length)}. {status}.</p>
        </GameContainer>
    );
};

export default SnakeGame;
