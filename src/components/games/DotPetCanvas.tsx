import React, { useEffect, useRef, useCallback } from 'react';
import { dotPetSprite, DOT_PET_UI_SPRITES } from '../../lib/games/sprites';
import { MobileHapticsPro, playProceduralSfx, playComboSfx } from '../../lib/games/engine-suite-unified';

interface DotPetCanvasProps {
  petType: string;
  stage: 'baby' | 'child' | 'teen' | 'adult';
  happiness: number;
  hunger: number;
  energy: number;
  isSleeping: boolean;
  onPetStroke: () => void;
  onFeedDrop: () => void;
  onPlayFetch: () => void;
  getAudioContext: () => AudioContext | null;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text?: string;
  alpha: number;
  life: number;
  maxLife: number;
  scale: number;
  color?: string;
}

export const DotPetCanvas: React.FC<DotPetCanvasProps> = ({
  petType,
  stage,
  happiness,
  hunger,
  energy,
  isSleeping,
  onPetStroke,
  onFeedDrop,
  onPlayFetch,
  getAudioContext,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  // Asset images
  const petImgRef = useRef<HTMLImageElement | null>(null);
  const ballImgRef = useRef<HTMLImageElement | null>(null);
  const bowlImgRef = useRef<HTMLImageElement | null>(null);

  // Simulation state
  const simRef = useRef({
    petX: 200,
    petY: 220,
    targetX: 200,
    vx: 0,
    scaleX: 1,
    scaleY: 1,
    hopTimer: 0,
    facing: 1, // 1 right, -1 left
    animState: 'idle' as 'idle' | 'walking' | 'jumping' | 'eating' | 'sleeping' | 'happy',
    chewTimer: 0,
    strokeStreak: 0,
    lastStrokeTime: 0,

    // Ball physics
    ball: {
      active: false,
      x: 100,
      y: 240,
      vx: 0,
      vy: 0,
      radius: 18,
      isDragging: false,
    },

    // Treat bowl
    bowl: {
      active: false,
      x: 80,
      y: 240,
      isDragging: false,
    },

    particles: [] as Particle[],
    isPointerDown: false,
    dragTarget: null as 'ball' | 'bowl' | 'pet' | null,
    dragStartPos: { x: 0, y: 0 },
    lastPointerPos: { x: 0, y: 0 },
    lastPointerTime: 0,
    pointerVelocity: { vx: 0, vy: 0 },
  });

  // Load image assets
  useEffect(() => {
    const pImg = new Image();
    pImg.src = dotPetSprite(petType, stage);
    pImg.onload = () => { petImgRef.current = pImg; };

    const bImg = new Image();
    bImg.src = DOT_PET_UI_SPRITES.ball;
    bImg.onload = () => { ballImgRef.current = bImg; };

    const wImg = new Image();
    wImg.src = DOT_PET_UI_SPRITES.bowl;
    wImg.onload = () => { bowlImgRef.current = wImg; };
  }, [petType, stage]);

  // Spawn particle helper
  const addParticle = useCallback((x: number, y: number, text: string, vy = -1.5, color = '#ff5e7e') => {
    simRef.current.particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 1.5,
      vy,
      text,
      alpha: 1,
      life: 0,
      maxLife: 45 + Math.random() * 20,
      scale: 0.8 + Math.random() * 0.4,
      color,
    });
  }, []);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const sim = simRef.current;
      const floorY = height - 45;

      // 1. Background rendering
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (isSleeping) {
        bgGrad.addColorStop(0, '#0a0d1a');
        bgGrad.addColorStop(1, '#151b2e');
      } else {
        bgGrad.addColorStop(0, 'rgba(240, 246, 255, 0.4)');
        bgGrad.addColorStop(1, 'rgba(224, 237, 255, 0.8)');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Floor line with soft ambient shadow
      ctx.fillStyle = isSleeping ? 'rgba(30, 41, 59, 0.7)' : 'rgba(203, 213, 225, 0.4)';
      ctx.fillRect(0, floorY, width, height - floorY);
      ctx.strokeStyle = isSleeping ? 'rgba(51, 65, 85, 0.5)' : 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(width, floorY);
      ctx.stroke();

      // Ambient night stars/motes
      if (isSleeping) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < 12; i++) {
          const sx = ((i * 73 + currentTime * 0.005) % width);
          const sy = ((i * 37) % (floorY - 40));
          const size = (i % 2 === 0 ? 1.5 : 2.5);
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Pet physics & state update
      const petSize = stage === 'baby' ? 64 : stage === 'child' ? 76 : stage === 'teen' ? 90 : 100;
      const petRadius = petSize * 0.45;

      // Return elastic squash/stretch back to 1
      sim.scaleX += (1 - sim.scaleX) * 0.12;
      sim.scaleY += (1 - sim.scaleY) * 0.12;

      if (isSleeping) {
        sim.animState = 'sleeping';
        sim.targetX = width * 0.5;
        // Periodic Zzz particles
        if (Math.random() < 0.03) {
          addParticle(sim.petX + 15, sim.petY - petSize * 0.5, '💤', -0.8, '#a5b4fc');
        }
      } else if (sim.chewTimer > 0) {
        sim.chewTimer -= dt;
        sim.animState = 'eating';
        sim.scaleY = 1 + Math.sin(currentTime * 0.03) * 0.12;
        sim.scaleX = 1 - Math.sin(currentTime * 0.03) * 0.08;
        if (Math.random() < 0.1) {
          addParticle(sim.petX, sim.petY - 10, '✨', -1.2, '#f59e0b');
        }
      } else if (sim.ball.active && !sim.ball.isDragging) {
        // Chase ball if active
        sim.targetX = sim.ball.x;
        const distToBall = Math.abs(sim.ball.x - sim.petX);
        if (distToBall < 30 && Math.abs(sim.ball.y - sim.petY) < 30) {
          // Pet pounced on ball!
          sim.ball.vx = (sim.facing > 0 ? 250 : -250) + (Math.random() - 0.5) * 100;
          sim.ball.vy = -200 - Math.random() * 100;
          sim.scaleX = 1.3;
          sim.scaleY = 0.7;
          addParticle(sim.petX, sim.petY - 20, '⚽ 멍멍!', -2.0, '#10b981');
          MobileHapticsPro.medium();
          const actx = getAudioContext();
          if (actx) playProceduralSfx(actx, 'jump');
          onPlayFetch();
        }
      } else {
        // Random wandering when idle
        sim.hopTimer -= dt;
        if (sim.hopTimer <= 0) {
          sim.hopTimer = 2 + Math.random() * 4;
          sim.targetX = 60 + Math.random() * (width - 120);
        }
      }

      // Move toward targetX
      const dx = sim.targetX - sim.petX;
      if (Math.abs(dx) > 6 && !isSleeping) {
        sim.facing = dx > 0 ? 1 : -1;
        sim.vx = Math.sign(dx) * Math.min(Math.abs(dx) * 3, 110);
        sim.petX += sim.vx * dt;
        // Natural hopping bob
        sim.petY = (floorY - petSize * 0.45) - Math.abs(Math.sin(currentTime * 0.008)) * 14;
      } else {
        sim.vx = 0;
        sim.petY = (floorY - petSize * 0.45) - Math.sin(currentTime * 0.003) * 3;
      }

      // Clamp within canvas boundaries
      sim.petX = Math.max(petRadius + 10, Math.min(width - petRadius - 10, sim.petX));

      // 3. Render Ground Shadow
      ctx.save();
      ctx.beginPath();
      const shadowY = floorY + 4;
      const shadowW = (petSize * 0.55) * sim.scaleX;
      const shadowH = 10 * sim.scaleY;
      ctx.ellipse(sim.petX, shadowY, shadowW, shadowH, 0, 0, Math.PI * 2);
      ctx.fillStyle = isSleeping ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.12)';
      ctx.fill();
      ctx.restore();

      // 4. Render Pet Sprite with Squash & Stretch
      ctx.save();
      ctx.translate(sim.petX, sim.petY);
      ctx.scale(sim.facing * sim.scaleX, sim.scaleY);

      if (petImgRef.current && petImgRef.current.complete) {
        ctx.drawImage(
          petImgRef.current,
          -petSize * 0.5,
          -petSize * 0.5,
          petSize,
          petSize
        );
      } else {
        // Fallback placeholder circle
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(0, 0, petRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 5. Render Draggable Ball (if active)
      if (sim.ball.active) {
        const b = sim.ball;
        if (!b.isDragging) {
          // Physics: gravity + bounce
          b.vy += 650 * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;

          // Floor bounce
          if (b.y > floorY - b.radius) {
            b.y = floorY - b.radius;
            b.vy = -b.vy * 0.68;
            b.vx *= 0.88;
            if (Math.abs(b.vy) > 40) {
              const actx = getAudioContext();
              if (actx) playProceduralSfx(actx, 'tap');
            }
          }
          // Wall bounce
          if (b.x < b.radius) {
            b.x = b.radius;
            b.vx = -b.vx * 0.7;
          } else if (b.x > width - b.radius) {
            b.x = width - b.radius;
            b.vx = -b.vx * 0.7;
          }
        }

        // Ball shadow
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(b.x, floorY + 2, b.radius * 0.8, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();
        ctx.restore();

        // Ball sprite
        if (ballImgRef.current && ballImgRef.current.complete) {
          ctx.drawImage(ballImgRef.current, b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2);
        } else {
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 6. Render Draggable Bowl (if active)
      if (sim.bowl.active) {
        const bw = sim.bowl;
        ctx.save();
        if (bowlImgRef.current && bowlImgRef.current.complete) {
          ctx.drawImage(bowlImgRef.current, bw.x - 22, bw.y - 22, 44, 44);
        } else {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(bw.x, bw.y, 18, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 7. Render Floating Particles
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.font = `bold ${Math.round(15 * p.scale)}px system-ui, sans-serif`;
        ctx.fillStyle = p.color || '#ff5e7e';
        ctx.textAlign = 'center';
        if (p.text) {
          ctx.fillText(p.text, p.x, p.y);
        }
        ctx.restore();

        if (p.life >= p.maxLife) {
          sim.particles.splice(i, 1);
        }
      }

      // 8. Interactive Touch Hint Overlay (if idle)
      if (!isSleeping && sim.particles.length === 0 && !sim.ball.active && !sim.bowl.active) {
        ctx.save();
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillStyle = isSleeping ? 'rgba(255, 255, 255, 0.4)' : 'rgba(100, 116, 139, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText('✨ 손가락으로 펫을 쓰다듬거나 장난감을 던져주세요', width * 0.5, 28);
        ctx.restore();
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSleeping, stage, getAudioContext, onPlayFetch, addParticle]);

  // Pointer event handlers for direct tactile petting & drag
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const sim = simRef.current;
    sim.isPointerDown = true;
    sim.lastPointerPos = { x, y };
    sim.lastPointerTime = performance.now();

    // Check hit on Ball
    if (sim.ball.active) {
      const distToBall = Math.hypot(x - sim.ball.x, y - sim.ball.y);
      if (distToBall <= sim.ball.radius + 14) {
        sim.dragTarget = 'ball';
        sim.ball.isDragging = true;
        sim.ball.vx = 0;
        sim.ball.vy = 0;
        MobileHapticsPro.light();
        return;
      }
    }

    // Check hit on Bowl
    if (sim.bowl.active) {
      const distToBowl = Math.hypot(x - sim.bowl.x, y - sim.bowl.y);
      if (distToBowl <= 30) {
        sim.dragTarget = 'bowl';
        sim.bowl.isDragging = true;
        MobileHapticsPro.light();
        return;
      }
    }

    // Check hit on Pet (Poke / Pet)
    const petSize = stage === 'baby' ? 64 : stage === 'child' ? 76 : stage === 'teen' ? 90 : 100;
    const distToPet = Math.hypot(x - sim.petX, y - sim.petY);
    if (distToPet <= petSize * 0.6) {
      sim.dragTarget = 'pet';
      sim.scaleX = 1.25;
      sim.scaleY = 0.78;
      sim.strokeStreak += 1;
      addParticle(sim.petX, sim.petY - 25, '💗', -2.2);
      MobileHapticsPro.light();
      const actx = getAudioContext();
      if (actx) playComboSfx(actx, 'gem', sim.strokeStreak);
      onPetStroke();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const sim = simRef.current;
    const now = performance.now();
    const dt = Math.max((now - sim.lastPointerTime) / 1000, 0.001);

    sim.pointerVelocity = {
      vx: (x - sim.lastPointerPos.x) / dt,
      vy: (y - sim.lastPointerPos.y) / dt,
    };
    sim.lastPointerPos = { x, y };
    sim.lastPointerTime = now;

    if (!sim.isPointerDown) return;

    if (sim.dragTarget === 'ball') {
      sim.ball.x = x;
      sim.ball.y = y;
    } else if (sim.dragTarget === 'bowl') {
      sim.bowl.x = x;
      sim.bowl.y = y;
      // Check if dropped/hovered near pet mouth
      const distToPet = Math.hypot(x - sim.petX, y - sim.petY);
      if (distToPet < 55) {
        sim.chewTimer = 1.5;
        sim.bowl.active = false;
        sim.dragTarget = null;
        MobileHapticsPro.success();
        const actx = getAudioContext();
        if (actx) playProceduralSfx(actx, 'coin');
        addParticle(sim.petX, sim.petY - 30, '😋 냠냠!', -2.0, '#f59e0b');
        onFeedDrop();
      }
    } else {
      // Pet stroking movement check
      const petSize = stage === 'baby' ? 64 : stage === 'child' ? 76 : stage === 'teen' ? 90 : 100;
      const distToPet = Math.hypot(x - sim.petX, y - sim.petY);
      if (distToPet <= petSize * 0.75 && (now - sim.lastStrokeTime > 180)) {
        sim.lastStrokeTime = now;
        sim.strokeStreak += 1;
        sim.scaleX = 1.15;
        sim.scaleY = 0.85;
        addParticle(x, y, sim.strokeStreak % 2 === 0 ? '💗' : '🎵', -2.0);
        MobileHapticsPro.light();
        const actx = getAudioContext();
        if (actx) playComboSfx(actx, 'gem', sim.strokeStreak);
        onPetStroke();
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    const sim = simRef.current;
    sim.isPointerDown = false;

    if (sim.dragTarget === 'ball') {
      sim.ball.isDragging = false;
      // Impart throw velocity
      sim.ball.vx = Math.max(-450, Math.min(450, sim.pointerVelocity.vx * 0.7));
      sim.ball.vy = Math.max(-500, Math.min(200, sim.pointerVelocity.vy * 0.7));
    } else if (sim.dragTarget === 'bowl') {
      sim.bowl.isDragging = false;
    }
    sim.dragTarget = null;
  };

  // External triggers from toy rack
  const spawnToyBall = () => {
    const sim = simRef.current;
    sim.ball.active = true;
    sim.ball.x = sim.petX > 200 ? 80 : 300;
    sim.ball.y = 80;
    sim.ball.vx = (Math.random() - 0.5) * 150;
    sim.ball.vy = 100;
    MobileHapticsPro.medium();
    const actx = getAudioContext();
    if (actx) playProceduralSfx(actx, 'jump');
  };

  const spawnTreatBowl = () => {
    const sim = simRef.current;
    sim.bowl.active = true;
    sim.bowl.x = 90;
    sim.bowl.y = 120;
    MobileHapticsPro.light();
    const actx = getAudioContext();
    if (actx) playProceduralSfx(actx, 'tap');
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 2D Tactile Canvas Arena */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-72 sm:h-80 rounded-3xl border-2 border-primary/30 shadow-inner touch-none cursor-pointer overflow-hidden"
      />

      {/* Interactive Toy Tray */}
      <div className="flex items-center justify-center gap-3 mt-3 w-full">
        <button
          type="button"
          onClick={spawnTreatBowl}
          className="flex-1 min-h-12 flex items-center justify-center gap-2 rounded-2xl bg-card border border-border/80 px-3 py-2 text-xs font-black text-foreground shadow-sm hover:border-primary active:scale-95 transition-all"
        >
          <img src={DOT_PET_UI_SPRITES.bowl} alt="" className="size-5 object-contain" />
          <span>먹이 던지기</span>
        </button>

        <button
          type="button"
          onClick={spawnToyBall}
          className="flex-1 min-h-12 flex items-center justify-center gap-2 rounded-2xl bg-card border border-border/80 px-3 py-2 text-xs font-black text-foreground shadow-sm hover:border-primary active:scale-95 transition-all"
        >
          <img src={DOT_PET_UI_SPRITES.ball} alt="" className="size-5 object-contain" />
          <span>공 던지기</span>
        </button>
      </div>
    </div>
  );
};
