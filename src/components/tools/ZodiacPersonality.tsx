import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type ZodiacKey =
  | "aries" | "taurus" | "gemini" | "cancer"
  | "leo" | "virgo" | "libra" | "scorpio"
  | "sagittarius" | "capricorn" | "aquarius" | "pisces";

const UI: Record<Locale, {
  title: string;
  subtitle: string;
  selectPrompt: string;
  orEnterBirthday: string;
  birthdayLabel: string;
  lookupBtn: string;
  traitsLabel: string;
  strengthsLabel: string;
  weaknessesLabel: string;
  compatibilityLabel: string;
  elementLabel: string;
  rulerLabel: string;
  dateRangeLabel: string;
  resetBtn: string;
  disclaimer: string;
}> = {
  ko: {
    title: "별자리 성격 분석",
    subtitle: "12별자리로 알아보는 성격·강점·약점·궁합",
    selectPrompt: "별자리를 선택하세요",
    orEnterBirthday: "또는 생일로 찾기",
    birthdayLabel: "생년월일",
    lookupBtn: "별자리 찾기",
    traitsLabel: "성격 특성",
    strengthsLabel: "강점",
    weaknessesLabel: "약점",
    compatibilityLabel: "궁합",
    elementLabel: "원소",
    rulerLabel: "지배 행성",
    dateRangeLabel: "날짜 범위",
    resetBtn: "다시 선택",
    disclaimer: "별자리 성격 분석은 오락 목적으로만 제공됩니다.",
  },
  en: {
    title: "Zodiac Personality",
    subtitle: "Personality, strengths, weaknesses & compatibility for all 12 signs",
    selectPrompt: "Select your zodiac sign",
    orEnterBirthday: "Or find by birthday",
    birthdayLabel: "Date of Birth",
    lookupBtn: "Find My Sign",
    traitsLabel: "Personality Traits",
    strengthsLabel: "Strengths",
    weaknessesLabel: "Weaknesses",
    compatibilityLabel: "Compatibility",
    elementLabel: "Element",
    rulerLabel: "Ruling Planet",
    dateRangeLabel: "Date Range",
    resetBtn: "Choose Again",
    disclaimer: "Zodiac personality analysis is for entertainment purposes only.",
  },
  ja: {
    title: "星座性格分析",
    subtitle: "12星座で性格・強み・弱み・相性を分析",
    selectPrompt: "星座を選んでください",
    orEnterBirthday: "または誕生日から探す",
    birthdayLabel: "生年月日",
    lookupBtn: "星座を探す",
    traitsLabel: "性格特徴",
    strengthsLabel: "強み",
    weaknessesLabel: "弱み",
    compatibilityLabel: "相性",
    elementLabel: "元素",
    rulerLabel: "支配星",
    dateRangeLabel: "日付範囲",
    resetBtn: "もう一度選ぶ",
    disclaimer: "星座性格分析はエンタメ目的のみです。",
  },
  fr: {
    title: "Personnalité Astrologique",
    subtitle: "Personnalité, forces, faiblesses et compatibilités des 12 signes",
    selectPrompt: "Sélectionnez votre signe",
    orEnterBirthday: "Ou trouver par date de naissance",
    birthdayLabel: "Date de naissance",
    lookupBtn: "Trouver mon signe",
    traitsLabel: "Traits de personnalité",
    strengthsLabel: "Forces",
    weaknessesLabel: "Faiblesses",
    compatibilityLabel: "Compatibilité",
    elementLabel: "Élément",
    rulerLabel: "Planète gouvernante",
    dateRangeLabel: "Plage de dates",
    resetBtn: "Choisir à nouveau",
    disclaimer: "L'analyse de personnalité astrologique est uniquement à des fins de divertissement.",
  },
  es: {
    title: "Personalidad del Zodíaco",
    subtitle: "Personalidad, fortalezas, debilidades y compatibilidad de los 12 signos",
    selectPrompt: "Selecciona tu signo zodiacal",
    orEnterBirthday: "O buscar por fecha de nacimiento",
    birthdayLabel: "Fecha de nacimiento",
    lookupBtn: "Encontrar mi signo",
    traitsLabel: "Rasgos de personalidad",
    strengthsLabel: "Fortalezas",
    weaknessesLabel: "Debilidades",
    compatibilityLabel: "Compatibilidad",
    elementLabel: "Elemento",
    rulerLabel: "Planeta regente",
    dateRangeLabel: "Rango de fechas",
    resetBtn: "Elegir de nuevo",
    disclaimer: "El análisis de personalidad zodiacal es solo para entretenimiento.",
  },
  zh: {
    title: "星座性格分析",
    subtitle: "12星座的性格、优势、弱点和相容性",
    selectPrompt: "选择你的星座",
    orEnterBirthday: "或通过生日查询",
    birthdayLabel: "出生日期",
    lookupBtn: "找我的星座",
    traitsLabel: "性格特征",
    strengthsLabel: "优势",
    weaknessesLabel: "弱点",
    compatibilityLabel: "相容性",
    elementLabel: "元素",
    rulerLabel: "守护星",
    dateRangeLabel: "日期范围",
    resetBtn: "重新选择",
    disclaimer: "星座性格分析仅供娱乐目的。",
  },
};

type Element = "fire" | "earth" | "air" | "water";

const ELEMENT_LABEL: Record<Element, Record<Locale, string>> = {
  fire:  { ko: "🔥 불", en: "🔥 Fire",  ja: "🔥 火", fr: "🔥 Feu",  es: "🔥 Fuego", zh: "🔥 火", },
  earth: { ko: "🌍 흙", en: "🌍 Earth", ja: "🌍 土", fr: "🌍 Terre", es: "🌍 Tierra", zh: "🌍 土", },
  air:   { ko: "💨 공기", en: "💨 Air", ja: "💨 風", fr: "💨 Air",   es: "💨 Aire",  zh: "💨 風", },
  water: { ko: "💧 물", en: "💧 Water", ja: "💧 水", fr: "💧 Eau",   es: "💧 Agua",  zh: "💧 水", },
};

const ELEMENT_BG: Record<Element, string> = {
  fire:  "bg-orange-50 border-orange-200",
  earth: "bg-green-50 border-green-200",
  air:   "bg-sky-50 border-sky-200",
  water: "bg-blue-50 border-blue-200",
};

const ELEMENT_COLOR: Record<Element, string> = {
  fire:  "text-orange-700",
  earth: "text-green-700",
  air:   "text-sky-700",
  water: "text-blue-700",
};

interface ZodiacData {
  emoji: string;
  element: Element;
  ruler: Record<Locale, string>;
  dateRange: Record<Locale, string>;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  traits: Record<Locale, string[]>;
  strengths: Record<Locale, string[]>;
  weaknesses: Record<Locale, string[]>;
  bestMatch: ZodiacKey[];
  challenging: ZodiacKey[];
}

