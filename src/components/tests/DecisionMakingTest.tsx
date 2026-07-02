import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type DecisionType =
  | "rational"
  | "intuitive"
  | "dependent"
  | "avoidant"
  | "spontaneous";

interface Question {
  ko: string;
  en: string;
  ja: string;
  options: {
    ko: string;
    en: string;
    ja: string;
    type: DecisionType;
  }[];
}

const questions: Question[] = [
  {
    ko: "중요한 결정을 내려야 할 때 당신은?",
    en: "When facing an important decision, you:",
    ja: "重要な決定を下す必要があるとき、あなたは？",
    options: [
      { ko: "장단점을 목록으로 작성하고 체계적으로 비교한다", en: "Make a pros/cons list and compare systematically", ja: "長所・短所をリストアップして体系的に比較する", type: "rational" },
      { ko: "직감적으로 무엇이 맞는지 느낌으로 안다", en: "Trust my gut feeling about what's right", ja: "直感的に何が正しいか感じでわかる", type: "intuitive" },
      { ko: "신뢰할 수 있는 사람들에게 의견을 구한다", en: "Seek advice from trusted people", ja: "信頼できる人々に意見を求める", type: "dependent" },
      { ko: "최대한 결정을 미루고 더 많은 정보를 모은다", en: "Postpone as long as possible and gather more information", ja: "できるだけ先延ばしにしてより多くの情報を集める", type: "avoidant" },
      { ko: "그냥 바로 느낌 가는 대로 결정한다", en: "Just decide immediately based on how I feel in the moment", ja: "その瞬間の気分でそのまま決める", type: "spontaneous" },
    ],
  },
  {
    ko: "새 직장을 제안받았습니다. 지금 직장보다 급여는 높지만 안정성이 낮습니다. 어떻게 하시겠습니까?",
    en: "You've been offered a new job — higher pay but less stability. What do you do?",
    ja: "給料は高いが安定性が低い新しい仕事を提案されました。どうしますか？",
    options: [
      { ko: "장기적 커리어 전망, 재정 계획, 시장 데이터를 분석한다", en: "Analyze long-term career prospects, financial plans, and market data", ja: "長期的キャリア展望、財務計画、市場データを分析する", type: "rational" },
      { ko: "이 제안을 받아들이는 것이 '옳다'는 느낌이 드는지 본다", en: "Check if accepting this offer 'feels right'", ja: "このオファーを受け入れることが「正しい」と感じるかどうか確認する", type: "intuitive" },
      { ko: "멘토나 가족과 깊이 이야기하고 그들의 조언을 따른다", en: "Have a deep conversation with a mentor or family and follow their advice", ja: "メンターや家族と深く話し合い、アドバイスに従う", type: "dependent" },
      { ko: "결정을 계속 미루면서 더 좋은 옵션이 나타나길 기다린다", en: "Keep delaying and wait for a better option to appear", ja: "決定をし続け、より良い選択肢が現れるのを待つ", type: "avoidant" },
      { ko: "기분이 좋을 때 바로 수락하거나 거절한다", en: "Accept or reject immediately when I'm in a good mood", ja: "気分がいいときすぐに承諾または拒否する", type: "spontaneous" },
    ],
  },
  {
    ko: "결정을 내린 후 예상치 못한 문제가 생겼습니다. 어떻게 반응하시겠습니까?",
    en: "After making a decision, unexpected problems arise. How do you react?",
    ja: "決定後、予期せぬ問題が発生しました。どう反応しますか？",
    options: [
      { ko: "문제를 분석하고 조정 계획을 만들어 체계적으로 대응한다", en: "Analyze the problem, create an adjustment plan, and respond systematically", ja: "問題を分析し、調整計画を立て、体系的に対応する", type: "rational" },
      { ko: "상황이 어떻게 전개될지 직감적으로 느끼고 그에 맞게 행동한다", en: "Intuitively sense how the situation will unfold and act accordingly", ja: "状況がどう展開するか直感的に感じ、それに合わせて行動する", type: "intuitive" },
      { ko: "주변 사람들에게 어떻게 해야 할지 물어본다", en: "Ask people around me what I should do", ja: "周りの人に何をすべきか聞く", type: "dependent" },
      { ko: "문제가 저절로 해결되기를 바라며 회피한다", en: "Avoid and hope the problem resolves itself", ja: "問題が自然に解決されることを期待して回避する", type: "avoidant" },
      { ko: "그냥 즉흥적으로 생각나는 해결책을 시도해본다", en: "Try whatever solution comes to mind spontaneously", ja: "思いついた解決策を即興で試してみる", type: "spontaneous" },
    ],
  },
  {
    ko: "오늘 저녁 무엇을 먹을지 결정할 때 당신은?",
    en: "When deciding what to eat for dinner:",
    ja: "今夜の夕食を決めるとき、あなたは？",
    options: [
      { ko: "영양, 비용, 준비 시간을 고려해 최선의 선택을 한다", en: "Consider nutrition, cost, and prep time to make the best choice", ja: "栄養、コスト、準備時間を考慮して最善の選択をする", type: "rational" },
      { ko: "무엇이 먹고 싶은지 몸의 신호를 따른다", en: "Follow my body's signals for what I crave", ja: "何が食べたいか体のシグナルに従う", type: "intuitive" },
      { ko: "동거인이나 가족이 원하는 것에 맞춘다", en: "Adjust to what my housemates or family want", ja: "同居人や家族が望むものに合わせる", type: "dependent" },
      { ko: "결정하기 귀찮아서 평소 먹던 것을 그냥 먹는다", en: "Too lazy to decide, so just eat the usual", ja: "決めるのが面倒で、いつも食べるものをそのまま食べる", type: "avoidant" },
      { ko: "냉장고를 열어보고 그때 눈에 들어오는 것을 만든다", en: "Open the fridge and cook whatever catches my eye", ja: "冷蔵庫を開けてその時目に入ったものを作る", type: "spontaneous" },
    ],
  },
  {
    ko: "당신은 결정 후 후회를 얼마나 자주 합니까?",
    en: "How often do you regret your decisions after making them?",
    ja: "決定後、どのくらいの頻度で後悔しますか？",
    options: [
      { ko: "거의 안 한다 — 충분히 분석했으므로", en: "Rarely — I've analyzed thoroughly", ja: "ほとんどしない — 十分に分析したから", type: "rational" },
      { ko: "가끔 — 직감이 틀릴 때만", en: "Sometimes — only when my gut was wrong", ja: "たまに — 直感が外れたときだけ", type: "intuitive" },
      { ko: "자주 — 타인의 조언이 잘못됐을 때 더 힘들다", en: "Often — it's harder when others' advice was wrong", ja: "よく — 他人のアドバイスが間違いだったとき特につらい", type: "dependent" },
      { ko: "매우 자주 — 어떤 선택을 해도 다른 게 더 좋았을 것 같다", en: "Very often — any choice feels like the other was better", ja: "とてもよく — どの選択をしても他の方が良かったと感じる", type: "avoidant" },
      { ko: "가끔 — 충동적으로 결정했을 때 후회한다", en: "Sometimes — I regret when I decided impulsively", ja: "たまに — 衝動的に決めたときに後悔する", type: "spontaneous" },
    ],
  },
  {
    ko: "복잡한 선택 앞에서 당신의 가장 큰 두려움은?",
    en: "When facing a complex choice, your biggest fear is:",
    ja: "複雑な選択に直面したとき、最大の恐れは？",
    options: [
      { ko: "중요한 데이터를 놓치는 것", en: "Missing important data", ja: "重要なデータを見逃すこと", type: "rational" },
      { ko: "직감을 무시하고 후회하는 것", en: "Ignoring my gut and regretting it", ja: "直感を無視して後悔すること", type: "intuitive" },
      { ko: "혼자 결정해서 잘못되는 것", en: "Deciding alone and getting it wrong", ja: "一人で決めて間違えること", type: "dependent" },
      { ko: "잘못된 선택으로 상황이 더 나빠지는 것", en: "Making the wrong choice and things getting worse", ja: "間違った選択で状況が悪化すること", type: "avoidant" },
      { ko: "너무 오래 생각하다 기회를 놓치는 것", en: "Overthinking and missing the opportunity", ja: "考えすぎてチャンスを逃すこと", type: "spontaneous" },
    ],
  },
];

