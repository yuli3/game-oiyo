// Tells the game.oiyo.net page around this iframe how a run ended, so the shared
// records (achievements, recent runs, XP) count prototype games too.
// Message shape is checked by src/lib/games/prototype-result-bridge.ts.
export function reportResult(slug, outcome, score) {
  try {
    if (window.parent === window) return;
    const message = { type: "oiyo:game-result", slug, outcome };
    if (Number.isFinite(score) && score > 0) message.score = Math.round(score);
    window.parent.postMessage(message, window.location.origin);
  } catch {}
}

// Reports once each time the phase changes into an ending. The first phase seen is
// skipped, so reloading a page that restored a finished run does not count it twice.
export function phaseReporter(slug, endings) {
  let seen = false;
  let last;
  return (phase, score) => {
    if (!seen) { seen = true; last = phase; return; }
    if (phase === last) return;
    last = phase;
    const outcome = endings[phase];
    if (outcome) reportResult(slug, outcome, typeof score === "function" ? score() : score);
  };
}
