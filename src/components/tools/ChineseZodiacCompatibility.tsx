import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ZodiacAnimal =
  | "rat" | "ox" | "tiger" | "rabbit" | "dragon" | "snake"
  | "horse" | "goat" | "monkey" | "rooster" | "dog" | "pig";

type RelationType = "triad" | "sixharmony" | "conflict" | "harm" | "neutral";

// The 12 animals in cycle order (starting from rat = 0)
const ANIMALS: ZodiacAnimal[] = [
  "rat", "ox", "tiger", "rabbit", "dragon", "snake",
  "horse", "goat", "monkey", "rooster", "dog", "pig",
];

const ANIMAL_EMOJI: Record<ZodiacAnimal, string> = {
  rat: "🐭", ox: "🐂", tiger: "🐯", rabbit: "🐰",
  dragon: "🐲", snake: "🐍", horse: "🐴", goat: "🐑",
  monkey: "🐵", rooster: "🐓", dog: "🐕", pig: "🐷",
};

function getAnimal(year: number): ZodiacAnimal {
  // Rat year: 1924, 1936, 1948, ... (base: 1924)
  return ANIMALS[((year - 1924) % 12 + 12) % 12];
}

// ─── UI i18n ──────────────────────────────────────────────────────────────────

const UI: Record<Locale, {
  title: string;
  subtitle: string;
  person1Year: string;
  person2Year: string;
  yearPlaceholder: string;
  calcBtn: string;
  resetBtn: string;
  animalLabel: string;
  scoreLabel: string;
  relationLabel: string;
  descLabel: string;
  animals: Record<ZodiacAnimal, string>;
  relations: Record<RelationType, string>;
  relationDesc: Record<RelationType, string>;
}> = {
  ko: {
    title: "띠 궁합",
    subtitle: "태어난 연도로 두 사람의 띠 궁합을 알아보세요",
    person1Year: "첫 번째 사람 출생연도",
    person2Year: "두 번째 사람 출생연도",
    yearPlaceholder: "연도 선택",
    calcBtn: "궁합 보기",
    resetBtn: "다시 하기",
    animalLabel: "띠",
    scoreLabel: "궁합 점수",
    relationLabel: "관계 유형",
    descLabel: "궁합 설명",
    animals: {
      rat: "쥐", ox: "소", tiger: "호랑이", rabbit: "토끼",
      dragon: "용", snake: "뱀", horse: "말", goat: "양",
      monkey: "원숭이", rooster: "닭", dog: "개", pig: "돼지",
    },
    relations: {
      triad: "삼합(三合) ✨",
      sixharmony: "육합(六合) 💞",
      conflict: "충(沖) ⚡",
      harm: "형충파해(刑沖破害) ⚠️",
      neutral: "보통 🤝",
    },
    relationDesc: {
      triad: "삼합 관계는 최고의 궁합입니다. 서로를 완벽하게 보완하며 강력한 팀워크를 이룹니다.",
      sixharmony: "육합 관계는 자연스럽고 조화로운 궁합입니다. 서로 잘 맞고 상생합니다.",
      conflict: "충(沖) 관계는 직접적 대립이 생길 수 있습니다. 노력이 필요하지만 서로 자극이 되기도 합니다.",
      harm: "형충파해 관계는 마찰이 생기기 쉽습니다. 상호 이해와 배려로 극복할 수 있습니다.",
      neutral: "무난한 관계입니다. 서로의 차이를 이해하고 존중하면 좋은 관계가 됩니다.",
    },
  },
  en: {
    title: "Chinese Zodiac Compatibility",
    subtitle: "Find out compatibility based on birth year zodiac animals",
    person1Year: "First Person's Birth Year",
    person2Year: "Second Person's Birth Year",
    yearPlaceholder: "Select Year",
    calcBtn: "Check Compatibility",
    resetBtn: "Try Again",
    animalLabel: "Zodiac",
    scoreLabel: "Compatibility Score",
    relationLabel: "Relationship Type",
    descLabel: "Compatibility Description",
    animals: {
      rat: "Rat", ox: "Ox", tiger: "Tiger", rabbit: "Rabbit",
      dragon: "Dragon", snake: "Snake", horse: "Horse", goat: "Goat",
      monkey: "Monkey", rooster: "Rooster", dog: "Dog", pig: "Pig",
    },
    relations: {
      triad: "Triad (San He) ✨",
      sixharmony: "Six Harmony (Liu He) 💞",
      conflict: "Clash (Chong) ⚡",
      harm: "Harm/Break (Xing Chong) ⚠️",
      neutral: "Neutral 🤝",
    },
    relationDesc: {
      triad: "Triad animals are the best match. They complement each other perfectly and form powerful partnerships.",
      sixharmony: "Six Harmony means a natural, harmonious match. They get along easily and support each other.",
      conflict: "Clash signs may face direct opposition. With effort they can still motivate each other.",
      harm: "This pairing tends toward friction. Mutual understanding and care can help overcome challenges.",
      neutral: "A neutral pairing. Understanding and respecting differences leads to a good relationship.",
    },
  },
  ja: {
    title: "干支相性診断",
    subtitle: "生まれた年の干支で二人の相性を調べましょう",
    person1Year: "一人目の生まれ年",
    person2Year: "二人目の生まれ年",
    yearPlaceholder: "年を選ぶ",
    calcBtn: "相性を見る",
    resetBtn: "もう一度",
    animalLabel: "干支",
    scoreLabel: "相性スコア",
    relationLabel: "関係タイプ",
    descLabel: "相性の説明",
    animals: {
      rat: "ネズミ", ox: "ウシ", tiger: "トラ", rabbit: "ウサギ",
      dragon: "タツ", snake: "ヘビ", horse: "ウマ", goat: "ヒツジ",
      monkey: "サル", rooster: "トリ", dog: "イヌ", pig: "イノシシ",
    },
    relations: {
      triad: "三合 ✨",
      sixharmony: "六合 💞",
      conflict: "沖 ⚡",
      harm: "刑沖破害 ⚠️",
      neutral: "普通 🤝",
    },
    relationDesc: {
      triad: "三合の関係は最高の相性です。お互いを完璧に補い合い、強力なチームワークを発揮します。",
      sixharmony: "六合の関係は自然で調和のとれた相性です。相性が良く、お互いを高め合います。",
      conflict: "沖の関係は直接的な対立が生じる可能性があります。努力次第でお互いに刺激し合えます。",
      harm: "刑沖破害の関係は摩擦が生じやすいです。相互理解と思いやりで乗り越えられます。",
      neutral: "普通の関係です。お互いの違いを理解し尊重することで良い関係になれます。",
    },
  },
  fr: {
    title: "Compatibilité Zodiaque Chinois",
    subtitle: "Découvrez la compatibilité selon les animaux du zodiaque",
    person1Year: "Année de Naissance (Personne 1)",
    person2Year: "Année de Naissance (Personne 2)",
    yearPlaceholder: "Sélectionner l'Année",
    calcBtn: "Vérifier la Compatibilité",
    resetBtn: "Recommencer",
    animalLabel: "Signe",
    scoreLabel: "Score de Compatibilité",
    relationLabel: "Type de Relation",
    descLabel: "Description de Compatibilité",
    animals: {
      rat: "Rat", ox: "Bœuf", tiger: "Tigre", rabbit: "Lapin",
      dragon: "Dragon", snake: "Serpent", horse: "Cheval", goat: "Chèvre",
      monkey: "Singe", rooster: "Coq", dog: "Chien", pig: "Cochon",
    },
    relations: {
      triad: "Triade (San He) ✨",
      sixharmony: "Six Harmonies (Liu He) 💞",
      conflict: "Conflit (Chong) ⚡",
      harm: "Nuisance/Rupture ⚠️",
      neutral: "Neutre 🤝",
    },
    relationDesc: {
      triad: "Les animaux de triade sont les meilleurs partenaires. Ils se complètent parfaitement.",
      sixharmony: "Six Harmonies signifie une association naturelle et harmonieuse.",
      conflict: "Les signes en conflit peuvent faire face à une opposition directe.",
      harm: "Cette association tend aux frictions. La compréhension mutuelle peut surmonter les défis.",
      neutral: "Une association neutre. Respecter les différences mène à une bonne relation.",
    },
  },
  es: {
    title: "Compatibilidad del Zodiaco Chino",
    subtitle: "Descubre la compatibilidad según los animales del zodíaco",
    person1Year: "Año de Nacimiento (Persona 1)",
    person2Year: "Año de Nacimiento (Persona 2)",
    yearPlaceholder: "Seleccionar Año",
    calcBtn: "Ver Compatibilidad",
    resetBtn: "Intentar de Nuevo",
    animalLabel: "Signo",
    scoreLabel: "Puntuación de Compatibilidad",
    relationLabel: "Tipo de Relación",
    descLabel: "Descripción de Compatibilidad",
    animals: {
      rat: "Rata", ox: "Buey", tiger: "Tigre", rabbit: "Conejo",
      dragon: "Dragón", snake: "Serpiente", horse: "Caballo", goat: "Cabra",
      monkey: "Mono", rooster: "Gallo", dog: "Perro", pig: "Cerdo",
    },
    relations: {
      triad: "Tríada (San He) ✨",
      sixharmony: "Seis Armonías (Liu He) 💞",
      conflict: "Choque (Chong) ⚡",
      harm: "Daño/Ruptura ⚠️",
      neutral: "Neutro 🤝",
    },
    relationDesc: {
      triad: "Los animales tríada son los mejores compañeros. Se complementan perfectamente.",
      sixharmony: "Seis Armonías significa una asociación natural y armoniosa.",
      conflict: "Los signos en conflicto pueden enfrentarse a una oposición directa.",
      harm: "Esta combinación tiende a la fricción. La comprensión mutua puede superar los desafíos.",
      neutral: "Una combinación neutra. Respetar las diferencias lleva a una buena relación.",
    },
  },
  zh: {
    title: "生肖配对",
    subtitle: "通过出生年份的生肖了解两人的配对",
    person1Year: "第一个人的出生年份",
    person2Year: "第二个人的出生年份",
    yearPlaceholder: "选择年份",
    calcBtn: "查看配对",
    resetBtn: "重新测试",
    animalLabel: "生肖",
    scoreLabel: "配对分数",
    relationLabel: "关系类型",
    descLabel: "配对说明",
    animals: {
      rat: "鼠", ox: "牛", tiger: "虎", rabbit: "兔",
      dragon: "龙", snake: "蛇", horse: "马", goat: "羊",
      monkey: "猴", rooster: "鸡", dog: "狗", pig: "猪",
    },
    relations: {
      triad: "三合 ✨",
      sixharmony: "六合 💞",
      conflict: "相冲 ⚡",
      harm: "刑冲破害 ⚠️",
      neutral: "普通 🤝",
    },
    relationDesc: {
      triad: "三合关系是最好的配对。彼此完美互补，形成强大的合作关系。",
      sixharmony: "六合意味着自然和谐的配对，相处融洽，相互扶持。",
      conflict: "相冲可能面临直接对立，但努力后也能相互激励。",
      harm: "刑冲破害组合容易产生摩擦，相互理解和关怀可以克服困难。",
      neutral: "普通关系，理解和尊重彼此的差异可以形成良好关系。",
    },
  },
};

