/**
 * DotFishing - Retro Pixel Sea Fishing Sim & Fish Encyclopedia Engine
 *
 * Berlin Interpretation inspired tension balance:
 * - 4 distinct fishing zones: Shallow Coast, Coral Reef, Deep Sea, Abyssal Trench
 * - 30 unique fish species with sizes, market values, and rarity tiers (Common to Mythic)
 * - Dynamic line tension & reel mechanics: keep tension in the green zone to tire the fish out
 * - Equipment upgrades: Rods (line durability/control), Baits (attraction/rarity bias), Boats (zone unlocks)
 * - Full 30-species catch encyclopedia & record size tracking
 *
 * Strict Deterministic PRNG with Xorshift32.
 */

export type RarityTier = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export type FishingZone = "shallow" | "coral" | "deep" | "abyss";

export interface FishDefinition {
  id: string;
  nameKey: string;
  names: Record<string, string>;
  zone: FishingZone;
  rarity: RarityTier;
  minSize: number; // in cm
  maxSize: number; // in cm
  baseValue: number; // in Gold
  stamina: number; // 20 to 120
  struggleRate: number; // 0.1 to 0.8
  color: string;
  description: Record<string, string>;
}

export const FISH_CATALOG: FishDefinition[] = [
  // --- SHALLOW COAST (Zone 1) ---
  {
    id: "anchovy",
    nameKey: "anchovy",
    names: { ko: "멸치", en: "Anchovy", ja: "カタクチイワシ", zh: "凤尾鱼", fr: "Anchois", es: "Boquerón" },
    zone: "shallow",
    rarity: "common",
    minSize: 8,
    maxSize: 15,
    baseValue: 10,
    stamina: 20,
    struggleRate: 0.2,
    color: "#94a3b8",
    description: { ko: "연안에서 떼를 지어 다니는 작은 물고기.", en: "A small schooling coastal fish." },
  },
  {
    id: "mackerel",
    nameKey: "mackerel",
    names: { ko: "고등어", en: "Mackerel", ja: "サバ", zh: "鲭鱼", fr: "Maquereau", es: "Caballa" },
    zone: "shallow",
    rarity: "common",
    minSize: 25,
    maxSize: 45,
    baseValue: 25,
    stamina: 30,
    struggleRate: 0.35,
    color: "#38bdf8",
    description: { ko: "등 푸른 활발한 연안 어종.", en: "A fast, energetic blue-backed fish." },
  },
  {
    id: "flounder",
    nameKey: "flounder",
    names: { ko: "넙치 (광어)", en: "Flounder", ja: "ヒラメ", zh: "比目鱼", fr: "Flet", es: "Lenguado" },
    zone: "shallow",
    rarity: "uncommon",
    minSize: 30,
    maxSize: 70,
    baseValue: 50,
    stamina: 40,
    struggleRate: 0.3,
    color: "#78716c",
    description: { ko: "모래 바닥에 숨어있는 납작한 물고기.", en: "A flat ambush predator of shallow sands." },
  },
  {
    id: "squid",
    nameKey: "squid",
    names: { ko: "오징어", en: "Squid", ja: "スルメイカ", zh: "鱿鱼", fr: "Calmar", es: "Calamar" },
    zone: "shallow",
    rarity: "uncommon",
    minSize: 20,
    maxSize: 40,
    baseValue: 60,
    stamina: 35,
    struggleRate: 0.5,
    color: "#f43f5e",
    description: { ko: "먹물을 뿜으며 순간 분사 추진을 합니다.", en: "Jet-propels backwards with ink bursts." },
  },
  {
    id: "sea_bass",
    nameKey: "sea_bass",
    names: { ko: "농어", en: "Sea Bass", ja: "スズキ", zh: "海鲈鱼", fr: "Bar commun", es: "Lubina" },
    zone: "shallow",
    rarity: "rare",
    minSize: 40,
    maxSize: 90,
    baseValue: 120,
    stamina: 55,
    struggleRate: 0.45,
    color: "#cbd5e1",
    description: { ko: "파도 치는 여울목을 노리는 파이팅 어종.", en: "Strong fighter found in coastal surf." },
  },
  {
    id: "golden_carp",
    nameKey: "golden_carp",
    names: { ko: "황금 잉어", en: "Golden Carp", ja: "黄金コイ", zh: "锦鲤金鳞", fr: "Carpe Dorée", es: "Carpa Dorada" },
    zone: "shallow",
    rarity: "epic",
    minSize: 45,
    maxSize: 85,
    baseValue: 350,
    stamina: 65,
    struggleRate: 0.6,
    color: "#fbbf24",
    description: { ko: "황금빛으로 빛나는 행운의 상징 어종.", en: "Gleams with pure gold scales. Brings immense fortune." },
  },
  {
    id: "shallow_guardian",
    nameKey: "shallow_guardian",
    names: { ko: "연안의 수호거북", en: "Coast Titan Turtle", ja: "沿岸の守護亀", zh: "浅海守卫巨龟", fr: "Tortue Gardienne", es: "Tortuga Guardiana" },
    zone: "shallow",
    rarity: "legendary",
    minSize: 110,
    maxSize: 180,
    baseValue: 800,
    stamina: 85,
    struggleRate: 0.4,
    color: "#10b981",
    description: { ko: "백 년 넘게 얕은 여울을 지켜온 고대 거북.", en: "Centuries-old sea turtle revered by coastal fishermen." },
  },

  // --- CORAL REEF (Zone 2) ---
  {
    id: "clownfish",
    nameKey: "clownfish",
    names: { ko: "흰동가리", en: "Clownfish", ja: "カクレクマノミ", zh: "小丑鱼", fr: "Poisson-clown", es: "Pez payaso" },
    zone: "coral",
    rarity: "common",
    minSize: 6,
    maxSize: 14,
    baseValue: 30,
    stamina: 25,
    struggleRate: 0.3,
    color: "#f97316",
    description: { ko: "산호초 사이를 헤엄치는 귀여운 주황색 물고기.", en: "Colorful inhabitant of coral anemones." },
  },
  {
    id: "blue_tang",
    nameKey: "blue_tang",
    names: { ko: "블루탱", en: "Blue Tang", ja: "ナンヨウハギ", zh: "蓝唐王鱼", fr: "Chirurgien bleu", es: "Cirujano azul" },
    zone: "coral",
    rarity: "common",
    minSize: 15,
    maxSize: 30,
    baseValue: 45,
    stamina: 30,
    struggleRate: 0.4,
    color: "#2563eb",
    description: { ko: "선명한 파란빛과 노란 꼬리를 지닌 산호 어종.", en: "Vibrant sapphire fish with a yellow fin." },
  },
  {
    id: "parrotfish",
    nameKey: "parrotfish",
    names: { ko: "비늘돔 (앵무치)", en: "Parrotfish", ja: "ブダイ", zh: "鹦嘴鱼", fr: "Poisson-perroquet", es: "Pez loro" },
    zone: "coral",
    rarity: "uncommon",
    minSize: 30,
    maxSize: 60,
    baseValue: 75,
    stamina: 45,
    struggleRate: 0.35,
    color: "#06b6d4",
    description: { ko: "단단한 부리로 산호를 쪼아먹는 화려한 물고기.", en: "Equipped with a beak-like jaw to graze on coral." },
  },
  {
    id: "lionfish",
    nameKey: "lionfish",
    names: { ko: "쏠배감펭 (사자고기)", en: "Lionfish", ja: "ミノカサゴ", zh: "狮子鱼", fr: "Poisson-lion", es: "Pez león" },
    zone: "coral",
    rarity: "rare",
    minSize: 20,
    maxSize: 38,
    baseValue: 140,
    stamina: 50,
    struggleRate: 0.55,
    color: "#e11d48",
    description: { ko: "화려한 줄무늬 지느러미와 독가시를 지닌 포식자.", en: "Graceful fins concealing venomous defensive spines." },
  },
  {
    id: "moray_eel",
    nameKey: "moray_eel",
    names: { ko: "곰치", en: "Moray Eel", ja: "ウツボ", zh: "海鳝", fr: "Murène", es: "Morena" },
    zone: "coral",
    rarity: "rare",
    minSize: 80,
    maxSize: 150,
    baseValue: 200,
    stamina: 60,
    struggleRate: 0.65,
    color: "#854d0e",
    description: { ko: "산호 굴속에서 불시에 뛰쳐나오는 바다의 맹수.", en: "Slithering predator hiding within reef crevices." },
  },
  {
    id: "coral_empress",
    nameKey: "coral_empress",
    names: { ko: "산호 여제어", en: "Coral Empress", ja: "サンゴの女帝", zh: "珊瑚女皇鱼", fr: "Impératrice du Corail", es: "Emperatriz del Coral" },
    zone: "coral",
    rarity: "epic",
    minSize: 50,
    maxSize: 95,
    baseValue: 450,
    stamina: 75,
    struggleRate: 0.6,
    color: "#ec4899",
    description: { ko: "산호초의 정기를 받아 분홍빛 오로라를 뿜어냅니다.", en: "Emits a soft iridescent pink aura amidst reefs." },
  },
  {
    id: "rainbow_manta",
    nameKey: "rainbow_manta",
    names: { ko: "무지개 만타가오리", en: "Rainbow Manta", ja: "虹色マンタ", zh: "彩虹蝠鲼", fr: "Manta Arc-en-ciel", es: "Manta Arcoíris" },
    zone: "coral",
    rarity: "legendary",
    minSize: 180,
    maxSize: 320,
    baseValue: 1000,
    stamina: 95,
    struggleRate: 0.5,
    color: "#a855f7",
    description: { ko: "거대한 지느러미로 바다를 비행하는 전설의 만타.", en: "Magnificent giant flying through the blue sea like a bird." },
  },

  // --- DEEP SEA (Zone 3) ---
  {
    id: "yellowfin_tuna",
    nameKey: "yellowfin_tuna",
    names: { ko: "황다랑어", en: "Yellowfin Tuna", ja: "キハダマグロ", zh: "黄鳍金枪鱼", fr: "Thon albacore", es: "Atún de aleta amarilla" },
    zone: "deep",
    rarity: "uncommon",
    minSize: 80,
    maxSize: 180,
    baseValue: 180,
    stamina: 70,
    struggleRate: 0.6,
    color: "#eab308",
    description: { ko: "시속 80km로 심해를 질주하는 유선형의 강자.", en: "Torpedos through oceanic currents at high speeds." },
  },
  {
    id: "swordfish",
    nameKey: "swordfish",
    names: { ko: "황새치", en: "Swordfish", ja: "メカジキ", zh: "剑鱼", fr: "Espadon", es: "Pez espada" },
    zone: "deep",
    rarity: "rare",
    minSize: 150,
    maxSize: 300,
    baseValue: 320,
    stamina: 80,
    struggleRate: 0.7,
    color: "#475569",
    description: { ko: "날카로운 주둥이로 먹이를 베어 넘기는 대형어.", en: "Uses its razor-sharp bill to slash through prey schools." },
  },
  {
    id: "hammerhead",
    nameKey: "hammerhead",
    names: { ko: "귀상어", en: "Hammerhead Shark", ja: "シュモクザメ", zh: "双髻鲨", fr: "Requin-marteau", es: "Tiburón martillo" },
    zone: "deep",
    rarity: "rare",
    minSize: 180,
    maxSize: 350,
    baseValue: 400,
    stamina: 85,
    struggleRate: 0.65,
    color: "#64748b",
    description: { ko: "독특한 T자형 머리로 넓은 시야를 확보하는 상어.", en: "Distinct T-shaped cephalofoil grants panoramic vision." },
  },
  {
    id: "bluefin_tuna",
    nameKey: "bluefin_tuna",
    names: { ko: "참다랑어 (블루핀)", en: "Giant Bluefin Tuna", ja: "クロマグロ", zh: "蓝鳍金枪鱼", fr: "Thon rouge géant", es: "Atún rojo gigante" },
    zone: "deep",
    rarity: "epic",
    minSize: 160,
    maxSize: 280,
    baseValue: 700,
    stamina: 90,
    struggleRate: 0.75,
    color: "#1e3a8a",
    description: { ko: "바다의 검은 다이아몬드로 불리는 최고의 횟감.", en: "The Black Diamond of the sea. Tremendous pulling power." },
  },
  {
    id: "giant_squid",
    nameKey: "giant_squid",
    names: { ko: "대왕오징어", en: "Giant Squid", ja: "ダイオウイカ", zh: "大王乌贼", fr: "Calmar géant", es: "Calamar gigante" },
    zone: "deep",
    rarity: "epic",
    minSize: 400,
    maxSize: 900,
    baseValue: 850,
    stamina: 95,
    struggleRate: 0.8,
    color: "#be123c",
    description: { ko: "깊은 심해의 지배자, 전설의 크라켄의 원형.", en: "Legendary deep-sea kraken with massive sucker tentacles." },
  },
  {
    id: "oarfish",
    nameKey: "oarfish",
    names: { ko: "산갈치", en: "Giant Oarfish", ja: "リュウグウノツカイ", zh: "皇带鱼", fr: "Régalec géant", es: "Pez remo gigante" },
    zone: "deep",
    rarity: "legendary",
    minSize: 300,
    maxSize: 700,
    baseValue: 1200,
    stamina: 100,
    struggleRate: 0.6,
    color: "#e2e8f0",
    description: { ko: "용궁의 사자라 불리는 은빛 리본 형태의 신비 어종.", en: "Messenger from the Dragon Palace with ribbon-like silver body." },
  },
  {
    id: "leviathan_pup",
    nameKey: "leviathan_pup",
    names: { ko: "심해 리바이어던 치어", en: "Leviathan Spawn", ja: "リヴァイアサンの幼体", zh: "利维坦幼兽", fr: "Rejeton de Léviathan", es: "Cría de Leviatán" },
    zone: "deep",
    rarity: "legendary",
    minSize: 250,
    maxSize: 480,
    baseValue: 1500,
    stamina: 110,
    struggleRate: 0.85,
    color: "#1e293b",
    description: { ko: "고대 바다 신화 속 괴수의 어린 후예.", en: "Direct descendant of the primeval mythological sea beast." },
  },

  // --- ABYSSAL TRENCH (Zone 4) ---
  {
    id: "anglerfish",
    nameKey: "anglerfish",
    names: { ko: "초롱아귀", en: "Abyssal Anglerfish", ja: "チョウチンアンコウ", zh: "深海鮟鱇鱼", fr: "Baudroie des abysses", es: "Pez rape abisal" },
    zone: "abyss",
    rarity: "rare",
    minSize: 35,
    maxSize: 75,
    baseValue: 350,
    stamina: 70,
    struggleRate: 0.5,
    color: "#581c87",
    description: { ko: "이마의 발광 발광기로 어두운 심연을 비추는 사냥꾼.", en: "Dangles a bioluminescent lure in pitch-black abyssal trenches." },
  },
  {
    id: "viperfish",
    nameKey: "viperfish",
    names: { ko: "심해 독사물고기", en: "Viperfish", ja: "ホウライエソ", zh: "蝰鱼", fr: "Poisson-vipère", es: "Pez víbora" },
    zone: "abyss",
    rarity: "rare",
    minSize: 25,
    maxSize: 45,
    baseValue: 400,
    stamina: 65,
    struggleRate: 0.7,
    color: "#312e81",
    description: { ko: "입을 닫을 수 없을 정도로 거대한 송곳니를 가진 공포의 물고기.", en: "Needle-sharp fangs so long they cannot fit inside its jaws." },
  },
  {
    id: "blobfish",
    nameKey: "blobfish",
    names: { ko: "블롭피쉬", en: "Blobfish", ja: "ブロブフィッシュ", zh: "水滴鱼", fr: "Blobfish", es: "Pez gota" },
    zone: "abyss",
    rarity: "rare",
    minSize: 20,
    maxSize: 35,
    baseValue: 380,
    stamina: 50,
    struggleRate: 0.25,
    color: "#f472b6",
    description: { ko: "수압이 없으면 젤라틴처럼 흐물거리는 기묘한 생물.", en: "Gelatinous deep dweller adapted to extreme oceanic pressure." },
  },
  {
    id: "goblin_shark",
    nameKey: "goblin_shark",
    names: { ko: "고블린 상어 (마귀상어)", en: "Goblin Shark", ja: "ミツクリザメ", zh: "欧氏尖吻鲛", fr: "Requin lutin", es: "Tiburón duende" },
    zone: "abyss",
    rarity: "epic",
    minSize: 200,
    maxSize: 380,
    baseValue: 900,
    stamina: 90,
    struggleRate: 0.65,
    color: "#fda4af",
    description: { ko: "턱이 앞으로 튀어나오는 살아있는 화석 상어.", en: "Extensible jaws that slingshot forward to snap prey." },
  },
  {
    id: "coelacanth",
    nameKey: "coelacanth",
    names: { ko: "실러캔스", en: "Coelacanth", ja: "シーラカンス", zh: "腔棘鱼", fr: "Cœlacanthe", es: "Celacanto" },
    zone: "abyss",
    rarity: "legendary",
    minSize: 120,
    maxSize: 200,
    baseValue: 1600,
    stamina: 105,
    struggleRate: 0.6,
    color: "#0f766e",
    description: { ko: "4억 년 전부터 모습을 바꾸지 않은 살아있는 고대 화석.", en: "400-million-year-old living fossil with fleshy lobed fins." },
  },
  {
    id: "dunkleosteus",
    nameKey: "dunkleosteus",
    names: { ko: "던클레오스테우스", en: "Dunkleosteus", ja: "ダンクルオステウス", zh: "邓氏鱼", fr: "Dunkleosteus", es: "Dunkleosteus" },
    zone: "abyss",
    rarity: "legendary",
    minSize: 450,
    maxSize: 750,
    baseValue: 2200,
    stamina: 115,
    struggleRate: 0.8,
    color: "#713f12",
    description: { ko: "단단한 갑골 판금과 분쇄 턱을 지닌 고생대 최강의 판피어.", en: "Armored prehistoric titan that crushed giant armored prey." },
  },
  {
    id: "neon_abyss_jelly",
    nameKey: "neon_abyss_jelly",
    names: { ko: "네온 심연 해파리", en: "Neon Abyssal Medusa", ja: "深海ネオンクラゲ", zh: "深渊霓虹水母", fr: "Méduse Néon Abyssale", es: "Medusa Neón Abisal" },
    zone: "abyss",
    rarity: "epic",
    minSize: 90,
    maxSize: 170,
    baseValue: 1100,
    stamina: 80,
    struggleRate: 0.75,
    color: "#06b6d4",
    description: { ko: "우주 성운처럼 찬란한 빛을 내뿜는 거대 촉수 해파리.", en: "Flashes pulsating neon constellations in the dark depths." },
  },
  {
    id: "golden_dragonfish",
    nameKey: "golden_dragonfish",
    names: { ko: "심연의 황금 용어", en: "Golden Abyssal Dragon", ja: "深淵の黄金龍魚", zh: "深渊金龙神鱼", fr: "Dragon Doré Abyssal", es: "Dragón Dorado Abisal" },
    zone: "abyss",
    rarity: "mythic",
    minSize: 300,
    maxSize: 550,
    baseValue: 3500,
    stamina: 120,
    struggleRate: 0.9,
    color: "#eab308",
    description: { ko: "전설의 심연 깊은 곳에 잠든 궁극의 환상 어종.", en: "The supreme mythological apex of all aquatic life." },
  },
  {
    id: "cosmic_leviathan",
    nameKey: "cosmic_leviathan",
    names: { ko: "우주 심연의 레비아탄", en: "Cosmic Leviathan", ja: "宇宙深淵のレヴィアタン", zh: "星穹深渊巨兽", fr: "Léviathan Cosmique", es: "Leviatán Cósmico" },
    zone: "abyss",
    rarity: "mythic",
    minSize: 800,
    maxSize: 1500,
    baseValue: 5000,
    stamina: 130,
    struggleRate: 0.95,
    color: "#818cf8",
    description: { ko: "별의 파편을 품고 대양의 심장부를 유영하는 우주적 존재.", en: "Cosmic entity older than the oceans, harboring stellar fragments." },
  },
];

