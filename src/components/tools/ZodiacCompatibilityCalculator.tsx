import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale?: Locale;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ZodiacSign =
  | "aries" | "taurus" | "gemini" | "cancer"
  | "leo" | "virgo" | "libra" | "scorpio"
  | "sagittarius" | "capricorn" | "aquarius" | "pisces";

type Element = "fire" | "earth" | "air" | "water";
type Modality = "cardinal" | "fixed" | "mutable";
type CompatType = "excellent" | "great" | "good" | "neutral" | "challenging";

// ─── Zodiac Data ──────────────────────────────────────────────────────────────

const SIGNS: ZodiacSign[] = [
  "aries","taurus","gemini","cancer","leo","virgo",
  "libra","scorpio","sagittarius","capricorn","aquarius","pisces",
];

const SIGN_EMOJI: Record<ZodiacSign, string> = {
  aries:"♈",taurus:"♉",gemini:"♊",cancer:"♋",
  leo:"♌",virgo:"♍",libra:"♎",scorpio:"♏",
  sagittarius:"♐",capricorn:"♑",aquarius:"♒",pisces:"♓",
};

const SIGN_ELEMENT: Record<ZodiacSign, Element> = {
  aries:"fire",leo:"fire",sagittarius:"fire",
  taurus:"earth",virgo:"earth",capricorn:"earth",
  gemini:"air",libra:"air",aquarius:"air",
  cancer:"water",scorpio:"water",pisces:"water",
};

const SIGN_MODALITY: Record<ZodiacSign, Modality> = {
  aries:"cardinal",cancer:"cardinal",libra:"cardinal",capricorn:"cardinal",
  taurus:"fixed",leo:"fixed",scorpio:"fixed",aquarius:"fixed",
  gemini:"mutable",virgo:"mutable",sagittarius:"mutable",pisces:"mutable",
};

// ─── Compatibility Engine ────────────────────────────────────────────────────

interface CompatResult {
  score: number;
  type: CompatType;
  aspect: string;
  strengths: string[];
  challenges: string[];
  advice: string;
}

function getAspect(a: ZodiacSign, b: ZodiacSign): number {
  const ai = SIGNS.indexOf(a);
  const bi = SIGNS.indexOf(b);
  const diff = Math.min(Math.abs(ai - bi), 12 - Math.abs(ai - bi));
  return diff;
}

function calcCompatibility(a: ZodiacSign, b: ZodiacSign, locale: string): CompatResult {
  if (a === b) {
    return SAME_SIGN_DATA[a]?.[locale === "ko" ? "ko" : locale === "ja" ? "ja" : "en"]
      ?? SAME_SIGN_DATA[a]?.["ko"]
      ?? buildGeneric(88, "excellent", SIGN_ELEMENT[a], SIGN_ELEMENT[a], SIGN_MODALITY[a], SIGN_MODALITY[a], true, true, 0, a, a, locale === "ko" ? "ko" : locale === "ja" ? "ja" : "en");
  }
  const aspect = getAspect(a, b);
  const el1 = SIGN_ELEMENT[a];
  const el2 = SIGN_ELEMENT[b];
  const sameEl = el1 === el2;
  const mod1 = SIGN_MODALITY[a];
  const mod2 = SIGN_MODALITY[b];
  const sameMod = mod1 === mod2;

  // Element affinity table
  const AFFINITY: Record<Element, Record<Element, number>> = {
    fire:  { fire:92, earth:55, air:85, water:50 },
    earth: { fire:55, earth:90, air:50, water:82 },
    air:   { fire:85, earth:50, air:88, water:55 },
    water: { fire:50, earth:82, air:55, water:90 },
  };

  let score = AFFINITY[el1][el2];
  // Opposite sign bonus: attractive tension
  if (aspect === 6) score = Math.min(score + 5, 95);
  // Square penalty: same modality friction
  if (aspect === 3 || aspect === 9) score = Math.max(score - 8, 40);
  // Sextile bonus (harmonious)
  if (aspect === 2 || aspect === 10) score = Math.min(score + 3, 95);
  // Trine bonus (same element, 4 apart)
  if (aspect === 4 || aspect === 8) score = Math.min(score + 4, 98);

  const type: CompatType =
    score >= 85 ? "excellent" :
    score >= 75 ? "great" :
    score >= 65 ? "good" :
    score >= 55 ? "neutral" : "challenging";

  const key = `${a}-${b}` as const;
  const reversedKey = `${b}-${a}` as const;
  const lang = locale === "ko" ? "ko" : locale === "ja" ? "ja" : "en";

  // Try specific pair data first
  const specific =
    PAIR_DATA[key as keyof typeof PAIR_DATA]?.[lang] ??
    PAIR_DATA[reversedKey as keyof typeof PAIR_DATA]?.[lang];
  if (specific) {
    return { ...specific, score, type };
  }

  // Generic fallback
  return buildGeneric(score, type, el1, el2, mod1, mod2, sameEl, sameMod, aspect, a, b, lang);
}

