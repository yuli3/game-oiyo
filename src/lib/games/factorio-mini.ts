/**
 * Factorio Automation Mini (#132) — Conveyor Belt, Miner, Smelter, Assembler & Research Lab Engine
 *
 * Features:
 * - 10x8 industrial automation grid with resource veins (Iron Ore, Copper Ore, Coal)
 * - Directional buildings (0: North, 1: East, 2: South, 3: West):
 *   - Miner: Extracts raw ore from resource tiles
 *   - Belt: Transports items smoothly from tile to tile
 *   - Smelter: Smelts raw ore into refined metal plates (iron_ore -> iron_plate, copper_ore -> copper_plate)
 *   - Assembler: Crafts high-value components (iron_plate -> gear, copper_plate -> circuit, or both -> science_pack)
 *   - Lab (Hub): Consumes delivered items to generate Research Points (RP) and complete stage technology goals
 */

export type Direction = 0 | 1 | 2 | 3; // 0: Up(N), 1: Right(E), 2: Down(S), 3: Left(W)

export type ResourceType = "none" | "iron_ore" | "copper_ore" | "coal";

export type BuildingType = "empty" | "miner" | "belt" | "smelter" | "assembler" | "lab";

export type ItemType =
  | "iron_ore"
  | "copper_ore"
  | "coal"
  | "iron_plate"
  | "copper_plate"
  | "gear"
  | "circuit"
  | "science_pack";

export interface GridItem {
  id: number;
  type: ItemType;
  progress: number; // 0.0 to 1.0 across current tile
}

export interface GridCell {
  x: number;
  y: number;
  resource: ResourceType;
  building: BuildingType;
  dir: Direction;
  item: GridItem | null;
  bufferIron: number;
  bufferCopper: number;
  workTimer: number;
}

export interface StageSpec {
  id: string;
  name: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  targetRp: number;
  description: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  labX: number;
  labY: number;
  resources: Array<{ x: number; y: number; type: ResourceType }>;
  starterBuildings: Array<{ x: number; y: number; building: BuildingType; dir: Direction }>;
  /** Buildings the Auto Blueprint adds on top of the starter layout (sectors 4+). */
  blueprint?: Array<{ x: number; y: number; building: BuildingType; dir: Direction }>;
}

export interface FactorioState {
  stageIndex: number;
  gridW: number;
  gridH: number;
  cells: GridCell[][];
  rp: number;
  targetRp: number;
  totalItemsDelivered: number;
  deliveredCounts: Record<ItemType, number>;
  selectedTool: BuildingType;
  selectedDir: Direction;
  isCleared: boolean;
  simSpeed: 1 | 2;
  nextItemId: number;
  lastDeliveredItem: ItemType | null;
  lastDeliveredTime: number;
}

export const GRID_W = 10;
export const GRID_H = 8;

export const ITEM_RP_VALUES: Record<ItemType, number> = {
  iron_ore: 2,
  copper_ore: 2,
  coal: 3,
  iron_plate: 10,
  copper_plate: 10,
  gear: 25,
  circuit: 25,
  science_pack: 65,
};

export const ITEM_COLORS: Record<ItemType, string> = {
  iron_ore: "#60a5fa",
  copper_ore: "#fb923c",
  coal: "#334155",
  iron_plate: "#e2e8f0",
  copper_plate: "#f97316",
  gear: "#94a3b8",
  circuit: "#22c55e",
  science_pack: "#ef4444",
};

export const DIR_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  0: { dx: 0, dy: -1 },
  1: { dx: 1, dy: 0 },
  2: { dx: 0, dy: 1 },
  3: { dx: -1, dy: 0 },
};

