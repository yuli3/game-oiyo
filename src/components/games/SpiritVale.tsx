import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import {
  ENCOUNTER_CHANCE,
  ENCOUNTER_STEP_DISTANCE,
  MATCHUP_MULTIPLIER,
  SPIRITS,
  generateTallGrassZones,
  generateTrees,
  matchup,
  mulberry32,
  resolveMovement,
  rollSpirit,
  tallGrassZoneAt,
  type ElementId,
  type Spirit,
} from "../../lib/games/spirit-vale";
import {
  bestAgainst,
  captureChance,
  createBattle,
  resolveTurn,
  skillsFor,
  type BattleAction,
  type BattleState,
  type LogEntry,
} from "../../lib/games/spirit-vale-battle";
import { addXp, loadSave, recordCatch, xpOf } from "../../lib/games/spirit-vale-save";
import {
  grownSpirit,
  stageOf,
  stageProgress,
  xpForWin,
  type Stage,
} from "../../lib/games/spirit-vale-evolution";
import { recordResult } from "../../lib/games/records";
import type { SceneProps } from "./SpiritValeScene";
import type { SpiritAction } from "./SpiritModel";

/* ────────────────────────────────────────────────────────────────────────────
 * Spirit Vale — an open valley of 십이지 spirits, typed by 오행.
 *
 * This file deliberately does NOT import three.js. The scene is code-split
 * behind `lazy()` and only requested once the valley is entered, so visitors to
 * every other arcade page — and anyone who never presses start — never download
 * it. That is the same contract Spatial Memory follows, and it is the only
 * reason a scene this dense can live on a static host.
 *
 * The wrapper owns simulation (input, position, encounters); the scene owns
 * pixels. Keeping the player's position here rather than in the render loop is
 * what lets the whole world be tested without a GPU.
 * ────────────────────────────────────────────────────────────────────────── */

const Scene = lazy(() => import("./SpiritValeScene"));

const WALK_SPEED = 7.2; // metres per second
const GAME_KEY = "spirit-vale";

type Phase = "menu" | "explore" | "encounter";

const ELEMENT_LABEL: Record<ElementId, Record<Locale, string>> = {
  wood: { ko: "목(木)", en: "Wood", ja: "木", zh: "木", fr: "Bois", es: "Madera" },
  fire: { ko: "화(火)", en: "Fire", ja: "火", zh: "火", fr: "Feu", es: "Fuego" },
  earth: { ko: "토(土)", en: "Earth", ja: "土", zh: "土", fr: "Terre", es: "Tierra" },
  metal: { ko: "금(金)", en: "Metal", ja: "金", zh: "金", fr: "Métal", es: "Metal" },
  water: { ko: "수(水)", en: "Water", ja: "水", zh: "水", fr: "Eau", es: "Agua" },
};

const ELEMENT_COLOR: Record<ElementId, string> = {
  wood: "#4a9d4a",
  fire: "#d1673f",
  earth: "#c0964f",
  metal: "#8f9ba5",
  water: "#4a80c4",
};

const COPY: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    start: string;
    loading: string;
    noWebgl: string;
    controls: string;
    touchHint: string;
    found: string;
    collection: string;
    empty: string;
    element: string;
    walkPrompt: string;
    inThicket: string;
    cycleTitle: string;
    generates: string;
    overcomes: string;
    strongAgainst: string;
    weakAgainst: string;
    reroll: string;
    exit: string;
    attack: string;
    capture: string;
    flee: string;
    captureOdds: string;
    sendOut: string;
    barehanded: string;
    won: string;
    lost: string;
    caughtIt: string;
    fledAway: string;
    exhausted: string;
    close: string;
    logAttack: (who: string, dmg: number) => string;
    logSuper: string;
    logWeak: string;
    logFeed: string;
    logCaptureFail: string;
    logFaint: (who: string) => string;
    evolved: (who: string, stage: number) => string;
    stageTitle: (stage: number) => string;
    skillName: (id: string) => string;
    logMiss: (who: string, skill: string) => string;
    logGuard: (who: string) => string;
    logDrain: (amount: number) => string;
    logWeaken: string;
    sound: string;
  }
