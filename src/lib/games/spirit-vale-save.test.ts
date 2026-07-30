import { beforeEach, describe, expect, it } from "vitest";
import { SPIRITS } from "./spirit-vale";
import { addXp, clearSave, completion, loadSave, recordCatch, xpOf } from "./spirit-vale-save";

const KEY = "oiyo:spirit-vale:v1";

/** Minimal localStorage stand-in — the module only needs get/set. */
function installStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  return store;
}

beforeEach(() => installStorage());

describe("saving caught spirits", () => {
  it("starts empty", () => {
    expect(loadSave().caught).toEqual([]);
  });

  it("records a catch and reads it back", () => {
    recordCatch(SPIRITS[0].id);
    expect(loadSave().caught).toEqual([SPIRITS[0].id]);
  });

  it("treats a repeat catch as a no-op", () => {
    recordCatch(SPIRITS[0].id);
    recordCatch(SPIRITS[0].id);
    expect(loadSave().caught).toEqual([SPIRITS[0].id]);
  });

  it("keeps catches in the order they happened", () => {
    recordCatch(SPIRITS[2].id);
    recordCatch(SPIRITS[0].id);
    expect(loadSave().caught).toEqual([SPIRITS[2].id, SPIRITS[0].id]);
  });

  it("refuses ids that are not in the roster", () => {
    recordCatch("pikachu");
    expect(loadSave().caught).toEqual([]);
  });

  it("clears back to empty", () => {
    recordCatch(SPIRITS[1].id);
    clearSave();
    expect(loadSave().caught).toEqual([]);
  });
});

describe("surviving a corrupt or hand-edited store", () => {
  it("ignores malformed JSON", () => {
    installStorage({ [KEY]: "{not json" });
    expect(loadSave().caught).toEqual([]);
  });

  it("ignores a non-object payload", () => {
    installStorage({ [KEY]: '"a string"' });
    expect(loadSave().caught).toEqual([]);
  });

  it("ignores a caught field that is not an array", () => {
    installStorage({ [KEY]: JSON.stringify({ caught: "dewvin" }) });
    expect(loadSave().caught).toEqual([]);
  });

  it("drops unknown ids but keeps the real ones", () => {
    installStorage({ [KEY]: JSON.stringify({ caught: [SPIRITS[0].id, "charizard", 42, null] }) });
    expect(loadSave().caught).toEqual([SPIRITS[0].id]);
  });

  it("de-duplicates so the counter cannot exceed the roster", () => {
    const id = SPIRITS[0].id;
    installStorage({ [KEY]: JSON.stringify({ caught: [id, id, id] }) });
    const save = loadSave();
    expect(save.caught).toEqual([id]);
    expect(completion(save).caught).toBeLessThanOrEqual(completion(save).total);
  });
});

describe("experience", () => {
  it("starts every spirit at zero", () => {
    expect(xpOf(loadSave(), SPIRITS[0].id)).toBe(0);
  });

  it("accumulates across wins", () => {
    addXp(SPIRITS[0].id, 30);
    addXp(SPIRITS[0].id, 45);
    expect(xpOf(loadSave(), SPIRITS[0].id)).toBe(75);
  });

  it("keeps spirits' experience separate", () => {
    addXp(SPIRITS[0].id, 30);
    addXp(SPIRITS[1].id, 10);
    const save = loadSave();
    expect(xpOf(save, SPIRITS[0].id)).toBe(30);
    expect(xpOf(save, SPIRITS[1].id)).toBe(10);
  });

  it("refuses unknown ids and non-positive amounts", () => {
    addXp("charizard", 100);
    addXp(SPIRITS[0].id, 0);
    addXp(SPIRITS[0].id, -50);
    addXp(SPIRITS[0].id, Number.NaN);
    const save = loadSave();
    expect(save.xp).toEqual({});
  });

  it("does not disturb the caught list", () => {
    recordCatch(SPIRITS[0].id);
    addXp(SPIRITS[0].id, 20);
    expect(loadSave().caught).toEqual([SPIRITS[0].id]);
  });

  it("survives a save written before experience existed", () => {
    // The field was added after release; older saves simply lack it.
    installStorage({ [KEY]: JSON.stringify({ caught: [SPIRITS[0].id] }) });
    const save = loadSave();
    expect(save.caught).toEqual([SPIRITS[0].id]);
    expect(save.xp).toEqual({});
  });

  it("drops corrupt experience entries but keeps sound ones", () => {
    installStorage({
      [KEY]: JSON.stringify({
        caught: [],
        xp: { [SPIRITS[0].id]: 40, [SPIRITS[1].id]: -5, charizard: 900, [SPIRITS[2].id]: "lots" },
      }),
    });
    expect(loadSave().xp).toEqual({ [SPIRITS[0].id]: 40 });
  });
});

describe("completion", () => {
  it("counts against the full roster", () => {
    recordCatch(SPIRITS[0].id);
    expect(completion(loadSave())).toEqual({ caught: 1, total: SPIRITS.length });
  });

  it("reaches the total when everything is caught", () => {
    for (const s of SPIRITS) recordCatch(s.id);
    const done = completion(loadSave());
    expect(done.caught).toBe(done.total);
  });
});
