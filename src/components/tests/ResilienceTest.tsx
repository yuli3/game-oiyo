import { useState, useEffect } from "react";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type ResLevel = "high" | "medium" | "low";

interface Question {
  ko: string;
  en: string;
  ja: string;
}

const questions: Question[] = [
  { ko: "나는 어려운 상황에서도 결국 잘 해결될 것이라고 믿는다.", en: "Even in difficult situations, I believe things will eventually work out.", ja: "困難な状況でも、最終的にうまくいくと信じている。" },
  { ko: "실패나 좌절을 경험해도 비교적 빠르게 회복하는 편이다.", en: "After failure or setbacks, I tend to recover relatively quickly.", ja: "失敗や挫折を経験しても、比較的早く回復する方だ。" },
  { ko: "힘든 일을 겪을 때 주변에 도움을 요청하거나 지지를 구한다.", en: "When going through hard times, I reach out for help or support from others.", ja: "辛いことがある時、周りに助けを求めたりサポートを求める。" },
  { ko: "나는 내가 통제할 수 없는 것에 지나치게 집착하지 않는다.", en: "I don't obsess over things I cannot control.", ja: "自分がコントロールできないことに過度に執着しない。" },
  { ko: "스트레스를 해소하기 위한 나만의 방법(운동, 취미, 명상 등)이 있다.", en: "I have my own stress-relief methods (exercise, hobbies, meditation, etc.).", ja: "ストレスを解消するための自分だけの方法（運動、趣味、瞑想など）がある。" },
  { ko: "삶에서 의미나 목적을 찾으려고 노력한다.", en: "I actively seek meaning or purpose in life.", ja: "人生において意味や目的を見つけようと努力する。" },
  { ko: "나는 어려운 경험을 통해 오히려 더 강해지고 성장했다고 느낀다.", en: "I feel that difficult experiences have made me stronger and helped me grow.", ja: "困難な経験を通じて、むしろ強くなり成長したと感じる。" },
  { ko: "문제가 생겼을 때 감정에 압도되기보다 해결책을 먼저 생각한다.", en: "When problems arise, I think of solutions first rather than being overwhelmed by emotions.", ja: "問題が生じた時、感情に圧倒されるより先に解決策を考える。" },
  { ko: "나는 미래에 대해 대체로 낙관적인 편이다.", en: "I tend to be mostly optimistic about the future.", ja: "未来に対して概して楽観的な方だ。" },
  { ko: "내 강점과 가치를 알고 어려운 순간에 이를 활용한다.", en: "I know my strengths and values and draw on them in difficult moments.", ja: "自分の強みと価値観を知っており、困難な瞬間にそれを活用する。" },
];

const scaleLabels: Record<SupportedLocale, string[]> = {
  ko: ["전혀 아니다", "아니다", "보통", "그렇다", "매우 그렇다"],
  en: ["Not at all", "Rarely", "Neutral", "Often", "Very much so"],
  ja: ["全くない", "ほとんどない", "普通", "よくある", "とてもそうだ"],
};

interface LevelData {
  label: Record<SupportedLocale, string>;
  color: string;
  bg: string;
  border: string;
  description: Record<SupportedLocale, string>;
  strengths: Record<SupportedLocale, string[]>;
  strategies: Record<SupportedLocale, string[]>;
  affirmation: Record<SupportedLocale, string>;
}

