/* Reproduces every number quoted in the project report.
   Run:  node tests/experiments.js        (about a minute)  ->  writes docs/results.json
   Common random numbers: for a given seed every controller sees identical arrivals. */
const fs = require('fs');
const path = require('path');
const { Sim, makeSim, mean, sd, pairedT, CFG } = require('../src/engine.js');

const SEEDS = Array.from({ length: 10 }, (_, k) => 1000 + k * 101), DUR = 900, STEPS = Math.round(DUR / CFG.dt);
const CTRL = ['fixed', 'selfish', 'nash'];
const pct = (a, b) => (a - b) / b * 100;
const p95 = a => { const s = a.slice().sort((x, y) => x - y), k = (s.length - 1) * 0.95, f = Math.floor(k), c = Math.ceil(k); return s[f] + (s[c] - s[f]) * (k - f); };

function disruptionPlan(mode, n, dur) {
  const ev = [];
  if (mode === 'incident' || mode === 'both') { ev.push({ t: 240, f: s => s.addIncident(0, 'N', 120) }); ev.push({ t: 540, f: s => s.addIncident(n * n - 1, 'S', 120) }); }
  if (mode === 'amb' || mode === 'both') { ev.push({ t: 180, f: s => s.sendAmbulance('h', 0, 1) }); ev.push({ t: 480, f: s => s.sendAmbulance('v', 0, 1) }); ev.push({ t: 720, f: s => s.sendAmbulance('h', n - 1, -1) }); }
  return ev.filter(e => e.t < dur - 60).sort((a, b) => a.t - b.t);
}
function runOne(opts, ctrl, seed, disrupt) {
  const sim = makeSim(Object.assign({ keepDelays: true }, opts), ctrl, seed), plan = disruptionPlan(disrupt || 'none', opts.n, DUR); let pi = 0;
  for (let s = 0; s < STEPS; s++) { while (pi < plan.length && sim.t >= plan[pi].t) plan[pi++].f(sim); sim.step(); }
  const m = sim.metrics(); m.p95 = p95(sim.allDelays()); return m;
}
function experiment(name, opts, disrupt) {
  const R = {}; for (const c of CTRL) R[c] = SEEDS.map(s => runOne(opts, c, s, disrupt));
  const col = (c, f) => R[c].map(f), out = { name, opts, disrupt: disrupt || 'none', seeds: SEEDS.length, controllers: {}, tests: {} };
  for (const c of CTRL) out.controllers[c] = {
    delay: [mean(col(c, m => m.delay)), sd(col(c, m => m.delay))], p95: [mean(col(c, m => m.p95)), sd(col(c, m => m.p95))],
    stopped: [mean(col(c, m => m.avgQ)), sd(col(c, m => m.avgQ))], stops: [mean(col(c, m => m.stops)), sd(col(c, m => m.stops))],
    thr: [mean(col(c, m => m.thr)), sd(col(c, m => m.thr))], idleH: [mean(col(c, m => m.idleH)), sd(col(c, m => m.idleH))],
    amb: col(c, m => m.amb).some(isNaN) ? null : [mean(col(c, m => m.amb)), sd(col(c, m => m.amb))],
    brRounds: mean(col(c, m => m.brRounds)), brConv: mean(col(c, m => m.brConv)) };
  const cmp = (a, b, f) => { const t = pairedT(col(a, f), col(b, f)); return { change: pct(mean(col(a, f)), mean(col(b, f))), p: t.p }; };
  out.tests.nashVsFixed = cmp('nash', 'fixed', m => m.delay); out.tests.selfishVsFixed = cmp('selfish', 'fixed', m => m.delay); out.tests.nashVsSelfish = cmp('nash', 'selfish', m => m.delay);
  out.tests.p95NashVsFixed = cmp('nash', 'fixed', m => m.p95); out.tests.idleNashVsFixed = cmp('nash', 'fixed', m => m.idleH);
  if (out.controllers.nash.amb && out.controllers.fixed.amb) out.tests.ambNashVsFixed = cmp('nash', 'fixed', m => m.amb);
  console.log(name.padEnd(34), 'fixed', out.controllers.fixed.delay[0].toFixed(1).padStart(5), 'selfish', out.controllers.selfish.delay[0].toFixed(1).padStart(5), 'nash', out.controllers.nash.delay[0].toFixed(1).padStart(5),
    '| nash vs fixed', out.tests.nashVsFixed.change.toFixed(1) + '% p=' + out.tests.nashVsFixed.p.toExponential(1), '| nash vs selfish', out.tests.nashVsSelfish.change.toFixed(1) + '% p=' + out.tests.nashVsSelfish.p.toFixed(3));
  return out;
}

