import { useState, useEffect } from "react";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type PerfType = "healthy" | "self_oriented" | "other_oriented" | "socially_prescribed";

interface Question {
  ko: string;
  en: string;
  ja: string;
  type: PerfType;
}

const questions: Question[] = [
  // healthy perfectionism — high standards, flexible
  { ko: "나는 높은 목표를 세우지만 결과가 완벽하지 않아도 노력한 것에 만족한다.", en: "I set high goals but feel satisfied with my effort even if the result isn't perfect.", ja: "高い目標を設定するが、結果が完璧でなくても努力したことに満足する。", type: "healthy" },
  { ko: "일을 잘하고 싶은 마음이 강하지만, 실수를 배움의 기회로 받아들인다.", en: "I strongly want to do well, but I accept mistakes as learning opportunities.", ja: "仕事をうまくやりたい気持ちが強いが、ミスを学びの機会として受け入れる。", type: "healthy" },
  // self_oriented — inner driven perfectionism
  { ko: "나 자신이 세운 기준에 못 미치면 강한 실망감과 자책을 느낀다.", en: "When I fall short of my own standards, I feel strong disappointment and self-blame.", ja: "自分が設定した基準に達しないと、強い失望感と自責を感じる。", type: "self_oriented" },
  { ko: "무슨 일이든 '최고'가 아니면 아예 하지 않거나 계속 수정하고 싶어진다.", en: "With anything I do, if it's not the 'best,' I want to either skip it or keep revising.", ja: "何事も「最高」でなければ、やめるか、ずっと修正し続けたくなる。", type: "self_oriented" },
  { ko: "나는 스스로에게 매우 엄격하고, 작은 실수도 오랫동안 마음에 걸린다.", en: "I'm very strict with myself, and small mistakes bother me for a long time.", ja: "自分自身にとても厳しく、小さなミスも長い間気になる。", type: "self_oriented" },
  // other_oriented — imposing perfection on others
  { ko: "다른 사람이 내 기준에 못 미치는 일을 하면 답답하거나 짜증이 난다.", en: "When others do things that fall short of my standards, I feel frustrated or annoyed.", ja: "他の人が自分の基準に達しないことをすると、もどかしさや苛立ちを感じる。", type: "other_oriented" },
  { ko: "팀 작업에서 내가 직접 하는 것이 더 정확하다고 느껴 혼자 하고 싶어진다.", en: "In teamwork, I feel doing it myself would be more accurate, so I want to work alone.", ja: "チーム作業では、自分でやる方が正確だと感じて、一人でやりたくなる。", type: "other_oriented" },
  // socially_prescribed — others expect perfection of me
  { ko: "다른 사람들이 나에게 완벽한 결과를 기대한다고 느낀다.", en: "I feel that others expect perfect results from me.", ja: "他の人が自分に完璧な結果を期待していると感じる。", type: "socially_prescribed" },
  { ko: "실수하면 주변 사람들이 나를 무능하거나 부족하게 볼까봐 두렵다.", en: "I fear that if I make mistakes, others will see me as incompetent or inadequate.", ja: "ミスをすると、周りの人が自分を無能や不十分に見ないか怖い。", type: "socially_prescribed" },
  { ko: "내가 실패하면 주변의 기대를 저버리는 것 같아 죄책감이 생긴다.", en: "When I fail, I feel guilty as if I've let down those around me.", ja: "失敗すると、周囲の期待を裏切るような罪悪感が生まれる。", type: "socially_prescribed" },
];

const scaleLabels: Record<SupportedLocale, string[]> = {
  ko: ["전혀 아니다", "아니다", "보통", "그렇다", "매우 그렇다"],
  en: ["Not at all", "Not really", "Neutral", "Agree", "Strongly agree"],
  ja: ["全くない", "そうでない", "普通", "そうだ", "とてもそうだ"],
};