> = {
  ko: {
    title: "정령 골짜기",
    subtitle: "십이지 정령이 사는 골짜기를 걸으며 수풀 속 정령을 만나세요",
    start: "골짜기로 들어가기",
    loading: "골짜기를 그리는 중…",
    noWebgl: "이 브라우저는 3D를 지원하지 않아 골짜기를 열 수 없습니다. 아래에서 열두 정령과 오행 상성은 그대로 확인할 수 있습니다.",
    controls: "WASD 또는 방향키로 이동합니다. 색이 칠해진 수풀에 들어가면 정령을 만납니다.",
    touchHint: "화면을 끌어 이동",
    found: "정령을 만났습니다",
    collection: "만난 정령",
    empty: "아직 만난 정령이 없습니다",
    element: "속성",
    walkPrompt: "색이 칠해진 수풀을 찾아 걸어가세요",
    inThicket: "수풀 안 — 정령이 나타날 수 있습니다",
    cycleTitle: "오행 상성",
    generates: "상생(相生)",
    overcomes: "상극(相剋)",
    strongAgainst: "강함",
    weakAgainst: "약함",
    reroll: "다른 골짜기",
    exit: "나가기",
    attack: "공격",
    capture: "포획 시도",
    flee: "물러나기",
    captureOdds: "포획 확률",
    sendOut: "내보낸 정령",
    barehanded: "아직 정령이 없어 맨손으로 포획만 시도할 수 있습니다. 약하게 만들 수단이 없으니 확률이 낮습니다.",
    won: "정령이 물러갔습니다",
    lost: "내 정령이 쓰러졌습니다",
    caughtIt: "포획 성공",
    fledAway: "물러났습니다",
    exhausted: "승부가 나지 않았습니다",
    close: "닫기",
    logAttack: (who, dmg) => `${who}의 공격 — ${dmg} 피해`,
    logSuper: "상극! 효과가 큽니다",
    logWeak: "역상극 — 효과가 약합니다",
    logFeed: "상생 — 오히려 기운을 북돋습니다",
    logCaptureFail: "포획 실패",
    logFaint: (who) => `${who}이(가) 쓰러졌습니다`,
    evolved: (who, stage) => `${who}이(가) ${stage}단계로 성장했습니다`,
    stageTitle: (stage) => ["", "어린", "성체", "정수"][stage] ?? "",
    skillName: (id) => {
      const t: Record<string, string> = { strike: "일격", surge: "오행격", guard: "굳히기", drain: "흡정", weaken: "약화" };
      if (id === "strike") return t.strike;
      if (id.endsWith("-surge")) return t.surge;
      if (id === "earth-art" || id === "metal-art") return t.guard;
      if (id === "wood-art" || id === "water-art") return t.drain;
      if (id === "fire-art") return t.weaken;
      return "일격";
    },
    logMiss: (who, skill) => `${who}의 ${skill} — 빗나감`,
    logGuard: (who) => `${who}이(가) 자세를 굳혔습니다`,
    logDrain: (amount) => `기운을 흡수해 ${amount} 회복`,
    logWeaken: "상대를 약화시켰습니다 — 포획 확률 상승",
    sound: "소리",
  },
  en: {
    title: "Spirit Vale",
    subtitle: "Walk a valley of twelve zodiac spirits and meet them in the tall grass",
    start: "Enter the vale",
    loading: "Drawing the valley…",
    noWebgl: "This browser can't show 3D, so the valley won't open. The twelve spirits and the Five Phase matchups are all below.",
    controls: "Move with WASD or the arrow keys. Step into a tinted thicket to meet a spirit.",
    touchHint: "Drag to move",
    found: "A spirit appears",
    collection: "Spirits met",
    empty: "No spirits met yet",
    element: "Phase",
    walkPrompt: "Find a tinted thicket and walk into it",
    inThicket: "In the thicket — a spirit may appear",
    cycleTitle: "Five Phase matchups",
    generates: "Generating (相生)",
    overcomes: "Overcoming (相剋)",
    strongAgainst: "Strong",
    weakAgainst: "Weak",
    reroll: "New valley",
    exit: "Leave",
    attack: "Attack",
    capture: "Attempt capture",
    flee: "Back away",
    captureOdds: "Capture odds",
    sendOut: "Sent out",
    barehanded: "You have no spirits yet, so you can only try a bare-handed capture. With no way to weaken it, the odds are slim.",
    won: "The spirit withdrew",
    lost: "Your spirit fainted",
    caughtIt: "Caught it",
    fledAway: "You backed away",
    exhausted: "Neither side could finish",
    close: "Close",
    logAttack: (who, dmg) => `${who} attacks — ${dmg} damage`,
    logSuper: "Overcoming! Highly effective",
    logWeak: "Overcome — barely effective",
    logFeed: "Generating — it only feeds them",
    logCaptureFail: "The capture failed",
    logFaint: (who) => `${who} fainted`,
    evolved: (who, stage) => `${who} grew to stage ${stage}`,
    stageTitle: (stage) => ["", "Young", "Grown", "Ascended"][stage] ?? "",
    skillName: (id) => {
      const t: Record<string, string> = { strike: "Strike", surge: "Surge", guard: "Brace", drain: "Siphon", weaken: "Scorch" };
      if (id === "strike") return t.strike;
      if (id.endsWith("-surge")) return t.surge;
      if (id === "earth-art" || id === "metal-art") return t.guard;
      if (id === "wood-art" || id === "water-art") return t.drain;
      if (id === "fire-art") return t.weaken;
      return "Strike";
    },
    logMiss: (who, skill) => `${who}'s ${skill} missed`,
    logGuard: (who) => `${who} braced`,
    logDrain: (amount) => `Siphoned ${amount} health`,
    logWeaken: "The target is weakened — capture odds up",
    sound: "Sound",
  },
  ja: {
    title: "精霊の谷",
    subtitle: "十二支の精霊が棲む谷を歩き、草むらで精霊に出会おう",
    start: "谷に入る",
    loading: "谷を描いています…",
    noWebgl: "このブラウザは3Dに対応していないため谷を開けません。十二の精霊と五行の相性は下でご覧いただけます。",
    controls: "WASDまたは矢印キーで移動します。色のついた草むらに入ると精霊に出会えます。",
    touchHint: "ドラッグで移動",
    found: "精霊が現れた",
    collection: "出会った精霊",
    empty: "まだ精霊に出会っていません",
    element: "属性",
    walkPrompt: "色のついた草むらを探して歩きましょう",
    inThicket: "草むらの中 — 精霊が現れるかも",
    cycleTitle: "五行の相性",
    generates: "相生",
    overcomes: "相剋",
    strongAgainst: "強い",
    weakAgainst: "弱い",
    reroll: "別の谷",
    exit: "出る",
    attack: "こうげき",
    capture: "捕獲を試みる",
    flee: "引き下がる",
    captureOdds: "捕獲確率",
    sendOut: "出した精霊",
    barehanded: "まだ精霊がいないため素手で捕獲を試みるしかありません。弱らせる手段がないので確率は低めです。",
    won: "精霊は去っていった",
    lost: "自分の精霊が倒れた",
    caughtIt: "捕獲成功",
    fledAway: "引き下がった",
    exhausted: "決着がつかなかった",
    close: "閉じる",
    logAttack: (who, dmg) => `${who}のこうげき — ${dmg} ダメージ`,
    logSuper: "相剋！ 効果は大きい",
    logWeak: "逆相剋 — 効果はいまひとつ",
    logFeed: "相生 — かえって力を与えてしまう",
    logCaptureFail: "捕獲に失敗",
    logFaint: (who) => `${who}は倒れた`,
    evolved: (who, stage) => `${who}は第${stage}段階に成長した`,
    stageTitle: (stage) => ["", "幼", "成体", "精髄"][stage] ?? "",
    skillName: (id) => {
      const t: Record<string, string> = { strike: "一撃", surge: "五行撃", guard: "かため", drain: "吸精", weaken: "弱体" };
      if (id === "strike") return t.strike;
      if (id.endsWith("-surge")) return t.surge;
      if (id === "earth-art" || id === "metal-art") return t.guard;
      if (id === "wood-art" || id === "water-art") return t.drain;
      if (id === "fire-art") return t.weaken;
      return "一撃";
    },
    logMiss: (who, skill) => `${who}の${skill} — はずれた`,
    logGuard: (who) => `${who}は身をかためた`,
    logDrain: (amount) => `気を吸収して${amount}回復`,
    logWeaken: "相手を弱らせた — 捕獲確率アップ",
    sound: "音",
  },
  zh: {
    title: "精灵山谷",
    subtitle: "漫步十二生肖精灵栖息的山谷，在草丛中与它们相遇",
    start: "进入山谷",
    loading: "正在绘制山谷…",
    noWebgl: "此浏览器不支持 3D，无法打开山谷。十二精灵与五行相性可在下方查看。",
    controls: "用 WASD 或方向键移动。走进有颜色的草丛即可遇见精灵。",
    touchHint: "拖动移动",
    found: "精灵出现了",
    collection: "已遇见的精灵",
    empty: "尚未遇见精灵",
    element: "属性",
    walkPrompt: "寻找有颜色的草丛并走进去",
    inThicket: "草丛中 — 精灵可能出现",
    cycleTitle: "五行相性",
    generates: "相生",
    overcomes: "相剋",
    strongAgainst: "克制",
    weakAgainst: "被克",
    reroll: "换个山谷",
    exit: "离开",
    attack: "攻击",
    capture: "尝试捕获",
    flee: "退开",
    captureOdds: "捕获概率",
    sendOut: "派出的精灵",
    barehanded: "你还没有精灵，只能空手尝试捕获。没有削弱对方的手段，成功率很低。",
    won: "精灵退去了",
    lost: "你的精灵倒下了",
    caughtIt: "捕获成功",
    fledAway: "你退开了",
    exhausted: "未分胜负",
    close: "关闭",
    logAttack: (who, dmg) => `${who}发动攻击 — ${dmg} 点伤害`,
    logSuper: "相剋！效果拔群",
    logWeak: "被剋 — 效果不佳",
    logFeed: "相生 — 反而助长了对方",
    logCaptureFail: "捕获失败",
    logFaint: (who) => `${who}倒下了`,
    evolved: (who, stage) => `${who}成长到第${stage}阶段`,
    stageTitle: (stage) => ["", "幼", "成体", "精髓"][stage] ?? "",
    skillName: (id) => {
      const t: Record<string, string> = { strike: "一击", surge: "五行击", guard: "固守", drain: "吸精", weaken: "弱化" };
      if (id === "strike") return t.strike;
      if (id.endsWith("-surge")) return t.surge;
      if (id === "earth-art" || id === "metal-art") return t.guard;
      if (id === "wood-art" || id === "water-art") return t.drain;
      if (id === "fire-art") return t.weaken;
      return "一击";
    },
    logMiss: (who, skill) => `${who}的${skill} — 落空`,
    logGuard: (who) => `${who}稳住了架势`,
    logDrain: (amount) => `吸取气息，回复${amount}`,
    logWeaken: "对手被削弱 — 捕获概率上升",
    sound: "声音",
  },
  fr: {
    title: "Val des Esprits",
    subtitle: "Parcourez une vallée de douze esprits du zodiaque et croisez-les dans les hautes herbes",
    start: "Entrer dans le val",
    loading: "Dessin de la vallée…",
    noWebgl: "Ce navigateur n'affiche pas la 3D, la vallée ne peut pas s'ouvrir. Les douze esprits et les correspondances des Cinq Phases restent consultables ci-dessous.",
    controls: "Déplacez-vous avec ZQSD ou les flèches. Entrez dans un fourré coloré pour rencontrer un esprit.",
    touchHint: "Glissez pour vous déplacer",
    found: "Un esprit apparaît",
    collection: "Esprits rencontrés",
    empty: "Aucun esprit rencontré",
    element: "Phase",
    walkPrompt: "Trouvez un fourré coloré et entrez-y",
    inThicket: "Dans le fourré — un esprit peut apparaître",
    cycleTitle: "Correspondances des Cinq Phases",
    generates: "Engendrement (相生)",
    overcomes: "Domination (相剋)",
    strongAgainst: "Fort",
    weakAgainst: "Faible",
    reroll: "Autre vallée",
    exit: "Sortir",
    attack: "Attaquer",
    capture: "Tenter la capture",
    flee: "Reculer",
    captureOdds: "Chances de capture",
    sendOut: "Esprit envoyé",
    barehanded: "Vous n'avez pas encore d'esprit : seule une capture à mains nues est possible. Sans moyen de l'affaiblir, les chances sont minces.",
    won: "L'esprit s'est retiré",
    lost: "Votre esprit est K.O.",
    caughtIt: "Capturé",
    fledAway: "Vous avez reculé",
    exhausted: "Aucun vainqueur",
    close: "Fermer",
    logAttack: (who, dmg) => `${who} attaque — ${dmg} dégâts`,
    logSuper: "Domination ! Très efficace",
    logWeak: "Dominé — peu efficace",
    logFeed: "Engendrement — cela le renforce",
    logCaptureFail: "La capture a échoué",
    logFaint: (who) => `${who} est K.O.`,
    evolved: (who, stage) => `${who} a atteint le stade ${stage}`,
    stageTitle: (stage) => ["", "Jeune", "Adulte", "Ascendant"][stage] ?? "",
    skillName: (id) => {
      const t: Record<string, string> = { strike: "Frappe", surge: "Déferlante", guard: "Garde", drain: "Siphon", weaken: "Brûlure" };
      if (id === "strike") return t.strike;
      if (id.endsWith("-surge")) return t.surge;
      if (id === "earth-art" || id === "metal-art") return t.guard;
      if (id === "wood-art" || id === "water-art") return t.drain;
      if (id === "fire-art") return t.weaken;
      return "Frappe";
    },
    logMiss: (who, skill) => `${skill} de ${who} — manqué`,
    logGuard: (who) => `${who} se met en garde`,
    logDrain: (amount) => `Siphonne ${amount} points de vie`,
    logWeaken: "La cible est affaiblie — capture facilitée",
    sound: "Son",
  },
  es: {
    title: "Valle de los Espíritus",
    subtitle: "Recorre un valle de doce espíritus del zodiaco y encuéntralos entre la hierba alta",
    start: "Entrar al valle",
    loading: "Dibujando el valle…",
    noWebgl: "Este navegador no admite 3D, así que el valle no puede abrirse. Los doce espíritus y las correspondencias de las Cinco Fases están más abajo.",
    controls: "Muévete con WASD o las flechas. Entra en un matorral con color para encontrar un espíritu.",
    touchHint: "Arrastra para moverte",
    found: "Aparece un espíritu",
    collection: "Espíritus encontrados",
    empty: "Aún no has encontrado espíritus",
    element: "Fase",
    walkPrompt: "Busca un matorral con color y entra en él",
    inThicket: "En el matorral — puede aparecer un espíritu",
    cycleTitle: "Correspondencias de las Cinco Fases",
    generates: "Generación (相生)",
    overcomes: "Dominación (相剋)",
    strongAgainst: "Fuerte",
    weakAgainst: "Débil",
    reroll: "Otro valle",
    exit: "Salir",
    attack: "Atacar",
    capture: "Intentar captura",
    flee: "Retroceder",
    captureOdds: "Probabilidad de captura",
    sendOut: "Espíritu enviado",
    barehanded: "Aún no tienes espíritus, así que solo puedes intentar una captura a mano. Sin forma de debilitarlo, las probabilidades son bajas.",
    won: "El espíritu se retiró",
    lost: "Tu espíritu cayó",
    caughtIt: "Capturado",
    fledAway: "Retrocediste",
    exhausted: "Nadie pudo cerrar el combate",
    close: "Cerrar",
    logAttack: (who, dmg) => `${who} ataca — ${dmg} de daño`,
    logSuper: "¡Dominación! Muy eficaz",
    logWeak: "Dominado — poco eficaz",
    logFeed: "Generación — solo lo fortalece",
    logCaptureFail: "La captura falló",
    logFaint: (who) => `${who} ha caído`,
    evolved: (who, stage) => `${who} alcanzó la etapa ${stage}`,
    stageTitle: (stage) => ["", "Joven", "Adulto", "Ascendido"][stage] ?? "",
    skillName: (id) => {
      const t: Record<string, string> = { strike: "Golpe", surge: "Oleada", guard: "Guardia", drain: "Sifón", weaken: "Quemadura" };
      if (id === "strike") return t.strike;
      if (id.endsWith("-surge")) return t.surge;
      if (id === "earth-art" || id === "metal-art") return t.guard;
      if (id === "wood-art" || id === "water-art") return t.drain;
      if (id === "fire-art") return t.weaken;
      return "Golpe";
    },
    logMiss: (who, skill) => `${skill} de ${who} — falló`,
    logGuard: (who) => `${who} se puso en guardia`,
    logDrain: (amount) => `Absorbe ${amount} de vida`,
    logWeaken: "El objetivo está debilitado — más captura",
    sound: "Sonido",
  },
};

