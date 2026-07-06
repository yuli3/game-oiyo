import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

// ─── Dot Jump King — charge-jump vertical climber, ported from ahoxy-legacy ──
// The original used Matter.js; this port uses a small custom physics step
// (gravity, one-way platforms, wall bounce) so no physics dependency is needed.
// Hold to charge, release to jump toward where you hold. Climb forever.

const W = 400, H = 600;
const GRAVITY = 0.35;
const CHARGE_RATE = 1.6;          // power per frame while holding (0..100)
const JUMP_BASE = 7, JUMP_MAX = 9; // vy = base + power/100 * max
const PLAYER_R = 12;
const PLATFORM_W = 90, PLATFORM_H = 12, PLATFORM_GAP = 90;
const BEST_KEY = 'oiyo-dot-jumpking-best';

interface Platform { x: number; y: number; w: number }

type Status = 'idle' | 'playing' | 'over';

const COPY = {
    ko: { title: '점프 킹', subtitle: 'Charge & Climb', height: '높이', best: '최고 높이', start: '게임 시작', over: '추락!', restart: '다시 도전', hint: '꾹 눌러 힘을 모으고, 놓으면 누른 방향으로 점프!' },
    en: { title: 'Dot Jump King', subtitle: 'Charge & Climb', height: 'Height', best: 'Best', start: 'Start', over: 'You fell!', restart: 'Try Again', hint: 'Hold to charge, release to jump toward where you hold!' },
    ja: { title: 'ドットジャンプキング', subtitle: 'Charge & Climb', height: '高さ', best: 'ベスト', start: 'スタート', over: '落下！', restart: '再挑戦', hint: '長押しでチャージ、離すと押した方向へジャンプ！' },
    zh: { title: '点点跳跳王', subtitle: 'Charge & Climb', height: '高度', best: '最高', start: '开始游戏', over: '坠落！', restart: '再试一次', hint: '按住蓄力，松开朝按住的方向跳跃！' },
    fr: { title: 'Dot Jump King', subtitle: 'Charge & Climb', height: 'Hauteur', best: 'Record', start: 'Démarrer', over: 'Chute !', restart: 'Réessayer', hint: 'Maintenez pour charger, relâchez pour sauter vers ce point !' },
    es: { title: 'Dot Jump King', subtitle: 'Charge & Climb', height: 'Altura', best: 'Récord', start: 'Empezar', over: '¡Caíste!', restart: 'Reintentar', hint: '¡Mantén para cargar y suelta para saltar hacia ese punto!' },
} as const;

function makePlatform(y: number): Platform {
    return { x: Math.random() * (W - PLATFORM_W), y, w: PLATFORM_W };
}

