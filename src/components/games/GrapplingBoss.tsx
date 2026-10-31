import { useEffect, useRef, useState } from "react";
import {
  initializeGrapplingBoss,
  stepGrapplingBoss,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  type GrapplingBossState,
} from "../../lib/games/grappling-boss";
import { useAudioContext } from "../../lib/games/use-audio-context";
import { useClipboardShare } from "../../lib/games/use-clipboard-share";
import { GameJuice } from "../../lib/games/game-juice";
import {
  ParallaxStarfield,
  ThrusterTrail,
  LaserBeamEffect,
  ProceduralMusicEngine,
  triggerMobileHaptic,
} from "../../lib/games/grappling-arena-fx";
import {
  CameraDynamics2D,
  SpeedLinesSystem,
  DynamicLightRenderer,
  ProceduralSfxBank,
} from "../../lib/games/grappling-engine-pro";

export function GrapplingBoss() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Ref-based Native Zero-GC 60/120fps Simulation State
  const stateRef = useRef<GrapplingBossState>(initializeGrapplingBoss());
  const juiceRef = useRef<GameJuice>(new GameJuice(384));
  const starfieldRef = useRef<ParallaxStarfield>(new ParallaxStarfield(ARENA_WIDTH, ARENA_HEIGHT, 90));
  const thrusterRef = useRef<ThrusterTrail>(new ThrusterTrail());
  const laserRef = useRef<LaserBeamEffect>(new LaserBeamEffect());
  const musicRef = useRef<ProceduralMusicEngine>(new ProceduralMusicEngine());
  const cameraDynRef = useRef<CameraDynamics2D>(new CameraDynamics2D());
  const speedLinesRef = useRef<SpeedLinesSystem>(new SpeedLinesSystem(32));
  const lightRef = useRef<DynamicLightRenderer>(new DynamicLightRenderer());
  const sfxRef = useRef<ProceduralSfxBank>(new ProceduralSfxBank());

  // Input & Touch State (Entirely In-Canvas)
  const touchControlRef = useRef<{
    active: boolean;
    touchId: number | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isHoldingWire: boolean;
  }>({
    active: false,
    touchId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isHoldingWire: false,
  });

  const inputRef = useRef({
    moveAxis: 0 as -1 | 0 | 1,
    jump: false,
    fireHook: false,
    aimX: 400,
    aimY: 160,
    autoFireTimer: 0,
  });

  // Minimal Overlay State for Game Over / Victory Modal only
  const [modalState, setModalState] = useState<{
    status: "playing" | "victory" | "defeated";
    score: number;
    soundOn: boolean;
  }>({
    status: "playing",
    score: 0,
    soundOn: true,
  });

  const getAudioContext = useAudioContext();
  const { copied, shareText } = useClipboardShare();

  // Wire up audio contexts
  useEffect(() => {
    const ctx = getAudioContext();
    juiceRef.current.audio.setContextGetter(getAudioContext);
    musicRef.current.setAudioContext(ctx);
    sfxRef.current.setAudioContext(ctx);
  }, [getAudioContext]);

  // Keyboard navigation & controls fallback (for desktop users)
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
        case " ":
          inputRef.current.fireHook = true;
          inputRef.current.jump = true;
          sfxRef.current.playWireClack();
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Main Native 60/120fps Animation Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let laserTimer = 0;

    const loop = (currentTime: number) => {
      const dtRaw = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      const dt = Math.min(0.05, Math.max(0.001, dtRaw));

      const state = stateRef.current;
      const juice = juiceRef.current;
      const thruster = thrusterRef.current;
      const laser = laserRef.current;
      const cameraDyn = cameraDynRef.current;
      const speedLines = speedLinesRef.current;
      const sfx = sfxRef.current;

      const { effectiveDt } = juice.hitStop.update(dt);

      if (state.status === "playing" && effectiveDt > 0) {
        const playerSpeed = Math.hypot(state.player.vx, state.player.vy);

        // 1. Automatic Machine-Gun Plasma Lock-on targeting Boss
        inputRef.current.autoFireTimer += effectiveDt;
        if (inputRef.current.autoFireTimer > 0.14) {
          inputRef.current.autoFireTimer = 0;
          const bdx = state.boss.x - state.player.x;
          const bdy = state.boss.y - state.player.y;
          const bdist = Math.max(0.001, Math.hypot(bdx, bdy));
          const pSpeed = 620;

          state.projectiles.push({
            id: `blaster-${Date.now()}-${Math.random()}`,
            x: state.player.x,
            y: state.player.y - 12,
            vx: (bdx / bdist) * pSpeed + (Math.random() - 0.5) * 40,
            vy: (bdy / bdist) * pSpeed + (Math.random() - 0.5) * 40,
            damage: 28,
            isHostile: false,
            lifespanSec: 2.0,
          });
          sfx.playLaserShot();
          triggerMobileHaptic("light");
        }

        const prevBossHp = state.boss.hp;
        const prevPlayerHp = state.playerHp;

        // Step physics simulation
        stateRef.current = stepGrapplingBoss(state, effectiveDt, {
          moveAxis: inputRef.current.moveAxis,
          jump: inputRef.current.jump,
          fireHook: inputRef.current.fireHook,
          aimX: state.boss.x,
          aimY: state.boss.y,
          fireWeapon: false,
        });

        inputRef.current.jump = false;
        inputRef.current.fireHook = false;

        const curState = stateRef.current;

        // Player Thruster Particles
        if (Math.abs(curState.player.vx) > 25 || Math.abs(curState.player.vy) > 25) {
          thruster.emit(
            curState.player.x,
            curState.player.y + 14,
            curState.player.vx / 350,
            curState.player.vy / 350
          );
        }

        // Camera Dynamics & Speed Lines Update
        cameraDyn.update(effectiveDt, playerSpeed);
        speedLines.update(effectiveDt, playerSpeed);

        // Boss Charged Laser Logic
        laserTimer += effectiveDt;
        const laserInterval = curState.boss.phase === 2 ? 3.0 : 4.8;
        const chargeTime = 1.1;
        const firingTime = 0.35;
        const cycleProgress = laserTimer % laserInterval;

        if (cycleProgress < chargeTime) {
          laser.setTelegraph(
            curState.boss.x,
            curState.boss.y,
            curState.player.x,
            curState.player.y,
            cycleProgress / chargeTime
          );
        } else if (cycleProgress < chargeTime + firingTime) {
          if (!laser.active) {
            juice.camera.addTrauma(0.55);
            cameraDyn.punch(0.18);
            sfx.playHeavyExplosion();
            triggerMobileHaptic("heavy");
          }
          laser.fire(curState.boss.x, curState.boss.y, curState.player.x, curState.player.y);

          // Damage player if inside death beam line
          const ldx = laser.endX - laser.startX;
          const ldy = laser.endY - laser.startY;
          const ldist = Math.max(1, Math.hypot(ldx, ldy));
          const nx = -ldy / ldist;
          const ny = ldx / ldist;
          const pDist = Math.abs((curState.player.x - laser.startX) * nx + (curState.player.y - laser.startY) * ny);
          if (pDist < 22) {
            curState.playerHp = Math.max(0, curState.playerHp - 50 * effectiveDt);
            juice.camera.addTrauma(0.6);
            triggerMobileHaptic("warning");
          }
        } else {
          laser.clear();
        }

        // Boss Impact Feedback
        if (curState.boss.hp < prevBossHp) {
          const dmg = Math.round(prevBossHp - curState.boss.hp);
          const isCrit = dmg > 35;
          juice.impact(curState.boss.x, curState.boss.y, isCrit ? "heavy" : "medium", `-${dmg}`);
          cameraDyn.punch(isCrit ? 0.16 : 0.08);
          triggerMobileHaptic("medium");
        }

        // Player Impact Feedback
        if (curState.playerHp < prevPlayerHp) {
          juice.camera.addTrauma(0.7);
          cameraDyn.punch(0.2);
          juice.particles.emit(curState.player.x, curState.player.y, {
            count: 18,
            kind: "spark",
            color: "#ef4444",
            speedMin: 120,
            speedMax: 300,
          });
          triggerMobileHaptic("warning");
        }

        // Modal transition on defeat / victory
        if (curState.status !== "playing" && modalState.status === "playing") {
          setModalState((s) => ({ ...s, status: curState.status, score: curState.score }));
        }
      }

      // Visual Engine Updates
      juice.update(dt);
      thruster.update(dt);

      // Render Canvas
      renderFrame();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      musicRef.current.stop();
    };
  }, [modalState.status]);

  // Master Canvas Frame Renderer
  const renderFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = stateRef.current;
    const juice = juiceRef.current;
    const starfield = starfieldRef.current;
    const thruster = thrusterRef.current;
    const laser = laserRef.current;
    const cameraDyn = cameraDynRef.current;
    const speedLines = speedLinesRef.current;
    const light = lightRef.current;
    const p = state.player;
    const b = state.boss;
    const playerSpeed = Math.hypot(p.vx, p.vy);

    ctx.save();
    ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Apply Elastic Camera Dynamics (Punch Zoom) & Trauma Screen Shake
    cameraDyn.apply(ctx, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
    juice.camera.applyToContext(ctx, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);

    // 1. Deep Space Parallax Starfield & Floor Grid
    starfield.render(ctx, p.x - ARENA_WIDTH / 2, p.y - ARENA_HEIGHT / 2, state.gameTimeSec, b.phase === 2);

    // 2. Dynamic Speed Lines during Momentum Swings
    speedLines.render(ctx, p.x, p.y, playerSpeed);

    // 3. Render Arena Anchors with Glow Lights & Rotating Rings
    for (const anchor of state.anchors) {
      const isTarget = p.isHooked && p.anchorX === anchor.x && p.anchorY === anchor.y;

      // Dynamic 2D Point Light Bloom
      light.renderLight(
        ctx,
        anchor.x,
        anchor.y,
        isTarget ? 48 : 28,
        isTarget ? "rgba(56, 189, 248, 0.45)" : "rgba(250, 204, 21, 0.2)",
        "rgba(0, 0, 0, 0)",
        0.8
      );

      ctx.save();
      // Outer Gear Notch Ring
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, anchor.radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = isTarget ? "#38bdf8" : "#ca8a04";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Core Anchor Body
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, anchor.radius - 2, 0, Math.PI * 2);
      ctx.fillStyle = isTarget ? "#0284c7" : "#451a03";
      ctx.fill();

      // Center High-Intensity Pulse Pip
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }

    // 4. Render Grapple Cable (Dynamic Catenary Wave & Energy Glow)
    if (p.isHooked) {
      ctx.save();
      const tension = Math.min(1.0, playerSpeed / 350);
      const sag = (1 - tension) * 14 * Math.sin(state.gameTimeSec * 22);
      const midX = (p.x + p.anchorX) / 2;
      const midY = (p.y + p.anchorY) / 2 + sag;

      // Cable Outer Electric Aura
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(midX, midY, p.anchorX, p.anchorY);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.lineWidth = 5;
      ctx.stroke();

      // Cable Core White Filament
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(midX, midY, p.anchorX, p.anchorY);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Point Light on Anchor Connection
      light.renderLight(ctx, p.anchorX, p.anchorY, 32, "rgba(224, 242, 254, 0.8)", "rgba(0, 0, 0, 0)");
      ctx.restore();
    }

    // 5. Thruster Plasma Flame Particles
    thruster.render(ctx);

    // 6. Player Vessel with Metallic Shading & Afterburner Glow
    ctx.save();
    ctx.translate(p.x, p.y);

    // Bank Tilt
    const bankAngle = Math.max(-0.45, Math.min(0.45, (p.vx / 380) * 0.45));
    ctx.rotate(bankAngle);

    // Spring Squash & Stretch
    ctx.scale(juice.spring.scaleX, juice.spring.scaleY);

    // Outer Thruster Engine Glow
    light.renderLight(ctx, 0, 10, 24, "rgba(56, 189, 248, 0.6)", "rgba(0, 0, 0, 0)");

    // Mecha Ship Chassis Wings
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(18, 14);
    ctx.lineTo(0, 6);
    ctx.lineTo(-18, 14);
    ctx.closePath();

    const shipGrad = ctx.createLinearGradient(-18, -20, 18, 14);
    shipGrad.addColorStop(0, p.isHooked ? "#0284c7" : "#2563eb");
    shipGrad.addColorStop(1, p.isHooked ? "#38bdf8" : "#60a5fa");
    ctx.fillStyle = shipGrad;
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cockpit Glass Canopy
    ctx.beginPath();
    ctx.ellipse(0, -4, 4, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#67e8f9";
    ctx.fill();

    ctx.restore();

    // 7. Boss Death Beam Laser
    laser.render(ctx);

    // 8. Boss FABRIK Mechanical Tentacles with Metal Hinge Joints
    for (const tentacle of b.tentacles) {
      ctx.save();
      for (let j = 0; j < tentacle.joints.length - 1; j++) {
        const j1 = tentacle.joints[j];
        const j2 = tentacle.joints[j + 1];
        const progress = j / (tentacle.joints.length - 1);

        // Heavy Hydraulic Cable
        ctx.beginPath();
        ctx.moveTo(j1.x, j1.y);
        ctx.lineTo(j2.x, j2.y);
        ctx.strokeStyle = b.phase === 2 ? "#991b1b" : "#334155";
        ctx.lineWidth = 7 * (1 - progress * 0.45);
        ctx.stroke();

        // Joint Armor Node
        ctx.beginPath();
        ctx.arc(j2.x, j2.y, 8 * (1 - progress * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = b.phase === 2 ? "#ef4444" : "#94a3b8";
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Claw Tip
      const tip = tentacle.joints[tentacle.joints.length - 1];
      if (tip) {
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = b.phase === 2 ? "#fca5a5" : "#38bdf8";
        ctx.fill();
      }
      ctx.restore();
    }

    // 9. Mechanical Beholder Body with Radial Dynamic Point Light
    ctx.save();
    ctx.translate(b.x, b.y);

    // Boss Glowing Point Light
    light.renderLight(
      ctx,
      0,
      0,
      b.phase === 2 ? 140 : 100,
      b.phase === 2 ? "rgba(239, 68, 68, 0.4)" : "rgba(2, 132, 199, 0.3)",
      "rgba(0, 0, 0, 0)"
    );

    // Heavy Titanium Hull
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fillStyle = b.phase === 2 ? "#450a0a" : "#0f172a";
    ctx.fill();
    ctx.strokeStyle = b.phase === 2 ? "#ef4444" : "#475569";
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // Eye Pupil Tracking Player
    const bdx = p.x - b.x;
    const bdy = p.y - b.y;
    const bdist = Math.max(1, Math.hypot(bdx, bdy));
    const pupilDist = 16;
    const ex = (bdx / bdist) * pupilDist;
    const ey = (bdy / bdist) * pupilDist;

    // Sclera Lens
    ctx.beginPath();
    ctx.arc(ex, ey, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Iris Ring
    ctx.beginPath();
    ctx.arc(ex, ey, 12, 0, Math.PI * 2);
    ctx.fillStyle = b.phase === 2 ? "#dc2626" : "#0284c7";
    ctx.fill();

    // Slit Core
    ctx.beginPath();
    ctx.ellipse(ex, ey, 4, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#020617";
    ctx.fill();

    ctx.restore();

    // 10. High-Energy Projectiles with Screen Glow
    for (const proj of state.projectiles) {
      light.renderLight(
        ctx,
        proj.x,
        proj.y,
        proj.isHostile ? 20 : 16,
        proj.isHostile ? "rgba(239, 68, 68, 0.5)" : "rgba(56, 189, 248, 0.5)",
        "rgba(0, 0, 0, 0)"
      );

      ctx.save();
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.isHostile ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = proj.isHostile ? "#ef4444" : "#ffffff";
      ctx.fill();
      ctx.restore();
    }

    // 11. In-Canvas Touch Joystick Glowing Indicator
    const touchCtrl = touchControlRef.current;
    if (touchCtrl.active) {
      ctx.save();
      // Outer Joystick Ring
      ctx.beginPath();
      ctx.arc(touchCtrl.startX, touchCtrl.startY, 44, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner Touch Thumb Knob
      ctx.beginPath();
      ctx.arc(touchCtrl.currentX, touchCtrl.currentY, 18, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56, 189, 248, 0.75)";
      ctx.fill();
      ctx.restore();
    }

    // 12. In-Canvas Native HUD Overlays (Top Bar)
    ctx.save();
    // Player Shield Bar (Left)
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.fillRect(16, 16, 160, 16);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(16, 16, 160 * (state.playerHp / state.maxPlayerHp), 16);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, 160, 16);

    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`SHIELD: ${Math.round(state.playerHp)}%`, 22, 29);

    // Boss HP Bar (Center-Right)
    const bossBarWidth = 220;
    const bossBarX = ARENA_WIDTH - bossBarWidth - 16;
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.fillRect(bossBarX, 16, bossBarWidth, 16);
    ctx.fillStyle = b.phase === 2 ? "#ef4444" : "#f59e0b";
    ctx.fillRect(bossBarX, 16, bossBarWidth * (b.hp / b.maxHp), 16);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(bossBarX, 16, bossBarWidth, 16);

    ctx.fillText(b.phase === 2 ? "BEHOLDER: ENRAGED" : "BEHOLDER: TITAN", bossBarX + 6, 29);

    // Score Display (Top Center)
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#facc15";
    ctx.textAlign = "center";
    ctx.fillText(`SCORE: ${state.score}`, ARENA_WIDTH / 2, 28);

    // Minimal In-Canvas Sound & Retry Pill Guide
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.textAlign = "center";
    ctx.fillText("TAP SCREEN TO GRAPPLE & SLINGSHOT • AUTO-BLASTER ACTIVE", ARENA_WIDTH / 2, ARENA_HEIGHT - 14);

    ctx.restore();

    // 13. GameJuice Particles & Floating Combat Text
    juice.render(ctx);

    ctx.restore();
  };

  // 100% In-Canvas Touch / Pointer Handlers with Event Prevention
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Start in-canvas touch joystick
    touchControlRef.current = {
      active: true,
      touchId: e.pointerId,
      startX: clickX,
      startY: clickY,
      currentX: clickX,
      currentY: clickY,
      isHoldingWire: true,
    };

    // Instant Wire Hook Action on Screen Tap
    inputRef.current.fireHook = true;
    sfxRef.current.playWireClack();
    triggerMobileHaptic("medium");
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const touchCtrl = touchControlRef.current;
    if (!touchCtrl.active || touchCtrl.touchId !== e.pointerId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;

    touchCtrl.currentX = (e.clientX - rect.left) * scaleX;
    touchCtrl.currentY = (e.clientY - rect.top) * scaleY;

    const dx = touchCtrl.currentX - touchCtrl.startX;
    const dy = touchCtrl.currentY - touchCtrl.startY;

    // Analog steering axis
    if (dx < -16) {
      inputRef.current.moveAxis = -1;
    } else if (dx > 16) {
      inputRef.current.moveAxis = 1;
    } else {
      inputRef.current.moveAxis = 0;
    }

    // Upward flick trigger
    if (dy < -26) {
      inputRef.current.jump = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const touchCtrl = touchControlRef.current;
    if (touchCtrl.touchId === e.pointerId) {
      touchCtrl.active = false;
      touchCtrl.touchId = null;
      inputRef.current.moveAxis = 0;

      // Release wire and slingshot jump into the air!
      if (stateRef.current.player.isHooked) {
        inputRef.current.jump = true;
        sfxRef.current.playWireClack();
        triggerMobileHaptic("heavy");
      }
    }
  };

  const handleReset = () => {
    stateRef.current = initializeGrapplingBoss();
    setModalState({
      status: "playing",
      score: 0,
      soundOn: modalState.soundOn,
    });
    sfxRef.current.playWireClack();
  };

  const handleShare = () => {
    shareText(
      `Conquered Titan Beholder in Grappling Boss Arena! Score: ${modalState.score}. Free full-screen arcade: https://game.oiyo.net/grappling-boss`
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-5xl mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl border border-border select-none touch-none"
    >
      {/* 100% In-Screen Responsive Arcade Canvas */}
      <canvas
        ref={canvasRef}
        width={ARENA_WIDTH}
        height={ARENA_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full aspect-video block cursor-crosshair bg-black"
      />

      {/* Victory / Defeat Modal (Clean In-Screen Arcade Overlay) */}
      {modalState.status !== "playing" && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
          {modalState.status === "victory" ? (
            <div className="flex flex-col items-center gap-3">
              <span className="text-5xl">🏆</span>
              <h2 className="text-2xl font-black tracking-tight text-primary">
                TITAN BEHOLDER DEFEATED!
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Aerial momentum mastered. Final Arena Score: {modalState.score}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all"
                >
                  {copied ? "Copied!" : "Share Battle"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border shadow-md transition-all"
                >
                  Play Again
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <span className="text-5xl">💀</span>
              <h2 className="text-2xl font-black tracking-tight text-destructive">
                SHIELD BREACHED
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Tap and hold to swing across ceiling anchors; release to slingshot over death beams!
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 text-xs font-bold rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md transition-all mt-2"
              >
                Retry Arena
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GrapplingBoss;
