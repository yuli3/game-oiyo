import { useState, useEffect } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type SupportedLocale = "ko" | "en" | "ja";
interface Props { locale?: string; }

type Dimension = "self_awareness" | "self_regulation" | "motivation" | "empathy" | "social_skills";
const DIMENSIONS: Dimension[] = ["self_awareness", "self_regulation", "motivation", "empathy", "social_skills"];

interface Question { ko: string; en: string; ja: string; dim: Dimension; }

const questions: Question[] = [
  // self_awareness
  { ko: "나는 내가 어떤 감정을 느끼고 있는지 즉각적으로 알아차린다.", en: "I immediately notice what emotion I am feeling.", ja: "自分がどんな感情を感じているかをすぐに気づく。", dim: "self_awareness" },
  { ko: "나의 감정이 행동에 어떤 영향을 미치는지 잘 파악하고 있다.", en: "I clearly understand how my emotions influence my behavior.", ja: "自分の感情が行動にどう影響するかよく把握している。", dim: "self_awareness" },
  { ko: "나는 나의 강점과 약점을 솔직하게 인정한다.", en: "I honestly acknowledge my own strengths and weaknesses.", ja: "自分の強みと弱みを正直に認める。", dim: "self_awareness" },
  // self_regulation
  { ko: "화가 나거나 불안할 때, 충동적으로 반응하지 않고 먼저 차분하게 생각한다.", en: "When angry or anxious, I calm down and think before reacting impulsively.", ja: "怒りや不安を感じても、衝動的に反応せず落ち着いて考える。", dim: "self_regulation" },
  { ko: "나는 어려운 상황에서도 맡은 일에 집중하고 책임을 다한다.", en: "Even in difficult situations, I stay focused and fulfill my responsibilities.", ja: "困難な状況でも担当の仕事に集中し、責任を果たす。", dim: "self_regulation" },
  { ko: "나는 주변 환경이나 감정 상태에 관계없이 약속을 지키려고 노력한다.", en: "Regardless of environment or emotional state, I try to keep my promises.", ja: "周囲の環境や感情状態に関わらず、約束を守ろうと努力する。", dim: "self_regulation" },
  // motivation
  { ko: "나는 외부의 보상보다 일 자체의 의미와 재미에서 동기를 찾는다.", en: "I find motivation in the meaning and enjoyment of the work itself, more than external rewards.", ja: "外部の報酬より、仕事自体の意味と楽しさに動機を見出す。", dim: "motivation" },
  { ko: "목표를 달성하지 못해도 쉽게 포기하지 않고 다시 도전한다.", en: "Even when I fail to reach a goal, I don't give up easily and try again.", ja: "目標を達成できなくても簡単には諦めず、再挑戦する。", dim: "motivation" },
  { ko: "나는 더 나은 결과를 위해 자발적으로 노력하고 개선하려 한다.", en: "I spontaneously strive to improve and get better results.", ja: "より良い結果のために自発的に努力し、改善しようとする。", dim: "motivation" },
  // empathy
  { ko: "나는 다른 사람의 표정, 목소리 톤, 몸짓에서 감정을 잘 읽어낸다.", en: "I easily read emotions from others' facial expressions, tone of voice, and body language.", ja: "他の人の表情、声のトーン、身振りから感情をよく読み取れる。", dim: "empathy" },
  { ko: "내가 동의하지 않는 사람의 입장도 이해하려고 노력한다.", en: "I try to understand the perspective of someone I disagree with.", ja: "同意できない人の立場も理解しようと努力する。", dim: "empathy" },
  { ko: "힘든 상황에 있는 사람을 보면 그 감정에 공감하고 도우려는 마음이 생긴다.", en: "When I see someone in a hard situation, I empathize and feel motivated to help.", ja: "辛い状況にいる人を見ると、その感情に共感し助けようとする気持ちが生まれる。", dim: "empathy" },
  // social_skills
  { ko: "나는 갈등 상황에서 감정보다 문제 해결에 집중하여 대화를 이끈다.", en: "In conflict situations, I lead conversations focused on problem-solving rather than emotions.", ja: "葛藤状況では感情より問題解決に集中して対話を導く。", dim: "social_skills" },
  { ko: "나는 처음 만나는 사람과도 빠르게 라포(신뢰 관계)를 형성하는 편이다.", en: "I tend to build rapport quickly even with people I meet for the first time.", ja: "初対面の人とも素早くラポール（信頼関係）を築く方だ。", dim: "social_skills" },
  { ko: "나는 팀에서 협력을 이끌어내고 구성원들의 강점을 끌어내려 한다.", en: "I try to foster cooperation in a team and bring out the strengths of each member.", ja: "チームで協力を引き出し、メンバーの強みを引き出そうとする。", dim: "social_skills" },
];