const levelData: Record<ResLevel, LevelData> = {
  high: {
    label: { ko: "높은 회복탄력성", en: "High Resilience", ja: "高い回復力" },
    color: "#10b981",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    description: {
      ko: "당신은 삶의 역경 속에서도 회복하고 성장하는 능력이 뛰어납니다. 어려운 상황을 받아들이고, 지지 자원을 잘 활용하며, 긍정적인 시각을 유지합니다. 이 힘은 타고난 것이기도 하지만, 의식적인 노력과 경험을 통해 키워온 것이기도 합니다.",
      en: "You have strong ability to recover and grow amidst life's adversities. You accept difficult situations, make good use of support resources, and maintain a positive outlook. This strength may be partly innate, but it's also cultivated through conscious effort and experience.",
      ja: "あなたは人生の逆境の中でも回復し成長する能力が優れています。困難な状況を受け入れ、サポートリソースをうまく活用し、前向きな視点を維持します。この力は生まれつきのものでもありますが、意識的な努力と経験を通じて培ったものでもあります。",
    },
    strengths: {
      ko: ["역경 후 빠른 회복", "변화에 대한 높은 적응력", "지지 네트워크 효과적 활용", "긍정적 자기 서사 유지"],
      en: ["Quick recovery after adversity", "High adaptability to change", "Effective use of support network", "Maintaining a positive self-narrative"],
      ja: ["逆境後の素早い回復", "変化への高い適応力", "サポートネットワークの効果的な活用", "前向きな自己物語の維持"],
    },
    strategies: {
      ko: ["현재의 습관과 전략을 지속적으로 유지하세요", "어려움을 겪는 주변 사람들을 멘토링해보세요", "자신의 회복 과정을 일기로 기록해보세요"],
      en: ["Maintain your current habits and strategies consistently", "Try mentoring those around you who are struggling", "Journal your recovery process"],
      ja: ["現在の習慣と戦略を継続的に維持してください", "困っている周りの人をメンタリングしてみてください", "自分の回復プロセスを日記に記録してみてください"],
    },
    affirmation: {
      ko: "나는 폭풍 속에서도 나의 중심을 잃지 않습니다.",
      en: "Even in the storm, I do not lose my center.",
      ja: "嵐の中でも、私は自分の中心を失いません。",
    },
  },
  medium: {
    label: { ko: "보통 수준의 회복탄력성", en: "Moderate Resilience", ja: "中程度の回復力" },
    color: "#f59e0b",
    bg: "bg-amber-50",
    border: "border-amber-200",
    description: {
      ko: "당신은 대부분의 어려움을 잘 헤쳐나가지만, 특정 상황이나 유형의 스트레스에서는 회복이 더딜 수 있습니다. 이미 많은 강점을 가지고 있으며, 몇 가지 전략을 더하면 회복탄력성을 더욱 높일 수 있습니다.",
      en: "You navigate most difficulties well, but recovery may be slower in certain situations or types of stress. You already have many strengths, and a few more strategies can boost your resilience further.",
      ja: "ほとんどの困難をうまく乗り越えますが、特定の状況やタイプのストレスでは回復が遅くなることがあります。すでに多くの強みを持っており、いくつかの戦略を加えることで回復力をさらに高めることができます。",
    },
    strengths: {
      ko: ["어느 정도의 역경 대처 능력 보유", "지지 자원을 활용하려는 의지", "성장에 대한 동기 부여"],
      en: ["Possessing some degree of coping ability", "Willingness to use support resources", "Motivation for growth"],
      ja: ["ある程度の逆境への対処能力を持つ", "サポートリソースを活用しようとする意欲", "成長への動機付け"],
    },
    strategies: {
      ko: ["마음 챙김 명상이나 호흡법을 꾸준히 연습해보세요", "힘든 순간 연락할 수 있는 신뢰할 사람을 미리 정해두세요", "어려운 경험에서 배울 수 있는 '성장 일지'를 써보세요", "자신의 강점 목록을 작성해 눈에 보이는 곳에 두세요"],
      en: ["Practice mindfulness meditation or breathing exercises consistently", "Identify trusted people you can contact in difficult moments", "Write a 'growth journal' to learn from difficult experiences", "Create a list of your strengths and keep it somewhere visible"],
      ja: ["マインドフルネス瞑想や呼吸法を継続的に練習してみてください", "困難な瞬間に連絡できる信頼できる人を事前に決めておいてください", "困難な経験から学べる「成長日記」を書いてみてください", "自分の強みリストを作成して目につく場所に置いてください"],
    },
    affirmation: {
      ko: "나는 어제보다 오늘 더 강해지고 있습니다.",
      en: "I am growing stronger today than I was yesterday.",
      ja: "私は昨日より今日、より強くなっています。",
    },
  },
  low: {
    label: { ko: "회복탄력성 강화 필요", en: "Resilience Needs Strengthening", ja: "回復力の強化が必要" },
    color: "#ef4444",
    bg: "bg-red-50",
    border: "border-red-200",
    description: {
      ko: "현재 당신은 어려운 상황에서 회복하는 것이 버거울 수 있습니다. 이것은 약점이 아니라, 더 많은 지지와 전략이 필요한 신호입니다. 회복탄력성은 연습을 통해 키울 수 있으며, 작은 단계부터 시작하는 것이 중요합니다.",
      en: "You may currently find it difficult to recover from challenging situations. This isn't a weakness — it's a signal that you need more support and strategies. Resilience can be built through practice, and starting with small steps is what matters.",
      ja: "現在、困難な状況から回復することが辛いと感じることがあるかもしれません。これは弱点ではなく、より多くのサポートと戦略が必要なサインです。回復力は練習を通じて高めることができ、小さな一歩から始めることが重要です。",
    },
    strengths: {
      ko: ["어려움을 인식하고 도움을 찾는 용기", "자기 인식을 통한 성장 잠재력", "변화할 수 있는 가능성"],
      en: ["Courage to recognize difficulty and seek help", "Growth potential through self-awareness", "Capacity for change"],
      ja: ["困難を認識し助けを求める勇気", "自己認識を通じた成長の可能性", "変化できる可能性"],
    },
    strategies: {
      ko: ["전문 상담사나 심리치료사의 도움을 받아보세요", "하루 10분, 몸을 움직이는 것부터 시작해보세요", "오늘 한 가지 감사한 것을 찾아 기록해보세요", "신뢰할 수 있는 한 사람에게 지금의 마음을 솔직하게 털어놓아 보세요"],
      en: ["Seek help from a professional counselor or therapist", "Start with just 10 minutes of movement a day", "Find one thing to be grateful for today and write it down", "Honestly open up to one trusted person about how you're feeling now"],
      ja: ["専門のカウンセラーや心理療法士の助けを求めてください", "1日10分、体を動かすことから始めてみてください", "今日感謝できることを一つ見つけて記録してみてください", "信頼できる一人に今の気持ちを正直に打ち明けてみてください"],
    },
    affirmation: {
      ko: "지금 힘든 것은 일시적입니다. 나는 조금씩 나아지고 있습니다.",
      en: "What is hard now is temporary. I am getting better little by little.",
      ja: "今辛いことは一時的です。私は少しずつ良くなっています。",
    },
  },
};

