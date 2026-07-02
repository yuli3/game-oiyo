import { useState, useEffect } from "react";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type OptimismLevel = "high_optimism" | "moderate_optimism" | "realistic" | "moderate_pessimism" | "high_pessimism";

interface Question {
  ko: string;
  en: string;
  ja: string;
  reverse?: boolean;
}

// Scheier & Carver LOT-R inspired (6 scored + 4 filler → simplified to 10 scored)
const questions: Question[] = [
  { ko: "불확실한 상황에서도 나는 보통 최선을 기대한다", en: "In uncertain times, I usually expect the best", ja: "不確かな状況でも、私はたいてい最善を期待する" },
  { ko: "일이 내 방식대로 되지 않으면, 나는 쉽게 체념한다", en: "If things don't go my way, I give up easily", ja: "物事が思い通りにならないと、簡単に諦めてしまう", reverse: true },
  { ko: "나는 항상 나의 미래에 대해 낙관적이다", en: "I'm always optimistic about my future", ja: "私は自分の将来について常に楽観的だ" },
  { ko: "나는 내게 좋은 일이 일어날 것이라고 거의 기대하지 않는다", en: "I hardly ever expect good things to happen to me", ja: "私に良いことが起こるとはほとんど期待しない", reverse: true },
  { ko: "전반적으로 나는 나쁜 일보다 좋은 일이 더 많이 일어날 것을 기대한다", en: "Overall, I expect more good things to happen than bad", ja: "全体的に、悪いことより良いことの方が多く起こると期待している" },
  { ko: "나는 내게 잘못될 것들이 많다고 예상하는 편이다", en: "I expect a lot of things to go wrong for me", ja: "私には多くのことがうまくいかないと予想する方だ", reverse: true },
  { ko: "힘든 상황에서도 나는 보통 긍정적인 면을 찾는다", en: "Even in difficult situations, I usually find the positive side", ja: "辛い状況でも、私はたいてい良い面を見つける" },
  { ko: "새로운 도전을 시작할 때, 나는 실패할 것 같다는 생각이 자주 든다", en: "When starting a new challenge, I often think I'll fail", ja: "新しい挑戦を始めるとき、失敗しそうだという気持ちがよく生じる", reverse: true },
  { ko: "문제가 생기면 나는 해결될 것이라고 생각한다", en: "When problems arise, I believe they will be resolved", ja: "問題が生じたとき、解決されると思う" },
  { ko: "나는 대체로 일이 잘못될 것을 걱정하며 산다", en: "I generally live with worry that things will go wrong", ja: "私は一般的に物事がうまくいかないことを心配して生活している", reverse: true },
];

