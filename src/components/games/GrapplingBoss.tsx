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
  ProceduralMechaSpriteRenderer,
} from "../../lib/games/grappling-engine-pro";

export function GrapplingBoss() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Ref-based Native Zero-GC 60/120fps Simulation State
  const stateRef = useRef<GrapplingBossState>(initializeGrapplingBoss());
  // Mild camera shake tuning to prevent motion sickness
  const juiceRef = useRef<GameJuice>(new GameJuice(384));
  const starfieldRef = useRef<ParallaxStarfield>(new ParallaxStarfield(ARENA_WIDTH, ARENA_HEIGHT, 90));
  const thrusterRef = useRef<ThrusterTrail>(new ThrusterTrail());
  const laserRef = useRef<LaserBeamEffect>(new LaserBeamEffect());
  const musicRef = useRef<ProceduralMusicEngine>(new ProceduralMusicEngine());
  const cameraDynRef = useRef<CameraDynamics2D>(new CameraDynamics2D());
  const speedLinesRef = useRef<SpeedLinesSystem>(new SpeedLinesSystem(28));
  const lightRef = useRef<DynamicLightRenderer>(new DynamicLightRenderer());
  const sfxRef = useRef<ProceduralSfxBank>(new ProceduralSfxBank());
  const spritesRef = useRef<ProceduralMechaSpriteRenderer>(new ProceduralMechaSpriteRenderer());

  // Input & Touch State (Entirely In-Canvas)
  const touchControlRef = useRef<{
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

  const inputRef = useRef({
    moveAxis: 0 as -1 | 0 | 1,
    jump: false,
    fireHook: false,
    autoFireTimer: 0,
  });

  // Immersive Fullscreen and Victory/Defeat Modal state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [modalState, setModalState] = useState<{
    status: "playing" | "victory" | "defeated";
    score: number;
  }>({
    status: "playing",
    score: 0,
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

  // Safari Native Touch & Mouse Event Listeners Binding (Fixes Safari touch ignores)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = ARENA_WIDTH / rect.width;
      const scaleY = ARENA_HEIGHT / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    // Check Fullscreen Button hit in canvas (top right corner: 720..780, 14..36)
    const checkFullscreenButtonHit = (x: number, y: number): boolean => {
      if (x >= ARENA_WIDTH - 80 && x <= ARENA_WIDTH - 12 && y >= 12 && y <= 38) {
        toggleFullscreenMode();
        return true;
      }
      return false;
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const touch = e.changedTouches[0];
      if (!touch) return;

      const coords = getCanvasCoords(touch.clientX, touch.clientY);

      // Check if user clicked fullscreen icon
      if (checkFullscreenButtonHit(coords.x, coords.y)) {
        return;
      }

      touchControlRef.current = {
        active: true,
        touchId: touch.identifier,
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
      };

      // Instant Grapple Hook on Screen Touch
      inputRef.current.fireHook = true;
      sfxRef.current.playWireClack();
      triggerMobileHaptic("light");
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const touchCtrl = touchControlRef.current;
      if (!touchCtrl.active) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchCtrl.touchId) {
          const coords = getCanvasCoords(touch.clientX, touch.clientY);
          touchCtrl.currentX = coords.x;
          touchCtrl.currentY = coords.y;

          const dx = touchCtrl.currentX - touchCtrl.startX;
          const dy = touchCtrl.currentY - touchCtrl.startY;

          if (dx < -14) {
            inputRef.current.moveAxis = -1;
          } else if (dx > 14) {
            inputRef.current.moveAxis = 1;
          } else {
            inputRef.current.moveAxis = 0;
          }

          if (dy < -22) {
            inputRef.current.jump = true;
          }
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const touchCtrl = touchControlRef.current;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchCtrl.touchId) {
          touchCtrl.active = false;
          touchCtrl.touchId = null;
          inputRef.current.moveAxis = 0;

          // Slingshot Jump on Finger Release
          if (stateRef.current.player.isHooked) {
            inputRef.current.jump = true;
            sfxRef.current.playWireClack();
            triggerMobileHaptic("medium");
          }
          break;
        }
      }
    };

    // Desktop Mouse Handlers
    const onMouseDown = (e: MouseEvent) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (checkFullscreenButtonHit(coords.x, coords.y)) return;

      touchControlRef.current = {
        active: true,
        touchId: 999,
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
      };
      inputRef.current.fireHook = true;
      sfxRef.current.playWireClack();
    };

    const onMouseMove = (e: MouseEvent) => {
      const touchCtrl = touchControlRef.current;
      if (!touchCtrl.active || touchCtrl.touchId !== 999) return;
      const coords = getCanvasCoords(e.clientX, e.clientY);
      touchCtrl.currentX = coords.x;
      touchCtrl.currentY = coords.y;

      const dx = touchCtrl.currentX - touchCtrl.startX;
      if (dx < -14) inputRef.current.moveAxis = -1;
      else if (dx > 14) inputRef.current.moveAxis = 1;
      else inputRef.current.moveAxis = 0;
    };

    const onMouseUp = () => {
      const touchCtrl = touchControlRef.current;
      if (touchCtrl.active && touchCtrl.touchId === 999) {
        touchCtrl.active = false;
        touchCtrl.touchId = null;
        inputRef.current.moveAxis = 0;
        if (stateRef.current.player.isHooked) {
          inputRef.current.jump = true;
        }
      }
    };

    // Register passive: false listeners directly to DOM element
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);

      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const toggleFullscreenMode = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        // Try native requestFullscreen if available
        const elem = containerRef.current;
        if (elem?.requestFullscreen) {
          elem.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  };

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

        // 1. Continuous Auto-targeting Plasma Blaster
        inputRef.current.autoFireTimer += effectiveDt;
        if (inputRef.current.autoFireTimer > 0.15) {
          inputRef.current.autoFireTimer = 0;
          const bdx = state.boss.x - state.player.x;
          const bdy = state.boss.y - state.player.y;
          const bdist = Math.max(0.001, Math.hypot(bdx, bdy));
          const pSpeed = 640;

          state.projectiles.push({
            id: `blaster-${Date.now()}-${Math.random()}`,
            x: state.player.x,
            y: state.player.y - 12,
            vx: (bdx / bdist) * pSpeed + (Math.random() - 0.5) * 35,
            vy: (bdy / bdist) * pSpeed + (Math.random() - 0.5) * 35,
            damage: 28,
            isHostile: false,
            lifespanSec: 2.0,
          });
          sfx.playLaserShot();
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
        if (Math.abs(curState.player.vx) > 30 || Math.abs(curState.player.vy) > 30) {
          thruster.emit(
            curState.player.x,
            curState.player.y + 14,
            curState.player.vx / 350,
            curState.player.vy / 350
          );
        }

        // Camera Dynamics & Speed Lines Update (Mild, comfortable zoom)
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
            // Mild screen shake (no violent dizziness)
            juice.camera.addTrauma(0.22);
            cameraDyn.punch(0.04);
            sfx.playHeavyExplosion();
            triggerMobileHaptic("medium");
          }
          laser.fire(curState.boss.x, curState.boss.y, curState.player.x, curState.player.y);

          // Damage player inside beam
          const ldx = laser.endX - laser.startX;
          const ldy = laser.endY - laser.startY;
          const ldist = Math.max(1, Math.hypot(ldx, ldy));
          const nx = -ldy / ldist;
          const ny = ldx / ldist;
          const pDist = Math.abs((curState.player.x - laser.startX) * nx + (curState.player.y - laser.startY) * ny);
          if (pDist < 22) {
            curState.playerHp = Math.max(0, curState.playerHp - 45 * effectiveDt);
            juice.camera.addTrauma(0.25);
            triggerMobileHaptic("warning");
          }
        } else {
          laser.clear();
        }

        // Boss Impact Feedback (Mild punch zoom)
        if (curState.boss.hp < prevBossHp) {
          const dmg = Math.round(prevBossHp - curState.boss.hp);
          const isCrit = dmg > 35;
          juice.impact(curState.boss.x, curState.boss.y, isCrit ? "heavy" : "light", `-${dmg}`);
          cameraDyn.punch(isCrit ? 0.04 : 0.02);
          triggerMobileHaptic("light");
        }

        // Player Impact Feedback
        if (curState.playerHp < prevPlayerHp) {
          juice.camera.addTrauma(0.3);
          cameraDyn.punch(0.05);
          juice.particles.emit(curState.player.x, curState.player.y, {
            count: 14,
            kind: "spark",
            color: "#ef4444",
            speedMin: 100,
            speedMax: 240,
          });
          triggerMobileHaptic("warning");
        }

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

  // Master Canvas Frame Renderer with High-Res Procedural Sprites
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
    const sprites = spritesRef.current;
    const p = state.player;
    const b = state.boss;
    const playerSpeed = Math.hypot(p.vx, p.vy);

    ctx.save();
    ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Apply Mild Elastic Camera Dynamics & Controlled Trauma
    cameraDyn.apply(ctx, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
    juice.camera.applyToContext(ctx, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);

    // 1. Deep Space Parallax Starfield & Floor Grid
    starfield.render(ctx, p.x - ARENA_WIDTH / 2, p.y - ARENA_HEIGHT / 2, state.gameTimeSec, b.phase === 2);

    // 2. Dynamic Speed Lines during Momentum Swings
    speedLines.render(ctx, p.x, p.y, playerSpeed);

    // 3. Render Graviton Anchor Nodes with Counter-Rotating Rings
    for (const anchor of state.anchors) {
      const isTarget = p.isHooked && p.anchorX === anchor.x && p.anchorY === anchor.y;

      // Point Light Bloom
      light.renderLight(
        ctx,
        anchor.x,
        anchor.y,
        isTarget ? 45 : 24,
        isTarget ? "rgba(56, 189, 248, 0.45)" : "rgba(250, 204, 21, 0.2)",
        "rgba(0, 0, 0, 0)",
        0.8
      );

      // High-Res Graviton Node Vector Sprite
      sprites.renderGravitonAnchor(ctx, anchor.x, anchor.y, anchor.radius, isTarget, state.gameTimeSec);
    }

    // 4. Render Grapple Cable (Dynamic Catenary Wave & Energy Glow)
    if (p.isHooked) {
      ctx.save();
      const tension = Math.min(1.0, playerSpeed / 350);
      const sag = (1 - tension) * 12 * Math.sin(state.gameTimeSec * 22);
      const midX = (p.x + p.anchorX) / 2;
      const midY = (p.y + p.anchorY) / 2 + sag;

      // Cable Outer Electric Aura
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(midX, midY, p.anchorX, p.anchorY);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Cable Core White Filament
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(midX, midY, p.anchorX, p.anchorY);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      light.renderLight(ctx, p.anchorX, p.anchorY, 28, "rgba(224, 242, 254, 0.7)", "rgba(0, 0, 0, 0)");
      ctx.restore();
    }

    // 5. Thruster Plasma Flame Particles
    thruster.render(ctx);

    // 6. High-Res Player Viper-X Mecha Sprite
    const bankAngle = Math.max(-0.4, Math.min(0.4, (p.vx / 380) * 0.4));
    sprites.renderPlayerVessel(
      ctx,
      p.x,
      p.y,
      bankAngle,
      juice.spring.scaleX,
      juice.spring.scaleY,
      p.isHooked
    );

    // 7. Boss Death Beam Laser
    laser.render(ctx);

    // 8. Boss FABRIK Mechanical Tentacles with Hydraulic Armor Hinges
    for (const tentacle of b.tentacles) {
      ctx.save();
      for (let j = 0; j < tentacle.joints.length - 1; j++) {
        const j1 = tentacle.joints[j];
        const j2 = tentacle.joints[j + 1];
        const progress = j / (tentacle.joints.length - 1);

        // Segment Connection Cable
        ctx.beginPath();
        ctx.moveTo(j1.x, j1.y);
        ctx.lineTo(j2.x, j2.y);
        ctx.strokeStyle = b.phase === 2 ? "#991b1b" : "#334155";
        ctx.lineWidth = 6 * (1 - progress * 0.4);
        ctx.stroke();

        // Joint Armor Plate Node
        ctx.beginPath();
        ctx.arc(j2.x, j2.y, 7 * (1 - progress * 0.35), 0, Math.PI * 2);
        ctx.fillStyle = b.phase === 2 ? "#ef4444" : "#94a3b8";
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Claw Tip
      const tip = tentacle.joints[tentacle.joints.length - 1];
      if (tip) {
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = b.phase === 2 ? "#fca5a5" : "#38bdf8";
        ctx.fill();
      }
      ctx.restore();
    }

    // 9. High-Res Boss Beholder Sovereign Body with Optical Lens Reflex
    light.renderLight(
      ctx,
      b.x,
      b.y,
      b.phase === 2 ? 120 : 90,
      b.phase === 2 ? "rgba(239, 68, 68, 0.35)" : "rgba(2, 132, 199, 0.25)",
      "rgba(0, 0, 0, 0)"
    );
    sprites.renderBossBeholder(ctx, b.x, b.y, b.phase, p.x - b.x, p.y - b.y, state.gameTimeSec);

    // 10. High-Energy Projectiles with Light Bloom
    for (const proj of state.projectiles) {
      light.renderLight(
        ctx,
        proj.x,
        proj.y,
        proj.isHostile ? 18 : 14,
        proj.isHostile ? "rgba(239, 68, 68, 0.4)" : "rgba(56, 189, 248, 0.4)",
        "rgba(0, 0, 0, 0)"
      );

      ctx.save();
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.isHostile ? 5.5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = proj.isHostile ? "#ef4444" : "#ffffff";
      ctx.fill();
      ctx.restore();
    }

    // 11. In-Canvas Touch Joystick Glowing Indicator
    const touchCtrl = touchControlRef.current;
    if (touchCtrl.active) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(touchCtrl.startX, touchCtrl.startY, 40, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(touchCtrl.currentX, touchCtrl.currentY, 16, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56, 189, 248, 0.75)";
      ctx.fill();
      ctx.restore();
    }

    // 12. In-Canvas Native HUD Overlays (Top Bar)
    ctx.save();
    // Player Shield Bar (Left)
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.fillRect(16, 16, 150, 16);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(16, 16, 150 * (state.playerHp / state.maxPlayerHp), 16);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, 150, 16);

    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`SHIELD: ${Math.round(state.playerHp)}%`, 22, 28);

    // Boss HP Bar (Center)
    const bossBarWidth = 190;
    const bossBarX = ARENA_WIDTH / 2 - bossBarWidth / 2;
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.fillRect(bossBarX, 16, bossBarWidth, 16);
    ctx.fillStyle = b.phase === 2 ? "#ef4444" : "#f59e0b";
    ctx.fillRect(bossBarX, 16, bossBarWidth * (b.hp / b.maxHp), 16);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(bossBarX, 16, bossBarWidth, 16);
    ctx.fillText(b.phase === 2 ? "BEHOLDER: ENRAGED" : "BEHOLDER: TITAN", bossBarX + 6, 28);

    // Score Display
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#facc15";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${state.score}`, 16, 48);

    // Fullscreen F11 Toggle Button (Top Right ⛶)
    const btnX = ARENA_WIDTH - 80;
    ctx.fillStyle = isFullscreen ? "rgba(56, 189, 248, 0.35)" : "rgba(15, 23, 42, 0.75)";
    ctx.fillRect(btnX, 14, 66, 24);
    ctx.strokeStyle = isFullscreen ? "#38bdf8" : "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(btnX, 14, 66, 24);

    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(isFullscreen ? "⛶ EXIT" : "⛶ FULL", btnX + 33, 30);

    // Minimal Instruction
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.textAlign = "center";
    ctx.fillText("TOUCH & HOLD = HOOK SWING • RELEASE = SLINGSHOT • AUTO-BLASTER", ARENA_WIDTH / 2, ARENA_HEIGHT - 12);

    ctx.restore();

    // 13. GameJuice Particles & Combat Text
    juice.render(ctx);

    ctx.restore();
  };

  const handleReset = () => {
    stateRef.current = initializeGrapplingBoss();
    setModalState({
      status: "playing",
      score: 0,
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
      className={`relative select-none touch-none ${
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-screen bg-black flex items-center justify-center p-0 m-0"
          : "w-full max-w-5xl mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl border border-border"
      }`}
    >
      {/* 100% In-Screen Responsive Arcade Canvas */}
      <canvas
        ref={canvasRef}
        width={ARENA_WIDTH}
        height={ARENA_HEIGHT}
        className={`block cursor-crosshair bg-black ${
          isFullscreen ? "w-full h-full object-contain" : "w-full aspect-video"
        }`}
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
                Touch and hold to swing across ceiling anchors; release to slingshot over death beams!
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
