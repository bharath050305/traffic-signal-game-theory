/* ================= TRAFFIC + GAME-THEORY ENGINE ================= */
const CFG = {
  W: 800, dt: 0.1, box: 22, stopOff: 36, laneOff: 11, vmax: 45, acc: 16, brk: 26, minGap: 5,
  detect: 150, far: 260, yellow: 2.5, allred: 1.0, minGreen: 8, maxGreen: 45, fixedGreen: 20, pTurn: 0.25
};
const GP_DEFAULT = { omega: 1.0, sigma: 2.0, lam: 0.6, kap: 0.5 };
const VTYPES = [
  { n: 'car', L: 18, w: 10, p: 0.55, vs: 1.0 },
  { n: 'bike', L: 10, w: 5, p: 0.25, vs: 1.05 },
  { n: 'auto', L: 14, w: 9, p: 0.12, vs: 0.9 },
  { n: 'bus', L: 32, w: 11, p: 0.08, vs: 0.85 }
];
const PALETTE = ['#f3f4f6', '#f3f4f6', '#f3f4f6', '#f3f4f6', '#c8cdd5', '#c8cdd5', '#c8cdd5', '#8b929d', '#8b929d', '#2b3038', '#2b3038', '#b3202a', '#1f4e9c', '#3d6fa6', '#7b1e26', '#d8d1bf', '#3f5c4b', '#c9a227'];

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

class Sim {
  constructor(o) {
    this.n = o.n || 2;
    this.rate = o.rate == null ? 8 : o.rate;
    this.bias = o.bias || 0;
    this.profile = o.profile || 'steady';
    this.ctrl = o.ctrl || 'nash';
    this.gp = Object.assign({}, GP_DEFAULT, o.gp || {});
    this.seed = o.seed || 1;
    this.vis = !!o.vis;
    this.keepDelays = !!o.keepDelays;
    this.rng = mulberry32(this.seed);
    const n = this.n;
    this.C = [];
    for (let i = 0; i < n; i++) this.C.push(CFG.W * (i + 1) / (n + 1));
    this.inter = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
      this.inter.push({ id: r * n + c, r, c, x: this.C[c], y: this.C[r], phase: 0, status: 'green', timer: 0, greenT: 0 });
    this.entries = [];
    for (let k = 0; k < n; k++)
      this.entries.push({ axis: 'h', line: k, dir: 1, q: [] }, { axis: 'h', line: k, dir: -1, q: [] },
                        { axis: 'v', line: k, dir: 1, q: [] }, { axis: 'v', line: k, dir: -1, q: [] });
    this.vehicles = []; this.nextId = 1; this.t = 0; this.decT = 0; this.stoppedNow = 0;
    this.resetStats();
    this.obs = this.freshObs();
    this.plan = this.inter.map(() => 0);
    this.rounds = 0; this.converged = true; this.trace = []; this.lastU = this.inter.map(() => [0, 0]);
  }