// ─── Generic fallback builder ─────────────────────────────────────────────────

function buildGeneric(
  score: number, type: CompatType,
  el1: Element, el2: Element,
  mod1: Modality, mod2: Modality,
  sameEl: boolean, sameMod: boolean,
  aspect: number,
  a: ZodiacSign, b: ZodiacSign,
  lang: "ko" | "en" | "ja",
): CompatResult {
  const ELEMENT_PAIR_DESC: Record<string, Record<"ko" | "en" | "ja", [string, string, string]>> = {
    "fire-air": {
      ko: ["활기찬 에너지", "지적 자극과 열정이 시너지를 만듭니다", "감성 표현이 부족할 수 있어 의식적 노력 필요"],
      en: ["Vibrant energy", "Intellect and passion create great synergy", "Emotional expression may need conscious effort"],
      ja: ["活発なエネルギー", "知性と情熱がシナジーを生みます", "感情表現に意識的な努力が必要"],
    },
    "earth-water": {
      ko: ["안정적인 깊이", "실용성과 감성이 서로를 보완합니다", "변화에 대한 저항이 발목을 잡을 수 있음"],
      en: ["Stable depth", "Practicality and emotion complement each other", "Resistance to change may be a challenge"],
      ja: ["安定した深さ", "実用性と感情が補い合います", "変化への抵抗が足かせになる可能性"],
    },
    "fire-fire": {
      ko: ["폭발적인 열정", "서로의 열정을 증폭시키며 강한 유대감을 형성합니다", "경쟁심이 생길 수 있으니 서로 빛낼 공간 필요"],
      en: ["Explosive passion", "Amplify each other's passion and build strong bonds", "Competition may arise — create space to shine together"],
      ja: ["爆発的な情熱", "互いの情熱を増幅させ強い絆を形成します", "競争心が生まれる場合があるため、輝く空間を"],
    },
    "earth-earth": {
      ko: ["견고한 안정감", "현실적인 가치관을 공유하며 든든한 관계를 만듭니다", "변화와 새로움에 함께 도전하는 용기가 필요"],
      en: ["Solid stability", "Shared practical values build a rock-solid relationship", "Courage to embrace change together is needed"],
      ja: ["揺るぎない安定", "現実的な価値観を共有し、しっかりした関係を築きます", "変化への挑戦をともにする勇気が必要"],
    },
    "air-air": {
      ko: ["지적인 공명", "아이디어와 대화가 끊이지 않으며 자유를 존중합니다", "감정적 깊이를 더 표현하려는 노력이 필요"],
      en: ["Intellectual resonance", "Ideas and conversation flow freely with mutual respect", "More emotional depth and expression is needed"],
      ja: ["知的な共鳴", "アイデアと会話が尽きず、自由を尊重します", "感情的な深みをより表現する努力が必要"],
    },
    "water-water": {
      ko: ["깊은 감성 연결", "직관적으로 서로를 이해하고 감정적으로 깊이 연결됩니다", "현실적인 방향성과 명확한 경계가 필요"],
      en: ["Deep emotional connection", "Intuitively understand each other with deep emotional bonds", "Practical direction and clear boundaries are needed"],
      ja: ["深い感情の繋がり", "直感的に理解し合い、感情的に深く繋がります", "現実的な方向性と明確な境界線が必要"],
    },
    "fire-earth": {
      ko: ["활력과 안정의 충돌", "서로 배울 점은 많지만 속도와 가치관 차이가 도전 과제입니다", "서로의 강점을 인정하고 중간 지점을 찾는 대화가 핵심"],
      en: ["Vitality meets stability", "Much to learn from each other but pace and values differ", "Find a middle ground through open communication"],
      ja: ["活力と安定のぶつかり合い", "学べることは多いですが、ペースと価値観の違いが課題", "互いの強みを認め、中間点を見つける対話が鍵"],
    },
    "fire-water": {
      ko: ["반대되는 에너지", "강렬한 끌림이 있지만 열정 vs 감성의 충돌이 잦습니다", "서로의 차이를 배움으로 받아들이고 타협점을 만드세요"],
      en: ["Opposing energies", "Strong attraction but frequent clash of passion vs emotion", "Embrace differences as lessons and find compromise"],
      ja: ["相反するエネルギー", "強い引力がありますが、情熱と感情のぶつかり合いが多い", "違いを学びとして受け入れ、妥協点を見つけましょう"],
    },
    "air-water": {
      ko: ["이성과 감성의 간극", "생각과 감정의 차이를 메우는 것이 이 관계의 핵심 과제입니다", "감성 vs 논리를 존중하며 번갈아 배우는 태도가 중요"],
      en: ["Mind vs heart gap", "Bridging thought and emotion is the core challenge", "Respect feeling vs logic and learn from each other alternately"],
      ja: ["理性と感性のギャップ", "思考と感情の差を埋めることがこの関係の核心課題", "感性と論理を尊重し、交互に学ぶ姿勢が大切"],
    },
    "air-earth": {
      ko: ["이상과 현실의 충돌", "큰 꿈과 실용적 현실 사이에서 균형을 찾는 것이 과제입니다", "서로의 관점이 실제로 서로를 보완해 줄 수 있음을 기억하세요"],
      en: ["Ideals meet reality", "Finding balance between big dreams and practical reality is key", "Remember each other's perspective actually complements the other"],
      ja: ["理想と現実のぶつかり合い", "大きな夢と現実の間でバランスを見つけることが課題", "互いの視点が実は補完し合えることを忘れずに"],
    },
  };

  const elKey = [el1, el2].sort().join("-") as keyof typeof ELEMENT_PAIR_DESC;
  const pairDesc = ELEMENT_PAIR_DESC[elKey]?.[lang] ?? ["조화로운 관계", "균형 잡힌 에너지", "소통을 통해 더 강해집니다"] as [string, string, string];

  const ASPECT_ADVICE: Record<number, Record<"ko" | "en" | "ja", string>> = {
    6: { ko: "반대 별자리 사이의 자석 같은 끌림. 서로의 차이가 강점이 됩니다.", en: "Magnetic attraction between opposites — your differences become strengths.", ja: "反対のサインの磁石のような引力。互いの違いが強みになります。" },
    4: { ko: "같은 원소의 트라인 측면. 자연스럽고 조화로운 흐름.", en: "Same-element trine — natural and harmonious flow.", ja: "同じエレメントのトライン。自然で調和のとれた流れ。" },
    2: { ko: "섹스타일 각도의 부드러운 조화. 서로 격려하고 성장을 돕습니다.", en: "Gentle sextile harmony — encourage and support each other's growth.", ja: "セクスタイルの穏やかな調和。互いを励まし成長を助け合います。" },
    3: { ko: "같은 모달리티의 스퀘어. 마찰이 있지만 서로를 성장시킵니다.", en: "Same-modality square — friction exists but drives mutual growth.", ja: "同じモダリティのスクエア。摩擦はありますが互いを成長させます。" },
    0: { ko: "같은 별자리. 서로를 거울처럼 비추는 독특한 관계.", en: "Same sign — a unique mirror-like relationship.", ja: "同じサイン。互いを鏡のように映し出すユニークな関係。" },
  };

  const advice = ASPECT_ADVICE[aspect]?.[lang] ??
    ASPECT_ADVICE[aspect === 9 ? 3 : aspect === 8 ? 4 : aspect === 10 ? 2 : 2]?.[lang] ??
    ({ ko: "솔직한 소통이 관계의 핵심입니다.", en: "Open communication is the key.", ja: "率直なコミュニケーションが鍵です。" })[lang];

  return {
    score, type,
    aspect: pairDesc[0],
    strengths: [pairDesc[1]],
    challenges: [pairDesc[2]],
    advice,
  };
}

