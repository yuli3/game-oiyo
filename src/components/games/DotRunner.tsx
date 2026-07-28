import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { frameScale } from '../../lib/games/time-contracts';

// ─── Dot Runner — endless runner, ported from ahoxy-legacy ────────────────────
// Jump over red blocks, grab gold coins. Rewritten from per-frame setState to a
// ref-driven canvas loop (React state only for HUD/status).

const W = 800, H = 400, GROUND = 50;
const GRAVITY = 0.5, JUMP_FORCE = -10, GAME_SPEED = 5;
const OBSTACLE_FREQ = 0.02, ITEM_FREQ = 0.008;
const BEST_KEY = 'oiyo-dot-runner-best';

interface Entity { x: number; y: number; w: number; h: number; speed: number }

type Status = 'idle' | 'playing' | 'paused' | 'over';

const COPY = {
    ko: { title: '점프 러너', subtitle: 'Dot Runner', score: '점수', best: '최고 점수', start: '게임 시작', over: '게임 오버!', restart: '다시 시작 (R)', pause: '일시정지 (P)', resume: '계속 (P)', hint: '탭/클릭/스페이스로 점프 · 장애물을 피하고 코인을 모으세요' },
    en: { title: 'Dot Runner', subtitle: 'Dot Runner', score: 'Score', best: 'Best', start: 'Start', over: 'Game Over!', restart: 'Restart (R)', pause: 'Pause (P)', resume: 'Resume (P)', hint: 'Tap/click/space to jump · dodge blocks, grab coins' },
    ja: { title: 'ドットランナー', subtitle: 'Dot Runner', score: 'スコア', best: 'ベスト', start: 'スタート', over: 'ゲームオーバー！', restart: 'リスタート (R)', pause: '一時停止 (P)', resume: '再開 (P)', hint: 'タップ/クリック/スペースでジャンプ · 障害物を避けてコインを集めよう' },
    zh: { title: '点点酷跑', subtitle: 'Dot Runner', score: '分数', best: '最高分', start: '开始游戏', over: '游戏结束！', restart: '重新开始 (R)', pause: '暂停 (P)', resume: '继续 (P)', hint: '点按/空格跳跃 · 躲避障碍并收集金币' },
    fr: { title: 'Dot Runner', subtitle: 'Dot Runner', score: 'Score', best: 'Record', start: 'Démarrer', over: 'Partie terminée !', restart: 'Recommencer (R)', pause: 'Pause (P)', resume: 'Reprendre (P)', hint: 'Touchez/cliquez/espace pour sauter · évitez les blocs, prenez les pièces' },
    es: { title: 'Dot Runner', subtitle: 'Dot Runner', score: 'Puntos', best: 'Récord', start: 'Empezar', over: '¡Fin del juego!', restart: 'Reiniciar (R)', pause: 'Pausa (P)', resume: 'Seguir (P)', hint: 'Toca/clic/espacio para saltar · esquiva bloques, coge monedas' },
} as const;

