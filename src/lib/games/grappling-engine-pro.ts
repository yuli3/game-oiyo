/**
 * Grappling Engine Pro - Next-Gen Canvas Physics, Lighting & Camera Dynamics
 *
 * Provides:
 * 1. CameraPunchZoom2D - Elastic Hooke's Law punch-zoom and velocity-responsive dynamic FOV
 * 2. SpeedLinesSystem - Anime/Arcade radial velocity speed lines for extreme momentum
 * 3. DynamicLightRenderer - Multi-channel 2D point light bloom and glow masks
 * 4. ProceduralSfxBank - Rich multi-oscillator synthesized audio assets (Explosions, Lasers, Grapple Clack)
 */

// ============================================================================
// 1. Camera Dynamics (Mild & Polished Punch Zoom & Elastic FOV)
// ============================================================================

export class CameraDynamics2D {
  public zoom: number = 1.0;
  public targetZoom: number = 1.0;
  private zoomVelocity: number = 0;
  public punchAmount: number = 0;

  // Polished mild spring constants (no extreme disorienting shakes)
  private readonly stiffness: number = 240;
  private readonly damping: number = 22;

  /**
   * Adds a subtle, high-impact punch zoom (capped low for comfort).
   * amount = 0.04..0.06 creates a crisp tactile snap without causing nausea.
   */
  public punch(amount: number = 0.04): void {
    this.punchAmount = Math.min(0.08, this.punchAmount + amount * 0.5);
  }

  /**
   * Updates camera zoom responding to player speed and elastic recovery.
   */
  public update(dtSeconds: number, playerSpeed: number): void {
    // Subtle velocity FOV: mild zoom-out up to 0.95 at peak velocity
    const speedRatio = Math.min(1.0, playerSpeed / 450);
    this.targetZoom = 1.0 - speedRatio * 0.05;

    // Decay punch amount with spring physics
    const currentTotalZoom = this.zoom + this.punchAmount;
    const displacement = currentTotalZoom - this.targetZoom;
    const springForce = -this.stiffness * displacement;
    const dampingForce = -this.damping * this.zoomVelocity;
    const acceleration = springForce + dampingForce;

    this.zoomVelocity += acceleration * dtSeconds;
    this.zoom += this.zoomVelocity * dtSeconds;
    this.punchAmount = Math.max(0, this.punchAmount - dtSeconds * 4.0);

    // Tightly clamped for visual comfort
    this.zoom = Math.max(0.92, Math.min(1.08, this.zoom));
  }

  public apply(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
    ctx.translate(centerX, centerY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-centerX, -centerY);
  }
}

// ============================================================================
// 2. Arcade Velocity Speed Lines System
// ============================================================================

export interface SpeedLine {
  angle: number;
  distance: number;
  length: number;
  width: number;
  speed: number;
  alpha: number;
}

export class SpeedLinesSystem {
  public lines: SpeedLine[] = [];
  public capacity: number = 32;

  constructor(capacity: number = 32) {
    this.capacity = capacity;
    for (let i = 0; i < capacity; i++) {
      this.lines.push(this.createRandomLine());
    }
  }

  private createRandomLine(): SpeedLine {
    return {
      angle: Math.random() * Math.PI * 2,
      distance: 200 + Math.random() * 300,
      length: 50 + Math.random() * 120,
      width: 1.5 + Math.random() * 2.5,
      speed: 300 + Math.random() * 400,
      alpha: 0.1 + Math.random() * 0.4,
    };
  }

