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
