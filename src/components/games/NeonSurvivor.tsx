import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  type NeonSurvivorState,
  type UpgradeCard,
  createInitialNeonSurvivorState,
  updateNeonSurvivor,
  selectUpgrade,
} from '../../lib/games/neon-survivor';
import type { Locale } from '../../lib/i18n';

interface Props {
  locale?: Locale;
}

const drawRoundRect = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, w, h, r);
  } else {
    c.rect(x, y, w, h);
  }
};

const COPY = {
  ko: {
    title: '네온 서바이버',
    subtitle: '100% 캔버스 기반 네온 로그라이크 서바이벌',
    time: '생존 시간',
    kills: '격추 수',
    score: '점수',
    level: '레벨',
    levelup: '⚡ 시스템 오버클럭 — 업그레이드 선택',
    gameover: '신호 두절 — 기체 파괴',
    restart: '다시 출격 (RETRY)',
    soundOn: '소리 켜기',
    soundOff: '소리 끄기',
    controlsHint: '모바일: 터치 드래그 가상 조이스틱 · PC: WASD / 방향키 이동 (자동 사격)',
  },
  en: {
    title: 'Neon Survivor',
    subtitle: '100% Canvas Horde Survival Roguelite',
    time: 'Time',
    kills: 'Kills',
    score: 'Score',
    level: 'Level',
    levelup: '⚡ System Overclock — Choose Upgrade',
    gameover: 'Signal Lost — Hull Destroyed',
    restart: 'Deploy Again (RETRY)',
    soundOn: 'Unmute',
    soundOff: 'Mute',
    controlsHint: 'Mobile: Touch-drag virtual joystick · PC: WASD / Arrow keys (Auto-attack)',
  },
  ja: {
    title: 'ネオン・サバイバー',
    subtitle: '100%キャンバス高速ローグライクサバイバル',
    time: '生存時間',
    kills: '撃破数',
    score: 'スコア',
    level: 'レベル',
    levelup: '⚡ システムオーバークロック — アップグレード選択',
    gameover: '通信途絶 — 機体大破',
    restart: '再出撃 (RETRY)',
    soundOn: '消音解除',
    soundOff: '消音',
    controlsHint: 'モバイル: タッチドラッグ仮想ジョイスティック · PC: WASD / 矢印キー移動 (自動射撃)',
  },
  zh: {
    title: '霓虹幸存者',
    subtitle: '100% Canvas 无限割草肉鸽幸存者',
    time: '存活时间',
    kills: '击破数',
    score: '分数',
    level: '等级',
    levelup: '⚡ 系统超频 — 选择升级模块',
    gameover: '信号中断 — 机体损毁',
    restart: '重新出击 (RETRY)',
    soundOn: '开启声音',
    soundOff: '静音',
    controlsHint: '手机: 触摸拖动虚拟摇杆 · 电脑: WASD / 方向键移动 (自动攻击)',
  },
  fr: {
    title: 'Neon Survivor',
    subtitle: 'Jeu de survie en horde 100 % Canvas',
    time: 'Temps',
    kills: 'Ennemis',
    score: 'Score',
    level: 'Niveau',
    levelup: '⚡ Surcadençage — Choisissez une amélioration',
    gameover: 'Signal perdu — Vaisseau détruit',
    restart: 'Redéployer (RETRY)',
    soundOn: 'Activer le son',
    soundOff: 'Couper le son',
    controlsHint: 'Mobile : Joystick virtuel tactile · PC : WASD / Flèches (Tir automatique)',
  },
  es: {
    title: 'Neon Survivor',
    subtitle: 'Juego de supervivencia de hordas 100% Canvas',
    time: 'Tiempo',
    kills: 'Bajas',
    score: 'Puntos',
    level: 'Nivel',
    levelup: '⚡ Sobrerreloj del sistema — Elige mejora',
    gameover: 'Señal perdida — Casco destruido',
    restart: 'Desplegar de nuevo (RETRY)',
    soundOn: 'Activar sonido',
    soundOff: 'Silenciar',
    controlsHint: 'Móvil: Joystick virtual táctil · PC: WASD / Flechas (Disparo automático)',
  },
};