const LEVELS: Record<OptimismLevel, {
  emoji: string;
  color: string;
  scoreRange: string;
  ko: { title: string; description: string; strength: string; watch: string; tip: string };
  en: { title: string; description: string; strength: string; watch: string; tip: string };
  ja: { title: string; description: string; strength: string; watch: string; tip: string };
}> = {
  high_optimism: {
    emoji: "☀️",
    color: "#f59e0b",
    scoreRange: "38–40",
    ko: {
      title: "강한 낙관주의자",
      description: "당신은 미래에 대해 매우 긍정적인 기대를 가지고 있습니다. 어려움 속에서도 희망을 잃지 않고 긍정적인 면을 찾습니다. 연구에 따르면 낙관주의는 심리적 회복력, 신체 건강, 수명과 양의 상관관계가 있습니다.",
      strength: "회복력, 끈기, 정신·신체 건강, 강한 동기",
      watch: "지나친 낙관이 현실적 위험을 과소평가하게 할 수 있음. '긍정적 환상'이 준비를 소홀히 하게 만들 수 있음",
      tip: "낙관주의를 유지하면서도 '방어적 비관주의(defensive pessimism)'를 가끔 활용해보세요. 최악의 시나리오를 미리 생각하는 것이 실제로는 더 나은 결과를 만들기도 합니다.",
    },
    en: {
      title: "Strong Optimist",
      description: "You have very positive expectations for the future. You don't lose hope in difficult times and always find the bright side. Research shows optimism is positively correlated with psychological resilience, physical health, and longevity.",
      strength: "Resilience, persistence, mental and physical health, strong motivation",
      watch: "Excessive optimism can underestimate real risks; 'positive illusions' can lead to insufficient preparation",
      tip: "While maintaining optimism, occasionally practice 'defensive pessimism' — thinking through worst-case scenarios can actually lead to better outcomes.",
    },
    ja: {
      title: "強い楽観主義者",
      description: "将来に対してとても肯定的な期待を持っています。困難な中でも希望を失わず、良い面を見つけます。研究によれば、楽観主義は心理的回復力、身体的健康、寿命と正の相関があります。",
      strength: "回復力、粘り強さ、心身の健康、強いモチベーション",
      watch: "過度な楽観が現実的なリスクを過小評価させる可能性がある。「ポジティブな幻想」が準備不足を招くことがある",
      tip: "楽観主義を維持しながら、時折「防御的悲観主義（defensive pessimism）」を活用しましょう。最悪のシナリオを事前に考えることが実際にはより良い結果をもたらすこともあります。",
    },
  },
  moderate_optimism: {
    emoji: "🌤️",
    color: "#10b981",
    scoreRange: "30–37",
    ko: {
      title: "온건한 낙관주의자",
      description: "당신은 전반적으로 미래를 긍정적으로 바라보지만, 현실적인 시각도 갖추고 있습니다. 이것이 가장 적응적인 낙관주의 수준입니다. 희망을 잃지 않으면서도 현실적인 계획을 세울 수 있습니다.",
      strength: "균형 잡힌 기대, 현실적 계획, 심리적 유연성",
      watch: "특별한 주의 사항 없음 — 이 균형을 잘 유지하세요",
      tip: "이 균형이 매우 귀중합니다. 어려운 시기에도 이 균형을 의식적으로 유지하는 연습을 해보세요.",
    },
    en: {
      title: "Moderate Optimist",
      description: "You generally view the future positively while maintaining a realistic perspective. This is the most adaptive level of optimism — you can make realistic plans without losing hope.",
      strength: "Balanced expectations, realistic planning, psychological flexibility",
      watch: "No special concerns — maintain this balance well",
      tip: "This balance is very valuable. Consciously practice maintaining it even during difficult times.",
    },
    ja: {
      title: "穏やかな楽観主義者",
      description: "全体的に将来を肯定的に見ながら、現実的な視点も持っています。これが最も適応的な楽観主義のレベルです。希望を失わずに現実的な計画を立てることができます。",
      strength: "バランスの取れた期待、現実的な計画、心理的柔軟性",
      watch: "特別な注意事項なし — このバランスをうまく維持してください",
      tip: "このバランスは非常に貴重です。困難な時期にもこのバランスを意識的に維持する練習をしましょう。",
    },
  },
  realistic: {
    emoji: "⚖️",
    color: "#6b7280",
    scoreRange: "22–29",
    ko: {
      title: "현실주의자",
      description: "당신은 과도한 낙관이나 비관 없이 현실적으로 상황을 평가합니다. 증거와 현실에 기반한 기대를 가지고 있으며, 좋은 것도 나쁜 것도 있을 수 있다는 균형적 시각을 가집니다.",
      strength: "정확한 상황 평가, 현실적 계획, 실망 리스크 낮음",
      watch: "희망적 사고가 가져다주는 동기와 회복력의 이점을 놓칠 수 있음",
      tip: "현실주의적 사고는 귀중하지만, 의도적으로 '최선의 경우'를 더 자주 상상하는 연습도 가치 있습니다. 낙관주의는 습관으로 만들 수 있습니다.",
    },
    en: {
      title: "Realist",
      description: "You assess situations realistically without excessive optimism or pessimism. You have evidence-based expectations and hold a balanced perspective that acknowledges both good and bad possibilities.",
      strength: "Accurate situation assessment, realistic planning, low disappointment risk",
      watch: "May miss the motivational and resilience benefits of hopeful thinking",
      tip: "Realistic thinking is valuable, but intentionally imagining 'best case' scenarios more often is also worthwhile. Optimism can be cultivated as a habit.",
    },
    ja: {
      title: "現実主義者",
      description: "過度な楽観も悲観もなく、現実的に状況を評価します。証拠と現実に基づいた期待を持ち、良いことも悪いこともあり得るというバランスの取れた視点を持っています。",
      strength: "正確な状況評価、現実的な計画、失望リスクが低い",
      watch: "希望的思考がもたらす動機づけと回復力の恩恵を見逃す可能性がある",
      tip: "現実主義的思考は貴重ですが、意図的に「最善のケース」をより頻繁にイメージする練習も価値があります。楽観主義は習慣として培うことができます。",
    },
  },
  moderate_pessimism: {
    emoji: "🌧️",
    color: "#8b5cf6",
    scoreRange: "14–21",
    ko: {
      title: "온건한 비관주의자",
      description: "당신은 미래에 대한 기대가 다소 낮고, 일이 잘못될 가능성에 더 집중하는 경향이 있습니다. 이것은 때로 방어적 비관주의로 기능하여 더 잘 준비하게 만들 수 있지만, 만성화되면 불안과 동기 저하로 이어질 수 있습니다.",
      strength: "철저한 준비, 위험 관리, 현실적 기대",
      watch: "만성적 비관이 우울감, 낮은 자기 효능감으로 이어질 수 있음",
      tip: "마틴 셀리그만의 낙관주의 학습(Learned Optimism) 기법을 시도해보세요: 나쁜 일을 일시적('지금은')·특정적('이 상황에서')·외부적('이 원인 때문에')으로 설명하는 연습이 도움됩니다.",
    },
    en: {
      title: "Moderate Pessimist",
      description: "You have somewhat low expectations for the future and tend to focus more on the possibility of things going wrong. This can sometimes function as defensive pessimism for better preparation, but if chronic, can lead to anxiety and decreased motivation.",
      strength: "Thorough preparation, risk management, realistic expectations",
      watch: "Chronic pessimism can lead to depression and low self-efficacy",
      tip: "Try Martin Seligman's Learned Optimism technique: explaining bad events as temporary ('for now'), specific ('in this situation'), and external ('because of this cause').",
    },
    ja: {
      title: "穏やかな悲観主義者",
      description: "将来に対する期待がやや低く、物事がうまくいかない可能性により集中する傾向があります。これは時に防御的悲観主義として機能してより良い準備をさせることもありますが、慢性化すると不安や動機の低下につながることがあります。",
      strength: "徹底的な準備、リスク管理、現実的な期待",
      watch: "慢性的な悲観がうつ感と低い自己効力感につながる可能性がある",
      tip: "マーティン・セリグマンの楽観主義の学習（Learned Optimism）技法を試してみましょう：悪いことを一時的（「今は」）・特定的（「この状況では」）・外部的（「この原因のため」）に説明する練習が役立ちます。",
    },
  },
  high_pessimism: {
    emoji: "🌪️",
    color: "#ef4444",
    scoreRange: "10–13",
    ko: {
      title: "강한 비관주의자",
      description: "현재 미래에 대한 기대가 매우 낮고 부정적인 결과를 강하게 예상하는 경향이 있습니다. 이것은 단순한 성격 특성이 아니라 변화 가능한 사고 패턴입니다.",
      strength: "위험 인식, 방어적 준비",
      watch: "우울, 불안, 낮은 삶의 질, 만성 스트레스와 연관될 수 있음",
      tip: "인지행동치료(CBT)의 인지 재구성이나 마틴 셀리그만의 낙관주의 학습이 효과적으로 도움을 줄 수 있습니다. 전문가의 도움도 고려해보세요.",
    },
    en: {
      title: "Strong Pessimist",
      description: "You currently have very low expectations for the future and strongly anticipate negative outcomes. This is not merely a personality trait — it's a changeable thought pattern.",
      strength: "Risk awareness, defensive preparation",
      watch: "May be associated with depression, anxiety, low quality of life, chronic stress",
      tip: "Cognitive restructuring from CBT or Martin Seligman's Learned Optimism can help effectively. Also consider seeking professional support.",
    },
    ja: {
      title: "強い悲観主義者",
      description: "現在、将来への期待が非常に低く、否定的な結果を強く予想する傾向があります。これは単なる性格特性ではなく、変化可能な思考パターンです。",
      strength: "リスク認識、防御的準備",
      watch: "うつ、不安、低い生活の質、慢性的なストレスと関連する可能性がある",
      tip: "認知行動療法（CBT）の認知再構成やマーティン・セリグマンの楽観主義の学習が効果的に役立ちます。専門家の支援も検討してみましょう。",
    },
  },
};