interface TypeData {
  name: Record<SupportedLocale, string>;
  tagline: Record<SupportedLocale, string>;
  color: string;
  bg: string;
  description: Record<SupportedLocale, string>;
  strengths: Record<SupportedLocale, string[]>;
  pitfalls: Record<SupportedLocale, string[]>;
  advice: Record<SupportedLocale, string>;
  affirmation: Record<SupportedLocale, string>;
}

const typeData: Record<PerfType, TypeData> = {
  healthy: {
    name: { ko: "건강한 완벽주의", en: "Healthy Perfectionism", ja: "健全な完璧主義" },
    tagline: { ko: "높은 기준 + 유연한 마음", en: "High Standards + Flexible Mind", ja: "高い基準 + 柔軟な心" },
    color: "#10b981",
    bg: "bg-emerald-50",
    description: {
      ko: "당신은 높은 기준을 추구하지만 결과에 지나치게 집착하지 않는 건강한 완벽주의자입니다. 성장 지향적이며, 실수를 통해 배우는 능력이 있습니다. 이 성향은 높은 성취와 심리적 안정을 동시에 유지하는 데 도움이 됩니다.",
      en: "You're a healthy perfectionist who pursues high standards without obsessing over results. You're growth-oriented and able to learn from mistakes. This trait helps you maintain both high achievement and psychological stability.",
      ja: "あなたは高い基準を追求しながら結果に過度に執着しない健全な完璧主義者です。成長志向で、ミスから学ぶ能力があります。この傾向は高い成果と心理的安定を同時に維持するのに役立ちます。",
    },
    strengths: {
      ko: ["지속적인 성장과 개선 추구", "실수에서 배우는 회복력", "성취감과 자기 효능감 높음"],
      en: ["Pursuit of continuous growth and improvement", "Resilience to learn from mistakes", "High sense of achievement and self-efficacy"],
      ja: ["継続的な成長と改善の追求", "ミスから学ぶ回復力", "達成感と自己効力感が高い"],
    },
    pitfalls: {
      ko: ["기준이 지나치게 높아질 경우 압박감 증가", "타인의 낮은 기준에 불만을 느낄 수 있음"],
      en: ["Pressure increases if standards become too high", "May feel dissatisfied with others' lower standards"],
      ja: ["基準が高くなりすぎると圧迫感が増す", "他者の低い基準に不満を感じることがある"],
    },
    advice: {
      ko: "지금의 균형을 유지하는 것 자체가 큰 성취입니다. 자신에게도 타인에게도 '충분히 잘했다'고 말하는 연습을 계속해 보세요.",
      en: "Maintaining your current balance is itself a great achievement. Keep practicing telling yourself and others 'that was good enough.'",
      ja: "現在のバランスを維持すること自体が大きな成果です。自分にも他者にも「十分よくできた」と言う練習を続けてみてください。",
    },
    affirmation: {
      ko: "나는 완벽하지 않아도 충분히 가치 있는 사람입니다.",
      en: "I am enough and worthy, even without being perfect.",
      ja: "完璧でなくても、私は十分に価値のある人間です。",
    },
  },
  self_oriented: {
    name: { ko: "자기 지향 완벽주의", en: "Self-Oriented Perfectionism", ja: "自己指向完璧主義" },
    tagline: { ko: "내 기준이 가장 엄격한 심판관", en: "My own standards are the harshest judge", ja: "自分の基準が最も厳しい審判者" },
    color: "#6366f1",
    bg: "bg-indigo-50",
    description: {
      ko: "당신은 스스로에게 매우 높은 기준을 적용하며, 기준에 미치지 못할 때 강한 자책을 경험합니다. 높은 동기 부여와 성취를 가져오지만, 지나치면 만성적인 스트레스와 자기 비하로 이어질 수 있습니다.",
      en: "You apply very high standards to yourself and experience strong self-blame when falling short. This brings high motivation and achievement, but excessive self-orientation can lead to chronic stress and self-criticism.",
      ja: "自分に非常に高い基準を適用し、基準に達しないと強い自責を経験します。高い動機付けと成果をもたらしますが、過度になると慢性的なストレスと自己批判につながることがあります。",
    },
    strengths: {
      ko: ["높은 내적 동기와 자기 주도성", "탁월한 품질의 결과물 생산", "스스로를 끊임없이 발전시키는 의지"],
      en: ["High intrinsic motivation and self-direction", "Producing excellent quality results", "Will to continuously develop oneself"],
      ja: ["高い内的動機と自己主導性", "優れた品質の成果物の生産", "絶えず自己を発展させる意志"],
    },
    pitfalls: {
      ko: ["만성적인 자책과 낮은 자기 수용", "완료보다 완벽에 집착하는 경향", "번아웃과 정서적 소진 위험"],
      en: ["Chronic self-blame and low self-acceptance", "Tendency to obsess over perfection over completion", "Risk of burnout and emotional exhaustion"],
      ja: ["慢性的な自責と低い自己受容", "完了より完璧にこだわる傾向", "バーンアウトと感情的消耗のリスク"],
    },
    advice: {
      ko: "'완료'가 '완벽'보다 나을 때가 있습니다. 80% 완성된 것을 세상에 내놓는 연습이 필요합니다. 자신에게 친구에게 하듯 따뜻한 말을 건네보세요.",
      en: "'Done' is sometimes better than 'perfect.' Practice putting 80%-complete work out into the world. Speak to yourself with the warmth you'd offer a friend.",
      ja: "「完了」が「完璧」より良い時があります。80%完成したものを世に出す練習が必要です。友人に話すような温かい言葉を自分にかけてみてください。",
    },
    affirmation: {
      ko: "나는 완벽하지 않아도 사랑받고 인정받을 자격이 있습니다.",
      en: "I deserve love and recognition even without being perfect.",
      ja: "完璧でなくても、私は愛され認められる資格があります。",
    },
  },
  other_oriented: {
    name: { ko: "타인 지향 완벽주의", en: "Other-Oriented Perfectionism", ja: "他者指向完璧主義" },
    tagline: { ko: "타인에게도 높은 기준을 요구", en: "Holding others to high standards", ja: "他者にも高い基準を求める" },
    color: "#f59e0b",
    bg: "bg-amber-50",
    description: {
      ko: "당신은 자신뿐 아니라 주변 사람들에게도 높은 기준을 기대합니다. 품질에 대한 감각이 뛰어나지만, 타인의 실수에 지나치게 비판적이거나 협력이 어려워지는 경향이 있을 수 있습니다.",
      en: "You have high expectations not just for yourself but for others too. While you have a keen sense of quality, you may tend to be overly critical of others' mistakes or struggle with collaboration.",
      ja: "自分だけでなく周りの人にも高い基準を期待します。品質への感覚が優れていますが、他者のミスに過度に批判的になったり、協力が難しくなる傾向があることがあります。",
    },
    strengths: {
      ko: ["높은 품질 기준 유지 능력", "팀의 성과를 끌어올리는 추진력", "세부 사항에 대한 예리한 시각"],
      en: ["Ability to maintain high quality standards", "Drive to elevate team performance", "Sharp eye for detail"],
      ja: ["高い品質基準を維持する能力", "チームのパフォーマンスを引き上げる推進力", "細部への鋭い視点"],
    },
    pitfalls: {
      ko: ["타인과의 갈등 및 신뢰 손상 위험", "위임이나 협업이 어려울 수 있음", "주변 사람들을 지치게 만들 수 있음"],
      en: ["Risk of conflict and eroded trust with others", "Difficulty delegating or collaborating", "May exhaust those around you"],
      ja: ["他者との葛藤と信頼損傷のリスク", "委任や協業が難しいことがある", "周りの人を疲弊させることがある"],
    },
    advice: {
      ko: "타인이 당신과 같은 방식으로 할 수 없을 수도 있습니다. '다르게 하는 것'이 '틀린 것'이 아님을 기억하세요. 각 사람의 방식을 존중할 때 더 강한 팀이 됩니다.",
      en: "Others may not be able to do things the same way you do. Remember that doing things 'differently' isn't doing them 'wrong.' Teams grow stronger when you respect each person's approach.",
      ja: "他者があなたと同じ方法ではできないことがあります。「違う方法」が「間違い」ではないことを覚えてください。各人のやり方を尊重するとき、より強いチームになります。",
    },
    affirmation: {
      ko: "다양한 방식과 속도가 모여 더 풍요로운 결과를 만듭니다.",
      en: "Different approaches and paces come together to create richer results.",
      ja: "様々な方法とペースが集まって、より豊かな結果を生み出します。",
    },
  },
  socially_prescribed: {
    name: { ko: "사회적 완벽주의", en: "Socially Prescribed Perfectionism", ja: "社会的完璧主義" },
    tagline: { ko: "타인의 기대가 나를 옥죄는 느낌", en: "Others' expectations feel like a cage", ja: "他者の期待が自分を締め付ける感覚" },
    color: "#ef4444",
    bg: "bg-red-50",
    description: {
      ko: "당신은 타인이 자신에게 완벽한 모습을 기대한다고 느끼며, 실망시킬까봐 두려워합니다. 이 유형은 세 가지 완벽주의 중 가장 심리적 위험이 높습니다. 불안, 낮은 자존감, 우울과 연관될 수 있습니다.",
      en: "You feel that others expect perfection from you and fear disappointing them. This type carries the highest psychological risk among the three. It can be associated with anxiety, low self-esteem, and depression.",
      ja: "他者が自分に完璧な姿を期待していると感じ、失望させることを恐れています。このタイプは3つの完璧主義の中で最も心理的リスクが高いです。不安、低い自尊感情、うつと関連することがあります。",
    },
    strengths: {
      ko: ["책임감과 신뢰성이 높음", "타인의 필요에 민감하게 반응", "협조적이고 갈등을 피하려는 성향"],
      en: ["High sense of responsibility and reliability", "Sensitive to others' needs", "Cooperative and conflict-avoiding nature"],
      ja: ["責任感と信頼性が高い", "他者のニーズに敏感", "協調的で葛藤を避ける性向"],
    },
    pitfalls: {
      ko: ["만성적인 불안과 두려움", "자신의 진짜 욕구를 억압", "실패 시 자존감 급락 위험"],
      en: ["Chronic anxiety and fear", "Suppressing genuine desires", "Risk of self-esteem crash upon failure"],
      ja: ["慢性的な不安と恐れ", "本当の欲求の抑圧", "失敗時に自尊感情が急落するリスク"],
    },
    advice: {
      ko: "다른 사람들이 당신에게 기대하는 것이 실제로 그들이 생각하는 것이 아닐 수 있습니다. 자신의 기준으로 삶을 평가하는 연습이 필요합니다. 전문적인 심리 상담도 큰 도움이 됩니다.",
      en: "What you think others expect of you may not reflect what they actually think. You need practice evaluating life by your own standards. Professional counseling can also be very helpful.",
      ja: "他者があなたに期待していることが、実際に彼らが考えていることでないかもしれません。自分の基準で人生を評価する練習が必要です。専門的な心理カウンセリングも大きな助けになります。",
    },
    affirmation: {
      ko: "나는 타인의 기대가 아닌 나 자신의 가치로 나를 정의합니다.",
      en: "I define myself by my own values, not others' expectations.",
      ja: "私は他者の期待ではなく、自分自身の価値で自分を定義します。",
    },
  },
};

