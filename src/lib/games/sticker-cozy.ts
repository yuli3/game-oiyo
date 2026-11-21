/**
 * Sticker Book Cozy (#134) — Isometric Cozy Room Sticker Peeling & Magnetic Snap Engine
 *
 * Features:
 * - 10 isometric diorama rooms (attic, bakery, greenhouse, library, seaside, lodge, playroom, studio, kitchen, veranda)
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
  // --- rooms 4-10 (stage range 2026-11-21), laid out on the slots of rooms 1-3 ---
  {
    id: "rainy-library",
    roomNumber: 4,
    title: { ko: "룸 4: 빗소리 도서관", en: "Room 4: Rainy Day Library", ja: "ルーム4：雨音の図書館", zh: "房间 4：雨声图书馆", fr: "Pièce 4 : Bibliothèque sous la pluie", es: "Sala 4: Biblioteca en día de lluvia" },
    subtitle: { ko: "창밖으로 비가 내리는 작은 도서관에 책장과 독서 의자, 따뜻한 차를 놓아 주세요.", en: "Set up bookshelves, a reading chair, and a warm cup of tea in a small library while rain falls outside.", ja: "窓の外に雨が降る小さな図書館に、本棚と読書椅子、温かいお茶を置きましょう。", zh: "窗外下着雨的小图书馆里，摆上书架、阅读椅和一杯热茶。", fr: "Installez étagères, fauteuil de lecture et thé chaud dans une petite bibliothèque pendant qu'il pleut.", es: "Coloca estanterías, un sillón de lectura y un té caliente en una pequeña biblioteca mientras llueve." },
    wallLeftColor: "#e2e8f0",
    wallRightColor: "#cbd5e1",
    floorColor: "#64748b",
    stickers: [
      { id: "reading_rug", number: 1, emoji: "🟫", name: { ko: "체크무늬 러그", en: "Plaid Rug", ja: "チェック柄ラグ", zh: "格纹地毯", fr: "Tapis écossais", es: "Alfombra de cuadros" }, targetX: 350, targetY: 365, width: 120, height: 64, zLayer: 0, color: "#a16207" },
      { id: "reading_chair", number: 2, emoji: "🛋️", name: { ko: "푹신한 독서 의자", en: "Cozy Reading Chair", ja: "ふかふかの読書椅子", zh: "舒适阅读椅", fr: "Fauteuil de lecture", es: "Sillón de lectura" }, targetX: 255, targetY: 280, width: 110, height: 76, zLayer: 1, color: "#7c2d12" },
      { id: "tall_shelf", number: 3, emoji: "📚", name: { ko: "키 큰 책장", en: "Tall Bookshelf", ja: "背の高い本棚", zh: "高书架", fr: "Grande bibliothèque", es: "Estantería alta" }, targetX: 465, targetY: 290, width: 72, height: 84, zLayer: 1, color: "#92400e" },
      { id: "rain_window", number: 4, emoji: "🌧️", name: { ko: "빗방울 맺힌 창", en: "Rainy Window", ja: "雨粒の窓", zh: "挂满雨滴的窗", fr: "Fenêtre pluvieuse", es: "Ventana con lluvia" }, targetX: 245, targetY: 165, width: 64, height: 64, zLayer: 1, color: "#60a5fa" },
      { id: "globe", number: 5, emoji: "🌍", name: { ko: "낡은 지구본", en: "Old Globe", ja: "古い地球儀", zh: "旧地球仪", fr: "Vieux globe", es: "Globo antiguo" }, targetX: 435, targetY: 170, width: 84, height: 82, zLayer: 0, color: "#0ea5e9" },
      { id: "tea_cup", number: 6, emoji: "🍵", name: { ko: "따뜻한 녹차", en: "Warm Green Tea", ja: "温かい緑茶", zh: "热绿茶", fr: "Thé vert chaud", es: "Té verde caliente" }, targetX: 230, targetY: 235, width: 58, height: 52, zLayer: 2, color: "#16a34a" },
      { id: "candle", number: 7, emoji: "🕯️", name: { ko: "작은 촛불", en: "Little Candle", ja: "小さなろうそく", zh: "小蜡烛", fr: "Petite bougie", es: "Velita" }, targetX: 285, targetY: 230, width: 56, height: 58, zLayer: 2, color: "#facc15" },
      { id: "reading_dog", number: 8, emoji: "🐶", name: { ko: "졸린 강아지", en: "Sleepy Puppy", ja: "眠そうな子犬", zh: "困倦的小狗", fr: "Chiot endormi", es: "Cachorro dormilón" }, targetX: 355, targetY: 355, width: 66, height: 56, zLayer: 2, color: "#d6d3d1" },
    ],
  },
  {
    id: "seaside-cabin",
    roomNumber: 5,
    title: { ko: "룸 5: 바닷가 오두막", en: "Room 5: Seaside Cabin", ja: "ルーム5：海辺の小屋", zh: "房间 5：海边小屋", fr: "Pièce 5 : Cabane en bord de mer", es: "Sala 5: Cabaña junto al mar" },
    subtitle: { ko: "파도 소리가 들리는 오두막에 조개 장식과 돛단배 모형, 해먹을 걸어 주세요.", en: "Decorate a cabin by the waves with shells, a model sailboat, and a hammock.", ja: "波の音が聞こえる小屋に、貝殻の飾りと帆船の模型、ハンモックを飾りましょう。", zh: "在听得见海浪声的小屋里，摆上贝壳装饰、帆船模型，再挂上吊床。", fr: "Décorez une cabane au bord des vagues avec des coquillages, un voilier miniature et un hamac.", es: "Decora una cabaña junto a las olas con conchas, un velero en miniatura y una hamaca." },
    wallLeftColor: "#e0f2fe",
    wallRightColor: "#bae6fd",
    floorColor: "#0284c7",
    stickers: [
      { id: "sand_mat", number: 1, emoji: "🏖️", name: { ko: "모래빛 매트", en: "Sandy Mat", ja: "砂色のマット", zh: "沙色地垫", fr: "Tapis couleur sable", es: "Alfombra de arena" }, targetX: 350, targetY: 370, width: 118, height: 62, zLayer: 0, color: "#fbbf24" },
      { id: "driftwood_table", number: 2, emoji: "🪵", name: { ko: "유목 테이블", en: "Driftwood Table", ja: "流木のテーブル", zh: "漂流木桌", fr: "Table en bois flotté", es: "Mesa de madera flotante" }, targetX: 250, targetY: 285, width: 110, height: 76, zLayer: 1, color: "#a8a29e" },
      { id: "seashell", number: 3, emoji: "🐚", name: { ko: "분홍 소라껍데기", en: "Pink Seashell", ja: "ピンクの巻き貝", zh: "粉色海螺", fr: "Coquillage rose", es: "Caracola rosa" }, targetX: 250, targetY: 228, width: 64, height: 58, zLayer: 2, color: "#f9a8d4" },
      { id: "tide_chart", number: 4, emoji: "🗺️", name: { ko: "물때 지도", en: "Tide Map", ja: "潮見の地図", zh: "潮汐图", fr: "Carte des marées", es: "Mapa de mareas" }, targetX: 245, targetY: 160, width: 72, height: 64, zLayer: 0, color: "#fde68a" },
      { id: "porthole", number: 5, emoji: "⚓", name: { ko: "닻 장식", en: "Anchor Plaque", ja: "錨の飾り", zh: "船锚装饰", fr: "Plaque d'ancre", es: "Placa de ancla" }, targetX: 435, targetY: 165, width: 82, height: 60, zLayer: 0, color: "#1e3a8a" },
      { id: "hammock", number: 6, emoji: "🛏️", name: { ko: "줄무늬 해먹", en: "Striped Hammock", ja: "ストライプのハンモック", zh: "条纹吊床", fr: "Hamac rayé", es: "Hamaca de rayas" }, targetX: 455, targetY: 295, width: 86, height: 72, zLayer: 1, color: "#ef4444" },
      { id: "sailboat", number: 7, emoji: "⛵", name: { ko: "돛단배 모형", en: "Model Sailboat", ja: "帆船の模型", zh: "帆船模型", fr: "Voilier miniature", es: "Velero en miniatura" }, targetX: 455, targetY: 245, width: 60, height: 56, zLayer: 2, color: "#f8fafc" },
      { id: "crab", number: 8, emoji: "🦀", name: { ko: "꼬마 게", en: "Little Crab", ja: "小さなカニ", zh: "小螃蟹", fr: "Petit crabe", es: "Cangrejito" }, targetX: 350, targetY: 135, width: 76, height: 58, zLayer: 1, color: "#dc2626" },
    ],
  },
  {
    id: "snowy-lodge",
    roomNumber: 6,
    title: { ko: "룸 6: 눈 내린 산장", en: "Room 6: Snowy Mountain Lodge", ja: "ルーム6：雪の山小屋", zh: "房间 6：雪中山屋", fr: "Pièce 6 : Chalet sous la neige", es: "Sala 6: Refugio nevado" },
    subtitle: { ko: "눈이 소복이 쌓인 산장에 벽난로와 털모자, 코코아를 준비해 주세요.", en: "Get the snowed-in lodge ready with a fireplace, a wool hat, and hot cocoa.", ja: "雪の積もった山小屋に、暖炉と毛糸の帽子、ココアを用意しましょう。", zh: "在积满雪的山屋里，备好壁炉、毛线帽和热可可。", fr: "Préparez le chalet enneigé avec une cheminée, un bonnet et un chocolat chaud.", es: "Prepara el refugio nevado con chimenea, gorro de lana y chocolate caliente." },
    wallLeftColor: "#f1f5f9",
    wallRightColor: "#e2e8f0",
    floorColor: "#475569",
    stickers: [
      { id: "fur_rug", number: 1, emoji: "🐻‍❄️", name: { ko: "하얀 털 러그", en: "White Fur Rug", ja: "白いファーラグ", zh: "白色毛毯", fr: "Tapis en fourrure blanche", es: "Alfombra de pelo blanco" }, targetX: 350, targetY: 368, width: 120, height: 62, zLayer: 0, color: "#e5e7eb" },
      { id: "fireplace", number: 2, emoji: "🔥", name: { ko: "타닥이는 벽난로", en: "Crackling Fireplace", ja: "パチパチ暖炉", zh: "噼啪作响的壁炉", fr: "Cheminée crépitante", es: "Chimenea crepitante" }, targetX: 250, targetY: 280, width: 82, height: 86, zLayer: 1, color: "#ea580c" },
      { id: "ski_set", number: 3, emoji: "🎿", name: { ko: "스키 한 쌍", en: "Pair of Skis", ja: "スキー板", zh: "一副滑雪板", fr: "Paire de skis", es: "Par de esquís" }, targetX: 460, targetY: 282, width: 82, height: 82, zLayer: 1, color: "#2563eb" },
      { id: "snow_window", number: 4, emoji: "❄️", name: { ko: "눈꽃 창문", en: "Snowflake Window", ja: "雪の結晶の窓", zh: "雪花窗", fr: "Fenêtre givrée", es: "Ventana nevada" }, targetX: 250, targetY: 155, width: 88, height: 56, zLayer: 0, color: "#bae6fd" },
      { id: "mountain_photo", number: 5, emoji: "🏔️", name: { ko: "설산 사진", en: "Mountain Photo", ja: "雪山の写真", zh: "雪山照片", fr: "Photo de montagne", es: "Foto de montaña" }, targetX: 440, targetY: 162, width: 78, height: 72, zLayer: 0, color: "#64748b" },
      { id: "cocoa", number: 6, emoji: "☕", name: { ko: "마시멜로 코코아", en: "Marshmallow Cocoa", ja: "マシュマロココア", zh: "棉花糖可可", fr: "Cacao à la guimauve", es: "Cacao con malvaviscos" }, targetX: 350, targetY: 250, width: 68, height: 68, zLayer: 1, color: "#78350f" },
      { id: "wool_hat", number: 7, emoji: "🧢", name: { ko: "방울 털모자", en: "Pom-pom Hat", ja: "ポンポン帽子", zh: "绒球毛线帽", fr: "Bonnet à pompon", es: "Gorro con pompón" }, targetX: 295, targetY: 345, width: 64, height: 60, zLayer: 2, color: "#be123c" },
      { id: "snow_owl", number: 8, emoji: "🦉", name: { ko: "흰올빼미 인형", en: "Snowy Owl Plush", ja: "シロフクロウのぬいぐるみ", zh: "雪鸮玩偶", fr: "Peluche harfang", es: "Peluche de búho nival" }, targetX: 415, targetY: 345, width: 64, height: 58, zLayer: 2, color: "#f8fafc" },
    ],
  },
  {
    id: "kids-playroom",
    roomNumber: 7,
    title: { ko: "룸 7: 아이 놀이방", en: "Room 7: Kids' Playroom", ja: "ルーム7：子ども部屋", zh: "房间 7：儿童游戏室", fr: "Pièce 7 : Salle de jeux", es: "Sala 7: Cuarto de juegos" },
    subtitle: { ko: "알록달록한 놀이방에 블록 매트와 흔들목마, 기차 장난감을 정리해 주세요.", en: "Tidy up a colorful playroom with a block mat, a rocking horse, and a toy train.", ja: "カラフルな子ども部屋に、ブロックマットと木馬、汽車のおもちゃを並べましょう。", zh: "在五彩缤纷的游戏室里，摆好积木地垫、摇摇木马和玩具火车。", fr: "Rangez une salle de jeux colorée : tapis de blocs, cheval à bascule et petit train.", es: "Ordena un cuarto de juegos colorido con alfombra de bloques, caballito y tren de juguete." },
    wallLeftColor: "#fef9c3",
    wallRightColor: "#fef08a",
    floorColor: "#16a34a",
    stickers: [
      { id: "puzzle_mat", number: 1, emoji: "🧩", name: { ko: "퍼즐 매트", en: "Puzzle Mat", ja: "パズルマット", zh: "拼图地垫", fr: "Tapis puzzle", es: "Alfombra de puzle" }, targetX: 350, targetY: 365, width: 120, height: 64, zLayer: 0, color: "#22c55e" },
      { id: "rocking_horse", number: 2, emoji: "🐴", name: { ko: "흔들목마", en: "Rocking Horse", ja: "木馬", zh: "摇摇木马", fr: "Cheval à bascule", es: "Caballito balancín" }, targetX: 255, targetY: 280, width: 110, height: 76, zLayer: 1, color: "#b45309" },
      { id: "toy_shelf", number: 3, emoji: "🧸", name: { ko: "곰인형 선반", en: "Teddy Shelf", ja: "くまのぬいぐるみ棚", zh: "泰迪熊架", fr: "Étagère à nounours", es: "Estante de osos" }, targetX: 465, targetY: 290, width: 72, height: 84, zLayer: 1, color: "#f59e0b" },
      { id: "crayon_art", number: 4, emoji: "🖍️", name: { ko: "크레용 그림", en: "Crayon Drawing", ja: "クレヨンの絵", zh: "蜡笔画", fr: "Dessin aux crayons", es: "Dibujo de crayones" }, targetX: 245, targetY: 165, width: 64, height: 64, zLayer: 1, color: "#ec4899" },
      { id: "kite", number: 5, emoji: "🪁", name: { ko: "벽에 건 연", en: "Wall Kite", ja: "壁の凧", zh: "墙上的风筝", fr: "Cerf-volant mural", es: "Cometa en la pared" }, targetX: 435, targetY: 170, width: 84, height: 82, zLayer: 0, color: "#06b6d4" },
      { id: "blocks", number: 6, emoji: "🟦", name: { ko: "쌓기 블록", en: "Stacking Blocks", ja: "積み木", zh: "叠叠积木", fr: "Cubes empilables", es: "Bloques apilables" }, targetX: 230, targetY: 235, width: 58, height: 52, zLayer: 2, color: "#3b82f6" },
      { id: "ball", number: 7, emoji: "⚽", name: { ko: "말랑 공", en: "Soft Ball", ja: "やわらかボール", zh: "软软的球", fr: "Balle souple", es: "Pelota blanda" }, targetX: 285, targetY: 230, width: 56, height: 58, zLayer: 2, color: "#f8fafc" },
      { id: "toy_train", number: 8, emoji: "🚂", name: { ko: "꼬마 기차", en: "Little Toy Train", ja: "小さな汽車", zh: "小火车", fr: "Petit train", es: "Trenecito" }, targetX: 355, targetY: 355, width: 66, height: 56, zLayer: 2, color: "#dc2626" },
    ],
  },
  {
    id: "music-studio",
    roomNumber: 8,
    title: { ko: "룸 8: 작은 음악 작업실", en: "Room 8: Tiny Music Studio", ja: "ルーム8：小さな音楽スタジオ", zh: "房间 8：小小音乐工作室", fr: "Pièce 8 : Petit studio de musique", es: "Sala 8: Pequeño estudio de música" },
    subtitle: { ko: "방음재를 붙인 작업실에 기타와 헤드폰, 레코드판을 놓아 주세요.", en: "Fill a soundproofed studio with a guitar, headphones, and vinyl records.", ja: "防音材を貼ったスタジオに、ギターとヘッドホン、レコードを置きましょう。", zh: "在贴了隔音棉的工作室里，摆上吉他、耳机和黑胶唱片。", fr: "Garnissez un studio insonorisé d'une guitare, d'un casque et de vinyles.", es: "Llena un estudio insonorizado con una guitarra, auriculares y vinilos." },
    wallLeftColor: "#ede9fe",
    wallRightColor: "#ddd6fe",
    floorColor: "#6d28d9",
    stickers: [
      { id: "studio_rug", number: 1, emoji: "🟪", name: { ko: "보라색 러그", en: "Purple Rug", ja: "紫のラグ", zh: "紫色地毯", fr: "Tapis violet", es: "Alfombra morada" }, targetX: 350, targetY: 370, width: 118, height: 62, zLayer: 0, color: "#7c3aed" },
      { id: "keyboard", number: 2, emoji: "🎹", name: { ko: "건반 키보드", en: "Keyboard", ja: "キーボード", zh: "电子琴", fr: "Clavier", es: "Teclado" }, targetX: 250, targetY: 285, width: 110, height: 76, zLayer: 1, color: "#111827" },
      { id: "headphones", number: 3, emoji: "🎧", name: { ko: "헤드폰", en: "Headphones", ja: "ヘッドホン", zh: "耳机", fr: "Casque", es: "Auriculares" }, targetX: 250, targetY: 228, width: 64, height: 58, zLayer: 2, color: "#f43f5e" },
      { id: "vinyl_wall", number: 4, emoji: "💿", name: { ko: "레코드판 장식", en: "Vinyl Wall Art", ja: "レコードの壁飾り", zh: "黑胶墙饰", fr: "Vinyles muraux", es: "Vinilos en la pared" }, targetX: 245, targetY: 160, width: 72, height: 64, zLayer: 0, color: "#a855f7" },
      { id: "on_air", number: 5, emoji: "🔴", name: { ko: "녹음 중 램프", en: "On Air Light", ja: "録音中ランプ", zh: "录音中指示灯", fr: "Voyant « On Air »", es: "Luz de grabación" }, targetX: 435, targetY: 165, width: 82, height: 60, zLayer: 0, color: "#ef4444" },
      { id: "guitar_stand", number: 6, emoji: "🎸", name: { ko: "기타 스탠드", en: "Guitar Stand", ja: "ギタースタンド", zh: "吉他架", fr: "Support de guitare", es: "Soporte de guitarra" }, targetX: 455, targetY: 295, width: 86, height: 72, zLayer: 1, color: "#d97706" },
      { id: "metronome", number: 7, emoji: "⏱️", name: { ko: "메트로놈", en: "Metronome", ja: "メトロノーム", zh: "节拍器", fr: "Métronome", es: "Metrónomo" }, targetX: 455, targetY: 245, width: 60, height: 56, zLayer: 2, color: "#78716c" },
      { id: "mic", number: 8, emoji: "🎤", name: { ko: "매달린 마이크", en: "Hanging Mic", ja: "吊りマイク", zh: "悬挂麦克风", fr: "Micro suspendu", es: "Micrófono colgante" }, targetX: 350, targetY: 135, width: 76, height: 58, zLayer: 1, color: "#9ca3af" },
    ],
  },
  {
    id: "midnight-kitchen",
    roomNumber: 9,
    title: { ko: "룸 9: 심야 라면 부엌", en: "Room 9: Midnight Noodle Kitchen", ja: "ルーム9：深夜のラーメン台所", zh: "房间 9：深夜泡面厨房", fr: "Pièce 9 : Cuisine de minuit", es: "Sala 9: Cocina de medianoche" },
    subtitle: { ko: "자정의 부엌에 냄비와 라면 그릇, 보글보글 주전자를 올려 주세요.", en: "Put a pot, a bowl of noodles, and a bubbling kettle in the midnight kitchen.", ja: "真夜中の台所に、鍋とラーメンどんぶり、ぐつぐつやかんを置きましょう。", zh: "在午夜的厨房里，摆上锅、泡面碗和咕嘟冒泡的水壶。", fr: "Posez une casserole, un bol de nouilles et une bouilloire qui chante dans la cuisine de minuit.", es: "Pon una olla, un tazón de fideos y una tetera hirviendo en la cocina de medianoche." },
    wallLeftColor: "#fff7ed",
    wallRightColor: "#fed7aa",
    floorColor: "#9a3412",
    stickers: [
      { id: "kitchen_tile", number: 1, emoji: "🟧", name: { ko: "주황 타일 바닥", en: "Orange Tile Floor", ja: "オレンジのタイル床", zh: "橙色瓷砖地面", fr: "Carrelage orange", es: "Suelo de baldosas naranja" }, targetX: 350, targetY: 368, width: 120, height: 62, zLayer: 0, color: "#f97316" },
      { id: "stove", number: 2, emoji: "🍳", name: { ko: "가스레인지", en: "Gas Stove", ja: "ガスコンロ", zh: "燃气灶", fr: "Gazinière", es: "Cocina de gas" }, targetX: 250, targetY: 280, width: 82, height: 86, zLayer: 1, color: "#57534e" },
      { id: "fridge", number: 3, emoji: "🧊", name: { ko: "작은 냉장고", en: "Mini Fridge", ja: "小さな冷蔵庫", zh: "小冰箱", fr: "Mini réfrigérateur", es: "Mini nevera" }, targetX: 460, targetY: 282, width: 82, height: 82, zLayer: 1, color: "#e5e7eb" },
      { id: "recipe_note", number: 4, emoji: "📝", name: { ko: "레시피 메모", en: "Recipe Note", ja: "レシピメモ", zh: "食谱便签", fr: "Note de recette", es: "Nota de receta" }, targetX: 250, targetY: 155, width: 88, height: 56, zLayer: 0, color: "#fde047" },
      { id: "moon_window", number: 5, emoji: "🌙", name: { ko: "달 뜬 창문", en: "Moonlit Window", ja: "月の見える窓", zh: "月光窗", fr: "Fenêtre au clair de lune", es: "Ventana con luna" }, targetX: 440, targetY: 162, width: 78, height: 72, zLayer: 0, color: "#1e3a8a" },
      { id: "noodle_bowl", number: 6, emoji: "🍜", name: { ko: "김 나는 라면", en: "Steaming Noodles", ja: "湯気のラーメン", zh: "热气腾腾的面", fr: "Nouilles fumantes", es: "Fideos humeantes" }, targetX: 350, targetY: 250, width: 68, height: 68, zLayer: 1, color: "#dc2626" },
      { id: "kettle", number: 7, emoji: "🫖", name: { ko: "보글보글 주전자", en: "Bubbling Kettle", ja: "ぐつぐつやかん", zh: "咕嘟水壶", fr: "Bouilloire qui chante", es: "Tetera hirviendo" }, targetX: 295, targetY: 345, width: 64, height: 60, zLayer: 2, color: "#14b8a6" },
      { id: "hungry_cat", number: 8, emoji: "🐈‍⬛", name: { ko: "배고픈 검은 고양이", en: "Hungry Black Cat", ja: "腹ぺこ黒猫", zh: "饿肚子的黑猫", fr: "Chat noir affamé", es: "Gato negro hambriento" }, targetX: 415, targetY: 345, width: 64, height: 58, zLayer: 2, color: "#111827" },
    ],
  },
  {
    id: "blossom-veranda",
    roomNumber: 10,
    title: { ko: "룸 10: 벚꽃 툇마루", en: "Room 10: Cherry Blossom Veranda", ja: "ルーム10：桜の縁側", zh: "房间 10：樱花檐廊", fr: "Pièce 10 : Véranda des cerisiers", es: "Sala 10: Terraza de cerezos" },
    subtitle: { ko: "마지막 방입니다. 꽃잎이 날리는 툇마루에 방석과 찻상, 풍경을 걸어 봄을 완성하세요.", en: "The last room. Finish spring on a veranda of drifting petals with cushions, a tea table, and a wind chime.", ja: "最後の部屋です。花びらが舞う縁側に座布団と茶卓、風鈴を飾って春を完成させましょう。", zh: "最后一个房间。在花瓣飘落的檐廊上摆好坐垫、茶几，挂上风铃，完成春天。", fr: "La dernière pièce. Achevez le printemps sur une véranda aux pétales volants : coussins, table à thé et carillon.", es: "La última sala. Completa la primavera en una terraza de pétalos con cojines, mesa de té y campanilla de viento." },
    wallLeftColor: "#fdf2f8",
    wallRightColor: "#fbcfe8",
    floorColor: "#9d174d",
    stickers: [
      { id: "tatami", number: 1, emoji: "🟩", name: { ko: "다다미 바닥", en: "Tatami Floor", ja: "畳の床", zh: "榻榻米地板", fr: "Sol en tatami", es: "Suelo de tatami" }, targetX: 350, targetY: 365, width: 120, height: 64, zLayer: 0, color: "#84cc16" },
      { id: "tea_table", number: 2, emoji: "🫖", name: { ko: "낮은 찻상", en: "Low Tea Table", ja: "低い茶卓", zh: "矮茶几", fr: "Table à thé basse", es: "Mesa de té baja" }, targetX: 255, targetY: 280, width: 110, height: 76, zLayer: 1, color: "#92400e" },
      { id: "bonsai", number: 3, emoji: "🌳", name: { ko: "분재 화분", en: "Bonsai Pot", ja: "盆栽", zh: "盆景", fr: "Bonsaï", es: "Bonsái" }, targetX: 465, targetY: 290, width: 72, height: 84, zLayer: 1, color: "#15803d" },
      { id: "blossom_scroll", number: 4, emoji: "🌸", name: { ko: "벚꽃 족자", en: "Blossom Scroll", ja: "桜の掛け軸", zh: "樱花挂轴", fr: "Rouleau de cerisier", es: "Pergamino de cerezo" }, targetX: 245, targetY: 165, width: 64, height: 64, zLayer: 1, color: "#f472b6" },
      { id: "wind_chime", number: 5, emoji: "🎐", name: { ko: "유리 풍경", en: "Glass Wind Chime", ja: "ガラスの風鈴", zh: "玻璃风铃", fr: "Carillon en verre", es: "Campanilla de cristal" }, targetX: 435, targetY: 170, width: 84, height: 82, zLayer: 0, color: "#38bdf8" },
      { id: "dango", number: 6, emoji: "🍡", name: { ko: "삼색 경단", en: "Tricolor Dumplings", ja: "三色団子", zh: "三色丸子", fr: "Brochette de dango", es: "Dango tricolor" }, targetX: 230, targetY: 235, width: 58, height: 52, zLayer: 2, color: "#fda4af" },
      { id: "fan", number: 7, emoji: "🪭", name: { ko: "접이 부채", en: "Folding Fan", ja: "扇子", zh: "折扇", fr: "Éventail", es: "Abanico" }, targetX: 285, targetY: 230, width: 56, height: 58, zLayer: 2, color: "#e11d48" },
      { id: "cushion_cat", number: 8, emoji: "😺", name: { ko: "방석 위 고양이", en: "Cat on a Cushion", ja: "座布団の猫", zh: "坐垫上的猫", fr: "Chat sur un coussin", es: "Gato en un cojín" }, targetX: 355, targetY: 355, width: 66, height: 56, zLayer: 2, color: "#fb923c" },
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
