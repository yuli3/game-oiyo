import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  LoopHeroEngine,
  type CardDef,
  type Equipment,
  type EquipSlot,
  type Monster,
} from '../../lib/games/loop-hero';
import { Button } from '../ui/button';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Shield,
  Heart,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export const LoopHero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<LoopHeroEngine | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  // React state for HUD and UI panels
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [hoveredEquip, setHoveredEquip] = useState<Equipment | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Synced snapshot state
  const [heroHp, setHeroHp] = useState(250);
  const [heroMaxHp, setHeroMaxHp] = useState(250);
  const [heroAtk, setHeroAtk] = useState('8-14');
  const [heroDef, setHeroDef] = useState(2);
  const [heroVamp, setHeroVamp] = useState(0);
  const [heroRegen, setHeroRegen] = useState(0);
  const [loopCount, setLoopCount] = useState(1);
  const [dayCount, setDayCount] = useState(1);
  const [dayProgress, setDayProgress] = useState(0);
  const [inCombat, setInCombat] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hand, setHand] = useState<CardDef[]>([]);
  const [equipped, setEquipped] = useState<Record<EquipSlot, Equipment | null>>({
    weapon: null,
    shield: null,
    armor: null,
    ring: null,
  });
  const [inventory, setInventory] = useState<Equipment[]>([]);

  // Web Audio Context for authentic retro SFX
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSfx = useCallback((type: 'slash' | 'hit' | 'loot' | 'place' | 'heal' | 'defeat') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'slash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'loot') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'place') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'heal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'defeat') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.4);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }, [soundEnabled]);

  // Initialize engine
  useEffect(() => {
    engineRef.current = new LoopHeroEngine();
    syncSnapshot();
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      if (engineRef.current) {
        const eng = engineRef.current;
        const prevCombat = eng.inCombat;
        const prevHp = eng.heroStats.hp;

        eng.update(dt);

        if (!prevCombat && eng.inCombat) {
          playSfx('hit');
        } else if (eng.inCombat && eng.heroAttackMeter === 0) {
          playSfx('slash');
        }
        if (eng.heroStats.hp < prevHp && eng.inCombat) {
          playSfx('hit');
        }
        if (eng.gameOver) {
          playSfx('defeat');
        }

        renderCanvas(eng, dt);
        syncSnapshot();
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [playSfx]);

  const syncSnapshot = () => {
    const eng = engineRef.current;
    if (!eng) return;

    setHeroHp(Math.round(eng.heroStats.hp));
    setHeroMaxHp(eng.heroStats.maxHp);
    setHeroAtk(`${eng.heroStats.atkMin}-${eng.heroStats.atkMax}`);
    setHeroDef(eng.heroStats.def);
    setHeroVamp(eng.heroStats.vampirism);
    setHeroRegen(Math.round(eng.heroStats.regen * 10) / 10);
    setLoopCount(eng.loopCount);
    setDayCount(eng.dayCount);
    setDayProgress(eng.dayProgress);
    setInCombat(eng.inCombat);
    setGameOver(eng.gameOver);
    setHand([...eng.hand]);
    setEquipped({ ...eng.equipped });
    setInventory([...eng.inventory]);
  };

  const handleRestart = () => {
    engineRef.current = new LoopHeroEngine();
    setSelectedCardIndex(null);
    syncSnapshot();
  };

  const togglePause = () => {
    if (!engineRef.current) return;
    engineRef.current.isPaused = !engineRef.current.isPaused;
    setIsPaused(engineRef.current.isPaused);
  };

  const cycleGameSpeed = () => {
    if (!engineRef.current) return;
    const next = gameSpeed === 1 ? 2 : 1;
    engineRef.current.gameSpeed = next;
    setGameSpeed(next);
  };

  const handleCardClick = (index: number) => {
    if (selectedCardIndex === index) {
      setSelectedCardIndex(null);
    } else {
      setSelectedCardIndex(index);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const eng = engineRef.current;
    if (!canvas || !eng || selectedCardIndex === null) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const tileW = canvas.width / eng.width;
    const tileH = canvas.height / eng.height;

    const gridX = Math.floor(clickX / tileW);
    const gridY = Math.floor(clickY / tileH);

    if (gridX >= 0 && gridX < eng.width && gridY >= 0 && gridY < eng.height) {
      const card = eng.hand[selectedCardIndex];
      if (eng.canPlaceCard(card, gridX, gridY)) {
        eng.placeCard(selectedCardIndex, gridX, gridY);
        playSfx('place');
        setSelectedCardIndex(null);

        // Spawn placement burst particles
        for (let i = 0; i < 16; i++) {
          particlesRef.current.push({
            x: (gridX + 0.5) * tileW,
            y: (gridY + 0.5) * tileH,
            vx: (Math.random() - 0.5) * 160,
            vy: (Math.random() - 0.5) * 160,
            color: card.color,
            size: Math.random() * 4 + 2,
            life: 0.6,
            maxLife: 0.6,
          });
        }

        syncSnapshot();
      }
    }
  };

  const equipItem = (item: Equipment, invIndex: number) => {
    if (!engineRef.current) return;
    engineRef.current.equipItem(item, invIndex);
    playSfx('loot');
    syncSnapshot();
  };

  const discardItem = (invIndex: number) => {
    if (!engineRef.current) return;
    engineRef.current.discardInventoryItem(invIndex);
    syncSnapshot();
  };

  /**
   * 60fps Canvas Render Engine
   */
  const renderCanvas = (eng: LoopHeroEngine, dt: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const tileW = w / eng.width;
    const tileH = h / eng.height;

    ctx.save();

    // Screen shake
    if (eng.screenShake > 0) {
      const dx = (Math.random() - 0.5) * eng.screenShake * 4;
      const dy = (Math.random() - 0.5) * eng.screenShake * 4;
      ctx.translate(dx, dy);
    }

    // 1. Clear background (Cosmic Void)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Subtle starfield twinkling
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137.5) % w;
      const sy = (i * 243.7) % h;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // 2. Render Board Tiles
    const selectedCard = selectedCardIndex !== null ? eng.hand[selectedCardIndex] : null;

    for (let y = 0; y < eng.height; y++) {
      for (let x = 0; x < eng.width; x++) {
        const tile = eng.grid[y][x];
        const tx = x * tileW;
        const ty = y * tileH;

        renderTileBackground(ctx, tile.tileId, tx, ty, tileW, tileH);

        // Grid highlight for valid placement if card selected
        if (selectedCard) {
          const isValid = eng.canPlaceCard(selectedCard, x, y);
          if (isValid) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
            ctx.fillRect(tx + 2, ty + 2, tileW - 4, tileH - 4);
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.strokeRect(tx + 2, ty + 2, tileW - 4, tileH - 4);
          }
        }
      }
    }

    // 3. Render Monsters on Road
    for (const [roadIdx, monsters] of eng.roadMonsters.entries()) {
      if (roadIdx < 0 || roadIdx >= eng.roadPath.length) continue;
      const pos = eng.roadPath[roadIdx];
      const mx = (pos.x + 0.5) * tileW;
      const my = (pos.y + 0.5) * tileH;

      for (let mi = 0; mi < monsters.length; mi++) {
        const monster = monsters[mi];
        const offset = (mi - (monsters.length - 1) / 2) * 14;
        renderMonster(ctx, monster, mx + offset, my, tileW, tileH);
      }
    }

    // 4. Render Hero
    renderHero(ctx, eng, tileW, tileH);

    // 5. Update and render particle effects
    renderParticles(ctx, dt);

    // 6. Floating Damage and Event Texts
    renderFloatingTexts(ctx, eng, tileW, tileH);

    // 7. Atmospheric Day / Night ambient lighting overlay
    renderAmbientLighting(ctx, eng, w, h);

    ctx.restore();
  };

  const renderTileBackground = (
    ctx: CanvasRenderingContext2D,
    tileId: string,
    tx: number,
    ty: number,
    tw: number,
    th: number
  ) => {
    if (tileId === 'empty') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeRect(tx, ty, tw, th);
    } else if (tileId === 'road') {
      ctx.fillStyle = '#452e22';
      ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = '#593e2f';
      ctx.fillRect(tx + 4, ty + 4, tw - 8, th - 8);
      ctx.fillStyle = '#785b46';
      ctx.fillRect(tx + 8, ty + 8, 8, 6);
      ctx.fillRect(tx + tw - 16, ty + th - 14, 10, 7);
      ctx.strokeStyle = '#271911';
      ctx.strokeRect(tx, ty, tw, th);
    } else if (tileId === 'campfire') {
      ctx.fillStyle = '#3a2216';
      ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = '#71717a';
      ctx.beginPath();
      ctx.arc(tx + tw / 2, ty + th / 2, 16, 0, Math.PI * 2);
      ctx.fill();
      const flicker = Math.sin(Date.now() * 0.01) * 3;
      const grad = ctx.createRadialGradient(
        tx + tw / 2,
        ty + th / 2,
        2,
        tx + tw / 2,
        ty + th / 2,
        18 + flicker
      );
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.4, '#f97316');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(tx + tw / 2, ty + th / 2, 20 + flicker, 0, Math.PI * 2);
      ctx.fill();
    } else if (tileId === 'grove') {
      ctx.fillStyle = '#14532d';
      ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.moveTo(tx + tw * 0.5, ty + 6);
      ctx.lineTo(tx + tw * 0.8, ty + th - 6);
      ctx.lineTo(tx + tw * 0.2, ty + th - 6);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(tx + tw * 0.5, ty + 12);
      ctx.lineTo(tx + tw * 0.75, ty + th - 12);
      ctx.lineTo(tx + tw * 0.25, ty + th - 12);
      ctx.fill();
    } else if (tileId === 'cemetery') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(tx + 12, ty + 14, 12, 18);
      ctx.fillRect(tx + tw - 24, ty + 18, 14, 16);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(tx + 15, ty + 8, 6, 8);
      ctx.fillRect(tx + 12, ty + 11, 12, 3);
    } else if (tileId === 'vampire_mansion') {
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(tx + 10, ty + 12, tw - 20, th - 12);
      ctx.beginPath();
      ctx.moveTo(tx + tw / 2, ty + 4);
      ctx.lineTo(tx + tw - 12, ty + 14);
      ctx.lineTo(tx + 12, ty + 14);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(tx + tw / 2 - 4, ty + 20, 8, 12);
    } else if (tileId === 'meadow' || tileId === 'blooming_meadow') {
      ctx.fillStyle = tileId === 'blooming_meadow' ? '#15803d' : '#166534';
      ctx.fillRect(tx, ty, tw, th);
      if (tileId === 'blooming_meadow') {
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(tx + 12, ty + 14, 4, 4);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(tx + tw - 16, ty + 22, 5, 5);
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(tx + tw / 2, ty + th - 16, 4, 4);
      }
    } else if (tileId === 'rock' || tileId === 'mountain' || tileId === 'mountain_peak') {
      ctx.fillStyle = tileId === 'mountain_peak' ? '#292524' : '#44403c';
      ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = tileId === 'mountain_peak' ? '#78716c' : '#57534e';
      ctx.beginPath();
      ctx.moveTo(tx + tw / 2, ty + (tileId === 'mountain_peak' ? 4 : 10));
      ctx.lineTo(tx + tw - 8, ty + th - 4);
      ctx.lineTo(tx + 8, ty + th - 4);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(tx + tw / 2, ty + (tileId === 'mountain_peak' ? 4 : 10));
      ctx.lineTo(tx + tw / 2 + 8, ty + 18);
      ctx.lineTo(tx + tw / 2 - 8, ty + 18);
      ctx.fill();
    }
  };

  const renderMonster = (
    ctx: CanvasRenderingContext2D,
    monster: Monster,
    x: number,
    y: number,
    tw: number,
    _th: number
  ) => {
    ctx.save();
    ctx.translate(x, y);

    const bob = Math.sin(Date.now() * 0.008 + x) * 3;

    ctx.fillStyle = monster.color;
    if (monster.type === 'slime') {
      ctx.beginPath();
      ctx.arc(0, bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, bob - 2, 2, 3);
      ctx.fillRect(2, bob - 2, 2, 3);
    } else if (monster.type === 'ratwolf') {
      ctx.fillRect(-9, -6 + bob, 18, 12);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(4, -2 + bob, 6, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(2, -4 + bob, 2, 2);
    } else if (monster.type === 'skeleton') {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-6, -10 + bob, 12, 12);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-4, -8 + bob, 3, 3);
      ctx.fillRect(1, -8 + bob, 3, 3);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-4, 3 + bob, 8, 7);
    } else {
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.moveTo(-10, 8 + bob);
      ctx.lineTo(10, 8 + bob);
      ctx.lineTo(0, -12 + bob);
      ctx.fill();
      ctx.fillStyle = '#fecaca';
      ctx.fillRect(-4, -8 + bob, 8, 8);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-3, -6 + bob, 2, 2);
      ctx.fillRect(1, -6 + bob, 2, 2);
    }

    // Health bar above monster
    const barW = Math.min(24, tw - 8);
    const hpRatio = Math.max(0, monster.hp / monster.maxHp);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-barW / 2, -18 + bob, barW, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-barW / 2, -18 + bob, barW * hpRatio, 4);

    if (monster.attackMeter > 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-barW / 2, -13 + bob, barW * monster.attackMeter, 2);
    }

    ctx.restore();
  };

  const renderHero = (
    ctx: CanvasRenderingContext2D,
    eng: LoopHeroEngine,
    tw: number,
    th: number
  ) => {
    const curIdx = eng.heroRoadIndex;
    const nextIdx = (curIdx + 1) % eng.roadPath.length;
    const cur = eng.roadPath[curIdx];
    const next = eng.roadPath[nextIdx];

    const hx = (cur.x + (next.x - cur.x) * eng.heroProgress + 0.5) * tw;
    const hy = (cur.y + (next.y - cur.y) * eng.heroProgress + 0.5) * th;

    const bounce = eng.inCombat ? 0 : Math.abs(Math.sin(eng.heroProgress * Math.PI * 4)) * 4;

    ctx.save();
    ctx.translate(hx, hy - bounce);

    if (!eng.inCombat && Math.random() < 0.25) {
      particlesRef.current.push({
        x: hx + (Math.random() - 0.5) * 6,
        y: hy + 8,
        vx: (Math.random() - 0.5) * 15,
        vy: -Math.random() * 20,
        color: '#a1a1aa',
        size: Math.random() * 2 + 1,
        life: 0.4,
        maxLife: 0.4,
      });
    }

    // Armored Knight Sprite
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 10 + bounce, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.fillRect(-6, -4, 12, 12);

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-5, -12, 10, 8);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-3, -9, 6, 2);

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(6, -8, 3, 14);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(5, 2, 5, 2);

    if (eng.inCombat && eng.heroAttackMeter > 0.8) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(8, -2, 14, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
    }

    // Floating Hero HP Bar
    const hpW = 28;
    const hpRatio = Math.max(0, eng.heroStats.hp / eng.heroStats.maxHp);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-hpW / 2, -22, hpW, 5);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-hpW / 2, -22, hpW * hpRatio, 5);

    if (eng.inCombat) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-hpW / 2, -16, hpW * eng.heroAttackMeter, 2);
    }

    ctx.restore();
  };

  const renderParticles = (ctx: CanvasRenderingContext2D, dt: number) => {
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const renderFloatingTexts = (
    ctx: CanvasRenderingContext2D,
    eng: LoopHeroEngine,
    tw: number,
    th: number
  ) => {
    ctx.save();
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';

    for (const ft of eng.floatingTexts) {
      const screenX = (ft.x + 0.5) * tw;
      const screenY = (ft.y + 0.5) * th;
      const alpha = Math.max(0, ft.duration / ft.maxDuration);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#000000';
      ctx.fillText(ft.text, screenX + 1, screenY + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, screenX, screenY);
    }
    ctx.restore();
  };

  const renderAmbientLighting = (
    ctx: CanvasRenderingContext2D,
    eng: LoopHeroEngine,
    w: number,
    h: number
  ) => {
    const dp = eng.dayProgress;
    let darkness = 0;

    if (dp > 0.6 && dp <= 0.8) {
      darkness = ((dp - 0.6) / 0.2) * 0.45;
    } else if (dp > 0.8 || dp <= 0.2) {
      darkness = 0.45;
      if (dp <= 0.2) {
        darkness = (1 - dp / 0.2) * 0.45;
      }
    }

    if (darkness > 0) {
      ctx.fillStyle = `rgba(10, 15, 30, ${darkness})`;
      ctx.fillRect(0, 0, w, h);
    }
  };

  const dayPercent = Math.round(dayProgress * 100);
  const hpPercent = Math.max(0, Math.min(100, Math.round((heroHp / heroMaxHp) * 100)));

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 gap-4 select-none">
      {/* Top Status & Controls HUD */}
      <div className="flex flex-wrap items-center justify-between w-full bg-card/80 border border-border p-3 rounded-xl backdrop-blur-md gap-3">
        {/* Loop & Day meter */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Loop
            </span>
            <span className="text-xl font-black text-warning">#{loopCount}</span>
          </div>

          <div className="flex flex-col min-w-28">
            <div className="flex justify-between text-xs text-muted-foreground font-semibold">
              <span>Day {dayCount}</span>
              <span>{dayPercent}%</span>
            </div>
            <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden mt-1 border border-border/40">
              <div
                className="bg-warning h-full transition-all duration-150 rounded-full w-(--day-w)"
                style={{ '--day-w': `${dayPercent}%` } as React.CSSProperties}
              />
            </div>
          </div>
        </div>

        {/* Hero Health & Combat State */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col min-w-36">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1 text-primary">
                <Heart className="size-3.5 fill-current" /> HP
              </span>
              <span className="text-foreground">
                {heroHp} / {heroMaxHp}
              </span>
            </div>
            <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden mt-1 border border-border/40">
              <div
                className="bg-primary h-full transition-all duration-150 rounded-full w-(--hp-w)"
                style={{ '--hp-w': `${hpPercent}%` } as React.CSSProperties}
              />
            </div>
          </div>

          {inCombat && (
            <span className="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-destructive/20 text-destructive border border-destructive/40 rounded-full animate-pulse">
              Combat
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={togglePause}
          >
            {isPaused ? <Play className="size-4 text-primary" /> : <Pause className="size-4" />}
          </Button>

          <Button
            variant={gameSpeed === 2 ? 'default' : 'outline'}
            size="sm"
            onClick={cycleGameSpeed}
          >
            <Zap className="size-3.5" /> {gameSpeed}x
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? (
              <Volume2 className="size-4 text-primary" />
            ) : (
              <VolumeX className="size-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleRestart}
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>

      {/* Main Game HTML5 Canvas */}
      <div className="relative w-full aspect-3/2 bg-card rounded-2xl border-2 border-border shadow-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={960}
          height={640}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex flex-col items-center justify-center p-6 gap-4 z-20">
            <h2 className="text-3xl font-black text-destructive tracking-wider">HERO FALLEN</h2>
            <p className="text-muted-foreground text-xs max-w-sm text-center">
              The loop claimed another soul. You completed {loopCount - 1} loops and survived {dayCount} days.
            </p>
            <Button onClick={handleRestart} size="lg">
              <RotateCcw className="size-4" /> Start New Expedition
            </Button>
          </div>
        )}

        {/* Placement Prompt Hint */}
        {selectedCardIndex !== null && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-background/90 border border-primary/50 px-4 py-1.5 rounded-full shadow-lg text-xs font-bold text-primary flex items-center gap-1.5 pointer-events-none animate-bounce">
            <Sparkles className="size-3.5" />
            Click highlighted green tile to place {hand[selectedCardIndex]?.name}
          </div>
        )}
      </div>

      {/* Bottom Deck & Inventory Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {/* Left: Hand of Cards */}
        <div className="flex flex-col bg-card/60 border border-border p-3.5 rounded-xl gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Deck in Hand ({hand.length}/6)
            </span>
            <span className="text-xs text-muted-foreground">
              {selectedCardIndex !== null ? 'Click board tile to place' : 'Select a card to place'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 min-h-20">
            {hand.map((card, idx) => {
              const isSelected = selectedCardIndex === idx;
              return (
                <button
                  key={`${card.id}_${idx}`}
                  type="button"
                  onClick={() => handleCardClick(idx)}
                  className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all min-w-28 ${
                    isSelected
                      ? 'border-primary bg-primary/20 ring-2 ring-primary/50 scale-105'
                      : 'border-border/60 bg-muted/40 hover:bg-muted/70 hover:border-border'
                  }`}
                >
                  <span className="text-xs font-bold text-foreground">{card.name}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {card.description}
                  </span>
                </button>
              );
            })}
            {hand.length === 0 && (
              <div className="flex items-center justify-center w-full text-xs text-muted-foreground italic h-16">
                No cards in hand. Defeat monsters to earn cards!
              </div>
            )}
          </div>
        </div>

        {/* Right: Hero Paperdoll & Equipment Bag */}
        <div className="flex flex-col bg-card/60 border border-border p-3.5 rounded-xl gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Hero Equipment
              </span>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span title="Attack Damage">⚔️ {heroAtk}</span>
                <span title="Defense">
                  <Shield className="size-3 inline text-info" /> {heroDef}
                </span>
                {heroVamp > 0 && <span title="Vampirism">🩸 {heroVamp}%</span>}
                {heroRegen > 0 && <span title="Regen">✨ +{heroRegen}/s</span>}
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Bag ({inventory.length}/12)</span>
          </div>

          {/* Equipped Slots */}
          <div className="grid grid-cols-4 gap-2">
            {(['weapon', 'shield', 'armor', 'ring'] as EquipSlot[]).map(slot => {
              const item = equipped[slot];
              return (
                <div
                  key={slot}
                  onMouseEnter={() => setHoveredEquip(item)}
                  onMouseLeave={() => setHoveredEquip(null)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border border-border/80 bg-background/50 h-16 text-center ${
                    item ? 'border-primary/40' : 'border-dashed border-border/40'
                  }`}
                >
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    {slot}
                  </span>
                  {item ? (
                    <span className="text-xs font-bold text-foreground truncate w-full text-center">
                      {item.name}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Empty</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bag Inventory */}
          <div className="flex flex-wrap gap-1.5 min-h-12 border-t border-border/40 pt-2">
            {inventory.map((item, idx) => (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredEquip(item)}
                onMouseLeave={() => setHoveredEquip(null)}
                className="flex items-center gap-1 bg-muted/60 border border-border px-2 py-1 rounded-md text-xs"
              >
                <span className="font-semibold truncate max-w-28 text-foreground">{item.name}</span>
                <button
                  type="button"
                  onClick={() => equipItem(item, idx)}
                  className="text-xs bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded hover:bg-primary/30"
                >
                  Equip
                </button>
                <button
                  type="button"
                  onClick={() => discardItem(idx)}
                  className="text-xs text-muted-foreground hover:text-destructive px-0.5"
                >
                  ✕
                </button>
              </div>
            ))}
            {inventory.length === 0 && (
              <div className="flex items-center justify-center w-full text-xs text-muted-foreground italic h-8">
                Loot dropped by monsters appears here.
              </div>
            )}
          </div>

          {/* Hovered Equipment Stat Tooltip */}
          {hoveredEquip && (
            <div className="bg-background/95 border border-border/80 p-2 rounded-lg text-xs flex flex-wrap gap-3 mt-1 shadow-md">
              <span className="font-bold text-primary">{hoveredEquip.name}</span>
              {hoveredEquip.atk > 0 && <span className="text-destructive">+{hoveredEquip.atk} ATK</span>}
              {hoveredEquip.def > 0 && <span className="text-info">+{hoveredEquip.def} DEF</span>}
              {hoveredEquip.maxHpBonus > 0 && (
                <span className="text-primary">+{hoveredEquip.maxHpBonus} Max HP</span>
              )}
              {hoveredEquip.vampirism > 0 && (
                <span className="text-destructive">+{hoveredEquip.vampirism}% Vampirism</span>
              )}
              {hoveredEquip.regen > 0 && (
                <span className="text-warning">+{hoveredEquip.regen} HP/s</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