// ─── Compatibility Matrix ─────────────────────────────────────────────────────
// Index = animal index (0=rat, 1=ox, ..., 11=pig)

// 三合 (San He - Triad): strongest compatibility groups
// Group 1: Rat(0), Dragon(4), Monkey(8)
// Group 2: Ox(1), Snake(5), Rooster(9)
// Group 3: Tiger(2), Horse(6), Dog(10)
// Group 4: Rabbit(3), Goat(7), Pig(11)

// 六合 (Liu He - Six Harmony): pairs
// Rat(0)-Ox(1), Tiger(2)-Pig(11), Rabbit(3)-Dog(10),
// Dragon(4)-Rooster(9), Snake(5)-Monkey(8), Horse(6)-Goat(7)

// 相沖 (Clash): 6 apart
// Rat(0)-Horse(6), Ox(1)-Goat(7), Tiger(2)-Monkey(8),
// Rabbit(3)-Rooster(9), Dragon(4)-Dog(10), Snake(5)-Pig(11)

// 刑/破/害 (Harm/Break): specific pairs
const HARM_PAIRS: Array<[number, number]> = [
  [0, 7],   // Rat - Goat
  [1, 10],  // Ox - Dog
  [2, 11],  // Tiger - Pig
  [3, 4],   // Rabbit - Dragon
  [5, 6],   // Snake - Horse
  [8, 9],   // Monkey - Rooster
];

