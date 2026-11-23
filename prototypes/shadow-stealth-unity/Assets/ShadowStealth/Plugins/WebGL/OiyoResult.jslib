// Tells the OIYO page that embeds this build how a run ended (see OiyoResult.cs).
// Same-origin only: the message is posted to window.parent with this page's own origin.
mergeInto(LibraryManager.library, {
  OiyoPostResult: function (slugPtr, outcomePtr, score) {
    try {
      if (!window.parent || window.parent === window) return;
      window.parent.postMessage({
        type: "oiyo:game-result",
        slug: UTF8ToString(slugPtr),
        outcome: UTF8ToString(outcomePtr),
        score: score | 0
      }, window.location.origin);
    } catch (e) { /* never let reporting break the game */ }
  }
});
