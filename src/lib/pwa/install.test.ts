import { describe, expect, it } from "vitest";
import { DISMISS_COOLDOWN_MS, countVisit, isIosSafari, parseInstallState, shouldOfferInstall, warmUrls } from "./install";
import { buildManifest } from "./manifest";
import { locales } from "../i18n";

describe("install offer", () => {
  it("parses broken or missing state as a first visit", () => {
    expect(parseInstallState(null)).toEqual({ visits: 0 });
    expect(parseInstallState("{oops")).toEqual({ visits: 0 });
    expect(parseInstallState('{"visits":-3}').visits).toBe(0);
  });

  it("counts one visit per day", () => {
    let s = parseInstallState(null);
    s = countVisit(s, "2026-11-22");
    s = countVisit(s, "2026-11-22");
    expect(s.visits).toBe(1);
    s = countVisit(s, "2026-11-23");
    expect(s.visits).toBe(2);
  });

  it("waits for a returning visitor and respects dismiss and install", () => {
    const now = Date.UTC(2026, 10, 22);
    expect(shouldOfferInstall({ visits: 1 }, now, false)).toBe(false);
    expect(shouldOfferInstall({ visits: 2 }, now, false)).toBe(true);
    expect(shouldOfferInstall({ visits: 5 }, now, true)).toBe(false);
    expect(shouldOfferInstall({ visits: 5, installed: true }, now, false)).toBe(false);
    expect(shouldOfferInstall({ visits: 5, dismissedAt: now - 1000 }, now, false)).toBe(false);
    expect(shouldOfferInstall({ visits: 5, dismissedAt: now - DISMISS_COOLDOWN_MS - 1 }, now, false)).toBe(true);
  });

  it("detects iOS Safari but not in-app browsers or Chrome on iOS", () => {
    const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
    expect(isIosSafari(safari)).toBe(true);
    expect(isIosSafari(safari.replace("Version/18.0", "CriOS/130.0"))).toBe(false);
    expect(isIosSafari(safari + " KAKAOTALK 10.0")).toBe(false);
    const ipadDesktop = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
    expect(isIosSafari(ipadDesktop, 5)).toBe(true);
    expect(isIosSafari(ipadDesktop, 0)).toBe(false);
  });

  it("warms same-origin resources only and never Unity builds", () => {
    const urls = warmUrls("https://game.oiyo.net", "https://game.oiyo.net/ko/chess/", [
      "https://game.oiyo.net/_astro/a.js",
      "https://pagead2.googlesyndication.com/x.js",
      "https://game.oiyo.net/prototypes/neon-unity/Build/WebGL.data.unityweb",
      "https://game.oiyo.net/api/tier-vote",
      "https://game.oiyo.net/_astro/a.js",
    ]);
    expect(urls).toEqual(["https://game.oiyo.net/ko/chess/", "https://game.oiyo.net/_astro/a.js"]);
  });
});

describe("manifest", () => {
  it("shares one app id across locales and is installable", () => {
    for (const locale of locales) {
      const m = buildManifest(locale);
      expect(m.id).toBe("/ko/");
      expect(m.start_url.startsWith(`/${locale}/`)).toBe(true);
      expect(m.display).toBe("standalone");
      expect(m.icons.some((i) => i.sizes === "512x512" && !("purpose" in i))).toBe(true);
      expect(m.icons.some((i) => "purpose" in i && i.purpose === "maskable")).toBe(true);
      expect(m.shortcuts.every((s) => s.url.startsWith(`/${locale}/`))).toBe(true);
    }
  });
});
