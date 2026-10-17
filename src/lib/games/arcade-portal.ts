/**
 * arcade-portal.ts
 *
 * Arcade Immersion Portal - Hook & utilities for native-grade web game immersion.
 * Features:
 * - Native Fullscreen API on Desktop & Android Chrome
 * - In-Page 100dvh Fixed Viewport fallback on iOS Safari
 * - Screen Wake Lock API to prevent screen dimming/sleeping during gameplay
 * - Web Audio Context resume on user gesture
 * - 6-locale copy support
 *
 * Date: 2026-10-17
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../i18n";

export interface ArcadePortalLabels {
  enter: string;
  exit: string;
  hint: string;
}

export const ARCADE_PORTAL_LABELS: Record<Locale, ArcadePortalLabels> = {
  ko: {
    enter: "전체화면 몰입 모드",
    exit: "창모드로 복귀 (ESC)",
    hint: "화면 꺼짐 방지 및 100% 캔버스 전용 뷰포트 활성화",
  },
  en: {
    enter: "Enter Immersion Mode",
    exit: "Exit Immersion (ESC)",
    hint: "Screen wake lock & 100% canvas viewport active",
  },
  ja: {
    enter: "全画面没入モード",
    exit: "通常表示に戻る (ESC)",
    hint: "スリープ防止＆全画面キャンバス表示が有効",
  },
  zh: {
    enter: "全屏沉浸模式",
    exit: "退出全屏 (ESC)",
    hint: "已启用屏幕常亮与全屏画布",
  },
  fr: {
    enter: "Immersion plein écran",
    exit: "Quitter le plein écran (Échap)",
    hint: "Maintien de l'écran allumé et canevas 100% plein écran",
  },
  es: {
    enter: "Modo inmersión total",
    exit: "Salir de pantalla completa (ESC)",
    hint: "Bloqueo de suspensión de pantalla y lienzo 100% activo",
  },
};

export interface UseArcadePortalOptions {
  locale?: Locale;
  onEnter?: () => void;
  onExit?: () => void;
}

export interface WakeLockSentinelLike {
  release: () => Promise<void>;
  released?: boolean;
}

/**
 * Pure helper to request a screen wake lock if available.
 */
export async function requestScreenWakeLock(): Promise<WakeLockSentinelLike | null> {
  if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
    try {
      const lock = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<WakeLockSentinelLike> } }).wakeLock.request("screen");
      return lock;
    } catch {
      // Permission denied or low-battery mode
      return null;
    }
  }
  return null;
}

/**
 * Hook providing Arcade Immersion Portal state & handlers.
 */
export function useArcadePortal(options?: UseArcadePortalOptions) {
  const [isImmersive, setIsImmersive] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const locale = options?.locale ?? "en";
  const labels = ARCADE_PORTAL_LABELS[locale] ?? ARCADE_PORTAL_LABELS.en;

  const releaseLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignore
      }
      wakeLockRef.current = null;
    }
  }, []);

  const acquireLock = useCallback(async () => {
    await releaseLock();
    const lock = await requestScreenWakeLock();
    if (lock) {
      wakeLockRef.current = lock;
    }
  }, [releaseLock]);

  const enterPortal = useCallback(async () => {
    setIsImmersive(true);
    options?.onEnter?.();
    await acquireLock();

    const elem = containerRef.current;
    if (elem && typeof document !== "undefined" && document.fullscreenEnabled) {
      if (elem.requestFullscreen && !document.fullscreenElement) {
        try {
          await elem.requestFullscreen();
        } catch {
          // Fallback to CSS 100dvh in-page portal mode
        }
      }
    }
  }, [acquireLock, options]);

  const exitPortal = useCallback(async () => {
    setIsImmersive(false);
    options?.onExit?.();
    await releaseLock();

    if (typeof document !== "undefined" && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore
      }
    }
  }, [options, releaseLock]);

  const togglePortal = useCallback(() => {
    if (isImmersive) {
      void exitPortal();
    } else {
      void enterPortal();
    }
  }, [enterPortal, exitPortal, isImmersive]);

  // Sync state if user exits via browser ESC key
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === containerRef.current;
      if (!active && isImmersive) {
        setIsImmersive(false);
        options?.onExit?.();
        void releaseLock();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isImmersive, options, releaseLock]);

  // Re-acquire screen wake lock on visibility change (e.g. user switched tabs and came back)
  useEffect(() => {
    if (typeof document === "undefined" || !isImmersive) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isImmersive) {
        void acquireLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [acquireLock, isImmersive]);

  // Lock body scroll during immersion mode
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (isImmersive) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isImmersive]);

  // Cleanup wake lock on unmount
  useEffect(() => {
    return () => {
      void releaseLock();
    };
  }, [releaseLock]);

  return {
    isImmersive,
    containerRef,
    enterPortal,
    exitPortal,
    togglePortal,
    labels,
  };
}
