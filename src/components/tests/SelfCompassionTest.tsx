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

type SCLevel = "high" | "moderate_high" | "moderate_low" | "low";

interface Question {
  ko: string;
  en: string;
  ja: string;
  dimension: "self_kindness" | "common_humanity" | "mindfulness";
  reverse?: boolean; // self-judgment / isolation / over-identification items
}

// Kristin Neff's SCS-6 inspired — 3 dimensions x 4 questions
const questions: Question[] = [
  // Self-kindness
  { ko: "실수했을 때 스스로를 이해하고 따뜻하게 대하려고 한다", en: "When I make mistakes, I try to understand and be kind to myself", ja: "失敗したとき、自分を理解して優しく接しようとする", dimension: "self_kindness" },
  { ko: "어렵고 힘든 시간을 보낼 때 스스로를 돌보려고 한다", en: "I try to care for myself when going through difficult times", ja: "辛い時間を過ごすとき、自分を気にかけようとする", dimension: "self_kindness" },
  { ko: "실수했을 때 자신을 비판하고 질책하는 경향이 있다", en: "I tend to criticize and blame myself when I make mistakes", ja: "失敗したとき、自分を批判して責める傾向がある", dimension: "self_kindness", reverse: true },
  { ko: "고통스러울 때 자신에게 친절하지 못하다", en: "I am not kind to myself when I'm in pain", ja: "苦しいとき、自分に優しくできない", dimension: "self_kindness", reverse: true },

  // Common humanity
  { ko: "힘들 때 이런 어려움이 삶의 한 부분이라고 생각하며 나만 겪는 것이 아님을 안다", en: "When struggling, I see this difficulty as part of life, knowing I'm not alone", ja: "辛いとき、この困難は人生の一部であり、自分だけが経験することではないとわかる", dimension: "common_humanity" },
  { ko: "대부분의 사람들도 나와 비슷한 불충분함과 의심을 경험한다는 것을 이해한다", en: "I understand that most people experience similar feelings of inadequacy and doubt", ja: "ほとんどの人も自分と同じような不十分さや疑いを経験すると理解している", dimension: "common_humanity" },
  { ko: "힘들 때 나만 혼자 이런 어려움을 겪는 것 같은 느낌이 든다", en: "When struggling, I feel like I'm the only one dealing with these difficulties", ja: "辛いとき、自分だけがこんな困難を経験しているように感じる", dimension: "common_humanity", reverse: true },
  { ko: "나의 실패와 부족함으로 인해 다른 사람들로부터 고립된 느낌이 든다", en: "I feel isolated from others because of my failures and inadequacies", ja: "自分の失敗や不十分さのせいで他の人から孤立しているように感じる", dimension: "common_humanity", reverse: true },

  // Mindfulness
  { ko: "고통스러운 감정이 생길 때 균형 잡힌 관점을 유지하려고 한다", en: "When painful feelings arise, I try to maintain a balanced perspective", ja: "苦しい感情が生じるとき、バランスの取れた視点を保とうとする", dimension: "mindfulness" },
  { ko: "부정적인 생각이나 감정에 지나치게 몰두하지 않으려고 한다", en: "I try not to get too absorbed in negative thoughts or feelings", ja: "ネガティブな考えや感情に過度に没頭しないようにする", dimension: "mindfulness" },
  { ko: "기분이 안 좋을 때 집착하고 모든 게 잘못되어 가고 있다는 생각에 사로잡힌다", en: "When I feel bad, I obsess and get caught up in thinking everything is going wrong", ja: "気分が悪いとき、こだわりすぎ、すべてがうまくいっていないという考えにとらわれる", dimension: "mindfulness", reverse: true },
  { ko: "중요한 일이 잘못되면 감정적으로 완전히 압도당하는 경향이 있다", en: "When something important goes wrong, I tend to be completely overwhelmed emotionally", ja: "重要なことがうまくいかないと、感情的に完全に圧倒される傾向がある", dimension: "mindfulness", reverse: true },
];

