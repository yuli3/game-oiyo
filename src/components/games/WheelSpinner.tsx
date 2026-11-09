import React, { useCallback, useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { normalizeWheelItems, parseStoredWheelItems, WHEEL_ITEM_LIMIT } from '../../lib/games/wheel-spinner';
import { WHEEL_SPINNER_UI_SPRITES } from '../../lib/games/sprites';
import { useGameJuicePro, MobileHapticsPro, getSharedAudioContext, playComboSfx } from '../../lib/games/engine-suite-unified';
import { celebrate } from '../../lib/games/celebration';

// ─── Physics: the wheel is a single circular body pinned at its own center
// (zero gravity, zero linear velocity — it never moves, only spins). Matter's
// `frictionAir` damps `angularVelocity` every engine tick, giving a natural
// deceleration curve instead of the old fixed-duration CSS easing. A small
// random torque each tick (bearing/axle roughness) adds the "흔들림" wobble —
// the spin doesn't decay perfectly smoothly, it judders like a real wheel.
const FRICTION_AIR = 0.012;
const WOBBLE_TORQUE = 0.0015;
const STOP_THRESHOLD = 0.0008; // rad/tick — below this we call it stopped
const STORAGE_KEY = 'oiyo:wheel-spinner:items:v1';
const DEFAULT_ITEMS = ['Pizza', 'Burger', 'Sushi', 'Pasta'];

const WheelSpinner: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const COPY = {
        ko: { title: "행운의 돌림판", subtitle: "선택지를 저장해 다음에도 그대로 돌리세요", spin: "돌리기", reset: "초기화", add: "항목 추가", result: "결과!", placeholder: "선택지 입력", wheel: "선택 항목 돌림판", remove: (item: string) => `${item} 삭제`, spinning: "돌리는 중…" },
        en: { title: "Lucky wheel", subtitle: "Your choices stay saved for the next spin", spin: "Spin", reset: "Reset", add: "Add Item", result: "Result!", placeholder: "Enter an option", wheel: "Wheel of choices", remove: (item: string) => `Remove ${item}`, spinning: "Spinning…" },
        ja: { title: "幸運のルーレット", subtitle: "選択肢を保存して次回もそのまま回せます", spin: "回す", reset: "リセット", add: "項目を追加", result: "結果！", placeholder: "項目を入力", wheel: "選択肢のルーレット", remove: (item: string) => `${item}を削除`, spinning: "回転中…" },
        zh: { title: "幸运转盘", subtitle: "选项会保存在此设备上，方便下次继续使用", spin: "转动", reset: "重置", add: "添加选项", result: "结果！", placeholder: "输入选项", wheel: "选项转盘", remove: (item: string) => `删除 ${item}`, spinning: "转动中…" },
        fr: { title: "Roue de la chance", subtitle: "Vos choix restent enregistrés pour la prochaine fois", spin: "Tourner", reset: "Réinitialiser", add: "Ajouter", result: "Résultat !", placeholder: "Saisir un choix", wheel: "Roue des choix", remove: (item: string) => `Supprimer ${item}`, spinning: "La roue tourne…" },
        es: { title: "Ruleta de la suerte", subtitle: "Tus opciones quedan guardadas para la próxima vez", spin: "Girar", reset: "Restablecer", add: "Añadir", result: "¡Resultado!", placeholder: "Escribe una opción", wheel: "Ruleta de opciones", remove: (item: string) => `Quitar ${item}`, spinning: "Girando…" }
    };
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
    const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || 'ko' });
    const { shakeCssVars, addTrauma } = useGameJuicePro();
    const [pointerKick, setPointerKick] = useState(false);

    const [items, setItems] = useState<string[]>(DEFAULT_ITEMS);
    const [itemsLoaded, setItemsLoaded] = useState(false);
    const [newItem, setNewItem] = useState('');
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState<string | null>(null);
    const [reducedMotion, setReducedMotion] = useState(false);

    const [muted, setMuted] = useState(() => {
        if (typeof window === 'undefined') return false;
        try {
            return localStorage.getItem('wheel_spinner_sound_muted') === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('wheel_spinner_sound_muted', String(muted));
        } catch {
            // SSR-safe fallback
        }
    }, [muted]);

    const audioRef = useRef<AudioContext | null>(null);
    const playTone = useCallback((freq: number, duration = 0.04, type: OscillatorType = 'sine') => {
        if (muted || typeof window === 'undefined') return;
        try {
            const ctx = audioRef.current ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            audioRef.current = ctx;
            if (ctx.state === 'suspended') void ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch {
            // AudioContext fallback
        }
    }, [muted]);

    const playToneRef = useRef(playTone);
    playToneRef.current = playTone;
    const lastTickSliceRef = useRef<number>(-1);

    // Physics rig lives for the component's lifetime; only one body ever exists
    // (the wheel itself, pinned at its own center — see constants above).
    const engineRef = useRef<Matter.Engine | null>(null);
    const wheelBodyRef = useRef<Matter.Body | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);
    const itemsRef = useRef(items);
    itemsRef.current = items;

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReducedMotion(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        try {
            const saved = parseStoredWheelItems(localStorage.getItem(STORAGE_KEY));
            if (saved.length >= 2) setItems(saved);
        } catch {
            // Storage is optional; the wheel remains fully usable without it.
        } finally {
            setItemsLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!itemsLoaded) return;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* non-blocking */ }
    }, [items, itemsLoaded]);

    useEffect(() => {
        const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
        const wheel = Matter.Bodies.circle(0, 0, 100, { frictionAir: FRICTION_AIR, friction: 0, restitution: 0 });
        Matter.Composite.add(engine.world, wheel);
        engineRef.current = engine;
        wheelBodyRef.current = wheel;

        const onAfterUpdate = () => {
            const body = wheelBodyRef.current;
            const runner = runnerRef.current;
            if (!body || !runner) return;
            // axle/bearing roughness: jitter scales with current speed, fading as it slows
            const wobble = (Math.random() - 0.5) * WOBBLE_TORQUE * Math.abs(body.angularVelocity);
            Matter.Body.setAngularVelocity(body, body.angularVelocity + wobble);
            setRotation((body.angle * 180) / Math.PI);

            const currentItems = itemsRef.current;
            if (currentItems.length > 0) {
                const degrees = (body.angle * 180) / Math.PI;
                const actualRotation = ((degrees % 360) + 360) % 360;
                const sliceSize = 360 / currentItems.length;
                const currentSlice = Math.floor(actualRotation / sliceSize);
                if (currentSlice !== lastTickSliceRef.current && Math.abs(body.angularVelocity) > STOP_THRESHOLD * 2) {
                    lastTickSliceRef.current = currentSlice;
                    playToneRef.current(650, 0.02, 'triangle');
                    setPointerKick(true);
                    setTimeout(() => setPointerKick(false), 50);
                    addTrauma(0.04);
                    MobileHapticsPro.light();
                }
            }

            if (Math.abs(body.angularVelocity) < STOP_THRESHOLD) {
                Matter.Runner.stop(runner);
                setIsSpinning(false);
                if (currentItems.length > 0) {
                    const degrees = (body.angle * 180) / Math.PI;
                    const actualRotation = ((degrees % 360) + 360) % 360; // normalize (angle can go negative)
                    const sliceSize = 360 / currentItems.length;
                    const winningIndex = Math.floor((360 - actualRotation) / sliceSize) % currentItems.length;
                    const resultWinner = currentItems[(winningIndex + currentItems.length) % currentItems.length];
                    setWinner(resultWinner);
                    playToneRef.current(880, 0.25, 'sine');
                    addTrauma(0.5);
                    MobileHapticsPro.success();
                    if (containerRef.current) {
                        celebrate(containerRef.current, { preset: 'coins' });
                    }
                    const ctx = getSharedAudioContext();
                    if (ctx) {
                        playComboSfx(ctx, "powerup", 4);
                    }
                }
            }
        };
        Matter.Events.on(engine, 'afterUpdate', onAfterUpdate);

        return () => {
            const runner = runnerRef.current;
            if (runner) Matter.Runner.stop(runner);
            Matter.Events.off(engine, 'afterUpdate', onAfterUpdate);
            Matter.Composite.clear(engine.world, false);
        };
    }, [addTrauma, containerRef]);

    const isDraggingRef = useRef(false);
    const dragLastAngleRef = useRef(0);
    const dragLastTimeRef = useRef(0);
    const dragVelocityRef = useRef(0);

    const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isSpinning) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        isDraggingRef.current = true;
        dragLastAngleRef.current = angle;
        dragLastTimeRef.current = performance.now();
        dragVelocityRef.current = 0;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let delta = currentAngle - dragLastAngleRef.current;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;

        const now = performance.now();
        const dt = Math.max(1, now - dragLastTimeRef.current);
        dragVelocityRef.current = delta / (dt / 16.67);
        dragLastAngleRef.current = currentAngle;
        dragLastTimeRef.current = now;

        const body = wheelBodyRef.current;
        if (body) {
            Matter.Body.setAngle(body, body.angle + delta);
            setRotation((body.angle * 180) / Math.PI);
        }
    };

    const handleWheelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // Ignore
        }
        const body = wheelBodyRef.current;
        const engine = engineRef.current;
        if (!body || !engine) return;

        const v = dragVelocityRef.current;
        if (Math.abs(v) > 0.04) {
            setIsSpinning(true);
            setWinner(null);
            addTrauma(0.18);
            MobileHapticsPro.medium();
            Matter.Body.setAngularVelocity(body, Math.max(-0.6, Math.min(0.6, v * 1.4)));
            const runner = Matter.Runner.create();
            runnerRef.current = runner;
            Matter.Runner.run(runner, engine);
        }
    };

    const spin = useCallback(() => {
        const body = wheelBodyRef.current;
        const engine = engineRef.current;
        if (!body || !engine || isSpinning || items.length === 0) return;
        setIsSpinning(true);
        setWinner(null);
        addTrauma(0.2);
        MobileHapticsPro.medium();
        playTone(440, 0.08, 'sine');

        if (reducedMotion) {
            const winningIndex = Math.floor(Math.random() * items.length);
            setRotation(-(winningIndex * (360 / items.length)));
            setWinner(items[winningIndex]);
            setIsSpinning(false);
            playTone(880, 0.2, 'sine');
            return;
        }

        const direction = Math.random() < 0.5 ? -1 : 1; // spin can go either way
        const power = 0.35 + Math.random() * 0.3; // rad/tick — varies the number of turns
        Matter.Body.setAngularVelocity(body, direction * power);

        const runner = Matter.Runner.create();
        runnerRef.current = runner;
        Matter.Runner.run(runner, engine);
    }, [isSpinning, items, reducedMotion, playTone, addTrauma]);

    const addItem = () => {
        if (newItem.trim() && items.length < WHEEL_ITEM_LIMIT) {
            setItems(normalizeWheelItems([...items, newItem]));
            setNewItem('');
        }
    };

    const reset = () => {
        setItems(DEFAULT_ITEMS);
        setNewItem('');
        setWinner(null);
        setRotation(0);
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* non-blocking */ }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                togglePortal();
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                setMuted((v) => !v);
            } else if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                spin();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePortal, spin]);

    return (
        <div
            ref={containerRef}
            style={{
                '--shake-x': shakeCssVars['--shake-x'] ?? '0px',
                '--shake-y': shakeCssVars['--shake-y'] ?? '0px',
                '--shake-rot': shakeCssVars['--shake-rot'] ?? '0deg',
            } as React.CSSProperties}
            className={`relative w-full transition-all duration-300 transform translate-x-(--shake-x) translate-y-(--shake-y) rotate-(--shake-rot) ${
                isImmersive ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-y-auto p-4' : ''
            }`}
        >
            <div className="w-full max-w-xl mx-auto mb-2 flex items-center justify-end gap-2 px-1">
                <button
                    type="button"
                    onClick={() => setMuted((v) => !v)}
                    className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={muted ? portalLabels.unmute : portalLabels.mute}
                    title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`}
                >
                    {muted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-primary" />}
                    <span className="sr-only">{muted ? portalLabels.unmute : portalLabels.mute}</span>
                </button>
                <button
                    type="button"
                    onClick={togglePortal}
                    className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
                    title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`}
                >
                    {isImmersive ? <Minimize2 className="h-4 w-4 text-primary" /> : <Maximize2 className="h-4 w-4" />}
                    <span className="sr-only">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
                </button>
            </div>

            <GameContainer title={t.title} subtitle={t.subtitle} onReset={reset}>
                <div className="flex flex-col md:flex-row gap-12 items-center">
                    {/* Wheel UI */}
                    <div className="relative">
                        {/* Fixed Pointer with tactile kickback */}
                        <div
                            className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10 w-8 h-8 bg-destructive rounded-full flex items-center justify-center shadow-lg border-2 border-background transition-transform duration-75 ${
                                pointerKick ? "-rotate-12 scale-110" : "rotate-0"
                            }`}
                        >
                            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-background translate-y-4" />
                        </div>
                        
                        <div
                            role="img"
                            aria-label={winner ? `${t.wheel}: ${winner}` : t.wheel}
                            onPointerDown={handleWheelPointerDown}
                            onPointerMove={handleWheelPointerMove}
                            onPointerUp={handleWheelPointerUp}
                            onPointerCancel={handleWheelPointerUp}
                            style={{ '--wheel-rot': `${rotation}deg` } as React.CSSProperties}
                            className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-8 border-muted shadow-2xl relative overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none transition-shadow transform rotate-(--wheel-rot)"
                        >
                            {items.map((_, i) => {
                                const angle = 360 / items.length;
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            '--sector-rot': `${i * angle}deg`,
                                            '--sector-skew': `${90 - angle}deg`,
                                            '--sector-bg': `oklch(0.8 0.1 ${150 + i * (30 / items.length)})`,
                                        } as React.CSSProperties}
                                        className="absolute top-0 right-0 w-1/2 h-1/2 origin-bottom-left border border-background/20 transform rotate-(--sector-rot) skew-y-(--sector-skew) bg-(--sector-bg)"
                                    />
                                );
                            })}
                            {items.map((item, i) => {
                                const angle = 360 / items.length;
                                return (
                                    <div 
                                        key={`label-${i}`}
                                        style={{ '--label-rot': `${i * angle + angle / 2}deg` } as React.CSSProperties}
                                        className="absolute inset-0 flex items-start justify-center pt-8 text-xs font-black text-foreground/80 uppercase tracking-tighter transform rotate-(--label-rot)"
                                    >
                                        <span className="rotate-90 origin-center">{item}</span>
                                    </div>
                                );
                            })}
                            <div className="absolute inset-0 m-auto w-12 h-12 bg-background rounded-full shadow-inner border-4 border-muted flex items-center justify-center font-black text-xs text-primary">OIYO</div>
                        </div>
                    </div>

                    {/* Controls Area */}
                    <div className="flex-1 space-y-6 w-full">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newItem} 
                                onChange={(e) => setNewItem(e.target.value)}
                                placeholder={t.placeholder}
                                className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                            />
                            <button type="button" onClick={addItem} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-xs">{t.add}</button>
                        </div>

                        <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2 p-4 bg-muted/20 rounded-2xl border border-dashed border-border">
                            {items.map((item, i) => (
                                <span key={i} className="px-3 py-1 bg-card border border-border rounded-full text-xs font-bold text-muted-foreground flex items-center gap-2">
                                    {item}
                                    <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} aria-label={t.remove(item)} className="text-destructive hover:scale-125">×</button>
                                </span>
                            ))}
                        </div>

                        <button 
                            type="button"
                            onClick={spin}
                            disabled={isSpinning}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xl shadow-lg hover:opacity-90 active:scale-95 transition-all"
                        >
                            {isSpinning ? t.spinning : t.spin}
                        </button>

                        {winner && (
                            <div className="text-center animate-bounce motion-reduce:animate-none flex flex-col items-center p-4 rounded-2xl bg-primary/10 border-2 border-primary/40 shadow-lg shadow-primary/20" role="status" aria-live="assertive">
                                <img src={WHEEL_SPINNER_UI_SPRITES.trophy} alt="Jackpot Trophy" className="size-16 object-contain mb-1 drop-shadow-md" />
                                <p className="text-xs font-black text-muted-foreground uppercase mb-1">{t.result}</p>
                                <h4 className="text-3xl font-black text-primary uppercase">{winner}</h4>
                            </div>
                        )}
                    </div>
                </div>
            </GameContainer>
        </div>
    );
};

export default WheelSpinner;