export const STAGES: StageSpec[] = [
  {
    id: "smelting-outpost",
    name: {
      ko: "제1공구: 기초 제련 자동화 기지",
      en: "Sector 1: Automated Smelting Outpost",
      ja: "第1工区：基礎製錬自動化基地",
      zh: "第一工区：基础冶炼自动化前哨",
      fr: "Secteur 1 : Avant-poste de fonderie",
      es: "Sector 1: Puesto de fundición automatizado",
    },
    targetRp: 150,
    description: {
      ko: "철광석과 구리광석 위에 채굴기(⛏️)를 짓고, 용광로(🔥)와 컨베이어 벨트(➡️)로 연구실(🔬)에 금속판을 공급하세요.",
      en: "Place Miners on Iron & Copper veins, smelt ore into plates with Smelters, and route Conveyor Belts into the Research Lab.",
      ja: "鉄鉱石と銅鉱石の上に採掘機を建て、溶鉱炉とコンベアベルトで研究所へ金属板を供給しましょう。",
      zh: "在铁矿与铜矿脉上建造采矿机，利用熔炉冶炼金属板，并通过传送带源源不断送入研究中心。",
      fr: "Placez des foreuses sur le fer et le cuivre, fondez le minerai et acheminez les plaques vers le laboratoire.",
      es: "Coloca perforadoras en las vetas, funde el mineral en placas y lleva cintas transportadoras al laboratorio.",
    },
    labX: 8,
    labY: 3,
    resources: [
      { x: 1, y: 1, type: "iron_ore" },
      { x: 1, y: 2, type: "iron_ore" },
      { x: 2, y: 1, type: "iron_ore" },
      { x: 1, y: 5, type: "copper_ore" },
      { x: 1, y: 6, type: "copper_ore" },
      { x: 2, y: 5, type: "copper_ore" },
      { x: 4, y: 6, type: "coal" },
    ],
    starterBuildings: [
      { x: 1, y: 2, building: "miner", dir: 1 },
      { x: 2, y: 2, building: "belt", dir: 1 },
      { x: 3, y: 2, building: "smelter", dir: 1 },
      { x: 4, y: 2, building: "belt", dir: 1 },
      { x: 5, y: 2, building: "belt", dir: 2 },
      { x: 5, y: 3, building: "belt", dir: 1 },
      { x: 6, y: 3, building: "belt", dir: 1 },
      { x: 7, y: 3, building: "belt", dir: 1 },
    ],
  },
  {
    id: "circuit-assembly",
    name: {
      ko: "제2공구: 기어 & 전자회로 조립 라인",
      en: "Sector 2: Gear & Circuit Assembly Line",
      ja: "第2工区：歯車＆電子回路組立ライン",
      zh: "第二工区：齿轮与电子电路装配线",
      fr: "Secteur 2 : Chaîne d'assemblage",
      es: "Sector 2: Línea de ensamblaje",
    },
    targetRp: 320,
    description: {
      ko: "용광로에서 나온 철판과 구리판을 조립기(⚙️)에 투입해 톱니바퀴(25 RP)와 전자회로(25 RP) 또는 적색 과학 팩(65 RP)을 생산하세요!",
      en: "Feed smelted Iron & Copper plates into Assemblers to craft Gears (25 RP), Circuits (25 RP), or Red Science Packs (65 RP)!",
      ja: "溶鉱炉から出た鉄板と銅板を組立機に投入し、歯車(25 RP)や電子回路(25 RP)、赤サイエンスパック(65 RP)を生産しましょう！",
      zh: "将铁板与铜板送入组装机，制造高价值的齿轮（25 RP）、电子电路（25 RP）或红色科技包（65 RP）！",
      fr: "Envoyez les plaques dans les machines d'assemblage pour fabriquer des engrenages, des circuits ou des packs scientifiques !",
      es: "¡Introduce placas en las ensambladoras para fabricar engranajes, circuitos o paquetes de ciencia roja!",
    },
    labX: 8,
    labY: 4,
    resources: [
      { x: 1, y: 1, type: "iron_ore" },
      { x: 2, y: 1, type: "iron_ore" },
      { x: 1, y: 2, type: "iron_ore" },
      { x: 1, y: 5, type: "copper_ore" },
      { x: 2, y: 5, type: "copper_ore" },
      { x: 1, y: 6, type: "copper_ore" },
      { x: 5, y: 1, type: "coal" },
      { x: 5, y: 6, type: "coal" },
    ],
    starterBuildings: [
      { x: 1, y: 2, building: "miner", dir: 1 },
      { x: 2, y: 2, building: "smelter", dir: 1 },
      { x: 3, y: 2, building: "belt", dir: 2 },
      { x: 3, y: 3, building: "belt", dir: 2 },
      { x: 3, y: 4, building: "assembler", dir: 1 },
      { x: 4, y: 4, building: "belt", dir: 1 },
      { x: 5, y: 4, building: "belt", dir: 1 },
      { x: 6, y: 4, building: "belt", dir: 1 },
      { x: 7, y: 4, building: "belt", dir: 1 },
    ],
  },
  {
    id: "mega-science-factory",
    name: {
      ko: "제3공구: 적색 과학 팩 메가팩토리",
      en: "Sector 3: Red Science Megafactory",
      ja: "第3工区：赤サイエンス・メガファクトリー",
      zh: "第三工区：红色科技包超级工厂",
      fr: "Secteur 3 : Mégausine scientifique",
      es: "Sector 3: Megafactoría científica",
    },
    targetRp: 600,
    description: {
      ko: "철판과 구리판을 하나의 조립기(⚙️)로 합류시키면 최고 가치의 '적색 과학 팩(65 RP)'이 합성됩니다! 복수 라인을 가동하세요.",
      en: "Merge Iron Plates and Copper Plates into the same Assembler to synthesize high-yield Red Science Packs (65 RP)!",
      ja: "鉄板と銅板を同じ組立機に合流させると、最高価値の「赤サイエンスパック(65 RP)」が合成されます！",
      zh: "将铁板与铜板汇入同一台组装机即可合成高价值的“红色科技包（65 RP）”！扩建多条产线达成目标。",
      fr: "Combinez plaques de fer et de cuivre dans une même machine d'assemblage pour synthétiser des packs de science rouge (65 RP) !",
      es: "¡Combina placas de hierro y cobre en la misma ensambladora para sintetizar paquetes de ciencia roja (65 RP)!",
    },
    labX: 5,
    labY: 3,
    resources: [
      { x: 1, y: 1, type: "iron_ore" },
      { x: 1, y: 2, type: "iron_ore" },
      { x: 8, y: 1, type: "iron_ore" },
      { x: 8, y: 2, type: "iron_ore" },
      { x: 1, y: 5, type: "copper_ore" },
      { x: 1, y: 6, type: "copper_ore" },
      { x: 8, y: 5, type: "copper_ore" },
      { x: 8, y: 6, type: "copper_ore" },
    ],
    starterBuildings: [
      { x: 1, y: 2, building: "miner", dir: 1 },
      { x: 2, y: 2, building: "smelter", dir: 1 },
      { x: 3, y: 2, building: "belt", dir: 2 },
      { x: 1, y: 5, building: "miner", dir: 1 },
      { x: 2, y: 5, building: "smelter", dir: 1 },
      { x: 3, y: 5, building: "belt", dir: 0 },
      { x: 3, y: 4, building: "belt", dir: 0 },
      { x: 3, y: 3, building: "assembler", dir: 1 },
      { x: 4, y: 3, building: "belt", dir: 1 },
    ],
  },
  // --- sectors 4-10 (stage range 2026-11-21); each carries its own blueprint ---
  {
    id: "mirror-outpost",
    name: {
      ko: "제4공구: 반대편 제련소",
      en: "Sector 4: Mirrored Smelter",
      ja: "第4工区：反対側の製錬所",
      zh: "第四工区：镜像冶炼厂",
      fr: "Secteur 4 : Fonderie miroir",
      es: "Sector 4: Fundición espejo",
    },
    targetRp: 240,
    description: {
      ko: "이번엔 연구실이 왼쪽에 있습니다. 오른쪽 광맥에서 서쪽(←)으로 벨트를 돌려 철판과 구리판을 보내세요.",
      en: "The lab is on the left this time. Point belts west (←) from the veins on the right to send iron and copper plates.",
      ja: "今回は研究所が左側にあります。右の鉱脈から西(←)へベルトを向けて鉄板と銅板を送りましょう。",
      zh: "这次研究中心在左边。从右侧矿脉把传送带朝西(←)铺设，送去铁板和铜板。",
      fr: "Cette fois le labo est à gauche. Orientez les tapis vers l'ouest (←) depuis les filons de droite pour livrer fer et cuivre.",
      es: "Esta vez el laboratorio está a la izquierda. Orienta las cintas al oeste (←) desde las vetas de la derecha para enviar hierro y cobre.",
    },
    labX: 1,
    labY: 3,
    resources: [
      { x: 8, y: 1, type: "iron_ore" },
      { x: 8, y: 2, type: "iron_ore" },
      { x: 9, y: 2, type: "iron_ore" },
      { x: 8, y: 5, type: "copper_ore" },
      { x: 8, y: 6, type: "copper_ore" },
      { x: 9, y: 5, type: "copper_ore" },
      { x: 5, y: 7, type: "coal" },
    ],
    starterBuildings: [
      { x: 8, y: 2, building: "miner", dir: 3 },
      { x: 7, y: 2, building: "smelter", dir: 3 },
      { x: 6, y: 2, building: "belt", dir: 3 },
      { x: 5, y: 2, building: "belt", dir: 3 },
      { x: 4, y: 2, building: "belt", dir: 3 },
      { x: 3, y: 2, building: "belt", dir: 3 },
      { x: 2, y: 2, building: "belt", dir: 2 },
      { x: 2, y: 3, building: "belt", dir: 3 },
    ],
    blueprint: [
      { x: 8, y: 5, building: "miner", dir: 3 },
      { x: 7, y: 5, building: "smelter", dir: 3 },
      { x: 6, y: 5, building: "belt", dir: 3 },
      { x: 5, y: 5, building: "belt", dir: 3 },
      { x: 4, y: 5, building: "belt", dir: 3 },
      { x: 3, y: 5, building: "belt", dir: 3 },
      { x: 2, y: 5, building: "belt", dir: 0 },
      { x: 2, y: 4, building: "belt", dir: 3 },
      { x: 1, y: 4, building: "belt", dir: 0 },
    ],
  },
  {
    id: "gear-works",
    name: {
      ko: "제5공구: 톱니바퀴 공방",
      en: "Sector 5: Gear Works",
      ja: "第5工区：歯車工房",
      zh: "第五工区：齿轮工坊",
      fr: "Secteur 5 : Atelier des engrenages",
      es: "Sector 5: Taller de engranajes",
    },
    targetRp: 300,
    description: {
      ko: "철판만 조립기(⚙️)에 넣으면 톱니바퀴(25 RP)가 나옵니다. 철 라인 두 개를 모두 조립기로 거쳐 보내세요.",
      en: "An Assembler fed only iron plates makes Gears (25 RP). Run both iron lines through Assemblers.",
      ja: "組立機に鉄板だけを入れると歯車(25 RP)ができます。鉄のラインを2本とも組立機に通しましょう。",
      zh: "只给组装机送铁板就会产出齿轮(25 RP)。让两条铁产线都经过组装机。",
      fr: "Une machine d'assemblage alimentée en fer seul fabrique des engrenages (25 RP). Faites passer les deux lignes de fer par une machine.",
      es: "Una ensambladora que solo recibe hierro fabrica engranajes (25 RP). Pasa las dos líneas de hierro por ensambladoras.",
    },
    labX: 8,
    labY: 4,
    resources: [
      { x: 1, y: 1, type: "iron_ore" },
      { x: 1, y: 2, type: "iron_ore" },
      { x: 2, y: 1, type: "iron_ore" },
      { x: 1, y: 6, type: "iron_ore" },
      { x: 2, y: 7, type: "iron_ore" },
      { x: 5, y: 4, type: "coal" },
    ],
    starterBuildings: [
      { x: 1, y: 2, building: "miner", dir: 1 },
      { x: 2, y: 2, building: "smelter", dir: 1 },
      { x: 3, y: 2, building: "belt", dir: 1 },
      { x: 4, y: 2, building: "assembler", dir: 1 },
      { x: 5, y: 2, building: "belt", dir: 1 },
      { x: 6, y: 2, building: "belt", dir: 1 },
      { x: 7, y: 2, building: "belt", dir: 1 },
      { x: 8, y: 2, building: "belt", dir: 2 },
      { x: 8, y: 3, building: "belt", dir: 2 },
    ],
    blueprint: [
      { x: 1, y: 6, building: "miner", dir: 1 },
      { x: 2, y: 6, building: "smelter", dir: 1 },
      { x: 3, y: 6, building: "assembler", dir: 1 },
      { x: 4, y: 6, building: "belt", dir: 1 },
      { x: 5, y: 6, building: "belt", dir: 1 },
      { x: 6, y: 6, building: "belt", dir: 1 },
      { x: 7, y: 6, building: "belt", dir: 1 },
      { x: 8, y: 6, building: "belt", dir: 0 },
      { x: 8, y: 5, building: "belt", dir: 0 },
    ],
  },
  {
    id: "circuit-bay",
    name: {
      ko: "제6공구: 회로 조립만",
      en: "Sector 6: Circuit Bay",
      ja: "第6工区：回路組立ベイ",
      zh: "第六工区：电路装配湾",
      fr: "Secteur 6 : Baie des circuits",
      es: "Sector 6: Bahía de circuitos",
    },
    targetRp: 400,
    description: {
      ko: "연구실이 위쪽 가운데에 있습니다. 양쪽 구리 광맥에서 전자회로(25 RP)를 만들어 위로(↑) 올려 보내세요.",
      en: "The lab sits at the top middle. Make Circuits (25 RP) from both copper veins and send them up (↑).",
      ja: "研究所は上の中央にあります。両側の銅鉱脈から電子回路(25 RP)を作って上(↑)へ送りましょう。",
      zh: "研究中心在上方中央。用两侧铜矿做电子电路(25 RP)，再往上(↑)送。",
      fr: "Le labo est en haut au centre. Fabriquez des circuits (25 RP) avec les deux filons de cuivre et envoyez-les vers le haut (↑).",
      es: "El laboratorio está arriba en el centro. Fabrica circuitos (25 RP) con las dos vetas de cobre y envíalos hacia arriba (↑).",
    },
    labX: 5,
    labY: 1,
    resources: [
      { x: 1, y: 5, type: "copper_ore" },
      { x: 1, y: 6, type: "copper_ore" },
      { x: 8, y: 5, type: "copper_ore" },
      { x: 8, y: 6, type: "copper_ore" },
      { x: 0, y: 1, type: "coal" },
      { x: 9, y: 1, type: "coal" },
    ],
    starterBuildings: [
      { x: 1, y: 6, building: "miner", dir: 1 },
      { x: 2, y: 6, building: "smelter", dir: 1 },
      { x: 3, y: 6, building: "assembler", dir: 0 },
      { x: 3, y: 5, building: "belt", dir: 0 },
      { x: 3, y: 4, building: "belt", dir: 0 },
      { x: 3, y: 3, building: "belt", dir: 0 },
      { x: 3, y: 2, building: "belt", dir: 0 },
      { x: 3, y: 1, building: "belt", dir: 1 },
      { x: 4, y: 1, building: "belt", dir: 1 },
    ],
    blueprint: [
      { x: 8, y: 6, building: "miner", dir: 3 },
      { x: 7, y: 6, building: "smelter", dir: 3 },
      { x: 6, y: 6, building: "assembler", dir: 0 },
      { x: 6, y: 5, building: "belt", dir: 0 },
      { x: 6, y: 4, building: "belt", dir: 0 },
      { x: 6, y: 3, building: "belt", dir: 0 },
      { x: 6, y: 2, building: "belt", dir: 0 },
      { x: 6, y: 1, building: "belt", dir: 3 },
    ],
  },
  {
    id: "science-junction",
    name: {
      ko: "제7공구: 과학 팩 합류점",
      en: "Sector 7: Science Junction",
      ja: "第7工区：サイエンス合流点",
      zh: "第七工区：科技包汇流点",
      fr: "Secteur 7 : Jonction scientifique",
      es: "Sector 7: Cruce científico",
    },
    targetRp: 500,
    description: {
      ko: "철판은 위에서, 구리판은 아래에서 같은 조립기로 합류시켜 적색 과학 팩(65 RP)을 만드세요.",
      en: "Bring iron plates from above and copper plates from below into the same Assembler to make Red Science Packs (65 RP).",
      ja: "鉄板は上から、銅板は下から同じ組立機に合流させて赤サイエンスパック(65 RP)を作りましょう。",
      zh: "让铁板从上方、铜板从下方汇入同一台组装机，制造红色科技包(65 RP)。",
      fr: "Amenez le fer par le haut et le cuivre par le bas dans la même machine pour fabriquer des packs de science rouge (65 RP).",
      es: "Lleva el hierro desde arriba y el cobre desde abajo a la misma ensambladora para fabricar paquetes de ciencia roja (65 RP).",
    },
    labX: 8,
    labY: 4,
    resources: [
      { x: 1, y: 1, type: "iron_ore" },
      { x: 1, y: 0, type: "iron_ore" },
      { x: 1, y: 6, type: "copper_ore" },
      { x: 1, y: 7, type: "copper_ore" },
      { x: 7, y: 7, type: "coal" },
    ],
    starterBuildings: [
      { x: 1, y: 1, building: "miner", dir: 1 },
      { x: 2, y: 1, building: "smelter", dir: 1 },
      { x: 3, y: 1, building: "belt", dir: 1 },
      { x: 4, y: 1, building: "belt", dir: 2 },
      { x: 4, y: 2, building: "belt", dir: 2 },
      { x: 4, y: 3, building: "assembler", dir: 1 },
      { x: 5, y: 3, building: "belt", dir: 1 },
      { x: 6, y: 3, building: "belt", dir: 1 },
      { x: 7, y: 3, building: "belt", dir: 1 },
      { x: 8, y: 3, building: "belt", dir: 2 },
    ],
    blueprint: [
      { x: 1, y: 6, building: "miner", dir: 1 },
      { x: 2, y: 6, building: "smelter", dir: 1 },
      { x: 3, y: 6, building: "belt", dir: 1 },
      { x: 4, y: 6, building: "belt", dir: 0 },
      { x: 4, y: 5, building: "belt", dir: 0 },
      { x: 4, y: 4, building: "belt", dir: 0 },
    ],
  },
  {
    id: "twin-science",
    name: {
      ko: "제8공구: 쌍둥이 과학 라인",
      en: "Sector 8: Twin Science Lines",
      ja: "第8工区：ツインサイエンスライン",
      zh: "第八工区：双子科技产线",
      fr: "Secteur 8 : Lignes scientifiques jumelles",
      es: "Sector 8: Líneas científicas gemelas",
    },
    targetRp: 800,
    description: {
      ko: "과학 팩 라인 하나로는 느립니다. 아래쪽에 같은 구조의 두 번째 라인을 지어 연구 속도를 두 배로 올리세요.",
      en: "One science line is too slow. Build a second, identical line below to double the research rate.",
      ja: "サイエンスライン1本では遅すぎます。下に同じ構造の2本目を建てて研究速度を2倍にしましょう。",
      zh: "一条科技包产线太慢。在下方再建一条同样的产线，让研究速度翻倍。",
      fr: "Une seule ligne est trop lente. Construisez une seconde ligne identique en bas pour doubler la recherche.",
      es: "Una sola línea es demasiado lenta. Construye abajo una segunda línea idéntica para duplicar la investigación.",
    },
    labX: 8,
    labY: 4,
    resources: [
      { x: 1, y: 1, type: "iron_ore" },
      { x: 1, y: 3, type: "copper_ore" },
      { x: 1, y: 5, type: "iron_ore" },
      { x: 1, y: 7, type: "copper_ore" },
      { x: 0, y: 1, type: "iron_ore" },
      { x: 0, y: 7, type: "copper_ore" },
    ],
    starterBuildings: [
      { x: 1, y: 1, building: "miner", dir: 1 },
      { x: 2, y: 1, building: "smelter", dir: 1 },
      { x: 3, y: 1, building: "belt", dir: 1 },
      { x: 4, y: 1, building: "belt", dir: 2 },
      { x: 1, y: 3, building: "miner", dir: 1 },
      { x: 2, y: 3, building: "smelter", dir: 1 },
      { x: 3, y: 3, building: "belt", dir: 0 },
      { x: 3, y: 2, building: "belt", dir: 1 },
      { x: 4, y: 2, building: "assembler", dir: 1 },
      { x: 5, y: 2, building: "belt", dir: 1 },
      { x: 6, y: 2, building: "belt", dir: 1 },
      { x: 7, y: 2, building: "belt", dir: 1 },
      { x: 8, y: 2, building: "belt", dir: 2 },
      { x: 8, y: 3, building: "belt", dir: 2 },
    ],
    blueprint: [
      { x: 1, y: 5, building: "miner", dir: 1 },
      { x: 2, y: 5, building: "smelter", dir: 1 },
      { x: 3, y: 5, building: "belt", dir: 1 },
      { x: 4, y: 5, building: "belt", dir: 2 },
      { x: 1, y: 7, building: "miner", dir: 1 },
      { x: 2, y: 7, building: "smelter", dir: 1 },
      { x: 3, y: 7, building: "belt", dir: 0 },
      { x: 3, y: 6, building: "belt", dir: 1 },
      { x: 4, y: 6, building: "assembler", dir: 1 },
      { x: 5, y: 6, building: "belt", dir: 1 },
      { x: 6, y: 6, building: "belt", dir: 1 },
      { x: 7, y: 6, building: "belt", dir: 1 },
      { x: 8, y: 6, building: "belt", dir: 0 },
      { x: 8, y: 5, building: "belt", dir: 0 },
    ],
  },
  {
    id: "ore-delta",
    name: {
      ko: "제9공구: 네 갈래 광맥",
      en: "Sector 9: Ore Delta",
      ja: "第9工区：四方の鉱脈",
      zh: "第九工区：四方矿脉",
      fr: "Secteur 9 : Delta de minerai",
      es: "Sector 9: Delta de mineral",
    },
    targetRp: 900,
    description: {
      ko: "연구실이 한가운데 있습니다. 네 모서리의 광맥에서 금속판 라인 네 개를 연구실로 모으세요. 벨트는 서로 합류할 수 있습니다.",
      en: "The lab is in the middle. Bring four plate lines in from the veins in each corner. Belts can merge into each other.",
      ja: "研究所は中央にあります。四隅の鉱脈から金属板のラインを4本集めましょう。ベルトは合流できます。",
      zh: "研究中心在正中间。从四个角的矿脉拉四条金属板产线进来，传送带可以互相汇合。",
      fr: "Le labo est au centre. Amenez quatre lignes de plaques depuis les filons des quatre coins. Les tapis peuvent fusionner.",
      es: "El laboratorio está en el centro. Trae cuatro líneas de placas desde las vetas de cada esquina. Las cintas pueden unirse.",
    },
    labX: 5,
    labY: 3,
    resources: [
      { x: 1, y: 1, type: "iron_ore" },
      { x: 1, y: 6, type: "copper_ore" },
      { x: 8, y: 1, type: "iron_ore" },
      { x: 8, y: 6, type: "copper_ore" },
      { x: 0, y: 0, type: "coal" },
      { x: 9, y: 7, type: "coal" },
    ],
    starterBuildings: [
      { x: 1, y: 1, building: "miner", dir: 1 },
      { x: 2, y: 1, building: "smelter", dir: 1 },
      { x: 3, y: 1, building: "belt", dir: 1 },
      { x: 4, y: 1, building: "belt", dir: 1 },
      { x: 5, y: 1, building: "belt", dir: 2 },
      { x: 5, y: 2, building: "belt", dir: 2 },
      { x: 1, y: 6, building: "miner", dir: 1 },
      { x: 2, y: 6, building: "smelter", dir: 1 },
      { x: 3, y: 6, building: "belt", dir: 1 },
      { x: 4, y: 6, building: "belt", dir: 1 },
      { x: 5, y: 6, building: "belt", dir: 0 },
      { x: 5, y: 5, building: "belt", dir: 0 },
      { x: 5, y: 4, building: "belt", dir: 0 },
    ],
    blueprint: [
      { x: 8, y: 1, building: "miner", dir: 3 },
      { x: 7, y: 1, building: "smelter", dir: 3 },
      { x: 6, y: 1, building: "belt", dir: 2 },
      { x: 6, y: 2, building: "belt", dir: 2 },
      { x: 6, y: 3, building: "belt", dir: 3 },
      { x: 8, y: 6, building: "miner", dir: 3 },
      { x: 7, y: 6, building: "smelter", dir: 3 },
      { x: 6, y: 6, building: "belt", dir: 0 },
      { x: 6, y: 5, building: "belt", dir: 0 },
      { x: 6, y: 4, building: "belt", dir: 3 },
    ],
  },
  {
    id: "grand-lab",
    name: {
      ko: "제10공구: 그랜드 연구소",
      en: "Sector 10: Grand Laboratory",
      ja: "第10工区：グランド研究所",
      zh: "第十工区：宏伟研究所",
      fr: "Secteur 10 : Grand laboratoire",
      es: "Sector 10: Gran laboratorio",
    },
    targetRp: 1200,
    description: {
      ko: "마지막 공구입니다. 오른쪽에서 과학 팩 라인 두 개를 돌려 왼쪽 연구실로 1,200 RP를 채우세요.",
      en: "The final sector. Run two science lines from the right into the lab on the left and reach 1,200 RP.",
      ja: "最後の工区です。右側からサイエンスラインを2本回し、左の研究所で1,200 RPを達成しましょう。",
      zh: "最后一个工区。从右侧铺两条科技包产线送进左边的研究中心，达到 1,200 RP。",
      fr: "Le dernier secteur. Faites passer deux lignes scientifiques de la droite vers le labo de gauche et atteignez 1 200 RP.",
      es: "El último sector. Lleva dos líneas científicas desde la derecha al laboratorio de la izquierda y alcanza 1.200 RP.",
    },
    labX: 1,
    labY: 4,
    resources: [
      { x: 8, y: 1, type: "iron_ore" },
      { x: 8, y: 3, type: "copper_ore" },
      { x: 8, y: 5, type: "iron_ore" },
      { x: 8, y: 7, type: "copper_ore" },
      { x: 9, y: 1, type: "iron_ore" },
      { x: 9, y: 7, type: "copper_ore" },
    ],
    starterBuildings: [
      { x: 8, y: 1, building: "miner", dir: 3 },
      { x: 7, y: 1, building: "smelter", dir: 3 },
      { x: 6, y: 1, building: "belt", dir: 3 },
      { x: 5, y: 1, building: "belt", dir: 2 },
      { x: 8, y: 3, building: "miner", dir: 3 },
      { x: 7, y: 3, building: "smelter", dir: 3 },
      { x: 6, y: 3, building: "belt", dir: 0 },
      { x: 6, y: 2, building: "belt", dir: 3 },
      { x: 5, y: 2, building: "assembler", dir: 3 },
      { x: 4, y: 2, building: "belt", dir: 3 },
      { x: 3, y: 2, building: "belt", dir: 3 },
      { x: 2, y: 2, building: "belt", dir: 3 },
      { x: 1, y: 2, building: "belt", dir: 2 },
      { x: 1, y: 3, building: "belt", dir: 2 },
    ],
    blueprint: [
      { x: 8, y: 5, building: "miner", dir: 3 },
      { x: 7, y: 5, building: "smelter", dir: 3 },
      { x: 6, y: 5, building: "belt", dir: 3 },
      { x: 5, y: 5, building: "belt", dir: 2 },
      { x: 8, y: 7, building: "miner", dir: 3 },
      { x: 7, y: 7, building: "smelter", dir: 3 },
      { x: 6, y: 7, building: "belt", dir: 0 },
      { x: 6, y: 6, building: "belt", dir: 3 },
      { x: 5, y: 6, building: "assembler", dir: 3 },
      { x: 4, y: 6, building: "belt", dir: 3 },
      { x: 3, y: 6, building: "belt", dir: 3 },
      { x: 2, y: 6, building: "belt", dir: 3 },
      { x: 1, y: 6, building: "belt", dir: 0 },
      { x: 1, y: 5, building: "belt", dir: 0 },
    ],
  },
];

