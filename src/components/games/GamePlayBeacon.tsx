import { useEffect, useState } from "react";
import { recordAchievementEvent, recordOpened } from "@/lib/games/records";
import { STUDIO_ENGINE_VERSION, StudioEngineMonitor, type StudioEngineSnapshot } from "@/lib/games/studio-engine-runtime";

export default function GamePlayBeacon({ slug, prototype = false }: { slug: string; prototype?: boolean }) {
  const [gizmoVisible, setGizmoVisible] = useState(false);
  const [snapshot, setSnapshot] = useState<StudioEngineSnapshot | null>(null);

  useEffect(() => {
    if (slug) recordOpened(slug);

    // Attach Universal OIYO Web-Unity Engine v5.0 Runtime Monitor across all game pages
    const urlParams = new URLSearchParams(window.location.search);
    const initialGizmo = urlParams.get("gizmo") === "1";
    setGizmoVisible(initialGizmo);

    const monitor = new StudioEngineMonitor(slug, initialGizmo);
    document.documentElement.dataset.engineVersion = STUDIO_ENGINE_VERSION;
    document.documentElement.dataset.engineSlug = slug;

    let rafId = 0;
    let lastTime = performance.now();
    let frameTick = 0;

    const stepLoop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      monitor.recordFrameDelta(dt);
      frameTick += 1;

      if (frameTick % 30 === 0) {
        const snap = monitor.getSnapshot();
        document.documentElement.dataset.engineTier = snap.quality.tier;
        document.documentElement.dataset.engineDprCap = String(snap.quality.recommendedDprCap);
        (window as unknown as { __OIYO_ENGINE__?: StudioEngineSnapshot }).__OIYO_ENGINE__ = snap;
        if (monitor.gizmo.enabled) {
          setSnapshot(snap);
        }
      }
      rafId = window.requestAnimationFrame(stepLoop);
    };

    rafId = window.requestAnimationFrame(stepLoop);

    // Unity OnApplicationPause equivalent: track tab visibility transitions
    const onVisibilityChange = () => {
      const hidden = document.visibilityState === "hidden";
      monitor.setVisibilityPaused(hidden);
      document.documentElement.dataset.enginePaused = hidden ? "1" : "0";
    };

    // Toggle Studio Gizmo HUD via Alt+Shift+G
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === "G" || e.key === "g")) {
        e.preventDefault();
        monitor.gizmo.enabled = !monitor.gizmo.enabled;
        setGizmoVisible(monitor.gizmo.enabled);
        setSnapshot(monitor.getSnapshot());
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("keydown", onKeyDown);

    if (!slug || !prototype) {
      return () => {
        window.cancelAnimationFrame(rafId);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("keydown", onKeyDown);
      };
    }

    const iframe = document.querySelector<HTMLIFrameElement>(`[data-release-shell="${CSS.escape(slug)}"] iframe`);
    if (!iframe) {
      return () => {
        window.cancelAnimationFrame(rafId);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("keydown", onKeyDown);
      };
    }

    let played = false;
    const markPlayed = () => {
      if (played) return;
      played = true;
      recordAchievementEvent(slug, "played");
    };
    const detach = () => {
      try {
        iframe.contentWindow?.removeEventListener("pointerdown", markPlayed);
        iframe.contentWindow?.removeEventListener("keydown", markPlayed);
      } catch {}
    };
    const attach = () => {
      detach();
      try {
        iframe.contentWindow?.addEventListener("pointerdown", markPlayed, { once: true });
        iframe.contentWindow?.addEventListener("keydown", markPlayed, { once: true });
      } catch {}
    };

    iframe.addEventListener("load", attach);
    attach();
    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("keydown", onKeyDown);
      iframe.removeEventListener("load", attach);
      detach();
    };
  }, [prototype, slug]);

  if (!gizmoVisible || !snapshot) return null;

  return (
    <div
      data-testid="studio-engine-gizmo-hud"
      className="fixed bottom-4 right-4 z-50 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur"
    >
      <div className="flex items-center gap-2 font-mono font-bold">
        <span className="text-primary">OIYO Engine v{snapshot.version}</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs uppercase text-secondary-foreground">
          {snapshot.quality.tier}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-3 font-mono text-xs text-muted-foreground">
        <span>{snapshot.telemetry.fps} FPS</span>
        <span>p95: {snapshot.quality.p95FrameMs}ms</span>
        <span>DPR≤{snapshot.quality.recommendedDprCap}</span>
      </div>
    </div>
  );
}
