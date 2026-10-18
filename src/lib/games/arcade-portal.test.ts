import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ARCADE_PORTAL_LABELS,
  requestScreenWakeLock,
} from "./arcade-portal";
import type { Locale } from "../i18n";

describe("arcade-portal", () => {
  const locales: Locale[] = ["ko", "en", "ja", "zh", "fr", "es"];

  it("provides comprehensive labels for all 6 supported locales", () => {
    for (const loc of locales) {
      const label = ARCADE_PORTAL_LABELS[loc];
      expect(label).toBeDefined();
      expect(label.enter.length).toBeGreaterThan(0);
      expect(label.exit.length).toBeGreaterThan(0);
      expect(label.hint.length).toBeGreaterThan(0);
      expect(label.mute.length).toBeGreaterThan(0);
      expect(label.unmute.length).toBeGreaterThan(0);
    }
  });

  describe("requestScreenWakeLock", () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    });

    it("returns null if wakeLock is not present in navigator", async () => {
      Object.defineProperty(globalThis, "navigator", {
        value: {},
        configurable: true,
        writable: true,
      });
      const lock = await requestScreenWakeLock();
      expect(lock).toBeNull();
    });

    it("returns sentinel when navigator.wakeLock.request resolves", async () => {
      const mockRelease = vi.fn().mockResolvedValue(undefined);
      const mockRequest = vi.fn().mockResolvedValue({ release: mockRelease });

      Object.defineProperty(globalThis, "navigator", {
        value: {
          wakeLock: { request: mockRequest },
        },
        configurable: true,
        writable: true,
      });

      const lock = await requestScreenWakeLock();
      expect(lock).not.toBeNull();
      expect(mockRequest).toHaveBeenCalledWith("screen");
    });

    it("returns null when navigator.wakeLock.request rejects (e.g. permission denied)", async () => {
      const mockRequest = vi.fn().mockRejectedValue(new Error("NotAllowedError"));

      Object.defineProperty(globalThis, "navigator", {
        value: {
          wakeLock: { request: mockRequest },
        },
        configurable: true,
        writable: true,
      });

      const lock = await requestScreenWakeLock();
      expect(lock).toBeNull();
    });
  });
});
