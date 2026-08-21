import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Gamepad2, Headphones, Route, Sparkles, Swords } from "lucide-react";
import type { Locale } from "../../lib/i18n";
import {
  EMBERDEEP_SAVE_KEY,
  HERO_STATS,
  attackConnects,
  comboDamage,
  explainCastFailure,
  hitStopFrames,
  parseEmberdeepSave,
  scoreForHit,
  spendMana,
  type HeroClass,
  type SpellId,
} from "../../lib/games/emberdeep";

type Phase = "briefing" | "playing" | "result";
type EnemyKind = "raider" | "hound" | "knight";
interface Enemy { id: number; kind: EnemyKind; x: number; y: number; hp: number; maxHp: number; vx: number; hit: number; attack: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface Result { score: number; room: number; kills: number; path: string; won: boolean; }
interface Copy {
  eyebrow: string; title: string; subtitle: string; start: string; again: string; best: string;
  choose: string; controls: string; desktop: string; mobile: string; local: string; localBody: string;
  features: { title: string; body: string }[]; heroes: Record<HeroClass, { name: string; role: string }>;
  hud: { score: string; room: string; combo: string; choosePath: string; crypt: string; foundry: string; victory: string; fallen: string; mana: string };
}

const EN: Copy = {
  eyebrow: "THE ASHEN GATE / LOCAL CO-OP SPIRIT",
  title: "Emberdeep",
  subtitle: "Descend through a living fortress of ash. Drive enemies across depth lanes, weave four-hit weapon strings into arcane casts, and choose which haunted wing opens next.",
  start: "Enter the gate", again: "Descend again", best: "Best score", choose: "Choose your oath",
  controls: "Controls", desktop: "WASD / arrows move · J attack · K spell · L dodge · 1–3 change spell · Space jump",
  mobile: "Directional pad · ATTACK · SPELL · DODGE · JUMP", local: "A complete on-device dungeon",
  localBody: "Enemy AI, progress, saves, lighting and retro audio run in this tab. No account, network player or downloaded soundtrack.",
  features: [
    { title: "Weighty combo combat", body: "Four-hit strings, launchers, air strikes, hit-stop, knockback and screen shake make every steel impact readable." },
    { title: "Sword and sorcery", body: "Spend regenerating mana on ember waves, frost bursts and chain lightning; cancel melee recovery into a cast." },
    { title: "Branching underworld", body: "Choose the haunted crypt or molten foundry between encounters. Each wing changes enemies, color, hazards and final guardian." },
  ],
  heroes: {
    spellblade: { name: "Maelin", role: "Balanced spellblade" },
    warden: { name: "Brom", role: "Armored oath-warden" },
    arcanist: { name: "Ilyra", role: "High-mana arcanist" },
  },
  hud: { score: "SCORE", room: "ROOM", combo: "CHAIN", choosePath: "CHOOSE THE NEXT WING", crypt: "CRYPT OF WHISPERS", foundry: "ASHEN FOUNDRY", victory: "OATH FULFILLED", fallen: "THE DEEP CLAIMS ANOTHER", mana: "NOT ENOUGH MANA" },
};
const COPY: Record<Locale, Copy> = {
  en: EN,
  ko: { ...EN, eyebrow: "잿빛 관문 / 로컬 판타지 원정", subtitle: "살아 움직이는 잿빛 요새로 내려가세요. 깊이 레인을 오가며 적을 몰아붙이고, 4연타 무기 콤보와 비전 주문을 엮은 뒤 다음 던전 경로를 직접 선택합니다.", start: "관문 진입", again: "다시 원정", best: "최고 점수", choose: "서약 선택", controls: "조작", desktop: "WASD/방향키 이동 · J 공격 · K 주문 · L 회피 · 1–3 주문 변경 · Space 점프", mobile: "방향 패드 · 공격 · 주문 · 회피 · 점프", local: "기기 안에서 완결되는 던전", localBody: "적 AI, 진행, 저장, 조명과 레트로 사운드는 이 탭에서만 실행됩니다. 계정·네트워크 플레이어·다운로드 음원이 없습니다.", features: [{ title: "묵직한 콤보 전투", body: "4연타, 띄우기, 공중 공격, 히트스톱, 넉백과 화면 흔들림으로 강철 충돌의 무게를 살렸습니다." }, { title: "검과 주문", body: "재생되는 마나로 불꽃 파동, 서리 폭발, 연쇄 번개를 사용하고 근접 후딜을 주문으로 취소합니다." }, { title: "갈라지는 지하 세계", body: "전투 사이에 속삭임의 묘실과 잿빛 주조소 중 하나를 선택합니다. 적, 색감, 위험과 수호자가 달라집니다." }], heroes: { spellblade: { name: "메일린", role: "균형형 스펠블레이드" }, warden: { name: "브롬", role: "중갑 서약 수호자" }, arcanist: { name: "일리라", role: "고마나 비전술사" } }, hud: { ...EN.hud, score: "점수", room: "방", combo: "연계", choosePath: "다음 구역을 선택하세요", crypt: "속삭임의 묘실", foundry: "잿빛 주조소", victory: "서약 완수", fallen: "심연에 쓰러짐", mana: "마나가 부족합니다" } },
  ja: { ...EN, eyebrow: "灰の門 / ローカル幻想遠征", subtitle: "生きた灰の要塞へ降下。奥行きレーンで敵を追い込み、4連撃と魔法をつなぎ、次のダンジョン分岐を選びます。", start: "門へ入る", again: "再び降りる", best: "最高スコア", choose: "誓いを選ぶ", controls: "操作", desktop: "WASD/矢印 移動 · J 攻撃 · K 魔法 · L 回避 · 1–3 魔法 · Space ジャンプ", mobile: "方向パッド · 攻撃 · 魔法 · 回避 · ジャンプ", local: "端末内ダンジョン", localBody: "敵AI、進行、保存、照明、レトロ音源はこのタブ内だけで動作します。", heroes: { spellblade: { name: "メイリン", role: "万能魔剣士" }, warden: { name: "ブロム", role: "重装の守護者" }, arcanist: { name: "イリラ", role: "高マナの秘術師" } }, hud: { ...EN.hud, score: "スコア", room: "部屋", combo: "連撃", choosePath: "次の区画を選択", crypt: "囁きの墓所", foundry: "灰の鋳造所", victory: "誓約達成", fallen: "深淵に倒れた" } },
  zh: { ...EN, eyebrow: "灰烬之门 / 本地幻想远征", subtitle: "深入活着的灰烬要塞，在纵深战线上逼退敌人，将四连击与奥术法术串联，并选择下一条地牢分支。", start: "进入大门", again: "再次深入", best: "最高分", choose: "选择誓约", controls: "操作", desktop: "WASD/方向键移动 · J攻击 · K法术 · L闪避 · 1–3切换法术 · 空格跳跃", mobile: "方向键 · 攻击 · 法术 · 闪避 · 跳跃", local: "设备内完整地牢", localBody: "敌人AI、进度、存档、光照与复古音频仅在本标签运行。", heroes: { spellblade: { name: "梅琳", role: "均衡魔剑士" }, warden: { name: "布罗姆", role: "重甲守誓者" }, arcanist: { name: "伊莉拉", role: "高魔力秘法师" } }, hud: { ...EN.hud, score: "分数", room: "房间", combo: "连击", choosePath: "选择下一区域", crypt: "低语墓穴", foundry: "灰烬铸造厂", victory: "誓约完成", fallen: "深渊吞没了你" } },
  fr: { ...EN, eyebrow: "PORTE DES CENDRES / EXPÉDITION LOCALE", subtitle: "Descendez dans une forteresse vivante. Repoussez les ennemis entre les couloirs de profondeur, liez quatre coups aux sorts et choisissez la prochaine branche.", start: "Franchir la porte", again: "Redescendre", best: "Meilleur score", choose: "Choisir le serment", controls: "Commandes", desktop: "WASD/flèches bouger · J attaquer · K sort · L esquive · 1–3 sort · Espace sauter", mobile: "Croix · ATTAQUE · SORT · ESQUIVE · SAUT", local: "Donjon local complet", localBody: "IA, progression, sauvegarde, éclairage et audio rétro restent dans cet onglet.", heroes: { spellblade: { name: "Maelin", role: "Lame-sort équilibrée" }, warden: { name: "Brom", role: "Gardien lourd" }, arcanist: { name: "Ilyra", role: "Arcaniste à forte mana" } }, hud: { ...EN.hud, score: "SCORE", room: "SALLE", combo: "CHAÎNE", choosePath: "CHOISISSEZ L'AILE", crypt: "CRYPTE DES MURMURES", foundry: "FORGE DE CENDRES", victory: "SERMENT ACCOMPLI", fallen: "L'ABÎME VOUS RÉCLAME" } },
  es: { ...EN, eyebrow: "PUERTA DE CENIZA / EXPEDICIÓN LOCAL", subtitle: "Desciende por una fortaleza viva. Empuja enemigos entre carriles de profundidad, enlaza cuatro golpes con hechizos y elige la siguiente ruta.", start: "Entrar por la puerta", again: "Descender otra vez", best: "Mejor puntuación", choose: "Elige juramento", controls: "Controles", desktop: "WASD/flechas mover · J atacar · K hechizo · L esquivar · 1–3 hechizo · Espacio saltar", mobile: "Cruceta · ATAQUE · HECHIZO · ESQUIVA · SALTO", local: "Mazmorra local completa", localBody: "IA, progreso, guardado, luces y audio retro funcionan solo en esta pestaña.", heroes: { spellblade: { name: "Maelin", role: "Hoja mágica equilibrada" }, warden: { name: "Brom", role: "Guardián acorazado" }, arcanist: { name: "Ilyra", role: "Arcanista de alto maná" } }, hud: { ...EN.hud, score: "PUNTOS", room: "SALA", combo: "CADENA", choosePath: "ELIGE LA SIGUIENTE ALA", crypt: "CRIPTA DE SUSURROS", foundry: "FUNDICIÓN DE CENIZA", victory: "JURAMENTO CUMPLIDO", fallen: "EL ABISMO TE RECLAMA" } },
};

function startAudio() {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0.16; master.connect(ctx.destination);
  const pulse = (freq: number, time: number, type: OscillatorType, gain = .08) => {
    const osc = ctx.createOscillator(), amp = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, time); amp.gain.setValueAtTime(gain, time);
    amp.gain.exponentialRampToValueAtTime(.001, time + .18); osc.connect(amp); amp.connect(master); osc.start(time); osc.stop(time + .2);
  };
  let step = 0;
  let stopped = false;
  const timer = window.setInterval(() => {
    const now = ctx.currentTime, bass = [55, 55, 65.4, 49][step % 4];
    pulse(bass, now, "sawtooth", .09); if (step % 2 === 0) pulse(bass * 3, now + .03, "square", .025);
    step++;
  }, 420);
  return {
    ctx, hit: () => pulse(75 + Math.random() * 40, ctx.currentTime, "square", .12), cast: () => { pulse(280, ctx.currentTime, "sine", .08); pulse(560, ctx.currentTime + .06, "sine", .06); }, stop: () => { if (stopped) return; stopped = true; clearInterval(timer); void ctx.close(); },
    setMuted: (value: boolean) => { master.gain.value = value ? 0 : 0.16; },
  };
}

