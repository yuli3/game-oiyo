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

type CommStyle = "assertive" | "aggressive" | "passive" | "passive_aggressive" | "analytical";

interface Question {
  ko: string;
  en: string;
  ja: string;
  options: {
    ko: string;
    en: string;
    ja: string;
    scores: Partial<Record<CommStyle, number>>;
  }[];
}

const questions: Question[] = [
  {
    ko: "회의에서 당신의 의견이 무시당했습니다. 어떻게 반응하십니까?",
    en: "Your idea was ignored in a meeting. How do you respond?",
    ja: "会議であなたの意見が無視されました。どう反応しますか？",
    options: [
      { ko: "직접적으로 '제 의견도 고려해주셨으면 합니다'라고 말한다", en: "Directly say 'I'd appreciate if my idea was considered'", ja: "直接的に「私の意見も考慮してほしい」と言う", scores: { assertive: 2 } },
      { ko: "목소리를 높이거나 강하게 주장해 관심을 끈다", en: "Raise my voice or push strongly to get attention", ja: "声を大きくするか強く主張して注目を集める", scores: { aggressive: 2 } },
      { ko: "그냥 넘어가고 다음 기회를 기다린다", en: "Let it go and wait for the next chance", ja: "そのまま流して次の機会を待つ", scores: { passive: 2 } },
      { ko: "겉으론 괜찮은 척하지만 나중에 협력을 줄인다", en: "Appear fine but reduce cooperation later", ja: "表面上は平気なふりをするが後で協力を減らす", scores: { passive_aggressive: 2 } },
      { ko: "왜 무시당했는지 데이터와 논리로 분석한다", en: "Analyze logically why the idea was overlooked", ja: "なぜ無視されたかをデータと論理で分析する", scores: { analytical: 2 } },
    ],
  },
  {
    ko: "친구가 약속 시간에 30분 늦었습니다. 당신은?",
    en: "A friend is 30 minutes late. What do you do?",
    ja: "友人が約束の時間に30分遅刻しました。あなたは？",
    options: [
      { ko: "'늦으면 미리 알려줬으면 좋겠어'라고 솔직히 말한다", en: "Honestly say 'I'd like a heads-up when you're running late'", ja: "「遅れるなら事前に知らせてほしい」と正直に伝える", scores: { assertive: 2 } },
      { ko: "짜증난 티를 내며 잔소리한다", en: "Show irritation and lecture them", ja: "イライラを見せて小言を言う", scores: { aggressive: 2 } },
      { ko: "괜찮다고 하면서 속으로 삭인다", en: "Say it's fine while suppressing feelings inside", ja: "大丈夫と言いながら心の中で我慢する", scores: { passive: 2 } },
      { ko: "말은 안 하지만 다음번엔 일부러 늦거나 자리를 피한다", en: "Say nothing but purposely arrive late or avoid them next time", ja: "何も言わないが次回は意図的に遅れたり避けたりする", scores: { passive_aggressive: 2 } },
      { ko: "교통 상황 등 맥락을 파악하고 패턴인지 확인한다", en: "Check the context (traffic etc.) and assess whether it's a pattern", ja: "交通状況などの文脈を把握し、パターンかどうか確認する", scores: { analytical: 2 } },
    ],
  },
  {
    ko: "상대방이 당신과 다른 의견을 강하게 주장할 때 당신은?",
    en: "Someone strongly asserts an opinion different from yours. You:",
    ja: "相手があなたとは異なる意見を強く主張するとき、あなたは？",
    options: [
      { ko: "상대 의견을 인정하면서도 내 시각을 명확하게 제시한다", en: "Acknowledge their view while clearly presenting your own", ja: "相手の意見を認めつつ、自分の視点を明確に示す", scores: { assertive: 2 } },
      { ko: "내 의견이 옳다고 더 강하게 밀어붙인다", en: "Push my opinion harder, asserting I'm right", ja: "自分の意見が正しいとより強く押し進める", scores: { aggressive: 2 } },
      { ko: "갈등을 피하려 상대 의견에 동의해버린다", en: "Agree with them to avoid conflict", ja: "争いを避けるため相手の意見に同意してしまう", scores: { passive: 2 } },
      { ko: "겉으로는 동의하지만 뒤에서 다른 행동을 한다", en: "Agree on the surface but act differently behind the scenes", ja: "表面上は同意するが裏では異なる行動をとる", scores: { passive_aggressive: 2 } },
      { ko: "근거를 요청하고 객관적으로 어느 쪽이 옳은지 따진다", en: "Ask for evidence and objectively determine who is correct", ja: "根拠を求め、客観的にどちらが正しいか議論する", scores: { analytical: 2 } },
    ],
  },
  {
    ko: "중요한 이메일을 쓸 때 당신의 스타일은?",
    en: "When writing an important email, your style is:",
    ja: "重要なメールを書くとき、あなたのスタイルは？",
    options: [
      { ko: "명확하고 직접적으로, 원하는 것을 구체적으로 쓴다", en: "Clear and direct, specifically stating what you want", ja: "明確で直接的に、望むことを具体的に書く", scores: { assertive: 2 } },
      { ko: "강경한 어조로 빠른 대응을 요구한다", en: "Use a firm tone demanding quick response", ja: "強硬なトーンで迅速な対応を求める", scores: { aggressive: 2 } },
      { ko: "정중하게 부탁하면서 불편을 드려 죄송하다고 한다", en: "Politely ask while apologizing for any inconvenience", ja: "丁寧にお願いしながらご不便をおかけして申し訳ないと言う", scores: { passive: 2 } },
      { ko: "표면적으론 협력적이지만 애매한 표현을 써서 책임을 회피한다", en: "Appear cooperative but use vague language to avoid accountability", ja: "表面上は協力的だが曖昧な表現を使って責任を回避する", scores: { passive_aggressive: 2 } },
      { ko: "배경 설명, 데이터, 결론 순서로 체계적으로 작성한다", en: "Write systematically: background, data, conclusion", ja: "背景説明、データ、結論の順で体系的に書く", scores: { analytical: 2 } },
    ],
  },
  {
    ko: "팀원이 계속 같은 실수를 반복합니다. 당신은?",
    en: "A teammate keeps making the same mistake. You:",
    ja: "チームメンバーが同じミスを繰り返しています。あなたは？",
    options: [
      { ko: "조용히 불러서 '이 부분이 계속 문제가 되고 있어요'라고 말한다", en: "Call them aside and say 'this keeps becoming an issue'", ja: "こっそり呼んで「この部分が繰り返し問題になっています」と伝える", scores: { assertive: 2 } },
      { ko: "회의에서 공개적으로 지적하거나 강하게 비판한다", en: "Publicly point it out in a meeting or criticize strongly", ja: "会議で公に指摘するか強く批判する", scores: { aggressive: 2 } },
      { ko: "내가 대신 처리하거나 그냥 참는다", en: "Handle it myself or just put up with it", ja: "自分が代わりにやったり、ただ我慢する", scores: { passive: 2 } },
      { ko: "그 사람이 관련된 프로젝트 참여를 은근히 줄인다", en: "Subtly reduce their involvement in related projects", ja: "その人が関わるプロジェクトへの参加をひそかに減らす", scores: { passive_aggressive: 2 } },
      { ko: "실수의 원인을 분석하고 개선 프로세스를 제안한다", en: "Analyze the root cause and propose an improvement process", ja: "ミスの原因を分析し、改善プロセスを提案する", scores: { analytical: 2 } },
    ],
  },
  {
    ko: "상대방이 당신에게 불합리한 부탁을 했습니다. 당신은?",
    en: "Someone makes an unreasonable request of you. You:",
    ja: "相手があなたに不合理なお願いをしました。あなたは？",
    options: [
      { ko: "명확하게 '그건 어렵습니다'라고 거절하면서 이유를 설명한다", en: "Clearly refuse: 'That's difficult,' and explain why", ja: "明確に「それは難しいです」と断りつつ理由を説明する", scores: { assertive: 2 } },
      { ko: "화를 내거나 상대를 비난한다", en: "Get angry or blame them", ja: "怒ったり相手を非難する", scores: { aggressive: 2 } },
      { ko: "내키지 않아도 수락한다", en: "Accept even though I don't want to", ja: "気が進まなくても受け入れる", scores: { passive: 2 } },
      { ko: "수락하는 척하고 제대로 이행하지 않는다", en: "Pretend to accept but don't follow through", ja: "受け入れるふりをして適切に実行しない", scores: { passive_aggressive: 2 } },
      { ko: "해당 부탁이 왜 불합리한지 논리적으로 분석하고 설명한다", en: "Logically analyze and explain why the request is unreasonable", ja: "なぜ不合理かを論理的に分析して説明する", scores: { analytical: 2 } },
    ],
  },
  {
    ko: "당신의 소통 방식에서 가장 중요하게 여기는 것은?",
    en: "What do you value most in your communication style?",
    ja: "あなたのコミュニケーションスタイルで最も重要視することは？",
    options: [
      { ko: "나도 존중받고 상대도 존중하는 상호성", en: "Mutual respect — both myself and the other person", ja: "自分も相手も尊重する相互性", scores: { assertive: 2 } },
      { ko: "내 의견을 분명하게 관철시키는 것", en: "Getting my point across clearly and firmly", ja: "自分の意見をはっきりと通すこと", scores: { aggressive: 2 } },
      { ko: "관계의 조화와 갈등 최소화", en: "Harmony in relationships and minimizing conflict", ja: "関係の調和と対立の最小化", scores: { passive: 2 } },
      { ko: "겉으론 모르게 내가 원하는 방향으로 유도하기", en: "Guiding things my way without others knowing", ja: "表面上わからないように自分が望む方向に誘導すること", scores: { passive_aggressive: 2 } },
      { ko: "정확한 정보 전달과 논리적 설득", en: "Accurate information delivery and logical persuasion", ja: "正確な情報伝達と論理的説得", scores: { analytical: 2 } },
    ],
  },
];

