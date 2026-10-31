import { useCallback, useEffect, useRef, useState } from "react";
import {
  initializeGrapplingBoss,
  stepGrapplingBoss,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  type GrapplingBossState,
} from "../../lib/games/grappling-boss";
import { useAudioContext } from "../../lib/games/use-audio-context";
import { useClipboardShare } from "../../lib/games/use-clipboard-share";
import { GameStatTile } from "../ui/game/GameStatTile";
import { GameJuice } from "../../lib/games/game-juice";
import {
  ParallaxStarfield,
  ThrusterTrail,
  LaserBeamEffect,
  ProceduralMusicEngine,
  triggerMobileHaptic,
} from "../../lib/games/grappling-arena-fx";

export function GrapplingBoss() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Ref-based Native Simulation Loop (Zero-GC, 60/120fps)
  const stateRef = useRef<GrapplingBossState>(initializeGrapplingBoss());
  const juiceRef = useRef<GameJuice>(new GameJuice(384));
  const starfieldRef = useRef<ParallaxStarfield>(new ParallaxStarfield(ARENA_WIDTH, ARENA_HEIGHT, 90));
  const thrusterRef = useRef<ThrusterTrail>(new ThrusterTrail());
  const laserRef = useRef<LaserBeamEffect>(new LaserBeamEffect());
  const musicRef = useRef<ProceduralMusicEngine>(new ProceduralMusicEngine());

  // Input State
  const inputRef = useRef({
    moveAxis: 0 as -1 | 0 | 1,
    jump: false,
    fireHook: false,
    aimX: 400,
    aimY: 160,
    fireWeapon: false,
    autoFireTimer: 0,
    isMobileTouching: false,
  });

  // UI Throttle State (React only re-renders on low-frequency UI sync or state transitions)
  const [hudState, setHudState] = useState(() => ({
    playerHp: 100,
    maxPlayerHp: 100,
    bossHp: 1000,
    maxBossHp: 1000,
    bossPhase: 1 as 1 | 2,
    score: 0,
    status: "playing" as "playing" | "victory" | "defeated",
    isHooked: false,
    activeLog: "Grapple with Space/Touch! Slingshot jump off ropes!",
    bgmActive: false,
  }));

  const getAudioContext = useAudioContext();

  // Mobile Virtual Joystick State
  const joystickRef = useRef<{
    active: boolean;
    touchId: number | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>({
    active: false,
    touchId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  // Hook-up Audio Context
  useEffect(() => {
    const ctx = getAudioContext();
    juiceRef.current.audio.setContextGetter(getAudioContext);
    musicRef.current.setAudioContext(ctx);
  }, [getAudioContext]);

  const toggleBgm = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    musicRef.current.setAudioContext(ctx);
    if (hudState.bgmActive) {
      musicRef.current.stop();
      setHudState((s) => ({ ...s, bgmActive: false }));
    } else {
      musicRef.current.start();
      setHudState((s) => ({ ...s, bgmActive: true }));
    }
  };

  const playSfx = useCallback(
    (freq: number, type: OscillatorType = "sine", dur = 0.08, gainVal = 0.12) => {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      } catch {
        // Safe audio fallback
      }
    },
    [getAudioContext]
  );

  const { copied, shareText } = useClipboardShare();

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key.toLowerCase()) {
        case "a":
        case "arrowleft":
          inputRef.current.moveAxis = -1;
          break;
        case "d":
        case "arrowright":
          inputRef.current.moveAxis = 1;
          break;
        case "w":
        case "arrowup":
          inputRef.current.jump = true;
          playSfx(420, "triangle", 0.08);
          triggerMobileHaptic("light");
          break;
        case " ":
          inputRef.current.fireHook = true;
          playSfx(620, "sawtooth", 0.1);
          triggerMobileHaptic("light");
          break;
        case "f":
          inputRef.current.fireWeapon = true;
          playSfx(880, "square", 0.05, 0.08);
          triggerMobileHaptic("light");
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "a":
        case "arrowleft":
          if (inputRef.current.moveAxis === -1) inputRef.current.moveAxis = 0;
          break;
        case "d":
        case "arrowright":
          if (inputRef.current.moveAxis === 1) inputRef.current.moveAxis = 0;
          break;
        case "w":
        case "arrowup":
          inputRef.current.jump = false;
          break;
        case " ":
          inputRef.current.fireHook = false;
          break;
        case "f":
          inputRef.current.fireWeapon = false;
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [playSfx]);

  // Main 60/120fps Native Simulation & Rendering Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let hudSyncTimer = 0;
    let laserTimer = 0;

    const loop = (currentTime: number) => {
      const dtRaw = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      // Clamp dt to avoid physics spiral
      const dt = Math.min(0.05, Math.max(0.001, dtRaw));

      const state = stateRef.current;
      const juice = juiceRef.current;
      const thruster = thrusterRef.current;
      const laser = laserRef.current;

      // 1. Process HitStop effective dt
      const { effectiveDt } = juice.hitStop.update(dt);

      if (state.status === "playing" && effectiveDt > 0) {
        // Auto-fire blaster on continuous hold
        if (inputRef.current.fireWeapon) {
          inputRef.current.autoFireTimer += effectiveDt;
          if (inputRef.current.autoFireTimer > 0.16) {
            inputRef.current.autoFireTimer = 0;
            // Spawn extra projectile
            const aimTargetX = inputRef.current.aimX ?? state.boss.x;
            const aimTargetY = inputRef.current.aimY ?? state.boss.y;
            const dx = aimTargetX - state.player.x;
            const dy = aimTargetY - state.player.y;
            const dist = Math.max(0.001, Math.hypot(dx, dy));
            state.projectiles.push({
              id: `rapid-${Date.now()}-${Math.random()}`,
              x: state.player.x,
              y: state.player.y - 8,
              vx: (dx / dist) * 520,
              vy: (dy / dist) * 520,
              damage: 32,
              isHostile: false,
              lifespanSec: 2.2,
            });
            playSfx(940, "square", 0.04, 0.06);
            triggerMobileHaptic("light");
          }
        } else {
          inputRef.current.autoFireTimer = 0;
        }

        // Previous HP for hit reactions
        const prevBossHp = state.boss.hp;
        const prevPlayerHp = state.playerHp;

        // Step physics simulation
        stateRef.current = stepGrapplingBoss(state, effectiveDt, {
          moveAxis: inputRef.current.moveAxis,
          jump: inputRef.current.jump,
          fireHook: inputRef.current.fireHook,
          aimX: inputRef.current.aimX,
          aimY: inputRef.current.aimY,
          fireWeapon: inputRef.current.fireWeapon,
        });

        // Reset single-frame triggers
        inputRef.current.jump = false;
        inputRef.current.fireHook = false;

        const curState = stateRef.current;

        // Player Thruster Particle Generation
        if (Math.abs(curState.player.vx) > 30 || Math.abs(curState.player.vy) > 30) {
          thruster.emit(
            curState.player.x,
            curState.player.y + 12,
            curState.player.vx / 300,
            curState.player.vy / 300
          );
        }

        // Boss Charged Laser Telegraph Logic
        laserTimer += effectiveDt;
        const laserInterval = curState.boss.phase === 2 ? 3.5 : 5.0;
        const chargeTime = 1.2;
        const firingTime = 0.35;
        const cycleProgress = laserTimer % laserInterval;

        if (cycleProgress < chargeTime) {
          // Telegraph Aiming Guide
          laser.setTelegraph(
            curState.boss.x,
            curState.boss.y,
            curState.player.x,
            curState.player.y,
            cycleProgress / chargeTime
          );
        } else if (cycleProgress < chargeTime + firingTime) {
          // Fire High-Energy Beam
          if (!laser.active) {
            juice.camera.addTrauma(0.45);
            playSfx(140, "sawtooth", 0.3, 0.2);
            triggerMobileHaptic("heavy");
          }
          laser.fire(curState.boss.x, curState.boss.y, curState.player.x, curState.player.y);
          // Laser beam damage if player is aligned
          const ldx = laser.endX - laser.startX;
          const ldy = laser.endY - laser.startY;
          const ldist = Math.max(1, Math.hypot(ldx, ldy));
          const nx = -ldy / ldist;
          const ny = ldx / ldist;
          const pDistToLine = Math.abs((curState.player.x - laser.startX) * nx + (curState.player.y - laser.startY) * ny);
          if (pDistToLine < 18) {
            curState.playerHp = Math.max(0, curState.playerHp - 45 * effectiveDt);
            juice.camera.addTrauma(0.5);
            triggerMobileHaptic("warning");
          }
        } else {
          laser.clear();
        }

        // Boss Damage Impact Reaction
        if (curState.boss.hp < prevBossHp) {
          const dmgDealt = Math.round(prevBossHp - curState.boss.hp);
          const isCrit = dmgDealt > 40;
          juice.impact(curState.boss.x, curState.boss.y, isCrit ? "heavy" : "medium", `-${dmgDealt}`);
          triggerMobileHaptic("medium");
        }

        // Player Damage Impact Reaction
        if (curState.playerHp < prevPlayerHp) {
          juice.camera.addTrauma(0.65);
          juice.particles.emit(curState.player.x, curState.player.y, {
            count: 14,
            kind: "spark",
            color: "#f87171",
            speedMin: 100,
            speedMax: 260,
          });
          triggerMobileHaptic("warning");
        }

        // Music Phase Shift
        musicRef.current.setPhase(curState.boss.phase);
      }

      // 2. Update Visual Engines
      juice.update(dt);
      thruster.update(dt);

      // 3. Render Canvas Frame
      renderCanvas();

      // 4. Low-Frequency HUD Synchronization (15Hz throttle)
      hudSyncTimer += dt;
      if (hudSyncTimer > 0.066) {
        hudSyncTimer = 0;
        const cur = stateRef.current;
        setHudState((prev) => ({
          ...prev,
          playerHp: Math.round(cur.playerHp),
          maxPlayerHp: cur.maxPlayerHp,
          bossHp: Math.round(cur.boss.hp),
          maxBossHp: cur.boss.maxHp,
          bossPhase: cur.boss.phase,
          score: cur.score,
          status: cur.status,
          isHooked: cur.player.isHooked,
          activeLog: cur.activeLog,
        }));
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      musicRef.current.stop();
    };
  }, [playSfx]);

  // Master Canvas Renderer
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = stateRef.current;
    const juice = juiceRef.current;
    const starfield = starfieldRef.current;
    const thruster = thrusterRef.current;
    const laser = laserRef.current;
    const p = state.player;
    const b = state.boss;

    ctx.save();

    // Clear canvas
    ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Apply Camera Shake Trauma Offset & Roll around arena center
    juice.camera.applyToContext(ctx, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);

    // 1. Render Parallax Deep Space Starfield & Cyber Grid
    starfield.render(ctx, p.x - ARENA_WIDTH / 2, p.y - ARENA_HEIGHT / 2, state.gameTimeSec, b.phase === 2);

    // 2. Render Arena Anchors with Pulsing Energy Rings
    for (const anchor of state.anchors) {
      const isAnchorTarget = p.isHooked && p.anchorX === anchor.x && p.anchorY === anchor.y;
      const pulse = Math.sin(state.gameTimeSec * 4 + anchor.x) * 2;

      ctx.save();
      // Outer Halo
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, anchor.radius + 6 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = isAnchorTarget ? "rgba(56, 189, 248, 0.28)" : "rgba(250, 204, 21, 0.12)";
      ctx.fill();

      // Outer Rotating Ring
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, anchor.radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = isAnchorTarget ? "#38bdf8" : "#eab308";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Core Anchor Body
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, anchor.radius - 2, 0, Math.PI * 2);
      ctx.fillStyle = isAnchorTarget ? "#0284c7" : "#713f12";
      ctx.fill();

      // Core Neon Pips
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
    }

    // 3. Render Grapple Rope (Dynamic Bézier Catenary Tension)
    if (p.isHooked) {
      ctx.save();
      const tension = Math.min(1, Math.hypot(p.vx, p.vy) / 400);
      const sag = (1 - tension) * 12 * Math.sin(state.gameTimeSec * 16);
      const midX = (p.x + p.anchorX) / 2;
      const midY = (p.y + p.anchorY) / 2 + sag;

      // Glow Underlay
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(midX, midY, p.anchorX, p.anchorY);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Core Electric Cable
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(midX, midY, p.anchorX, p.anchorY);
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Anchor Grapple Claw
      ctx.beginPath();
      ctx.arc(p.anchorX, p.anchorY, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();
      ctx.restore();
    }

    // 4. Render Thruster Particles
    thruster.render(ctx);

    // 5. Render Player Mecha Vessel with Bank Tilt
    ctx.save();
    ctx.translate(p.x, p.y);

    // Dynamic tilt based on horizontal velocity
    const tiltAngle = Math.max(-0.4, Math.min(0.4, (p.vx / 400) * 0.4));
    ctx.rotate(tiltAngle);

    // Hooke's Law Squash & Stretch scale from GameJuice
    const squash = juice.spring.scaleX;
    const stretch = juice.spring.scaleY;
    ctx.scale(squash, stretch);

    // Mecha Outer Wing Chassis
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(16, 14);
    ctx.lineTo(0, 8);
    ctx.lineTo(-16, 14);
    ctx.closePath();
    ctx.fillStyle = p.isHooked ? "#0284c7" : "#2563eb";
    ctx.fill();
    ctx.strokeStyle = "#93c5fd";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glowing Cockpit Core
    ctx.beginPath();
    ctx.arc(0, -2, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#67e8f9";
    ctx.fill();

    ctx.restore();

    // 6. Render Boss Charged Laser Beam
    laser.render(ctx);

    // 7. Render Mechanical Beholder Tentacles with Segment Armor Plates
    for (const tentacle of b.tentacles) {
      ctx.save();
      for (let j = 0; j < tentacle.joints.length - 1; j++) {
        const j1 = tentacle.joints[j];
        const j2 = tentacle.joints[j + 1];
        const segProgress = j / (tentacle.joints.length - 1);

        // Segment Connection Cable
        ctx.beginPath();
        ctx.moveTo(j1.x, j1.y);
        ctx.lineTo(j2.x, j2.y);
        ctx.strokeStyle = b.phase === 2 ? "#b91c1c" : "#475569";
        ctx.lineWidth = 6 * (1 - segProgress * 0.5);
        ctx.stroke();

        // Joint Armor Plate Node
        ctx.beginPath();
        ctx.arc(j2.x, j2.y, 7 * (1 - segProgress * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = b.phase === 2 ? "#ef4444" : "#94a3b8";
        ctx.fill();
        ctx.strokeStyle = "#18181b";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Sharp Mecha Claw at Tentacle Tip
      const tip = tentacle.joints[tentacle.joints.length - 1];
      if (tip) {
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = b.phase === 2 ? "#fca5a5" : "#38bdf8";
        ctx.fill();
      }
      ctx.restore();
    }

    // 8. Render Boss Mechanical Beholder Body
    ctx.save();
    ctx.translate(b.x, b.y);

    // Enraged Overdrive Aura
    if (b.phase === 2) {
      const auraPulse = Math.sin(state.gameTimeSec * 12) * 6;
      ctx.beginPath();
      ctx.arc(0, 0, 52 + auraPulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239, 68, 68, 0.22)";
      ctx.fill();
    }

    // Heavy Mecha Hull Shell
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fillStyle = b.phase === 2 ? "#7f1d1d" : "#1e293b";
    ctx.fill();
    ctx.strokeStyle = b.phase === 2 ? "#ef4444" : "#64748b";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Iris tracking player angle
    const bToPdx = p.x - b.x;
    const bToPdy = p.y - b.y;
    const bDist = Math.max(1, Math.hypot(bToPdx, bToPdy));
    const pupilOffset = 16;
    const px = (bToPdx / bDist) * pupilOffset;
    const py = (bToPdy / bDist) * pupilOffset;

    // Eyeball Sclera
    ctx.beginPath();
    ctx.arc(px, py, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Glowing Iris Core
    ctx.beginPath();
    ctx.arc(px, py, 11, 0, Math.PI * 2);
    ctx.fillStyle = b.phase === 2 ? "#dc2626" : "#0284c7";
    ctx.fill();

    // Slit Pupil
    ctx.beginPath();
    ctx.ellipse(px, py, 4, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#09090b";
    ctx.fill();

    // Floating HP Bar over Boss
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(-50, -64, 100, 10);
    ctx.fillStyle = b.phase === 2 ? "#ef4444" : "#22c55e";
    ctx.fillRect(-50, -64, 100 * (b.hp / b.maxHp), 10);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(-50, -64, 100, 10);

    ctx.restore();

    // 9. Render High-Energy Projectiles with Trails
    for (const proj of state.projectiles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.isHostile ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = proj.isHostile ? "#ef4444" : "#38bdf8";
      ctx.fill();

      // Plasma Glow
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.isHostile ? 12 : 8, 0, Math.PI * 2);
      ctx.fillStyle = proj.isHostile ? "rgba(239, 68, 68, 0.3)" : "rgba(56, 189, 248, 0.3)";
      ctx.fill();
      ctx.restore();
    }

    // 10. Render Crosshair Aim Indicator
    ctx.save();
    ctx.beginPath();
    ctx.arc(inputRef.current.aimX, inputRef.current.aimY, 10, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(inputRef.current.aimX, inputRef.current.aimY, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#facc15";
    ctx.fill();
    ctx.restore();

    // 11. Render GameJuice Zero-GC Particles & Floating Damage Numbers
    juice.render(ctx);

    ctx.restore();
  };

  // Canvas Mouse / Touch Aiming & Firing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    inputRef.current.aimX = clickX;
    inputRef.current.aimY = clickY;
    inputRef.current.fireWeapon = true;
    playSfx(880, "square", 0.05, 0.08);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;
    inputRef.current.aimX = (e.clientX - rect.left) * scaleX;
    inputRef.current.aimY = (e.clientY - rect.top) * scaleY;
  };

  const handlePointerUp = () => {
    inputRef.current.fireWeapon = false;
  };

  // Mobile Virtual Joystick Touch Handlers
  const handleJoystickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    joystickRef.current = {
      active: true,
      touchId: touch.identifier,
      startX: touch.clientX - rect.left,
      startY: touch.clientY - rect.top,
      currentX: touch.clientX - rect.left,
      currentY: touch.clientY - rect.top,
    };
    triggerMobileHaptic("light");
  };

  const handleJoystickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const js = joystickRef.current;
    if (!js.active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === js.touchId) {
        const rect = e.currentTarget.getBoundingClientRect();
        js.currentX = touch.clientX - rect.left;
        js.currentY = touch.clientY - rect.top;

        const dx = js.currentX - js.startX;
        const dy = js.currentY - js.startY;

        // Horizontal threshold
        if (dx < -18) {
          inputRef.current.moveAxis = -1;
        } else if (dx > 18) {
          inputRef.current.moveAxis = 1;
        } else {
          inputRef.current.moveAxis = 0;
        }

        // Upward flick for Slingshot jump
        if (dy < -28) {
          inputRef.current.jump = true;
          triggerMobileHaptic("medium");
        }
        break;
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const js = joystickRef.current;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === js.touchId) {
        js.active = false;
        js.touchId = null;
        inputRef.current.moveAxis = 0;
        break;
      }
    }
  };

  const handleMobileHook = () => {
    inputRef.current.fireHook = true;
    playSfx(620, "sawtooth", 0.1);
    triggerMobileHaptic("medium");
  };

  const handleMobileJump = () => {
    inputRef.current.jump = true;
    playSfx(420, "triangle", 0.08);
    triggerMobileHaptic("medium");
  };

  const handleMobileShootDown = () => {
    inputRef.current.fireWeapon = true;
    playSfx(880, "square", 0.05, 0.08);
    triggerMobileHaptic("light");
  };

  const handleMobileShootUp = () => {
    inputRef.current.fireWeapon = false;
  };

  const handleReset = () => {
    stateRef.current = initializeGrapplingBoss();
    setHudState({
      playerHp: 100,
      maxPlayerHp: 100,
      bossHp: 1000,
      maxBossHp: 1000,
      bossPhase: 1,
      score: 0,
      status: "playing",
      isHooked: false,
      activeLog: "Battle re-initialized! Show no mercy!",
      bgmActive: hudState.bgmActive,
    });
    playSfx(440, "sine", 0.15);
  };

  const handleShare = () => {
    shareText(
      `Mechanical Beholder Slain in Grappling Boss Arena! Score: ${hudState.score}, Phase: ${hudState.bossPhase}. Play free on mobile/desktop: https://game.oiyo.net/grappling-boss`
    );
    playSfx(660, "triangle", 0.1);
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto p-4 bg-background text-foreground rounded-xl border border-border shadow-lg">
      {/* Top Banner & Control Deck */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-primary">
              Grappling Boss: Titan Beholder
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">
              Mobile AAA Edition
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verlet pendulum momentum, zero-GC game juice, 3-layer parallax starfield & adaptive procedural techno.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleBgm}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
              hudState.bgmActive
                ? "border-primary bg-primary/20 text-primary shadow-sm"
                : "border-border bg-secondary hover:bg-secondary/80 text-muted-foreground"
            }`}
          >
            {hudState.bgmActive ? "🎵 BGM: 120BPM ON" : "🔇 BGM OFF"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {copied ? "Copied!" : "Share Battle"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            Retry Arena
          </button>
        </div>
      </div>

      {/* Main Canvas Deck */}
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-border shadow-inner select-none touch-none">
        <canvas
          ref={canvasRef}
          width={ARENA_WIDTH}
          height={ARENA_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full object-contain cursor-crosshair block"
        />

        {/* Dynamic Island Style Mobile Header HUD Overlay */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none gap-2">
          {/* Player HP Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-border text-xs font-medium text-foreground shadow-lg">
            <span className="text-primary font-bold">SHIELD</span>
            <div className="w-24 h-2.5 bg-secondary rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-primary transition-all duration-100 w-(--hp-w)"
                style={{ "--hp-w": `${Math.max(0, Math.min(100, (hudState.playerHp / hudState.maxPlayerHp) * 100))}%` } as React.CSSProperties}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground">{hudState.playerHp}</span>
          </div>

          {/* Boss HP Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-border text-xs font-medium text-foreground shadow-lg">
            <span className={`font-bold ${hudState.bossPhase === 2 ? "text-destructive animate-pulse" : "text-primary"}`}>
              {hudState.bossPhase === 2 ? "ENRAGED BEHOLDER" : "BEHOLDER"}
            </span>
            <div className="w-28 h-2.5 bg-secondary rounded-full overflow-hidden border border-border">
              <div
                className={`h-full transition-all duration-100 w-(--boss-w) ${
                  hudState.bossPhase === 2 ? "bg-destructive" : "bg-primary"
                }`}
                style={{ "--boss-w": `${Math.max(0, Math.min(100, (hudState.bossHp / hudState.maxBossHp) * 100))}%` } as React.CSSProperties}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground">{hudState.bossHp}</span>
          </div>
        </div>

        {/* Victory / Defeat Overlays */}
        {hudState.status !== "playing" && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            {hudState.status === "victory" ? (
              <div className="flex flex-col items-center gap-3">
                <span className="text-5xl">🏆</span>
                <h2 className="text-2xl font-black tracking-tight text-primary">
                  TITAN BEHOLDER FELLED!
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  You conquered the aerial arena with dynamic pendulum swing physics! Score: {hudState.score}
                </p>
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-md"
                  >
                    Share Victory Record
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-all shadow-md"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="text-5xl">💀</span>
                <h2 className="text-2xl font-black tracking-tight text-destructive">
                  SHIELD DEPLETED
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  The Beholder&apos;s charged laser pierced your defenses. Grapple across ceiling anchors to stay aloft!
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all shadow-md mt-2"
                >
                  Restart Battle
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* On-Screen Mobile Dual Touch Deck (Displays on mobile/tablets or compact screens) */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-card/60 backdrop-blur rounded-xl border border-border">
        {/* Left Side: Virtual Analog Joystick */}
        <div
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          onTouchCancel={handleJoystickEnd}
          className="relative h-28 bg-muted/60 rounded-lg border border-border flex flex-col items-center justify-center select-none touch-none cursor-pointer overflow-hidden group hover:border-primary/40 transition-colors"
        >
          <div className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            VIRTUAL JOYSTICK
          </div>
          <p className="text-xs text-muted-foreground">Drag Left/Right to Move • Flick Up to Slingshot</p>
          <div className="mt-2 w-10 h-10 rounded-full border border-primary/40 flex items-center justify-center bg-primary/10 text-primary text-xs font-bold">
            🕹️
          </div>
        </div>

        {/* Right Side: Quick Action Neon Buttons */}
        <div className="flex items-center justify-around gap-2 bg-muted/60 rounded-lg border border-border p-2">
          {/* Wire Hook Button */}
          <button
            type="button"
            onClick={handleMobileHook}
            className={`flex-1 h-full rounded-lg font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border ${
              hudState.isHooked
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-secondary text-foreground border-border hover:bg-muted"
            }`}
          >
            <span className="text-base">🪝</span>
            <span>{hudState.isHooked ? "RELEASE" : "HOOK"}</span>
          </button>

          {/* Slingshot Jump Button */}
          <button
            type="button"
            onClick={handleMobileJump}
            className="flex-1 h-full rounded-lg font-bold text-xs flex flex-col items-center justify-center gap-1 bg-secondary text-foreground border border-border hover:bg-muted active:scale-95 transition-all active:border-primary"
          >
            <span className="text-base">🚀</span>
            <span>SLING</span>
          </button>

          {/* Rapid Blaster Button */}
          <button
            type="button"
            onPointerDown={handleMobileShootDown}
            onPointerUp={handleMobileShootUp}
            className="flex-1 h-full rounded-lg font-bold text-xs flex flex-col items-center justify-center gap-1 bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 active:scale-95 transition-all shadow-sm"
          >
            <span className="text-base">💥</span>
            <span>BLAST</span>
          </button>
        </div>
      </div>

      {/* Live Battle Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <GameStatTile label="BATTLE SCORE" value={hudState.score.toLocaleString()} highlight={hudState.score > 1000} />
        <GameStatTile
          label="GRAPPLE STATUS"
          value={hudState.isHooked ? "PENDULUM HOOKED" : "FREE FALL"}
        />
        <GameStatTile
          label="BEHOLDER PHASE"
          value={hudState.bossPhase === 2 ? "PHASE 2 (ENRAGED)" : "PHASE 1 (SCANNING)"}
          highlight={hudState.bossPhase === 2}
        />
        <GameStatTile
          label="CONTROLS"
          value="HYBRID TOUCH + KEYS"
        />
      </div>

      {/* Combat Feed Log */}
      <div className="px-3 py-2 bg-secondary/30 rounded-lg border border-border text-xs text-muted-foreground flex items-center justify-between">
        <span className="font-mono text-xs truncate">{hudState.activeLog}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">60/120 FPS Native</span>
      </div>
    </div>
  );
}

export default GrapplingBoss;

