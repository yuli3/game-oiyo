// Browser side of src/components/games/UnityMainShell.astro.
// Messages come from the Unity build's iframe:
//   public/prototypes/unity-frame-bridge.js -> oiyo:unity-progress | oiyo:unity-ready | oiyo:unity-error
//   game code (jslib)                        -> oiyo:game-result (see prototype-result-bridge.ts)
import { getBestForConditions, getRecord, recordAchievementEvent, recordBestForConditions, recordResult, type BestConditions } from "./records";
import { parsePrototypeResult, type PrototypeResult } from "./prototype-result-bridge";

// Unity editions score differently from the React quick-play game on the same page,
// so their bests live in their own cohort and never overwrite the quick-play best.
export const UNITY_BEST_CONDITIONS: BestConditions = { seed: "unity-3d", difficulty: "standard", assist: "none" };

/** Saves a Unity run: win/loss/draw to the page's record, score to the Unity cohort. Returns the previous Unity best. */
export function saveUnityResult(result: PrototypeResult): number {
  const previous = getBestForConditions(result.slug, UNITY_BEST_CONDITIONS)?.value ?? 0;
  recordAchievementEvent(result.slug, "played");
  recordResult(result.slug, result.outcome);
  if (result.score) recordBestForConditions(result.slug, result.score, "score", UNITY_BEST_CONDITIONS);
  return previous;
}

export type ShellLabels = Record<
  | "play" | "replay" | "fullscreen" | "exit" | "best" | "plays" | "win" | "loss" | "draw"
  | "score" | "newBest" | "share" | "copied",
  string
>;

export type ShellMessage =
  | { kind: "progress"; value: number }
  | { kind: "ready" }
  | { kind: "error"; message: string };

/** Reads a loader message from unity-frame-bridge.js. Anything else returns null. */
export function parseShellMessage(data: unknown): ShellMessage | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.type === "oiyo:unity-progress" && typeof d.value === "number" && Number.isFinite(d.value)) {
    return { kind: "progress", value: Math.max(0, Math.min(1, d.value)) };
  }
  if (d.type === "oiyo:unity-ready") return { kind: "ready" };
  if (d.type === "oiyo:unity-error") return { kind: "error", message: typeof d.message === "string" ? d.message.slice(0, 300) : "" };
  return null;
}

/**
 * Unity builds may name themselves by build folder (e.g. "suika-drop-unity") or by page
 * slug. Both count as this page's game; the result is always saved under the page slug.
 */
