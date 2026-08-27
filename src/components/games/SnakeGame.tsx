import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { getBest, recordAchievementEvent, recordBest } from '../../lib/games/records';
import { bufferSnakeDirection, createSnakeGame, pauseSnake, resumeSnake, SNAKE_GRID_SIZE, snakeTickMilliseconds, steerSnake, tickSnakeWithCause, type SnakeDeathCause, type SnakeDirection, type SnakeState } from '../../lib/games/snake';
import { clearSnakeSave, loadSnakeSave, storeSnakeSave } from '../../lib/games/snake-save';
import { SNAKE_SPRITES } from '../../lib/games/sprites';

const LEGACY_BEST_KEY = 'oiyo-snake-best'; // pre-unification key, read once for migration

const COPY = {
    ko: { title: "스네이크 게임", subtitle: "Know-how Accumulation", score: "경력(경험치)", best: "최고 커리어", start: "게임 준비", ready: "방향키를 누르거나 스와이프하면 시작합니다", over: "번아웃 발생!", reset: "재충전 후 다시 시작", hint: "방향키 또는 스와이프", rank: (n: number) => `최종 등급: ${n}성` },
    en: { title: "Career Growth Snake", subtitle: "Know-how Accumulation", score: "Exp", best: "Best Career", start: "Get ready", ready: "Press an arrow key or swipe to begin", over: "Burnout!", reset: "Restart after Recharge", hint: "Arrow keys or swipe", rank: (n: number) => `Final Rank: ${n} Stars` },
    ja: { title: "キャリア成長スネーク", subtitle: "Know-how Accumulation", score: "経験値", best: "ベストキャリア", start: "準備する", ready: "矢印キーまたはスワイプで開始", over: "バーンアウト発生！", reset: "充電して再スタート", hint: "矢印キーまたはスワイプ", rank: (n: number) => `最終ランク: ${n}つ星` },
    zh: { title: "职业成长贪吃蛇", subtitle: "Know-how Accumulation", score: "经验值", best: "最佳职业", start: "准备游戏", ready: "按方向键或滑动即可开始", over: "职业倦怠！", reset: "充电后重新开始", hint: "方向键或滑动", rank: (n: number) => `最终评级: ${n}星` },
    fr: { title: "Snake de carrière", subtitle: "Know-how Accumulation", score: "XP", best: "Meilleure carrière", start: "Se préparer", ready: "Appuyez sur une flèche ou glissez pour commencer", over: "Burnout !", reset: "Recharger et recommencer", hint: "Flèches ou glisser", rank: (n: number) => `Rang final : ${n} étoiles` },
    es: { title: "Snake de carrera", subtitle: "Know-how Accumulation", score: "XP", best: "Mejor carrera", start: "Prepararse", ready: "Pulsa una flecha o desliza para empezar", over: "¡Burnout!", reset: "Recargar y reiniciar", hint: "Flechas o desliza", rank: (n: number) => `Rango final: ${n} estrellas` },
} as const;

const DETAILS = {
    ko: { pause: "일시정지", resume: "계속하기", soundOn: "소리 켜짐", soundOff: "소리 꺼짐", length: "길이", next: "다음 목표", points: "점", wall: "벽과 충돌했습니다", self: "몸통과 충돌했습니다", summary: (score: number, length: number) => `점수 ${score}, 길이 ${length}` },
    en: { pause: "Pause", resume: "Resume", soundOn: "Sound on", soundOff: "Sound off", length: "Length", next: "Next target", points: "pts", wall: "You hit the wall", self: "You crossed your own body", summary: (score: number, length: number) => `Score ${score}, length ${length}` },
    ja: { pause: "一時停止", resume: "続ける", soundOn: "サウンドオン", soundOff: "サウンドオフ", length: "長さ", next: "次の目標", points: "点", wall: "壁に衝突しました", self: "自分の体に衝突しました", summary: (score: number, length: number) => `スコア ${score}、長さ ${length}` },
    zh: { pause: "暂停", resume: "继续", soundOn: "声音开启", soundOff: "声音关闭", length: "长度", next: "下一个目标", points: "分", wall: "撞到了墙", self: "撞到了自己的身体", summary: (score: number, length: number) => `得分 ${score}，长度 ${length}` },
    fr: { pause: "Pause", resume: "Continuer", soundOn: "Son activé", soundOff: "Son coupé", length: "Longueur", next: "Prochain objectif", points: "pts", wall: "Vous avez heurté le mur", self: "Vous avez croisé votre propre corps", summary: (score: number, length: number) => `Score ${score}, longueur ${length}` },
    es: { pause: "Pausa", resume: "Continuar", soundOn: "Sonido activado", soundOff: "Sonido desactivado", length: "Longitud", next: "Próximo objetivo", points: "pts", wall: "Chocaste contra la pared", self: "Chocaste contra tu propio cuerpo", summary: (score: number, length: number) => `Puntuación ${score}, longitud ${length}` },
} as const;

