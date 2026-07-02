import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reduce a number to a single digit (preserving 11, 22, 33 as master numbers) */
function reduceToDigit(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((s, d) => s + parseInt(d), 0);
  }
  return n;
}

/** Sum all digits in a string of numbers */
function digitSum(s: string): number {
  return s.split("").reduce((acc, ch) => acc + (parseInt(ch) || 0), 0);
}

/** Pythagorean letter-to-number mapping */
const LETTER_MAP: Record<string, number> = {
  a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,
  j:1,k:2,l:3,m:4,n:5,o:6,p:7,q:8,r:9,
  s:1,t:2,u:3,v:4,w:5,x:6,y:7,z:8,
};

const VOWELS = new Set(["a","e","i","o","u"]);

/** Life Path = reduce(month + day + year) */
function calcLifePath(dateStr: string): number {
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const y = d.getFullYear();
  return reduceToDigit(reduceToDigit(m) + reduceToDigit(day) + reduceToDigit(y));
}

/** Expression = sum of all letters in full name */
function calcExpression(name: string): number {
  const n = name.toLowerCase().replace(/[^a-z]/g, "");
  return reduceToDigit(digitSum(n.split("").map((c) => String(LETTER_MAP[c] || 0)).join("")));
}

/** Soul Urge = vowels only */
function calcSoulUrge(name: string): number {
  const vowelNums = name.toLowerCase().split("").filter((c) => VOWELS.has(c)).map((c) => LETTER_MAP[c] || 0);
  return reduceToDigit(vowelNums.reduce((a, b) => a + b, 0));
}

/** Personality = consonants only */
function calcPersonality(name: string): number {
  const consNums = name.toLowerCase().replace(/[^a-z]/g, "").split("").filter((c) => !VOWELS.has(c)).map((c) => LETTER_MAP[c] || 0);
  return reduceToDigit(consNums.reduce((a, b) => a + b, 0));
}

// ─── i18n ─────────────────────────────────────────────────────────────────────

const UI: Record<Locale, {
  title: string;
  subtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  dateLabel: string;
  calcBtn: string;
  resetBtn: string;
  lifePathLabel: string;
  expressionLabel: string;
  soulUrgeLabel: string;
  personalityLabel: string;
  masterNote: string;
  keywordsLabel: string;
  meaningLabel: string;
  challengeLabel: string;
  giftLabel: string;
}> = {
  ko: {
    title: "수비학 계산기",
    subtitle: "생년월일과 이름으로 생명수·표현수·영혼수·성격수 분석",
    nameLabel: "영문 이름 (풀네임)",
    namePlaceholder: "예: Kim Minsu",
    dateLabel: "생년월일",
    calcBtn: "수비학 분석",
    resetBtn: "다시 분석",
    lifePathLabel: "생명수 (Life Path)",
    expressionLabel: "표현수 (Expression)",
    soulUrgeLabel: "영혼수 (Soul Urge)",
    personalityLabel: "성격수 (Personality)",
    masterNote: "마스터 넘버",
    keywordsLabel: "키워드",
    meaningLabel: "의미",
    challengeLabel: "과제",
    giftLabel: "재능",
  },
  en: {
    title: "Numerology Calculator",
    subtitle: "Discover your Life Path, Expression, Soul Urge & Personality numbers",
    nameLabel: "Full Name (in English)",
    namePlaceholder: "e.g. John Smith",
    dateLabel: "Date of Birth",
    calcBtn: "Calculate",
    resetBtn: "Recalculate",
    lifePathLabel: "Life Path Number",
    expressionLabel: "Expression Number",
    soulUrgeLabel: "Soul Urge Number",
    personalityLabel: "Personality Number",
    masterNote: "Master Number",
    keywordsLabel: "Keywords",
    meaningLabel: "Meaning",
    challengeLabel: "Challenge",
    giftLabel: "Gift",
  },
  ja: {
    title: "数秘術計算機",
    subtitle: "生年月日と名前でライフパス・表現数・魂の数・個性数を分析",
    nameLabel: "英語フルネーム",
    namePlaceholder: "例: Tanaka Yuki",
    dateLabel: "生年月日",
    calcBtn: "数秘術を計算",
    resetBtn: "再計算",
    lifePathLabel: "ライフパスナンバー",
    expressionLabel: "表現数",
    soulUrgeLabel: "魂の数",
    personalityLabel: "個性数",
    masterNote: "マスターナンバー",
    keywordsLabel: "キーワード",
    meaningLabel: "意味",
    challengeLabel: "課題",
    giftLabel: "才能",
  },
  fr: {
    title: "Calculateur de Numérologie",
    subtitle: "Découvrez votre chemin de vie, nombre d'expression, d'âme et de personnalité",
    nameLabel: "Nom complet (en lettres latines)",
    namePlaceholder: "ex: Jean Dupont",
    dateLabel: "Date de naissance",
    calcBtn: "Calculer",
    resetBtn: "Recalculer",
    lifePathLabel: "Chemin de Vie",
    expressionLabel: "Nombre d'Expression",
    soulUrgeLabel: "Nombre d'Âme",
    personalityLabel: "Nombre de Personnalité",
    masterNote: "Nombre Maître",
    keywordsLabel: "Mots-clés",
    meaningLabel: "Signification",
    challengeLabel: "Défi",
    giftLabel: "Don",
  },
  es: {
    title: "Calculadora de Numerología",
    subtitle: "Descubre tu Camino de Vida, Expresión, Deseo del Alma y Personalidad",
    nameLabel: "Nombre completo (en letras latinas)",
    namePlaceholder: "ej: Juan García",
    dateLabel: "Fecha de nacimiento",
    calcBtn: "Calcular",
    resetBtn: "Recalcular",
    lifePathLabel: "Camino de Vida",
    expressionLabel: "Número de Expresión",
    soulUrgeLabel: "Deseo del Alma",
    personalityLabel: "Número de Personalidad",
    masterNote: "Número Maestro",
    keywordsLabel: "Palabras clave",
    meaningLabel: "Significado",
    challengeLabel: "Desafío",
    giftLabel: "Don",
  },
  zh: {
    title: "数字命理计算器",
    subtitle: "通过生日和姓名计算生命数、表达数、灵魂数和个性数",
    nameLabel: "英文全名",
    namePlaceholder: "例: Wang Fang",
    dateLabel: "出生日期",
    calcBtn: "计算",
    resetBtn: "重新计算",
    lifePathLabel: "生命灵数",
    expressionLabel: "表达数",
    soulUrgeLabel: "灵魂冲动数",
    personalityLabel: "个性数",
    masterNote: "主数",
    keywordsLabel: "关键词",
    meaningLabel: "含义",
    challengeLabel: "挑战",
    giftLabel: "天赋",
  },
};

