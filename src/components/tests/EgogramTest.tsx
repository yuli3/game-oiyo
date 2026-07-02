import { useState, useEffect } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type EgoState = "CP" | "NP" | "A" | "FC" | "AC";

const EGO_STATES: EgoState[] = ["CP", "NP", "A", "FC", "AC"];

const stateInfo: Record<EgoState, Record<SupportedLocale, { name: string; color: string }>> = {
  CP: {
    ko: { name: "비판적 부모(CP)", color: "#ef4444" },
    en: { name: "Critical Parent (CP)", color: "#ef4444" },
    ja: { name: "批判的親(CP)", color: "#ef4444" },
  },
  NP: {
    ko: { name: "양육적 부모(NP)", color: "#10b981" },
    en: { name: "Nurturing Parent (NP)", color: "#10b981" },
    ja: { name: "養育的親(NP)", color: "#10b981" },
  },
  A: {
    ko: { name: "성인(A)", color: "#3b82f6" },
    en: { name: "Adult (A)", color: "#3b82f6" },
    ja: { name: "成人(A)", color: "#3b82f6" },
  },
  FC: {
    ko: { name: "자유로운 아이(FC)", color: "#f59e0b" },
    en: { name: "Free Child (FC)", color: "#f59e0b" },
    ja: { name: "自由な子供(FC)", color: "#f59e0b" },
  },
  AC: {
    ko: { name: "순응하는 아이(AC)", color: "#8b5cf6" },
    en: { name: "Adapted Child (AC)", color: "#8b5cf6" },
    ja: { name: "順応した子供(AC)", color: "#8b5cf6" },
  },
};

interface Question {
  ko: string;
  en: string;
  ja: string;
  state: EgoState;
}

const questions: Question[] = [
  // CP — Critical Parent
  { ko: "나는 다른 사람의 잘못을 쉽게 지적하는 편이다.", en: "I tend to easily point out others' mistakes.", ja: "他人の間違いを簡単に指摘する方だ。", state: "CP" },
  { ko: "규칙이나 원칙을 어기는 사람을 보면 화가 난다.", en: "I get angry when people break rules or principles.", ja: "ルールや原則を破る人を見ると怒りを感じる。", state: "CP" },
  // NP — Nurturing Parent
  { ko: "어려움에 처한 사람을 보면 돕고 싶은 마음이 자연스럽게 생긴다.", en: "I naturally want to help people in difficulty.", ja: "困っている人を見ると自然と助けたくなる。", state: "NP" },
  { ko: "주변 사람들의 감정과 상태에 민감하게 반응한다.", en: "I'm sensitive to the feelings and condition of those around me.", ja: "周りの人の感情と状態に敏感に反応する。", state: "NP" },
  // A — Adult
  { ko: "감정보다는 사실과 논리를 바탕으로 결정을 내린다.", en: "I make decisions based on facts and logic rather than emotions.", ja: "感情よりも事実と論理に基づいて決断する。", state: "A" },
  { ko: "문제가 생기면 원인을 분석하고 해결책을 체계적으로 찾는다.", en: "When problems arise, I analyze causes and systematically find solutions.", ja: "問題が生じたら原因を分析し、体系的に解決策を探す。", state: "A" },
  // FC — Free Child
  { ko: "새로운 것을 시도하거나 놀이처럼 즐기는 것을 좋아한다.", en: "I enjoy trying new things and approaching life playfully.", ja: "新しいことを試したり、遊びのように楽しむことが好きだ。", state: "FC" },
  { ko: "감정을 솔직하게 표현하고 기쁨을 드러내는 편이다.", en: "I tend to express my emotions honestly and show my joy freely.", ja: "感情を正直に表現し、喜びを素直に表す方だ。", state: "FC" },
  // AC — Adapted Child
  { ko: "다른 사람의 기대에 부응하려고 나의 욕구를 억누를 때가 많다.", en: "I often suppress my own desires to meet others' expectations.", ja: "他人の期待に応えようと自分の欲求を抑えることが多い。", state: "AC" },
  { ko: "갈등을 피하기 위해 의견 충돌보다는 타협하거나 양보하는 편이다.", en: "To avoid conflict, I tend to compromise or yield rather than clash.", ja: "葛藤を避けるため、意見の衝突よりも妥協したり譲ることが多い。", state: "AC" },
];