const ZODIAC: Record<ZodiacKey, ZodiacData> = {
  aries: {
    emoji: "♈",
    element: "fire",
    ruler: { ko: "화성", en: "Mars", ja: "火星", fr: "Mars", es: "Marte", zh: "火星", },
    dateRange: { ko: "3월 21일 – 4월 19일", en: "Mar 21 – Apr 19", ja: "3月21日 – 4月19日", fr: "21 mar – 19 avr", es: "21 mar – 19 abr", zh: "3月21日 – 4月19日", },
    name: { ko: "양자리", en: "Aries", ja: "牡羊座", fr: "Bélier", es: "Aries", zh: "牡羊座", },
    description: {
      ko: "양자리는 열정적이고 용감한 개척자입니다. 새로운 도전을 두려워하지 않으며 타고난 리더십으로 주변을 이끌어갑니다.",
      en: "Aries is a passionate, courageous pioneer. They fearlessly embrace new challenges and lead others with natural confidence.",
      ja: "牡羊座は情熱的で勇敢な開拓者です。新たな挑戦を恐れず、生まれながらのリーダーシップで周囲を引っ張ります。",
      fr: "Le Bélier est un pionnier passionné et courageux. Il affronte les nouveaux défis sans peur et guide les autres avec un leadership naturel.",
      es: "Aries es un pionero apasionado y valiente. Abraza los nuevos desafíos sin miedo y lidera a los demás con confianza natural.",
      zh: "白羊座是充满热情、勇敢的开拓者。不惧新挑战，以天生的领导力引领他人。",
    },
    traits: {
      ko: ["열정적", "용감함", "자신감", "직접적", "경쟁심", "충동적", "독립적"],
      en: ["Passionate", "Brave", "Confident", "Direct", "Competitive", "Impulsive", "Independent"],
      ja: ["情熱的", "勇敢", "自信家", "直接的", "競争心", "衝動的", "独立的"],
      fr: ["Passionné", "Courageux", "Confiant", "Direct", "Compétitif", "Impulsif", "Indépendant"],
      es: ["Apasionado", "Valiente", "Confiado", "Directo", "Competitivo", "Impulsivo", "Independiente"],
      zh: ["热情", "勇敢", "自信", "直接", "好胜", "冲动", "独立"],
    },
    strengths: {
      ko: ["강한 추진력", "리더십", "용기", "빠른 결단력", "열정"],
      en: ["Drive", "Leadership", "Courage", "Quick decision-making", "Passion"],
      ja: ["強い推進力", "リーダーシップ", "勇気", "素早い決断力", "情熱"],
      fr: ["Détermination", "Leadership", "Courage", "Décision rapide", "Passion"],
      es: ["Determinación", "Liderazgo", "Valentía", "Toma de decisiones rápida", "Pasión"],
      zh: ["强大驱动力", "领导力", "勇气", "快速决断", "热情"],
    },
    weaknesses: {
      ko: ["성급함", "이기적 경향", "끈기 부족", "공격적", "자기중심적"],
      en: ["Impatience", "Self-centered tendencies", "Lack of persistence", "Aggression", "Egotism"],
      ja: ["せっかち", "自己中心的傾向", "継続力不足", "攻撃的", "エゴイズム"],
      fr: ["Impatience", "Tendances égoïstes", "Manque de persévérance", "Agressivité", "Égocentrisme"],
      es: ["Impaciencia", "Tendencias egoístas", "Falta de persistencia", "Agresividad", "Egoísmo"],
      zh: ["急躁", "以自我为中心", "缺乏坚持", "攻击性", "自我主义"],
    },
    bestMatch: ["leo", "sagittarius", "gemini", "aquarius"],
    challenging: ["cancer", "capricorn"],
  },
  taurus: {
    emoji: "♉",
    element: "earth",
    ruler: { ko: "금성", en: "Venus", ja: "金星", fr: "Vénus", es: "Venus", zh: "金星", },
    dateRange: { ko: "4월 20일 – 5월 20일", en: "Apr 20 – May 20", ja: "4月20日 – 5月20日", fr: "20 avr – 20 mai", es: "20 abr – 20 may", zh: "4月20日 – 5月20日", },
    name: { ko: "황소자리", en: "Taurus", ja: "牡牛座", fr: "Taureau", es: "Tauro", zh: "金牛座", },
    description: {
      ko: "황소자리는 믿음직스럽고 안정을 추구하는 실용주의자입니다. 한번 결정한 일은 끝까지 해내는 강한 의지와 인내심을 가집니다.",
      en: "Taurus is a reliable, stability-seeking pragmatist. They possess remarkable willpower and patience to see things through to the end.",
      ja: "牡牛座は信頼できる安定志向の実用主義者です。一度決めたことは最後までやり遂げる強い意志と忍耐力を持っています。",
      fr: "Le Taureau est un pragmatique fiable qui recherche la stabilité. Il possède une volonté et une patience remarquables pour mener les choses à bien.",
      es: "Tauro es un pragmático confiable que busca la estabilidad. Posee una notable fuerza de voluntad y paciencia para llevar las cosas a término.",
      zh: "金牛座是可靠、追求穩定的實用主義者。一旦決定的事，會以強大的意志力和耐心貫徹始終。",
    },
    traits: {
      ko: ["신뢰성", "인내심", "실용적", "고집스러움", "감각적", "물질적", "충성스러움"],
      en: ["Reliable", "Patient", "Practical", "Stubborn", "Sensual", "Materialistic", "Loyal"],
      ja: ["信頼性", "忍耐力", "実用的", "頑固", "感覚的", "物質的", "忠実"],
      fr: ["Fiable", "Patient", "Pratique", "Têtu", "Sensuel", "Matérialiste", "Loyal"],
      es: ["Confiable", "Paciente", "Práctico", "Terco", "Sensual", "Materialista", "Leal"],
      zh: ["可靠", "耐心", "實用", "固執", "感官享受", "物質主義", "忠誠"],
    },
    strengths: {
      ko: ["강한 인내심", "신뢰성", "실용적 판단력", "예술적 감각", "재정 관리"],
      en: ["Perseverance", "Reliability", "Practical judgment", "Artistic sense", "Financial management"],
      ja: ["強い忍耐力", "信頼性", "実用的判断力", "芸術的センス", "財務管理"],
      fr: ["Persévérance", "Fiabilité", "Jugement pratique", "Sens artistique", "Gestion financière"],
      es: ["Perseverancia", "Confiabilidad", "Juicio práctico", "Sentido artístico", "Gestión financiera"],
      zh: ["强大耐心", "可靠性", "实用判断力", "艺术感", "财务管理"],
    },
    weaknesses: {
      ko: ["고집스러움", "변화 저항", "소유욕", "게으름", "물질주의"],
      en: ["Stubbornness", "Resistance to change", "Possessiveness", "Laziness", "Materialism"],
      ja: ["頑固", "変化への抵抗", "独占欲", "怠惰", "物質主義"],
      fr: ["Entêtement", "Résistance au changement", "Possessivité", "Paresse", "Matérialisme"],
      es: ["Terquedad", "Resistencia al cambio", "Posesividad", "Pereza", "Materialismo"],
      zh: ["固執", "抗拒改變", "佔有慾", "懶惰", "物質主義"],
    },
    bestMatch: ["virgo", "capricorn", "cancer", "pisces"],
    challenging: ["leo", "aquarius"],
  },
  gemini: {
    emoji: "♊",
    element: "air",
    ruler: { ko: "수성", en: "Mercury", ja: "水星", fr: "Mercure", es: "Mercurio", zh: "水星", },
    dateRange: { ko: "5월 21일 – 6월 20일", en: "May 21 – Jun 20", ja: "5月21日 – 6月20日", fr: "21 mai – 20 juin", es: "21 may – 20 jun", zh: "5月21日 – 6月20日", },
    name: { ko: "쌍둥이자리", en: "Gemini", ja: "双子座", fr: "Gémeaux", es: "Géminis", zh: "雙子座", },
    description: {
      ko: "쌍둥이자리는 호기심 넘치는 커뮤니케이터입니다. 다양한 관심사와 빠른 두뇌회전으로 어떤 상황에서도 유연하게 적응합니다.",
      en: "Gemini is a curious, quick-witted communicator. Their wide-ranging interests and sharp mind allow them to adapt flexibly to any situation.",
      ja: "双子座は好奇心旺盛なコミュニケーターです。多様な興味と素早い頭の回転で、どんな状況にも柔軟に適応します。",
      fr: "Les Gémeaux sont des communicants curieux et vifs d'esprit. Leurs intérêts variés et leur esprit acéré leur permettent de s'adapter à toute situation.",
      es: "Géminis es un comunicador curioso y perspicaz. Sus amplios intereses y mente aguda le permiten adaptarse a cualquier situación.",
      zh: "双子座是充满好奇心的沟通达人。广泛的兴趣和敏捷的头脑让他们能灵活应对任何情况。",
    },
    traits: {
      ko: ["호기심", "말재주", "이중성", "적응력", "지적", "변덕스러움", "사교적"],
      en: ["Curious", "Eloquent", "Dual nature", "Adaptable", "Intellectual", "Inconsistent", "Sociable"],
      ja: ["好奇心", "話術", "二面性", "適応力", "知的", "気まぐれ", "社交的"],
      fr: ["Curieux", "Éloquent", "Double nature", "Adaptable", "Intellectuel", "Inconstant", "Sociable"],
      es: ["Curioso", "Elocuente", "Doble naturaleza", "Adaptable", "Intelectual", "Inconstante", "Sociable"],
      zh: ["好奇心强", "口才好", "双重性格", "适应力强", "聪明", "善变", "善于社交"],
    },
    strengths: {
      ko: ["뛰어난 커뮤니케이션", "빠른 학습력", "유연한 사고", "사교성", "창의력"],
      en: ["Communication", "Fast learning", "Flexible thinking", "Sociability", "Creativity"],
      ja: ["優れたコミュニケーション", "素早い学習力", "柔軟な思考", "社交性", "創造力"],
      fr: ["Communication", "Apprentissage rapide", "Pensée flexible", "Sociabilité", "Créativité"],
      es: ["Comunicación", "Aprendizaje rápido", "Pensamiento flexible", "Sociabilidad", "Creatividad"],
      zh: ["出色沟通能力", "快速学习", "灵活思维", "社交能力", "创造力"],
    },
    weaknesses: {
      ko: ["우유부단", "집중력 부족", "변덕", "피상적", "불안정"],
      en: ["Indecisiveness", "Short attention span", "Moodiness", "Superficiality", "Restlessness"],
      ja: ["優柔不断", "集中力不足", "気まぐれ", "表面的", "不安定"],
      fr: ["Indécision", "Manque de concentration", "Inconstance", "Superficialité", "Agitation"],
      es: ["Indecisión", "Poca concentración", "Inconstancia", "Superficialidad", "Inquietud"],
      zh: ["优柔寡断", "注意力不集中", "情绪化", "肤浅", "不稳定"],
    },
    bestMatch: ["libra", "aquarius", "aries", "leo"],
    challenging: ["virgo", "pisces"],
  },
  cancer: {
    emoji: "♋",
    element: "water",
    ruler: { ko: "달", en: "Moon", ja: "月", fr: "Lune", es: "Luna", zh: "月亮", },
    dateRange: { ko: "6월 21일 – 7월 22일", en: "Jun 21 – Jul 22", ja: "6月21日 – 7月22日", fr: "21 juin – 22 juil", es: "21 jun – 22 jul", zh: "6月21日 – 7月22日", },
    name: { ko: "게자리", en: "Cancer", ja: "蟹座", fr: "Cancer", es: "Cáncer", zh: "巨蟹座", },
    description: {
      ko: "게자리는 직관적이고 공감 능력이 뛰어난 양육자입니다. 가족과 가까운 사람들을 위해 헌신하며 깊은 감정적 유대를 맺습니다.",
      en: "Cancer is an intuitive, empathetic nurturer. They are deeply devoted to family and close ones, forming profound emotional bonds.",
      ja: "蟹座は直感的で共感力の高い養育者です。家族や親しい人のために献身し、深い感情的絆を結びます。",
      fr: "Le Cancer est un nourricier intuitif et empathique. Il se consacre profondément à sa famille et ses proches, formant des liens émotionnels profonds.",
      es: "Cáncer es un cuidador intuitivo y empático. Está profundamente dedicado a la familia y los seres queridos, formando vínculos emocionales profundos.",
      zh: "巨蟹座是直觉敏锐、富有同理心的照顾者。对家人和亲近的人充满奉献精神，能建立深厚的情感纽带。",
    },
    traits: {
      ko: ["감성적", "직관적", "보호적", "변덕스러움", "충성스러움", "집착적", "상상력 풍부"],
      en: ["Emotional", "Intuitive", "Protective", "Moody", "Loyal", "Clingy", "Imaginative"],
      ja: ["感情的", "直感的", "保護的", "気分屋", "忠実", "執着", "想像力豊か"],
      fr: ["Émotionnel", "Intuitif", "Protecteur", "Lunatique", "Loyal", "Collant", "Imaginatif"],
      es: ["Emocional", "Intuitivo", "Protector", "Cambiante", "Leal", "Apegado", "Imaginativo"],
      zh: ["感性", "直觉", "保护性", "情绪化", "忠诚", "依恋", "想象力丰富"],
    },
    strengths: {
      ko: ["깊은 공감 능력", "충성심", "직관력", "창의성", "강한 기억력"],
      en: ["Deep empathy", "Loyalty", "Intuition", "Creativity", "Strong memory"],
      ja: ["深い共感能力", "忠誠心", "直感力", "創造性", "強い記憶力"],
      fr: ["Empathie profonde", "Loyauté", "Intuition", "Créativité", "Mémoire forte"],
      es: ["Empatía profunda", "Lealtad", "Intuición", "Creatividad", "Memoria fuerte"],
      zh: ["深刻的同理心", "忠诚", "直觉力", "创造力", "记忆力强"],
    },
    weaknesses: {
      ko: ["과민 반응", "집착", "소극적", "자기연민", "감정 기복"],
      en: ["Over-sensitivity", "Clinginess", "Passivity", "Self-pity", "Mood swings"],
      ja: ["過敏反応", "執着", "消極的", "自己憐憫", "感情の起伏"],
      fr: ["Hypersensibilité", "Dépendance", "Passivité", "Apitoiement", "Sautes d'humeur"],
      es: ["Hipersensibilidad", "Dependencia", "Pasividad", "Autocompasión", "Cambios de humor"],
      zh: ["过度敏感", "执着", "消极", "自怜", "情绪波动"],
    },
    bestMatch: ["scorpio", "pisces", "taurus", "virgo"],
    challenging: ["aries", "libra"],
  },
  leo: {
    emoji: "♌",
    element: "fire",
    ruler: { ko: "태양", en: "Sun", ja: "太陽", fr: "Soleil", es: "Sol", zh: "太陽", },
    dateRange: { ko: "7월 23일 – 8월 22일", en: "Jul 23 – Aug 22", ja: "7月23日 – 8月22日", fr: "23 juil – 22 août", es: "23 jul – 22 ago", zh: "7月23日 – 8月22日", },
    name: { ko: "사자자리", en: "Leo", ja: "獅子座", fr: "Lion", es: "Leo", zh: "獅子座", },
    description: {
      ko: "사자자리는 카리스마 넘치는 타고난 스타입니다. 무대 중심에서 빛나며, 주변 사람들에게 따뜻함과 영감을 나눠줍니다.",
      en: "Leo is a charismatic, natural-born star. They shine at the center of attention, radiating warmth and inspiration to those around them.",
      ja: "獅子座はカリスマあふれる生まれながらのスターです。舞台の中心で輝き、周囲に温かさとインスピレーションを与えます。",
      fr: "Le Lion est une star charismatique née. Il brille au centre de l'attention, rayonnant chaleur et inspiration autour de lui.",
      es: "Leo es una estrella carismática nata. Brilla en el centro de atención, irradiando calidez e inspiración a quienes lo rodean.",
      zh: "狮子座是魅力十足的天生明星。在舞台中央闪耀，向周围的人散发温暖和灵感。",
    },
    traits: {
      ko: ["카리스마", "자신감", "관대함", "자존심 강함", "열정적", "드라마틱", "리더십"],
      en: ["Charismatic", "Confident", "Generous", "Proud", "Passionate", "Dramatic", "Leader"],
      ja: ["カリスマ", "自信家", "寛大", "プライドが高い", "情熱的", "ドラマチック", "リーダー"],
      fr: ["Charismatique", "Confiant", "Généreux", "Fier", "Passionné", "Dramatique", "Leader"],
      es: ["Carismático", "Confiado", "Generoso", "Orgulloso", "Apasionado", "Dramático", "Líder"],
      zh: ["魅力四射", "自信", "慷慨", "自尊心強", "熱情", "戲劇性", "領導力"],
    },
    strengths: {
      ko: ["카리스마와 리더십", "창의력", "관대함", "용기", "격려 능력"],
      en: ["Charisma & leadership", "Creativity", "Generosity", "Courage", "Ability to inspire"],
      ja: ["カリスマとリーダーシップ", "創造力", "寛大さ", "勇気", "鼓舞する能力"],
      fr: ["Charisme et leadership", "Créativité", "Générosité", "Courage", "Capacité à inspirer"],
      es: ["Carisma y liderazgo", "Creatividad", "Generosidad", "Valentía", "Capacidad de inspirar"],
      zh: ["魅力与领导力", "创造力", "慷慨", "勇气", "激励他人的能力"],
    },
    weaknesses: {
      ko: ["오만함", "관심 집착", "고집", "지배적", "자기중심적"],
      en: ["Arrogance", "Attention-seeking", "Stubbornness", "Dominance", "Self-centeredness"],
      ja: ["傲慢さ", "注目欲求", "頑固", "支配的", "自己中心"],
      fr: ["Arrogance", "Besoin d'attention", "Entêtement", "Dominance", "Égocentrisme"],
      es: ["Arrogancia", "Búsqueda de atención", "Terquedad", "Dominancia", "Egocentrismo"],
      zh: ["傲慢", "渴望关注", "固执", "强势", "以自我为中心"],
    },
    bestMatch: ["aries", "sagittarius", "gemini", "libra"],
    challenging: ["taurus", "scorpio"],
  },
  virgo: {
    emoji: "♍",
    element: "earth",
    ruler: { ko: "수성", en: "Mercury", ja: "水星", fr: "Mercure", es: "Mercurio", zh: "水星", },
    dateRange: { ko: "8월 23일 – 9월 22일", en: "Aug 23 – Sep 22", ja: "8月23日 – 9月22日", fr: "23 août – 22 sep", es: "23 ago – 22 sep", zh: "8月23日 – 9月22日", },
    name: { ko: "처녀자리", en: "Virgo", ja: "乙女座", fr: "Vierge", es: "Virgo", zh: "处女座", },
    description: {
      ko: "처녀자리는 분석적이고 꼼꼼한 완벽주의자입니다. 실용적인 해결책을 찾는 데 뛰어나며, 타인을 위해 헌신적으로 봉사합니다.",
      en: "Virgo is an analytical, meticulous perfectionist. They excel at finding practical solutions and are dedicated to serving others.",
      ja: "乙女座は分析的で几帳面な完璧主義者です。実用的な解決策を見つけるのが得意で、他者のために献身的に奉仕します。",
      fr: "La Vierge est un perfectionniste analytique et méticuleux. Excellent à trouver des solutions pratiques, il se consacre au service des autres.",
      es: "Virgo es un perfeccionista analítico y meticuloso. Excelente para encontrar soluciones prácticas, se dedica al servicio de los demás.",
      zh: "处女座是分析型的一丝不苟完美主义者。擅长找出实际解决方案，并全心奉献服务他人。",
    },
    traits: {
      ko: ["분석적", "꼼꼼함", "실용적", "비판적", "봉사정신", "겸손함", "완벽주의"],
      en: ["Analytical", "Meticulous", "Practical", "Critical", "Service-oriented", "Modest", "Perfectionist"],
      ja: ["分析的", "几帳面", "実用的", "批判的", "奉仕精神", "謙虚", "完璧主義"],
      fr: ["Analytique", "Méticuleux", "Pratique", "Critique", "Serviable", "Modeste", "Perfectionniste"],
      es: ["Analítico", "Meticuloso", "Práctico", "Crítico", "Servicial", "Modesto", "Perfeccionista"],
      zh: ["分析型", "一丝不苟", "实用", "批判性", "服务精神", "谦逊", "完美主义"],
    },
    strengths: {
      ko: ["세심한 분석력", "문제 해결 능력", "신뢰성", "헌신적 봉사", "실용적 지혜"],
      en: ["Keen analysis", "Problem-solving", "Reliability", "Dedicated service", "Practical wisdom"],
      ja: ["細やかな分析力", "問題解決能力", "信頼性", "献身的奉仕", "実用的知恵"],
      fr: ["Analyse fine", "Résolution de problèmes", "Fiabilité", "Service dévoué", "Sagesse pratique"],
      es: ["Análisis agudo", "Resolución de problemas", "Confiabilidad", "Servicio dedicado", "Sabiduría práctica"],
      zh: ["细腻分析力", "解决问题能力", "可靠性", "尽心服务", "实用智慧"],
    },
    weaknesses: {
      ko: ["과도한 비판", "걱정이 많음", "완벽주의 집착", "우유부단", "내향적 고립"],
      en: ["Over-criticism", "Excessive worry", "Perfectionism fixation", "Indecisiveness", "Introversion"],
      ja: ["過度な批判", "心配しすぎ", "完璧主義への執着", "優柔不断", "内向的孤立"],
      fr: ["Sur-critique", "Inquiétude excessive", "Fixation perfectionniste", "Indécision", "Isolement"],
      es: ["Exceso de crítica", "Preocupación excesiva", "Fijación perfeccionista", "Indecisión", "Aislamiento"],
      zh: ["过度批评", "过于担忧", "完美主义执念", "优柔寡断", "内向孤立"],
    },
    bestMatch: ["taurus", "capricorn", "cancer", "scorpio"],
    challenging: ["gemini", "sagittarius"],
  },
  libra: {
    emoji: "♎",
    element: "air",
    ruler: { ko: "금성", en: "Venus", ja: "金星", fr: "Vénus", es: "Venus", zh: "金星", },
    dateRange: { ko: "9월 23일 – 10월 22일", en: "Sep 23 – Oct 22", ja: "9月23日 – 10月22日", fr: "23 sep – 22 oct", es: "23 sep – 22 oct", zh: "9月23日 – 10月22日", },
    name: { ko: "천칭자리", en: "Libra", ja: "天秤座", fr: "Balance", es: "Libra", zh: "天秤座", },
    description: {
      ko: "천칭자리는 조화와 균형을 추구하는 외교관입니다. 아름다움에 대한 탁월한 안목과 타인과의 공정한 관계를 중시합니다.",
      en: "Libra is a diplomat who seeks harmony and balance. They have exceptional aesthetic taste and prioritize fair, equal relationships.",
      ja: "天秤座は調和とバランスを求める外交官です。美に対する卓越した審美眼と、公正な人間関係を大切にします。",
      fr: "La Balance est un diplomate qui recherche l'harmonie et l'équilibre. Elle possède un goût esthétique exceptionnel et valorise les relations justes.",
      es: "Libra es un diplomático que busca la armonía y el equilibrio. Tiene un gusto estético excepcional y prioriza relaciones justas e igualitarias.",
      zh: "天秤座是追求和谐与平衡的外交家。拥有卓越的审美品味，重视公平平等的人际关系。",
    },
    traits: {
      ko: ["공평함", "외교적", "우아함", "사교적", "우유부단", "이상주의", "협력적"],
      en: ["Fair", "Diplomatic", "Elegant", "Sociable", "Indecisive", "Idealistic", "Cooperative"],
      ja: ["公平", "外交的", "優雅", "社交的", "優柔不断", "理想主義", "協力的"],
      fr: ["Équitable", "Diplomatique", "Élégant", "Sociable", "Indécis", "Idéaliste", "Coopératif"],
      es: ["Justo", "Diplomático", "Elegante", "Sociable", "Indeciso", "Idealista", "Cooperativo"],
      zh: ["公平", "外交手腕", "优雅", "善于社交", "优柔寡断", "理想主义", "合作精神"],
    },
    strengths: {
      ko: ["뛰어난 협상력", "미적 감각", "공정한 판단", "사교성", "갈등 조율"],
      en: ["Negotiation skills", "Aesthetic sense", "Fair judgment", "Sociability", "Conflict resolution"],
      ja: ["優れた交渉力", "美的センス", "公正な判断", "社交性", "対立調整"],
      fr: ["Capacité de négociation", "Sens esthétique", "Jugement juste", "Sociabilité", "Résolution des conflits"],
      es: ["Habilidad de negociación", "Sentido estético", "Juicio justo", "Sociabilidad", "Resolución de conflictos"],
      zh: ["出色的协商能力", "审美感", "公正判断", "社交能力", "冲突调解"],
    },
    weaknesses: {
      ko: ["우유부단", "갈등 회피", "자기 비하", "의존적", "표면적 관계"],
      en: ["Indecisiveness", "Conflict avoidance", "Self-doubt", "Dependence", "Superficiality"],
      ja: ["優柔不断", "葛藤回避", "自己卑下", "依存的", "表面的な関係"],
      fr: ["Indécision", "Évitement des conflits", "Manque de confiance", "Dépendance", "Superficialité"],
      es: ["Indecisión", "Evitar conflictos", "Duda personal", "Dependencia", "Superficialidad"],
      zh: ["优柔寡断", "回避冲突", "自我怀疑", "依赖性", "肤浅的关系"],
    },
    bestMatch: ["gemini", "aquarius", "leo", "sagittarius"],
    challenging: ["cancer", "capricorn"],
  },
  scorpio: {
    emoji: "♏",
    element: "water",
    ruler: { ko: "명왕성/화성", en: "Pluto / Mars", ja: "冥王星・火星", fr: "Pluton / Mars", es: "Plutón / Marte", zh: "冥王星/火星", },
    dateRange: { ko: "10월 23일 – 11월 21일", en: "Oct 23 – Nov 21", ja: "10月23日 – 11月21日", fr: "23 oct – 21 nov", es: "23 oct – 21 nov", zh: "10月23日 – 11月21日", },
    name: { ko: "전갈자리", en: "Scorpio", ja: "蠍座", fr: "Scorpion", es: "Escorpio", zh: "天蠍座", },
    description: {
      ko: "전갈자리는 강렬하고 신비로운 탐구자입니다. 깊은 감정과 날카로운 통찰력으로 인생의 본질을 꿰뚫어 봅니다.",
      en: "Scorpio is an intense, mysterious investigator. Their deep emotions and sharp insight allow them to pierce the heart of any matter.",
      ja: "蠍座は強烈で神秘的な探究者です。深い感情と鋭い洞察力で、物事の本質を見抜きます。",
      fr: "Le Scorpion est un investigateur intense et mystérieux. Ses émotions profondes et son intuition aiguë lui permettent de percer l'essence de toute chose.",
      es: "Escorpio es un investigador intenso y misterioso. Sus profundas emociones y aguda perspicacia le permiten penetrar en el corazón de cualquier asunto.",
      zh: "天蠍座是強烈而神秘的探索者。深邃的情感和敏銳的洞察力讓他們能看穿事物的本質。",
    },
    traits: {
      ko: ["강렬함", "직관적", "비밀스러움", "의지력 강함", "집착적", "충성스러움", "복수심"],
      en: ["Intense", "Intuitive", "Secretive", "Strong-willed", "Obsessive", "Loyal", "Vengeful"],
      ja: ["強烈", "直感的", "秘密主義", "意志が強い", "執着", "忠実", "復讐心"],
      fr: ["Intense", "Intuitif", "Mystérieux", "Volontaire", "Obsessionnel", "Loyal", "Vindicatif"],
      es: ["Intenso", "Intuitivo", "Reservado", "Decidido", "Obsesivo", "Leal", "Vengativo"],
      zh: ["强烈", "直觉敏锐", "神秘", "意志力强", "执念", "忠诚", "报复心"],
    },
    strengths: {
      ko: ["강한 의지력", "깊은 통찰력", "집중력", "충성심", "변화 적응력"],
      en: ["Strong willpower", "Deep insight", "Focus", "Loyalty", "Transformation"],
      ja: ["強い意志力", "深い洞察力", "集中力", "忠誠心", "変容能力"],
      fr: ["Forte volonté", "Insight profond", "Concentration", "Loyauté", "Capacité de transformation"],
      es: ["Fuerte voluntad", "Perspicacia profunda", "Concentración", "Lealtad", "Capacidad de transformación"],
      zh: ["強大意志力", "深刻洞察力", "專注力", "忠誠心", "轉化能力"],
    },
    weaknesses: {
      ko: ["질투심", "복수심", "비밀주의", "집착", "신뢰하기 어려움"],
      en: ["Jealousy", "Vindictiveness", "Secretiveness", "Obsession", "Difficulty trusting"],
      ja: ["嫉妬心", "復讐心", "秘密主義", "執着", "信頼しにくい"],
      fr: ["Jalousie", "Rancune", "Mystère", "Obsession", "Difficulté à faire confiance"],
      es: ["Celos", "Venganza", "Secretismo", "Obsesión", "Dificultad para confiar"],
      zh: ["嫉妒心", "报复心", "秘密主义", "执念", "难以信任他人"],
    },
    bestMatch: ["cancer", "pisces", "virgo", "capricorn"],
    challenging: ["leo", "aquarius"],
  },
  sagittarius: {
    emoji: "♐",
    element: "fire",
    ruler: { ko: "목성", en: "Jupiter", ja: "木星", fr: "Jupiter", es: "Júpiter", zh: "木星", },
    dateRange: { ko: "11월 22일 – 12월 21일", en: "Nov 22 – Dec 21", ja: "11月22日 – 12月21日", fr: "22 nov – 21 déc", es: "22 nov – 21 dic", zh: "11月22日 – 12月21日", },
    name: { ko: "사수자리", en: "Sagittarius", ja: "射手座", fr: "Sagittaire", es: "Sagitario", zh: "射手座", },
    description: {
      ko: "사수자리는 자유를 사랑하는 철학자이자 모험가입니다. 세계를 탐험하고 진리를 추구하며, 낙관적인 에너지로 주변을 밝힙니다.",
      en: "Sagittarius is a freedom-loving philosopher and adventurer. They explore the world, seek truth, and brighten their surroundings with optimistic energy.",
      ja: "射手座は自由を愛する哲学者であり冒険家です。世界を探求して真理を追い求め、楽観的なエネルギーで周囲を明るくします。",
      fr: "Le Sagittaire est un philosophe et aventurier épris de liberté. Il explore le monde, cherche la vérité et illumine son entourage d'énergie optimiste.",
      es: "Sagitario es un filósofo y aventurero que ama la libertad. Explora el mundo, busca la verdad e ilumina su entorno con energía optimista.",
      zh: "射手座是热爱自由的哲学家和冒险家。探索世界、追求真理，以乐观的能量照亮周围。",
    },
    traits: {
      ko: ["낙관적", "모험적", "철학적", "솔직함", "자유분방", "무책임", "열정적"],
      en: ["Optimistic", "Adventurous", "Philosophical", "Honest", "Free-spirited", "Irresponsible", "Enthusiastic"],
      ja: ["楽観的", "冒険的", "哲学的", "率直", "自由奔放", "無責任", "情熱的"],
      fr: ["Optimiste", "Aventureux", "Philosophique", "Honnête", "Libre", "Irresponsable", "Enthousiaste"],
      es: ["Optimista", "Aventurero", "Filosófico", "Honesto", "Libre", "Irresponsable", "Entusiasta"],
      zh: ["乐观", "喜欢冒险", "哲学思维", "坦诚", "自由奔放", "不负责任", "充满热情"],
    },
    strengths: {
      ko: ["낙관적 에너지", "지적 호기심", "자유로운 사고", "유머 감각", "철학적 깊이"],
      en: ["Optimistic energy", "Intellectual curiosity", "Open thinking", "Sense of humor", "Philosophical depth"],
      ja: ["楽観的なエネルギー", "知的好奇心", "自由な思考", "ユーモアセンス", "哲学的深さ"],
      fr: ["Énergie optimiste", "Curiosité intellectuelle", "Pensée ouverte", "Sens de l'humour", "Profondeur philosophique"],
      es: ["Energía optimista", "Curiosidad intelectual", "Pensamiento abierto", "Sentido del humor", "Profundidad filosófica"],
      zh: ["乐观能量", "求知欲", "开放思维", "幽默感", "哲学深度"],
    },
    weaknesses: {
      ko: ["무책임", "과장", "경솔함", "약속 불이행", "집중력 부족"],
      en: ["Irresponsibility", "Exaggeration", "Tactlessness", "Breaking promises", "Lack of focus"],
      ja: ["無責任", "大げさ", "無神経", "約束不履行", "集中力不足"],
      fr: ["Irresponsabilité", "Exagération", "Maladresse", "Manque de fiabilité", "Manque de concentration"],
      es: ["Irresponsabilidad", "Exageración", "Falta de tacto", "Incumplimiento", "Falta de concentración"],
      zh: ["不负责任", "夸大其词", "说话不得体", "不履行承诺", "缺乏专注"],
    },
    bestMatch: ["aries", "leo", "libra", "aquarius"],
    challenging: ["virgo", "pisces"],
  },
  capricorn: {
    emoji: "♑",
    element: "earth",
    ruler: { ko: "토성", en: "Saturn", ja: "土星", fr: "Saturne", es: "Saturno", zh: "土星", },
    dateRange: { ko: "12월 22일 – 1월 19일", en: "Dec 22 – Jan 19", ja: "12月22日 – 1月19日", fr: "22 déc – 19 jan", es: "22 dic – 19 ene", zh: "12月22日 – 1月19日", },
    name: { ko: "염소자리", en: "Capricorn", ja: "山羊座", fr: "Capricorne", es: "Capricornio", zh: "摩羯座", },
    description: {
      ko: "염소자리는 목표 지향적이고 책임감 강한 성취자입니다. 어떤 장애물도 극복하는 인내력과 실용적인 지혜로 정상에 오릅니다.",
      en: "Capricorn is a goal-oriented, responsible achiever. They reach the top with perseverance that overcomes any obstacle and practical wisdom.",
      ja: "山羊座は目標志向で責任感の強い達成者です。いかなる障害も乗り越える忍耐力と実用的な知恵で頂点を目指します。",
      fr: "Le Capricorne est un réalisateur ambitieux et responsable. Il atteint le sommet grâce à une persévérance qui surmonte tout obstacle.",
      es: "Capricornio es un realizador orientado a metas y responsable. Alcanza la cima con perseverancia que supera cualquier obstáculo.",
      zh: "摩羯座是目标导向、责任感强的成就者。以克服任何障碍的耐力和实用智慧登顶。",
    },
    traits: {
      ko: ["야망", "자제력", "책임감", "실용적", "보수적", "냉정함", "인내심"],
      en: ["Ambitious", "Self-disciplined", "Responsible", "Practical", "Conservative", "Reserved", "Patient"],
      ja: ["野心", "自制心", "責任感", "実用的", "保守的", "冷静", "忍耐力"],
      fr: ["Ambitieux", "Discipliné", "Responsable", "Pratique", "Conservateur", "Réservé", "Patient"],
      es: ["Ambicioso", "Disciplinado", "Responsable", "Práctico", "Conservador", "Reservado", "Paciente"],
      zh: ["有抱負", "自律", "責任感", "實用", "保守", "冷靜", "耐心"],
    },
    strengths: {
      ko: ["강한 자제력", "목표 달성력", "책임감", "장기적 사고", "실용적 지혜"],
      en: ["Self-discipline", "Goal achievement", "Responsibility", "Long-term thinking", "Practical wisdom"],
      ja: ["強い自制心", "目標達成力", "責任感", "長期的思考", "実用的知恵"],
      fr: ["Autodiscipline", "Réalisation d'objectifs", "Sens des responsabilités", "Vision à long terme", "Sagesse pratique"],
      es: ["Autodisciplina", "Logro de objetivos", "Responsabilidad", "Pensamiento a largo plazo", "Sabiduría práctica"],
      zh: ["强大自律", "目标达成", "责任感", "长远思考", "实用智慧"],
    },
    weaknesses: {
      ko: ["고집스러움", "냉담함", "비관주의", "일중독", "감정 표현 부족"],
      en: ["Stubbornness", "Coldness", "Pessimism", "Workaholism", "Emotional detachment"],
      ja: ["頑固", "冷淡", "悲観主義", "仕事中毒", "感情表現の乏しさ"],
      fr: ["Entêtement", "Froideur", "Pessimisme", "Workaholisme", "Détachement émotionnel"],
      es: ["Terquedad", "Frialdad", "Pesimismo", "Adicción al trabajo", "Distancia emocional"],
      zh: ["固執", "冷淡", "悲觀", "工作狂", "缺乏情感表達"],
    },
    bestMatch: ["taurus", "virgo", "scorpio", "pisces"],
    challenging: ["aries", "libra"],
  },
  aquarius: {
    emoji: "♒",
    element: "air",
    ruler: { ko: "천왕성/토성", en: "Uranus / Saturn", ja: "天王星・土星", fr: "Uranus / Saturne", es: "Urano / Saturno", zh: "天王星/土星", },
    dateRange: { ko: "1월 20일 – 2월 18일", en: "Jan 20 – Feb 18", ja: "1月20日 – 2月18日", fr: "20 jan – 18 fév", es: "20 ene – 18 feb", zh: "1月20日 – 2月18日", },
    name: { ko: "물병자리", en: "Aquarius", ja: "水瓶座", fr: "Verseau", es: "Acuario", zh: "水瓶座", },
    description: {
      ko: "물병자리는 혁신적이고 인도주의적인 비전가입니다. 인류의 미래를 생각하며 독창적인 아이디어로 세상을 변화시킵니다.",
      en: "Aquarius is an innovative, humanitarian visionary. They envision humanity's future and transform the world with original ideas.",
      ja: "水瓶座は革新的で人道主義的なビジョナリーです。人類の未来を考え、独創的なアイデアで世界を変えていきます。",
      fr: "Le Verseau est un visionnaire innovant et humaniste. Il envisage l'avenir de l'humanité et transforme le monde avec des idées originales.",
      es: "Acuario es un visionario innovador y humanista. Imagina el futuro de la humanidad y transforma el mundo con ideas originales.",
      zh: "水瓶座是创新的人道主义愿景者。展望人类未来，以独创思想改变世界。",
    },
    traits: {
      ko: ["독창적", "인도주의적", "독립적", "반항적", "이지적", "비관습적", "사교적"],
      en: ["Original", "Humanitarian", "Independent", "Rebellious", "Intellectual", "Unconventional", "Friendly"],
      ja: ["独創的", "人道主義的", "独立的", "反骨", "知的", "非慣習的", "社交的"],
      fr: ["Original", "Humaniste", "Indépendant", "Rebelle", "Intellectuel", "Non-conventionnel", "Sociable"],
      es: ["Original", "Humanitario", "Independiente", "Rebelde", "Intelectual", "No convencional", "Amigable"],
      zh: ["独创", "人道主义", "独立", "反叛", "智性", "非传统", "友善"],
    },
    strengths: {
      ko: ["독창적 사고", "인도주의적 비전", "지적 호기심", "혁신성", "사회적 의식"],
      en: ["Original thinking", "Humanitarian vision", "Intellectual curiosity", "Innovation", "Social awareness"],
      ja: ["独創的思考", "人道主義的ビジョン", "知的好奇心", "革新性", "社会的意識"],
      fr: ["Pensée originale", "Vision humaniste", "Curiosité intellectuelle", "Innovation", "Conscience sociale"],
      es: ["Pensamiento original", "Visión humanitaria", "Curiosidad intelectual", "Innovación", "Conciencia social"],
      zh: ["独创思维", "人道主义愿景", "求知欲", "创新性", "社会意识"],
    },
    weaknesses: {
      ko: ["감정적 거리감", "고집", "비타협적", "반사회적", "예측 불가"],
      en: ["Emotional detachment", "Stubbornness", "Uncompromising", "Anti-social", "Unpredictability"],
      ja: ["感情的距離感", "頑固", "妥協しない", "反社会的", "予測不可能"],
      fr: ["Détachement émotionnel", "Entêtement", "Intransigeance", "Anti-social", "Imprévisibilité"],
      es: ["Distancia emocional", "Terquedad", "Intransigencia", "Antisocial", "Imprevisibilidad"],
      zh: ["情感疏离", "固执", "不妥协", "反社会", "难以预测"],
    },
    bestMatch: ["gemini", "libra", "aries", "sagittarius"],
    challenging: ["taurus", "scorpio"],
  },
  pisces: {
    emoji: "♓",
    element: "water",
    ruler: { ko: "해왕성/목성", en: "Neptune / Jupiter", ja: "海王星・木星", fr: "Neptune / Jupiter", es: "Neptuno / Júpiter", zh: "海王星/木星", },
    dateRange: { ko: "2월 19일 – 3월 20일", en: "Feb 19 – Mar 20", ja: "2月19日 – 3月20日", fr: "19 fév – 20 mar", es: "19 feb – 20 mar", zh: "2月19日 – 3月20日", },
    name: { ko: "물고기자리", en: "Pisces", ja: "魚座", fr: "Poissons", es: "Piscis", zh: "双鱼座", },
    description: {
      ko: "물고기자리는 꿈꾸는 예술가이자 공감의 달인입니다. 무한한 상상력과 깊은 감수성으로 세상의 고통을 자신의 것처럼 느낍니다.",
      en: "Pisces is a dreaming artist and master of empathy. With boundless imagination and deep sensitivity, they feel the world's joys and pains as their own.",
      ja: "魚座は夢見る芸術家であり共感の達人です。無限の想像力と深い感受性で、世界の喜びと痛みを自分のものとして感じます。",
      fr: "Les Poissons sont des artistes rêveurs et maîtres de l'empathie. Avec une imagination sans limites et une sensibilité profonde, ils ressentent les joies du monde.",
      es: "Piscis es un artista soñador y maestro de la empatía. Con imaginación ilimitada y profunda sensibilidad, siente las alegrías y dolores del mundo como propios.",
      zh: "双鱼座是梦幻艺术家和同理心大师。以无限的想象力和深刻的感受力，把世界的喜悦和痛苦当作自己的来感受。",
    },
    traits: {
      ko: ["공감력 뛰어남", "직관적", "예술적", "이타적", "몽상가", "우유부단", "감수성 풍부"],
      en: ["Empathetic", "Intuitive", "Artistic", "Selfless", "Dreamer", "Indecisive", "Highly sensitive"],
      ja: ["共感力が高い", "直感的", "芸術的", "利他的", "夢想家", "優柔不断", "感受性豊か"],
      fr: ["Empathique", "Intuitif", "Artistique", "Altruiste", "Rêveur", "Indécis", "Très sensible"],
      es: ["Empático", "Intuitivo", "Artístico", "Altruista", "Soñador", "Indeciso", "Muy sensible"],
      zh: ["高度同理心", "直觉敏锐", "艺术气质", "无私", "梦想家", "优柔寡断", "感受力强"],
    },
    strengths: {
      ko: ["깊은 공감 능력", "풍부한 상상력", "예술적 창의성", "이타심", "직관력"],
      en: ["Deep empathy", "Rich imagination", "Artistic creativity", "Altruism", "Intuition"],
      ja: ["深い共感能力", "豊かな想像力", "芸術的創造性", "利他心", "直感力"],
      fr: ["Empathie profonde", "Imagination riche", "Créativité artistique", "Altruisme", "Intuition"],
      es: ["Empatía profunda", "Imaginación rica", "Creatividad artística", "Altruismo", "Intuición"],
      zh: ["深刻同理心", "丰富想象力", "艺术创造力", "无私心", "直觉力"],
    },
    weaknesses: {
      ko: ["현실 도피", "우유부단", "경계 설정 어려움", "자기 희생", "과도한 감수성"],
      en: ["Escapism", "Indecisiveness", "Poor boundaries", "Self-sacrifice", "Over-sensitivity"],
      ja: ["現実逃避", "優柔不断", "境界設定が難しい", "自己犠牲", "過度な感受性"],
      fr: ["Évasion de la réalité", "Indécision", "Limites floues", "Sacrifice de soi", "Hypersensibilité"],
      es: ["Escapismo", "Indecisión", "Límites pobres", "Auto-sacrificio", "Hipersensibilidad"],
      zh: ["逃避现实", "优柔寡断", "难以设定界限", "自我牺牲", "过度敏感"],
    },
    bestMatch: ["cancer", "scorpio", "taurus", "capricorn"],
    challenging: ["gemini", "sagittarius"],
  },
};

