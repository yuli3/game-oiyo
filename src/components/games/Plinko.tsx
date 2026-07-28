import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { AnimatePresence, motion } from 'motion/react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { getBest, recordBest } from '../../lib/games/records';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import {
    DEFAULT_ROWS,
    MIN_BET,
    MAX_BET,
    BET_STEP,
    STARTING_BALANCE,
    generatePegLayout,
    computeSlotMultipliers,
    calculateDropScore,
    clampBet,
    resolveSlotIndex,
} from '../../lib/games/plinko';

// ─── Plinko — classic peg-board drop game, matter.js-physics ──────────────────
// The bottom-row peg x-positions line up exactly with the slot dividers (see
// generatePegLayout's geometry), which is what makes the ball's bounce path
// actually resolve into one of the pockets instead of just visual decoration.
// Points-based only — no real currency, no cash-out (same spirit as
// lotto-generator/dice-roller).

const BOARD_W = 480;
const BOARD_H = 560;
const PEG_R = 6;
const BALL_R = 9;
const SLOT_ZONE_H = 90; // bottom strip reserved for the payout pockets
const PEG_TOP_MARGIN = 40;
const WALL_T = 20;

const ROWS = DEFAULT_ROWS;
const SLOT_COUNT = ROWS + 1;
const MULTIPLIERS = computeSlotMultipliers(ROWS);
const PEGS = generatePegLayout(ROWS);
const RECORD_KEY = 'plinko';

const COPY = {
    ko: { title: "플린코", subtitle: "Physics Drop Game", drop: "떨어뜨리기", dropping: "떨어지는 중...", bet: "베팅", balance: "포인트", best: "최고 획득", won: "획득!", notEnough: "포인트 부족 — 초기화로 리필하세요" },
    en: { title: "Plinko", subtitle: "Physics Drop Game", drop: "Drop", dropping: "Dropping...", bet: "Bet", balance: "Points", best: "Best win", won: "Won!", notEnough: "Not enough points — reset to refill" },
    ja: { title: "プリンコ", subtitle: "Physics Drop Game", drop: "落とす", dropping: "落下中...", bet: "ベット", balance: "ポイント", best: "最高獲得", won: "獲得！", notEnough: "ポイント不足 — リセットで補充" },
    zh: { title: "弹珠机", subtitle: "Physics Drop Game", drop: "投放", dropping: "掉落中...", bet: "下注", balance: "积分", best: "最高获得", won: "获得！", notEnough: "积分不足 — 请重置补充" },
    fr: { title: "Plinko", subtitle: "Physics Drop Game", drop: "Lâcher", dropping: "Chute...", bet: "Mise", balance: "Points", best: "Meilleur gain", won: "Gagné !", notEnough: "Pas assez de points — réinitialisez" },
    es: { title: "Plinko", subtitle: "Physics Drop Game", drop: "Soltar", dropping: "Cayendo...", bet: "Apuesta", balance: "Puntos", best: "Mejor logro", won: "¡Ganado!", notEnough: "Puntos insuficientes — reinicia" },
} as const;

interface DropResult { slot: number; multiplier: number; score: number }

