'use client';

import { useState } from "react";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type EQCategory = "awareness" | "understanding" | "expression" | "strategies";

interface Question {
  ko: string;
  en: string;
  ja: string;
  category: EQCategory;
  options: {
    ko: string;
    en: string;
    ja: string;
    score: number;
  }[];
}

const questions: Question[] = [
  {
    ko: "나는 내가 느끼는 감정이 무엇인지 쉽게 알아차린다",
    en: "I easily recognize what emotions I am feeling",
    ja: "私は自分が感じている感情を簡単に気づく",
    category: "awareness",
    options: [
      { ko: "매우 그렇다", en: "Strongly agree", ja: "強くそう思う", score: 5 },
      { ko: "그렇다", en: "Agree", ja: "そう思う", score: 4 },
      { ko: "보통이다", en: "Neutral", ja: "普通", score: 3 },
      { ko: "그렇지 않다", en: "Disagree", ja: "そう思わない", score: 2 },
    ],
  },
  {
    ko: "화가 났을 때 나의 반응은?",
    en: "When I am angry, my reaction is:",
    ja: "怒っているとき、私の反応は？",
    category: "awareness",
    options: [
      { ko: "다른 사람이 지적할 때까지 알아차리지 못한다", en: "I don't notice until someone points it out", ja: "誰かが指摘するまで気づかない", score: 1 },
      { ko: "화가 났다는 건 알지만 정확히 어떤 감정인지 파악하기 어렵다", en: "I know I'm angry but can't identify exactly what I feel", ja: "怒っているとはわかるが正確な感情を把握しにくい", score: 2 },
      { ko: "감정을 알아차리지만 항상 그 이유를 알지는 못한다", en: "I notice my emotions but don't always know why", ja: "感情に気づくが理由がわからないこともある", score: 4 },
      { ko: "내 감정과 그 원인을 명확하게 인식한다", en: "I clearly recognize my emotions and their cause", ja: "感情とその原因を明確に認識している", score: 5 },
    ],
  },
  {
    ko: "나는 특정 상황이 왜 나에게 감정적 반응을 일으키는지 이해한다",
    en: "I understand why certain situations trigger emotional responses in me",
    ja: "なぜ特定の状況が感情的反応を引き起こすか理解している",
    category: "understanding",
    options: [
      { ko: "매우 그렇다", en: "Strongly agree", ja: "強くそう思う", score: 5 },
      { ko: "그렇다", en: "Agree", ja: "そう思う", score: 4 },
      { ko: "보통이다", en: "Neutral", ja: "普通", score: 3 },
      { ko: "그렇지 않다", en: "Disagree", ja: "そう思わない", score: 2 },
    ],
  },
  {
    ko: "동료가 내 업무 성과를 자신의 것으로 가져갔을 때 어떻게 해석하나요?",
    en: "When a colleague takes credit for your work, how do you interpret it?",
    ja: "同僚が自分の成果を横取りしたとき、どう解釈しますか？",
    category: "understanding",
    options: [
      { ko: "그들이 의도적으로 나를 깎아내리려 한다", en: "They are intentionally trying to undermine me", ja: "わざと私を貶めようとしている", score: 1 },
      { ko: "이런 일은 항상 나에게 일어난다, 나는 절대 앞으로 나아갈 수 없다", en: "This always happens to me, I'll never move forward", ja: "いつもこうなる、前進できない", score: 2 },
      { ko: "내 기여를 알아차리지 못했을 수 있다", en: "They may not have noticed my contribution", ja: "私の貢献に気づかなかったかもしれない", score: 4 },
      { ko: "전문성을 유지하며 내 기여도를 명확히 해야 한다", en: "I should clarify my contributions while staying professional", ja: "プロとして自分の貢献を明確にすべきだ", score: 5 },
    ],
  },
  {
    ko: "친구가 한 말에 상처받았을 때 나는:",
    en: "When hurt by something a friend said, I:",
    ja: "友人の言葉に傷ついたとき、私は：",
    category: "expression",
    options: [
      { ko: "모든 것이 괜찮은 척하지만 속으로는 원망한다", en: "Pretend everything is fine but hold a grudge", ja: "大丈夫なふりをするが心では恨む", score: 1 },
      { ko: "혼자 간직하고 그 사람을 피한다", en: "Keep it inside and avoid that person", ja: "心の中だけに留めその人を避ける", score: 2 },
      { ko: "감정을 처리하기 위해 먼저 글로 적는다", en: "Write it down first to process the emotion", ja: "まず書いて感情を整理する", score: 4 },
      { ko: "그들의 말이 나에게 어떤 영향을 미쳤는지 직접 말한다", en: "Tell them directly how their words affected me", ja: "言葉がどう影響したか直接伝える", score: 5 },
    ],
  },
  {
    ko: "나는 긍정적인 감정과 부정적인 감정 모두 편안하게 표현할 수 있다",
    en: "I can comfortably express both positive and negative emotions",
    ja: "ポジティブな感情もネガティブな感情も快適に表現できる",
    category: "expression",
    options: [
      { ko: "매우 그렇다", en: "Strongly agree", ja: "強くそう思う", score: 5 },
      { ko: "그렇다", en: "Agree", ja: "そう思う", score: 4 },
      { ko: "보통이다", en: "Neutral", ja: "普通", score: 3 },
      { ko: "그렇지 않다", en: "Disagree", ja: "そう思わない", score: 2 },
    ],
  },
  {
    ko: "나는 화가 났을 때 스스로를 진정시키는 효과적인 방법을 가지고 있다",
    en: "I have effective methods for calming myself when angry",
    ja: "怒ったとき自分を落ち着かせる効果的な方法がある",
    category: "strategies",
    options: [
      { ko: "매우 그렇다", en: "Strongly agree", ja: "強くそう思う", score: 5 },
      { ko: "그렇다", en: "Agree", ja: "そう思う", score: 4 },
      { ko: "보통이다", en: "Neutral", ja: "普通", score: 3 },
      { ko: "그렇지 않다", en: "Disagree", ja: "そう思わない", score: 2 },
    ],
  },
  {
    ko: "스트레스가 많은 상황에 직면했을 때 나의 접근 방식은?",
    en: "When facing a stressful situation, my typical approach is:",
    ja: "ストレスの多い状況に直面したとき、私のアプローチは？",
    category: "strategies",
    options: [
      { ko: "압도되어 명확하게 생각할 수 없다", en: "I feel overwhelmed and can't think clearly", ja: "圧倒されて明確に考えられない", score: 1 },
      { ko: "다른 활동으로 주의를 돌린다", en: "I distract myself with other activities", ja: "別の活動に気をそらす", score: 3 },
      { ko: "호흡이나 명상을 통해 스스로를 진정시킨다", en: "I calm myself through breathing or meditation", ja: "呼吸や瞑想で落ち着ける", score: 4 },
      { ko: "상황을 더 긍정적인 관점으로 재구성한다", en: "I reframe the situation from a more positive perspective", ja: "より肯定的な視点から状況を再構成する", score: 5 },
    ],
  },
  {
    ko: "나는 어려운 상황에서도 긍정적인 측면을 찾을 수 있다",
    en: "I can find positive aspects even in difficult situations",
    ja: "困難な状況でもポジティブな面を見つけられる",
    category: "strategies",
    options: [
      { ko: "매우 그렇다", en: "Strongly agree", ja: "強くそう思う", score: 5 },
      { ko: "그렇다", en: "Agree", ja: "そう思う", score: 4 },
      { ko: "보통이다", en: "Neutral", ja: "普通", score: 3 },
      { ko: "그렇지 않다", en: "Disagree", ja: "そう思わない", score: 2 },
    ],
  },
  {
    ko: "내 감정 상태가 내 행동과 결정에 어떤 영향을 미치는지 이해한다",
    en: "I understand how my emotional state affects my actions and decisions",
    ja: "感情状態が行動や決定にどう影響するか理解している",
    category: "understanding",
    options: [
      { ko: "매우 그렇다", en: "Strongly agree", ja: "強くそう思う", score: 5 },
      { ko: "그렇다", en: "Agree", ja: "そう思う", score: 4 },
      { ko: "보통이다", en: "Neutral", ja: "普通", score: 3 },
      { ko: "그렇지 않다", en: "Disagree", ja: "そう思わない", score: 2 },
    ],
  },
];

