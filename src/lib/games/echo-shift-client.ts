import * as THREE from 'three';
import {ECHO_COPY} from './echo-shift-copy';
import {advanceEchoShift,createEchoShift,echoVisible,echoWall,ECHO_WIDTH,ECHO_HEIGHT,ECHO_MAX_TURNS,ECHO_RELIC,ECHO_EXIT,type EchoAction,type EchoPoint} from './echo-shift';
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
type Locale=keyof typeof ECHO_COPY;
const requested=new URLSearchParams(location.search).get('lang')??'ko';
let locale:Locale=requested in ECHO_COPY?requested as Locale:'ko';
const date=new Date(),seed=date.getUTCFullYear()*10000+(date.getUTCMonth()+1)*100+date.getUTCDate();
let state=createEchoShift(seed),sound=false,audio:AudioContext|null=null,frame=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const stage=el('stage'),canvas=el<HTMLCanvasElement>('canvas');
let renderer:THREE.WebGLRenderer|null=null;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-7,7,6,-6,.1,100);
camera.position.set(0,14,10);camera.lookAt(0,0,0);
scene.add(new THREE.AmbientLight('#b0eaf0',1.6));const light=new THREE.DirectionalLight('#d1fbff',3);light.position.set(-3,8,4);scene.add(light);
const cells:{point:EchoPoint;mesh:THREE.Mesh}[]=[];
for(let y=0;y<ECHO_HEIGHT;y++)for(let x=0;x<ECHO_WIDTH;x++){
 const wall=echoWall({x,y}),mesh=new THREE.Mesh(new THREE.BoxGeometry(.94,wall?.55:.06,.94),new THREE.MeshStandardMaterial({color:wall?'#244d66':'#112c3c',metalness:.4,roughness:.65,emissive:wall?'#14617b':'#092c3c',emissiveIntensity:.35}));
 mesh.position.set(x-5,wall?.28:0,y-4);scene.add(mesh);cells.push({point:{x,y},mesh});
}
function marker(color:string,shape:'orb'|'relic'|'exit'){
 const geometry=shape==='orb'?new THREE.SphereGeometry(.22,16,12):shape==='relic'?new THREE.OctahedronGeometry(.28):new THREE.TorusGeometry(.32,.07,8,24);
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2,roughness:.3}));if(shape==='exit')mesh.rotation.x=-Math.PI/2;scene.add(mesh);return mesh;
}
const player=marker('#83ffdd','orb'),hunter=marker('#ff8d68','orb'),relic=marker('#ffd478','relic'),exit=marker('#af98fa','exit');
const ring=new THREE.Mesh(new THREE.RingGeometry(.97,1,80),new THREE.MeshBasicMaterial({color:'#62e9db',transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
const place=(mesh:THREE.Object3D,p:EchoPoint,height=.3)=>mesh.position.set(p.x-5,height,p.y-4);
place(relic,ECHO_RELIC);place(exit,ECHO_EXIT,.12);
function draw(){
 if(renderer){for(const cell of cells)cell.mesh.visible=echoVisible(state,cell.point);place(player,state.player);place(hunter,state.hunter);hunter.visible=echoVisible(state,state.hunter);relic.visible=!state.carrying&&echoVisible(state,ECHO_RELIC);renderer.render(scene,camera);}
 else {const fallback=el('fallback');fallback.replaceChildren();for(let y=0;y<ECHO_HEIGHT;y++)for(let x=0;x<ECHO_WIDTH;x++){const p={x,y},cell=document.createElement('span'),visible=echoVisible(state,p);cell.style.background=visible?(echoWall(p)?'#31566b':'#142c3d'):'#09111a';if(x===state.player.x&&y===state.player.y){cell.textContent='●';cell.style.color='#83ffdd';}else if(visible&&x===state.hunter.x&&y===state.hunter.y){cell.textContent='●';cell.style.color='#ff8d68';}else if(x===ECHO_EXIT.x&&y===ECHO_EXIT.y){cell.textContent='▣';cell.style.color='#af98fa';}else if(visible&&!state.carrying&&x===ECHO_RELIC.x&&y===ECHO_RELIC.y){cell.textContent='◆';cell.style.color='#ffd478';}fallback.append(cell);}}
}
function resize(){if(!renderer)return;const width=stage.clientWidth,height=stage.clientHeight;renderer.setSize(width,height,false);const zoom=Math.min(width/13,height/11);camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.zoom=zoom;camera.updateProjectionMatrix();draw();}
try{if(new URLSearchParams(location.search).get('view')==='2d')throw new Error('2D selected');renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));resize();}catch{canvas.hidden=true;el('fallback').hidden=false;}
const observer=new ResizeObserver(resize);observer.observe(stage);
function pulseAnimation(action:'soft'|'loud'){
 cancelAnimationFrame(frame);ring.visible=false;if(!renderer||reduced.matches){draw();return;}
 const start=performance.now();place(ring,state.player,.09);ring.visible=true;ring.material.color.set(action==='loud'?'#ffa870':'#62e9db');
 const animate=(now:number)=>{const progress=Math.min(1,(now-start)/550);ring.scale.setScalar(.1+progress*(action==='loud'?12:3));ring.material.opacity=(1-progress)*.65;draw();if(progress<1)frame=requestAnimationFrame(animate);else{ring.visible=false;draw();}};frame=requestAnimationFrame(animate);
}
async function beep(){if(!sound||!state.echo)return;try{audio??=new AudioContext();await audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain(),pan=audio.createStereoPanner();oscillator.frequency.value=230+Math.max(0,15-state.echo.distance)*32;pan.pan.value=Math.max(-1,Math.min(1,state.echo.dx/6));gain.gain.setValueAtTime(.05,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.22);oscillator.connect(gain).connect(pan).connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+.23);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();pan.disconnect();};}catch{sound=false;el('audio-status').textContent=ECHO_COPY[locale].audioError;render();}}
function render(){const t=ECHO_COPY[locale];document.documentElement.lang=locale;document.title=t.title;el<HTMLSelectElement>('lang').value=locale;for(const id of ['title','hook','intro','soft','loud','wait','reset','help','note'] as const)el(id).textContent=t[id];for(const id of ['turn','alert','relic'] as const)el(id+'-label').textContent=t[id];el('turn').textContent=String(ECHO_MAX_TURNS-state.turn);el('alert').textContent=String(state.alert);el('relic').textContent=state.carrying?t.yes:t.no;el('status').textContent=t[state.phase];el('sound').textContent=`${t.sound}: ${sound?t.on:t.off}`;el('sound').setAttribute('aria-pressed',String(sound));stage.setAttribute('aria-label',t.area);canvas.setAttribute('aria-label',t.area);el('fallback').setAttribute('aria-label',t.area);
 const read=state.echo,direction=read?[read.dy<0?t.up:read.dy>0?t.down:'',read.dx<0?t.left:read.dx>0?t.right:''].filter(Boolean).join(' · '):'';el('echo').textContent=read?`${t.echo}: ${direction||t.same} · ${read.distance} ${t.steps}`:t.none;
 document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button=>{button.disabled=state.phase!=='playing';const a=button.dataset.action as EchoAction;if(['up','down','left','right'].includes(a))button.setAttribute('aria-label',t[a as 'up'|'down'|'left'|'right']);});draw();}