function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, hero: HeroClass, attack: number, jump: number) {
  ctx.save(); ctx.translate(x, y - jump); ctx.scale(facing, 1);
  ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.ellipse(0, jump + 8, 30, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hero === "warden" ? "#7b4b2e" : hero === "arcanist" ? "#244b5a" : "#38532c";
  ctx.beginPath(); ctx.moveTo(-15, -55); ctx.lineTo(-31, -4); ctx.lineTo(13, -10); ctx.lineTo(20, -53); ctx.fill();
  ctx.strokeStyle = "#0b1110"; ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = "#b8b0a0"; ctx.fillRect(-14, -62, 27, 30); ctx.strokeRect(-14, -62, 27, 30);
  ctx.fillStyle = "#d2a171"; ctx.fillRect(-9, -83, 19, 21); ctx.strokeRect(-9, -83, 19, 21);
  ctx.fillStyle = "#251a16"; ctx.fillRect(-13, -87, 25, 8);
  const swing = attack > 0 ? -1.2 + attack * .24 : .42;
  ctx.save(); ctx.translate(9, -50); ctx.rotate(swing);
  ctx.strokeStyle = "#252525"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(34, 0); ctx.stroke();
  ctx.strokeStyle = "#f3d17d"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(28, 0); ctx.lineTo(75, 0); ctx.stroke();
  ctx.strokeStyle = "#fff6c8"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  ctx.fillStyle = "#141414"; ctx.fillRect(-14, -34, 10, 35); ctx.fillRect(6, -34, 10, 35);
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  const scale = enemy.kind === "knight" ? 1.25 : enemy.kind === "hound" ? .72 : 1;
  ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.scale(enemy.vx < 0 ? -scale : scale, scale);
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(0, 7, 27, 8, 0, 0, Math.PI * 2); ctx.fill();
  if (enemy.kind === "hound") {
    ctx.fillStyle = enemy.hit > 0 ? "#fff" : "#5b3327"; ctx.fillRect(-24, -34, 48, 24);
    ctx.beginPath(); ctx.moveTo(16, -34); ctx.lineTo(30, -45); ctx.lineTo(25, -26); ctx.fill();
  } else {
    ctx.fillStyle = enemy.hit > 0 ? "#fff" : enemy.kind === "knight" ? "#4d4540" : "#6d3429";
    ctx.fillRect(-20, -57, 40, 52); ctx.strokeStyle = "#170d0b"; ctx.lineWidth = 5; ctx.strokeRect(-20, -57, 40, 52);
    ctx.fillStyle = "#201b18"; ctx.beginPath(); ctx.arc(0, -70, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e75b31"; ctx.fillRect(6, -73, 8, 4);
    if (enemy.kind === "knight") { ctx.fillStyle = "#8c7a5f"; ctx.beginPath(); ctx.moveTo(-14, -83); ctx.lineTo(-28, -101); ctx.lineTo(-6, -86); ctx.fill(); }
  }
  ctx.fillStyle = "#180907"; ctx.fillRect(-25, -98, 50, 6); ctx.fillStyle = "#b33525"; ctx.fillRect(-25, -98, 50 * enemy.hp / enemy.maxHp, 6);
  ctx.restore();
}

function Dungeon({ hero, copy, onFinish }: { hero: HeroClass; copy: Copy; onFinish: (r: Result) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef(new Set<string>());
  const input = useRef({ x: 0, y: 0, attack: false, spell: false, dodge: false, jump: false });
  const [spell, setSpell] = useState<SpellId>("ember");
  const [pathChoice, setPathChoice] = useState<null | ((path: "crypt" | "foundry") => void)>(null);
  const spellRef = useRef(spell); spellRef.current = spell;
  const [muted, setMuted] = useState(false);
  const [castNotice, setCastNotice] = useState<string | null>(null);
  const audioRef = useRef<ReturnType<typeof startAudio> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!;
    let width = 0, height = 0, raf = 0, last = performance.now(), frozen = 0, shake = 0, enemyId = 0;
    const audio = startAudio(), particles: Particle[] = [], enemies: Enemy[] = [];
    audioRef.current = audio;
    const stats = HERO_STATS[hero];
    const state = { x: 180, y: 410, facing: 1, health: stats.maxHealth, mana: stats.maxMana, combo: 0, comboT: 0, attackT: 0, attackStep: 0, invuln: 0, jump: 0, jumpV: 0, room: 1, kills: 0, score: 0, path: "gate", choosing: false, finished: false };
    const resize = () => { const box = canvas.getBoundingClientRect(); width = Math.max(320, box.width); height = Math.max(500, box.height); const dpr = Math.min(2, devicePixelRatio || 1); canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const spawnRoom = () => {
      enemies.length = 0; const count = 3 + state.room;
      for (let i = 0; i < count; i++) {
        const kind: EnemyKind = state.room >= 4 && i === count - 1 ? "knight" : i % 3 === 1 ? "hound" : "raider";
        const maxHp = kind === "knight" ? 190 : kind === "hound" ? 45 : 75;
        enemies.push({ id: enemyId++, kind, x: width + 80 + i * 105, y: 315 + (i % 3) * 70, hp: maxHp, maxHp, vx: -1, hit: 0, attack: 0 });
      }
    };
    const burst = (x: number, y: number, color: string, count = 12) => { for (let i = 0; i < count; i++) particles.push({ x, y, vx: (Math.random() - .5) * 250, vy: (Math.random() - .8) * 220, life: .25 + Math.random() * .35, color, size: 2 + Math.random() * 5 }); };
    const attack = () => {
      if (state.attackT > 0 || state.choosing) return; state.attackStep = state.comboT > 0 ? (state.attackStep + 1) % 4 : 0; state.attackT = .22; state.comboT = .55;
      const damage = comboDamage(stats.attack, state.attackStep, state.jump > 4);
      enemies.forEach(e => {
        if (e.hp > 0 && attackConnects(state, e, state.attackStep === 3 ? 125 : 88)) {
          e.hp -= damage; e.hit = .13; e.x += state.facing * (state.attackStep === 3 ? 62 : 22); state.combo++; state.score += scoreForHit(damage, state.combo, e.hp <= 0);
          frozen = hitStopFrames(damage, state.attackStep === 3); shake = state.attackStep === 3 ? 14 : 6; burst(e.x, e.y - 45, "#ffd36b", state.attackStep === 3 ? 22 : 10); audio.hit(); if (e.hp <= 0) state.kills++;
        }
      });
    };
    const cast = () => {
      const chosen = spellRef.current;
      if (state.choosing) return;
      if (explainCastFailure(state.mana, chosen)) { setCastNotice(copy.hud.mana); return; }
      setCastNotice(null);
      state.mana = spendMana(state.mana, chosen); state.attackT = .2; audio.cast();
      const radius = chosen === "storm" ? 250 : chosen === "frost" ? 175 : 135, damage = chosen === "storm" ? 52 : chosen === "frost" ? 38 : 31;
      enemies.forEach(e => { if (e.hp > 0 && Math.hypot(e.x - state.x, (e.y - state.y) * 1.5) < radius) { e.hp -= damage; e.hit = .22; state.score += scoreForHit(damage, state.combo, e.hp <= 0); burst(e.x, e.y - 40, chosen === "ember" ? "#ff7438" : chosen === "frost" ? "#8be5ff" : "#d8b8ff", 18); if (e.hp <= 0) { state.kills++; state.combo++; } } });
      frozen = 5; shake = 10;
    };
    const choosePath = () => {
      state.choosing = true;
      setPathChoice(() => (path: "crypt" | "foundry") => { state.path = path; state.room++; state.choosing = false; setPathChoice(null); spawnRoom(); });
    };
    const keyDown = (e: KeyboardEvent) => { keys.current.add(e.key.toLowerCase()); if (["j", "k", "l", " ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault(); if (e.key === "1") setSpell("ember"); if (e.key === "2") setSpell("frost"); if (e.key === "3") setSpell("storm"); };
    const keyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("resize", resize); window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp); resize(); spawnRoom();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop); const dt = Math.min(.033, (now - last) / 1000); last = now;
      if (frozen > 0) { frozen--; draw(now); return; }
      const down = keys.current, touch = input.current;
      const mx = (down.has("d") || down.has("arrowright") ? 1 : 0) - (down.has("a") || down.has("arrowleft") ? 1 : 0) + touch.x;
      const my = (down.has("s") || down.has("arrowdown") ? 1 : 0) - (down.has("w") || down.has("arrowup") ? 1 : 0) + touch.y;
      if (!state.choosing) {
        const speed = stats.speed * (state.invuln > .35 ? 2.25 : 1); state.x = Math.max(55, Math.min(width - 55, state.x + Math.sign(mx) * speed * dt)); state.y = Math.max(280, Math.min(height - 82, state.y + Math.sign(my) * speed * .62 * dt)); if (mx) state.facing = Math.sign(mx);
        if ((down.has("j") || touch.attack)) { attack(); touch.attack = false; }
        if ((down.has("k") || touch.spell)) { cast(); touch.spell = false; }
        if ((down.has("l") || touch.dodge) && state.invuln <= 0) { state.invuln = .52; touch.dodge = false; }
        if ((down.has(" ") || touch.jump) && state.jump === 0) { state.jumpV = 430; touch.jump = false; }
      }
      if (state.jumpV || state.jump) { state.jump += state.jumpV * dt; state.jumpV -= 980 * dt; if (state.jump <= 0) { state.jump = 0; state.jumpV = 0; } }
      state.attackT = Math.max(0, state.attackT - dt); state.comboT = Math.max(0, state.comboT - dt); if (!state.comboT) { state.combo = 0; state.attackStep = 0; }
      state.invuln = Math.max(0, state.invuln - dt); state.mana = Math.min(stats.maxMana, state.mana + 8 * dt); shake *= .86;
      enemies.forEach(e => {
        e.hit = Math.max(0, e.hit - dt); e.attack = Math.max(0, e.attack - dt); if (e.hp <= 0) return;
        const dx = state.x - e.x, dy = state.y - e.y, distance = Math.hypot(dx, dy * 1.7);
        if (distance > 65) { const es = e.kind === "hound" ? 92 : e.kind === "knight" ? 42 : 58; e.x += Math.sign(dx) * es * dt; e.y += Math.sign(dy) * es * .45 * dt; e.vx = Math.sign(dx); }
        else if (e.attack <= 0 && state.invuln <= 0) { const harm = e.kind === "knight" ? 22 : e.kind === "hound" ? 8 : 12; state.health -= harm; state.combo = 0; state.attackStep = 0; state.invuln = .65; e.attack = 1.1; shake = 11; burst(state.x, state.y - 45, "#ef6b50", 14); }
      });
      for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 450 * dt; p.life -= dt; if (p.life <= 0) particles.splice(i, 1); }
      if (!state.choosing && enemies.length && enemies.every(e => e.hp <= 0)) { if (state.room >= 5) finish(true); else choosePath(); }
      if (state.health <= 0) finish(false);
      draw(now);
    };
    const finish = (won: boolean) => {
      if (state.finished) return; state.finished = true; cancelAnimationFrame(raf); audio.stop();
      onFinish({ score: state.score + (won ? 2500 : 0), room: state.room, kills: state.kills, path: state.path, won });
    };
    const draw = (now: number) => {
      ctx.save(); ctx.clearRect(0, 0, width, height); ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      const g = ctx.createLinearGradient(0, 0, 0, height); g.addColorStop(0, state.path === "foundry" ? "#28100a" : "#081319"); g.addColorStop(.72, "#131412"); g.addColorStop(1, "#080807"); ctx.fillStyle = g; ctx.fillRect(-20, -20, width + 40, height + 40);
      const offset = (now * .018) % 96;
      ctx.fillStyle = "#242421"; for (let row = 0; row < 7; row++) for (let x = -100; x < width + 100; x += 96) { ctx.fillRect(x + (row % 2) * 48 - offset, 70 + row * 35, 91, 30); }
      for (const tx of [90, width - 100]) { const flicker = 22 + Math.sin(now * .013 + tx) * 5; const glow = ctx.createRadialGradient(tx, 175, 4, tx, 175, 150); glow.addColorStop(0, "rgba(255,154,55,.65)"); glow.addColorStop(1, "rgba(255,80,0,0)"); ctx.fillStyle = glow; ctx.fillRect(tx - 150, 25, 300, 300); ctx.fillStyle = "#ffb13b"; ctx.beginPath(); ctx.moveTo(tx, 195); ctx.quadraticCurveTo(tx - 25, 173, tx, 150 - flicker); ctx.quadraticCurveTo(tx + 24, 174, tx, 195); ctx.fill(); }
      ctx.fillStyle = "#26251f"; ctx.beginPath(); ctx.moveTo(0, 270); ctx.lineTo(width, 270); ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();
      ctx.strokeStyle = "#3a382e"; ctx.lineWidth = 2; for (let y = 285; y < height; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
      [...enemies].sort((a, b) => a.y - b.y).forEach(e => { if (e.y < state.y) drawEnemy(ctx, e); });
      drawHero(ctx, state.x, state.y, state.facing, hero, state.attackT ? state.attackStep + 1 : 0, state.jump);
      [...enemies].sort((a, b) => a.y - b.y).forEach(e => { if (e.y >= state.y) drawEnemy(ctx, e); });
      particles.forEach(p => { ctx.globalAlpha = Math.min(1, p.life * 3); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }); ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(4,5,4,.78)"; ctx.fillRect(18, 18, Math.min(430, width - 36), 82);
      ctx.fillStyle = "#d8c49a"; ctx.font = "700 12px ui-monospace"; ctx.fillText(`${copy.hud.room} ${state.room}  ·  ${copy.hud.score} ${state.score.toLocaleString()}`, 32, 39);
      const barW = Math.min(260, width - 100); ctx.fillStyle = "#34130e"; ctx.fillRect(32, 51, barW, 13); ctx.fillStyle = "#b7432f"; ctx.fillRect(32, 51, barW * state.health / stats.maxHealth, 13);
      ctx.fillStyle = "#102a35"; ctx.fillRect(32, 72, barW, 10); ctx.fillStyle = "#4da9c4"; ctx.fillRect(32, 72, barW * state.mana / stats.maxMana, 10);
      if (state.combo > 1) { ctx.fillStyle = "#ffd36b"; ctx.font = "900 24px ui-monospace"; ctx.fillText(`${state.combo} ${copy.hud.combo}`, width - 170, 48); }
      ctx.restore();
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); audio.stop(); window.removeEventListener("resize", resize); window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); };
  }, [copy, hero, onFinish]);

  const press = (key: keyof typeof input.current, value: number | boolean) => { (input.current as unknown as Record<string, number | boolean>)[key] = value; };
  const toggleMuted = () => setMuted(value => { const next = !value; audioRef.current?.setMuted(next); return next; });
  return <div className="relative h-full min-h-[620px] bg-black">
    <canvas ref={canvasRef} className="h-full min-h-[620px] w-full touch-none [image-rendering:pixelated]" aria-label="Emberdeep game canvas" />
    <button type="button" onClick={toggleMuted} aria-pressed={muted} aria-label="Sound" className="absolute left-4 top-4 min-h-11 min-w-11 rounded border border-white/20 bg-black/70 text-sm text-white">
      <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
    </button>
    <div className="pointer-events-none absolute bottom-4 left-3 right-3 flex items-end justify-between gap-2 md:hidden">
      <div className="pointer-events-auto grid grid-cols-3 gap-1">
        <span /><button onPointerDown={() => press("y", -1)} onPointerUp={() => press("y", 0)} className="size-12 rounded bg-black/70 font-black text-white">▲</button><span />
        <button onPointerDown={() => press("x", -1)} onPointerUp={() => press("x", 0)} className="size-12 rounded bg-black/70 font-black text-white">◀</button><button onPointerDown={() => press("y", 1)} onPointerUp={() => press("y", 0)} className="size-12 rounded bg-black/70 font-black text-white">▼</button><button onPointerDown={() => press("x", 1)} onPointerUp={() => press("x", 0)} className="size-12 rounded bg-black/70 font-black text-white">▶</button>
      </div>
      <div className="pointer-events-auto grid grid-cols-2 gap-2 text-[10px] font-black">
        <button onPointerDown={() => press("jump", true)} className="h-12 rounded-full bg-stone-700 px-3 text-white">JUMP</button><button onPointerDown={() => press("dodge", true)} className="h-12 rounded-full bg-slate-600 px-3 text-white">DODGE</button>
        <button onPointerDown={() => press("spell", true)} className="h-14 rounded-full bg-cyan-700 px-4 text-white">SPELL</button><button onPointerDown={() => press("attack", true)} className="h-14 rounded-full bg-amber-600 px-4 text-black">ATTACK</button>
      </div>
    </div>
    <div className="absolute right-4 top-4 flex gap-1">{(["ember", "frost", "storm"] as SpellId[]).map((id, i) => <button key={id} onClick={() => setSpell(id)} className={`min-h-11 border px-3 font-mono text-xs font-black ${spell === id ? "border-amber-300 bg-amber-400 text-black" : "border-white/20 bg-black/70 text-white"}`}>{i + 1} {id.toUpperCase()}</button>)}</div>
    {castNotice && <p role="status" className="absolute right-4 top-16 bg-black/80 px-3 py-2 font-mono text-xs font-black text-cyan-200">{castNotice}</p>}
    {pathChoice && <div className="absolute inset-0 grid place-items-center bg-black/80 p-6"><div className="w-full max-w-2xl text-center"><h3 className="text-xl font-black tracking-[.18em] text-amber-200">{copy.hud.choosePath}</h3><div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={() => pathChoice("crypt")} className="min-h-28 border border-cyan-800 bg-[#07151b] p-5 text-lg font-black text-cyan-100">{copy.hud.crypt}<span className="mt-2 block text-xs font-normal text-cyan-300/70">Frost shades · mana wells</span></button><button onClick={() => pathChoice("foundry")} className="min-h-28 border border-orange-800 bg-[#1b0b06] p-5 text-lg font-black text-orange-100">{copy.hud.foundry}<span className="mt-2 block text-xs font-normal text-orange-300/70">Armored raiders · flame vents</span></button></div></div></div>}
  </div>;
}

