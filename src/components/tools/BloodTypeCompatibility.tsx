import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type BloodType = "A" | "B" | "O" | "AB";

// ─── UI i18n ──────────────────────────────────────────────────────────────────

const UI: Record<Locale, {
  title: string;
  subtitle: string;
  person1: string;
  person2: string;
  selectBlood: string;
  calcBtn: string;
  resetBtn: string;
  scoreLabel: string;
  gradeLabel: string;
  descLabel: string;
  strengthsLabel: string;
  cautionsLabel: string;
  bestMatchLabel: string;
  types: Record<BloodType, string>;
}> = {
  ko: {
    title: "혈액형 궁합",
    subtitle: "두 사람의 혈액형으로 궁합을 알아보세요",
    person1: "나의 혈액형",
    person2: "상대방 혈액형",
    selectBlood: "혈액형 선택",
    calcBtn: "궁합 보기",
    resetBtn: "다시 하기",
    scoreLabel: "궁합 점수",
    gradeLabel: "궁합 등급",
    descLabel: "관계 특징",
    strengthsLabel: "강점",
    cautionsLabel: "주의점",
    bestMatchLabel: "베스트 매칭",
    types: { A: "A형", B: "B형", O: "O형", AB: "AB형" },
  },
  en: {
    title: "Blood Type Compatibility",
    subtitle: "Discover your compatibility based on blood types",
    person1: "Your Blood Type",
    person2: "Partner's Blood Type",
    selectBlood: "Select Blood Type",
    calcBtn: "Check Compatibility",
    resetBtn: "Try Again",
    scoreLabel: "Compatibility Score",
    gradeLabel: "Grade",
    descLabel: "Relationship Traits",
    strengthsLabel: "Strengths",
    cautionsLabel: "Watch Out For",
    bestMatchLabel: "Best Match",
    types: { A: "Type A", B: "Type B", O: "Type O", AB: "Type AB" },
  },
  ja: {
    title: "血液型相性診断",
    subtitle: "二人の血液型で相性を調べましょう",
    person1: "あなたの血液型",
    person2: "相手の血液型",
    selectBlood: "血液型を選ぶ",
    calcBtn: "相性を見る",
    resetBtn: "もう一度",
    scoreLabel: "相性スコア",
    gradeLabel: "相性ランク",
    descLabel: "関係の特徴",
    strengthsLabel: "強み",
    cautionsLabel: "注意点",
    bestMatchLabel: "ベストマッチ",
    types: { A: "A型", B: "B型", O: "O型", AB: "AB型" },
  },
  fr: {
    title: "Compatibilité par Groupe Sanguin",
    subtitle: "Découvrez votre compatibilité selon les groupes sanguins",
    person1: "Votre Groupe Sanguin",
    person2: "Groupe Sanguin du Partenaire",
    selectBlood: "Sélectionner le Groupe Sanguin",
    calcBtn: "Voir la Compatibilité",
    resetBtn: "Recommencer",
    scoreLabel: "Score de Compatibilité",
    gradeLabel: "Niveau",
    descLabel: "Caractéristiques de la Relation",
    strengthsLabel: "Points Forts",
    cautionsLabel: "Points de Vigilance",
    bestMatchLabel: "Meilleur Match",
    types: { A: "Groupe A", B: "Groupe B", O: "Groupe O", AB: "Groupe AB" },
  },
  es: {
    title: "Compatibilidad por Tipo de Sangre",
    subtitle: "Descubre tu compatibilidad según los tipos de sangre",
    person1: "Tu Tipo de Sangre",
    person2: "Tipo de Sangre del Compañero",
    selectBlood: "Seleccionar Tipo de Sangre",
    calcBtn: "Ver Compatibilidad",
    resetBtn: "Intentar de Nuevo",
    scoreLabel: "Puntuación de Compatibilidad",
    gradeLabel: "Nivel",
    descLabel: "Rasgos de la Relación",
    strengthsLabel: "Puntos Fuertes",
    cautionsLabel: "Puntos de Cuidado",
    bestMatchLabel: "Mejor Pareja",
    types: { A: "Tipo A", B: "Tipo B", O: "Tipo O", AB: "Tipo AB" },
  },
  zh: {
    title: "血型配对",
    subtitle: "通过血型了解两个人的相容性",
    person1: "你的血型",
    person2: "对方的血型",
    selectBlood: "选择血型",
    calcBtn: "查看配对",
    resetBtn: "重新测试",
    scoreLabel: "配对分数",
    gradeLabel: "配对等级",
    descLabel: "关系特征",
    strengthsLabel: "优势",
    cautionsLabel: "注意事项",
    bestMatchLabel: "最佳配对",
    types: { A: "A型", B: "B型", O: "O型", AB: "AB型" },
  },
};

// ─── Compatibility Grades ─────────────────────────────────────────────────────

type GradeKey = "soulmate" | "good" | "normal" | "challenge";

const GRADE_LABELS: Record<Locale, Record<GradeKey, string>> = {
  ko: { soulmate: "소울메이트💕", good: "좋은 친구👫", normal: "보통 궁합🤝", challenge: "도전적 궁합⚡" },
  en: { soulmate: "Soulmates💕", good: "Good Friends👫", normal: "Average Match🤝", challenge: "Challenging⚡" },
  ja: { soulmate: "ソウルメイト💕", good: "良い友達👫", normal: "普通の相性🤝", challenge: "チャレンジング⚡" },
  fr: { soulmate: "Âmes Sœurs💕", good: "Bons Amis👫", normal: "Compatibilité Moyenne🤝", challenge: "Défi⚡" },
  es: { soulmate: "Almas Gemelas💕", good: "Buenos Amigos👫", normal: "Compatibilidad Media🤝", challenge: "Desafiante⚡" },
  zh: { soulmate: "灵魂伴侣💕", good: "好朋友👫", normal: "普通配对🤝", challenge: "挑战型⚡" },
};

const GRADE_COLORS: Record<GradeKey, string> = {
  soulmate: "text-pink-600",
  good: "text-blue-600",
  normal: "text-green-600",
  challenge: "text-orange-600",
};

// ─── Compatibility Data (16 combinations) ────────────────────────────────────

interface CompatData {
  score: number;
  grade: GradeKey;
  desc: Record<Locale, string[]>;
  strengths: Record<Locale, string[]>;
  cautions: Record<Locale, string[]>;
  bestMatch: BloodType;
}

