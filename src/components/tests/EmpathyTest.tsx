import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type EmpathyType = "cognitive" | "affective" | "compassionate";

interface Question {
  ko: string;
  en: string;
  ja: string;
  type: EmpathyType;
}

const questions: Question[] = [
  // Cognitive empathy — understanding perspective
  { ko: "나는 상대방의 입장에서 상황을 이해하려고 의식적으로 노력한다.", en: "I consciously try to understand situations from the other person's perspective.", ja: "相手の立場から状況を理解しようと意識的に努力する。", type: "cognitive" },
  { ko: "나는 대화할 때 상대가 무슨 말을 하려는지 파악하는 데 능숙하다.", en: "I'm good at figuring out what someone is trying to say in conversation.", ja: "会話の中で、相手が何を言おうとしているかを把握するのが得意だ。", type: "cognitive" },
  { ko: "나는 의견이 다른 사람도 그 사람의 논리로 이해하려고 노력한다.", en: "Even with someone who disagrees, I try to understand them through their own logic.", ja: "意見が違う人でも、その人の論理で理解しようと努力する。", type: "cognitive" },
  { ko: "나는 복잡한 감정 상황에서도 상대의 감정 이유를 분석할 수 있다.", en: "Even in complex emotional situations, I can analyze why the other person feels that way.", ja: "複雑な感情状況でも、相手の感情の理由を分析できる。", type: "cognitive" },
  // Affective empathy — feeling with
  { ko: "나는 다른 사람이 슬퍼하면 나도 감정이 흔들린다.", en: "When others are sad, my own emotions are affected too.", ja: "他の人が悲しむと、自分も感情が揺れる。", type: "affective" },
  { ko: "타인의 감동적인 이야기나 영상을 보면 쉽게 눈물이 나온다.", en: "I easily tear up watching touching stories or videos about others.", ja: "他者の感動的な話や映像を見ると、すぐに涙が出る。", type: "affective" },
  { ko: "주변 사람이 불안하거나 초조하면 나도 덩달아 긴장된다.", en: "When people around me are anxious or nervous, I feel tense too.", ja: "周りの人が不安や焦りを感じていると、自分も緊張する。", type: "affective" },
  { ko: "나는 감정 표현이 풍부하고 상대의 기분에 쉽게 공명한다.", en: "I'm emotionally expressive and easily resonate with others' moods.", ja: "感情表現が豊かで、相手の気分に簡単に共鳴する。", type: "affective" },
  // Compassionate empathy — action-oriented care
  { ko: "나는 힘든 사람을 보면 어떻게든 도움이 되고 싶어 행동으로 옮긴다.", en: "When I see someone struggling, I act to help them in some way.", ja: "辛そうな人を見ると、何とか役に立とうと行動に移す。", type: "compassionate" },
  { ko: "상대의 감정을 공감한 후 실질적인 도움을 주려고 노력한다.", en: "After empathizing with someone's feelings, I strive to offer practical help.", ja: "相手の感情に共感した後、実質的な助けを提供しようと努力する。", type: "compassionate" },
  { ko: "나는 힘든 친구에게 먼저 연락해서 안부를 묻는 편이다.", en: "I tend to reach out first to friends who are having a hard time.", ja: "辛い友人に先に連絡して様子を聞く方だ。", type: "compassionate" },
  { ko: "고통받는 사람을 위해 내가 희생하거나 불편을 감수하는 것을 두려워하지 않는다.", en: "I don't fear sacrifice or inconvenience for the sake of someone in pain.", ja: "苦しんでいる人のために自分が犠牲になったり不便を我慢することを恐れない。", type: "compassionate" },
];

const scaleLabels: Record<SupportedLocale, string[]> = {
  ko: ["전혀 아니다", "아니다", "보통", "그렇다", "매우 그렇다"],
  en: ["Not at all", "Rarely", "Neutral", "Often", "Very much so"],
  ja: ["全くない", "ほとんどない", "普通", "よくある", "とてもそうだ"],
};