// ─── Specific Pair Data (top popular pairs) ──────────────────────────────────

const PAIR_DATA: Partial<Record<string, Record<"ko" | "en" | "ja", Omit<CompatResult, "score" | "type">>>> = {
  "aries-leo": {
    ko: { aspect: "불꽃 시너지", strengths: ["폭발적인 열정과 서로의 꿈을 응원하는 에너지", "리더십을 인정하며 함께 빛나는 파트너십"], challenges: ["두 리더가 만나면 주도권 다툼이 생길 수 있음"], advice: "서로의 왕좌를 존중하면 최고의 팀이 됩니다." },
    en: { aspect: "Fire synergy", strengths: ["Explosive passion and mutual encouragement", "Two leaders who shine brighter together"], challenges: ["Both want to lead — ego clashes possible"], advice: "Respect each other's throne and you'll be an unbeatable team." },
    ja: { aspect: "炎のシナジー", strengths: ["爆発的な情熱と互いの夢を応援するエネルギー", "リーダーシップを認め合い、ともに輝くパートナーシップ"], challenges: ["二人のリーダーが出会うとリードを巡る争いが生まれることも"], advice: "互いの玉座を尊重すれば最高のチームになります。" },
  },
  "taurus-virgo": {
    ko: { aspect: "흙의 동반자", strengths: ["실용적인 목표를 공유하며 차분하게 쌓아가는 관계", "서로의 꼼꼼함과 안정감을 깊이 이해"], challenges: ["변화를 거부하거나 지나친 완벽주의가 관계를 딱딱하게 만들 수 있음"], advice: "작은 즉흥성을 허용하면 관계가 더욱 풍성해집니다." },
    en: { aspect: "Earth companions", strengths: ["Shared practical goals built steadily together", "Deep understanding of each other's detail-oriented nature"], challenges: ["Resistance to change or perfectionism can make the relationship rigid"], advice: "Allow small spontaneity to enrich the relationship." },
    ja: { aspect: "土のパートナー", strengths: ["実用的な目標を共有し、着実に積み上げる関係", "互いの細やかさと安定感を深く理解し合う"], challenges: ["変化を拒んだり完璧主義が関係を硬直させることも"], advice: "少しの即興性を許すと関係がより豊かになります。" },
  },
  "gemini-libra": {
    ko: { aspect: "바람의 지성", strengths: ["끊이지 않는 대화와 지적 탐구의 즐거움", "서로의 독립성을 존중하는 자유로운 파트너십"], challenges: ["감정적 깊이 표현이 부족해 표면적 관계에 머물 수 있음"], advice: "가끔은 머리보다 마음으로 대화하세요." },
    en: { aspect: "Air intellect", strengths: ["Endless conversation and shared love of ideas", "Freedom-respecting partnership with mutual independence"], challenges: ["Lack of emotional depth may keep the relationship surface-level"], advice: "Sometimes speak from the heart, not just the head." },
    ja: { aspect: "風の知性", strengths: ["尽きない会話と知的探求の楽しみ", "互いの独立性を尊重する自由なパートナーシップ"], challenges: ["感情的な深みの表現不足で表面的な関係にとどまることも"], advice: "時には頭よりも心で話してみましょう。" },
  },
  "cancer-scorpio": {
    ko: { aspect: "물의 깊이", strengths: ["말하지 않아도 서로를 이해하는 직관적 유대", "강한 감정적 헌신과 깊은 신뢰 형성"], challenges: ["집착이나 질투가 관계를 옥죄는 함정이 될 수 있음"], advice: "신뢰는 쌓는 데 시간이 걸리지만, 한번 쌓이면 가장 강한 유대가 됩니다." },
    en: { aspect: "Water depth", strengths: ["Intuitive bond — understanding without words", "Deep emotional commitment and strong trust"], challenges: ["Possessiveness or jealousy can become a trap"], advice: "Trust takes time to build but becomes the strongest bond once established." },
    ja: { aspect: "水の深さ", strengths: ["言葉がなくても理解し合える直感的な絆", "強い感情的なコミットメントと深い信頼の形成"], challenges: ["執着や嫉妬が関係を締め付ける罠になることも"], advice: "信頼は築くのに時間がかかりますが、一度築かれれば最強の絆になります。" },
  },
  "leo-sagittarius": {
    ko: { aspect: "불의 모험", strengths: ["서로의 꿈과 모험을 응원하는 뜨거운 지지자", "삶을 함께 즐기고 성장하는 최고의 파트너"], challenges: ["둘 다 자유를 중요시해 진지한 약속을 미룰 수 있음"], advice: "모험을 즐기면서도 함께할 미래를 그려보세요." },
    en: { aspect: "Fire adventure", strengths: ["Passionate supporters of each other's dreams and adventures", "Best partners for enjoying and growing through life"], challenges: ["Both value freedom — may delay serious commitments"], advice: "Enjoy the adventure while also envisioning a shared future." },
    ja: { aspect: "炎の冒険", strengths: ["互いの夢と冒険を応援する熱い支持者", "人生を一緒に楽しみ成長する最高のパートナー"], challenges: ["二人とも自由を重んじ、真剣なコミットメントを先延ばしにすることも"], advice: "冒険を楽しみながら、共に歩む未来も描いてみましょう。" },
  },
  "aries-libra": {
    ko: { aspect: "반대 별자리의 끌림", strengths: ["서로의 부족한 부분을 채워주는 완벽한 보완", "행동력(양자리)과 조화(천칭)의 이상적 균형"], challenges: ["주도권 vs 조화를 원하는 방식의 차이로 충돌 가능"], advice: "정반대이기에 서로에게서 가장 많이 배울 수 있는 파트너입니다." },
    en: { aspect: "Opposite attraction", strengths: ["Perfect complement — each fills what the other lacks", "Ideal balance of action (Aries) and harmony (Libra)"], challenges: ["Clash between Aries's initiative and Libra's need for consensus"], advice: "Precisely because you're opposites, you'll learn the most from each other." },
    ja: { aspect: "反対のサインの引力", strengths: ["互いの不足を補い合う完璧な補完関係", "行動力（牡羊）と調和（天秤）の理想的なバランス"], challenges: ["主導権と調和を求める方法の違いによる衝突の可能性"], advice: "正反対だからこそ、互いから最も多く学べるパートナーです。" },
  },
  "taurus-scorpio": {
    ko: { aspect: "반대의 자석", strengths: ["강렬한 감성적 이끌림과 깊은 신뢰 기반", "안정(황소)과 심화(전갈)가 결합한 변치 않는 헌신"], challenges: ["소유욕과 고집이 맞부딪히면 강한 충돌 발생"], advice: "서로의 다름이 실은 당신이 갖지 못한 강점입니다. 배우는 마음으로 접근하세요." },
    en: { aspect: "Opposite magnets", strengths: ["Intense emotional pull and deep foundation of trust", "Unwavering commitment combining stability and depth"], challenges: ["Possessiveness meets stubbornness — powerful clashes possible"], advice: "Your differences are actually strengths you lack — approach each other to learn." },
    ja: { aspect: "反対の磁石", strengths: ["強烈な感情的な引力と深い信頼の基盤", "安定（牡牛）と深化（蠍）が結合した変わらぬコミットメント"], challenges: ["所有欲と頑固さがぶつかると強い衝突が発生"], advice: "互いの違いは実は持っていない強みです。学ぶ気持ちで近づいてください。" },
  },
  "cancer-pisces": {
    ko: { aspect: "감성의 교감", strengths: ["말보다 감정으로 통하는 깊은 연결감", "서로를 위로하고 치유하는 따뜻한 안식처"], challenges: ["현실 감각이 부족해 실질적인 문제 해결이 미뤄질 수 있음"], advice: "꿈 같은 유대를 가지고 있으니, 현실도 함께 직면하는 용기를 더해보세요." },
    en: { aspect: "Emotional resonance", strengths: ["Deep connection through feeling rather than words", "Warm sanctuary of mutual comfort and healing"], challenges: ["Lack of practicality may delay real-world problem-solving"], advice: "You have a dream-like bond — add the courage to face reality together." },
    ja: { aspect: "感性の共鳴", strengths: ["言葉より感情で通じ合う深い繋がり", "互いを慰め、癒す温かい安らぎの場所"], challenges: ["現実感覚が不足し、実質的な問題解決が先延ばしになることも"], advice: "夢のような絆を持っているので、現実にも一緒に向き合う勇気を加えてみて。" },
  },
};

