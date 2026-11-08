import React, { useEffect, useRef } from 'react';
import type { Lane } from '../../lib/games/unseen-boss';

interface Props {
  activeLane: Lane | null;
  phase: string;
  isWon: boolean;
  isLost: boolean;
  reducedMotion: boolean;
  onPingNode?: (lane: Lane) => void;
}

interface PingWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  color: string;
}

export const UnseenBossRadar: React.FC<Props> = ({
  activeLane,
  phase,
  isWon,
  isLost,
  reducedMotion,
  onPingNode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animIdRef = useRef<number | null>(null);
  const sweepAngleRef = useRef<number>(0);
  const wavesRef = useRef<PingWave[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const prevActiveRef = useRef<Lane | null>(null);

  // Trigger pulse wave on lane change
  useEffect(() => {
    if (activeLane !== null && activeLane !== prevActiveRef.current) {
      prevActiveRef.current = activeLane;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const cx = w / 2;
      const cy = h / 2 + 10;
      const r = Math.min(cx, cy) * 0.72;

      // Positions for Left (0), Center (1), Right (2)
      // Left: 215 deg, Center: 270 deg (top), Right: 325 deg
      const angles: Record<number, number> = {
        0: (215 * Math.PI) / 180,
        1: (270 * Math.PI) / 180,
        2: (325 * Math.PI) / 180,
      };

      const angle = angles[activeLane] ?? (270 * Math.PI) / 180;
      const nx = cx + Math.cos(angle) * r;
      const ny = cy + Math.sin(angle) * r;

      // Add concentric sonar waves
      for (let i = 0; i < 3; i++) {
        wavesRef.current.push({
          x: nx,
          y: ny,
          radius: i * 8,
          maxRadius: r * 1.5,
          alpha: 1.0 - i * 0.2,
          color: 'oklch(0.72 0.18 150)', // Emerald / Cyan radar ping
        });
      }

      // Add acoustic particles
      for (let i = 0; i < 16; i++) {
        const pAngle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 2.2;
        particlesRef.current.push({
          x: nx,
          y: ny,
          vx: Math.cos(pAngle) * speed,
          vy: Math.sin(pAngle) * speed,
          alpha: 1,
          life: 30 + Math.random() * 20,
          color: 'oklch(0.78 0.16 160)',
        });
      }
    } else if (activeLane === null) {
      prevActiveRef.current = null;
    }
  }, [activeLane]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = (time: number) => {
      if (!isRunning) return;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2 + 10;
      const maxR = Math.min(cx, cy) * 0.78;

      // 1. Radar Background Scope
      ctx.fillStyle = 'rgba(8, 14, 26, 0.95)';
      ctx.beginPath();
      ctx.arc(cx, cy, maxR + 12, 0, Math.PI * 2);
      ctx.fill();

      // Outer bezel ring
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR + 10, 0, Math.PI * 2);
      ctx.stroke();

      // Degree tick marks
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 36; i++) {
        const theta = (i * 10 * Math.PI) / 180;
        const tickLen = i % 9 === 0 ? 8 : 4;
        const x1 = cx + Math.cos(theta) * (maxR + 10);
        const y1 = cy + Math.sin(theta) * (maxR + 10);
        const x2 = cx + Math.cos(theta) * (maxR + 10 - tickLen);
        const y2 = cy + Math.sin(theta) * (maxR + 10 - tickLen);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Concentric Range Rings (25%, 50%, 75%, 100%)
      const rings = [0.25, 0.5, 0.75, 1.0];
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      rings.forEach((ratio) => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * ratio, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Crosshairs
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      // 2. Rotating Radar Sweep Beam
      if (!reducedMotion) {
        sweepAngleRef.current = (time * 0.0016) % (Math.PI * 2);
        const sAngle = sweepAngleRef.current;

        // Draw radial sweep cone
        const coneAngle = Math.PI * 0.22;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0.02)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, sAngle - coneAngle, sAngle);
        ctx.closePath();
        ctx.fill();

        // Sweep leading line
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sAngle) * maxR, cy + Math.sin(sAngle) * maxR);
        ctx.stroke();
      }

      // 3. Update & Draw Sonar Waves
      for (let i = wavesRef.current.length - 1; i >= 0; i--) {
        const wave = wavesRef.current[i];
        wave.radius += 2.2;
        wave.alpha = Math.max(0, 1 - wave.radius / wave.maxRadius);

        ctx.strokeStyle = `rgba(52, 211, 153, ${wave.alpha * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.stroke();

        if (wave.radius >= wave.maxRadius || wave.alpha <= 0.01) {
          wavesRef.current.splice(i, 1);
        }
      }

      // 4. Update & Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;
        p.life -= 1;

        ctx.fillStyle = `rgba(52, 211, 153, ${Math.max(0, p.alpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();

        if (p.life <= 0 || p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      // 5. Sensor Nodes (Left: 0, Center: 1, Right: 2)
      const angles: Record<number, number> = {
        0: (215 * Math.PI) / 180,
        1: (270 * Math.PI) / 180,
        2: (325 * Math.PI) / 180,
      };
      const nodeLabels = ['◀ LEFT', '● CTR', '▶ RIGHT'];

      ([0, 1, 2] as const).forEach((lane) => {
        const theta = angles[lane];
        const nx = cx + Math.cos(theta) * (maxR * 0.88);
        const ny = cy + Math.sin(theta) * (maxR * 0.88);
        const isActive = activeLane === lane;

        // Node Glow
        if (isActive) {
          const glowGrad = ctx.createRadialGradient(nx, ny, 2, nx, ny, 24);
          glowGrad.addColorStop(0, 'rgba(52, 211, 153, 0.9)');
          glowGrad.addColorStop(1, 'rgba(52, 211, 153, 0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(nx, ny, 24, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node Outer Ring
        ctx.fillStyle = isActive ? 'rgba(16, 185, 129, 0.95)' : 'rgba(30, 41, 59, 0.85)';
        ctx.strokeStyle = isActive ? 'rgba(110, 231, 183, 1)' : 'rgba(100, 116, 139, 0.5)';
        ctx.lineWidth = isActive ? 2.5 : 1.5;

        ctx.beginPath();
        ctx.arc(nx, ny, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Node Center Core
        ctx.fillStyle = isActive ? '#ffffff' : 'rgba(148, 163, 184, 0.7)';
        ctx.beginPath();
        ctx.arc(nx, ny, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Node Text Label
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = isActive ? 'rgba(110, 231, 183, 1)' : 'rgba(148, 163, 184, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(nodeLabels[lane], nx, ny + 26);
      });

      // 6. Boss Target Tracking or Glitch Interference
      if (isWon) {
        // Target Locked Reticle in center
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, 32 + Math.sin(time * 0.008) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = 'rgba(239, 68, 68, 1)';
        ctx.textAlign = 'center';
        ctx.fillText('TARGET IDENTIFIED', cx, cy - 42);
      } else if (isLost) {
        // Static Glitch Lines
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
          const gy = cy - maxR + Math.random() * (maxR * 2);
          ctx.beginPath();
          ctx.moveTo(cx - maxR, gy);
          ctx.lineTo(cx + maxR, gy);
          ctx.stroke();
        }
      }

      ctx.restore();
      animIdRef.current = requestAnimationFrame(render);
    };

    animIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [reducedMotion, activeLane, isWon, isLost]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPingNode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2 + 10;
    const maxR = Math.min(cx, cy) * 0.78;

    const angles: Record<number, number> = {
      0: (215 * Math.PI) / 180,
      1: (270 * Math.PI) / 180,
      2: (325 * Math.PI) / 180,
    };

    // Check hit test for 3 sensor nodes
    ([0, 1, 2] as const).forEach((lane) => {
      const theta = angles[lane];
      const nx = cx + Math.cos(theta) * (maxR * 0.88);
      const ny = cy + Math.sin(theta) * (maxR * 0.88);
      const dist = Math.hypot(x - nx, y - ny);
      if (dist < 32) {
        onPingNode(lane);
      }
    });
  };

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-inner">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider text-primary">
        <span className="inline-block size-2 rounded-full bg-primary animate-pulse" />
        <span>SONAR ACQ-SYS // MK.IV</span>
      </div>
      <div className="absolute top-3 right-3 z-10 text-xs font-mono text-muted-foreground">
        PHASE: <span className="font-bold text-foreground uppercase">{phase}</span>
      </div>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="h-64 w-full cursor-crosshair touch-none select-none sm:h-72"
      />
    </div>
  );
};
