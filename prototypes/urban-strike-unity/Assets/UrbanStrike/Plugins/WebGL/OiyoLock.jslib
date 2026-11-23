// Mouse look for Urban Strike 3D. Unity's own Cursor.lockState asks for pointer lock in a way that
// throws when the browser refuses it (headless, a frame without focus), and the page treated that
// as a crash. Here the canvas asks for the lock itself on a left click, swallows a refusal, and
// collects the mouse movement while the lock is held. Read once per frame by UrbanStrikePlayer.
mergeInto(LibraryManager.library, {
  OiyoLockInit: function () {
    if (window.__oiyoLock) return;
    var canvas = (typeof Module !== "undefined" && Module.canvas) || document.getElementById("unity-canvas");
    if (!canvas) return;
    var st = window.__oiyoLock = { dx: 0, dy: 0, want: 0 };
    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0 || !st.want || document.pointerLockElement === canvas) return;
      try { var r = canvas.requestPointerLock(); if (r && r.catch) r.catch(function () {}); } catch (err) {}
    }, true);
    document.addEventListener("pointerlockerror", function () {});
    document.addEventListener("mousemove", function (e) {
      if (document.pointerLockElement === canvas) { st.dx += e.movementX || 0; st.dy += e.movementY || 0; }
    });
  },
  OiyoLockWant: function (want) {
    var st = window.__oiyoLock;
    if (!st) return;
    st.want = want;
    if (!want && document.pointerLockElement) { try { document.exitPointerLock(); } catch (err) {} }
  },
  // buf: 3 floats (dx, dy, locked)
  OiyoLockRead: function (buf) {
    var st = window.__oiyoLock, b = buf >> 2;
    var canvas = (typeof Module !== "undefined" && Module.canvas) || document.getElementById("unity-canvas");
    HEAPF32[b] = st ? st.dx : 0; HEAPF32[b + 1] = st ? st.dy : 0;
    HEAPF32[b + 2] = document.pointerLockElement && document.pointerLockElement === canvas ? 1 : 0;
    if (st) { st.dx = 0; st.dy = 0; }
  }
});
