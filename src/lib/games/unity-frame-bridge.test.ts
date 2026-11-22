import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// UnityMainShell shows its own loading screen and retry button from the messages that
// public/prototypes/unity-frame-bridge.js sends. A rebuilt Unity build that lost the
// tag would leave the page stuck on its loading screen until the fallback timer.
const root = join(process.cwd(), "public/prototypes");
const builds = readdirSync(root).filter((dir) => dir.endsWith("-unity") && existsSync(join(root, dir, "index.html")));

describe("Unity WebGL builds load the page bridge", () => {
  it("finds the Unity builds", () => {
    expect(builds.length).toBeGreaterThanOrEqual(30);
  });
  it.each(builds)("%s/index.html has the bridge in <head> (run node scripts/unity/patch-unity-index.mjs)", (dir) => {
    const html = readFileSync(join(root, dir, "index.html"), "utf8");
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toContain('<script src="../unity-frame-bridge.js"></script>');
  });
});

// unity-touch-pad.js draws on-screen controls for keyboard-only builds. A renamed build
// folder would silently lose its pad.
describe("Unity touch pad layouts", () => {
  const pad = readFileSync(join(root, "unity-touch-pad.js"), "utf8");
  const names = [...pad.matchAll(/"([a-z0-9-]+-unity)":/g)].map((m) => m[1]);
  it("lists keyboard-only builds", () => {
    expect(names.length).toBeGreaterThanOrEqual(5);
  });
  it.each(names)("%s exists", (dir) => {
    expect(existsSync(join(root, dir, "index.html"))).toBe(true);
  });
  it("is loaded by the bridge", () => {
    expect(readFileSync(join(root, "unity-frame-bridge.js"), "utf8")).toContain("../unity-touch-pad.js");
  });
});
