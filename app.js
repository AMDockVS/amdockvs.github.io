const rnd = (n) => Math.random() * n;

class CanvasAnimations {
  state = { motion: (() => { try { return localStorage.getItem("amdockvs-motion") !== "off"; } catch (e) { return true; } })() };
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv = new Map();

  start() {
    this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.io = new IntersectionObserver((es) => {
      for (const e of es) for (const r of this.cv.values()) if (r.el === e.target) r.vis = e.isIntersecting;
    }, { rootMargin: "160px" });
    this.ensureLoop();
  }

  ensureLoop() {
    if (this.loop) { if (!this.raf) this.raf = requestAnimationFrame(this.loop); return; }
    if (this.reduce === undefined) this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.last = 0;
    this.loop = (ts) => {
      this.raf = requestAnimationFrame(this.loop);
      const dt = this.last ? Math.min((ts - this.last) / 1000, 0.05) : 0.016;
      this.last = ts;
      this.tick(dt);
    };
    // rAF is suspended while the document is hidden (preview panes, background tabs);
    // this keeps a first frame on screen and the sims advancing there.
    if (!this.iv) this.iv = setInterval(() => { if (document.hidden) this.tick(0.12); }, 120);
    if (!this.kick) {
      this.kick = () => { this.last = 0; if (!this.raf) this.raf = requestAnimationFrame(this.loop); };
      document.addEventListener("visibilitychange", this.kick);
    }
    setTimeout(() => { this.tick(0.25); this.tick(0.25); }, 0);
  }

  tick(dt) {
    const live = this.state.motion && !this.reduce;
    for (const r of this.cv.values()) {
      if (!r.vis || !r.w) continue;
      if (!live && r.settled) continue;
      r.acc = (r.acc || 0) + dt;
      const frame = r.kind === "matrix" ? 0.2 : r.kind === "hero" ? 0.02 : 0.045;
      if (r.acc < frame) continue;
      try {
        this.step(r, r.acc);
        this.paint(r);
      } catch (err) {
        if (!this.errLogged) { this.errLogged = true; console.error("[canvas]", r.kind, err); }
      }
      r.acc = 0;
      if (!live) r.settled = true;
    }
  }

  mount(key, kind, el) {
    const rec = { el, kind, sim: null, w: 0, h: 0, vis: true, settled: false };
    this.cv.set(key, rec);
    rec.ro = new ResizeObserver(() => this.fit(rec));
    rec.ro.observe(el);
    this.fit(rec);
    if (this.io) this.io.observe(el);
    this.ensureLoop();
  }

  fit(rec) {
    const r = rec.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    rec.dpr = rec.kind === "matrix" ? 1 : this.dpr;
    rec.el.width = Math.round(r.width * rec.dpr);
    rec.el.height = Math.round(r.height * rec.dpr);
    rec.w = r.width; rec.h = r.height; rec.sim = null; rec.settled = false;
  }

  colors(el) {
    if (this.colorCache) return this.colorCache;
    const cs = getComputedStyle(el);
    const v = (n, f) => (cs.getPropertyValue(n) || "").trim() || f;
    this.colorCache = {
      ACC: v("--color-accent", "#9184d9"),
      LIT: v("--color-accent-300", "#d2cefd"),
      MID: v("--color-accent-400", "#b5abfc"),
      DIM: v("--color-accent-700", "#5d5294"),
      INK: v("--color-text", "#e9e9ed"),
      MUT: v("--color-neutral-400", "#b2b6ca"),
      GHO: v("--color-neutral-600", "#75798c"),
      EDGE: v("--color-neutral-800", "#3f424d")
    };
    return this.colorCache;
  }

  // ——— sims ———
  seed(rec) {
    const k = rec.kind;
    if (k === "hero") return { t: 0, parts: [], spawn: 0, kept: 0, culled: 0, stack: [], tasks: [], done: 0, nodes: Array.from({ length: 12 }, () => ({ busy: 0, done: 0 })) };
    if (k === "matrix") return { t: 0 };

    if (k === "prep" || k === "recep") return { t: 0, st: 0, ph: 0, rot: 0 };
    if (k === "site") return { t: 0, sel: 0, next: 0, sites: [{ a: 1.0, r: 0.52, score: 0.86, c: [12.4, -3.1, 8.7] }, { a: 2.6, r: 0.66, score: 0.71, c: [-4.8, 10.2, 21.3] }, { a: 4.3, r: 0.44, score: 0.58, c: [27.6, 1.9, -6.4] }] };
    if (k === "engines") return { t: 0, lanes: [{ n: "VINA 1.2.7", tag: "CLASSICAL", p: 0, v: 0.5 }, { n: "QUICKVINA2", tag: "CLASSICAL", p: 0.3, v: 0.78 }, { n: "GNINA", tag: "AI", p: 0.1, v: 0.33 }] };
    if (k === "cluster") return { t: 0, p: 0, cents: [0, 1, 2].map(() => ({ x: 0.2 + rnd(0.6), y: 0.2 + rnd(0.6) })), pts: Array.from({ length: 80 }, () => ({ x: rnd(1), y: rnd(1), c: Math.floor(rnd(3)), ox: (Math.random() - 0.5) * 0.16, oy: (Math.random() - 0.5) * 0.16 })) };
    if (k === "qsar") return { t: 0, n: 0, pts: Array.from({ length: 46 }, () => { const x = 0.06 + rnd(0.88); return { x, y: Math.max(0.04, Math.min(0.96, x + (Math.random() - 0.5) * 0.22)) }; }) };
    if (k === "dock") return { t: 0, i: 0, ph: 0 };
    if (k === "vs") return { t: 0, cycle: 0, rows: Array.from({ length: 7 }, (_, i) => ({ y: i / 6, ty: i / 6, score: -(6 + rnd(5)) })) };
    if (k === "htp") return { t: 0, spawn: 0, done: 0, hold: 0, cells: Array.from({ length: 24 }, () => ({ st: 0, t: 0 })) };
    return { t: 0, k: 0, next: 1.5 };
  }

  step(rec, dt) {
    if (!rec.sim) {
      rec.sim = this.seed(rec);
      const warm = rec.kind === "hero" ? 230 : rec.kind === "matrix" ? 0 : 30;
      for (let i = 0; i < warm; i++) this.advance(rec, 0.033);
    }
    this.advance(rec, dt);
  }

