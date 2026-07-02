'use client';

import { useState } from "react";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type ResilienceFactor = "self_efficacy" | "optimism" | "social_support" | "adaptability";

interface Question {
  ko: string;
  en: string;
  ja: string;
  factor: ResilienceFactor;
  reversed?: boolean;
}

const likertOptions = {
  ko: ["전혀 동의하지 않음", "동의하지 않음", "보통", "동의함", "매우 동의함"],
  en: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
  ja: ["全く同意しない", "同意しない", "普通", "同意する", "強く同意する"],
};

const questions: Question[] = [
  { ko: "어려운 상황을 처리할 수 있는 내 능력을 믿는다", en: "I trust my ability to handle difficult situations", ja: "困難な状況を処理できる自分の能力を信じている", factor: "self_efficacy" },
  { ko: "발생하는 문제를 해결하는 내 능력을 종종 의심한다", en: "I often doubt my ability to solve the problems that arise", ja: "発生する問題を解決する能力をよく疑う", factor: "self_efficacy", reversed: true },
  { ko: "일반적으로 내 삶에 좋은 일이 일어날 것이라고 기대한다", en: "I generally expect good things to happen in my life", ja: "一般的に自分の人生に良いことが起きると期待している", factor: "optimism" },
  { ko: "어려운 시기에도 미래에 대한 희망을 유지한다", en: "I maintain hope for the future even in difficult times", ja: "困難な時期でも未来への希望を維持している", factor: "optimism" },
  { ko: "필요할 때 도움을 청할 수 있는 사람들이 있다", en: "I have people I can ask for help when needed", ja: "必要なとき助けを求められる人がいる", factor: "social_support" },
  { ko: "다른 사람에게 도움을 요청하기 어렵다", en: "I find it difficult to ask others for help", ja: "他の人に助けを求めるのが難しい", factor: "social_support", reversed: true },
  { ko: "변화에 꽤 쉽게 적응할 수 있다", en: "I can adapt to change fairly easily", ja: "変化にかなり簡単に適応できる", factor: "adaptability" },
  { ko: "일상이 방해받을 때 어려움을 겪는다", en: "I have difficulty when my routine is disrupted", ja: "日常が乱されると困難を感じる", factor: "adaptability", reversed: true },
  { ko: "도전적인 경험에서 귀중한 교훈을 배운다", en: "I learn valuable lessons from challenging experiences", ja: "困難な経験から貴重な教訓を学ぶ", factor: "optimism" },
  { ko: "스트레스 상황에서 보통 내 감정을 조절할 수 있다", en: "I can usually regulate my emotions in stressful situations", ja: "ストレスの多い状況では通常感情をコントロールできる", factor: "self_efficacy" },
  { ko: "필요한 일을 하기 위해 나 자신을 믿을 수 있다", en: "I can trust myself to do what needs to be done", ja: "必要なことをするために自分を信頼できる", factor: "self_efficacy" },
  { ko: "상황이 변할 때 계획을 조정할 수 있다", en: "I can adjust my plans when circumstances change", ja: "状況が変わったとき計画を調整できる", factor: "adaptability" },
];

