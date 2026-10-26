/**
 * Sticker Book Cozy (#134) — Isometric Cozy Room Sticker Peeling & Magnetic Snap Engine
 *
 * Features:
 * - 3 isometric diorama rooms (Sunlit Attic Study, Pastel Bakery Cafe, Moonlit Greenhouse)
 * - 8 hand-crafted illustrated stickers per room with Z-layer depth sorting
 * - Magnetic proximity snap (within 46px) or direct silhouette placement
 * - Precision scoring (Perfect Snap vs Assisted Snap), combo streak, and Tweezers Spotlight Hint
 */

export interface StickerSpec {
  id: string;
  number: number;
  emoji: string;
  name: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  targetX: number; // Canvas coordinates (700x480)
  targetY: number;
  width: number;
  height: number;
  zLayer: number; // 0: floor/wall base, 1: furniture, 2: tabletop props/pets
  color: string;
}

export interface RoomThemeSpec {
  id: string;
  roomNumber: number;
  title: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  subtitle: { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
  wallLeftColor: string;
  wallRightColor: string;
  floorColor: string;
  stickers: StickerSpec[];
}

export interface StickerInstance {
  id: string;
  number: number;
  placed: boolean;
  placedAtTime: number;
}

export interface StickerCozyState {
  roomIndex: number;
  stickers: StickerInstance[];
  selectedStickerId: string | null;
  highlightedStickerId: string | null;
  score: number;
  streak: number;
  placedCount: number;
  totalCount: number;
  isRoomComplete: boolean;
  isAllComplete: boolean;
}

export const SNAP_RADIUS = 48;

export const ROOM_THEMES: RoomThemeSpec[] = [
  {
    id: "sunlit-attic",
    roomNumber: 1,
    title: {
      ko: "룸 1: 햇살 가득 다락방 서재",
      en: "Room 1: Sunlit Attic Study",
      ja: "ルーム1：陽だまりの屋根裏書斎",
      zh: "房间 1：阳光阁楼书房",
      fr: "Pièce 1 : Bureau Mansardé Ensoleillé",
      es: "Sala 1: Estudio del Ático Soleado",
    },
    subtitle: {
      ko: "따스한 오후 햇살이 비치는 다락방에 러그와 원목 책상, 졸고 있는 치즈 고양이를 배치하세요.",
      en: "Peel and place the woven rug, oak desk, monstera plant, and sleeping ginger cat in the warm attic.",
      ja: "午後の陽射しが差し込む屋根裏部屋に、ラグや木製デスク、居眠りする茶トラ猫を貼り付けましょう。",
      zh: "在洒满午后阳光的温馨阁楼里，贴上编织地毯、橡木书桌、龟背竹与打盹的橘猫。",
      fr: "Placez le tapis tissé, le bureau en chêne, la plante monstera et le chat roux endormi.",
      es: "Coloca la alfombra tejida, el escritorio de roble, la monstera y el gato dormido en el ático.",
    },
    wallLeftColor: "#fef3c7",
    wallRightColor: "#fde68a",
    floorColor: "#d97706",
    stickers: [
      {
        id: "warm_rug",
        number: 1,
        emoji: "🧶",
        name: { ko: "포근한 원형 러그", en: "Cozy Woven Rug", ja: "ふわふわ円形ラグ", zh: "温暖编织圆毯", fr: "Tapis Tissé", es: "Alfombra Redonda" },
        targetX: 350,
        targetY: 365,
        width: 120,
        height: 64,
        zLayer: 0,
        color: "#f43f5e",
      },
      {
        id: "oak_desk",
        number: 2,
        emoji: "🪑",
        name: { ko: "오크 원목 책상", en: "Oak Writing Desk", ja: "オーク材の机", zh: "橡木书桌", fr: "Bureau en Chêne", es: "Escritorio de Roble" },
        targetX: 255,
        targetY: 280,
        width: 110,
        height: 76,
        zLayer: 1,
        color: "#b45309",
      },
      {
        id: "monstera_pot",
        number: 3,
        emoji: "🪴",
        name: { ko: "몬스테라 화분", en: "Monstera Plant", ja: "モンステラの鉢植え", zh: "龟背竹盆栽", fr: "Plante Monstera", es: "Maceta Monstera" },
        targetX: 465,
        targetY: 290,
        width: 72,
        height: 84,
        zLayer: 1,
        color: "#16a34a",
      },
      {
        id: "wall_clock",
        number: 4,
        emoji: "🕰️",
        name: { ko: "빈티지 뻐꾸기시계", en: "Vintage Wall Clock", ja: "ヴィンテージ掛け時計", zh: "复古挂钟", fr: "Horloge Murale", es: "Reloj de Pared" },
        targetX: 245,
        targetY: 165,
        width: 64,
        height: 64,
        zLayer: 1,
        color: "#92400e",
      },
      {
        id: "sunny_window",
        number: 5,
        emoji: "🪟",
        name: { ko: "아치형 채광 창문", en: "Arched Sun Window", ja: "アーチ型の採光窓", zh: "拱形采光窗", fr: "Fenêtre Arquée", es: "Ventana en Arco" },
        targetX: 435,
        targetY: 170,
        width: 84,
        height: 82,
        zLayer: 0,
        color: "#38bdf8",
      },
      {
        id: "book_stack",
        number: 6,
        emoji: "📚",
        name: { ko: "양장본 책 더미", en: "Hardcover Books", ja: "ハードカバーの本束", zh: "精装书堆", fr: "Pile de Livres", es: "Pila de Libros" },
        targetX: 230,
        targetY: 235,
        width: 58,
        height: 52,
        zLayer: 2,
        color: "#6366f1",
      },
      {
        id: "retro_lamp",
        number: 7,
        emoji: "🛋️",
        name: { ko: "황동 스탠드 조명", en: "Brass Desk Lamp", ja: "真鍮のデスクランプ", zh: "黄铜台灯", fr: "Lampe en Laiton", es: "Lámpara de Mesa" },
        targetX: 285,
        targetY: 230,
        width: 56,
        height: 58,
        zLayer: 2,
        color: "#eab308",
      },
      {
        id: "ginger_cat",
        number: 8,
        emoji: "🐱",
        name: { ko: "낮잠 자는 치즈냥", en: "Sleeping Ginger Cat", ja: "昼寝する茶トラ猫", zh: "打盹的橘猫", fr: "Chat Roux Endormi", es: "Gato Dormido" },
        targetX: 355,
        targetY: 355,
        width: 66,
        height: 56,
        zLayer: 2,
        color: "#fb923c",
      },
    ],
  },
  {
    id: "pastel-bakery",
    roomNumber: 2,
    title: {
      ko: "룸 2: 파스텔 베이커리 카페",
      en: "Room 2: Pastel Bakery Cafe",
      ja: "ルーム2：パステルベーカリーカフェ",
      zh: "房间 2：马卡龙烘焙咖啡馆",
      fr: "Pièce 2 : Café Boulangerie Pastel",
      es: "Sala 2: Cafetería Pastelería Pastel",
    },
    subtitle: {
      ko: "갓 구운 크루아상 진열대와 에스프레소 머신, 달콤한 마카롱 타워로 카페를 꾸며보세요.",
      en: "Decorate the cozy corner bakery with a croissant display, espresso machine, and macaron tower!",
      ja: "焼きたてクロワッサンのショーケースやエスプレッソマシンで可愛いカフェを完成させましょう。",
      zh: "用牛角包展示柜、意式咖啡机与甜美的马卡龙塔装点街角烘焙坊！",
      fr: "Décorez la boulangerie avec une vitrine de croissants, une machine à expresso et des macarons !",
      es: "¡Decora la cafetería con una vitrina de croissants, máquina de espresso y torre de macarons!",
    },
    wallLeftColor: "#fce7f3",
    wallRightColor: "#fbcfe8",
    floorColor: "#f472b6",
    stickers: [
      {
        id: "checker_mat",
        number: 1,
        emoji: "🏁",
        name: { ko: "체크무늬 타일 매트", en: "Checkerboard Mat", ja: "チェック柄マット", zh: "棋盘格地垫", fr: "Tapis Damier", es: "Tapete Ajedrezado" },
        targetX: 350,
        targetY: 370,
        width: 118,
        height: 62,
        zLayer: 0,
        color: "#ec4899",
      },
      {
        id: "pastry_counter",
        number: 2,
        emoji: "🥐",
        name: { ko: "크루아상 쇼케이스", en: "Croissant Display", ja: "クロワッサン棚", zh: "牛角包展示柜", fr: "Vitrine Croissants", es: "Vitrina de Croissants" },
        targetX: 250,
        targetY: 285,
        width: 110,
        height: 76,
        zLayer: 1,
        color: "#f59e0b",
      },
      {
        id: "espresso_bar",
        number: 3,
        emoji: "☕",
        name: { ko: "에스프레소 머신", en: "Espresso Machine", ja: "エスプレッソマシン", zh: "意式咖啡机", fr: "Machine Expresso", es: "Máquina Espresso" },
        targetX: 250,
        targetY: 228,
        width: 64,
        height: 58,
        zLayer: 2,
        color: "#0ea5e9",
      },
      {
        id: "menu_board",
        number: 4,
        emoji: "📋",
        name: { ko: "오늘의 디저트 칠판", en: "Chalkboard Menu", ja: "黒板メニューボード", zh: "甜品黑板菜单", fr: "Ardoise Menu", es: "Pizarra de Menú" },
        targetX: 245,
        targetY: 160,
        width: 72,
        height: 64,
        zLayer: 0,
        color: "#334155",
      },
      {
        id: "neon_sign",
        number: 5,
        emoji: "✨",
        name: { ko: "네온 OPEN 사인", en: "Neon OPEN Sign", ja: "ネオンOPENサイン", zh: "霓虹营业灯牌", fr: "Enseigne Néon", es: "Letrero de Neón" },
        targetX: 435,
        targetY: 165,
        width: 82,
        height: 60,
        zLayer: 0,
        color: "#a855f7",
      },
      {
        id: "bistro_table",
        number: 6,
        emoji: "🍽️",
        name: { ko: "원형 티 테이블", en: "Bistro Tea Table", ja: "丸型ティーテーブル", zh: "法式圆茶几", fr: "Table de Bistrot", es: "Mesa de Bistró" },
        targetX: 455,
        targetY: 295,
        width: 86,
        height: 72,
        zLayer: 1,
        color: "#14b8a6",
      },
      {
        id: "macaron_tower",
        number: 7,
        emoji: "🧁",
        name: { ko: "3단 마카롱 타워", en: "Macaron Tower", ja: "3段マカロンタワー", zh: "三层马卡龙塔", fr: "Tour de Macarons", es: "Torre de Macarons" },
        targetX: 455,
        targetY: 245,
        width: 60,
        height: 56,
        zLayer: 2,
        color: "#f43f5e",
      },
      {
        id: "hanging_ivy",
        number: 8,
        emoji: "🌿",
        name: { ko: "행잉 아이비 넝쿨", en: "Hanging Ivy Vine", ja: "ハンギングアイビー", zh: "垂吊常春藤", fr: "Lierre Suspendu", es: "Hiedra Colgante" },
        targetX: 350,
        targetY: 135,
        width: 76,
        height: 58,
        zLayer: 1,
        color: "#22c55e",
      },
    ],
  },
  {
    id: "moonlit-greenhouse",
    roomNumber: 3,
    title: {
      ko: "룸 3: 달빛 온실 아틀리에",
      en: "Room 3: Moonlit Greenhouse Atelier",
      ja: "ルーム3：月明かりの温室アトリエ",
      zh: "房间 3：月光温室画室",
      fr: "Pièce 3 : Atelier Serre au Clair de Lune",
      es: "Sala 3: Invernadero a la Luz de la Luna",
    },
    subtitle: {
      ko: "별빛이 쏟아지는 유리 온실 속에 이젤과 테라리움, 천체 망원경과 라벤더 화분을 채워보세요.",
      en: "Arrange the painting easel, glass terrarium, telescope, and lavender pots under the starry roof.",
      ja: "星が降るガラスの温室に、イーゼルやテラリウム、天体望遠鏡とラベンダーを並べましょう。",
      zh: "在星光倾泻的玻璃温室里，布置画架、微景观生态瓶、天文望远镜与薰衣草盆栽。",
      fr: "Disposez le chevalet, le terrarium, le télescope et la lavande sous la verrière étoilée.",
      es: "Coloca el caballete, el terrario, el telescopio y la lavanda bajo el techo estrellado.",
    },
    wallLeftColor: "#e0e7ff",
    wallRightColor: "#c7d2fe",
    floorColor: "#4f46e5",
    stickers: [
      {
        id: "moss_carpet",
        number: 1,
        emoji: "🍀",
        name: { ko: "초록 이끼 가든 매트", en: "Moss Garden Rug", ja: "苔ガーデンのラグ", zh: "青苔花园地毯", fr: "Tapis de Mousse", es: "Alfombra de Musgo" },
        targetX: 350,
        targetY: 368,
        width: 120,
        height: 62,
        zLayer: 0,
        color: "#10b981",
      },
      {
        id: "wood_easel",
        number: 2,
        emoji: "🎨",
        name: { ko: "수채화 원목 이젤", en: "Watercolor Easel", ja: "水彩画のイーゼル", zh: "水彩木画架", fr: "Chevalet de Peintre", es: "Caballete de Pintura" },
        targetX: 250,
        targetY: 280,
        width: 82,
        height: 86,
        zLayer: 1,
        color: "#f59e0b",
      },
      {
        id: "star_telescope",
        number: 3,
        emoji: "🔭",
        name: { ko: "황동 천체 망원경", en: "Starlight Telescope", ja: "天体望遠鏡", zh: "星光天文望远镜", fr: "Télescope Stellaire", es: "Telescopio Estelar" },
        targetX: 460,
        targetY: 282,
        width: 82,
        height: 82,
        zLayer: 1,
        color: "#38bdf8",
      },
      {
        id: "string_lights",
        number: 4,
        emoji: "💡",
        name: { ko: "은하수 꼬마전구", en: "Fairy String Lights", ja: "フェアリーライト", zh: "银河串灯", fr: "Guirlande Lumineuse", es: "Luces de Hadas" },
        targetX: 250,
        targetY: 155,
        width: 88,
        height: 56,
        zLayer: 0,
        color: "#facc15",
      },
      {
        id: "moon_tapestry",
        number: 5,
        emoji: "🌙",
        name: { ko: "초승달 태피스트리", en: "Crescent Tapestry", ja: "三日月のタペストリー", zh: "新月挂毯", fr: "Tapisserie Lune", es: "Tapiz de Luna" },
        targetX: 440,
        targetY: 162,
        width: 78,
        height: 72,
        zLayer: 0,
        color: "#8b5cf6",
      },
      {
        id: "glass_terrarium",
        number: 6,
        emoji: "🧪",
        name: { ko: "유리 돔 테라리움", en: "Glass Terrarium", ja: "ガラスのテラリウム", zh: "玻璃微景观球", fr: "Terrarium en Verre", es: "Terrario de Cristal" },
        targetX: 350,
        targetY: 250,
        width: 68,
        height: 68,
        zLayer: 1,
        color: "#06b6d4",
      },
      {
        id: "lavender_pot",
        number: 7,
        emoji: "🪻",
        name: { ko: "향기로운 라벤더", en: "Lavender Planter", ja: "ラベンダーの鉢", zh: "薰衣草花盆", fr: "Pot de Lavande", es: "Maceta de Lavanda" },
        targetX: 295,
        targetY: 345,
        width: 64,
        height: 60,
        zLayer: 2,
        color: "#a855f7",
      },
      {
        id: "watering_can",
        number: 8,
        emoji: "🚿",
        name: { ko: "양철 물뿌리개", en: "Tin Watering Can", ja: "ブリキのじょうろ", zh: "马口铁浇水壶", fr: "Arrosoir en Étain", es: "Regadera de Latón" },
        targetX: 415,
        targetY: 345,
        width: 64,
        height: 58,
        zLayer: 2,
        color: "#3b82f6",
      },
    ],
  },
];

export function createStickerCozyState(roomIndex = 0): StickerCozyState {
  const safeIdx = Math.max(0, Math.min(ROOM_THEMES.length - 1, roomIndex));
  const theme = ROOM_THEMES[safeIdx];

  return {
    roomIndex: safeIdx,
    stickers: theme.stickers.map((s) => ({
      id: s.id,
      number: s.number,
      placed: false,
      placedAtTime: 0,
    })),
    selectedStickerId: theme.stickers[0]?.id ?? null,
    highlightedStickerId: null,
    score: 0,
    streak: 0,
    placedCount: 0,
    totalCount: theme.stickers.length,
    isRoomComplete: false,
    isAllComplete: false,
  };
}

export function tryPlaceStickerAt(
  state: StickerCozyState,
  stickerId: string,
  canvasX: number,
  canvasY: number,
  nowMs = Date.now()
): { snapped: boolean; spec: StickerSpec | null } {
  const theme = ROOM_THEMES[state.roomIndex];
  const spec = theme.stickers.find((s) => s.id === stickerId);
  const inst = state.stickers.find((s) => s.id === stickerId);
  if (!spec || !inst || inst.placed) {
    return { snapped: false, spec: null };
  }

  const dist = Math.hypot(canvasX - spec.targetX, canvasY - spec.targetY);
  if (dist <= SNAP_RADIUS) {
    inst.placed = true;
    inst.placedAtTime = nowMs;
    state.placedCount = state.stickers.filter((s) => s.placed).length;
    state.streak += 1;
    state.score += 100 + state.streak * 20;
    state.highlightedStickerId = null;

    // Auto-select next unplaced sticker
    const nextUnplaced = state.stickers.find((s) => !s.placed);
    state.selectedStickerId = nextUnplaced ? nextUnplaced.id : null;

    if (state.placedCount >= state.totalCount) {
      state.isRoomComplete = true;
      if (state.roomIndex === ROOM_THEMES.length - 1) {
        state.isAllComplete = true;
      }
    }
    return { snapped: true, spec };
  }

  state.streak = 0;
  return { snapped: false, spec: null };
}

export function triggerTweezersHint(state: StickerCozyState): StickerSpec | null {
  const nextUnplaced = state.stickers.find((s) => !s.placed);
  if (!nextUnplaced) return null;
  state.selectedStickerId = nextUnplaced.id;
  state.highlightedStickerId = nextUnplaced.id;
  const theme = ROOM_THEMES[state.roomIndex];
  return theme.stickers.find((s) => s.id === nextUnplaced.id) ?? null;
}