const dimInfo: Record<Dimension, { name: Record<SupportedLocale, string>; color: string }> = {
  self_awareness: { name: { ko: "자기인식", en: "Self-Awareness", ja: "自己認識" }, color: "#6366f1" },
  self_regulation: { name: { ko: "자기조절", en: "Self-Regulation", ja: "自己調節" }, color: "#10b981" },
  motivation: { name: { ko: "동기부여", en: "Motivation", ja: "動機付け" }, color: "#f59e0b" },
  empathy: { name: { ko: "공감", en: "Empathy", ja: "共感" }, color: "#ec4899" },
  social_skills: { name: { ko: "사회적 기술", en: "Social Skills", ja: "社会的スキル" }, color: "#3b82f6" },
};

type EqLevel = "high" | "medium" | "low";
function getLevel(total: number): EqLevel {
  if (total >= 48) return "high";
  if (total >= 30) return "medium";
  return "low";
}

const levelData: Record<EqLevel, {
  label: Record<SupportedLocale, string>;
  color: string;
  description: Record<SupportedLocale, string>;
  growth: Record<SupportedLocale, string[]>;
  affirmation: Record<SupportedLocale, string>;
}> = {
  high: {
    label: { ko: "높은 감성 지능", en: "High Emotional Intelligence", ja: "高い感情知性" },
    color: "#10b981",
    description: {
      ko: "당신은 자신과 타인의 감정을 깊이 이해하고 효과적으로 다루는 능력이 뛰어납니다. 이 능력은 리더십, 팀워크, 인간관계에서 큰 강점이 됩니다. 다니엘 골먼의 연구에 따르면 뛰어난 리더의 성과 차이 중 90%는 EQ에 의해 결정됩니다.",
      en: "You have exceptional ability to understand and manage emotions — yours and others'. This makes you highly effective in leadership, teamwork, and relationships. Daniel Goleman's research shows 90% of performance differences among top leaders are determined by EQ.",
      ja: "あなたは自分と他者の感情を深く理解し、効果的に扱う能力が優れています。この能力はリーダーシップ、チームワーク、人間関係で大きな強みになります。ダニエル・ゴールマンの研究によると、優れたリーダーのパフォーマンス差の90%はEQによって決まります。",
    },
    growth: {
      ko: ["현재 능력을 주변 사람들에게 나누고 멘토링하세요", "복잡한 감정 상황에서 더 미세한 신호를 읽는 연습을 해보세요", "팀과 조직에서 감정적 안전지대를 만드는 역할을 해보세요"],
      en: ["Share your abilities and mentor those around you", "Practice reading subtler signals in complex emotional situations", "Take on the role of creating emotional safety in your team and organization"],
      ja: ["現在の能力を周りの人と分かち合い、メンタリングしてください", "複雑な感情状況でより微細なシグナルを読む練習をしてみてください", "チームや組織で感情的な安全地帯を作る役割を担ってみてください"],
    },
    affirmation: {
      ko: "나는 감정을 통해 사람과 더 깊이 연결됩니다.",
      en: "I connect more deeply with people through emotions.",
      ja: "私は感情を通じて人々とより深くつながります。",
    },
  },
  medium: {
    label: { ko: "보통 수준의 감성 지능", en: "Moderate Emotional Intelligence", ja: "中程度の感情知性" },
    color: "#f59e0b",
    description: {
      ko: "당신은 기본적인 감성 지능을 갖추고 있으며, 적절히 발휘하고 있습니다. 일부 상황에서는 감정을 잘 다루지만, 특정 영역에서는 더 개발할 여지가 있습니다. 조금의 의식적인 연습으로 큰 도약이 가능합니다.",
      en: "You have basic emotional intelligence and apply it appropriately. You manage emotions well in some situations, but have room to develop in certain areas. Conscious practice can lead to significant leaps forward.",
      ja: "あなたは基本的な感情知性を持ち、適切に発揮しています。一部の状況では感情をうまく扱いますが、特定の分野ではさらに発展する余地があります。意識的な練習で大きな飛躍が可能です。",
    },
    growth: {
      ko: ["하루 5분, 그날 느낀 감정을 일기로 써보세요 (자기인식 강화)", "감정이 격해질 때 '4-7-8 호흡법'을 연습해보세요 (자기조절)", "대화 중 상대의 표정과 몸짓에 더 집중해 보세요 (공감 강화)"],
      en: ["Write 5 minutes a day journaling about your emotions (builds self-awareness)", "Practice '4-7-8 breathing' when emotions run high (self-regulation)", "Focus more on the other person's expressions and gestures during conversations (builds empathy)"],
      ja: ["1日5分、その日に感じた感情を日記に書いてみてください（自己認識強化）", "感情が高まるとき「4-7-8呼吸法」を練習してみてください（自己調節）", "会話中に相手の表情や身振りにもっと集中してみてください（共感強化）"],
    },
    affirmation: {
      ko: "나는 매일 조금씩 감정을 더 잘 이해하고 있습니다.",
      en: "Every day I understand emotions a little better.",
      ja: "私は毎日少しずつ感情をよりよく理解しています。",
    },
  },
  low: {
    label: { ko: "감성 지능 개발 단계", en: "Developing Emotional Intelligence", ja: "感情知性 発展段階" },
    color: "#ef4444",
    description: {
      ko: "현재 감정을 인식하고 다루는 것이 쉽지 않을 수 있습니다. 이것은 부족함이 아니라, 아직 개발되지 않은 근육과 같습니다. 감성 지능은 연습으로 향상됩니다. 작은 것부터 시작해 보세요.",
      en: "You may currently find it difficult to recognize and manage emotions. This isn't a deficiency — it's like an undeveloped muscle. Emotional intelligence improves with practice. Start small.",
      ja: "現在、感情を認識し扱うことが難しいかもしれません。これは不足ではなく、まだ発達していない筋肉のようなものです。感情知性は練習で向上します。小さなことから始めてみてください。",
    },
    growth: {
      ko: ["감정 어휘 목록을 만들어보세요: 오늘 느낀 감정을 최소 3가지 단어로 표현해보세요", "전문 심리 상담이나 EQ 개발 프로그램을 받아보세요", "명상 앱(예: 마보, Headspace)으로 하루 10분 마음 챙김을 시작해보세요"],
      en: ["Build an emotion vocabulary: describe today's feelings with at least 3 words", "Consider professional counseling or EQ development programs", "Start 10 minutes of daily mindfulness with a meditation app (e.g., Headspace, Calm)"],
      ja: ["感情語彙リストを作ってみてください：今日感じた感情を最低3つの言葉で表現してみてください", "専門的な心理カウンセリングやEQ開発プログラムを受けてみてください", "瞑想アプリ（例：Headspace）で1日10分のマインドフルネスを始めてみてください"],
    },
    affirmation: {
      ko: "나는 감정을 이해하는 능력을 키우고 있습니다.",
      en: "I am building my ability to understand emotions.",
      ja: "私は感情を理解する能力を育てています。",
    },
  },
};

