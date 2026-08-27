/* ============================================================
   ADA — face: a detailed vector portrait (v2)
   A procedural woman — long layered hair, expressive eyes with
   lashes, brows, nose, full lips, blush, earrings, neck and
   shoulders — drawn with canvas bezier paths in white + Cardano
   blue only, on top of the Matrix rain (background.js). Bittensor
   energy particles orbit her. She blinks, watches the cursor,
   talks, and shows emotion. Zero dependencies.

   Public API (unchanged from v1 — ada.js depends on it):
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
  /* white + Cardano blues only */
  var SKIN_A = "255, 255, 255";      // skin highlight
  var SKIN_B = "216, 230, 255";      // skin shade (light periwinkle)
  var SKIN_C = "186, 206, 252";      // deeper skin shade (neck bottom)
  var HAIR_A = "182, 208, 255";      // back hair top
  var HAIR_B = "112, 152, 255";      // back hair bottom
  var BANG_A = "172, 200, 255";      // front hair top
  var BANG_B = "102, 146, 255";      // front hair bottom
  var STRAND_A = "180, 206, 255";    // side strand top
  var STRAND_B = "106, 148, 255";    // side strand bottom
  var TOP_A = "212, 230, 255";       // shirt top
  var TOP_B = "128, 164, 255";       // shirt bottom
  var LIP_A = "122, 146, 238";       // upper lip
  var LIP_B = "94, 118, 222";        // lower lip
  var BROW = "64, 98, 218";          // brows (read on the white face)
  var INK = "14, 32, 104";           // lash line / pupil ring
  var PUPIL = "8, 20, 76";           // pupil
  var IRIS_A = "172, 202, 255";      // iris centre
  var IRIS_B = "52, 92, 232";        // iris edge
  var SHADOW = "142, 170, 238";      // soft shading lines
  var MOUTH_IN = "10, 24, 86";       // open mouth interior
  var BLUSH = "178, 203, 255";       // cheek blush

  /* ------------------------ emotion table ------------------------ */
  /* brow: raise (−..+), browTilt: inner-up (sad) / inner-down
     eyeOpen, mouthCurve (+ smile / − frown), mouthOpen,
     tiltX: head tilt, look: gaze bias (− left .. + right) */
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
  var parts = [];          // orbiting energy particles {a, rx, ry, sz, sp, tw, front, col}

  /* ------------------------- particle field ---------------------- */
  function buildParticles() {
    parts = [];
    for (var i = 0; i < 96; i++) {
      var white = Math.random() < 0.62;
      parts.push({
        a: Math.random() * 6.2832,
        rx: 1.18 + Math.random() * 0.42, // 1.18..1.60
        ry: 1.28 + Math.random() * 0.42, // 1.28..1.70
        sz: 0.010 + Math.random() * 0.016,
        sp: (Math.random() - 0.5) * 0.16,
        tw: Math.random() * 6.2832,
        front: Math.random() < 0.22,
        col: white ? "255, 255, 255" : "168, 196, 255",
      });
    }
  }

  /* --------------------------- helpers --------------------------- */
  function rgba(c, a) {
    return "rgba(" + c + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")";
  }
  function grad(x0, y0, x1, y1, c0, c1) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    return g;
  }
  function trace(pathFn) {
    ctx.beginPath();
    pathFn();
  }
  function fillPath(pathFn, style) {
    ctx.fillStyle = style;
    trace(pathFn);
    ctx.fill();
  }
  function strokePath(pathFn, style, width, alpha) {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (alpha !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    trace(pathFn);
    ctx.stroke();
    if (alpha !== undefined) ctx.globalAlpha = 1;
  }
  function ovalPath(cx, cy, rx, ry) {
    return function () {
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.2832);
    };
  }

  /* ================================================================
     GEOMETRY — all paths in unit space, origin at the face centre,
     +y is UP (the ctx is flipped once per frame).
     Face: top 0.82, chin -0.74, half-width ~0.57.
     Figure spans y -1.6 (hair tips) .. +1.10 (hair crown).
     ================================================================ */

  /* ---- back hair: one long flowing mass with a wavy bottom edge ---- */
  function hairBackPath() {
    return function () {
      ctx.moveTo(0, 1.10);
      ctx.bezierCurveTo(0.60, 1.08, 0.94, 0.78, 0.97, 0.30);
      ctx.bezierCurveTo(0.99, -0.10, 0.90, -0.50, 0.97, -0.92);
      ctx.bezierCurveTo(1.02, -1.14, 1.05, -1.32, 0.98, -1.52);
      ctx.bezierCurveTo(0.86, -1.40, 0.72, -1.38, 0.58, -1.46);
      ctx.bezierCurveTo(0.40, -1.36, 0.20, -1.34, 0, -1.38);
      ctx.bezierCurveTo(-0.20, -1.34, -0.40, -1.36, -0.58, -1.46);
      ctx.bezierCurveTo(-0.72, -1.38, -0.86, -1.40, -0.98, -1.52);
      ctx.bezierCurveTo(-1.05, -1.32, -1.02, -1.14, -0.97, -0.92);
      ctx.bezierCurveTo(-0.90, -0.50, -0.99, -0.10, -0.97, 0.30);
      ctx.bezierCurveTo(-0.94, 0.78, -0.60, 1.08, 0, 1.10);
      ctx.closePath();
    };
  }

  /* ---- neck ---- */
  function neckPath() {
    return function () {
      ctx.moveTo(-0.185, -0.50);
      ctx.bezierCurveTo(-0.19, -0.72, -0.20, -0.88, -0.235, -1.00);
      ctx.lineTo(0.235, -1.00);
      ctx.bezierCurveTo(0.20, -0.88, 0.19, -0.72, 0.185, -0.50);
      ctx.bezierCurveTo(0.10, -0.60, -0.10, -0.60, -0.185, -0.50);
      ctx.closePath();
    };
  }

  /* ---- shoulders / top with a scoop neckline ---- */
  function topPath() {
    return function () {
      ctx.moveTo(-0.90, -1.60);
      ctx.bezierCurveTo(-0.94, -1.22, -0.78, -1.04, -0.44, -0.97);
      ctx.bezierCurveTo(-0.30, -0.94, -0.20, -0.88, -0.155, -0.78);
      ctx.bezierCurveTo(-0.10, -0.67, 0.10, -0.67, 0.155, -0.78);
      ctx.bezierCurveTo(0.20, -0.88, 0.30, -0.94, 0.44, -0.97);
      ctx.bezierCurveTo(0.78, -1.04, 0.94, -1.22, 0.90, -1.60);
      ctx.closePath();
    };
  }

  /* ---- face: rounded forehead, soft cheeks, tapered chin ---- */
  function facePath() {
    return function () {
      ctx.moveTo(0, 0.82);
      ctx.bezierCurveTo(0.46, 0.82, 0.60, 0.42, 0.57, 0.08);
      ctx.bezierCurveTo(0.55, -0.24, 0.42, -0.52, 0.18, -0.66);
      ctx.quadraticCurveTo(0, -0.74, -0.18, -0.66);
      ctx.bezierCurveTo(-0.42, -0.52, -0.55, -0.24, -0.57, 0.08);
      ctx.bezierCurveTo(-0.60, 0.42, -0.46, 0.82, 0, 0.82);
      ctx.closePath();
    };
  }

  /* ---- bangs: two sweeps from a part on her right (viewer left) ---- */
  function bangLeftPath() {
    return function () {
      ctx.moveTo(-0.14, 1.00);
      ctx.bezierCurveTo(-0.52, 0.98, -0.72, 0.72, -0.70, 0.38);
      ctx.bezierCurveTo(-0.64, 0.56, -0.50, 0.72, -0.32, 0.78);
      ctx.bezierCurveTo(-0.24, 0.80, -0.17, 0.86, -0.14, 1.00);
      ctx.closePath();
    };
  }
  function bangRightPath() {
    return function () {
      ctx.moveTo(-0.14, 1.00);
      ctx.bezierCurveTo(0.30, 1.04, 0.62, 0.92, 0.72, 0.55);
      ctx.bezierCurveTo(0.74, 0.42, 0.72, 0.30, 0.68, 0.20);
      ctx.bezierCurveTo(0.66, 0.38, 0.58, 0.60, 0.42, 0.72);
      ctx.bezierCurveTo(0.28, 0.82, 0.05, 0.86, -0.14, 1.00);
      ctx.closePath();
    };
  }

  /* ---- long side strands framing the face (in front of shoulders) ---- */
  function strandRightPath() {
    return function () {
      ctx.moveTo(0.66, 0.30);
      ctx.bezierCurveTo(0.76, -0.10, 0.72, -0.50, 0.82, -0.88);
      ctx.bezierCurveTo(0.88, -1.10, 0.86, -1.30, 0.76, -1.48);
      ctx.bezierCurveTo(0.70, -1.28, 0.70, -1.02, 0.66, -0.76);
      ctx.bezierCurveTo(0.60, -0.44, 0.58, -0.12, 0.60, 0.26);
      ctx.closePath();
    };
  }
  function strandLeftPath() {
    return function () {
      ctx.moveTo(-0.64, 0.34);
      ctx.bezierCurveTo(-0.72, -0.05, -0.70, -0.45, -0.78, -0.82);
      ctx.bezierCurveTo(-0.84, -1.04, -0.82, -1.24, -0.72, -1.42);
      ctx.bezierCurveTo(-0.66, -1.22, -0.66, -0.96, -0.62, -0.70);
      ctx.bezierCurveTo(-0.56, -0.38, -0.54, -0.08, -0.56, 0.30);
      ctx.closePath();
    };
  }

  /* ---- eye: almond sclera (open = 1 open .. 0 closed) ---- */
  function eyePath(cx, cy, open) {
    var a = 0.185, bu = 0.128, bl = 0.08;
    var o = Math.max(0.05, open);
    return function () {
      ctx.moveTo(cx - a, cy);
      ctx.bezierCurveTo(cx - a * 0.4, cy + bu * o, cx + a * 0.4, cy + bu * o, cx + a, cy);
      ctx.bezierCurveTo(cx + a * 0.4, cy - bl * o, cx - a * 0.4, cy - bl * o, cx - a, cy);
      ctx.closePath();
    };
  }

  /* --------------------------- animation ------------------------- */
  function setTarget(emo) {
    var e = EMOTIONS[emo] || EMOTIONS.neutral;
    for (var k in e) T[k] = e[k];
  }
  function lerpParams(dt) {
    var f = 1 - Math.pow(0.0025, dt); // ~smooth over 300ms
    for (var k in T) {
      P[k] = P[k] === undefined ? T[k] : P[k] + (T[k] - P[k]) * f;
    }
  }

  function blinkUpdate(now, dt) {
    if (blinkPhase < 0) {
      if (now >= nextBlink) {
        blinkPhase = 0;
        nextBlink = now + 2400 + Math.random() * 3200;
      }
    } else {
      blinkPhase += dt / 0.24; // ~240ms blink
      if (blinkPhase >= 1) { blinkPhase = -1; blink = 1; }
      else {
        blink = blinkPhase < 0.5 ? 1 - blinkPhase * 2 : (blinkPhase - 0.5) * 2;
        blink = Math.max(0.05, blink);
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

  /* ============================ DRAW ============================== */

  function drawParticles(now, dt, front) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.front !== front) continue;
      if (!reduced) p.a += p.sp * dt;
      var x = Math.cos(p.a) * p.rx;
      var y = Math.sin(p.a) * p.ry;
      var tw = reduced ? 0.7 : 0.5 + 0.5 * Math.sin(now * 0.0021 + p.tw);
      ctx.fillStyle = rgba(p.col, (0.16 + 0.5 * tw) * (0.8 + 0.4 * pulse));
      ctx.beginPath();
      ctx.arc(x, y, p.sz * (1 + 0.5 * pulse), 0, 6.2832);
      ctx.fill();
    }
  }

  function drawEyes(open, gx, gy) {
    for (var e = -1; e <= 1; e += 2) {
      var cx = e * 0.28, cy = 0.13;
      var ix = cx + gx * 0.5, iy = cy + gy * 0.3; // gaze (subtle, same direction both eyes)
      var a = 0.185, bu = 0.128, bl = 0.08;
      var o = Math.max(0.05, open);

      // sclera
      fillPath(eyePath(cx, cy, open), "rgba(" + SKIN_A + ",0.98)");

      // iris + pupil + glints, clipped to the almond
      if (o > 0.12) {
        ctx.save();
        trace(eyePath(cx, cy, open));
        ctx.clip();
        var ig = ctx.createRadialGradient(ix, iy, 0, ix, iy, 0.105);
        ig.addColorStop(0, "rgba(" + IRIS_A + ",1)");
        ig.addColorStop(1, "rgba(" + IRIS_B + ",1)");
        ctx.fillStyle = ig;
        ctx.beginPath();
        ctx.arc(ix, iy, 0.102, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = "rgba(" + PUPIL + ",1)";
        ctx.beginPath();
        ctx.arc(ix, iy, 0.048, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = "rgba(" + SKIN_A + ",0.95)";
        ctx.beginPath();
        ctx.arc(ix - 0.036, iy + 0.036, 0.025, 0, 6.2832);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ix + 0.022, iy - 0.020, 0.012, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }

      // upper lash line (rides the almond edge) + outer flick
      strokePath(function () {
        ctx.moveTo(cx - a, cy);
        ctx.bezierCurveTo(cx - a * 0.4, cy + bu * o, cx + a * 0.4, cy + bu * o, cx + a, cy);
        ctx.lineTo(cx + a + 0.055 * e, cy + 0.045 * o + 0.012);
      }, "rgba(" + INK + "," + (0.75 + 0.25 * o).toFixed(3) + ")", 0.022);

      // lower lid — faint
      strokePath(function () {
        ctx.moveTo(cx - a * 0.85, cy);
        ctx.bezierCurveTo(cx - a * 0.35, cy - bl * o * 0.9, cx + a * 0.35, cy - bl * o * 0.9, cx + a * 0.85, cy);
      }, "rgba(" + SHADOW + ",0.55)", 0.011, 0.5 + 0.5 * o);

      // closed-lid lash line (fades in as the eye closes)
      if (o < 0.45) {
        var cl = (0.45 - o) / 0.45;
        strokePath(function () {
          ctx.moveTo(cx - a * 0.82, cy + 0.008);
          ctx.quadraticCurveTo(cx, cy - 0.045, cx + a * 0.82, cy + 0.008);
        }, "rgba(" + INK + "," + (0.85 * cl).toFixed(3) + ")", 0.020);
      }
    }
  }

  function drawBrows(brow, tilt) {
    for (var s = -1; s <= 1; s += 2) {
      var cx = s * 0.28;
      var innerX = cx - s * 0.21;   // the end toward the face centre
      var outerX = cx + s * 0.24;
      var by = 0.30 + brow * 0.055;
      var innerY = by - tilt * 0.045;  // sad → inner up; serious → inner down
      var outerY = by + tilt * 0.022;
      fillPath(function () {
        ctx.moveTo(innerX, innerY);
        ctx.bezierCurveTo(innerX - s * 0.055, innerY + 0.085, outerX - s * 0.065, outerY + 0.058, outerX, outerY);
        ctx.bezierCurveTo(outerX - s * 0.075, outerY + 0.020, innerX - s * 0.035, innerY + 0.032, innerX, innerY - 0.014);
        ctx.closePath();
      }, "rgba(" + BROW + ",0.92)");
    }
  }

  function drawMouth(curve, ml) {
    var w = 0.185;
    var cy = -0.35 + curve * 0.05;   // smile lifts the corners
    var lowerTop = cy + 0.020 + ml * 0.11;

    // open-mouth interior (between the lips)
    if (ml > 0.07) {
      fillPath(function () {
        ctx.moveTo(-w * 0.72, cy + 0.008);
        ctx.quadraticCurveTo(0, cy + 0.024, w * 0.72, cy + 0.008);
        ctx.quadraticCurveTo(0, lowerTop + 0.012, -w * 0.72, cy + 0.008);
        ctx.closePath();
      }, "rgba(" + MOUTH_IN + ",0.92)");
    }

    // upper lip with cupid's bow
    fillPath(function () {
      ctx.moveTo(-w, cy);
      ctx.bezierCurveTo(-w * 0.72, cy - 0.058, -0.090, cy - 0.068, 0, cy - 0.042);
      ctx.bezierCurveTo(0.090, cy - 0.068, w * 0.72, cy - 0.058, w, cy);
      ctx.bezierCurveTo(w * 0.70, cy + 0.022, -w * 0.70, cy + 0.022, -w, cy);
      ctx.closePath();
    }, grad(0, cy - 0.07, 0, cy + 0.02, "rgba(" + LIP_A + ",1)", "rgba(" + LIP_B + ",1)"));

    // lower lip (drops when she opens her mouth)
    fillPath(function () {
      ctx.moveTo(-w, lowerTop);
      ctx.bezierCurveTo(-w * 0.60, lowerTop + 0.080, w * 0.60, lowerTop + 0.080, w, lowerTop);
      ctx.bezierCurveTo(w * 0.70, lowerTop + 0.006, -w * 0.70, lowerTop + 0.006, -w, lowerTop);
      ctx.closePath();
    }, grad(0, lowerTop, 0, lowerTop + 0.085, "rgba(" + LIP_B + ",1)", "rgba(" + LIP_A + ",1)"));

    // the lip line
    strokePath(function () {
      ctx.moveTo(-w, cy);
      ctx.bezierCurveTo(-w * 0.6, cy + 0.016, w * 0.6, cy + 0.016, w, cy);
    }, "rgba(45, 70, 175,0.85)", 0.012);

    // lower-lip highlight
    ctx.fillStyle = "rgba(255, 255, 255," + (0.28 + 0.2 * ml).toFixed(3) + ")";
    ctx.beginPath();
    ctx.ellipse(0, lowerTop + 0.036, 0.055, 0.016, 0, 0, 6.2832);
    ctx.fill();
  }

  function drawFrame(now, dt) {
    lerpParams(dt);
    if (!reduced) blinkUpdate(now, dt);
    gazeX += (gazeXT - gazeX) * 0.06;
    gazeY += (gazeYT - gazeY) * 0.06;
    pulse = Math.max(0, pulse - dt * 1.4);

    var open = P.eyeOpen * (reduced ? 1 : blink);
    var ml = reduced ? P.mouthOpen : mouthLevel(now);
    var bobY = reduced ? 0 : Math.sin(now * 0.0011) * 0.014;
    var tilt = reduced ? 0 : P.tiltX * 0.10 + Math.sin(now * 0.0007) * 0.012;

    ctx.clearRect(0, 0, W, H);

    /* ---- figure space: unit coords, +y up ---- */
    ctx.save();
    ctx.translate(CX, CY + bobY * R);
    ctx.scale(R, -R);
    if (tilt) {
      ctx.translate(0, -0.25);
      ctx.rotate(-tilt); // canvas flip: negative = tilt toward -x
      ctx.translate(0, 0.25);
    }

    /* halo */
    var halo = ctx.createRadialGradient(0, 0.1, 0, 0, 0.1, 2.35);
    halo.addColorStop(0, "rgba(255, 255, 255," + (0.14 + 0.20 * pulse).toFixed(3) + ")");
    halo.addColorStop(0.55, "rgba(200, 220, 255," + (0.05 + 0.08 * pulse).toFixed(3) + ")");
    halo.addColorStop(1, "rgba(200, 220, 255,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(-2.6, -2.6, 5.2, 5.2);

    drawParticles(now, dt, false);

    /* back hair */
    fillPath(hairBackPath(), grad(0, 1.1, 0, -1.6, "rgba(" + HAIR_A + ",1)", "rgba(" + HAIR_B + ",1)"));
    // back-hair strands + highlights
    strokePath(function () { ctx.moveTo(0.88, 0.55); ctx.bezierCurveTo(0.95, 0.1, 0.86, -0.4, 0.93, -0.9); }, "rgba(" + SHADOW + ",0.55)", 0.02);
    strokePath(function () { ctx.moveTo(-0.88, 0.5); ctx.bezierCurveTo(-0.94, 0.0, -0.85, -0.5, -0.92, -1.0); }, "rgba(" + SHADOW + ",0.55)", 0.02);
    strokePath(function () { ctx.moveTo(0.75, 0.6); ctx.bezierCurveTo(0.82, 0.1, 0.74, -0.4, 0.80, -0.95); }, "rgba(255, 255, 255,0.5)", 0.014);
    strokePath(function () { ctx.moveTo(-0.72, 0.5); ctx.bezierCurveTo(-0.78, 0.0, -0.70, -0.5, -0.76, -1.0); }, "rgba(255, 255, 255,0.45)", 0.014);

    /* neck + shadow under the chin */
    fillPath(neckPath(), grad(0, -0.5, 0, -1.0, "rgba(" + SKIN_A + ",1)", "rgba(" + SKIN_C + ",1)"));
    ctx.save();
    trace(neckPath());
    ctx.clip();
    ctx.fillStyle = "rgba(" + SHADOW + ",0.4)";
    ctx.beginPath();
    ctx.ellipse(0, -0.66, 0.22, 0.09, 0, 0, 6.2832);
    ctx.fill();
    ctx.restore();

    /* shoulders / top */
    fillPath(topPath(), grad(0, -0.65, 0, -1.6, "rgba(" + TOP_A + ",1)", "rgba(" + TOP_B + ",1)"));
    // neckline trim
    strokePath(function () {
      ctx.moveTo(-0.155, -0.78);
      ctx.bezierCurveTo(-0.10, -0.67, 0.10, -0.67, 0.155, -0.78);
    }, "rgba(" + SHADOW + ",0.5)", 0.016);

    /* ears (tucked behind the face edge) */
    for (var er = -1; er <= 1; er += 2) {
      ctx.fillStyle = "rgba(" + SKIN_B + ",1)";
      ctx.beginPath();
      ctx.ellipse(er * 0.585, 0.04, 0.085, 0.125, 0, 0, 6.2832);
      ctx.fill();
      (function (ex) {
        strokePath(function () {
          ctx.moveTo(ex - 0.03, 0.10);
          ctx.quadraticCurveTo(ex + 0.02, 0.05, ex - 0.02, 0.0);
        }, "rgba(" + SHADOW + ",0.6)", 0.012);
      })(er * 0.585);
    }

    /* face */
    fillPath(facePath(), function () {
      var g = ctx.createRadialGradient(-0.12, 0.30, 0.05, 0, 0, 1.05);
      g.addColorStop(0, "rgba(" + SKIN_A + ",1)");
      g.addColorStop(1, "rgba(" + SKIN_B + ",1)");
      return g;
    }());

    /* cheeks — a soft feminine blush */
    for (var ch = -1; ch <= 1; ch += 2) {
      ctx.fillStyle = "rgba(" + BLUSH + ",0.36)";
      ctx.beginPath();
      ctx.ellipse(ch * 0.41, -0.14, 0.125, 0.055, 0, 0, 6.2832);
      ctx.fill();
    }

    /* nose — kept subtle */
    strokePath(function () {
      ctx.moveTo(0.015, 0.05);
      ctx.bezierCurveTo(0.028, -0.01, 0.026, -0.075, 0.048, -0.112);
    }, "rgba(" + SHADOW + ",0.55)", 0.014);
    for (var no = -1; no <= 1; no += 2) {
      ctx.fillStyle = "rgba(" + SHADOW + ",0.4)";
      ctx.beginPath();
      ctx.ellipse(no * 0.052, -0.132, 0.018, 0.011, 0, 0, 6.2832);
      ctx.fill();
    }

    drawMouth(P.mouthCurve, ml);
    drawEyes(open, gazeX + P.look * 0.5, gazeY);
    drawBrows(P.brow, P.browTilt);

    /* front hair — bangs + side strands over the face edge */
    fillPath(bangLeftPath(), grad(0, 1.0, 0, 0.3, "rgba(" + BANG_A + ",1)", "rgba(" + BANG_B + ",1)"));
    fillPath(bangRightPath(), grad(0, 1.0, 0, 0.2, "rgba(" + BANG_A + ",1)", "rgba(" + BANG_B + ",1)"));
    fillPath(strandRightPath(), grad(0, 0.3, 0, -1.5, "rgba(" + STRAND_A + ",1)", "rgba(" + STRAND_B + ",1)"));
    fillPath(strandLeftPath(), grad(0, 0.35, 0, -1.45, "rgba(" + STRAND_A + ",1)", "rgba(" + STRAND_B + ",1)"));
    // sheen highlights + strand lines (hair texture)
    strokePath(function () { ctx.moveTo(-0.50, 0.86); ctx.bezierCurveTo(-0.2, 0.92, 0.10, 0.88, 0.36, 0.70); }, "rgba(255, 255, 255,0.55)", 0.016);
    strokePath(function () { ctx.moveTo(-0.05, 0.95); ctx.bezierCurveTo(0.25, 0.95, 0.50, 0.82, 0.60, 0.55); }, "rgba(255, 255, 255,0.45)", 0.014);
    strokePath(function () { ctx.moveTo(-0.45, 0.78); ctx.bezierCurveTo(-0.25, 0.86, -0.05, 0.84, 0.10, 0.78); }, "rgba(255, 255, 255,0.4)", 0.012);
    strokePath(function () { ctx.moveTo(0.15, 0.86); ctx.bezierCurveTo(0.35, 0.76, 0.50, 0.60, 0.58, 0.38); }, "rgba(255, 255, 255,0.38)", 0.012);
    strokePath(function () { ctx.moveTo(-0.60, 0.55); ctx.bezierCurveTo(-0.50, 0.68, -0.38, 0.76, -0.24, 0.78); }, "rgba(255, 255, 255,0.32)", 0.011);
    strokePath(function () { ctx.moveTo(0.72, -0.2); ctx.bezierCurveTo(0.74, -0.6, 0.76, -1.0, 0.78, -1.3); }, "rgba(255, 255, 255,0.4)", 0.012);
    strokePath(function () { ctx.moveTo(-0.70, -0.15); ctx.bezierCurveTo(-0.70, -0.55, -0.72, -0.95, -0.74, -1.25); }, "rgba(255, 255, 255,0.4)", 0.012);
    strokePath(function () { ctx.moveTo(0.60, 0.1); ctx.bezierCurveTo(0.62, -0.3, 0.62, -0.7, 0.66, -1.0); }, "rgba(" + SHADOW + ",0.5)", 0.014);
    strokePath(function () { ctx.moveTo(-0.58, 0.14); ctx.bezierCurveTo(-0.58, -0.28, -0.58, -0.68, -0.62, -1.0); }, "rgba(" + SHADOW + ",0.5)", 0.014);

    /* earrings — small blue-white diamonds at the earlobes */
    for (var ea = -1; ea <= 1; ea += 2) {
      var ex = ea * 0.595;
      ctx.fillStyle = "rgba(" + SKIN_A + ",1)";
      ctx.beginPath();
      ctx.arc(ex, -0.10, 0.020, 0, 6.2832);
      ctx.fill();
      (function (xx) {
        fillPath(function () {
          ctx.moveTo(xx, -0.145);
          ctx.lineTo(xx + 0.028, -0.185);
          ctx.lineTo(xx, -0.225);
          ctx.lineTo(xx - 0.028, -0.185);
          ctx.closePath();
        }, "rgba(255, 255, 255,0.95)");
      })(ex);
      ctx.strokeStyle = "rgba(90, 125, 235,0.8)";
      ctx.lineWidth = 0.008;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255,0.9)";
      ctx.beginPath();
      ctx.arc(ex - 0.012, -0.176, 0.008, 0, 6.2832);
      ctx.fill();
    }

    drawParticles(now, dt, true);

    ctx.restore();
  }

  /* ---------------------------- frame ---------------------------- */
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    drawFrame(now, dt);
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
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    CX = W / 2;
    CY = H * 0.46;
    var m = Math.min(W, H);
    R = m * (m < 450 ? 0.35 : 0.33); // fits hair + shoulders inside the stage
    buildParticles();
    if (reduced) {
      last = performance.now();
      frame(performance.now());
    }
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

  setTarget("neutral"); // seed params so the very first frame is fully visible
  resize();
  if (!reduced) start();

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