interface NumberMeaning {
  color: string;
  bg: string;
  keywords: Record<Locale, string[]>;
  meaning: Record<Locale, string>;
  challenge: Record<Locale, string>;
  gift: Record<Locale, string>;
}

const MEANINGS: Record<number, NumberMeaning> = {
  1: {
    color: "text-red-700", bg: "bg-red-50 border-red-200",
    keywords: {
      ko: ["독립심", "리더십", "개척정신", "자신감"],
      en: ["Independence", "Leadership", "Pioneer", "Confidence"],
      ja: ["独立心", "リーダーシップ", "開拓精神", "自信"],
      fr: ["Indépendance", "Leadership", "Pionnier", "Confiance"],
      es: ["Independencia", "Liderazgo", "Pionero", "Confianza"],
      zh: ["独立", "领导力", "开拓精神", "自信"],
    },
    meaning: {
      ko: "당신은 타고난 리더입니다. 독창적인 아이디어와 강한 의지로 새로운 길을 개척합니다.",
      en: "You are a born leader. With original ideas and strong will, you blaze new trails.",
      ja: "あなたは生まれながらのリーダーです。独創的なアイデアと強い意志で新しい道を切り開きます。",
      fr: "Vous êtes un leader né. Avec des idées originales et une forte volonté, vous tracez de nouveaux chemins.",
      es: "Eres un líder nato. Con ideas originales y fuerte voluntad, abres nuevos caminos.",
      zh: "你是天生的领导者。以独创的想法和强大的意志力开辟新道路。",
    },
    challenge: {
      ko: "독선과 고집을 경계하고 타인의 의견을 경청하는 연습이 필요합니다.",
      en: "Beware of stubbornness and self-righteousness; practice listening to others.",
      ja: "独善と頑固さに注意し、他者の意見に耳を傾ける練習が必要です。",
      fr: "Méfiez-vous de l'entêtement ; pratiquez l'écoute des autres.",
      es: "Cuidado con la terquedad; practica escuchar a los demás.",
      zh: "警惕固执自以为是，需要练习倾听他人意见。",
    },
    gift: {
      ko: "강한 추진력과 독창성으로 아무도 가지 않은 길을 만들어냅니다.",
      en: "Strong drive and originality allow you to create paths no one else has walked.",
      ja: "強い推進力と独創性で、誰も歩んでいない道を作り出します。",
      fr: "Force de caractère et originalité pour créer des voies inédites.",
      es: "Fuerte impulso y originalidad para crear caminos que nadie ha recorrido.",
      zh: "强大的驱动力和独创性让你能走出前人未走过的路。",
    },
  },
  2: {
    color: "text-pink-700", bg: "bg-pink-50 border-pink-200",
    keywords: {
      ko: ["협력", "균형", "감수성", "외교적"],
      en: ["Cooperation", "Balance", "Sensitivity", "Diplomatic"],
      ja: ["協力", "バランス", "感受性", "外交的"],
      fr: ["Coopération", "Équilibre", "Sensibilité", "Diplomatique"],
      es: ["Cooperación", "Equilibrio", "Sensibilidad", "Diplomático"],
      zh: ["合作", "平衡", "感受性", "外交手腕"],
    },
    meaning: {
      ko: "당신은 뛰어난 중재자이자 파트너입니다. 관계의 조화를 추구하고 섬세한 감수성으로 주변을 편안하게 합니다.",
      en: "You are an excellent mediator and partner. You seek harmony in relationships and put others at ease with your delicate sensitivity.",
      ja: "あなたは優れた調停者でありパートナーです。関係の調和を求め、繊細な感受性で周囲を和ませます。",
      fr: "Vous êtes un excellent médiateur et partenaire. Vous recherchez l'harmonie et mettez les autres à l'aise.",
      es: "Eres un excelente mediador y compañero. Buscas la armonía y pones a los demás a gusto.",
      zh: "你是出色的调解者和伙伴。追求关系中的和谐，用细腻的感受力让周围的人感到轻松。",
    },
    challenge: {
      ko: "지나친 의존과 우유부단함을 극복하고 자신의 목소리를 낼 용기가 필요합니다.",
      en: "Overcome excessive dependence and indecisiveness; find the courage to speak your truth.",
      ja: "過度な依存と優柔不断を克服し、自分の声を出す勇気が必要です。",
      fr: "Surmontez dépendance excessive et indécision; osez exprimer votre vérité.",
      es: "Supera la dependencia excesiva e indecisión; encuentra el valor para expresar tu verdad.",
      zh: "克服过度依赖和优柔寡断，需要勇气说出自己的想法。",
    },
    gift: {
      ko: "타인의 감정을 깊이 이해하는 공감 능력과 갈등을 조율하는 탁월한 능력을 가졌습니다.",
      en: "Deep empathy and exceptional ability to mediate conflicts.",
      ja: "他者の感情を深く理解する共感能力と、対立を調整する卓越した能力を持っています。",
      fr: "Empathie profonde et capacité exceptionnelle à résoudre les conflits.",
      es: "Profunda empatía y excepcional capacidad para mediar conflictos.",
      zh: "深刻理解他人情感的同理心和化解衝突的卓越能力。",
    },
  },
  3: {
    color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200",
    keywords: {
      ko: ["창의성", "표현력", "사교성", "낙관주의"],
      en: ["Creativity", "Expression", "Sociability", "Optimism"],
      ja: ["創造性", "表現力", "社交性", "楽観主義"],
      fr: ["Créativité", "Expression", "Sociabilité", "Optimisme"],
      es: ["Creatividad", "Expresión", "Sociabilidad", "Optimismo"],
      zh: ["創造力", "表達能力", "社交性", "樂觀主義"],
    },
    meaning: {
      ko: "당신은 빛나는 창의적 표현자입니다. 예술, 글쓰기, 말하기 등으로 세상에 기쁨을 전합니다.",
      en: "You are a radiant creative expresser. You bring joy to the world through art, writing, and communication.",
      ja: "あなたは輝く創造的な表現者です。芸術、文章、話し言葉で世界に喜びをもたらします。",
      fr: "Vous êtes un brillant expressif créatif. Vous apportez joie au monde par l'art et la communication.",
      es: "Eres un brillante expresor creativo. Llevas alegría al mundo a través del arte y la comunicación.",
      zh: "你是闪耀的创意表达者。通过艺术、写作和沟通为世界带来快乐。",
    },
    challenge: {
      ko: "에너지를 분산하지 않고 한 가지에 집중하는 능력을 키워야 합니다.",
      en: "Develop the ability to focus on one thing rather than scattering your energy.",
      ja: "エネルギーを分散させず、一つのことに集中する能力を育てる必要があります。",
      fr: "Développez la capacité de vous concentrer plutôt que de disperser votre énergie.",
      es: "Desarrolla la capacidad de concentrarte en una cosa en lugar de dispersar tu energía.",
      zh: "需要培養專注於一件事的能力，而不是分散精力。",
    },
    gift: {
      ko: "타고난 유머와 창의력으로 어디서든 분위기를 밝히는 에너지를 가졌습니다.",
      en: "Natural humor and creativity that brightens any atmosphere.",
      ja: "生まれながらのユーモアと創造力で、どこでも雰囲気を明るくするエネルギーを持っています。",
      fr: "Humour naturel et créativité qui illuminent n'importe quelle atmosphère.",
      es: "Humor natural y creatividad que iluminan cualquier ambiente.",
      zh: "天生的幽默感和創造力，能在任何地方活躍氣氛。",
    },
  },
  4: {
    color: "text-green-700", bg: "bg-green-50 border-green-200",
    keywords: {
      ko: ["안정", "실용성", "성실함", "체계적"],
      en: ["Stability", "Practicality", "Diligence", "Systematic"],
      ja: ["安定", "実用性", "誠実さ", "体系的"],
      fr: ["Stabilité", "Praticité", "Diligence", "Systématique"],
      es: ["Estabilidad", "Practicidad", "Diligencia", "Sistemático"],
      zh: ["稳定", "实用性", "勤勉", "系统性"],
    },
    meaning: {
      ko: "당신은 신뢰할 수 있는 건축가입니다. 체계적이고 성실한 노력으로 단단한 기반을 쌓아갑니다.",
      en: "You are a trustworthy builder. Through systematic and diligent effort, you lay a solid foundation.",
      ja: "あなたは信頼できる建築家です。体系的で誠実な努力で確かな基盤を築いていきます。",
      fr: "Vous êtes un bâtisseur fiable. Par l'effort systématique et diligent, vous posez des bases solides.",
      es: "Eres un constructor confiable. Con esfuerzo sistemático y diligente, construyes una base sólida.",
      zh: "你是值得信赖的建造者。通过系统性的努力奠定坚实基础。",
    },
    challenge: {
      ko: "지나친 경직성과 변화 거부를 극복하고 유연성을 키워야 합니다.",
      en: "Overcome excessive rigidity and resistance to change by cultivating flexibility.",
      ja: "過度な硬直性と変化への抵抗を克服し、柔軟性を育てる必要があります。",
      fr: "Surmontez la rigidité excessive et la résistance au changement en cultivant la flexibilité.",
      es: "Supera la rigidez excesiva y la resistencia al cambio cultivando flexibilidad.",
      zh: "需要克服过度刻板和对变化的抗拒，培养灵活性。",
    },
    gift: {
      ko: "어떤 프로젝트든 끝까지 완성하는 놀라운 인내력과 실행력을 가졌습니다.",
      en: "Remarkable perseverance and execution ability to see any project through to completion.",
      ja: "どんなプロジェクトも最後まで完成させる驚くべき忍耐力と実行力を持っています。",
      fr: "Persévérance remarquable pour mener n'importe quel projet à terme.",
      es: "Perseverancia y capacidad de ejecución para completar cualquier proyecto.",
      zh: "无论什么项目都能坚持到底完成的惊人耐力和执行力。",
    },
  },
  5: {
    color: "text-blue-700", bg: "bg-blue-50 border-blue-200",
    keywords: {
      ko: ["자유", "모험", "변화", "적응력"],
      en: ["Freedom", "Adventure", "Change", "Adaptability"],
      ja: ["自由", "冒険", "変化", "適応力"],
      fr: ["Liberté", "Aventure", "Changement", "Adaptabilité"],
      es: ["Libertad", "Aventura", "Cambio", "Adaptabilidad"],
      zh: ["自由", "冒险", "变化", "适应力"],
    },
    meaning: {
      ko: "당신은 자유로운 모험가입니다. 변화를 두려워하지 않고 다양한 경험을 통해 인생을 풍요롭게 합니다.",
      en: "You are a free-spirited adventurer. Unafraid of change, you enrich life through varied experiences.",
      ja: "あなたは自由な冒険家です。変化を恐れず、様々な経験を通して人生を豊かにします。",
      fr: "Vous êtes un aventurier libre. Sans craindre le changement, vous enrichissez la vie d'expériences variées.",
      es: "Eres un aventurero libre. Sin miedo al cambio, enriqueces tu vida con experiencias variadas.",
      zh: "你是自由奔放的冒险家。不惧变化，通过丰富的经历丰富人生。",
    },
    challenge: {
      ko: "충동적 결정과 집중력 부족을 극복하고 하나의 방향으로 나아가는 힘을 길러야 합니다.",
      en: "Overcome impulsive decisions and lack of focus; build the strength to move in one direction.",
      ja: "衝動的な決断と集中力不足を克服し、一つの方向に進む力を育てる必要があります。",
      fr: "Surmontez les décisions impulsives et le manque de concentration; bâtissez la force d'aller dans une direction.",
      es: "Supera decisiones impulsivas y falta de concentración; desarrolla la fuerza de ir en una dirección.",
      zh: "需要克服冲动的决定和缺乏专注，培养朝一个方向前进的力量。",
    },
    gift: {
      ko: "어떤 상황에서도 빠르게 적응하고 새로운 가능성을 발견하는 탁월한 감각을 가졌습니다.",
      en: "Exceptional sense of adapting quickly and discovering new possibilities in any situation.",
      ja: "どんな状況でも素早く適応し、新たな可能性を見出す卓越した感覚を持っています。",
      fr: "Sens exceptionnel d'adaptation rapide et de découverte de nouvelles possibilités.",
      es: "Excepcional sentido de adaptación rápida y descubrimiento de nuevas posibilidades.",
      zh: "在任何情况下都能快速适应并发现新可能性的卓越感知力。",
    },
  },
  6: {
    color: "text-rose-700", bg: "bg-rose-50 border-rose-200",
    keywords: {
      ko: ["가정", "책임감", "봉사", "사랑"],
      en: ["Home", "Responsibility", "Service", "Love"],
      ja: ["家庭", "責任感", "奉仕", "愛"],
      fr: ["Foyer", "Responsabilité", "Service", "Amour"],
      es: ["Hogar", "Responsabilidad", "Servicio", "Amor"],
      zh: ["家庭", "责任感", "服务", "爱"],
    },
    meaning: {
      ko: "당신은 타고난 보호자이자 치유자입니다. 가족과 공동체를 위해 헌신하며 사랑으로 세상을 더 따뜻하게 합니다.",
      en: "You are a born protector and healer. Devoted to family and community, you make the world warmer with love.",
      ja: "あなたは生まれながらの守護者であり癒し手です。家族とコミュニティに献身し、愛で世界を温かくします。",
      fr: "Vous êtes un protecteur et guérisseur né. Dévoué à la famille et la communauté, vous réchauffez le monde.",
      es: "Eres un protector y sanador nato. Dedicado a la familia y comunidad, haces el mundo más cálido.",
      zh: "你是天生的保护者和治愈者。为家人和社区奉献，以爱让世界更温暖。",
    },
    challenge: {
      ko: "자신을 희생하는 과도한 봉사에서 벗어나 건강한 경계를 설정하는 법을 배워야 합니다.",
      en: "Learn to set healthy boundaries instead of over-sacrificing yourself in service.",
      ja: "自己犠牲的な奉仕から離れ、健全な境界を設定する方法を学ぶ必要があります。",
      fr: "Apprenez à poser des limites saines plutôt que de trop vous sacrifier.",
      es: "Aprende a establecer límites saludables en lugar de sacrificarte demasiado.",
      zh: "需要学会设立健康的界限，而非过度牺牲自己去服务他人。",
    },
    gift: {
      ko: "무조건적인 사랑과 깊은 치유 능력으로 상처받은 영혼을 위로합니다.",
      en: "Unconditional love and deep healing ability to comfort wounded souls.",
      ja: "無条件の愛と深い癒しの能力で傷ついた魂を慰めます。",
      fr: "Amour inconditionnel et profonde capacité de guérison pour réconforter les âmes blessées.",
      es: "Amor incondicional y profunda capacidad curativa para consolar almas heridas.",
      zh: "无条件的爱和深刻的治愈能力，能安慰受伤的灵魂。",
    },
  },
  7: {
    color: "text-violet-700", bg: "bg-violet-50 border-violet-200",
    keywords: {
      ko: ["지혜", "분석", "영성", "내향성"],
      en: ["Wisdom", "Analysis", "Spirituality", "Introspection"],
      ja: ["知恵", "分析", "霊性", "内向性"],
      fr: ["Sagesse", "Analyse", "Spiritualité", "Introspection"],
      es: ["Sabiduría", "Análisis", "Espiritualidad", "Introspección"],
      zh: ["智慧", "分析", "灵性", "内省"],
    },
    meaning: {
      ko: "당신은 진실을 탐구하는 철학자입니다. 깊은 사색과 분석으로 인생의 숨겨진 의미를 찾아갑니다.",
      en: "You are a philosopher seeking truth. Deep reflection and analysis guide you to life's hidden meanings.",
      ja: "あなたは真実を探求する哲学者です。深い思索と分析で人生の隠れた意味を探っていきます。",
      fr: "Vous êtes un philosophe en quête de vérité. La réflexion profonde vous guide vers les sens cachés.",
      es: "Eres un filósofo en busca de la verdad. La reflexión profunda te guía hacia los significados ocultos.",
      zh: "你是探寻真理的哲学家。通过深刻的沉思和分析，寻找生命的隐藏意义。",
    },
    challenge: {
      ko: "고립과 불신을 극복하고 타인과의 진정한 연결을 두려워하지 않는 용기가 필요합니다.",
      en: "Overcome isolation and mistrust; find the courage to genuinely connect with others.",
      ja: "孤立と不信を克服し、他者との真のつながりを恐れない勇気が必要です。",
      fr: "Surmontez l'isolement et la méfiance; trouvez le courage de vous connecter vraiment.",
      es: "Supera el aislamiento y la desconfianza; encuentra el valor de conectarte genuinamente.",
      zh: "需要克服孤立和不信任，勇于与他人建立真正的联结。",
    },
    gift: {
      ko: "남들이 보지 못하는 패턴을 발견하고 깊은 진리를 꿰뚫어 보는 탁월한 직관력을 가졌습니다.",
      en: "Exceptional intuition to discover patterns others miss and pierce deep truths.",
      ja: "他の人が見えないパターンを発見し、深い真実を見抜く卓越した直観力を持っています。",
      fr: "Intuition exceptionnelle pour découvrir des schémas que les autres manquent.",
      es: "Intuición excepcional para descubrir patrones que otros no ven.",
      zh: "发现他人看不到的规律、洞察深层真理的卓越直觉力。",
    },
  },
  8: {
    color: "text-amber-700", bg: "bg-amber-50 border-amber-200",
    keywords: {
      ko: ["성공", "권력", "물질", "야망"],
      en: ["Success", "Power", "Abundance", "Ambition"],
      ja: ["成功", "権力", "豊かさ", "野心"],
      fr: ["Succès", "Pouvoir", "Abondance", "Ambition"],
      es: ["Éxito", "Poder", "Abundancia", "Ambición"],
      zh: ["成功", "權力", "豐盛", "野心"],
    },
    meaning: {
      ko: "당신은 세상을 움직이는 힘을 가진 사람입니다. 강한 야망과 실행력으로 물질적·정신적 성공을 이룹니다.",
      en: "You have the power to move the world. Strong ambition and execution lead you to material and spiritual success.",
      ja: "あなたは世界を動かす力を持つ人物です。強い野心と実行力で物質的・精神的成功を収めます。",
      fr: "Vous avez le pouvoir de changer le monde. Forte ambition et exécution mènent au succès.",
      es: "Tienes el poder de mover el mundo. Fuerte ambición y ejecución te llevan al éxito.",
      zh: "你擁有影響世界的力量。強大的野心和執行力帶領你走向物質和精神上的成功。",
    },
    challenge: {
      ko: "권력과 물질에 집착하지 않고 그것을 더 큰 선을 위해 사용하는 지혜가 필요합니다.",
      en: "Wisdom to use power and material success for greater good rather than clinging to them.",
      ja: "権力と物質への執着を手放し、より大きな善のために使う知恵が必要です。",
      fr: "Sagesse pour utiliser pouvoir et succès pour le bien commun plutôt que de s'y accrocher.",
      es: "Sabiduría para usar el poder y el éxito para el bien mayor en lugar de aferrarte a ellos.",
      zh: "需要智慧地使用权力和物质成功，为更大的善服务，而非执着于此。",
    },
    gift: {
      ko: "어떤 분야에서든 최고의 자리에 오를 수 있는 탁월한 전략적 사고와 실행 능력을 가졌습니다.",
      en: "Exceptional strategic thinking and execution to rise to the top in any field.",
      ja: "どんな分野でも最高の地位に上れる卓越した戦略的思考と実行能力を持っています。",
      fr: "Pensée stratégique et exécution exceptionnelles pour atteindre le sommet.",
      es: "Pensamiento estratégico y ejecución excepcionales para llegar a la cima.",
      zh: "在任何領域都能登頂的卓越戰略思維和執行能力。",
    },
  },
  9: {
    color: "text-teal-700", bg: "bg-teal-50 border-teal-200",
    keywords: {
      ko: ["인도주의", "완성", "지혜", "자비"],
      en: ["Humanitarianism", "Completion", "Wisdom", "Compassion"],
      ja: ["人道主義", "完成", "知恵", "慈悲"],
      fr: ["Humanitarisme", "Achèvement", "Sagesse", "Compassion"],
      es: ["Humanitarismo", "Completitud", "Sabiduría", "Compasión"],
      zh: ["人道主義", "完成", "智慧", "慈悲"],
    },
    meaning: {
      ko: "당신은 인류를 품는 넓은 마음의 소유자입니다. 오래된 지혜와 깊은 자비로 세상에 봉사하는 사명을 지닙니다.",
      en: "You have a heart that embraces all of humanity. With ancient wisdom and deep compassion, you are called to serve the world.",
      ja: "あなたは人類を包む広い心の持ち主です。深い知恵と深い慈悲で世界に奉仕する使命を持っています。",
      fr: "Vous avez un cœur qui embrasse l'humanité. Sagesse ancienne et compassion profonde vous appellent à servir.",
      es: "Tienes un corazón que abraza a toda la humanidad. Sabiduría antigua y compasión profunda te llaman a servir.",
      zh: "你有一颗包容全人类的广阔心灵。以深邃的智慧和慈悲，承担服务世界的使命。",
    },
    challenge: {
      ko: "과거에 대한 집착과 감정적 상처를 놓아버리고 앞으로 나아가는 용기가 필요합니다.",
      en: "Release attachment to the past and emotional wounds; find courage to move forward.",
      ja: "過去への執着と感情的な傷を手放し、前に進む勇気が必要です。",
      fr: "Lâchez les attachements du passé et les blessures émotionnelles pour avancer.",
      es: "Suelta el apego al pasado y las heridas emocionales; encuentra valor para avanzar.",
      zh: "需要放下对过去的执着和情感创伤，勇于前行。",
    },
    gift: {
      ko: "삶의 모든 경험을 통합하여 타인의 길을 밝혀주는 지혜의 등불이 됩니다.",
      en: "Integrating all life experiences to become a light of wisdom that illuminates others' paths.",
      ja: "人生のすべての経験を統合し、他者の道を照らす知恵の灯台となります。",
      fr: "Intégrer toutes les expériences de vie pour devenir un phare de sagesse.",
      es: "Integrar todas las experiencias de vida para convertirse en un faro de sabiduría.",
      zh: "整合所有人生經驗，成為照亮他人道路的智慧燈塔。",
    },
  },
  11: {
    color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200",
    keywords: {
      ko: ["영감", "직관", "이상주의", "영성"],
      en: ["Inspiration", "Intuition", "Idealism", "Spirituality"],
      ja: ["インスピレーション", "直感", "理想主義", "霊性"],
      fr: ["Inspiration", "Intuition", "Idéalisme", "Spiritualité"],
      es: ["Inspiración", "Intuición", "Idealismo", "Espiritualidad"],
      zh: ["灵感", "直觉", "理想主义", "灵性"],
    },
    meaning: {
      ko: "당신은 11의 마스터 넘버를 가진 타고난 영감의 채널입니다. 높은 직관력과 영적 통찰로 인류에게 빛을 가져다줍니다.",
      en: "You carry the Master Number 11 — a natural channel of inspiration. Your high intuition and spiritual insight bring light to humanity.",
      ja: "あなたはマスターナンバー11を持つ、生まれながらのインスピレーションのチャンネルです。高い直感力と霊的洞察で人類に光をもたらします。",
      fr: "Vous portez le Nombre Maître 11 — un canal d'inspiration naturel. Votre haute intuition apporte lumière à l'humanité.",
      es: "Llevas el Número Maestro 11 — canal natural de inspiración. Tu alta intuición trae luz a la humanidad.",
      zh: "你拥有主数11——天生的灵感传递渠道。高度直觉和灵性洞察为人类带来光明。",
    },
    challenge: {
      ko: "극도의 민감성과 내면의 갈등을 다스리고 높은 이상을 현실에 접지시키는 능력이 필요합니다.",
      en: "Managing extreme sensitivity and inner conflict; grounding high ideals into reality.",
      ja: "極度の感受性と内面の葛藤をコントロールし、高い理想を現実に接地させる能力が必要です。",
      fr: "Gérer l'hypersensibilité et les conflits intérieurs; ancrer les idéaux élevés dans la réalité.",
      es: "Manejar la extrema sensibilidad y conflictos internos; aterrizar los altos ideales en la realidad.",
      zh: "需要管理極度敏感和內心衝突，將崇高理想落實於現實。",
    },
    gift: {
      ko: "강렬한 직관과 영감으로 많은 사람들의 삶에 영향을 미치는 선지자적 능력을 가졌습니다.",
      en: "Prophetic ability to influence many lives through intense intuition and inspiration.",
      ja: "強い直感とインスピレーションで多くの人の人生に影響を与える先見的な能力を持っています。",
      fr: "Capacité prophétique d'influencer de nombreuses vies par l'intuition et l'inspiration.",
      es: "Capacidad profética de influir en muchas vidas a través de la intuición e inspiración.",
      zh: "以强烈的直觉和灵感影响众多人生的先知般的能力。",
    },
  },
  22: {
    color: "text-orange-700", bg: "bg-orange-50 border-orange-200",
    keywords: {
      ko: ["마스터 건축가", "실용적 이상주의", "대규모 비전", "변혁"],
      en: ["Master Builder", "Practical Idealism", "Grand Vision", "Transformation"],
      ja: ["マスタービルダー", "実践的理想主義", "大きなビジョン", "変革"],
      fr: ["Maître Bâtisseur", "Idéalisme pratique", "Grande vision", "Transformation"],
      es: ["Maestro Constructor", "Idealismo práctico", "Gran visión", "Transformación"],
      zh: ["大師建築者", "實用理想主義", "宏大願景", "變革"],
    },
    meaning: {
      ko: "당신은 22의 마스터 넘버, 마스터 건축가입니다. 원대한 비전을 현실로 구현하는 탁월한 능력으로 세상을 변화시킵니다.",
      en: "You carry Master Number 22 — the Master Builder. You transform the world by manifesting grand visions into reality.",
      ja: "あなたはマスターナンバー22、マスタービルダーです。壮大なビジョンを現実に具現化する卓越した能力で世界を変えます。",
      fr: "Vous portez le Nombre Maître 22 — le Maître Bâtisseur. Vous transformez le monde en manifestant de grandes visions.",
      es: "Llevas el Número Maestro 22 — el Maestro Constructor. Transformas el mundo materializando grandes visiones.",
      zh: "你拥有主数22——大师建筑者。将宏大愿景化为现实的卓越能力改变着世界。",
    },
    challenge: {
      ko: "거대한 잠재력에 짓눌리지 않고 한 걸음씩 현실적인 계획으로 실현하는 균형 감각이 필요합니다.",
      en: "Balance is needed to not be overwhelmed by vast potential — realize it step by step with realistic plans.",
      ja: "巨大な可能性に押し潰されず、一歩一歩現実的な計画で実現するバランス感覚が必要です。",
      fr: "Équilibre nécessaire pour ne pas être écrasé par un potentiel immense — réalisez-le pas à pas.",
      es: "Equilibrio para no ser abrumado por el vasto potencial — realizarlo paso a paso.",
      zh: "需要平衡感，不被巨大潜力压倒，而是一步一步用实际计划去实现。",
    },
    gift: {
      ko: "인류 역사에 기여하는 불멸의 작품을 남길 수 있는 마스터 빌더의 능력을 타고났습니다.",
      en: "Born with the Master Builder's ability to leave lasting works that contribute to human history.",
      ja: "人類の歴史に貢献する不朽の作品を残せるマスタービルダーの能力を持って生まれました。",
      fr: "Don du Maître Bâtisseur pour laisser des œuvres immortelles qui contribuent à l'histoire humaine.",
      es: "Don del Maestro Constructor para dejar obras inmortales que contribuyan a la historia humana.",
      zh: "天生具备大师建筑者的能力，能留下对人类历史有贡献的不朽作品。",
    },
  },
  33: {
    color: "text-purple-700", bg: "bg-purple-50 border-purple-200",
    keywords: {
      ko: ["마스터 교사", "무조건적 사랑", "희생", "치유"],
      en: ["Master Teacher", "Unconditional Love", "Sacrifice", "Healing"],
      ja: ["マスターティーチャー", "無条件の愛", "犠牲", "癒し"],
      fr: ["Maître Enseignant", "Amour inconditionnel", "Sacrifice", "Guérison"],
      es: ["Maestro Instructor", "Amor incondicional", "Sacrificio", "Sanación"],
      zh: ["大師教師", "無條件的愛", "犧牲", "治癒"],
    },
    meaning: {
      ko: "당신은 33의 마스터 넘버, 마스터 교사입니다. 무조건적인 사랑으로 인류를 가르치고 치유하는 숭고한 사명을 지닙니다.",
      en: "You carry Master Number 33 — the Master Teacher. Your sublime mission is to teach and heal humanity with unconditional love.",
      ja: "あなたはマスターナンバー33、マスターティーチャーです。無条件の愛で人類を教え癒す崇高な使命を持っています。",
      fr: "Vous portez le Nombre Maître 33 — le Maître Enseignant. Votre mission sublime est d'enseigner et guérir avec amour inconditionnel.",
      es: "Llevas el Número Maestro 33 — el Maestro Instructor. Tu misión sublime es enseñar y sanar con amor incondicional.",
      zh: "你拥有主数33——大师教师。以无条件的爱教导和治愈人类是你崇高的使命。",
    },
    challenge: {
      ko: "자신을 돌보면서 타인을 섬기는 균형을 찾고, 자기 소진 없이 사랑을 나눌 방법을 찾아야 합니다.",
      en: "Find balance between caring for yourself and serving others; share love without self-depletion.",
      ja: "自分をケアしながら他者に奉仕するバランスを見つけ、自己消耗せずに愛を分かち合う方法を見つける必要があります。",
      fr: "Trouver équilibre entre prendre soin de soi et servir les autres sans s'épuiser.",
      es: "Encontrar equilibrio entre cuidarte y servir a otros; compartir amor sin agotarte.",
      zh: "在照顾自己和服务他人之间找到平衡，在不自我耗竭的情况下分享爱。",
    },
    gift: {
      ko: "존재 자체로 주변을 치유하고 영감을 주는 신성한 빛과 같은 존재입니다.",
      en: "Your very existence heals and inspires — you are like a divine light.",
      ja: "存在するだけで周囲を癒しインスピレーションを与える、神聖な光のような存在です。",
      fr: "Votre existence même guérit et inspire — vous êtes comme une lumière divine.",
      es: "Tu propia existencia sana e inspira — eres como una luz divina.",
      zh: "你的存在本身就能治癒和激勵他人，如同神聖的光芒。",
    },
  },
};