export function createFactorioState(stageIndex = 0): FactorioState {
  const safeIdx = Math.max(0, Math.min(STAGES.length - 1, stageIndex));
  const spec = STAGES[safeIdx];

  const cells: GridCell[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < GRID_W; x++) {
      row.push({
        x,
        y,
        resource: "none",
        building: "empty",
        dir: 1,
        item: null,
        bufferIron: 0,
        bufferCopper: 0,
        workTimer: 0,
      });
    }
    cells.push(row);
  }

  for (const r of spec.resources) {
    if (r.y >= 0 && r.y < GRID_H && r.x >= 0 && r.x < GRID_W) {
      cells[r.y][r.x].resource = r.type;
    }
  }

  for (const b of spec.starterBuildings) {
    if (b.y >= 0 && b.y < GRID_H && b.x >= 0 && b.x < GRID_W) {
      cells[b.y][b.x].building = b.building;
      cells[b.y][b.x].dir = b.dir;
    }
  }

  cells[spec.labY][spec.labX].building = "lab";
  cells[spec.labY][spec.labX].dir = 0;

  return {
    stageIndex: safeIdx,
    gridW: GRID_W,
    gridH: GRID_H,
    cells,
    rp: 0,
    targetRp: spec.targetRp,
    totalItemsDelivered: 0,
    deliveredCounts: {
      iron_ore: 0,
      copper_ore: 0,
      coal: 0,
      iron_plate: 0,
      copper_plate: 0,
      gear: 0,
      circuit: 0,
      science_pack: 0,
    },
    selectedTool: "belt",
    selectedDir: 1,
    isCleared: false,
    simSpeed: 1,
    nextItemId: 1,
    lastDeliveredItem: null,
    lastDeliveredTime: 0,
  };
}

