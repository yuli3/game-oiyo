import type { Locale } from '../i18n';

export interface SushiMetaUpgradeDef {
  id: 'goldenRiceCooker' | 'knifeHoning' | 'expressBelt' | 'vipTatami' | 'agingFreezer';
  icon: string;
  maxLevel: number;
  costPerLevel: number[];
  name: Record<Locale, string>;
  desc: Record<Locale, string>;
}

export interface SushiPlayerMetaState {
  wasabiCores: number;
  upgrades: {
    goldenRiceCooker: number;
    knifeHoning: number;
    expressBelt: number;
    vipTatami: number;
    agingFreezer: number;
  };
}

export const SUSHI_META_UPGRADE_DEFS: SushiMetaUpgradeDef[] = [
  {
    id: 'goldenRiceCooker',
    icon: '🍚',
    maxLevel: 5,
    costPerLevel: [20, 45, 80, 130, 200],
    name: {
      ko: '황금 가마솥 밥솥 (샤리 품질)',
      en: 'Golden Cauldron Cooker (Rice Quality)',
      ja: '黄金羽釜炊飯器 (シャリの極み)',
      zh: '黄金铁釜电饭煲 (舍利米质)',
      fr: 'Cuiseur Chaudron Doré (Qualité du Riz)',
      es: 'Olla de Caldero Dorado (Calidad del Arroz)',
    },
    desc: {
      ko: '모든 초밥의 기본 판매 단가가 레벨당 +10% 증가합니다.',
      en: 'Increases all sushi plate base sale prices by +10% per level.',
      ja: '全寿司の基本売価がLvごとに+10%上昇します。',
      zh: '每级提升所有寿司的基础售价 +10%。',
      fr: 'Augmente le prix de vente de base de tous les sushis de +10% par niveau.',
      es: 'Aumenta el precio base de venta de todos los sushis un +10% por nivel.',
    },
  },
  {
    id: 'knifeHoning',
    icon: '🔪',
    maxLevel: 5,
    costPerLevel: [15, 35, 65, 110, 175],
    name: {
      ko: '장인의 물숫돌 칼갈이 (신선도 유지)',
      en: 'Artisan Whetstone (Freshness Retention)',
      ja: '職人の水砥石 (鮮度保持)',
      zh: '大师水磨砥石 (锁鲜持久)',
      fr: 'Pierre à Aiguiser d’Artisan (Fraîcheur)',
      es: 'Piedra de Afilar de Artesano (Frescura)',
    },
    desc: {
      ko: '레일 위 초밥의 신선도 유지 제한 시간이 레벨당 +5초 연장됩니다.',
      en: 'Extends conveyor plate freshness duration by +5 seconds per level.',
      ja: 'レーン上の寿司の鮮度維持時間がLvごとに+5秒延長されます。',
      zh: '每级使传送带上寿司的保鲜时间延长 +5秒。',
      fr: 'Prolonge la durée de fraîcheur des assiettes de +5 secondes par niveau.',
      es: 'Prolonga el tiempo de frescura en la cinta +5 segundos por nivel.',
    },
  },
  {
    id: 'expressBelt',
    icon: '⚡',
    maxLevel: 5,
    costPerLevel: [25, 55, 95, 150, 230],
    name: {
      ko: '초고속 마그네틱 레일 (회전율 가속)',
      en: 'Express Maglev Belt (Conveyor Speed)',
      ja: '超高速リニアレーン (回転速度)',
      zh: '磁悬浮急速传送带 (流转加速)',
      fr: 'Tapis Maglev Express (Vitesse du Tapis)',
      es: 'Cinta Maglev Exprés (Velocidad de Cinta)',
    },
    desc: {
      ko: '컨베이어 벨트 이동 속도가 레벨당 +12% 빨라져 손님에게 신속히 도달합니다.',
      en: 'Accelerates conveyor belt speed by +12% per level for rapid delivery.',
      ja: 'レーンの回転速度がLvごとに+12%上昇し、素早くお客様に届きます。',
      zh: '每级使传送带转速提升 +12%，极速将美味送达顾客面前。',
      fr: 'Accélère le tapis roulant de +12% par niveau pour un service rapide.',
      es: 'Aumenta la velocidad de la cinta un +12% por nivel para una entrega rápida.',
    },
  },
  {
    id: 'vipTatami',
    icon: '🎎',
    maxLevel: 5,
    costPerLevel: [30, 70, 120, 180, 260],
    name: {
      ko: 'VIP 다다미 귀빈석 (팁 배율)',
      en: 'VIP Tatami Suite (Tip Multiplier)',
      ja: 'VIP座敷個室 (チップ倍率)',
      zh: 'VIP榻榻米贵宾室 (小费翻倍)',
      fr: 'Suite Tatami VIP (Multiplicateur de Pourboires)',
      es: 'Suite Tatami VIP (Multiplicador de Propinas)',
    },
    desc: {
      ko: '만족한 손님이 지불하는 추가 팁 배율이 레벨당 +25% 증가합니다.',
      en: 'Boosts satisfied diners additional tip payout by +25% per level.',
      ja: '満足したお客様が支払うチップ倍率がLvごとに+25%増加します。',
      zh: '每级使满意顾客支付的额外小费倍率增加 +25%。',
      fr: 'Augmente le pourboire des clients satisfaits de +25% par niveau.',
      es: 'Aumenta la propina de los clientes satisfechos un +25% por nivel.',
    },
  },
  {
    id: 'agingFreezer',
    icon: '❄️',
    maxLevel: 5,
    costPerLevel: [35, 80, 140, 220, 320],
    name: {
      ko: '영하 60도 극저온 숙성고 (황금 참치)',
      en: 'Deep-Freeze Aging Cellar (Golden Tuna)',
      ja: '超低温マイナス60度熟成庫 (黄金マグロ)',
      zh: '零下60度极低温熟成库 (黄金大腹)',
      fr: 'Chambre de Congélation Profonde (Thon Doré)',
      es: 'Cámara de Ultracongelación (Atún Dorado)',
    },
    desc: {
      ko: '황금 참치 대뱃살 스페셜 오더 등장 확률이 레벨당 +4% 상승합니다.',
      en: 'Increases chance of legendary Golden Otoro special orders by +4% per level.',
      ja: '伝説の黄金大トロ注文が発生する確率がLvごとに+4%上昇します。',
      zh: '每级提升传说级黄金金枪鱼大腹特餐的出现概率 +4%。',
      fr: 'Augmente les chances de commandes spéciales de Thon Doré de +4% par niveau.',
      es: 'Aumenta la probabilidad de pedidos especiales de Atún Dorado un +4% por nivel.',
    },
  },
];