type PairKey = `${BloodType}_${BloodType}`;

const COMPAT: Record<PairKey, CompatData> = {
  "A_A": {
    score: 82,
    grade: "good",
    bestMatch: "A",
    desc: {
      ko: ["두 사람 모두 세심하고 계획적이어서 서로를 잘 이해합니다.", "감정 표현이 비슷해 공감대가 높습니다.", "때로는 지나친 완벽주의로 갈등이 생길 수 있습니다."],
      en: ["Both are detail-oriented and systematic, fostering mutual understanding.", "Similar emotional expression creates strong empathy.", "Over-perfectionism can sometimes cause friction."],
      ja: ["どちらも几帳面で計画的なので、お互いをよく理解します。", "感情表現が似ているため共感が高いです。", "時に完璧主義が強すぎて衝突する可能性があります。"],
      fr: ["Tous deux méticuleux et planifiés, ils se comprennent bien.", "Une expression émotionnelle similaire crée une forte empathie.", "Un perfectionnisme excessif peut parfois créer des frictions."],
      es: ["Ambos son meticulosos y planificadores, fomentando la comprensión mutua.", "Una expresión emocional similar crea empatía fuerte.", "El perfeccionismo excesivo puede a veces causar fricciones."],
      zh: ["两人都细心周到，善于计划，相互理解深入。", "相似的情感表达方式带来强烈共鸣。", "过度完美主义有时可能产生摩擦。"],
    },
    strengths: {
      ko: ["높은 신뢰감과 안정감", "세심한 배려와 책임감"],
      en: ["High trust and stability", "Careful consideration and responsibility"],
      ja: ["高い信頼感と安定感", "細やかな配慮と責任感"],
      fr: ["Haute confiance et stabilité", "Attention méticuleuse et responsabilité"],
      es: ["Alta confianza y estabilidad", "Consideración cuidadosa y responsabilidad"],
      zh: ["高度信任与稳定感", "细心体贴与责任感"],
    },
    cautions: {
      ko: ["서로의 고집이 부딪힐 수 있음", "감정을 직접 표현하는 연습 필요"],
      en: ["Stubbornness can clash", "Practice expressing emotions more directly"],
      ja: ["お互いの頑固さがぶつかる可能性", "感情を直接表現する練習が必要"],
      fr: ["L'entêtement peut créer des conflits", "Pratiquer l'expression directe des émotions"],
      es: ["La terquedad puede chocar", "Practicar la expresión directa de emociones"],
      zh: ["固执容易产生冲突", "需要练习直接表达情感"],
    },
  },
  "A_B": {
    score: 60,
    grade: "challenge",
    bestMatch: "O",
    desc: {
      ko: ["A형의 꼼꼼함과 B형의 자유분방함이 충돌하기 쉽습니다.", "서로 다른 생활 방식이 자극이 되기도 합니다.", "이해와 인내가 필요한 관계입니다."],
      en: ["A's meticulousness often clashes with B's free-spirited nature.", "Different lifestyles can be stimulating but challenging.", "Understanding and patience are key."],
      ja: ["A型の几帳面さとB型の自由奔放さが衝突しやすいです。", "異なるライフスタイルが刺激になることもあります。", "理解と忍耐が必要な関係です。"],
      fr: ["La méticulosité de A s'oppose souvent au naturel libre de B.", "Des styles de vie différents peuvent être stimulants mais difficiles.", "Compréhension et patience sont essentielles."],
      es: ["La meticulosidad de A choca con la naturaleza libre de B.", "Diferentes estilos de vida pueden ser estimulantes pero desafiantes.", "Comprensión y paciencia son clave."],
      zh: ["A型的细致与B型的自由奔放容易产生冲突。", "不同的生活方式既有刺激感也有挑战性。", "理解与耐心是关键。"],
    },
    strengths: {
      ko: ["서로 부족한 면을 보완할 수 있음", "새로운 시각과 자극 제공"],
      en: ["Can complement each other's weaknesses", "Provide new perspectives and stimulation"],
      ja: ["お互いの弱点を補い合える", "新しい視点と刺激を提供"],
      fr: ["Peuvent compléter les faiblesses de l'autre", "Apportent de nouvelles perspectives"],
      es: ["Pueden complementar las debilidades del otro", "Aportan nuevas perspectivas"],
      zh: ["能够互补各自的不足", "提供新的视角和刺激"],
    },
    cautions: {
      ko: ["생활 방식 차이로 인한 갈등 주의", "서로의 다름을 존중하는 자세 필요"],
      en: ["Watch for conflicts from lifestyle differences", "Respect each other's different approaches"],
      ja: ["ライフスタイルの違いによる衝突に注意", "お互いの違いを尊重する姿勢が必要"],
      fr: ["Attention aux conflits dus aux différences de style de vie", "Respecter les approches différentes"],
      es: ["Cuidado con conflictos por diferencias de estilo de vida", "Respetar los enfoques diferentes"],
      zh: ["注意生活方式差异引发的冲突", "需要尊重彼此的不同方式"],
    },
  },
  "A_O": {
    score: 88,
    grade: "soulmate",
    bestMatch: "O",
    desc: {
      ko: ["A형의 섬세함과 O형의 포용력이 완벽한 균형을 이룹니다.", "서로의 장점을 살려주는 이상적인 관계입니다.", "O형의 리더십이 A형의 불안을 안정시켜 줍니다."],
      en: ["A's sensitivity and O's inclusiveness create perfect balance.", "An ideal relationship that brings out each other's best.", "O's leadership calms A's anxiety."],
      ja: ["A型の繊細さとO型の包容力が完璧なバランスを作ります。", "お互いの長所を活かし合う理想的な関係です。", "O型のリーダーシップがA型の不安を和らげます。"],
      fr: ["La sensibilité de A et l'inclusivité de O créent un équilibre parfait.", "Une relation idéale qui révèle le meilleur de chacun.", "Le leadership de O calme l'anxiété de A."],
      es: ["La sensibilidad de A y la inclusividad de O crean un equilibrio perfecto.", "Una relación ideal que saca lo mejor de cada uno.", "El liderazgo de O calma la ansiedad de A."],
      zh: ["A型的细腻与O型的包容力形成完美平衡。", "这是一段能够发挥彼此优势的理想关系。", "O型的领导力能安抚A型的不安情绪。"],
    },
    strengths: {
      ko: ["서로에 대한 깊은 신뢰와 안정감", "A형의 꼼꼼함 + O형의 추진력"],
      en: ["Deep mutual trust and stability", "A's carefulness + O's drive"],
      ja: ["お互いへの深い信頼と安定感", "A型の細かさ + O型の推進力"],
      fr: ["Confiance mutuelle profonde et stabilité", "La minutie de A + l'élan de O"],
      es: ["Profunda confianza mutua y estabilidad", "La meticulosidad de A + el impulso de O"],
      zh: ["深度相互信任与稳定感", "A型的细心 + O型的行动力"],
    },
    cautions: {
      ko: ["O형의 강한 자기 주장에 A형이 상처받을 수 있음", "감정 표현 방식의 차이 조율 필요"],
      en: ["O's assertiveness may hurt A's feelings", "Need to coordinate different styles of emotional expression"],
      ja: ["O型の強い自己主張がA型を傷つける可能性", "感情表現スタイルの違いを調整する必要あり"],
      fr: ["L'affirmation de O peut blesser les sentiments de A", "Coordonner les différents styles d'expression émotionnelle"],
      es: ["La asertividad de O puede herir los sentimientos de A", "Coordinar diferentes estilos de expresión emocional"],
      zh: ["O型的强烈主张可能会伤害A型的感情", "需要调整情感表达方式的差异"],
    },
  },
  "A_AB": {
    score: 75,
    grade: "good",
    bestMatch: "A",
    desc: {
      ko: ["AB형의 합리성이 A형의 감정을 잘 이해해 줍니다.", "지적인 교감이 잘 이루어지는 관계입니다.", "AB형의 변덕스러움이 A형을 불안하게 만들 수 있습니다."],
      en: ["AB's rationality understands A's emotions well.", "Great intellectual connection.", "AB's unpredictability may unsettle A."],
      ja: ["AB型の合理性がA型の感情をよく理解します。", "知的な交流がうまくいく関係です。", "AB型の気まぐれがA型を不安にさせる可能性があります。"],
      fr: ["La rationalité de AB comprend bien les émotions de A.", "Excellente connexion intellectuelle.", "L'imprévisibilité de AB peut troubler A."],
      es: ["La racionalidad de AB comprende bien las emociones de A.", "Gran conexión intelectual.", "La imprevisibilidad de AB puede inquietar a A."],
      zh: ["AB型的理性能很好地理解A型的情感。", "两人之间有良好的智识交流。", "AB型的善变可能让A型感到不安。"],
    },
    strengths: {
      ko: ["이성과 감성의 조화", "서로를 성장시키는 자극"],
      en: ["Harmony of reason and emotion", "Mutual growth through stimulation"],
      ja: ["理性と感性の調和", "お互いを成長させる刺激"],
      fr: ["Harmonie de la raison et de l'émotion", "Croissance mutuelle par stimulation"],
      es: ["Armonía de razón y emoción", "Crecimiento mutuo a través de la estimulación"],
      zh: ["理性与感性的和谐统一", "相互促进成长"],
    },
    cautions: {
      ko: ["AB형의 이중적 면이 A형을 혼란스럽게 함", "감정적 안정을 위한 소통 중요"],
      en: ["AB's dual nature can confuse A", "Communication for emotional stability is vital"],
      ja: ["AB型の二面性がA型を混乱させる", "感情的安定のためのコミュニケーションが重要"],
      fr: ["La double nature de AB peut perturber A", "La communication pour la stabilité émotionnelle est vitale"],
      es: ["La naturaleza dual de AB puede confundir a A", "La comunicación para la estabilidad emocional es vital"],
      zh: ["AB型的双重性格会让A型感到困惑", "沟通对情感稳定至关重要"],
    },
  },
  "B_A": {
    score: 60,
    grade: "challenge",
    bestMatch: "B",
    desc: {
      ko: ["B형의 자유분방함과 A형의 꼼꼼함이 자주 충돌합니다.", "서로 다른 점이 매력으로 작용하기도 합니다.", "상호 존중과 이해가 핵심입니다."],
      en: ["B's free spirit often clashes with A's meticulousness.", "Differences can be attractive yet challenging.", "Mutual respect and understanding are key."],
      ja: ["B型の自由奔放さとA型の几帳面さがよく衝突します。", "違いが魅力として作用することもあります。", "相互尊重と理解が核心です。"],
      fr: ["Le naturel libre de B s'oppose souvent à la méticulosité de A.", "Les différences peuvent être attrayantes mais difficiles.", "Le respect mutuel et la compréhension sont essentiels."],
      es: ["El espíritu libre de B a menudo choca con la meticulosidad de A.", "Las diferencias pueden ser atractivas pero desafiantes.", "El respeto mutuo y la comprensión son clave."],
      zh: ["B型的自由奔放常与A型的细致发生冲突。", "差异有时也会产生吸引力。", "相互尊重与理解是关键。"],
    },
    strengths: {
      ko: ["서로 다른 관점이 시야를 넓혀 줌", "새로운 경험과 도전 공유"],
      en: ["Different perspectives broaden each other's horizons", "Share new experiences and challenges"],
      ja: ["異なる視点がお互いの視野を広げる", "新しい経験と挑戦を共有"],
      fr: ["Des perspectives différentes élargissent les horizons de chacun", "Partager de nouvelles expériences et défis"],
      es: ["Diferentes perspectivas amplían los horizontes de cada uno", "Compartir nuevas experiencias y desafíos"],
      zh: ["不同视角拓展各自的视野", "分享新体验和挑战"],
    },
    cautions: {
      ko: ["규칙 vs 자유의 갈등 조율 필요", "서로의 생활 방식 간섭 자제"],
      en: ["Navigate conflicts between rules and freedom", "Avoid interfering in each other's lifestyle"],
      ja: ["ルール対自由の葛藤を調整する必要あり", "お互いの生活スタイルへの干渉を控える"],
      fr: ["Naviguer les conflits entre règles et liberté", "Éviter d'interférer dans le style de vie de l'autre"],
      es: ["Navegar conflictos entre reglas y libertad", "Evitar interferir en el estilo de vida del otro"],
      zh: ["需要调和规则与自由之间的冲突", "避免干涉对方的生活方式"],
    },
  },
  "B_B": {
    score: 78,
    grade: "good",
    bestMatch: "B",
    desc: {
      ko: ["둘 다 자유롭고 활발해서 함께 있으면 에너지가 넘칩니다.", "자기 주도적인 성향이 비슷해 공감이 잘 됩니다.", "둘 다 고집이 세서 양보가 어려울 수 있습니다."],
      en: ["Both are free and lively, creating explosive energy together.", "Similar self-directed personalities create strong empathy.", "Both being stubborn can make compromise difficult."],
      ja: ["どちらも自由で活発なので、一緒にいるとエネルギーが溢れます。", "自主的な性格が似ていて共感しやすいです。", "どちらも頑固なので譲り合いが難しい場合があります。"],
      fr: ["Tous deux libres et vifs, ils créent une énergie explosive ensemble.", "Des personnalités auto-dirigées similaires créent une forte empathie.", "Leur entêtement peut rendre les compromis difficiles."],
      es: ["Ambos son libres y vivaces, creando una energía explosiva juntos.", "Personalidades auto-dirigidas similares crean fuerte empatía.", "El ser ambos tercos puede dificultar los compromisos."],
      zh: ["两人都自由活泼，在一起充满活力。", "相似的自主个性让双方容易产生共鸣。", "两人都固执，可能难以妥协。"],
    },
    strengths: {
      ko: ["즉흥적이고 활기찬 관계", "서로의 개성을 존중"],
      en: ["Spontaneous and vibrant relationship", "Respect each other's individuality"],
      ja: ["即興的で活気ある関係", "お互いの個性を尊重"],
      fr: ["Relation spontanée et vibrante", "Respect de l'individualité de l'autre"],
      es: ["Relación espontánea y vibrante", "Respeto por la individualidad del otro"],
      zh: ["即兴而充满活力的关系", "尊重彼此的个性"],
    },
    cautions: {
      ko: ["결정이 어렵고 우유부단해질 수 있음", "책임 분담을 명확히 할 것"],
      en: ["Decisions can be hard and indecisive", "Clearly divide responsibilities"],
      ja: ["決断が難しく優柔不断になる可能性", "責任の分担を明確にすること"],
      fr: ["Les décisions peuvent être difficiles et indécises", "Diviser clairement les responsabilités"],
      es: ["Las decisiones pueden ser difíciles e indecisas", "Dividir claramente las responsabilidades"],
      zh: ["做决定困难，可能优柔寡断", "明确分担责任"],
    },
  },
  "B_O": {
    score: 85,
    grade: "soulmate",
    bestMatch: "O",
    desc: {
      ko: ["O형의 포용력이 B형의 자유로운 영혼을 받아들여 줍니다.", "활동적이고 에너지 넘치는 커플입니다.", "서로에게 활력을 불어넣어 주는 관계입니다."],
      en: ["O's inclusiveness embraces B's free spirit.", "An active and energetic couple.", "They inspire each other with vitality."],
      ja: ["O型の包容力がB型の自由な魂を受け入れます。", "活動的でエネルギッシュなカップルです。", "お互いに活力を与え合う関係です。"],
      fr: ["L'inclusivité de O embrasse l'esprit libre de B.", "Un couple actif et énergique.", "Ils s'inspirent mutuellement de vitalité."],
      es: ["La inclusividad de O abraza el espíritu libre de B.", "Una pareja activa y enérgica.", "Se inspiran mutuamente con vitalidad."],
      zh: ["O型的包容力接纳了B型的自由灵魂。", "这是一对活跃而充满活力的伴侣。", "两人相互激励，充满活力。"],
    },
    strengths: {
      ko: ["서로의 에너지가 시너지를 냄", "O형의 안정감 + B형의 창의성"],
      en: ["Their energies create synergy", "O's stability + B's creativity"],
      ja: ["お互いのエネルギーがシナジーを生む", "O型の安定感 + B型の創造性"],
      fr: ["Leurs énergies créent de la synergie", "La stabilité de O + la créativité de B"],
      es: ["Sus energías crean sinergia", "La estabilidad de O + la creatividad de B"],
      zh: ["两人的能量产生协同效应", "O型的稳定感 + B型的创造力"],
    },
    cautions: {
      ko: ["B형의 변덕에 O형이 지칠 수 있음", "장기적 계획에 대한 합의 필요"],
      en: ["O may tire of B's moodiness", "Need to agree on long-term plans"],
      ja: ["B型の気まぐれにO型が疲れる可能性", "長期的な計画についての合意が必要"],
      fr: ["O peut se lasser des sautes d'humeur de B", "Besoin de s'accorder sur les plans à long terme"],
      es: ["O puede cansarse de los cambios de humor de B", "Necesitan acordar planes a largo plazo"],
      zh: ["O型可能会因B型的善变而感到疲惫", "需要就长期计划达成共识"],
    },
  },
  "B_AB": {
    score: 72,
    grade: "good",
    bestMatch: "B",
    desc: {
      ko: ["AB형의 다양한 면이 B형의 다채로운 면과 잘 맞습니다.", "지적 호기심을 함께 나누는 관계입니다.", "서로의 개성이 강해 마찰이 생기기도 합니다."],
      en: ["AB's versatility matches B's colorful nature.", "They share intellectual curiosity.", "Strong individualities can cause friction."],
      ja: ["AB型の多様な面がB型の多彩な面とよく合います。", "知的好奇心を共に分かち合う関係です。", "お互いの個性が強く摩擦が生じることもあります。"],
      fr: ["La polyvalence de AB correspond à la nature colorée de B.", "Ils partagent une curiosité intellectuelle.", "Les fortes individualités peuvent causer des frictions."],
      es: ["La versatilidad de AB coincide con la naturaleza colorida de B.", "Comparten curiosidad intelectual.", "Las fuertes individualidades pueden causar fricciones."],
      zh: ["AB型的多变与B型的多彩个性相得益彰。", "两人共享智识上的好奇心。", "强烈的个性有时会产生摩擦。"],
    },
    strengths: {
      ko: ["다양한 취미와 관심사 공유", "자유롭고 창의적인 분위기"],
      en: ["Share diverse hobbies and interests", "Free and creative atmosphere"],
      ja: ["多様な趣味と興味を共有", "自由で創造的な雰囲気"],
      fr: ["Partage de passe-temps et d'intérêts divers", "Atmosphère libre et créative"],
      es: ["Comparten hobbies e intereses diversos", "Atmósfera libre y creativa"],
      zh: ["共享多样的爱好和兴趣", "自由而富有创造力的氛围"],
    },
    cautions: {
      ko: ["안정적인 일상 구축이 어려울 수 있음", "서로의 독립성 존중이 필수"],
      en: ["Building stable routines can be difficult", "Respecting each other's independence is essential"],
      ja: ["安定した日常を築くのが難しい場合あり", "お互いの独立性を尊重することが不可欠"],
      fr: ["Construire des routines stables peut être difficile", "Respecter l'indépendance de l'autre est essentiel"],
      es: ["Construir rutinas estables puede ser difícil", "Respetar la independencia del otro es esencial"],
      zh: ["可能难以建立稳定的日常生活", "尊重彼此的独立性至关重要"],
    },
  },
  "O_A": {
    score: 88,
    grade: "soulmate",
    bestMatch: "A",
    desc: {
      ko: ["O형의 포용력이 A형의 섬세한 감성을 감싸줍니다.", "서로에게 없는 장점을 채워주는 관계입니다.", "안정적이고 성숙한 파트너십입니다."],
      en: ["O's inclusiveness wraps around A's delicate sensibility.", "They complement each other's missing qualities.", "A stable and mature partnership."],
      ja: ["O型の包容力がA型の繊細な感性を包み込みます。", "お互いにない長所を補い合う関係です。", "安定した成熟したパートナーシップです。"],
      fr: ["L'inclusivité de O enveloppe la sensibilité délicate de A.", "Ils se complètent mutuellement.", "Un partenariat stable et mature."],
      es: ["La inclusividad de O envuelve la delicada sensibilidad de A.", "Se complementan mutuamente.", "Una asociación estable y madura."],
      zh: ["O型的包容力包裹着A型的细腻感性。", "两人互补各自所缺的优点。", "这是一段稳定而成熟的伙伴关系。"],
    },
    strengths: {
      ko: ["깊은 신뢰와 헌신", "감정적 안정과 성숙함"],
      en: ["Deep trust and commitment", "Emotional stability and maturity"],
      ja: ["深い信頼とコミットメント", "感情的な安定と成熟"],
      fr: ["Confiance profonde et engagement", "Stabilité émotionnelle et maturité"],
      es: ["Profunda confianza y compromiso", "Estabilidad emocional y madurez"],
      zh: ["深度信任与承诺", "情感稳定与成熟"],
    },
    cautions: {
      ko: ["O형의 직설적 표현이 A형에게 상처를 줄 수 있음", "A형의 내면 감정을 적극 표현하도록 격려"],
      en: ["O's directness may hurt A", "Encourage A to express inner emotions"],
      ja: ["O型の直接的な表現がA型を傷つける可能性", "A型が内面の感情を積極的に表現するよう励ます"],
      fr: ["La franchise de O peut blesser A", "Encourager A à exprimer ses émotions intérieures"],
      es: ["La franqueza de O puede herir a A", "Animar a A a expresar sus emociones internas"],
      zh: ["O型的直接表达可能伤害A型", "鼓励A型积极表达内心情感"],
    },
  },
  "O_B": {
    score: 85,
    grade: "soulmate",
    bestMatch: "B",
    desc: {
      ko: ["O형의 너그러움이 B형의 자유로운 면을 이해해 줍니다.", "함께 있으면 활기차고 즐거운 관계입니다.", "O형이 중심을 잡아 B형의 에너지를 잘 활용합니다."],
      en: ["O's generosity understands B's free nature.", "An upbeat and enjoyable relationship together.", "O anchors the energy that B brings."],
      ja: ["O型の寛大さがB型の自由な面を理解します。", "一緒にいると活気があり楽しい関係です。", "O型が中心を保ちB型のエネルギーをうまく活用します。"],
      fr: ["La générosité de O comprend la nature libre de B.", "Une relation dynamique et agréable ensemble.", "O ancre l'énergie que B apporte."],
      es: ["La generosidad de O comprende la naturaleza libre de B.", "Una relación dinámica y agradable juntos.", "O ancla la energía que B aporta."],
      zh: ["O型的慷慨理解B型的自由本性。", "两人在一起充满活力和乐趣。", "O型起到稳定核心的作用，善用B型的能量。"],
    },
    strengths: {
      ko: ["역동적이고 즐거운 커플", "서로의 에너지가 긍정적 시너지"],
      en: ["Dynamic and fun couple", "Each other's energy creates positive synergy"],
      ja: ["ダイナミックで楽しいカップル", "お互いのエネルギーが正のシナジーを生む"],
      fr: ["Couple dynamique et amusant", "L'énergie de l'autre crée une synergie positive"],
      es: ["Pareja dinámica y divertida", "La energía del otro crea sinergia positiva"],
      zh: ["充满活力和乐趣的伴侣", "彼此的能量产生积极的协同效应"],
    },
    cautions: {
      ko: ["B형의 변덕에 O형도 지칠 수 있음", "서로 책임지는 영역을 나눌 것"],
      en: ["O can also tire of B's moodiness", "Divide areas of responsibility clearly"],
      ja: ["B型の気まぐれにO型も疲れる可能性", "お互いが責任を持つ領域を分ける"],
      fr: ["O peut aussi se lasser des sautes d'humeur de B", "Diviser clairement les domaines de responsabilité"],
      es: ["O también puede cansarse de los cambios de humor de B", "Dividir claramente las áreas de responsabilidad"],
      zh: ["O型也可能会因B型的善变而感到疲倦", "明确划分各自负责的领域"],
    },
  },
  "O_O": {
    score: 80,
    grade: "good",
    bestMatch: "O",
    desc: {
      ko: ["두 사람 모두 리더십이 강해 서로를 잘 이해합니다.", "적극적이고 활동적인 커플입니다.", "주도권 다툼이 생길 수 있어 역할 분담이 중요합니다."],
      en: ["Both have strong leadership and understand each other well.", "An assertive and active couple.", "Power struggles can arise; role division is key."],
      ja: ["どちらもリーダーシップが強く、お互いをよく理解します。", "積極的で活動的なカップルです。", "主導権争いが生じる可能性があり、役割分担が重要です。"],
      fr: ["Tous deux ont un fort leadership et se comprennent bien.", "Un couple affirmé et actif.", "Des luttes de pouvoir peuvent survenir; la répartition des rôles est clé."],
      es: ["Ambos tienen fuerte liderazgo y se entienden bien.", "Una pareja asertiva y activa.", "Pueden surgir luchas de poder; la división de roles es clave."],
      zh: ["两人都有很强的领导力，相互理解深入。", "这是一对积极主动的伴侣。", "可能出现权力争夺，角色分工很重要。"],
    },
    strengths: {
      ko: ["공통된 목표를 향한 강력한 추진력", "서로의 야망을 응원하는 관계"],
      en: ["Strong drive toward shared goals", "A relationship that cheers on each other's ambitions"],
      ja: ["共通の目標に向けた強力な推進力", "お互いの野望を応援する関係"],
      fr: ["Fort dynamisme vers des objectifs communs", "Une relation qui encourage les ambitions de chacun"],
      es: ["Fuerte impulso hacia objetivos compartidos", "Una relación que alienta las ambiciones del otro"],
      zh: ["朝着共同目标的强大推动力", "相互支持各自抱负的关系"],
    },
    cautions: {
      ko: ["지배욕 충돌 조심", "서로 양보하고 협력하는 자세 필요"],
      en: ["Watch out for dominance conflicts", "Practice yielding and cooperating with each other"],
      ja: ["支配欲の衝突に注意", "お互いに譲り合い協力する姿勢が必要"],
      fr: ["Attention aux conflits de domination", "Pratiquer la cession mutuelle et la coopération"],
      es: ["Cuidado con los conflictos de dominación", "Practicar la cesión mutua y la cooperación"],
      zh: ["注意控制欲冲突", "需要相互退让和合作的态度"],
    },
  },
  "O_AB": {
    score: 73,
    grade: "good",
    bestMatch: "O",
    desc: {
      ko: ["O형의 포용력이 AB형의 복잡한 내면을 감싸줍니다.", "서로 다른 면이 흥미로운 관계를 만듭니다.", "AB형의 이중성을 O형이 이해하려는 노력이 필요합니다."],
      en: ["O's inclusiveness embraces AB's complex inner world.", "Differences create an interesting relationship.", "O needs effort to understand AB's duality."],
      ja: ["O型の包容力がAB型の複雑な内面を包み込みます。", "お互いの違いが興味深い関係を作ります。", "AB型の二面性をO型が理解しようとする努力が必要です。"],
      fr: ["L'inclusivité de O embrasse le monde intérieur complexe de AB.", "Les différences créent une relation intéressante.", "O doit faire des efforts pour comprendre la dualité de AB."],
      es: ["La inclusividad de O abraza el mundo interior complejo de AB.", "Las diferencias crean una relación interesante.", "O necesita esforzarse para entender la dualidad de AB."],
      zh: ["O型的包容力包裹着AB型复杂的内心世界。", "差异让两人的关系充满趣味。", "O型需要努力理解AB型的双重性。"],
    },
    strengths: {
      ko: ["O형의 안정감 + AB형의 창의성 조화", "서로에게 배울 점이 많은 관계"],
      en: ["O's stability + AB's creativity in harmony", "A relationship with much to learn from each other"],
      ja: ["O型の安定感 + AB型の創造性の調和", "お互いから学ぶことが多い関係"],
      fr: ["Stabilité de O + créativité de AB en harmonie", "Une relation avec beaucoup à apprendre l'un de l'autre"],
      es: ["Estabilidad de O + creatividad de AB en armonía", "Una relación con mucho que aprender el uno del otro"],
      zh: ["O型的稳定感 + AB型的创造力的和谐", "彼此有很多值得学习的地方"],
    },
    cautions: {
      ko: ["AB형의 감정 기복에 O형이 당황할 수 있음", "명확한 소통으로 오해 방지"],
      en: ["O may be puzzled by AB's emotional swings", "Clear communication to prevent misunderstandings"],
      ja: ["AB型の感情の起伏にO型が戸惑う可能性", "明確なコミュニケーションで誤解を防ぐ"],
      fr: ["O peut être déconcerté par les sautes d'humeur de AB", "Communication claire pour prévenir les malentendus"],
      es: ["O puede desconcertarse por los cambios emocionales de AB", "Comunicación clara para prevenir malentendidos"],
      zh: ["O型可能会对AB型的情绪波动感到困惑", "通过清晰沟通防止误解"],
    },
  },
  "AB_A": {
    score: 75,
    grade: "good",
    bestMatch: "AB",
    desc: {
      ko: ["AB형의 이성적 사고가 A형의 감성을 잘 보완합니다.", "지적 교류가 풍부한 관계입니다.", "AB형이 감정적 소통에 더 신경을 쓸 필요가 있습니다."],
      en: ["AB's rational thinking complements A's emotional side.", "A relationship rich in intellectual exchange.", "AB needs to pay more attention to emotional communication."],
      ja: ["AB型の理性的な思考がA型の感性をよく補います。", "知的交流が豊富な関係です。", "AB型が感情的なコミュニケーションにより気を配る必要があります。"],
      fr: ["La pensée rationnelle de AB complète le côté émotionnel de A.", "Une relation riche en échanges intellectuels.", "AB doit accorder plus d'attention à la communication émotionnelle."],
      es: ["El pensamiento racional de AB complementa el lado emocional de A.", "Una relación rica en intercambio intelectual.", "AB necesita prestar más atención a la comunicación emocional."],
      zh: ["AB型的理性思维很好地补充了A型的感性一面。", "这是一段充满智识交流的关系。", "AB型需要更注重情感沟通。"],
    },
    strengths: {
      ko: ["이성과 감성의 균형", "서로에게 자극이 되는 지적 토론"],
      en: ["Balance of reason and emotion", "Intellectually stimulating discussions"],
      ja: ["理性と感性のバランス", "お互いに刺激となる知的議論"],
      fr: ["Équilibre de raison et d'émotion", "Discussions intellectuellement stimulantes"],
      es: ["Equilibrio de razón y emoción", "Discusiones intelectualmente estimulantes"],
      zh: ["理性与感性的平衡", "相互激励的智识讨论"],
    },
    cautions: {
      ko: ["AB형의 냉정함이 A형에게 상처를 줄 수 있음", "감정적 따뜻함 표현을 의식적으로 늘릴 것"],
      en: ["AB's coolness can hurt A", "Consciously increase expressions of emotional warmth"],
      ja: ["AB型の冷静さがA型を傷つける可能性", "感情的な温かみの表現を意識的に増やすこと"],
      fr: ["Le calme de AB peut blesser A", "Augmenter consciemment les expressions de chaleur émotionnelle"],
      es: ["La frialdad de AB puede herir a A", "Aumentar conscientemente las expresiones de calidez emocional"],
      zh: ["AB型的冷静可能伤害A型", "有意识地增加情感温暖的表达"],
    },
  },
  "AB_B": {
    score: 72,
    grade: "good",
    bestMatch: "AB",
    desc: {
      ko: ["두 사람 모두 독특한 개성을 지녀 서로 흥미롭게 느낍니다.", "창의적이고 자유로운 분위기가 형성됩니다.", "각자의 세계가 강해 오래 유지하려면 노력이 필요합니다."],
      en: ["Both have unique personalities and find each other interesting.", "Creates a creative and free atmosphere.", "Strong individual worlds require effort to maintain long-term."],
      ja: ["どちらも個性的で、お互いを面白いと感じます。", "創造的で自由な雰囲気が生まれます。", "それぞれの世界が強く、長期間維持するには努力が必要です。"],
      fr: ["Tous deux ont des personnalités uniques et se trouvent intéressants.", "Crée une atmosphère créative et libre.", "Des mondes individuels forts nécessitent des efforts pour durer."],
      es: ["Ambos tienen personalidades únicas y se encuentran interesantes.", "Crea una atmósfera creativa y libre.", "Los mundos individuales fuertes requieren esfuerzo para mantenerse."],
      zh: ["两人都有独特个性，彼此觉得有趣。", "形成创意自由的氛围。", "各自的独立世界强烈，长期维系需要努力。"],
    },
    strengths: {
      ko: ["창의적 에너지와 독창적인 아이디어 공유", "서로의 자유로운 면을 존중"],
      en: ["Share creative energy and original ideas", "Respect each other's free-spirited side"],
      ja: ["創造的なエネルギーと独自のアイデアを共有", "お互いの自由な面を尊重"],
      fr: ["Partager énergie créative et idées originales", "Respecter le côté libre de l'autre"],
      es: ["Compartir energía creativa e ideas originales", "Respetar el lado libre del otro"],
      zh: ["共享创意能量和独特想法", "尊重彼此自由的一面"],
    },
    cautions: {
      ko: ["안정적 기반 구축이 어려울 수 있음", "공통 목표와 루틴 만들기 필요"],
      en: ["Building a stable foundation can be difficult", "Need to create shared goals and routines"],
      ja: ["安定した基盤を構築するのが難しい場合あり", "共通の目標とルーティンを作ることが必要"],
      fr: ["Construire une base stable peut être difficile", "Besoin de créer des objectifs communs et des routines"],
      es: ["Construir una base estable puede ser difícil", "Necesitan crear objetivos y rutinas compartidos"],
      zh: ["可能难以建立稳定的基础", "需要建立共同目标和常规"],
    },
  },
  "AB_O": {
    score: 73,
    grade: "good",
    bestMatch: "O",
    desc: {
      ko: ["O형의 포용력이 AB형의 복잡한 성격을 받아들입니다.", "두 사람은 서로에게서 배울 점이 많습니다.", "AB형이 감정적으로 더 열려있어야 합니다."],
      en: ["O's inclusiveness accepts AB's complex nature.", "Both have much to learn from each other.", "AB should be more emotionally open."],
      ja: ["O型の包容力がAB型の複雑な性格を受け入れます。", "お互いから学ぶことが多いです。", "AB型はもっと感情的にオープンである必要があります。"],
      fr: ["L'inclusivité de O accepte la nature complexe de AB.", "Tous deux ont beaucoup à apprendre l'un de l'autre.", "AB devrait être plus ouvert émotionnellement."],
      es: ["La inclusividad de O acepta la naturaleza compleja de AB.", "Ambos tienen mucho que aprender el uno del otro.", "AB debería ser más emocionalmente abierto."],
      zh: ["O型的包容力接受AB型复杂的性格。", "两人都有很多值得互相学习的地方。", "AB型应该在情感上更开放。"],
    },
    strengths: {
      ko: ["서로 다른 강점이 시너지를 이룸", "O형의 활동성 + AB형의 분석력"],
      en: ["Different strengths create synergy", "O's activity + AB's analytical mind"],
      ja: ["異なる強みがシナジーを生む", "O型の活動性 + AB型の分析力"],
      fr: ["Des forces différentes créent de la synergie", "L'activité de O + l'esprit analytique de AB"],
      es: ["Diferentes fortalezas crean sinergia", "La actividad de O + la mente analítica de AB"],
      zh: ["不同的优势产生协同效应", "O型的活动力 + AB型的分析能力"],
    },
    cautions: {
      ko: ["AB형의 냉정함이 O형을 서운하게 만들 수 있음", "감정적 연결을 의식적으로 강화할 것"],
      en: ["AB's coolness may hurt O's feelings", "Consciously strengthen emotional connection"],
      ja: ["AB型の冷静さがO型を寂しくさせる可能性", "感情的なつながりを意識的に強化する"],
      fr: ["Le calme de AB peut blesser les sentiments de O", "Renforcer consciemment la connexion émotionnelle"],
      es: ["La frialdad de AB puede herir los sentimientos de O", "Fortalecer conscientemente la conexión emocional"],
      zh: ["AB型的冷静可能伤害O型的感情", "有意识地加强情感联系"],
    },
  },
  "AB_AB": {
    score: 68,
    grade: "normal",
    bestMatch: "O",
    desc: {
      ko: ["두 AB형이 만나면 매우 지적이고 독특한 관계가 됩니다.", "서로를 완전히 이해하지만 감정적 교류가 부족할 수 있습니다.", "합리적 사고가 지배하는 차가운 관계가 될 위험이 있습니다."],
      en: ["Two ABs create a very intellectual and unique relationship.", "They understand each other fully but may lack emotional exchange.", "Risk of becoming a cold, logic-dominated relationship."],
      ja: ["二人のAB型が出会うと非常に知的でユニークな関係になります。", "お互いを完全に理解しますが、感情的な交流が不足する可能性があります。", "合理的思考が支配する冷たい関係になる危険があります。"],
      fr: ["Deux AB créent une relation très intellectuelle et unique.", "Ils se comprennent pleinement mais peuvent manquer d'échanges émotionnels.", "Risque de devenir une relation froide dominée par la logique."],
      es: ["Dos AB crean una relación muy intelectual y única.", "Se comprenden completamente pero pueden carecer de intercambio emocional.", "Riesgo de convertirse en una relación fría dominada por la lógica."],
      zh: ["两个AB型相遇会形成极具智识性和独特性的关系。", "彼此理解深入，但可能缺乏情感交流。", "有变成由理性主导的冷漠关系的风险。"],
    },
    strengths: {
      ko: ["서로를 완전히 이해하는 지적 동반자", "독립성을 존중하는 성숙한 관계"],
      en: ["Intellectual partners who fully understand each other", "Mature relationship respecting independence"],
      ja: ["お互いを完全に理解する知的パートナー", "独立性を尊重する成熟した関係"],
      fr: ["Partenaires intellectuels qui se comprennent pleinement", "Relation mature respectant l'indépendance"],
      es: ["Socios intelectuales que se entienden plenamente", "Relación madura que respeta la independencia"],
      zh: ["完全相互理解的智识伙伴", "尊重独立性的成熟关系"],
    },
    cautions: {
      ko: ["감정적 따뜻함이 부족해질 수 있음", "의도적으로 로맨틱한 순간을 만들 노력 필요"],
      en: ["May lack emotional warmth", "Need to intentionally create romantic moments"],
      ja: ["感情的な温かみが不足する可能性", "意図的にロマンチックな瞬間を作る努力が必要"],
      fr: ["Peut manquer de chaleur émotionnelle", "Besoin de créer intentionnellement des moments romantiques"],
      es: ["Puede faltar calidez emocional", "Necesitan crear intencionalmente momentos románticos"],
      zh: ["可能缺乏情感温暖", "需要有意识地创造浪漫时刻"],
    },
  },
};