const DotJumpKing: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [height, setHeight] = useState(0);
    const [best, setBest] = useState(0);
    const [charge, setCharge] = useState(0);

    const statusRef = useRef<Status>('idle');
    statusRef.current = status;
    const bestRef = useRef(0);
    bestRef.current = best;

    const game = useRef({
        x: W / 2, y: H - 80, vx: 0, vy: 0,
        onGround: false,
        charging: false,
        chargePower: 0,
        aimX: W / 2,
        platforms: [] as Platform[],
        camY: 0,          // world y at the top of the camera
        maxClimb: 0,      // best (lowest) world y reached
        topSpawned: 0,    // world y of the highest platform generated so far
    });

    useEffect(() => {
        try {
            const stored = Number(localStorage.getItem(BEST_KEY));
            if (Number.isFinite(stored) && stored > 0) setBest(stored);
        } catch { /* ignore */ }
    }, []);

    const reset = useCallback(() => {
        const platforms: Platform[] = [];
        for (let y = H - 140; y > -PLATFORM_GAP * 3; y -= PLATFORM_GAP) platforms.push(makePlatform(y));
        game.current = {
            x: W / 2, y: H - 80 - PLAYER_R, vx: 0, vy: 0,
            onGround: false, charging: false, chargePower: 0, aimX: W / 2,
            platforms, camY: 0, maxClimb: H, topSpawned: -PLATFORM_GAP * 3,
        };
        setHeight(0);
        setCharge(0);
        setStatus('playing');
    }, []);

    // pointer charge/release
    const pressStart = useCallback((clientX: number) => {
        if (statusRef.current === 'idle' || statusRef.current === 'over') { reset(); return; }
        const g = game.current;
        if (!g.onGround) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        g.aimX = rect ? ((clientX - rect.left) / rect.width) * W : W / 2;
        g.charging = true;
    }, [reset]);

    const pressMove = useCallback((clientX: number) => {
        const g = game.current;
        if (!g.charging) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) g.aimX = ((clientX - rect.left) / rect.width) * W;
    }, []);

    const pressEnd = useCallback(() => {
        const g = game.current;
        if (!g.charging) return;
        g.charging = false;
        if (g.onGround && statusRef.current === 'playing') {
            const power = g.chargePower / 100;
            const dir = Math.max(-1, Math.min(1, (g.aimX - g.x) / (W / 2)));
            g.vy = -(JUMP_BASE + power * JUMP_MAX);
            g.vx = dir * (2 + power * 4);
            g.onGround = false;
        }
        g.chargePower = 0;
        setCharge(0);
    }, []);

    // main loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let raf: number;
        const loop = () => {
            const g = game.current;

            if (statusRef.current === 'playing') {
                // charging
                if (g.charging && g.onGround) {
                    g.chargePower = Math.min(100, g.chargePower + CHARGE_RATE);
                    setCharge(Math.round(g.chargePower));
                }

                // physics
                if (!g.onGround) {
                    g.vy += GRAVITY;
                    const prevY = g.y;
                    g.y += g.vy;
                    g.x += g.vx;

                    // wall bounce
                    if (g.x < PLAYER_R) { g.x = PLAYER_R; g.vx *= -0.6; }
                    if (g.x > W - PLAYER_R) { g.x = W - PLAYER_R; g.vx *= -0.6; }

                    // one-way platform landing (only while falling)
                    if (g.vy > 0) {
                        for (const p of g.platforms) {
                            const top = p.y;
                            if (
                                prevY + PLAYER_R <= top && g.y + PLAYER_R >= top &&
                                g.x >= p.x - PLAYER_R * 0.5 && g.x <= p.x + p.w + PLAYER_R * 0.5
                            ) {
                                g.y = top - PLAYER_R;
                                g.vy = 0;
                                g.vx = 0;
                                g.onGround = true;
                                break;
                            }
                        }
                        // starting ground
                        if (!g.onGround && g.y + PLAYER_R >= H - 60 && g.maxClimb > H - 200) {
                            g.y = H - 60 - PLAYER_R;
                            g.vy = 0; g.vx = 0;
                            g.onGround = true;
                        }
                    }
                }

                // climb tracking + camera
                if (g.y < g.maxClimb) g.maxClimb = g.y;
                const climbed = Math.max(0, Math.floor((H - 80 - PLAYER_R - g.maxClimb) / 10));
                setHeight((h) => (h === climbed ? h : climbed));

                const targetCam = g.y - H / 2;
                if (targetCam < g.camY) g.camY = targetCam;

                // spawn platforms above as we climb
                while (g.topSpawned > g.camY - PLATFORM_GAP * 2) {
                    g.topSpawned -= PLATFORM_GAP;
                    g.platforms.push(makePlatform(g.topSpawned));
                }
                g.platforms = g.platforms.filter((p) => p.y < g.camY + H + 100);

                // game over: fell below camera
                if (g.y > g.camY + H + 80) {
                    setStatus('over');
                    if (climbed > bestRef.current) {
                        setBest(climbed);
                        try { localStorage.setItem(BEST_KEY, String(climbed)); } catch { /* ignore */ }
                    }
                }
            }

            // ── draw ──
            const g2 = game.current;
            ctx.clearRect(0, 0, W, H);
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(1, '#1e293b');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            const toScreen = (wy: number) => wy - g2.camY;

            // starting ground
            const groundY = toScreen(H - 60);
            if (groundY < H + 40) {
                ctx.fillStyle = '#334155';
                ctx.fillRect(0, groundY, W, H - groundY + 40);
            }

            // platforms
            for (const p of g2.platforms) {
                const sy = toScreen(p.y);
                if (sy < -20 || sy > H + 20) continue;
                ctx.fillStyle = '#64748b';
                ctx.fillRect(p.x, sy, p.w, PLATFORM_H);
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(p.x, sy, p.w, 3);
            }

            // player
            const py = toScreen(g2.y);
            ctx.beginPath();
            ctx.arc(g2.x, py, PLAYER_R, 0, Math.PI * 2);
            ctx.fillStyle = g2.charging ? '#f59e0b' : '#ec4899';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // charge bar above player
            if (g2.charging) {
                const bw = 50;
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fillRect(g2.x - bw / 2, py - PLAYER_R - 14, bw, 6);
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(g2.x - bw / 2, py - PLAYER_R - 14, (bw * g2.chargePower) / 100, 6);
                // aim indicator
                const dir = Math.max(-1, Math.min(1, (g2.aimX - g2.x) / (W / 2)));
                ctx.strokeStyle = 'rgba(245,158,11,0.6)';
                ctx.beginPath();
                ctx.moveTo(g2.x, py);
                ctx.lineTo(g2.x + dir * 40, py - 40 - (g2.chargePower / 100) * 30);
                ctx.stroke();
            }

            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    // global pointer-up so releases outside the canvas still fire the jump
    useEffect(() => {
        const up = () => pressEnd();
        window.addEventListener('pointerup', up);
        return () => window.removeEventListener('pointerup', up);
    }, [pressEnd]);

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={reset}>
            <div className="flex justify-between items-center mb-3 text-xs font-bold text-muted-foreground">
                <span>{t.height}: <span className="text-primary text-base font-black">{height}m</span></span>
                <span>{t.best}: <span className="text-chart-2 font-black">{best}m</span></span>
            </div>

            <div className="relative mx-auto max-w-[400px] rounded-2xl overflow-hidden border border-border touch-none select-none">
                <canvas
                    ref={canvasRef}
                    width={W}
                    height={H}
                    className="w-full h-auto block cursor-pointer"
                    onPointerDown={(e) => { e.preventDefault(); pressStart(e.clientX); }}
                    onPointerMove={(e) => pressMove(e.clientX)}
                    aria-label={t.title}
                />

                {charge > 0 && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-warning" aria-hidden="true">
                        ⚡ {charge}%
                    </div>
                )}

                {status !== 'playing' && (
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
                        {status === 'over' && (
                            <>
                                <p className="text-2xl font-black text-destructive">{t.over}</p>
                                <p className="text-lg font-bold text-foreground">{t.height}: {height}m</p>
                            </>
                        )}
                        <button
                            onClick={reset}
                            className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
                        >
                            {status === 'over' ? t.restart : t.start}
                        </button>
                    </div>
                )}
            </div>

            <p className="mt-4 text-center text-[10px] text-muted-foreground font-medium">{t.hint}</p>
        </GameContainer>
    );
};

export default DotJumpKing;
