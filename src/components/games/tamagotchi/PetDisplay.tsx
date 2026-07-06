// Pet display — sprite + idle movement + emotion bubble + death overlay.
// Ported from ahoxy-legacy pet-display/pixel-movement/pixel-emotion, with the
// rAF transform animations condensed into one keyframe map.
import React, { useEffect, useRef, useState } from 'react';
import type { Pet, PetState, PetType } from '../../../lib/games/tamagotchi';
import { createPixelArt, getPetSpriteKey } from './PixelSprite';

type Movement = 'bounce' | 'walk' | 'spin' | 'wiggle' | 'hop' | 'float' | 'teleport' | 'wobble';

const DURATIONS: Record<Movement, number> = {
    bounce: 1000, walk: 2000, spin: 1500, wiggle: 800, hop: 500, float: 3000, teleport: 800, wobble: 1200,
};

function movementTransform(type: Movement, p: number): string {
    switch (type) {
        case 'bounce': return `translateY(${-Math.sin(p * Math.PI) * 10}px)`;
        case 'walk': return `translate(${p * 20 - 10}px, ${-Math.sin(p * Math.PI * 2) * 3}px)`;
        case 'spin': return `rotate(${p * 360}deg)`;
        case 'wiggle': return `translateX(${Math.sin(p * Math.PI * 4) * 5}px)`;
        case 'hop': return `translateY(${-(p < 0.5 ? p * 2 : (1 - p) * 2) * 16}px)`;
        case 'float': return `translateY(${-Math.sin(p * Math.PI) * 14}px) rotate(${Math.sin(p * Math.PI * 2) * 5}deg)`;
        case 'teleport': return `scale(${p < 0.4 ? 1 - p * 2 : p > 0.6 ? (p - 0.6) * 2.5 : 0.2}) translateX(${p < 0.5 ? 0 : 20}px)`;
        case 'wobble': return `rotate(${Math.sin(p * Math.PI * 3) * 8}deg)`;
    }
}

function randomMovement(type: PetType, stage: Pet['stage']): Movement {
    // adults develop species personality, as in the original
    if (stage === 'adult') {
        if (type === 'bird' && Math.random() < 0.4) return 'float';
        if (type === 'dog' && Math.random() < 0.4) return 'hop';
        if (type === 'cat' && Math.random() < 0.4) return 'wiggle';
        if (type === 'dragon' && Math.random() < 0.3) return 'teleport';
    }
    const all: Movement[] = ['bounce', 'walk', 'spin', 'wiggle', 'hop', 'float', 'wobble'];
    return all[Math.floor(Math.random() * all.length)];
}

const EMOTION: Partial<Record<PetState, string>> = {
    happy: '💗', loving: '💕', sad: '💧', hungry: '🍖', dirty: '💩', sick: '🤒',
    bored: '💤', excited: '✨', confused: '❓', curious: '👀', mischievous: '😼',
    feeding: '😋', drinking: '💧', playing: '🎾', cleaning: '🫧', healing: '💊', walking: '🐾',
};

const SPRITE_PX = 96;