const T0 = Date.now(), results = { generated: new Date().toISOString(), seeds: SEEDS, durationSeconds: DUR, scenarios: [], disruptions: [], sweep: [], equilibrium: [], preemption: null };

/* 1. traffic scenarios */
for (const [name, o] of [
  ['2x2 balanced (8 veh/min)', { n: 2, rate: 8, bias: 0 }], ['2x2 east-west rush (+45%)', { n: 2, rate: 8, bias: 0.45 }],
  ['2x2 heavy load (11 veh/min)', { n: 2, rate: 11, bias: 0 }], ['2x2 rush-hour wave', { n: 2, rate: 9, bias: 0, profile: 'rush' }],
  ['3x3 balanced (8 veh/min)', { n: 3, rate: 8, bias: 0 }], ['3x3 heavy load (11 veh/min)', { n: 3, rate: 11, bias: 0 }]]) results.scenarios.push(experiment(name, o));

/* 2. disruptions */
for (const [name, mode] of [['2x2 balanced + blocked approaches', 'incident'], ['2x2 balanced + ambulance runs', 'amb'], ['2x2 balanced + both', 'both']])
  results.disruptions.push(experiment(name, { n: 2, rate: 8, bias: 0 }, mode));

/* 3. preemption on/off for the Nash controller (ambulance trips) */
{
  const trip = pre => SEEDS.map(s => { const m = runOne({ n: 2, rate: 8, bias: 0, preempt: pre }, 'nash', s, 'amb'); return m.amb; });
  const on = trip(true), off = trip(false), fx = SEEDS.map(s => runOne({ n: 2, rate: 8, bias: 0 }, 'fixed', s, 'amb').amb);
  const t = pairedT(on, off);
  results.preemption = { on: [mean(on), sd(on)], off: [mean(off), sd(off)], fixed: [mean(fx), sd(fx)], pOnVsOff: t.p, change: pct(mean(on), mean(off)) };
  console.log('ambulance trip: preemption on', mean(on).toFixed(1), 'off', mean(off).toFixed(1), 'fixed', mean(fx).toFixed(1), 'p(on vs off)=' + t.p.toFixed(4));
}

/* 4. lambda sweep, two loads */
for (const [name, o] of [['2x2 balanced', { n: 2, rate: 8, bias: 0 }], ['3x3 heavy', { n: 3, rate: 11, bias: 0 }]]) {
  const row = { name, points: [] };
  for (const lam of [0, 0.3, 0.6, 0.9, 1.2, 1.8, 2.4, 3.0]) { const v = SEEDS.map(s => runOne(Object.assign({ gp: { lam } }, o), 'nash', s).delay); row.points.push({ lam, mean: mean(v), sd: sd(v) }); }
  row.fixed = mean(SEEDS.map(s => runOne(o, 'fixed', s).delay)); results.sweep.push(row);
  console.log('sweep', name, row.points.map(p => p.lam + ':' + p.mean.toFixed(1)).join('  '), ' fixed', row.fixed.toFixed(1));
}

/* 5. equilibrium quality */
for (const [name, o] of [['2x2 balanced', { n: 2, rate: 8, bias: 0 }], ['3x3 balanced', { n: 3, rate: 8, bias: 0 }], ['3x3 heavy', { n: 3, rate: 11, bias: 0 }]]) {
  const effs = [], opts = [], nes = [], conv = [];
  for (const s of SEEDS) { const sim = new Sim(Object.assign({ analyze: true, ctrl: 'nash', seed: s }, o)); for (let k = 0; k < STEPS; k++) sim.step(); const m = sim.metrics(); effs.push(m.eqEff); opts.push(m.eqOpt); nes.push(m.eqNE); conv.push(m.brConv); }
  results.equilibrium.push({ name, efficiency: [mean(effs), sd(effs)], bestPlanShare: [mean(opts), sd(opts)], nashCount: [mean(nes), sd(nes)], converged: mean(conv) });
  console.log('equilibrium', name, 'efficiency', (mean(effs) * 100).toFixed(1) + '%', 'best-plan share', (mean(opts) * 100).toFixed(0) + '%', 'NE count', mean(nes).toFixed(2), 'converged', (mean(conv) * 100).toFixed(1) + '%');
}

fs.writeFileSync(path.join(__dirname, '..', 'docs', 'results.json'), JSON.stringify(results, null, 1));
console.log('wrote docs/results.json in', ((Date.now() - T0) / 1000).toFixed(0), 's');
