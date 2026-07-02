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

type RegStrategy =
  | "reappraisal"
  | "suppression"
  | "acceptance"
  | "rumination"
  | "problem_solving";

interface Question {
  ko: string;
  en: string;
  ja: string;
  options: {
    ko: string;
    en: string;
    ja: string;
    type: RegStrategy;
  }[];
}

const questions: Question[] = [
  {
    ko: "스트레스를 받는 상황에서 감정이 밀려올 때 당신은?",
    en: "When emotions surge in a stressful situation, you:",
    ja: "ストレスを受ける状況で感情が押し寄せてくるとき、あなたは？",
    options: [
      { ko: "상황을 다른 관점으로 보려고 의식적으로 노력한다", en: "Consciously try to see the situation from a different perspective", ja: "状況を別の視点から見ようと意識的に努力する", type: "reappraisal" },
      { ko: "감정이 드러나지 않도록 조용히 억누른다", en: "Quietly suppress so emotions don't show", ja: "感情が表れないよう静かに抑える", type: "suppression" },
      { ko: "감정이 있는 그대로 있도록 내버려두고 판단하지 않는다", en: "Let the emotion be as it is without judgment", ja: "感情があるがままにあるよう置いておき、判断しない", type: "acceptance" },
      { ko: "왜 이런 감정이 생겼는지 계속 생각하고 분석한다", en: "Keep thinking and analyzing why this emotion arose", ja: "なぜこんな感情が生じたかを考え続けて分析する", type: "rumination" },
      { ko: "감정의 원인이 된 문제를 직접 해결하려 한다", en: "Directly try to solve the problem that caused the emotion", ja: "感情の原因となった問題を直接解決しようとする", type: "problem_solving" },
    ],
  },
  {
    ko: "직장에서 상사에게 부당한 대우를 받았을 때 당신은?",
    en: "When treated unfairly by a superior at work, you:",
    ja: "職場で上司から不当な扱いを受けたとき、あなたは？",
    options: [
      { ko: "'이것은 나를 배우게 하는 상황이다'라고 생각을 전환한다", en: "Shift thinking: 'This situation is teaching me something'", ja: "「これは自分を学ばせる状況だ」と考えを転換する", type: "reappraisal" },
      { ko: "화가 나지만 내색하지 않고 표정을 유지한다", en: "Feel angry but maintain composure without showing it", ja: "怒りを感じるが、内に秘めて表情を維持する", type: "suppression" },
      { ko: "불편한 감정을 인정하고 그것이 지나가기를 기다린다", en: "Acknowledge the uncomfortable feeling and wait for it to pass", ja: "不快な感情を認め、それが過ぎ去るのを待つ", type: "acceptance" },
      { ko: "집에 돌아와서도 그 상황을 계속 머릿속에서 되새긴다", en: "Keep replaying the situation in my head even after getting home", ja: "家に帰ってもその状況を頭の中で繰り返し思い返す", type: "rumination" },
      { ko: "상황을 개선하기 위해 직접 대화를 요청하거나 행동을 취한다", en: "Request a direct conversation or take action to improve the situation", ja: "状況を改善するために直接対話を求めるか行動を取る", type: "problem_solving" },
    ],
  },
  {
    ko: "중요한 발표나 시험 전에 긴장이 밀려올 때 당신은?",
    en: "When nervousness surges before an important presentation or exam, you:",
    ja: "重要な発表や試験の前に緊張が押し寄せてくるとき、あなたは？",
    options: [
      { ko: "'이 긴장이 나를 더 잘 준비시켜주고 있다'고 재해석한다", en: "Reinterpret: 'This nervousness is preparing me better'", ja: "「この緊張が自分をより良く準備させてくれている」と再解釈する", type: "reappraisal" },
      { ko: "불안해 보이지 않으려고 태연한 척한다", en: "Pretend to be calm so I don't appear anxious", ja: "不安に見えないように平静を装う", type: "suppression" },
      { ko: "긴장감을 있는 그대로 인정하고 함께 간다", en: "Acknowledge the nervousness as it is and carry it with me", ja: "緊張感をあるがままに認め、それと一緒に進む", type: "acceptance" },
      { ko: "만약 실패하면 어떻게 될지 시나리오를 계속 돌린다", en: "Keep running through scenarios of what will happen if I fail", ja: "もし失敗したらどうなるかのシナリオを回し続ける", type: "rumination" },
      { ko: "충분히 준비함으로써 긴장의 원인을 줄인다", en: "Reduce the source of nervousness by preparing sufficiently", ja: "十分に準備することで緊張の原因を減らす", type: "problem_solving" },
    ],
  },
  {
    ko: "친한 친구와 심각한 다툼이 생겼을 때 당신은?",
    en: "After a serious argument with a close friend, you:",
    ja: "親しい友人と深刻な言い争いになったとき、あなたは？",
    options: [
      { ko: "'이 갈등이 우리 관계를 더 깊게 해줄 수 있다'고 생각한다", en: "Think: 'This conflict can deepen our relationship'", ja: "「この対立が私たちの関係をより深めてくれる可能性がある」と思う", type: "reappraisal" },
      { ko: "상처받았지만 상대방에게 그것을 드러내지 않는다", en: "Feel hurt but don't reveal it to the other person", ja: "傷ついても相手にそれを見せない", type: "suppression" },
      { ko: "화나고 슬픈 감정을 인정하고 그 감정과 함께 있는다", en: "Acknowledge the anger and sadness and sit with those feelings", ja: "怒りと悲しみの感情を認め、その感情とともにいる", type: "acceptance" },
      { ko: "무슨 말을 잘못했는지 계속 반추하며 후회한다", en: "Continuously ruminate and regret what I said wrong", ja: "何を言い間違えたかを反芻し続けて後悔する", type: "rumination" },
      { ko: "냉각 기간 후 대화를 통해 해결점을 찾는다", en: "Seek resolution through conversation after a cooling-off period", ja: "冷却期間後に対話を通じて解決点を探す", type: "problem_solving" },
    ],
  },
  {
    ko: "감정을 조절하는 데 가장 도움이 되는 것은 무엇인가요?",
    en: "What helps you regulate emotions most?",
    ja: "感情を調節するのに最も役立つのは何ですか？",
    options: [
      { ko: "같은 상황을 더 긍정적이거나 중립적으로 보는 방법 찾기", en: "Finding a more positive or neutral way to see the same situation", ja: "同じ状況をより肯定的または中立的に見る方法を探す", type: "reappraisal" },
      { ko: "겉으로 차분하게 보이도록 자기 조절 연습", en: "Practicing self-control to appear calm outwardly", ja: "外見上落ち着いて見えるように自己制御を練習する", type: "suppression" },
      { ko: "감정을 판단 없이 관찰하는 마음챙김 명상", en: "Mindfulness meditation to observe emotions without judgment", ja: "感情を判断なく観察するマインドフルネス瞑想", type: "acceptance" },
      { ko: "이 감정의 원인을 깊이 이해하고 분석하는 것", en: "Deeply understanding and analyzing the cause of this emotion", ja: "この感情の原因を深く理解・分析すること", type: "rumination" },
      { ko: "감정의 원인이 된 문제를 실제로 해결하는 것", en: "Actually solving the problem that caused the emotion", ja: "感情の原因となった問題を実際に解決すること", type: "problem_solving" },
    ],
  },
];

