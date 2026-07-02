'use client';

import { useState } from "react";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

interface Question {
  ko: string;
  en: string;
  ja: string;
  reversed?: boolean;
}

const questions: Question[] = [
  {
    ko: "일반적으로, 나는 스스로를 어떻게 생각하나요?",
    en: "In general, I consider myself:",
    ja: "一般的に、私は自分自身を：",
    reversed: false,
  },
  {
    ko: "대부분의 또래와 비교했을 때, 나는 스스로를:",
    en: "Compared to most of my peers, I consider myself:",
    ja: "ほとんどの同年代と比べて、私は自分を：",
    reversed: false,
  },
  {
    ko: "어떤 사람들은 일반적으로 매우 행복해요. 무슨 일이 있어도 삶을 즐기며 모든 것에서 기쁨을 얻어요. 이 특성이 당신을 얼마나 잘 설명하나요?",
    en: "Some people are generally very happy. They enjoy life regardless of what is happening and are always getting the most out of everything. To what extent does this characterization describe you?",
    ja: "とても幸せな人がいます。何があっても人生を楽しみすべてから最大限を得ます。この特徴はどの程度あなたを表していますか？",
    reversed: false,
  },
  {
    ko: "어떤 사람들은 일반적으로 별로 행복하지 않아요. 우울하지는 않지만, 가능한 만큼 행복해 보이지 않아요. 이 특성이 당신을 얼마나 잘 설명하나요?",
    en: "Some people are generally not very happy. Although they are not depressed, they never seem as happy as they might be. To what extent does this characterization describe you?",
    ja: "あまり幸せでない人もいます。落ち込んではいませんが、なれるほど幸せではない。この特徴はどの程度あなたを表していますか？",
    reversed: true,
  },
];

const scaleOptions = {
  normal: {
    ko: ["매우 불행한 사람", "다소 불행한 사람", "약간 불행한 사람", "보통인 사람", "약간 행복한 사람", "다소 행복한 사람", "매우 행복한 사람"],
    en: ["Very unhappy person", "Somewhat unhappy person", "Slightly unhappy person", "Neutral person", "Slightly happy person", "Somewhat happy person", "Very happy person"],
    ja: ["とても不幸な人", "やや不幸な人", "少し不幸な人", "普通の人", "少し幸せな人", "やや幸せな人", "とても幸せな人"],
  },
  peer: {
    ko: ["훨씬 덜 행복함", "덜 행복함", "약간 덜 행복함", "비슷함", "약간 더 행복함", "더 행복함", "훨씬 더 행복함"],
    en: ["Much less happy", "Less happy", "Slightly less happy", "About the same", "Slightly happier", "Happier", "Much happier"],
    ja: ["ずっと不幸", "不幸", "少し不幸", "同じくらい", "少し幸せ", "幸せ", "ずっと幸せ"],
  },
  degree: {
    ko: ["전혀 그렇지 않음", "매우 조금", "약간 조금", "보통", "어느 정도", "상당히", "매우 많이"],
    en: ["Not at all", "Very little", "A little", "Somewhat", "A fair amount", "Quite a bit", "Very much"],
    ja: ["全くそうでない", "ほんの少し", "少し", "ある程度", "かなり", "相当", "非常に"],
  },
};

const resultLevels = {
  ko: [
    { min: 1, max: 2.5, emoji: "😔", label: "낮은 행복도", description: "지금 어려운 시기를 보내고 있을 수 있습니다. 작은 기쁨의 순간부터 주의를 기울여보세요.", color: "#ef4444" },
    { min: 2.5, max: 4, emoji: "😐", label: "보통 행복도", description: "긍정적인 감정과 부정적인 감정이 섞여 있습니다. 기쁨을 주는 활동을 더 자주 찾아보세요.", color: "#f59e0b" },
    { min: 4, max: 5.5, emoji: "🙂", label: "높은 행복도", description: "행복하게 지내고 있습니다. 이 긍정적인 에너지를 주변과 나눠보세요.", color: "#10b981" },
    { min: 5.5, max: 7, emoji: "😄", label: "매우 높은 행복도", description: "예외적으로 높은 행복도를 보여줍니다. 뛰어난 감정적 회복력을 가지고 있습니다.", color: "#059669" },
  ],
  en: [
    { min: 1, max: 2.5, emoji: "😔", label: "Low Happiness", description: "You may be going through a difficult time. Start paying attention to small moments of joy.", color: "#ef4444" },
    { min: 2.5, max: 4, emoji: "😐", label: "Moderate Happiness", description: "You have a mix of positive and negative emotions. Try to seek out activities that bring joy more often.", color: "#f59e0b" },
    { min: 4, max: 5.5, emoji: "🙂", label: "High Happiness", description: "You are living happily. Share this positive energy with those around you.", color: "#10b981" },
    { min: 5.5, max: 7, emoji: "😄", label: "Very High Happiness", description: "You show exceptionally high happiness. You have outstanding emotional resilience.", color: "#059669" },
  ],
  ja: [
    { min: 1, max: 2.5, emoji: "😔", label: "低い幸福度", description: "今困難な時期かもしれません。小さな喜びの瞬間に注目してみてください。", color: "#ef4444" },
    { min: 2.5, max: 4, emoji: "😐", label: "普通の幸福度", description: "ポジティブとネガティブな感情が混在しています。喜びをもたらす活動をより多く探しましょう。", color: "#f59e0b" },
    { min: 4, max: 5.5, emoji: "🙂", label: "高い幸福度", description: "幸せに暮らしています。このポジティブなエネルギーを周りと分かち合いましょう。", color: "#10b981" },
    { min: 5.5, max: 7, emoji: "😄", label: "非常に高い幸福度", description: "例外的に高い幸福度を示しています。優れた感情的回復力があります。", color: "#059669" },
  ],
};

