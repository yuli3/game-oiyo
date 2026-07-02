'use client';

import { useState } from "react";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type ValueDimension = "equality" | "liberty" | "tradition" | "global";

interface Question {
  ko: string;
  en: string;
  ja: string;
  options: {
    ko: string;
    en: string;
    ja: string;
    scores: Record<ValueDimension, number>;
  }[];
}

const questions: Question[] = [
  {
    ko: "사회에서 정부의 역할에 대해 어떻게 생각하나요?",
    en: "What do you think about the role of government in society?",
    ja: "社会における政府の役割についてどう思いますか？",
    options: [
      { ko: "모두를 위한 평등한 기회를 보장해야 한다", en: "Should ensure equal opportunities for everyone", ja: "全員のための平等な機会を保障すべきだ", scores: { equality: 2, liberty: 0, tradition: 0, global: 1 } },
      { ko: "개인의 자유를 최대한 보장해야 한다", en: "Should maximize individual freedom", ja: "個人の自由を最大限保障すべきだ", scores: { equality: 0, liberty: 2, tradition: 0, global: 0 } },
      { ko: "전통적 사회 질서를 유지해야 한다", en: "Should maintain traditional social order", ja: "伝統的な社会秩序を維持すべきだ", scores: { equality: 0, liberty: 0, tradition: 2, global: 0 } },
      { ko: "국제 협력과 글로벌 문제 해결에 앞장서야 한다", en: "Should lead in international cooperation and global issues", ja: "国際協力とグローバル問題解決に率先すべきだ", scores: { equality: 0, liberty: 0, tradition: 0, global: 2 } },
    ],
  },
  {
    ko: "경제 시스템에 대한 나의 관점은?",
    en: "My view on economic systems:",
    ja: "経済システムに対する私の見解は？",
    options: [
      { ko: "부의 재분배와 복지 확대가 필요하다", en: "Wealth redistribution and welfare expansion are needed", ja: "富の再分配と福祉拡充が必要だ", scores: { equality: 2, liberty: 0, tradition: 0, global: 0 } },
      { ko: "자유 시장이 가장 효율적인 시스템이다", en: "Free market is the most efficient system", ja: "自由市場が最も効率的なシステムだ", scores: { equality: 0, liberty: 2, tradition: 1, global: 0 } },
      { ko: "안정적이고 검증된 시스템을 유지해야 한다", en: "Stable and proven systems should be maintained", ja: "安定した実証済みのシステムを維持すべきだ", scores: { equality: 0, liberty: 0, tradition: 2, global: 0 } },
      { ko: "글로벌 경제 협력과 자유 무역이 중요하다", en: "Global economic cooperation and free trade are important", ja: "グローバル経済協力と自由貿易が重要だ", scores: { equality: 0, liberty: 1, tradition: 0, global: 2 } },
    ],
  },
  {
    ko: "사회 변화에 대해 어떻게 생각하나요?",
    en: "What do you think about social change?",
    ja: "社会変化についてどう思いますか？",
    options: [
      { ko: "구조적 불평등을 해소하기 위한 적극적 변화가 필요하다", en: "Active change to address structural inequality is needed", ja: "構造的不平等を解消するための積極的変化が必要だ", scores: { equality: 2, liberty: 0, tradition: 0, global: 1 } },
      { ko: "변화는 자연스럽게 개인의 선택을 통해 이루어진다", en: "Change happens naturally through individual choices", ja: "変化は自然に個人の選択を通じて起きる", scores: { equality: 0, liberty: 2, tradition: 0, global: 0 } },
      { ko: "급격한 변화보다 점진적이고 신중한 접근이 낫다", en: "A gradual, careful approach is better than rapid change", ja: "急激な変化より段階的で慎重なアプローチが良い", scores: { equality: 0, liberty: 0, tradition: 2, global: 0 } },
      { ko: "글로벌 관점에서 모든 사람에게 이로운 변화를 추구해야 한다", en: "Change that benefits everyone from a global perspective", ja: "グローバルな観点で全員に利益をもたらす変化を追求すべきだ", scores: { equality: 1, liberty: 0, tradition: 0, global: 2 } },
    ],
  },
  {
    ko: "환경 문제에 대한 나의 입장은?",
    en: "My position on environmental issues:",
    ja: "環境問題に対する私の立場は？",
    options: [
      { ko: "환경 보호 비용을 부유층이 더 부담해야 한다", en: "The wealthy should bear more of the environmental costs", ja: "環境保護コストを富裕層がより多く負担すべきだ", scores: { equality: 2, liberty: 0, tradition: 0, global: 1 } },
      { ko: "시장 메커니즘으로 환경 문제를 해결할 수 있다", en: "Market mechanisms can solve environmental problems", ja: "市場メカニズムで環境問題を解決できる", scores: { equality: 0, liberty: 2, tradition: 0, global: 0 } },
      { ko: "자연과 조화로운 전통적 삶의 방식을 회복해야 한다", en: "We should restore traditional ways of living in harmony with nature", ja: "自然と調和した伝統的な生き方を回復すべきだ", scores: { equality: 0, liberty: 0, tradition: 2, global: 1 } },
      { ko: "국제 협약과 공동 대응이 핵심이다", en: "International agreements and joint response are key", ja: "国際協定と共同対応が核心だ", scores: { equality: 0, liberty: 0, tradition: 0, global: 2 } },
    ],
  },
  {
    ko: "교육에 대한 나의 관점은?",
    en: "My view on education:",
    ja: "教育に対する私の見解は？",
    options: [
      { ko: "모든 아이에게 동등한 교육 기회가 보장되어야 한다", en: "Equal educational opportunities must be guaranteed for all children", ja: "すべての子供に平等な教育機会が保障されるべきだ", scores: { equality: 2, liberty: 0, tradition: 0, global: 1 } },
      { ko: "교육 선택의 자유와 경쟁이 품질을 높인다", en: "Freedom of choice and competition in education raise quality", ja: "教育選択の自由と競争が質を高める", scores: { equality: 0, liberty: 2, tradition: 0, global: 0 } },
      { ko: "검증된 전통 교육 방식이 여전히 효과적이다", en: "Proven traditional education methods are still effective", ja: "実証済みの伝統的な教育方法がまだ効果的だ", scores: { equality: 0, liberty: 0, tradition: 2, global: 0 } },
      { ko: "글로벌 시민으로서의 역량을 키우는 교육이 중요하다", en: "Education that builds capacity as global citizens is important", ja: "グローバル市民としての能力を育む教育が重要だ", scores: { equality: 1, liberty: 0, tradition: 0, global: 2 } },
    ],
  },
  {
    ko: "다양성과 문화에 대한 나의 관점은?",
    en: "My view on diversity and culture:",
    ja: "多様性と文化に対する私の見解は？",
    options: [
      { ko: "모든 문화와 정체성이 동등하게 존중받아야 한다", en: "All cultures and identities should be equally respected", ja: "すべての文化とアイデンティティが平等に尊重されるべきだ", scores: { equality: 2, liberty: 1, tradition: 0, global: 1 } },
      { ko: "개인이 자신의 정체성을 자유롭게 선택할 수 있어야 한다", en: "Individuals should be free to choose their own identity", ja: "個人が自分のアイデンティティを自由に選べるべきだ", scores: { equality: 0, liberty: 2, tradition: 0, global: 0 } },
      { ko: "전통 문화와 공동체 정체성을 지켜야 한다", en: "Traditional culture and community identity should be preserved", ja: "伝統文化とコミュニティのアイデンティティを守るべきだ", scores: { equality: 0, liberty: 0, tradition: 2, global: 0 } },
      { ko: "다양한 문화의 공존이 사회를 풍요롭게 한다", en: "Coexistence of diverse cultures enriches society", ja: "多様な文化の共存が社会を豊かにする", scores: { equality: 1, liberty: 0, tradition: 0, global: 2 } },
    ],
  },
];

