import { describe, expect, it } from "vitest";
import { isSameOriginWrite } from "./same-origin";

const req = (url: string, origin?: string) => new Request(url, { method: "POST", headers: origin ? { Origin: origin } : {} });

describe("isSameOriginWrite", () => {
  it("accepts the page's own origin (custom domain and pages.dev preview)", () => {
    expect(isSameOriginWrite(req("https://game.oiyo.net/api/tier-vote", "https://game.oiyo.net"))).toBe(true);
    expect(isSameOriginWrite(req("https://abc.game-oiyo.pages.dev/api/share", "https://abc.game-oiyo.pages.dev"))).toBe(true);
  });
  it("refuses a missing or foreign Origin", () => {
    expect(isSameOriginWrite(req("https://game.oiyo.net/api/tier-vote"))).toBe(false);
    expect(isSameOriginWrite(req("https://game.oiyo.net/api/tier-vote", "https://evil.example"))).toBe(false);
    expect(isSameOriginWrite(req("https://game.oiyo.net/api/tier-vote", "https://game.oiyo.net.evil.example"))).toBe(false);
  });
});