const scaleLabels: Record<SupportedLocale, string[]> = {
  ko: ["전혀 아니다", "아니다", "보통", "그렇다", "매우 그렇다"],
  en: ["Not at all", "Not really", "Neutral", "Agree", "Strongly agree"],
  ja: ["全くない", "そうでない", "普通", "そうだ", "とてもそうだ"],
};

interface ResultData {
  title: Record<SupportedLocale, string>;
  dominant: EgoState;
  description: Record<SupportedLocale, string>;
  strengths: Record<SupportedLocale, string[]>;
  risks: Record<SupportedLocale, string[]>;
  advice: Record<SupportedLocale, string>;
  affirmation: Record<SupportedLocale, string>;
}

type ProfileKey = "balanced" | "CP_dominant" | "NP_dominant" | "A_dominant" | "FC_dominant" | "AC_dominant";

const profiles: Record<ProfileKey, ResultData> = {
  balanced: {
    title: { ko: "균형잡힌 자아", en: "Balanced Ego", ja: "バランスの取れた自我" },
    dominant: "A",
    description: {
      ko: "당신은 5가지 자아 상태가 비교적 균형 있게 발달되어 있습니다. 상황에 따라 부모·성인·아이의 측면을 유연하게 활용하며, 대인관계에서 적응력이 높습니다.",
      en: "Your five ego states are relatively balanced. You flexibly use parent, adult, and child aspects depending on the situation, making you highly adaptable in relationships.",
      ja: "5つの自我状態が比較的バランスよく発達しています。状況に応じて親・成人・子供の側面を柔軟に活用し、対人関係での適応力が高いです。",
    },
    strengths: {
      ko: ["상황 적응력이 뛰어남", "다양한 방식으로 소통 가능", "감정과 이성의 균형"],
      en: ["Highly adaptable to situations", "Can communicate in diverse ways", "Balance between emotion and reason"],
      ja: ["状況への適応力が優れている", "多様な方法でコミュニケーション可能", "感情と理性のバランス"],
    },
    risks: {
      ko: ["뚜렷한 강점이 없어 보일 수 있음", "결정적 상황에서 방향 설정이 어려울 수 있음"],
      en: ["May seem to lack a distinct strength", "May struggle to set direction in critical moments"],
      ja: ["際立った強みが見えにくいことがある", "決定的な場面で方向性を定めにくいことがある"],
    },
    advice: {
      ko: "균형은 큰 장점입니다. 자신의 핵심 가치를 더 명확히 해두면 결정적 순간에 힘이 됩니다.",
      en: "Balance is a great strength. Clarifying your core values will empower you in decisive moments.",
      ja: "バランスは大きな強みです。核心的な価値観をより明確にすることで、決定的な瞬間に力を発揮できます。",
    },
    affirmation: {
      ko: "나는 다양한 상황에 유연하게 적응하는 능력이 있습니다.",
      en: "I have the ability to flexibly adapt to diverse situations.",
      ja: "私はさまざまな状況に柔軟に適応する能力があります。",
    },
  },
  CP_dominant: {
    title: { ko: "비판적 리더형", en: "Critical Leader", ja: "批判的リーダー型" },
    dominant: "CP",
    description: {
      ko: "비판적 부모(CP) 자아가 강한 당신은 높은 기준과 원칙을 중요시합니다. 책임감이 강하고 잘못된 것을 바로잡으려는 의지가 있지만, 타인에게 엄격하게 느껴질 수 있습니다.",
      en: "With a dominant Critical Parent (CP) ego, you value high standards and principles. You're responsible and motivated to correct wrongs, but may come across as strict to others.",
      ja: "批判的親(CP)自我が強いあなたは、高い基準と原則を重視します。責任感が強く間違いを正したい意欲がありますが、他人に厳格に感じられることがあります。",
    },
    strengths: {
      ko: ["높은 책임감과 원칙 준수", "잘못된 것을 바로잡는 리더십", "일관된 기준 유지"],
      en: ["High responsibility and adherence to principles", "Leadership in correcting wrongs", "Maintaining consistent standards"],
      ja: ["高い責任感と原則の遵守", "間違いを正すリーダーシップ", "一貫した基準の維持"],
    },
    risks: {
      ko: ["지나친 비판으로 관계가 경직될 수 있음", "완벽주의로 인한 스트레스 증가", "상대방이 위축될 수 있음"],
      en: ["Excessive criticism can stiffen relationships", "Perfectionism increases stress", "Others may feel intimidated"],
      ja: ["過度な批判で関係が硬直することがある", "完璧主義によるストレスの増加", "相手が萎縮することがある"],
    },
    advice: {
      ko: "비판 전에 상대의 입장을 먼저 이해하려고 노력해보세요. 칭찬과 인정의 말도 함께 섞어주면 더 효과적인 리더가 됩니다.",
      en: "Try to understand others' perspectives before criticizing. Mixing praise and acknowledgment makes you a more effective leader.",
      ja: "批判する前に相手の立場を理解しようと努力してみてください。称賛と承認の言葉も混ぜると、より効果的なリーダーになれます。",
    },
    affirmation: {
      ko: "나의 높은 기준은 나와 타인 모두의 성장을 위한 것입니다.",
      en: "My high standards exist to foster growth in myself and others.",
      ja: "私の高い基準は、自分と他人の両方の成長のためです。",
    },
  },
  NP_dominant: {
    title: { ko: "따뜻한 돌봄형", en: "Warm Caregiver", ja: "温かい世話型" },
    dominant: "NP",
    description: {
      ko: "양육적 부모(NP) 자아가 강한 당신은 타인을 돕고 보살피는 것에서 의미를 찾습니다. 공감 능력이 뛰어나고 주변 사람들에게 따뜻한 지지를 제공하지만, 자신을 잃을 위험도 있습니다.",
      en: "With a dominant Nurturing Parent (NP) ego, you find meaning in helping and caring for others. You have excellent empathy and provide warm support, but risk losing yourself.",
      ja: "養育的親(NP)自我が強いあなたは、他者を助け世話することに意味を見出します。共感力が優れており温かいサポートを提供しますが、自分を見失うリスクもあります。",
    },
    strengths: {
      ko: ["뛰어난 공감 능력", "타인을 위한 희생과 헌신", "신뢰받는 지지자 역할"],
      en: ["Excellent empathy", "Sacrifice and dedication for others", "Role as a trusted supporter"],
      ja: ["優れた共感能力", "他者のための犠牲と献身", "信頼される支援者としての役割"],
    },
    risks: {
      ko: ["자신의 필요를 무시하는 경향", "과도한 돌봄으로 번아웃 위험", "의존적인 관계를 형성할 수 있음"],
      en: ["Tendency to neglect own needs", "Risk of burnout from excessive caring", "May create dependent relationships"],
      ja: ["自分のニーズを無視する傾向", "過度な世話によるバーンアウトのリスク", "依存的な関係を形成することがある"],
    },
    advice: {
      ko: "남을 돕는 것만큼 자신을 돌보는 것도 중요합니다. '아니오'라고 말하는 연습을 통해 건강한 경계를 만들어 보세요.",
      en: "Caring for yourself is as important as caring for others. Practice saying 'no' to create healthy boundaries.",
      ja: "自分を大切にすることは、他人を助けることと同じくらい重要です。「ノー」と言う練習をして、健康的な境界線を作りましょう。",
    },
    affirmation: {
      ko: "나는 나 자신을 돌볼 때 더 풍요롭게 타인을 도울 수 있습니다.",
      en: "When I care for myself, I can help others more abundantly.",
      ja: "自分を大切にすることで、より豊かに他者を助けることができます。",
    },
  },
  A_dominant: {
    title: { ko: "이성적 분석가형", en: "Rational Analyst", ja: "理性的分析家型" },
    dominant: "A",
    description: {
      ko: "성인(A) 자아가 강한 당신은 논리와 사실에 기반해 생각하고 행동합니다. 객관적이고 냉정하게 상황을 분석하는 능력이 뛰어나지만, 때로는 감정적 연결이 부족해 보일 수 있습니다.",
      en: "With a dominant Adult (A) ego, you think and act based on logic and facts. You excel at objective analysis, but may sometimes appear emotionally detached.",
      ja: "成人(A)自我が強いあなたは、論理と事実に基づいて考え行動します。客観的に状況を分析する能力が優れていますが、時に感情的なつながりが不足して見えることがあります。",
    },
    strengths: {
      ko: ["객관적이고 정확한 판단", "감정에 휘둘리지 않는 안정성", "체계적인 문제 해결 능력"],
      en: ["Objective and accurate judgment", "Stability not swayed by emotions", "Systematic problem-solving ability"],
      ja: ["客観的で正確な判断", "感情に左右されない安定性", "体系的な問題解決能力"],
    },
    risks: {
      ko: ["감정 표현 부족으로 차갑게 보일 수 있음", "직관이나 창의성이 약할 수 있음", "관계에서 감정적 지지가 부족할 수 있음"],
      en: ["May appear cold due to lack of emotional expression", "Intuition or creativity may be weaker", "May lack emotional support in relationships"],
      ja: ["感情表現の不足で冷たく見えることがある", "直感や創造性が弱いことがある", "関係において感情的サポートが不足することがある"],
    },
    advice: {
      ko: "분석 능력은 큰 자산입니다. 여기에 감정적 공감을 더하면 더욱 완성된 소통을 할 수 있습니다.",
      en: "Your analytical ability is a great asset. Adding emotional empathy will make your communication even more complete.",
      ja: "分析力は大きな資産です。感情的な共感を加えることで、より完成したコミュニケーションができます。",
    },
    affirmation: {
      ko: "나의 논리적 사고는 나와 주변 사람들에게 명확함을 선물합니다.",
      en: "My logical thinking is a gift of clarity to myself and those around me.",
      ja: "私の論理的思考は、自分と周りの人に明確さをもたらします。",
    },
  },
  FC_dominant: {
    title: { ko: "자유로운 창조자형", en: "Free Creator", ja: "自由な創造者型" },
    dominant: "FC",
    description: {
      ko: "자유로운 아이(FC) 자아가 강한 당신은 호기심과 창의성이 넘칩니다. 자발적이고 에너지가 넘치며 삶을 즐기는 능력이 있지만, 때로는 충동적이거나 책임감이 부족해 보일 수 있습니다.",
      en: "With a dominant Free Child (FC) ego, you overflow with curiosity and creativity. You're spontaneous and energetic with a gift for enjoying life, but may sometimes seem impulsive or less responsible.",
      ja: "自由な子供(FC)自我が強いあなたは、好奇心と創造性が溢れています。自発的でエネルギッシュで人生を楽しむ能力がありますが、時に衝動的または責任感が不足して見えることがあります。",
    },
    strengths: {
      ko: ["높은 창의성과 상상력", "자발적인 즐거움과 유머", "새로운 아이디어 창출 능력"],
      en: ["High creativity and imagination", "Spontaneous joy and humor", "Ability to generate new ideas"],
      ja: ["高い創造性と想像力", "自発的な楽しさとユーモア", "新しいアイデアを生み出す能力"],
    },
    risks: {
      ko: ["충동적인 결정을 내릴 수 있음", "장기적 계획이나 마무리가 약할 수 있음", "책임 회피로 이어질 수 있음"],
      en: ["May make impulsive decisions", "Long-term planning or follow-through may be weak", "Can lead to avoiding responsibilities"],
      ja: ["衝動的な決断をすることがある", "長期計画や締めくくりが弱いことがある", "責任回避につながることがある"],
    },
    advice: {
      ko: "당신의 에너지와 창의성은 세상에 활력을 줍니다. 약간의 구조와 계획을 더하면 그 에너지가 더 큰 결실을 맺을 수 있습니다.",
      en: "Your energy and creativity bring vitality to the world. Adding a bit more structure and planning can help that energy bear greater fruit.",
      ja: "あなたのエネルギーと創造性は世界に活力を与えます。少しの構造と計画を加えることで、そのエネルギーがより大きな実を結ぶことができます。",
    },
    affirmation: {
      ko: "나의 창의성과 열정은 세상을 더 풍요롭게 만듭니다.",
      en: "My creativity and passion make the world more vibrant.",
      ja: "私の創造性と情熱は、世界をより豊かにします。",
    },
  },
  AC_dominant: {
    title: { ko: "순응하는 평화주의자형", en: "Peaceful Adapter", ja: "順応する平和主義者型" },
    dominant: "AC",
    description: {
      ko: "순응하는 아이(AC) 자아가 강한 당신은 갈등을 피하고 타인의 기대에 맞추려는 경향이 강합니다. 협조적이고 온화하지만, 자신의 진짜 감정을 억누르거나 자기주장이 약할 수 있습니다.",
      en: "With a dominant Adapted Child (AC) ego, you strongly tend to avoid conflict and conform to others' expectations. You're cooperative and gentle, but may suppress your true feelings or lack assertiveness.",
      ja: "順応した子供(AC)自我が強いあなたは、葛藤を避け他者の期待に合わせようとする傾向が強いです。協調的で穏やかですが、本当の感情を抑えたり主張が弱いことがあります。",
    },
    strengths: {
      ko: ["뛰어난 협동 능력", "갈등 완화에 능숙", "타인을 배려하는 따뜻한 마음"],
      en: ["Excellent cooperation ability", "Skilled at de-escalating conflict", "Warm, considerate heart"],
      ja: ["優れた協調能力", "葛藤の緩和が得意", "他者を思いやる温かい心"],
    },
    risks: {
      ko: ["자신의 욕구를 억누르는 경향", "자기 비하나 낮은 자존감", "의존적인 관계 패턴 형성"],
      en: ["Tendency to suppress own desires", "Self-deprecation or low self-esteem", "Forming dependent relationship patterns"],
      ja: ["自分の欲求を抑える傾向", "自己卑下や低い自尊感情", "依存的な関係パターンの形成"],
    },
    advice: {
      ko: "당신의 배려심은 소중한 자산입니다. 자신의 감정과 필요를 표현하는 것이 이기적인 것이 아님을 기억하세요. 작은 것부터 의견을 말하는 연습을 시작해보세요.",
      en: "Your consideration is a precious asset. Remember that expressing your own feelings and needs is not selfish. Start practicing expressing opinions on small things.",
      ja: "あなたの思いやりは貴重な資産です。自分の感情と必要を表現することは自己中心的ではないことを覚えてください。小さなことから意見を言う練習を始めてみましょう。",
    },
    affirmation: {
      ko: "나는 나의 감정과 필요를 표현할 자격이 있습니다.",
      en: "I deserve to express my feelings and needs.",
      ja: "私は自分の感情と必要を表現する資格があります。",
    },
  },
};