const results: Record<
  CommStyle,
  {
    emoji: string;
    color: string;
    ko: { title: string; description: string; strength: string; weakness: string; tip: string };
    en: { title: string; description: string; strength: string; weakness: string; tip: string };
    ja: { title: string; description: string; strength: string; weakness: string; tip: string };
  }
> = {
  assertive: {
    emoji: "🤝",
    color: "#10b981",
    ko: {
      title: "주장형 (Assertive)",
      description: "당신은 자신의 생각과 감정을 명확하게 표현하면서도 상대방을 존중합니다. 나 전달법(I-message)을 자연스럽게 사용하고, 갈등을 회피하지 않으면서도 공격적이지 않습니다. 이것이 가장 건강한 소통 방식입니다.",
      strength: "상호 존중, 신뢰 형성, 명확한 경계 설정, 갈등의 건설적 해결",
      weakness: "때로는 너무 직접적으로 느껴져 상대방이 당황할 수 있음",
      tip: "이미 훌륭한 소통 방식을 갖추고 있습니다. 상대방의 소통 스타일에 맞춰 유연하게 조정하는 법을 연습해보세요.",
    },
    en: {
      title: "Assertive",
      description: "You express your thoughts and feelings clearly while respecting others. You naturally use I-messages, neither avoiding conflict nor being aggressive. This is the healthiest communication style.",
      strength: "Mutual respect, trust-building, clear boundary-setting, constructive conflict resolution",
      weakness: "Sometimes can feel too direct, which may catch others off guard",
      tip: "You already have an excellent communication style. Practice adapting flexibly to others' communication styles.",
    },
    ja: {
      title: "主張型（アサーティブ）",
      description: "相手を尊重しながら自分の考えや感情を明確に表現します。Iメッセージを自然に使い、対立を避けることなく攻撃的でもありません。これが最も健全なコミュニケーション方法です。",
      strength: "相互尊重、信頼構築、明確な境界設定、建設的な対立解決",
      weakness: "時に直接的すぎると感じられ、相手を戸惑わせることがある",
      tip: "すでに優れたコミュニケーションスタイルを持っています。相手のコミュニケーションスタイルに合わせて柔軟に調整する方法を練習しましょう。",
    },
  },
  aggressive: {
    emoji: "🔥",
    color: "#ef4444",
    ko: {
      title: "공격형 (Aggressive)",
      description: "당신은 자신의 의견을 강하게 표현하고 원하는 것을 얻어내는 데 능숙하지만, 때로는 상대방이 위협받거나 무시당한다고 느낄 수 있습니다. 단기적으로 목표를 달성할 수 있지만 장기적 관계에 영향을 줄 수 있습니다.",
      strength: "강한 자기주장, 목표 달성력, 리더십 잠재력",
      weakness: "관계 손상, 상대방의 방어적 반응 유발, 협력 저해",
      tip: "'이기기'가 목표가 아니라 '문제 해결'이 목표임을 기억하세요. 상대방의 관점을 먼저 인정하는 연습이 도움이 됩니다.",
    },
    en: {
      title: "Aggressive",
      description: "You're skilled at expressing your opinions forcefully and getting what you want, but others may sometimes feel threatened or dismissed. You can achieve goals short-term, but it may affect long-term relationships.",
      strength: "Strong self-assertion, goal achievement, leadership potential",
      weakness: "Relationship damage, triggering others' defensiveness, hindering cooperation",
      tip: "Remember the goal is 'problem solving,' not 'winning.' Practicing acknowledging the other person's perspective first can help.",
    },
    ja: {
      title: "攻撃型（アグレッシブ）",
      description: "自分の意見を強く表現し、欲しいものを得ることが得意ですが、相手が脅かされたり無視されたりと感じることがあります。短期的に目標を達成できますが、長期的な関係に影響を与える可能性があります。",
      strength: "強い自己主張、目標達成力、リーダーシップの潜在力",
      weakness: "関係の損傷、相手の防御的反応の誘発、協力の阻害",
      tip: "「勝つこと」ではなく「問題解決」が目標であることを覚えておきましょう。相手の視点をまず認める練習が役立ちます。",
    },
  },
  passive: {
    emoji: "🌸",
    color: "#a78bfa",
    ko: {
      title: "수동형 (Passive)",
      description: "당신은 갈등을 피하고 관계의 조화를 중시합니다. 상대방의 필요를 자신보다 앞세우는 경향이 있으며, 속마음을 잘 드러내지 않습니다. 좋은 사람으로 여겨지지만 내면에 불만이 쌓일 수 있습니다.",
      strength: "공감 능력, 협력적 분위기 조성, 타인 배려",
      weakness: "자기 권리 포기, 내면 불만 축적, 결국 관계 피로",
      tip: "'노'라고 말하는 것은 이기적인 것이 아닙니다. '저는 ~할 때 불편합니다'처럼 감정을 표현하는 작은 연습부터 시작하세요.",
    },
    en: {
      title: "Passive",
      description: "You prioritize avoiding conflict and maintaining relational harmony. You tend to put others' needs before your own and rarely reveal your true feelings. Others see you as kind, but resentment may build inside.",
      strength: "Empathy, creating a cooperative atmosphere, consideration for others",
      weakness: "Surrendering your rights, accumulating internal resentment, eventual relationship fatigue",
      tip: "Saying 'no' isn't selfish. Start with small practice: expressing feelings like 'I feel uncomfortable when...'",
    },
    ja: {
      title: "受動型（パッシブ）",
      description: "対立を避け、関係の調和を重視します。相手のニーズを自分より優先させる傾向があり、本音を表に出しにくいです。良い人と見られますが、内面に不満が蓄積する可能性があります。",
      strength: "共感能力、協力的な雰囲気の醸成、他者への配慮",
      weakness: "自分の権利の放棄、内面の不満の蓄積、最終的な関係疲労",
      tip: "「ノー」と言うことは利己的ではありません。「私は〜のとき不快に感じます」のように感情を表現する小さな練習から始めましょう。",
    },
  },
  passive_aggressive: {
    emoji: "🌫️",
    color: "#f59e0b",
    ko: {
      title: "수동공격형 (Passive-Aggressive)",
      description: "당신은 직접적인 갈등을 피하면서도 불만을 간접적으로 표현합니다. 비꼬기, 지각, 말은 Yes 행동은 No 같은 패턴을 보일 수 있습니다. 이 방식은 관계에서 만성적인 긴장을 만들 수 있습니다.",
      strength: "공개적 갈등 회피, 감정 보호",
      weakness: "신뢰 손상, 관계의 만성적 긴장, 자신도 불만족스러운 상태",
      tip: "안전하다고 느끼는 환경에서 직접 표현해보세요. '화가 나지 않아'가 아니라 '~할 때 화가 났어'처럼 직접적으로 말하는 연습이 필요합니다.",
    },
    en: {
      title: "Passive-Aggressive",
      description: "You avoid direct conflict while expressing dissatisfaction indirectly. Patterns may include sarcasm, lateness, or saying 'yes' while doing 'no.' This style can create chronic tension in relationships.",
      strength: "Avoiding open conflict, protecting yourself emotionally",
      weakness: "Damaged trust, chronic relationship tension, personal dissatisfaction",
      tip: "Practice expressing directly in environments where you feel safe. Practice saying 'I got angry when...' instead of 'I'm not angry.'",
    },
    ja: {
      title: "受動攻撃型（パッシブアグレッシブ）",
      description: "直接的な対立を避けながら、不満を間接的に表現します。嫌味、遅刻、「はい」と言いながら「いいえ」の行動をするなどのパターンが見られます。このスタイルは関係に慢性的な緊張を生み出す可能性があります。",
      strength: "公開的な対立の回避、感情的自己保護",
      weakness: "信頼の損傷、関係の慢性的緊張、自己不満",
      tip: "安全だと感じる環境で直接表現してみましょう。「怒っていない」ではなく「〜したとき怒った」のように直接的に言う練習が必要です。",
    },
  },
  analytical: {
    emoji: "🔬",
    color: "#3b82f6",
    ko: {
      title: "분석형 (Analytical)",
      description: "당신은 데이터와 논리에 기반한 소통을 선호합니다. 감정보다 사실과 근거를 중시하며, 체계적이고 정확한 전달을 추구합니다. 문제 해결에 탁월하지만 감정적 연결이 부족하게 느껴질 수 있습니다.",
      strength: "명확한 논리, 오해 방지, 문제 해결 능력, 신뢰성",
      weakness: "감정적 연결 부족, 냉정하게 보일 수 있음, 인간적인 면이 가려질 수 있음",
      tip: "분석 앞에 감정 인정을 추가해보세요. '그것은 불합리합니다' 전에 '그 상황이 답답하셨겠네요'처럼 공감을 먼저 표현하면 훨씬 효과적입니다.",
    },
    en: {
      title: "Analytical",
      description: "You prefer communication based on data and logic. You value facts and evidence over emotions, pursuing systematic and accurate delivery. You're excellent at problem-solving but may come across as lacking emotional connection.",
      strength: "Clear logic, preventing misunderstandings, problem-solving ability, reliability",
      weakness: "Lack of emotional connection, can appear cold, human side may be hidden",
      tip: "Add emotional acknowledgment before analysis. Expressing empathy first — 'That must have been frustrating' before 'That's illogical' — is much more effective.",
    },
    ja: {
      title: "分析型（アナリティカル）",
      description: "データと論理に基づいたコミュニケーションを好みます。感情より事実と根拠を重視し、体系的で正確な伝達を追求します。問題解決に優れていますが、感情的なつながりが欠けていると感じられることがあります。",
      strength: "明確な論理、誤解の防止、問題解決能力、信頼性",
      weakness: "感情的なつながりの欠如、冷たく見える可能性、人間的な面が隠れる可能性",
      tip: "分析の前に感情的な承認を追加しましょう。「それは不合理です」の前に「その状況はもどかしかったですね」のように共感を先に表現するとはるかに効果的です。",
    },
  },
};