const scaleLabels: Record<SupportedLocale, string[]> = {
  ko: ["전혀 아니다", "아니다", "보통", "그렇다", "매우 그렇다"],
  en: ["Not at all", "Rarely", "Neutral", "Often", "Very much so"],
  ja: ["全くない", "ほとんどない", "普通", "よくある", "とてもそうだ"],
};

const ui: Record<SupportedLocale, {
  title: string; subtitle: string; scale: string; progress: string;
  resultTitle: string; total: string; dimScores: string; growth: string;
  affirmation: string; restart: string; share: string; copied: string; note: string;
}> = {
  ko: {
    title: "감성 지능(EQ) 테스트", subtitle: "다니엘 골먼의 5가지 EQ 요소를 진단합니다",
    scale: "이 문장에 얼마나 동의하시나요?", progress: "질문",
    resultTitle: "나의 EQ 프로파일", total: "총점", dimScores: "5가지 EQ 요소 점수",
    growth: "성장 방법", affirmation: "오늘의 확언",
    restart: "다시 테스트하기", share: "결과 공유", copied: "링크가 복사되었습니다!",
    note: "이 테스트는 다니엘 골먼(Daniel Goleman)의 EQ 이론에 기반하며, 자기 이해를 위한 참고 자료입니다.",
  },
  en: {
    title: "Emotional Intelligence (EQ) Test", subtitle: "Assess Goleman's 5 dimensions of EQ",
    scale: "How much do you agree with this statement?", progress: "Question",
    resultTitle: "My EQ Profile", total: "Total Score", dimScores: "5 EQ Dimension Scores",
    growth: "Ways to Grow", affirmation: "Today's Affirmation",
    restart: "Retake Test", share: "Share Result", copied: "Link copied!",
    note: "This test is based on Daniel Goleman's EQ theory and is intended as a self-understanding reference.",
  },
  ja: {
    title: "感情知性(EQ)テスト", subtitle: "ダニエル・ゴールマンの5つのEQ要素を診断します",
    scale: "この文章にどれくらい同意しますか？", progress: "質問",
    resultTitle: "私のEQプロファイル", total: "合計スコア", dimScores: "5つのEQ要素スコア",
    growth: "成長方法", affirmation: "今日のアファメーション",
    restart: "もう一度テストする", share: "結果を共有", copied: "リンクをコピーしました！",
    note: "このテストはダニエル・ゴールマン(Daniel Goleman)のEQ理論に基づいており、自己理解のための参考資料です。",
  },
};

