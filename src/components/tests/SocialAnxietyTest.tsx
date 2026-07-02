import { useState, useEffect } from "react";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type AnxietyLevel = "minimal" | "mild" | "moderate" | "severe";

interface Question {
  ko: string;
  en: string;
  ja: string;
}

const questions: Question[] = [
  { ko: "낯선 사람들이 많은 모임에 가는 것이 두렵다", en: "I feel afraid of attending gatherings with many strangers", ja: "見知らぬ人が多い集まりに行くことが怖い" },
  { ko: "다른 사람들 앞에서 말하거나 발표할 때 극도로 긴장한다", en: "I get extremely nervous speaking or presenting in front of others", ja: "人前で話したり発表したりするとき極度に緊張する" },
  { ko: "사람들이 나를 판단하거나 비판할까봐 걱정된다", en: "I worry that people will judge or criticize me", ja: "人が私を判断したり批判したりすることを心配する" },
  { ko: "새로운 사람을 만날 때 어색함이나 불안을 느낀다", en: "I feel awkward or anxious when meeting new people", ja: "新しい人に会うとき、ぎこちなさや不安を感じる" },
  { ko: "내가 무언가 창피한 행동을 할까봐 두렵다", en: "I fear I'll do something embarrassing", ja: "恥ずかしいことをしてしまうのではないかと怖い" },
  { ko: "파티나 사교 모임을 피하는 경향이 있다", en: "I tend to avoid parties or social gatherings", ja: "パーティーや社交的な集まりを避ける傾向がある" },
  { ko: "전화통화보다 문자나 이메일을 훨씬 선호한다", en: "I strongly prefer texting or email over phone calls", ja: "電話よりもテキストやメールをはるかに好む" },
  { ko: "식당에서 주문하거나 점원과 말하는 것이 불편하다", en: "I feel uncomfortable ordering at a restaurant or talking to staff", ja: "レストランで注文したり店員と話したりするのが不快だ" },
  { ko: "사람들이 있는 곳에서 식사하거나 글씨 쓰는 것이 불편하다", en: "I feel uncomfortable eating or writing with people watching", ja: "人がいる場所で食事したり字を書いたりするのが不快だ" },
  { ko: "사회적 상황에서 홍조, 떨림, 발한 등 신체 증상이 나타난다", en: "I experience physical symptoms (blushing, trembling, sweating) in social situations", ja: "社会的状況で紅潮、震え、発汗などの身体症状が現れる" },
  { ko: "대화 중 무슨 말을 해야 할지 몰라 침묵이 두렵다", en: "I fear silences in conversation because I don't know what to say", ja: "会話中に何を言えばいいかわからず、沈黙が怖い" },
  { ko: "사교적 상황 전에 미리 걱정하거나 뒤에 반추하는 경향이 있다", en: "I tend to worry beforehand and ruminate after social situations", ja: "社会的状況の前に心配し、後に反芻する傾向がある" },
];