const ui: Record<SupportedLocale, {
  title: string;
  subtitle: string;
  scale: string;
  progress: string;
  resultTitle: string;
  strengths: string;
  pitfalls: string;
  advice: string;
  affirmation: string;
  restart: string;
  share: string;
  copied: string;
  warning: string;
  note: string;
}> = {
  ko: {
    title: "완벽주의 유형 테스트",
    subtitle: "나의 완벽주의는 건강한가요?",
    scale: "이 문장이 나를 얼마나 잘 설명하나요?",
    progress: "질문",
    resultTitle: "나의 완벽주의 유형",
    strengths: "강점",
    pitfalls: "주의할 점",
    advice: "성장 조언",
    affirmation: "오늘의 확언",
    restart: "다시 테스트하기",
    share: "결과 공유",
    copied: "링크가 복사되었습니다!",
    warning: "사회적 완벽주의는 심리적 부담이 크므로, 지속적인 불안이나 우울감을 느낀다면 전문 상담을 받아보시기를 권합니다.",
    note: "이 테스트는 Hewitt & Flett의 완벽주의 이론을 참고하며, 자기 이해를 위한 참고 자료입니다.",
  },
  en: {
    title: "Perfectionism Type Test",
    subtitle: "Is your perfectionism healthy?",
    scale: "How well does this statement describe you?",
    progress: "Question",
    resultTitle: "My Perfectionism Type",
    strengths: "Strengths",
    pitfalls: "Watch out for",
    advice: "Growth Advice",
    affirmation: "Today's Affirmation",
    restart: "Retake Test",
    share: "Share Result",
    copied: "Link copied!",
    warning: "Socially prescribed perfectionism carries significant psychological burden. If you experience ongoing anxiety or depression, consider seeking professional counseling.",
    note: "This test references Hewitt & Flett's perfectionism theory and is intended as a self-understanding resource.",
  },
  ja: {
    title: "完璧主義タイプテスト",
    subtitle: "私の完璧主義は健全ですか？",
    scale: "この文章はどれくらい自分をよく表していますか？",
    progress: "質問",
    resultTitle: "私の完璧主義タイプ",
    strengths: "強み",
    pitfalls: "注意点",
    advice: "成長アドバイス",
    affirmation: "今日のアファメーション",
    restart: "もう一度テストする",
    share: "結果を共有",
    copied: "リンクをコピーしました！",
    warning: "社会的完璧主義は心理的負担が大きいため、継続的な不安やうつを感じているなら、専門的なカウンセリングを受けることをお勧めします。",
    note: "このテストはHewitt & Flettの完璧主義理論を参考にしており、自己理解のための参考資料です。",
  },
};