const factorInfo: Record<ResilienceFactor, {
  emoji: string;
  color: string;
  ko: { title: string; high: string; medium: string; low: string };
  en: { title: string; high: string; medium: string; low: string };
  ja: { title: string; high: string; medium: string; low: string };
}> = {
  self_efficacy: {
    emoji: "💪",
    color: "#6366f1",
    ko: { title: "자기 효능감", high: "장애물을 극복하는 능력에 강한 자신감이 있습니다.", medium: "일반적으로 자신의 능력을 믿지만 특정 상황에서 의심할 수 있습니다.", low: "자신의 능력에 더 많은 자신감을 갖는 것이 도움이 됩니다." },
    en: { title: "Self-Efficacy", high: "You have strong confidence in your ability to overcome obstacles.", medium: "You generally trust your abilities but may doubt yourself in certain situations.", low: "Building more confidence in your abilities will help you face challenges." },
    ja: { title: "自己効力感", high: "障害を克服する能力に強い自信があります。", medium: "一般的に自分の能力を信じますが、特定の状況では疑うことがあります。", low: "自分の能力にもっと自信を持つことが挑戦に直面するのに役立ちます。" },
  },
  optimism: {
    emoji: "🌅",
    color: "#f59e0b",
    ko: { title: "낙관주의", high: "어려운 시기에도 긍정적인 전망을 유지합니다.", medium: "사물의 긍정적 면을 볼 수 있지만 때로는 부정적 면에 집중합니다.", low: "더 긍정적인 관점을 개발하면 도전을 헤쳐나가는 데 도움이 됩니다." },
    en: { title: "Optimism", high: "You maintain a positive outlook even in difficult times.", medium: "You can see the positive side but sometimes focus on the negative.", low: "Developing a more positive perspective will help you navigate challenges." },
    ja: { title: "楽観主義", high: "困難な時期でもポジティブな展望を維持しています。", medium: "ポジティブな面を見られますが、時にはネガティブな面に集中することがあります。", low: "より前向きな視点を開発することが課題を乗り越えるのに役立ちます。" },
  },
  social_support: {
    emoji: "🤝",
    color: "#10b981",
    ko: { title: "사회적 지원", high: "도전 중에 도움이 되는 강한 지원 관계를 유지합니다.", medium: "일부 지원 관계가 있지만 네트워크를 강화하면 도움이 됩니다.", low: "더 강한 연결을 구축하면 어려운 시기에 더 많은 지원을 받습니다." },
    en: { title: "Social Support", high: "You maintain strong supportive relationships that help during challenges.", medium: "You have some support relationships but strengthening your network would help.", low: "Building stronger connections will provide more support during difficult times." },
    ja: { title: "社会的支援", high: "困難なとき助けとなる強い支援関係を維持しています。", medium: "いくつかの支援関係がありますが、ネットワークを強化すると助けになります。", low: "より強い繋がりを構築することで困難な時期により多くの支援が得られます。" },
  },
  adaptability: {
    emoji: "🌊",
    color: "#06b6d4",
    ko: { title: "적응성", high: "변화하는 환경과 새로운 상황에 잘 적응합니다.", medium: "일부 변화에 적응할 수 있지만 특정 전환이 어려울 수 있습니다.", low: "변화에 더 편안해지면 회복탄력성이 강화됩니다." },
    en: { title: "Adaptability", high: "You adapt well to changing environments and new situations.", medium: "You can adapt to some changes but certain transitions may be difficult.", low: "Becoming more comfortable with change will strengthen your resilience." },
    ja: { title: "適応性", high: "変化する環境と新しい状況によく適応します。", medium: "一部の変化に適応できますが、特定の移行が難しいことがあります。", low: "変化に慣れることでレジリエンスが強化されます。" },
  },
};

const overallLevels = {
  ko: [
    { label: "발전 중인 회복탄력성", description: "회복탄력성 기술을 구축하면 스트레스를 더 잘 관리할 수 있습니다. 좋은 소식은 회복탄력성은 연습으로 개발됩니다.", min: 0, max: 35, emoji: "🌱", color: "#f59e0b" },
    { label: "중간 회복탄력성", description: "몇 가지 좋은 회복탄력성 기술을 개발했습니다. 특정 영역에 집중하면 더 효과적으로 어려운 상황을 헤쳐나갈 수 있습니다.", min: 36, max: 48, emoji: "🌿", color: "#10b981" },
    { label: "높은 회복탄력성", description: "강한 회복탄력성 기술을 보여줍니다. 좌절에서 잘 회복하고 변화에 효과적으로 적응합니다.", min: 49, max: 60, emoji: "🌳", color: "#059669" },
  ],
  en: [
    { label: "Developing Resilience", description: "Building resilience skills will help you manage stress better. The good news is resilience can be developed through practice.", min: 0, max: 35, emoji: "🌱", color: "#f59e0b" },
    { label: "Moderate Resilience", description: "You've developed some good resilience skills. Focusing on specific areas will help you navigate difficult situations more effectively.", min: 36, max: 48, emoji: "🌿", color: "#10b981" },
    { label: "High Resilience", description: "You show strong resilience skills. You recover well from setbacks and adapt effectively to change.", min: 49, max: 60, emoji: "🌳", color: "#059669" },
  ],
  ja: [
    { label: "発展中のレジリエンス", description: "レジリエンスのスキルを構築することでストレスをより上手く管理できます。良いニュースはレジリエンスは練習で開発できます。", min: 0, max: 35, emoji: "🌱", color: "#f59e0b" },
    { label: "中程度のレジリエンス", description: "いくつかのレジリエンススキルを開発しました。特定の領域に集中すると困難な状況をより効果的に乗り越えられます。", min: 36, max: 48, emoji: "🌿", color: "#10b981" },
    { label: "高いレジリエンス", description: "強いレジリエンススキルを示しています。挫折からうまく回復し変化に効果的に適応します。", min: 49, max: 60, emoji: "🌳", color: "#059669" },
  ],
};

