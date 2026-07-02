import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ZodiacAnimal =
  | "rat" | "ox" | "tiger" | "rabbit" | "dragon" | "snake"
  | "horse" | "goat" | "monkey" | "rooster" | "dog" | "pig";

type Element = "wood" | "fire" | "earth" | "metal" | "water";

interface ZodiacData {
  animal: ZodiacAnimal;
  emoji: string;
  chineseChar: string;
  element: Element;
  yin: boolean; // yin=true, yang=false
  years: number[]; // reference years (cycle of 12 from these)
  name: Record<Locale, string>;
  traits: Record<Locale, string[]>;
  strengths: Record<Locale, string[]>;
  weaknesses: Record<Locale, string[]>;
  bestMatch: ZodiacAnimal[];
  worstMatch: ZodiacAnimal[];
  luckyNumbers: number[];
  luckyColors: Record<Locale, string[]>;
  career: Record<Locale, string>;
  love: Record<Locale, string>;
  famous: string[];
}

// ─── i18n UI ──────────────────────────────────────────────────────────────────

const UI: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    enterYear: string;
    yearPlaceholder: string;
    findBtn: string;
    yourSign: string;
    yourElement: string;
    traitsLabel: string;
    strengthsLabel: string;
    weaknessesLabel: string;
    bestMatchLabel: string;
    worstMatchLabel: string;
    luckyLabel: string;
    careerLabel: string;
    loveLabel: string;
    famousLabel: string;
    orBrowse: string;
    invalidYear: string;
    elementLabel: string;
    yinYang: string;
    elements: Record<Element, string>;
  }