export default function Emberdeep({ locale }: { locale: Locale }) {
  const t = COPY[locale] ?? EN;
  const [phase, setPhase] = useState<Phase>("briefing");
  const [hero, setHero] = useState<HeroClass>("spellblade");
  const [best, setBest] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => { const saved = parseEmberdeepSave(localStorage.getItem(EMBERDEEP_SAVE_KEY)); if (saved) { setBest(saved.bestScore); setHero(saved.preferredHero); } }, []);
  const finish = useCallback((next: Result) => {
    setResult(next); setBest(old => { const value = Math.max(old, next.score); localStorage.setItem(EMBERDEEP_SAVE_KEY, JSON.stringify({ version: 1, bestScore: value, deepestRoom: next.room, preferredHero: hero })); return value; }); setPhase("result");
  }, [hero]);
  if (phase === "playing") return <section className="not-prose relative left-1/2 my-5 w-[min(100vw-1rem,1440px)] -translate-x-1/2 overflow-hidden rounded-xl border border-amber-950 bg-black shadow-[0_0_80px_rgba(120,54,13,.25)]"><Dungeon hero={hero} copy={t} onFinish={finish} /></section>;
  return <section className="not-prose relative left-1/2 my-8 w-[min(100vw-1rem,1200px)] -translate-x-1/2 overflow-hidden rounded-3xl border border-stone-800 bg-[#0a0d0b] text-white shadow-2xl">
    <img src="/games/emberdeep-social.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
    <div className="absolute inset-0 bg-gradient-to-r from-[#080b09] via-[#080b09]/90 to-[#080b09]/35" />
    <div className="relative grid min-h-[590px] gap-10 p-6 sm:p-10 lg:grid-cols-[1.05fr_.95fr] lg:p-14">
      <div className="self-center"><p className="font-mono text-[11px] font-black tracking-[.28em] text-amber-400">{t.eyebrow}</p><h2 className="mt-4 text-6xl font-black uppercase leading-[.82] tracking-[-.06em] sm:text-8xl">{t.title}</h2><p className="mt-6 max-w-xl text-sm leading-7 text-stone-300 sm:text-base">{t.subtitle}</p>
        <p className="mt-7 text-xs font-black uppercase tracking-[.18em] text-stone-500">{t.choose}</p><div className="mt-3 grid grid-cols-3 gap-2">{(Object.keys(t.heroes) as HeroClass[]).map(id => <button key={id} onClick={() => setHero(id)} className={`min-h-20 border p-2 text-left ${hero === id ? "border-amber-400 bg-amber-400/15" : "border-white/10 bg-black/40"}`}><strong className="block text-sm text-white">{t.heroes[id].name}</strong><span className="mt-1 block text-[10px] text-stone-400">{t.heroes[id].role}</span></button>)}</div>
        <div className="mt-5 flex flex-wrap gap-3"><button onClick={() => { setResult(null); setPhase("playing"); }} className="min-h-12 bg-amber-500 px-8 py-3 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_30px_rgba(245,158,11,.25)]">{phase === "result" ? t.again : t.start}</button><span className="border border-white/10 bg-black/60 px-4 py-3 font-mono text-xs">{t.best}: <strong>{best.toLocaleString()}</strong></span></div>
        {result && <p role="status" aria-live="polite" className="mt-4 border-l-2 border-amber-500 pl-4 font-mono text-sm text-amber-100"><strong>{result.won ? t.hud.victory : t.hud.fallen}</strong> · {result.score.toLocaleString()} · {t.hud.room} {result.room} · {result.kills} KOs · {result.path}</p>}
      </div>
      <div className="grid content-center gap-3">{t.features.map((feature, i) => { const Icon = [Swords, Sparkles, Route][i]; return <div key={feature.title} className="flex gap-4 border-l-2 border-amber-700 bg-black/55 p-4 backdrop-blur-sm"><Icon className="size-5 shrink-0 text-amber-400" /><div><h3 className="text-sm font-black uppercase">{feature.title}</h3><p className="mt-1 text-xs leading-5 text-stone-400">{feature.body}</p></div></div>; })}<div className="mt-2 border border-white/10 bg-black/55 p-4"><div className="flex items-center gap-2 text-xs font-black uppercase"><Flame className="size-4 text-orange-500" />{t.local}</div><p className="mt-2 text-xs leading-5 text-stone-400">{t.localBody}</p></div></div>
    </div>
    <div className="relative grid gap-3 border-t border-white/10 bg-black/70 p-5 text-xs text-stone-400 sm:grid-cols-2 sm:p-7"><div><strong className="mb-1 flex items-center gap-2 text-white"><Gamepad2 className="size-4 text-amber-500" />{t.controls}</strong>{t.desktop}</div><div><strong className="mb-1 flex items-center gap-2 text-white"><Headphones className="size-4 text-amber-500" />MOBILE + AUDIO</strong>{t.mobile}</div></div>
  </section>;
}