const results: Record<
  DecisionType,
  {
    emoji: string;
    color: string;
    ko: { title: string; description: string; strength: string; weakness: string; tip: string };
    en: { title: string; description: string; strength: string; weakness: string; tip: string };
    ja: { title: string; description: string; strength: string; weakness: string; tip: string };
  }
> = {
  rational: {
    emoji: "🧮",
    color: "#3b82f6",
    ko: {
      title: "이성적 분석형",
      description: "당신은 결정을 내리기 전 충분한 정보를 수집하고 체계적으로 분석합니다. 감정보다 논리와 데이터를 신뢰하며, 장단점을 꼼꼼히 비교하는 스타일입니다.",
      strength: "일관성 있는 의사결정, 후회가 적음, 복잡한 문제에 강함",
      weakness: "과도한 분석 마비(Analysis Paralysis), 직관적 정보를 놓칠 수 있음, 시간이 오래 걸림",
      tip: "데이터가 완벽하지 않아도 충분할 수 있습니다. '80% 준비됐을 때 결정하기' 원칙을 적용해보세요.",
    },
    en: {
      title: "Rational Analyst",
      description: "You gather sufficient information before making decisions and analyze systematically. You trust logic and data over emotions, carefully comparing pros and cons.",
      strength: "Consistent decision-making, fewer regrets, strong with complex problems",
      weakness: "Risk of analysis paralysis, may miss intuitive information, time-consuming",
      tip: "Data doesn't need to be perfect to be sufficient. Try applying the '80% ready, then decide' principle.",
    },
    ja: {
      title: "合理的分析型",
      description: "決定を下す前に十分な情報を収集し、体系的に分析します。感情よりも論理とデータを信頼し、長所・短所を丁寧に比較するスタイルです。",
      strength: "一貫した意思決定、後悔が少ない、複雑な問題に強い",
      weakness: "過度な分析麻痺リスク、直感的情報を見逃す可能性、時間がかかる",
      tip: "データが完璧でなくても十分な場合があります。「80%準備できたら決める」原則を試してみましょう。",
    },
  },
  intuitive: {
    emoji: "✨",
    color: "#8b5cf6",
    ko: {
      title: "직관적 감지형",
      description: "당신은 축적된 경험과 패턴 인식에서 나오는 직관을 신뢰합니다. 논리적 분석보다 '느낌'이나 '감이 온다'는 신호를 중시하며, 빠르게 결정할 수 있습니다.",
      strength: "빠른 결정, 경험에서 나온 지혜 활용, 창의적 해결책",
      weakness: "직관이 편향에서 나올 수 있음, 데이터를 무시할 위험, 설명하기 어려움",
      tip: "직관을 신뢰하되, 중요한 결정은 데이터로 한 번 검증하는 습관을 가져보세요.",
    },
    en: {
      title: "Intuitive Perceiver",
      description: "You trust intuition that comes from accumulated experience and pattern recognition. You value 'gut feelings' over logical analysis and can decide quickly.",
      strength: "Quick decisions, leverages experiential wisdom, creative solutions",
      weakness: "Intuition can come from biases, risk of ignoring data, hard to explain to others",
      tip: "Trust your intuition, but for important decisions, validate with data at least once.",
    },
    ja: {
      title: "直感的知覚型",
      description: "蓄積された経験とパターン認識から生まれる直感を信頼します。論理的分析よりも「感じ」や「直感がきた」というシグナルを重視し、素早く決定できます。",
      strength: "迅速な決定、経験からの知恵の活用、創造的な解決策",
      weakness: "直感が偏見から来る可能性、データを無視するリスク、説明が難しい",
      tip: "直感を信頼しつつも、重要な決定はデータで一度検証する習慣を持ちましょう。",
    },
  },
  dependent: {
    emoji: "🤝",
    color: "#10b981",
    ko: {
      title: "의존적 협의형",
      description: "당신은 중요한 결정을 혼자 내리기보다 신뢰하는 사람들의 의견을 구합니다. 집단 지혜를 활용하고 관계 안에서 안정감을 찾는 스타일입니다.",
      strength: "다양한 관점 수집, 사회적 지지 활용, 독단적 실수 방지",
      weakness: "자율성 부족, 타인 의존 시 책임감 희석, 조언자 선택이 중요",
      tip: "타인의 조언을 '정보'로 활용하되, 최종 결정은 자신이 내리는 연습을 해보세요.",
    },
    en: {
      title: "Collaborative Consulter",
      description: "You seek input from trusted people rather than deciding alone on important matters. You leverage collective wisdom and find stability within relationships.",
      strength: "Collects diverse perspectives, leverages social support, prevents unilateral mistakes",
      weakness: "Lack of autonomy, diffused accountability when relying on others, choice of advisor matters greatly",
      tip: "Use others' advice as 'information,' but practice making the final decision yourself.",
    },
    ja: {
      title: "協調的相談型",
      description: "重要な決定を一人で下すよりも、信頼できる人々の意見を求めます。集合知を活用し、関係の中で安定感を見つけるスタイルです。",
      strength: "多様な視点の収集、社会的支援の活用、独断的なミスの防止",
      weakness: "自律性の不足、他者依存時の責任感希薄化、アドバイザー選びが重要",
      tip: "他者のアドバイスを「情報」として活用しつつ、最終決定は自分で下す練習をしましょう。",
    },
  },
  avoidant: {
    emoji: "🌀",
    color: "#f59e0b",
    ko: {
      title: "회피적 지연형",
      description: "당신은 잘못된 결정에 대한 두려움으로 결정을 최대한 미루는 경향이 있습니다. 더 많은 정보를 기다리거나, 상황이 저절로 해결되길 바라는 패턴을 보입니다.",
      strength: "충동적 결정 방지, 시간이 해결해주는 문제도 있음",
      weakness: "결정 지연으로 기회 상실, 불확실성 불안 증가, 타인에게 결정 위임",
      tip: "모든 결정에 '마감 기한'을 설정하고, 불완전한 선택도 선택임을 기억하세요.",
    },
    en: {
      title: "Avoidant Delayer",
      description: "You tend to delay decisions as long as possible out of fear of making the wrong choice. You wait for more information or hope situations resolve themselves.",
      strength: "Prevents impulsive decisions, some problems do resolve with time",
      weakness: "Lost opportunities from delays, increasing anxiety over uncertainty, delegating decisions to others",
      tip: "Set a 'deadline' for every decision, and remember that an imperfect choice is still a choice.",
    },
    ja: {
      title: "回避的遅延型",
      description: "間違った決定への恐れから、できる限り決定を先延ばしにする傾向があります。より多くの情報を待ったり、状況が自然に解決されることを期待するパターンを示します。",
      strength: "衝動的な決定の防止、時間が解決する問題もある",
      weakness: "決定遅延による機会損失、不確実性の不安増大、他者への決定委任",
      tip: "すべての決定に「締め切り」を設定し、不完全な選択も選択であることを覚えておきましょう。",
    },
  },
  spontaneous: {
    emoji: "⚡",
    color: "#ef4444",
    ko: {
      title: "즉흥적 충동형",
      description: "당신은 그 순간의 감정과 직관으로 빠르게 결정합니다. 분석보다 행동을 선호하며, 상황에 즉각 반응하는 유연성이 강점입니다.",
      strength: "빠른 행동력, 기회 포착, 심사숙고의 스트레스 없음",
      weakness: "충동적 결정으로 인한 후회, 장기적 결과 고려 부족, 감정 상태에 따라 결정 품질이 달라짐",
      tip: "중요한 결정에는 '하루 수면 후 결정하기' 규칙을 적용해보세요. 감정이 식은 후에도 같은 선택을 하시겠습니까?",
    },
    en: {
      title: "Spontaneous Impulsive",
      description: "You make quick decisions based on in-the-moment emotions and intuition. You prefer action over analysis, and your immediate responsiveness is a strength.",
      strength: "Fast action, opportunity capture, no stress from over-deliberation",
      weakness: "Regret from impulsive choices, insufficient consideration of long-term consequences, decision quality varies with emotional state",
      tip: "For important decisions, apply the 'sleep on it' rule. Would you make the same choice after your emotions have settled?",
    },
    ja: {
      title: "即興的衝動型",
      description: "その瞬間の感情と直感で素早く決定します。分析よりも行動を好み、状況への即時対応力が強みです。",
      strength: "速い行動力、機会の把握、熟考のストレスなし",
      weakness: "衝動的な決定による後悔、長期的結果の考慮不足、感情状態によって決定の質が変わる",
      tip: "重要な決定には「一晩寝てから決める」ルールを適用しましょう。感情が落ち着いた後でも同じ選択をしますか？",
    },
  },
};

