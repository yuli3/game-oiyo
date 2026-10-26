/**
 * Multi-touch floating virtual joystick controller.
 * Decoupled from DOM events for 100% testability and seamless mobile ergonomics.
 */

export interface JoystickConfig {
  maxRadius?: number;
  deadzone?: number;
}

export interface JoystickState {
  active: boolean;
  touchId: number | null;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  vectorX: number;
  vectorY: number;
  intensity: number;
  angleRad: number;
}

export class FloatingJoystick {
  private maxRadius: number;
  private deadzone: number;
  private state: JoystickState;

  constructor(config: JoystickConfig = {}) {
    this.maxRadius = Math.max(10, config.maxRadius ?? 50);
    this.deadzone = Math.max(0, config.deadzone ?? 6);
    this.state = this.createDefaultState();
  }

  private createDefaultState(): JoystickState {
    return {
      active: false,
      touchId: null,
      originX: 0,
      originY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
      vectorX: 0,
      vectorY: 0,
      intensity: 0,
      angleRad: 0,
    };
  }

  public start(touchId: number, x: number, y: number): void {
    this.state = {
      active: true,
      touchId,
      originX: x,
      originY: y,
      currentX: x,
      currentY: y,
      deltaX: 0,
      deltaY: 0,
      vectorX: 0,
      vectorY: 0,
      intensity: 0,
      angleRad: 0,
    };
  }

  public move(touchId: number, x: number, y: number): boolean {
    if (!this.state.active || this.state.touchId !== touchId) {
      return false;
    }

    const rawDx = x - this.state.originX;
    const rawDy = y - this.state.originY;
    const dist = Math.hypot(rawDx, rawDy);

    if (dist <= this.deadzone) {
      this.state.currentX = x;
      this.state.currentY = y;
      this.state.deltaX = 0;
      this.state.deltaY = 0;
      this.state.vectorX = 0;
      this.state.vectorY = 0;
      this.state.intensity = 0;
      this.state.angleRad = 0;
      return true;
    }

    const angle = Math.atan2(rawDy, rawDx);
    const clampedDist = Math.min(dist, this.maxRadius);
    const effectiveRadius = this.maxRadius - this.deadzone;
    const intensity = Math.min(1, Math.max(0, (clampedDist - this.deadzone) / effectiveRadius));

    const unitX = Math.cos(angle);
    const unitY = Math.sin(angle);

    this.state.currentX = x;
    this.state.currentY = y;
    this.state.deltaX = unitX * clampedDist;
    this.state.deltaY = unitY * clampedDist;
    this.state.vectorX = unitX * intensity;
    this.state.vectorY = unitY * intensity;
    this.state.intensity = intensity;
    this.state.angleRad = angle;

    return true;
  }

  public end(touchId?: number): boolean {
    if (!this.state.active) return false;
    if (touchId !== undefined && this.state.touchId !== touchId) {
      return false;
    }

    this.reset();
    return true;
  }

  public reset(): void {
    this.state = this.createDefaultState();
  }

  public getState(): Readonly<JoystickState> {
    return this.state;
  }
}