const t = {
  ko: {
    title: "소통 스타일 테스트",
    subtitle: "당신은 어떻게 소통하십니까?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "나의 소통 스타일",
    strength: "강점",
    weakness: "약점",
    tip: "성장 팁",
    scoreLabel: "스타일별 점수",
    restart: "다시 하기",
    share: "결과 공유",
    copied: "복사됨!",
  },
  en: {
    title: "Communication Style Test",
    subtitle: "How Do You Communicate?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "Your Communication Style",
    strength: "Strengths",
    weakness: "Weaknesses",
    tip: "Growth Tip",
    scoreLabel: "Score by Style",
    restart: "Restart",
    share: "Share Result",
    copied: "Copied!",
  },
  ja: {
    title: "コミュニケーションスタイルテスト",
    subtitle: "あなたはどのようにコミュニケーションをとりますか？",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "あなたのコミュニケーションスタイル",
    strength: "強み",
    weakness: "弱点",
    tip: "成長のヒント",
    scoreLabel: "スタイル別スコア",
    restart: "もう一度",
    share: "結果をシェア",
    copied: "コピーされました！",
  },
};

export default function CommunicationStyleTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = t[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<CommStyle, number>>({
    assertive: 0,
    aggressive: 0,
    passive: 0,
    passive_aggressive: 0,
    analytical: 0,
  });
  const [result, setResult] = useState<CommStyle | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const cs = p.get("cs") as CommStyle | null;
    if (cs && results[cs]) setResult(cs);
  }, []);



  function finalize(s: Record<CommStyle, number>) {
    setScores(s);
    const winner = (Object.keys(s) as CommStyle[]).reduce((a, b) => s[a] >= s[b] ? a : b);
    setResult(winner);
    const url = new URL(window.location.href);
    url.searchParams.set("cs", winner);
    window.history.replaceState({}, "", url.toString());
  }

  function handlePick(opt: Question["options"][number]) {
    const next = { ...scores };
    for (const [k, v] of Object.entries(opt.scores)) {
      next[k as CommStyle] = (next[k as CommStyle] ?? 0) + (v ?? 0);
    }
    const newIdx = idx + 1;
    if (newIdx < questions.length) {
      setScores(next);
      setTimeout(() => setIdx(newIdx), 280);
    } else {
      finalize(next);
    }
  }

  function restart() {
    setIdx(0);
    setScores({ assertive: 0, aggressive: 0, passive: 0, passive_aggressive: 0, analytical: 0 });
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("cs");
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

  const styleLabels: Record<CommStyle, string> = {
    assertive: locale === "ko" ? "주장형" : locale === "ja" ? "主張型" : "Assertive",
    aggressive: locale === "ko" ? "공격형" : locale === "ja" ? "攻撃型" : "Aggressive",
    passive: locale === "ko" ? "수동형" : locale === "ja" ? "受動型" : "Passive",
    passive_aggressive: locale === "ko" ? "수동공격형" : locale === "ja" ? "受動攻撃型" : "Passive-Agg.",
    analytical: locale === "ko" ? "분석형" : locale === "ja" ? "分析型" : "Analytical",
  };

  if (result) {
    const r = results[result];
    const rd = r[locale];
    const radarData = (Object.keys(scores) as CommStyle[]).map((k) => ({
      subject: styleLabels[k],
      score: scores[k],
      fullMark: questions.length,
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-blue-50 p-6 text-center">
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
          <div className="rounded-lg bg-teal-50 p-4">
            <h3 className="font-semibold text-teal-700">💡 {tx.tip}</h3>
            <p className="mt-1 text-sm text-teal-800">{rd.tip}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-700">{tx.scoreLabel}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <Radar
                dataKey="score"
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
            className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-medium text-white transition hover:bg-teal-700"
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
            className="h-full rounded-full bg-teal-500 transition-all duration-300"
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
              onClick={() => handlePick(opt)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-teal-300 hover:bg-teal-50"
            >
              {opt[locale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
