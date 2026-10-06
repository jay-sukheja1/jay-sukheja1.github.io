// Jaykun Garden Animation Script
(() => {
  const WORD = "jaykun";
  const COLORS = {
    text: "#FFFFFF",
    red: "#FF1400",
    flower: "#F9F8F5",
    stem: "#5D8A57",
    innerLine: "#F8DE7E",
    blue: "#3257FF",
    line: "#FFB4A8",
    vein: "#8B7D6B",
  };
  const BOIL = !matchMedia("(prefers-reduced-motion: reduce)").matches;

  const host = document.getElementById("jaykun-garden");
  if (!host) return;

  const cv = document.createElement("canvas"),
    g = cv.getContext("2d");
  host.appendChild(cv);
  const C = COLORS;
  let cc = C,
    W = 0,
    H = 0,
    dpr = 1,
    S = 0,
    letters = [],
    cache = {},
    started = false,
    visible = false,
    mx = null,
    my = 0,
    fa = {},
    flies = [],
    perch = [],
    _fl = 0,
    _now = 0,
    raf = 0;
  let FONT = '"Skranji", sans-serif';

  const h = (n) => {
    const x = Math.sin(n) * 43758.5453;
    return x - Math.floor(x);
  };
  const spr = (t, k = 7, w = 16) =>
    t <= 0 ? 0 : 1 - Math.exp(-t * k) * Math.cos(t * w);
  const eo = (t) =>
    t <= 0 ? 0
    : t >= 1 ? 1
    : 1 - Math.pow(1 - t, 3);
  function rng(seed) {
    let s = seed | 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function bez(a, b, c, d, n) {
    const P = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n,
        u = 1 - t;
      P.push([
        u * u * u * a[0] +
          3 * u * u * t * b[0] +
          3 * u * t * t * c[0] +
          t * t * t * d[0],
        u * u * u * a[1] +
          3 * u * u * t * b[1] +
          3 * u * t * t * c[1] +
          t * t * t * d[1],
      ]);
    }
    return P;
  }
  function at(P, u) {
    const n = P.length,
      i = Math.min(n - 2, Math.max(1, Math.round(u * (n - 1))));
    return [
      P[i],
      Math.atan2(P[i + 1][1] - P[i - 1][1], P[i + 1][0] - P[i - 1][0]),
    ];
  }
  function jit(id, f, amp) {
    if (!amp) return [0, 0, 0];
    return [
      (h(id * 1.37 + f * 7.13) * 2 - 1) * amp,
      (h(id * 2.71 + f * 3.11) * 2 - 1) * amp,
      (h(id * 5.3 + f * 1.7) * 2 - 1) * 0.035,
    ];
  }
  function path(c, p, closed) {
    const n = p.length;
    if (n < 2) return;
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (closed) {
      const s = m(p[n - 1], p[0]);
      c.moveTo(s[0], s[1]);
      for (let i = 0; i < n; i++) {
        const q = m(p[i], p[(i + 1) % n]);
        c.quadraticCurveTo(p[i][0], p[i][1], q[0], q[1]);
      }
      c.closePath();
    } else {
      c.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const q = m(p[i], p[i + 1]);
        c.quadraticCurveTo(p[i][0], p[i][1], q[0], q[1]);
      }
      c.lineTo(p[n - 1][0], p[n - 1][1]);
    }
  }
  const B = {
    fill: (p, col) => {
      g.beginPath();
      path(g, p, true);
      g.fillStyle = col;
      g.fill();
    },
    stroke: (p, col, w) => {
      g.beginPath();
      path(g, p, false);
      g.strokeStyle = col;
      g.lineWidth = w;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.stroke();
    },
    text: (ch, x, y, s, col) => {
      g.font = `500 ${s}px ${FONT}`;
      g.textAlign = "center";
      g.textBaseline = "alphabetic";
      g.fillStyle = col;
      g.fillText(ch, x, y);
    },
  };
  function vine(base, dir, len, amp, waves, ph, bend, n) {
    n = n || 40;
    const P = [[base[0], base[1]]],
      step = len / n;
    let x = base[0],
      y = base[1];
    for (let i = 1; i <= n; i++) {
      const u = i / n,
        a =
          dir +
          bend * u +
          amp * Math.sin(u * Math.PI * waves + ph) * Math.min(1, u * 3);
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      P.push([x, y]);
    }
    return P;
  }
  function curl(P, sign, rad) {
    const n = P.length,
      e = P[n - 1],
      a = Math.atan2(e[1] - P[n - 2][1], e[0] - P[n - 2][0]);
    const c = [
        e[0] - Math.sin(a) * sign * rad,
        e[1] + Math.cos(a) * sign * rad,
      ],
      a0 = Math.atan2(e[1] - c[1], e[0] - c[0]);
    for (let i = 1; i <= 14; i++) {
      const u = i / 14,
        t = a0 + sign * u * Math.PI * 1.6,
        rr = rad * (1 - 0.5 * u);
      P.push([c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr]);
    }
    return P;
  }
  function weave(r, startLayer) {
    const cuts = [],
      nc = 1 + Math.floor(r() * 3);
    for (let i = 0; i < nc; i++) cuts.push(0.15 + r() * 0.7);
    cuts.sort((a, b) => a - b);
    const segs = [];
    let u0 = 0,
      layer = startLayer;
    for (const c of cuts) {
      if (c <= u0) continue;
      segs.push({ u0, u1: c, layer });
      if (r() < 0.3) {
        const gp = 0.02 + r() * 0.03;
        u0 = Math.min(0.98, c + gp);
      } else u0 = c;
      layer = 1 - layer;
    }
    segs.push({ u0, u1: 1, layer });
    return segs;
  }
  const layerAt = (segs, u) => {
    for (const s of segs) if (u >= s.u0 && u <= s.u1) return s.layer;
    return segs[segs.length - 1].layer;
  };

  function mw(ch) {
    if (cache[ch] != null) return cache[ch];
    g.font = `500 100px ${FONT}`;
    return (cache[ch] = g.measureText(ch).width / 100);
  }

  function layout() {
    if (!W) return;
    const nameEl =
      host.closest(".bottom-bar-name") ||
      document.querySelector(".bottom-bar-name");
    const style = getComputedStyle(nameEl);
    S = parseFloat(style.fontSize);
    FONT = style.fontFamily || FONT;
    const letterSpacing = S * 0.02; // letter-spacing: 0.02em

    const ws = letters.map((l) => mw(l.ch) * S + letterSpacing);
    // left: -0.2em, so text starts at x = 0.2 * S
    let x = 0.2 * S;
    // top: -2.5em. Baseline is about 0.82em from top of text bounding box.
    // So baseline is at 2.5em + 0.82em = 3.32em from canvas top.
    const y = 3.32 * S;
    letters.forEach((l, i) => {
      const w = ws[i];
      l.tx = l.x = x + w / 2;
      l.ty = l.y = y;
      l.tw = w;
      x += w;
    });
  }

  function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = window.devicePixelRatio || 1;
    W = r.width;
    H = r.height;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    layout();
  }

  /* ---- growth ---- */
  function wordParams(ws) {
    const r = rng(ws * 7 + 13);
    return {
      roseP: 0.3 + r() * 0.3,
      leafy: 0.6 + r() * 0.8,
      dens: 1,
      lean: (r() - 0.5) * 0.6,
      big: 0.85 + r() * 0.45,
      curvy: 0.8 + r() * 0.6,
      bridgeP: Math.min(0.95, 0.45 + r() * 0.35),
      w: 0.5,
    };
  }
  function grow(r, E, nid, p, o) {
    const tip =
      o.tip ||
      (r() < p.roseP ? "rose"
      : r() < 0.45 ? "fan"
      : r() < 0.6 ? "leaf"
      : "curl");
    let P =
      o.pts ||
      vine(
        o.base,
        o.dir,
        o.len,
        (0.35 + r() * 0.45) * p.curvy,
        1 + r() * 1.6,
        r() * 6.28,
        (r() - 0.5) * 1.2,
        40,
      );
    if (tip === "curl") P = curl(P, r() < 0.5 ? -1 : 1, 0.05 + r() * 0.05);
    const segs = weave(
        r,
        o.layer0 != null ? o.layer0
        : r() < 0.5 ? 0
        : 1,
      ),
      dur = Math.max(320, (o.len || 0.8) * 620),
      thorns = [],
      nt = Math.floor(r() * 2.5);
    for (let i = 0; i < nt; i++)
      thorns.push({ u: 0.15 + r() * 0.65, s: r() < 0.5 ? -1 : 1 });
    E.push({
      t: "stem",
      id: nid(),
      pts: P,
      segs,
      d0: o.d0,
      dur,
      w: o.depth ? 0.82 : 1,
      thorns,
    });
    const nl = Math.floor(r() * 2.8 * p.leafy);
    let sd = r() < 0.5 ? -1 : 1;
    for (let i = 0; i < nl; i++) {
      const u = 0.25 + r() * 0.6,
        [q, a] = at(P, u);
      sd = -sd;
      E.push({
        t: "leaf",
        id: nid(),
        x: q[0],
        y: q[1],
        a: a + sd * (0.55 + r() * 0.5),
        L: (0.14 + r() * 0.2) * (o.depth ? 0.8 : 1),
        bend: (r() - 0.5) * 1.2,
        layer: layerAt(segs, u),
        d0: o.d0 + dur * u,
      });
    }
    const [tp, ta] = at(P, 1),
      td = o.d0 + dur * 0.8,
      tl = layerAt(segs, 1);
    if (tip === "rose") {
      const R = (0.13 + r() * 0.15) * p.big * (o.depth ? 0.75 : 1);
      const over = tp[1] > -0.78 && tp[1] < 0.05 && Math.abs(tp[0]) < p.w * 0.5;
      const layer =
        over ?
          r() < 0.22 ?
            1
          : 0
        : r() < 0.6 ? 1
        : tl;
      E.push({
        t: "rose",
        id: nid(),
        x: tp[0],
        y: tp[1],
        R,
        rot: (r() - 0.5) * 1.0,
        ph1: r() * 6.28,
        ph2: r() * 6.28,
        turns: 1.8 + r() * 1,
        layer,
        d0: td,
      });
      if (r() < 0.2) {
        const oo = ta + (r() < 0.5 ? 1 : -1) * 1.3;
        E.push({
          t: "rose",
          id: nid(),
          x: tp[0] + Math.cos(oo) * R * 1.4,
          y: tp[1] + Math.sin(oo) * R * 1.4,
          R: R * (0.6 + r() * 0.3),
          rot: (r() - 0.5) * 1.2,
          ph1: r() * 6.28,
          ph2: r() * 6.28,
          turns: 1.8 + r(),
          layer,
          d0: td + 120,
        });
      }
    } else if (tip === "fan") {
      const spread = 0.6 + r() * 0.3;
      for (let j = 0; j < 2; j++)
        E.push({
          t: "leaf",
          id: nid(),
          x: tp[0],
          y: tp[1],
          a: ta + (j - 0.5) * spread,
          L: 0.2 + r() * 0.2,
          bend: (j - 0.5) * 0.8,
          layer: tl,
          d0: td + j * 60,
        });
    } else if (tip === "leaf") {
      E.push({
        t: "leaf",
        id: nid(),
        x: tp[0],
        y: tp[1],
        a: ta + (r() - 0.5) * 0.3,
        L: 0.16 + r() * 0.16,
        bend: r() - 0.5,
        layer: tl,
        d0: td,
      });
    }
    if (!o.depth && r() < 0.3) {
      const u = 0.35 + r() * 0.35,
        [q, a] = at(P, u);
      grow(r, E, nid, p, {
        base: q,
        dir: a + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.4),
        len: (o.len || 0.8) * (0.35 + r() * 0.2),
        d0: o.d0 + dur * u,
        depth: 1,
        layer0: layerAt(segs, u),
      });
    }
    return P;
  }
  function gen(l) {
    const r = rng(
        (l.ws ^ Math.imul(l.wi + 1, 2654435761)) +
          Math.floor(Math.random() * 1e6),
      ),
      p = wordParams(l.ws),
      E = [];
    let k0 = 0;
    const nid = () => l.id * 100 + k0++;
    const w = mw(l.ch),
      inX = () => (r() - 0.5) * w * 0.7;
    p.w = w;
    const nUp = 1 + (r() < 0.45 ? 1 : 0);
    for (let i = 0; i < nUp; i++)
      grow(r, E, nid, p, {
        base: [inX(), -r() * 0.3],
        dir: -Math.PI / 2 + p.lean * 0.5 + (r() - 0.5) * 0.7,
        len: 0.6 + r() * 0.5,
        d0: 40 + i * 130,
        tip: l.wi === 0 && i === 0 ? "rose" : null,
      });
    if (r() < 0.4)
      grow(r, E, nid, p, {
        base: [inX(), -0.1 - r() * 0.35],
        dir: Math.PI / 2 + (r() - 0.5) * 0.8,
        len: 0.35 + r() * 0.35,
        d0: 160,
      });
    if (l.prev && r() < p.bridgeP) {
      const px = -(mw(l.prev.ch) + w) / 2;
      const a = [inX(), -0.05 - r() * 0.55],
        b = [px + (r() - 0.5) * 0.25, -0.05 - r() * 0.55];
      const bulge = (r() < 0.55 ? -1 : 1) * (0.4 + r() * 0.4),
        dx = b[0] - a[0];
      let P = bez(
        a,
        [a[0] + dx * 0.15, a[1] + bulge],
        [b[0] - dx * 0.15, b[1] + bulge * 0.9],
        b,
        40,
      );
      if (r() < 0.45) P = P.slice(0, Math.floor(P.length * (0.7 + r() * 0.2)));
      grow(r, E, nid, p, {
        pts: P,
        len: Math.abs(dx) + Math.abs(bulge),
        d0: 90,
        tip:
          r() < 0.5 ? "curl"
          : r() < 0.5 ? "leaf"
          : "rose",
      });
    }
    if (l.wi === 0)
      grow(r, E, nid, p, {
        base: [-w * 0.3, -0.15 - r() * 0.4],
        dir: Math.PI + (r() - 0.5) * 1.2,
        len: 0.45 + r() * 0.3,
        d0: 120,
        tip: "curl",
      });
    l.els = E;
    const T = [],
      tr = rng(l.id * 977 + Math.floor(Math.random() * 1e6));
    grow(tr, T, () => l.id * 100 + 90 + T.length, p, {
      base: [w * 0.25, -0.1 - tr() * 0.45],
      dir: (tr() - 0.5) * 1.4,
      len: 0.45 + tr() * 0.25,
      d0: 0,
      tip: "curl",
      depth: 1,
    });
    l.tend = T.filter((e) => e.t === "stem").slice(0, 1);
  }
  function genEnd(l, rel) {
    const r = rng(l.ws + l.wi * 31 + Math.floor(Math.random() * 1e6)),
      p = wordParams(l.ws),
      E = [];
    let k0 = 50;
    const nid = () => l.id * 100 + k0++;
    const w = mw(l.ch),
      n = 2 + Math.floor(r() * 2);
    p.w = w;
    for (let i = 0; i < n; i++) {
      const dir =
        -Math.PI / 2 + 0.6 + (i - (n - 1) / 2) * 0.9 + (r() - 0.5) * 0.4;
      grow(r, E, nid, p, {
        base: [(r() - 0.2) * w * 0.6, -r() * 0.5],
        dir,
        len: 0.4 + r() * 0.45,
        d0: rel + 40 + i * 90,
        depth: 1,
        tip: i === 0 || r() < 0.5 ? "rose" : "fan",
      });
    }
    l.endEls = E;
  }
  /* ---- drawing ---- */
  function strokeRange(P, a, b, col, w) {
    const n = P.length - 1,
      ia = a * n,
      ib = b * n;
    const lerp = (t) => {
      const i = Math.min(n - 1, Math.floor(t)),
        f = t - i;
      return [
        P[i][0] + (P[i + 1][0] - P[i][0]) * f,
        P[i][1] + (P[i + 1][1] - P[i][1]) * f,
      ];
    };
    const pts = [lerp(ia)];
    for (let i = Math.floor(ia) + 1; i < ib; i++) pts.push(P[i]);
    pts.push(lerp(ib));
    if (pts.length >= 2) B.stroke(pts, col, w);
  }
  function thorn(P, u, s) {
    const [p, a] = at(P, u),
      d = a + s * 2.3,
      L = S * 0.045;
    B.stroke(
      [p, [p[0] + Math.cos(d) * L, p[1] + Math.sin(d) * L]],
      cc.stem,
      S * 0.022,
    );
  }
  function leaf(bx, by, a, L, bend) {
    if (L < 0.5) return;
    const ca = Math.cos(a),
      sa = Math.sin(a),
      px = -sa,
      py = ca;
    const ax = (u) => {
      const b = Math.sin(Math.PI * u) * bend * 0.15 * L;
      return [bx + ca * u * L + px * b, by + sa * u * L + py * b];
    };
    const hw = (u) => L * 0.18 * Math.sin(Math.PI * Math.pow(u, 0.8));
    const N = 12,
      s1 = [],
      s2 = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N,
        c = ax(u),
        w = hw(u);
      s1.push([c[0] + px * w, c[1] + py * w]);
      s2.push([c[0] - px * w, c[1] - py * w]);
    }
    const tip = ax(1),
      base = ax(0);
    B.fill(
      [base, ...s1.slice(1, N), tip, tip, ...s2.slice(1, N).reverse(), base],
      cc.stem,
    );
    if (L > 6) {
      const v = [];
      for (let i = 0; i <= 8; i++) v.push(ax(0.08 + (0.72 * i) / 8));
      B.stroke(v, cc.vein, Math.max(0.8, L * 0.03));
    }
  }
  function rose(cx_, cy_, R, rot, e, a, tl) {
    const cr = Math.cos(rot),
      sr = Math.sin(rot);
    const tm = tl ? Math.hypot(tl[0], tl[1]) : 0,
      ux = tm ? tl[0] / tm : 0,
      uy = tm ? tl[1] / tm : 0,
      sq = -0.28 * tm;
    const T = (x, y, z = 0) => {
      let dx = x * cr - y * sr,
        dy = x * sr + y * cr;
      if (tm) {
        const k = (dx * ux + dy * uy) * sq;
        dx += k * ux + tl[0] * R * z;
        dy += k * uy + tl[1] * R * z;
      }
      return [cx_ + dx, cy_ + dy];
    };
    const P = [
      [0, -0.36, 0.56, 0.54, 0, 0, 0],
      [-0.5, -0.06, 0.6, 0.6, -0.35, 0, 0],
      [0.52, -0.06, 0.6, 0.6, 0.35, 0, 0],
      [-0.42, 0.3, 0.62, 0.48, 0.2, 0.12, 1],
      [0.47, 0.3, 0.62, 0.48, -0.2, 0.12, 1],
      [0.05, 0.42, 0.56, 0.38, 0, 0.14, 0],
    ];
    const ax0 = 0,
      ay0 = 0.5,
      lw = Math.max(0.8, R * 0.045),
      st = 85;
    P.forEach((q, i) => {
      const s = spr((a - i * st) / 1000, 8, 14);
      if (s <= 0.001) return;
      const open = (1 - Math.min(1, s)) * (q[0] < 0 ? 0.5 : -0.5),
        ang = q[4] + open,
        ca = Math.cos(ang),
        sa = Math.sin(ang);
      const pt = (th) => {
        const rr =
          1 +
          0.08 * Math.sin(3 * th + e.ph1 + i) +
          0.04 * Math.sin(5 * th + e.ph2);
        const lx = Math.cos(th) * q[2] * rr,
          ly = Math.sin(th) * q[3] * rr,
          px = q[0] + lx * ca - ly * sa,
          py = q[1] + lx * sa + ly * ca;
        return T((ax0 + (px - ax0) * s) * R, (ay0 + (py - ay0) * s) * R, q[5]);
      };
      const pts = [];
      for (let k = 0; k < 26; k++) pts.push(pt((k / 26) * Math.PI * 2));
      B.fill(pts, cc.flower);
      if (q[6] && R >= 12 && s > 0.4) {
        const arc = [];
        for (let k = 0; k <= 14; k++)
          arc.push(pt(Math.PI * (1.18 + (0.64 * k) / 14)));
        strokeRange(arc, 0, Math.min(1, (s - 0.4) / 0.5), cc.innerLine, lw * 0.8);
      }
    });
    const fr = eo((a - P.length * st - 80) / 520);
    if (fr > 0 && R > 3) {
      const sp = [],
        scl = [],
        turns =
          R < 20 ? Math.min(e.turns, 1.3)
          : R < 32 ? e.turns * 0.8
          : e.turns;
      for (let i = 0; i <= 70; i++) {
        const u = i / 70,
          th = e.ph1 + u * turns * Math.PI * 2,
          rr = R * (0.08 + 0.57 * u);
        sp.push(
          T(
            Math.cos(th) * rr * 1.05,
            Math.sin(th) * rr * 0.72 - 0.12 * R,
            0.34 - 0.24 * u,
          ),
        );
      }
      strokeRange(sp, 0, fr, cc.innerLine, lw);
      if (R >= 14) {
        for (let i = 0; i <= 36; i++) {
          const u = i / 36;
          scl.push(
            T(
              (-0.72 + 1.5 * u) * R,
              0.36 * R + 0.16 * R * Math.abs(Math.sin(u * Math.PI * 3)),
              0.18,
            ),
          );
        }
        strokeRange(scl, 0, fr, cc.innerLine, lw);
      }
    }
  }
  function faceTurn(e, x, y) {
    let wx = 0,
      wy = 0;
    if (mx != null) {
      const dx = mx - x,
        dy = my - y,
        d = Math.hypot(dx, dy),
        reach = 300;
      if (d < reach && d > 0.001) {
        const w = 1 - d / reach,
          s = w * w * (3 - 2 * w) * Math.min(1, d / 40);
        wx = (dx / d) * s;
        wy = (dy / d) * s;
      }
    }
    const c = fa[e.id] || [0, 0];
    c[0] += (wx - c[0]) * 0.09;
    c[1] += (wy - c[1]) * 0.09;
    fa[e.id] = c;
    return c;
  }
  function wpt(l, x, y) {
    const t = (_now - l.birth) / 1000;
    if (t > 0 && t < 2.5) {
      const hh = Math.max(0, (l.y - y) / S),
        dmp = Math.exp(-t * 3.2),
        dir = l.id % 2 ? 1 : -1;
      x += S * 0.07 * hh * dmp * Math.sin(t * 11) * dir;
      y += S * 0.035 * hh * dmp * Math.sin(t * 11 + 1.2);
    }
    if (l.lean) {
      const hh = Math.min(2.5, Math.max(0, (l.y - y) / S)),
        f = hh * hh * 0.5 + hh * 0.5;
      x += l.lean[0] * S * 0.1 * f;
      y += l.lean[1] * S * 0.05 * f;
    }
    return [x, y];
  }
  function drawStem(e, l, age, f, amp, layer, frO) {
    const fr = frO != null ? frO : eo((age - e.d0) / e.dur);
    if (fr <= 0) return;
    const j = jit(e.id, f, amp),
      P = e.pts.map((p) =>
        wpt(l, l.x + p[0] * S + j[0], l.y + p[1] * S + j[1]),
      );
    for (const sg of e.segs) {
      if (sg.layer !== layer) continue;
      const b = Math.min(sg.u1, fr);
      if (b <= sg.u0) continue;
      strokeRange(P, sg.u0, b, cc.stem, S * 0.022 * (e.w || 1));
    }
    for (const th of e.thorns)
      if (fr > th.u && layerAt(e.segs, th.u) === layer) thorn(P, th.u, th.s);
  }
  function drawEl(e, l, age, f, amp) {
    const j = jit(e.id, f, amp),
      wx = (x, y) => wpt(l, l.x + x * S + j[0], l.y + y * S + j[1]);
    if (e.t === "leaf") {
      const sc = spr((age - e.d0) / 1000, 7, 15);
      if (sc <= 0) return;
      const p = wx(e.x, e.y);
      leaf(p[0], p[1], e.a + j[2], e.L * S * sc, e.bend);
    } else {
      const a = age - e.d0;
      if (a < 0) return;
      const p = wx(e.x, e.y),
        tl = faceTurn(e, p[0], p[1]);
      if (a > 700) perch.push({ id: e.id, x: p[0], y: p[1], R: e.R * S });
      rose(p[0], p[1], e.R * S, e.rot + j[2] + tl[0] * 0.22, e, a, tl);
    }
  }
  function render(now) {
    cc = C;
    _now = now;
    perch = [];
    for (const l of letters) {
      let tx = 0,
        ty = 0;
      if (mx != null) {
        const dx = mx - l.x,
          dy = my - (l.y - S * 0.6),
          d = Math.hypot(dx, dy),
          reach = Math.max(260, S * 3.2);
        if (d < reach && d > 1) {
          const w = 1 - d / reach,
            s = w * w * (3 - 2 * w);
          tx = (dx / d) * s;
          ty = (dy / d) * s;
        }
      }
      const c = l.lean || (l.lean = [0, 0]);
      c[0] += (tx - c[0]) * 0.07;
      c[1] += (ty - c[1]) * 0.07;
    }
    const f = BOIL ? Math.floor(now / 120) : 0,
      amp = BOIL ? Math.max(0.8, S * 0.01) : 0;
    const draw = (layer) => {
      letters.forEach((l, i) => {
        const age = now - l.birth;
        if (age < 0) return;
        const each = (e) => {
          if (e.t === "stem") drawStem(e, l, age, f, amp, layer);
          else if (e.layer === layer) drawEl(e, l, age, f, amp);
        };
        l.els.forEach(each);
        if (l.endEls) l.endEls.forEach(each);
        if (l.tend && !letters[i + 1]) {
          const fr = eo((age - 150) / 450);
          for (const e of l.tend) drawStem(e, l, age, f, amp, layer, fr);
        }
      });
    };
    draw(0);
    for (const l of letters)
      if (now >= l.birth) B.text(l.ch, l.x, l.y, S, C.text);
    draw(1);
  }
  /* ---- butterflies: click a flower and one flies in ---- */
  function spawnFly(px, py) {
    if (flies.length >= 6) {
      const o = flies.find((f) => f.st !== "leave");
      if (o) flyOff(o);
    }
    const taken = new Set(
      flies.filter((f) => f.st !== "leave").map((f) => f.pid),
    );
    let best = null,
      bd = 1e9;
    for (const p of perch) {
      if (taken.has(p.id)) continue;
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    flies.push({
      x: px < W / 2 ? -40 : W + 40,
      y: py + (Math.random() - 0.5) * H * 0.4,
      vx: 0,
      vy: 0,
      st: best ? "fly" : "wander",
      pid: best ? best.id : null,
      hx: px,
      hy: py,
      t0: performance.now(),
      ph: Math.random() * 6,
      sz: Math.max(9, S * 0.09),
      seed: Math.random() * 100,
      ang: 0,
      open: 1,
    });
  }
  function flyOff(f) {
    f.st = "leave";
    f.pid = null;
    f.ex = f.x < W / 2 ? -80 : W + 80;
    f.ey = f.y - H * 0.3;
  }
  function drawFlies(now) {
    const dt = Math.min(48, now - (_fl || now));
    _fl = now;
    const byId = {};
    for (const p of perch) byId[p.id] = p;
    flies = flies.filter((f) => {
      const t = (now - f.t0) / 1000;
      let tx, ty;
      if (f.st === "sit" || f.st === "fly") {
        const p = byId[f.pid];
        if (!p) flyOff(f);
        else {
          tx = p.x + p.R * 0.05;
          ty = p.y - p.R * 0.55;
        }
      }
      if (f.st === "wander") {
        tx = f.hx + Math.sin(t * 1.3 + f.seed) * 70;
        ty = f.hy + Math.sin(t * 2.1 + f.seed) * 40;
        if (t > 3.5) flyOff(f);
      }
      if (f.st === "leave") {
        tx = f.ex;
        ty = f.ey;
      }
      if (f.st === "sit") {
        f.x += (tx - f.x) * 0.35;
        f.y += (ty - f.y) * 0.35;
        f.ang *= 0.85;
        f.ph += dt * 0.004;
        const burst = Math.sin((now / 1000) * 0.9 + f.seed) > 0.75;
        f.open =
          burst ?
            0.2 + 0.8 * Math.abs(Math.cos((now / 1000) * 9 + f.seed))
          : 0.25 + 0.15 * Math.sin(f.ph);
      } else {
        const dx = tx - f.x,
          dy = ty - f.y,
          d = Math.hypot(dx, dy) || 1,
          sp = f.st === "leave" ? 0.42 : Math.min(0.34, 0.06 + d * 0.0016);
        const flut = Math.sin(t * 7 + f.seed) * 0.12,
          wob = Math.cos(t * 4.3 + f.seed) * 0.1;
        const ax = (dx / d) * sp + wob - f.vx,
          ay = (dy / d) * sp + flut - f.vy;
        f.vx += (ax * 0.06 * dt) / 16;
        f.vy += (ay * 0.06 * dt) / 16;
        f.x += f.vx * dt;
        f.y += f.vy * dt + Math.sin(t * 13 + f.seed) * 0.6;
        f.ang += (Math.max(-0.5, Math.min(0.5, f.vx * 1.4)) - f.ang) * 0.1;
        f.open = Math.abs(Math.cos(t * 17 + f.seed));
        if (f.st === "fly" && d < 5) {
          f.st = "sit";
          f.ph = 0;
        }
        if (f.st === "leave" && (f.x < -60 || f.x > W + 60 || f.y < -60))
          return false;
      }
      butterfly(f.x, f.y, f.sz, f.ang, f.open);
      return true;
    });
  }
  function butterfly(x, y, s, ang, o) {
    const ca = Math.cos(ang),
      sa = Math.sin(ang),
      T = (px, py) => [
        x + (px * ca - py * sa) * s,
        y + (px * sa + py * ca) * s,
      ];
    const wing = (wx, wy, rx, ry, a, side) => {
      const pts = [],
        c = Math.cos(a),
        sn = Math.sin(a);
      for (let k = 0; k < 22; k++) {
        const th = (k / 22) * Math.PI * 2,
          r = 1 + 0.08 * Math.sin(th * 3),
          lx = Math.cos(th) * rx * r,
          ly = Math.sin(th) * ry * r;
        pts.push(
          T(
            side * (wx + lx * c - ly * sn) * (0.12 + 0.88 * o),
            wy + lx * sn + ly * c,
          ),
        );
      }
      return pts;
    };
    for (const sd of [-1, 1]) {
      B.fill(wing(0.46, 0.28, 0.36, 0.3, 0.5, sd), C.text);
      B.fill(wing(0.55, -0.32, 0.55, 0.36, -0.55, sd), C.text);
      if (o > 0.35) B.fill(wing(0.66, -0.4, 0.13, 0.11, 0, sd), C.red);
    }
    const body = [];
    for (let k = 0; k < 18; k++) {
      const th = (k / 18) * Math.PI * 2;
      body.push(T(Math.cos(th) * 0.08, Math.sin(th) * 0.48));
    }
    B.fill(body, C.blue);
    const lw = Math.max(0.8, s * 0.05);
    B.stroke([T(0, -0.42), T(-0.14, -0.72), T(-0.24, -0.86)], C.blue, lw);
    B.stroke([T(0, -0.42), T(0.14, -0.72), T(0.24, -0.86)], C.blue, lw);
  }
  /* ---- run ---- */
  function build() {
    const ws = Math.floor(Math.random() * 1e9);
    letters = [];
    let prev = null;
    [...WORD].forEach((ch, i) => {
      const l = { ch, id: i + 1, ws, wi: i, prev, birth: 0 };
      gen(l);
      letters.push(l);
      prev = l;
    });
    layout();
  }
  function start() {
    const now = performance.now();
    letters.forEach((l, i) => {
      l.birth = now + 250 + i * 170;
    });
    const last = letters[letters.length - 1];
    genEnd(last, last.birth - now);
    started = true;
  }
  function frame() {
    raf = 0;
    if (!visible) return;
    raf = requestAnimationFrame(frame);
    const now = performance.now();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (started) {
      render(now);
      drawFlies(now);
    }
  }
  function kick() {
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }
  const local = (e) => {
    const r = cv.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  window.addEventListener("pointermove", (e) => {
    const p = local(e);
    mx = p[0];
    my = p[1];
  });
  document.addEventListener("pointerleave", () => {
    mx = null;
  });
  cv.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "mouse") mx = null;
  });
  cv.addEventListener("pointerdown", (e) => {
    if (!started) return;
    const p = local(e);
    spawnFly(p[0], p[1]);
  });
  new ResizeObserver(resize).observe(host);
  resize();
  build();
  (document.fonts ?
    document.fonts.load(`500 100px ${FONT}`).catch(() => {})
  : Promise.resolve()
  ).then(() => {
    cache = {};
    layout();
  });
  new IntersectionObserver(
    (es) => {
      visible = es[0].isIntersecting;
      if (visible && !started) start();
      kick();
    },
    { threshold: 0.35 },
  ).observe(host);
})();