interface TypeInfo {
  name: Record<SupportedLocale, string>;
  color: string;
  description: Record<SupportedLocale, string>;
  strengths: Record<SupportedLocale, string[]>;
  risks: Record<SupportedLocale, string[]>;
  growth: Record<SupportedLocale, string>;
}

const typeInfo: Record<EmpathyType, TypeInfo> = {
  cognitive: {
    name: { ko: "인지적 공감", en: "Cognitive Empathy", ja: "認知的共感" },
    color: "#3b82f6",
    description: {
      ko: "인지적 공감이 강한 당신은 타인의 입장과 생각을 이성적으로 이해하는 능력이 뛰어납니다. 감정에 휩쓸리지 않고 상황을 객관적으로 파악하며, 복잡한 인간관계에서 중재자 역할을 잘 합니다.",
      en: "With strong cognitive empathy, you excel at rationally understanding others' perspectives and thoughts. You objectively grasp situations without being swept up in emotions and are great at mediating complex relationships.",
      ja: "認知的共感が強いあなたは、他者の立場や考えを理性的に理解する能力が優れています。感情に流されず状況を客観的に把握し、複雑な人間関係で仲裁者の役割を果たすのが得意です。",
    },
    strengths: {
      ko: ["갈등 상황에서 중립적 시각 유지", "복잡한 관계를 객관적으로 분석", "감정에 치우치지 않는 의사결정"],
      en: ["Maintaining neutral perspective in conflicts", "Objectively analyzing complex relationships", "Making decisions without emotional bias"],
      ja: ["葛藤状況での中立的な視点の維持", "複雑な関係の客観的な分析", "感情に偏らない意思決定"],
    },
    risks: {
      ko: ["감정적 공감이 부족해 차갑게 보일 수 있음", "타인의 고통에 지나치게 무감각해질 수 있음"],
      en: ["May appear cold due to lack of emotional empathy", "Can become overly desensitized to others' pain"],
      ja: ["感情的共感が不足して冷たく見えることがある", "他者の苦痛に過度に無感覚になることがある"],
    },
    growth: {
      ko: "이해를 넘어 감정적 연결을 시도해보세요. 분석보다 먼저 '나도 그렇게 느낄 수 있겠구나'라고 말해보는 것이 관계를 더 깊게 만들어 줍니다.",
      en: "Try moving beyond understanding to emotional connection. Saying 'I can imagine feeling that way too' before analyzing helps deepen relationships.",
      ja: "理解を超えて感情的なつながりを試みてください。分析より先に「私もそう感じるかもしれない」と言うことが、関係をより深めてくれます。",
    },
  },
  affective: {
    name: { ko: "정서적 공감", en: "Affective Empathy", ja: "情動的共感" },
    color: "#ec4899",
    description: {
      ko: "정서적 공감이 강한 당신은 타인의 감정을 자신의 것처럼 느끼는 능력이 뛰어납니다. 주변 사람들의 감정에 깊이 공명하며, 존재만으로도 상대에게 위로가 됩니다. 다만 감정 소진에 주의가 필요합니다.",
      en: "With strong affective empathy, you feel others' emotions as if they were your own. You deeply resonate with those around you and your presence alone is comforting. Watch out for emotional exhaustion, however.",
      ja: "情動的共感が強いあなたは、他者の感情を自分のものように感じる能力が優れています。周りの人の感情に深く共鳴し、存在するだけで相手への慰めになります。ただし、感情消耗に注意が必要です。",
    },
    strengths: {
      ko: ["타인의 감정에 즉각적으로 반응", "존재만으로도 위로가 되는 따뜻함", "깊은 정서적 유대감 형성"],
      en: ["Immediate response to others' emotions", "Warmth that comforts through mere presence", "Forming deep emotional bonds"],
      ja: ["他者の感情への即座の反応", "存在だけで慰めになる温かさ", "深い情動的絆の形成"],
    },
    risks: {
      ko: ["타인의 부정적 감정에 쉽게 전염될 수 있음", "감정 소진과 번아웃 위험", "자신의 감정과 타인의 감정 구분이 어려울 수 있음"],
      en: ["Easily affected by others' negative emotions", "Risk of emotional exhaustion and burnout", "May struggle to distinguish own feelings from others'"],
      ja: ["他者のネガティブな感情に簡単に感染することがある", "感情消耗とバーンアウトのリスク", "自分の感情と他者の感情の区別が難しいことがある"],
    },
    growth: {
      ko: "감정적 공감은 소중한 선물이지만 나를 지키는 것도 중요합니다. '공감'과 '감정 흡수'를 구분하고, 정기적으로 혼자만의 회복 시간을 가져보세요.",
      en: "Affective empathy is a precious gift, but protecting yourself matters too. Learn to distinguish 'empathy' from 'emotional absorption,' and take regular time alone to recover.",
      ja: "情動的共感は貴重な贈り物ですが、自分を守ることも重要です。「共感」と「感情吸収」を区別し、定期的に一人で回復する時間を持ちましょう。",
    },
  },
  compassionate: {
    name: { ko: "자비적 공감", en: "Compassionate Empathy", ja: "思いやり的共感" },
    color: "#10b981",
    description: {
      ko: "자비적 공감이 강한 당신은 이해와 감정을 넘어 실제 행동으로 타인을 돕는 능력이 뛰어납니다. 공감을 행동으로 전환하는 능력이 있어, 힘든 사람에게 실질적인 변화를 만들어 줄 수 있습니다.",
      en: "With strong compassionate empathy, you excel at helping others through action, beyond just understanding or feeling. Your ability to translate empathy into action creates real change for people in need.",
      ja: "思いやり的共感が強いあなたは、理解や感情を超えて実際の行動で他者を助ける能力が優れています。共感を行動に転換する能力があり、困っている人に実質的な変化をもたらすことができます。",
    },
    strengths: {
      ko: ["공감을 행동으로 전환하는 능력", "타인의 실질적 변화에 기여", "신뢰와 존경을 받는 관계 형성"],
      en: ["Ability to translate empathy into action", "Contributing to real change for others", "Building relationships built on trust and respect"],
      ja: ["共感を行動に転換する能力", "他者の実質的な変化への貢献", "信頼と尊敬に基づく関係の形成"],
    },
    risks: {
      ko: ["과도한 돌봄으로 번아웃 위험", "자신의 필요를 뒤로 미루는 경향", "도움에 대한 기대나 의존 관계 형성 가능"],
      en: ["Risk of burnout from excessive caregiving", "Tendency to postpone own needs", "May create expectations or dependency in relationships"],
      ja: ["過度な世話によるバーンアウトのリスク", "自分のニーズを後回しにする傾向", "助けに対する期待や依存関係が生まれることがある"],
    },
    growth: {
      ko: "당신의 행동하는 공감은 세상을 바꿉니다. 다만 자신을 먼저 채워야 더 많이 줄 수 있습니다. 도움의 경계를 설정하는 것이 이기적인 것이 아님을 기억하세요.",
      en: "Your compassion in action changes the world. But you need to fill yourself first to give more. Remember that setting boundaries for helping is not selfish.",
      ja: "行動する共感は世界を変えます。しかし、自分を満たしてこそより多く与えられます。助けの境界線を設定することは自己中心的ではないことを覚えてください。",
    },
  },
};