const Plinko: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
    const prefersReducedMotion = usePrefersReducedMotion();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const ballRef = useRef<Matter.Body | null>(null);
    const betRef = useRef(50);
    const settledRef = useRef(true);

    const [balance, setBalance] = useState(STARTING_BALANCE);
    const [bet, setBet] = useState(50);
    const [isDropping, setIsDropping] = useState(false);
    const [lastResult, setLastResult] = useState<DropResult | null>(null);
    const [dropId, setDropId] = useState(0);
    const [best, setBest] = useState<number | null>(null);

    useEffect(() => {
        const b = getBest(RECORD_KEY);
        if (b) setBest(b.value);
    }, []);

    // Build the static world (pegs/dividers/walls) once, run the physics
    // engine + canvas draw loop for the component's lifetime.
    useEffect(() => {
        const engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });
        const world = engine.world;
        engineRef.current = engine;

        const pegBodies = PEGS.map((p) =>
            Matter.Bodies.circle(
                p.xNorm * BOARD_W,
                PEG_TOP_MARGIN + p.yNorm * (BOARD_H - SLOT_ZONE_H - PEG_TOP_MARGIN),
                PEG_R,
                { isStatic: true, restitution: 0.6, friction: 0.05, label: 'peg' }
            )
        );
        const dividers = Array.from({ length: SLOT_COUNT - 1 }, (_, i) =>
            Matter.Bodies.rectangle(((i + 1) / SLOT_COUNT) * BOARD_W, BOARD_H - SLOT_ZONE_H / 2, 4, SLOT_ZONE_H, {
                isStatic: true,
                label: 'divider',
            })
        );
        const floor = Matter.Bodies.rectangle(BOARD_W / 2, BOARD_H + WALL_T / 2, BOARD_W, WALL_T, { isStatic: true, label: 'floor' });
        const leftWall = Matter.Bodies.rectangle(-WALL_T / 2, BOARD_H / 2, WALL_T, BOARD_H * 2, { isStatic: true, label: 'wall' });
        const rightWall = Matter.Bodies.rectangle(BOARD_W + WALL_T / 2, BOARD_H / 2, WALL_T, BOARD_H * 2, { isStatic: true, label: 'wall' });
        Matter.Composite.add(world, [...pegBodies, ...dividers, floor, leftWall, rightWall]);

        // Resolve the round once the ball actually settles on the floor — more
        // reliable than watching a y-threshold, since the ball can still bounce
        // sideways between dividers for a moment after entering the slot zone.
        const onCollisionStart = (event: Matter.IEventCollision<Matter.Engine>) => {
            const ball = ballRef.current;
            if (!ball || settledRef.current) return;
            for (const pair of event.pairs) {
                const hitFloor =
                    (pair.bodyA === ball && pair.bodyB.label === 'floor') ||
                    (pair.bodyB === ball && pair.bodyA.label === 'floor');
                if (!hitFloor) continue;
                settledRef.current = true;
                const xNorm = ball.position.x / BOARD_W;
                const slot = resolveSlotIndex(xNorm, SLOT_COUNT);
                const multiplier = MULTIPLIERS[slot];
                const score = calculateDropScore(betRef.current, multiplier);
                setLastResult({ slot, multiplier, score });
                setDropId((n) => n + 1);
                setBalance((b) => b + score);
                const saved = recordBest(RECORD_KEY, score, 'score');
                setBest(saved.value);
                setTimeout(() => {
                    if (ballRef.current === ball) {
                        Matter.Composite.remove(world, ball);
                        ballRef.current = null;
                    }
                    setIsDropping(false);
                }, 700);
                break;
            }
        };
        Matter.Events.on(engine, 'collisionStart', onCollisionStart);

        const runner = Matter.Runner.create();
        Matter.Runner.run(runner, engine);

        let raf: number;
        const draw = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, BOARD_W, BOARD_H);
                ctx.fillStyle = '#cbd5e1';
                for (const d of dividers) ctx.fillRect(d.position.x - 2, BOARD_H - SLOT_ZONE_H, 4, SLOT_ZONE_H);
                ctx.fillStyle = '#94a3b8';
                for (const p of pegBodies) {
                    ctx.beginPath();
                    ctx.arc(p.position.x, p.position.y, PEG_R, 0, Math.PI * 2);
                    ctx.fill();
                }
                const ball = ballRef.current;
                if (ball) {
                    ctx.fillStyle = '#f59e0b';
                    ctx.beginPath();
                    ctx.arc(ball.position.x, ball.position.y, BALL_R, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(raf);
            Matter.Runner.stop(runner);
            Matter.Events.off(engine, 'collisionStart', onCollisionStart);
            Matter.Composite.clear(world, false);
        };
    }, []);

    const drop = () => {
        const engine = engineRef.current;
        if (!engine || isDropping) return;
        const wager = clampBet(bet);
        if (wager > balance) return;

        betRef.current = wager;
        settledRef.current = false;
        setBalance((b) => b - wager);
        setIsDropping(true);
        setLastResult(null);

        const jitter = (Math.random() - 0.5) * 20;
        const ball = Matter.Bodies.circle(BOARD_W / 2 + jitter, 8, BALL_R, {
            restitution: 0.55,
            friction: 0.05,
            frictionAir: 0.001,
            label: 'ball',
        });
        Matter.Composite.add(engine.world, ball);
        ballRef.current = ball;
    };

    const adjustBet = (delta: number) => setBet((b) => clampBet(b + delta));
    const canDrop = !isDropping && bet <= balance;

    return (
        <GameContainer
            title={t.title}
            subtitle={t.subtitle}
            onReset={() => {
                setBalance(STARTING_BALANCE);
                setLastResult(null);
            }}
        >
            <div className="flex flex-col items-center gap-4">
                <div className="flex w-full max-w-md items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>{t.balance}: <span className="text-primary text-base font-black">{balance}</span></span>
                    {best !== null && <span>{t.best}: <span className="text-chart-2 font-black">{best}</span></span>}
                </div>

                <div className="relative w-full max-w-md rounded-2xl border border-border bg-muted/20 overflow-hidden">
                    <canvas ref={canvasRef} width={BOARD_W} height={BOARD_H} className="w-full h-auto block" aria-label={t.title} />
                </div>

                {/* slot payout row — aligned to the same width/grid as the board above */}
                <div className="grid w-full max-w-md gap-1" style={{ gridTemplateColumns: `repeat(${SLOT_COUNT}, minmax(0, 1fr))` }}>
                    {MULTIPLIERS.map((m, i) => (
                        <div key={i} className="relative rounded-lg bg-muted/40 py-1.5 text-center text-[10px] font-black text-muted-foreground overflow-hidden">
                            <AnimatePresence>
                                {lastResult?.slot === i && (
                                    <motion.span
                                        key={dropId}
                                        className="absolute inset-0 rounded-lg bg-primary/30"
                                        initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.6 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 14 }}
                                    />
                                )}
                            </AnimatePresence>
                            <span className="relative">{m}×</span>
                        </div>
                    ))}
                </div>

                <div className="flex w-full max-w-md items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground">{t.bet}</span>
                    <button
                        onClick={() => adjustBet(-BET_STEP)}
                        disabled={isDropping || bet <= MIN_BET}
                        className="px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-accent disabled:opacity-40 font-black text-sm"
                    >
                        −
                    </button>
                    <span className="min-w-12 text-center font-black text-sm">{bet}</span>
                    <button
                        onClick={() => adjustBet(BET_STEP)}
                        disabled={isDropping || bet >= MAX_BET}
                        className="px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-accent disabled:opacity-40 font-black text-sm"
                    >
                        +
                    </button>

                    <button
                        onClick={drop}
                        disabled={!canDrop}
                        className="flex-1 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-sm shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isDropping ? t.dropping : t.drop}
                    </button>
                </div>

                {bet > balance && <p className="text-xs font-bold text-destructive">{t.notEnough}</p>}

                <AnimatePresence>
                    {lastResult && (
                        <motion.div
                            key={dropId}
                            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25 }}
                            className="text-center"
                        >
                            <p className="text-[10px] font-black text-muted-foreground uppercase">{t.won}</p>
                            <p className="text-2xl font-black text-primary">{lastResult.multiplier}× · +{lastResult.score}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </GameContainer>
    );
};

export default Plinko;