function getCompatData(a: BloodType, b: BloodType): CompatData {
  const key = `${a}_${b}` as PairKey;
  return COMPAT[key];
}

function getScoreColor(score: number): string {
  if (score >= 85) return "text-pink-600";
  if (score >= 75) return "text-blue-600";
  if (score >= 65) return "text-green-600";
  return "text-orange-600";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BloodTypeCompatibility({ locale }: Props) {
  const [type1, setType1] = useState<BloodType | "">("");
  const [type2, setType2] = useState<BloodType | "">("");
  const [result, setResult] = useState<CompatData | null>(null);

  const ui = UI[locale] ?? UI.en;
  const gradeLabels = GRADE_LABELS[locale] ?? GRADE_LABELS.en;
  const TYPES: BloodType[] = ["A", "B", "O", "AB"];

  function calculate() {
    if (!type1 || !type2) return;
    setResult(getCompatData(type1, type2));
  }

  function reset() {
    setType1("");
    setType2("");
    setResult(null);
  }

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{ui.title}</h1>
        <p className="mt-1 text-gray-500 text-sm">{ui.subtitle}</p>
      </div>

      {!result ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Person 1 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{ui.person1}</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType1(t)}
                    className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                      type1 === t
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-white text-gray-700 border-gray-200 hover:border-red-300"
                    }`}
                  >
                    {ui.types[t]}
                  </button>
                ))}
              </div>
            </div>
            {/* Person 2 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{ui.person2}</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType2(t)}
                    className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                      type2 === t
                        ? "bg-purple-500 text-white border-purple-500"
                        : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                    }`}
                  >
                    {ui.types[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected display */}
          {(type1 || type2) && (
            <div className="flex items-center justify-center gap-4 mb-4 py-3 bg-gray-50 rounded-xl">
              <span className={`text-2xl font-black ${type1 ? "text-red-500" : "text-gray-300"}`}>
                {type1 ? ui.types[type1] : "?"}
              </span>
              <span className="text-gray-400 text-xl">❤️</span>
              <span className={`text-2xl font-black ${type2 ? "text-purple-500" : "text-gray-300"}`}>
                {type2 ? ui.types[type2] : "?"}
              </span>
            </div>
          )}

          <button
            onClick={calculate}
            disabled={!type1 || !type2}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-purple-500 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {ui.calcBtn}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Score card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="text-3xl font-black text-red-500">{ui.types[type1 as BloodType]}</span>
              <span className="text-2xl">❤️</span>
              <span className="text-3xl font-black text-purple-500">{ui.types[type2 as BloodType]}</span>
            </div>
            <div className={`text-6xl font-black mb-2 ${getScoreColor(result.score)}`}>
              {result.score}
              <span className="text-2xl text-gray-400">/ 100</span>
            </div>
            <div className={`text-lg font-bold ${GRADE_COLORS[result.grade]}`}>
              {gradeLabels[result.grade]}
            </div>
            <div className="mt-3 flex justify-center">
              <div className="w-full max-w-xs bg-gray-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-700"
                  style={{
                    width: `${result.score}%`,
                    background: result.score >= 85 ? "#ec4899" : result.score >= 75 ? "#3b82f6" : result.score >= 65 ? "#22c55e" : "#f97316",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">{ui.descLabel}</h3>
            <ul className="space-y-2">
              {result.desc[locale]?.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Strengths & Cautions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-2xl p-4">
              <h3 className="font-bold text-blue-700 text-sm mb-2">{ui.strengthsLabel}</h3>
              <ul className="space-y-1">
                {result.strengths[locale]?.map((s, i) => (
                  <li key={i} className="text-xs text-blue-600 flex gap-1">
                    <span>✦</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-orange-50 rounded-2xl p-4">
              <h3 className="font-bold text-orange-700 text-sm mb-2">{ui.cautionsLabel}</h3>
              <ul className="space-y-1">
                {result.cautions[locale]?.map((c, i) => (
                  <li key={i} className="text-xs text-orange-600 flex gap-1">
                    <span>⚠</span><span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Best match */}
          <div className="bg-pink-50 rounded-2xl p-4 text-center">
            <p className="text-sm text-pink-600">
              {ui.bestMatchLabel}:{" "}
              <span className="font-black text-pink-700">{ui.types[result.bestMatch]}</span>
            </p>
          </div>

          <button
            onClick={reset}
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            {ui.resetBtn}
          </button>
        </div>
      )}
    </div>
  );
}
