/**
 * 카오스 키친 (ChaosKitchen) - 4대 미슐랭 주방 지령서 퀘스트 시스템
 */

export interface ChaosKitchenQuest {
  id: string;
  title: Record<string, string>;
  desc: Record<string, string>;
  rewardStars: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  progress: number;
  maxProgress: number;
}

export const INITIAL_KITCHEN_QUESTS: ChaosKitchenQuest[] = [
  {
    id: "quest_salad_specialist",
    title: {
      ko: "신선한 샐러드 장인",
      en: "Crisp Salad Artisan",
      ja: "新鮮サラダの匠",
      zh: "清脆沙拉匠人",
      es: "Artesano de ensaladas",
      fr: "Artisan de salades fraîches",
    },
    desc: {
      ko: "신선한 토마토와 양배추를 썰어 샐러드 3접시 이상 완벽 서빙",
      en: "Chop fresh ingredients and deliver 3 or more salad plates",
      ja: "新鮮なトマトとキャベツを刻みサラダを3皿以上完璧に提供",
      zh: "切碎新鲜番茄与生菜，完美送达3盘以上沙拉",
      es: "Corta ingredientes frescos y entrega 3 o más ensaladas",
      fr: "Coupez des légumes frais et servez 3 salades ou plus",
    },
    rewardStars: 150,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 3,
  },
  {
    id: "quest_steak_perfection",
    title: {
      ko: "불꽃의 스테이크 마스터",
      en: "Flame Steak Master",
      ja: "炎のステーキマスター",
      zh: "烈焰牛排大师",
      es: "Maestro del filete a la brasa",
      fr: "Maître du steak grillé",
    },
    desc: {
      ko: "프라이팬에서 고기를 노릇하게 구워 스테이크 2접시 이상 서빙",
      en: "Grill prime cuts on the stove and serve 2 or more cooked steaks",
      ja: "フライパンで肉を香ばしく焼きステーキを2皿以上提供",
      zh: "在炉火上煎制上等牛肉，送达2盘以上美味牛排",
      es: "Cocina cortes selectos y sirve 2 o más filetes a la perfección",
      fr: "Faites griller la viande et servez 2 steaks cuits ou plus",
    },
    rewardStars: 200,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 2,
  },
  {
    id: "quest_fire_safety",
    title: {
      ko: "주방의 안전 지킴이",
      en: "Kitchen Safety Guardian",
      ja: "厨房の安全防衛隊",
      zh: "厨房安全卫士",
      es: "Guardián de seguridad culinaria",
      fr: "Gardien de la sécurité en cuisine",
    },
    desc: {
      ko: "소화기로 주방 화재를 신속 진압하거나 화재 없이 서비스 완수",
      en: "Extinguish a stove fire with the extinguisher or complete service fire-free",
      ja: "消火器でフライパンの火災を即座に鎮火するか無火災で完走",
      zh: "使用灭火器扑灭炉灶烈火或以零火灾完成厨房运营",
      es: "Extingue un fuego con el extintor o termina el servicio sin incendios",
      fr: "Éteignez un incendie d'un coup d'extincteur ou terminez sans feu",
    },
    rewardStars: 250,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "quest_michelin_combo",
    title: {
      ko: "미슐랭 3연속 콤보",
      en: "Michelin 3x Combo Rush",
      ja: "ミシュラン3連続コンボ",
      zh: "米其林3连击狂潮",
      es: "Racha triple Michelin",
      fr: "Combo triple Michelin",
    },
    desc: {
      ko: "주문 시간 초과 실패 없이 연속 3건 이상의 요리 주문 배달 성공",
      en: "Deliver 3 consecutive orders on time without letting any order expire",
      ja: "制限時間切れの失敗なしに3連続で料理の提供を成功させる",
      zh: "无超时失败连续送达3份以上的美食订单",
      es: "Entrega 3 pedidos consecutivos a tiempo sin que expire ninguno",
      fr: "Servez 3 commandes d'affilée sans laisser expirer de ticket",
    },
    rewardStars: 300,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 3,
  },
];

export function loadKitchenQuests(): ChaosKitchenQuest[] {
  if (typeof window === "undefined") return INITIAL_KITCHEN_QUESTS;
  try {
    const raw = localStorage.getItem("chaos_kitchen_quests_save_v1");
    if (!raw) return INITIAL_KITCHEN_QUESTS;
    const parsed = JSON.parse(raw) as ChaosKitchenQuest[];
    return INITIAL_KITCHEN_QUESTS.map((initQ) => {
      const found = parsed.find((p) => p.id === initQ.id);
      return found ? { ...initQ, ...found } : initQ;
    });
  } catch {
    return INITIAL_KITCHEN_QUESTS;
  }
}

export function saveKitchenQuests(quests: ChaosKitchenQuest[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("chaos_kitchen_quests_save_v1", JSON.stringify(quests));
  } catch {
    // ignore
  }
}

export function claimKitchenQuestReward(
  questId: string,
  quests: ChaosKitchenQuest[],
  onReward: (stars: number) => void
): ChaosKitchenQuest[] {
  return quests.map((q) => {
    if (q.id === questId && q.progress >= q.maxProgress && !q.isClaimed) {
      onReward(q.rewardStars);
      return { ...q, isClaimed: true };
    }
    return q;
  });
}