export function placeBuilding(
  state: FactorioState,
  x: number,
  y: number,
  building?: BuildingType,
  dir?: Direction
): boolean {
  if (x < 0 || x >= state.gridW || y < 0 || y >= state.gridH) return false;
  const cell = state.cells[y][x];
  // Cannot overwrite the Research Lab
  if (cell.building === "lab") return false;

  const targetBuilding = building ?? state.selectedTool;
  const targetDir = dir ?? state.selectedDir;

  if (targetBuilding === "lab") return false;

  // If clicking same building on tile, rotate it
  if (building === undefined && cell.building === targetBuilding && targetBuilding !== "empty") {
    cell.dir = ((cell.dir + 1) % 4) as Direction;
    return true;
  }

  cell.building = targetBuilding;
  cell.dir = targetDir;
  if (targetBuilding === "empty") {
    cell.item = null;
    cell.bufferIron = 0;
    cell.bufferCopper = 0;
    cell.workTimer = 0;
  }
  return true;
}

export function rotateSelectedTool(state: FactorioState): Direction {
  state.selectedDir = ((state.selectedDir + 1) % 4) as Direction;
  return state.selectedDir;
}

/**
 * Applies an optimal full-automation blueprint layout for the current stage
 */
export function applyStageBlueprint(state: FactorioState): void {
  const spec = STAGES[state.stageIndex];
  if (!spec) return;

  if (spec.blueprint) {
    for (const b of spec.blueprint) placeBuilding(state, b.x, b.y, b.building, b.dir);
    return;
  }

  // Add second parallel production line depending on stage
  if (state.stageIndex === 0) {
    placeBuilding(state, 1, 5, "miner", 1);
    placeBuilding(state, 2, 5, "belt", 1);
    placeBuilding(state, 3, 5, "smelter", 1);
    placeBuilding(state, 4, 5, "belt", 1);
    placeBuilding(state, 5, 5, "belt", 1);
    placeBuilding(state, 6, 5, "belt", 1);
    placeBuilding(state, 7, 5, "belt", 1);
    placeBuilding(state, 8, 5, "belt", 0);
    placeBuilding(state, 8, 4, "belt", 0);
  } else if (state.stageIndex === 1) {
    placeBuilding(state, 1, 5, "miner", 1);
    placeBuilding(state, 2, 5, "smelter", 1);
    placeBuilding(state, 3, 5, "belt", 0);
  } else if (state.stageIndex === 2) {
    placeBuilding(state, 8, 2, "miner", 3);
    placeBuilding(state, 7, 2, "smelter", 3);
    placeBuilding(state, 6, 2, "belt", 2);
    placeBuilding(state, 8, 5, "miner", 3);
    placeBuilding(state, 7, 5, "smelter", 3);
    placeBuilding(state, 6, 5, "belt", 0);
    placeBuilding(state, 6, 4, "belt", 0);
    placeBuilding(state, 6, 3, "assembler", 3);
  }
}

