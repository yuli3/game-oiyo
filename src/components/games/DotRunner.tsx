import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { GameContainer } from '../ui/game/GamePrimitives';
import { frameScale } from '../../lib/games/time-contracts';
import { getBest, recordAchievementEvent, recordBest } from '../../lib/games/records';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import { clearDotRunnerSave, loadDotRunnerSave, storeDotRunnerSave } from '../../lib/games/dot-runner-save';
import {
    DOT_RUNNER_GROUND,
    DOT_RUNNER_HEIGHT,
    DOT_RUNNER_PLAYER_SIZE,
    DOT_RUNNER_PLAYER_X,
    DOT_RUNNER_WIDTH,
    createDotRunner,
    getDotRunnerPace,
    jumpDotRunner,
    nextDotRunnerGoal,
    stepDotRunner,
    type DotRunnerState,
} from '../../lib/games/dot-runner';

// ─── Dot Runner — endless runner, ported from ahoxy-legacy ────────────────────
// Jump over red blocks, grab gold coins. Rewritten from per-frame setState to a
// ref-driven canvas loop (React state only for HUD/status).

const BEST_KEY = 'oiyo-dot-runner-best';

type Status = 'idle' | 'playing' | 'paused' | 'over';

const COPY = {
    ko: { title: '닷 러너', subtitle: '리듬을 타고 장애물을 넘어 코인을 수집하세요', score: '점수', best: '최고 점수', coins: '코인', time: '생존 시간', pace: '속도', next: '다음 목표', seconds: '초', start: '게임 시작', over: '게임 오버!', newBest: '🎉 신기록!', restart: '다시 시작 (R)', pause: '일시정지 (P)', paused: '일시정지', resume: '계속 (P)', soundOn: '소리 켜기', soundOff: '소리 끄기', area: '닷 러너 게임 영역', playing: '달리는 중', hint: '탭/클릭/스페이스로 점프 · 장애물을 피하고 코인을 모으세요' },
    en: { title: 'Dot Runner', subtitle: 'Find the rhythm, clear obstacles, collect coins', score: 'Score', best: 'Best', coins: 'Coins', time: 'Survival time', pace: 'Pace', next: 'Next target', seconds: 'sec', start: 'Start', over: 'Game Over!', newBest: '🎉 New best!', restart: 'Restart (R)', pause: 'Pause (P)', paused: 'Paused', resume: 'Resume (P)', soundOn: 'Turn sound on', soundOff: 'Turn sound off', area: 'Dot Runner game area', playing: 'Running', hint: 'Tap/click/space to jump · dodge blocks, grab coins' },
    ja: { title: 'ドットランナー', subtitle: 'リズムに乗って障害物を越え、コインを集めよう', score: 'スコア', best: 'ベスト', coins: 'コイン', time: '生存時間', pace: '速度', next: '次の目標', seconds: '秒', start: 'スタート', over: 'ゲームオーバー！', newBest: '🎉 新記録！', restart: 'リスタート (R)', pause: '一時停止 (P)', paused: '一時停止', resume: '再開 (P)', soundOn: '音をオン', soundOff: '音をオフ', area: 'ドットランナーのゲーム領域', playing: '走行中', hint: 'タップ/クリック/スペースでジャンプ · 障害物を避けてコインを集めよう' },
    zh: { title: '点点酷跑', subtitle: '把握节奏，越过障碍，收集金币', score: '分数', best: '最高分', coins: '金币', time: '生存时间', pace: '速度', next: '下一目标', seconds: '秒', start: '开始游戏', over: '游戏结束！', newBest: '🎉 新纪录！', restart: '重新开始 (R)', pause: '暂停 (P)', paused: '已暂停', resume: '继续 (P)', soundOn: '开启声音', soundOff: '关闭声音', area: '点点酷跑游戏区域', playing: '奔跑中', hint: '点按/空格跳跃 · 躲避障碍并收集金币' },
    fr: { title: 'Dot Runner', subtitle: 'Trouvez le rythme, évitez les obstacles, prenez les pièces', score: 'Score', best: 'Record', coins: 'Pièces', time: 'Temps de survie', pace: 'Vitesse', next: 'Prochain objectif', seconds: 's', start: 'Démarrer', over: 'Partie terminée !', newBest: '🎉 Nouveau record !', restart: 'Recommencer (R)', pause: 'Pause (P)', paused: 'En pause', resume: 'Reprendre (P)', soundOn: 'Activer le son', soundOff: 'Couper le son', area: 'Zone de jeu Dot Runner', playing: 'Course en cours', hint: 'Touchez/cliquez/espace pour sauter · évitez les blocs, prenez les pièces' },
    es: { title: 'Dot Runner', subtitle: 'Sigue el ritmo, supera obstáculos y recoge monedas', score: 'Puntos', best: 'Récord', coins: 'Monedas', time: 'Tiempo vivo', pace: 'Ritmo', next: 'Próximo objetivo', seconds: 's', start: 'Empezar', over: '¡Fin del juego!', newBest: '🎉 ¡Nuevo récord!', restart: 'Reiniciar (R)', pause: 'Pausa (P)', paused: 'En pausa', resume: 'Seguir (P)', soundOn: 'Activar sonido', soundOff: 'Silenciar', area: 'Área de juego Dot Runner', playing: 'Corriendo', hint: 'Toca/clic/espacio para saltar · esquiva bloques, coge monedas' },
} as const;