// Date → zodiac lookup
function getZodiacFromDate(month: number, day: number): ZodiacKey {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "sagittarius";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "aquarius";
  return "pisces";
}

const ALL_KEYS: ZodiacKey[] = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces",
];

const COMPAT_LABEL: Record<Locale, { best: string; challenging: string }> = {
  ko:  { best: "최고 궁합 💕", challenging: "어려운 궁합 ⚡" },
  en:  { best: "Best Match 💕", challenging: "Challenging ⚡" },
  ja:  { best: "最高の相性 💕", challenging: "難しい相性 ⚡" },
  fr:  { best: "Meilleure compatibilité 💕", challenging: "Difficile ⚡" },
  es:  { best: "Mejor compatibilidad 💕", challenging: "Difícil ⚡" },
  zh:  { best: "最佳配對 💕", challenging: "有挑戰性 ⚡" },
};

export default function ZodiacPersonality({ locale }: Props) {
  const [selected, setSelected] = useState<ZodiacKey | null>(null);
  const [birthday, setBirthday] = useState("");
  const [showBirthday, setShowBirthday] = useState(false);
  const ui = UI[locale];
  const compatLabel = COMPAT_LABEL[locale];

  function handleBirthdayLookup() {
    if (!birthday) return;
    const d = new Date(birthday);
    const key = getZodiacFromDate(d.getMonth() + 1, d.getDate());
    setSelected(key);
    setShowBirthday(false);
  }

  if (!selected) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{ui.title}</h1>
          <p className="mt-1 text-gray-500 text-sm">{ui.subtitle}</p>
        </div>

        {/* Birthday lookup */}
        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <button
            onClick={() => setShowBirthday((v) => !v)}
            className="text-sm text-indigo-600 font-medium hover:underline"
          >
            {ui.orEnterBirthday} ▾
          </button>
          {showBirthday && (
            <div className="flex gap-2">
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday((e.target as HTMLInputElement).value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleBirthdayLookup}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {ui.lookupBtn}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 font-medium uppercase tracking-wide">{ui.selectPrompt}</p>

        {/* Sign grid */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {ALL_KEYS.map((key) => {
            const z = ZODIAC[key];
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 ${ELEMENT_BG[z.element]} hover:shadow-md transition-all hover:scale-105 cursor-pointer`}
              >
                <span className="text-3xl">{z.emoji}</span>
                <span className={`text-xs font-bold mt-1 ${ELEMENT_COLOR[z.element]}`}>{z.name[locale]}</span>
              </button>
            );
          })}
        </div>

        {/* Element legend */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["fire","earth","air","water"] as Element[]).map((el) => (
            <div key={el} className={`rounded-lg px-3 py-2 text-center text-xs font-medium ${ELEMENT_BG[el]} ${ELEMENT_COLOR[el]} border`}>
              {ELEMENT_LABEL[el][locale]}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const z = ZODIAC[selected];
  const el = z.element;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`rounded-2xl p-6 text-center border-2 ${ELEMENT_BG[el]}`}>
        <div className="text-6xl mb-1">{z.emoji}</div>
        <h1 className={`text-3xl font-bold ${ELEMENT_COLOR[el]}`}>{z.name[locale]}</h1>
        <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
          <span>{ui.dateRangeLabel}: {z.dateRange[locale]}</span>
          <span>{ui.elementLabel}: {ELEMENT_LABEL[el][locale]}</span>
          <span>{ui.rulerLabel}: {z.ruler[locale]}</span>
        </div>
        <p className="mt-3 text-gray-700 text-sm leading-relaxed">{z.description[locale]}</p>
      </div>

      {/* Traits */}
      <div className="rounded-xl border border-gray-200 p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{ui.traitsLabel}</h2>
        <div className="flex flex-wrap gap-2">
          {z.traits[locale].map((trait) => (
            <span
              key={trait}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${ELEMENT_BG[el]} ${ELEMENT_COLOR[el]}`}
            >
              {trait}
            </span>
          ))}
        </div>
      </div>

      {/* Strengths / Weaknesses */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="text-xs font-semibold text-emerald-700 mb-2">✅ {ui.strengthsLabel}</h2>
          <ul className="space-y-1">
            {z.strengths[locale].map((s) => (
              <li key={s} className="text-xs text-gray-700">• {s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="text-xs font-semibold text-red-700 mb-2">⚠️ {ui.weaknessesLabel}</h2>
          <ul className="space-y-1">
            {z.weaknesses[locale].map((w) => (
              <li key={w} className="text-xs text-gray-700">• {w}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Compatibility */}
      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{ui.compatibilityLabel}</h2>
        <div>
          <p className="text-xs text-gray-500 mb-1">{compatLabel.best}</p>
          <div className="flex flex-wrap gap-2">
            {z.bestMatch.map((k) => (
              <button
                key={k}
                onClick={() => setSelected(k)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border-2 ${ELEMENT_BG[ZODIAC[k].element]} ${ELEMENT_COLOR[ZODIAC[k].element]} hover:shadow-sm transition-all`}
              >
                {ZODIAC[k].emoji} {ZODIAC[k].name[locale]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">{compatLabel.challenging}</p>
          <div className="flex flex-wrap gap-2">
            {z.challenging.map((k) => (
              <button
                key={k}
                onClick={() => setSelected(k)}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 hover:shadow-sm transition-all"
              >
                {ZODIAC[k].emoji} {ZODIAC[k].name[locale]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={() => setSelected(null)}
        className="w-full py-3 rounded-xl border-2 border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        ← {ui.resetBtn}
      </button>

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-400">{ui.disclaimer}</p>
    </div>
  );
}