const LEVELS: Record<SCLevel, {
  emoji: string;
  color: string;
  ko: { title: string; description: string; impact: string; tip: string };
  en: { title: string; description: string; impact: string; tip: string };
  ja: { title: string; description: string; impact: string; tip: string };
}> = {
  high: {
    emoji: "💛",
    color: "#10b981",
    ko: {
      title: "높은 자기연민",
      description: "당신은 자신에게 친구에게 대하듯 친절하게 대하고, 어려움이 삶의 공통적 경험임을 받아들이며, 고통스러운 감정을 균형 잡힌 시각으로 바라봅니다. 크리스틴 네프 박사의 연구에 따르면 높은 자기연민은 정신 건강의 강력한 보호 요인입니다.",
      impact: "낮은 불안과 우울감, 더 빠른 회복력, 더 안정적인 자아감, 더 나은 관계 만족도",
      tip: "이미 훌륭한 자기연민을 갖추고 있습니다. 어려운 시기에도 이 능력을 꾸준히 실천하고, 주변 사람들에게도 자기연민의 중요성을 공유해보세요.",
    },
    en: {
      title: "High Self-Compassion",
      description: "You treat yourself with the kindness you'd show a friend, accept that difficulties are part of the common human experience, and view painful emotions with balanced perspective. Dr. Kristin Neff's research shows high self-compassion is a powerful mental health protective factor.",
      impact: "Lower anxiety and depression, faster resilience, more stable sense of self, better relationship satisfaction",
      tip: "You already have excellent self-compassion. Continue practicing during difficult times and share the importance of self-compassion with those around you.",
    },
    ja: {
      title: "高い自己思いやり",
      description: "自分を友人に接するように優しく扱い、困難は人生の共通体験であることを受け入れ、苦しい感情をバランスの取れた視点で見つめます。クリスティン・ネフ博士の研究によれば、高い自己思いやりは精神健康の強力な保護因子です。",
      impact: "低い不安とうつ感、より速い回復力、より安定した自己感覚、より良い関係満足度",
      tip: "すでに優れた自己思いやりを持っています。困難な時期にもこの能力を継続的に実践し、周りの人々にも自己思いやりの重要性を共有しましょう。",
    },
  },
  moderate_high: {
    emoji: "🌼",
    color: "#3b82f6",
    ko: {
      title: "중상 수준의 자기연민",
      description: "자기연민의 기반이 잘 갖춰져 있습니다. 대체로 자신에게 친절하고 균형 잡힌 시각을 유지하지만, 특히 힘든 상황에서는 자기 비판이나 고립감이 나타날 수 있습니다.",
      impact: "정신 건강에 긍정적인 영향, 대부분의 어려움에서 건강하게 회복 가능",
      tip: "자기연민 명상(loving-kindness meditation)을 주기적으로 실천해보세요. '나는 행복하기를 바란다. 나는 고통에서 자유롭기를 바란다'와 같은 자기 자신을 위한 소원 목록을 만들어보세요.",
    },
    en: {
      title: "Moderate-High Self-Compassion",
      description: "You have a solid foundation of self-compassion. You're generally kind to yourself and maintain balanced perspective, but self-criticism or feelings of isolation may appear especially in difficult situations.",
      impact: "Positive impact on mental health; able to recover healthily from most difficulties",
      tip: "Practice loving-kindness meditation regularly. Create a 'wish list' for yourself: 'May I be happy. May I be free from suffering.'",
    },
    ja: {
      title: "中高程度の自己思いやり",
      description: "自己思いやりの基盤がしっかりと整っています。おおむね自分に優しくバランスの取れた視点を維持しますが、特に困難な状況では自己批判や孤立感が現れることがあります。",
      impact: "精神健康への良い影響；ほとんどの困難から健康的に回復できる",
      tip: "慈悲の瞑想（ラビングカインドネス瞑想）を定期的に実践しましょう。「私が幸せでありますように。私が苦しみから解放されますように」のような自分のための願いのリストを作りましょう。",
    },
  },
  moderate_low: {
    emoji: "🌱",
    color: "#f59e0b",
    ko: {
      title: "중하 수준의 자기연민",
      description: "자기연민이 일부 있지만, 자기 비판, 고립감, 또는 감정에 과몰입하는 패턴이 자주 나타납니다. 자신에게 타인에게 대하는 것보다 훨씬 가혹하게 대하는 경향이 있을 수 있습니다.",
      impact: "자기 비판이 스트레스와 불안을 증가시킬 수 있으며, 실패 후 회복이 더딜 수 있음",
      tip: "자신에 대해 말할 때 친한 친구에게 말하듯 말하는 연습을 해보세요. '나는 이걸 못 해'라고 말하게 된다면, '네가 나의 친한 친구라면 이런 상황에서 뭐라고 말해줄까?'를 자문해보세요.",
    },
    en: {
      title: "Moderate-Low Self-Compassion",
      description: "You have some self-compassion, but patterns of self-criticism, feelings of isolation, or over-identification with emotions appear frequently. You may tend to treat yourself much more harshly than you'd treat others.",
      impact: "Self-criticism can increase stress and anxiety; recovery after failure may be slower",
      tip: "Practice speaking to yourself as you'd speak to a close friend. When you catch yourself saying 'I can't do this,' ask yourself 'If a close friend were in this situation, what would I tell them?'",
    },
    ja: {
      title: "中低程度の自己思いやり",
      description: "ある程度の自己思いやりがありますが、自己批判、孤立感、感情への過度の没入パターンが頻繁に現れます。他の人に接するよりもはるかに自分に厳しく接する傾向があるかもしれません。",
      impact: "自己批判がストレスと不安を増加させる可能性があり、失敗後の回復が遅れることがある",
      tip: "自分について話すとき、親友に話すように練習しましょう。「私にはこれができない」と言いそうになったら、「もし親友がこんな状況にいたら、何と言うだろう？」と自問してみましょう。",
    },
  },
  low: {
    emoji: "🪴",
    color: "#ef4444",
    ko: {
      title: "낮은 자기연민",
      description: "현재 자신에게 매우 가혹한 기준을 적용하고, 어려움에서 혼자라는 느낌을 자주 받으며, 고통스러운 감정에 압도당하는 경향이 있습니다. 자기 비판이 동기를 높인다는 믿음이 있을 수 있지만, 연구는 오히려 반대임을 보여줍니다.",
      impact: "높은 불안, 우울 취약성, 실패 시 강한 수치심, 회복 지연",
      tip: "자기연민은 자기 방임이 아닙니다. 자기연민 훈련은 성과를 낮추지 않고 오히려 높입니다. 크리스틴 네프 박사의 '자기연민 명상(Self-Compassion Break)' 3단계: ① 이것이 고통의 순간이라는 것을 알아챈다 ② 고통은 삶의 한 부분이다 ③ 나에게 친절하게 대할 수 있다",
    },
    en: {
      title: "Low Self-Compassion",
      description: "You currently apply very harsh standards to yourself, frequently feel alone in difficulties, and tend to be overwhelmed by painful emotions. You may believe self-criticism raises motivation, but research shows the opposite.",
      impact: "High anxiety, vulnerability to depression, strong shame after failure, delayed recovery",
      tip: "Self-compassion is not self-indulgence. Self-compassion training doesn't lower performance — it raises it. Dr. Kristin Neff's 'Self-Compassion Break' 3 steps: ① Acknowledge 'This is a moment of suffering' ② 'Suffering is part of life' ③ 'I can be kind to myself'",
    },
    ja: {
      title: "低い自己思いやり",
      description: "現在、自分に非常に厳しい基準を適用し、困難の中で孤独を頻繁に感じ、苦しい感情に圧倒される傾向があります。自己批判が動機を高めるという信念があるかもしれませんが、研究は反対を示しています。",
      impact: "高い不安、うつへの脆弱性、失敗時の強い恥、回復の遅延",
      tip: "自己思いやりは自己甘やかしではありません。自己思いやりのトレーニングはパフォーマンスを下げるのではなく、むしろ上げます。クリスティン・ネフ博士の「自己思いやりの休憩」3ステップ：①「これは苦しみの瞬間」と気づく ②「苦しみは人生の一部」 ③「自分に優しくできる」",
    },
  },
};

