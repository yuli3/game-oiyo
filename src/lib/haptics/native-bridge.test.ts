import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NativeHapticsBridge } from './native-bridge';

describe('NativeHapticsBridge', () => {
  let bridge: NativeHapticsBridge;

  beforeEach(() => {
    bridge = new NativeHapticsBridge();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).window;
    delete (globalThis as any).navigator;
  });

  it('safely handles SSR environment where window is undefined', () => {
    expect(bridge.checkCapacitor()).toBe(false);
    expect(() => bridge.trigger('light')).not.toThrow();
    expect(() => bridge.fire()).not.toThrow();
  });

  it('routes to Capacitor Haptics when running on native platform', () => {
    const impactMock = vi.fn().mockResolvedValue(undefined);
    const notificationMock = vi.fn().mockResolvedValue(undefined);
    const vibrateMock = vi.fn().mockResolvedValue(undefined);

    (globalThis as any).window = {
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          Haptics: {
            impact: impactMock,
            notification: notificationMock,
            vibrate: vibrateMock,
          },
        },
      },
    };

    expect(bridge.checkCapacitor()).toBe(true);
    expect(bridge.isNative()).toBe(true);

    // Light impact
    bridge.trigger('light');
    expect(impactMock).toHaveBeenCalledWith({ style: 'LIGHT' });

    // Medium impact via hit
    bridge.hit();
    expect(impactMock).toHaveBeenCalledWith({ style: 'MEDIUM' });

    // Heavy impact via boss
    bridge.boss();
    expect(impactMock).toHaveBeenCalledWith({ style: 'HEAVY' });

    // Success notification via levelUp
    bridge.levelUp();
    expect(notificationMock).toHaveBeenCalledWith({ type: 'SUCCESS' });

    // Warning notification
    bridge.trigger('warning');
    expect(notificationMock).toHaveBeenCalledWith({ type: 'WARNING' });

    // Error notification
    bridge.trigger('error');
    expect(notificationMock).toHaveBeenCalledWith({ type: 'ERROR' });

    // Chest vibrate
    bridge.chest();
    expect(vibrateMock).toHaveBeenCalledWith({ duration: 150 });
  });

  it('falls back to Web Vibration API when Capacitor is absent', () => {
    const vibrateMock = vi.fn().mockReturnValue(true);

    (globalThis as any).window = {};
    (globalThis as any).navigator = {
      vibrate: vibrateMock,
    };

    expect(bridge.checkCapacitor()).toBe(false);
    expect(bridge.checkVibration()).toBe(true);
    expect(bridge.isAvailable()).toBe(true);

    bridge.fire();
    expect(vibrateMock).toHaveBeenCalledWith(6);

    bridge.hit();
    expect(vibrateMock).toHaveBeenCalledWith(35);

    bridge.trigger('heavy');
    expect(vibrateMock).toHaveBeenCalledWith(50);

    bridge.levelUp();
    expect(vibrateMock).toHaveBeenCalledWith([15, 30, 25, 30, 40]);

    bridge.trigger('error');
    expect(vibrateMock).toHaveBeenCalledWith([60, 40, 80]);
  });

  it('gracefully ignores errors when navigator.vibrate throws', () => {
    (globalThis as any).window = {};
    (globalThis as any).navigator = {
      vibrate: vi.fn().mockImplementation(() => {
        throw new Error('NotAllowedError');
      }),
    };

    expect(() => bridge.trigger('medium')).not.toThrow();
  });
});
