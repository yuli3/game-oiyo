/**
 * snake-augments.ts
 *
 * Pillar 2 Core Depth: Augment Draft System for Snake Game.
 * Roguelite choice system triggered every 50 points (milestones 50, 100, 150...).
 *
 * Date: 2026-10-24
 */

import type { Locale } from "../i18n";

export type AugmentId = "magnet" | "ghost" | "wrap" | "slow" | "golden";

export interface AugmentInfo {
  id: AugmentId;
  icon: string;
  name: Record<Locale, string>;
  desc: Record<Locale, string>;
}

export const AUGMENTS_CATALOG: readonly AugmentInfo[] = [
  {
    id: "magnet",
    icon: "🧲",
    name: {
      ko: "사과 자석",
      en: "Food Magnet",
      ja: "リンゴ磁石",
      zh: "苹果磁铁",
      fr: "Aimant à pommes",
      es: "Imán de manzanas",
    },
    desc: {
      ko: "뱀 머리가 사과 근처 3칸 이내로 접근하면 사과를 즉시 끌어당겨 섭취합니다.",
      en: "Absorbs food automatically when within 3 grid cells of the snake's head.",
      ja: "ヘビの頭がリンゴの周囲3マス以内に近づくと自動で引き寄せます。",
      zh: "蛇头接近苹果3格范围内时，自动吸附并吞噬苹果。",
      fr: "Attire automatiquement les pommes à moins de 3 cases de la tête.",
      es: "Atrae y come automáticamente las manzanas a 3 casillas de la cabeza.",
    },
  },
  {
    id: "ghost",
    icon: "👻",
    name: {
      ko: "유령 몸체",
      en: "Ghost Phase",
      ja: "ゴーストフェーズ",
      zh: "幽灵虚化",
      fr: "Phase fantôme",
      es: "Fase fantasma",
    },
    desc: {
      ko: "자신의 몸통과 충돌해도 사망하지 않고 통과하는 보호막 1회를 획득합니다.",
      en: "Grants 1 shield charge allowing you to safely pass through your own body.",
      ja: "自分の体を1回だけすり抜けて衝突を防ぐシールドを獲得します。",
      zh: "获得1次护盾充能，撞击自己身体时安全穿透免于死亡。",
      fr: "Octroie 1 charge de bouclier pour traverser votre corps sans mourir.",
      es: "Otorga 1 carga de escudo que permite atravesar tu cuerpo sin morir.",
    },
  },
  {
    id: "wrap",
    icon: "🌀",
    name: {
      ko: "차원 포털",
      en: "Portal Wrap",
      ja: "次元ポータル",
      zh: "维度传送",
      fr: "Portail dimensionnel",
      es: "Portal dimensional",
    },
    desc: {
      ko: "외곽 벽과 충돌하면 반대편 벽으로 통과하여 이동합니다.",
      en: "Entering the arena boundary wraps the snake to the opposite side.",
      ja: "外壁に衝突すると反対側の壁からワープして移動します。",
      zh: "穿过竞技场外墙时从相反一侧无缝传送穿越。",
      fr: "Traverser les murs de l'arène vous téléporte du côté opposé.",
      es: "Cruzar las paredes de la arena te teletransporta al lado opuesto.",
    },
  },
  {
    id: "slow",
    icon: "⏱️",
    name: {
      ko: "시간 감속",
      en: "Overclock Slow",
      ja: "タイムスロー",
      zh: "时间缓速",
      fr: "Ralenti temporel",
      es: "Cámara lenta",
    },
    desc: {
      ko: "뱀의 이동 속도가 25% 느려져 고득점 장어 상태에서도 정밀 조작이 가능해집니다.",
      en: "Reduces movement speed by 25%, giving ultimate control at high scores.",
      ja: "移動速度を25%減速させ、長い体でも精密な操作を可能にします。",
      zh: "移动速度减缓25%，即使身躯极长也能保持高精度转向操作。",
      fr: "Réduit la vitesse de 25% pour un contrôle précis à haute vitesse.",
      es: "Reduce la velocidad un 25%, facilitando el control a puntuaciones altas.",
    },
  },
  {
    id: "golden",
    icon: "✨",
    name: {
      ko: "황금 사과",
      en: "Golden Apple",
      ja: "黄金のリンゴ",
      zh: "黄金苹果",
      fr: "Pomme dorée",
      es: "Manzana dorada",
    },
    desc: {
      ko: "사과 섭취 시 30% 확률로 3배 점수(+30점)를 즉시 부여합니다.",
      en: "30% chance each food grants triple bonus score (+30 points).",
      ja: "リンゴ獲得時に30%の確率で3倍のボーナススコア(+30点)を獲得します。",
      zh: "吃下苹果时有30%几率获得3倍奖励积分(+30分)。",
      fr: "30% de chance d'obtenir un bonus de score triple (+30 pts) par pomme.",
      es: "30% de probabilidad de que cada manzana otorgue el triple (+30 pts).",
    },
  },
];

export const AUGMENT_MILESTONE_INTERVAL = 50;

/**
 * Checks whether the current score has crossed a new 50-point augment milestone.
 */
export function isAugmentMilestone(currentScore: number, lastDraftedMilestone: number): boolean {
  if (currentScore <= 0 || currentScore <= lastDraftedMilestone) return false;
  return currentScore % AUGMENT_MILESTONE_INTERVAL === 0;
}

/**
 * Rolls 3 distinct augment choices from the catalogue.
 * Prioritizes unselected augments.
 */
export function rollAugmentChoices(
  activeAugmentIds: readonly AugmentId[],
  rng: () => number = Math.random
): AugmentInfo[] {
  // Pool unselected augments first
  const unowned = AUGMENTS_CATALOG.filter((a) => !activeAugmentIds.includes(a.id));
  const pool = unowned.length >= 3 ? [...unowned] : [...AUGMENTS_CATALOG];

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  return pool.slice(0, 3);
}

/**
 * Calculates modified tick speed considering the "slow" augment.
 */
export function calculateAugmentedTickInterval(baseScore: number, hasSlow: boolean): number {
  const baseMs = Math.max(50, 150 - Math.max(0, baseScore) / 5);
  return hasSlow ? Math.round(baseMs * 1.3) : baseMs;
}