const ui: Record<SupportedLocale, {
  title: string;
  subtitle: string;
  scale: string;
  progress: string;
  resultTitle: string;
  yourType: string;
  allTypes: string;
  growth: string;
  restart: string;
  share: string;
  copied: string;
  note: string;
}> = {
  ko: {
    title: "공감 능력 유형 테스트",
    subtitle: "나의 공감 방식 — 인지형, 정서형, 자비형",
    scale: "이 문장에 얼마나 동의하시나요?",
    progress: "질문",
    resultTitle: "나의 공감 유형",
    yourType: "주요 공감 유형",
    allTypes: "유형별 점수",
    growth: "성장 포인트",
    restart: "다시 테스트하기",
    share: "결과 공유",
    copied: "링크가 복사되었습니다!",
    note: "이 테스트는 세 가지 공감 유형(인지적·정서적·자비적 공감)에 기반하며, 자기 이해를 위한 참고 자료입니다.",
  },
  en: {
    title: "Empathy Type Test",
    subtitle: "My empathy style — Cognitive, Affective, or Compassionate",
    scale: "How much do you agree with this statement?",
    progress: "Question",
    resultTitle: "My Empathy Type",
    yourType: "Primary Empathy Type",
    allTypes: "Scores by Type",
    growth: "Growth Point",
    restart: "Retake Test",
    share: "Share Result",
    copied: "Link copied!",
    note: "This test is based on three empathy types (cognitive, affective, and compassionate empathy) and is intended as a self-understanding reference.",
  },
  ja: {
    title: "共感能力タイプテスト",
    subtitle: "私の共感スタイル — 認知型、情動型、思いやり型",
    scale: "この文章にどれくらい同意しますか？",
    progress: "質問",
    resultTitle: "私の共感タイプ",
    yourType: "主要共感タイプ",
    allTypes: "タイプ別スコア",
    growth: "成長ポイント",
    restart: "もう一度テストする",
    share: "結果を共有",
    copied: "リンクをコピーしました！",
    note: "このテストは3つの共感タイプ（認知的・情動的・思いやり的共感）に基づいており、自己理解のための参考資料です。",
  },
};