export function parseShellResult(data: unknown, slug: string, build: string): PrototypeResult | null {
  if (data && typeof data === "object" && (data as Record<string, unknown>).slug === build) {
    return parsePrototypeResult({ ...(data as Record<string, unknown>), slug }, slug);
  }
  return parsePrototypeResult(data, slug);
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

// The loader posts progress every ~120 ms while it downloads. With no message at all
// (a build without the bridge) the poster lifts shortly after the iframe loads, so
// Unity's own loading bar is not hidden behind it for long.
const NO_BRIDGE_MS = 4000;
// Progress that stops moving this long is treated as a failed load.
const STALL_MS = 45000;
const PHONE_QUERY = "(pointer: coarse) and (max-width: 900px)";

export function initUnityMainShell(shell: HTMLElement): void {
  if (shell.dataset.ready) return;
  shell.dataset.ready = "1";

  const slug = shell.dataset.unityMain ?? "";
  const build = shell.dataset.build ?? "";
  const name = shell.dataset.name ?? document.title;
  let ui: ShellLabels;
  try {
    ui = JSON.parse(shell.dataset.labels ?? "{}") as ShellLabels;
  } catch {
    return;
  }

  const q = <T extends Element = HTMLElement>(selector: string) => shell.querySelector<T & HTMLElement>(selector);
  const tabs = [...shell.querySelectorAll<HTMLElement>("[data-tab]")];
  const panels = [...shell.querySelectorAll<HTMLElement>("[data-panel]")];
  const frame = q("[data-frame]");
  const poster = q("[data-poster]");
  if (!frame || !poster) return;
  const posterImg = q("[data-poster-img]");
  const idleBox = q("[data-idle]");
  const progressBox = q("[data-progress-box]");
  const progressBar = q("[data-progress-bar]");
  const progressText = q("[data-progress-text]");
  const errorBox = q("[data-error-box]");
  const playLabel = q("[data-play-label]");
  const bestChip = q("[data-best]");
  const fsButton = q("[data-fullscreen]");
  const fsLabel = fsButton?.querySelector("span");
  const exitButton = q("[data-exit-fullscreen]");
  const resultBox = q("[data-result]");
  const resultTitle = q("[data-result-title]");
  const resultDetail = q("[data-result-detail]");
  const shareButton = q("[data-share]");
  const canFullscreen = Boolean(document.fullscreenEnabled && frame.requestFullscreen);
  const numberFormat = new Intl.NumberFormat(document.documentElement.lang || undefined);

  let iframe: HTMLIFrameElement | null = null;
  let startedAt = 0;
  let bridgeSeen = false;
  let lastProgressAt = 0;
  let ready = false;
  let noBridgeTimer = 0;
  let stallTimer = 0;
  let resultTimer = 0;
  let lastShare = "";

  const track = (event: string, extra: Record<string, unknown> = {}) => {
    try {
      (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.("event", event, { game_id: slug, locale: shell.dataset.locale, ...extra });
    } catch {
      /* analytics is optional */
    }
  };

  const formatBest = () => {
    const best = getBestForConditions(slug, UNITY_BEST_CONDITIONS);
    const record = getRecord(slug);
    const plays = record.w + record.l + record.d;
    const parts: string[] = [];
    if (best) parts.push(fill(ui.best, { v: fill(ui.score, { v: numberFormat.format(best.value) }) }));
    if (plays > 0) parts.push(fill(ui.plays, { n: numberFormat.format(plays) }));
    return { text: parts.join(" · "), played: plays > 0 || Boolean(best) };
  };
  const refreshPoster = () => {
    try {
      const { text, played } = formatBest();
      if (bestChip) {
        bestChip.textContent = text;
        bestChip.hidden = !text;
      }
      if (playLabel && played) playLabel.textContent = ui.replay;
    } catch {
      /* storage blocked: keep the plain poster */
    }
  };

  const setPhase = (phase: "idle" | "loading" | "error" | "playing") => {
    if (idleBox) idleBox.hidden = phase !== "idle";
    if (progressBox) progressBox.hidden = phase !== "loading";
    if (errorBox) errorBox.hidden = phase !== "error";
    poster.hidden = phase === "playing";
    if (posterImg) posterImg.toggleAttribute("data-loading", phase === "loading" || phase === "error");
  };
  const setProgress = (value: number) => {
    lastProgressAt = performance.now();
    if (progressBar) progressBar.style.transform = `scaleX(${value})`;
    if (progressText) progressText.textContent = `${Math.round(value * 100)}%`;
  };

  // Phones: real fullscreen where the browser allows it, otherwise a fixed frame that
  // covers the window (iPhone Safari has no element fullscreen).
  const isImmersive = () => frame.hasAttribute("data-immersive") || document.fullscreenElement === frame;
  const syncChrome = () => {
    const on = isImmersive();
    if (exitButton) exitButton.hidden = !on;
    if (fsLabel) fsLabel.textContent = on ? ui.exit : ui.fullscreen;
    fsButton?.setAttribute("aria-label", on ? ui.exit : ui.fullscreen);
  };
  const enterPseudo = () => {
    frame.setAttribute("data-immersive", "");
    document.documentElement.classList.add("overflow-hidden");
    syncChrome();
    window.dispatchEvent(new Event("resize"));
  };
  const enterImmersive = async () => {
    if (canFullscreen) {
      try {
        await frame.requestFullscreen({ navigationUI: "hide" });
        return;
      } catch {
        /* fall back to the fixed frame */
      }
    }
    enterPseudo();
  };
  const exitImmersive = () => {
    if (document.fullscreenElement === frame) void document.exitFullscreen().catch(() => undefined);
    if (frame.hasAttribute("data-immersive")) {
      frame.removeAttribute("data-immersive");
      document.documentElement.classList.remove("overflow-hidden");
      window.dispatchEvent(new Event("resize"));
    }
    syncChrome();
  };

  const clearTimers = () => {
    window.clearTimeout(noBridgeTimer);
    window.clearInterval(stallTimer);
  };
  const markReady = () => {
    if (ready) return;
    ready = true;
    clearTimers();
    setPhase("playing");
    iframe?.focus();
    track("unity_ready", { load_ms: Math.round(performance.now() - startedAt), bridge: bridgeSeen });
  };
  const fail = (reason: string) => {
    clearTimers();
    iframe?.remove();
    iframe = null;
    ready = false;
    exitImmersive();
    if (fsButton) fsButton.hidden = true;
    setPhase("error");
    track("unity_error", { reason: reason.slice(0, 100) });
  };

  const start = () => {
    if (iframe) return;
    ready = false;
    bridgeSeen = false;
    startedAt = performance.now();
    setProgress(0);
    setPhase("loading");
    hideResult();

    iframe = document.createElement("iframe");
    iframe.src = shell.dataset.src ?? "";
    iframe.title = name;
    iframe.allow = "fullscreen; autoplay";
    iframe.referrerPolicy = "same-origin";
    iframe.className = "absolute inset-0 z-10 size-full border-0 bg-secondary-foreground";
    frame.insertBefore(iframe, frame.firstChild);
    if (fsButton) fsButton.hidden = false;

    iframe.addEventListener("load", () => {
      noBridgeTimer = window.setTimeout(() => { if (!bridgeSeen) markReady(); }, NO_BRIDGE_MS);
    });
    stallTimer = window.setInterval(() => {
      if (!ready && performance.now() - lastProgressAt > STALL_MS) fail("stalled");
    }, 5000);

    if (window.matchMedia?.(PHONE_QUERY).matches) void enterImmersive();
    track("unity_play_start");
  };
  const stop = () => {
    clearTimers();
    exitImmersive();
    if (!iframe) return;
    iframe.remove();
    iframe = null;
    ready = false;
    if (fsButton) fsButton.hidden = true;
    hideResult();
    refreshPoster();
    setPhase("idle");
  };

  function hideResult() {
    window.clearTimeout(resultTimer);
    if (resultBox) resultBox.hidden = true;
  }
  const showResult = (result: PrototypeResult, previousBest: number) => {
    if (!resultBox || !resultTitle || !resultDetail) return;
    const title = result.outcome === "w" ? ui.win : result.outcome === "l" ? ui.loss : ui.draw;
    const lines: string[] = [];
    if (result.score) {
      lines.push(fill(ui.score, { v: numberFormat.format(result.score) }));
      if (result.score > previousBest) lines.push(ui.newBest);
    }
    resultTitle.textContent = title;
    resultDetail.textContent = lines.join(" · ");
    resultDetail.hidden = lines.length === 0;
    lastShare = result.score ? `${name} ${fill(ui.score, { v: numberFormat.format(result.score) })}` : `${name} ${title}`;
    resultBox.hidden = false;
    window.clearTimeout(resultTimer);
    resultTimer = window.setTimeout(hideResult, 8000);
  };

  window.addEventListener("message", (event) => {
    if (!iframe || event.source !== iframe.contentWindow || event.origin !== window.location.origin) return;
    const loader = parseShellMessage(event.data);
    if (loader) {
      bridgeSeen = true;
      if (loader.kind === "progress" && !ready) setProgress(loader.value);
      else if (loader.kind === "ready") markReady();
      else if (loader.kind === "error") fail(loader.message || "error");
      return;
    }
    const result = parseShellResult(event.data, slug, build);
    if (!result) return;
    let previousBest = Infinity;
    try {
      previousBest = saveUnityResult(result);
    } catch {
      /* storage blocked */
    }
    showResult(result, previousBest);
    track("unity_result", { outcome: result.outcome, score: result.score ?? 0 });
  });

  const select = (tabName: string) => {
    for (const tab of tabs) {
      const on = tab.dataset.tab === tabName;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    }
    for (const panel of panels) panel.hidden = panel.dataset.panel !== tabName;
    if (tabName !== "main") {
      stop();
      window.dispatchEvent(new Event("resize"));
    }
  };

  // Start on pointerdown as well as click: some pages insert content on the
  // first pointerdown, which moves the button before pointerup and drops the click.
  const playButton = q("[data-play]");
  playButton?.addEventListener("pointerdown", (e) => { if (e.button === 0) start(); });
  playButton?.addEventListener("click", start);
  q("[data-retry]")?.addEventListener("click", start);
  q("[data-try-quick]")?.addEventListener("click", () => {
    setPhase("idle");
    select("quick");
    q('[data-tab="quick"]')?.focus();
  });
  q("[data-result-close]")?.addEventListener("click", hideResult);
  shareButton?.addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text: lastShare, url });
        return;
      }
      await navigator.clipboard.writeText(`${lastShare} ${url}`);
      shareButton.textContent = ui.copied;
      window.setTimeout(() => { shareButton.textContent = ui.share; }, 2000);
    } catch {
      /* share sheet dismissed */
    }
  });

  for (const tab of tabs) {
    tab.addEventListener("click", () => select(tab.dataset.tab ?? "main"));
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = tabs[(tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      select(next.dataset.tab ?? "main");
    });
  }
  fsButton?.addEventListener("click", () => {
    if (isImmersive()) exitImmersive();
    else void enterImmersive();
  });
  exitButton?.addEventListener("click", exitImmersive);
  document.addEventListener("fullscreenchange", syncChrome);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && frame.hasAttribute("data-immersive")) exitImmersive();
  });

  refreshPoster();
  const params = new URLSearchParams(location.search);
  if (params.get("play") === "quick" || location.hash === "#quick") select("quick");
}