const ui: Record<SupportedLocale, {
  title: string;
  subtitle: string;
  scale: string;
  progress: string;
  resultTitle: string;
  scores: string;
  strengths: string;
  risks: string;
  advice: string;
  affirmation: string;
  restart: string;
  share: string;
  copied: string;
  note: string;
}> = {
  ko: {
    title: "에고그램 자아 상태 테스트",
    subtitle: "교류분석(TA) 기반의 5가지 자아 상태를 진단합니다",
    scale: "각 항목에 얼마나 동의하시나요?",
    progress: "질문",
    resultTitle: "나의 자아 상태 프로파일",
    scores: "자아 상태별 점수",
    strengths: "강점",
    risks: "주의할 점",
    advice: "성장 조언",
    affirmation: "오늘의 확언",
    restart: "다시 테스트하기",
    share: "결과 공유",
    copied: "링크가 복사되었습니다!",
    note: "이 테스트는 Transactional Analysis(교류분석) 이론에 기반하며, 자기 이해를 위한 참고 자료입니다.",
  },
  en: {
    title: "Egogram Ego State Test",
    subtitle: "Diagnose your 5 ego states based on Transactional Analysis (TA)",
    scale: "How much do you agree with each statement?",
    progress: "Question",
    resultTitle: "My Ego State Profile",
    scores: "Ego State Scores",
    strengths: "Strengths",
    risks: "Watch out for",
    advice: "Growth Advice",
    affirmation: "Today's Affirmation",
    restart: "Retake Test",
    share: "Share Result",
    copied: "Link copied!",
    note: "This test is based on Transactional Analysis theory and is intended as a self-understanding reference.",
  },
  ja: {
    title: "エゴグラム自我状態テスト",
    subtitle: "交流分析(TA)に基づく5つの自我状態を診断します",
    scale: "各項目にどれくらい同意しますか？",
    progress: "質問",
    resultTitle: "私の自我状態プロファイル",
    scores: "自我状態別スコア",
    strengths: "強み",
    risks: "注意点",
    advice: "成長アドバイス",
    affirmation: "今日のアファメーション",
    restart: "もう一度テストする",
    share: "結果を共有",
    copied: "リンクをコピーしました！",
    note: "このテストは交流分析(TA)理論に基づいており、自己理解のための参考資料です。",
  },
};