function act(action:EchoAction){const next=advanceEchoShift(state,action);if(next===state)return;state=next;render();if(action==='soft'||action==='loud'){pulseAnimation(action);void beep();}}
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button=>button.onclick=()=>act(button.dataset.action as EchoAction));
el('reset').onclick=()=>{cancelAnimationFrame(frame);ring.visible=false;state=createEchoShift(seed);el('audio-status').textContent='';render();stage.focus();};
el('sound').onclick=()=>{sound=!sound;render();};el<HTMLSelectElement>('lang').onchange=event=>{locale=(event.target as HTMLSelectElement).value as Locale;render();};
window.addEventListener('keydown',event=>{if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;if(event.target instanceof HTMLElement&&event.target.closest('button,input,select,textarea,[contenteditable=true]'))return;const keys:Record<string,EchoAction>={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',q:'soft',e:'loud',' ':'wait'};const action=keys[event.key.length===1?event.key.toLowerCase():event.key];if(action){event.preventDefault();act(action);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);ring.visible=false;draw();}});
window.addEventListener('pagehide',event=>{if(event.persisted){cancelAnimationFrame(frame);ring.visible=false;return;}cancelAnimationFrame(frame);observer.disconnect();renderer?.dispose();void audio?.close().catch(()=>{});scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(m=>m.dispose());}});});
render();
