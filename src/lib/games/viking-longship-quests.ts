/**
 * 바이킹 롱쉽 (VikingLongship) - 4대 항해 생존 지령서 퀘스트 시스템
 */

export interface VikingLongshipQuest {
  id: string;
  title: Record<string, string>;
  desc: Record<string, string>;
  rewardSilver: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  progress: number;
  maxProgress: number;
}

export const INITIAL_VIKING_QUESTS: VikingLongshipQuest[] = [
  {
    id: "quest_runestone_voyage",
    title: {
      ko: "고대 룬스톤의 탐색자",
      en: "Rune Stone Seeker",
      ja: "古代ルーンストーンの探求者",
      zh: "远古符文石探索者",
      es: "Buscador de piedras rúnicas",
      fr: "Chercheur de pierres runiques",
    },
    desc: {
      ko: "미지의 군도에 숨겨진 고대 룬스톤 3개를 모두 탐험하여 획득",
      en: "Discover and claim all 3 ancient runestones across archipelago islands",
      ja: "諸島に隠された3つの古代ルーンストーンをすべて探検して獲得",
      zh: "探索群岛并集齐隐藏在各处的全部3块远古符文巨石",
      es: "Descubre y reclama las 3 piedras rúnicas antiguas en el archipiélago",
      fr: "Découvrez et récupérez les 3 pierres runiques anciennes sur l'archipel",
    },
    rewardSilver: 250,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 3,
  },
  {
    id: "quest_sea_slayer",
    title: {
      ko: "심해 괴수 사냥꾼",
      en: "Abyssal Beast Hunter",
      ja: "深海怪獣ハンター",
      zh: "深海巨兽猎手",
      es: "Cazador de bestias abisales",
      fr: "Chasseur de monstres abyssaux",
    },
    desc: {
      ko: "작살포를 발사하여 바다 괴수(크라켄/서펜트) 2마리 격퇴",
      en: "Slay 2 sea monsters (Kraken or Serpent) using harpoon ballista",
      ja: "銛砲を発射して海の魔獣（クラーケン／サーペント）を2体撃退",
      zh: "发射巨型鱼叉炮，成功击退2只深海海兽（海怪或巨蛇）",
      es: "Derrota a 2 monstruos marinos (Kraken o Serpiente) con el arpón",
      fr: "Éliminez 2 monstres marins (Kraken ou Serpent) au harpon",
    },
    rewardSilver: 200,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 2,
  },
  {
    id: "quest_timber_salvage",
    title: {
      ko: "원정대 보급 장교",
      en: "Expedition Quartermaster",
      ja: "遠征隊補給将校",
      zh: "远征军备供给官",
      es: "Intendente de la expedición",
      fr: "Intendant de l'expédition",
    },
    desc: {
      ko: "항해 중 섬에서 목재 및 철광석 자원 25개 이상 채굴/인양",
      en: "Harvest and salvage 25 or more timber and iron supplies from islands",
      ja: "航海中に島から木材および鉄鉱石の資源を25個以上採掘・サルベージ",
      zh: "在航海探索中从岛屿采集或打捞累计25份以上的木材与铁矿",
      es: "Consigue 25 o más suministros de madera y hierro en las islas",
      fr: "Récoltez 25 réserves de bois et de fer ou plus sur les îles",
    },
    rewardSilver: 180,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 25,
  },
  {
    id: "quest_bifrost_ascent",
    title: {
      ko: "발할라의 승천자",
      en: "Valhalla Ascendant",
      ja: "ヴァルハラの昇天者",
      zh: "英灵殿飞升之主",
      es: "Ascendido al Valhalla",
      fr: "Ascendant du Valhalla",
    },
    desc: {
      ko: "비프로스트 포탈을 열고 군도를 탈출하여 승리 달성",
      en: "Activate the Bifrost Portal and sail to Valhalla to achieve victory",
      ja: "ビフレストポータルを起動して諸島を脱出し勝利を達成",
      zh: "成功激活彩虹桥传送门，冲出神秘海域飞升英灵殿获取最终胜利",
      es: "Activa el portal Bifrost y navega hacia el Valhalla para ganar",
      fr: "Activez le portail Bifrost et naviguez vers le Valhalla pour triompher",
    },
    rewardSilver: 400,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 1,
  },
];

export const VIKING_LONGSHIP_QUESTS_KEY = "viking_longship_quests_v1";

export function loadVikingLongshipQuests(): VikingLongshipQuest[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return INITIAL_VIKING_QUESTS.map((q) => ({ ...q }));
  }
  try {
    const raw = window.localStorage.getItem(VIKING_LONGSHIP_QUESTS_KEY);
    if (!raw) return INITIAL_VIKING_QUESTS.map((q) => ({ ...q }));
    const saved = JSON.parse(raw) as Partial<VikingLongshipQuest>[];
    return INITIAL_VIKING_QUESTS.map((init) => {
      const match = saved.find((s) => s.id === init.id);
      if (!match) return { ...init };
      return {
        ...init,
        progress: typeof match.progress === "number" ? match.progress : init.progress,
        isClaimed: typeof match.isClaimed === "boolean" ? match.isClaimed : init.isClaimed,
      };
    });
  } catch {
    return INITIAL_VIKING_QUESTS.map((q) => ({ ...q }));
  }
}

export function saveVikingLongshipQuests(quests: VikingLongshipQuest[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      VIKING_LONGSHIP_QUESTS_KEY,
      JSON.stringify(
        quests.map((q) => ({
          id: q.id,
          progress: q.progress,
          isClaimed: q.isClaimed,
        }))
      )
    );
  } catch {
    // quota exceeded or private mode
  }
}