  advance(rec, dt) {
    const s = rec.sim, k = rec.kind;
    s.t += dt;
    if (k === "hero") return this.advanceHero(s, dt);
    if (k === "matrix") return;
    if (k === "prep" || k === "recep") { const D = k === "prep" ? [2.2, 1.8, 2.2, 2.4, 2.2, 2.4] : [2.4, 2.8, 2.4, 2.4], th = k === "prep" ? 2 : 1; s.ph += dt; if (s.st >= th) s.rot += dt * 0.35; if (s.ph > D[s.st]) { s.ph = 0; s.st = (s.st + 1) % D.length; if (s.st === th || s.st === 0) s.rot = 0; } return; }
    if (k === "site") { s.next -= dt; if (s.next <= 0) { s.next = 2.2; s.sel = (s.sel + 1) % s.sites.length; } return; }
    if (k === "engines") { for (const l of s.lanes) { l.p += dt * l.v; if (l.p > 1.18) l.p = 0; } return; }
    if (k === "cluster") {
      s.p += dt / 3.2;
      if (s.p > 2.4) { s.p = 0; s.cents = s.cents.map(() => ({ x: 0.2 + rnd(0.6), y: 0.2 + rnd(0.6) })); for (const p of s.pts) { p.x = rnd(1); p.y = rnd(1); p.c = Math.floor(rnd(3)); } }
      return;
    }
    if (k === "qsar") { s.n = Math.min(s.pts.length, s.n + dt * 9); return; }
    if (k === "dock") { s.ph += dt; if (s.ph > (s.i === 4 ? 3.2 : 1.9)) { s.ph = 0; s.i = (s.i + 1) % 5; } return; }
    if (k === "vs") {
      s.cycle -= dt;
      if (s.cycle <= 0) {
        s.cycle = 2.8;
        for (const r of s.rows) r.score = -(5.5 + rnd(6));
        [...s.rows].sort((a, b) => a.score - b.score).forEach((r, i) => { r.ty = i / (s.rows.length - 1); r.rank = i; });
      }
      for (const r of s.rows) r.y += (r.ty - r.y) * Math.min(1, dt * 9);
      return;
    }
    if (k === "htp") {
      s.spawn -= dt;
      const pend = s.cells.filter((c) => c.st === 0);
      if (s.spawn <= 0 && pend.length) { s.spawn = 0.14; const c = pend[Math.floor(rnd(pend.length))]; c.st = 1; c.t = 0.5 + rnd(0.9); }
      for (const c of s.cells) if (c.st === 1) { c.t -= dt; if (c.t <= 0) { c.st = 2; s.done++; } }
      if (!pend.length && !s.cells.some((c) => c.st === 1)) { s.hold += dt; if (s.hold > 1.4) { s.hold = 0; s.done = 0; for (const c of s.cells) c.st = 0; } }
      return;
    }
    s.next -= dt;
    if (s.next <= 0) { s.next = 1.5; s.k = (s.k + 1) % 7; }
  }

  advanceHero(s, dt) {
      s.spawn -= dt;
      let guard = 0;
      const N = s.nodes.length;
      while (s.spawn <= 0 && guard++ < 40) {
        s.spawn += 0.012;
        if (s.parts.length < 900) s.parts.push({ x: 0, y: rnd(1), v: 0.14 + rnd(0.1), stage: 0, dead: 0, drift: (Math.random() - 0.5) * 0.5 });
      }
      const gates = [0.18, 0.36, 0.54, 0.72, 0.88], keep = [0.55, 0.5, 0.45, 0.4, 0.3];
      for (const p of s.parts) {
        if (p.dead) { p.dead += dt; p.y += dt * 0.28 * (1 + p.drift); p.x += dt * 0.02; continue; }
        p.x += dt * p.v;
        const g = gates[p.stage];
        if (g !== undefined && p.x >= g) {
          if (s.tasks.length < 22 && Math.random() < 0.05 + p.stage * 0.025) {
            const free = s.nodes.map((n, i) => i).filter((i) => s.nodes[i].busy <= 0);
            s.tasks.push({ gx: g, gy: p.y, g: p.stage, node: free.length ? free[Math.floor(rnd(free.length))] : Math.floor(rnd(N)), p: 0, dir: 1 });
          }
          p.stage++;
          if (Math.random() > keep[p.stage - 1]) { p.dead = 0.001; s.culled++; }
          else { const pull = 0.34 + p.stage * 0.1; p.y = 0.5 + (p.y - 0.5) * (1 - pull); }
        }
        if (p.x > 1) { p.gone = true; s.kept++; s.stack.unshift({ y: p.y, age: 0 }); s.stack.length = Math.min(s.stack.length, 26); }
      }
      for (const k of s.tasks) {
        if (k.dir === 1) { k.p += dt * 0.7; if (k.p >= 1) { k.p = 1; k.dir = 0; k.wait = 0.9 + rnd(0.9); const nd = s.nodes[k.node]; nd.busy = Math.max(nd.busy, k.wait); } }
        else if (k.dir === 0) { k.wait -= dt; if (k.wait <= 0) k.dir = -1; }
        else { k.p -= dt * 0.8; if (k.p <= 0) { k.dead = true; s.done++; s.nodes[k.node].done++; } }
      }
      s.tasks = s.tasks.filter((k) => !k.dead);
      for (const h of s.stack) h.age += dt;
      for (const n of s.nodes) n.busy = Math.max(0, n.busy - dt);
      s.parts = s.parts.filter((p) => !p.gone && (!p.dead || (p.dead < 1.4 && p.y < 1.3)));
  }

