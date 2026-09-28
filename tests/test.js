const { Sim, makeSim, mean, sd, pairedT, CFG } = require('../src/engine.js');
console.log('t-test check (t=2.776,df=4 -> p~0.05):', require('../src/engine.js').pairedT([1,2,3,4,5],[0,0,0,0,0]));
function run(opts, dur, seeds){
  const res={};
  for(const ctrl of ['fixed','selfish','nash']){
    res[ctrl]=[];
    for(const s of seeds){
      const sim=makeSim(opts,ctrl,s); const steps=Math.round(dur/CFG.dt);
      for(let i=0;i<steps;i++) sim.step();
      res[ctrl].push(sim.metrics());
    }
  }
  return res;
}
const scen = JSON.parse(process.argv[2]||'{"n":2,"rate":8,"bias":0}');
const gp = process.argv[3]?JSON.parse(process.argv[3]):undefined; if(gp) scen.gp=gp;
const dur=+(process.argv[4]||900); const seeds=[1,2,3,4,5];
const t0=Date.now();
const r=run(scen,dur,seeds);
console.log(JSON.stringify(scen),'time',(Date.now()-t0)/1000,'s');
for(const c of Object.keys(r)){
  const d=r[c].map(m=>m.delay), q=r[c].map(m=>m.avgQ), th=r[c].map(m=>m.thr), st=r[c].map(m=>m.stops), nb=r[c].map(m=>m.inNet), pd=r[c].map(m=>m.pend);
  console.log(c.padEnd(8),'delay',mean(d).toFixed(1),'±',sd(d).toFixed(1),' avgQ',mean(q).toFixed(1),' thr',mean(th).toFixed(1),' stops',mean(st).toFixed(2),' inNet',mean(nb).toFixed(0),' pend',mean(pd).toFixed(0),' br',mean(r[c].map(m=>m.brRounds)).toFixed(2),'conv',mean(r[c].map(m=>m.brConv)).toFixed(2));
}
console.log('p nash vs fixed',pairedT(r.nash.map(m=>m.delay),r.fixed.map(m=>m.delay)).p.toExponential(2),' nash vs selfish',pairedT(r.nash.map(m=>m.delay),r.selfish.map(m=>m.delay)).p.toExponential(2));