const TRIADS: number[][] = [
  [0, 4, 8],   // Rat, Dragon, Monkey
  [1, 5, 9],   // Ox, Snake, Rooster
  [2, 6, 10],  // Tiger, Horse, Dog
  [3, 7, 11],  // Rabbit, Goat, Pig
];

const SIX_HARMONY: Array<[number, number]> = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7],
];

function getRelationType(a: ZodiacAnimal, b: ZodiacAnimal): RelationType {
  const ai = ANIMALS.indexOf(a);
  const bi = ANIMALS.indexOf(b);

  if (ai === bi) return "neutral";

  // Check triad
  for (const group of TRIADS) {
    if (group.includes(ai) && group.includes(bi)) return "triad";
  }

  // Check six harmony
  for (const [x, y] of SIX_HARMONY) {
    if ((ai === x && bi === y) || (ai === y && bi === x)) return "sixharmony";
  }

  // Check clash (6 apart)
  if (Math.abs(ai - bi) === 6) return "conflict";

  // Check harm
  for (const [x, y] of HARM_PAIRS) {
    if ((ai === x && bi === y) || (ai === y && bi === x)) return "harm";
  }

  return "neutral";
}

// Score based on relation type
const RELATION_SCORES: Record<RelationType, number> = {
  triad: 95,
  sixharmony: 85,
  neutral: 68,
  harm: 52,
  conflict: 45,
};