const ui: Record<SupportedLocale, {
  title: string;
  subtitle: string;
  scale: string;
  progress: string;
  resultTitle: string;
  score: string;
  strengths: string;
  strategies: string;
  affirmation: string;
  restart: string;
  share: string;
  copied: string;
  warning: string;
  note: string;
}> = {
  ko: {
    title: "회복탄력성 자가 진단",
    subtitle: "역경 속에서 나는 얼마나 잘 회복하나요?",
    scale: "이 문장이 나를 얼마나 잘 설명하나요?",
    progress: "질문",
    resultTitle: "나의 회복탄력성",
    score: "점수",
    strengths: "나의 강점",
    strategies: "회복탄력성 강화 전략",
    affirmation: "오늘의 확언",
    restart: "다시 테스트하기",
    share: "결과 공유",
    copied: "링크가 복사되었습니다!",
    warning: "회복탄력성이 낮은 상태가 지속된다면, 번아웃이나 우울감으로 이어질 수 있습니다. 전문적인 상담을 받아보시기를 권합니다.",
    note: "이 테스트는 회복탄력성에 관한 심리학 연구를 바탕으로 하며, 자기 이해를 위한 참고 자료입니다.",
  },
  en: {
    title: "Resilience Self-Assessment",
    subtitle: "How well do you bounce back from adversity?",
    scale: "How well does this statement describe you?",
    progress: "Question",
    resultTitle: "My Resilience Level",
    score: "Score",
    strengths: "My Strengths",
    strategies: "Resilience-Building Strategies",
    affirmation: "Today's Affirmation",
    restart: "Retake Test",
    share: "Share Result",
    copied: "Link copied!",
    warning: "If low resilience persists, it can lead to burnout or depression. Consider seeking professional counseling.",
    note: "This test is based on psychological research on resilience and is intended as a self-understanding reference.",
  },
  ja: {
    title: "回復力自己診断",
    subtitle: "逆境からどれくらいうまく立ち直れますか？",
    scale: "この文章はどれくらい自分をよく表していますか？",
    progress: "質問",
    resultTitle: "私の回復力レベル",
    score: "スコア",
    strengths: "私の強み",
    strategies: "回復力強化戦略",
    affirmation: "今日のアファメーション",
    restart: "もう一度テストする",
    share: "結果を共有",
    copied: "リンクをコピーしました！",
    warning: "回復力が低い状態が続くと、バーンアウトやうつにつながることがあります。専門的なカウンセリングを受けることを検討してください。",
    note: "このテストは回復力に関する心理学研究に基づいており、自己理解のための参考資料です。",
  },
};