export default function PerfectionismTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const t = ui[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<PerfType | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pf = params.get("pf") as PerfType | null;
    if (pf && pf in typeData) setResult(pf);
  }, []);

  function pick(score: number) {
    const next = [...answers, score];
    if (next.length < questions.length) {
      setAnswers(next);
      setTimeout(() => setIdx(next.length), 280);
    } else {
      const scores: Record<PerfType, number> = { healthy: 0, self_oriented: 0, other_oriented: 0, socially_prescribed: 0 };
      questions.forEach((q, i) => { scores[q.type] += next[i]; });
      const dominant = (Object.keys(scores) as PerfType[]).reduce((a, b) => scores[a] >= scores[b] ? a : b);
      setAnswers(next);
      setResult(dominant);
      const url = new URL(window.location.href);
      url.searchParams.set("pf", dominant);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0);
    setAnswers([]);
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("pf");
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
    const d = typeData[result];

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{t.resultTitle}</h1>
          <div className="inline-block px-4 py-2 rounded-full text-white font-semibold"
            style={{ backgroundColor: d.color }}>
            {d.name[locale]}
          </div>
          <p className="text-sm text-gray-500 italic">{d.tagline[locale]}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-gray-700 leading-relaxed">{d.description[locale]}</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✓ {t.strengths}</h3>
              <ul className="space-y-1">
                {d.strengths[locale].map((s, i) => (
                  <li key={i} className="text-sm text-green-700">• {s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="font-semibold text-orange-800 mb-2">⚠ {t.pitfalls}</h3>
              <ul className="space-y-1">
                {d.pitfalls[locale].map((p, i) => (
                  <li key={i} className="text-sm text-orange-700">• {p}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-1">💡 {t.advice}</h3>
            <p className="text-sm text-blue-700">{d.advice[locale]}</p>
          </div>

          {result === "socially_prescribed" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">⚠️ {t.warning}</p>
            </div>
          )}

          <div className="rounded-lg p-4 text-center" style={{ backgroundColor: d.color + "15" }}>
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
