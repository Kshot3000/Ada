/* ============================================================
   ADA — face: the particle head
   A procedural 3D point-cloud head (cranium, face, neck, eyes,
   brows, nose, mouth) rendered on canvas 2D — blue dots on
   white, bittensor-style. She blinks, watches the cursor,
   talks, and shows emotion. Zero dependencies.

   Public API: window.AdaFace
     .setEmotion(name)  — neutral|happy|excited|sad|surprised|
                          thinking|talking|listening|confused
     .getEmotion()      — current emotion name
     .emotions()        — list of supported emotion names
     .setTalking(on)    — oscillating "mouth moves" mode
     .talk(ms)          — one short mouth movement (no TTS)
     .setMouth(x)       — external mouth drive 0..1 (TTS sync)
     .pulse()           — energy flash (e.g. on send)
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("ada-face");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --------------------------- palette --------------------------- */
  var C_BODY = "0, 51, 173";    // #0033AD Cardano blue
  var C_NEAR = "77, 124, 255";  // #4D7CFF near dots
  var C_FEAT = "42, 90, 219";   // #2A5ADB feature dots
  var C_DEEP = "11, 31, 107";   // #0B1F6B deep (mouth/iris)
  var C_SKIN = "228, 237, 255"; // #E4EDFF pale blue (eye sockets)

  /* ------------------------ emotion table ------------------------ */
  /* brow: raise (−..+), browTilt: inner-up (sad) / inner-down (angry)
     eyeOpen, mouthCurve (+ smile / − frown), mouthOpen,
     tiltX: head tilt, look: gaze shift (− left .. + right) */
  var EMOTIONS = {
    neutral:   { brow: 0.0,  browTilt: 0.0,  eyeOpen: 1.0,  mouthCurve: 0.12, mouthOpen: 0.0,  tiltX: 0.0,    look: 0.0 },
    happy:     { brow: 0.55, browTilt: 0.2,  eyeOpen: 0.9,  mouthCurve: 0.95, mouthOpen: 0.15, tiltX: 0.06,   look: 0.0 },
    excited:   { brow: 1.0,  browTilt: 0.3,  eyeOpen: 1.0,  mouthCurve: 1.0,  mouthOpen: 0.6,  tiltX: -0.08,  look: 0.0 },
    sad:       { brow: -0.15,browTilt: -0.9, eyeOpen: 0.65, mouthCurve: -0.8, mouthOpen: 0.0,  tiltX: 0.22,   look: -0.35 },
    surprised: { brow: 1.0,  browTilt: 0.15, eyeOpen: 1.15, mouthCurve: 0.25, mouthOpen: 0.85, tiltX: -0.12,  look: 0.0 },
    thinking:  { brow: 0.4,  browTilt: 0.5,  eyeOpen: 0.72, mouthCurve: -0.12,mouthOpen: 0.04, tiltX: -0.14,  look: 0.65 },
    talking:   { brow: 0.45, browTilt: 0.2,  eyeOpen: 0.95, mouthCurve: 0.35, mouthOpen: 0.4,  tiltX: 0.02,   look: 0.0 },
    listening: { brow: 0.25, browTilt: 0.1,  eyeOpen: 1.0,  mouthCurve: 0.35, mouthOpen: 0.08, tiltX: 0.05,   look: 0.45 },
    confused:  { brow: 0.35, browTilt: 0.75, eyeOpen: 0.85, mouthCurve: -0.3, mouthOpen: 0.1,  tiltX: 0.12,   look: -0.5 },
  };

  /* ----------------------------- state --------------------------- */
  var P = {}; // current animated params (lerped)
  var T = {}; // target params
  var curEmo = "neutral";
  var prevEmo = "neutral"; // emotion to restore after talking ends
  var talking = false;
  var mouthExt = 0;        // external mouth drive (TTS)
  var mouthExtT = 0;       // when mouthExt was set (ms)
  var pulse = 0;           // 0..1 energy flash
  var blink = 1;           // 1 open .. 0 closed
  var nextBlink = 2200 + Math.random() * 2500;
  var blinkPhase = -1;     // -1 idle, else 0..1 through a blink
  var gazeX = 0, gazeY = 0;
  var gazeXT = 0, gazeYT = 0;
  var W = 0, H = 0, DPR = 1, CX = 0, CY = 0, R = 100;
  var rafId = 0, last = 0;

  var dots = []; // {x,y,z, kind, tw (twinkle phase), big}

  /* ------------------------- geometry build ---------------------- */
  function push(x, y, z, kind) {
    dots.push({
      x: x, y: y, z: z, kind: kind,
      tw: Math.random() * 6.283,
      big: 0.9 + Math.random() * 0.9,
    });
  }

  function fibSphere(n, cx, cy, cz, sx, sy, sz, filter, kind) {
    var golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 2;      // 1 .. -1
      var rad = Math.sqrt(Math.max(0, 1 - y * y));
      var th = golden * i;
      var lx = Math.cos(th) * rad;
      var ly = y;
      var lz = Math.sin(th) * rad;
      if (filter && !filter(lx, ly, lz)) continue;
      var px = cx + lx * sx;
      var py = cy + ly * sy;
      var pz = cz + lz * sz;
      // jaw taper: pull the lower-front in toward a chin
      if (py < -0.18 && pz > 0.08) {
        var k = Math.min(1, (-0.18 - py) / 1.0);
        px *= 1 - 0.50 * k * k;
        pz += 0.16 * k * k;
      }
      push(px, py, pz, kind);
    }
  }

  function disc(cx, cy, cz, rx, ry, n, kind) {
    for (var i = 0; i < n; i++) {
      var a = (i / n) * 6.2832 + Math.random() * 0.5;
      var r = 0.25 + 0.75 * Math.sqrt(Math.random());
      push(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, cz, kind);
    }
  }

  function build() {
    dots = [];
    // cranium + face (one deformed sphere, jaw taper applied)
    fibSphere(300, 0, 0.10, -0.06, 0.78, 1.04, 0.90,
      function (lx, ly) { return true; }, "head");
    // back-of-head density
    fibSphere(90, 0, 0.14, -0.16, 0.70, 0.97, 0.85,
      function (lx, ly, lz) { return lz < -0.1; }, "head");
    // neck
    for (var i = 0; i < 70; i++) {
      var a = Math.random() * 6.2832;
      var yy = -0.98 - Math.random() * 0.5;
      var rr = 0.32 + Math.random() * 0.07;
      push(Math.cos(a) * rr, yy, -0.10 + Math.sin(a) * rr * 0.8, "neck");
    }
    // eyes (sclera / iris / pupil)
    for (var s = -1; s <= 1; s += 2) {
      disc(s * 0.29, 0.13, 0.71, 0.125, 0.092, 14, "sclera");
      disc(s * 0.29, 0.13, 0.748, 0.062, 0.048, 12, "iris");
      push(s * 0.29, 0.13, 0.758, "pupil");
      // brow arc (9 points, angle applied at render time)
      for (var b = 0; b < 9; b++) {
        var t = b / 8 * 2 - 1; // -1..1
        push(s * (0.16 + 0.30 * Math.abs(t)), 0.37, 0.68 + 0.05 * (1 - t * t), "brow");
      }
    }
    // nose
    push(0, 0.08, 0.86, "nose");
    push(0, 0.0, 0.90, "nose");
    push(0, -0.08, 0.93, "nose");
    push(-0.05, -0.12, 0.89, "nose");
    push(0.05, -0.12, 0.89, "nose");
    // mouth (12 lip points, curve + open applied at render time)
    for (var m = 0; m < 12; m++) {
      var tm = m / 11 * 2 - 1;
      push(0.23 * tm, -0.44, 0.82, "mouth");
    }
  }

  /* --------------------------- animation ------------------------- */
  function setTarget(emo) {
    var e = EMOTIONS[emo] || EMOTIONS.neutral;
    for (var k in e) T[k] = e[k];
  }
  function lerpParams(dt) {
    var f = 1 - Math.pow(0.0025, dt); // ~smooth over 300ms
    for (var k in T) P[k] += (T[k] - P[k]) * f;
  }

  function blinkUpdate(now, dt) {
    if (blinkPhase < 0) {
      if (now >= nextBlink) {
        blinkPhase = 0;
        nextBlink = now + 2400 + Math.random() * 3200;
      }
    } else {
      blinkPhase += dt / 0.22; // ~220ms blink
      if (blinkPhase >= 1) { blinkPhase = -1; blink = 1; }
      else {
        // closed at mid-blink, open at both ends
        blink = blinkPhase < 0.5 ? 1 - blinkPhase * 2 : (blinkPhase - 0.5) * 2;
        blink = Math.max(0.06, blink);
      }
    }
  }

  function mouthLevel(now) {
    var base = P.mouthOpen;
    if (talking) {
      var w = Math.abs(Math.sin(now * 0.011) * 0.6 + Math.sin(now * 0.023) * 0.4);
      base = Math.max(base, 0.16 + w * 0.75);
    }
    if (mouthExt > 0.02) {
      var since = now - mouthExtT;
      if (since < 900) base = Math.max(base, mouthExt);
      else mouthExt *= 0.9; // decay
    }
    return Math.min(1, base);
  }

  /* ---------------------------- render --------------------------- */
  var proj = [];
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;

    lerpParams(dt);
    if (!reduced) blinkUpdate(now, dt);
    gazeX += (gazeXT - gazeX) * 0.06;
    gazeY += (gazeYT - gazeY) * 0.06;
    pulse = Math.max(0, pulse - dt * 1.4);

    var open = P.eyeOpen * (reduced ? 1 : blink);
    var ml = reduced ? P.mouthOpen : mouthLevel(now);
    var bobY = reduced ? 0 : Math.sin(now * 0.0011) * 0.02;
    var sway = reduced ? 0 : Math.sin(now * 0.0007) * 0.05;
    var ry = 0.12 + gazeX * 0.28 + sway;
    var rx = P.tiltX * 0.5 + gazeY * 0.12 + bobY * 2;

    ctx.clearRect(0, 0, W, H);

    // soft halo behind the head
    var halo = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.6);
    halo.addColorStop(0, "rgba(42, 90, 219," + (0.10 + pulse * 0.10).toFixed(3) + ")");
    halo.addColorStop(0.7, "rgba(42, 90, 219,0.035)");
    halo.addColorStop(1, "rgba(42, 90, 219,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    // rotate (Y then X) + project
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var cx = Math.cos(rx), sx = Math.sin(rx);
    var FOC = 3.1;
    var n = dots.length;
    if (proj.length !== n) proj = new Array(n);
    for (var i = 0; i < n; i++) {
      var d = dots[i];
      var x1 = d.x * cy + d.z * sy;
      var z1 = -d.x * sy + d.z * cy;
      var y1 = d.y * cx - z1 * sx;
      var z2 = d.y * sx + z1 * cx;
      var sc = FOC / (FOC - z2);
      proj[i] = {
        x: CX + x1 * R * sc,
        y: CY - y1 * R * sc, // canvas y is down, model y is up
        s: sc,
        z: z2,
        i: i,
      };
    }
    // painter's order: far first
    var order = [];
    for (var q = 0; q < n; q++) order.push(q);
    order.sort(function (a, b) { return proj[a].z - proj[b].z; });

    var base = Math.max(0.8, R / 240);
    for (var o = 0; o < n; o++) {
      var p = proj[order[o]];
      var d2 = dots[order[o]];
      var near = Math.max(0, Math.min(1, (p.s - 0.86) * 3));
      var tw = reduced ? 1 : 0.78 + 0.22 * Math.sin(now * 0.002 + d2.tw);
      var r = (0.9 + 1.5 * near) * base * d2.big * (1 + pulse * 0.5);
      var alpha = (0.30 + 0.55 * near) * tw * (0.75 + 0.25 * pulse);

      if (d2.kind === "head" || d2.kind === "neck") {
        ctx.fillStyle = "rgba(" + (near > 0.7 ? C_NEAR : C_BODY) + "," + alpha.toFixed(3) + ")";
      } else if (d2.kind === "brow") {
        // emotion: raise + inner tilt, in canvas terms (y is down):
        // raise = brow up; sad (browTilt<0) = inner up / outer down
        var inner = Math.abs(d2.x) < 0.31;
        var raise = P.brow * 0.07;
        var tilt = (inner ? 1 : -1) * P.browTilt * 0.055;
        ctx.fillStyle = "rgba(" + C_FEAT + "," + (alpha + 0.18).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y - raise + tilt, r * 1.3, 0, 6.2832);
        ctx.fill();
        continue;
      } else if (d2.kind === "sclera") {
        // eyes flatten when closing; pale-blue socket reads on white
        var yy = p.y;
        var off = (yy - (CY - 0.13 * R)) * (1.05 - open);
        ctx.fillStyle = "rgba(" + C_SKIN + "," + (0.95 * tw).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x, yy + off, r * 1.05, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = "rgba(" + C_FEAT + "," + (0.45 * tw).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x, yy + off, r * 0.55, 0, 6.2832);
        ctx.fill();
        continue;
      } else if (d2.kind === "iris") {
        var yo = p.y + (p.y - (CY - 0.13 * R)) * (1.05 - open);
        var gx = gazeX * R * 0.045;
        ctx.fillStyle = "rgba(" + C_FEAT + "," + (0.9 * tw).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x + gx, yo, r * 0.8, 0, 6.2832);
        ctx.fill();
        continue;
      } else if (d2.kind === "pupil") {
        var yp = p.y + (p.y - (CY - 0.13 * R)) * (1.05 - open);
        ctx.fillStyle = "rgba(" + C_DEEP + "," + (0.95 * tw).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x + gazeX * R * 0.045, yp, r * 0.65, 0, 6.2832);
        ctx.fill();
        continue;
      } else if (d2.kind === "nose") {
        ctx.fillStyle = "rgba(" + C_FEAT + "," + (0.55 * tw).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.8, 0, 6.2832);
        ctx.fill();
        continue;
      } else if (d2.kind === "mouth") {
        // mouth: curve (smile/frown) + openness (canvas y is down)
        var t2 = d2.x / 0.23; // -1..1
        var curveY = -P.mouthCurve * 0.20 * t2 * t2; // + = ends up = smile
        var lipY = p.y + curveY * R * 0.7;
        var half = ml * 0.12 * R;
        ctx.fillStyle = "rgba(" + C_DEEP + "," + (0.85 * tw).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x, lipY - half, r * 1.0, 0, 6.2832);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, lipY + half, r * 1.0, 0, 6.2832);
        ctx.fill();
        if (ml > 0.35) { // inner glow when open
          ctx.fillStyle = "rgba(" + C_FEAT + "," + (0.4 * ml).toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(p.x, lipY, r * 0.6, 0, 6.2832);
          ctx.fill();
        }
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 6.2832);
      ctx.fill();
    }

    if (!reduced) rafId = requestAnimationFrame(frame);
  }

  /* ---------------------------- resize --------------------------- */
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    var rect;
    try { rect = canvas.getBoundingClientRect(); } catch (e) { rect = null; }
    W = (rect && rect.width) || window.innerWidth || 300;
    H = (rect && rect.height) || window.innerHeight || 300;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W / 2;
    CY = H * 0.46;
    R = Math.min(W, H) * 0.34;
    build();
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
  window.addEventListener("pointermove", function (e) {
    gazeXT = ((e.clientX / (window.innerWidth || 1)) - 0.5) * 1.6;
    gazeYT = ((e.clientY / (window.innerHeight || 1)) - 0.5) * 1.2;
  }, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  resize();
  if (reduced) {
    // one calm, static frame (and re-render on every API call)
    last = performance.now();
    frame(performance.now());
  } else {
    start();
  }

  /* ----------------------------- API ----------------------------- */
  window.AdaFace = {
    setEmotion: function (name) {
      var key = String(name || "neutral");
      if (!EMOTIONS[key]) key = "neutral";
      if (talking && key !== "talking") prevEmo = key; // keep as restore target
      if (talking) { key = "talking"; } // stay talking while talking
      curEmo = key;
      setTarget(key);
      if (reduced) { last = performance.now(); frame(performance.now()); rafId = 0; }
      return key;
    },
    getEmotion: function () { return curEmo; },
    emotions: function () {
      var out = [];
      for (var k in EMOTIONS) out.push(k);
      return out;
    },
    setTalking: function (on) {
      talking = !!on;
      if (talking) {
        if (curEmo !== "talking") { prevEmo = curEmo; curEmo = "talking"; }
        setTarget("talking");
      } else {
        var back = EMOTIONS[prevEmo] ? prevEmo : "neutral";
        curEmo = back;
        setTarget(back);
      }
      if (reduced) { last = performance.now(); frame(performance.now()); rafId = 0; }
      return talking;
    },
    talk: function (ms) {
      // brief simulated speech (no TTS engine): open/close the mouth
      talking = true;
      if (curEmo !== "talking") prevEmo = curEmo;
      curEmo = "talking";
      setTarget("talking");
      var self = this;
      setTimeout(function () {
        if (talking) self.setTalking(false);
      }, Math.max(400, Math.min(5000, ms || 1200)));
    },
    setMouth: function (x) {
      mouthExt = Math.max(0, Math.min(1, Number(x) || 0));
      mouthExtT = performance.now();
    },
    pulse: function () {
      pulse = 1;
      if (reduced) { last = performance.now(); frame(performance.now()); rafId = 0; }
    },
  };
})();
