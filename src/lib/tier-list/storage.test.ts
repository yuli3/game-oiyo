import { describe, expect, it } from "vitest";
import { readTierStorage, writeTierStorage } from "./storage";

describe("tier storage failure boundary", () => {
  it("preserves a newer record when the caller has an outdated revision", () => {
    const data = new Map([["board", "newer-tab-record"]]);
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(writeTierStorage(() => storage, "board", { title: "stale" }, "old-record")).toBe(false);
    expect(data.get("board")).toBe("newer-tab-record");
  });

  it("writes against the exact restored revision", () => {
    const data = new Map([["board", "restored-record"]]);
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(writeTierStorage(() => storage, "board", { title: "updated" }, "restored-record")).toBe(true);
    expect(data.get("board")).toBe('{"title":"updated"}');
  });

  it("does not overwrite a record created after an empty read", () => {
    const data = new Map([["board", "created-in-another-tab"]]);
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(writeTierStorage(() => storage, "board", {}, null)).toBe(false);
    expect(data.get("board")).toBe("created-in-another-tab");
  });

  it("distinguishes missing data from denied storage access", () => {
    const unavailable = () => { throw new Error("SecurityError"); };
    expect(readTierStorage(unavailable, "board")).toEqual({ ok: false });
    expect(writeTierStorage(unavailable, "board", {})).toBe(false);
    expect(readTierStorage(() => ({ getItem: () => null, setItem: () => {} }), "board")).toEqual({ ok: true, value: null });
  });

  it("reports quota failure and preserves existing saved data", () => {
    const data = new Map([["board", "old"]]);
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(writeTierStorage(() => storage, "board", { title: "new" })).toBe(false);
    expect(data.get("board")).toBe("old");
  });

  it("round-trips JSON under the existing key", () => {
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(writeTierStorage(() => storage, "board", { title: "My board" })).toBe(true);
    expect(readTierStorage(() => storage, "board")).toEqual({ ok: true, value: '{"title":"My board"}' });
  });
});