const dimLabels: Record<string, Record<SupportedLocale, string>> = {
  self_kindness: { ko: "자기친절", en: "Self-Kindness", ja: "自己親切" },
  common_humanity: { ko: "보편적 인류", en: "Common Humanity", ja: "共通の人間性" },
  mindfulness: { ko: "마음챙김", en: "Mindfulness", ja: "マインドフルネス" },
};

const t = {
  ko: {
    title: "자기연민 테스트",
    subtitle: "나는 나 자신에게 얼마나 친절한가?",
    instruction: "각 문장이 자신에게 얼마나 해당하는지 선택해주세요",
    never: "거의 안 그렇다",
    rarely: "가끔 그렇다",
    sometimes: "자주 그렇다",
    often: "항상 그렇다",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "자기연민 진단 결과",
    yourScore: "총점",
    impact: "생활 영향",
    tip: "성장 팁",
    dimTitle: "3가지 요소별 점수",
    restart: "다시 하기",
    share: "결과 공유",
    copied: "복사됨!",
  },
  en: {
    title: "Self-Compassion Test",
    subtitle: "How Kind Are You to Yourself?",
    instruction: "Choose how much each statement applies to you",
    never: "Rarely",
    rarely: "Sometimes",
    sometimes: "Often",
    often: "Almost always",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "Self-Compassion Assessment",
    yourScore: "Total Score",
    impact: "Life Impact",
    tip: "Growth Tip",
    dimTitle: "Score by 3 Dimensions",
    restart: "Restart",
    share: "Share Result",
    copied: "Copied!",
  },
  ja: {
    title: "自己思いやりテスト",
    subtitle: "自分にどれくらい優しくしていますか？",
    instruction: "各文章がどれくらい自分に当てはまるか選んでください",
    never: "ほとんどそうでない",
    rarely: "時々そうだ",
    sometimes: "よくそうだ",
    often: "いつもそうだ",
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    resultTitle: "自己思いやり診断結果",
    yourScore: "合計点",
    impact: "生活への影響",
    tip: "成長のヒント",
    dimTitle: "3要素別スコア",
    restart: "もう一度",
    share: "結果をシェア",
    copied: "コピーされました！",
  },
};