const categoryResults: Record<
  EQCategory,
  { ko: { title: string; high: string; medium: string; low: string }; en: { title: string; high: string; medium: string; low: string }; ja: { title: string; high: string; medium: string; low: string }; color: string }
> = {
  awareness: {
    color: "#10b981",
    ko: { title: "감정 인식", high: "감정이 발생할 때 명확하게 인식합니다.", medium: "중간 수준의 감정 인식을 가지고 있습니다.", low: "감정 인식 능력을 더 키울 여지가 있습니다." },
    en: { title: "Emotional Awareness", high: "You clearly recognize emotions as they arise.", medium: "You have moderate emotional awareness.", low: "There is room to develop emotional awareness." },
    ja: { title: "感情認識", high: "感情が生じたとき明確に認識できます。", medium: "中程度の感情認識を持っています。", low: "感情認識能力を育てる余地があります。" },
  },
  understanding: {
    color: "#6366f1",
    ko: { title: "감정 이해", high: "감정의 원인과 영향을 탁월하게 이해합니다.", medium: "감정에 대한 좋은 이해력을 가지고 있습니다.", low: "감정 패턴에 대한 더 깊은 이해가 도움이 됩니다." },
    en: { title: "Emotional Understanding", high: "You have excellent understanding of emotions and their causes.", medium: "You have good emotional understanding.", low: "Deeper understanding of emotional patterns would help." },
    ja: { title: "感情理解", high: "感情とその原因を優れて理解しています。", medium: "感情についての良い理解があります。", low: "感情パターンへの深い理解が助けになります。" },
  },
  expression: {
    color: "#f59e0b",
    ko: { title: "감정 표현", high: "감정을 건강하고 건설적인 방식으로 표현합니다.", medium: "감정을 꽤 잘 표현하지만 개선의 여지가 있습니다.", low: "더 건강한 감정 표현이 관계를 개선할 수 있습니다." },
    en: { title: "Emotional Expression", high: "You express emotions in healthy, constructive ways.", medium: "You express emotions fairly well with room to grow.", low: "Healthier emotional expression could improve relationships." },
    ja: { title: "感情表現", high: "健全で建設的な方法で感情を表現します。", medium: "感情をかなりうまく表現しますが改善の余地があります。", low: "より健全な感情表現が関係を改善できます。" },
  },
  strategies: {
    color: "#ef4444",
    ko: { title: "조절 전략", high: "감정을 관리하는 효과적이고 다양한 전략을 가지고 있습니다.", medium: "몇 가지 효과적인 전략을 가지고 있으며 더 개발할 수 있습니다.", low: "더 효과적인 조절 전략 개발이 도움이 됩니다." },
    en: { title: "Regulation Strategies", high: "You have effective and varied strategies for managing emotions.", medium: "You have some effective strategies and can develop more.", low: "Developing more effective regulation strategies will help." },
    ja: { title: "調節戦略", high: "感情を管理するための効果的で多様な戦略があります。", medium: "いくつかの効果的な戦略があり、さらに開発できます。", low: "より効果的な調節戦略の開発が助けになります。" },
  },
};