function canAcceptItem(targetCell: GridCell, incomingType: ItemType): boolean {
  if (targetCell.building === "empty" || targetCell.building === "miner") return false;
  if (targetCell.building === "lab") return true;
  if (targetCell.building === "belt") {
    return targetCell.item === null;
  }
  if (targetCell.building === "smelter") {
    return (
      targetCell.item === null &&
      (incomingType === "iron_ore" || incomingType === "copper_ore")
    );
  }
  if (targetCell.building === "assembler") {
    if (targetCell.item !== null) return false;
    if (incomingType === "iron_plate" && targetCell.bufferIron < 2) return true;
    if (incomingType === "copper_plate" && targetCell.bufferCopper < 2) return true;
    return false;
  }
  return false;
}

function receiveItem(
  state: FactorioState,
  targetCell: GridCell,
  item: GridItem
): { deliveredItem: ItemType | null } {
  if (targetCell.building === "lab") {
    const rpGain = ITEM_RP_VALUES[item.type] ?? 5;
    state.rp += rpGain;
    state.totalItemsDelivered += 1;
    state.deliveredCounts[item.type] = (state.deliveredCounts[item.type] ?? 0) + 1;
    state.lastDeliveredItem = item.type;
    if (state.rp >= state.targetRp) {
      state.isCleared = true;
    }
    return { deliveredItem: item.type };
  }

  if (targetCell.building === "belt") {
    item.progress = 0;
    targetCell.item = item;
    return { deliveredItem: null };
  }

  if (targetCell.building === "smelter") {
    const smeltedType: ItemType =
      item.type === "iron_ore" ? "iron_plate" : "copper_plate";
    targetCell.item = {
      id: state.nextItemId++,
      type: smeltedType,
      progress: 0,
    };
    return { deliveredItem: null };
  }

  if (targetCell.building === "assembler") {
    if (item.type === "iron_plate") {
      targetCell.bufferIron += 1;
    } else if (item.type === "copper_plate") {
      targetCell.bufferCopper += 1;
    }
    return { deliveredItem: null };
  }

  return { deliveredItem: null };
}