export default function EmpathyTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const t = ui[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<EmpathyType | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const em = params.get("em") as EmpathyType | null;
    if (em && em in typeInfo) setResult(em);
  }, []);

  function pick(score: number) {
    const next = [...answers, score];
    if (next.length < questions.length) {
      setAnswers(next);
      setTimeout(() => setIdx(next.length), 280);
    } else {
      const scores: Record<EmpathyType, number> = { cognitive: 0, affective: 0, compassionate: 0 };
      questions.forEach((q, i) => { scores[q.type] += next[i]; });
      const dominant = (Object.keys(scores) as EmpathyType[]).reduce((a, b) => scores[a] >= scores[b] ? a : b);
      setAnswers(next);
      setResult(dominant);
      const url = new URL(window.location.href);
      url.searchParams.set("em", dominant);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0);
    setAnswers([]);
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("em");
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
    const scores: Record<EmpathyType, number> = { cognitive: 0, affective: 0, compassionate: 0 };
    questions.forEach((q, i) => { scores[q.type] += answers[i] ?? 0; });
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    const info = typeInfo[result];

    const chartData = (["cognitive", "affective", "compassionate"] as EmpathyType[]).map((type) => ({
      name: typeInfo[type].name[locale],
      value: scores[type],
      pct: Math.round((scores[type] / total) * 100),
      color: typeInfo[type].color, fill: typeInfo[type].color,
    })).sort((a, b) => b.value - a.value);

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{t.resultTitle}</h1>
          <div className="inline-block px-4 py-2 rounded-full text-white font-semibold text-lg"
            style={{ backgroundColor: info.color }}>
            {info.name[locale]}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">{t.allTypes}</h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 24 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
              <Tooltip formatter={((v: number) => `${v}점`) as any} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-gray-700 leading-relaxed">{info.description[locale]}</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✓ Strengths</h3>
              <ul className="space-y-1">
                {info.strengths[locale].map((s, i) => (
                  <li key={i} className="text-sm text-green-700">• {s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <h3 className="font-semibold text-amber-800 mb-2">⚠ Watch out</h3>
              <ul className="space-y-1">
                {info.risks[locale].map((r, i) => (
                  <li key={i} className="text-sm text-amber-700">• {r}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-1">🌱 {t.growth}</h3>
            <p className="text-sm text-blue-700">{info.growth[locale]}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">{t.note}</p>

        <div className="flex gap-3 justify-center">
          <button onClick={restart}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium transition-colors text-sm">
            {t.restart}
          </button>
          <button onClick={share}
            className="px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-medium transition-colors text-sm">
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
          <div className="bg-pink-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 shadow-sm">
        <p className="text-base font-medium text-gray-800 leading-relaxed">{q[locale]}</p>
        <p className="text-xs text-gray-400">{t.scale}</p>
        <div className="space-y-2">
          {scaleLabels[locale].map((label, i) => (
            <button key={i} onClick={() => pick(i)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-pink-300 hover:bg-pink-50 transition-colors text-left">
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
