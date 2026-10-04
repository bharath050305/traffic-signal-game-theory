/* Checks for the dynamic features: incidents, emergency-vehicle preemption, live equilibrium analysis.
   Run:  node tests/features.js      (exits non-zero if a check fails) */
const { Sim, makeSim, mean, sd, pairedT, CFG } = require('../src/engine.js');
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
const run = (sim, sec) => { const n = Math.round(sec / CFG.dt); for (let i = 0; i < n; i++) sim.step(); };

/* 1. incident: no vehicle may cross the stop line of a blocked approach while the block lasts */
for (const ctrl of ['fixed', 'selfish', 'nash']) {
  const sim = new Sim({ n: 2, rate: 8, ctrl, seed: 5 });
  run(sim, 120);
  sim.addIncident(0, 'W', 200);                 // approach from the west at J1 (row 0, left-to-right, dir +1)
  let crossings = 0;
  for (let s = 0; s < 2000; s++) {
    const before = new Map(); for (const v of sim.vehicles) if (v.axis === 'h' && v.line === 0 && v.dir > 0) before.set(v.id, v.p + v.L / 2);
    sim.step();
    for (const v of sim.vehicles) {
      const f = before.get(v.id); if (f === undefined || v.axis !== 'h' || v.line !== 0) continue;
      const sl = sim.C[0] - CFG.stopOff, nf = v.p + v.L / 2;
      if (f < sl && nf > sl + 0.6) crossings++;
    }
    if (sim.t > 119 + 200 - 0.2 && !sim.incidents.length) break;
  }
  ok(crossings === 0, ctrl + ': no vehicle crosses a blocked stop line (' + crossings + ' crossings)');
  run(sim, 30);
  ok(sim.incidents.length === 0, ctrl + ': incident expires');
}

/* 2. incident: adaptive controllers should not waste green on a blocked approach (they see it through the detector) */
{
  const mk = ctrl => { const s = new Sim({ n: 2, rate: 8, ctrl, seed: 11 }); run(s, 60); s.addIncident(0, 'N', 300); run(s, 300); return s.metrics(); };
  const f = mk('fixed'), n = mk('nash');
  ok(n.delay < f.delay, 'incident: Nash average delay (' + n.delay.toFixed(1) + ' s) below fixed-time (' + f.delay.toFixed(1) + ' s)');
}

/* 3. ambulance: arrives, is recorded, and the adaptive controller with preemption is faster than fixed-time */
{
  const trips = {};
  for (const [name, ctrl, pre] of [['fixed', 'fixed', true], ['nash-off', 'nash', false], ['nash-on', 'nash', true]]) {
    trips[name] = [];
    for (let seed = 1; seed <= 8; seed++) {
      const s = new Sim({ n: 2, rate: 8, ctrl, seed: 100 + seed, preempt: pre, vis: true });
      run(s, 200); s.sendAmbulance('h', 0, 1);
      for (let i = 0; i < 6000 && s.ambulancesActive(); i++) s.step();
      if (s.em.length) trips[name].push(s.em[0].tt);
    }
  }
  const m = k => mean(trips[k]).toFixed(1);
  console.log('   ambulance trip (s): fixed ' + m('fixed') + ' (n=' + trips.fixed.length + '), nash without preemption ' + m('nash-off') + ', nash with preemption ' + m('nash-on'));
  ok(trips['nash-on'].length === 8 && trips.fixed.length === 8, 'ambulance completes its trip in every run');
  ok(mean(trips['nash-on']) < mean(trips.fixed), 'preemption beats fixed-time on ambulance trip time');
  ok(mean(trips['nash-on']) < mean(trips['nash-off']), 'preemption beats the same controller without it');
}

/* 4. equilibrium analysis: found profile is a pure Nash equilibrium; efficiency within [0,1]; count >= 1 */
for (const n of [2, 3]) {
  const s = new Sim({ n, rate: 9, ctrl: 'nash', seed: 3, analyze: true, vis: true });
  run(s, 240);
  const m = s.metrics();
  ok(s.eq && s.eq.nNE >= 1, n + 'x' + n + ': at least one pure Nash equilibrium found by enumeration (mean ' + m.eqNE.toFixed(2) + ')');
  ok(m.eqEff >= 0 && m.eqEff <= 1.0000001, n + 'x' + n + ': equilibrium efficiency in [0,1] (mean ' + (m.eqEff * 100).toFixed(1) + '%, optimal in ' + (m.eqOpt * 100).toFixed(0) + '% of decisions)');
  ok(s.eq.foundIsNE === true || !s.converged, n + 'x' + n + ': profile returned by best-response is an equilibrium whenever it converged');
}

/* 5. determinism: analysis and logging must not change traffic outcomes */
{
  const a = new Sim({ n: 2, rate: 8, ctrl: 'nash', seed: 9 }), b = new Sim({ n: 2, rate: 8, ctrl: 'nash', seed: 9, analyze: true, vis: true });
  run(a, 300); run(b, 300);
  ok(a.metrics().delay === b.metrics().delay && a.metrics().exited === b.metrics().exited, 'analysis/visual mode do not alter the simulation (delay ' + a.metrics().delay.toFixed(2) + ')');
}

console.log(fails ? '\n' + fails + ' CHECK(S) FAILED' : '\nall feature checks passed');
process.exit(fails ? 1 : 0);