  public update(dtSeconds: number, playerSpeed: number): void {
    const isHighSpeed = playerSpeed > 220;
    const speedMultiplier = isHighSpeed ? playerSpeed / 200 : 0;

    for (const line of this.lines) {
      if (isHighSpeed) {
        line.distance -= line.speed * speedMultiplier * dtSeconds;
        if (line.distance < 40) {
          line.distance = 450 + Math.random() * 150;
          line.angle = Math.random() * Math.PI * 2;
        }
      }
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    playerSpeed: number
  ): void {
    if (playerSpeed < 220) return;

    ctx.save();
    ctx.translate(centerX, centerY);

    const intensity = Math.min(1.0, (playerSpeed - 220) / 250);

    for (const line of this.lines) {
      const cos = Math.cos(line.angle);
      const sin = Math.sin(line.angle);

      const x1 = cos * line.distance;
      const y1 = sin * line.distance;
      const x2 = cos * (line.distance + line.length);
      const y2 = sin * (line.distance + line.length);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(186, 230, 253, ${line.alpha * intensity})`;
      ctx.lineWidth = line.width;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ============================================================================
// 3. Dynamic 2D Lighting & Glow Renderer
// ============================================================================

export interface PointLight {
  x: number;
  y: number;
  radius: number;
  colorInner: string;
  colorOuter: string;
  intensity: number;
}

export class DynamicLightRenderer {
  public renderLight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    colorInner: string,
    colorOuter: string = 'rgba(0, 0, 0, 0)',
    intensity: number = 1.0
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.max(0, Math.min(1.0, intensity));

    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, colorInner);
    grad.addColorStop(1, colorOuter);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ============================================================================
// 4. Procedural Multi-Oscillator Audio Assets Bank
// ============================================================================

export class ProceduralSfxBank {
  private ctx: AudioContext | null = null;

  public setAudioContext(ctx: AudioContext | null): void {
    this.ctx = ctx;
  }

  /**
   * Heavy 808 Sub-Bass Impact Boom (Boss hit / massive explosion)
   */
  public playHeavyExplosion(): void {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);

      // Noise layer for crunch
      this.playNoiseBurst(0.18, 0.25);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Metallic Wire Clack / Anchor Snap Sound
   */
  public playWireClack(): void {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Audio fallback
    }
  }

  /**
   * High-Energy Plasma Laser Blast
   */
  public playLaserShot(): void {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio fallback
    }
  }

  private playNoiseBurst(duration: number, volume: number): void {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch {
      // Audio fallback
    }
  }
}

// ============================================================================
// 5. High-Resolution Procedural Vector Sprite & Texture Renderer
// ============================================================================

export class ProceduralMechaSpriteRenderer {
  /**
   * Renders high-fidelity Viper-X mecha interceptor vessel with specular glass canopy,
   * panel lines, and twin afterburner exhaust ports.
   */
  public renderPlayerVessel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    bankAngle: number,
    squash: number,
    stretch: number,
    isHooked: boolean
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bankAngle);
    ctx.scale(squash, stretch);

    // 1. Afterburner Twin Exhaust Glow
    ctx.save();
    ctx.fillStyle = isHooked ? '#38bdf8' : '#60a5fa';
    ctx.beginPath();
    ctx.ellipse(-7, 12, 3, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(7, 12, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Main Aerodynamic Carbon-Titanium Hull
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, -22); // Nose tip
    ctx.lineTo(8, -8);
    ctx.lineTo(22, 14); // Right wing tip
    ctx.lineTo(12, 12);
    ctx.lineTo(6, 16);  // Right thruster cowing
    ctx.lineTo(0, 10);  // Center keel
    ctx.lineTo(-6, 16); // Left thruster cowing
    ctx.lineTo(-12, 12);
    ctx.lineTo(-22, 14); // Left wing tip
    ctx.lineTo(-8, -8);
    ctx.closePath();

    const hullGrad = ctx.createLinearGradient(-22, -22, 22, 16);
    if (isHooked) {
      hullGrad.addColorStop(0, '#0284c7');
      hullGrad.addColorStop(0.5, '#0369a1');
      hullGrad.addColorStop(1, '#0c4a6e');
    } else {
      hullGrad.addColorStop(0, '#2563eb');
      hullGrad.addColorStop(0.5, '#1d4ed8');
      hullGrad.addColorStop(1, '#1e3a8a');
    }
    ctx.fillStyle = hullGrad;
    ctx.fill();

    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Wing Inset Panels & Rivet Accents
    ctx.beginPath();
    ctx.moveTo(-16, 10);
    ctx.lineTo(-8, -2);
    ctx.lineTo(8, -2);
    ctx.lineTo(16, 10);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Cockpit Canopy Dome with Specular Highlights
    ctx.beginPath();
    ctx.ellipse(0, -5, 4.5, 9, 0, 0, Math.PI * 2);
    const canopyGrad = ctx.createLinearGradient(-4, -14, 4, 4);
    canopyGrad.addColorStop(0, '#67e8f9');
    canopyGrad.addColorStop(0.6, '#0284c7');
    canopyGrad.addColorStop(1, '#082f49');
    ctx.fillStyle = canopyGrad;
    ctx.fill();

    // Specular Glass Reflection Arc
    ctx.beginPath();
    ctx.ellipse(-1.5, -7, 1.5, 4, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  /**
   * Renders the Mechanical Beholder Sovereign with hexagonal armor plating,
   * aperture blades, and spherical lens reflections.
   */
  public renderBossBeholder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    phase: 1 | 2,
    lookDx: number,
    lookDy: number,
    timeSec: number
  ): void {
    ctx.save();
    ctx.translate(x, y);

    const isPhase2 = phase === 2;
    const bodyRadius = 48;

    // 1. Heavy Outer Titanium Hull with Hex Armor Rivets
    ctx.beginPath();
    ctx.arc(0, 0, bodyRadius, 0, Math.PI * 2);
    const hullGrad = ctx.createRadialGradient(0, -10, 8, 0, 0, bodyRadius);
    hullGrad.addColorStop(0, isPhase2 ? '#450a0a' : '#1e293b');
    hullGrad.addColorStop(0.7, isPhase2 ? '#260505' : '#0f172a');
    hullGrad.addColorStop(1, isPhase2 ? '#160202' : '#020617');
    ctx.fillStyle = hullGrad;
    ctx.fill();

    ctx.strokeStyle = isPhase2 ? '#ef4444' : '#64748b';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Rivet studs along hull border
    const rivetCount = 8;
    ctx.fillStyle = isPhase2 ? '#fca5a5' : '#94a3b8';
    for (let i = 0; i < rivetCount; i++) {
      const ang = (i / rivetCount) * Math.PI * 2 + timeSec * 0.15;
      const rx = Math.cos(ang) * (bodyRadius - 4);
      const ry = Math.sin(ang) * (bodyRadius - 4);
      ctx.beginPath();
      ctx.arc(rx, ry, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Optical Eye Sensor Tracking Player
    const dist = Math.max(1, Math.hypot(lookDx, lookDy));
    const maxOffset = 16;
    const ex = (lookDx / dist) * maxOffset;
    const ey = (lookDy / dist) * maxOffset;

    // Sclera Housing (Lens Socket)
    ctx.beginPath();
    ctx.arc(ex, ey, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Aperture Iris Blades
    ctx.beginPath();
    ctx.arc(ex, ey, 13, 0, Math.PI * 2);
    const irisGrad = ctx.createRadialGradient(ex, ey, 2, ex, ey, 13);
    if (isPhase2) {
      irisGrad.addColorStop(0, '#f87171');
      irisGrad.addColorStop(0.6, '#dc2626');
      irisGrad.addColorStop(1, '#7f1d1d');
    } else {
      irisGrad.addColorStop(0, '#38bdf8');
      irisGrad.addColorStop(0.6, '#0284c7');
      irisGrad.addColorStop(1, '#075985');
    }
    ctx.fillStyle = irisGrad;
    ctx.fill();

    // Central Slit Pupil Core
    ctx.beginPath();
    ctx.ellipse(ex, ey, 4.5, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#020617';
    ctx.fill();

    // Glass Lens Spherical Reflection Arc
    ctx.beginPath();
    ctx.arc(ex - 4, ey - 6, 8, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders Graviton ceiling anchor nodes with counter-rotating calibration rings.
   */
  public renderGravitonAnchor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    isTarget: boolean,
    timeSec: number
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Counter-rotating tech rings
    ctx.save();
    ctx.rotate(timeSec * (isTarget ? 2.5 : 1.0));
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = isTarget ? '#38bdf8' : '#d97706';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();

    // Core Solid Node
    ctx.beginPath();
    ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
    ctx.fillStyle = isTarget ? '#0284c7' : '#451a03';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pulsing Core Light Pip
    const pulse = Math.sin(timeSec * 6) * 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 4 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = isTarget ? '#e0f2fe' : '#fef08a';
    ctx.fill();

    ctx.restore();
  }
}

