// Browser side of the PWA: service worker registration, first-visit warm-up,
// the install offer (PwaInstall.astro) and launch/install analytics.
import { INSTALL_STATE_KEY, countVisit, isIosSafari, parseInstallState, shouldOfferInstall, warmUrls, type InstallState } from "./install";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const track = (event: string, extra: Record<string, unknown> = {}) => {
  try {
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.("event", event, extra);
  } catch {
    /* analytics is optional */
  }
};

const readState = (): InstallState => {
  try {
    return parseInstallState(localStorage.getItem(INSTALL_STATE_KEY));
  } catch {
    return { visits: 0 };
  }
};
const writeState = (state: InstallState) => {
  try {
    localStorage.setItem(INSTALL_STATE_KEY, JSON.stringify(state));
  } catch {
    /* storage blocked */
  }
};

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function registerWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  const controlledAtLoad = Boolean(navigator.serviceWorker.controller);
  const register = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        if (controlledAtLoad) return;
        // First visit: this page loaded before the worker existed, so hand it the
        // files already downloaded. Once now, once after lazy game chunks arrive.
        await navigator.serviceWorker.ready;
        const send = () => {
          const resources = performance.getEntriesByType("resource").map((e) => e.name);
          registration.active?.postMessage({ type: "oiyo:warm", urls: warmUrls(window.location.origin, window.location.href, resources) });
        };
        send();
        window.setTimeout(send, 15000);
      })
      .catch(() => undefined);
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

function initInstallOffer() {
  const root = document.querySelector<HTMLElement>("[data-pwa-install]");
  if (!root) return;
  const install = root.querySelector<HTMLButtonElement>("[data-pwa-install-button]");
  const close = root.querySelector<HTMLButtonElement>("[data-pwa-dismiss]");
  const iosHint = root.querySelector<HTMLElement>("[data-pwa-ios]");
  const footerButton = document.querySelector<HTMLButtonElement>("[data-pwa-footer-install]");
  const autoOffer = root.dataset.auto === "1";

  const day = new Date().toISOString().slice(0, 10);
  let state = countVisit(readState(), day);
  writeState(state);

  let deferred: InstallPromptEvent | null = null;
  const canOffer = () => shouldOfferInstall(state, Date.now(), isStandalone());
  const showCard = (ios: boolean) => {
    if (install) install.hidden = ios;
    if (iosHint) iosHint.hidden = !ios;
    root.hidden = false;
    track("pwa_install_offer", { platform: ios ? "ios" : "prompt" });
  };
  const hideCard = () => {
    root.hidden = true;
  };

  const prompt = async (source: string) => {
    if (!deferred) return;
    const event = deferred;
    deferred = null;
    await event.prompt();
    const { outcome } = await event.userChoice;
    track("pwa_install_choice", { outcome, source });
    if (outcome === "dismissed") {
      state = { ...state, dismissedAt: Date.now() };
      writeState(state);
    }
    hideCard();
    if (footerButton) footerButton.hidden = true;
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    if (footerButton) footerButton.hidden = false;
    if (autoOffer && canOffer()) window.setTimeout(() => showCard(false), 4000);
  });
  window.addEventListener("appinstalled", () => {
    state = { ...state, installed: true };
    writeState(state);
    hideCard();
    if (footerButton) footerButton.hidden = true;
    track("pwa_installed");
  });

  install?.addEventListener("click", () => void prompt("card"));
  footerButton?.addEventListener("click", () => void prompt("footer"));
  close?.addEventListener("click", () => {
    state = { ...state, dismissedAt: Date.now() };
    writeState(state);
    hideCard();
    track("pwa_install_dismiss");
  });

  if (autoOffer && canOffer() && isIosSafari(navigator.userAgent, navigator.maxTouchPoints)) {
    window.setTimeout(() => showCard(true), 4000);
  }
}

function trackLaunch() {
  if (!isStandalone()) return;
  try {
    if (sessionStorage.getItem("oiyo:pwa:launch")) return;
    sessionStorage.setItem("oiyo:pwa:launch", "1");
  } catch {
    /* ignore */
  }
  const state = readState();
  if (!state.installed) writeState({ ...state, installed: true });
  track("pwa_launch", { source: new URLSearchParams(window.location.search).get("source") ?? "standalone" });
}

export function initPwa() {
  registerWorker();
  initInstallOffer();
  trackLaunch();
}
