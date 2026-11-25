# OpenGame Game Jam #1 entries (2026-11-18 ~ 2026-12-18 PT)

Standalone browser games made during the jam for CHOSEUN's entries.
They do not import anything from the OIYO site code (jam rule: no code from earlier games).

- `lantern/` — INKLIGHT (먹빛 등불): ink-wash 3D roguelite. Static files, open `index.html` via any static server.
- `ssireum/` — SANDPIT KINGS (씨름): physics ssireum wrestling. Village tournament of 5 rivals or 2 players on one keyboard. Rules live in `ssireum/src/sim.js`; `node ssireum/tools/balance.mjs` checks difficulty.

Run locally: `cd jam/opengame-2026/lantern && python3 -m http.server 8765` then open http://localhost:8765/

Third-party: three.js r187 (MIT) vendored in each game's `vendor/` with its license.

Artifact preview: `python3 tools/artifact.py <game> <outdir>`.