function HealthBar({ hp, max, color }: { hp: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
  return (
    <div className="mt-1.5">
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={hp}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="mt-0.5 text-right text-[10px] font-bold tabular-nums text-slate-500">
        {hp} / {max}
      </p>
    </div>
  );
}

/**
 * Turns a structured log entry into a sentence. The battle module emits data
 * rather than text precisely so this mapping can live here, next to the copy.
 */
function describeLog(
  entry: LogEntry,
  t: (typeof COPY)[Locale],
  locale: Locale,
): string {
  const nameOf = (id: string) => {
    const spirit = SPIRITS.find((s) => s.id === id);
    return spirit ? spirit.name[locale] ?? spirit.name.en : id;
  };

  switch (entry.kind) {
    case "attack": {
      const base = t.logAttack(nameOf(entry.spiritId), entry.damage);
      // Only call out the relations a player can act on; "generatedBy" is a
      // quiet bonus and naming every neutral hit would drown the log.
      if (entry.matchup === "overcomes") return `${base} · ${t.logSuper}`;
      if (entry.matchup === "overcomeBy") return `${base} · ${t.logWeak}`;
      if (entry.matchup === "generates") return `${base} · ${t.logFeed}`;
      return base;
    }
    case "miss":
      return t.logMiss(nameOf(entry.spiritId), t.skillName(entry.skillId));
    case "guard":
      return t.logGuard(nameOf(entry.spiritId));
    case "drain":
      return t.logDrain(entry.amount);
    case "weaken":
      return t.logWeaken;
    case "capture":
      return entry.success ? t.caughtIt : t.logCaptureFail;
    case "faint":
      return t.logFaint(nameOf(entry.spiritId));
    case "flee":
      return t.fledAway;
  }
}

function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

export default function SpiritVale({ locale = "en" }: { locale?: Locale }) {
  const t = COPY[locale] ?? COPY.en;
  const reducedMotion = usePrefersReducedMotion();

  const [phase, setPhase] = useState<Phase>("menu");
  const [seed, setSeed] = useState(7);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [encounter, setEncounter] = useState<Spirit | null>(null);
  const [met, setMet] = useState<string[]>([]);
  const [xp, setXp] = useState<Record<string, number>>({});
  const [inThicket, setInThicket] = useState(false);
  const [battle, setBattle] = useState<BattleState | null>(null);
  /** Set when a win pushed a spirit over a stage threshold. */
  const [evolved, setEvolved] = useState<{ id: string; stage: Stage } | null>(null);
  /** One-shot animation state for the two combatants. */
  const [anim, setAnim] = useState<{ wild: SpiritAction; party: SpiritAction; key: number }>({
    wild: "idle",
    party: "idle",
    key: 0,
  });
  const [muted, setMuted] = useState(false);

  // `tone` must stay referentially stable so the persistent movement rAF loop
  // (below) can call it without restarting every time the mute toggle flips —
  // the mirrored ref is the same trick `metRef`/`xpRef` use for the same reason.
  const mutedRef = useRef(false);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  const audioRef = useRef<AudioContext | null>(null);
  const tone = useCallback((frequency: number, duration = 0.08) => {
    if (mutedRef.current || typeof window === "undefined") return;
    const context = audioRef.current ?? new AudioContext();
    audioRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.05, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, []);
  useEffect(() => () => { void audioRef.current?.close(); }, []);

  /**
   * One sting per battle event, staggered slightly so a turn with two events
   * (e.g. an attack that also faints the target) reads as two beats rather
   * than one muddy chord. Matchup coloring mirrors what `describeLog` already
   * tells the player in text — `overcomes` brightens, `overcomeBy`/`generates`
   * (a hit that only feeds the target) dulls, everything else is the plain hit.
   */
  const playBattleEvents = useCallback((events: LogEntry[]) => {
    events.forEach((event, index) => {
      window.setTimeout(() => {
        switch (event.kind) {
          case "attack":
            if (event.matchup === "overcomes") tone(560, 0.1);
            else if (event.matchup === "overcomeBy" || event.matchup === "generates") tone(260, 0.08);
            else tone(380, 0.08);
            break;
          case "miss":
            tone(160, 0.06);
            break;
          case "guard":
            tone(220, 0.09);
            break;
          case "drain":
            tone(430, 0.1);
            break;
          case "weaken":
            tone(300, 0.08);
            break;
          case "capture":
            if (event.success) {
              tone(520, 0.08);
              window.setTimeout(() => tone(700, 0.08), 90);
              window.setTimeout(() => tone(880, 0.14), 180);
            } else {
              tone(180, 0.12);
            }
            break;
          case "faint":
            tone(event.side === "wild" ? 640 : 150, event.side === "wild" ? 0.16 : 0.22);
            break;
          case "flee":
            tone(260, 0.05);
            break;
        }
      }, index * 90);
    });
  }, [tone]);

  // The save is restored after mount rather than during render: reading
  // localStorage while rendering would break the server-rendered markup match.
  useEffect(() => {
    const save = loadSave();
    setMet(save.caught);
    setXp(save.xp);
  }, []);

  // The simulation loop closes over its deps, and it must not restart every
  // time a spirit is caught — so the party is mirrored into a ref that the loop
  // reads instead of the state value it captured on mount.
  const metRef = useRef<string[]>([]);
  const xpRef = useRef<Record<string, number>>({});
  useEffect(() => {
    metRef.current = met;
  }, [met]);
  useEffect(() => {
    xpRef.current = xp;
  }, [xp]);

  // Position lives in a ref and is mirrored into state once per frame: the ref
  // is what the simulation integrates, the state is what React renders. Driving
  // React directly from the input loop would re-render on every keypress.
  const pos = useRef({ x: 0, z: 0 });
  const [render, setRender] = useState({ x: 0, z: 0, facing: 0, moving: false });
  const keys = useRef(new Set<string>());
  const drag = useRef<{ x: number; z: number } | null>(null);
  const walked = useRef(0);
  const rng = useRef(mulberry32(seed ^ 0xbeef));

  const world = useMemo(() => {
    const zones = generateTallGrassZones(seed);
    return { zones, trees: generateTrees(seed, zones) };
  }, [seed]);

  // Grass budget scales with the device: a phone gets a third of the blades,
  // which is the difference between 60fps and a slideshow.
  const grassBudget = useMemo(() => {
    if (typeof window === "undefined") return 34000;
    const small = window.innerWidth < 820;
    const cores = navigator.hardwareConcurrency ?? 4;
    // Budgets scale with the valley: the world got much larger, and holding the
    // old counts would have thinned the meadow into stubble.
    if (small || cores <= 4) return 16000;
    return cores >= 8 ? 52000 : 32000;
  }, []);

  useEffect(() => setWebgl(hasWebGL()), []);

  // A fresh valley per visit. This is deliberately done after mount rather than
  // in the initial state: the island is server-rendered, and a random seed
  // chosen during render would differ between the server and the client and
  // tear the hydration.
  useEffect(() => setSeed(Math.floor(Math.random() * 1_000_000)), []);
  useEffect(() => {
    rng.current = mulberry32(seed ^ 0xbeef);
    pos.current = { x: 0, z: 0 };
    walked.current = 0;
    setRender({ x: 0, z: 0, facing: 0, moving: false });
  }, [seed]);

  /* ── Input ─────────────────────────────────────────────────────────────
   * Arrow keys are captured so the page doesn't scroll under the valley.
   * Both WASD and ZQSD land on the same axes via `code`, so an AZERTY keyboard
   * works without a layout switch.
   */
  useEffect(() => {
    if (phase !== "explore") return;
    const down = (e: KeyboardEvent) => {
      if (e.key.startsWith("Arrow")) e.preventDefault();
      keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      keys.current.clear();
    };
  }, [phase]);

  /* ── Simulation ────────────────────────────────────────────────────────
   * A fixed-ish rAF loop that owns movement and encounter rolls. It runs only
   * while exploring, so an open encounter panel pauses the world rather than
   * letting the player wander out from under it.
   */
  useEffect(() => {
    if (phase !== "explore") return;
    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      // Clamped so a backgrounded tab doesn't teleport the player on return.
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;

      let dx = 0;
      let dz = 0;
      const k = keys.current;
      if (k.has("KeyW") || k.has("ArrowUp") || k.has("KeyZ")) dz -= 1;
      if (k.has("KeyS") || k.has("ArrowDown")) dz += 1;
      if (k.has("KeyA") || k.has("ArrowLeft") || k.has("KeyQ")) dx -= 1;
      if (k.has("KeyD") || k.has("ArrowRight")) dx += 1;

      if (drag.current) {
        dx += drag.current.x;
        dz += drag.current.z;
      }

      const mag = Math.hypot(dx, dz);
      if (mag > 0) {
        // Normalise so diagonals aren't faster than the cardinals.
        dx /= mag;
        dz /= mag;
        const distance = WALK_SPEED * delta;
        const next = resolveMovement(pos.current, { x: dx * distance, z: dz * distance }, world.trees);

        // Measure what actually happened, not what was requested — walking into
        // a tree should not tick the encounter counter.
        const moved = Math.hypot(next.x - pos.current.x, next.z - pos.current.z);
        pos.current = next;

        const zone = tallGrassZoneAt(next.x, next.z, world.zones);
        setInThicket(Boolean(zone));

        if (zone) {
          walked.current += moved;
          while (walked.current >= ENCOUNTER_STEP_DISTANCE) {
            walked.current -= ENCOUNTER_STEP_DISTANCE;
            if (rng.current() < ENCOUNTER_CHANCE) {
              const spirit = rollSpirit(zone, rng.current);
              setEncounter(spirit);
              // Auto-send the best answer to this element, so a wide collection
              // pays off without asking the player to manage a roster.
              // The party member fights at the strength its experience has
              // earned it, so evolving actually changes the fight.
              const champion = bestAgainst(spirit, metRef.current);
              const champStage = champion ? stageOf(xpRef.current[champion.id] ?? 0) : 1;
              setBattle(
                createBattle(
                  spirit,
                  champion ? grownSpirit(champion, champStage) : null,
                  1,
                  champStage,
                ),
              );
              // Both sides hop in rather than blinking into place.
              setAnim({ wild: "appear", party: "appear", key: Date.now() });
              setPhase("encounter");
              tone(600, 0.06);
              window.setTimeout(() => tone(800, 0.09), 90);
              setRender((r) => ({ ...r, x: next.x, z: next.z, moving: false }));
              return;
            }
          }
        } else {
          walked.current = 0;
        }

        setRender({ x: next.x, z: next.z, facing: Math.atan2(dx, dz), moving: true });
      } else {
        setRender((r) => (r.moving ? { ...r, moving: false } : r));
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, world]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // Direction from the centre of the viewport, scaled so a short drag is a
    // walk and a long one is a run.
    const nx = (e.clientX - cx) / (rect.width / 2);
    const ny = (e.clientY - cy) / (rect.height / 2);
    const mag = Math.hypot(nx, ny);
    const clamp = mag > 1 ? 1 / mag : 1;
    drag.current = { x: nx * clamp, z: ny * clamp };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nx = (e.clientX - cx) / (rect.width / 2);
    const ny = (e.clientY - cy) / (rect.height / 2);
    const mag = Math.hypot(nx, ny);
    const clamp = mag > 1 ? 1 / mag : 1;
    drag.current = { x: nx * clamp, z: ny * clamp };
  }, []);

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  const act = useCallback(
    (action: BattleAction) => {
      setBattle((prev) => {
        if (!prev || prev.phase !== "active") return prev;
        const next = resolveTurn(prev, action, rng.current);

        // Translate what just happened into one animation per side. A faint
        // outranks everything, then landing a hit, then taking one.
        const events = next.lastEvents;
        playBattleEvents(events);
        const pick = (side: "player" | "wild"): SpiritAction => {
          if (events.some((e) => e.kind === "faint" && e.side === side)) return "faint";
          if (events.some((e) => e.kind === "attack" && e.by === side)) return "attack";
          if (events.some((e) => e.kind === "attack" && e.by !== side)) return "hurt";
          return "idle";
        };
        setAnim({ wild: pick("wild"), party: pick("player"), key: Date.now() });

        // Persist the moment it resolves, so closing the tab mid-celebration
        // still keeps the catch.
        if (next.phase === "caught") {
          const save = recordCatch(next.wild.spirit.id);
          setMet(save.caught);
          recordResult(GAME_KEY, "w");
        } else if (next.phase === "won") {
          recordResult(GAME_KEY, "w");
          // Experience goes to the spirit that actually fought — winning is
          // what grows a spirit, catching is what widens the collection.
          const fighter = next.player?.spirit;
          if (fighter) {
            const before = stageOf(xpRef.current[fighter.id] ?? 0);
            const save = addXp(fighter.id, xpForWin(next.wild.spirit));
            setXp(save.xp);
            const after = stageOf(xpOf(save, fighter.id));
            if (after > before) {
              setEvolved({ id: fighter.id, stage: after });
              tone(440, 0.09);
              window.setTimeout(() => tone(550, 0.09), 100);
              window.setTimeout(() => tone(660, 0.09), 200);
              window.setTimeout(() => tone(880, 0.22), 300);
            }
          }
        } else if (next.phase === "lost") {
          recordResult(GAME_KEY, "l");
        }
        return next;
      });
    },
    [],
  );

  const leaveBattle = useCallback(() => {
    setBattle(null);
    setEncounter(null);
    setEvolved(null);
    walked.current = 0;
    setPhase("explore");
  }, []);

  const sceneProps: SceneProps = {
    seed,
    playerX: render.x,
    playerZ: render.z,
    facing: render.facing,
    moving: render.moving,
    reducedMotion,
    grassBudget,
    encounterActive: phase === "encounter",
    wildSpiritId: battle?.wild.spirit.id ?? null,
    wildXp: 0,
    partySpiritId: battle?.player?.spirit.id ?? null,
    partyXp: battle?.player ? xp[battle.player.spirit.id] ?? 0 : 0,
    wildAction: anim.wild,
    partyAction: anim.party,
    actionKey: anim.key,
  };

  return (
    <div className="w-full">
      <header className="mb-4 text-center">
        <h2 className="text-2xl font-black text-emerald-950">{t.title}</h2>
        <p className="mt-1 text-sm text-emerald-700/80">{t.subtitle}</p>
      </header>

      {webgl === false ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {t.noWebgl}
        </p>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50 shadow-sm">
          <div
            className="relative aspect-[4/3] w-full touch-none sm:aspect-[16/10]"
            onPointerDown={phase === "explore" ? onPointerDown : undefined}
            onPointerMove={phase === "explore" ? onPointerMove : undefined}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {phase === "menu" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-sky-100 to-emerald-100 px-6 text-center">
                <p className="max-w-sm text-sm leading-6 text-emerald-900/80">{t.controls}</p>
                <button
                  onClick={() => setPhase("explore")}
                  className="rounded-full bg-emerald-700 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-transform hover:-translate-y-0.5 hover:bg-emerald-800"
                >
                  {t.start}
                </button>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-sky-100 to-emerald-100">
                    <p className="text-sm font-semibold text-emerald-800">{t.loading}</p>
                  </div>
                }
              >
                <Scene {...sceneProps} />
              </Suspense>
            )}

            {/* Status strip — tells the player whether they are somewhere a
                spirit can appear, which is the only non-obvious rule. */}
            {phase !== "menu" && (
              <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm ${
                    inThicket ? "bg-emerald-900/75 text-emerald-50" : "bg-white/75 text-emerald-900"
                  }`}
                >
                  {inThicket ? t.inThicket : t.walkPrompt}
                </span>
              </div>
            )}

            {/* Battle HUD.
                Deliberately NOT a full-screen modal: an earlier version covered
                the canvas with a centred card, which hid the two spirits
                standing in the world and reduced a 3D battle to two buttons.
                Health sits at the top, controls at the bottom, and the middle
                of the frame — where the creatures actually are — stays clear. */}
            {phase === "encounter" && encounter && battle && (
              <>
                {/* Wild spirit's bar, top */}
                <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3">
                  <div className="w-full max-w-xs rounded-2xl bg-white/85 px-3 py-2 shadow-lg backdrop-blur-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-black text-emerald-950">
                        {encounter.name[locale] ?? encounter.name.en}
                      </p>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: ELEMENT_COLOR[encounter.element] }}
                      >
                        {ELEMENT_LABEL[encounter.element][locale]}
                      </span>
                    </div>
                    <HealthBar
                      hp={battle.wild.hp}
                      max={battle.wild.maxHp}
                      color={ELEMENT_COLOR[encounter.element]}
                    />
                  </div>
                </div>

                {/* Rolling log, floating clear of both bars */}
                {battle.log.length > 0 && (
                  <ul className="pointer-events-none absolute inset-x-0 top-24 mx-auto w-full max-w-xs space-y-1 px-3 text-center">
                    {battle.log.slice(-2).map((entry, i) => (
                      <li
                        key={battle.log.length - 2 + i}
                        className="inline-block rounded-full bg-emerald-950/70 px-3 py-1 text-[11px] font-semibold text-emerald-50"
                      >
                        {describeLog(entry, t, locale)}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Controls, bottom */}
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div className="mx-auto w-full max-w-md rounded-2xl bg-white/92 p-3 shadow-xl backdrop-blur-sm">
                    {battle.player ? (
                      <div className="mb-2 flex items-center gap-2">
                        <p className="shrink-0 text-xs font-black text-emerald-950">
                          {battle.player.spirit.name[locale] ?? battle.player.spirit.name.en}
                        </p>
                        <div className="min-w-0 flex-1">
                          <HealthBar
                            hp={battle.player.hp}
                            max={battle.player.maxHp}
                            color={ELEMENT_COLOR[battle.player.spirit.element]}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="mb-2 rounded-xl bg-amber-50 p-2 text-[11px] leading-4 text-amber-900">
                        {t.barehanded}
                      </p>
                    )}

                    {battle.phase === "active" ? (
                      <>
                        {/* One button per skill, so a turn is a choice. */}
                        {battle.player && (
                          <div className="grid grid-cols-3 gap-1.5">
                            {skillsFor(battle.player.spirit, battle.player.stage).map((skill) => (
                              <button
                                key={skill.id}
                                onClick={() => act({ type: "skill", skillId: skill.id })}
                                className="rounded-xl bg-emerald-700 px-2 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                              >
                                <span className="block truncate">{t.skillName(skill.id)}</span>
                                <span className="block text-[10px] font-semibold text-emerald-200">
                                  {Math.round(skill.accuracy * 100)}%
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => act({ type: "capture" })}
                            className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
                          >
                            {t.capture} · {Math.round(captureChance(battle.wild, battle.captureBonus) * 100)}%
                          </button>
                          <button
                            onClick={() => act({ type: "flee" })}
                            className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                          >
                            {t.flee}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {evolved && (
                          <p className="mb-2 rounded-xl bg-amber-50 p-2 text-center text-xs font-black text-amber-900">
                            {t.evolved(
                              SPIRITS.find((s) => s.id === evolved.id)?.name[locale] ?? evolved.id,
                              evolved.stage,
                            )}
                          </p>
                        )}
                        <p role="status" aria-live="polite" className="text-center text-sm font-black text-emerald-950">
                          {battle.phase === "caught"
                            ? t.caughtIt
                            : battle.phase === "won"
                              ? t.won
                              : battle.phase === "lost"
                                ? t.lost
                                : battle.phase === "fled"
                                  ? t.fledAway
                                  : t.exhausted}
                        </p>
                        <button
                          onClick={leaveBattle}
                          className="mt-2 w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                        >
                          {t.close}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {phase !== "menu" && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100 bg-white/70 px-4 py-2.5">
              <p className="text-xs text-emerald-800/80">
                <span className="hidden sm:inline">{t.controls}</span>
                <span className="sm:hidden">{t.touchHint}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMuted((value) => !value)}
                  aria-pressed={muted}
                  className="min-h-11 min-w-11 rounded-full border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                >
                  <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
                  <span className="sr-only">{t.sound}</span>
                </button>
                <button
                  onClick={() => setSeed((s) => s + 1)}
                  className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                >
                  {t.reroll}
                </button>
                <button
                  onClick={() => setPhase("menu")}
                  className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                >
                  {t.exit}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collection — also the no-WebGL fallback's main content, so the twelve
          spirits and the matchup rules stay readable without a GPU. */}
      <section className="mt-6">
        <h3 className="text-sm font-black text-emerald-950">
          {t.collection} · {met.length}/{SPIRITS.length}
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {SPIRITS.map((spirit) => {
            const seen = met.includes(spirit.id);
            return (
              <div
                key={spirit.id}
                className={`rounded-2xl border p-3 transition-colors ${
                  seen ? "border-emerald-200 bg-white" : "border-dashed border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: seen ? ELEMENT_COLOR[spirit.element] : "#cbd5e1" }}
                  />
                  <p
                    className={`truncate text-sm font-bold ${
                      seen ? "text-emerald-950" : "text-slate-400"
                    }`}
                  >
                    {seen ? spirit.name[locale] ?? spirit.name.en : "???"}
                  </p>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  {ELEMENT_LABEL[spirit.element][locale]}
                  {seen && ` · ${t.stageTitle(stageOf(xp[spirit.id] ?? 0))}`}
                </p>
                {/* Growth bar — the only place outside a battle where a player
                    can see how close a spirit is to its next stage. */}
                {seen && (
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${stageProgress(xp[spirit.id] ?? 0) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {met.length === 0 && <p className="mt-2 text-xs text-slate-500">{t.empty}</p>}
      </section>

      {/* The matchup table, stated rather than hidden — 오행 has two cycles, and
          a player who can't see both can't reason about the third relation. */}
      <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
        <h3 className="text-sm font-black text-emerald-950">{t.cycleTitle}</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(Object.keys(ELEMENT_LABEL) as ElementId[]).map((el) => {
            const strong = (Object.keys(ELEMENT_LABEL) as ElementId[]).filter(
              (other) => matchup(el, other) === "overcomes",
            );
            const weak = (Object.keys(ELEMENT_LABEL) as ElementId[]).filter(
              (other) => matchup(el, other) === "overcomeBy",
            );
            return (
              <div key={el} className="rounded-xl bg-white p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: ELEMENT_COLOR[el] }}
                  />
                  <p className="text-sm font-bold text-emerald-950">{ELEMENT_LABEL[el][locale]}</p>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  <span className="font-bold text-emerald-700">{t.strongAgainst}</span>{" "}
                  {strong.map((s) => ELEMENT_LABEL[s][locale]).join(", ")}
                  {" · "}
                  <span className="font-bold text-rose-600">{t.weakAgainst}</span>{" "}
                  {weak.map((s) => ELEMENT_LABEL[s][locale]).join(", ")}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-emerald-900/70">
          {t.overcomes} ×{MATCHUP_MULTIPLIER.overcomes} · {t.generates} ×
          {MATCHUP_MULTIPLIER.generates}
        </p>
      </section>
    </div>
  );
}
