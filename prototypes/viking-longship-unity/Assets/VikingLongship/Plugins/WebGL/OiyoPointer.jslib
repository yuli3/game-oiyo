// Pointer input for the OIYO arcade builds (see OiyoArcade.cs). Inside the game.oiyo.net page's
// iframe the Unity player sometimes missed a touch's release, so a finger stayed "down" until the
// next tap (2026-11-23). Pointer events on the canvas arrive reliably, so the game reads them here:
// phase 0 down, 1 move, 2 up; x/y in canvas pixels with y measured from the bottom like Unity.
mergeInto(LibraryManager.library, {
  OiyoPointerInit: function () {
    if (window.__oiyoPointer) return;
    var canvas = (typeof Module !== "undefined" && Module.canvas) || document.getElementById("unity-canvas");
    if (!canvas) return;
    var st = window.__oiyoPointer = { events: [], down: {} };
    function push(phase, e) {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var x = (e.clientX - r.left) * (canvas.width / r.width);
      var y = canvas.height - (e.clientY - r.top) * (canvas.height / r.height);
      st.events.push(phase, e.pointerId, x, y);
      if (st.events.length > 4096) st.events.splice(0, st.events.length - 4096);
    }
    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      st.down[e.pointerId] = 1;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      push(0, e);
    }, true);
    canvas.addEventListener("pointermove", function (e) { if (st.down[e.pointerId]) push(1, e); }, true);
    function up(e) { if (!st.down[e.pointerId]) return; delete st.down[e.pointerId]; push(2, e); }
    canvas.addEventListener("pointerup", up, true);
    canvas.addEventListener("pointercancel", up, true);
    canvas.addEventListener("lostpointercapture", up, true);
    window.addEventListener("blur", function () {
      for (var id in st.down) { delete st.down[id]; st.events.push(2, +id, -1, -1); }
    });
  },
  // Copies up to maxEvents queued events (4 floats each) into buf and returns how many.
  OiyoPointerDrain: function (buf, maxEvents) {
    var st = window.__oiyoPointer;
    if (!st || !st.events.length) return 0;
    var n = Math.min(st.events.length / 4, maxEvents);
    var base = buf >> 2;
    for (var i = 0; i < n * 4; i++) HEAPF32[base + i] = st.events[i];
    st.events.splice(0, n * 4);
    return n;
  }
});