const t = {
  ko: {
    title: "의사결정 스타일 테스트",
    subtitle: "나는 어떻게 결정을 내리는가?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "나의 의사결정 스타일",
    strength: "강점",
    weakness: "약점",
    tip: "성장 팁",
    scoreLabel: "유형별 점수",
    restart: "다시 하기",
    share: "결과 공유",
    copied: "복사됨!",
  },
  en: {
    title: "Decision-Making Style Test",
    subtitle: "How Do You Make Decisions?",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "Your Decision-Making Style",
    strength: "Strengths",
    weakness: "Weaknesses",
    tip: "Growth Tip",
    scoreLabel: "Score by Style",
    restart: "Restart",
    share: "Share Result",
    copied: "Copied!",
  },
  ja: {
    title: "意思決定スタイルテスト",
    subtitle: "あなたはどのように決定を下しますか？",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "あなたの意思決定スタイル",
    strength: "強み",
    weakness: "弱点",
    tip: "成長のヒント",
    scoreLabel: "スタイル別スコア",
    restart: "もう一度",
    share: "結果をシェア",
    copied: "コピーされました！",
  },
};

export default function DecisionMakingTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = t[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<DecisionType, number>>({
    rational: 0,
    intuitive: 0,
    dependent: 0,
    avoidant: 0,
    spontaneous: 0,
  });
  const [result, setResult] = useState<DecisionType | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const dm = p.get("dm") as DecisionType | null;
    if (dm && results[dm]) setResult(dm);
  }, []);

  function pick(type: DecisionType) {
    const next = { ...scores, [type]: scores[type] + 1 };
    const answeredCount = Object.values(next).reduce((a, b) => a + b, 0);

    if (answeredCount < questions.length) {
      setScores(next);
      setTimeout(() => setIdx(answeredCount), 280);
    } else {
      setScores(next);
      const winner = (Object.keys(next) as DecisionType[]).reduce((a, b) =>
        next[a] >= next[b] ? a : b
      );
      setResult(winner);
      const url = new URL(window.location.href);
      url.searchParams.set("dm", winner);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0);
    setScores({ rational: 0, intuitive: 0, dependent: 0, avoidant: 0, spontaneous: 0 });
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("dm");
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

  const typeLabels: Record<DecisionType, string> = {
    rational: locale === "ko" ? "이성형" : locale === "ja" ? "合理型" : "Rational",
    intuitive: locale === "ko" ? "직관형" : locale === "ja" ? "直感型" : "Intuitive",
    dependent: locale === "ko" ? "협의형" : locale === "ja" ? "相談型" : "Collaborative",
    avoidant: locale === "ko" ? "회피형" : locale === "ja" ? "回避型" : "Avoidant",
    spontaneous: locale === "ko" ? "즉흥형" : locale === "ja" ? "即興型" : "Spontaneous",
  };

  if (result) {
    const r = results[result];
    const rd = r[locale];
    const chartData = (Object.keys(scores) as DecisionType[]).map((k) => ({
      name: typeLabels[k],
      value: scores[k],
      fill: results[k].color,
      fillOpacity: k === result ? 1 : 0.45,
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 p-6 text-center">
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
          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-700">💡 {tx.tip}</h3>
            <p className="mt-1 text-sm text-blue-800">{rd.tip}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-700">{tx.scoreLabel}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 16 }}>
              <XAxis type="number" domain={[0, questions.length]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={60} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
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
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
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
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
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
              onClick={() => pick(opt.type)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              {opt[locale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
