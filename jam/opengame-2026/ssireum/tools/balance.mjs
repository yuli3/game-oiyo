// Balance check: two scripted players against each rival, 300 rounds each.
// Run: node ssireum/tools/balance.mjs
import { makeWrestler, step, aiThink, startTech, vulnerability, counterOf, TECH } from '../src/sim.js';
import { makeRng } from '../src/rng.js';
const RIVALS = [[0.25,0.1,1.2,0.9,0.75],[0.45,0.25,0.9,1.15,0.95],[0.6,0.4,1,1,1.1],[0.72,0.55,0.7,1.35,1.05],[0.92,0.72,1,1.25,1.25]];
// player bots: "masher" pushes and spams random techs; "reader" uses visible hints with human reaction 0.3s
function bot(kind, me, o, st, dt, rng) {
  st.t = (st.t||0) - dt;
  if (kind === 'masher') { me.drive = 1; if (st.t<=0){ st.t=0.6+rng()*0.6; startTech(me, Object.keys(TECH)[(rng()*3)|0]); } return; }
  // reader
  if (o.tech && !st.ans && o.tech.t/o.speed > 0.38) { st.ans = true; if (rng()<0.6) startTech(me, counterOf(o.tech.type)); }
  if (!o.tech) st.ans = false;
  if (st.t>0) return; st.t = 0.2;
  let best=null,bv=0.6; for (const t of Object.keys(TECH)){const v=vulnerability(o,t); if(v>bv){bv=v;best=t;}}
  if (best && rng()<0.6) { startTech(me,best); return; }
  if (me.lean < -0.4) me.drive = 1; else if (me.lean > 0.5) me.drive = -1; else me.drive = rng()<0.5?1:rng()<0.5?-1:0;
}
for (const kind of ['masher','reader']) {
  for (let r=0;r<5;r++){
    const [skill,counter,aggro,str,speed]=RIVALS[r]; let wins=0, tot=0, N=300, kinds={};
    for (let n=0;n<N;n++){
      const rng=makeRng(n*7+r+1);
      const m={x:0,vx:0,suddenDeath:false,w:[makeWrestler(0),makeWrestler(1,{str,speed})]};
      const ai={skill,counter,aggro,pref:{lift:1,trip:1,twist:1},react:0.2}; const st={};
      let t=0, ev=null; const dt=1/120;
      while(t<60){ bot(kind,m.w[0],m.w[1],st,dt,rng); aiThink(ai,m.w[1],m.w[0],dt,rng); ev=step(m,dt,rng); t+=dt; if(t>40)m.suddenDeath=true; if(ev&&ev.kind!=='blocked')break; if(Math.abs(m.x)>3.1){m.x=0;m.vx=0;} }
      tot+=t; if(!ev||ev.kind==='blocked'){kinds.none=(kinds.none||0)+1;continue;}
      const w = ev.kind==='fall'? 1-ev.loser.side : ev.attacker.side; if(w===0)wins++;
      const k=ev.kind+(ev.reversal?'R':'')+(ev.type||''); kinds[k]=(kinds[k]||0)+1;
    }
    console.log(kind,'rival',r,'P1 round win%',(wins/N*100).toFixed(0),'avg s',(tot/N).toFixed(1),JSON.stringify(kinds));
  }
}