// Equipment Definitions
export interface RodUpgrade {
  level: number;
  nameKey: string;
  names: Record<string, string>;
  cost: number;
  durability: number; // Tension threshold limit multiplier (1.0 to 2.2)
  pullPower: number; // Reel speed multiplier (1.0 to 2.4)
}

export const ROD_UPGRADES: RodUpgrade[] = [
  { level: 1, nameKey: "bamboo", names: { ko: "대나무 낚싯대", en: "Bamboo Rod" }, cost: 0, durability: 1.0, pullPower: 1.0 },
  { level: 2, nameKey: "fiberglass", names: { ko: "유리섬유 로드", en: "Fiberglass Rod" }, cost: 250, durability: 1.25, pullPower: 1.3 },
  { level: 3, nameKey: "carbon", names: { ko: "카본 프로 로드", en: "Carbon Pro Rod" }, cost: 750, durability: 1.6, pullPower: 1.7 },
  { level: 4, nameKey: "titanium", names: { ko: "티타늄 마린 로드", en: "Titanium Marine Rod" }, cost: 2000, durability: 2.0, pullPower: 2.1 },
  { level: 5, nameKey: "mythic_star", names: { ko: "별빛의 신화 로드", en: "Starlight Mythic Rod" }, cost: 5000, durability: 2.5, pullPower: 2.6 },
];