// ─── Sub-component ────────────────────────────────────────────────────────────

function NumberCard({
  label,
  number,
  ui,
  locale,
  isMaster,
}: {
  label: string;
  number: number;
  ui: typeof UI[Locale];
  locale: Locale;
  isMaster: boolean;
}) {
  const m = MEANINGS[number];
  if (!m) return null;
  const challenge = m.challenge[locale];
  const gift = m.gift[locale];
  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 ${m.bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        {isMaster && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 ${m.color}`}>
            ✨ {ui.masterNote}
          </span>
        )}
      </div>
      <div className={`text-5xl font-black ${m.color}`}>{number}</div>
      <div className="flex flex-wrap gap-1">
        {m.keywords[locale].map((k) => (
          <span key={k} className={`px-2 py-0.5 rounded-full text-xs font-medium bg-white/70 ${m.color}`}>
            {k}
          </span>
        ))}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{m.meaning[locale]}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/60 p-2">
          <p className="text-xs font-semibold text-gray-500 mb-1">🎁 {ui.giftLabel}</p>
          <p className="text-xs text-gray-700">{gift}</p>
        </div>
        <div className="rounded-lg bg-white/60 p-2">
          <p className="text-xs font-semibold text-gray-500 mb-1">⚡ {ui.challengeLabel}</p>
          <p className="text-xs text-gray-700">{challenge}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NumerologyCalculator({ locale }: Props) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [result, setResult] = useState<{
    lifePath: number;
    expression: number;
    soulUrge: number;
    personality: number;
  } | null>(null);
  const ui = UI[locale];

  function calculate() {
    if (!date || !name.trim()) return;
    setResult({
      lifePath: calcLifePath(date),
      expression: calcExpression(name),
      soulUrge: calcSoulUrge(name),
      personality: calcPersonality(name),
    });
  }

  const MASTER = new Set([11, 22, 33]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{ui.title}</h1>
        <p className="mt-1 text-gray-500 text-sm">{ui.subtitle}</p>
      </div>

      {/* Inputs */}
      <div className="rounded-xl border border-gray-200 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{ui.nameLabel}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder={ui.namePlaceholder}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{ui.dateLabel}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate((e.target as HTMLInputElement).value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={result ? () => setResult(null) : calculate}
          disabled={!name.trim() || !date}
          className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {result ? ui.resetBtn : ui.calcBtn}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <NumberCard
            label={ui.lifePathLabel}
            number={result.lifePath}
            ui={ui}
            locale={locale}
            isMaster={MASTER.has(result.lifePath)}
          />
          <NumberCard
            label={ui.expressionLabel}
            number={result.expression}
            ui={ui}
            locale={locale}
            isMaster={MASTER.has(result.expression)}
          />
          <NumberCard
            label={ui.soulUrgeLabel}
            number={result.soulUrge}
            ui={ui}
            locale={locale}
            isMaster={MASTER.has(result.soulUrge)}
          />
          <NumberCard
            label={ui.personalityLabel}
            number={result.personality}
            ui={ui}
            locale={locale}
            isMaster={MASTER.has(result.personality)}
          />
        </div>
      )}
    </div>
  );
}
