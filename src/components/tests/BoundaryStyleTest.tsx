import { useState, useEffect } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type BoundaryStyle = "porous" | "rigid" | "flexible" | "contextual" | "empathic";

interface Question {
  ko: string;
  en: string;
  ja: string;
  options: {
    ko: string;
    en: string;
    ja: string;
    scores: Partial<Record<BoundaryStyle, number>>;
  }[];
}

const questions: Question[] = [
  {
    ko: "친한 친구가 갑자기 도움을 요청할 때 당신은?",
    en: "A close friend suddenly asks for help. You:",
    ja: "親しい友人が突然助けを求めてきたとき、あなたは？",
    options: [
      { ko: "거절하는 게 어려워 힘들어도 대부분 들어준다", en: "Find it hard to refuse and usually help even when it's difficult", ja: "断るのが難しく、辛くても大体引き受ける", scores: { porous: 2 } },
      { ko: "내 일정과 에너지 상태를 보고 가능하면 한다고 말한다", en: "Check my schedule and energy and say I can if possible", ja: "自分のスケジュールとエネルギー状態を見て、可能なら手伝うと言う", scores: { flexible: 2, contextual: 1 } },
      { ko: "사전에 약속하지 않은 건 원칙적으로 거절한다", en: "Principally refuse anything not pre-arranged", ja: "事前に約束していないことは原則的に断る", scores: { rigid: 2 } },
      { ko: "어떤 친구냐에 따라 다르다 — 가까운 정도에 따라 판단한다", en: "Depends on which friend — I judge based on how close we are", ja: "どの友人かによる — 親密さの程度によって判断する", scores: { contextual: 2, flexible: 1 } },
      { ko: "친구가 힘들 것 같아 내 상황이 어렵더라도 먼저 나선다", en: "Sense my friend is struggling and step up even if it's hard for me", ja: "友人が大変そうだと感じて、自分が辛くても先に動く", scores: { empathic: 2, porous: 1 } },
    ],
  },
  {
    ko: "누군가 당신의 개인 정보나 사생활에 대해 물어볼 때?",
    en: "When someone asks about your personal life or private information:",
    ja: "誰かがあなたの個人情報やプライバシーについて聞いてきたとき？",
    options: [
      { ko: "불편해도 자세히 답하는 편이다 — 거절이 불편하다", en: "Answer in detail even if uncomfortable — refusal feels awkward", ja: "不快でも詳しく答える方 — 断ることが不快", scores: { porous: 2 } },
      { ko: "나누고 싶은 만큼만 공유하고 편안하게 선을 긋는다", en: "Share only what I want to and comfortably draw the line", ja: "共有したい分だけ共有して、気楽に一線を引く", scores: { flexible: 2 } },
      { ko: "사생활은 거의 공유하지 않는다 — 모르는 게 낫다고 생각한다", en: "Rarely share private info — I think it's better they don't know", ja: "プライバシーはほとんど共有しない — 知らない方がいいと思う", scores: { rigid: 2 } },
      { ko: "관계와 상황에 따라 다르게 대응한다", en: "Respond differently depending on the relationship and situation", ja: "関係性と状況によって異なる対応をする", scores: { contextual: 2 } },
      { ko: "상대가 왜 궁금한지 이해하려고 하고, 그 감정에 맞게 반응한다", en: "Try to understand why they're curious and respond to their feelings", ja: "相手がなぜ気になるのか理解しようとして、その感情に合わせて反応する", scores: { empathic: 2 } },
    ],
  },
  {
    ko: "직장이나 학교에서 내가 원하지 않는 역할을 맡게 됐을 때?",
    en: "You're assigned a role at work or school that you don't want:",
    ja: "職場や学校で望まない役割を任されたとき？",
    options: [
      { ko: "싫어도 거절하지 못하고 맡는다", en: "Don't want it but can't refuse and take it on", ja: "嫌でも断れず引き受ける", scores: { porous: 2 } },
      { ko: "솔직하게 이유를 말하고 재조율을 요청한다", en: "Honestly explain my reasons and request a re-arrangement", ja: "正直に理由を伝えて再調整をお願いする", scores: { flexible: 2 } },
      { ko: "내 역할 범위를 분명히 하고 그 이상은 하지 않는다", en: "Clearly define my role scope and won't do anything beyond it", ja: "自分の役割範囲を明確にして、それ以上はしない", scores: { rigid: 2 } },
      { ko: "상황과 기회에 따라 수락 여부를 판단한다", en: "Decide whether to accept based on circumstances and opportunity", ja: "状況と機会に応じて受け入れるかどうか判断する", scores: { contextual: 2 } },
      { ko: "팀에게 필요한 일이면 내가 희생할 수 있다고 생각한다", en: "Think I can sacrifice myself if it's what the team needs", ja: "チームに必要なことなら自分が犠牲になれると思う", scores: { empathic: 2, porous: 1 } },
    ],
  },
  {
    ko: "연인이나 가족이 당신에게 감정적으로 크게 의존할 때?",
    en: "A partner or family member relies on you heavily for emotional support:",
    ja: "恋人や家族が感情的に大きくあなたに依存するとき？",
    options: [
      { ko: "내가 지치더라도 버팀목이 되어주려 한다", en: "Try to be their pillar even if it exhausts me", ja: "自分が疲れても支えになろうとする", scores: { porous: 2, empathic: 1 } },
      { ko: "내가 줄 수 있는 것과 없는 것을 솔직하게 이야기한다", en: "Honestly talk about what I can and cannot give", ja: "自分が与えられることと与えられないことを正直に話す", scores: { flexible: 2 } },
      { ko: "과도한 의존은 관계에 좋지 않다고 거리를 둔다", en: "Keep distance, believing excessive dependence isn't good for the relationship", ja: "過度な依存は関係に良くないと距離を置く", scores: { rigid: 2 } },
      { ko: "시기와 상황에 따라 수용 정도를 조절한다", en: "Adjust how much I accept depending on timing and circumstances", ja: "時期と状況に応じて受け入れる程度を調整する", scores: { contextual: 2 } },
      { ko: "상대의 고통이 내 고통으로 느껴져 함께 힘들어진다", en: "Their pain feels like my pain and I struggle alongside them", ja: "相手の苦しみが自分の苦しみのように感じられ、一緒に辛くなる", scores: { empathic: 2, porous: 1 } },
    ],
  },
  {
    ko: "혼자만의 시간(충전 시간)이 필요할 때 당신은?",
    en: "When you need alone time to recharge:",
    ja: "一人だけの時間（充電時間）が必要なとき、あなたは？",
    options: [
      { ko: "다른 사람이 필요로 하면 내 시간을 포기하는 편이다", en: "Tend to give up my time if someone else needs me", ja: "他の人が必要とするなら自分の時間を諦める方だ", scores: { porous: 2 } },
      { ko: "이 시간이 필요하다고 말하고 확보한다", en: "Say I need this time and secure it", ja: "この時間が必要だと伝えて確保する", scores: { flexible: 2 } },
      { ko: "혼자 있는 시간을 지키기 위해 강하게 선을 긋는다", en: "Draw firm lines to protect my alone time", ja: "一人でいる時間を守るために強く一線を引く", scores: { rigid: 2 } },
      { ko: "상황에 따라 다르다 — 꼭 필요한 때만 요청한다", en: "Depends on the situation — I only ask when truly necessary", ja: "状況による — 本当に必要なときだけお願いする", scores: { contextual: 2 } },
      { ko: "주변 사람들이 괜찮다면 혼자 있는 시간을 갖는다", en: "Take alone time only if the people around me are okay", ja: "周りの人が大丈夫なら一人の時間を持つ", scores: { empathic: 2, porous: 1 } },
    ],
  },
  {
    ko: "누군가 당신의 가치관과 다른 행동을 반복할 때?",
    en: "Someone repeatedly behaves in ways that conflict with your values:",
    ja: "誰かがあなたの価値観と異なる行動を繰り返すとき？",
    options: [
      { ko: "불편하지만 직접적으로 말하지 못하고 참는다", en: "Feel uncomfortable but can't say anything directly and endure", ja: "不快だが直接言えず我慢する", scores: { porous: 2 } },
      { ko: "나의 가치관을 명확히 전달하고 변화를 요청한다", en: "Clearly communicate my values and request change", ja: "自分の価値観を明確に伝えて変化を求める", scores: { flexible: 2 } },
      { ko: "그런 사람과는 관계를 줄이거나 끊는다", en: "Reduce or end the relationship with such a person", ja: "そのような人とは関係を減らすか断ち切る", scores: { rigid: 2 } },
      { ko: "어떤 관계냐에 따라 대응 방법을 다르게 한다", en: "Respond differently depending on what kind of relationship it is", ja: "どのような関係かによって対応方法を変える", scores: { contextual: 2 } },
      { ko: "왜 그렇게 하는지 이해하려 노력하며 판단을 유보한다", en: "Try to understand why they act that way and reserve judgment", ja: "なぜそうするのか理解しようと努め、判断を保留する", scores: { empathic: 2 } },
    ],
  },
];

