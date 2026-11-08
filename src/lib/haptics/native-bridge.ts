/**
 * Native Haptics & Device Bridge
 * Supports Capacitor CoreHaptics on native iOS/Android,
 * with seamless fallback to Web Vibration API and no-op on unsupported browsers.
 */

export type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'fire'
  | 'hit'
  | 'levelUp'
  | 'evolution'
  | 'boss'
  | 'chest';

export class NativeHapticsBridge {
  public checkCapacitor(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    };
    return Boolean(win.Capacitor?.isNativePlatform?.());
  }

  public checkVibration(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  public isNative(): boolean {
    return this.checkCapacitor();
  }

  public isAvailable(): boolean {
    return this.checkCapacitor() || this.checkVibration();
  }

  public trigger(pattern: HapticPattern): void {
    if (typeof window === 'undefined') return;

    // 1. Try Native Capacitor CoreHaptics if present
    if (this.checkCapacitor()) {
      try {
        const win = window as unknown as {
          Capacitor?: {
            Plugins?: {
              Haptics?: {
                impact?: (opts: { style: string }) => Promise<void>;
                notification?: (opts: { type: string }) => Promise<void>;
                vibrate?: (opts: { duration: number }) => Promise<void>;
              };
            };
          };
        };
        const haptics = win.Capacitor?.Plugins?.Haptics;
        if (haptics) {
          switch (pattern) {
            case 'fire':
            case 'light':
              haptics.impact?.({ style: 'LIGHT' });
              return;
            case 'hit':
            case 'medium':
              haptics.impact?.({ style: 'MEDIUM' });
              return;
            case 'heavy':
            case 'boss':
              haptics.impact?.({ style: 'HEAVY' });
              return;
            case 'levelUp':
            case 'success':
            case 'evolution':
              haptics.notification?.({ type: 'SUCCESS' });
              return;
            case 'warning':
              haptics.notification?.({ type: 'WARNING' });
              return;
            case 'error':
              haptics.notification?.({ type: 'ERROR' });
              return;
            case 'chest':
              haptics.vibrate?.({ duration: 150 });
              return;
          }
        }
      } catch {
        // Fallback to web vibration
      }
    }

    // 2. Fallback to Web Vibration API
    if (this.checkVibration()) {
      try {
        switch (pattern) {
          case 'fire':
            navigator.vibrate(6);
            break;
          case 'hit':
            navigator.vibrate(35);
            break;
          case 'light':
            navigator.vibrate(10);
            break;
          case 'medium':
            navigator.vibrate(25);
            break;
          case 'heavy':
            navigator.vibrate(50);
            break;
          case 'levelUp':
            navigator.vibrate([15, 30, 25, 30, 40]);
            break;
          case 'evolution':
            navigator.vibrate([30, 30, 50, 40, 100]);
            break;
          case 'boss':
            navigator.vibrate([50, 30, 50, 30, 80]);
            break;
          case 'chest':
            navigator.vibrate([20, 20, 20, 20, 40, 20, 60]);
            break;
          case 'success':
            navigator.vibrate([20, 40, 40]);
            break;
          case 'warning':
            navigator.vibrate([40, 30, 40]);
            break;
          case 'error':
            navigator.vibrate([60, 40, 80]);
            break;
        }
      } catch {
        // Ignored
      }
    }
  }

  // Convenient shorthand methods
  public fire(): void {
    this.trigger('fire');
  }

  public hit(): void {
    this.trigger('hit');
  }

  public levelUp(): void {
    this.trigger('levelUp');
  }

  public evolution(): void {
    this.trigger('evolution');
  }

  public boss(): void {
    this.trigger('boss');
  }

  public chest(): void {
    this.trigger('chest');
  }
}

export const nativeHaptics = new NativeHapticsBridge();