export default function EmotionalIntelligenceTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const t = ui[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ level: EqLevel; total: number; scores: Record<Dimension, number> } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const el = p.get("el") as EqLevel | null;
    const es = p.get("es");
    if (el && el in levelData && es) {
      const [sa, sr, mo, em, ss] = es.split(",").map(Number);
      setResult({ level: el, total: sa + sr + mo + em + ss, scores: { self_awareness: sa, self_regulation: sr, motivation: mo, empathy: em, social_skills: ss } });
    }
  }, []);

  function pick(score: number) {
    const next = [...answers, score];
    if (next.length < questions.length) {
      setAnswers(next);
      setTimeout(() => setIdx(next.length), 280);
    } else {
      const scores: Record<Dimension, number> = { self_awareness: 0, self_regulation: 0, motivation: 0, empathy: 0, social_skills: 0 };
      questions.forEach((q, i) => { scores[q.dim] += next[i]; });
      const total = Object.values(scores).reduce((a, b) => a + b, 0);
      const level = getLevel(total);
      setAnswers(next);
      setResult({ level, total, scores });
      const url = new URL(window.location.href);
      url.searchParams.set("el", level);
      url.searchParams.set("es", DIMENSIONS.map((d) => scores[d]).join(","));
      window.history.replaceState({}, "", url.toString());
    }
  }

  function restart() {
    setIdx(0); setAnswers([]); setResult(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("el"); url.searchParams.delete("es");
    window.history.replaceState({}, "", url.toString());
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) { await navigator.share({ title: t.title, url }); }
    else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  if (result) {
    const ld = levelData[result.level];
    const maxTotal = questions.length * 4;
    const pct = Math.round((result.total / maxTotal) * 100);
    const radarData = DIMENSIONS.map((d) => ({
      subject: dimInfo[d].name[locale],
      value: result.scores[d],
      fullMark: questions.filter((q) => q.dim === d).length * 4,
    }));

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{t.resultTitle}</h1>
          <div className="inline-block px-4 py-2 rounded-full text-white font-semibold"
            style={{ backgroundColor: ld.color }}>{ld.label[locale]}</div>
          <div className="text-sm text-gray-500">{t.total}: {result.total} / {maxTotal} ({pct}%)</div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: ld.color }} />
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-2 text-sm">{t.dimScores}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-5 gap-1 mt-2">
            {DIMENSIONS.map((d) => (
              <div key={d} className="text-center">
                <div className="text-xs font-medium" style={{ color: dimInfo[d].color }}>{dimInfo[d].name[locale]}</div>
                <div className="text-lg font-bold text-gray-800">{result.scores[d]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <p className="text-gray-700 leading-relaxed">{ld.description[locale]}</p>
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">🌱 {t.growth}</h3>
            <ul className="space-y-1">
              {ld.growth[locale].map((s, i) => <li key={i} className="text-sm text-blue-700">• {s}</li>)}
            </ul>
          </div>
          <div className="text-center py-3 rounded-lg" style={{ backgroundColor: ld.color + "15" }}>
            <p className="text-sm italic" style={{ color: ld.color }}>"{ld.affirmation[locale]}"</p>
            <p className="text-xs text-gray-400 mt-1">{t.affirmation}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">{t.note}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={restart} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium text-sm">{t.restart}</button>
          <button onClick={share} className="px-5 py-2 text-white rounded-full font-medium text-sm" style={{ backgroundColor: ld.color }}>{copied ? t.copied : t.share}</button>
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
          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: dimInfo[q.dim].color }}>{dimInfo[q.dim].name[locale]}</span>
        </div>
        <p className="text-base font-medium text-gray-800 leading-relaxed">{q[locale]}</p>
        <p className="text-xs text-gray-400">{t.scale}</p>
        <div className="space-y-2">
          {scaleLabels[locale].map((label, i) => (
            <button key={i} onClick={() => pick(i)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left">
              <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-gray-500">{i}</div>
              <span className="text-sm text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