const results: Record<
  BoundaryStyle,
  {
    emoji: string;
    color: string;
    ko: { title: string; description: string; strength: string; weakness: string; tip: string };
    en: { title: string; description: string; strength: string; weakness: string; tip: string };
    ja: { title: string; description: string; strength: string; weakness: string; tip: string };
  }
> = {
  porous: {
    emoji: "🌊",
    color: "#60a5fa",
    ko: {
      title: "경계 희박형",
      description: "당신은 타인의 필요와 감정을 내 것처럼 느끼며, 경계를 긋는 것이 불편합니다. 거절하는 것을 두려워하고, 결국 자신의 에너지를 과도하게 소진하는 경향이 있습니다. 관계에서 깊은 연결을 원하지만, 자기 자신을 잃어버릴 위험이 있습니다.",
      strength: "공감 능력 뛰어남, 관계에서 높은 헌신도, 타인의 필요에 민감",
      weakness: "번아웃 위험 높음, 자기 필요 무시, 관계에서 착취당할 수 있음",
      tip: "거절은 관계를 끊는 것이 아니라 관계를 지속 가능하게 만드는 것입니다. '이번엔 안 돼' 한 마디를 연습하세요. 당신이 잘 돌봐져야 타인도 잘 도울 수 있습니다.",
    },
    en: {
      title: "Porous Boundaries",
      description: "You feel others' needs and emotions as your own and find it uncomfortable to set limits. You fear saying no and tend to excessively drain your own energy. You want deep connection in relationships but risk losing yourself.",
      strength: "Excellent empathy, high dedication in relationships, sensitive to others' needs",
      weakness: "High burnout risk, neglect of own needs, vulnerable to exploitation in relationships",
      tip: "Saying no isn't ending a relationship — it's making it sustainable. Practice saying 'not this time.' You can only help others well when you're well cared for yourself.",
    },
    ja: {
      title: "境界希薄型",
      description: "他者のニーズと感情を自分のものとして感じ、境界を引くことが不快です。断ることを恐れ、最終的に自分のエネルギーを過度に消耗する傾向があります。関係で深いつながりを望みますが、自分自身を失うリスクがあります。",
      strength: "共感能力に優れる、関係における高い献身度、他者のニーズに敏感",
      weakness: "バーンアウトリスクが高い、自分のニーズを無視、関係で搾取される可能性",
      tip: "断ることは関係を断ち切ることではなく、関係を持続可能にすることです。「今回はダメ」という一言を練習しましょう。自分がよく世話されてこそ、他者もよく助けられます。",
    },
  },
  rigid: {
    emoji: "🧱",
    color: "#64748b",
    ko: {
      title: "경계 강직형",
      description: "당신은 명확하고 강한 경계를 유지합니다. 자신의 공간과 에너지를 철저히 보호하지만, 때로는 친밀감과 취약성을 허용하기 어렵습니다. 독립성이 강점이지만, 깊은 연결이 필요할 때 벽이 될 수 있습니다.",
      strength: "명확한 자기 보호, 소진 없는 에너지 관리, 조종 당하지 않음",
      weakness: "친밀감 형성 어려움, 취약성 허용 어려움, 지나치게 거리감 있어 보일 수 있음",
      tip: "안전한 관계에서 작은 취약성을 허용해보세요. 경계는 필요하지만, 가끔은 낮은 담장이 더 좋은 이웃을 만듭니다. 신뢰를 쌓아가며 경계를 조금씩 유연하게 해보세요.",
    },
    en: {
      title: "Rigid Boundaries",
      description: "You maintain clear, firm limits. You thoroughly protect your space and energy, but sometimes find it hard to allow closeness and vulnerability. Independence is a strength, but limits can become walls when deep connection is needed.",
      strength: "Clear self-protection, energy management without burnout, not easily manipulated",
      weakness: "Difficulty forming intimacy, hard to allow vulnerability, may appear too distant",
      tip: "Allow small vulnerabilities in safe relationships. Limits are necessary, but occasionally a lower fence makes for better neighbors. Build trust gradually and allow limits to become a little more flexible.",
    },
    ja: {
      title: "境界強直型",
      description: "明確で強い境界を維持します。自分のスペースとエネルギーを徹底的に守りますが、時に親密さや脆弱性を許すことが難しいです。独立性が強みですが、深いつながりが必要なときに壁になる可能性があります。",
      strength: "明確な自己保護、消耗のないエネルギー管理、操られにくい",
      weakness: "親密さの形成が難しい、脆弱性を許すのが難しい、距離感があると見られることも",
      tip: "安全な関係で小さな脆弱性を許してみましょう。境界は必要ですが、時には低い塀の方が良い隣人を作ります。信頼を積み重ねながら境界を少しずつ柔軟にしてみましょう。",
    },
  },
  flexible: {
    emoji: "🌿",
    color: "#10b981",
    ko: {
      title: "유연 경계형",
      description: "당신은 상황에 맞게 자신의 필요를 표현하고, 타인의 요청에도 합리적으로 반응합니다. '아니오'와 '예스' 사이에서 자신의 가치와 에너지를 기준으로 판단합니다. 건강한 경계를 가진 가장 균형 잡힌 유형입니다.",
      strength: "자기 존중과 타인 배려의 균형, 소통 능력 탁월, 관계 지속 가능성 높음",
      weakness: "항상 유지하기 위한 에너지 필요, 상황 판단이 복잡할 수 있음",
      tip: "현재의 방식을 유지하세요. 경계를 긋는 것이 자연스럽고 편안하다는 것 자체가 큰 강점입니다. 다만, 피로할 때 경계가 흐려지지 않도록 자기 상태를 꾸준히 점검하세요.",
    },
    en: {
      title: "Flexible Boundaries",
      description: "You express your needs appropriately for each situation and respond reasonably to others' requests. You judge between 'no' and 'yes' based on your values and energy. This is the most balanced type with healthy limits.",
      strength: "Balance of self-respect and consideration for others, excellent communication, high relationship sustainability",
      weakness: "Requires energy to maintain consistently, situational judgment can be complex",
      tip: "Keep doing what you're doing. The fact that setting limits feels natural and comfortable is itself a great strength. Just regularly check your state so limits don't blur when you're tired.",
    },
    ja: {
      title: "柔軟境界型",
      description: "状況に合わせて自分のニーズを表現し、他者の要求にも合理的に反応します。「ノー」と「イエス」の間で、自分の価値観とエネルギーを基準に判断します。健全な境界を持つ最もバランスのとれた類型です。",
      strength: "自己尊重と他者への配慮のバランス、コミュニケーション能力が優れている、関係の持続可能性が高い",
      weakness: "維持するためのエネルギーが必要、状況判断が複雑になることも",
      tip: "現在のやり方を続けてください。境界を引くことが自然で快適であること自体が大きな強みです。ただ、疲れているときに境界が曖昧にならないよう、自分の状態を定期的にチェックしましょう。",
    },
  },
  contextual: {
    emoji: "🎭",
    color: "#f59e0b",
    ko: {
      title: "상황 맥락형",
      description: "당신의 경계는 관계와 상황에 따라 달라집니다. 직장 동료에게는 명확한 경계를 유지하면서 가족에게는 열려있거나 그 반대일 수 있습니다. 유연성이 강점이지만, 일관성이 부족할 때 관계에서 혼란을 줄 수 있습니다.",
      strength: "상황 적응력 탁월, 다양한 관계 유형 관리 능숙, 세심한 상황 판단",
      weakness: "일관성 부족으로 혼란 가능, 복잡한 판단으로 인한 에너지 소모, 타인이 예측하기 어려울 수 있음",
      tip: "핵심 가치에 기반한 '불변의 경계'를 한두 가지 정해보세요. 상황에 따라 유연하되, 기본이 되는 원칙이 있으면 관계에서 더 일관된 신뢰를 줄 수 있습니다.",
    },
    en: {
      title: "Contextual Boundaries",
      description: "Your limits vary by relationship and situation. You might maintain clear limits with coworkers while being open with family, or vice versa. Flexibility is a strength, but lack of consistency can cause confusion in relationships.",
      strength: "Excellent situational adaptability, skilled at managing diverse relationship types, nuanced situational judgment",
      weakness: "Possible confusion from inconsistency, energy drain from complex judgment, may be hard for others to predict",
      tip: "Define one or two 'unchanging limits' based on core values. Being flexible by situation is fine, but having foundational principles allows others to trust you more consistently.",
    },
    ja: {
      title: "状況文脈型",
      description: "境界は関係性と状況によって変わります。職場の同僚には明確な境界を維持しながら家族には開放的だったり、その逆だったりします。柔軟性が強みですが、一貫性が欠けると関係で混乱を招く可能性があります。",
      strength: "状況適応力に優れる、多様な関係タイプの管理が上手、細やかな状況判断",
      weakness: "一貫性の欠如による混乱の可能性、複雑な判断によるエネルギー消耗、他者が予測しにくいことも",
      tip: "核心的な価値観に基づいた「不変の境界」を一つか二つ決めてみましょう。状況によって柔軟であっても、基本となる原則があれば、関係においてより一貫した信頼を与えられます。",
    },
  },
  empathic: {
    emoji: "💚",
    color: "#8b5cf6",
    ko: {
      title: "공감 경계형",
      description: "당신은 타인의 감정에 깊이 공감하며 그들의 상태를 기준으로 경계를 설정합니다. 상대가 힘들면 내 경계도 낮아지고, 상대가 괜찮으면 자기를 챙깁니다. 높은 공감력이 강점이지만, 공감에 의해 경계가 결정되면 자기 필요가 일관되게 충족되지 않을 수 있습니다.",
      strength: "깊은 공감과 정서적 민감성, 타인의 상태를 빠르게 파악함, 관계에서 깊은 신뢰 형성",
      weakness: "공감 피로(Empathy Fatigue) 위험, 자기 필요의 비일관적 충족, 감정적 조종에 취약할 수 있음",
      tip: "공감은 당신의 선물이지만, 공감에 의해 경계가 완전히 결정되면 지칩니다. '공감하지만 지금 내가 도울 수 없어'라는 것도 정직한 반응입니다. 자기 필요를 타인과 동등하게 대우하는 연습을 해보세요.",
    },
    en: {
      title: "Empathic Boundary-Setter",
      description: "You deeply empathize with others and set limits based on their state. When they struggle, your limits lower; when they're fine, you take care of yourself. High empathy is a strength, but when limits are entirely determined by empathy, your own needs may not be consistently met.",
      strength: "Deep empathy and emotional sensitivity, quick to read others' states, builds deep trust in relationships",
      weakness: "Risk of empathy fatigue, inconsistent fulfillment of own needs, potentially vulnerable to emotional manipulation",
      tip: "Empathy is your gift, but letting empathy entirely determine your limits will exhaust you. 'I empathize, but I can't help right now' is also an honest response. Practice treating your own needs as equal to others'.",
    },
    ja: {
      title: "共感境界型",
      description: "他者の感情に深く共感し、その状態を基準に境界を設定します。相手が辛いと自分の境界も低くなり、相手が大丈夫なら自分を大切にします。高い共感力が強みですが、共感によって境界が完全に決まると自分のニーズが一貫して満たされないことがあります。",
      strength: "深い共感と感情的敏感さ、他者の状態を素早く把握、関係での深い信頼形成",
      weakness: "共感疲労リスク、自分のニーズの不一致な充足、感情的操作に弱い可能性",
      tip: "共感はあなたの贈り物ですが、共感によって境界が完全に決まると疲弊します。「共感するけど今は助けられない」というのも正直な反応です。自分のニーズを他者と同等に扱う練習をしてみましょう。",
    },
  },
};