  paint(rec) {
    const ctx = rec.el.getContext("2d");
    const W = rec.w, H = rec.h, s = rec.sim, C = this.colors(rec.el), k = rec.kind;
    const d = rec.dpr || this.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const mono = (px) => px + "px ui-monospace, Menlo, monospace";
    ctx.font = mono(11);
    if (k === "matrix") {
      const step = 4, cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const h = ((i * 73856093) ^ (j * 19349663) ^ ((i * j + i + j) * 83492791)) >>> 0;
          const r = (h % 997) / 997;
          const ph = ((h >>> 10) % 991) / 991;
          const per = 9 + (((h >>> 19) % 983) / 983) * 15;
          const u = (s.t / per + ph) % 1;
          const lit = u < 0.3 ? Math.sin((u / 0.3) * Math.PI) : 0;
          const a = 0.3 + r * 0.2 + lit * 0.5;
          ctx.globalAlpha = a;
          ctx.fillStyle = lit > 0.6 ? C.INK : C.MUT;
          ctx.fillRect(i * step, j * step, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
      return;
    }

    if (k === "hero") return this.paintHero(ctx, W, H, s, C);

    const pad = 16;
    if (k === "cluster") {
      const ease = (p) => 1 - Math.pow(1 - Math.min(1, p), 3);
      const e = ease(s.p);
      const cols = [C.ACC, C.LIT, C.GHO];
      for (const p of s.pts) {
        const cen = s.cents[p.c];
        const x = pad + (W - pad * 2) * (p.x + (cen.x + p.ox - p.x) * e);
        const y = pad + (H - pad * 2) * (p.y + (cen.y + p.oy - p.y) * e);
        ctx.globalAlpha = 0.4 + 0.5 * e;
        ctx.fillStyle = cols[p.c];
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = Math.min(1, e * 1.4);
      s.cents.forEach((cen, i) => {
        const x = pad + (W - pad * 2) * cen.x, y = pad + (H - pad * 2) * cen.y;
        ctx.strokeStyle = cols[i]; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 14 + 6 * (1 - e), 0, 6.2832); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.MUT; ctx.textAlign = "left";
      ctx.fillText("3 CLUSTERS / 80 REPRESENTATIVES", pad - 4, H - 6);
      return;
    }

    if (k === "qsar") {
      const x0 = pad + 16, y0 = pad, x1 = W - pad, y1 = H - pad - 10;
      ctx.strokeStyle = C.EDGE; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0 - 0.5, y0); ctx.lineTo(x0 - 0.5, y1 + 0.5); ctx.lineTo(x1, y1 + 0.5); ctx.stroke();
      const n = Math.floor(s.n);
      const prog = n / s.pts.length;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = C.MID; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0 + (x1 - x0) * prog, y1 - (y1 - y0) * prog); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      s.pts.slice(0, n).forEach((p) => {
        ctx.fillStyle = C.ACC; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * p.x, y1 - (y1 - y0) * p.y, 2.2, 0, 6.2832); ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.LIT; ctx.textAlign = "left";
      ctx.fillText("R\u00b2 " + (0.61 + prog * 0.26).toFixed(2), x0 + 6, y0 + 12);
      ctx.fillStyle = C.MUT;
      ctx.fillText("PREDICTED vs EXPERIMENTAL", x0 + 6, y0 + 28);
      return;
    }

    if (k === "dock") {
      const ez = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
      const PO = [{ x: -0.62, y: -0.26, r: 0.9, f: 1, g: -5.2 }, { x: -0.28, y: 0.22, r: -1.9, f: -1, g: -6.3 }, { x: 0.0, y: -0.16, r: 2.5, f: 1, g: -7.0 }, { x: 0.08, y: 0.12, r: -0.5, f: -1, g: -7.7 }, { x: 0.14, y: 0.02, r: 0.35, f: 1, g: -8.6 }];
      const pcx = W * 0.64, pcy = H * 0.52, R = Math.min(W * 0.28, H * 0.42);
      const coil = (t0, t1, rr, turns, amp) => { for (let ph = 0; ph < 2; ph++) { ctx.globalAlpha = ph ? 0.3 : 0.75; ctx.beginPath(); for (let i = 0; i <= 90; i++) { const u = i / 90, th = t0 + (t1 - t0) * u, r = rr + Math.sin(u * turns * 6.2832 + ph * 1.6) * amp; const x = pcx + Math.cos(th) * r * 1.1, y = pcy + Math.sin(th) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); } };
      ctx.strokeStyle = C.EDGE; ctx.lineWidth = 1.2;
      coil(-2.3, -0.7, R * 1.45, 5, R * 0.08);
      coil(0.35, 1.7, R * 1.44, 4, R * 0.08);
      const sp = (th, r) => [pcx + Math.cos(th) * r * 1.1, pcy + Math.sin(th) * r];
      ctx.globalAlpha = 0.75; ctx.beginPath();
      for (let i = 0; i <= 12; i++) { const q = sp(1.95 + 0.6 * i / 12, R * 1.37); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
      ctx.lineTo(...sp(2.55, R * 1.45)); ctx.lineTo(...sp(2.8, R * 1.31)); ctx.lineTo(...sp(2.55, R * 1.17));
      for (let i = 12; i >= 0; i--) { const q = sp(1.95 + 0.6 * i / 12, R * 1.25); ctx.lineTo(q[0], q[1]); }
      ctx.closePath(); ctx.stroke();
      const g0 = ctx.createRadialGradient(pcx + R * 0.1, pcy, 2, pcx + R * 0.1, pcy, R * 0.75);
      g0.addColorStop(0, C.ACC); g0.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.12; ctx.fillStyle = g0; ctx.beginPath(); ctx.arc(pcx + R * 0.1, pcy, R * 0.75, 0, 6.2832); ctx.fill();
      const rS = (th) => R * (1 + Math.sin(th * 3) * 0.06 + Math.sin(th * 7 + 1) * 0.035);
      ctx.fillStyle = C.MUT;
      [0.75, 0.45, 0.25, 0.12].forEach((al, L) => { for (let th = -2.4; th <= 2.4;) { const r = rS(th) + L * 4.5; ctx.globalAlpha = al * Math.min(1, (2.4 - Math.abs(th)) / 0.5); ctx.fillRect(pcx + Math.cos(th) * r * 1.1 - 0.75, pcy + Math.sin(th) * r - 0.75, 1.5, 1.5); th += 4 / r; } });
      const ends = [{ th: -1.05, n: "TYR355" }, { th: 0.1, n: "SER530" }, { th: 1.2, n: "ARG120" }].map((q) => {
        const r0 = rS(q.th); let x = pcx + Math.cos(q.th) * r0 * 1.1, y = pcy + Math.sin(q.th) * r0;
        const ux = -Math.cos(q.th), uy = -Math.sin(q.th), L = R * 0.11;
        ctx.globalAlpha = 0.85; ctx.strokeStyle = C.GHO; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y);
        for (let j = 0; j < 3; j++) { const w = j % 2 ? -0.5 : 0.5; x += ux * L - uy * L * w; y += uy * L + ux * L * w; ctx.lineTo(x, y); }
        ctx.stroke(); ctx.fillStyle = C.MUT; ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 1; ctx.font = mono(9); ctx.fillStyle = C.GHO; ctx.textAlign = "center";
        ctx.fillText(q.n, pcx + Math.cos(q.th) * R * 1.19 * 1.1, pcy + Math.sin(q.th) * R * 1.19 + 3);
        return { x, y };
      });
      const i = s.i, e = ez(Math.min(1, s.ph / 1.1)), cur = PO[i], prv = i ? PO[i - 1] : { x: -1.7, y: -0.1, r: -0.6, f: 1, g: -3.0 };
      const lx = prv.x + (cur.x - prv.x) * e, ly = prv.y + (cur.y - prv.y) * e;
      const fade = i === 4 && s.ph > 2.6 ? Math.max(0, 1 - (s.ph - 2.6) / 0.6) : i === 0 ? Math.min(1, s.ph / 0.5) : 1;
      const bs = R * 0.15;
      for (let j = 0; j < i; j++) this.draw2D(ctx, C, { x: pcx + PO[j].x * R, y: pcy + PO[j].y * R, s: bs, rot: PO[j].r, flip: PO[j].f, alpha: 0.16 * fade, col: C.GHO, lblCol: C.GHO });
      const LP = this.draw2D(ctx, C, { x: pcx + lx * R, y: pcy + ly * R, s: bs, rot: prv.r + (cur.r - prv.r) * e, flip: prv.f + (cur.f - prv.f) * e, alpha: fade });
      if (e > 0.92) {
        ctx.setLineDash([2, 3]); ctx.strokeStyle = C.ACC; ctx.lineWidth = 1;
        ends.forEach((q) => {
          let best = null, bd = 1e9;
          [7, 8, 9, 11].forEach((a) => { const d = Math.hypot(LP[a].x - q.x, LP[a].y - q.y); if (d < bd) { bd = d; best = LP[a]; } });
          if (bd > R * 0.55) return;
          ctx.globalAlpha = ((e - 0.92) / 0.08) * fade * 0.9;
          ctx.beginPath(); ctx.moveTo(best.x, best.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        });
        ctx.setLineDash([]);
      }
      const g = prv.g + (cur.g - prv.g) * e;
      ctx.globalAlpha = 1; ctx.font = mono(11); ctx.textAlign = "left"; ctx.fillStyle = C.LIT;
      ctx.fillText("\u0394G " + g.toFixed(1), 14, 20);
      ctx.fillStyle = C.MUT; ctx.fillText("kcal/mol \u00b7 VINA", 14, 36);
      ctx.font = mono(10);
      for (let j = 0; j <= i; j++) { const y = 58 + j * 14; if (y > H - 8) break; ctx.fillStyle = j === i ? C.LIT : C.GHO; ctx.globalAlpha = (j === i ? 1 : 0.8) * fade; ctx.fillText("POSE " + (j + 1) + "  " + PO[j].g.toFixed(1), 14, y); }
      ctx.globalAlpha = 1; ctx.font = mono(11);
      return;
    }

    if (k === "vs") {
      const x0 = pad, x1 = W - pad - 34, y0 = pad + 30, y1 = H - pad - 2;
      s.rows.forEach((r) => {
        const y = y0 + (y1 - y0) * r.y;
        const top = r.rank !== undefined && r.rank < 2;
        ctx.globalAlpha = top ? 1 : 0.55;
        ctx.fillStyle = top ? C.LIT : C.DIM;
        ctx.fillRect(x0, y - 3, (x1 - x0) * Math.min(1, Math.abs(r.score) / 12), 5);
        ctx.globalAlpha = 1;
        ctx.fillStyle = top ? C.LIT : C.MUT; ctx.textAlign = "right";
        ctx.fillText(r.score.toFixed(1), W - pad, y + 3);
      });
      ctx.textAlign = "left"; ctx.fillStyle = C.MUT;
      ctx.fillText("RANKED BY SCORE", x0, pad - 2);
      return;
    }

    if (k === "htp") {
      const cols = 6, rows = 4;
      const gw = W - pad * 2, gh = H - pad * 2 - 14;
      const cw = gw / cols, chh = gh / rows;
      const size = Math.min(cw, chh) * 0.66;
      s.cells.forEach((c, i) => {
        const x = pad + (i % cols) * cw + cw / 2, y = pad + Math.floor(i / cols) * chh + chh / 2;
        if (c.st === 1) { ctx.shadowColor = C.ACC; ctx.shadowBlur = 10; ctx.strokeStyle = C.ACC; }
        else { ctx.strokeStyle = c.st === 2 ? C.DIM : C.EDGE; }
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(x - size / 2, y - size / 2, size, size); ctx.stroke();
        ctx.shadowBlur = 0;
        if (c.st === 1) { ctx.globalAlpha = 0.2; ctx.fillStyle = C.ACC; ctx.fill(); ctx.globalAlpha = 1; }
        if (c.st === 2) { ctx.globalAlpha = 0.5; ctx.fillStyle = C.DIM; ctx.fill(); ctx.globalAlpha = 1; }
      });
      const bw = W - pad * 2;
      ctx.strokeStyle = C.EDGE; ctx.strokeRect(pad + 0.5, H - pad - 4.5, bw, 3);
      ctx.fillStyle = C.ACC; ctx.fillRect(pad + 1, H - pad - 4, (bw - 2) * (s.done / s.cells.length), 2);
      ctx.fillStyle = C.MUT; ctx.textAlign = "left";
      ctx.fillText("SHARDS " + String(s.done).padStart(2, "0") + " / " + s.cells.length, pad, pad - 2);
      return;
    }

    if (k === "recep") {
      const ST = ["SEQUENCE \u00b7 FASTA", "FOLD \u00b7 ESMFold2", "PROTONATION \u00b7 PROPKA pH 7.4", "CLEAN \u00b7 CHARGES \u00b7 PDBQT"];
      const D = [2.4, 2.8, 2.4, 2.4], st = s.st, p = Math.min(1, s.ph / D[st]);
      const ez = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
      const F = CanvasAnimations.chain(), N = F.length;
      const SEQ = "MSRSLLLRFLLFLLLLPPLPVLLADPGAPTPVNPCCYYPCQHQGICVRFG";
      const cx = W * 0.5, cy = H * 0.56, sc = Math.min(W * 0.4, H * 0.6);
      ctx.font = mono(11); ctx.textAlign = "left"; ctx.fillStyle = C.MUT;
      ctx.fillText(String(st + 1).padStart(2, "0") + "  " + ST[st], pad - 4, pad - 1);
      const rx = st === 0 ? 0 : st === 1 ? 0.35 * ez(p) : 0.35, ry = s.rot;
      const c1 = Math.cos(ry), s1 = Math.sin(ry), c2 = Math.cos(rx), s2 = Math.sin(rx);
      const P = F.map((f, i) => {
        const e = st === 0 ? 0 : st === 1 ? ez(p * 1.5 - (i / N) * 0.5) : 1;
        const lx = -1 + (2 * i) / (N - 1);
        const x = lx + (f[0] - lx) * e, y = f[1] * e, z = f[2] * e;
        const x1 = x * c1 + z * s1, z1 = -x * s1 + z * c1;
        return { x: cx + x1 * sc * 0.9, y: cy + (y * c2 - z1 * s2) * sc, z: y * s2 + z1 * c2, e };
      });
      if (st === 0) {
        const n = Math.floor(ez(p * 1.3) * N);
        ctx.textAlign = "center"; ctx.font = mono(10); ctx.fillStyle = C.GHO;
        ctx.fillText(">sp|P05979|PGH1_SHEEP", cx, cy - 22);
        ctx.font = mono(Math.max(8, Math.min(10, Math.round(sc * 0.9 * 2 / N * 1.5))));
        for (let i = 0; i < n; i++) { ctx.fillStyle = i > n - 6 ? C.LIT : C.MID; ctx.fillText(SEQ[i], P[i].x, cy + 3); }
        return;
      }
      const dz = (z) => 0.35 + 0.65 * Math.min(1, Math.max(0, (z + 0.6) / 1.2));
      if (st >= 2) {
        const wa = st === 2 ? 0.6 * ez(p * 2) : 0.6 * (1 - ez(p * 1.4)), out = st === 3 ? 1 + ez(p) * 0.35 : 1;
        if (wa > 0.01) { ctx.fillStyle = C.GHO; for (let j = 0; j < 16; j++) { const a = j * 2.4, r = (1.02 + (j % 3) * 0.12) * out; ctx.globalAlpha = wa; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * sc * 0.95, cy + Math.sin(a) * r * sc * 0.6, 1.6, 0, 6.2832); ctx.fill(); } }
      }
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = 0; i < N - 1; i++) {
        const a = P[i], b = P[i + 1], helix = i < 15 || (i >= 20 && i < 35), strand = i >= 39;
        ctx.globalAlpha = dz((a.z + b.z) / 2) * (st === 1 ? 0.3 + 0.7 * Math.min(a.e, b.e) : 1);
        ctx.strokeStyle = strand ? C.LIT : C.MID; ctx.lineWidth = strand ? 3 : helix ? 1.8 : 1.1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.font = mono(8); ctx.textAlign = "center";
      P.forEach((q, i) => {
        if (st === 1 && q.e < 0.35) { ctx.globalAlpha = 1 - q.e / 0.35; ctx.fillStyle = C.MID; ctx.fillText(SEQ[i], q.x, q.y + 3); }
        else { ctx.globalAlpha = dz(q.z) * 0.9; ctx.fillStyle = C.INK; ctx.beginPath(); ctx.arc(q.x, q.y, 1.2, 0, 6.2832); ctx.fill(); }
      });
      if (st >= 2) {
        [[3, "+", "HIS\u2192HIP"], [17, "\u2212", "ASP"], [27, "\u2212", "GLU"], [42, "+", "LYS"]].forEach(([i, g, n], j) => {
          const a = st === 2 ? ez(p * 2 - j * 0.25) : 1; if (a <= 0) return;
          const q = P[i];
          ctx.globalAlpha = a; ctx.strokeStyle = C.ACC; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(q.x, q.y, 4.5, 0, 6.2832); ctx.stroke();
          ctx.fillStyle = C.ACC; ctx.font = mono(12); ctx.textAlign = "center"; ctx.fillText(g, q.x + 8, q.y - 6);
          if (st === 2) { ctx.globalAlpha = a * 0.9; ctx.fillStyle = C.GHO; ctx.font = mono(9); ctx.textAlign = "left"; ctx.fillText(n, q.x + 14, q.y - 6); }
        });
      }
      ctx.globalAlpha = 1;
      const right = ["", "TEMPLATE 1PRH", "4 TITRATABLE", "\u2212HOH \u00d716"][st];
      ctx.font = mono(11); ctx.textAlign = "right"; ctx.fillStyle = C.LIT; ctx.fillText(right, W - pad + 4, pad - 1);
      return;
    }

    if (k === "prep") {
      const ST = ["SMILES", "2D DEPICTION", "3D EMBED \u00b7 ETKDG", "MINIMIZE \u00b7 MMFF94", "PROTONATION \u00b7 pH 7.4", "PDBQT \u00b7 TORSION TREE"];
      const D = [2.2, 1.8, 2.2, 2.4, 2.2, 2.4], st = s.st, p = Math.min(1, s.ph / D[st]);
      const ez = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
      const SM = "CC(=O)Oc1ccccc1C(=O)O";
      const cx = W * 0.5, cy = H * 0.55, sc = Math.min(W * 0.08, H * 0.13);
      ctx.font = mono(11); ctx.textAlign = "left"; ctx.fillStyle = C.MUT;
      ctx.fillText(String(st + 1).padStart(2, "0") + "  " + ST[st], pad - 4, pad - 1);
      if (st === 0) {
        const n = Math.floor(ez(p * 1.4) * SM.length);
        ctx.font = mono(Math.round(Math.max(11, Math.min(15, W / 24)))); ctx.textAlign = "center"; ctx.fillStyle = C.LIT;
        ctx.fillText(SM.slice(0, n) + (Math.floor(s.t * 3) % 2 ? "_" : " "), cx, cy + 4);
        ctx.font = mono(10); ctx.fillStyle = C.GHO; ctx.fillText("ACETYLSALICYLIC ACID", cx, cy + 26);
        return;
      }
      ctx.font = mono(10); ctx.fillStyle = C.GHO; ctx.textAlign = "left"; ctx.fillText(SM, pad - 4, H - 8);
      if (st === 1) { this.draw2D(ctx, C, { x: cx, y: cy, s: sc, prog: ez(p * 1.25) }); return; }
      const m = st === 2 ? ez(p) : 1;
      const o = { x: cx, y: cy, s: sc, t: s.t, m, ry: s.rot + 0.5 * m, rx: 0.45 * m, hA: m };
      let right = st === 2 ? "CONFORMER 1/10" : "";
      if (st === 3) { o.noise = 0.28 * Math.min(1, p * 10) * Math.exp(-p * 4); right = "E " + (12.6 + 35.4 * Math.exp(-p * 4.5)).toFixed(1) + " kcal/mol"; }
      if (st >= 4) { o.drop = 4; o.dropP = st === 4 ? ez(p * 1.6) : 1; }
      if (st === 4) right = "CHARGE " + (p > 0.5 ? "\u22121" : "0");
      if (st === 5) { o.hl = [6, 9, 10]; right = "TORSDOF 3"; }
      const P = this.draw3D(ctx, C, o);
      if (st >= 4 && o.dropP > 0.5) { ctx.globalAlpha = st === 4 ? (o.dropP - 0.5) * 2 : 1; ctx.fillStyle = C.ACC; ctx.font = mono(13); ctx.textAlign = "center"; ctx.fillText("\u2212", P[8].x + sc * 0.45, P[8].y - sc * 0.3); ctx.globalAlpha = 1; }
      if (right) { ctx.font = mono(11); ctx.textAlign = "right"; ctx.fillStyle = C.LIT; ctx.fillText(right, W - pad + 4, pad - 1); }
      return;
    }

    if (k === "site") {
      const ez = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
      const cx = W * 0.5, cy = H * 0.55, R = Math.min(W * 0.34, H * 0.4);
      const rS = (th) => R * (1 + Math.sin(th * 3) * 0.08 + Math.sin(th * 5 + 1) * 0.05);
      ctx.fillStyle = C.MUT;
      [0.6, 0.34, 0.16].forEach((al, L) => { ctx.globalAlpha = al; for (let th = 0; th < 6.2832;) { const r = rS(th) - L * 5; ctx.fillRect(cx + Math.cos(th) * r * 1.2 - 0.75, cy + Math.sin(th) * r * 0.86 - 0.75, 1.5, 1.5); th += 4 / r; } });
      const pos = (st) => ({ x: cx + Math.cos(st.a) * R * st.r * 1.2, y: cy + Math.sin(st.a) * R * st.r * 0.8 });
      ctx.font = mono(9);
      s.sites.forEach((st, i) => {
        const q = pos(st), on = i === s.sel;
        ctx.globalAlpha = on ? 0.9 : 0.5; ctx.setLineDash([2, 3]); ctx.strokeStyle = on ? C.ACC : C.GHO; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(q.x, q.y, 9, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = on ? C.LIT : C.GHO; ctx.textAlign = "left"; ctx.fillText(st.score.toFixed(2), q.x + 12, q.y - 8);
      });
      const n = s.sites.length, e = ez((2.2 - s.next) / 0.8), a = pos(s.sites[(s.sel + n - 1) % n]), b = pos(s.sites[s.sel]);
      const bx = a.x + (b.x - a.x) * e, by = a.y + (b.y - a.y) * e, hb = R * 0.3;
      const ry = 0.6 + s.t * 0.35, rx = 0.42, c1 = Math.cos(ry), s1 = Math.sin(ry), c2 = Math.cos(rx), s2 = Math.sin(rx);
      const pj = (x, y, z) => { const x1 = x * c1 + z * s1, z1 = -x * s1 + z * c1; return { x: bx + x1, y: by + y * c2 - z1 * s2, z: y * s2 + z1 * c2 }; };
      const V = []; for (let q = 0; q < 8; q++) V.push(pj(q & 1 ? hb : -hb, q & 2 ? hb : -hb, q & 4 ? hb : -hb));
      ctx.fillStyle = C.ACC;
      const G = [-1, -1 / 3, 1 / 3, 1];
      for (const gx of G) for (const gy of G) for (const gz of G) { const q = pj(gx * hb, gy * hb, gz * hb); ctx.globalAlpha = 0.25 + 0.35 * (q.z / hb + 1.7) / 3.4; ctx.fillRect(q.x - 0.6, q.y - 0.6, 1.2, 1.2); }
      [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([i, j]) => {
        const back = V[i].z + V[j].z < 0;
        ctx.globalAlpha = back ? 0.5 : 0.95; ctx.strokeStyle = back ? C.GHO : C.MID; ctx.lineWidth = back ? 1 : 1.3;
        ctx.setLineDash(back ? [2, 3] : []);
        ctx.beginPath(); ctx.moveTo(V[i].x, V[i].y); ctx.lineTo(V[j].x, V[j].y); ctx.stroke();
      });
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      const cur = s.sites[s.sel];
      ctx.font = mono(11); ctx.fillStyle = C.LIT; ctx.textAlign = "left";
      ctx.fillText("SITE " + (s.sel + 1) + " \u00b7 P2RANK " + cur.score.toFixed(2), pad - 4, pad - 1);
      ctx.fillStyle = C.MUT;
      ctx.fillText("CENTER " + cur.c.map((v) => v.toFixed(1)).join(" ") + " \u00b7 22\u00b3 \u00c5", pad - 4, H - 8);
      return;
    }

    if (k === "engines") {
      const x0 = pad + 82, x1 = W - pad - 4;
      s.lanes.forEach((l, i) => {
        const y = pad + 14 + i * ((H - pad * 2 - 8) / 3);
        ctx.font = mono(10);
        ctx.fillStyle = C.MUT; ctx.textAlign = "left";
        ctx.fillText(l.n, pad - 4, y + 3.5);
        ctx.strokeStyle = C.EDGE; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, y + 0.5); ctx.lineTo(x1, y + 0.5); ctx.stroke();
        const w = (x1 - x0) * Math.min(1, l.p);
        ctx.strokeStyle = l.tag === "AI" ? C.LIT : C.ACC; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(x0, y + 0.5); ctx.lineTo(x0 + w, y + 0.5); ctx.stroke();
        ctx.fillStyle = l.tag === "AI" ? C.LIT : C.GHO;
        ctx.fillText(l.tag, x0, y + 15);
      });
      ctx.font = mono(11);
      return;
    }

    const IX = [
      { a: 7, d: [-0.55, -0.85], r: "ARG120", t: "hb", v: "SALT BRIDGE \u00b7 2.8 \u00c5" },
      { a: 8, d: [0.55, -0.85], r: "TYR355", t: "hb", v: "H-BOND \u00b7 3.0 \u00c5" },
      { a: 11, d: [0.45, 0.9], r: "SER530", t: "hb", v: "H-BOND \u00b7 3.1 \u00c5" },
      { a: -1, d: [-0.75, 0.65], r: "TRP387", t: "pi", v: "\u03c0\u2013\u03c0 \u00b7 4.2 \u00c5" },
      { a: 4, d: [-1, -0.2], r: "VAL349", t: "hy", v: "HYDROPHOBIC" },
      { a: 12, d: [1, -0.4], r: "LEU352", t: "hy", v: "HYDROPHOBIC" },
      { a: 3, d: [0.15, 1], r: "ALA527", t: "hy", v: "HYDROPHOBIC" }
    ];
    const u = Math.min(W / 11, H / 9), mx = W * 0.47, my = H * 0.47;
    const P = this.draw2D(ctx, C, { x: mx, y: my, s: u, lbl: { 8: "O\u2212" } });
    const rc = P.slice(0, 6).reduce((a, q) => ({ x: a.x + q.x / 6, y: a.y + q.y / 6 }), { x: 0, y: 0 });
    IX.forEach((q, j) => {
      const on = j === s.k, st = q.a < 0 ? rc : P[q.a];
      const nn = Math.hypot(q.d[0], q.d[1]), dx = q.d[0] / nn, dy = q.d[1] / nn;
      const L = (q.t === "hb" ? 1.6 : q.t === "pi" ? 2.4 : 1.5) * u;
      const ex = st.x + dx * L, ey = st.y + dy * L;
      ctx.globalAlpha = on ? 1 : 0.5; ctx.lineWidth = 1.2;
      if (q.t === "hb") {
        ctx.setLineDash([3, 3]); ctx.lineDashOffset = on ? -s.t * 12 : 0; ctx.strokeStyle = C.ACC;
        ctx.beginPath(); ctx.moveTo(st.x + dx * u * 0.45, st.y + dy * u * 0.45); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        ctx.fillStyle = on ? C.LIT : C.MID; ctx.beginPath(); ctx.arc(ex, ey, 2.2, 0, 6.2832); ctx.fill();
      } else if (q.t === "pi") {
        ctx.setLineDash([1, 3]); ctx.strokeStyle = C.MID;
        ctx.beginPath(); ctx.moveTo(st.x + dx * u * 0.4, st.y + dy * u * 0.4); ctx.lineTo(ex - dx * u * 0.4, ey - dy * u * 0.4); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = on ? C.LIT : C.MID; ctx.beginPath();
        for (let v = 0; v <= 6; v++) { const a = v * 1.0472 + 0.5236, x = ex + Math.cos(a) * u * 0.4, y = ey + Math.sin(a) * u * 0.4; v ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      } else {
        const a0 = Math.atan2(-dy, -dx);
        ctx.strokeStyle = on ? C.MUT : C.GHO;
        ctx.beginPath(); ctx.arc(ex, ey, u * 0.5, a0 - 1.1, a0 + 1.1); ctx.stroke();
        for (let m2 = -2; m2 <= 2; m2++) { const a = a0 + m2 * 0.5; ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * u * 0.5, ey + Math.sin(a) * u * 0.5); ctx.lineTo(ex + Math.cos(a) * u * 0.72, ey + Math.sin(a) * u * 0.72); ctx.stroke(); }
      }
      ctx.font = mono(9); ctx.textAlign = "center"; ctx.fillStyle = on ? C.LIT : C.GHO;
      const off = q.t === "pi" ? 0.95 : q.t === "hy" ? 0.35 : 0.7;
      ctx.fillText(q.r, ex + dx * u * off + (q.t === "hy" ? dx * u * 0.3 : 0), ey + dy * u * off + 3);
    });
    ctx.globalAlpha = 1; ctx.font = mono(11); ctx.textAlign = "left";
    ctx.fillStyle = C.MUT; ctx.fillText("2D INTERACTIONS \u00b7 COX-1", 14, 20);
    const cq = IX[s.k]; ctx.fillStyle = C.LIT; ctx.fillText(cq.r + "  " + cq.v, 14, H - 8);
  }

  paintHero(ctx, W, H, s, C) {
      const pad = Math.max(18, Math.min(34, W * 0.055));
      const N = s.nodes.length, x0 = pad, x1 = W - pad - 46, y0 = pad + 22, y1 = y0 + (H - pad * 2 - 22) * 0.56;
      const gates = [0.18, 0.36, 0.54, 0.72, 0.88], labels = ["SHARD", "FILTER", "PREP", "DOCK", "GATE"];
      const nx0 = pad, nx1 = W - pad, cw = (nx1 - nx0) / N, sz = Math.min(cw * 0.62, 26), nyc = H - pad - sz / 2 - 4;
      const at = (i) => nx0 + cw * (i + 0.5);
      ctx.lineWidth = 1; ctx.textAlign = "center";
      gates.forEach((g, i) => {
        const x = x0 + (x1 - x0) * g, inset = (y1 - y0) * (0.05 + i * 0.075);
        ctx.strokeStyle = C.EDGE; ctx.beginPath(); ctx.moveTo(x + 0.5, y0 + inset); ctx.lineTo(x + 0.5, y1 - inset); ctx.stroke();
        ctx.fillStyle = C.MUT; ctx.fillText(labels[i], x, y1 + 16);
      });
      for (const k of s.tasks) {
        const sx = x0 + (x1 - x0) * k.gx, sy = y1 + 24, ex = at(k.node), ey = nyc - sz / 2;
        const mx = (sx + ex) / 2, my = sy + (ey - sy) * 0.2, q = k.p, iq = 1 - q;
        ctx.globalAlpha = 0.16; ctx.strokeStyle = C.DIM;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        ctx.globalAlpha = 1; ctx.fillStyle = k.dir === -1 ? C.MID : C.ACC;
        ctx.beginPath(); ctx.arc(iq * iq * sx + 2 * iq * q * mx + q * q * ex, iq * iq * sy + 2 * iq * q * my + q * q * ey, 2, 0, 6.2832); ctx.fill();
      }
      s.nodes.forEach((n, i) => {
        const x = at(i), busy = n.busy > 0;
        ctx.strokeStyle = busy ? C.ACC : C.EDGE;
        if (busy) { ctx.shadowColor = C.ACC; ctx.shadowBlur = 12; }
        ctx.beginPath(); ctx.rect(x - sz / 2, nyc - sz / 2, sz, sz); ctx.stroke(); ctx.shadowBlur = 0;
        if (busy) { ctx.globalAlpha = 0.16; ctx.fillStyle = C.ACC; ctx.fill(); }
        ctx.globalAlpha = busy ? 0.9 : 0.6; ctx.fillStyle = busy ? C.ACC : C.GHO;
        ctx.fillRect(x - sz / 2 + 3, nyc + sz / 2 - 5, Math.max(2, (sz - 6) * Math.min(1, n.done / 14)), 2);
        ctx.globalAlpha = 1;
      });
      ctx.textAlign = "left"; ctx.fillStyle = C.MUT;
      ctx.fillText("WORKERS  " + N + "   ·   TASKS  " + String(s.done).padStart(4, "0"), nx0, nyc - sz / 2 - 12);
      for (const p of s.parts) {
        const x = x0 + (x1 - x0) * p.x, y = y0 + (y1 - y0) * p.y;
        if (p.dead) { ctx.globalAlpha = Math.max(0, 0.5 - p.dead * 0.4); ctx.fillStyle = C.GHO; }
        else { ctx.globalAlpha = 0.35 + p.stage * 0.13; ctx.fillStyle = p.stage >= 4 ? C.LIT : C.ACC; }
        ctx.beginPath(); ctx.arc(x, Math.min(y, y1), p.dead ? 1.2 : 1.4 + p.stage * 0.25, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const hx = x1 + 16;
      ctx.strokeStyle = C.EDGE; ctx.beginPath(); ctx.moveTo(hx + 0.5, y0 + 6); ctx.lineTo(hx + 0.5, y1 - 6); ctx.stroke();
      s.stack.slice(0, Math.floor((y1 - y0 - 12) / 7)).forEach((h, i, a) => {
        ctx.globalAlpha = Math.max(0.2, 1 - i / a.length);
        ctx.fillStyle = C.LIT; ctx.fillRect(hx + 5, y0 + 8 + i * 7, 20, 3);
      });
      ctx.globalAlpha = 1; ctx.textAlign = "left"; ctx.fillStyle = C.MUT;
      ctx.fillText("IN  " + (s.culled + s.kept + s.parts.length).toLocaleString(), x0, y0 - 10);
      ctx.textAlign = "right"; ctx.fillStyle = C.LIT;
      ctx.fillText("HITS  " + s.kept.toLocaleString(), W - pad, y0 - 10);
  }

  // Aspirin: 2D depiction coords (x,y) + approximate 3D conformer (x3,y3,z3) and explicit H.
  static asp() {
    if (CanvasAnimations._asp) return CanvasAnimations._asp;
    const P = [[0, 1], [0.866, 0.5], [0.866, -0.5], [0, -1], [-0.866, -0.5], [-0.866, 0.5], [0, 2], [-0.866, 2.5], [0.866, 2.5], [1.732, 1], [2.598, 0.5], [2.598, -0.5], [3.464, 1]];
    const EL = ["C", "C", "C", "C", "C", "C", "C", "O", "O", "O", "C", "O", "C"];
    const Z = [0, 0, 0, 0, 0, 0, 0, 0.35, -0.35, 0.1, 0, 0, 0];
    const D3 = { 10: [2.35, 0.75, 1.05], 11: [2.15, -0.05, 1.85], 12: [3.4, 1.3, 1.35] };
    const B = [[0, 1, 1], [1, 2, 2], [2, 3, 1], [3, 4, 2], [4, 5, 1], [5, 0, 2], [0, 6, 1], [6, 7, 2], [6, 8, 1], [1, 9, 1], [9, 10, 1], [10, 11, 2], [10, 12, 1]];
    const cx = 1.3, cy = 0.75;
    const A = P.map(([x, y], i) => { const d = D3[i] || [x, y, Z[i]]; return { x: x - cx, y: -(y - cy), x3: d[0] - cx, y3: -(d[1] - cy), z3: d[2], el: EL[i] }; });
    const H = [[2, 1.82, -1.05, 0], [3, 0, -2.1, 0], [4, -1.82, -1.05, 0], [5, -1.82, 1.05, 0], [8, 0.8, 3.45, -0.5], [12, 4.2, 0.7, 1.5], [12, 3.6, 2.1, 0.7], [12, 3.3, 1.8, 2.3]].map(([p, x, y, z]) => ({ p, x3: x - cx, y3: -(y - cy), z3: z }));
    return (CanvasAnimations._asp = { A, B, H, lbl: { 7: "O", 8: "OH", 9: "O", 11: "O" }, rc: { x: -cx, y: cy } });
  }

  static chain() {
    if (CanvasAnimations._ch) return CanvasAnimations._ch;
    const F = [];
    for (let i = 0; i < 16; i++) F.push([-0.85 + i * 0.1, -0.42 + 0.2 * Math.cos(i * 1.745), 0.2 * Math.sin(i * 1.745)]);
    const a = F[15];
    for (let i = 1; i <= 4; i++) { const u = i / 5; F.push([a[0] + 0.22 * Math.sin(u * Math.PI), a[1] + u * 0.5, a[2] * (1 - u)]); }
    const b = F[19];
    for (let i = 0; i < 16; i++) F.push([b[0] - 0.05 - i * 0.1, b[1] + 0.06 + 0.2 * Math.cos(i * 1.745 + 1), 0.15 + 0.2 * Math.sin(i * 1.745 + 1)]);
    const c = F[35];
    for (let i = 1; i <= 3; i++) { const u = i / 4; F.push([c[0] - 0.18 * Math.sin(u * Math.PI), c[1] + u * 0.42, c[2] * (1 - u)]); }
    const d = F[38];
    for (let i = 0; i < 9; i++) F.push([d[0] + 0.08 + i * 0.13, d[1] + 0.08, i % 2 ? 0.07 : -0.07]);
    const m = [0, 1, 2].map((k) => F.reduce((s, p) => s + p[k], 0) / F.length);
    return (CanvasAnimations._ch = F.map((p) => [p[0] - m[0], p[1] - m[1], p[2] - m[2]]));
  }

  draw2D(ctx, C, o) {
    const m = CanvasAnimations.asp(), s = o.s, c = Math.cos(o.rot || 0), sn = Math.sin(o.rot || 0), f = o.flip ?? 1;
    const T = (x, y) => { x *= f; return { x: o.x + (x * c - y * sn) * s, y: o.y + (x * sn + y * c) * s }; };
    const P = m.A.map((a) => T(a.x, a.y)), rc = T(m.rc.x, m.rc.y);
    const lbl = Object.assign({}, m.lbl, o.lbl || {});
    const nb = o.prog == null ? m.B.length : Math.floor(o.prog * m.B.length + 0.0001);
    const BB = m.B.slice(0, nb);
    ctx.globalAlpha = o.alpha ?? 1; ctx.strokeStyle = o.col || C.MID; ctx.lineWidth = 1.3; ctx.lineCap = "round";
    const gap = s * 0.36;
    BB.forEach(([i, j, ord], bi) => {
      let a = P[i], b = P[j];
      const vx = b.x - a.x, vy = b.y - a.y, L = Math.hypot(vx, vy) || 1, ux = vx / L, uy = vy / L;
      const ga = lbl[i] ? gap : 0, gb = lbl[j] ? gap : 0;
      a = { x: a.x + ux * ga, y: a.y + uy * ga }; b = { x: b.x - ux * gb, y: b.y - uy * gb };
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (ord === 2) {
        let nx = -uy, ny = ux; const off = s * 0.17;
        if (bi < 6) {
          const mx = (a.x + b.x) / 2 - rc.x, my = (a.y + b.y) / 2 - rc.y;
          if (nx * mx + ny * my > 0) { nx = -nx; ny = -ny; }
          ctx.beginPath(); ctx.moveTo(a.x + nx * off + ux * s * 0.14, a.y + ny * off + uy * s * 0.14); ctx.lineTo(b.x + nx * off - ux * s * 0.14, b.y + ny * off - uy * s * 0.14); ctx.stroke();
        } else { ctx.beginPath(); ctx.moveTo(a.x + nx * off, a.y + ny * off); ctx.lineTo(b.x + nx * off, b.y + ny * off); ctx.stroke(); }
      }
    });
    ctx.font = "500 " + Math.max(8, Math.round(s * 0.62)) + "px ui-monospace, Menlo, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    Object.keys(lbl).forEach((kk) => {
      const i = +kk, bd = BB.find((b) => b[0] === i || b[1] === i); if (!bd) return;
      const t = lbl[kk], nI = bd[0] === i ? bd[1] : bd[0], sg = P[i].x >= P[nI].x ? 1 : -1;
      ctx.fillStyle = o.lblCol || C.INK; ctx.fillText(t[0], P[i].x, P[i].y);
      if (t.length > 1) { const suf = t.slice(1), sup = suf === "\u2212"; ctx.fillStyle = sup ? C.ACC : (o.lblCol || C.INK); ctx.fillText(suf, P[i].x + sg * s * (sup ? 0.42 : 0.5), P[i].y - (sup ? s * 0.28 : 0)); }
    });
    ctx.textBaseline = "alphabetic"; ctx.globalAlpha = 1;
    return P;
  }

  draw3D(ctx, C, o) {
    const m = CanvasAnimations.asp(), e = o.m ?? 1, t = o.t || 0, nz = o.noise || 0;
    const cy = Math.cos(o.ry), sy = Math.sin(o.ry), cx = Math.cos(o.rx), sx = Math.sin(o.rx);
    const pr = (x, y, z, i) => {
      if (nz) { x += Math.sin(t * 9 + i * 2.1) * nz; y += Math.cos(t * 8 + i * 1.3) * nz; z += Math.sin(t * 7 + i) * nz; }
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
      const f = 1 / (1 - z2 * 0.06);
      return { x: o.x + x1 * o.s * f, y: o.y + y1 * o.s * f, z: z2, f };
    };
    const P = m.A.map((a, i) => pr(a.x + (a.x3 - a.x) * e, a.y + (a.y3 - a.y) * e, a.z3 * e, i));
    const HP = m.H.map((h, i) => {
      const d = o.drop === i ? o.dropP || 0 : 0, b = m.A[h.p], k = 1 + d * 2.5;
      const q = pr(b.x3 + (h.x3 - b.x3) * k, b.y3 + (h.y3 - b.y3) * k, b.z3 + (h.z3 - b.z3) * k, i + 20);
      q.p = h.p; q.a = (o.hA ?? 0) * (1 - d); return q;
    });
    const dz = (z) => 0.4 + 0.6 * Math.min(1, Math.max(0, (z + 2.5) / 5));
    ctx.lineCap = "round";
    HP.forEach((q) => { if (q.a <= 0.01 || o.drop != null && q === HP[o.drop] && o.dropP > 0.15) return; const a = P[q.p]; ctx.globalAlpha = q.a * dz(q.z) * 0.8; ctx.strokeStyle = C.GHO; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(q.x, q.y); ctx.stroke(); });
    m.B.forEach(([i, j, ord], bi) => {
      const a = P[i], b = P[j], hl = o.hl && o.hl.includes(bi);
      ctx.globalAlpha = dz((a.z + b.z) / 2) * (hl ? 1 : 0.9);
      ctx.strokeStyle = hl ? C.ACC : C.MID; ctx.lineWidth = Math.max(1.2, o.s * (hl ? 0.2 : 0.13));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (ord === 2 && !hl) { const vx = b.x - a.x, vy = b.y - a.y, L = Math.hypot(vx, vy) || 1, k = o.s * 0.16; ctx.globalAlpha *= 0.55; ctx.beginPath(); ctx.moveTo(a.x - vy / L * k + vx * 0.18, a.y + vx / L * k + vy * 0.18); ctx.lineTo(b.x - vy / L * k - vx * 0.18, b.y + vx / L * k - vy * 0.18); ctx.stroke(); }
    });
    const all = P.map((q, i) => ({ x: q.x, y: q.y, z: q.z, f: q.f, el: m.A[i].el, a: 1 })).concat(HP.filter((q) => q.a > 0.01).map((q) => ({ x: q.x, y: q.y, z: q.z, f: q.f, el: "H", a: q.a })));
    all.sort((a, b) => a.z - b.z).forEach((q) => {
      const r = Math.max(1.2, (q.el === "O" ? 0.3 : q.el === "H" ? 0.14 : 0.2) * o.s * q.f);
      ctx.globalAlpha = dz(q.z) * q.a;
      ctx.fillStyle = q.el === "O" ? C.INK : q.el === "H" ? C.GHO : C.MID;
      ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 6.2832); ctx.fill();
      if (q.el !== "H") { ctx.globalAlpha *= 0.5; ctx.fillStyle = C.INK; ctx.beginPath(); ctx.arc(q.x - r * 0.35, q.y - r * 0.35, Math.max(0.6, r * 0.35), 0, 6.2832); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
    return P;
  }

}


const component = new CanvasAnimations();
component.start();
document.querySelectorAll("canvas[data-canvas]").forEach((canvas) => {
  component.mount(canvas.dataset.canvas, canvas.dataset.kind, canvas);
});

const motionButton = document.getElementById("motion-toggle");
const motionIcon = motionButton.querySelector("path");
const pauseIcon = motionIcon.getAttribute("d");
const playIcon = "M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z";
function updateMotionButton() {
  const active = component.state.motion;
  motionButton.setAttribute("aria-pressed", String(!active));
  motionButton.title = active ? "Pause animations" : "Play animations";
  motionButton.querySelector("span").textContent = active ? "Pause motion" : "Play motion";
  motionIcon.setAttribute("d", active ? pauseIcon : playIcon);
}
motionButton.addEventListener("click", () => {
  component.state.motion = !component.state.motion;
  try { localStorage.setItem("amdockvs-motion", component.state.motion ? "on" : "off"); } catch (e) {}
  updateMotionButton();
});
updateMotionButton();