function getLevel(score: number): SCLevel {
  if (score >= 38) return "high";
  if (score >= 28) return "moderate_high";
  if (score >= 18) return "moderate_low";
  return "low";
}

export default function SelfCompassionTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = t[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ level: SCLevel; score: number; dims: Record<string, number> } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const sc = p.get("sc") as SCLevel | null;
    const ss = p.get("ss");
    if (sc && ss && LEVELS[sc]) {
      setResult({ level: sc, score: parseInt(ss, 10), dims: {} });
    }
  }, []);

  const scoreOptions = [
    { label: tx.never, value: 1 },
    { label: tx.rarely, value: 2 },
    { label: tx.sometimes, value: 3 },
    { label: tx.often, value: 4 },
  ] as const;

  function pick(rawScore: number) {
    const q = questions[idx];
    const score = q.reverse ? 5 - rawScore : rawScore;
    const next = [...answers, score];

    if (next.length < questions.length) {
      setAnswers(next);
      setTimeout(() => setIdx(next.length), 280);
    } else {
      const total = next.reduce((a, b) => a + b, 0);
      const dims: Record<string, number> = { self_kindness: 0, common_humanity: 0, mindfulness: 0 };
      questions.forEach((q, i) => {
        dims[q.dimension] += next[i] ?? 0;
      });
      const level = getLevel(total);
      setResult({ level, score: total, dims });
      const url = new URL(window.location.href);
      url.searchParams.set("sc", level);
      url.searchParams.set("ss", String(total));
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0);
    setAnswers([]);
    setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("sc");
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

  const maxScore = questions.length * 4;

  if (result) {
    const lv = LEVELS[result.level];
    const ld = lv[locale];
    const pct = Math.round((result.score / maxScore) * 100);
    const radarData = Object.entries(result.dims).map(([k, v]) => ({
      subject: dimLabels[k][locale],
      score: v,
      fullMark: 16,
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 text-center" style={{ background: `${lv.color}12`, border: `1px solid ${lv.color}40` }}>
          <p className="mb-1 text-sm font-medium text-gray-500">{tx.resultTitle}</p>
          <div className="mb-2 text-5xl">{lv.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{ld.title}</h2>
          <p className="mt-2 text-sm text-gray-500">{tx.yourScore}: {result.score} / {maxScore}</p>
          <div className="mx-auto mt-4 max-w-xs">
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: lv.color }} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-700 leading-relaxed">{ld.description}</p>
        </div>

        {radarData.every(d => d.score > 0) && (
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-700">{tx.dimTitle}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <Radar dataKey="score" stroke={lv.color} fill={lv.color} fillOpacity={0.3} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700">📊 {tx.impact}</h3>
            <p className="mt-1 text-sm text-gray-600">{ld.impact}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: `${lv.color}10` }}>
            <h3 className="font-semibold" style={{ color: lv.color }}>💡 {tx.tip}</h3>
            <p className="mt-1 text-sm text-gray-700">{ld.tip}</p>
          </div>
        </div>

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
            className="h-full rounded-full bg-yellow-400 transition-all duration-300"
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
              className="rounded-xl border border-gray-200 px-4 py-4 text-center text-sm font-medium text-gray-700 transition hover:border-yellow-300 hover:bg-yellow-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