const LEVELS: Record<AnxietyLevel, {
  emoji: string;
  color: string;
  scoreRange: string;
  ko: { title: string; description: string; impact: string; action: string };
  en: { title: string; description: string; impact: string; action: string };
  ja: { title: string; description: string; impact: string; action: string };
}> = {
  minimal: {
    emoji: "😌",
    color: "#10b981",
    scoreRange: "0–12",
    ko: {
      title: "최소 수준 (거의 없음)",
      description: "사회적 상황에서 불안감이 거의 없습니다. 새로운 사람을 만나거나 공개 발언을 하는 데 큰 어려움을 느끼지 않습니다.",
      impact: "사교 활동에 큰 제약이 없으며, 사회적 관계를 비교적 자유롭게 맺을 수 있습니다.",
      action: "현재 상태를 유지하면서 마음챙김 연습을 통해 사회적 편안함을 더욱 발전시킬 수 있습니다.",
    },
    en: {
      title: "Minimal (Little to None)",
      description: "You experience little anxiety in social situations. Meeting new people or public speaking presents no significant difficulty.",
      impact: "No major restrictions on social activities; you can form social relationships relatively freely.",
      action: "Maintain current state and consider mindfulness practices to further develop social comfort.",
    },
    ja: {
      title: "最小（ほとんどなし）",
      description: "社会的状況でほとんど不安を感じません。新しい人に会ったり、人前で話したりすることに大きな困難を感じません。",
      impact: "社交活動に大きな制約はなく、比較的自由に社会的関係を築けます。",
      action: "現状を維持しながら、マインドフルネスの練習で社会的快適さをさらに発展させましょう。",
    },
  },
  mild: {
    emoji: "😐",
    color: "#f59e0b",
    scoreRange: "13–24",
    ko: {
      title: "경미한 수준",
      description: "사회적 상황에서 가끔 불안이나 불편함을 느끼지만, 일상생활에 큰 지장은 없습니다. 특정 상황(발표, 첫 만남 등)에서 더 강하게 느껴질 수 있습니다.",
      impact: "일부 사회적 상황을 피하거나 불편함을 느낄 수 있지만, 기능적으로는 잘 대처할 수 있습니다.",
      action: "점진적 노출 연습(불안한 상황에 조금씩 익숙해지기), 사회 기술 향상, 자기 자신을 더 친절하게 대하는 자기 연민이 도움됩니다.",
    },
    en: {
      title: "Mild Level",
      description: "You occasionally feel anxiety or discomfort in social situations, but it doesn't significantly interfere with daily life. It may feel stronger in specific situations (presentations, first meetings, etc.).",
      impact: "You may avoid some social situations or feel discomfort, but you can cope functionally.",
      action: "Gradual exposure practice (slowly becoming comfortable with anxiety-inducing situations), social skills improvement, and self-compassion help.",
    },
    ja: {
      title: "軽度のレベル",
      description: "社会的状況でときどき不安や不快感を感じますが、日常生活に大きな支障はありません。特定の状況（発表、初対面など）でより強く感じることがあります。",
      impact: "一部の社会的状況を避けたり不快感を感じることがありますが、機能的には対処できます。",
      action: "段階的な曝露練習（不安な状況に少しずつ慣れること）、社会的スキルの向上、自己への思いやりが役立ちます。",
    },
  },
  moderate: {
    emoji: "😟",
    color: "#f97316",
    scoreRange: "25–36",
    ko: {
      title: "중간 수준",
      description: "사회적 불안이 일상생활에 눈에 띄는 영향을 미치고 있습니다. 많은 사회적 상황을 피하거나 극도의 불편함을 느끼며, 이로 인해 기회를 놓치거나 관계 형성에 어려움을 겪을 수 있습니다.",
      impact: "경력, 친구 관계, 로맨틱 관계, 일상적인 활동 등 여러 영역에서 제약을 경험할 수 있습니다.",
      action: "인지행동치료(CBT)나 노출 치료가 높은 효과를 보입니다. 전문 상담사와의 상담을 고려해보시기 바랍니다.",
    },
    en: {
      title: "Moderate Level",
      description: "Social anxiety is having a noticeable impact on your daily life. You may avoid many social situations or feel extreme discomfort, leading to missed opportunities and difficulties forming relationships.",
      impact: "You may experience restrictions in multiple areas: career, friendships, romantic relationships, and everyday activities.",
      action: "Cognitive-behavioral therapy (CBT) or exposure therapy shows high effectiveness. Consider consulting a professional counselor.",
    },
    ja: {
      title: "中程度のレベル",
      description: "社会不安が日常生活に目に見える影響を与えています。多くの社会的状況を避けたり極度の不快感を感じ、機会を逃したり関係構築に困難を感じることがあります。",
      impact: "キャリア、友人関係、ロマンティックな関係、日常活動など複数の領域で制約を経験する可能性があります。",
      action: "認知行動療法（CBT）や曝露療法が高い効果を示します。専門のカウンセラーへの相談を検討してください。",
    },
  },
  severe: {
    emoji: "😰",
    color: "#ef4444",
    scoreRange: "37–48",
    ko: {
      title: "심각한 수준",
      description: "사회적 불안이 일상생활에 심각한 영향을 미치고 있습니다. 많은 상황을 극도로 회피하거나 큰 고통을 경험하고 있을 수 있습니다.",
      impact: "사회적 고립, 경력 제한, 우울감 증가 등 전반적인 삶의 질에 영향을 미칠 수 있습니다.",
      action: "전문 심리치료사의 도움이 강력히 권장됩니다. CBT, 노출 반응 방지(ERP), 경우에 따라 약물치료가 효과적입니다. 한국 심리상담 위기 지원: 자살예방상담전화 1393",
    },
    en: {
      title: "Severe Level",
      description: "Social anxiety is significantly impacting your daily life. You may be experiencing extreme avoidance of many situations or significant distress.",
      impact: "May affect overall quality of life: social isolation, career limitations, increased depression.",
      action: "Professional psychotherapy is strongly recommended. CBT, exposure and response prevention (ERP), and in some cases medication are effective. Please reach out to a mental health professional.",
    },
    ja: {
      title: "重度のレベル",
      description: "社会不安が日常生活に深刻な影響を与えています。多くの状況を極度に回避したり、大きな苦痛を経験している可能性があります。",
      impact: "社会的孤立、キャリア制限、うつ感の増加など、全体的な生活の質に影響する可能性があります。",
      action: "専門の心理療法士の支援が強く推奨されます。CBT、曝露反応妨害法（ERP）、場合によっては薬物療法が効果的です。精神保健の専門家に相談してください。",
    },
  },
};