// ─── Same sign data ───────────────────────────────────────────────────────────

const SAME_SIGN_DATA: Partial<Record<ZodiacSign, Record<"ko" | "en" | "ja", CompatResult>>> = {};
// Filled lazily below with a helper

function getSameSignResult(sign: ZodiacSign, lang: "ko" | "en" | "ja"): CompatResult {
  const LABELS: Record<"ko" | "en" | "ja", [string, string, string, string]> = {
    ko: ["완벽한 거울", "서로를 즉각적으로 이해하고 공통점이 무수히 많습니다", "비슷한 약점이 증폭될 수 있고 성장을 위한 자극이 부족할 수 있음", "서로 다른 경험을 나누며 서로를 더욱 성장시키세요."],
    en: ["Perfect mirror", "Instant mutual understanding and countless common ground", "Shared weaknesses may amplify; growth stimulus may be lacking", "Share different experiences to help each other grow further."],
    ja: ["完璧な鏡", "お互いを即座に理解し、共通点が無数にあります", "似た弱点が増幅されたり、成長のための刺激が不足することも", "異なる経験を共有し、互いをより成長させましょう。"],
  };
  const [aspect, strength, challenge, advice] = LABELS[lang];
  return { score: 85, type: "excellent", aspect, strengths: [strength], challenges: [challenge], advice };
}

