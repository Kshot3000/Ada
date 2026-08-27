/* ============================================================
   ADA — background: the "moving structure"
   A bittensor.com-style 3D lattice of blue nodes and links,
   slowly rotating on white, with data pulses travelling the
   edges. Pure canvas 2D, zero dependencies, fully responsive,
   pauses when hidden, respects prefers-reduced-motion.
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

  // Cardano blue palette (rgb triplets for alpha blending)
  const C_LINE = "42, 90, 219"; // #2A5ADB
  const C_NODE = "0, 51, 173"; // #0033AD
  const C_HI = "77, 124, 255"; // #4D7CFF
  const C_DUST = "42, 90, 219";

  let W = 0,
    H = 0,
    DPR = 1,
    CX = 0,
    CY = 0,
    R = 0;
  let points = [];
  let edges = [];
  let dust = [];
  let pulses = [];
  let rafId = 0;
  let last = 0;
  let rotY = 0.6;
  // mouse parallax (current + target)
  let mx = 0,
    my = 0,
    mxT = 0,
    myT = 0;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  /* ------------------------- build the lattice ------------------------- */
  function build() {
    const area = Math.max(1, W * H);
    const big = area > 1300000;
    const mid = area > 620000;

    // Two concentric shells, Fibonacci-sphere distribution.
    const pts = [];
    const shells = [
      { r: 1.0, n: big ? 92 : mid ? 68 : 46 },
      { r: 0.52, n: big ? 44 : mid ? 32 : 22 },
    ];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (const sh of shells) {
      for (let i = 0; i < sh.n; i++) {
        const y = 1 - (i / (sh.n - 1)) * 2;
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const th = golden * i;
        pts.push({
          x: Math.cos(th) * rad * sh.r,
          y: y * sh.r,
          z: Math.sin(th) * rad * sh.r,
        });
      }
    }

    // Connect each node to its k nearest neighbours.
    const k = 5;
    const seen = new Set();
    const es = [];
    for (let i = 0; i < pts.length; i++) {
      const dists = [];
      for (let j = 0; j < pts.length; j++) {
        if (i === j) continue;
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const dz = pts[i].z - pts[j].z;
        dists.push([dx * dx + dy * dy + dz * dz, j]);
      }
      dists.sort((a, b) => a[0] - b[0]);
      for (let m = 0; m < k && m < dists.length; m++) {
        const j = dists[m][1];
        const key = i < j ? i + "-" + j : j + "-" + i;
        if (seen.has(key)) continue;
        seen.add(key);
        es.push({ a: i, b: j, len: Math.sqrt(dists[m][0]) });
      }
    }
    points = pts;
    edges = es;

    // Ambient dust drifting behind the lattice.
    const dustN = Math.min(90, Math.round(area / 16000) + 18);
    dust = [];
    for (let i = 0; i < dustN; i++) {
      dust.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: rand(-7, 7),
        vy: rand(-7, 7),
        r: rand(0.6, 1.9),
        a: rand(0.05, 0.22),
      });
    }

    // Pulses travelling along edges ("the agent at work").
    pulses = [];
    if (!reduced && es.length) {
      const count = big ? 9 : 6;
      for (let i = 0; i < count; i++) spawnPulse();
    }
  }

  function spawnPulse() {
    if (!edges.length) return;
    const e = edges[(Math.random() * edges.length) | 0];
    pulses.push({
      e: e,
      t: Math.random(),
      speed: rand(0.25, 0.6), // edge-lengths per second (unit sphere)
    });
  }

  /* ---------------------------- geometry ------------------------------- */
  function project(p, ry, rx) {
    // rotate Y then X
    const cy = Math.cos(ry),
      sy = Math.sin(ry);
    const x1 = p.x * cy + p.z * sy;
    const z1 = -p.x * sy + p.z * cy;
    const cx = Math.cos(rx),
      sx = Math.sin(rx);
    const y1 = p.y * cx - z1 * sx;
    const z2 = p.y * sx + z1 * cx;
    // perspective: camera at z = -FOC, unit-sphere object
    const FOC = 2.6;
    const s = FOC / (FOC - z2);
    return {
      x: CX + x1 * R * s,
      y: CY + y1 * R * s,
      s: s,
      z: z2,
    };
  }

  /* ------------------------------ render ------------------------------- */
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;

    rotY += dt * 0.14; // slow spin
    // gentle breathing tilt + mouse parallax
    mx += (mxT - mx) * 0.04;
    my += (myT - my) * 0.04;
    const rx =
      Math.sin(now * 0.00012) * 0.18 + my * 0.22;
    const ry = rotY + mx * 0.22;

    ctx.clearRect(0, 0, W, H);

    // soft blue halo behind the structure
    const halo = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.5);
    halo.addColorStop(0, "rgba(42, 90, 219, 0.10)");
    halo.addColorStop(0.65, "rgba(42, 90, 219, 0.04)");
    halo.addColorStop(1, "rgba(42, 90, 219, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    // dust
    for (const d of dust) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.x < -4) d.x = W + 4;
      if (d.x > W + 4) d.x = -4;
      if (d.y < -4) d.y = H + 4;
      if (d.y > H + 4) d.y = -4;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, 6.2832);
      ctx.fillStyle = "rgba(" + C_DUST + "," + d.a.toFixed(3) + ")";
      ctx.fill();
    }

    // project everything
    const P = new Array(points.length);
    for (let i = 0; i < points.length; i++) P[i] = project(points[i], ry, rx);

    // edges
    ctx.lineWidth = 1;
    for (const e of edges) {
      const a = P[e.a],
        b = P[e.b];
      const s = (a.s + b.s) * 0.5;
      const alpha = 0.05 + 0.20 * (s - 0.75) * 2;
      ctx.strokeStyle =
        "rgba(" + C_LINE + "," + Math.max(0.03, Math.min(0.3, alpha)).toFixed(3) + ")";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // pulses
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pu = pulses[i];
      pu.t += pu.speed * dt * 0.9;
      if (pu.t >= 1) {
        pulses.splice(i, 1);
        if (pulses.length < 10) spawnPulse();
        continue;
      }
      const a = P[pu.e.a],
        b = P[pu.e.b];
      const x = a.x + (b.x - a.x) * pu.t;
      const y = a.y + (b.y - a.y) * pu.t;
      const s = a.s + (b.s - a.s) * pu.t;
      const r = (0.9 + 1.5 * (s - 0.8)) * Math.max(0.8, R / 320);
      ctx.beginPath();
      ctx.arc(x, y, r * 3, 0, 6.2832);
      ctx.fillStyle = "rgba(" + C_HI + ",0.18)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fillStyle = "rgba(" + C_NODE + ",0.9)";
      ctx.fill();
    }

    // nodes
    const base = Math.max(0.9, R / 300);
    for (const p of P) {
      const r = (1.1 + 1.4 * (p.s - 0.8)) * base;
      const near = (p.s - 0.8) * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.7, r), 0, 6.2832);
      ctx.fillStyle =
        "rgba(" +
        (near > 0.8 ? C_HI : C_NODE) +
        "," +
        (0.35 + 0.5 * Math.max(0, Math.min(1, near))).toFixed(3) +
        ")";
      ctx.fill();
    }

    rafId = requestAnimationFrame(frame);
  }

  /* --------------------------- lifecycle ------------------------------- */
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W / 2;
    CY = H * 0.42;
    R = Math.min(W, H) * (W < 720 ? 0.40 : 0.46);
    build();
  }

  function start() {
    if (rafId) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener(
    "pointermove",
    (e) => {
      mxT = (e.clientX / W - 0.5) * 2;
      myT = (e.clientY / H - 0.5) * 2;
    },
    { passive: true }
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!reduced) start();
  });

  resize();
  if (reduced) {
    // one calm, static frame
    frame(performance.now());
    cancelAnimationFrame(rafId);
    rafId = 0;
  } else {
    start();
  }
})();
