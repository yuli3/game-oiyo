import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX, Swords, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { loadClearedStages, markStageCleared } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { CAT_EXPEDITION_SPRITES } from "../../lib/games/sprites";
import {
  CAT_SLUG,
  FLOORS,
  FLOORS_PER_REGION,
  act,
  alive,
  answerRecruit,
  canUseSkill,
  clearedFloorIndexes,
  newRun,
  regionOf,
  runScore,
  startFloors,
  takeReward,
  type CatKind,
  type EnemyKind,
  type RewardKind,
  type Run,
  type Unit,
} from "../../lib/games/cat-expedition";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

interface Copy {
  floor: string; region: string[]; attack: string; skill: string; cooldown: string; turn: string; tapTarget: string;
  reward: string; recruit: string; recruitHint: string; replace: string; skip: string; lost: string; won: string;
  reached: string; again: string; startAt: string; full: string; exitFull: string; mute: string; unmute: string; best: string;
  cats: Record<CatKind, [string, string, string]>; // name, skill name, skill text
  enemies: Record<EnemyKind, string>;
  rewards: Record<RewardKind, [string, string]>;
}

const COPY: Record<L, Copy> = {
  ko: {
    floor: "{0}층", region: ["뒷골목", "공사장", "지붕 위"], attack: "할퀴기", skill: "기술: {0}", cooldown: "{0}턴 뒤", turn: "{0} 차례",
    tapTarget: "적을 눌러 목표를 고르세요", reward: "보상을 하나 고르세요", recruit: "새 고양이가 따라오고 싶어 해요!", recruitHint: "누구와 바꿀까요?",
    replace: "{0} 대신", skip: "괜찮아요", lost: "원정대가 모두 쓰러졌어요", won: "달빛 지붕까지 정복! 원정 완료", reached: "{0}층까지 도달",
    again: "새 원정", startAt: "{0}층부터", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기", best: "최고 {0}층",
    cats: {
      chonk: ["뚱냥", "배치기", "2턴 동안 적의 공격을 끌어오고 보호막 5"],
      hunter: ["사냥냥", "덮치기", "적 하나에게 공격력 3배 피해"],
      kneader: ["꾹꾹냥", "꾹꾹이", "모든 고양이 체력 7 회복"],
      static: ["번개냥", "정전기 털", "모든 적에게 피해"],
      shadow: ["그림자냥", "사라지기", "다음 공격을 피하고 다음 할퀴기 2배"],
      boxer: ["상자냥", "상자 요새", "이번 턴 모두 받는 피해 절반"],
    },
    enemies: { rat: "쥐", pigeon: "비둘기", stray: "들개", "rat-boss": "쥐 대장", vacuum: "청소 로봇", crow: "까마귀", fan: "고장 난 선풍기", "vacuum-boss": "로봇 청소기 왕", raccoon: "너구리", owl: "부엉이", cloud: "번개 구름", "owl-boss": "달빛 부엉이 여왕" },
    rewards: {
      treat: ["츄르", "모두 체력 40% 회복"], toy: ["깃털 장난감", "{0} 공격력 +2"], nap: ["낮잠", "모두 체력 가득"],
      bell: ["방울", "모두 최대 체력 +4"], revive: ["캣닢", "쓰러진 고양이를 절반 체력으로 깨움"], collar: ["두꺼운 목줄", "{0} 최대 체력 +10"],
    },
  },
  en: {
    floor: "Floor {0}", region: ["Back Alley", "Building Site", "Rooftops"], attack: "Scratch", skill: "Skill: {0}", cooldown: "in {0}", turn: "{0}'s turn",
    tapTarget: "Tap an enemy to pick a target", reward: "Pick a reward", recruit: "A new cat wants to join!", recruitHint: "Who should it replace?",
    replace: "Replace {0}", skip: "No thanks", lost: "The whole party is down", won: "The moonlit rooftops are yours! Expedition complete", reached: "Reached floor {0}",
    again: "New expedition", startAt: "From floor {0}", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on", best: "Best floor {0}",
    cats: {
      chonk: ["Chonk", "Belly Flop", "Draws enemy attacks for 2 turns, +5 shield"],
      hunter: ["Hunter", "Pounce", "Triple damage to one enemy"],
      kneader: ["Kneader", "Kneading", "Heals every cat 7"],
      static: ["Sparky", "Static Fur", "Damages every enemy"],
      shadow: ["Shadow", "Vanish", "Dodges the next hit; next scratch deals double"],
      boxer: ["Boxie", "Box Fort", "The party takes half damage this turn"],
    },
    enemies: { rat: "Rat", pigeon: "Pigeon", stray: "Stray dog", "rat-boss": "Rat Chief", vacuum: "Sweeper bot", crow: "Crow", fan: "Broken fan", "vacuum-boss": "Sweeper King", raccoon: "Raccoon", owl: "Owl", cloud: "Storm cloud", "owl-boss": "Moon Owl Queen" },
    rewards: {
      treat: ["Cat treat", "Everyone heals 40%"], toy: ["Feather toy", "{0} attack +2"], nap: ["Nap", "Everyone fully healed"],
      bell: ["Bell", "Everyone max HP +4"], revive: ["Catnip", "Wakes fallen cats at half HP"], collar: ["Sturdy collar", "{0} max HP +10"],
    },
  },
  ja: {
    floor: "{0}階", region: ["裏路地", "工事現場", "屋根の上"], attack: "ひっかく", skill: "技：{0}", cooldown: "あと{0}", turn: "{0}の番",
    tapTarget: "敵をタップして狙いを選ぼう", reward: "報酬をひとつ選ぼう", recruit: "新しい猫が仲間になりたがっている！", recruitHint: "誰と入れ替える？",
    replace: "{0}と交代", skip: "やめておく", lost: "隊が全滅しました", won: "月夜の屋根を制覇！遠征完了", reached: "{0}階まで到達",
    again: "新しい遠征", startAt: "{0}階から", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン", best: "最高{0}階",
    cats: {
      chonk: ["ぽっちゃり", "腹ドーン", "2ターン敵の攻撃を引きつけ、シールド5"],
      hunter: ["ハンター", "とびかかり", "敵1体に攻撃力3倍のダメージ"],
      kneader: ["ふみふみ", "ふみふみ", "全員の体力を7回復"],
      static: ["ビリビリ", "静電気の毛", "敵全体にダメージ"],
      shadow: ["シャドウ", "消える", "次の攻撃を回避し、次のひっかきが2倍"],
      boxer: ["ハコ猫", "段ボール要塞", "このターン全員の被ダメージ半分"],
    },
    enemies: { rat: "ネズミ", pigeon: "ハト", stray: "野良犬", "rat-boss": "ネズミの親分", vacuum: "掃除ロボ", crow: "カラス", fan: "壊れた扇風機", "vacuum-boss": "掃除ロボ王", raccoon: "アライグマ", owl: "フクロウ", cloud: "雷雲", "owl-boss": "月のフクロウ女王" },
    rewards: {
      treat: ["ちゅ〜る", "全員の体力40%回復"], toy: ["羽のおもちゃ", "{0}の攻撃力+2"], nap: ["お昼寝", "全員の体力全快"],
      bell: ["鈴", "全員の最大体力+4"], revive: ["またたび", "倒れた猫を体力半分で起こす"], collar: ["丈夫な首輪", "{0}の最大体力+10"],
    },
  },
  zh: {
    floor: "第{0}层", region: ["后巷", "工地", "屋顶"], attack: "抓挠", skill: "技能：{0}", cooldown: "{0}回合后", turn: "{0}的回合",
    tapTarget: "点击敌人选择目标", reward: "选择一个奖励", recruit: "有只新猫想加入！", recruitHint: "要替换谁？",
    replace: "替换{0}", skip: "不用了", lost: "远征队全部倒下了", won: "征服月光屋顶！远征完成", reached: "到达第{0}层",
    again: "新的远征", startAt: "从第{0}层", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音", best: "最高第{0}层",
    cats: {
      chonk: ["胖橘", "肚皮压", "2回合内吸引敌人攻击，护盾+5"],
      hunter: ["猎手", "猛扑", "对一个敌人造成3倍攻击伤害"],
      kneader: ["踩奶猫", "踩踩", "所有猫恢复7点体力"],
      static: ["电电", "静电毛", "对所有敌人造成伤害"],
      shadow: ["影子", "消失", "闪避下一次攻击，下次抓挠伤害翻倍"],
      boxer: ["箱猫", "纸箱堡垒", "本回合全队受到伤害减半"],
    },
    enemies: { rat: "老鼠", pigeon: "鸽子", stray: "流浪狗", "rat-boss": "鼠老大", vacuum: "扫地机器人", crow: "乌鸦", fan: "坏风扇", "vacuum-boss": "扫地机器人王", raccoon: "浣熊", owl: "猫头鹰", cloud: "雷云", "owl-boss": "月光猫头鹰女王" },
    rewards: {
      treat: ["猫条", "全员恢复40%体力"], toy: ["羽毛逗猫棒", "{0}攻击+2"], nap: ["午睡", "全员体力回满"],
      bell: ["铃铛", "全员最大体力+4"], revive: ["猫薄荷", "以一半体力唤醒倒下的猫"], collar: ["结实项圈", "{0}最大体力+10"],
    },
  },
  fr: {
    floor: "Étage {0}", region: ["Ruelle", "Chantier", "Toits"], attack: "Griffer", skill: "Talent : {0}", cooldown: "dans {0}", turn: "Au tour de {0}",
    tapTarget: "Touchez un ennemi pour le viser", reward: "Choisissez une récompense", recruit: "Un nouveau chat veut se joindre à vous !", recruitHint: "Qui remplace-t-il ?",
    replace: "Remplacer {0}", skip: "Non merci", lost: "Toute l'équipe est à terre", won: "Les toits au clair de lune sont à vous ! Expédition terminée", reached: "Étage {0} atteint",
    again: "Nouvelle expédition", startAt: "Depuis l'étage {0}", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son", best: "Record : étage {0}",
    cats: {
      chonk: ["Bouboule", "Plat du ventre", "Attire les attaques 2 tours, bouclier +5"],
      hunter: ["Chasseur", "Bond", "Triple dégâts sur un ennemi"],
      kneader: ["Pétrisseur", "Pétrissage", "Soigne chaque chat de 7"],
      static: ["Étincelle", "Poil statique", "Blesse tous les ennemis"],
      shadow: ["Ombre", "Disparition", "Esquive le prochain coup ; prochain coup de griffe doublé"],
      boxer: ["Carton", "Fort en carton", "L'équipe subit moitié moins de dégâts ce tour"],
    },
    enemies: { rat: "Rat", pigeon: "Pigeon", stray: "Chien errant", "rat-boss": "Chef des rats", vacuum: "Robot balayeur", crow: "Corbeau", fan: "Ventilateur cassé", "vacuum-boss": "Roi balayeur", raccoon: "Raton laveur", owl: "Hibou", cloud: "Nuage d'orage", "owl-boss": "Reine hibou de la lune" },
    rewards: {
      treat: ["Friandise", "Tout le monde soigne 40 %"], toy: ["Plumeau", "{0} attaque +2"], nap: ["Sieste", "Tout le monde soigné à fond"],
      bell: ["Grelot", "PV max de tous +4"], revive: ["Herbe à chat", "Réveille les chats à terre à mi-PV"], collar: ["Collier solide", "{0} PV max +10"],
    },
  },
  es: {
    floor: "Piso {0}", region: ["Callejón", "Obra", "Tejados"], attack: "Arañar", skill: "Habilidad: {0}", cooldown: "en {0}", turn: "Turno de {0}",
    tapTarget: "Toca un enemigo para apuntar", reward: "Elige una recompensa", recruit: "¡Un gato nuevo quiere unirse!", recruitHint: "¿A quién reemplaza?",
    replace: "Reemplazar a {0}", skip: "No, gracias", lost: "Todo el grupo ha caído", won: "¡Los tejados a la luz de la luna son tuyos! Expedición completa", reached: "Llegaste al piso {0}",
    again: "Nueva expedición", startAt: "Desde el piso {0}", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido", best: "Mejor piso {0}",
    cats: {
      chonk: ["Gordi", "Panzazo", "Atrae los ataques 2 turnos, escudo +5"],
      hunter: ["Cazador", "Abalanzarse", "Triple daño a un enemigo"],
      kneader: ["Amasador", "Amasar", "Cura 7 a cada gato"],
      static: ["Chispa", "Pelo estático", "Daña a todos los enemigos"],
      shadow: ["Sombra", "Desaparecer", "Esquiva el próximo golpe; el próximo arañazo hace el doble"],
      boxer: ["Cajita", "Fuerte de cartón", "El grupo recibe la mitad de daño este turno"],
    },
    enemies: { rat: "Rata", pigeon: "Paloma", stray: "Perro callejero", "rat-boss": "Jefe rata", vacuum: "Robot aspirador", crow: "Cuervo", fan: "Ventilador roto", "vacuum-boss": "Rey aspirador", raccoon: "Mapache", owl: "Búho", cloud: "Nube de tormenta", "owl-boss": "Reina búho lunar" },
    rewards: {
      treat: ["Golosina", "Todos curan un 40 %"], toy: ["Plumero", "{0} ataque +2"], nap: ["Siesta", "Todos con la vida llena"],
      bell: ["Cascabel", "Vida máx. de todos +4"], revive: ["Hierba gatera", "Despierta a los gatos caídos con media vida"], collar: ["Collar fuerte", "{0} vida máx. +10"],
    },
  },
};