const results: Record<RegStrategy, {
  emoji: string;
  color: string;
  effectiveness: string;
  ko: { title: string; description: string; pro: string; con: string; tip: string };
  en: { title: string; description: string; pro: string; con: string; tip: string };
  ja: { title: string; description: string; pro: string; con: string; tip: string };
}> = {
  reappraisal: {
    emoji: "🔄",
    color: "#10b981",
    effectiveness: "높음",
    ko: {
      title: "인지 재평가형",
      description: "당신은 상황이나 사건을 다른 관점으로 재해석하여 감정을 조절합니다. 제임스 그로스(James Gross)의 감정 조절 연구에서 가장 효과적인 전략 중 하나로 검증된 방식입니다.",
      pro: "장기적 심리 건강에 매우 유익, 관계에 미치는 부정적 영향 최소, 인지 자원 소모 적음",
      con: "모든 상황에서 재평가가 쉽지 않을 수 있음, 극한 상황에서는 먼저 안정화 필요",
      tip: "재평가는 즉각 가능하지 않을 때도 있습니다. '나중에 돌아봤을 때 이것이 어떤 의미일까?'라고 시간 여유를 두고 질문하는 것도 좋은 방법입니다.",
    },
    en: {
      title: "Cognitive Reappraisal",
      description: "You regulate emotions by reinterpreting situations or events from a different perspective. This is one of the most effective strategies validated in James Gross's emotion regulation research.",
      pro: "Very beneficial for long-term psychological health, minimal negative impact on relationships, low cognitive resource consumption",
      con: "Reappraisal isn't always easy in every situation; stabilization needed first in extreme situations",
      tip: "Reappraisal isn't always immediately possible. Asking 'What meaning will this have when I look back later?' with some time distance is also effective.",
    },
    ja: {
      title: "認知的再評価型",
      description: "状況や出来事を別の視点から再解釈することで感情を調節します。ジェームズ・グロス（James Gross）の感情調節研究で最も効果的な戦略の一つとして検証された方法です。",
      pro: "長期的な心理的健康に非常に有益、関係への悪影響が最小、認知資源の消費が少ない",
      con: "すべての状況で再評価が容易でない場合がある、極限状況では先に安定化が必要",
      tip: "再評価は常にすぐにできるわけではありません。「後で振り返ったとき、これはどんな意味があるか？」と時間を置いて質問するのも良い方法です。",
    },
  },
  suppression: {
    emoji: "🎭",
    color: "#f59e0b",
    effectiveness: "중간",
    ko: {
      title: "표현 억제형",
      description: "당신은 감정을 느끼지만 표현을 조절하여 드러내지 않습니다. 단기적으로는 사회적 상황을 관리하는 데 도움이 될 수 있지만, 장기적으로는 내면의 긴장을 높일 수 있습니다.",
      pro: "사회적 상황 관리, 단기적 갈등 예방",
      con: "내면의 스트레스 증가, 친밀한 관계에서 연결감 저하, 장기적 심리 건강에 부정적",
      tip: "억제 대신 '언제 표현할지 선택'하는 전략으로 전환해보세요. 감정을 억누르는 것이 아니라, 적절한 시간과 장소를 선택하는 것입니다.",
    },
    en: {
      title: "Expressive Suppression",
      description: "You feel emotions but regulate their expression without showing them. While this can help manage social situations short-term, it can increase internal tension long-term.",
      pro: "Social situation management, short-term conflict prevention",
      con: "Increased internal stress, decreased sense of connection in intimate relationships, negative long-term psychological health",
      tip: "Shift from suppression to 'choosing when to express.' It's not about suppressing emotions, but choosing the right time and place.",
    },
    ja: {
      title: "表現抑制型",
      description: "感情を感じますが、表現を調節して表に出しません。短期的には社会的状況の管理に役立つことがありますが、長期的には内面の緊張を高める可能性があります。",
      pro: "社会的状況の管理、短期的な対立の予防",
      con: "内面のストレス増加、親密な関係での繋がり感の低下、長期的な心理的健康への悪影響",
      tip: "抑制の代わりに「いつ表現するかを選ぶ」戦略に切り替えましょう。感情を抑え込むのではなく、適切な時間と場所を選ぶことです。",
    },
  },
  acceptance: {
    emoji: "🌊",
    color: "#3b82f6",
    effectiveness: "높음",
    ko: {
      title: "수용과 마음챙김형",
      description: "당신은 감정을 변화시키거나 억누르려 하지 않고, 있는 그대로 인정하고 관찰합니다. 수용전념치료(ACT)와 마음챙김 기반 인지치료(MBCT)의 핵심 원리를 자연스럽게 활용합니다.",
      pro: "심리적 유연성, 만성 우울·불안에 효과적, 자기 수용 강화",
      con: "즉각적인 행동이 필요한 상황에서는 충분하지 않을 수 있음",
      tip: "수용이 체념이나 무관심이 아님을 기억하세요. '감정을 느끼면서도 내 가치관에 맞는 행동을 선택할 수 있다'는 것이 수용의 핵심입니다.",
    },
    en: {
      title: "Acceptance & Mindfulness",
      description: "Rather than changing or suppressing emotions, you acknowledge and observe them as they are. You naturally apply the core principles of Acceptance and Commitment Therapy (ACT) and Mindfulness-Based Cognitive Therapy (MBCT).",
      pro: "Psychological flexibility, effective for chronic depression/anxiety, reinforces self-acceptance",
      con: "May not be sufficient in situations requiring immediate action",
      tip: "Remember that acceptance is not resignation or indifference. The core of acceptance is: 'I can feel emotions while still choosing actions aligned with my values.'",
    },
    ja: {
      title: "受容とマインドフルネス型",
      description: "感情を変えようとしたり抑えようとするのではなく、あるがままに認め観察します。受容専念療法（ACT）とマインドフルネス認知療法（MBCT）の核心原理を自然に活用します。",
      pro: "心理的柔軟性、慢性的なうつ・不安に効果的、自己受容の強化",
      con: "即時の行動が必要な状況では不十分な場合がある",
      tip: "受容が諦めや無関心ではないことを覚えておきましょう。「感情を感じながらも自分の価値観に合った行動を選べる」ことが受容の核心です。",
    },
  },
  rumination: {
    emoji: "🌀",
    color: "#6b7280",
    effectiveness: "낮음",
    ko: {
      title: "반추적 사고형",
      description: "당신은 감정이 생기면 그 원인과 의미를 반복적으로 생각하는 경향이 있습니다. 의도는 이해하는 것이지만, 반추는 불안과 우울을 심화시키는 패턴으로 알려져 있습니다.",
      pro: "문제의 깊은 이해를 원함, 같은 실수를 반복하지 않으려는 의도",
      con: "우울과 불안 심화, 해결 없는 반복적 사고, 현재 순간에서 멀어짐",
      tip: "반추를 알아챘을 때 '이 생각이 나를 해결책으로 이끌고 있는가, 아니면 반복되고 있는가?'를 묻고, 반복된다면 활동(산책, 대화)으로 전환하세요.",
    },
    en: {
      title: "Ruminative Thinking",
      description: "When emotions arise, you tend to repeatedly think about their causes and meaning. While the intention is to understand, rumination is known as a pattern that deepens anxiety and depression.",
      pro: "Seeking deep understanding of problems, intention to avoid repeating mistakes",
      con: "Deepens depression and anxiety, repetitive thinking without resolution, distancing from the present moment",
      tip: "When you notice rumination, ask: 'Is this thought leading me to a solution, or is it just repeating?' If repeating, shift to an activity (walking, conversation).",
    },
    ja: {
      title: "反芻的思考型",
      description: "感情が生じると、その原因と意味を繰り返し考える傾向があります。意図は理解することですが、反芻は不安とうつを深めるパターンとして知られています。",
      pro: "問題の深い理解を求める、同じ失敗を繰り返さないようにしたい意図",
      con: "うつと不安の深化、解決のない反復的思考、現在の瞬間から離れる",
      tip: "反芻に気づいたとき、「この考えは自分を解決策に導いているか、それとも繰り返しているか？」と問い、繰り返しているなら活動（散歩、会話）に切り替えましょう。",
    },
  },
  problem_solving: {
    emoji: "🔧",
    color: "#8b5cf6",
    effectiveness: "높음 (통제 가능 시)",
    ko: {
      title: "문제 해결형",
      description: "당신은 감정의 원인인 문제를 직접 해결함으로써 감정을 조절합니다. 상황이 변화 가능하고 통제 가능할 때 매우 효과적이며, 자기 효능감을 높여줍니다.",
      pro: "실질적 문제 해결, 높은 자기 효능감, 재발 방지",
      con: "통제 불가능한 상황에서 좌절감 증가, 감정 자체를 처리하는 것을 소홀히 할 수 있음",
      tip: "먼저 자신에게 '이것이 내가 변화시킬 수 있는 것인가?'를 물어보세요. 변화 가능하면 행동하고, 불가능하면 수용이나 재평가 전략을 사용하세요.",
    },
    en: {
      title: "Problem-Solving",
      description: "You regulate emotions by directly solving the problem that's causing them. Very effective when situations are changeable and controllable, and boosts self-efficacy.",
      pro: "Practical problem resolution, high self-efficacy, recurrence prevention",
      con: "Increased frustration in uncontrollable situations; may neglect processing emotions themselves",
      tip: "First ask yourself: 'Is this something I can change?' If changeable, act. If not, use acceptance or reappraisal strategies.",
    },
    ja: {
      title: "問題解決型",
      description: "感情の原因となっている問題を直接解決することで感情を調節します。状況が変化可能でコントロール可能なとき非常に効果的で、自己効力感を高めます。",
      pro: "実質的な問題解決、高い自己効力感、再発防止",
      con: "コントロール不可能な状況での挫折感の増加；感情自体の処理を疎かにする可能性",
      tip: "まず自分に「これは自分が変えられるものか？」と問いましょう。変えられるなら行動し、変えられないなら受容や再評価の戦略を使いましょう。",
    },
  },
};

