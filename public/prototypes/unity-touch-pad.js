// On-screen touch controls for Unity WebGL builds whose core controls are keyboard only.
// Loaded by unity-frame-bridge.js. On a touch screen it draws a stick or buttons for the
// builds listed in LAYOUTS and turns presses into keyboard events on the Unity canvas,
// so a phone can play without a rebuild. Add ?pad=1 to the URL to show it with a mouse.
(function () {
  var KEYS = {
    ArrowLeft: [37, "ArrowLeft"], ArrowUp: [38, "ArrowUp"], ArrowRight: [39, "ArrowRight"], ArrowDown: [40, "ArrowDown"],
    Space: [32, " "], Enter: [13, "Enter"], Digit1: [49, "1"], Digit2: [50, "2"], Digit3: [51, "3"], KeyT: [84, "t"]
  };
  // stick: 8-way stick holding arrow keys. arrows: left/right hold buttons. dpad: 4 buttons.
  // buttons: [label, code, aria] on the right side. pinball: two big flipper halves + plunger.
  var LAYOUTS = {
    "neon-unity": { left: "stick", buttons: [["\u26a1", "Space", "Dash"], ["\u25b6", "Enter", "Start"]], top: [["1", "Digit1"], ["2", "Digit2"], ["3", "Digit3"]] },
    "cozy-glider-unity": { left: "stick", buttons: [] },
    "dot-dungeon-rogue-unity": { left: "dpad", buttons: [["\u23f3", "Space", "Wait"]] },
    "darkest-torch-unity": { left: "arrows", buttons: [["\u270b", "Space", "Loot chest"], ["\ud83d\udd25", "KeyT", "Light torch"]] },
    "space-pinball-unity": { left: "pinball", buttons: [] }
  };

  var match = /\/prototypes\/([^/]+)\//.exec(window.location.pathname);
  var layout = match && LAYOUTS[match[1]];
  if (!layout) return;
  var forced = /[?&]pad=1\b/.test(window.location.search);
  var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if (!forced && !coarse && !("ontouchstart" in window)) return;

  var held = {};
  function send(type, code) {
    var canvas = document.getElementById("unity-canvas") || document.body;
    var k = KEYS[code];
    var ev = new KeyboardEvent(type, { key: k[1], code: code, bubbles: true, cancelable: true });
    Object.defineProperty(ev, "keyCode", { get: function () { return k[0]; } });
    Object.defineProperty(ev, "which", { get: function () { return k[0]; } });
    canvas.dispatchEvent(ev);
  }
  function press(code) { held[code] = (held[code] || 0) + 1; if (held[code] === 1) send("keydown", code); }
  function release(code) { if (!held[code]) return; held[code] -= 1; if (held[code] === 0) send("keyup", code); }

  var css = ".oiyo-pad{position:fixed;z-index:50;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}" +
    ".oiyo-pad button{all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;" +
    "background:rgba(255,255,255,.16);border:2px solid rgba(255,255,255,.35);color:#fff;font:600 24px/1 system-ui,sans-serif;touch-action:none}" +
    ".oiyo-pad button[data-on]{background:rgba(255,255,255,.4)}" +
    ".oiyo-pad-l{left:max(16px,env(safe-area-inset-left));bottom:max(20px,env(safe-area-inset-bottom))}" +
    ".oiyo-pad-r{right:max(16px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));display:flex;flex-direction:column-reverse;gap:14px}" +
    ".oiyo-pad-t{right:max(16px,env(safe-area-inset-right));top:max(64px,env(safe-area-inset-top));display:flex;gap:10px}" +
    ".oiyo-pad-t button{width:48px;height:48px;font-size:20px}" +
    ".oiyo-stick{width:136px;height:136px;border-radius:50%;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.3);position:relative}" +
    ".oiyo-knob{position:absolute;left:44px;top:44px;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.45);pointer-events:none}" +
    ".oiyo-row{display:flex;gap:14px}.oiyo-dpad{display:grid;grid-template-columns:repeat(3,58px);grid-template-rows:repeat(3,58px);gap:4px}" +
    ".oiyo-dpad button{width:58px;height:58px;border-radius:14px;font-size:22px}" +
    ".oiyo-flip{position:fixed;z-index:50;bottom:0;height:42%;width:42%;touch-action:none;display:flex;align-items:flex-end;padding:20px;box-sizing:border-box;color:rgba(255,255,255,.55);font:600 28px system-ui}" +
    ".oiyo-flip[data-on]{background:rgba(255,255,255,.08)}";

  function hold(el, code) {
    el.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      if (el.dataset.on) return;
      el.dataset.on = "1";
      press(code);
    });
    var up = function () { if (!el.dataset.on) return; delete el.dataset.on; release(code); };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }
  function button(label, code, aria) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-label", aria || label);
    hold(b, code);
    return b;
  }
  function stick() {
    var base = document.createElement("div");
    base.className = "oiyo-stick";
    base.setAttribute("aria-label", "Move");
    var knob = document.createElement("div");
    knob.className = "oiyo-knob";
    base.appendChild(knob);
    var on = {}, id = null;
    function set(next) {
      ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].forEach(function (c) {
        if (next[c] && !on[c]) press(c);
        if (!next[c] && on[c]) release(c);
      });
      on = next;
    }
    function move(e) {
      var r = base.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      var len = Math.sqrt(dx * dx + dy * dy), max = r.width / 2 - 24;
      var s = len > max ? max / len : 1;
      knob.style.transform = "translate(" + dx * s + "px," + dy * s + "px)";
      var next = {};
      if (len > 16) {
        var a = Math.atan2(dy, dx) * 180 / Math.PI; // 0 = right, 90 = down
        if (a > -67.5 && a < 67.5) next.ArrowRight = true;
        if (a > 112.5 || a < -112.5) next.ArrowLeft = true;
        if (a > 22.5 && a < 157.5) next.ArrowDown = true;
        if (a < -22.5 && a > -157.5) next.ArrowUp = true;
      }
      set(next);
    }
    base.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      id = e.pointerId;
      try { base.setPointerCapture(id); } catch (err) {}
      move(e);
    });
    base.addEventListener("pointermove", function (e) { if (e.pointerId === id) move(e); });
    var end = function (e) { if (e.pointerId !== id) return; id = null; knob.style.transform = ""; set({}); };
    base.addEventListener("pointerup", end);
    base.addEventListener("pointercancel", end);
    return base;
  }
  function dpad() {
    var g = document.createElement("div");
    g.className = "oiyo-dpad";
    var cells = [null, ["\u25b2", "ArrowUp", "Up"], null, ["\u25c0", "ArrowLeft", "Left"], null, ["\u25b6", "ArrowRight", "Right"], null, ["\u25bc", "ArrowDown", "Down"], null];
    cells.forEach(function (c) { g.appendChild(c ? button(c[0], c[1], c[2]) : document.createElement("span")); });
    return g;
  }

  function mount() {
    if (document.querySelector(".oiyo-pad, .oiyo-flip")) return;
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    if (layout.left === "pinball") {
      [["left", "ArrowLeft", "\u25c0"], ["right", "ArrowRight", "\u25b6"]].forEach(function (side) {
        var z = document.createElement("div");
        z.className = "oiyo-flip";
        z.style[side[0]] = "0";
        if (side[0] === "right") z.style.justifyContent = "flex-end";
        z.textContent = side[2];
        z.setAttribute("aria-label", side[0] + " flipper");
        hold(z, side[1]);
        document.body.appendChild(z);
      });
      var plunger = document.createElement("div");
      plunger.className = "oiyo-pad";
      plunger.style.cssText = "left:50%;transform:translateX(-50%);bottom:max(20px,env(safe-area-inset-bottom))";
      plunger.appendChild(button("\u23ec", "Space", "Plunger"));
      document.body.appendChild(plunger);
      return;
    }
    var left = document.createElement("div");
    left.className = "oiyo-pad oiyo-pad-l";
    if (layout.left === "stick") left.appendChild(stick());
    else if (layout.left === "dpad") left.appendChild(dpad());
    else if (layout.left === "arrows") {
      var row = document.createElement("div");
      row.className = "oiyo-row";
      row.appendChild(button("\u25c0", "ArrowLeft", "Back"));
      row.appendChild(button("\u25b6", "ArrowRight", "Forward"));
      left.appendChild(row);
    }
    document.body.appendChild(left);
    if (layout.buttons.length) {
      var right = document.createElement("div");
      right.className = "oiyo-pad oiyo-pad-r";
      layout.buttons.forEach(function (b) { right.appendChild(button(b[0], b[1], b[2])); });
      document.body.appendChild(right);
    }
    if (layout.top) {
      var top = document.createElement("div");
      top.className = "oiyo-pad oiyo-pad-t";
      layout.top.forEach(function (b) { top.appendChild(button(b[0], b[1], "Choose " + b[0])); });
      document.body.appendChild(top);
    }
  }
  // Let go of everything when the tab hides, so no key stays stuck down.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) return;
    Object.keys(held).forEach(function (c) { if (held[c]) { held[c] = 1; release(c); } });
    Array.prototype.forEach.call(document.querySelectorAll("[data-on]"), function (el) { delete el.dataset.on; });
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
