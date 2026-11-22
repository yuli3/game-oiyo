// Loaded in the <head> of every Unity WebGL build (public/prototypes/*-unity/index.html).
// When the build runs inside the game.oiyo.net page (UnityMainShell), it reports load
// progress, readiness and load errors to the page, so the page can show its own loading
// screen and a retry button instead of Unity's bar and a browser alert().
// Standalone (opened directly) it does nothing. Inserted by scripts/unity/patch-unity-index.mjs.
(function () {
  if (window.parent === window) return;
  var post = function (message) {
    try { window.parent.postMessage(message, window.location.origin); } catch (e) {}
  };
  window.alert = function (message) {
    post({ type: "oiyo:unity-error", message: String(message).slice(0, 300) });
  };
  var style = document.createElement("style");
  style.textContent = "#unity-loading-bar{visibility:hidden!important}";
  document.head.appendChild(style);
  var last = -1;
  var tick = function () {
    var bar = document.getElementById("unity-loading-bar");
    var full = document.getElementById("unity-progress-bar-full");
    if (bar && full) {
      var value = Math.max(0, Math.min(1, (parseFloat(full.style.width) || 0) / 100));
      if (value !== last) { last = value; post({ type: "oiyo:unity-progress", value: value }); }
      if (bar.style.display === "none") { post({ type: "oiyo:unity-ready" }); return; }
    }
    setTimeout(tick, 120);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tick);
  else tick();
})();