const ui = {
  ko: { title: "회복탄력성 부스터 테스트", subtitle: "나의 회복 근육은?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "나의 회복탄력성 프로필", factorLabel: "회복탄력성 요소", restart: "다시 하기", share: "결과 공유", copied: "복사됨!" },
  en: { title: "Resilience Boost Test", subtitle: "How strong are my recovery muscles?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "My Resilience Profile", factorLabel: "Resilience Factors", restart: "Restart", share: "Share Result", copied: "Copied!" },
  ja: { title: "レジリエンスブーストテスト", subtitle: "私の回復筋肉は？", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "私のレジリエンスプロフィール", factorLabel: "レジリエンス要素", restart: "もう一度", share: "結果をシェア", copied: "コピーされました！" },
};

export default function ResilienceBoostTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = ui[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);

  function pick(value: number) {
    const score = questions[idx].reversed ? 6 - value : value;
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
    if (navigator.share) {
      await navigator.share({ title: tx.title, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (showResult) {
    const total = answers.reduce((a, b) => a + b, 0);
    const overallLevel = overallLevels[locale].find((l) => total >= l.min && total <= l.max) ?? overallLevels[locale][1];
    const percentage = Math.round((total / 60) * 100);

    const factorScores: Record<ResilienceFactor, number[]> = { self_efficacy: [], optimism: [], social_support: [], adaptability: [] };
    questions.forEach((q, i) => { factorScores[q.factor].push(answers[i] ?? 3); });
    const factorAvg: Record<ResilienceFactor, number> = {
      self_efficacy: factorScores.self_efficacy.reduce((a, b) => a + b, 0) / factorScores.self_efficacy.length,
      optimism: factorScores.optimism.reduce((a, b) => a + b, 0) / factorScores.optimism.length,
      social_support: factorScores.social_support.reduce((a, b) => a + b, 0) / factorScores.social_support.length,
      adaptability: factorScores.adaptability.reduce((a, b) => a + b, 0) / factorScores.adaptability.length,
    };

    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 text-center" style={{ background: `linear-gradient(135deg, ${overallLevel.color}18, ${overallLevel.color}08)`, border: `1px solid ${overallLevel.color}30` }}>
          <p className="text-sm font-medium text-gray-500 mb-1">{tx.resultTitle}</p>
          <div className="text-5xl mb-2">{overallLevel.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{overallLevel.label}</h2>
          <p className="text-3xl font-bold mt-1" style={{ color: overallLevel.color }}>{percentage}%</p>
          <p className="mt-3 text-sm text-gray-600">{overallLevel.description}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-700">{tx.factorLabel}</h3>
          <div className="space-y-4">
            {(Object.keys(factorAvg) as ResilienceFactor[]).map((factor) => {
              const fi = factorInfo[factor];
              const avg = factorAvg[factor];
              const level = avg >= 4 ? "high" : avg >= 3 ? "medium" : "low";
              return (
                <div key={factor}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{fi.emoji} {fi[locale].title}</span>
                    <span className="text-xs text-gray-400">{Math.round(avg * 20)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-1">
                    <div className="h-full rounded-full transition-all" style={{ width: `${avg * 20}%`, backgroundColor: fi.color }} />
                  </div>
                  <p className="text-xs text-gray-500">{fi[locale][level]}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={restart} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50">{tx.restart}</button>
          <button onClick={share} className="flex-1 rounded-xl py-3 text-sm font-medium text-white transition" style={{ backgroundColor: overallLevel.color }}>{copied ? tx.copied : tx.share}</button>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const opts = likertOptions[locale];

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
        <div className="space-y-2">
          {opts.map((opt, i) => (
            <button key={i} onClick={() => pick(i + 1)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50">
              <span className="font-medium text-emerald-600 mr-2">{i + 1}.</span>{opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
