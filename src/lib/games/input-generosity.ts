/**
 * Universal Game Input Generosity Engine (game-input-systems)
 * Provides Coyote Time & Input Buffering to eliminate missed jumps/actions
 * caused by sub-frame timing mismatches on mobile touch screens & 60-120Hz displays.
 */

export class InputGenerosity {
  private buffer: Map<string, number> = new Map();
  private coyoteTimers: Map<string, number> = new Map();

  /**
   * Registers an action press with an input buffer window (default: 0.16s / ~10 frames at 60fps).
   * If the player pressed jump slightly before touching the ground, the input will execute upon landing.
   */
  public bufferPress(action: string, ttlSeconds: number = 0.16): void {
    this.buffer.set(action, Math.max(0.01, ttlSeconds));
  }

  /**
   * Checks if an action was buffered within the active window, and consumes it.
   */
  public consumeBufferedPress(action: string): boolean {
    const remaining = this.buffer.get(action) ?? 0;
    if (remaining > 0) {
      this.buffer.delete(action);
      return true;
    }
    return false;
  }

  /**
   * Starts Coyote Time window (default: 0.14s / ~8 frames) when walking/falling off an edge or leaving a platform.
   * Allows the player to jump briefly after leaving solid ground.
   */
  public startCoyote(timerName: string, durationSeconds: number = 0.14): void {
    this.coyoteTimers.set(timerName, Math.max(0.01, durationSeconds));
  }

  /**
   * Checks if Coyote Time is still active, and consumes it.
   */
  public consumeCoyote(timerName: string): boolean {
    const remaining = this.coyoteTimers.get(timerName) ?? 0;
    if (remaining > 0) {
      this.coyoteTimers.delete(timerName);
      return true;
    }
    return false;
  }

  /**
   * Advances all buffer and coyote timers by dt.
   */
  public update(dtSeconds: number): void {
    for (const [key, val] of this.buffer.entries()) {
      const nextVal = val - dtSeconds;
      if (nextVal <= 0) this.buffer.delete(key);
      else this.buffer.set(key, nextVal);
    }
    for (const [key, val] of this.coyoteTimers.entries()) {
      const nextVal = val - dtSeconds;
      if (nextVal <= 0) this.coyoteTimers.delete(key);
      else this.coyoteTimers.set(key, nextVal);
    }
  }

  /**
   * Resets all timers.
   */
  public reset(): void {
    this.buffer.clear();
    this.coyoteTimers.clear();
  }
}

export function createInputGenerosity(): InputGenerosity {
  return new InputGenerosity();
}