> = {
  ko: {
    title: "중국 별자리 — 12지신 성격 분석",
    subtitle: "태어난 연도로 나의 띠를 찾고 성격·운세·궁합을 알아보세요",
    enterYear: "태어난 연도 입력",
    yearPlaceholder: "예: 1990",
    findBtn: "내 띠 찾기",
    yourSign: "나의 띠",
    yourElement: "오행",
    traitsLabel: "성격 특성",
    strengthsLabel: "강점",
    weaknessesLabel: "약점",
    bestMatchLabel: "최고 궁합",
    worstMatchLabel: "주의 궁합",
    luckyLabel: "행운",
    careerLabel: "직업 운",
    loveLabel: "연애 운",
    famousLabel: "같은 띠 유명인",
    orBrowse: "또는 직접 선택",
    invalidYear: "유효한 연도를 입력해주세요 (예: 1990)",
    elementLabel: "오행",
    yinYang: "음양",
    elements: { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" },
  },
  en: {
    title: "Chinese Zodiac — 12 Animal Signs",
    subtitle: "Enter your birth year to find your sign and discover your personality, fortune & compatibility",
    enterYear: "Enter your birth year",
    yearPlaceholder: "e.g. 1990",
    findBtn: "Find My Sign",
    yourSign: "Your Sign",
    yourElement: "Element",
    traitsLabel: "Personality traits",
    strengthsLabel: "Strengths",
    weaknessesLabel: "Weaknesses",
    bestMatchLabel: "Best matches",
    worstMatchLabel: "Challenging matches",
    luckyLabel: "Lucky",
    careerLabel: "Career fortune",
    loveLabel: "Love fortune",
    famousLabel: "Famous people",
    orBrowse: "Or browse all signs",
    invalidYear: "Please enter a valid year (e.g. 1990)",
    elementLabel: "Element",
    yinYang: "Yin / Yang",
    elements: { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" },
  },
  ja: {
    title: "中国星座 — 十二支性格分析",
    subtitle: "生まれた年から干支を調べて性格・運勢・相性を確認しましょう",
    enterYear: "生まれた年を入力",
    yearPlaceholder: "例: 1990",
    findBtn: "干支を調べる",
    yourSign: "あなたの干支",
    yourElement: "五行",
    traitsLabel: "性格特性",
    strengthsLabel: "強み",
    weaknessesLabel: "弱み",
    bestMatchLabel: "最高の相性",
    worstMatchLabel: "注意が必要な相性",
    luckyLabel: "ラッキー",
    careerLabel: "仕事運",
    loveLabel: "恋愛運",
    famousLabel: "同じ干支の有名人",
    orBrowse: "またはすべての干支を見る",
    invalidYear: "有効な年を入力してください（例：1990）",
    elementLabel: "五行",
    yinYang: "陰陽",
    elements: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" },
  },
  fr: {
    title: "Zodiaque Chinois — 12 Signes Animaux",
    subtitle: "Entrez votre année de naissance pour trouver votre signe et découvrir personnalité, fortune et compatibilité",
    enterYear: "Entrez votre année de naissance",
    yearPlaceholder: "ex : 1990",
    findBtn: "Trouver mon signe",
    yourSign: "Votre signe",
    yourElement: "Élément",
    traitsLabel: "Traits de personnalité",
    strengthsLabel: "Forces",
    weaknessesLabel: "Faiblesses",
    bestMatchLabel: "Meilleures compatibilités",
    worstMatchLabel: "Compatibilités difficiles",
    luckyLabel: "Chance",
    careerLabel: "Fortune carrière",
    loveLabel: "Fortune amoureuse",
    famousLabel: "Personnalités célèbres",
    orBrowse: "Ou parcourir tous les signes",
    invalidYear: "Veuillez entrer une année valide (ex : 1990)",
    elementLabel: "Élément",
    yinYang: "Yin / Yang",
    elements: { wood: "Bois", fire: "Feu", earth: "Terre", metal: "Métal", water: "Eau" },
  },
  es: {
    title: "Zodíaco Chino — 12 Signos Animales",
    subtitle: "Ingresa tu año de nacimiento para encontrar tu signo y descubrir personalidad, fortuna y compatibilidad",
    enterYear: "Ingresa tu año de nacimiento",
    yearPlaceholder: "ej: 1990",
    findBtn: "Encontrar mi signo",
    yourSign: "Tu signo",
    yourElement: "Elemento",
    traitsLabel: "Rasgos de personalidad",
    strengthsLabel: "Fortalezas",
    weaknessesLabel: "Debilidades",
    bestMatchLabel: "Mejores compatibilidades",
    worstMatchLabel: "Compatibilidades difíciles",
    luckyLabel: "Suerte",
    careerLabel: "Fortuna laboral",
    loveLabel: "Fortuna amorosa",
    famousLabel: "Personas famosas",
    orBrowse: "O explorar todos los signos",
    invalidYear: "Por favor ingresa un año válido (ej: 1990)",
    elementLabel: "Elemento",
    yinYang: "Yin / Yang",
    elements: { wood: "Madera", fire: "Fuego", earth: "Tierra", metal: "Metal", water: "Agua" },
  },
  zh: {
    title: "中国星座 — 十二生肖性格分析",
    subtitle: "输入出生年份找出你的生肖，了解性格特质、运势与相容性",
    enterYear: "输入出生年份",
    yearPlaceholder: "例：1990",
    findBtn: "查询我的生肖",
    yourSign: "你的生肖",
    yourElement: "五行",
    traitsLabel: "性格特质",
    strengthsLabel: "优势",
    weaknessesLabel: "弱点",
    bestMatchLabel: "最佳相容",
    worstMatchLabel: "需注意相容",
    luckyLabel: "幸运",
    careerLabel: "事业运",
    loveLabel: "感情运",
    famousLabel: "同生肖名人",
    orBrowse: "或浏览全部生肖",
    invalidYear: "请输入有效年份（例：1990）",
    elementLabel: "五行",
    yinYang: "阴阳",
    elements: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" },
  },
};

// ─── Element colors ───────────────────────────────────────────────────────────

const ELEMENT_COLORS: Record<Element, { bg: string; text: string; badge: string; border: string }> = {
  wood:  { bg: "bg-green-50",  text: "text-green-800",  badge: "bg-green-100 text-green-700",  border: "border-green-300" },
  fire:  { bg: "bg-red-50",    text: "text-red-800",    badge: "bg-red-100 text-red-700",      border: "border-red-300" },
  earth: { bg: "bg-yellow-50", text: "text-yellow-800", badge: "bg-yellow-100 text-yellow-700",border: "border-yellow-300" },
  metal: { bg: "bg-gray-50",   text: "text-gray-800",   badge: "bg-gray-100 text-gray-700",    border: "border-gray-300" },
  water: { bg: "bg-blue-50",   text: "text-blue-800",   badge: "bg-blue-100 text-blue-700",    border: "border-blue-300" },
};

// ─── Zodiac data ──────────────────────────────────────────────────────────────

const ZODIAC_ORDER: ZodiacAnimal[] = [
  "rat","ox","tiger","rabbit","dragon","snake",
  "horse","goat","monkey","rooster","dog","pig"
];

// Base year for cycle: 2020 = rat year
const BASE_YEAR = 2020;

function getZodiacFromYear(year: number): ZodiacAnimal {
  const idx = ((year - BASE_YEAR) % 12 + 12) % 12;
  return ZODIAC_ORDER[idx];
}

function getElementFromYear(year: number): Element {
  const elements: Element[] = ["metal","metal","water","water","wood","wood","fire","fire","earth","earth"];
  const idx = ((year - 1900) % 10 + 10) % 10;
  return elements[idx];
}

const ZODIACS: Record<ZodiacAnimal, ZodiacData> = {
  rat: {
    animal: "rat",
    emoji: "🐭",
    chineseChar: "鼠",
    element: "water",
    yin: false,
    years: [1900,1912,1924,1936,1948,1960,1972,1984,1996,2008,2020,2032],
    name: { ko: "쥐", en: "Rat", ja: "子(ネズミ)", fr: "Rat", es: "Rata", zh: "鼠", },
    traits: {
      ko: ["영리함", "적응력", "사교성", "기회주의", "근면함"],
      en: ["Clever", "Adaptable", "Sociable", "Opportunistic", "Hardworking"],
      ja: ["賢い", "適応力がある", "社交的", "機会主義的", "勤勉"],
      fr: ["Intelligent", "Adaptable", "Sociable", "Opportuniste", "Travailleur"],
      es: ["Inteligente", "Adaptable", "Sociable", "Oportunista", "Trabajador"],
      zh: ["聪明", "适应力强", "社交性好", "机会主义", "勤奋"],
    },
    strengths: {
      ko: ["빠른 판단력", "뛰어난 인맥 관리", "자원 효율적 활용"],
      en: ["Quick judgment", "Excellent networking", "Resourceful"],
      ja: ["素早い判断力", "優れた人脈管理", "資源の効率的活用"],
      fr: ["Jugement rapide", "Excellent réseau", "Ingénieux"],
      es: ["Juicio rápido", "Excelente networking", "Ingenioso"],
      zh: ["判断力敏锐", "人际关系出色", "善用资源"],
    },
    weaknesses: {
      ko: ["지나친 욕심", "비밀주의 경향", "불안정한 감정"],
      en: ["Overly greedy", "Secretive", "Emotionally unstable"],
      ja: ["欲張りすぎる", "秘密主義的傾向", "感情不安定"],
      fr: ["Trop avide", "Tendance au secret", "Émotionnellement instable"],
      es: ["Demasiado codicioso", "Reservado", "Emocionalmente inestable"],
      zh: ["过于贪心", "倾向于保密", "情绪不稳定"],
    },
    bestMatch: ["dragon", "monkey", "ox"],
    worstMatch: ["horse", "goat"],
    luckyNumbers: [2, 3],
    luckyColors: {
      ko: ["파란색", "금색", "초록색"],
      en: ["Blue", "Gold", "Green"],
      ja: ["青", "金", "緑"],
      fr: ["Bleu", "Or", "Vert"],
      es: ["Azul", "Dorado", "Verde"],
      zh: ["藍色", "金色", "綠色"],
    },
    career: {
      ko: "사업, 금융, 글쓰기, 예술, 정치 분야에서 두각을 나타냅니다.",
      en: "Excels in business, finance, writing, arts, and politics.",
      ja: "ビジネス、金融、執筆、芸術、政治で頭角を現します。",
      fr: "Excelle dans les affaires, la finance, l'écriture, les arts et la politique.",
      es: "Destaca en negocios, finanzas, escritura, artes y política.",
      zh: "在商业、金融、写作、艺术和政治领域表现出色。",
    },
    love: {
      ko: "용띠·원숭이띠와 최고의 궁합입니다. 감정 표현을 솔직히 하면 더 깊은 관계를 만들 수 있습니다.",
      en: "Best with Dragon and Monkey. Open emotional expression leads to deeper connections.",
      ja: "竜年・申年と最高の相性。感情を率直に表現することでより深い関係を築けます。",
      fr: "Meilleur avec Dragon et Singe. L'expression émotionnelle ouverte mène à des liens plus profonds.",
      es: "Mejor con Dragón y Mono. La expresión emocional abierta lleva a conexiones más profundas.",
      zh: "与龙年和猴年最佳。坦诚表达情感可建立更深厚的关系。",
    },
    famous: ["Wolfgang Amadeus Mozart", "LeBron James", "Eminem", "Cristiano Ronaldo"],
  },
  ox: {
    animal: "ox",
    emoji: "🐂",
    chineseChar: "牛",
    element: "earth",
    yin: true,
    years: [1901,1913,1925,1937,1949,1961,1973,1985,1997,2009,2021,2033],
    name: { ko: "소", en: "Ox", ja: "丑(ウシ)", fr: "Bœuf", es: "Buey", zh: "牛", },
    traits: {
      ko: ["근면함", "신뢰성", "인내심", "고집스러움", "성실함"],
      en: ["Hardworking", "Reliable", "Patient", "Stubborn", "Diligent"],
      ja: ["勤勉", "信頼性がある", "忍耐強い", "頑固", "誠実"],
      fr: ["Travailleur", "Fiable", "Patient", "Têtu", "Assidu"],
      es: ["Trabajador", "Confiable", "Paciente", "Terco", "Diligente"],
      zh: ["勤勞", "可靠", "有耐心", "固執", "誠實"],
    },
    strengths: {
      ko: ["강한 책임감", "탁월한 지구력", "믿음직한 리더십"],
      en: ["Strong sense of responsibility", "Outstanding endurance", "Trustworthy leadership"],
      ja: ["強い責任感", "卓越した持久力", "信頼できるリーダーシップ"],
      fr: ["Fort sens des responsabilités", "Endurance remarquable", "Leadership fiable"],
      es: ["Fuerte sentido de responsabilidad", "Resistencia sobresaliente", "Liderazgo confiable"],
      zh: ["責任心強", "耐力卓越", "領導力值得信賴"],
    },
    weaknesses: {
      ko: ["변화에 저항적", "지나친 고집", "감정 표현 서툶"],
      en: ["Resistant to change", "Overly stubborn", "Poor emotional expression"],
      ja: ["変化に抵抗的", "頑固すぎる", "感情表現が苦手"],
      fr: ["Résistant au changement", "Trop têtu", "Mauvaise expression émotionnelle"],
      es: ["Resistente al cambio", "Demasiado terco", "Pobre expresión emocional"],
      zh: ["抗拒变化", "过于固执", "不善表达情感"],
    },
    bestMatch: ["rat", "snake", "rooster"],
    worstMatch: ["tiger", "dragon", "horse", "goat"],
    luckyNumbers: [1, 4],
    luckyColors: {
      ko: ["흰색", "노란색", "초록색"],
      en: ["White", "Yellow", "Green"],
      ja: ["白", "黄", "緑"],
      fr: ["Blanc", "Jaune", "Vert"],
      es: ["Blanco", "Amarillo", "Verde"],
      zh: ["白色", "黄色", "绿色"],
    },
    career: {
      ko: "농업, 의학, 제조업, 예술, 정치 분야에 적합합니다.",
      en: "Well-suited for agriculture, medicine, manufacturing, arts, and politics.",
      ja: "農業、医学、製造業、芸術、政治に適しています。",
      fr: "Convient à l'agriculture, la médecine, l'industrie, les arts et la politique.",
      es: "Adecuado para agricultura, medicina, manufactura, artes y política.",
      zh: "适合农业、医学、制造业、艺术和政治领域。",
    },
    love: {
      ko: "쥐띠·뱀띠·닭띠와 안정적인 관계를 맺습니다. 감정 표현을 늘리면 관계가 더욱 깊어집니다.",
      en: "Stable bonds with Rat, Snake, and Rooster. More emotional expression deepens relationships.",
      ja: "鼠年・蛇年・鶏年と安定した関係。感情表現を増やすと関係がより深まります。",
      fr: "Liens stables avec Rat, Serpent et Coq. Plus d'expression émotionnelle approfondit les relations.",
      es: "Vínculos estables con Rata, Serpiente y Gallo. Más expresión emocional profundiza las relaciones.",
      zh: "与鼠年、蛇年、鸡年建立稳定关系。增加情感表达可加深关系。",
    },
    famous: ["Barack Obama", "Napoleon Bonaparte", "Meryl Streep", "Princess Diana"],
  },
  tiger: {
    animal: "tiger",
    emoji: "🐯",
    chineseChar: "虎",
    element: "wood",
    yin: false,
    years: [1902,1914,1926,1938,1950,1962,1974,1986,1998,2010,2022,2034],
    name: { ko: "호랑이", en: "Tiger", ja: "寅(トラ)", fr: "Tigre", es: "Tigre", zh: "虎", },
    traits: {
      ko: ["용감함", "카리스마", "열정", "충동적", "독립심"],
      en: ["Brave", "Charismatic", "Passionate", "Impulsive", "Independent"],
      ja: ["勇敢", "カリスマ的", "情熱的", "衝動的", "独立心旺盛"],
      fr: ["Courageux", "Charismatique", "Passionné", "Impulsif", "Indépendant"],
      es: ["Valiente", "Carismático", "Apasionado", "Impulsivo", "Independiente"],
      zh: ["勇敢", "有魅力", "热情", "冲动", "独立"],
    },
    strengths: {
      ko: ["타고난 리더십", "강한 정의감", "높은 추진력"],
      en: ["Natural leadership", "Strong sense of justice", "High drive"],
      ja: ["生まれながらのリーダーシップ", "強い正義感", "高い推進力"],
      fr: ["Leadership naturel", "Fort sens de la justice", "Grande motivation"],
      es: ["Liderazgo natural", "Fuerte sentido de la justicia", "Alta determinación"],
      zh: ["天生领袖气质", "正义感强", "推动力强"],
    },
    weaknesses: {
      ko: ["성급한 결정", "권위에 저항", "자기 과신"],
      en: ["Hasty decisions", "Defiant to authority", "Overconfident"],
      ja: ["性急な判断", "権威への反抗", "過信"],
      fr: ["Décisions hâtives", "Défiant envers l'autorité", "Trop confiant"],
      es: ["Decisiones apresuradas", "Desafiante ante la autoridad", "Exceso de confianza"],
      zh: ["决定仓促", "抵制权威", "过度自信"],
    },
    bestMatch: ["horse", "dog", "pig"],
    worstMatch: ["ox", "snake", "monkey"],
    luckyNumbers: [1, 3, 4],
    luckyColors: {
      ko: ["파란색", "회색", "주황색"],
      en: ["Blue", "Grey", "Orange"],
      ja: ["青", "灰", "オレンジ"],
      fr: ["Bleu", "Gris", "Orange"],
      es: ["Azul", "Gris", "Naranja"],
      zh: ["藍色", "灰色", "橙色"],
    },
    career: {
      ko: "군인, 소방관, 탐험가, 경영자, 광고 분야에서 두각을 나타냅니다.",
      en: "Excels as soldiers, firefighters, explorers, executives, and in advertising.",
      ja: "軍人、消防士、探検家、経営者、広告分野で頭角を現します。",
      fr: "Excelle comme soldat, pompier, explorateur, cadre et dans la publicité.",
      es: "Destaca como soldado, bombero, explorador, ejecutivo y en publicidad.",
      zh: "在軍人、消防員、探險家、管理者和廣告領域表現出色。",
    },
    love: {
      ko: "말띠·개띠와 불꽃 같은 궁합입니다. 상대방에게 자유를 주는 연애가 가장 이상적입니다.",
      en: "Fiery connection with Horse and Dog. Relationships thrive when partners have freedom.",
      ja: "馬年・犬年と燃えるような相性。相手に自由を与える恋愛が最も理想的です。",
      fr: "Connexion ardente avec Cheval et Chien. Les relations s'épanouissent quand les partenaires ont la liberté.",
      es: "Conexión ardiente con Caballo y Perro. Las relaciones prosperan cuando los socios tienen libertad.",
      zh: "与马年和狗年有如火焰般的相容。给予对方自由的恋爱最为理想。",
    },
    famous: ["Leonardo DiCaprio", "Lady Gaga", "Tom Cruise", "Marilyn Monroe"],
  },
  rabbit: {
    animal: "rabbit",
    emoji: "🐰",
    chineseChar: "兔",
    element: "wood",
    yin: true,
    years: [1903,1915,1927,1939,1951,1963,1975,1987,1999,2011,2023,2035],
    name: { ko: "토끼", en: "Rabbit", ja: "卯(ウサギ)", fr: "Lapin", es: "Conejo", zh: "兔", },
    traits: {
      ko: ["온화함", "친절함", "예술적 감각", "소심함", "우아함"],
      en: ["Gentle", "Kind", "Artistic", "Timid", "Elegant"],
      ja: ["穏やか", "親切", "芸術的センス", "臆病", "優雅"],
      fr: ["Doux", "Aimable", "Artistique", "Timide", "Élégant"],
      es: ["Gentil", "Amable", "Artístico", "Tímido", "Elegante"],
      zh: ["温和", "亲切", "有艺术感", "胆小", "优雅"],
    },
    strengths: {
      ko: ["탁월한 공감 능력", "섬세한 미적 감각", "갈등 회피 능력"],
      en: ["Outstanding empathy", "Refined aesthetic sense", "Conflict-avoidance skills"],
      ja: ["卓越した共感能力", "繊細な審美眼", "葛藤回避能力"],
      fr: ["Empathie remarquable", "Sens esthétique raffiné", "Aptitude à éviter les conflits"],
      es: ["Empatía sobresaliente", "Sentido estético refinado", "Habilidad para evitar conflictos"],
      zh: ["同理心出色", "审美感细腻", "化解冲突能力强"],
    },
    weaknesses: {
      ko: ["결단력 부족", "회피적 성격", "지나친 감수성"],
      en: ["Lack of decisiveness", "Avoidant nature", "Overly sensitive"],
      ja: ["決断力不足", "回避的な性格", "過度に感傷的"],
      fr: ["Manque de décision", "Nature fuyante", "Trop sensible"],
      es: ["Falta de decisión", "Naturaleza evasiva", "Demasiado sensible"],
      zh: ["缺乏决断力", "回避型性格", "过于敏感"],
    },
    bestMatch: ["goat", "pig", "dog"],
    worstMatch: ["rat", "dragon", "rooster"],
    luckyNumbers: [3, 4, 6],
    luckyColors: {
      ko: ["빨간색", "분홍색", "보라색"],
      en: ["Red", "Pink", "Purple"],
      ja: ["赤", "ピンク", "紫"],
      fr: ["Rouge", "Rose", "Violet"],
      es: ["Rojo", "Rosa", "Morado"],
      zh: ["紅色", "粉紅色", "紫色"],
    },
    career: {
      ko: "외교관, 예술가, 교사, 의사, 행정가에 적합합니다.",
      en: "Well-suited for diplomats, artists, teachers, doctors, and administrators.",
      ja: "外交官、芸術家、教師、医師、行政官に適しています。",
      fr: "Convient aux diplomates, artistes, enseignants, médecins et administrateurs.",
      es: "Adecuado para diplomáticos, artistas, maestros, médicos y administradores.",
      zh: "適合外交官、藝術家、教師、醫生和行政管理人員。",
    },
    love: {
      ko: "양띠·돼지띠와 따뜻하고 포근한 관계를 유지합니다. 안정적인 환경에서 사랑이 꽃핍니다.",
      en: "Warm and comforting with Goat and Pig. Love blossoms in stable environments.",
      ja: "羊年・猪年と温かく心地よい関係。安定した環境で愛が花開きます。",
      fr: "Relation chaleureuse avec Chèvre et Cochon. L'amour s'épanouit dans des environnements stables.",
      es: "Cálido y reconfortante con Cabra y Cerdo. El amor florece en entornos estables.",
      zh: "与羊年和猪年保持温暖舒适的关系。在稳定的环境中爱情得以绽放。",
    },
    famous: ["Albert Einstein", "Brad Pitt", "Angelina Jolie", "Frank Sinatra"],
  },
  dragon: {
    animal: "dragon",
    emoji: "🐲",
    chineseChar: "龍",
    element: "earth",
    yin: false,
    years: [1904,1916,1928,1940,1952,1964,1976,1988,2000,2012,2024,2036],
    name: { ko: "용", en: "Dragon", ja: "辰(タツ)", fr: "Dragon", es: "Dragón", zh: "龙", },
    traits: {
      ko: ["자신감", "카리스마", "야망", "완벽주의", "독창성"],
      en: ["Confident", "Charismatic", "Ambitious", "Perfectionist", "Original"],
      ja: ["自信家", "カリスマ的", "野心的", "完璧主義", "独創的"],
      fr: ["Confiant", "Charismatique", "Ambitieux", "Perfectionniste", "Original"],
      es: ["Confiado", "Carismático", "Ambicioso", "Perfeccionista", "Original"],
      zh: ["自信", "有魅力", "有野心", "完美主义", "独创性强"],
    },
    strengths: {
      ko: ["타고난 지도력", "폭넓은 상상력", "강한 추진력"],
      en: ["Natural leadership", "Broad imagination", "Strong drive"],
      ja: ["生まれながらのリーダーシップ", "幅広い想像力", "強い推進力"],
      fr: ["Leadership naturel", "Imagination large", "Grande motivation"],
      es: ["Liderazgo natural", "Amplia imaginación", "Fuerte determinación"],
      zh: ["天生领袖力", "想象力丰富", "推动力强"],
    },
    weaknesses: {
      ko: ["오만함", "비판 수용 어려움", "지나친 완벽주의"],
      en: ["Arrogant", "Difficulty accepting criticism", "Excessive perfectionism"],
      ja: ["傲慢", "批判を受け入れにくい", "過度な完璧主義"],
      fr: ["Arrogant", "Difficulté à accepter les critiques", "Perfectionnisme excessif"],
      es: ["Arrogante", "Dificultad para aceptar críticas", "Perfeccionismo excesivo"],
      zh: ["傲慢", "难以接受批评", "过度完美主义"],
    },
    bestMatch: ["rat", "tiger", "snake", "monkey", "rooster", "pig"],
    worstMatch: ["ox", "goat", "rabbit", "dog"],
    luckyNumbers: [1, 6, 7],
    luckyColors: {
      ko: ["금색", "은색", "회색"],
      en: ["Gold", "Silver", "Grey"],
      ja: ["金", "銀", "灰"],
      fr: ["Or", "Argent", "Gris"],
      es: ["Dorado", "Plateado", "Gris"],
      zh: ["金色", "銀色", "灰色"],
    },
    career: {
      ko: "CEO, 정치가, 예술가, 건축가, 의사로 성공 가능성이 높습니다.",
      en: "High potential as CEOs, politicians, artists, architects, and doctors.",
      ja: "CEO、政治家、芸術家、建築家、医師として成功可能性が高い。",
      fr: "Fort potentiel en tant que PDG, politiciens, artistes, architectes et médecins.",
      es: "Alto potencial como CEOs, políticos, artistas, arquitectos y médicos.",
      zh: "作為CEO、政治家、藝術家、建築師和醫生，成功可能性高。",
    },
    love: {
      ko: "쥐띠와 원숭이띠와 강렬한 화학작용을 보입니다. 파트너에게 충분한 공간을 주는 것이 중요합니다.",
      en: "Intense chemistry with Rat and Monkey. Giving partners enough space is key.",
      ja: "鼠年と猿年と強烈な化学反応。パートナーに十分なスペースを与えることが重要です。",
      fr: "Forte chimie avec Rat et Singe. Donner suffisamment d'espace aux partenaires est essentiel.",
      es: "Química intensa con Rata y Mono. Dar suficiente espacio a los socios es clave.",
      zh: "与鼠年和猴年有强烈的化学反应。给予伴侣足够空间至关重要。",
    },
    famous: ["Bruce Lee", "John Lennon", "Rihanna", "Keanu Reeves"],
  },
  snake: {
    animal: "snake",
    emoji: "🐍",
    chineseChar: "蛇",
    element: "fire",
    yin: true,
    years: [1905,1917,1929,1941,1953,1965,1977,1989,2001,2013,2025,2037],
    name: { ko: "뱀", en: "Snake", ja: "巳(ヘビ)", fr: "Serpent", es: "Serpiente", zh: "蛇", },
    traits: {
      ko: ["직관력", "신비로움", "지혜", "독립심", "통찰력"],
      en: ["Intuitive", "Mysterious", "Wise", "Independent", "Insightful"],
      ja: ["直感的", "神秘的", "賢い", "独立心旺盛", "洞察力がある"],
      fr: ["Intuitif", "Mystérieux", "Sage", "Indépendant", "Perspicace"],
      es: ["Intuitivo", "Misterioso", "Sabio", "Independiente", "Perspicaz"],
      zh: ["直觉力强", "神秘", "智慧", "独立", "洞察力强"],
    },
    strengths: {
      ko: ["예리한 분석력", "강한 직관", "우아한 처세술"],
      en: ["Sharp analytical skills", "Strong intuition", "Elegant social navigation"],
      ja: ["鋭い分析力", "強い直感", "優雅な処世術"],
      fr: ["Excellente analyse", "Forte intuition", "Navigation sociale élégante"],
      es: ["Agudas habilidades analíticas", "Fuerte intuición", "Navegación social elegante"],
      zh: ["分析能力敏锐", "直觉强", "处世优雅"],
    },
    weaknesses: {
      ko: ["질투심", "복수심", "비밀주의"],
      en: ["Jealousy", "Vindictive", "Secretive"],
      ja: ["嫉妬心", "復讐心", "秘密主義"],
      fr: ["Jalousie", "Rancunier", "Secret"],
      es: ["Celos", "Vengativo", "Reservado"],
      zh: ["嫉妒心", "报复心", "保密主义"],
    },
    bestMatch: ["ox", "rooster", "dragon"],
    worstMatch: ["tiger", "pig"],
    luckyNumbers: [2, 8, 9],
    luckyColors: {
      ko: ["검은색", "빨간색", "노란색"],
      en: ["Black", "Red", "Yellow"],
      ja: ["黒", "赤", "黄"],
      fr: ["Noir", "Rouge", "Jaune"],
      es: ["Negro", "Rojo", "Amarillo"],
      zh: ["黑色", "红色", "黄色"],
    },
    career: {
      ko: "과학자, 분석가, 심리학자, 교수, 점성술사에 적합합니다.",
      en: "Well-suited for scientists, analysts, psychologists, professors, and astrologers.",
      ja: "科学者、分析家、心理学者、教授、占星術師に適しています。",
      fr: "Convient aux scientifiques, analystes, psychologues, professeurs et astrologues.",
      es: "Adecuado para científicos, analistas, psicólogos, profesores y astrólogos.",
      zh: "适合科学家、分析师、心理学家、教授和占星师。",
    },
    love: {
      ko: "소띠·닭띠와 깊고 신뢰 있는 관계를 맺습니다. 솔직한 소통이 관계의 핵심입니다.",
      en: "Deep, trusting bond with Ox and Rooster. Honest communication is the key.",
      ja: "牛年・鶏年と深く信頼のある関係。率直なコミュニケーションが関係の核心です。",
      fr: "Lien profond et confiant avec Bœuf et Coq. La communication honnête est la clé.",
      es: "Vínculo profundo y confiable con Buey y Gallo. La comunicación honesta es clave.",
      zh: "与牛年和鸡年建立深厚可信的关系。坦诚沟通是关系的核心。",
    },
    famous: ["Audrey Hepburn", "Abraham Lincoln", "Darwin", "Oprah Winfrey"],
  },
  horse: {
    animal: "horse",
    emoji: "🐴",
    chineseChar: "馬",
    element: "fire",
    yin: false,
    years: [1906,1918,1930,1942,1954,1966,1978,1990,2002,2014,2026,2038],
    name: { ko: "말", en: "Horse", ja: "午(ウマ)", fr: "Cheval", es: "Caballo", zh: "马", },
    traits: {
      ko: ["활동적", "자유로움", "열정적", "변덕스러움", "낙관주의"],
      en: ["Active", "Free-spirited", "Passionate", "Fickle", "Optimistic"],
      ja: ["活動的", "自由奔放", "情熱的", "気まぐれ", "楽観的"],
      fr: ["Actif", "Libre", "Passionné", "Capricieux", "Optimiste"],
      es: ["Activo", "Libre", "Apasionado", "Volátil", "Optimista"],
      zh: ["活躍", "自由", "熱情", "善變", "樂觀"],
    },
    strengths: {
      ko: ["강한 설득력", "뛰어난 사교성", "문제 해결 능력"],
      en: ["Persuasive", "Excellent social skills", "Problem-solving ability"],
      ja: ["強い説得力", "優れた社交性", "問題解決能力"],
      fr: ["Persuasif", "Excellentes compétences sociales", "Capacité de résolution de problèmes"],
      es: ["Persuasivo", "Excelentes habilidades sociales", "Capacidad para resolver problemas"],
      zh: ["说服力强", "社交能力出色", "解决问题能力强"],
    },
    weaknesses: {
      ko: ["무책임함", "지속성 부족", "이기적 경향"],
      en: ["Irresponsible", "Lack of persistence", "Selfish tendencies"],
      ja: ["無責任", "持続性不足", "自己中心的傾向"],
      fr: ["Irresponsable", "Manque de persistance", "Tendances égoïstes"],
      es: ["Irresponsable", "Falta de persistencia", "Tendencias egoístas"],
      zh: ["不負責任", "缺乏持久性", "自私傾向"],
    },
    bestMatch: ["tiger", "goat", "dog"],
    worstMatch: ["rat", "ox", "rabbit"],
    luckyNumbers: [2, 3, 7],
    luckyColors: {
      ko: ["노란색", "초록색", "빨간색"],
      en: ["Yellow", "Green", "Red"],
      ja: ["黄", "緑", "赤"],
      fr: ["Jaune", "Vert", "Rouge"],
      es: ["Amarillo", "Verde", "Rojo"],
      zh: ["黄色", "绿色", "红色"],
    },
    career: {
      ko: "여행가, 작가, 통역가, 운동선수, 언론인에 적합합니다.",
      en: "Well-suited for travelers, writers, interpreters, athletes, and journalists.",
      ja: "旅行家、作家、通訳者、アスリート、ジャーナリストに適しています。",
      fr: "Convient aux voyageurs, écrivains, interprètes, athlètes et journalistes.",
      es: "Adecuado para viajeros, escritores, intérpretes, atletas y periodistas.",
      zh: "适合旅行者、作家、译员、运动员和记者。",
    },
    love: {
      ko: "호랑이띠·양띠·개띠와 열정적인 관계입니다. 자유를 허용하는 파트너와 잘 맞습니다.",
      en: "Passionate with Tiger, Goat, and Dog. Partners who allow freedom are ideal.",
      ja: "虎年・羊年・犬年と情熱的な関係。自由を許容するパートナーがベストです。",
      fr: "Passionné avec Tigre, Chèvre et Chien. Les partenaires qui accordent la liberté sont idéaux.",
      es: "Apasionado con Tigre, Cabra y Perro. Los socios que permiten libertad son ideales.",
      zh: "与虎年、羊年和狗年热情相容。允许自由的伴侣最为理想。",
    },
    famous: ["Genghis Khan", "Isaac Newton", "Jimi Hendrix", "Paul McCartney"],
  },
  goat: {
    animal: "goat",
    emoji: "🐑",
    chineseChar: "羊",
    element: "earth",
    yin: true,
    years: [1907,1919,1931,1943,1955,1967,1979,1991,2003,2015,2027,2039],
    name: { ko: "양", en: "Goat", ja: "未(ヒツジ)", fr: "Chèvre", es: "Cabra", zh: "羊", },
    traits: {
      ko: ["창의성", "온화함", "공감 능력", "우유부단함", "예술적"],
      en: ["Creative", "Gentle", "Empathetic", "Indecisive", "Artistic"],
      ja: ["創造的", "穏やか", "共感力がある", "優柔不断", "芸術的"],
      fr: ["Créatif", "Doux", "Empathique", "Indécis", "Artistique"],
      es: ["Creativo", "Gentil", "Empático", "Indeciso", "Artístico"],
      zh: ["有创意", "温和", "有同理心", "优柔寡断", "有艺术感"],
    },
    strengths: {
      ko: ["높은 미적 감수성", "강한 공감 능력", "부드러운 대인관계"],
      en: ["High aesthetic sensitivity", "Strong empathy", "Gentle interpersonal skills"],
      ja: ["高い審美的感受性", "強い共感能力", "穏やかな対人関係"],
      fr: ["Haute sensibilité esthétique", "Forte empathie", "Relations interpersonnelles douces"],
      es: ["Alta sensibilidad estética", "Fuerte empatía", "Suaves habilidades interpersonales"],
      zh: ["审美感受性高", "同理心强", "人际关系温和"],
    },
    weaknesses: {
      ko: ["결정 장애", "의존적 성향", "걱정이 많음"],
      en: ["Decision paralysis", "Dependent tendencies", "Excessive worrying"],
      ja: ["決断困難", "依存的傾向", "心配性"],
      fr: ["Paralysie décisionnelle", "Tendances dépendantes", "Inquiétude excessive"],
      es: ["Parálisis de decisión", "Tendencias dependientes", "Preocupación excesiva"],
      zh: ["决策困难", "依赖倾向", "过度担忧"],
    },
    bestMatch: ["rabbit", "horse", "pig"],
    worstMatch: ["ox", "rat", "dog"],
    luckyNumbers: [2, 7],
    luckyColors: {
      ko: ["초록색", "빨간색", "보라색"],
      en: ["Green", "Red", "Purple"],
      ja: ["緑", "赤", "紫"],
      fr: ["Vert", "Rouge", "Violet"],
      es: ["Verde", "Rojo", "Morado"],
      zh: ["綠色", "紅色", "紫色"],
    },
    career: {
      ko: "예술가, 작가, 음악가, 교사, 의사에 적합합니다.",
      en: "Well-suited for artists, writers, musicians, teachers, and doctors.",
      ja: "芸術家、作家、音楽家、教師、医師に適しています。",
      fr: "Convient aux artistes, écrivains, musiciens, enseignants et médecins.",
      es: "Adecuado para artistas, escritores, músicos, maestros y médicos.",
      zh: "適合藝術家、作家、音樂家、教師和醫生。",
    },
    love: {
      ko: "토끼띠·말띠·돼지띠와 안정적인 사랑을 나눕니다. 자신의 감정을 표현하는 연습이 필요합니다.",
      en: "Stable love with Rabbit, Horse, and Pig. Practicing emotional expression is important.",
      ja: "兎年・馬年・猪年と安定した愛。感情表現の練習が必要です。",
      fr: "Amour stable avec Lapin, Cheval et Cochon. Pratiquer l'expression émotionnelle est important.",
      es: "Amor estable con Conejo, Caballo y Cerdo. Practicar la expresión emocional es importante.",
      zh: "与兔年、马年和猪年分享稳定的爱情。练习表达情感很重要。",
    },
    famous: ["Bill Gates", "Steve Jobs", "Mick Jagger", "Julia Roberts"],
  },
  monkey: {
    animal: "monkey",
    emoji: "🐒",
    chineseChar: "猴",
    element: "metal",
    yin: false,
    years: [1908,1920,1932,1944,1956,1968,1980,1992,2004,2016,2028,2040],
    name: { ko: "원숭이", en: "Monkey", ja: "申(サル)", fr: "Singe", es: "Mono", zh: "猴", },
    traits: {
      ko: ["영리함", "유머", "다재다능", "기회주의", "호기심"],
      en: ["Clever", "Humorous", "Versatile", "Opportunistic", "Curious"],
      ja: ["賢い", "ユーモアがある", "多才", "機会主義的", "好奇心旺盛"],
      fr: ["Intelligent", "Humoristique", "Polyvalent", "Opportuniste", "Curieux"],
      es: ["Inteligente", "Humorístico", "Versátil", "Oportunista", "Curioso"],
      zh: ["聰明", "幽默", "多才多藝", "機會主義", "好奇心強"],
    },
    strengths: {
      ko: ["뛰어난 문제 해결 능력", "빠른 학습 능력", "뛰어난 사교성"],
      en: ["Excellent problem-solving", "Fast learner", "Outstanding social skills"],
      ja: ["優れた問題解決能力", "素早い学習能力", "優れた社交性"],
      fr: ["Excellente résolution de problèmes", "Apprend vite", "Excellentes compétences sociales"],
      es: ["Excelente resolución de problemas", "Aprende rápido", "Sobresalientes habilidades sociales"],
      zh: ["解决问题能力出色", "学习速度快", "社交能力出色"],
    },
    weaknesses: {
      ko: ["불성실함", "자기중심적", "충동적 행동"],
      en: ["Unreliable", "Self-centered", "Impulsive behavior"],
      ja: ["不誠実", "自己中心的", "衝動的な行動"],
      fr: ["Peu fiable", "Égocentrique", "Comportement impulsif"],
      es: ["Poco confiable", "Egocéntrico", "Comportamiento impulsivo"],
      zh: ["不诚实", "以自我为中心", "冲动行事"],
    },
    bestMatch: ["rat", "dragon", "snake"],
    worstMatch: ["tiger", "pig"],
    luckyNumbers: [1, 7, 8],
    luckyColors: {
      ko: ["흰색", "파란색", "금색"],
      en: ["White", "Blue", "Gold"],
      ja: ["白", "青", "金"],
      fr: ["Blanc", "Bleu", "Or"],
      es: ["Blanco", "Azul", "Dorado"],
      zh: ["白色", "藍色", "金色"],
    },
    career: {
      ko: "사업가, 엔지니어, 오락, 금융, 의학 분야에서 두각을 나타냅니다.",
      en: "Excels as entrepreneurs, engineers, in entertainment, finance, and medicine.",
      ja: "起業家、エンジニア、エンターテインメント、金融、医学で頭角を現します。",
      fr: "Excelle comme entrepreneur, ingénieur, dans le divertissement, la finance et la médecine.",
      es: "Destaca como empresario, ingeniero, en entretenimiento, finanzas y medicina.",
      zh: "在企业家、工程师、娱乐、金融和医学领域表现出色。",
    },
    love: {
      ko: "쥐띠·용띠와 환상적인 궁합입니다. 파트너를 지적으로 자극할 수 있는 관계를 원합니다.",
      en: "Fantastic bond with Rat and Dragon. Seeks relationships with intellectual stimulation.",
      ja: "鼠年・竜年と素晴らしい相性。知的刺激を与えられる関係を求めます。",
      fr: "Excellent lien avec Rat et Dragon. Recherche des relations avec stimulation intellectuelle.",
      es: "Fantástico vínculo con Rata y Dragón. Busca relaciones con estimulación intelectual.",
      zh: "与鼠年和龙年有绝佳相容。寻求有智识刺激的关系。",
    },
    famous: ["Michael Douglas", "Tom Hanks", "Will Smith", "Elizabeth Taylor"],
  },
  rooster: {
    animal: "rooster",
    emoji: "🐓",
    chineseChar: "雞",
    element: "metal",
    yin: true,
    years: [1909,1921,1933,1945,1957,1969,1981,1993,2005,2017,2029,2041],
    name: { ko: "닭", en: "Rooster", ja: "酉(トリ)", fr: "Coq", es: "Gallo", zh: "鸡", },
    traits: {
      ko: ["자신감", "완벽주의", "관찰력", "자만심", "근면함"],
      en: ["Confident", "Perfectionist", "Observant", "Vain", "Hardworking"],
      ja: ["自信家", "完璧主義", "観察力がある", "虚栄心が強い", "勤勉"],
      fr: ["Confiant", "Perfectionniste", "Observateur", "Vaniteux", "Travailleur"],
      es: ["Confiado", "Perfeccionista", "Observador", "Vanidoso", "Trabajador"],
      zh: ["自信", "完美主義", "觀察力強", "自負", "勤奮"],
    },
    strengths: {
      ko: ["날카로운 분석력", "체계적인 사고", "뛰어난 시간 관리"],
      en: ["Sharp analysis", "Systematic thinking", "Excellent time management"],
      ja: ["鋭い分析力", "体系的な思考", "優れた時間管理"],
      fr: ["Analyse acérée", "Pensée systématique", "Excellente gestion du temps"],
      es: ["Análisis agudo", "Pensamiento sistemático", "Excelente gestión del tiempo"],
      zh: ["分析力敏锐", "思维有条理", "时间管理出色"],
    },
    weaknesses: {
      ko: ["지나친 비판", "자기 과신", "보수적 성향"],
      en: ["Overcritical", "Overconfident", "Conservative"],
      ja: ["批判しすぎる", "過信", "保守的傾向"],
      fr: ["Trop critique", "Trop confiant", "Conservateur"],
      es: ["Demasiado crítico", "Exceso de confianza", "Conservador"],
      zh: ["过度批评", "过度自信", "保守倾向"],
    },
    bestMatch: ["ox", "snake", "dragon"],
    worstMatch: ["rabbit", "dog"],
    luckyNumbers: [5, 7, 8],
    luckyColors: {
      ko: ["금색", "갈색", "노란색"],
      en: ["Gold", "Brown", "Yellow"],
      ja: ["金", "茶", "黄"],
      fr: ["Or", "Brun", "Jaune"],
      es: ["Dorado", "Marrón", "Amarillo"],
      zh: ["金色", "棕色", "黄色"],
    },
    career: {
      ko: "회계사, 의사, 외과의사, 군인, 탐험가에 적합합니다.",
      en: "Well-suited for accountants, doctors, surgeons, soldiers, and explorers.",
      ja: "会計士、医師、外科医、軍人、探検家に適しています。",
      fr: "Convient aux comptables, médecins, chirurgiens, soldats et explorateurs.",
      es: "Adecuado para contadores, médicos, cirujanos, soldados y exploradores.",
      zh: "适合会计师、医生、外科医生、军人和探险家。",
    },
    love: {
      ko: "소띠·뱀띠와 깊은 신뢰 관계를 맺습니다. 완벽주의를 조금 내려놓으면 관계가 더 행복해집니다.",
      en: "Deep trust with Ox and Snake. Letting go of perfectionism makes relationships happier.",
      ja: "牛年・蛇年と深い信頼関係。完璧主義を少し手放すと関係がより幸せになります。",
      fr: "Profonde confiance avec Bœuf et Serpent. Lâcher le perfectionnisme rend les relations plus heureuses.",
      es: "Profunda confianza con Buey y Serpiente. Soltar el perfeccionismo hace las relaciones más felices.",
      zh: "与牛年和蛇年建立深厚信任关系。放下一些完美主义会让关系更幸福。",
    },
    famous: ["Beyoncé", "Jennifer Aniston", "Catherine Zeta-Jones", "Yoko Ono"],
  },
  dog: {
    animal: "dog",
    emoji: "🐶",
    chineseChar: "狗",
    element: "earth",
    yin: false,
    years: [1910,1922,1934,1946,1958,1970,1982,1994,2006,2018,2030,2042],
    name: { ko: "개", en: "Dog", ja: "戌(イヌ)", fr: "Chien", es: "Perro", zh: "狗", },
    traits: {
      ko: ["충성심", "정의감", "용감함", "비관주의", "완고함"],
      en: ["Loyal", "Just", "Courageous", "Pessimistic", "Stubborn"],
      ja: ["忠実", "正義感がある", "勇敢", "悲観的", "頑固"],
      fr: ["Loyal", "Juste", "Courageux", "Pessimiste", "Têtu"],
      es: ["Leal", "Justo", "Valiente", "Pesimista", "Terco"],
      zh: ["忠誠", "有正義感", "勇敢", "悲觀", "固執"],
    },
    strengths: {
      ko: ["깊은 충성심", "공정한 판단력", "헌신적인 태도"],
      en: ["Deep loyalty", "Fair judgment", "Dedicated attitude"],
      ja: ["深い忠誠心", "公正な判断力", "献身的な態度"],
      fr: ["Profonde loyauté", "Jugement équitable", "Attitude dévouée"],
      es: ["Profunda lealtad", "Juicio justo", "Actitud dedicada"],
      zh: ["深厚的忠诚心", "公正的判断力", "奉献精神"],
    },
    weaknesses: {
      ko: ["지나친 걱정", "비판적 성향", "의심이 많음"],
      en: ["Excessive worry", "Critical nature", "Overly suspicious"],
      ja: ["過度な心配", "批判的傾向", "疑い深い"],
      fr: ["Inquiétude excessive", "Nature critique", "Trop méfiant"],
      es: ["Preocupación excesiva", "Naturaleza crítica", "Demasiado sospechoso"],
      zh: ["过度担忧", "批判性强", "过于多疑"],
    },
    bestMatch: ["tiger", "rabbit", "horse"],
    worstMatch: ["ox", "goat", "rooster", "dragon"],
    luckyNumbers: [3, 4, 9],
    luckyColors: {
      ko: ["초록색", "빨간색", "보라색"],
      en: ["Green", "Red", "Purple"],
      ja: ["緑", "赤", "紫"],
      fr: ["Vert", "Rouge", "Violet"],
      es: ["Verde", "Rojo", "Morado"],
      zh: ["綠色", "紅色", "紫色"],
    },
    career: {
      ko: "경찰관, 정치가, 사회사업가, 교사, 의사에 적합합니다.",
      en: "Well-suited for police, politicians, social workers, teachers, and doctors.",
      ja: "警察官、政治家、社会事業家、教師、医師に適しています。",
      fr: "Convient aux policiers, politiciens, travailleurs sociaux, enseignants et médecins.",
      es: "Adecuado para policías, políticos, trabajadores sociales, maestros y médicos.",
      zh: "適合警察、政治家、社會工作者、教師和醫生。",
    },
    love: {
      ko: "호랑이띠·토끼띠·말띠와 깊은 신뢰를 바탕으로 한 관계를 맺습니다. 파트너에게 충분한 신뢰를 보여주세요.",
      en: "Deep trust-based bond with Tiger, Rabbit, and Horse. Show enough trust to your partner.",
      ja: "虎年・兎年・馬年と深い信頼に基づく関係。パートナーに十分な信頼を見せましょう。",
      fr: "Lien de confiance profonde avec Tigre, Lapin et Cheval. Montrez assez de confiance à votre partenaire.",
      es: "Vínculo de confianza profunda con Tigre, Conejo y Caballo. Muestra suficiente confianza a tu pareja.",
      zh: "与虎年、兔年和马年建立基于深厚信任的关系。向伴侣展示足够的信任。",
    },
    famous: ["Michael Jackson", "Madonna", "Winston Churchill", "Elvis Presley"],
  },
  pig: {
    animal: "pig",
    emoji: "🐷",
    chineseChar: "豬",
    element: "water",
    yin: true,
    years: [1911,1923,1935,1947,1959,1971,1983,1995,2007,2019,2031,2043],
    name: { ko: "돼지", en: "Pig", ja: "亥(イノシシ)", fr: "Cochon", es: "Cerdo", zh: "豬", },
    traits: {
      ko: ["관대함", "성실함", "낙관주의", "순진함", "사교성"],
      en: ["Generous", "Sincere", "Optimistic", "Naive", "Sociable"],
      ja: ["寛大", "誠実", "楽観的", "純粋", "社交的"],
      fr: ["Généreux", "Sincère", "Optimiste", "Naïf", "Sociable"],
      es: ["Generoso", "Sincero", "Optimista", "Ingenuo", "Sociable"],
      zh: ["慷慨", "誠實", "樂觀", "天真", "社交性好"],
    },
    strengths: {
      ko: ["진심 어린 친절함", "낙천적 에너지", "강한 공동체 의식"],
      en: ["Genuine kindness", "Optimistic energy", "Strong community spirit"],
      ja: ["心からの親切さ", "楽観的なエネルギー", "強いコミュニティ意識"],
      fr: ["Gentillesse sincère", "Énergie optimiste", "Fort esprit communautaire"],
      es: ["Amabilidad genuina", "Energía optimista", "Fuerte espíritu comunitario"],
      zh: ["真诚的善意", "乐观的能量", "强烈的集体精神"],
    },
    weaknesses: {
      ko: ["지나친 순진함", "쉽게 속음", "지나친 관대함"],
      en: ["Overly naive", "Easily deceived", "Excessively generous"],
      ja: ["過度に純粋", "だまされやすい", "過度に寛大"],
      fr: ["Trop naïf", "Facilement trompé", "Trop généreux"],
      es: ["Demasiado ingenuo", "Fácilmente engañado", "Excesivamente generoso"],
      zh: ["过于天真", "容易被骗", "过度慷慨"],
    },
    bestMatch: ["tiger", "rabbit", "goat"],
    worstMatch: ["snake", "monkey"],
    luckyNumbers: [2, 5, 8],
    luckyColors: {
      ko: ["노란색", "회색", "갈색"],
      en: ["Yellow", "Grey", "Brown"],
      ja: ["黄", "灰", "茶"],
      fr: ["Jaune", "Gris", "Brun"],
      es: ["Amarillo", "Gris", "Marrón"],
      zh: ["黄色", "灰色", "棕色"],
    },
    career: {
      ko: "의사, 수의사, 교사, 예술가, 사업가에 적합합니다.",
      en: "Well-suited for doctors, vets, teachers, artists, and business people.",
      ja: "医師、獣医師、教師、芸術家、実業家に適しています。",
      fr: "Convient aux médecins, vétérinaires, enseignants, artistes et hommes d'affaires.",
      es: "Adecuado para médicos, veterinarios, maestros, artistas y personas de negocios.",
      zh: "适合医生、兽医、教师、艺术家和商业人士。",
    },
    love: {
      ko: "호랑이띠·토끼띠·양띠와 따뜻하고 진실된 관계를 맺습니다. 경계를 세우는 법도 배워야 합니다.",
      en: "Warm, genuine bond with Tiger, Rabbit, and Goat. Learning to set boundaries is important.",
      ja: "虎年・兎年・羊年と温かく真実の関係。境界線を設ける方法も学ぶ必要があります。",
      fr: "Lien chaleureux et authentique avec Tigre, Lapin et Chèvre. Apprendre à fixer des limites est important.",
      es: "Vínculo cálido y genuino con Tigre, Conejo y Cabra. Aprender a establecer límites es importante.",
      zh: "与虎年、兔年和羊年建立温暖真诚的关系。学会设定界限也很重要。",
    },
    famous: ["Dalai Lama", "Arnold Schwarzenegger", "Woody Allen", "Elton John"],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChineseZodiac({ locale }: Props) {
  const t = UI[locale] ?? UI.en;
  const [yearInput, setYearInput] = useState("");
  const [selected, setSelected] = useState<ZodiacAnimal | null>(null);
  const [yearElement, setYearElement] = useState<Element | null>(null);
  const [error, setError] = useState("");

  const handleFind = () => {
    const yr = parseInt(yearInput, 10);
    if (isNaN(yr) || yr < 1900 || yr > 2100) {
      setError(t.invalidYear);
      return;
    }
    setError("");
    const animal = getZodiacFromYear(yr);
    setSelected(animal);
    setYearElement(getElementFromYear(yr));
  };

  const handleSelect = (animal: ZodiacAnimal) => {
    setSelected(animal);
    setYearElement(null);
    setYearInput("");
  };

  const data = selected ? ZODIACS[selected] : null;
  const elemColors = data ? ELEMENT_COLORS[data.element] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-4xl">🐲</div>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-500 text-sm">{t.subtitle}</p>
      </div>

      {/* Year input */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
        <label className="text-sm font-medium text-gray-700">{t.enterYear}</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={yearInput}
            onChange={(e) => { setYearInput(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleFind()}
            placeholder={t.yearPlaceholder}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            min={1900}
            max={2100}
          />
          <button
            onClick={handleFind}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
          >
            {t.findBtn}
          </button>
        </div>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>

      {/* Browse grid */}
      <div>
        <p className="text-xs text-gray-500 mb-3 text-center">{t.orBrowse}</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {ZODIAC_ORDER.map((animal) => {
            const z = ZODIACS[animal];
            const isSelected = selected === animal;
            const c = ELEMENT_COLORS[z.element];
            return (
              <button
                key={animal}
                onClick={() => handleSelect(animal)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                  isSelected
                    ? `${c.bg} ${c.border} ring-2 ring-offset-1`
                    : "bg-white border-gray-100 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">{z.emoji}</span>
                <span className="text-xs text-gray-700">{z.name[locale]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result */}
      {data && elemColors && (
        <div className={`rounded-2xl border-2 ${elemColors.border} ${elemColors.bg} p-5 space-y-5`}>
          {/* Header */}
          <div className="flex items-center gap-4">
            <span className="text-5xl">{data.emoji}</span>
            <div className="space-y-1">
              <h2 className={`text-2xl font-black ${elemColors.text}`}>{data.name[locale]}</h2>
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${elemColors.badge}`}>
                  {data.chineseChar}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${elemColors.badge}`}>
                  {t.elements[data.element]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${elemColors.badge}`}>
                  {data.yin ? "☯ Yin" : "☯ Yang"}
                </span>
                {yearElement && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700`}>
                    {t.elementLabel}: {t.elements[yearElement]}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Years */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Years</p>
            <div className="flex flex-wrap gap-1">
              {data.years.map((y) => (
                <span key={y} className="text-xs bg-white bg-opacity-70 px-2 py-0.5 rounded-full text-gray-600 border border-white">
                  {y}
                </span>
              ))}
            </div>
          </div>

          {/* Traits */}
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${elemColors.text} opacity-70`}>{t.traitsLabel}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.traits[locale].map((trait) => (
                <span key={trait} className={`text-xs px-2.5 py-1 rounded-full font-medium ${elemColors.badge}`}>
                  {trait}
                </span>
              ))}
            </div>
          </div>

          {/* Strengths / Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white bg-opacity-60 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-600 mb-2">✅ {t.strengthsLabel}</p>
              <ul className="space-y-1">
                {data.strengths[locale].map((s) => (
                  <li key={s} className="text-xs text-gray-700">• {s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white bg-opacity-60 rounded-xl p-3">
              <p className="text-xs font-semibold text-rose-500 mb-2">⚠️ {t.weaknessesLabel}</p>
              <ul className="space-y-1">
                {data.weaknesses[locale].map((w) => (
                  <li key={w} className="text-xs text-gray-700">• {w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Compatibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white bg-opacity-60 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-600 mb-2">💚 {t.bestMatchLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {data.bestMatch.map((m) => {
                  const z = ZODIACS[m];
                  return (
                    <button
                      key={m}
                      onClick={() => handleSelect(m)}
                      className="flex items-center gap-1 text-xs bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 hover:bg-emerald-100 transition-colors"
                    >
                      {z.emoji} {z.name[locale]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="bg-white bg-opacity-60 rounded-xl p-3">
              <p className="text-xs font-semibold text-rose-500 mb-2">⚡ {t.worstMatchLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {data.worstMatch.map((m) => {
                  const z = ZODIACS[m];
                  return (
                    <button
                      key={m}
                      onClick={() => handleSelect(m)}
                      className="flex items-center gap-1 text-xs bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 hover:bg-rose-100 transition-colors"
                    >
                      {z.emoji} {z.name[locale]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Lucky */}
          <div className="bg-white bg-opacity-60 rounded-xl p-3">
            <p className={`text-xs font-semibold mb-2 ${elemColors.text}`}>🍀 {t.luckyLabel}</p>
            <div className="flex flex-wrap gap-4 text-xs text-gray-700">
              <span>🔢 {data.luckyNumbers.join(", ")}</span>
              <span>🎨 {data.luckyColors[locale].join(", ")}</span>
            </div>
          </div>

          {/* Career / Love */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white bg-opacity-60 rounded-xl p-3">
              <p className={`text-xs font-semibold mb-1 ${elemColors.text}`}>💼 {t.careerLabel}</p>
              <p className="text-xs text-gray-700 leading-relaxed">{data.career[locale]}</p>
            </div>
            <div className="bg-white bg-opacity-60 rounded-xl p-3">
              <p className={`text-xs font-semibold mb-1 ${elemColors.text}`}>💕 {t.loveLabel}</p>
              <p className="text-xs text-gray-700 leading-relaxed">{data.love[locale]}</p>
            </div>
          </div>

          {/* Famous */}
          <div className="bg-white bg-opacity-60 rounded-xl p-3">
            <p className={`text-xs font-semibold mb-2 ${elemColors.text}`}>⭐ {t.famousLabel}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.famous.map((f) => (
                <span key={f} className="text-xs bg-white px-2 py-0.5 rounded-full border text-gray-600">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