const overallLevels = {
  ko: [
    { label: "인식 발달 단계", description: "감정 조절 여정의 초기 단계에 있습니다. 연습을 통해 크게 향상시킬 수 있습니다.", min: 0, max: 25 },
    { label: "역량 성장 단계", description: "탄탄한 기반을 가지고 있으며 특정 영역에 집중하면 더욱 향상됩니다.", min: 26, max: 38 },
    { label: "고급 조절 단계", description: "강한 감정 조절 능력을 보여줍니다. 이 강점을 계속 유지하세요.", min: 39, max: 50 },
  ],
  en: [
    { label: "Awareness Development", description: "You are in the early stages of emotional regulation. Practice will lead to significant improvement.", min: 0, max: 25 },
    { label: "Growing Competency", description: "You have a solid foundation. Focusing on specific areas will help you improve further.", min: 26, max: 38 },
    { label: "Advanced Regulation", description: "You show strong emotional regulation skills. Keep maintaining these strengths.", min: 39, max: 50 },
  ],
  ja: [
    { label: "認識発達段階", description: "感情調節の初期段階にいます。練習によって大きく向上できます。", min: 0, max: 25 },
    { label: "能力成長段階", description: "しっかりした基盤があります。特定の領域に集中するとさらに向上します。", min: 26, max: 38 },
    { label: "高度な調節段階", description: "強い感情調節能力を示しています。この強みを維持し続けてください。", min: 39, max: 50 },
  ],
};