// Add positional variation (±5) based on specific pair for more nuance
function getScore(a: ZodiacAnimal, b: ZodiacAnimal): number {
  const relation = getRelationType(a, b);
  const base = RELATION_SCORES[relation];
  const ai = ANIMALS.indexOf(a);
  const bi = ANIMALS.indexOf(b);
  // small deterministic variance
  const offset = ((ai * 3 + bi * 7) % 11) - 5;
  const score = Math.min(100, Math.max(0, base + offset));
  return score;
}

function getScoreColor(score: number): string {
  if (score >= 85) return "text-pink-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 55) return "text-green-600";
  return "text-orange-600";
}

const RELATION_COLORS: Record<RelationType, string> = {
  triad: "bg-pink-100 text-pink-700",
  sixharmony: "bg-purple-100 text-purple-700",
  neutral: "bg-gray-100 text-gray-700",
  harm: "bg-yellow-100 text-yellow-700",
  conflict: "bg-orange-100 text-orange-700",
};

// ─── Detailed compatibility descriptions (144 combinations) ──────────────────
// Rather than hard-coding all 144, we generate descriptions from relation type
// and augment with animal-specific traits

const ANIMAL_TRAITS: Record<Locale, Record<ZodiacAnimal, string>> = {
  ko: {
    rat: "영리하고 사교적",
    ox: "부지런하고 신뢰할 수 있는",
    tiger: "용감하고 카리스마 넘치는",
    rabbit: "친절하고 섬세한",
    dragon: "야망 있고 자신감 넘치는",
    snake: "지혜롭고 직관력 있는",
    horse: "자유롭고 열정적인",
    goat: "온화하고 창의적인",
    monkey: "영리하고 재치 있는",
    rooster: "근면하고 꼼꼼한",
    dog: "충실하고 정직한",
    pig: "관대하고 따뜻한",
  },
  en: {
    rat: "clever and sociable",
    ox: "diligent and reliable",
    tiger: "brave and charismatic",
    rabbit: "kind and gentle",
    dragon: "ambitious and confident",
    snake: "wise and intuitive",
    horse: "free-spirited and passionate",
    goat: "gentle and creative",
    monkey: "smart and witty",
    rooster: "hardworking and meticulous",
    dog: "loyal and honest",
    pig: "generous and warm-hearted",
  },
  ja: {
    rat: "賢くて社交的",
    ox: "勤勉で信頼できる",
    tiger: "勇敢でカリスマ的",
    rabbit: "親切で繊細",
    dragon: "野心的で自信に満ちた",
    snake: "賢明で直感的",
    horse: "自由奔放で情熱的",
    goat: "穏やかで創造的",
    monkey: "賢くて機知に富んだ",
    rooster: "勤勉で几帳面",
    dog: "忠実で正直",
    pig: "寛大で温かい",
  },
  fr: {
    rat: "intelligent et sociable",
    ox: "diligent et fiable",
    tiger: "courageux et charismatique",
    rabbit: "gentil et délicat",
    dragon: "ambitieux et confiant",
    snake: "sage et intuitif",
    horse: "libre et passionné",
    goat: "doux et créatif",
    monkey: "astucieux et plein d'esprit",
    rooster: "travailleur et méticuleux",
    dog: "loyal et honnête",
    pig: "généreux et chaleureux",
  },
  es: {
    rat: "inteligente y sociable",
    ox: "diligente y confiable",
    tiger: "valiente y carismático",
    rabbit: "amable y delicado",
    dragon: "ambicioso y seguro",
    snake: "sabio e intuitivo",
    horse: "libre y apasionado",
    goat: "gentil y creativo",
    monkey: "astuto e ingenioso",
    rooster: "trabajador y meticuloso",
    dog: "leal y honesto",
    pig: "generoso y cálido",
  },
  zh: {
    rat: "聪明善交际",
    ox: "勤劳可靠",
    tiger: "勇敢有魅力",
    rabbit: "亲切细腻",
    dragon: "有野心自信",
    snake: "睿智直觉强",
    horse: "自由热情",
    goat: "温和有创意",
    monkey: "机智聪颖",
    rooster: "勤劳细心",
    dog: "忠实诚实",
    pig: "慷慨温暖",
  },
};