export const PetDisplay: React.FC<{ pet: Pet; onPet?: () => void }> = ({ pet, onPet }) => {
    const [spriteUrl, setSpriteUrl] = useState('');
    const [petting, setPetting] = useState(false);
    const [walkFrame, setWalkFrame] = useState(1);
    const moveRef = useRef<HTMLDivElement>(null);
    const pettingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // sprite selection (petting overrides briefly)
    useEffect(() => {
        const key = petting ? 'playing' : getPetSpriteKey(pet);
        try { setSpriteUrl(createPixelArt(key, 3)); } catch { /* SSR/canvas unavailable */ }
    }, [pet, petting]);

    // walking background frames
    useEffect(() => {
        if (pet.state !== 'walking') return;
        const id = setInterval(() => setWalkFrame((f) => (f >= 3 ? 1 : f + 1)), 500);
        return () => clearInterval(id);
    }, [pet.state]);

    // idle movement loop: play a random move every 5–15s
    useEffect(() => {
        if (pet.state === 'dead' || pet.stage === 'egg') return;
        let raf = 0;
        let idleTimer: ReturnType<typeof setTimeout>;
        let cancelled = false;

        const playMovement = (type: Movement, then: () => void) => {
            const start = performance.now();
            const step = (t: number) => {
                if (cancelled || !moveRef.current) return;
                const p = Math.min((t - start) / DURATIONS[type], 1);
                moveRef.current.style.transform = movementTransform(type, p);
                if (p < 1) raf = requestAnimationFrame(step);
                else { moveRef.current.style.transform = ''; then(); }
            };
            raf = requestAnimationFrame(step);
        };

        const scheduleIdle = () => {
            idleTimer = setTimeout(() => {
                if (cancelled) return;
                if (pet.state === 'walking') playMovement('walk', scheduleIdle);
                else if (pet.state === 'sleeping' || pet.state === 'sick') scheduleIdle();
                else playMovement(randomMovement(pet.type, pet.stage), scheduleIdle);
            }, 5000 + Math.random() * 10000);
        };

        // walking gets continuous motion
        if (pet.state === 'walking') {
            const loopWalk = () => { if (!cancelled) playMovement('walk', loopWalk); };
            loopWalk();
        } else {
            scheduleIdle();
        }

        return () => { cancelled = true; cancelAnimationFrame(raf); clearTimeout(idleTimer); };
    }, [pet.state, pet.type, pet.stage]);

    useEffect(() => () => { if (pettingTimer.current) clearTimeout(pettingTimer.current); }, []);

    const handleTap = () => {
        if (!onPet || petting || pet.state === 'dead') return;
        onPet();
        if (pet.stage === 'egg') return;
        setPetting(true);
        pettingTimer.current = setTimeout(() => setPetting(false), 1000);
    };

    const emotion = pet.stage !== 'egg' && pet.state !== 'dead' ? EMOTION[pet.state] : null;
    const sizeScale = pet.stage === 'egg' ? 1 : pet.stage === 'baby' ? 0.8 : pet.stage === 'child' ? 1 : 1.2;

    return (
        <button
            onClick={handleTap}
            aria-label={pet.stage === 'egg' ? 'egg' : pet.name}
            className="relative w-32 h-32 flex items-center justify-center cursor-pointer bg-transparent border-0"
            style={{ transform: `scale(${sizeScale})`, transition: 'transform 0.5s ease-in-out' }}
        >
            {/* walking scenery */}
            {pet.state === 'walking' && (
                <img
                    src={createPixelArt(`walkingBg${walkFrame}`, 3)}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full opacity-60"
                    style={{ imageRendering: 'pixelated' }}
                />
            )}

            <div ref={moveRef} className={pet.stage === 'egg' ? 'tama-egg-wobble' : ''}>
                {spriteUrl ? (
                    <img
                        src={spriteUrl}
                        alt={pet.stage === 'egg' ? 'egg' : `${pet.type} (${pet.state})`}
                        width={SPRITE_PX}
                        height={SPRITE_PX}
                        className="relative z-10"
                        style={{ imageRendering: 'pixelated' }}
                        draggable={false}
                    />
                ) : (
                    <div className="w-24 h-24 bg-muted rounded-full" />
                )}
            </div>

            {/* emotion bubble */}
            {emotion && (
                <span className="absolute -top-3 right-0 text-xl animate-bounce motion-reduce:animate-none z-20" aria-hidden="true">
                    {emotion}
                </span>
            )}

            {/* sleeping Zs */}
            {pet.state === 'sleeping' && (
                <span className="absolute -top-2 right-2 z-20 text-sm font-black text-muted-foreground" aria-hidden="true">
                    <span className="tama-sleep-z inline-block">z</span>
                    <span className="tama-sleep-z inline-block text-base">Z</span>
                    <span className="tama-sleep-z inline-block text-lg">Z</span>
                </span>
            )}

            {/* death overlay */}
            {pet.state === 'dead' && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-20 rounded-md">
                    <div className="text-center tama-pixel-text text-foreground">
                        <div className="text-2xl mb-1">🪦</div>
                        <div className="text-[10px] font-black">RIP {pet.name}</div>
                        <div className="text-[10px]">
                            {new Date(pet.birthTime).toLocaleDateString()} – {pet.deathTime ? new Date(pet.deathTime).toLocaleDateString() : ''}
                        </div>
                    </div>
                </div>
            )}
        </button>
    );
};
