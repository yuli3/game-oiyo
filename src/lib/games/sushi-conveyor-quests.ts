import type { Locale } from '../i18n';
import type { SushiConveyorState } from './sushi-conveyor';

export interface SushiQuest {
  id: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  target: number;
  current: number;
  rewardWasabi: number;
  completed: boolean;
  claimed: boolean;
  check: (state: SushiConveyorState, prevStats?: Record<string, number>) => number;
}

export const INITIAL_SUSHI_QUESTS: SushiQuest[] = [
  {
    id: 'tuna_master',
    title: {
      ko: '참치 명인의 손길',
      en: 'Tuna Artisan Touch',
      ja: 'マグロ職人の極み',
      zh: '金枪鱼大师之手',
      fr: 'Touche de Maître Thon',
      es: 'Toque Maestro de Atún',
    },
    description: {
      ko: '손님들에게 신선한 참치 또는 연어 초밥을 12접시 이상 서빙하십시오.',
      en: 'Serve 12 or more fresh Tuna or Salmon plates to satisfied diners.',
      ja: 'お客様に新鮮なマグロまたはサーモン寿司を12皿以上提供してください。',
      zh: '为顾客提供12盘以上新鲜的金枪鱼或三文鱼寿司。',
      fr: 'Servez 12 assiettes de Thon ou Saumon frais à vos clients.',
      es: 'Sirve 12 o más platos de atún o salmón fresco a tus clientes.',
    },
    target: 12,
    current: 0,
    rewardWasabi: 25,
    completed: false,
    claimed: false,
    check: (state) => state.totalServed,
  },
  {
    id: 'fever_rush',
    title: {
      ko: '긴자 골든 피버 콤보',
      en: 'Ginza Golden Fever Rush',
      ja: '銀座ゴールデンフィーバー',
      zh: '银座黄金狂热连击',
      fr: 'Ruée Fièvre Dorée de Ginza',
      es: 'Fiebre Dorada de Ginza',
    },
    description: {
      ko: '손님 만족도를 연속으로 올려 골든 피버를 2회 이상 발동하십시오.',
      en: 'Trigger Golden Fever mode at least 2 times through continuous combos.',
      ja: 'コンボを繋げてゴールデンフィーバーを2回以上発動してください。',
      zh: '通过连续上菜触发2次以上的黄金狂热时间。',
      fr: 'Déclenchez le mode Fièvre Dorée au moins 2 fois avec des combos.',
      es: 'Activa el modo Fiebre Dorada al menos 2 veces mediante combos.',
    },
    target: 2,
    current: 0,
    rewardWasabi: 40,
    completed: false,
    claimed: false,
    check: (state) => (state.status === 'fever' ? 1 : 0),
  },
  {
    id: 'zero_waste',
    title: {
      ko: '무결점 청결 주방',
      en: 'Zero-Waste Kitchen',
      ja: '無駄なし清潔厨房',
      zh: '零废弃环保厨房',
      fr: 'Cuisine Zéro Déchet',
      es: 'Cocina Cero Desperdicio',
    },
    description: {
      ko: '초밥 폐기 0접시를 유지하며 누적 10접시 이상 완벽하게 서빙하십시오.',
      en: 'Serve 10 plates without discarding a single stale plate.',
      ja: '1皿も廃棄せずに累計10皿以上を完璧に提供してください。',
      zh: '在没有废弃任何寿司的情况下，完美上餐10盘以上。',
      fr: 'Servez 10 assiettes sans jeter la moindre assiette avariée.',
      es: 'Sirve 10 platos sin desechar ninguno en mal estado.',
    },
    target: 10,
    current: 0,
    rewardWasabi: 35,
    completed: false,
    claimed: false,
    check: (state) => (state.totalDiscarded === 0 ? state.totalServed : 0),
  },
  {
    id: 'high_roller_revenue',
    title: {
      ko: '긴자 거리 최고 매출',
      en: 'Ginza High Roller Revenue',
      ja: '銀座ストリート最高売上',
      zh: '银座街区顶尖营收',
      fr: 'Recettes Records de Ginza',
      es: 'Ingresos Récord de Ginza',
    },
    description: {
      ko: '초밥집 총 보유 자금을 $1,200 이상으로 늘리십시오.',
      en: 'Grow your restaurant cash reserve past $1,200.',
      ja: '寿司屋の所持金を$1,200以上に増やしてください。',
      zh: '使寿司店的总资金储备超过$1,200。',
      fr: 'Faites croître la trésorerie de votre restaurant au-delà de 1 200 $.',
      es: 'Aumenta los fondos de tu restaurante por encima de $1,200.',
    },
    target: 1200,
    current: 0,
    rewardWasabi: 50,
    completed: false,
    claimed: false,
    check: (state) => state.cash,
  },
];