// ─── i18n UI ──────────────────────────────────────────────────────────────────

const SIGN_NAMES: Record<"ko" | "en" | "ja", Record<ZodiacSign, string>> = {
  ko: { aries:"양자리",taurus:"황소자리",gemini:"쌍둥이자리",cancer:"게자리",leo:"사자자리",virgo:"처녀자리",libra:"천칭자리",scorpio:"전갈자리",sagittarius:"사수자리",capricorn:"염소자리",aquarius:"물병자리",pisces:"물고기자리" },
  en: { aries:"Aries",taurus:"Taurus",gemini:"Gemini",cancer:"Cancer",leo:"Leo",virgo:"Virgo",libra:"Libra",scorpio:"Scorpio",sagittarius:"Sagittarius",capricorn:"Capricorn",aquarius:"Aquarius",pisces:"Pisces" },
  ja: { aries:"牡羊座",taurus:"牡牛座",gemini:"双子座",cancer:"蟹座",leo:"獅子座",virgo:"乙女座",libra:"天秤座",scorpio:"蠍座",sagittarius:"射手座",capricorn:"山羊座",aquarius:"水瓶座",pisces:"魚座" },
};

const SIGN_DATES: Record<ZodiacSign, string> = {
  aries:"3.21–4.19",taurus:"4.20–5.20",gemini:"5.21–6.20",cancer:"6.21–7.22",
  leo:"7.23–8.22",virgo:"8.23–9.22",libra:"9.23–10.22",scorpio:"10.23–11.21",
  sagittarius:"11.22–12.21",capricorn:"12.22–1.19",aquarius:"1.20–2.18",pisces:"2.19–3.20",
};