const t = {
  ko: {
    title: "감정 조절 방식 테스트",
    subtitle: "나는 어떻게 감정을 다루는가?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "나의 감정 조절 스타일",
    pro: "장점",
    con: "단점",
    tip: "성장 팁",
    scoreLabel: "전략별 점수",
    restart: "다시 하기",
    share: "결과 공유",
    copied: "복사됨!",
  },
  en: {
    title: "Emotion Regulation Test",
    subtitle: "How Do You Handle Your Emotions?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "Your Emotion Regulation Style",
    pro: "Pros",
    con: "Cons",
    tip: "Growth Tip",
    scoreLabel: "Score by Strategy",
    restart: "Restart",
    share: "Share Result",
    copied: "Copied!",
  },
  ja: {
    title: "感情調節スタイルテスト",
    subtitle: "あなたはどのように感情を扱いますか？",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "あなたの感情調節スタイル",
    pro: "長所",
    con: "短所",
    tip: "成長のヒント",
    scoreLabel: "戦略別スコア",
    restart: "もう一度",
    share: "結果をシェア",
    copied: "コピーされました！",
  },
};

export default function EmotionRegulationTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = t[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<RegStrategy, number>>({ reappraisal: 0, suppression: 0, acceptance: 0, rumination: 0, problem_solving: 0 });
  const [result, setResult] = useState<RegStrategy | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const er = p.get("er") as RegStrategy | null;
    if (er && results[er]) setResult(er);
  }, []);

  function pick(type: RegStrategy) {
    const next = { ...scores, [type]: scores[type] + 1 };
    const answeredCount = Object.values(next).reduce((a, b) => a + b, 0);
    if (answeredCount < questions.length) {
      setScores(next);
      setTimeout(() => setIdx(answeredCount), 280);
    } else {
      setScores(next);
      const winner = (Object.keys(next) as RegStrategy[]).reduce((a, b) => next[a] >= next[b] ? a : b);
      setResult(winner);
      const url = new URL(window.location.href);
      url.searchParams.set("er", winner);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0); setScores({ reappraisal: 0, suppression: 0, acceptance: 0, rumination: 0, problem_solving: 0 }); setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("er");
    window.history.replaceState({}, "", url.toString());
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) { await navigator.share({ title: tx.title, url }); }
    else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  const typeLabels: Record<RegStrategy, string> = {
    reappraisal: locale === "ko" ? "재평가" : locale === "ja" ? "再評価" : "Reappraisal",
    suppression: locale === "ko" ? "억제" : locale === "ja" ? "抑制" : "Suppression",
    acceptance: locale === "ko" ? "수용" : locale === "ja" ? "受容" : "Acceptance",
    rumination: locale === "ko" ? "반추" : locale === "ja" ? "反芻" : "Rumination",
    problem_solving: locale === "ko" ? "문제해결" : locale === "ja" ? "問題解決" : "Problem-Solving",
  };

  if (result) {
    const r = results[result];
    const rd = r[locale];
    const radarData = (Object.keys(scores) as RegStrategy[]).map((k) => ({
      subject: typeLabels[k],
      score: scores[k],
      fullMark: questions.length,
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 text-center" style={{ background: `${r.color}12`, border: `1px solid ${r.color}40` }}>
          <p className="mb-1 text-sm font-medium text-gray-500">{tx.resultTitle}</p>
          <div className="mb-2 text-5xl">{r.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{rd.title}</h2>
          <p className="mt-3 text-gray-600">{rd.description}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-green-700">✅ {tx.pro}</h3>
            <p className="mt-1 text-sm text-gray-600">{rd.pro}</p>
          </div>
          <div>
            <h3 className="font-semibold text-orange-600">⚠️ {tx.con}</h3>
            <p className="mt-1 text-sm text-gray-600">{rd.con}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: `${r.color}10` }}>
            <h3 className="font-semibold" style={{ color: r.color }}>💡 {tx.tip}</h3>
            <p className="mt-1 text-sm text-gray-700">{rd.tip}</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-700">{tx.scoreLabel}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <Radar dataKey="score" stroke={r.color} fill={r.color} fillOpacity={0.3} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-3">
          <button onClick={restart} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50">{tx.restart}</button>
          <button onClick={share} className="flex-1 rounded-xl py-3 text-sm font-medium text-white transition" style={{ backgroundColor: r.color }}>{copied ? tx.copied : tx.share}</button>
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
          <div className="h-full rounded-full bg-green-500 transition-all duration-300" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm text-gray-500">{tx.progress(idx + 1, questions.length)}</span>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-5 text-center text-lg font-medium text-gray-800">{q[locale]}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => pick(opt.type)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-green-300 hover:bg-green-50">
              {opt[locale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