function buildDesc(a: ZodiacAnimal, b: ZodiacAnimal, locale: Locale): string[] {
  const relation = getRelationType(a, b);
  const ui = UI[locale] ?? UI.en;
  const traits = ANIMAL_TRAITS[locale] ?? ANIMAL_TRAITS.en;
  const aName = ui.animals[a];
  const bName = ui.animals[b];
  const aTrait = traits[a];
  const bTrait = traits[b];

  const descTemplates: Record<Locale, Record<RelationType, string[]>> = {
    ko: {
      triad: [
        `${ANIMAL_EMOJI[a]} ${aName}(${aTrait})와 ${ANIMAL_EMOJI[b]} ${bName}(${bTrait})는 삼합(三合) 관계입니다.`,
        "서로의 장점이 완벽하게 맞아 떨어져 강력한 유대감을 형성합니다.",
        "이 조합은 최고의 파트너십으로 장기적 관계에서 더욱 빛을 발합니다.",
      ],
      sixharmony: [
        `${ANIMAL_EMOJI[a]} ${aName}(${aTrait})와 ${ANIMAL_EMOJI[b]} ${bName}(${bTrait})는 육합(六合) 관계입니다.`,
        "자연스러운 조화와 상호 이해가 깊어 함께 있으면 편안합니다.",
        "서로 지지하고 성장하는 안정적인 파트너십입니다.",
      ],
      conflict: [
        `${ANIMAL_EMOJI[a]} ${aName}(${aTrait})와 ${ANIMAL_EMOJI[b]} ${bName}(${bTrait})는 충(沖) 관계입니다.`,
        "성향과 방향이 다른 부분이 있어 때로 갈등이 생길 수 있습니다.",
        "하지만 서로 다른 에너지가 자극이 되어 성장하는 계기가 되기도 합니다.",
      ],
      harm: [
        `${ANIMAL_EMOJI[a]} ${aName}(${aTrait})와 ${ANIMAL_EMOJI[b]} ${bName}(${bTrait})는 형충파해 관계입니다.`,
        "서로 마찰이 생기기 쉬운 조합이지만 불가능하지 않습니다.",
        "상호 이해와 배려, 그리고 인내심이 이 관계의 핵심입니다.",
      ],
      neutral: [
        `${ANIMAL_EMOJI[a]} ${aName}(${aTrait})와 ${ANIMAL_EMOJI[b]} ${bName}(${bTrait})는 평범한 관계입니다.`,
        "서로 크게 부딪히지 않으며 무난한 관계를 유지합니다.",
        "서로의 차이를 인정하고 노력한다면 좋은 관계가 될 수 있습니다.",
      ],
    },
    en: {
      triad: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) and ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) share a Triad (San He) bond.`,
        "Your complementary strengths create a powerful and lasting connection.",
        "This is one of the best pairings in Chinese astrology, shining in long-term relationships.",
      ],
      sixharmony: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) and ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) share a Six Harmony (Liu He) bond.`,
        "Natural harmony and deep mutual understanding make you comfortable together.",
        "A supportive and stable partnership where both grow together.",
      ],
      conflict: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) and ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) are in a Clash (Chong) relationship.`,
        "Different natures can create friction, but also exciting energy.",
        "With patience and respect, this challenge can become a source of growth.",
      ],
      harm: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) and ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) have a Harm/Break dynamic.`,
        "This pairing tends toward misunderstandings or friction.",
        "Mutual care, open communication, and patience are essential for this relationship.",
      ],
      neutral: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) and ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) have a neutral pairing.`,
        "There are no major conflicts, making for a steady, uncomplicated relationship.",
        "Appreciating each other's differences can strengthen this bond over time.",
      ],
    },
    ja: {
      triad: [
        `${ANIMAL_EMOJI[a]} ${aName}（${aTrait}）と${ANIMAL_EMOJI[b]} ${bName}（${bTrait}）は三合の関係です。`,
        "お互いの強みが完璧に補い合い、強力な絆を形成します。",
        "中国占星術において最高の組み合わせのひとつで、長期的な関係で特に輝きます。",
      ],
      sixharmony: [
        `${ANIMAL_EMOJI[a]} ${aName}（${aTrait}）と${ANIMAL_EMOJI[b]} ${bName}（${bTrait}）は六合の関係です。`,
        "自然な調和と深い相互理解があり、一緒にいると心地よいです。",
        "お互いを支え合い成長できる安定したパートナーシップです。",
      ],
      conflict: [
        `${ANIMAL_EMOJI[a]} ${aName}（${aTrait}）と${ANIMAL_EMOJI[b]} ${bName}（${bTrait}）は沖の関係です。`,
        "性格や方向性の違いがあり、時に衝突が生じる可能性があります。",
        "しかし、互いの違いが刺激となり成長の機会となることもあります。",
      ],
      harm: [
        `${ANIMAL_EMOJI[a]} ${aName}（${aTrait}）と${ANIMAL_EMOJI[b]} ${bName}（${bTrait}）は刑沖破害の関係です。`,
        "摩擦が生じやすい組み合わせですが、不可能ではありません。",
        "相互理解と思いやり、そして忍耐がこの関係の核心です。",
      ],
      neutral: [
        `${ANIMAL_EMOJI[a]} ${aName}（${aTrait}）と${ANIMAL_EMOJI[b]} ${bName}（${bTrait}）は普通の関係です。`,
        "大きな衝突はなく、穏やかな関係を維持できます。",
        "お互いの違いを認め努力することで良い関係になれます。",
      ],
    },
    fr: {
      triad: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) et ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) partagent un lien de Triade (San He).`,
        "Vos forces complémentaires créent une connexion puissante et durable.",
        "L'un des meilleurs assortiments en astrologie chinoise, brillant dans les relations durables.",
      ],
      sixharmony: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) et ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) partagent un lien de Six Harmonies.`,
        "Une harmonie naturelle et une compréhension mutuelle profonde vous mettent à l'aise ensemble.",
        "Un partenariat stable et soutenant où les deux grandissent ensemble.",
      ],
      conflict: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) et ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) sont dans une relation de Conflit.`,
        "Des natures différentes peuvent créer des frictions mais aussi une énergie excitante.",
        "Avec patience et respect, ce défi peut devenir une source de croissance.",
      ],
      harm: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) et ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) ont une dynamique de Nuisance.`,
        "Cette association tend aux malentendus ou frictions.",
        "Des soins mutuels, une communication ouverte et de la patience sont essentiels.",
      ],
      neutral: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) et ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) ont un assortiment neutre.`,
        "Pas de conflits majeurs, une relation stable et sans complications.",
        "Apprécier les différences de l'autre peut renforcer ce lien avec le temps.",
      ],
    },
    es: {
      triad: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) y ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) comparten un vínculo de Tríada (San He).`,
        "Sus fortalezas complementarias crean una conexión poderosa y duradera.",
        "Uno de los mejores emparejamientos en astrología china, brillando en relaciones a largo plazo.",
      ],
      sixharmony: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) y ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) comparten un vínculo de Seis Armonías.`,
        "La armonía natural y la comprensión mutua profunda los hacen cómodos juntos.",
        "Una asociación estable y de apoyo donde ambos crecen juntos.",
      ],
      conflict: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) y ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) están en una relación de Choque.`,
        "Naturalezas diferentes pueden crear fricción pero también energía emocionante.",
        "Con paciencia y respeto, este desafío puede convertirse en una fuente de crecimiento.",
      ],
      harm: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) y ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) tienen una dinámica de Daño.`,
        "Esta combinación tiende a malentendidos o fricciones.",
        "El cuidado mutuo, la comunicación abierta y la paciencia son esenciales.",
      ],
      neutral: [
        `${ANIMAL_EMOJI[a]} ${aName} (${aTrait}) y ${ANIMAL_EMOJI[b]} ${bName} (${bTrait}) tienen un emparejamiento neutro.`,
        "Sin conflictos mayores, una relación estable y sin complicaciones.",
        "Apreciar las diferencias del otro puede fortalecer este vínculo con el tiempo.",
      ],
    },
    zh: {
      triad: [
        `${ANIMAL_EMOJI[a]} ${aName}（${aTrait}）与${ANIMAL_EMOJI[b]} ${bName}（${bTrait}）是三合关系。`,
        "彼此的优势完美互补，形成强大而持久的联系。",
        "这是中国占星术中最好的配对之一，在长期关系中尤为突出。",
      ],
      sixharmony: [
        `${ANIMAL_EMOJI[a]} ${aName}（${aTrait}）与${ANIMAL_EMOJI[b]} ${bName}（${bTrait}）是六合关系。`,
        "自然的和谐与深厚的相互理解让两人在一起感到舒适。",
        "一段相互支持、共同成长的稳定伙伴关系。",
      ],
      conflict: [
        `${ANIMAL_EMOJI[a]} ${aName}（${aTrait}）与${ANIMAL_EMOJI[b]} ${bName}（${bTrait}）是相冲关系。`,
        "不同的性格有时会产生摩擦，但也能带来令人兴奋的能量。",
        "通过耐心与尊重，这种挑战也可以成为成长的契机。",
      ],
      harm: [
        `${ANIMAL_EMOJI[a]} ${aName}（${aTrait}）与${ANIMAL_EMOJI[b]} ${bName}（${bTrait}）是刑冲破害关系。`,
        "这种配对容易产生误解或摩擦。",
        "相互关怀、坦诚沟通和耐心是这段关系的关键。",
      ],
      neutral: [
        `${ANIMAL_EMOJI[a]} ${aName}（${aTrait}）与${ANIMAL_EMOJI[b]} ${bName}（${bTrait}）是普通关系。`,
        "没有大的冲突，关系平稳、简单。",
        "欣赏彼此的不同，随着时间可以加深这段缘分。",
      ],
    },
  };

  return (descTemplates[locale] ?? descTemplates.en)[relation];
}