const ELEMENT_COLOR: Record<Element, string> = {
  fire:"text-orange-500",earth:"text-emerald-600",air:"text-sky-500",water:"text-indigo-500",
};

const ELEMENT_BG: Record<Element, string> = {
  fire:"bg-orange-50 border-orange-200",earth:"bg-emerald-50 border-emerald-200",
  air:"bg-sky-50 border-sky-200",water:"bg-indigo-50 border-indigo-200",
};

const COMPAT_COLOR: Record<CompatType, string> = {
  excellent:"text-pink-600",great:"text-purple-600",good:"text-blue-600",
  neutral:"text-gray-500",challenging:"text-orange-600",
};

const COMPAT_BG: Record<CompatType, string> = {
  excellent:"bg-pink-100 text-pink-700",great:"bg-purple-100 text-purple-700",
  good:"bg-blue-100 text-blue-700",neutral:"bg-gray-100 text-gray-600",
  challenging:"bg-orange-100 text-orange-700",
};

const UI_TEXT = {
  ko: {
    title:"별자리 궁합 계산기",subtitle:"두 별자리를 선택하면 궁합을 분석해드립니다",
    person1:"나의 별자리",person2:"상대방 별자리",calcBtn:"궁합 보기",resetBtn:"다시 하기",
    scoreLabel:"궁합 점수",aspectLabel:"관계 특성",strengthLabel:"이 관계의 강점",
    challengeLabel:"주의할 점",adviceLabel:"조언",
    compatLabel:{ excellent:"천생연분 ✨",great:"잘 맞는 관계 ⭐",good:"좋은 궁합 💫",neutral:"보통 궁합 🌙",challenging:"도전적 관계 🔥" },
    element:{ fire:"불 ♈♌♐",earth:"흙 ♉♍♑",air:"바람 ♊♎♒",water:"물 ♋♏♓" },
    modality:{ cardinal:"활동궁",fixed:"고정궁",mutable:"변동궁" },
  },
  en: {
    title:"Zodiac Compatibility",subtitle:"Select two signs to analyze your compatibility",
    person1:"My Sign",person2:"Partner's Sign",calcBtn:"Check Compatibility",resetBtn:"Try Again",
    scoreLabel:"Compatibility Score",aspectLabel:"Relationship Nature",strengthLabel:"Strengths",
    challengeLabel:"Watch Out For",adviceLabel:"Advice",
    compatLabel:{ excellent:"Soulmates ✨",great:"Great Match ⭐",good:"Good Compatibility 💫",neutral:"Moderate 🌙",challenging:"Challenging 🔥" },
    element:{ fire:"Fire ♈♌♐",earth:"Earth ♉♍♑",air:"Air ♊♎♒",water:"Water ♋♏♓" },
    modality:{ cardinal:"Cardinal",fixed:"Fixed",mutable:"Mutable" },
  },
  ja: {
    title:"星座相性診断",subtitle:"2つの星座を選ぶと相性を診断します",
    person1:"自分の星座",person2:"相手の星座",calcBtn:"相性を見る",resetBtn:"もう一度",
    scoreLabel:"相性スコア",aspectLabel:"関係の特性",strengthLabel:"この関係の強み",
    challengeLabel:"注意点",adviceLabel:"アドバイス",
    compatLabel:{ excellent:"天生の縁 ✨",great:"相性抜群 ⭐",good:"良い相性 💫",neutral:"普通の相性 🌙",challenging:"チャレンジング 🔥" },
    element:{ fire:"火 ♈♌♐",earth:"土 ♉♍♑",air:"風 ♊♎♒",water:"水 ♋♏♓" },
    modality:{ cardinal:"活動宮",fixed:"固定宮",mutable:"柔軟宮" },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ZodiacCompatibilityCalculator({ locale = "ko" }: Props) {
  const lang: "ko" | "en" | "ja" = locale === "ja" ? "ja" : locale === "en" ? "en" : "ko";
  const ui = UI_TEXT[lang];
  const names = SIGN_NAMES[lang];

  const [sign1, setSign1] = useState<ZodiacSign | "">("");
  const [sign2, setSign2] = useState<ZodiacSign | "">("");
  const [result, setResult] = useState<CompatResult | null>(null);

  function calculate() {
    if (!sign1 || !sign2) return;
    const r =
      sign1 === sign2
        ? getSameSignResult(sign1, lang)
        : calcCompatibility(sign1, sign2, lang);
    setResult(r);
  }

  function reset() {
    setSign1("");
    setSign2("");
    setResult(null);
  }

  function getBarColor(score: number) {
    if (score >= 85) return "bg-pink-500";
    if (score >= 75) return "bg-purple-500";
    if (score >= 65) return "bg-blue-500";
    if (score >= 55) return "bg-gray-400";
    return "bg-orange-500";
  }

  return (
    <div className="max-w-xl mx-auto p-4 font-sans">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{ui.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{ui.subtitle}</p>
      </div>

      {!result ? (
        <div className="space-y-5">
          {/* Sign selectors */}
          {([["sign1", sign1, setSign1, ui.person1], ["sign2", sign2, setSign2, ui.person2]] as const).map(
            ([id, val, setter, label]) => (
              <div key={id}>
                <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
                <div className="grid grid-cols-4 gap-2">
                  {SIGNS.map((s) => {
                    const el = SIGN_ELEMENT[s];
                    const isSelected = val === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setter(s as ZodiacSign)}
                        className={`flex flex-col items-center py-2 px-1 rounded-xl border-2 transition-all text-xs
                          ${isSelected
                            ? `${ELEMENT_BG[el]} border-current font-bold scale-105 shadow-sm`
                            : "bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        <span className={`text-xl ${isSelected ? ELEMENT_COLOR[el] : "text-gray-600"}`}>
                          {SIGN_EMOJI[s]}
                        </span>
                        <span className={`mt-0.5 leading-tight text-center ${isSelected ? ELEMENT_COLOR[el] : "text-gray-500"}`}>
                          {names[s]}
                        </span>
                        <span className="text-[9px] text-gray-400">{SIGN_DATES[s]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}

          <button
            onClick={calculate}
            disabled={!sign1 || !sign2}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-base transition-all
              bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700
              disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
          >
            {ui.calcBtn}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sign display */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="flex items-center justify-center gap-6 mb-5">
              {[sign1, sign2].map((s, i) => {
                const el = SIGN_ELEMENT[s as ZodiacSign];
                return (
                  <div key={i}>
                    <div className={`text-5xl mb-1 ${ELEMENT_COLOR[el]}`}>{SIGN_EMOJI[s as ZodiacSign]}</div>
                    <p className={`text-sm font-bold ${ELEMENT_COLOR[el]}`}>{names[s as ZodiacSign]}</p>
                    <p className="text-[10px] text-gray-400">{SIGN_DATES[s as ZodiacSign]}</p>
                  </div>
                );
              })}
            </div>

            {/* Score */}
            <div className={`text-6xl font-black mb-1 ${COMPAT_COLOR[result.type]}`}>
              {result.score}
              <span className="text-2xl text-gray-400">/ 100</span>
            </div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${COMPAT_BG[result.type]}`}>
              {ui.compatLabel[result.type]}
            </span>

            {/* Bar */}
            <div className="mt-4 w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-700 ${getBarColor(result.score)}`}
                style={{ width: `${result.score}%` }}
              />
            </div>
          </div>

          {/* Aspect */}
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">{ui.aspectLabel}</p>
            <p className="font-bold text-gray-800">{result.aspect}</p>
          </div>

          {/* Strengths */}
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-green-700 mb-2">✅ {ui.strengthLabel}</p>
            {result.strengths.map((s, i) => (
              <p key={i} className="text-sm text-green-800">{s}</p>
            ))}
          </div>

          {/* Challenges */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-2">⚠️ {ui.challengeLabel}</p>
            {result.challenges.map((c, i) => (
              <p key={i} className="text-sm text-amber-800">{c}</p>
            ))}
          </div>

          {/* Advice */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-indigo-600 mb-1">💡 {ui.adviceLabel}</p>
            <p className="text-sm text-indigo-800 italic">"{result.advice}"</p>
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