const dimensionInfo: Record<ValueDimension, {
  emoji: string;
  color: string;
  ko: { title: string; description: string };
  en: { title: string; description: string };
  ja: { title: string; description: string };
}> = {
  equality: { emoji: "⚖️", color: "#10b981", ko: { title: "평등 지향", description: "모든 사람의 평등한 기회와 공정한 사회를 중시합니다. 구조적 불평등 해소와 사회적 약자 보호에 관심이 많습니다." }, en: { title: "Equality Oriented", description: "You value equal opportunities and a fair society for everyone. You care about addressing structural inequality and protecting the vulnerable." }, ja: { title: "平等志向", description: "すべての人の平等な機会と公正な社会を重視します。構造的不平等の解消と社会的弱者の保護に関心があります。" } },
  liberty: { emoji: "🦅", color: "#f59e0b", ko: { title: "자유 지향", description: "개인의 자유와 자율성을 최고 가치로 봅니다. 정부 개입을 최소화하고 개인이 스스로 선택할 권리를 중시합니다." }, en: { title: "Liberty Oriented", description: "You see individual freedom and autonomy as the highest value. You favor minimal government intervention and the right to make one's own choices." }, ja: { title: "自由志向", description: "個人の自由と自律性を最高の価値と見なします。政府の介入を最小化し、個人が自ら選択する権利を重視します。" } },
  tradition: { emoji: "🏛️", color: "#8b5cf6", ko: { title: "전통 지향", description: "검증된 전통과 사회 질서의 안정성을 중시합니다. 급격한 변화보다 점진적이고 신중한 접근을 선호합니다." }, en: { title: "Tradition Oriented", description: "You value proven traditions and the stability of social order. You prefer gradual, careful approaches over rapid change." }, ja: { title: "伝統志向", description: "実証済みの伝統と社会秩序の安定性を重視します。急激な変化より段階的で慎重なアプローチを好みます。" } },
  global: { emoji: "🌍", color: "#3b82f6", ko: { title: "글로벌 지향", description: "국제 협력과 글로벌 관점을 중시합니다. 국경을 초월한 공동 문제 해결과 다양한 문화의 공존을 지향합니다." }, en: { title: "Globally Oriented", description: "You value international cooperation and a global perspective. You pursue cross-border problem solving and coexistence of diverse cultures." }, ja: { title: "グローバル志向", description: "国際協力とグローバルな視点を重視します。国境を超えた共同問題解決と多様な文化の共存を目指します。" } },
};

