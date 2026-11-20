import { describe, expect, it } from "vitest";
import { vibrationAllowed } from "./user-activation";

const nav = (extra: object) => ({ vibrate: () => true, ...extra }) as unknown as Navigator;

describe("vibrationAllowed", () => {
  it("waits for the first user gesture where the browser reports it", () => {
    expect(vibrationAllowed(nav({ userActivation: { hasBeenActive: false } }))).toBe(false);
    expect(vibrationAllowed(nav({ userActivation: { hasBeenActive: true } }))).toBe(true);
  });
  it("keeps working where UserActivation is missing, and off where vibrate is missing", () => {
    expect(vibrationAllowed(nav({}))).toBe(true);
    expect(vibrationAllowed({} as Navigator)).toBe(false);
    expect(vibrationAllowed(undefined)).toBe(false);
  });
});