const t = {
  ko: {
    title: "낙관주의-비관주의 검사",
    subtitle: "당신은 미래를 어떻게 바라보는가?",
    instruction: "각 문장이 자신에게 얼마나 해당하는지 선택해주세요",
    a1: "전혀 아님", a2: "거의 아님", a3: "보통", a4: "자주 그럼", a5: "항상 그럼",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "낙관-비관 성향 결과",
    yourScore: "점수",
    strength: "강점",
    watch: "주의 사항",
    tip: "성장 팁",
    restart: "다시 하기",
    share: "결과 공유",
    copied: "복사됨!",
  },
  en: {
    title: "Optimism-Pessimism Test",
    subtitle: "How Do You View the Future?",
    instruction: "Choose how much each statement applies to you",
    a1: "Not at all", a2: "Rarely", a3: "Sometimes", a4: "Often", a5: "Always",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "Optimism-Pessimism Result",
    yourScore: "Score",
    strength: "Strengths",
    watch: "Watch Out For",
    tip: "Growth Tip",
    restart: "Restart",
    share: "Share Result",
    copied: "Copied!",
  },
  ja: {
    title: "楽観主義-悲観主義テスト",
    subtitle: "あなたは将来をどう見ていますか？",
    instruction: "各文章がどれくらい自分に当てはまるか選んでください",
    a1: "まったく違う", a2: "ほとんど違う", a3: "どちらでもない", a4: "よくそうだ", a5: "いつもそうだ",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "楽観-悲観傾向の結果",
    yourScore: "スコア",
    strength: "強み",
    watch: "注意事項",
    tip: "成長のヒント",
    restart: "もう一度",
    share: "結果をシェア",
    copied: "コピーされました！",
  },
};

