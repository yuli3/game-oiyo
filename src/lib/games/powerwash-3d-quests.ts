/**
 * 파워워시 3D - 정화 지령서 퀘스트 시스템
 */

export interface PowerWashQuest {
  id: string;
  title: Record<string, string>;
  desc: Record<string, string>;
  rewardCash: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  progress: number;
  maxProgress: number;
}

export const INITIAL_POWERWASH_QUESTS: PowerWashQuest[] = [
  {
    id: "quest_first_clean",
    title: {
      ko: "첫 광택의 쾌감",
      en: "First Gleam",
      ja: "最初の輝き",
      zh: "首道光芒",
      es: "Primer brillo",
      fr: "Premier éclat",
    },
    desc: {
      ko: "아무 파츠나 1개 100% 완결 세척 달성",
      en: "Fully clean 1 washable part to 100%",
      ja: "いずれかのパーツを1つ100%完全洗浄",
      zh: "将任意一个部件彻底清洗至100%",
      es: "Limpia completamente una pieza al 100%",
      fr: "Nettoyez entièrement une pièce à 100%",
    },
    rewardCash: 120,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: "quest_nozzle_switch",
    title: {
      ko: "다목적 세척사",
      en: "Nozzle Specialist",
      ja: "ノズルスペシャリスト",
      zh: "喷嘴多面手",
      es: "Especialista en boquillas",
      fr: "Spécialiste des buses",
    },
    desc: {
      ko: "0도, 15도, 40도, 비누 폼 캐논을 모두 1회 이상 사용",
      en: "Use 0°, 15°, 40°, and Soap Foam cannon at least once",
      ja: "0度、15度、40度、泡フォームをすべて1回以上使用",
      zh: "使用0度、15度、40度及泡沫喷嘴各至少一次",
      es: "Usa 0°, 15°, 40° y cañón de jabón al menos una vez",
      fr: "Utilisez 0°, 15°, 40° et canon à mousse au moins une fois",
    },
    rewardCash: 180,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 4,
  },
  {
    id: "quest_mutant_purge",
    title: {
      ko: "고착 오염물 박리",
      en: "Stubborn Grime Stripper",
      ja: "頑固な汚れの剥離",
      zh: "顽垢剥离专家",
      es: "Eliminador de suciedad rebelde",
      fr: "Décapeur de crasse tenace",
    },
    desc: {
      ko: "타르, 붉은 녹, 바이오 이끼 등 특수 변이 오염물 3개 완전 박리",
      en: "Completely strip 3 mutant grime spots (tar, rust, moss)",
      ja: "タール・赤サビ・コケなど特殊固着汚れを3箇所完全剥離",
      zh: "彻底清除沥青、铁锈或苔藓等变异污垢3处",
      es: "Elimina por completo 3 acumulaciones de suciedad rebelde",
      fr: "Décapez complètement 3 taches tenaces (goudron, rouille, mousse)",
    },
    rewardCash: 250,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 3,
  },
  {
    id: "quest_stage_master",
    title: {
      ko: "마을 공인 명장",
      en: "Master Cleaner",
      ja: "街公認の名匠",
      zh: "小镇特许工匠",
      es: "Limpiador maestro",
      fr: "Maître nettoyeur certifié",
    },
    desc: {
      ko: "어떤 스테이지든 100% 완결 세척 및 정화 완료",
      en: "Achieve 100% total stage clearance on any job",
      ja: "いずれかのステージを100%完全洗浄クリア",
      zh: "在任意关卡中完成100%全件深度清洗",
      es: "Completa el 100% de limpieza en cualquier trabajo",
      fr: "Atteignez 100% de nettoyage sur n'importe quel chantier",
    },
    rewardCash: 400,
    isUnlocked: true,
    isClaimed: false,
    progress: 0,
    maxProgress: 1,
  },
];
