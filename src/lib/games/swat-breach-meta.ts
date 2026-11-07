import type { Locale } from '../i18n';

export interface SwatMetaUpgradeDef {
  id: 'kevlarPlating' | 'slickBarrel' | 'reflexSight' | 'flashbangBelt' | 'breacherBoots';
  icon: string;
  maxLevel: number;
  costPerLevel: number[];
  name: Record<Locale, string>;
  desc: Record<Locale, string>;
}

export interface SwatPlayerMetaState {
  tacticalTokens: number;
  upgrades: {
    kevlarPlating: number;
    slickBarrel: number;
    reflexSight: number;
    flashbangBelt: number;
    breacherBoots: number;
  };
}

export const SWAT_META_UPGRADE_DEFS: SwatMetaUpgradeDef[] = [
  {
    id: 'kevlarPlating',
    icon: '🛡️',
    maxLevel: 5,
    costPerLevel: [20, 45, 80, 130, 200],
    name: {
      ko: '반응 장갑 케블라 베스트 (대원 체력)',
      en: 'Kevlar Ballistic Vest (Max HP)',
      ja: '反応装甲ケブラーベスト (耐久力)',
      zh: '反应装甲防弹背心 (防弹生命)',
      fr: 'Gilet Pare-balles Kevlar (PV Max)',
      es: 'Chaleco Antibalas de Kevlar (Vida Máx)',
    },
    desc: {
      ko: '모든 SWAT 대원의 최대 방탄 체력이 레벨당 +20 증가합니다.',
      en: 'Increases maximum armor and HP for all operators by +20 per level.',
      ja: '全SWAT隊員の最大防弾耐久値がLvごとに+20上昇します。',
      zh: '每级提升所有特警队员的基础防弹生命值 +20。',
      fr: 'Augmente les PV max et le blindage de tous les agents de +20 par niveau.',
      es: 'Aumenta la vida y armadura máxima de los agentes en +20 por nivel.',
    },
  },
  {
    id: 'slickBarrel',
    icon: '⚡',
    maxLevel: 5,
    costPerLevel: [25, 50, 90, 140, 220],
    name: {
      ko: '크롬 슬릭 반자동 총열 (사격 연사력)',
      en: 'Chrome-Lined Barrel (Fire Rate)',
      ja: 'クロム処理銃身 (連射速度)',
      zh: '镀铬精密滑膛 (交火射速)',
      fr: 'Canon Chromé de Précision (Cadence)',
      es: 'Cañón Cromado de Precisión (Cadencia)',
    },
    desc: {
      ko: '사격 후 재장전 쿨다운이 레벨당 -12% 단축되어 압도적인 화력을 투사합니다.',
      en: 'Reduces firing cooldown by -12% per level for faster bursts.',
      ja: '射撃クールダウンがLvごとに-12%短縮され、素早く応사します。',
      zh: '每级减少开火冷却时间 -12%，提供极为迅猛的战术压制。',
      fr: 'Réduit le temps de rechargement entre les tirs de -12% par niveau.',
      es: 'Reduce el enfriamiento entre disparos un -12% por nivel.',
    },
  },
  {
    id: 'reflexSight',
    icon: '🎯',
    maxLevel: 5,
    costPerLevel: [15, 35, 70, 115, 180],
    name: {
      ko: '홀로그래픽 전술 조준경 (조준 반응성)',
      en: 'Holographic Reflex Sight (Reaction)',
      ja: 'ホログラフィック照準器 (反応速度)',
      zh: '全息战术反射瞄具 (瞄准反应)',
      fr: 'Viseur Holographique Reflex (Réflexes)',
      es: 'Mira Holográfica Réflex (Reflejos)',
    },
    desc: {
      ko: '용의자 발견 시 선제 사격 반응 딜레이가 레벨당 -15% 단축됩니다.',
      en: 'Reduces target acquisition delay by -15% per level upon spotting suspects.',
      ja: '容疑者発見時の先制射撃遅延がLvごとに-15%短縮されます。',
      zh: '每级减少发现目标后的先发开火延迟 -15%。',
      fr: 'Réduit le délai de tir à vue de -15% par niveau lors du repérage.',
      es: 'Reduce el retardo de disparo al avistar sospechosos un -15% por nivel.',
    },
  },
  {
    id: 'flashbangBelt',
    icon: '💣',
    maxLevel: 5,
    costPerLevel: [30, 65, 110, 170, 250],
    name: {
      ko: '전술 섬광탄 하네스 (투척물 증설)',
      en: 'Flashbang Tactical Harness (Inventory)',
      ja: '閃光弾戦術ハーネス (携帯数増加)',
      zh: '战术战术震爆弹携行具 (初始弹药)',
      fr: 'Harnais Tactique Grenades Flash (Capacité)',
      es: 'Arnés Táctico de Granadas Cegadoras (Capacidad)',
    },
    desc: {
      ko: '작전 시작 시 소지하는 섬광탄 수량이 추가로 증가하고 스턴 시간이 연장됩니다.',
      en: 'Increases initial flashbang inventory and extends suspect stun duration.',
      ja: '作戦開始時の閃光弾所持数が増加し、スタン効果時間が延長されます。',
      zh: '增加突击开始时的闪光弹备弹量并延长敌人的眩晕震慑时间。',
      fr: 'Augmente les grenades flash de départ et prolonge la durée d’étourdissement.',
      es: 'Aumenta las granadas iniciales y prolonga la duración del aturdimiento.',
    },
  },
  {
    id: 'breacherBoots',
    icon: '🥾',
    maxLevel: 5,
    costPerLevel: [20, 45, 80, 130, 210],
    name: {
      ko: '경량 충격 흡수 침투화 (이동 속도)',
      en: 'Lightweight Breacher Boots (Speed)',
      ja: '軽量衝撃吸収コンバットブーツ (移動速度)',
      zh: '轻量化减震突击战靴 (战术移速)',
      fr: 'Bottes d’Assaut Légères (Vitesse)',
      es: 'Botas de Asalto Ligeras (Velocidad)',
    },
    desc: {
      ko: '웨이포인트 이동 속도가 레벨당 +10% 빨라져 번개처럼 룸을 장악합니다.',
      en: 'Accelerates operator movement speed along waypoints by +10% per level.',
      ja: 'ウェイポイント上の移動速度がLvごとに+10%上昇します。',
      zh: '每级提升队员沿战术路径点的移动速度 +10%，迅猛抢占优势位。',
      fr: 'Augmente la vitesse de déplacement sur les waypoints de +10% par niveau.',
      es: 'Aumenta la velocidad de movimiento por los waypoints un +10% por nivel.',
    },
  },
];