function getLevel(score: number): OptimismLevel {
  if (score >= 38) return "high_optimism";
  if (score >= 30) return "moderate_optimism";
  if (score >= 22) return "realistic";
  if (score >= 14) return "moderate_pessimism";
  return "high_pessimism";
}

export default function OptimismTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = t[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ level: OptimismLevel; score: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const op = p.get("op") as OptimismLevel | null;
    const os = p.get("os");
    if (op && os && LEVELS[op]) setResult({ level: op, score: parseInt(os, 10) });
  }, []);

  function pick(rawScore: number) {
    const q = questions[idx];
    const score = q.reverse ? 6 - rawScore : rawScore;
    const next = [...answers, score];

    if (next.length < questions.length) {
      setAnswers(next);
      setTimeout(() => setIdx(next.length), 280);
    } else {
      const total = next.reduce((a, b) => a + b, 0);
      const level = getLevel(total);
      setResult({ level, score: total });
      const url = new URL(window.location.href);
      url.searchParams.set("op", level);
      url.searchParams.set("os", String(total));
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0); setAnswers([]); setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("op"); url.searchParams.delete("os");
    window.history.replaceState({}, "", url.toString());
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) { await navigator.share({ title: tx.title, url }); }
    else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  const scoreOpts = [
    { label: tx.a1, value: 1 }, { label: tx.a2, value: 2 }, { label: tx.a3, value: 3 },
    { label: tx.a4, value: 4 }, { label: tx.a5, value: 5 },
  ] as const;

  const maxScore = questions.length * 5;

  if (result) {
    const lv = LEVELS[result.level];
    const ld = lv[locale];
    const pct = Math.round((result.score / maxScore) * 100);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 text-center" style={{ background: `${lv.color}12`, border: `1px solid ${lv.color}40` }}>
          <p className="mb-1 text-sm font-medium text-gray-500">{tx.resultTitle}</p>
          <div className="mb-2 text-5xl">{lv.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{ld.title}</h2>
          <p className="mt-2 text-sm text-gray-500">{tx.yourScore}: {result.score} / {maxScore}</p>
          <div className="mx-auto mt-4 max-w-xs">
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: lv.color }} />
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>{locale === "ko" ? "비관" : locale === "ja" ? "悲観" : "Pessimism"}</span>
              <span>{locale === "ko" ? "낙관" : locale === "ja" ? "楽観" : "Optimism"}</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-700 leading-relaxed">{ld.description}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-green-700">✅ {tx.strength}</h3>
            <p className="mt-1 text-sm text-gray-600">{ld.strength}</p>
          </div>
          <div>
            <h3 className="font-semibold text-orange-600">⚠️ {tx.watch}</h3>
            <p className="mt-1 text-sm text-gray-600">{ld.watch}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: `${lv.color}10` }}>
            <h3 className="font-semibold" style={{ color: lv.color }}>💡 {tx.tip}</h3>
            <p className="mt-1 text-sm text-gray-700">{ld.tip}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={restart} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50">{tx.restart}</button>
          <button onClick={share} className="flex-1 rounded-xl py-3 text-sm font-medium text-white transition" style={{ backgroundColor: lv.color }}>{copied ? tx.copied : tx.share}</button>
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
        <p className="mt-2 text-xs text-gray-400">{tx.instruction}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-amber-400 transition-all duration-300" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm text-gray-500">{tx.progress(idx + 1, questions.length)}</span>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-6 text-center text-lg font-medium text-gray-800">{q[locale]}</p>
        <div className="grid grid-cols-5 gap-2">
          {scoreOpts.map((opt) => (
            <button key={opt.value} onClick={() => pick(opt.value)}
              className="rounded-xl border border-gray-200 px-2 py-3 text-center text-xs font-medium text-gray-700 transition hover:border-amber-300 hover:bg-amber-50">
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
