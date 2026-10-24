/**
 * SnakeGame.tsx - 100% Canvas GPU 120fps Modern Engine
 * Argon-style neon aesthetics, continuous sub-grid interpolation,
 * 0ms mobile touch & swipe responsiveness, procedural Web Audio synth.
 *
 * Date: 2026-10-17
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameShell } from '../ui/game/GameShell';
import type { FlowPhase } from '../../lib/games/game-flow';
import { getGlobalBgmController } from '../../lib/games/bgm';
import {
    AUGMENTS_CATALOG,
    calculateAugmentedTickInterval,
    isAugmentMilestone,
    rollAugmentChoices,
    type AugmentId,
    type AugmentInfo,
} from '../../lib/games/snake-augments';
import { getBest, recordAchievementEvent, recordBest } from '../../lib/games/records';
import type { Locale } from '../../lib/i18n';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { celebrate } from '../../lib/games/celebration';
import { SNAKE_GAME_SPRITES } from '../../lib/games/sprites';
import {
    bufferSnakeDirection,
    createSnakeGame,
    pauseSnake,
    resumeSnake,
    SNAKE_GRID_SIZE,
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
    ko: { pause: "일시정지", resume: "계속하기", soundOn: "소리 켜짐", soundOff: "소리 꺼짐", length: "길이", next: "다음 목표", points: "점", wall: "벽과 충돌했습니다", self: "몸통과 충돌했습니다", summary: (score: number, length: number) => `점수 ${score}, 길이 ${length}`, draftTitle: "스킬 증강 선택 (50점 돌파)", draftHint: "[1], [2], [3] 키 또는 카드를 터치하여 선택", activeAugments: "보유 증강" },
    en: { pause: "Pause", resume: "Resume", soundOn: "Sound on", soundOff: "Sound off", length: "Length", next: "Next target", points: "pts", wall: "You hit the wall", self: "You crossed your own body", summary: (score: number, length: number) => `Score ${score}, length ${length}`, draftTitle: "Augment Draft (50pt Milestone)", draftHint: "Press [1], [2], [3] or tap a card to choose", activeAugments: "Augments" },
    ja: { pause: "一時停止", resume: "続ける", soundOn: "サウンドオン", soundOff: "サウンドオフ", length: "長さ", next: "次の目標", points: "点", wall: "壁に衝突しました", self: "自分の体に衝突しました", summary: (score: number, length: number) => `スコア ${score}、長さ ${length}`, draftTitle: "スキル増強選択 (50点達成)", draftHint: "[1], [2], [3]キーまたはタップして選択", activeAugments: "保有スキル" },
    zh: { pause: "暂停", resume: "继续", soundOn: "声音开启", soundOff: "声音关闭", length: "长度", next: "下一个目标", points: "分", wall: "撞到了墙", self: "撞到了自己的身体", summary: (score: number, length: number) => `得分 ${score}，长度 ${length}`, draftTitle: "技能增益选择 (50分里程碑)", draftHint: "按 [1], [2], [3] 或点击卡片选择", activeAugments: "拥有增益" },
    fr: { pause: "Pause", resume: "Continuer", soundOn: "Son activé", soundOff: "Son coupé", length: "Longueur", next: "Prochain objectif", points: "pts", wall: "Vous avez heurté le mur", self: "Vous avez croisé votre propre corps", summary: (score: number, length: number) => `Score ${score}, longueur ${length}`, draftTitle: "Choix d'amélioration (50 pts)", draftHint: "Appuyez sur [1], [2], [3] ou touchez une carte", activeAugments: "Améliorations" },
    es: { pause: "Pausa", resume: "Continuar", soundOn: "Sonido activado", soundOff: "Sonido desactivado", length: "Longitud", next: "Próximo objetivo", points: "pts", wall: "Chocaste contra la pared", self: "Chocaste contra tu propio cuerpo", summary: (score: number, length: number) => `Puntuación ${score}, longitud ${length}`, draftTitle: "Selección de aumento (50 pts)", draftHint: "Pulsa [1], [2], [3] o toca una carta", activeAugments: "Aumentos" },
} as const;

const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

const SnakeGame: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const loc = (locale as Locale) || 'ko';
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const d = DETAILS[(locale as keyof typeof DETAILS)] ?? DETAILS.en;

    const [game, setGame] = useState<SnakeState | null>(null);
    const [phase, setPhase] = useState<FlowPhase>('title');
    const [activeAugments, setActiveAugments] = useState<AugmentId[]>([]);
    const activeAugmentsRef = useRef<AugmentId[]>([]);
    activeAugmentsRef.current = activeAugments;

    const [ghostCharges, setGhostCharges] = useState(0);
    const ghostChargesRef = useRef(0);
    ghostChargesRef.current = ghostCharges;

    const [draftChoices, setDraftChoices] = useState<AugmentInfo[] | null>(null);
    const draftChoicesRef = useRef<AugmentInfo[] | null>(null);
    draftChoicesRef.current = draftChoices;

    const lastMilestoneRef = useRef<number>(0);
    const [hydrated, setHydrated] = useState(false);
    const [best, setBest] = useState(0);
    const [muted, setMuted] = useState<boolean>(() => {
        try {
            return localStorage.getItem('snake_game_muted') === 'true';
        } catch {
            return false;
        }
    });
    const [deathCause, setDeathCause] = useState<SnakeDeathCause | null>(null);

    const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });

    const toggleMute = useCallback(() => {
        setMuted((prev) => {
            const next = !prev;
            try { localStorage.setItem('snake_game_muted', String(next)); } catch {}
            getGlobalBgmController("arcade").setMuted(next);
            return next;
        });
    }, []);

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

    const selectAugment = useCallback((choice: AugmentInfo) => {
        activeAugmentsRef.current.push(choice.id);
        setActiveAugments([...activeAugmentsRef.current]);
        if (choice.id === 'ghost') {
            ghostChargesRef.current += 1;
            setGhostCharges(ghostChargesRef.current);
        }
        setDraftChoices(null);
        draftChoicesRef.current = null;
        vibrate([15, 20, 25]);
        playEatSound(streakRef.current + 3);
        getGlobalBgmController('arcade').duck(10, 1.0);
        setGame((current) => current ? resumeSnake(current) : current);
    }, [playEatSound, vibrate]);

    const initGame = useCallback(() => {
        initAudio();
        queuedDirectionRef.current = null;
        particlesRef.current = [];
        ripplesRef.current = [];
        recoilShakeRef.current = 0;
        streakRef.current = 0;
        lastMilestoneRef.current = 0;
        setActiveAugments([]);
        activeAugmentsRef.current = [];
        setGhostCharges(0);
        ghostChargesRef.current = 0;
        setDraftChoices(null);
        draftChoicesRef.current = null;
        setDeathCause(null);
        const newGame = createSnakeGame(Date.now());
        prevSnakeRef.current = newGame.snake.map((pt) => ({ ...pt }));
        setGame(newGame);
        setPhase('play');
        const bgm = getGlobalBgmController('arcade');
        bgm.start('arcade');
        bgm.setMuted(muted);
    }, [initAudio, muted]);

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
            // When drafting augments, 1, 2, 3 selects the option
            if (draftChoicesRef.current) {
                if (e.key === '1' && draftChoicesRef.current[0]) {
                    e.preventDefault();
                    selectAugment(draftChoicesRef.current[0]);
                    return;
                }
                if (e.key === '2' && draftChoicesRef.current[1]) {
                    e.preventDefault();
                    selectAugment(draftChoicesRef.current[1]);
                    return;
                }
                if (e.key === '3' && draftChoicesRef.current[2]) {
                    e.preventDefault();
                    selectAugment(draftChoicesRef.current[2]);
                    return;
                }
            }

            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                togglePortal();
                return;
            }
            if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                toggleMute();
                return;
            }
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                setGame((current) => {
                    if (!current) return current;
                    if (current.status === 'playing') return pauseSnake(current);
                    if (current.status === 'paused') return resumeSnake(current);
                    return current;
                });
                return;
            }

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
    }, [changeDir, status, toggleMute, togglePortal]);

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

            if (current?.status === 'playing' && !draftChoicesRef.current) {
                accumulator += delta;
                let steps = 0;
                const hasSlow = activeAugmentsRef.current.includes('slow');
                const interval = calculateAugmentedTickInterval(current.score, hasSlow);

                while (current?.status === 'playing' && accumulator >= interval && steps < 4) {
                    prevSnakeRef.current = current.snake.map((pt) => ({ ...pt }));

                    const queued = queuedDirectionRef.current;
                    if (queued) {
                        current = steerSnake(current, queued);
                        queuedDirectionRef.current = null;
                    }

                    // Food magnet pulling effect
                    if (activeAugmentsRef.current.includes('magnet')) {
                        const head = current.snake[0];
                        const dist = Math.abs(head.x - current.food.x) + Math.abs(head.y - current.food.y);
                        if (dist <= 3 && dist > 1) {
                            const dx = Math.sign(head.x - current.food.x);
                            const dy = Math.sign(head.y - current.food.y);
                            current = {
                                ...current,
                                food: {
                                    x: dx !== 0 ? current.food.x + dx : current.food.x,
                                    y: dx === 0 && dy !== 0 ? current.food.y + dy : current.food.y,
                                },
                            };
                        }
                    }

                    // Golden apple bonus
                    let goldenBonus = 0;
                    if (activeAugmentsRef.current.includes('golden') && Math.random() < 0.3) {
                        goldenBonus = 20; // +20 extra for 30 total
                    }

                    const result = tickSnakeWithCause(current, {
                        wrap: activeAugmentsRef.current.includes('wrap'),
                        ghostActive: ghostChargesRef.current > 0,
                        onGhostUsed: () => {
                            ghostChargesRef.current = Math.max(0, ghostChargesRef.current - 1);
                            setGhostCharges(ghostChargesRef.current);
                            vibrate([20, 30, 20]);
                            recoilShakeRef.current = 6;
                        },
                        goldenScoreBonus: goldenBonus,
                    });

                    current = result.state;
                    if (result.deathCause) setDeathCause(result.deathCause);

                    accumulator -= interval;
                    steps += 1;
                    changed = true;
                }
                if (steps === 4 && current) {
                    accumulator = Math.min(accumulator, interval);
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
            const tickInterval = current
                ? calculateAugmentedTickInterval(current.score, activeAugmentsRef.current.includes('slow'))
                : 150;
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
            if (score > 10 && containerRef.current) {
                celebrate(containerRef.current, { preset: 'sparks' });
            }
        }
    }, [score, best, containerRef]);

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
            getGlobalBgmController('arcade').duck(180, 0.5);

            // Check Augment Draft Milestone (every 50 points)
            if (isAugmentMilestone(score, lastMilestoneRef.current)) {
                lastMilestoneRef.current = score;
                const choices = rollAugmentChoices(activeAugmentsRef.current);
                setDraftChoices(choices);
                draftChoicesRef.current = choices;
                setGame((curr) => curr ? pauseSnake(curr) : curr);
                getGlobalBgmController('arcade').duck(999999, 0.3);
            }

            if (rect && game?.snake[0]) {
                const head = game.snake[0];
                const pxX = (head.x + 0.5) * cellW;
                const pxY = (head.y + 0.5) * cellH;
                particlesRef.current.push(...createEatSparks(pxX, pxY, '#38bdf8', 22));
                ripplesRef.current.push(createSnakeRipple(pxX, pxY, '#38bdf8', 46));
            }
        }
        if (status === 'over' && previousStatusRef.current !== 'over') {
            setPhase('result');
            streakRef.current = 0;
            playDeathSound();
            vibrate([40, 40, 80]);
            recoilShakeRef.current = 10;
            getGlobalBgmController('arcade').duck(2000, 0.2);
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
        <GameShell
            title={t.title}
            subtitle={t.subtitle}
            keyart={SNAKE_GAME_SPRITES.keyart}
            phase={phase}
            score={score}
            best={best}
            muted={muted}
            onToggleMute={toggleMute}
            isImmersive={isImmersive}
            onTogglePortal={togglePortal}
            portalLabels={portalLabels}
            containerRef={containerRef}
            onStart={initGame}
            onPause={() => setGame((current) => current ? pauseSnake(current) : current)}
            onResume={() => setGame((current) => current ? resumeSnake(current) : current)}
            onRetry={initGame}
            resultTitle={t.over}
            resultSubtitle={deathCause === 'wall' ? d.wall : d.self}
            resultStats={[
                { label: t.score, value: score },
                { label: d.length, value: length },
                { label: t.best, value: best },
            ]}
            controlsHint={t.hint}
            extraHeaderActions={
                activeAugments.length > 0 ? (
                    <div className="flex items-center gap-1 overflow-x-auto max-w-44 sm:max-w-xs py-1">
                        {activeAugments.map((augId, i) => {
                            const item = AUGMENTS_CATALOG.find((a) => a.id === augId);
                            if (!item) return null;
                            return (
                                <span
                                    key={`${augId}-${i}`}
                                    title={item.name[loc] ?? item.name.en}
                                    className="px-2 py-1 rounded-lg border border-border bg-muted/60 text-xs font-bold flex items-center gap-1 shrink-0"
                                >
                                    <span>{item.icon}</span>
                                    <span className="hidden sm:inline">{item.name[loc] ?? item.name.en}</span>
                                    {augId === 'ghost' && ghostCharges > 0 && (
                                        <span className="font-mono text-primary font-black">x{ghostCharges}</span>
                                    )}
                                </span>
                            );
                        })}
                    </div>
                ) : null
            }
        >
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-background overflow-hidden p-2 sm:p-4">
                {/* 100% Canvas GPU Game Arena */}
                <div
                    data-game-surface
                    className="relative aspect-square w-full max-w-md mx-auto rounded-2xl border border-border overflow-hidden touch-none select-none bg-background shadow-xl flex items-center justify-center"
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

                    {/* Ready state overlay */}
                    {status === 'ready' && !draftChoices && (
                        <div className="absolute inset-0 bg-background/70 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-none animate-in fade-in">
                            <p className="max-w-64 rounded-2xl bg-background/90 px-5 py-4 text-sm font-bold text-foreground shadow-sm border border-border">
                                {t.ready}
                            </p>
                        </div>
                    )}

                    {/* Augment Draft Modal (Milestone Roguelite Choices) */}
                    {draftChoices && (
                        <div className="absolute inset-0 z-40 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200 pointer-events-auto">
                            <div className="max-w-md w-full space-y-3">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-black">
                                    <span>⚡</span>
                                    <span>{d.draftTitle}</span>
                                </div>
                                <h3 className="text-xl font-black text-foreground tracking-tight">
                                    {d.draftTitle}
                                </h3>
                                <p className="text-xs text-muted-foreground">{d.draftHint}</p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                                    {draftChoices.map((choice, idx) => (
                                        <button
                                            key={choice.id}
                                            type="button"
                                            onClick={() => selectAugment(choice)}
                                            className="group relative rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:border-primary hover:bg-card/80 transition-all active:scale-95 flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-2xl">{choice.icon}</span>
                                                    <span className="text-xs font-mono font-bold text-muted-foreground px-1.5 py-0.5 rounded-md border border-border bg-muted/60">
                                                        [{idx + 1}]
                                                    </span>
                                                </div>
                                                <div className="font-black text-sm text-foreground group-hover:text-primary transition-colors">
                                                    {choice.name[loc] ?? choice.name.en}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                                                    {choice.desc[loc] ?? choice.desc.en}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile Virtual Direction Pad */}
                <div className="mt-3 flex flex-col items-center gap-1.5 sm:pointer-fine:hidden touch-none shrink-0" aria-label="터치 방향키">
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

                <div className="mt-3 flex justify-between text-xs font-bold text-muted-foreground/60 uppercase tracking-widest shrink-0 max-w-sm w-full mx-auto">
                    <span>{t.hint}</span>
                    <span>{t.best}: {best}</span>
                </div>
            </div>
        </GameShell>
    );
};

export default SnakeGame;