function getProfile(scores: Record<EgoState, number>): ProfileKey {
  const max = Math.max(...EGO_STATES.map((s) => scores[s]));
  const dominants = EGO_STATES.filter((s) => scores[s] === max);
  if (dominants.length >= 3) return "balanced";
  const diff = max - Math.min(...EGO_STATES.map((s) => scores[s]));
  if (diff <= 2) return "balanced";
  return `${dominants[0]}_dominant` as ProfileKey;
}

export default function EgogramTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const t = ui[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<ProfileKey | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eg = params.get("eg") as ProfileKey | null;
    if (eg && eg in profiles) setResult(eg);
  }, []);

  function pick(score: number) {
    const next = [...answers, score];
    if (next.length < questions.length) {
      setAnswers(next);
      setTimeout(() => setIdx(next.length), 280);
    } else {
      const scores: Record<EgoState, number> = { CP: 0, NP: 0, A: 0, FC: 0, AC: 0 };
      questions.forEach((q, i) => { scores[q.state] += next[i]; });
      const profileKey = getProfile(scores);
      setAnswers(next);
      setResult(profileKey);
      const url = new URL(window.location.href);
      url.searchParams.set("eg", profileKey);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0);
    setAnswers([]);
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("eg");
    window.history.replaceState({}, "", url.toString());
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: t.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (result) {
    const p = profiles[result];
    const scores: Record<EgoState, number> = { CP: 0, NP: 0, A: 0, FC: 0, AC: 0 };
    questions.forEach((q, i) => { scores[q.state] += answers[i] ?? 0; });

    const radarData = EGO_STATES.map((s) => ({
      subject: stateInfo[s][locale].name.split("(")[0].trim(),
      value: scores[s],
      fullMark: 8,
    }));

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{t.resultTitle}</h1>
          <div className="inline-block px-4 py-2 rounded-full text-white font-semibold text-lg"
            style={{ backgroundColor: stateInfo[p.dominant][locale].color }}>
            {p.title[locale]}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">{t.scores}</h2>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <Radar name="score" dataKey="value" stroke="#6366f1"
                fill="#6366f1" fillOpacity={0.4} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-5 gap-1 mt-2">
            {EGO_STATES.map((s) => (
              <div key={s} className="text-center">
                <div className="text-xs font-semibold" style={{ color: stateInfo[s][locale].color }}>{s}</div>
                <div className="text-lg font-bold text-gray-800">{scores[s]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-gray-700 leading-relaxed">{p.description[locale]}</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✓ {t.strengths}</h3>
              <ul className="space-y-1">
                {p.strengths[locale].map((s, i) => (
                  <li key={i} className="text-sm text-green-700">• {s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">⚠ {t.risks}</h3>
              <ul className="space-y-1">
                {p.risks[locale].map((r, i) => (
                  <li key={i} className="text-sm text-red-700">• {r}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-1">💡 {t.advice}</h3>
            <p className="text-sm text-blue-700">{p.advice[locale]}</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-sm text-purple-600 italic">"{p.affirmation[locale]}"</p>
            <p className="text-xs text-purple-400 mt-1">{t.affirmation}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">{t.note}</p>

        <div className="flex gap-3 justify-center">
          <button onClick={restart}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-colors text-sm">
            {t.restart}
          </button>
          <button onClick={share}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium transition-colors text-sm">
            {copied ? t.copied : t.share}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[idx];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-sm text-gray-500">{t.subtitle}</p>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>{t.progress} {idx + 1} / {questions.length}</span>
        <div className="w-48 bg-gray-200 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 shadow-sm">
        <p className="text-base font-medium text-gray-800 leading-relaxed">{q[locale]}</p>
        <p className="text-xs text-gray-400">{t.scale}</p>
        <div className="space-y-2">
          {scaleLabels[locale].map((label, i) => (
            <button key={i} onClick={() => pick(i)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left">
              <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-gray-500">
                {i}
              </div>
              <span className="text-sm text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