const ui = {
  ko: { title: "가치관 나침반 테스트", subtitle: "나를 이끄는 핵심 가치는?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "나의 가치 나침반", allDimensions: "가치 차원 분포", restart: "다시 하기", share: "결과 공유", copied: "복사됨!" },
  en: { title: "Value Compass Test", subtitle: "What core values guide me?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "My Value Compass", allDimensions: "Value Dimension Distribution", restart: "Restart", share: "Share Result", copied: "Copied!" },
  ja: { title: "バリューコンパステスト", subtitle: "私を導く核心的価値は？", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "私のバリューコンパス", allDimensions: "価値次元の分布", restart: "もう一度", share: "結果をシェア", copied: "コピーされました！" },
};

export default function ValueCompassTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = ui[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<ValueDimension, number>>({ equality: 0, liberty: 0, tradition: 0, global: 0 });
  const [result, setResult] = useState<ValueDimension | null>(null);
  const [copied, setCopied] = useState(false);

  function pick(optScores: Record<ValueDimension, number>) {
    const next: Record<ValueDimension, number> = {
      equality: scores.equality + optScores.equality,
      liberty: scores.liberty + optScores.liberty,
      tradition: scores.tradition + optScores.tradition,
      global: scores.global + optScores.global,
    };
    const answered = idx + 1;
    if (answered < questions.length) {
      setScores(next);
      setTimeout(() => setIdx(answered), 280);
    } else {
      setScores(next);
      const winner = (Object.keys(next) as ValueDimension[]).reduce((a, b) => next[a] >= next[b] ? a : b);
      setResult(winner);
    }
  }

  function restart() {
    setIdx(0);
    setScores({ equality: 0, liberty: 0, tradition: 0, global: 0 });
    setResult(null);
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

  if (result) {
    const r = dimensionInfo[result];
    const rd = r[locale];
    const maxScore = Math.max(...Object.values(scores), 1);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 text-center" style={{ background: `linear-gradient(135deg, ${r.color}18, ${r.color}08)`, border: `1px solid ${r.color}30` }}>
          <p className="text-sm font-medium text-gray-500 mb-1">{tx.resultTitle}</p>
          <div className="text-5xl mb-2">{r.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{rd.title}</h2>
          <p className="mt-3 text-sm text-gray-600">{rd.description}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-700">{tx.allDimensions}</h3>
          <div className="space-y-3">
            {(Object.keys(scores) as ValueDimension[]).map((dim) => {
              const di = dimensionInfo[dim];
              return (
                <div key={dim}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{di.emoji} {di[locale].title}</span>
                    <span className="text-xs text-gray-400">{scores[dim]}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(scores[dim] / maxScore) * 100}%`, backgroundColor: di.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={restart} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50">{tx.restart}</button>
          <button onClick={share} className="flex-1 rounded-xl py-3 text-sm font-medium text-white transition" style={{ backgroundColor: r.color }}>{copied ? tx.copied : tx.share}</button>
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
          <div className="h-full rounded-full bg-teal-500 transition-all duration-300" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm text-gray-500">{tx.progress(idx + 1, questions.length)}</span>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-5 text-center text-lg font-medium text-gray-800">{q[locale]}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => pick(opt.scores)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-teal-300 hover:bg-teal-50">
              {opt[locale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