  resetStats() {
    this.st = { exited: 0, delaySum: 0, stopSum: 0, stopTSum: 0, qInt: 0, maxQ: 0, brRounds: 0, brN: 0, brConv: 0, sw: 0, exitTimes: [], delays: [] };
    this.series = []; this.serT = 0;
  }
  freshObs() {
    return this.inter.map(() => ({ q: { N: 0, S: 0, E: 0, W: 0 }, m: { N: 0, S: 0, E: 0, W: 0 }, w: { N: 0, S: 0, E: 0, W: 0 } }));
  }
  demandMult() {
    if (this.profile === 'rush') return 0.5 + 1.0 * Math.sin(Math.PI * ((this.t % 900) / 900));
    return 1;
  }
  xy(v) {
    const off = CFG.laneOff, C = this.C;
    if (v.axis === 'h') return { x: v.p, y: C[v.line] + (v.dir > 0 ? -off : off) };
    return { x: C[v.line] + (v.dir > 0 ? off : -off), y: v.p };
  }
  headingOf(axis, dir) { return axis === 'h' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2); }

  attrs() {
    const rng = this.rng;
    let r = rng(), acc = 0, ty = VTYPES[0];
    for (const t of VTYPES) { acc += t.p; if (r < acc) { ty = t; break; } }
    const color = PALETTE[Math.floor(rng() * PALETTE.length)];
    const vs = ty.vs * (0.92 + rng() * 0.16);
    const tr = []; for (let i = 0; i < 16; i++) tr.push(rng());
    return { ty, color, vs, tr };
  }
  canSpawn(e) {
    const ep = e.dir > 0 ? -30 : CFG.W + 30;
    for (const u of this.vehicles)
      if (u.axis === e.axis && u.line === e.line && u.dir === e.dir && Math.abs(u.p - ep) < u.L / 2 + 16 + CFG.minGap + 3) return false;
    return true;
  }
  spawn(dt) {
    const m = this.demandMult();
    for (const e of this.entries) {
      const lam = this.rate / 60 * (e.axis === 'h' ? 1 + this.bias : 1 - this.bias) * m;
      if (this.rng() < lam * dt) e.q.push({ t0: this.t, a: this.attrs() });
      if (e.q.length && this.canSpawn(e)) {
        const it = e.q.shift(), a = it.a;
        const ep = e.dir > 0 ? -30 : CFG.W + 30;
        this.vehicles.push({
          id: this.nextId++, axis: e.axis, line: e.line, dir: e.dir, p: ep, v: CFG.vmax * a.vs * 0.8,
          L: a.ty.L, w: a.ty.w, type: a.ty.n, color: a.color, vs: a.vs, t0: it.t0, dist: 0, stopT: 0, curStop: 0,
          stops: 0, was: false, tr: a.tr, ti: 0, ang: this.headingOf(e.axis, e.dir), dx: 0, dy: 0
        });
      }
    }
  }

  nb(I, d) {
    const n = this.n; let r = I.r, c = I.c;
    if (d === 'N') r--; else if (d === 'S') r++; else if (d === 'E') c++; else c--;
    return (r < 0 || c < 0 || r >= n || c >= n) ? -1 : r * n + c;
  }
  demand(id, axis) {
    const o = this.obs[id], ks = axis === 0 ? ['N', 'S'] : ['W', 'E'];
    return o.q[ks[0]] + o.q[ks[1]] + o.m[ks[0]] + o.m[ks[1]];
  }

  /* payoff of player i choosing phase a (0 = North-South green, 1 = East-West green) given the others' plan */
  util(i, a, plan, P) {
    const I = this.inter[i], o = this.obs[i];
    const ks = a === 0 ? ['N', 'S'] : ['W', 'E'];
    let u = 0;
    for (const k of ks) u += o.q[k] + 0.4 * o.m[k] + P.omega * o.w[k] / 30;
    if (a !== I.phase) u -= P.sigma;
    if (P.lam > 0 || P.kap > 0) {
      const outs = a === 0 ? [['S', 'N'], ['N', 'S']] : [['E', 'W'], ['W', 'E']];
      for (const [dn, ap] of outs) {
        const j = this.nb(I, dn);
        if (j >= 0) u -= P.lam * this.obs[j].q[ap] * (plan[j] === a ? 0.3 : 1);
      }
      for (const k of ks) {
        const j = this.nb(I, k);
        if (j >= 0 && plan[j] === a) u += P.kap * 0.6 * this.obs[j].q[k];
      }
    }
    return u;
  }
  bestResponse(P) {
    const N = this.inter.length;
    const plan = this.inter.map(I => I.status === 'green' ? I.phase : 1 - I.phase);
    const fixed = this.inter.map(I => I.status !== 'green');
    const trace = [plan.slice()];
    let rounds = 0, changed = true;
    while (changed && rounds < 8) {
      changed = false; rounds++;
      for (let i = 0; i < N; i++) {
        if (fixed[i]) continue;
        const u0 = this.util(i, 0, plan, P), u1 = this.util(i, 1, plan, P);
        const best = u1 > u0 + 1e-9 ? 1 : (u0 > u1 + 1e-9 ? 0 : plan[i]);
        if (best !== plan[i]) { plan[i] = best; changed = true; }
      }
      trace.push(plan.slice());
    }
    this.plan = plan; this.rounds = rounds; this.converged = !changed; this.trace = trace; this.P = P;
    this.lastU = this.inter.map((_, i) => [this.util(i, 0, plan, P), this.util(i, 1, plan, P)]);
    this.st.brRounds += rounds; this.st.brN++; if (!changed) this.st.brConv++;
  }

  startSwitch(I) { I.status = 'yellow'; I.timer = 0; this.st.sw++; }
  decide() {
    if (this.ctrl === 'fixed') {
      for (const I of this.inter) if (I.status === 'green' && I.greenT >= CFG.fixedGreen) this.startSwitch(I);
      this.plan = this.inter.map(I => I.phase);
      return;
    }
    const gp = this.gp;
    const P = this.ctrl === 'nash' ? gp : { omega: gp.omega, sigma: gp.sigma, lam: 0, kap: 0 };
    this.bestResponse(P);
    for (const I of this.inter) {
      if (I.status !== 'green') continue;
      const want = this.plan[I.id];
      if (want !== I.phase && I.greenT >= CFG.minGreen) this.startSwitch(I);
      else if (I.greenT >= CFG.maxGreen && this.demand(I.id, 1 - I.phase) > 0) this.startSwitch(I);
    }
  }
  controlTick(dt) {
    for (const I of this.inter) { I.timer += dt; if (I.status === 'green') I.greenT += dt; }
    this.decT += dt;
    if (this.decT >= 1.0 - 1e-9) { this.decT = 0; this.decide(); }
    for (const I of this.inter) {
      if (I.status === 'yellow' && I.timer >= CFG.yellow) { I.status = 'allred'; I.timer = 0; }
      else if (I.status === 'allred' && I.timer >= CFG.allred) { I.phase = 1 - I.phase; I.status = 'green'; I.timer = 0; I.greenT = 0; }
    }
  }

  step() {
    const dt = CFG.dt, W = CFG.W, H = CFG.box, SO = CFG.stopOff, C = this.C, n = this.n;
    this.spawn(dt);
    this.controlTick(dt);
    const obs = this.obs = this.freshObs();
    const lanes = new Map();
    for (const v of this.vehicles) {
      const k = v.axis + v.line + (v.dir > 0 ? 'p' : 'n');
      let a = lanes.get(k); if (!a) { a = []; lanes.set(k, a); } a.push(v);
    }
    let stopped = 0; const turns = [];
    for (const arr of lanes.values()) {
      arr.sort((a, b) => b.p * b.dir - a.p * a.dir);
      for (let k = 0; k < arr.length; k++) {
        const v = arr[k], ld = k > 0 ? arr[k - 1] : null, dir = v.dir;
        let gap = Infinity;
        if (ld) gap = (ld.p - v.p) * dir - (ld.L + v.L) / 2 - CFG.minGap;
        const front = v.p + dir * v.L / 2;
        let ci = -1;
        if (dir > 0) { for (let i = 0; i < n; i++) if (C[i] - SO >= front - 0.5) { ci = i; break; } }
        else { for (let i = n - 1; i >= 0; i--) if (C[i] + SO <= front + 0.5) { ci = i; break; } }
        let dStop = Infinity, must = false;
        if (ci >= 0) {
          const c = C[ci], s = c - dir * SO;
          dStop = Math.max(0, (s - front) * dir);
          const I = v.axis === 'h' ? this.inter[v.line * n + ci] : this.inter[ci * n + v.line];
          const myPhase = v.axis === 'v' ? 0 : 1;
          let ok = false;
          if (I.phase === myPhase) {
            if (I.status === 'green') ok = true;
            else if (I.status === 'yellow') ok = (v.v * v.v / (2 * CFG.brk)) >= dStop - 1;
          }
          if (ok && ld) { const rear = ld.p * dir - ld.L / 2; if (rear < c * dir + H + v.L + 2) ok = false; }
          must = !ok;
          if (dStop < CFG.far) {
            const key = v.axis === 'v' ? (dir > 0 ? 'N' : 'S') : (dir > 0 ? 'W' : 'E');
            const o = obs[I.id];
            if (dStop < CFG.detect && v.v < 8) { o.q[key]++; o.w[key] += v.curStop; } else o.m[key]++;
          }
        }
        let d = gap; if (must) d = Math.min(d, dStop);
        if (d < 0) d = 0;
        const va = Math.sqrt(2 * CFG.brk * d);
        const nv = Math.min(v.v + CFG.acc * dt, CFG.vmax * v.vs, va);
        v.v = nv;
        const adv = Math.min(nv * dt, d);
        const prev = v.p; v.p += dir * adv; v.dist += adv;
        if (v.v < 2) { v.stopT += dt; v.curStop += dt; stopped++; if (!v.was) { v.stops++; v.was = true; } }
        else { v.curStop = 0; if (v.v > 8) v.was = false; }
        for (let i = 0; i < n; i++) { const c = C[i]; if (prev * dir < c * dir && v.p * dir >= c * dir) { turns.push([v, i]); break; } }
      }
    }
    for (const [v, i] of turns) this.maybeTurn(v, i);
    this.t += dt;
    if (this.vis) {
      for (const v of this.vehicles) {
        v.dx *= 0.82; v.dy *= 0.82;
        let diff = this.headingOf(v.axis, v.dir) - v.ang;
        while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
        v.ang += diff * 0.28;
      }
    }
    // exits
    let out = false;
    for (const v of this.vehicles) if (v.p < -40 || v.p > W + 40) { out = true; break; }
    if (out) {
      const keep = [];
      for (const v of this.vehicles) {
        if (v.p < -40 || v.p > W + 40) {
          const s = this.st, delay = Math.max(0, (this.t - v.t0) - v.dist / (CFG.vmax * v.vs));
          if (this.keepDelays) s.delays.push(delay);
          s.exited++; s.delaySum += delay; s.stopSum += v.stops; s.stopTSum += v.stopT; s.exitTimes.push(this.t);
        } else keep.push(v);
      }
      this.vehicles = keep;
    }
    this.stoppedNow = stopped;
    this.st.qInt += stopped * dt; if (stopped > this.st.maxQ) this.st.maxQ = stopped;
    this.serT += dt;
    if (this.serT >= 5 - 1e-9) {
      this.serT = 0;
      const m = this.metrics();
      this.series.push({ t: this.t, q: stopped, d: m.delay, thr: m.thr60 });
      if (this.series.length > 600) this.series.shift();
    }
  }
  maybeTurn(v, i) {
    const u1 = v.tr[2 * v.ti], u2 = v.tr[2 * v.ti + 1]; v.ti++;
    if (u1 === undefined || u1 >= CFG.pTurn) return;
    const nAxis = v.axis === 'h' ? 'v' : 'h', nLine = i, nP = this.C[v.line], nDir = u2 < 0.5 ? 1 : -1;
    for (const u of this.vehicles)
      if (u !== v && u.axis === nAxis && u.line === nLine && u.dir === nDir && Math.abs(u.p - nP) < (u.L + v.L) / 2 + CFG.minGap + 8) return;
    const a = this.vis ? this.xy(v) : null;
    v.axis = nAxis; v.line = nLine; v.dir = nDir; v.p = nP;
    if (a) { const b = this.xy(v); v.dx = a.x - b.x; v.dy = a.y - b.y; }
  }

  metrics() {
    const t = this.t, s = this.st;
    let sum = s.delaySum, cnt = s.exited;
    for (const v of this.vehicles) { sum += Math.max(0, (t - v.t0) - v.dist / (CFG.vmax * v.vs)); cnt++; }
    let pend = 0;
    for (const e of this.entries) for (const it of e.q) { sum += t - it.t0; cnt++; pend++; }
    const et = s.exitTimes; while (et.length && et[0] < t - 60) et.shift();
    return {
      t, exited: s.exited, delay: cnt ? sum / cnt : 0, stops: s.exited ? s.stopSum / s.exited : 0,
      avgQ: t ? s.qInt / t : 0, maxQ: s.maxQ, thr60: et.length, thr: t ? s.exited / (t / 60) : 0,
      inNet: this.vehicles.length, pend, brRounds: s.brN ? s.brRounds / s.brN : 0, brConv: s.brN ? s.brConv / s.brN : 1, sw: s.sw
    };
  }
  allDelays() {
    const t = this.t, out = [];
    if (this.keepDelays) for (const d of this.st.delays) out.push(d);
    for (const v of this.vehicles) out.push(Math.max(0, (t - v.t0) - v.dist / (CFG.vmax * v.vs)));
    for (const e of this.entries) for (const it of e.q) out.push(t - it.t0);
    return out;
  }
}

/* ---------- headless benchmark helper ---------- */
function makeSim(opts, ctrl, seed) { return new Sim(Object.assign({}, opts, { ctrl, seed })); }

/* ---------- statistics ---------- */
function mean(a) { return a.reduce((x, y) => x + y, 0) / (a.length || 1); }
function sd(a) { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); }
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp); let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function betacf(a, b, x) {
  const FP = 1e-300; let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FP) d = FP; d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}
function ibeta(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
function pairedT(a, b) {           // tests mean(a-b) != 0
  const d = a.map((x, i) => x - b[i]), n = d.length;
  if (n < 2) return { t: NaN, p: NaN, md: mean(d) };
  const m = mean(d), s = sd(d);
  if (s === 0) return { t: m === 0 ? 0 : Infinity, p: m === 0 ? 1 : 0, md: m };
  const t = m / (s / Math.sqrt(n));
  return { t, p: ibeta((n - 1) / 2, 0.5, (n - 1) / ((n - 1) + t * t)), md: m };
}
if (typeof module !== 'undefined') module.exports = { Sim, CFG, GP_DEFAULT, makeSim, mean, sd, pairedT };