const DotRunner: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);
    const [coins, setCoins] = useState(0);
    const [paceLevel, setPaceLevel] = useState(1);
    const paceMultiplier = (1 + (paceLevel - 1) * 0.08).toFixed(2);
    const [muted, setMuted] = useState(false);
    const [isNewBest, setIsNewBest] = useState(false);
    const [finalFrames, setFinalFrames] = useState(0);
    const prefersReducedMotion = usePrefersReducedMotion();
    const mutedRef = useRef(false);
    mutedRef.current = muted;
    const audioContext = useRef<AudioContext | null>(null);

    const statusRef = useRef<Status>('idle');
    statusRef.current = status;
    const bestRef = useRef(0);
    bestRef.current = best;

    const game = useRef<DotRunnerState | null>(null);

    const playTone = useCallback((kind: 'jump' | 'coin' | 'crash') => {
        if (mutedRef.current || typeof window === 'undefined') return;
        const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const context = audioContext.current ?? new AudioContextClass();
        audioContext.current = context;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = kind === 'crash' ? 'sawtooth' : 'sine';
        oscillator.frequency.setValueAtTime(kind === 'jump' ? 360 : kind === 'coin' ? 760 : 120, context.currentTime);
        if (kind === 'coin') oscillator.frequency.exponentialRampToValueAtTime(1080, context.currentTime + 0.1);
        gain.gain.setValueAtTime(kind === 'crash' ? 0.07 : 0.04, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === 'crash' ? 0.25 : 0.12));
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(); oscillator.stop(context.currentTime + (kind === 'crash' ? 0.25 : 0.12));
    }, []);

    useEffect(() => {
        const unified = getBest('dot-runner')?.value ?? 0;
        let legacy = 0;
        try {
            const stored = Number(localStorage.getItem(BEST_KEY));
            if (Number.isFinite(stored) && stored > 0) legacy = stored;
        } catch { /* ignore */ }
        const initialBest = Math.max(unified, legacy);
        if (legacy > unified) recordBest('dot-runner', legacy, 'score', undefined, { trackPlay: false });
        setBest(initialBest);
        const saved = loadDotRunnerSave();
        if (saved) {
            game.current = saved.state;
            setScore(saved.state.score);
            setCoins(saved.state.coins);
            setPaceLevel(getDotRunnerPace(saved.state.elapsedFrames).level);
            statusRef.current = 'paused';
            setStatus('paused');
        }
    }, []);

    const reset = useCallback(() => {
        clearDotRunnerSave();
        const seed = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now();
        game.current = createDotRunner(seed);
        setScore(0);
        setCoins(0);
        setPaceLevel(1);
        setIsNewBest(false);
        setFinalFrames(0);
        statusRef.current = 'playing';
        setStatus('playing');
    }, []);

    const jump = useCallback(() => {
        if (statusRef.current === 'idle' || statusRef.current === 'over') { reset(); return; }
        if (statusRef.current !== 'playing') return;
        const current = game.current;
        if (current) {
            const next = jumpDotRunner(current);
            game.current = next;
            if (next !== current) playTone('jump');
        }
    }, [playTone, reset]);

    const togglePause = useCallback(() => {
        const current = statusRef.current;
        if (current !== 'playing' && current !== 'paused') return;
        if (current === 'playing' && game.current) storeDotRunnerSave(game.current);
        const next = current === 'playing' ? 'paused' : 'playing';
        statusRef.current = next;
        setStatus(next);
    }, []);

    // main loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let raf: number;
        let lastFrame: number | null = null;
        const loop = (now: number) => {
            const scale = frameScale(lastFrame, now);
            lastFrame = now;

            if (statusRef.current === 'playing' && game.current) {
                const next = stepDotRunner(game.current, scale);
                const previousCoins = game.current.coins;
                game.current = next;
                setScore((previous) => previous === next.score ? previous : next.score);
                const nextPace = getDotRunnerPace(next.elapsedFrames).level;
                setPaceLevel((previous) => previous === nextPace ? previous : nextPace);
                if (next.coins !== previousCoins) { setCoins(next.coins); playTone('coin'); }
                if (next.status === 'over') {
                    clearDotRunnerSave();
                    statusRef.current = 'over';
                    setStatus('over');
                    const beat = next.score > bestRef.current;
                    recordAchievementEvent('dot-runner', 'played');
                    if (beat && next.score > 0) recordAchievementEvent('dot-runner', 'personal-best');
                    setFinalFrames(next.elapsedFrames);
                    setIsNewBest(beat && next.score > 0);
                    playTone('crash');
                    if (beat && next.score > 0 && !prefersReducedMotion) confetti({ particleCount: 80, spread: 68, origin: { y: 0.62 } });
                    if (beat) {
                        const savedBest = recordBest('dot-runner', next.score, 'score', undefined, { trackPlay: false });
                        setBest(savedBest.value);
                        try { localStorage.setItem(BEST_KEY, String(next.score)); } catch { /* ignore */ }
                    }
                }
            }

            // draw
            ctx.clearRect(0, 0, DOT_RUNNER_WIDTH, DOT_RUNNER_HEIGHT);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, DOT_RUNNER_WIDTH, DOT_RUNNER_HEIGHT);
            ctx.fillStyle = 'rgba(100,116,139,0.25)';
            ctx.fillRect(0, DOT_RUNNER_HEIGHT - DOT_RUNNER_GROUND, DOT_RUNNER_WIDTH, DOT_RUNNER_GROUND);

            ctx.fillStyle = '#3b82f6';
            const current = game.current;
            ctx.fillRect(DOT_RUNNER_PLAYER_X, current?.playerY ?? DOT_RUNNER_HEIGHT - DOT_RUNNER_GROUND - DOT_RUNNER_PLAYER_SIZE, DOT_RUNNER_PLAYER_SIZE, DOT_RUNNER_PLAYER_SIZE);

            ctx.fillStyle = '#ef4444';
            for (const o of current?.obstacles ?? []) ctx.fillRect(o.x, o.y, o.w, o.h);

            ctx.fillStyle = '#f1c40f';
            for (const it of current?.items ?? []) {
                ctx.beginPath();
                ctx.arc(it.x + it.w / 2, it.y + it.h / 2, it.w / 2, 0, Math.PI * 2);
                ctx.fill();
            }

            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [playTone, prefersReducedMotion]);

    useEffect(() => () => { void audioContext.current?.close(); }, []);

    useEffect(() => {
        if (status !== 'playing' && status !== 'paused') return;
        const timer = window.setInterval(() => { if (game.current?.status === 'playing') storeDotRunnerSave(game.current); }, 1000);
        return () => window.clearInterval(timer);
    }, [status]);

    useEffect(() => {
        const onVisibility = () => {
            if (document.hidden && statusRef.current === 'playing' && game.current?.status === 'playing') {
                storeDotRunnerSave(game.current);
                statusRef.current = 'paused';
                setStatus('paused');
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    useEffect(() => () => { if (game.current?.status === 'playing' && statusRef.current !== 'over') storeDotRunnerSave(game.current); }, []);

    // keyboard
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
            else if (e.code === 'KeyP' && (statusRef.current === 'playing' || statusRef.current === 'paused')) {
                togglePause();
            } else if (e.code === 'KeyR') reset();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [jump, reset, togglePause]);

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={reset}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-muted-foreground">
                <span>{t.score}: <span className="text-primary text-base font-black">{score}</span></span>
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <span>{t.coins}: <span className="text-amber-500 font-black">{coins}</span></span>
                    <span>{t.pace}: <span className="text-primary font-black">×{paceMultiplier}</span></span>
                    <span>{t.best}: <span className="text-chart-2 font-black">{best}</span></span>
                    {(status === 'playing' || status === 'paused') && (
                        <button
                            onClick={togglePause}
                            className="min-h-11 px-3 rounded-lg border border-border bg-muted hover:bg-accent transition-colors"
                        >
                            {status === 'playing' ? t.pause : t.resume}
                        </button>
                    )}
                    <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? t.soundOn : t.soundOff} aria-pressed={!muted} className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        {muted ? '🔇' : '🔊'}
                    </button>
                </div>
            </div>

            <div className="relative w-full rounded-2xl overflow-hidden border border-border touch-none select-none">
                <canvas
                    ref={canvasRef}
                    width={DOT_RUNNER_WIDTH}
                    height={DOT_RUNNER_HEIGHT}
                    className="w-full h-auto block cursor-pointer"
                    onPointerDown={(e) => { e.preventDefault(); jump(); }}
                    role="img"
                    aria-label={t.area}
                />

                {status !== 'playing' && (
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
                        {status === 'over' && (
                            <>
                                {isNewBest && <p className="text-sm font-black text-amber-500">{t.newBest}</p>}
                                <p className="text-2xl font-black text-destructive">{t.over}</p>
                                <p className="text-lg font-bold text-foreground">{t.score}: {score}</p>
                                <div className="grid w-full max-w-xs grid-cols-2 gap-2 text-xs text-foreground">
                                    <div className="rounded-xl bg-muted/80 p-2"><span className="block text-muted-foreground">{t.coins}</span><b>{coins}</b></div>
                                    <div className="rounded-xl bg-muted/80 p-2"><span className="block text-muted-foreground">{t.time}</span><b>{Math.max(1, Math.round(finalFrames / 60))} {t.seconds}</b></div>
                                    <div className="rounded-xl bg-muted/80 p-2"><span className="block text-muted-foreground">{t.pace}</span><b>×{paceMultiplier}</b></div>
                                    <div className="rounded-xl bg-primary/10 p-2"><span className="block text-muted-foreground">{t.next}</span><b>{nextDotRunnerGoal(best, score)}</b></div>
                                </div>
                            </>
                        )}
                        {status === 'paused' ? (
                            <><p className="text-2xl font-black text-foreground">⏸</p><p className="font-bold text-foreground">{t.paused}</p><button type="button" onClick={togglePause} className="min-h-11 rounded-full bg-primary px-8 py-2 font-bold text-primary-foreground">{t.resume}</button></>
                        ) : (
                            <button
                                onClick={reset}
                                className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
                            >
                                {status === 'over' ? t.restart : t.start}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <p className="mt-4 text-center text-[10px] text-muted-foreground font-medium">{t.hint}</p>
            <p className="sr-only" role="status" aria-live="polite">{status === 'playing' ? `${t.playing}. ${t.score} ${score}. ${t.coins} ${coins}. ${t.pace} ${paceMultiplier}` : status === 'paused' ? t.paused : status === 'over' ? `${t.over} ${t.score} ${score}` : ''}</p>
        </GameContainer>
    );
};

export default DotRunner;