const tips = {
  ko: ["감사한 것을 매일 세 가지씩 적어보세요", "소셜 연결이 행복과 강하게 연관되어 있습니다", "타인을 돕는 것이 자신의 행복을 높입니다", "의미 있는 활동에 완전히 몰입해보세요"],
  en: ["Write three things you are grateful for every day", "Social connection is strongly linked to happiness", "Helping others increases your own happiness", "Fully immerse yourself in meaningful activities"],
  ja: ["毎日3つの感謝することを書きましょう", "社会的つながりは幸福と強く関連しています", "他人を助けることが自分の幸福を高めます", "意味のある活動に完全に没頭しましょう"],
};

const tx = {
  ko: { title: "행복 지수 테스트", subtitle: "나의 행복 온도는?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "나의 행복 점수", score: "행복 점수", restart: "다시 하기", share: "결과 공유", copied: "복사됨!", tipsTitle: "행복 향상 팁", scale: "1(매우 낮음) ~ 7(매우 높음)" },
  en: { title: "Happiness Meter Test", subtitle: "What is my happiness temperature?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "My Happiness Score", score: "Happiness Score", restart: "Restart", share: "Share Result", copied: "Copied!", tipsTitle: "Happiness Tips", scale: "1 (very low) ~ 7 (very high)" },
  ja: { title: "幸福度テスト", subtitle: "私の幸福温度は？", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "私の幸福スコア", score: "幸福スコア", restart: "もう一度", share: "結果をシェア", copied: "コピーされました！", tipsTitle: "幸福向上のヒント", scale: "1(非常に低い) ~ 7(非常に高い)" },
};

function getOptionSet(qIdx: number, locale: SupportedLocale) {
  if (qIdx === 0) return scaleOptions.normal[locale];
  if (qIdx === 1) return scaleOptions.peer[locale];
  return scaleOptions.degree[locale];
}

export default function HappinessMeterTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const ui = tx[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);

  function pick(value: number) {
    const actualValue = questions[idx].reversed ? 8 - value : value;
    const next = [...answers, actualValue];
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
      await navigator.share({ title: ui.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (showResult) {
    const avg = answers.reduce((a, b) => a + b, 0) / answers.length;
    const level = resultLevels[locale].find((l) => avg >= l.min && avg < l.max) ?? resultLevels[locale][2];
    const displayScore = avg.toFixed(1);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 text-center" style={{ background: `linear-gradient(135deg, ${level.color}18, ${level.color}08)`, border: `1px solid ${level.color}30` }}>
          <p className="text-sm font-medium text-gray-500 mb-1">{ui.resultTitle}</p>
          <div className="text-5xl mb-2">{level.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{level.label}</h2>
          <p className="text-3xl font-bold mt-1" style={{ color: level.color }}>{displayScore} / 7</p>
          <p className="mt-3 text-sm text-gray-600">{level.description}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3">{ui.tipsTitle}</h3>
          <div className="space-y-2">
            {tips[locale].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={restart} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            {ui.restart}
          </button>
          <button onClick={share} className="flex-1 rounded-xl py-3 text-sm font-medium text-white transition" style={{ backgroundColor: level.color }}>
            {copied ? ui.copied : ui.share}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const options = getOptionSet(idx, locale);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{ui.title}</h1>
        <p className="mt-1 text-gray-500">{ui.subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-amber-400 transition-all duration-300" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm text-gray-500">{ui.progress(idx + 1, questions.length)}</span>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-2 text-center text-lg font-medium text-gray-800">{q[locale]}</p>
        <p className="mb-5 text-center text-xs text-gray-400">{ui.scale}</p>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <button key={i} onClick={() => pick(i + 1)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-amber-300 hover:bg-amber-50">
              <span className="font-medium text-amber-600 mr-2">{i + 1}.</span>{opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
