const { Sim, CFG } = require('../src/engine.js');
for (const ctrl of ['fixed','selfish','nash']) {
  const sim = new Sim({n:3, rate:10, bias:0.2, ctrl, seed:7});
  let overlap=0, conflict=0, minGap=1e9, samples=0;
  for (let s=0;s<6000;s++){
    sim.step();
    if(s%5) continue;
    const lanes={};
    for(const v of sim.vehicles){ const k=v.axis+v.line+v.dir; (lanes[k]=lanes[k]||[]).push(v); }
    for(const a of Object.values(lanes)){ a.sort((x,y)=>x.p*x.dir-y.p*y.dir); for(let i=1;i<a.length;i++){ const g=(a[i].p-a[i-1].p)*a[i].dir-(a[i].L+a[i-1].L)/2; if(g<minGap)minGap=g; if(g<-0.5) overlap++; } }
    // box conflicts
    for(const I of sim.inter){ let h=0,vv=0; for(const v of sim.vehicles){ const xy=sim.xy(v); if(Math.abs(xy.x-I.x)<CFG.box-4 && Math.abs(xy.y-I.y)<CFG.box-4){ if(v.axis==='h')h++; else vv++; } } if(h&&vv) conflict++; }
    samples++;
  }
  console.log(ctrl,'overlaps',overlap,'box-conflicts',conflict,'minGap',minGap.toFixed(2),'inNet',sim.vehicles.length);
}
