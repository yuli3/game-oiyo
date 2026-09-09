import {createShip,startShip,assignShip,assignCrew,stepShip,shipIncident,getBestForConditions,recordShipArrival} from './one-room-spaceship-engine.js';
import {COPY} from './one-room-spaceship-copy.js';
const $ = id => document.getElementById(id);
const systems = ['oxygen','cooling','power','thrust'];
const requested = new URLSearchParams(location.search).get('lang');
let language = Object.hasOwn(COPY, requested) ? requested : 'ko';
let ship = createShip(), paused = false, role = 'captain', recorded = false, timer;
$('locale').value = language;
let audioContext, soundEnabled = false, soundUnavailable = false;
function tone(frequency, duration = .12) {
  if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(.045, now + .01);
  gain.gain.exponentialRampToValueAtTime(.001, now + duration);
  oscillator.connect(gain); gain.connect(audioContext.destination);
  oscillator.start(); oscillator.stop(now + duration);
  oscillator.onended = () => {oscillator.disconnect();gain.disconnect();};
}
$('sound').onclick = async () => {
  if (soundEnabled) {soundEnabled = false;draw();return;}
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Audio unavailable');
    audioContext ??= new Audio();
    await audioContext.resume();
    soundEnabled = audioContext.state === 'running';
    soundUnavailable = !soundEnabled;
    tone(520);
  } catch {soundEnabled = false;soundUnavailable = true;}
  draw();
};
const conditions = () => ({seed:'voyage-v2',difficulty:ship.crew,assist:$('view-mode').value === 'split' && ship.crew === 'human' ? 'none' : 'hint'});
function draw() {
  const t = COPY[language];
  document.querySelector('main').dataset.flight = String(ship.status !== 'ready');
  $('sound').setAttribute('aria-pressed',String(soundEnabled));
  $('sound-feedback').textContent = soundUnavailable ? t.soundUnavailable : '';
  const split = ship.crew === 'human' && $('view-mode').value === 'split';
  const ended = ship.status === 'arrived' || ship.status === 'lost';
  document.documentElement.lang = language; document.title = t.title;
  document.querySelectorAll('[data-copy]').forEach(el => {el.textContent = t[el.dataset.copy];});
  for (const key of ['oxygen','heat','power']) {
    const concealed = split && !ended && (role === 'captain' ? key === 'heat' || key === 'power' : key === 'oxygen');
    $(key).textContent = concealed ? '—' : Math.max(0,ship[key]).toFixed(0)+'%';
    $(key).title = concealed ? t.hidden : '';
    $(key+'-meter').hidden = concealed;
    $(key+'-meter').value = concealed ? 0 : ship[key];
    $(key+'-meter').setAttribute('aria-label',t[key]);
  }
  $('clock').textContent = (90-ship.elapsed)+t.seconds;
  $('distance').textContent = t.route+' '+(split && role === 'crew' && !ended ? '—' : ship.distance.toFixed(1))+' / 65';
  $('thrust').textContent = split && role === 'crew' && !ended ? '—' : ship.primary === 'thrust' || ship.secondary === 'thrust' ? t.active : t.idle;
  $('mode').disabled = ship.status !== 'ready'; $('view-mode').disabled = ship.status !== 'ready';
  $('view-setting').hidden = ship.crew !== 'human'; $('role-switch').hidden = !split;
  $('captain-view').setAttribute('aria-pressed',String(role === 'captain'));
  $('crew-view').setAttribute('aria-pressed',String(role === 'crew'));
  $('captain-controls').hidden = split && role !== 'captain';
  $('crew-controls').hidden = ship.crew !== 'human' || split && role !== 'crew';
  document.querySelectorAll('[data-system]').forEach((b,i) => {
    b.textContent = (i+1)+' · '+t[b.dataset.system];
    b.setAttribute('aria-pressed',String(b.dataset.system === ship.primary));
    b.disabled = ended || ship.crew === 'human' && b.dataset.system === ship.secondary;
  });
  document.querySelectorAll('[data-crew]').forEach((b,i) => {
    b.textContent = ['Q','W','E','R'][i]+' · '+t[b.dataset.crew];
    b.setAttribute('aria-pressed',String(b.dataset.crew === ship.secondary));
    b.disabled = ended || b.dataset.crew === ship.primary;
  });
  const incident = ended ? null : shipIncident(ship.elapsed);
  $('weather').textContent = incident ? t.incident+': '+t[incident]+' · '+(10-ship.elapsed%10)+' '+t.deadline : t.stable;
  $('crew').textContent = t.crew+': '+t[ship.secondary]+(ship.crew === 'computer' ? ' · '+t.computer : '');
  const reason = ship.oxygen <= 0 ? t.failedOxygen : ship.heat >= 100 ? t.failedHeat : ship.power <= 0 ? t.failedPower : t.failedRoute;
  $('status').textContent = ship.status === 'arrived' ? t.arrived : ship.status === 'lost' ? t.lost+' · '+reason : paused ? t.paused : ship.status === 'ready' ? t.ready : t.flying;
  $('launch').disabled = ship.status !== 'ready'; $('pause').disabled = ship.status !== 'flying';
  $('pause').textContent = paused ? t.resume : t.pause;
  if (ship.status === 'arrived' && !recorded) {
    recorded = true;
    recordShipArrival(ship,conditions());
  }
  const best = getBestForConditions('one-room-spaceship',conditions());
  $('best').textContent = t.best+': '+(best?.value ?? '—');
}
const choose = key => {const next = assignShip(ship,key);if(next !== ship) tone(440);ship = next;draw();};
const chooseCrew = key => {const next = assignCrew(ship,key);if(next !== ship) tone(330);ship = next;draw();};
const reset = () => {ship = createShip($('mode').value); paused = false; recorded = false; role = 'captain'; draw();};
document.querySelectorAll('[data-system]').forEach(b => {b.onclick = () => choose(b.dataset.system);});
document.querySelectorAll('[data-crew]').forEach(b => {b.onclick = () => chooseCrew(b.dataset.crew);});
$('mode').onchange = reset; $('view-mode').onchange = () => {role='captain';draw();};
$('locale').onchange = () => {language=$('locale').value;draw();};
$('captain-view').onclick = () => {role='captain';draw();}; $('crew-view').onclick = () => {role='crew';draw();};
$('launch').onclick = () => {ship=startShip(ship);draw();};
$('pause').onclick = () => {paused=!paused;draw();}; $('reset').onclick = reset;
document.addEventListener('keydown',e => {
  if(e.repeat || e.ctrlKey || e.altKey || e.metaKey || ['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
  const split = ship.crew === 'human' && $('view-mode').value === 'split';
  const captainKey=systems[Number(e.key)-1], crewKey=systems['qwer'.indexOf(e.key.toLowerCase())];
  if(captainKey && (!split || role === 'captain')) {e.preventDefault();choose(captainKey);}
  if(crewKey && ship.crew === 'human' && (!split || role === 'crew')) {e.preventDefault();chooseCrew(crewKey);}
});
document.addEventListener('visibilitychange',() => {if(document.hidden && ship.status === 'flying'){paused=true;draw();}});
function startTimer(){clearInterval(timer);timer=setInterval(() => {if(!paused && ship.status === 'flying'){ship=stepShip(ship);if(ship.status === 'arrived') tone(880,.6);else if(ship.status === 'lost') tone(160,.6);else if(shipIncident(ship.elapsed) && (ship.elapsed%10 === 0 || ship.elapsed%10 >= 7)) tone(660);draw();}},1000);}
window.addEventListener('pagehide',() => clearInterval(timer));
window.addEventListener('pageshow',() => {startTimer();draw();});
startTimer(); draw();