function getLevel(score: number): ResLevel {
  if (score >= 32) return "high";
  if (score >= 18) return "medium";
  return "low";
}

export default function ResilienceTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const t = ui[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ level: ResLevel; score: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rl = params.get("rl") as ResLevel | null;
    const rs = params.get("rs");
    if (rl && rl in levelData && rs) setResult({ level: rl, score: parseInt(rs, 10) });
  }, []);

  function pick(score: number) {
    const next = [...answers, score];
    if (next.length < questions.length) {
      setAnswers(next);
      setTimeout(() => setIdx(next.length), 280);
    } else {
      const total = next.reduce((a, b) => a + b, 0);
      const level = getLevel(total);
      setAnswers(next);
      setResult({ level, score: total });
      const url = new URL(window.location.href);
      url.searchParams.set("rl", level);
      url.searchParams.set("rs", String(total));
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0);
    setAnswers([]);
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("rl");
    url.searchParams.delete("rs");
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
    const d = levelData[result.level];
    const maxScore = questions.length * 4; // 40
    const pct = Math.round((result.score / maxScore) * 100);

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{t.resultTitle}</h1>
          <div className="inline-block px-4 py-2 rounded-full text-white font-semibold"
            style={{ backgroundColor: d.color }}>
            {d.label[locale]}
          </div>
        </div>

        <div className={`${d.bg} ${d.border} border rounded-xl p-5 space-y-2`}>
          <div className="flex justify-between text-sm font-medium text-gray-600">
            <span>{t.score}: {result.score} / {maxScore}</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="h-3 rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: d.color }} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-gray-700 leading-relaxed">{d.description[locale]}</p>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">✓ {t.strengths}</h3>
            <ul className="space-y-1">
              {d.strengths[locale].map((s, i) => (
                <li key={i} className="text-sm text-gray-700">• {s}</li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">🌱 {t.strategies}</h3>
            <ul className="space-y-1">
              {d.strategies[locale].map((s, i) => (
                <li key={i} className="text-sm text-blue-700">• {s}</li>
              ))}
            </ul>
          </div>

          {result.level === "low" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">⚠️ {t.warning}</p>
            </div>
          )}

          <div className="text-center py-3 rounded-lg" style={{ backgroundColor: d.color + "15" }}>
            <p className="text-sm italic" style={{ color: d.color }}>"{d.affirmation[locale]}"</p>
            <p className="text-xs text-gray-400 mt-1">{t.affirmation}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">{t.note}</p>

        <div className="flex gap-3 justify-center">
          <button onClick={restart}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-colors text-sm">
            {t.restart}
          </button>
          <button onClick={share}
            className="px-5 py-2 text-white rounded-full font-medium transition-colors text-sm"
            style={{ backgroundColor: d.color }}>
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
          <div className="bg-emerald-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 shadow-sm">
        <p className="text-base font-medium text-gray-800 leading-relaxed">{q[locale]}</p>
        <p className="text-xs text-gray-400">{t.scale}</p>
        <div className="space-y-2">
          {scaleLabels[locale].map((label, i) => (
            <button key={i} onClick={() => pick(i)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-left">
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
