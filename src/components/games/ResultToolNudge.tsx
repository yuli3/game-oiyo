import { useEffect, useState } from "react";
import { RUN_RECORDED_EVENT } from "@/lib/games/records";
import { gameContextFromPath, sendPlayEvent } from "@/lib/games/play-telemetry";
import { pickResultTool, type ToolLink } from "@/lib/games/result-tool-link";

/**
 * One small tool card after a finished run (2026-11-23).
 *
 * Rules that keep it out of the way of play:
 * - at most once per browser session, and never in real fullscreen;
 * - it waits a moment so the game's own result and share buttons come first;
 * - it hides by itself, and the next press anywhere outside it hides it at once,
 *   so starting the next run is never blocked;
 * - the link opens in a new tab, so the run and the result stay on screen.
 * GA4: result_tool_shown / result_tool_click { game_id, locale, tool }.
 */

const SESSION_KEY = "oiyo:result-tool-shown";
const SHOW_DELAY_MS = 1500;
const AUTO_HIDE_MS = 10000;
const CLOSE_LABEL: Record<string, string> = { ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭", fr: "Fermer", es: "Cerrar" };

let installed = false;

function shownThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markShown(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Private mode: the card may show again on another page, which is acceptable.
  }
}

export default function ResultToolNudge() {
  const [tool, setTool] = useState<(ToolLink & { gameId: string; locale: string }) | null>(null);

  useEffect(() => {
    if (installed) return;
    installed = true;
    let timer = 0;
    const onRun = () => {
      if (timer || shownThisSession()) return;
      timer = window.setTimeout(() => {
        if (document.fullscreenElement || shownThisSession()) return;
        const { gameId, locale } = gameContextFromPath(location.pathname);
        const pick = pickResultTool(gameId, locale, new Date().getMonth() + 1);
        markShown();
        setTool({ ...pick, gameId, locale });
        sendPlayEvent("result_tool_shown", { game_id: gameId, locale, tool: pick.key });
      }, SHOW_DELAY_MS);
    };
    window.addEventListener(RUN_RECORDED_EVENT, onRun);
    return () => {
      installed = false;
      window.clearTimeout(timer);
      window.removeEventListener(RUN_RECORDED_EVENT, onRun);
    };
  }, []);

  useEffect(() => {
    if (!tool) return;
    const hide = window.setTimeout(() => setTool(null), AUTO_HIDE_MS);
    const onPress = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("[data-result-tool]")) return;
      setTool(null);
    };
    const onFullscreen = () => setTool(null);
    document.addEventListener("pointerdown", onPress, true);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.clearTimeout(hide);
      document.removeEventListener("pointerdown", onPress, true);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [tool]);

  if (!tool) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4" data-result-tool>
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl border border-border bg-card/95 p-2 pl-4 text-card-foreground shadow-2xl backdrop-blur-md">
        <a
          href={tool.href}
          target="_blank"
          rel="noopener"
          onClick={() => {
            sendPlayEvent("result_tool_click", { game_id: tool.gameId, locale: tool.locale, tool: tool.key });
            setTool(null);
          }}
          className="flex min-h-11 min-w-0 flex-1 flex-col justify-center"
        >
          <span className="text-xs text-muted-foreground">{tool.lead}</span>
          <span className="truncate text-sm font-bold text-primary">🧮 {tool.label} →</span>
        </a>
        <button
          type="button"
          aria-label={CLOSE_LABEL[tool.locale] ?? CLOSE_LABEL.en}
          onClick={() => setTool(null)}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
