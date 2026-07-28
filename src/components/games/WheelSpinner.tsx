import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { GameContainer } from '../ui/game/GamePrimitives';

// ─── Physics: the wheel is a single circular body pinned at its own center
// (zero gravity, zero linear velocity — it never moves, only spins). Matter's
// `frictionAir` damps `angularVelocity` every engine tick, giving a natural
// deceleration curve instead of the old fixed-duration CSS easing. A small
// random torque each tick (bearing/axle roughness) adds the "흔들림" wobble —
// the spin doesn't decay perfectly smoothly, it judders like a real wheel.
const FRICTION_AIR = 0.012;
const WOBBLE_TORQUE = 0.0015;
const STOP_THRESHOLD = 0.0008; // rad/tick — below this we call it stopped

const WheelSpinner: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const COPY = {
        ko: { title: "행운의 돌림판", spin: "돌리기", reset: "초기화", add: "항목 추가", result: "결과!", placeholder: "메뉴 입력", wheel: "선택 항목 돌림판", remove: (item: string) => `${item} 삭제`, spinning: "돌리는 중…" },
        en: { title: "Lucky wheel", spin: "Spin", reset: "Reset", add: "Add Item", result: "Result!", placeholder: "Enter item", wheel: "Wheel of choices", remove: (item: string) => `Remove ${item}`, spinning: "Spinning…" },
        ja: { title: "幸運のルーレット", spin: "回す", reset: "リセット", add: "項目を追加", result: "結果！", placeholder: "項目を入力", wheel: "選択肢のルーレット", remove: (item: string) => `${item}を削除`, spinning: "回転中…" },
        zh: { title: "幸运转盘", spin: "转动", reset: "重置", add: "添加选项", result: "结果！", placeholder: "输入选项", wheel: "选项转盘", remove: (item: string) => `删除 ${item}`, spinning: "转动中…" },
        fr: { title: "Roue de la chance", spin: "Tourner", reset: "Réinitialiser", add: "Ajouter", result: "Résultat !", placeholder: "Saisir un élément", wheel: "Roue des choix", remove: (item: string) => `Supprimer ${item}`, spinning: "La roue tourne…" },
        es: { title: "Ruleta de la suerte", spin: "Girar", reset: "Restablecer", add: "Añadir", result: "¡Resultado!", placeholder: "Escribe una opción", wheel: "Ruleta de opciones", remove: (item: string) => `Quitar ${item}`, spinning: "Girando…" }
    };
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;

    const [items, setItems] = useState<string[]>(['Pizza', 'Burger', 'Sushi', 'Pasta']);
    const [newItem, setNewItem] = useState('');
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState<string | null>(null);
    const [reducedMotion, setReducedMotion] = useState(false);

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

            if (Math.abs(body.angularVelocity) < STOP_THRESHOLD) {
                Matter.Runner.stop(runner);
                setIsSpinning(false);
                const currentItems = itemsRef.current;
                if (currentItems.length > 0) {
                    const degrees = (body.angle * 180) / Math.PI;
                    const actualRotation = ((degrees % 360) + 360) % 360; // normalize (angle can go negative)
                    const sliceSize = 360 / currentItems.length;
                    const winningIndex = Math.floor((360 - actualRotation) / sliceSize) % currentItems.length;
                    setWinner(currentItems[(winningIndex + currentItems.length) % currentItems.length]);
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
    }, []);

    const spin = () => {
        const body = wheelBodyRef.current;
        const engine = engineRef.current;
        if (!body || !engine || isSpinning || items.length === 0) return;
        setIsSpinning(true);
        setWinner(null);

        if (reducedMotion) {
            const winningIndex = Math.floor(Math.random() * items.length);
            setRotation(-(winningIndex * (360 / items.length)));
            setWinner(items[winningIndex]);
            setIsSpinning(false);
            return;
        }

        const direction = Math.random() < 0.5 ? -1 : 1; // spin can go either way
        const power = 0.35 + Math.random() * 0.3; // rad/tick — varies the number of turns
        Matter.Body.setAngularVelocity(body, direction * power);

        const runner = Matter.Runner.create();
        runnerRef.current = runner;
        Matter.Runner.run(runner, engine);
    };

    const addItem = () => {
        if (newItem.trim()) {
            setItems([...items, newItem.trim()]);
            setNewItem('');
        }
    };

    return (
        <GameContainer title={t.title} subtitle="Decision Making Assistance" onReset={() => setItems(['Pizza', 'Burger', 'Sushi', 'Pasta'])}>
            <div className="flex flex-col md:flex-row gap-12 items-center">
                {/* Wheel UI */}
                <div className="relative">
                    {/* Fixed Pointer */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10 w-8 h-8 bg-destructive rounded-full flex items-center justify-center shadow-lg border-2 border-background">
                        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-background translate-y-4" />
                    </div>
                    
                    <div role="img" aria-label={winner ? `${t.wheel}: ${winner}` : t.wheel}
                        // rotation now comes from the matter.js body's angle every physics
                        // tick (see the `afterUpdate` handler above), so no CSS transition —
                        // the frame-by-frame updates already produce a smooth, decelerating spin.
                        style={{ transform: `rotate(${rotation}deg)` }}
                        className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-8 border-muted shadow-2xl relative overflow-hidden"
                    >
                        {items.map((_, i) => {
                            const angle = 360 / items.length;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        transform: `rotate(${i * angle}deg) skewY(${90 - angle}deg)`,
                                        backgroundColor: `oklch(0.8 0.1 ${150 + i * (30 / items.length)})`
                                    }}
                                    className="absolute top-0 right-0 w-1/2 h-1/2 origin-bottom-left border border-background/20"
                                />
                            );
                        })}
                        {items.map((item, i) => {
                            const angle = 360 / items.length;
                            return (
                                <div 
                                    key={`label-${i}`}
                                    style={{ transform: `rotate(${i * angle + angle/2}deg)` }}
                                    className="absolute inset-0 flex items-start justify-center pt-8 text-[10px] font-black text-foreground/80 uppercase tracking-tighter"
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
                            <span key={i} className="px-3 py-1 bg-card border border-border rounded-full text-[10px] font-bold text-muted-foreground flex items-center gap-2">
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
                        <div className="text-center animate-bounce motion-reduce:animate-none" role="status" aria-live="assertive">
                            <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">{t.result}</p>
                            <h4 className="text-3xl font-black text-primary uppercase">{winner}</h4>
                        </div>
                    )}
                </div>
            </div>
        </GameContainer>
    );
};

export default WheelSpinner;