export interface BoatUpgrade {
  level: number;
  nameKey: string;
  names: Record<string, string>;
  cost: number;
  unlockedZone: FishingZone;
}

export const BOAT_UPGRADES: BoatUpgrade[] = [
  { level: 1, nameKey: "raft", names: { ko: "뗏목 (연안 해역)", en: "Wooden Raft (Shallows)" }, cost: 0, unlockedZone: "shallow" },
  { level: 2, nameKey: "dinghy", names: { ko: "모터 보트 (산호초)", en: "Motor Dinghy (Coral Reef)" }, cost: 500, unlockedZone: "coral" },
  { level: 3, nameKey: "trawler", names: { ko: "원양 어선 (심해)", en: "Deep Sea Trawler (Deep)" }, cost: 1800, unlockedZone: "deep" },
  { level: 4, nameKey: "submarine", names: { ko: "심해 탐사선 (심연 해구)", en: "Research Submarine (Abyss)" }, cost: 4500, unlockedZone: "abyss" },
];

export type FishingStateStatus = "idle" | "casting" | "waiting" | "biting" | "reeling" | "caught" | "snapped" | "victory";

export interface CaughtFishRecord {
  fishId: string;
  count: number;
  maxSize: number;
}

export interface FishBiteInfo {
  fish: FishDefinition;
  size: number;
  staminaMax: number;
  staminaCurrent: number;
  struggleTimer: number;
  isStruggling: boolean;
}