export default function NeonSurvivor({ locale = 'ko' }: Props) {
  const t = COPY[locale] ?? COPY.en;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<NeonSurvivorState>(createInitialNeonSurvivorState);
  const stateRef = useRef<NeonSurvivorState>(gameState);
  stateRef.current = gameState;

  // Sound Synthesizer
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  }, []);

  const playZapSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }, [getAudioContext]);

  const playGemSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(1900, now + 0.06);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }, [getAudioContext]);

  const playLevelUpSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.06;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  }, [getAudioContext]);

  const playHitSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }, [getAudioContext]);

  // Input state
  const inputVectorRef = useRef({ x: 0, y: 0 });
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);
  const touchCurrentRef = useRef<{ x: number; y: number } | null>(null);
  const shakeRef = useRef(0);
  const keysDownRef = useRef<Record<string, boolean>>({});

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Level Up sound and vibration
  const prevLevelRef = useRef(gameState.player.level);
  useEffect(() => {
    if (gameState.player.level > prevLevelRef.current) {
      playLevelUpSound();
      vibrate([40, 40, 80]);
    }
    prevLevelRef.current = gameState.player.level;
  }, [gameState.player.level, playLevelUpSound, vibrate]);

  // Main 120fps Game & Canvas Render Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let bulletSoundCooldown = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // 1. Calculate keyboard vector
      let kx = 0;
      let ky = 0;
      if (keysDownRef.current['w'] || keysDownRef.current['arrowup']) ky -= 1;
      if (keysDownRef.current['s'] || keysDownRef.current['arrowdown']) ky += 1;
      if (keysDownRef.current['a'] || keysDownRef.current['arrowleft']) kx -= 1;
      if (keysDownRef.current['d'] || keysDownRef.current['arrowright']) kx += 1;

      // Combine with touch joystick
      let activeX = kx;
      let activeY = ky;
      if (touchOriginRef.current && touchCurrentRef.current) {
        const dx = touchCurrentRef.current.x - touchOriginRef.current.x;
        const dy = touchCurrentRef.current.y - touchOriginRef.current.y;
        const dist = Math.hypot(dx, dy);
        const maxDist = 55;
        if (dist > 5) {
          activeX = dx / Math.max(dist, maxDist);
          activeY = dy / Math.max(dist, maxDist);
        }
      }

      inputVectorRef.current = { x: activeX, y: activeY };

      // 2. Step game state if not paused
      if (!stateRef.current.gameOver && !stateRef.current.levelUpPending) {
        const prevHp = stateRef.current.player.hp;
        const prevProjCount = stateRef.current.projectiles.length;
        const prevExp = stateRef.current.player.exp;
        const prevLevelUp = stateRef.current.levelUpPending;
        const prevGameOver = stateRef.current.gameOver;
        const next = updateNeonSurvivor(stateRef.current, dt, inputVectorRef.current);

        // Sound & FX triggers
        if (next.player.hp < prevHp) {
          shakeRef.current = 10;
          playHitSound();
          vibrate([60, 40]);
        }

        if (next.player.exp > prevExp) {
          playGemSound();
        }

        if (next.levelUpPending && !prevLevelUp) {
          playLevelUpSound();
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#38bdf8', '#10b981', '#f43f5e', '#fbbf24'],
          });
        }

        if (next.gameOver && !prevGameOver) {
          vibrate([100, 50, 100]);
        }

        bulletSoundCooldown += dt;
        if (next.projectiles.length > prevProjCount && bulletSoundCooldown > 0.15) {
          bulletSoundCooldown = 0;
          playZapSound();
        }

        setGameState(next);
      }

      // 3. Render directly onto Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderCanvas(ctx, canvas, stateRef.current);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playHitSound, playZapSound, playGemSound, playLevelUpSound, vibrate]);

  // Canvas drawing function
  const renderCanvas = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, state: NeonSurvivorState) => {
    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;

    if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
      canvas.width = displayW * dpr;
      canvas.height = displayH * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Camera follow player
    const camX = Math.round(state.player.x - displayW / 2);
    const camY = Math.round(state.player.y - displayH / 2);

    // Apply Screen Shake
    if (shakeRef.current > 0) {
      const shakeMag = shakeRef.current;
      ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
      shakeRef.current = Math.max(0, shakeRef.current - 0.5);
    }

    // Clear background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, displayW, displayH);

    // Draw Cyber Neon Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 64;
    const startGridX = -((camX % gridSize) + gridSize) % gridSize;
    const startGridY = -((camY % gridSize) + gridSize) % gridSize;

    ctx.beginPath();
    for (let x = startGridX; x < displayW; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, displayH);
    }
    for (let y = startGridY; y < displayH; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(displayW, y);
    }
    ctx.stroke();

    // Arena boundary border
    const arenaScreenLeft = 0 - camX;
    const arenaScreenTop = 0 - camY;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(arenaScreenLeft, arenaScreenTop, state.arenaWidth, state.arenaHeight);

    // Draw Gems
    for (const g of state.gems) {
      const gx = g.x - camX;
      const gy = g.y - camY;
      if (gx < -20 || gx > displayW + 20 || gy < -20 || gy > displayH + 20) continue;

      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(state.survivalTime * 2);
      ctx.fillStyle = g.color;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Draw Projectiles
    for (const p of state.projectiles) {
      const px = p.x - camX;
      const py = p.y - camY;
      if (px < -20 || px > displayW + 20 || py < -20 || py > displayH + 20) continue;

      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px, py, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Orbit Blades
    const orbitLevel = state.weapons.orbit;
    if (orbitLevel > 0) {
      const bladeCount = orbitLevel + 1;
      const orbitRadius = 75;
      for (let i = 0; i < bladeCount; i++) {
        const bAngle = state.orbitAngle + (i * Math.PI * 2) / bladeCount;
        const bx = state.player.x + Math.cos(bAngle) * orbitRadius - camX;
        const by = state.player.y + Math.sin(bAngle) * orbitRadius - camY;

        ctx.save();
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(bx, by, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw Enemies
    for (const e of state.enemies) {
      const ex = e.x - camX;
      const ey = e.y - camY;
      if (ex < -40 || ex > displayW + 40 || ey < -40 || ey > displayH + 40) continue;

      ctx.save();
      ctx.translate(ex, ey);
      ctx.fillStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = e.kind === 'boss' ? 20 : 10;

      if (e.kind === 'scout') {
        // Red Triangle
        const faceAngle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
        ctx.rotate(faceAngle);
        ctx.beginPath();
        ctx.moveTo(e.radius * 1.2, 0);
        ctx.lineTo(-e.radius, -e.radius * 0.8);
        ctx.lineTo(-e.radius * 0.5, 0);
        ctx.lineTo(-e.radius, e.radius * 0.8);
        ctx.closePath();
        ctx.fill();
      } else if (e.kind === 'swarmer') {
        // Purple Diamond
        ctx.beginPath();
        ctx.moveTo(0, -e.radius);
        ctx.lineTo(e.radius, 0);
        ctx.lineTo(0, e.radius);
        ctx.lineTo(-e.radius, 0);
        ctx.closePath();
        ctx.fill();
      } else if (e.kind === 'brute') {
        // Cyan Hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const hx = Math.cos(a) * e.radius;
          const hy = Math.sin(a) * e.radius;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
      } else if (e.kind === 'boss') {
        // Golden Dreadnought Star
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? e.radius : e.radius * 0.6;
          const a = (i * Math.PI) / 4 + state.survivalTime;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    // Draw Player Ship
    const px = state.player.x - camX;
    const py = state.player.y - camY;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(state.player.facing);

    // Thruster exhaust flame
    const isMoving = Math.hypot(state.player.vx, state.player.vy) > 10;
    if (isMoving) {
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(-16, -5);
      ctx.lineTo(-26 - Math.random() * 8, 0);
      ctx.lineTo(-16, 5);
      ctx.closePath();
      ctx.fill();
    }

    // Main Cyber Ship
    const alpha = state.player.invulnTimer > 0 ? (Math.sin(state.survivalTime * 30) > 0 ? 0.4 : 1.0) : 1.0;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-14, -12);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-14, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit neon core
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(2, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw Floating Damage Texts
    for (const t of state.floatingTexts) {
      const tx = t.x - camX;
      const ty = t.y - camY;
      ctx.save();
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 6;
      ctx.fillText(t.text, tx, ty);
      ctx.restore();
    }

    // Draw Touch Virtual Joystick (if active)
    if (touchOriginRef.current && touchCurrentRef.current) {
      const ox = touchOriginRef.current.x;
      const oy = touchOriginRef.current.y;
      const cx = touchCurrentRef.current.x;
      const cy = touchCurrentRef.current.y;

      ctx.save();
      // Outer ring
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ox, oy, 55, 0, Math.PI * 2);
      ctx.stroke();

      // Inner stick
      const dx = cx - ox;
      const dy = cy - oy;
      const d = Math.hypot(dx, dy);
      const kx = ox + (dx / Math.max(d, 55)) * Math.min(d, 55);
      const ky = oy + (dy / Math.max(d, 55)) * Math.min(d, 55);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.beginPath();
      ctx.arc(kx, ky, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // In-Canvas Cyberpunk HUD
    ctx.save();
    // 1. Top EXP Bar
    const expRatio = Math.min(1, state.player.exp / Math.max(1, state.player.nextExp));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, displayW, 6);
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.fillRect(0, 0, displayW * expRatio, 6);

    // 2. Player Status Badge (Top Left)
    const hudY = 16;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    const badgeW = 165;
    const badgeH = 34;
    ctx.beginPath();
    drawRoundRect(ctx, 16, hudY, badgeW, badgeH, 8);
    ctx.fill();
    ctx.stroke();

    // Level text
    ctx.font = 'bold 13px ui-monospace, monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`LV.${state.player.level}`, 24, hudY + 22);

    // HP Bar inside badge
    const hpX = 66;
    const hpY = hudY + 11;
    const hpW = 100;
    const hpH = 12;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.beginPath();
    drawRoundRect(ctx, hpX, hpY, hpW, hpH, 4);
    ctx.fill();

    const hpRatio = Math.max(0, state.player.hp / state.player.maxHp);
    ctx.fillStyle = state.player.hp < 30 ? '#ef4444' : '#10b981';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    drawRoundRect(ctx, hpX, hpY, hpW * hpRatio, hpH, 4);
    ctx.fill();

    // 3. Time & Kills (Top Center / Right)
    const infoW = 150;
    const infoH = 34;
    const infoX = displayW - 16 - infoW - 56; // leave room for sound button
    if (infoX > 190) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      drawRoundRect(ctx, infoX, hudY, infoW, infoH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 12px ui-monospace, monospace';
      ctx.fillStyle = '#ffffff';
      const timeStr = formatTime(state.survivalTime);
      ctx.fillText(`⏱ ${timeStr}`, infoX + 10, hudY + 22);
      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`💀 ${state.kills}`, infoX + 88, hudY + 22);
    }
    ctx.restore();

    ctx.restore();
  };

  // Pointer event handlers for Virtual Touch Joystick
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    touchOriginRef.current = { x, y };
    touchCurrentRef.current = { x, y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!touchOriginRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    touchCurrentRef.current = { x, y };
  };

  const handlePointerUp = () => {
    touchOriginRef.current = null;
    touchCurrentRef.current = null;
  };

  const handleRestart = useCallback(() => {
    setGameState(createInitialNeonSurvivorState());
  }, []);

  const handleCardClick = (cardId: UpgradeCard['id']) => {
    setGameState((s) => selectUpgrade(s, cardId));
    vibrate(25);
  };

  // Format survival time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      data-game-surface
      className="relative w-full aspect-16/10 min-h-120 max-h-180 rounded-2xl overflow-hidden border border-border bg-card shadow-2xl select-none touch-none"
    >
      {/* 100% Canvas Surface */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full block cursor-crosshair touch-none"
      />

      {/* Top Controls: Sound Mute Toggle */}
      <div className="absolute top-4 right-4 z-10 pointer-events-auto">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-pressed={muted}
          aria-label={muted ? t.soundOn : t.soundOff}
          className="min-h-11 px-3 py-2 rounded-xl border border-border bg-background/80 backdrop-blur-md shadow-xs text-xs font-black text-foreground hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-2 left-4 right-4 pointer-events-none text-center hidden sm:block">
        <span className="text-xs font-semibold text-muted-foreground/80 bg-background/70 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-border/50">
          {t.controlsHint}
        </span>
      </div>

      {/* Level-Up Upgrade Cards Modal */}
      {gameState.levelUpPending && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-4 z-20 animate-in fade-in zoom-in-95 duration-150">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              {t.levelup}
            </div>

            <div className="grid gap-2.5">
              {gameState.upgradeChoices.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(card.id)}
                  className="w-full p-4 rounded-2xl border border-border bg-card/95 hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center gap-3.5 shadow-md active:scale-98"
                >
                  <span className="text-3xl shrink-0 p-2 rounded-xl bg-muted/60">{card.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm text-foreground flex justify-between items-center">
                      <span>{card.title[locale] ?? card.title.en}</span>
                      <span className="text-xs text-primary font-mono">
                        LV.{gameState.weapons[card.id] + 1}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {card.desc[locale] ?? card.desc.en}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState.gameOver && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-6 z-20 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-2xl text-center space-y-4">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-destructive">
              {t.gameover}
            </div>

            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">{t.time}</span>
                <span className="text-base font-black text-foreground font-mono">
                  {formatTime(gameState.survivalTime)}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">{t.kills}</span>
                <span className="text-base font-black text-primary font-mono">
                  {gameState.kills}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">{t.score}</span>
                <span className="text-base font-black text-foreground font-mono">
                  {gameState.score.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRestart}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
            >
              {t.restart}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
