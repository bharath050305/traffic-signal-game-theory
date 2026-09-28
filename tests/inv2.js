const { Sim, CFG } = require('../src/engine.js');
for (const ctrl of ['fixed','selfish','nash']) {
  const sim = new Sim({n:3, rate:10, bias:0.2, ctrl, seed:7});
  let viol=0, cross=0;
  const prevFront=new Map();
  for (let s=0;s<6000;s++){
    // record fronts before the step
    const before=new Map(); for(const v of sim.vehicles) before.set(v.id,{f:v.p+v.dir*v.L/2,axis:v.axis,line:v.line,dir:v.dir});
    sim.step();
    for(const v of sim.vehicles){
      const b=before.get(v.id); if(!b||b.axis!==v.axis||b.line!==v.line) continue;
      const f=v.p+v.dir*v.L/2;
      for(let i=0;i<sim.n;i++){
        const sl=sim.C[i]-v.dir*CFG.stopOff;
        if(b.f*v.dir<sl*v.dir && f*v.dir>sl*v.dir+0.6){
          cross++;
          const I=v.axis==='h'?sim.inter[v.line*sim.n+i]:sim.inter[i*sim.n+v.line];
          const my=v.axis==='v'?0:1;
          const okGreen=I.phase===my&&(I.status==='green'||I.status==='yellow');
          if(!okGreen) viol++;
        }
      }
    }
  }
  console.log(ctrl,'stop-line crossings',cross,'red-light violations',viol);
}