// ─── Year Options ─────────────────────────────────────────────────────────────

const YEARS: number[] = [];
for (let y = 2024; y >= 1924; y--) {
  YEARS.push(y);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Result {
  animal1: ZodiacAnimal;
  animal2: ZodiacAnimal;
  score: number;
  relation: RelationType;
  desc: string[];
}

export default function ChineseZodiacCompatibility({ locale }: Props) {
  const [year1, setYear1] = useState<number | "">("");
  const [year2, setYear2] = useState<number | "">("");
  const [result, setResult] = useState<Result | null>(null);

  const ui = UI[locale] ?? UI.en;

  const animal1: ZodiacAnimal | null = year1 !== "" ? getAnimal(year1) : null;
  const animal2: ZodiacAnimal | null = year2 !== "" ? getAnimal(year2) : null;

  function calculate() {
    if (!animal1 || !animal2) return;
    const relation = getRelationType(animal1, animal2);
    const score = getScore(animal1, animal2);
    const desc = buildDesc(animal1, animal2, locale);
    setResult({ animal1, animal2, score, relation, desc });
  }

  function reset() {
    setYear1("");
    setYear2("");
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">{ui.person1Year}</label>
              <select
                value={year1}
                onChange={(e) => setYear1(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
              >
                <option value="">{ui.yearPlaceholder}</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y} {ANIMAL_EMOJI[getAnimal(y)]}
                  </option>
                ))}
              </select>
              {animal1 && (
                <div className="mt-2 text-center">
                  <span className="text-3xl">{ANIMAL_EMOJI[animal1]}</span>
                  <p className="text-sm font-semibold text-red-500 mt-1">{ui.animals[animal1]}</p>
                </div>
              )}
            </div>

            {/* Person 2 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{ui.person2Year}</label>
              <select
                value={year2}
                onChange={(e) => setYear2(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400"
              >
                <option value="">{ui.yearPlaceholder}</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y} {ANIMAL_EMOJI[getAnimal(y)]}
                  </option>
                ))}
              </select>
              {animal2 && (
                <div className="mt-2 text-center">
                  <span className="text-3xl">{ANIMAL_EMOJI[animal2]}</span>
                  <p className="text-sm font-semibold text-purple-500 mt-1">{ui.animals[animal2]}</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {(animal1 || animal2) && (
            <div className="flex items-center justify-center gap-4 mb-4 py-3 bg-gray-50 rounded-xl">
              <span className="text-4xl">{animal1 ? ANIMAL_EMOJI[animal1] : "❓"}</span>
              <span className="text-gray-400">✦</span>
              <span className="text-4xl">{animal2 ? ANIMAL_EMOJI[animal2] : "❓"}</span>
            </div>
          )}

          <button
            onClick={calculate}
            disabled={!animal1 || !animal2}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-purple-500 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {ui.calcBtn}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Score card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="flex items-center justify-center gap-6 mb-4">
              <div>
                <span className="text-5xl">{ANIMAL_EMOJI[result.animal1]}</span>
                <p className="text-sm font-bold text-red-500 mt-1">
                  {ui.animals[result.animal1]}
                  <span className="text-gray-400 font-normal ml-1">({year1})</span>
                </p>
              </div>
              <span className="text-2xl text-gray-300">✦</span>
              <div>
                <span className="text-5xl">{ANIMAL_EMOJI[result.animal2]}</span>
                <p className="text-sm font-bold text-purple-500 mt-1">
                  {ui.animals[result.animal2]}
                  <span className="text-gray-400 font-normal ml-1">({year2})</span>
                </p>
              </div>
            </div>

            <div className={`text-6xl font-black mb-2 ${getScoreColor(result.score)}`}>
              {result.score}
              <span className="text-2xl text-gray-400">/ 100</span>
            </div>

            <div className="mt-1">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${RELATION_COLORS[result.relation]}`}>
                {ui.relations[result.relation]}
              </span>
            </div>

            <div className="mt-3 flex justify-center">
              <div className="w-full max-w-xs bg-gray-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-700"
                  style={{
                    width: `${result.score}%`,
                    background:
                      result.score >= 85 ? "#ec4899" :
                      result.score >= 70 ? "#3b82f6" :
                      result.score >= 55 ? "#22c55e" : "#f97316",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Relation description */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
            <h3 className="font-bold text-indigo-800 text-sm mb-2">{ui.relationLabel}</h3>
            <p className="text-sm text-indigo-700">{ui.relationDesc[result.relation]}</p>
          </div>

          {/* Detailed description */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-3">{ui.descLabel}</h3>
            <ul className="space-y-2">
              {result.desc.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
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