export function stepFactorio(
  state: FactorioState,
  dtSeconds: number
): { deliveredItems: ItemType[]; craftedCount: number } {
  if (state.isCleared) return { deliveredItems: [], craftedCount: 0 };

  const dt = dtSeconds * state.simSpeed;
  const deliveredItems: ItemType[] = [];
  let craftedCount = 0;

  // Pass 1: Advance items on belts, smelters, and assemblers
  for (let y = 0; y < state.gridH; y++) {
    for (let x = 0; x < state.gridW; x++) {
      const cell = state.cells[y][x];

      // Assembler crafting check
      if (cell.building === "assembler" && cell.item === null) {
        if (cell.bufferIron >= 1 && cell.bufferCopper >= 1) {
          cell.workTimer += dt;
          if (cell.workTimer >= 0.75) {
            cell.workTimer = 0;
            cell.bufferIron -= 1;
            cell.bufferCopper -= 1;
            cell.item = {
              id: state.nextItemId++,
              type: "science_pack",
              progress: 0.5,
            };
            craftedCount++;
          }
        } else if (cell.bufferIron >= 1) {
          cell.workTimer += dt;
          if (cell.workTimer >= 0.95) {
            cell.workTimer = 0;
            cell.bufferIron -= 1;
            cell.item = {
              id: state.nextItemId++,
              type: "gear",
              progress: 0.5,
            };
            craftedCount++;
          }
        } else if (cell.bufferCopper >= 1) {
          cell.workTimer += dt;
          if (cell.workTimer >= 0.95) {
            cell.workTimer = 0;
            cell.bufferCopper -= 1;
            cell.item = {
              id: state.nextItemId++,
              type: "circuit",
              progress: 0.5,
            };
            craftedCount++;
          }
        }
      }

      // Miner extraction
      if (cell.building === "miner" && cell.resource !== "none") {
        cell.workTimer += dt;
        if (cell.workTimer >= 1.1) {
          const vec = DIR_VECTORS[cell.dir];
          const nx = cell.x + vec.dx;
          const ny = cell.y + vec.dy;
          if (nx >= 0 && nx < state.gridW && ny >= 0 && ny < state.gridH) {
            const nextCell = state.cells[ny][nx];
            const oreType = cell.resource as ItemType;
            if (canAcceptItem(nextCell, oreType)) {
              cell.workTimer = 0;
              const res = receiveItem(state, nextCell, {
                id: state.nextItemId++,
                type: oreType,
                progress: 0,
              });
              if (res.deliveredItem) deliveredItems.push(res.deliveredItem);
            }
          }
        }
      }
    }
  }

  // Pass 2: Move existing items forward along their cell's facing direction
  for (let y = 0; y < state.gridH; y++) {
    for (let x = 0; x < state.gridW; x++) {
      const cell = state.cells[y][x];
      if (!cell.item) continue;

      const speed = cell.building === "belt" ? 2.2 : 1.3;
      cell.item.progress = Math.min(1, cell.item.progress + dt * speed);

      if (cell.item.progress >= 1) {
        const vec = DIR_VECTORS[cell.dir];
        const nx = cell.x + vec.dx;
        const ny = cell.y + vec.dy;
        if (nx >= 0 && nx < state.gridW && ny >= 0 && ny < state.gridH) {
          const nextCell = state.cells[ny][nx];
          if (canAcceptItem(nextCell, cell.item.type)) {
            const movingItem = cell.item;
            cell.item = null;
            const res = receiveItem(state, nextCell, movingItem);
            if (res.deliveredItem) deliveredItems.push(res.deliveredItem);
          }
        }
      }
    }
  }

  return { deliveredItems, craftedCount };
}