const SnakeGame: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const d = DETAILS[(locale as keyof typeof DETAILS)] ?? DETAILS.en;

    const [game, setGame] = useState<SnakeState | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [best, setBest] = useState(0);
    const [muted, setMuted] = useState(false);
    const [deathCause, setDeathCause] = useState<SnakeDeathCause | null>(null);
    const gameRef = useRef<SnakeState | null>(null);
    const audioRef = useRef<AudioContext | null>(null);
    const previousScoreRef = useRef(0);
    const previousStatusRef = useRef<string>('idle');
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const queuedDirectionRef = useRef<SnakeDirection | null>(null);
    const score = game?.score ?? 0;
    const status = game?.status ?? 'idle';
    const length = game?.snake.length ?? 1;
    gameRef.current = game;

    const initGame = () => {
        if (!muted && !audioRef.current) {
            try { audioRef.current = new AudioContext(); } catch { /* audio is optional */ }
        }
        queuedDirectionRef.current = null;
        setDeathCause(null);
        setGame(createSnakeGame(Date.now()));
    };

    const playTone = useCallback((frequency: number, duration: number) => {
        if (muted || !audioRef.current) return;
        const context = audioRef.current;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.05, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
    }, [muted]);

    const changeDir = useCallback((nx: number, ny: number) => {
        const requested = { x: nx, y: ny };
        setGame((current) => {
            if (!current) return current;
            const buffered = bufferSnakeDirection(current.direction, queuedDirectionRef.current, requested, current.snake.length);
            if (!buffered) return current;
            if (current.status === 'playing') { queuedDirectionRef.current = buffered; return current; }
            queuedDirectionRef.current = null;
            return steerSnake(current, buffered);
        });
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (status !== 'ready' && status !== 'playing' && status !== 'paused') return;
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
        let raf = 0, last: number | null = null, accumulator = 0;
        const loop = (now: number) => {
            const delta = last === null ? 0 : Math.min(250, Math.max(0, now - last));
            last = now;
            accumulator += delta;
            let current = gameRef.current;
            let changed = false, steps = 0;
            while (current?.status === 'playing' && accumulator >= snakeTickMilliseconds(current.score) && steps < 4) {
                const interval = snakeTickMilliseconds(current.score);
                const queued = queuedDirectionRef.current;
                if (queued) { current = steerSnake(current, queued); queuedDirectionRef.current = null; }
                const result = tickSnakeWithCause(current);
                current = result.state;
                if (result.deathCause) setDeathCause(result.deathCause);
                accumulator -= interval;
                steps += 1;
                changed = true;
            }
            if (steps === 4 && current) accumulator = Math.min(accumulator, snakeTickMilliseconds(current.score));
            if (changed && current) { gameRef.current = current; setGame(current); }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [status]);

    useEffect(() => {
        const saved = loadSnakeSave();
        if (saved) setGame(saved.state.status === 'playing' ? pauseSnake(saved.state) : saved.state);
        setHydrated(true);
    }, []);

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

    useEffect(() => {
        if (score > best) {
            recordAchievementEvent('snake-game', 'personal-best');
            setBest(recordBest('snake-game', score, 'score', undefined, { trackPlay: false }).value);
        }
    }, [score, best]);

    useEffect(() => {
        if (score > previousScoreRef.current) playTone(620, 0.12);
        if (status === 'over' && previousStatusRef.current !== 'over') { playTone(150, 0.3); recordAchievementEvent('snake-game', 'played'); }
        previousScoreRef.current = score;
        previousStatusRef.current = status;
    }, [playTone, score, status]);

    useEffect(() => {
        const existing = getBest('snake-game');
        if (existing) { setBest(existing.value); return; }
        // One-time migration from the pre-unification per-game key
        try {
            const legacy = Number(localStorage.getItem(LEGACY_BEST_KEY));
            if (Number.isFinite(legacy) && legacy > 0) setBest(recordBest('snake-game', legacy, 'score', undefined, { trackPlay: false }).value);
        } catch { /* ignore */ }
    }, []);

    const onTouchStart = (e: React.TouchEvent) => {
        const tch = e.touches[0];
        touchStart.current = { x: tch.clientX, y: tch.clientY };
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current || (status !== 'ready' && status !== 'playing' && status !== 'paused')) return;
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
            <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex gap-2">
                    {status === 'playing' && <button type="button" onClick={() => setGame((current) => current ? pauseSnake(current) : current)} className="min-h-11 rounded-xl border border-border bg-muted px-4 text-xs font-bold">{d.pause}</button>}
                    <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} className="min-h-11 rounded-xl border border-border bg-muted px-4 text-xs font-bold">{muted ? d.soundOff : d.soundOn}</button>
                </div>
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
                <svg viewBox={`0 0 ${SNAKE_GRID_SIZE} ${SNAKE_GRID_SIZE}`} className="w-full h-full" aria-label={t.title}>
                    <rect
                        x={(game?.food.x ?? 5) + 0.1} y={(game?.food.y ?? 5) + 0.1} width={0.8} height={0.8} rx="0.2"
                        className="fill-chart-1 animate-pulse motion-reduce:animate-none"
                    />
                    <image
                        href={SNAKE_SPRITES.apple}
                        x={(game?.food.x ?? 5)}
                        y={(game?.food.y ?? 5)}
                        width={1}
                        height={1}
                    />
                    {(game?.snake ?? [{ x: 10, y: 10 }]).map((segment, i) => {
                        if (i === 0) {
                            const dir = game?.direction ?? { x: 1, y: 0 };
                            const angle = dir.x === 1 ? 0 : dir.x === -1 ? 180 : dir.y === 1 ? 90 : -90;
                            const cx = segment.x + 0.5;
                            const cy = segment.y + 0.5;
                            return (
                                <image
                                    key={i}
                                    href={SNAKE_SPRITES.head}
                                    x={segment.x}
                                    y={segment.y}
                                    width={1}
                                    height={1}
                                    transform={`rotate(${angle} ${cx} ${cy})`}
                                />
                            );
                        }
                        return (
                            <image
                                key={i}
                                href={SNAKE_SPRITES.body}
                                x={segment.x}
                                y={segment.y}
                                width={1}
                                height={1}
                            />
                        );
                    })}
                </svg>

                {status !== 'playing' && (
                    <div className={`absolute inset-0 bg-background/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 ${status === 'ready' ? 'pointer-events-none' : ''}`} role="status" aria-live="polite">
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
                        ) : status === 'ready' ? (
                            <p className="max-w-64 rounded-2xl bg-background/90 px-5 py-4 text-sm font-bold text-foreground shadow-sm">{t.ready}</p>
                        ) : status === 'paused' ? (
                            <button type="button" onClick={() => setGame((current) => current ? resumeSnake(current) : current)} className="pointer-events-auto min-h-11 rounded-full bg-primary px-8 font-bold text-primary-foreground shadow-lg">{d.resume}</button>
                        ) : (
                            <div className="space-y-4">
                                <h4 className="text-2xl font-black text-destructive">{t.over}</h4>
                                {deathCause && <p className="rounded-xl bg-destructive/10 px-4 py-2 text-sm font-black text-destructive">{d[deathCause]}</p>}
                                <p className="text-sm font-medium text-muted-foreground">{t.rank(score / 10)}</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="rounded-xl bg-background/80 p-3"><strong>{score}</strong><br />{d.points}</div>
                                    <div className="rounded-xl bg-background/80 p-3"><strong>{length}</strong><br />{d.length}</div>
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

            <div className="mt-6 flex justify-between text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                <span>{t.hint}</span>
                <span>{t.best}: {best}</span>
            </div>
            <p className="sr-only" aria-live="polite">{d.summary(score, length)}. {status}.</p>
        </GameContainer>
    );
};

export default SnakeGame;