export interface FishingGameState {
  status: FishingStateStatus;
  zone: FishingZone;
  gold: number;
  totalCatches: number;
  rodLevel: number;
  boatLevel: number;
  baitCount: number;
  // Tension / Minigame
  lineTension: number; // 0 to 100
  distance: number; // 100 down to 0
  biteAlertTimer: number; // ms remaining to hook when 'biting'
  activeFish: FishBiteInfo | null;
  lastCaught: { fish: FishDefinition; size: number; value: number } | null;
  // Encyclopedia: fishId -> Record
  encyclopedia: Record<string, CaughtFishRecord>;
  logMessage: string;
}

// PRNG
export class FishingRng {
  private s: number;
  constructor(seed: number = 19930711) {
    this.s = (seed ^ 0x6d2b79f5) | 1;
  }
  next(): number {
    this.s ^= this.s << 13;
    this.s ^= this.s >>> 17;
    this.s ^= this.s << 5;
    return (this.s >>> 0) / 4294967296;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  choose<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

export function createFishingGame(seed = 12345): FishingGameState {
  return {
    status: "idle",
    zone: "shallow",
    gold: 50,
    totalCatches: 0,
    rodLevel: 1,
    boatLevel: 1,
    baitCount: 5,
    lineTension: 20,
    distance: 100,
    biteAlertTimer: 0,
    activeFish: null,
    lastCaught: null,
    encyclopedia: {},
    logMessage: "바다에 찌를 던져 낚시를 시작하세요!",
  };
}

export function getAvailableZones(boatLevel: number): FishingZone[] {
  const zones: FishingZone[] = ["shallow"];
  if (boatLevel >= 2) zones.push("coral");
  if (boatLevel >= 3) zones.push("deep");
  if (boatLevel >= 4) zones.push("abyss");
  return zones;
}

/**
 * Cast line into current zone.
 */
export function startCast(state: FishingGameState, rng: FishingRng): FishingGameState {
  if (state.status !== "idle" && state.status !== "caught" && state.status !== "snapped") {
    return state;
  }

  // Waiting delay between 1.5s to 4.5s
  const waitMs = Math.floor(rng.range(1500, 4200));

  return {
    ...state,
    status: "waiting",
    distance: 100,
    lineTension: 15,
    activeFish: null,
    biteAlertTimer: waitMs,
    logMessage: "찌를 던졌습니다... 입질을 기다리는 중...",
  };
}

/**
 * Trigger fish bite after waiting time expires.
 */
export function triggerBite(state: FishingGameState, rng: FishingRng): FishingGameState {
  if (state.status !== "waiting") return state;

  // Filter fishes by current zone
  const zoneFishes = FISH_CATALOG.filter((f) => f.zone === state.zone);
  if (zoneFishes.length === 0) return state;

  // Rarity weighted selection
  const weights: Record<RarityTier, number> = {
    common: 50,
    uncommon: 30,
    rare: 14,
    epic: 5,
    legendary: 0.9,
    mythic: 0.1,
  };

  const pool: FishDefinition[] = [];
  for (const f of zoneFishes) {
    const w = Math.round(weights[f.rarity] * 10);
    for (let i = 0; i < w; i++) {
      pool.push(f);
    }
  }

  const selectedFish = pool.length > 0 ? rng.choose(pool) : zoneFishes[0];
  const size = Math.round(rng.range(selectedFish.minSize, selectedFish.maxSize) * 10) / 10;

  return {
    ...state,
    status: "biting",
    biteAlertTimer: 2500, // 2.5 seconds window to hook
    activeFish: {
      fish: selectedFish,
      size,
      staminaMax: selectedFish.stamina,
      staminaCurrent: selectedFish.stamina,
      struggleTimer: 0,
      isStruggling: false,
    },
    logMessage: "찌가 크게 흔들립니다! 지금 릴을 감아 챔질하세요! (!)",
  };
}

/**
 * Hook the fish when biting.
 */
export function hookFish(state: FishingGameState): FishingGameState {
  if (state.status !== "biting" || !state.activeFish) {
    return state;
  }

  return {
    ...state,
    status: "reeling",
    lineTension: 35,
    distance: 100,
    logMessage: `${state.activeFish.fish.names.ko || state.activeFish.fish.names.en}의 챔질에 성공했습니다! 릴을 감아 끌어당기세요!`,
  };
}

/**
 * Tension minigame tick.
 * @param dt Delta time in seconds (e.g. 0.05 for 20 FPS tick)
 * @param isReelingPlayer Whether player is holding reel down
 */
export function stepReelingTick(
  state: FishingGameState,
  dt: number,
  isReelingPlayer: boolean,
  rng: FishingRng
): FishingGameState {
  if (state.status !== "reeling" || !state.activeFish) {
    return state;
  }

  const rod = ROD_UPGRADES[state.rodLevel - 1] || ROD_UPGRADES[0];
  const fish = state.activeFish.fish;

  let { lineTension, distance } = state;
  let { staminaCurrent, struggleTimer, isStruggling } = state.activeFish;

  // Toggle fish struggle
  struggleTimer -= dt;
  if (struggleTimer <= 0) {
    isStruggling = rng.next() < fish.struggleRate;
    struggleTimer = rng.range(0.8, 2.2);
  }

  // Tension physics
  if (isReelingPlayer) {
    // Player pulling line
    const tensionRise = isStruggling ? 55 / rod.durability : 28 / rod.durability;
    lineTension += tensionRise * dt;

    // Distance decreases (approaching boat)
    const pullSpeed = (20 * rod.pullPower) / (1 + (staminaCurrent / fish.stamina) * 0.8);
    distance -= pullSpeed * dt;

    // Deplete fish stamina
    staminaCurrent = Math.max(0, staminaCurrent - 12 * rod.pullPower * dt);
  } else {
    // Player releasing reel
    lineTension = Math.max(10, lineTension - 45 * dt);

    // If fish is struggling, it pulls distance away
    if (isStruggling && staminaCurrent > 0) {
      distance = Math.min(100, distance + 14 * dt);
    }
  }

  // Snap condition
  if (lineTension >= 100) {
    return {
      ...state,
      status: "snapped",
      activeFish: null,
      lineTension: 0,
      logMessage: "낚싯줄이 팽팽하게 당겨져 끊어졌습니다! 물고기가 도망쳤습니다.",
    };
  }

  // Catch condition
  if (distance <= 0) {
    const caughtFish = state.activeFish.fish;
    const caughtSize = state.activeFish.size;
    // Value bonus for oversized specimen
    const sizeMultiplier = 1 + ((caughtSize - caughtFish.minSize) / (caughtFish.maxSize - caughtFish.minSize || 1)) * 0.5;
    const value = Math.round(caughtFish.baseValue * sizeMultiplier);

    const prevRecord = state.encyclopedia[caughtFish.id];
    const newRecord: CaughtFishRecord = {
      fishId: caughtFish.id,
      count: (prevRecord?.count || 0) + 1,
      maxSize: Math.max(prevRecord?.maxSize || 0, caughtSize),
    };

    const newEncyclopedia = {
      ...state.encyclopedia,
      [caughtFish.id]: newRecord,
    };

    const newGold = state.gold + value;
    const newCatches = state.totalCatches + 1;

    // Victory check: 30 unique species caught or 10,000 gold
    const uniqueCount = Object.keys(newEncyclopedia).length;
    const isVictory = uniqueCount >= 30 || newGold >= 10000;

    return {
      ...state,
      status: isVictory ? "victory" : "caught",
      gold: newGold,
      totalCatches: newCatches,
      lastCaught: {
        fish: caughtFish,
        size: caughtSize,
        value,
      },
      encyclopedia: newEncyclopedia,
      activeFish: null,
      distance: 0,
      lineTension: 0,
      logMessage: `대물 낚시 성공! [${caughtFish.names.ko || caughtFish.names.en}] ${caughtSize}cm (+${value}G)`,
    };
  }

  return {
    ...state,
    lineTension,
    distance,
    activeFish: {
      ...state.activeFish,
      staminaCurrent,
      struggleTimer,
      isStruggling,
    },
  };
}

/**
 * Change fishing zone (must be unlocked).
 */
export function setFishingZone(state: FishingGameState, zone: FishingZone): FishingGameState {
  const available = getAvailableZones(state.boatLevel);
  if (!available.includes(zone)) return state;

  return {
    ...state,
    status: "idle",
    zone,
    activeFish: null,
    logMessage: `조업 해역을 [${zone.toUpperCase()}] 구역으로 이동했습니다.`,
  };
}

/**
 * Buy Rod Upgrade.
 */
export function buyRodUpgrade(state: FishingGameState): FishingGameState {
  if (state.rodLevel >= ROD_UPGRADES.length) return state;
  const nextUpgrade = ROD_UPGRADES[state.rodLevel];
  if (state.gold < nextUpgrade.cost) return state;

  return {
    ...state,
    gold: state.gold - nextUpgrade.cost,
    rodLevel: state.rodLevel + 1,
    logMessage: `새 낚싯대 [${nextUpgrade.names.ko || nextUpgrade.names.en}] 장착 완료!`,
  };
}

/**
 * Buy Boat Upgrade.
 */
export function buyBoatUpgrade(state: FishingGameState): FishingGameState {
  if (state.boatLevel >= BOAT_UPGRADES.length) return state;
  const nextUpgrade = BOAT_UPGRADES[state.boatLevel];
  if (state.gold < nextUpgrade.cost) return state;

  return {
    ...state,
    gold: state.gold - nextUpgrade.cost,
    boatLevel: state.boatLevel + 1,
    zone: nextUpgrade.unlockedZone,
    logMessage: `선박 업그레이드 [${nextUpgrade.names.ko || nextUpgrade.names.en}] 완료! 새로운 해역이 개방되었습니다!`,
  };
}
