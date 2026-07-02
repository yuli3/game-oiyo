import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

// ─── Seed-based RNG ───────────────────────────────────────────────────────────

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function todaySeed(sign: number): number {
  const d = new Date();
  const dateNum = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return (dateNum * 13 + sign * 7919) >>> 0;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Zodiac Signs ─────────────────────────────────────────────────────────────

type SignKey =
  | "aries" | "taurus" | "gemini" | "cancer"
  | "leo" | "virgo" | "libra" | "scorpio"
  | "sagittarius" | "capricorn" | "aquarius" | "pisces";

const SIGNS: SignKey[] = [
  "aries","taurus","gemini","cancer",
  "leo","virgo","libra","scorpio",
  "sagittarius","capricorn","aquarius","pisces",
];

const SIGN_EMOJI: Record<SignKey, string> = {
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋",
  leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏",
  sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
};

const SIGN_DATES: Record<SignKey, string> = {
  aries: "3/21–4/19", taurus: "4/20–5/20", gemini: "5/21–6/20", cancer: "6/21–7/22",
  leo: "7/23–8/22", virgo: "8/23–9/22", libra: "9/23–10/22", scorpio: "10/23–11/21",
  sagittarius: "11/22–12/21", capricorn: "12/22–1/19", aquarius: "1/20–2/18", pisces: "2/19–3/20",
};

const SIGN_NAMES: Record<Locale, Record<SignKey, string>> = {
  ko: {
    aries:"양자리",taurus:"황소자리",gemini:"쌍둥이자리",cancer:"게자리",
    leo:"사자자리",virgo:"처녀자리",libra:"천칭자리",scorpio:"전갈자리",
    sagittarius:"사수자리",capricorn:"염소자리",aquarius:"물병자리",pisces:"물고기자리",
  },
  en: {
    aries:"Aries",taurus:"Taurus",gemini:"Gemini",cancer:"Cancer",
    leo:"Leo",virgo:"Virgo",libra:"Libra",scorpio:"Scorpio",
    sagittarius:"Sagittarius",capricorn:"Capricorn",aquarius:"Aquarius",pisces:"Pisces",
  },
  ja: {
    aries:"牡羊座",taurus:"牡牛座",gemini:"双子座",cancer:"蟹座",
    leo:"獅子座",virgo:"乙女座",libra:"天秤座",scorpio:"蠍座",
    sagittarius:"射手座",capricorn:"山羊座",aquarius:"水瓶座",pisces:"魚座",
  },
  fr: {
    aries:"Bélier",taurus:"Taureau",gemini:"Gémeaux",cancer:"Cancer",
    leo:"Lion",virgo:"Vierge",libra:"Balance",scorpio:"Scorpion",
    sagittarius:"Sagittaire",capricorn:"Capricorne",aquarius:"Verseau",pisces:"Poissons",
  },
  es: {
    aries:"Aries",taurus:"Tauro",gemini:"Géminis",cancer:"Cáncer",
    leo:"Leo",virgo:"Virgo",libra:"Libra",scorpio:"Escorpio",
    sagittarius:"Sagitario",capricorn:"Capricornio",aquarius:"Acuario",pisces:"Piscis",
  },
  zh: {
    aries:"白羊座",taurus:"金牛座",gemini:"双子座",cancer:"巨蟹座",
    leo:"狮子座",virgo:"处女座",libra:"天秤座",scorpio:"天蝎座",
    sagittarius:"射手座",capricorn:"摩羯座",aquarius:"水瓶座",pisces:"双鱼座",
  },
};

// ─── Fortune Texts ────────────────────────────────────────────────────────────

type Tier = "great" | "good" | "mid" | "low" | "poor";

interface CategoryTexts {
  overall: Record<SignKey, Record<Tier, string[]>>;
  love: Record<SignKey, Record<Tier, string[]>>;
  money: Record<SignKey, Record<Tier, string[]>>;
  health: Record<SignKey, Record<Tier, string[]>>;
}

// We store texts per locale × sign × category. Each sign has 5+ texts per category (across tiers).
// To keep file size reasonable we use shared tier texts and inject sign-specific flavor.

const SIGN_TEXTS: Record<Locale, CategoryTexts> = (() => {
  type SignPool = Record<SignKey, Record<Tier, string[]>>;

  function makePool(fn: (s: SignKey, tier: Tier) => string[]): SignPool {
    const pool = {} as SignPool;
    for (const s of SIGNS) {
      pool[s] = {} as Record<Tier, string[]>;
      for (const tier of ["great","good","mid","low","poor"] as Tier[]) {
        pool[s][tier] = fn(s, tier);
      }
    }
    return pool;
  }

  // ── Korean ──
  const koOverall = makePool((s, tier) => {
    const name = SIGN_NAMES.ko[s];
    const map: Record<Tier, string[]> = {
      great: [
        `${name}에게 오늘은 최고의 날입니다! 모든 일이 뜻대로 풀리는 길운입니다.`,
        `행운의 에너지가 넘치는 하루, ${name}의 매력이 빛을 발합니다.`,
        `오늘은 무엇이든 가능한 날입니다. 적극적으로 도전하세요!`,
        `${name}을(를) 응원하는 별들의 기운이 가득합니다. 큰 성과를 기대하세요.`,
        `최상의 컨디션으로 하루를 시작하세요. 모든 것이 순조롭습니다.`,
      ],
      good: [
        `${name}에게 좋은 기운이 흐르는 하루입니다. 자신감을 갖고 나서세요.`,
        `긍정적인 에너지가 하루를 가득 채웁니다. 새로운 시도를 두려워하지 마세요.`,
        `오늘의 운세는 상승 중입니다. 중요한 결정을 내리기에 좋은 날이에요.`,
        `주변의 도움이 잘 들어오는 날입니다. 협력하면 더 큰 성과를 냅니다.`,
        `${name}의 직관이 빛나는 날, 믿고 따라가 보세요.`,
      ],
      mid: [
        `오늘은 평범하지만 안정적인 하루입니다. 차분하게 일상을 보내세요.`,
        `${name}에게 보통의 운세가 흐릅니다. 무리하지 않는 것이 최선입니다.`,
        `큰 변화보다는 꾸준한 노력이 빛나는 날입니다.`,
        `잔잔한 하루, 작은 것에 감사하며 지내보세요.`,
        `평온한 기운이 감돕니다. 오늘은 충전의 시간으로 삼으세요.`,
      ],
      low: [
        `${name}에게 다소 조심스러운 하루입니다. 중요한 결정은 미루는 것이 좋아요.`,
        `에너지가 낮은 날입니다. 무리하지 말고 천천히 진행하세요.`,
        `뜻하지 않은 난관이 생길 수 있습니다. 유연하게 대처하세요.`,
        `오늘은 새로운 시도보다 기존 일에 집중하는 것이 유리합니다.`,
        `인내가 필요한 날입니다. 마음을 차분히 유지하세요.`,
      ],
      poor: [
        `${name}에게 힘든 기운이 감돕니다. 모든 일을 신중하게 처리하세요.`,
        `오늘은 안정을 취하는 것이 최선입니다. 무리한 계획은 금물입니다.`,
        `어려움이 있더라도 이 또한 지나갈 것입니다. 인내하세요.`,
        `운이 낮은 날에는 준비를 다지는 것이 지혜입니다.`,
        `도전보다 수성에 집중하세요. 내일의 반등을 기대하세요.`,
      ],
    };
    return map[tier];
  });

  const koLove = makePool((s, tier) => {
    const name = SIGN_NAMES.ko[s];
    const map: Record<Tier, string[]> = {
      great: [
        `${name}의 애정운이 최고조입니다! 고백이나 데이트를 계획해 보세요.`,
        `사랑하는 사람과 특별한 순간을 나누기에 완벽한 날입니다.`,
        `새로운 인연이 찾아올 가능성이 높습니다. 주변을 잘 살펴보세요.`,
        `연인과의 깊은 유대감이 형성되는 날입니다. 진심을 표현하세요.`,
        `${name}의 매력이 빛나는 날! 관계가 한층 더 깊어집니다.`,
      ],
      good: [
        `애정 운이 좋은 하루입니다. 솔직한 대화가 관계를 발전시킵니다.`,
        `${name}에게 따뜻한 사랑의 기운이 흐릅니다. 감사를 표현해 보세요.`,
        `연인과 함께하는 시간이 더욱 즐거운 하루입니다.`,
        `가슴 설레는 일이 생길 수 있는 날입니다.`,
        `서로를 이해하고 공감하는 좋은 기회입니다.`,
      ],
      mid: [
        `애정 운은 보통입니다. 일상적인 다정함으로 충분한 하루입니다.`,
        `큰 변화보다는 소소한 애정 표현이 빛나는 날이에요.`,
        `${name}의 사랑은 안정적입니다. 감사하는 마음으로 하루를 보내세요.`,
        `관계에서 특별한 이벤트보다 편안한 대화가 좋은 날입니다.`,
        `사랑 운이 평범합니다. 혼자만의 시간도 충전이 됩니다.`,
      ],
      low: [
        `오해나 작은 갈등이 생길 수 있습니다. 상대방의 말을 잘 들어보세요.`,
        `${name}의 감정이 다소 예민한 날입니다. 충동적인 말은 삼가세요.`,
        `사랑 운이 약한 날입니다. 혼자 있는 시간을 즐겨보세요.`,
        `기대를 낮추고 현재에 집중하는 것이 좋습니다.`,
        `감정 기복이 있을 수 있으니 중요한 이야기는 미루세요.`,
      ],
      poor: [
        `연애 운이 많이 떨어진 날입니다. 무리한 시도는 역효과가 날 수 있어요.`,
        `상대방과의 대화에서 오해가 생길 수 있습니다. 신중하게 말하세요.`,
        `혼자 재충전하는 시간을 갖는 것이 현명합니다.`,
        `사랑에 있어서 오늘은 기다리는 날입니다. 서두르지 마세요.`,
        `${name}에게 애정 운이 낮은 날, 자기 자신을 돌보는 하루로 삼으세요.`,
      ],
    };
    return map[tier];
  });

  const koMoney = makePool((s, tier) => {
    const name = SIGN_NAMES.ko[s];
    const map: Record<Tier, string[]> = {
      great: [
        `${name}의 재물운이 최고입니다! 투자나 새로운 수입에 좋은 기회가 옵니다.`,
        `예상치 못한 수입이나 좋은 소식이 들려올 수 있습니다.`,
        `금전적으로 유리한 하루입니다. 적극적으로 기회를 잡으세요.`,
        `재물이 들어오는 길운입니다. 좋은 제안이 오면 놓치지 마세요.`,
        `오늘 금전 관련 협상이나 계약을 맺기에 최적의 날입니다.`,
      ],
      good: [
        `재물 운이 좋은 날입니다. 합리적인 소비와 투자를 고려해 보세요.`,
        `${name}에게 금전적인 긍정 에너지가 흐릅니다.`,
        `작은 행운의 기회가 올 수 있는 날입니다. 주변을 잘 살피세요.`,
        `수입과 지출의 균형이 잘 맞는 하루가 될 것입니다.`,
        `재정 계획을 세우기에 좋은 날입니다. 미래를 준비하세요.`,
      ],
      mid: [
        `금전 운은 평범합니다. 불필요한 지출을 줄이는 것이 좋아요.`,
        `${name}의 재물 운은 안정적입니다. 현상 유지가 최선입니다.`,
        `수입과 지출이 균형을 이루는 하루입니다.`,
        `큰 변화는 없지만 꾸준히 쌓이는 날입니다.`,
        `재정적으로 신중한 하루를 보내세요.`,
      ],
      low: [
        `과도한 지출을 조심하세요. 충동구매는 피하는 것이 좋습니다.`,
        `${name}의 금전 운이 약한 날입니다. 큰 거래는 미루세요.`,
        `오늘은 새로운 투자보다 기존 자산을 지키는 날입니다.`,
        `돈 관련 결정은 신중하게 내려야 하는 날입니다.`,
        `예상치 못한 지출이 생길 수 있습니다. 여유 자금을 확인하세요.`,
      ],
      poor: [
        `재물 운이 많이 떨어진 날입니다. 중요한 재정 결정은 피하세요.`,
        `금전적 손실의 위험이 있는 날입니다. 도박이나 충동투자는 금물입니다.`,
        `${name}에게 오늘은 지갑을 닫는 날입니다.`,
        `재정적으로 방어적인 자세가 필요합니다.`,
        `큰 지출이나 거래는 다음 기회로 미루는 것이 현명합니다.`,
      ],
    };
    return map[tier];
  });

  const koHealth = makePool((s, tier) => {
    const name = SIGN_NAMES.ko[s];
    const map: Record<Tier, string[]> = {
      great: [
        `${name}의 건강 운이 최상입니다! 운동이나 새로운 건강 루틴을 시작해 보세요.`,
        `몸과 마음이 모두 활기찬 하루입니다. 야외 활동을 즐겨보세요.`,
        `에너지가 넘치는 날입니다. 오래 미뤄온 건강 검진을 받아보세요.`,
        `체력이 충만합니다. 도전적인 운동을 시작하기에 좋은 날이에요.`,
        `건강에 좋은 습관을 만들기에 최적의 날입니다.`,
      ],
      good: [
        `${name}의 건강 상태가 좋습니다. 꾸준한 운동으로 활력을 유지하세요.`,
        `건강 운이 좋은 하루, 몸이 가볍게 느껴질 것입니다.`,
        `규칙적인 생활이 빛을 발하는 날입니다.`,
        `좋은 컨디션을 유지하며 하루를 즐겁게 보내세요.`,
        `충분한 수분 섭취와 간단한 스트레칭이 도움이 됩니다.`,
      ],
      mid: [
        `건강은 보통 수준입니다. 규칙적인 생활 습관을 유지하세요.`,
        `${name}에게 무리한 활동보다 적당한 운동이 좋은 날입니다.`,
        `특별한 문제는 없지만 충분한 휴식이 필요합니다.`,
        `건강을 과신하지 말고 적절한 관리를 이어가세요.`,
        `식사와 수면에 신경 쓰는 것이 좋습니다.`,
      ],
      low: [
        `과로를 피하고 충분한 휴식을 취하세요. 몸의 신호에 귀 기울이세요.`,
        `${name}의 건강 운이 약한 날입니다. 무리한 운동은 피하세요.`,
        `소화기나 면역 계통에 주의가 필요합니다.`,
        `스트레스 관리가 중요한 날입니다.`,
        `오늘은 몸을 쉬게 하는 것이 최선입니다.`,
      ],
      poor: [
        `건강 운이 많이 떨어진 날입니다. 무리한 활동은 삼가세요.`,
        `${name}에게 오늘은 충분한 휴식이 필요합니다.`,
        `면역력이 약해질 수 있습니다. 따뜻하게 하고 충분히 자세요.`,
        `몸이 보내는 경고 신호를 무시하지 마세요.`,
        `안정적인 하루를 보내며 몸을 돌보세요.`,
      ],
    };
    return map[tier];
  });

  // ── English ──
  const enOverall = makePool((s, tier) => {
    const name = SIGN_NAMES.en[s];
    const map: Record<Tier, string[]> = {
      great: [
        `${name}, today is your day! Everything flows in your favor — seize every moment.`,
        `Exceptional energy surrounds you. Your best self shines brightly today.`,
        `The stars are perfectly aligned for ${name}. Big wins are within reach.`,
        `Today marks a peak moment for ${name}. Trust your instincts and leap forward.`,
        `Cosmic forces are on your side. Go all-in on what matters most.`,
      ],
      good: [
        `Good vibes flow for ${name} today. Step forward with confidence.`,
        `Positive momentum carries you through the day. Make the most of it.`,
        `A great day to pursue your goals with renewed determination.`,
        `${name}'s natural talents are highlighted today. Let them shine.`,
        `Support comes easily today. Teamwork leads to great outcomes.`,
      ],
      mid: [
        `A steady, balanced day for ${name}. Keep the course and stay grounded.`,
        `Nothing extraordinary, but solid progress is available to you.`,
        `${name}, take it easy and focus on consistent effort today.`,
        `A quiet day — perfect for reflection and planning ahead.`,
        `Moderate energy today. Prioritize what matters and let the rest go.`,
      ],
      low: [
        `${name}, tread carefully today. Save bold moves for a better day.`,
        `Energy feels scattered. Stay focused on essentials only.`,
        `Minor setbacks may pop up — keep your cool and adapt.`,
        `Not the ideal day for big decisions. Observe and gather information.`,
        `Patience is your ally today, ${name}. This phase will pass.`,
      ],
      poor: [
        `${name}, the cosmic currents are rough today. Play it safe.`,
        `Avoid risky ventures and protect what you've built.`,
        `Challenges arrive, but this too shall pass. Stay resilient.`,
        `A day for quiet reflection, not bold action. Recharge your energy.`,
        `Low fortune today — rest, plan, and prepare for better days ahead.`,
      ],
    };
    return map[tier];
  });

  const enLove = makePool((s, tier) => {
    const name = SIGN_NAMES.en[s];
    const map: Record<Tier, string[]> = {
      great: [
        `${name}'s love life sparkles today! Perfect time to confess or plan a date.`,
        `Romance is in the air. Share your true feelings without hesitation.`,
        `A new connection could change everything today. Stay open.`,
        `Deep emotional bonds form effortlessly today for ${name}.`,
        `Your charm is irresistible right now — enjoy the attention.`,
      ],
      good: [
        `Love flows warmly for ${name} today. Express gratitude to your partner.`,
        `Heartfelt conversations strengthen your relationships today.`,
        `Quality time with a loved one brings joy and closeness.`,
        `Your emotional intelligence shines — use it to connect deeply.`,
        `Small acts of love have big impact today for ${name}.`,
      ],
      mid: [
        `Love energy is steady for ${name}. Simple affection goes a long way.`,
        `No dramatic moments — just comfortable, warm connection.`,
        `Your relationship is stable. Focus on enjoying the present.`,
        `A quiet romantic day. Appreciate what you have.`,
        `Average love fortune. Self-love is equally important today.`,
      ],
      low: [
        `Misunderstandings may arise. Listen more than you speak today.`,
        `${name}'s emotions are sensitive today. Avoid confrontations.`,
        `Love energy is dim. Take time for yourself and recharge.`,
        `Temper expectations and focus on inner peace today.`,
        `Hold off on important relationship talks until energy improves.`,
      ],
      poor: [
        `Love fortune is very low for ${name}. Avoid risky romantic moves.`,
        `Miscommunication risk is high. Think before you speak or text.`,
        `Today calls for solitude and self-reflection, not romance.`,
        `Don't force connections today — let things unfold naturally.`,
        `Step back from relationship pressures and focus on self-care.`,
      ],
    };
    return map[tier];
  });

  const enMoney = makePool((s, tier) => {
    const name = SIGN_NAMES.en[s];
    const map: Record<Tier, string[]> = {
      great: [
        `${name}'s financial fortune is at its peak! Seize investment opportunities.`,
        `Unexpected income or an excellent offer may arrive today.`,
        `Money flows in your direction — act strategically and boldly.`,
        `Financial negotiations go smoothly for ${name} today.`,
        `Today is ideal for signing contracts or sealing deals.`,
      ],
      good: [
        `Good financial energy for ${name}. Smart spending leads to gains.`,
        `A pleasant financial surprise may be waiting around the corner.`,
        `Income and outflow balance nicely. A stable financial day.`,
        `Your financial instincts are sharp — trust your judgment.`,
        `Minor financial gains are likely today for ${name}.`,
      ],
      mid: [
        `Financial fortune is average. Avoid unnecessary spending.`,
        `${name}'s money energy is neutral today. Maintain your budget.`,
        `No big wins or losses — a steady financial day.`,
        `Focus on saving rather than spending today.`,
        `Review your finances calmly. Plan for the future.`,
      ],
      low: [
        `Be cautious with spending today, ${name}. Impulse buys can hurt.`,
        `Financial energy is weak. Postpone major purchases or investments.`,
        `Double-check any transactions today — errors are more likely.`,
        `Avoid lending money or making new financial commitments.`,
        `Hold off on big financial decisions until the energy improves.`,
      ],
      poor: [
        `${name}'s financial fortune is very low today. Play defense.`,
        `Risk of financial loss is elevated. Avoid gambling or speculation.`,
        `Keep your wallet closed today — unnecessary expenses add up.`,
        `Financial stress may arise. Take a calm, methodical approach.`,
        `Delay all major financial decisions to a more favorable day.`,
      ],
    };
    return map[tier];
  });

  const enHealth = makePool((s, tier) => {
    const name = SIGN_NAMES.en[s];
    const map: Record<Tier, string[]> = {
      great: [
        `${name}'s health energy is outstanding! Start a new fitness routine today.`,
        `Vitality is at its peak — enjoy outdoor exercise and fresh air.`,
        `Body and mind are in perfect harmony for ${name} today.`,
        `Great day for a health check-up or trying a new wellness practice.`,
        `Your physical stamina is exceptional — push yourself positively.`,
      ],
      good: [
        `Health is in good shape for ${name}. Keep up your healthy habits.`,
        `Light and energetic today — make the most of this feeling.`,
        `Your immune system is strong. A healthy diet amplifies it further.`,
        `A good day for moderate exercise and self-care routines.`,
        `Stay hydrated and keep moving — your body will thank you.`,
      ],
      mid: [
        `Health is at an average level for ${name}. Stick to your routine.`,
        `No major health concerns, but rest when you feel tired.`,
        `Moderate activity is ideal — don't push too hard today.`,
        `Balanced eating and adequate sleep will keep you steady.`,
        `Pay gentle attention to your body's signals today.`,
      ],
      low: [
        `${name}, avoid overexertion today. Your energy reserves are low.`,
        `Digestive sensitivity may appear. Eat lightly and stay hydrated.`,
        `Stress may take a toll — prioritize relaxation and calm.`,
        `Get to bed early tonight. Your body needs the rest.`,
        `Low health energy — skip intense workouts and opt for rest.`,
      ],
      poor: [
        `${name}'s health fortune is very low today. Rest and recover.`,
        `Immune defenses may be down. Dress warmly and avoid crowded places.`,
        `Listen to your body carefully — it's asking for rest today.`,
        `Avoid strenuous physical activity. Light stretching is fine.`,
        `Take care of yourself first. Wellness trumps productivity today.`,
      ],
    };
    return map[tier];
  });

  // For brevity we create abbreviated Japanese, French, Spanish, Chinese versions
  // using a parametric approach per tier
  function makeSimplePool(
    names: Record<SignKey, string>,
    tpl: Record<Tier, (n: string) => string[]>
  ): SignPool {
    return makePool((s, tier) => tpl[tier](names[s]));
  }

  const jaTpl: Record<string, Record<Tier, (n: string) => string[]>> = {
    overall: {
      great: (n) => [`${n}に最高の一日が訪れました！積極的に動いて大きな成果を掴みましょう。`,`幸運のエネルギーが満ち溢れています。${n}の魅力が輝く日です。`,`星の加護を受けた日です。挑戦を恐れず前に進みましょう。`,`${n}を応援する星の力が最大です。大きな一歩を踏み出す時。`,`何事もうまくいく予感の一日です。自信を持って臨みましょう。`],
      good: (n) => [`${n}に良いエネルギーが流れる一日です。自信を持って行動しましょう。`,`ポジティブな気運が一日を包みます。新しい挑戦をためらわないで。`,`運勢は上昇中です。重要な決断を下すのに良い日です。`,`周囲の助けが得やすい日です。協力すれば大きな成果が生まれます。`,`${n}の直感が冴える日。信じてついていきましょう。`],
      mid: (n) => [`今日は穏やかで安定した一日です。落ち着いて日常を送りましょう。`,`${n}に普通の運勢が流れています。無理をしないのが最善です。`,`大きな変化よりも着実な努力が輝く日です。`,`静かな一日、小さな幸せに感謝しながら過ごしましょう。`,`穏やかな気が漂います。今日は充電の時間にしましょう。`],
      low: (n) => [`${n}にとって少し慎重な一日です。重要な決断は先延ばしにしましょう。`,`エネルギーが低下している日です。急がずゆっくり進みましょう。`,`思わぬ困難が生じることがあります。柔軟に対処しましょう。`,`今日は新しい試みより既存の作業に集中した方がいいです。`,`忍耐が必要な日です。心を穏やかに保ちましょう。`],
      poor: (n) => [`${n}に辛い気が漂います。すべての事柄を慎重に扱いましょう。`,`今日は安静にするのが最善です。無理な計画は禁物です。`,`困難があってもこれも過ぎ去ります。忍耐しましょう。`,`運が低い日には準備を固めることが賢明です。`,`攻めより守りに集中しましょう。明日の反転を期待して。`],
    },
    love: {
      great: (n) => [`${n}の恋愛運が絶好調！告白やデートを計画しましょう。`,`愛する人と特別な瞬間を共有するのに完璧な日です。`,`新しい出会いの可能性が高まっています。周りを見渡してみて。`,`恋人との深い絆が生まれる日です。本心を伝えましょう。`,`${n}の魅力が輝く日！関係が一層深まります。`],
      good: (n) => [`恋愛運が良い一日です。素直な会話が関係を発展させます。`,`${n}に温かな愛のエネルギーが流れます。感謝を伝えましょう。`,`恋人と過ごす時間がより楽しい一日です。`,`胸が踊るようなことが起きるかもしれない日です。`,`お互いを理解し共感し合える良い機会です。`],
      mid: (n) => [`恋愛運は普通です。日常的な優しさで十分な一日です。`,`大きな変化より些細な愛情表現が輝く日です。`,`${n}の愛は安定しています。感謝の気持ちで過ごしましょう。`,`関係において特別なイベントより気楽な会話が良い日です。`,`恋愛運が平凡です。一人の時間も充電になります。`],
      low: (n) => [`誤解や小さな対立が生じるかもしれません。相手の話をよく聞いて。`,`${n}の感情が少し敏感な日です。衝動的な言葉は控えましょう。`,`恋愛運が弱い日です。一人の時間を楽しんでみましょう。`,`期待を下げて今に集中するのが良いです。`,`感情の起伏があるかもしれないので重要な話は先延ばしにして。`],
      poor: (n) => [`恋愛運がかなり落ちた日です。無理な試みは逆効果になるかも。`,`相手との会話で誤解が生じるかもしれません。慎重に話して。`,`一人で充電する時間を持つのが賢明です。`,`恋愛においては今日は待つ日です。急がないで。`,`${n}に恋愛運が低い日、自分自身を大切にする一日にしましょう。`],
    },
    money: {
      great: (n) => [`${n}の財運が最高です！投資や新たな収入に良い機会が来ます。`,`予想外の収入や良い知らせが届くかもしれません。`,`金銭的に有利な一日です。積極的にチャンスを掴みましょう。`,`財物が入ってくる吉運です。良い提案が来たら逃がさないで。`,`今日は金銭関連の交渉や契約を結ぶのに最適な日です。`],
      good: (n) => [`財運が良い日です。合理的な消費と投資を考えてみましょう。`,`${n}に金銭的なポジティブエネルギーが流れています。`,`小さな幸運の機会が来るかもしれない日です。周りをよく見て。`,`収入と支出のバランスが取れた一日になるでしょう。`,`財政計画を立てるのに良い日です。未来を準備しましょう。`],
      mid: (n) => [`金運は平凡です。不要な出費を減らすのが良いでしょう。`,`${n}の財運は安定しています。現状維持が最善です。`,`収入と支出のバランスが取れた一日です。`,`大きな変化はないけど着実に積み上がる日です。`,`財政的に慎重な一日を過ごしましょう。`],
      low: (n) => [`過度な支出に注意しましょう。衝動買いは避けた方がいいです。`,`${n}の金運が弱い日です。大きな取引は先延ばしにして。`,`今日は新しい投資より既存の資産を守る日です。`,`お金関連の決断は慎重に下さなければならない日です。`,`予期せぬ支出が生じるかもしれません。余剰資金を確認して。`],
      poor: (n) => [`財運がかなり落ちた日です。重要な財政決断は避けましょう。`,`金銭的損失のリスクがある日です。ギャンブルや衝動投資は禁物。`,`${n}にとって今日は財布を閉じる日です。`,`財政的に防御的な姿勢が必要です。`,`大きな支出や取引は次の機会に延ばすのが賢明です。`],
    },
    health: {
      great: (n) => [`${n}の健康運が最高！運動や新しい健康ルーティンを始めましょう。`,`心身ともに活気あふれる一日です。アウトドア活動を楽しんで。`,`エネルギーが溢れる日です。ずっと先延ばしにしていた健康診断を。`,`体力が充実しています。挑戦的な運動を始めるのに良い日ですよ。`,`健康に良い習慣を作るのに最適な日です。`],
      good: (n) => [`${n}の健康状態が良いです。継続的な運動で活力を維持して。`,`健康運が良い一日、体が軽く感じられるでしょう。`,`規則正しい生活が輝く日です。`,`良いコンディションを維持しながら楽しく一日を過ごしましょう。`,`十分な水分摂取と軽いストレッチが助けになります。`],
      mid: (n) => [`健康は普通レベルです。規則正しい生活習慣を維持しましょう。`,`${n}に無理な活動より適度な運動が良い日です。`,`特別な問題はありませんが十分な休息が必要です。`,`健康を過信せず適切な管理を続けましょう。`,`食事と睡眠に気を配るのが良いです。`],
      low: (n) => [`過労を避け十分な休息を取りましょう。体のサインに耳を傾けて。`,`${n}の健康運が弱い日です。無理な運動は避けましょう。`,`消化器や免疫系に注意が必要です。`,`ストレス管理が重要な日です。`,`今日は体を休めるのが最善です。`],
      poor: (n) => [`健康運がかなり落ちた日です。無理な活動は控えましょう。`,`${n}に十分な休息が必要な日です。`,`免疫力が低下するかもしれません。暖かくして十分に寝てください。`,`体が発するSOSを無視しないでください。`,`安定した一日を過ごしながら体を労わりましょう。`],
    },
  };

  function makeJaPool(cat: string): SignPool {
    return makePool((s, tier) => (jaTpl[cat] as Record<Tier, (n: string) => string[]>)[tier](SIGN_NAMES.ja[s]));
  }

  // French
  const frTpl: Record<string, Record<Tier, (n: string) => string[]>> = {
    overall: {
      great: (n) => [`${n}, aujourd'hui est votre jour de gloire ! Foncez et récoltez les fruits.`,`Une énergie exceptionnelle vous entoure. Votre meilleur vous brille.`,`Les étoiles sont parfaitement alignées pour ${n}. De grandes victoires sont à portée.`,`Un moment de sommet pour ${n}. Faites confiance à vos instincts.`,`Les forces cosmiques sont de votre côté. Investissez là où ça compte.`],
      good: (n) => [`De bonnes vibrations pour ${n} aujourd'hui. Avancez avec confiance.`,`L'élan positif vous porte toute la journée. Profitez-en au maximum.`,`Une excellente journée pour poursuivre vos objectifs avec détermination.`,`Les talents naturels de ${n} sont mis en avant. Laissez-les briller.`,`Le soutien vient facilement aujourd'hui. Le travail d'équipe donne de grands résultats.`],
      mid: (n) => [`Une journée stable et équilibrée pour ${n}. Restez sur la bonne voie.`,`Rien d'extraordinaire, mais des progrès solides sont disponibles.`,`${n}, prenez les choses facilement et concentrez-vous sur un effort constant.`,`Une journée calme — parfaite pour la réflexion et la planification.`,`Énergie modérée. Priorisez ce qui compte et laissez aller le reste.`],
      low: (n) => [`${n}, agissez avec prudence aujourd'hui. Gardez les grands mouvements pour un meilleur jour.`,`L'énergie semble dispersée. Restez concentré sur l'essentiel.`,`Des contretemps mineurs peuvent surgir — gardez votre calme et adaptez-vous.`,`Pas la journée idéale pour les grandes décisions. Observez et recueillez des informations.`,`La patience est votre alliée aujourd'hui, ${n}. Cette phase passera.`],
      poor: (n) => [`${n}, les courants cosmiques sont rudes aujourd'hui. Jouez la sécurité.`,`Évitez les aventures risquées et protégez ce que vous avez construit.`,`Les défis arrivent, mais cela aussi passera. Restez résilient.`,`Un jour de réflexion silencieuse, pas d'action audacieuse. Rechargez vos énergies.`,`Faible fortune aujourd'hui — reposez-vous, planifiez et préparez de meilleurs jours.`],
    },
    love: {
      great: (n) => [`La vie amoureuse de ${n} scintille ! Parfait pour confesser ou planifier un rendez-vous.`,`La romance est dans l'air. Partagez vos vrais sentiments sans hésitation.`,`Une nouvelle connexion pourrait tout changer aujourd'hui. Restez ouvert.`,`De profondes liaisons émotionnelles se forment sans effort pour ${n}.`,`Votre charme est irrésistible en ce moment — profitez de l'attention.`],
      good: (n) => [`L'amour coule chaleureusement pour ${n} aujourd'hui. Exprimez votre gratitude.`,`Des conversations sincères renforcent vos relations aujourd'hui.`,`Passer du temps de qualité avec un être cher apporte joie et proximité.`,`Votre intelligence émotionnelle brille — utilisez-la pour vous connecter profondément.`,`Les petits gestes d'amour ont un grand impact aujourd'hui pour ${n}.`],
      mid: (n) => [`L'énergie amoureuse est stable pour ${n}. La simple affection fait beaucoup.`,`Pas de moments dramatiques — juste une connexion confortable et chaleureuse.`,`Votre relation est stable. Concentrez-vous sur le moment présent.`,`Une journée romantique tranquille. Appréciez ce que vous avez.`,`Fortune amoureuse moyenne. L'amour de soi est tout aussi important aujourd'hui.`],
      low: (n) => [`Des malentendus peuvent surgir. Écoutez plus que vous ne parlez aujourd'hui.`,`Les émotions de ${n} sont sensibles aujourd'hui. Évitez les confrontations.`,`L'énergie amoureuse est faible. Prenez du temps pour vous ressourcer.`,`Tempérez vos attentes et concentrez-vous sur la paix intérieure.`,`Reportez les discussions importantes sur la relation jusqu'à ce que l'énergie s'améliore.`],
      poor: (n) => [`La fortune amoureuse est très basse pour ${n}. Évitez les gestes romantiques risqués.`,`Le risque de mauvaise communication est élevé. Réfléchissez avant de parler.`,`Aujourd'hui appelle la solitude et la réflexion intérieure, pas la romance.`,`Ne forcez pas les connexions aujourd'hui — laissez les choses se dérouler naturellement.`,`Prenez du recul par rapport aux pressions relationnelles et concentrez-vous sur les soins personnels.`],
    },
    money: {
      great: (n) => [`La fortune financière de ${n} est à son apogée ! Saisissez les opportunités d'investissement.`,`Des revenus inattendus ou une excellente offre peuvent arriver aujourd'hui.`,`L'argent coule dans votre direction — agissez stratégiquement et avec audace.`,`Les négociations financières se déroulent sans accroc pour ${n} aujourd'hui.`,`Aujourd'hui est idéal pour signer des contrats ou conclure des accords.`],
      good: (n) => [`Bonne énergie financière pour ${n}. Une dépense intelligente mène à des gains.`,`Une agréable surprise financière peut vous attendre au détour.`,`Les revenus et les dépenses s'équilibrent bien. Une journée financière stable.`,`Vos instincts financiers sont aiguisés — faites confiance à votre jugement.`,`Des gains financiers mineurs sont probables aujourd'hui pour ${n}.`],
      mid: (n) => [`La fortune financière est dans la moyenne. Évitez les dépenses inutiles.`,`L'énergie financière de ${n} est neutre aujourd'hui. Maintenez votre budget.`,`Pas de grands gains ni de pertes — une journée financière stable.`,`Concentrez-vous sur l'épargne plutôt que sur les dépenses aujourd'hui.`,`Examinez calmement vos finances. Planifiez pour l'avenir.`],
      low: (n) => [`Soyez prudent avec les dépenses aujourd'hui, ${n}. Les achats impulsifs peuvent faire mal.`,`L'énergie financière est faible. Reportez les achats importants ou les investissements.`,`Vérifiez bien toutes les transactions aujourd'hui — les erreurs sont plus probables.`,`Évitez de prêter de l'argent ou de prendre de nouveaux engagements financiers.`,`Attendez les grandes décisions financières jusqu'à ce que l'énergie s'améliore.`],
      poor: (n) => [`La fortune financière de ${n} est très basse aujourd'hui. Jouez la défense.`,`Le risque de perte financière est élevé. Évitez les jeux de hasard ou la spéculation.`,`Gardez votre portefeuille fermé aujourd'hui — les dépenses inutiles s'accumulent.`,`Un stress financier peut surgir. Adoptez une approche calme et méthodique.`,`Reportez toutes les grandes décisions financières à un jour plus favorable.`],
    },
    health: {
      great: (n) => [`L'énergie de santé de ${n} est exceptionnelle ! Commencez une nouvelle routine de fitness.`,`La vitalité est à son apogée — profitez de l'exercice et de l'air frais.`,`Le corps et l'esprit sont en parfaite harmonie pour ${n} aujourd'hui.`,`Excellente journée pour un bilan de santé ou essayer une nouvelle pratique de bien-être.`,`Votre endurance physique est exceptionnelle — poussez-vous positivement.`],
      good: (n) => [`La santé est en bonne forme pour ${n}. Maintenez vos habitudes saines.`,`Léger et énergique aujourd'hui — profitez au maximum de cette sensation.`,`Votre système immunitaire est fort. Une alimentation saine l'amplifie davantage.`,`Une bonne journée pour un exercice modéré et des routines de soins personnels.`,`Restez hydraté et continuez à bouger — votre corps vous remerciera.`],
      mid: (n) => [`La santé est à un niveau moyen pour ${n}. Respectez votre routine.`,`Pas de préoccupations majeures de santé, mais reposez-vous quand vous êtes fatigué.`,`Une activité modérée est idéale — ne vous poussez pas trop fort aujourd'hui.`,`Une alimentation équilibrée et un sommeil adéquat vous garderont stable.`,`Portez une attention douce aux signaux de votre corps aujourd'hui.`],
      low: (n) => [`${n}, évitez l'effort excessif aujourd'hui. Vos réserves d'énergie sont faibles.`,`Une sensibilité digestive peut apparaître. Mangez légèrement et restez hydraté.`,`Le stress peut peser lourd — priorisez la relaxation et la tranquillité.`,`Allez vous coucher tôt ce soir. Votre corps a besoin de repos.`,`Faible énergie de santé — sautez les entraînements intenses et optez pour le repos.`],
      poor: (n) => [`La fortune de santé de ${n} est très basse aujourd'hui. Reposez-vous et récupérez.`,`Les défenses immunitaires peuvent être basses. Habillez-vous chaudement et évitez les endroits bondés.`,`Écoutez attentivement votre corps — il demande du repos aujourd'hui.`,`Évitez les activités physiques intenses. Des étirements légers conviennent.`,`Prenez soin de vous d'abord. Le bien-être prime sur la productivité aujourd'hui.`],
    },
  };

  function makeFrPool(cat: string): SignPool {
    return makePool((s, tier) => (frTpl[cat] as Record<Tier, (n: string) => string[]>)[tier](SIGN_NAMES.fr[s]));
  }

  // Spanish
  const esTpl: Record<string, Record<Tier, (n: string) => string[]>> = {
    overall: {
      great: (n) => [`${n}, ¡hoy es tu día de gloria! Lánzate y recoge los frutos.`,`Una energía excepcional te rodea. Tu mejor yo brilla intensamente.`,`Las estrellas están perfectamente alineadas para ${n}. Las grandes victorias están al alcance.`,`Un momento cumbre para ${n}. Confía en tus instintos y avanza.`,`Las fuerzas cósmicas están de tu lado. Invierte en lo que más importa.`],
      good: (n) => [`Buenas vibraciones para ${n} hoy. Avanza con confianza.`,`El impulso positivo te lleva durante todo el día. Aprovéchalo al máximo.`,`Un día excelente para perseguir tus objetivos con determinación renovada.`,`Los talentos naturales de ${n} se destacan hoy. Déjalos brillar.`,`El apoyo llega fácilmente hoy. El trabajo en equipo lleva a grandes resultados.`],
      mid: (n) => [`Un día estable y equilibrado para ${n}. Mantén el rumbo.`,`Nada extraordinario, pero el progreso sólido está disponible.`,`${n}, tómatelo con calma y concéntrate en el esfuerzo constante.`,`Un día tranquilo — perfecto para la reflexión y la planificación.`,`Energía moderada. Prioriza lo que importa y deja ir el resto.`],
      low: (n) => [`${n}, pisa con cuidado hoy. Guarda los grandes movimientos para un día mejor.`,`La energía parece dispersa. Mantente enfocado en lo esencial.`,`Pueden surgir pequeños contratiempos — mantén la calma y adáptate.`,`No es el día ideal para grandes decisiones. Observa y recopila información.`,`La paciencia es tu aliada hoy, ${n}. Esta fase pasará.`],
      poor: (n) => [`${n}, las corrientes cósmicas son agitadas hoy. Juega a lo seguro.`,`Evita las aventuras arriesgadas y protege lo que has construido.`,`Los desafíos llegan, pero esto también pasará. Mantente resiliente.`,`Un día de reflexión silenciosa, no de acción audaz. Recarga tu energía.`,`Baja fortuna hoy — descansa, planifica y prepárate para días mejores.`],
    },
    love: {
      great: (n) => [`¡La vida amorosa de ${n} brilla hoy! Perfecto para confesar o planear una cita.`,`El romance está en el aire. Comparte tus verdaderos sentimientos sin vacilar.`,`Una nueva conexión podría cambiarlo todo hoy. Permanece abierto.`,`Profundos vínculos emocionales se forman sin esfuerzo para ${n}.`,`Tu encanto es irresistible ahora mismo — disfruta de la atención.`],
      good: (n) => [`El amor fluye cálidamente para ${n} hoy. Expresa tu gratitud a tu pareja.`,`Las conversaciones sinceras fortalecen tus relaciones hoy.`,`Pasar tiempo de calidad con un ser querido trae alegría y cercanía.`,`Tu inteligencia emocional brilla — úsala para conectar profundamente.`,`Los pequeños actos de amor tienen gran impacto hoy para ${n}.`],
      mid: (n) => [`La energía amorosa es estable para ${n}. El simple afecto recorre un largo camino.`,`Sin momentos dramáticos — solo una conexión cómoda y cálida.`,`Tu relación es estable. Concéntrate en disfrutar el presente.`,`Un día romántico tranquilo. Aprecia lo que tienes.`,`Fortuna amorosa media. El amor propio es igualmente importante hoy.`],
      low: (n) => [`Pueden surgir malentendidos. Escucha más de lo que hablas hoy.`,`Las emociones de ${n} son sensibles hoy. Evita las confrontaciones.`,`La energía amorosa es débil. Tómate tiempo para ti y recarga.`,`Modera las expectativas y concéntrate en la paz interior hoy.`,`Pospón las conversaciones importantes sobre la relación hasta que mejore la energía.`],
      poor: (n) => [`La fortuna amorosa es muy baja para ${n}. Evita los movimientos románticos arriesgados.`,`El riesgo de mala comunicación es alto. Piensa antes de hablar.`,`Hoy se requiere soledad y reflexión interior, no romance.`,`No forces las conexiones hoy — deja que las cosas se desarrollen naturalmente.`,`Aléjate de las presiones relacionales y concéntrate en el autocuidado.`],
    },
    money: {
      great: (n) => [`¡La fortuna financiera de ${n} está en su punto máximo! Aprovecha las oportunidades de inversión.`,`Pueden llegarte ingresos inesperados o una excelente oferta hoy.`,`El dinero fluye en tu dirección — actúa estratégica y audazmente.`,`Las negociaciones financieras van bien para ${n} hoy.`,`Hoy es ideal para firmar contratos o cerrar tratos.`],
      good: (n) => [`Buena energía financiera para ${n}. El gasto inteligente lleva a ganancias.`,`Puede estar esperándote una agradable sorpresa financiera.`,`Ingresos y gastos se equilibran bien. Un día financiero estable.`,`Tus instintos financieros son agudos — confía en tu criterio.`,`Son probables pequeñas ganancias financieras hoy para ${n}.`],
      mid: (n) => [`La fortuna financiera es media. Evita el gasto innecesario.`,`La energía financiera de ${n} es neutral hoy. Mantén tu presupuesto.`,`Sin grandes ganancias ni pérdidas — un día financiero estable.`,`Concéntrate en ahorrar en lugar de gastar hoy.`,`Revisa tus finanzas con calma. Planifica para el futuro.`],
      low: (n) => [`Ten cuidado con el gasto hoy, ${n}. Las compras impulsivas pueden hacer daño.`,`La energía financiera es débil. Pospón las grandes compras o inversiones.`,`Verifica bien todas las transacciones hoy — los errores son más probables.`,`Evita prestar dinero o hacer nuevos compromisos financieros.`,`Espera las grandes decisiones financieras hasta que mejore la energía.`],
      poor: (n) => [`La fortuna financiera de ${n} es muy baja hoy. Juega a la defensiva.`,`El riesgo de pérdida financiera es elevado. Evita el juego o la especulación.`,`Mantén tu cartera cerrada hoy — los gastos innecesarios se acumulan.`,`Puede surgir estrés financiero. Adopta un enfoque calmado y metódico.`,`Retrasa todas las grandes decisiones financieras para un día más favorable.`],
    },
    health: {
      great: (n) => [`¡La energía de salud de ${n} es excepcional! Comienza una nueva rutina de fitness hoy.`,`La vitalidad está en su apogeo — disfruta del ejercicio y el aire fresco.`,`El cuerpo y la mente están en perfecta armonía para ${n} hoy.`,`Excelente día para un chequeo de salud o probar una nueva práctica de bienestar.`,`Tu resistencia física es excepcional — impulsa positivamente.`],
      good: (n) => [`La salud está en buena forma para ${n}. Mantén tus hábitos saludables.`,`Ligero y enérgico hoy — aprovecha al máximo esta sensación.`,`Tu sistema inmune es fuerte. Una dieta saludable lo amplifica aún más.`,`Un buen día para ejercicio moderado y rutinas de autocuidado.`,`Mantente hidratado y en movimiento — tu cuerpo te lo agradecerá.`],
      mid: (n) => [`La salud está en un nivel medio para ${n}. Sigue tu rutina.`,`No hay grandes problemas de salud, pero descansa cuando te sientas cansado.`,`La actividad moderada es ideal — no te exijas demasiado hoy.`,`Una alimentación equilibrada y el sueño adecuado te mantendrán estable.`,`Presta suave atención a las señales de tu cuerpo hoy.`],
      low: (n) => [`${n}, evita el esfuerzo excesivo hoy. Tus reservas de energía son bajas.`,`Puede aparecer sensibilidad digestiva. Come ligeramente y mantente hidratado.`,`El estrés puede pasar factura — prioriza la relajación y la calma.`,`Acuéstate temprano esta noche. Tu cuerpo necesita el descanso.`,`Poca energía de salud — sáltate los entrenamientos intensos y opta por el descanso.`],
      poor: (n) => [`La fortuna de salud de ${n} es muy baja hoy. Descansa y recupérate.`,`Las defensas inmunes pueden estar bajas. Vístete abrigado y evita los lugares concurridos.`,`Escucha atentamente a tu cuerpo — pide descanso hoy.`,`Evita la actividad física extenuante. Los estiramientos ligeros están bien.`,`Cuídate primero. El bienestar supera a la productividad hoy.`],
    },
  };

  function makeEsPool(cat: string): SignPool {
    return makePool((s, tier) => (esTpl[cat] as Record<Tier, (n: string) => string[]>)[tier](SIGN_NAMES.es[s]));
  }

  // Chinese Simplified
  const zhTpl: Record<string, Record<Tier, (n: string) => string[]>> = {
    overall: {
      great: (n) => [`${n}，今天是你的高光时刻！积极行动，收获丰硕成果。`,`超凡能量环绕你，你最好的状态今天闪耀。`,`星辰完美排列为${n}。重大胜利触手可及。`,`这是${n}的巅峰时刻，相信直觉，勇往直前。`,`宇宙力量与你同在，全力投入最重要的事情。`],
      good: (n) => [`${n}今天振动良好，自信前行。`,`积极动力伴随你一天，充分利用它。`,`追求目标的绝佳日子，以新的决心前进。`,`${n}的天赋今天得到彰显，让它闪耀。`,`支持轻松而来，团队合作带来丰硕成果。`],
      mid: (n) => [`${n}今天平稳均衡，保持方向。`,`平淡无奇，但扎实的进步触手可及。`,`${n}，放轻松，专注于持续努力。`,`安静的一天，完美适合反思和规划。`,`能量适中，优先处理重要事项，放下其余。`],
      low: (n) => [`${n}，今天谨慎行事，大胆行动留到更好的日子。`,`能量感觉分散，只专注于最重要的事。`,`小挫折可能出现，保持冷静，灵活应对。`,`今天不是大决策的好日子，观察并收集信息。`,`耐心是你今天的盟友，${n}，这个阶段会过去。`],
      poor: (n) => [`${n}，今天宇宙气流汹涌，稳健行事。`,`避免冒险，保护你已建立的一切。`,`挑战来临，但这也会过去，保持韧性。`,`今天适合安静反思，而非大胆行动，充电蓄能。`,`今日运势低，休息、规划、准备迎接更好的日子。`],
    },
    love: {
      great: (n) => [`${n}的恋爱运今天一片光明！完美时机告白或计划约会。`,`浪漫气息弥漫，毫不犹豫地分享你的真实感受。`,`一段新的缘分今天可能改变一切，保持开放。`,`深厚的情感连接对${n}来说今天毫不费力地形成。`,`你的魅力此刻不可抗拒，享受这份关注吧。`],
      good: (n) => [`爱情为${n}今天温暖流淌，向伴侣表达感谢。`,`真诚的对话今天加深你的关系。`,`与爱人共度美好时光带来欢乐和亲密感。`,`你的情商闪耀，用它建立深度连接。`,`今天小小的爱意表达对${n}影响巨大。`],
      mid: (n) => [`${n}的爱情能量平稳，简单的关怀大有裨益。`,`没有戏剧性时刻，只是舒适温暖的连接。`,`你的关系稳定，专注享受当下。`,`浪漫而宁静的一天，珍惜你所拥有的。`,`平均恋爱运，今天自我关爱同样重要。`],
      low: (n) => [`可能出现误解，今天多听少说。`,`${n}的情绪今天比较敏感，避免冲突。`,`爱情能量微弱，花些时间为自己充电。`,`降低期望，今天专注于内心平静。`,`等到能量改善再进行重要的感情谈话。`],
      poor: (n) => [`${n}的恋爱运今天非常低，避免冒险的浪漫举动。`,`沟通不畅风险高，说话前先思考。`,`今天需要独处和内心反思，而非浪漫。`,`今天不要强求连接，让事情自然发展。`,`远离感情压力，专注自我照顾。`],
    },
    money: {
      great: (n) => [`${n}的财运今天达到顶峰！抓住投资机会。`,`意外收入或极好的机会今天可能到来。`,`金钱向你流动，战略性且大胆地行动。`,`${n}今天的财务谈判进展顺利。`,`今天是签合同或达成交易的理想时机。`],
      good: (n) => [`${n}的财务能量良好，明智消费带来收益。`,`一个令人愉快的财务惊喜可能在等你。`,`收支平衡良好，财务稳定的一天。`,`你的财务直觉敏锐，相信自己的判断。`,`${n}今天可能获得小额财务收益。`],
      mid: (n) => [`财运一般，避免不必要的支出。`,`${n}的财务能量今天中性，维持预算。`,`没有重大得失，财务平稳的一天。`,`今天专注储蓄而非消费。`,`冷静审视财务，为未来规划。`],
      low: (n) => [`今天${n}要谨慎消费，冲动购物会有影响。`,`财务能量弱，推迟大额购买或投资。`,`今天仔细核查所有交易，错误更容易发生。`,`避免借钱或做新的财务承诺。`,`等到能量改善再做重大财务决定。`],
      poor: (n) => [`${n}今天财运非常低，采取防守姿态。`,`财务损失风险升高，避免赌博或投机。`,`今天保持钱包关闭，不必要的支出会累积。`,`可能出现财务压力，采取冷静有条理的方法。`,`将所有重大财务决定推迟到更有利的日子。`],
    },
    health: {
      great: (n) => [`${n}的健康能量今天卓越！今天开始新的健身常规。`,`活力达到顶峰，享受户外运动和新鲜空气。`,`${n}今天身心完美和谐。`,`今天是体检或尝试新健康实践的好日子。`,`你的体力非凡，积极地推动自己。`],
      good: (n) => [`${n}的健康状况良好，保持健康习惯。`,`今天轻盈而充满活力，充分利用这种感觉。`,`你的免疫系统强壮，健康饮食进一步增强它。`,`适合适度运动和自我护理的好日子。`,`保持水分，继续运动，你的身体会感谢你。`],
      mid: (n) => [`${n}的健康处于平均水平，坚持你的日常。`,`没有重大健康问题，但感到疲倦时要休息。`,`适度活动是理想的，今天不要过度施压。`,`均衡饮食和充足睡眠会让你保持稳定。`,`今天温和关注身体信号。`],
      low: (n) => [`${n}，今天避免过度劳累，你的能量储备很低。`,`可能出现消化敏感，少量饮食并保持水分。`,`压力可能会有影响，优先放松和平静。`,`今晚早点入睡，你的身体需要休息。`,`健康能量低，跳过高强度训练，选择休息。`],
      poor: (n) => [`${n}今天的健康运很低，休息和恢复。`,`免疫防御可能下降，穿暖和些，避免拥挤的地方。`,`仔细聆听你的身体，今天它要求休息。`,`避免剧烈运动，轻度伸展可以。`,`首先照顾好自己，今天健康胜过生产力。`],
    },
  };

  function makeZhPool(cat: string): SignPool {
    return makePool((s, tier) => (zhTpl[cat] as Record<Tier, (n: string) => string[]>)[tier](SIGN_NAMES.zh[s]));
  }

  return {
    ko: { overall: koOverall, love: koLove, money: koMoney, health: koHealth },
    en: { overall: enOverall, love: enLove, money: enMoney, health: enHealth },
    ja: { overall: makeJaPool("overall"), love: makeJaPool("love"), money: makeJaPool("money"), health: makeJaPool("health") },
    fr: { overall: makeFrPool("overall"), love: makeFrPool("love"), money: makeFrPool("money"), health: makeFrPool("health") },
    es: { overall: makeEsPool("overall"), love: makeEsPool("love"), money: makeEsPool("money"), health: makeEsPool("health") },
    zh: { overall: makeZhPool("overall"), love: makeZhPool("love"), money: makeZhPool("money"), health: makeZhPool("health") },
  };
})();

// ─── Lucky Data ───────────────────────────────────────────────────────────────

const LUCKY_COLORS: Record<Locale, string[]> = {
  ko: ["빨강","주황","노랑","초록","파랑","남색","보라","흰색","검정","분홍"],
  en: ["Red","Orange","Yellow","Green","Blue","Indigo","Purple","White","Black","Pink"],
  ja: ["赤","オレンジ","黄色","緑","青","藍","紫","白","黒","ピンク"],
  fr: ["Rouge","Orange","Jaune","Vert","Bleu","Indigo","Violet","Blanc","Noir","Rose"],
  es: ["Rojo","Naranja","Amarillo","Verde","Azul","Índigo","Morado","Blanco","Negro","Rosa"],
  zh: ["红色","橙色","黄色","绿色","蓝色","靛蓝","紫色","白色","黑色","粉红"],
};

// ─── UI i18n ──────────────────────────────────────────────────────────────────

const UI: Record<Locale, {
  title: string;
  subtitle: string;
  selectLabel: string;
  selectPlaceholder: string;
  resultDate: string;
  overall: string;
  love: string;
  money: string;
  health: string;
  luckySection: string;
  luckyColor: string;
  luckyNumber: string;
  disclaimer: string;
  resetBtn: string;
}> = {
  ko: {
    title: "오늘의 별자리 운세",
    subtitle: "별자리를 선택하면 오늘의 운세를 알려드립니다",
    selectLabel: "내 별자리",
    selectPlaceholder: "별자리 선택",
    resultDate: "오늘의 운세",
    overall: "종합운",
    love: "애정운",
    money: "금전운",
    health: "건강운",
    luckySection: "오늘의 행운",
    luckyColor: "행운의 색",
    luckyNumber: "행운의 숫자",
    disclaimer: "* 재미로 보는 운세입니다",
    resetBtn: "다시 선택",
  },
  en: {
    title: "Daily Horoscope",
    subtitle: "Select your zodiac sign to reveal today's horoscope",
    selectLabel: "My Zodiac Sign",
    selectPlaceholder: "Select a sign",
    resultDate: "Today's Horoscope",
    overall: "Overall",
    love: "Love",
    money: "Money",
    health: "Health",
    luckySection: "Today's Lucky",
    luckyColor: "Lucky Color",
    luckyNumber: "Lucky Number",
    disclaimer: "* For entertainment purposes only",
    resetBtn: "Change Sign",
  },
  ja: {
    title: "今日の星座運勢",
    subtitle: "星座を選んで今日の運勢を確認しましょう",
    selectLabel: "私の星座",
    selectPlaceholder: "星座を選択",
    resultDate: "今日の運勢",
    overall: "総合運",
    love: "恋愛運",
    money: "金運",
    health: "健康運",
    luckySection: "今日のラッキー",
    luckyColor: "ラッキーカラー",
    luckyNumber: "ラッキーナンバー",
    disclaimer: "* 占いは楽しみのためのものです",
    resetBtn: "選び直す",
  },
  fr: {
    title: "Horoscope du Jour",
    subtitle: "Sélectionnez votre signe du zodiaque pour révéler l'horoscope du jour",
    selectLabel: "Mon Signe Zodiacal",
    selectPlaceholder: "Choisissez un signe",
    resultDate: "Horoscope d'Aujourd'hui",
    overall: "Général",
    love: "Amour",
    money: "Argent",
    health: "Santé",
    luckySection: "Chance du Jour",
    luckyColor: "Couleur Chanceuse",
    luckyNumber: "Numéro Chanceux",
    disclaimer: "* À titre de divertissement uniquement",
    resetBtn: "Changer de Signe",
  },
  es: {
    title: "Horóscopo del Día",
    subtitle: "Selecciona tu signo zodiacal para revelar el horóscopo de hoy",
    selectLabel: "Mi Signo Zodiacal",
    selectPlaceholder: "Elige un signo",
    resultDate: "Horóscopo de Hoy",
    overall: "General",
    love: "Amor",
    money: "Dinero",
    health: "Salud",
    luckySection: "Suerte del Día",
    luckyColor: "Color de Suerte",
    luckyNumber: "Número de Suerte",
    disclaimer: "* Solo con fines de entretenimiento",
    resetBtn: "Cambiar Signo",
  },
  zh: {
    title: "今日星座运势",
    subtitle: "选择你的星座查看今天的运势",
    selectLabel: "我的星座",
    selectPlaceholder: "选择星座",
    resultDate: "今日运势",
    overall: "综合运势",
    love: "爱情运",
    money: "财运",
    health: "健康运",
    luckySection: "今日幸运",
    luckyColor: "幸运颜色",
    luckyNumber: "幸运数字",
    disclaimer: "* 仅供娱乐参考",
    resetBtn: "重新选择",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface HoroscopeResult {
  sign: SignKey;
  overall: { score: number; text: string };
  love: { score: number; text: string };
  money: { score: number; text: string };
  health: { score: number; text: string };
  luckyColor: string;
  luckyNumber: number;
  date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickTier(score: number): Tier {
  if (score === 5) return "great";
  if (score === 4) return "good";
  if (score === 3) return "mid";
  if (score === 2) return "low";
  return "poor";
}

function generateHoroscope(sign: SignKey, locale: Locale): HoroscopeResult {
  const signIdx = SIGNS.indexOf(sign);
  const rand = seededRand(todaySeed(signIdx));
  const score = () => Math.floor(rand() * 5) + 1;

  const overallScore = score();
  const loveScore = score();
  const moneyScore = score();
  const healthScore = score();

  const texts = SIGN_TEXTS[locale];

  const pickText = (pool: Record<Tier, string[]>, s: number) => {
    const tier = pickTier(s);
    const arr = pool[tier];
    return arr[Math.floor(rand() * arr.length)];
  };

  const colors = LUCKY_COLORS[locale];

  return {
    sign,
    overall: { score: overallScore, text: pickText(texts.overall[sign], overallScore) },
    love: { score: loveScore, text: pickText(texts.love[sign], loveScore) },
    money: { score: moneyScore, text: pickText(texts.money[sign], moneyScore) },
    health: { score: healthScore, text: pickText(texts.health[sign], healthScore) },
    luckyColor: colors[Math.floor(rand() * colors.length)],
    luckyNumber: Math.floor(rand() * 9) + 1,
    date: getToday(),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRow({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <span key={i} className={`text-base ${i <= score ? "text-yellow-400" : "text-gray-300"}`}>
          ★
        </span>
      ))}
    </div>
  );
}

function CategoryCard({ emoji, label, score, text }: { emoji: string; label: string; score: number; text: string }) {
  const bg =
    score >= 4
      ? "from-amber-50 to-yellow-50 border-amber-200"
      : score >= 3
      ? "from-blue-50 to-sky-50 border-blue-200"
      : "from-gray-50 to-slate-50 border-gray-200";

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${bg}`}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <span className="font-semibold text-gray-800">{label}</span>
      </div>
      <StarRow score={score} />
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{text}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyHoroscope({ locale }: Props) {
  const ui = UI[locale] ?? UI.en;
  const names = SIGN_NAMES[locale] ?? SIGN_NAMES.en;
  const [selected, setSelected] = useState<SignKey | "">("");
  const [result, setResult] = useState<HoroscopeResult | null>(null);

  function handleSelect(sign: SignKey) {
    setSelected(sign);
    setResult(generateHoroscope(sign, locale));
  }

  function handleReset() {
    setSelected("");
    setResult(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{ui.title}</h1>
        <p className="mt-1 text-gray-500">{ui.subtitle}</p>
      </div>

      {/* Sign selector */}
      {!result ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <p className="text-sm font-medium text-gray-700">{ui.selectLabel}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {SIGNS.map((s) => (
              <button
                key={s}
                onClick={() => handleSelect(s)}
                className={`flex flex-col items-center rounded-xl border py-3 px-2 transition-all hover:border-violet-400 hover:bg-violet-50 ${
                  selected === s
                    ? "border-violet-500 bg-violet-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <span className="text-2xl">{SIGN_EMOJI[s]}</span>
                <span className="mt-1 text-xs text-gray-700 text-center leading-tight">{names[s]}</span>
                <span className="text-xs text-gray-400">{SIGN_DATES[s]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sign badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{SIGN_EMOJI[result.sign]}</span>
              <div>
                <p className="text-lg font-bold text-gray-900">{names[result.sign]}</p>
                <p className="text-xs text-gray-400">{result.date} · {ui.resultDate}</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {ui.resetBtn}
            </button>
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CategoryCard emoji="⭐" label={ui.overall} score={result.overall.score} text={result.overall.text} />
            <CategoryCard emoji="💕" label={ui.love} score={result.love.score} text={result.love.text} />
            <CategoryCard emoji="💰" label={ui.money} score={result.money.score} text={result.money.text} />
            <CategoryCard emoji="💚" label={ui.health} score={result.health.score} text={result.health.text} />
          </div>

          {/* Lucky section */}
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5">
            <h3 className="mb-3 text-center font-bold text-violet-800">✨ {ui.luckySection}</h3>
            <div className="flex justify-center gap-10">
              <div className="text-center">
                <p className="text-xs text-violet-500 mb-1">{ui.luckyColor}</p>
                <p className="text-lg font-semibold text-violet-700">{result.luckyColor}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-violet-500 mb-1">{ui.luckyNumber}</p>
                <p className="text-2xl font-bold text-violet-700">{result.luckyNumber}</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">{ui.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
