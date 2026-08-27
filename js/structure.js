/* ============================================================
   ADA — core: a moving bittensor-style structure (white + blue)
   A rotating lattice of light — two shells of nodes wired by
   faint edges, orbiting energy comets, and a glowing nucleus —
   drawn in white and Cardano blue over the Matrix rain.

   It REACTS to Ada's state (js/ada.js drives it):
     · idle          — slow rotation, gentle breathing
     · thinking      — fast spin, nodes draw inward, data pulses
                       travel the lattice
     · talking       — the whole structure pulses with her voice
                       (TTS boundary events drive setMouth)
     · happy/excited/surprised — brighter, faster, shockwave rings
     · sad           — dimmer, slower, contracted
     · confused      — wobbles on its axis
     · pulse()       — shockwave fired when a message is sent

   Same public API the old face had (js/ada.js depends on it):
     .setEmotion(name) .getEmotion() .emotions()
     .setTalking(on)   .talk(ms)     .setMouth(x)  .pulse()

   Zero dependencies. Honors prefers-reduced-motion (one calm
   static frame) and pauses when hidden or scrolled out of view.
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("ada-core");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --------------------------- geometry --------------------------- */
  /* Two shells of nodes on a fibonacci sphere. The inner shell is
     dense and bright (the "brain"); the outer shell is sparse and
     faint (the "field"). Nearest-neighbour edges wire each shell
     into a lattice, bittensor-style. */
  var N1 = 210, K1 = 5;
  var N2 = 64, K2 = 3;

  function fib(n) {
    var pts = [];
    var ga = Math.PI * (3 - Math.sqrt(5)); // golden angle
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var th = ga * i;
      pts.push({
        x: Math.cos(th) * r, y: y, z: Math.sin(th) * r,
        ph: Math.random() * Math.PI * 2, // per-node morph phase
        f: 0.5 + Math.random(),          // per-node morph frequency
      });
    }
    return pts;
  }

  var inner = fib(N1);
  var outer = fib(N2);

  function knn(pts, k) {
    var seen = {};
    var edges = [];
    for (var i = 0; i < pts.length; i++) {
      var d = [];
      for (var j = 0; j < pts.length; j++) {
        if (i === j) continue;
        var dx = pts[i].x - pts[j].x,
          dy = pts[i].y - pts[j].y,
          dz = pts[i].z - pts[j].z;
        d.push([dx * dx + dy * dy + dz * dz, j]);
      }
      d.sort(function (a, b) { return a[0] - b[0]; });
      for (var q = 0; q < Math.min(k, d.length); q++) {
        var a = Math.min(i, d[q][1]), b = Math.max(i, d[q][1]);
        var key = a + "-" + b;
        if (!seen[key]) { seen[key] = true; edges.push([a, b]); }
      }
    }
    return edges;
  }

  var edges1 = knn(inner, K1);
  var edges2 = knn(outer, K2);

  /* orbiting energy comets — the bright moving accents */
  var comets = [
    { tilt: 0.55, phase: 0.0, speed: 0.90, r: 1.42 },
    { tilt: -0.95, phase: 2.1, speed: -0.70, r: 1.58 },
    { tilt: 1.90, phase: 4.2, speed: 1.15, r: 1.30 },
  ];

  /* --------------------------- emotion table ---------------------- */
  /* rot: spin speed (rad/s) · amp: morph amplitude · scale: size
     glow: brightness · orbit: comet speed · dim: overall light
     wobble: axis jitter · burst: shockwaves fired on entry */
  var EMO = {
    neutral:   { rot: 0.22, amp: 0.10, scale: 1.00, glow: 0.55, orbit: 1.0, dim: 1.00, wobble: 0, burst: 0 },
    happy:     { rot: 0.50, amp: 0.16, scale: 1.05, glow: 0.85, orbit: 1.6, dim: 1.00, wobble: 0, burst: 1 },
    excited:   { rot: 1.05, amp: 0.26, scale: 1.12, glow: 1.00, orbit: 2.4, dim: 1.00, wobble: 0, burst: 2 },
    surprised: { rot: 0.65, amp: 0.30, scale: 1.18, glow: 0.95, orbit: 2.0, dim: 1.00, wobble: 0, burst: 1 },
    sad:       { rot: 0.10, amp: 0.05, scale: 0.90, glow: 0.35, orbit: 0.5, dim: 0.78, wobble: 0, burst: 0 },
    thinking:  { rot: 0.95, amp: 0.18, scale: 0.96, glow: 0.75, orbit: 2.2, dim: 1.00, wobble: 0, burst: 0 },
    talking:   { rot: 0.45, amp: 0.20, scale: 1.04, glow: 0.80, orbit: 1.5, dim: 1.00, wobble: 0, burst: 0 },
    listening: { rot: 0.30, amp: 0.12, scale: 1.02, glow: 0.65, orbit: 1.3, dim: 1.00, wobble: 0, burst: 0 },
    confused:  { rot: 0.50, amp: 0.22, scale: 0.98, glow: 0.55, orbit: 1.2, dim: 0.90, wobble: 1, burst: 0 },
  };
  var EMOS = Object.keys(EMO);

  /* ------------------------------ state --------------------------- */
  var cur = "neutral";
  var prev = "neutral"; // emotion to restore when talking ends
  var talking = false;
  var P = { rot: EMO.neutral.rot, amp: EMO.neutral.amp, scale: 1, glow: EMO.neutral.glow, orbit: 1, dim: 1, wobble: 0 };
  var talkLevel = 0;    // 0..1 voice drive (talking oscillation / TTS sync)
  var talkUntil = 0;    // talk(ms) window, in sim time
  var mouthDecay = 0;   // setMouth impulse (fast decay)
  var flash = 0;        // pulse() brightness flash
  var rings = [];       // shockwaves { r, a }
  var pulses = [];      // data pulses { e, t } — travel along an edge
  var rotY = 0.6, rotZ = 0;
  var rotX = -0.32;     // fixed tilt — the lattice never looks "flat"
  var t = 0;            // sim time (s)
  var lastPulseSpawn = 0;
  var lastR = 200;      // base radius (px), from resize()
  var raf = 0;
  var running = false;
  var lastNow = 0;

  /* ----------------------------- helpers -------------------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function size() {
    var w = 0, h = 0;
    try {
      var r = canvas.getBoundingClientRect();
      if (r && r.width > 0 && r.height > 0) { w = r.width; h = r.height; }
    } catch (e) { /* stubbed DOM */ }
    if (!w) w = (canvas.clientWidth || 0) || (window.innerWidth || 600);
    if (!h) h = (canvas.clientHeight || 0) || Math.round((window.innerHeight || 600) * 0.5);
    return { w: w, h: h };
  }

  function resize() {
    var s = size();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var pw = Math.max(1, Math.round(s.w * dpr)),
      ph = Math.max(1, Math.round(s.h * dpr));
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    try { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); } catch (e) { /* stub */ }
    lastR = Math.min(s.w, s.h) * 0.34;
  }

  function lerpP(dt) {
    var T = EMO[cur] || EMO.neutral;
    var k = Math.min(1, dt * 3.2);
    P.rot += (T.rot - P.rot) * k;
    P.amp += (T.amp - P.amp) * k;
    P.scale += (T.scale - P.scale) * k;
    P.glow += (T.glow - P.glow) * k;
    P.orbit += (T.orbit - P.orbit) * k;
    P.dim += (T.dim - P.dim) * k;
    P.wobble += (T.wobble - P.wobble) * k;
  }

  /* voice drive: while talking the structure "breathes" with her
     voice; setMouth(x) spikes it (TTS boundary events); talk(ms)
     sustains it (no-TTS fallback). */
  function talkDrive(dt) {
    mouthDecay = Math.max(0, mouthDecay - dt * 4);
    flash = Math.max(0, flash - dt * 2.2);
    var base = 0;
    if (talking) {
      base = 0.34 + 0.26 * Math.sin(t * 6.4) + 0.14 * Math.sin(t * 10.1 + 1.7);
    }
    if (t < talkUntil) {
      var s = 0.38 + 0.30 * Math.sin(t * 7.5);
      if (s > base) base = s;
    }
    var target = clamp(base + mouthDecay, 0, 1);
    talkLevel += (target - talkLevel) * Math.min(1, dt * 10);
  }

  function spawnPulse() {
    if (!edges1.length) return;
    pulses.push({ e: (Math.random() * edges1.length) | 0, t: 0 });
    if (pulses.length > 14) pulses.shift();
  }

  /* ----------------------------- drawing -------------------------- */
  /* project a point (unit space) through Y/X/Z rotation + perspective */
  function project(x, y, z, o) {
    var cy = Math.cos(rotY), sy = Math.sin(rotY);
    var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    var cx = Math.cos(rotX), sx = Math.sin(rotX);
    var y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
    var cz = Math.cos(rotZ), sz = Math.sin(rotZ);
    var x2 = x1 * cz - y1 * sz, y2 = x1 * sz + y1 * cz;
    var p = 3.4 / (3.4 - z2);
    o.x = x2 * p; o.y = y2 * p; o.z = z2;
    return o;
  }

  /* morph radius of a node at time t (the "breathing") */
  function morph(n, amp) {
    return 1 + amp * (0.55 * Math.sin(n.ph + t * n.f) + 0.30 * Math.sin(2 * n.ph + t * n.f * 1.7));
  }

  var _p = { x: 0, y: 0, z: 0 }; // scratch

  function drawShellNodes(nodes, Rr, cxp, cyp, dim, glow, color, rMin, rMax) {
    // project + draw (depth-sorted alpha)
    var i, n, rr;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      rr = morph(n, P.amp);
      project(n.x * rr, n.y * rr, n.z * rr, _p);
      var depth = clamp((_p.z + 1.4) / 2.8, 0, 1);
      var a = (rMin + (rMax - rMin) * depth) * dim * (0.5 + 0.5 * glow);
      if (a < 0.02) continue;
      ctx.fillStyle = "rgba(" + color + "," + a.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(cxp + _p.x * Rr, cyp + _p.y * Rr, 1 + 1.6 * depth, 0, 6.2832);
      ctx.fill();
    }
  }

  function drawShellEdges(edges, nodes, base, Rr, cxp, cyp, dim, glow) {
    // bucket edges by alpha to batch state changes (fast)
    var B = 8, buckets = new Array(B);
    for (var b = 0; b < B; b++) buckets[b] = null;
    var maxA = base * dim * (0.45 + 0.55 * glow);
    for (var i = 0; i < edges.length; i++) {
      var ea = edges[i][0], eb = edges[i][1];
      var na = nodes[ea], nb = nodes[eb];
      var ra = morph(na, P.amp), rb = morph(nb, P.amp);
      project(na.x * ra, na.y * ra, na.z * ra, _p);
      var ax = cxp + _p.x * Rr, ay = cyp + _p.y * Rr;
      var za = _p.z;
      project(nb.x * rb, nb.y * rb, nb.z * rb, _p);
      var bx = cxp + _p.x * Rr, by = cyp + _p.y * Rr;
      var depth = clamp((za + _p.z) / 2.8 + 0.5, 0, 1);
      var a = maxA * (0.35 + 0.65 * depth);
      var bi = Math.min(B - 1, Math.floor(a / maxA * B));
      if (!buckets[bi]) buckets[bi] = [];
      buckets[bi].push(ax, ay, bx, by);
    }
    ctx.lineWidth = 1;
    for (var b2 = 0; b2 < B; b2++) {
      var arr = buckets[b2];
      if (!arr) continue;
      var aa = maxA * ((b2 + 0.5) / B);
      if (aa < 0.008) continue;
      ctx.strokeStyle = "rgba(176, 205, 255," + aa.toFixed(3) + ")";
      ctx.beginPath();
      for (var q = 0; q < arr.length; q += 4) {
        ctx.moveTo(arr[q], arr[q + 1]);
        ctx.lineTo(arr[q + 2], arr[q + 3]);
      }
      ctx.stroke();
    }
  }

  function drawComets(Rr, cxp, cyp, dim, glow) {
    for (var c = 0; c < comets.length; c++) {
      var cm = comets[c];
      var a0 = cm.phase + t * cm.speed * P.orbit;
      var st = Math.sin(cm.tilt), ct = Math.cos(cm.tilt);
      // faint orbit path
      ctx.strokeStyle = "rgba(176, 205, 255," + (0.05 * dim * (0.5 + 0.5 * glow)).toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var s = 0; s <= 40; s++) {
        var aa = a0 + (s / 40) * 6.2832;
        project(Math.cos(aa) * cm.r, Math.sin(aa) * cm.r * st, Math.sin(aa) * cm.r * ct, _p);
        var px = cxp + _p.x * Rr, py = cyp + _p.y * Rr;
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // comet: bright head + fading trail
      var TR = 10;
      for (var k = TR; k >= 0; k--) {
        var a2 = a0 - k * 0.055;
        project(Math.cos(a2) * cm.r, Math.sin(a2) * cm.r * st, Math.sin(a2) * cm.r * ct, _p);
        var depth = clamp((_p.z + 1.6) / 3.2, 0, 1);
        var fade = (1 - k / (TR + 1));
        var al = (0.06 + 0.5 * fade * fade) * (0.35 + 0.65 * depth) * dim * (0.5 + 0.5 * glow);
        if (k === 0) {
          // glow halo
          var gx = cxp + _p.x * Rr, gy = cyp + _p.y * Rr;
          var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 9);
          g.addColorStop(0, "rgba(255,255,255," + (0.55 * al + 0.15).toFixed(3) + ")");
          g.addColorStop(1, "rgba(140, 175, 255,0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(gx, gy, 9, 0, 6.2832); ctx.fill();
        }
        ctx.fillStyle = "rgba(255,255,255," + al.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(cxp + _p.x * Rr, cyp + _p.y * Rr, k === 0 ? 2.1 : 1.4, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  function draw() {
    var s = size();
    var w = s.w, h = s.h;
    try { ctx.clearRect(0, 0, w, h); } catch (e) { /* stub */ }

    var glow = clamp(P.glow + flash * 0.55 + talkLevel * 0.35, 0, 1.25);
    var dim = P.dim;
    var Rr = lastR * P.scale * (1 + 0.05 * talkLevel);
    var cxp = w / 2, cyp = h / 2;

    /* nucleus glow — the heart of the structure */
    var nr = Rr * (0.36 + 0.16 * glow + 0.12 * talkLevel);
    var g = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, nr);
    g.addColorStop(0, "rgba(255,255,255," + (0.16 + 0.22 * glow + 0.10 * talkLevel).toFixed(3) + ")");
    g.addColorStop(0.55, "rgba(190, 214, 255," + (0.08 + 0.10 * glow).toFixed(3) + ")");
    g.addColorStop(1, "rgba(120, 160, 255,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cxp, cyp, nr, 0, 6.2832); ctx.fill();

    /* outer field, then inner lattice */
    drawShellEdges(edges2, outer, 0.10, Rr, cxp, cyp, dim, glow);
    drawShellNodes(outer, Rr, cxp, cyp, dim, glow, "214, 230, 255", 0.18, 0.55);
    drawShellEdges(edges1, inner, 0.16, Rr, cxp, cyp, dim, glow);
    drawShellNodes(inner, Rr, cxp, cyp, dim, glow, "255, 255, 255", 0.30, 0.95);

    /* bright nucleus dot */
    ctx.fillStyle = "rgba(255,255,255," + (0.55 + 0.35 * glow).toFixed(3) + ")";
    ctx.beginPath(); ctx.arc(cxp, cyp, 2.4 + 1.2 * glow + 1.2 * talkLevel, 0, 6.2832); ctx.fill();

    drawComets(Rr, cxp, cyp, dim, glow);

    /* shockwave rings (pulse / excited / surprised) */
    ctx.lineWidth = 1.5;
    for (var i = rings.length - 1; i >= 0; i--) {
      var rg = rings[i];
      var ra = rg.a * 0.45 * dim;
      if (ra > 0.01) {
        ctx.strokeStyle = "rgba(255,255,255," + ra.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(cxp, cyp, rg.r, 0, 6.2832); ctx.stroke();
      }
    }

    /* data pulses travelling the lattice while thinking */
    for (var j = 0; j < pulses.length; j++) {
      var pu = pulses[j];
      var e = edges1[pu.e];
      if (!e) continue;
      var na = inner[e[0]], nb = inner[e[1]];
      var ra2 = morph(na, P.amp), rb2 = morph(nb, P.amp);
      project(na.x * ra2, na.y * ra2, na.z * ra2, _p);
      var x1 = cxp + _p.x * Rr, y1 = cyp + _p.y * Rr;
      project(nb.x * rb2, nb.y * rb2, nb.z * rb2, _p);
      var x2 = cxp + _p.x * Rr, y2 = cyp + _p.y * Rr;
      var px = x1 + (x2 - x1) * pu.t, py = y1 + (y2 - y1) * pu.t;
      var al = (1 - pu.t) * 0.9 * dim;
      if (al > 0.02) {
        ctx.fillStyle = "rgba(255,255,255," + al.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 6.2832); ctx.fill();
      }
    }
  }

  /* ------------------------------ loop ---------------------------- */
  function frame(now) {
    var dt = clamp((now - lastNow) / 1000 || 0.016, 0.001, 0.05);
    lastNow = now;
    t += dt;
    rotY += P.rot * dt;
    rotZ = P.wobble > 0.05
      ? Math.sin(t * 1.7) * 0.14 * P.wobble
      : Math.sin(t * 0.9) * 0.03;
    lerpP(dt);
    talkDrive(dt);
    for (var i = rings.length - 1; i >= 0; i--) {
      rings[i].r += lastR * 2.0 * dt;
      rings[i].a -= dt * 1.15;
      if (rings[i].a <= 0) rings.splice(i, 1);
    }
    if (cur === "thinking" && t - lastPulseSpawn > 0.16) {
      lastPulseSpawn = t;
      spawnPulse();
    }
    for (var j = 0; j < pulses.length; j++) {
      pulses[j].t += dt / 0.55;
    }
    pulses = pulses.filter(function (p) { return p.t < 1; });
    draw();
    if (running) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced) return;
    running = true;
    lastNow = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) { try { cancelAnimationFrame(raf); } catch (e) {} raf = 0; }
  }

  /* ------------------------------ public API ---------------------- */
  var api = {
    setEmotion: function (name) {
      if (!EMO[name]) return cur;
      if (name === cur) return cur;
      cur = name;
      var b = EMO[name].burst || 0;
      for (var i = 0; i < b; i++) {
        rings.push({ r: lastR * (0.20 + 0.14 * i), a: 1 - 0.18 * i });
      }
      return cur;
    },
    getEmotion: function () { return cur; },
    emotions: function () { return EMOS.slice(); },
    setTalking: function (on) {
      if (on) {
        if (cur !== "talking") prev = cur;
        cur = "talking";
        talking = true;
      } else if (talking) {
        talking = false;
        cur = EMO[prev] ? prev : "neutral";
      }
      return cur;
    },
    talk: function (ms) { talkUntil = t + Math.max(0, Number(ms) || 0) / 1000; },
    setMouth: function (x) { mouthDecay = clamp(Number(x) || 0, 0, 1); },
    pulse: function () {
      flash = 1;
      rings.push({ r: lastR * 0.18, a: 1 });
    },
  };
  window.AdaStructure = api;

  /* ------------------------------ boot ---------------------------- */
  try { window.addEventListener("resize", resize); } catch (e) { /* stub */ }
  resize();

  if (reduced) {
    t = 2.2; // a pleasant fixed rotation
    draw();
  } else {
    try {
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop(); else start();
      });
    } catch (e) { /* stub */ }
    if (typeof IntersectionObserver === "function") {
      try {
        new IntersectionObserver(function (ents) {
          for (var i = 0; i < ents.length; i++) {
            if (ents[i].isIntersecting) start(); else stop();
          }
        }, { threshold: 0 }).observe(canvas);
      } catch (e) { /* stub */ }
    }
    start();
  }
})();