const t = {
  ko: { title: "감정 지능 테스트", subtitle: "나의 감정 이해력은?", progress: (c: number, total: number) => `${c} / ${total}`, resultTitle: "나의 감정 조절 결과", overall: "전체 수준", restart: "다시 하기", share: "결과 공유", copied: "복사됨!" },
  en: { title: "Emotional Intelligence Test", subtitle: "How well do I understand emotions?", progress: (c: number, total: number) => `${c} / ${total}`, resultTitle: "My Emotional Regulation Results", overall: "Overall Level", restart: "Restart", share: "Share Result", copied: "Copied!" },
  ja: { title: "感情知能テスト", subtitle: "私の感情理解力は？", progress: (c: number, total: number) => `${c} / ${total}`, resultTitle: "私の感情調節結果", overall: "全体レベル", restart: "もう一度", share: "結果をシェア", copied: "コピーされました！" },
};

export default function EmotionalMindTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = t[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);

  function pick(score: number) {
    const next = [...answers, score];
    if (next.length < questions.length) {
      setAnswers(next);
      setTimeout(() => setIdx(next.length), 280);
    } else {
      setAnswers(next);
      setShowResult(true);
    }
  }

  function restart() {
    setIdx(0);
    setAnswers([]);
    setShowResult(false);
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

  if (showResult) {
    const total = answers.reduce((a, b) => a + b, 0);
    const percentage = Math.round((total / 50) * 100);
    const overallLevel = overallLevels[locale].find((l) => total >= l.min && total <= l.max) ?? overallLevels[locale][1];

    const categoryScores: Record<EQCategory, number[]> = { awareness: [], understanding: [], expression: [], strategies: [] };
    questions.forEach((q, i) => { categoryScores[q.category].push(answers[i] ?? 3); });
    const categoryAvg: Record<EQCategory, number> = {
      awareness: categoryScores.awareness.reduce((a, b) => a + b, 0) / categoryScores.awareness.length,
      understanding: categoryScores.understanding.reduce((a, b) => a + b, 0) / categoryScores.understanding.length,
      expression: categoryScores.expression.reduce((a, b) => a + b, 0) / categoryScores.expression.length,
      strategies: categoryScores.strategies.reduce((a, b) => a + b, 0) / categoryScores.strategies.length,
    };

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-6 text-center">
          <p className="text-sm font-medium text-emerald-600 mb-1">{tx.resultTitle}</p>
          <div className="text-5xl mb-2">🧠</div>
          <h2 className="text-2xl font-bold text-gray-900">{overallLevel.label}</h2>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{percentage}%</p>
          <p className="mt-3 text-sm text-gray-600">{overallLevel.description}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          {(["awareness", "understanding", "expression", "strategies"] as EQCategory[]).map((cat) => {
            const r = categoryResults[cat];
            const avg = categoryAvg[cat];
            const level = avg >= 4 ? "high" : avg >= 3 ? "medium" : "low";
            const rd = r[locale];
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{rd.title}</span>
                  <span className="text-xs text-gray-500">{Math.round(avg * 20)}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all" style={{ width: `${avg * 20}%`, backgroundColor: r.color }} />
                </div>
                <p className="text-xs text-gray-500">{rd[level]}</p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={restart} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            {tx.restart}
          </button>
          <button onClick={share} className="flex-1 rounded-xl py-3 text-sm font-medium text-white transition bg-emerald-600 hover:bg-emerald-700">
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
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm text-gray-500">{tx.progress(idx + 1, questions.length)}</span>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-5 text-center text-lg font-medium text-gray-800">{q[locale]}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => pick(opt.score)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50">
              {opt[locale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
