// Pure rules for the "install the app" offer. DOM wiring lives in client.ts.

export const INSTALL_STATE_KEY = "oiyo:pwa:install";
export const DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
/** Offer only to people who came back at least once (first visit = no nagging). */
export const MIN_VISITS = 2;

export type InstallState = {
  visits: number;
  /** calendar day (YYYY-MM-DD) of the last counted visit, so reloads don't count */
  lastVisitDay?: string;
  dismissedAt?: number;
  installed?: boolean;
};

export function parseInstallState(raw: string | null): InstallState {
  if (!raw) return { visits: 0 };
  try {
    const value = JSON.parse(raw) as Partial<InstallState>;
    return {
      visits: Number.isFinite(value.visits) ? Math.max(0, Math.floor(Number(value.visits))) : 0,
      lastVisitDay: typeof value.lastVisitDay === "string" ? value.lastVisitDay : undefined,
      dismissedAt: Number.isFinite(value.dismissedAt) ? Number(value.dismissedAt) : undefined,
      installed: value.installed === true ? true : undefined,
    };
  } catch {
    return { visits: 0 };
  }
}

/** Count one visit per calendar day. */
export function countVisit(state: InstallState, day: string): InstallState {
  if (state.lastVisitDay === day) return state;
  return { ...state, visits: state.visits + 1, lastVisitDay: day };
}

export function shouldOfferInstall(state: InstallState, now: number, standalone: boolean): boolean {
  if (standalone || state.installed) return false;
  if (state.visits < MIN_VISITS) return false;
  if (state.dismissedAt !== undefined && now - state.dismissedAt < DISMISS_COOLDOWN_MS) return false;
  return true;
}

/** iPhone/iPad Safari has no install prompt; it needs the Share → Add to Home Screen hint. */
export function isIosSafari(userAgent: string, maxTouchPoints = 0): boolean {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  if (!ios) return false;
  return /Safari\//.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|KAKAOTALK|NAVER/.test(userAgent);
}

/** Same-origin resources worth handing to the service worker after a first visit. */
export function warmUrls(origin: string, pageUrl: string, resources: readonly string[], limit = 120): string[] {
  const out = new Set<string>();
  const add = (raw: string) => {
    try {
      const url = new URL(raw, origin);
      if (url.origin !== origin) return;
      if (url.pathname.startsWith("/api/") || /^\/prototypes\/[a-z0-9-]+-unity\//.test(url.pathname)) return;
      out.add(url.href);
    } catch {
      /* ignore */
    }
  };
  add(pageUrl);
  for (const r of resources) {
    if (out.size >= limit) break;
    add(r);
  }
  return [...out];
}
