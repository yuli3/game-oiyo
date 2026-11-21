import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBest } from "./records";
import { saveRunOnFinish } from "./use-run-record";

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("saveRunOnFinish", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("saves only on the false → true edge", () => {
    expect(saveRunOnFinish("g", false, false, 100)).toBe(false);
    expect(saveRunOnFinish("g", false, true, 120.4)).toBe(true);
    expect(saveRunOnFinish("g", true, true, 999)).toBe(false);
    expect(getBest("g")).toMatchObject({ value: 120, unit: "score" });
  });

  it("skips empty runs and keeps two decimals for times", () => {
    expect(saveRunOnFinish("t", false, true, 0, "seconds")).toBe(false);
    expect(saveRunOnFinish("t", false, true, 12.3456, "seconds")).toBe(true);
    expect(getBest("t")).toMatchObject({ value: 12.35, unit: "seconds" });
  });
});