const fill = (t: string, ...a: Array<string | number>) => t.replace(/\{(\d+)\}/g, (_, i) => String(a[Number(i)] ?? ""));

const W = 640;
const H = 360;
const MUTE_KEY = "oiyo:cat-expedition:muted";
const BACKDROP = ["alley", "site", "roof"] as const;

interface Popup { side: "cat" | "enemy"; index: number; text: string; color: string; at: number }

function catSlot(i: number) {
  return { x: 8 + i * 108, y: 186, s: 132 };
}
function enemySlot(u: Unit, i: number, n: number) {
  const s = u.boss ? 190 : 128;
  const span = W - 360;
  const x = 350 + (n === 1 ? span / 2 - s / 2 : (i * (span - s)) / Math.max(1, n - 1));
  return { x, y: u.boss ? 110 : 186 - (i % 2) * 40, s };
}

export default function CatExpedition({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const runRef = useRef<Run>(newRun(1));
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const [target, setTarget] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgs = useRef<Record<string, HTMLImageElement>>({});
  const popups = useRef<Popup[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const run = runRef.current;

  useEffect(() => {
    setCleared(loadClearedStages(CAT_SLUG, FLOORS));
    runRef.current = newRun((Date.now() ^ 0x5eed) >>> 0);
    bump();
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    const all: Record<string, string> = {};
    for (const [k, v] of Object.entries(CAT_EXPEDITION_SPRITES.cats)) all[`cat-${k}`] = v;
    for (const [k, v] of Object.entries(CAT_EXPEDITION_SPRITES.enemies)) all[`enemy-${k}`] = v;
    for (const [k, v] of Object.entries(CAT_EXPEDITION_SPRITES.backdrops)) all[`bg-${k}`] = v;
    for (const [k, v] of Object.entries(all)) {
      const img = new Image();
      img.src = v;
      imgs.current[k] = img;
    }
    return () => cues.current?.close();
  }, []);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const map: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(map[cue]);
  }, []);

  // Render loop (popups float for a moment)
  useEffect(() => {
    let raf = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const r = runRef.current;
      const bg = imgs.current[`bg-${BACKDROP[regionOf(r.floor)]}`];
      if (bg?.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0, W, H);
      else {
        ctx.fillStyle = "#e8d8b8";
        ctx.fillRect(0, 0, W, H);
      }
      const bar = (x: number, y: number, w: number, u: Unit) => {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(x, y, w, 12);
        ctx.fillStyle = u.hp / u.maxHp > 0.5 ? "#4caf50" : u.hp / u.maxHp > 0.25 ? "#f2c14e" : "#e05a4f";
        ctx.fillRect(x + 1, y + 1, (w - 2) * Math.max(0, u.hp / u.maxHp), 10);
        if (u.shield > 0) {
          ctx.fillStyle = "#8fbfe0";
          ctx.fillRect(x + 1, y - 4, Math.min(w - 2, u.shield * 6), 3);
        }
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 3;
        ctx.strokeText(`${u.hp}/${u.maxHp}`, x + w / 2, y + 28);
        ctx.fillText(`${u.hp}/${u.maxHp}`, x + w / 2, y + 28);
      };
      const bob = (i: number) => Math.sin(now / 400 + i) * 2;
      r.cats.forEach((u, i) => {
        const { x, y, s } = catSlot(i);
        const img = imgs.current[`cat-${u.kind}`];
        ctx.globalAlpha = alive(u) ? (u.vanish ? 0.45 : 1) : 0.3;
        if (img?.complete) ctx.drawImage(img, x, y + bob(i) + (alive(u) ? 0 : 20), s, s);
        ctx.globalAlpha = 1;
        bar(x + 15, y - 6, s - 30, u);
        if (r.phase === "battle" && i === r.actor) {
          ctx.fillStyle = "#ffd23f";
          ctx.beginPath();
          ctx.moveTo(x + s / 2 - 10, y - 30);
          ctx.lineTo(x + s / 2 + 10, y - 30);
          ctx.lineTo(x + s / 2, y - 16 + Math.sin(now / 150) * 3);
          ctx.fill();
        }
        if (u.taunt > 0) {
          ctx.strokeStyle = "#e05a4f";
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 10, y + 10, s - 20, s - 20);
        }
      });
      const n = r.enemies.length;
      r.enemies.forEach((u, i) => {
        const { x, y, s } = enemySlot(u, i, n);
        const img = imgs.current[`enemy-${u.kind}`];
        if (!alive(u)) ctx.globalAlpha = 0.2;
        if (img?.complete) ctx.drawImage(img, x, y + bob(i + 5), s, s);
        ctx.globalAlpha = 1;
        if (alive(u)) {
          bar(x + 10, y - 8, s - 20, u);
          if (r.phase === "battle" && i === target) {
            ctx.strokeStyle = "#ffd23f";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(x + s / 2, y + s - 6, s / 2.4, 10, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      });
      popups.current = popups.current.filter((p) => now - p.at < 900);
      for (const p of popups.current) {
        const t = (now - p.at) / 900;
        const slot = p.side === "cat" ? catSlot(p.index) : enemySlot(r.enemies[p.index] ?? r.enemies[0], p.index, n);
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = "rgba(0,0,0,0.7)";
        ctx.lineWidth = 4;
        ctx.font = "bold 26px system-ui, sans-serif";
        ctx.textAlign = "center";
        const px = slot.x + slot.s / 2;
        const py = slot.y + 20 - t * 40;
        ctx.strokeText(p.text, px, py);
        ctx.fillText(p.text, px, py);
        ctx.globalAlpha = 1;
      }
      ctx.textAlign = "left";
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const absorbFx = (r: Run) => {
    const now = performance.now();
    let hit = false;
    let down = false;
    for (const f of r.fx) {
      if (f.kind === "hit") {
        popups.current.push({ side: f.side, index: f.index, text: `-${f.amount}`, color: f.side === "enemy" ? "#ffd23f" : "#ff6b6b", at: now });
        hit = true;
      } else if (f.kind === "heal" && f.amount) popups.current.push({ side: f.side, index: f.index, text: `+${f.amount}`, color: "#7ee081", at: now });
      else if (f.kind === "shield") popups.current.push({ side: f.side, index: f.index, text: `+${f.amount}`, color: "#8fbfe0", at: now });
      else if (f.kind === "dodge") popups.current.push({ side: f.side, index: f.index, text: "miss", color: "#c9a8ff", at: now });
      else if (f.kind === "down") down = true;
    }
    if (down) sfx("combo");
    else if (hit) sfx("place");
  };

  const fixTarget = (r: Run) => {
    if (!r.enemies[target] || !alive(r.enemies[target])) {
      const i = r.enemies.findIndex(alive);
      setTarget(i < 0 ? 0 : i);
    }
  };

  const afterStep = (r: Run) => {
    absorbFx(r);
    fixTarget(r);
    if (r.phase === "reward" || r.phase === "won") {
      setCleared(clearedFloorIndexes(r).reduce<number[]>((acc, i) => markStageCleared(CAT_SLUG, i, FLOORS), cleared));
      sfx("win");
    } else if (r.phase === "lost") sfx("lose");
    bump();
  };

  const doAction = (kind: "attack" | "skill") => {
    const r = runRef.current;
    act(r, kind === "attack" ? { kind, target } : { kind, target });
    afterStep(r);
  };

  const onCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = runRef.current;
    if (r.phase !== "battle") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    r.enemies.forEach((u, i) => {
      const s = enemySlot(u, i, r.enemies.length);
      if (alive(u) && x >= s.x && x <= s.x + s.s && y >= s.y && y <= s.y + s.s) {
        setTarget(i);
        sfx("tap");
      }
    });
  };

  const startRun = (floor: number) => {
    runRef.current = newRun((Date.now() ^ (floor * 7919)) >>> 0, floor);
    popups.current = [];
    setTarget(0);
    sfx("tap");
    bump();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const finished = run.phase === "won" || run.phase === "lost";
  useRunRecord(CAT_SLUG, finished, runScore(run));
  const bestFloor = cleared.length ? Math.max(...cleared) + 1 : 0;
  const actor = run.cats[run.actor];
  const catName = (k: CatKind) => c.cats[k][0];
  const rewardText = (k: RewardKind, t?: number) => fill(c.rewards[k][1], t !== undefined ? catName(run.cats[t].kind as CatKind) : "");

  return (
    <div
      ref={containerRef}
      data-game="cat-expedition"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-2" : "mx-auto w-full max-w-3xl space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{fill(c.floor, run.floor)} / {FLOORS}</Badge>
        <Badge variant="outline">{c.region[regionOf(run.floor)]} · {((run.floor - 1) % FLOORS_PER_REGION) + 1}/{FLOORS_PER_REGION}</Badge>
        {bestFloor > 0 && <span className="text-xs text-muted-foreground">{fill(c.best, bestFloor)}</span>}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={onCanvas}
        className="aspect-video w-full touch-none rounded-xl border border-border bg-card"
        aria-label={`${fill(c.floor, run.floor)} · ${run.enemies.filter(alive).map((e) => c.enemies[e.kind as EnemyKind]).join(", ")}`}
      />

      {run.phase === "battle" && actor && (
        <Card>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img src={CAT_EXPEDITION_SPRITES.cats[actor.kind as CatKind]} alt="" width={48} height={48} className="size-12" />
                <div className="min-w-0">
                  <p className="font-bold">{fill(c.turn, catName(actor.kind as CatKind))}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.cats[actor.kind as CatKind][1]}: {c.cats[actor.kind as CatKind][2]}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button className="min-h-12" onClick={() => doAction("attack")}>
                  <Swords className="size-4" />
                  {c.attack}
                </Button>
                <Button variant="secondary" className="min-h-12" disabled={!canUseSkill(run)} onClick={() => doAction("skill")}>
                  <Sparkles className="size-4" />
                  {actor.cd > 0 ? `${c.cats[actor.kind as CatKind][1]} · ${fill(c.cooldown, actor.cd)}` : c.cats[actor.kind as CatKind][1]}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{c.tapTarget}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {run.phase === "reward" && (
        <Card>
          <CardContent>
            <div className="space-y-2">
              <p className="font-bold">{c.reward}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {run.rewards.map((rw, i) => (
                  <Button key={i} variant="outline" className="h-auto min-h-16 w-full" onClick={() => { takeReward(run, i); sfx("success"); bump(); }}>
                    <span className="flex flex-col items-start text-left">
                      <span className="font-bold">{c.rewards[rw.kind][0]}</span>
                      <span className="text-xs text-muted-foreground">{rewardText(rw.kind, rw.target)}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {run.phase === "recruit" && run.recruit && (
        <Card>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img src={CAT_EXPEDITION_SPRITES.cats[run.recruit]} alt="" width={64} height={64} className="size-16" />
                <div>
                  <p className="font-bold">{c.recruit}</p>
                  <p className="text-sm">{catName(run.recruit)} · {c.cats[run.recruit][1]}: {c.cats[run.recruit][2]}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{c.recruitHint}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {run.cats.map((cat, i) => (
                  <Button key={cat.uid} variant="outline" className="min-h-12" onClick={() => { answerRecruit(run, i); sfx("success"); bump(); }}>
                    {fill(c.replace, catName(cat.kind as CatKind))}
                  </Button>
                ))}
                <Button variant="ghost" className="min-h-12" onClick={() => { answerRecruit(run, null); bump(); }}>{c.skip}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {finished && (
        <Card>
          <CardContent>
            <div className="space-y-2 text-center">
              <p className="text-lg font-bold">{run.phase === "won" ? c.won : c.lost}</p>
              <p className="text-sm text-muted-foreground">{fill(c.reached, run.floor)}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {startFloors(cleared).map((f) => (
                  <Button key={f} variant={f === 1 ? "default" : "outline"} className="min-h-12" onClick={() => startRun(f)}>
                    {f === 1 ? c.again : fill(c.startAt, f)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