const DotRunner: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);

    const statusRef = useRef<Status>('idle');
    statusRef.current = status;
    const bestRef = useRef(0);
    bestRef.current = best;

    const game = useRef({
        playerY: H - GROUND - 20,
        velocityY: 0,
        jumping: false,
        obstacles: [] as Entity[],
        items: [] as Entity[],
        score: 0,
        frame: 0,
    });

    useEffect(() => {
        try {
            const stored = Number(localStorage.getItem(BEST_KEY));
            if (Number.isFinite(stored) && stored > 0) setBest(stored);
        } catch { /* ignore */ }
    }, []);

    const reset = useCallback(() => {
        game.current = { playerY: H - GROUND - 20, velocityY: 0, jumping: false, obstacles: [], items: [], score: 0, frame: 0 };
        setScore(0);
        setStatus('playing');
    }, []);

    const jump = useCallback(() => {
        if (statusRef.current === 'idle' || statusRef.current === 'over') { reset(); return; }
        if (statusRef.current !== 'playing') return;
        const g = game.current;
        if (!g.jumping) {
            g.velocityY = JUMP_FORCE;
            g.jumping = true;
        }
    }, [reset]);

    // main loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let raf: number;
        let lastFrame: number | null = null;
        const px = 50, pw = 20, ph = 20;

        const loop = (now: number) => {
            const g = game.current;
            const scale = frameScale(lastFrame, now);
            lastFrame = now;

            if (statusRef.current === 'playing') {
                g.frame += scale;

                // player physics
                g.velocityY += GRAVITY * scale;
                g.playerY += g.velocityY * scale;
                if (g.playerY + ph > H - GROUND) {
                    g.playerY = H - GROUND - ph;
                    g.velocityY = 0;
                    g.jumping = false;
                }

                // spawn
                if (Math.random() < OBSTACLE_FREQ * scale) {
                    const h = 20 + Math.random() * 40;
                    g.obstacles.push({ x: W, y: H - GROUND - h, w: 20, h, speed: GAME_SPEED + Math.random() * 2 });
                }
                if (Math.random() < ITEM_FREQ * scale) {
                    g.items.push({ x: W, y: 100 + Math.random() * 150, w: 15, h: 15, speed: GAME_SPEED });
                }

                // move + cull
                g.obstacles = g.obstacles.filter((o) => { o.x -= o.speed * scale; return o.x + o.w > 0; });
                g.items = g.items.filter((o) => { o.x -= o.speed * scale; return o.x + o.w > 0; });

                // collisions
                const hit = (e: Entity) => px < e.x + e.w && px + pw > e.x && g.playerY < e.y + e.h && g.playerY + ph > e.y;
                g.items = g.items.filter((it) => { if (hit(it)) { g.score += 10; return false; } return true; });
                if (g.obstacles.some(hit)) {
                    setStatus('over');
                    setScore(g.score);
                    if (g.score > bestRef.current) {
                        setBest(g.score);
                        try { localStorage.setItem(BEST_KEY, String(g.score)); } catch { /* ignore */ }
                    }
                }

                if (g.frame % 5 === 0) g.score += 1;
                if (g.frame % 10 === 0) setScore(g.score);
            }

            // draw
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = 'rgba(100,116,139,0.25)';
            ctx.fillRect(0, H - GROUND, W, GROUND);

            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(px, game.current.playerY, pw, ph);

            ctx.fillStyle = '#ef4444';
            for (const o of game.current.obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);

            ctx.fillStyle = '#f1c40f';
            for (const it of game.current.items) {
                ctx.beginPath();
                ctx.arc(it.x + it.w / 2, it.y + it.h / 2, it.w / 2, 0, Math.PI * 2);
                ctx.fill();
            }

            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    // keyboard
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
            else if (e.code === 'KeyP' && (statusRef.current === 'playing' || statusRef.current === 'paused')) {
                setStatus((s) => (s === 'playing' ? 'paused' : 'playing'));
            } else if (e.code === 'KeyR') reset();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [jump, reset]);

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={reset}>
            <div className="flex justify-between items-center mb-3 text-xs font-bold text-muted-foreground">
                <span>{t.score}: <span className="text-primary text-base font-black">{score}</span></span>
                <div className="flex items-center gap-3">
                    <span>{t.best}: <span className="text-chart-2 font-black">{best}</span></span>
                    {(status === 'playing' || status === 'paused') && (
                        <button
                            onClick={() => setStatus(status === 'playing' ? 'paused' : 'playing')}
                            className="px-3 py-1 rounded-lg border border-border bg-muted hover:bg-accent transition-colors"
                        >
                            {status === 'playing' ? t.pause : t.resume}
                        </button>
                    )}
                </div>
            </div>

            <div className="relative w-full rounded-2xl overflow-hidden border border-border touch-none select-none">
                <canvas
                    ref={canvasRef}
                    width={W}
                    height={H}
                    className="w-full h-auto block cursor-pointer"
                    onPointerDown={(e) => { e.preventDefault(); jump(); }}
                    aria-label={t.title}
                />

                {status !== 'playing' && (
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
                        {status === 'over' && (
                            <>
                                <p className="text-2xl font-black text-destructive">{t.over}</p>
                                <p className="text-lg font-bold text-foreground">{t.score}: {score}</p>
                            </>
                        )}
                        {status === 'paused' ? (
                            <p className="text-2xl font-black text-foreground">⏸</p>
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
        </GameContainer>
    );
};

export default DotRunner;
