import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_SAVED, QUOTA_HEADROOM_BYTES, hasRoom, ownFiles, parseSaved, pickEvictions, unityBuildFiles, upsertSaved, type SavedUnity } from "./offline-unity";

const entry = (build: string, savedAt: number): SavedUnity => ({ build, slug: build.replace(/-unity$/, ""), name: build, page: `/ko/${build}/`, bytes: 1, savedAt });

describe("unity offline save", () => {
  it("lists every file each real build needs", () => {
    const builds = readdirSync("public/prototypes").filter((d) => d.endsWith("-unity"));
    expect(builds.length).toBeGreaterThan(30);
    for (const build of builds) {
      for (const file of unityBuildFiles(build)) {
        expect(() => readFileSync(`public${file}`), `${build}: ${file}`).not.toThrow();
      }
      // index.html must not reference anything outside the list (new assets need adding here).
      const html = readFileSync(`public/prototypes/${build}/index.html`, "utf8");
      const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => new URL(m[1], `https://x/prototypes/${build}/index.html`).pathname);
      for (const ref of refs) expect(unityBuildFiles(build), `${build} refs ${ref}`).toContain(ref);
    }
  });

  it("rejects paths that are not Unity builds", () => {
    expect(() => unityBuildFiles("../etc")).toThrow();
    expect(() => unityBuildFiles("chess")).toThrow();
  });

  it("keeps the shared frame bridge when one build is removed", () => {
    expect(ownFiles("neon-unity")).not.toContain("/prototypes/unity-frame-bridge.js");
    expect(ownFiles("neon-unity")).toContain("/prototypes/neon-unity/Build/WebGL.data.unityweb");
  });

  it("evicts the oldest builds beyond the limit, never the one being saved", () => {
    const saved = Array.from({ length: MAX_SAVED }, (_, i) => entry(`g${i}-unity`, i));
    expect(pickEvictions(saved, "new-unity").map((s) => s.build)).toEqual(["g0-unity"]);
    expect(pickEvictions(saved, "g0-unity")).toEqual([]);
    expect(pickEvictions(saved.slice(0, 2), "new-unity")).toEqual([]);
  });

  it("checks the quota with headroom", () => {
    expect(hasRoom(null, 10)).toBe(true);
    expect(hasRoom({ quota: 0 }, 10)).toBe(true);
    expect(hasRoom({ quota: QUOTA_HEADROOM_BYTES + 100, usage: 0 }, 100)).toBe(true);
    expect(hasRoom({ quota: QUOTA_HEADROOM_BYTES + 100, usage: 1 }, 100)).toBe(false);
  });

  it("parses the saved list defensively and upserts by build", () => {
    expect(parseSaved("nope")).toEqual([]);
    expect(parseSaved('[{"build":"../x","page":"/"}]')).toEqual([]);
    const list = upsertSaved([entry("a-unity", 1), entry("b-unity", 2)], entry("a-unity", 3));
    expect(list.map((s) => [s.build, s.savedAt])).toEqual([["b-unity", 2], ["a-unity", 3]]);
  });
});