const t = {
  ko: {
    title: "경계 설정 스타일 테스트",
    subtitle: "나는 어떻게 경계를 긋는가?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "나의 경계 설정 스타일",
    strength: "강점",
    weakness: "약점",
    tip: "성장 팁",
    radarLabel: "스타일별 경향",
    restart: "다시 하기",
    share: "결과 공유",
    copied: "복사됨!",
  },
  en: {
    title: "Boundary Style Test",
    subtitle: "How Do You Set Limits?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "Your Boundary Style",
    strength: "Strengths",
    weakness: "Weaknesses",
    tip: "Growth Tip",
    radarLabel: "Tendencies by Style",
    restart: "Restart",
    share: "Share Result",
    copied: "Copied!",
  },
  ja: {
    title: "境界設定スタイルテスト",
    subtitle: "あなたはどのように境界を引きますか？",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "あなたの境界設定スタイル",
    strength: "強み",
    weakness: "弱点",
    tip: "成長のヒント",
    radarLabel: "スタイル別の傾向",
    restart: "もう一度",
    share: "結果をシェア",
    copied: "コピーされました！",
  },
};

export default function BoundaryStyleTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = t[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<BoundaryStyle, number>>({
    porous: 0,
    rigid: 0,
    flexible: 0,
    contextual: 0,
    empathic: 0,
  });
  const [answered, setAnswered] = useState(0);
  const [result, setResult] = useState<BoundaryStyle | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const bs = p.get("bs") as BoundaryStyle | null;
    if (bs && results[bs]) setResult(bs);
  }, []);

  function pick(partialScores: Partial<Record<BoundaryStyle, number>>) {
    const next = { ...scores };
    for (const [k, v] of Object.entries(partialScores)) {
      next[k as BoundaryStyle] = (next[k as BoundaryStyle] ?? 0) + (v ?? 0);
    }
    const nextAnswered = answered + 1;

    if (nextAnswered < questions.length) {
      setScores(next);
      setAnswered(nextAnswered);
      setTimeout(() => setIdx(nextAnswered), 280);
    } else {
      setScores(next);
      setAnswered(nextAnswered);
      const winner = (Object.keys(next) as BoundaryStyle[]).reduce((a, b) =>
        next[a] >= next[b] ? a : b
      );
      setResult(winner);
      const url = new URL(window.location.href);
      url.searchParams.set("bs", winner);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0);
    setAnswered(0);
    setScores({ porous: 0, rigid: 0, flexible: 0, contextual: 0, empathic: 0 });
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("bs");
    window.history.replaceState({}, "", url.toString());
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: tx.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const styleLabels: Record<BoundaryStyle, string> = {
    porous: locale === "ko" ? "희박형" : locale === "ja" ? "希薄型" : "Porous",
    rigid: locale === "ko" ? "강직형" : locale === "ja" ? "強直型" : "Rigid",
    flexible: locale === "ko" ? "유연형" : locale === "ja" ? "柔軟型" : "Flexible",
    contextual: locale === "ko" ? "맥락형" : locale === "ja" ? "文脈型" : "Contextual",
    empathic: locale === "ko" ? "공감형" : locale === "ja" ? "共感型" : "Empathic",
  };

  if (result) {
    const r = results[result];
    const rd = r[locale];
    const maxScore = Math.max(...Object.values(scores), 1);
    const radarData = (Object.keys(scores) as BoundaryStyle[]).map((k) => ({
      style: styleLabels[k],
      value: Math.round((scores[k] / maxScore) * 100),
      fullMark: 100,
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-green-50 to-purple-50 p-6 text-center">
          <p className="mb-1 text-sm font-medium text-gray-500">{tx.resultTitle}</p>
          <div className="mb-2 text-5xl">{r.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{rd.title}</h2>
          <p className="mt-3 text-gray-600">{rd.description}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-green-700">✅ {tx.strength}</h3>
            <p className="mt-1 text-sm text-gray-600">{rd.strength}</p>
          </div>
          <div>
            <h3 className="font-semibold text-orange-600">⚠️ {tx.weakness}</h3>
            <p className="mt-1 text-sm text-gray-600">{rd.weakness}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <h3 className="font-semibold text-green-700">💡 {tx.tip}</h3>
            <p className="mt-1 text-sm text-green-800">{rd.tip}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-gray-700">{tx.radarLabel}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="style" tick={{ fontSize: 12 }} />
              <Radar
                name="score"
                dataKey="value"
                stroke={r.color}
                fill={r.color}
                fillOpacity={0.3}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex gap-3">
          <button
            onClick={restart}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {tx.restart}
          </button>
          <button
            onClick={share}
            className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-medium text-white transition hover:bg-green-700"
          >
            {copied ? tx.copied : tx.share}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[idx];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{tx.title}</h1>
        <p className="mt-1 text-gray-500">{tx.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${(idx / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-500">{tx.progress(idx + 1, questions.length)}</span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-5 text-center text-lg font-medium text-gray-800">{q[locale]}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => pick(opt.scores)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-green-300 hover:bg-green-50"
            >
              {opt[locale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