const SWAT_META_STORAGE_KEY = 'oiyo_swat_breach_meta_v1';

export function loadSwatMetaState(): SwatPlayerMetaState {
  if (typeof window === 'undefined') {
    return {
      tacticalTokens: 0,
      upgrades: {
        kevlarPlating: 0,
        slickBarrel: 0,
        reflexSight: 0,
        flashbangBelt: 0,
        breacherBoots: 0,
      },
    };
  }

  try {
    const raw = localStorage.getItem(SWAT_META_STORAGE_KEY);
    if (!raw) {
      return {
        tacticalTokens: 25, // Initial welcome tactical tokens
        upgrades: {
          kevlarPlating: 0,
          slickBarrel: 0,
          reflexSight: 0,
          flashbangBelt: 0,
          breacherBoots: 0,
        },
      };
    }
    const parsed = JSON.parse(raw) as Partial<SwatPlayerMetaState>;
    return {
      tacticalTokens: parsed.tacticalTokens ?? 25,
      upgrades: {
        kevlarPlating: parsed.upgrades?.kevlarPlating ?? 0,
        slickBarrel: parsed.upgrades?.slickBarrel ?? 0,
        reflexSight: parsed.upgrades?.reflexSight ?? 0,
        flashbangBelt: parsed.upgrades?.flashbangBelt ?? 0,
        breacherBoots: parsed.upgrades?.breacherBoots ?? 0,
      },
    };
  } catch {
    return {
      tacticalTokens: 25,
      upgrades: {
        kevlarPlating: 0,
        slickBarrel: 0,
        reflexSight: 0,
        flashbangBelt: 0,
        breacherBoots: 0,
      },
    };
  }
}

export function saveSwatMetaState(meta: SwatPlayerMetaState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SWAT_META_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // quota exceeded or sandbox
  }
}

export function purchaseSwatMetaUpgrade(
  meta: SwatPlayerMetaState,
  upgradeId: keyof SwatPlayerMetaState['upgrades']
): boolean {
  const def = SWAT_META_UPGRADE_DEFS.find((d) => d.id === upgradeId);
  if (!def) return false;

  const currentLvl = meta.upgrades[upgradeId];
  if (currentLvl >= def.maxLevel) return false;

  const cost = def.costPerLevel[currentLvl];
  if (meta.tacticalTokens < cost) return false;

  meta.tacticalTokens -= cost;
  meta.upgrades[upgradeId] += 1;
  saveSwatMetaState(meta);
  return true;
}
