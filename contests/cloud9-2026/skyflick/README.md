# SKYFLICK

A 60-second flick-and-reaction mini game built for esports booths and fan events.
Cloud9 x JetBrains "Sky's The Limit" Hackathon 2026, **Category 3: Event Mini Game**.

**Play:** open `index.html` (double-click works, no server, no network). Put `board.html` on a second monitor for a live leaderboard.

## Why it works at a booth

| Booth need | SKYFLICK |
|---|---|
| Under 3 minutes | 3 s countdown + 60 s round + 10 s results. A queue of 10 players clears in under 15 minutes. |
| No tutorial | One rule on screen: hit the glowing orbs, avoid storm clouds. Mouse, touch or pen, nothing else. |
| Fair competition | **Daily sky:** every player gets the exact same target pattern today (seeded by date), so the leaderboard measures skill, not luck. |
| Resets itself | Results, tag entry and leaderboard all time out back to the attract screen. A demo bot plays on the attract screen so the booth never looks dead. |
| Offline leaderboard | Top 10 in localStorage. `board.html` on a second screen updates live through BroadcastChannel, no Wi-Fi. |
| Readable from 3 m | Big type, high-contrast orbs, phase banners, scaled for 720p to 4K. |
| Holds up all day | Canvas 2D, no assets to load, 60 fps on integrated graphics, no memory growth between runs. |

## Gameplay

* **4 phases in 60 s:** WARM-UP (big, still orbs) → FLICK (smaller, moving, first storm clouds) → STORM (dark sky, more decoys) → OVERDRIVE ×2 (last 10 s, double points).
* **Score:** 100 per hit + up to 150 speed bonus. Combo ×1 to ×5 (every 5 hits). Gold "9" orbs ×2. Storm cloud −400 and combo reset. Missed clicks and expired orbs reset the combo.
* **Results:** score, rank (DRIZZLE → BREEZE → GALE → JETSTREAM → STRATOSPHERE → NINTH SKY), accuracy, average and fastest reaction, best combo. Top-10 scores enter a 3-letter tag.

## Operator keys

| Key | Action |
|---|---|
| F | Fullscreen |
| M | Mute |
| Esc | Back to attract screen |
| Shift+R twice within 2 s | Clear today's leaderboard |
| `?seed=123` | Fixed pattern (tournament mode) |
| `?mute` | Start muted |

## Files

```
index.html   game page
game.js      rendering, input, booth state machine, synth audio
logic.js     pure rules: phases, spawning, scoring, ranks, leaderboard (unit-tested)
board.html   second-screen live leaderboard
test/        node --test suite
```

## Test

```bash
npm test   # node --test test/logic-check.cjs
```

## License

MIT. All art is drawn in code and all sound is synthesised at runtime. No third-party assets, names or trademarks.