const t = {
  ko: {
    title: "사회불안 자가 진단",
    subtitle: "사회적 상황에서 느끼는 불안 수준 측정",
    instruction: "지난 2주간의 경험을 기준으로 응답해주세요",
    never: "전혀 없음",
    rarely: "거의 없음",
    sometimes: "가끔",
    often: "자주",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "진단 결과",
    yourScore: "총점",
    impact: "생활 영향",
    action: "권장 행동",
    disclaimer: "이 테스트는 임상 진단이 아니며, 전문 진단을 대체할 수 없습니다.",
    restart: "다시 하기",
    share: "결과 공유",
    copied: "복사됨!",
  },
  en: {
    title: "Social Anxiety Self-Assessment",
    subtitle: "Measure Your Social Anxiety Level",
    instruction: "Answer based on your experiences over the past 2 weeks",
    never: "Never",
    rarely: "Rarely",
    sometimes: "Sometimes",
    often: "Often",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "Assessment Result",
    yourScore: "Total Score",
    impact: "Life Impact",
    action: "Recommended Action",
    disclaimer: "This test is not a clinical diagnosis and cannot replace professional assessment.",
    restart: "Restart",
    share: "Share Result",
    copied: "Copied!",
  },
  ja: {
    title: "社会不安自己評価",
    subtitle: "社会的状況での不安レベルを測定",
    instruction: "過去2週間の経験に基づいて回答してください",
    never: "まったくない",
    rarely: "ほとんどない",
    sometimes: "ときどき",
    often: "よく",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "診断結果",
    yourScore: "合計点",
    impact: "生活への影響",
    action: "推奨アクション",
    disclaimer: "このテストは臨床診断ではなく、専門的な評価に代わるものではありません。",
    restart: "もう一度",
    share: "結果をシェア",
    copied: "コピーされました！",
  },
};

function getLevel(score: number): AnxietyLevel {
  if (score <= 12) return "minimal";
  if (score <= 24) return "mild";
  if (score <= 36) return "moderate";
  return "severe";
}

export default function SocialAnxietyTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = t[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ level: AnxietyLevel; score: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const sa = p.get("sa") as AnxietyLevel | null;
    const ss = p.get("ss");
    if (sa && ss && LEVELS[sa]) {
      setResult({ level: sa, score: parseInt(ss, 10) });
    }
  }, []);

  function pick(score: number) {
    const next = [...answers, score];
    if (next.length < questions.length) {
      setAnswers(next);
      setTimeout(() => setIdx(next.length), 280);
    } else {
      const total = next.reduce((a, b) => a + b, 0);
      const level = getLevel(total);
      setResult({ level, score: total });
      const url = new URL(window.location.href);
      url.searchParams.set("sa", level);
      url.searchParams.set("ss", String(total));
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0);
    setAnswers([]);
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("sa");
    url.searchParams.delete("ss");
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

  const scoreOptions = [
    { label: tx.never, value: 0 },
    { label: tx.rarely, value: 1 },
    { label: tx.sometimes, value: 2 },
    { label: tx.often, value: 3 },
  ] as const;

  const maxScore = questions.length * 3;

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
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: lv.color }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>{LEVELS.minimal[locale].title.split(" ")[0]}</span>
              <span>{LEVELS.severe[locale].title.split(" ")[0]}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-700 leading-relaxed">{ld.description}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700">📊 {tx.impact}</h3>
            <p className="mt-1 text-sm text-gray-600">{ld.impact}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: `${lv.color}10` }}>
            <h3 className="font-semibold" style={{ color: lv.color }}>💡 {tx.action}</h3>
            <p className="mt-1 text-sm text-gray-700">{ld.action}</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">{tx.disclaimer}</p>

        <div className="flex gap-3">
          <button onClick={restart} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            {tx.restart}
          </button>
          <button onClick={share} className="flex-1 rounded-xl py-3 text-sm font-medium text-white transition" style={{ backgroundColor: lv.color }}>
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
        <p className="mt-2 text-xs text-gray-400">{tx.instruction}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-orange-400 transition-all duration-300"
            style={{ width: `${(idx / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-500">{tx.progress(idx + 1, questions.length)}</span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-6 text-center text-lg font-medium text-gray-800">{q[locale]}</p>
        <div className="grid grid-cols-2 gap-3">
          {scoreOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => pick(opt.value)}
              className="rounded-xl border border-gray-200 px-4 py-4 text-center text-sm font-medium text-gray-700 transition hover:border-orange-300 hover:bg-orange-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
