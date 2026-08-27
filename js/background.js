/* ============================================================
   ADA — background: the Matrix, in Cardano blue (inverted)
   A bittensor.com-inspired moving structure: digital glyph
   rain (digits, ∆, λ and the ADA symbol ₳) — white on deep
   Cardano blue. Pure canvas 2D, zero dependencies, fully
   responsive, pauses when hidden, and honours
   prefers-reduced-motion with a single static frame.
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("ada-bg");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* inverted palette (rgb triplets for alpha blending) */
  const C_HEAD = "255, 255, 255";    // white leading glyph
  const C_MID = "213, 226, 255";    // #D5E2FF trail
  const C_DIM = "122, 152, 255";    // faintest trail

  /* deep-blue page gradient (the canvas IS the page background) */
  function baseGradient() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a35b0");
    g.addColorStop(0.55, "#04207c");
    g.addColorStop(1, "#021657");
    return g;
  }
  function fadeGradient() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(10, 53, 176, 0.10)");
    g.addColorStop(0.55, "rgba(4, 32, 124, 0.10)");
    g.addColorStop(1, "rgba(2, 22, 87, 0.10)");
    return g;
  }

  /* glyph alphabet: binary + Cardano flavour */
  const GLYPHS = "010101₳₳λλ∆∆01+*#01₳λ∆0101";

  let W = 0,
    H = 0,
    DPR = 1;
  let cell = 14,
    cols = 1,
    drops = []; // per column: y (px), speed (px/s), glyph
  let rafId = 0;
  let last = 0;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function pick() {
    return GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }

  /* ------------------------------ build --------------------------- */
  function build() {
    cell = W < 640 ? 12 : 14;
    cols = Math.max(1, Math.ceil(W / cell) + 1);
    drops = [];
    for (let i = 0; i < cols; i++) {
      drops.push({
        x: i * cell,
        y: -rand(0, H),
        speed: rand(46, 150),
        glyph: pick(),
        gap: rand(0, 420), // some columns start quiet
      });
    }
  }

  /* ------------------------------ render -------------------------- */
  function drawGlyph(x, y, glyph, color, alpha) {
    ctx.fillStyle = "rgba(" + color + "," + alpha.toFixed(3) + ")";
    ctx.fillText(glyph, x, y);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;

    // fade the previous frame toward the blue base → glyph trails
    ctx.fillStyle = fadeGradient();
    ctx.fillRect(0, 0, W, H);

    ctx.font = "600 " + (cell - 3) + "px 'Cascadia Code','JetBrains Mono',Consolas,monospace";
    ctx.textBaseline = "top";

    for (const d of drops) {
      d.y += d.speed * dt;

      if (d.y > H + cell) {
        // recycle with a random reset (classic matrix behaviour)
        d.y = -rand(20, 260);
        d.speed = rand(46, 150);
        d.glyph = pick();
        d.gap = Math.random() < 0.3 ? rand(60, 420) : 0;
      }
      if (d.gap > 0) {
        d.gap -= d.speed * dt;
        continue;
      }

      // head: bright; one step behind: mid; two steps: dim
      drawGlyph(d.x, d.y, d.glyph, C_HEAD, 0.9);
      drawGlyph(d.x, d.y - cell, pick(), C_MID, 0.45);
      drawGlyph(d.x, d.y - cell * 2, pick(), C_DIM, 0.22);
    }

    rafId = requestAnimationFrame(frame);
  }

  /* --------------------------- lifecycle --------------------------- */
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
    // start on the blue base so the first fade frame has a base
    ctx.fillStyle = baseGradient();
    ctx.fillRect(0, 0, W, H);
  }

  function start() {
    if (rafId || reduced) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  resize();
  if (reduced) {
    // one calm, static frame: a few short glyph columns
    ctx.fillStyle = baseGradient();
    ctx.fillRect(0, 0, W, H);
    ctx.font = "600 " + (cell - 3) + "px 'Cascadia Code','JetBrains Mono',Consolas,monospace";
    ctx.textBaseline = "top";
    for (let i = 0; i < cols; i++) {
      const d = drops[i];
      if (d.gap > 100) continue;
      drawGlyph(d.x, Math.min(d.y, H * 0.7), d.glyph, C_HEAD, 0.55);
      drawGlyph(d.x, Math.min(d.y, H * 0.7) + cell, pick(), C_MID, 0.3);
    }
  } else {
    start();
  }
})();