const SUSHI_META_STORAGE_KEY = 'oiyo_sushi_conveyor_meta_v1';

export function loadSushiMetaState(): SushiPlayerMetaState {
  if (typeof window === 'undefined') {
    return {
      wasabiCores: 0,
      upgrades: {
        goldenRiceCooker: 0,
        knifeHoning: 0,
        expressBelt: 0,
        vipTatami: 0,
        agingFreezer: 0,
      },
    };
  }

  try {
    const raw = localStorage.getItem(SUSHI_META_STORAGE_KEY);
    if (!raw) {
      return {
        wasabiCores: 20, // Initial bonus wasabi cores
        upgrades: {
          goldenRiceCooker: 0,
          knifeHoning: 0,
          expressBelt: 0,
          vipTatami: 0,
          agingFreezer: 0,
        },
      };
    }
    const parsed = JSON.parse(raw) as Partial<SushiPlayerMetaState>;
    return {
      wasabiCores: parsed.wasabiCores ?? 20,
      upgrades: {
        goldenRiceCooker: parsed.upgrades?.goldenRiceCooker ?? 0,
        knifeHoning: parsed.upgrades?.knifeHoning ?? 0,
        expressBelt: parsed.upgrades?.expressBelt ?? 0,
        vipTatami: parsed.upgrades?.vipTatami ?? 0,
        agingFreezer: parsed.upgrades?.agingFreezer ?? 0,
      },
    };
  } catch {
    return {
      wasabiCores: 20,
      upgrades: {
        goldenRiceCooker: 0,
        knifeHoning: 0,
        expressBelt: 0,
        vipTatami: 0,
        agingFreezer: 0,
      },
    };
  }
}

export function saveSushiMetaState(meta: SushiPlayerMetaState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SUSHI_META_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // quota exceeded or sandbox
  }
}

export function purchaseSushiMetaUpgrade(
  meta: SushiPlayerMetaState,
  upgradeId: keyof SushiPlayerMetaState['upgrades']
): boolean {
  const def = SUSHI_META_UPGRADE_DEFS.find((d) => d.id === upgradeId);
  if (!def) return false;

  const currentLvl = meta.upgrades[upgradeId];
  if (currentLvl >= def.maxLevel) return false;

  const cost = def.costPerLevel[currentLvl];
  if (meta.wasabiCores < cost) return false;

  meta.wasabiCores -= cost;
  meta.upgrades[upgradeId] += 1;
  saveSushiMetaState(meta);
  return true;
}
