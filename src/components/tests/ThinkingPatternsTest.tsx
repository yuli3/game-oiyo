'use client';

import { useState } from "react";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type ThinkingType = "analytical" | "creative" | "practical" | "relational";

interface Question {
  ko: string;
  en: string;
  ja: string;
  options: {
    ko: string;
    en: string;
    ja: string;
    type: ThinkingType;
  }[];
}

const questions: Question[] = [
  {
    ko: "복잡한 문제가 주어졌을 때 나는?",
    en: "When given a complex problem, I:",
    ja: "複雑な問題が与えられたとき、私は？",
    options: [
      { ko: "데이터와 증거를 수집하고 체계적으로 분석한다", en: "Collect data and evidence, then analyze systematically", ja: "データと証拠を収集し体系的に分析する", type: "analytical" },
      { ko: "새로운 관점과 비유적 사고로 창의적 해결책을 찾는다", en: "Find creative solutions through new perspectives and analogical thinking", ja: "新しい視点と比喩的思考で創造的な解決策を見つける", type: "creative" },
      { ko: "실제로 작동하는 실용적인 해결책을 빠르게 찾는다", en: "Quickly find practical solutions that actually work", ja: "実際に機能する実用的な解決策を素早く見つける", type: "practical" },
      { ko: "사람들의 의견을 수렴하고 모두에게 좋은 방법을 찾는다", en: "Gather people's opinions and find what's good for everyone", ja: "人々の意見を集め全員に良い方法を見つける", type: "relational" },
    ],
  },
  {
    ko: "결정을 내릴 때 가장 중요하게 생각하는 것은?",
    en: "What matters most when making decisions?",
    ja: "決定を下すとき最も重要に思うことは？",
    options: [
      { ko: "논리와 데이터 — 객관적 사실에 기반한 결정", en: "Logic and data — decisions based on objective facts", ja: "論理とデータ — 客観的事実に基づく決定", type: "analytical" },
      { ko: "직관과 가능성 — 새로운 기회를 만드는 결정", en: "Intuition and possibility — decisions that create new opportunities", ja: "直感と可能性 — 新しい機会を生み出す決定", type: "creative" },
      { ko: "결과와 효율 — 실제로 효과가 있는 결정", en: "Outcome and efficiency — decisions that actually work", ja: "結果と効率 — 実際に効果がある決定", type: "practical" },
      { ko: "관계와 영향 — 사람들에게 미치는 영향을 고려한 결정", en: "Relationships and impact — decisions considering effects on people", ja: "関係と影響 — 人々への影響を考慮した決定", type: "relational" },
    ],
  },
  {
    ko: "새로운 아이디어를 설명할 때 나는?",
    en: "When explaining a new idea, I:",
    ja: "新しいアイデアを説明するとき、私は？",
    options: [
      { ko: "구조화된 논거와 데이터로 설득한다", en: "Convince with structured arguments and data", ja: "構造化された論拠とデータで説得する", type: "analytical" },
      { ko: "스토리와 비유로 감각적으로 전달한다", en: "Communicate sensorially with stories and analogies", ja: "ストーリーと比喩で感覚的に伝える", type: "creative" },
      { ko: "구체적인 예시와 실행 방법을 보여준다", en: "Show concrete examples and how to implement", ja: "具体的な例と実行方法を示す", type: "practical" },
      { ko: "청중의 반응을 보며 맞춤형으로 설명한다", en: "Explain customized based on audience reactions", ja: "聴衆の反応を見ながらカスタマイズして説明する", type: "relational" },
    ],
  },
  {
    ko: "팀에서 갈등이 생겼을 때 나의 역할은?",
    en: "My role when conflict arises in a team:",
    ja: "チームで対立が生じたとき私の役割は？",
    options: [
      { ko: "객관적인 사실을 정리하고 논리적인 해결책을 제안한다", en: "Organize objective facts and propose logical solutions", ja: "客観的な事実を整理し論理的な解決策を提案する", type: "analytical" },
      { ko: "새로운 관점을 제시하고 창의적인 타협점을 찾는다", en: "Present new perspectives and find creative compromises", ja: "新しい視点を提示し創造的な妥協点を見つける", type: "creative" },
      { ko: "실행 가능한 해결책에 초점을 맞추고 빠르게 진행한다", en: "Focus on actionable solutions and move forward quickly", ja: "実行可能な解決策に焦点を当て素早く進める", type: "practical" },
      { ko: "모든 사람의 감정과 입장을 이해하고 중재한다", en: "Understand everyone's feelings and positions and mediate", ja: "全員の感情と立場を理解して仲裁する", type: "relational" },
    ],
  },
  {
    ko: "학습하는 방식은?",
    en: "My learning style:",
    ja: "学習するスタイルは？",
    options: [
      { ko: "원리를 이해하고 체계적으로 정리하며 학습한다", en: "Learn by understanding principles and organizing them systematically", ja: "原理を理解し体系的に整理して学ぶ", type: "analytical" },
      { ko: "다양한 분야를 넘나들며 새로운 연결 고리를 발견한다", en: "Discover new connections by crossing various domains", ja: "様々な分野を横断して新しい繋がりを発見する", type: "creative" },
      { ko: "직접 해보면서 경험을 통해 빠르게 습득한다", en: "Quickly acquire through hands-on experience", ja: "直接やってみて経験を通じて素早く習得する", type: "practical" },
      { ko: "다른 사람들과 토론하고 공유하며 학습한다", en: "Learn by discussing and sharing with others", ja: "他の人と議論し共有しながら学ぶ", type: "relational" },
    ],
  },
  {
    ko: "프레젠테이션을 준비할 때 나는?",
    en: "When preparing a presentation, I:",
    ja: "プレゼンテーションを準備するとき、私は？",
    options: [
      { ko: "정확한 데이터와 논리적 흐름을 최우선으로 한다", en: "Prioritize accurate data and logical flow above all", ja: "正確なデータと論理的な流れを最優先にする", type: "analytical" },
      { ko: "시각적으로 매력적이고 독창적인 방식으로 전달한다", en: "Communicate in visually appealing and original ways", ja: "視覚的に魅力的で独創的な方法で伝える", type: "creative" },
      { ko: "핵심만 간결하게 담아 실용적으로 구성한다", en: "Organize practically with only the essentials concisely", ja: "核心だけを簡潔にまとめて実用的に構成する", type: "practical" },
      { ko: "청중을 잘 이해하고 공감할 수 있게 구성한다", en: "Understand the audience and structure it for empathy", ja: "聴衆をよく理解し共感できるように構成する", type: "relational" },
    ],
  },
];

const results: Record<ThinkingType, {
  emoji: string;
  color: string;
  ko: { title: string; subtitle: string; description: string; traits: string[]; careers: string };
  en: { title: string; subtitle: string; description: string; traits: string[]; careers: string };
  ja: { title: string; subtitle: string; description: string; traits: string[]; careers: string };
}> = {
  analytical: {
    emoji: "📊",
    color: "#3b82f6",
    ko: { title: "분석적 사고가", subtitle: "논리적인 문제 해결사", description: "체계적인 사고, 데이터 분석, 논리적 추론에 뛰어납니다. 증거에 기반하여 결정하고 복잡한 문제를 관리 가능한 요소로 세분화합니다.", traits: ["데이터 기반 의사결정", "복잡한 문제를 논리적 단계로 분해", "증거 기반 접근 방식 선호"], careers: "데이터 과학자, 연구원, 재무 분석가, 엔지니어" },
    en: { title: "Analytical Thinker", subtitle: "Logical Problem Solver", description: "You excel at systematic thinking, data analysis, and logical reasoning. You make evidence-based decisions and break complex problems into manageable components.", traits: ["Data-driven decision making", "Breaks complex problems into logical steps", "Prefers evidence-based approaches"], careers: "Data Scientist, Researcher, Financial Analyst, Engineer" },
    ja: { title: "分析的思考者", subtitle: "論理的な問題解決者", description: "体系的な思考、データ分析、論理的推論に優れています。証拠に基づいて決定し、複雑な問題を管理可能な要素に分解します。", traits: ["データ駆動の意思決定", "複雑な問題を論理的なステップに分解", "証拠ベースのアプローチを好む"], careers: "データサイエンティスト、研究者、財務アナリスト、エンジニア" },
  },
  creative: {
    emoji: "🎨",
    color: "#ec4899",
    ko: { title: "창의적 사고가", subtitle: "혁신적인 비저너리", description: "혁신, 거시적 사고, 관습에 얽매이지 않는 해결책으로 성장합니다. 남들이 놓치는 연결 고리를 보고 독특한 각도에서 도전에 접근합니다.", traits: ["혁신적인 아이디어 창출", "거시적인 패턴과 미래 가능성으로 사고", "관습에서 벗어난 창의적 각도로 접근"], careers: "디자이너, 마케터, 기업가, 작가" },
    en: { title: "Creative Thinker", subtitle: "Innovative Visionary", description: "You thrive through innovation, big-picture thinking, and unconventional solutions. You see connections others miss and approach challenges from unique angles.", traits: ["Generates innovative ideas", "Thinks in big-picture patterns and future possibilities", "Approaches with creative unconventional angles"], careers: "Designer, Marketer, Entrepreneur, Writer" },
    ja: { title: "創造的思考者", subtitle: "革新的なビジョナリー", description: "革新、大局的思考、型にはまらない解決策で成長します。他者が見逃す繋がりを見て、独自の角度から挑戦に取り組みます。", traits: ["革新的なアイデアを生み出す", "大局的なパターンと将来の可能性で考える", "型破りな創造的角度からアプローチ"], careers: "デザイナー、マーケター、起業家、ライター" },
  },
  practical: {
    emoji: "⚙️",
    color: "#10b981",
    ko: { title: "실천적 사고가", subtitle: "행동 중심의 실행가", description: "현실적으로 작동하는 것에 집중합니다. 실행력이 뛰어나며 이론적 논의보다 가시적 결과를 중요하게 여깁니다.", traits: ["결과 중심적 사고", "직접 해보는 학습과 실생활 적용 선호", "행동 중심적이며 효율적인 해결책 실행"], careers: "프로젝트 매니저, 운영 관리자, 컨설턴트" },
    en: { title: "Practical Thinker", subtitle: "Action-Oriented Executor", description: "You focus on what actually works in reality. You have strong execution ability and value tangible results over theoretical discussions.", traits: ["Results-oriented thinking", "Prefers hands-on learning and real-world application", "Action-oriented with efficient solution execution"], careers: "Project Manager, Operations Manager, Consultant" },
    ja: { title: "実践的思考者", subtitle: "行動中心の実行者", description: "現実に機能することに集中します。実行力が優れており、理論的な議論より目に見える結果を重視します。", traits: ["結果指向の思考", "直接やってみる学習と実世界への適用を好む", "行動指向で効率的な解決策の実行"], careers: "プロジェクトマネージャー、運営マネージャー、コンサルタント" },
  },
  relational: {
    emoji: "🤝",
    color: "#f59e0b",
    ko: { title: "관계적 사고가", subtitle: "협력적인 커넥터", description: "사람을 이해하고 합의를 도출하며 모두에게 도움이 되는 해결책을 찾는 데 뛰어납니다. 공감 능력과 협력적 접근으로 조화로운 결과를 만듭니다.", traits: ["강한 대인 관계 기술과 공감 능력", "합의 도출과 윈윈 해결책 발견", "논리적 분석과 인간적 영향 사이의 균형 고려"], careers: "HR 관리자, 상담사, 교사, 팀 리더" },
    en: { title: "Relational Thinker", subtitle: "Collaborative Connector", description: "You excel at understanding people, building consensus, and finding solutions that help everyone. Your empathy creates harmonious outcomes.", traits: ["Strong interpersonal skills with excellent empathy", "Builds consensus and finds win-win solutions", "Balances logical analysis and human impact"], careers: "HR Manager, Counselor, Teacher, Team Leader" },
    ja: { title: "関係的思考者", subtitle: "協力的なコネクター", description: "人を理解し、合意を形成し、全員に役立つ解決策を見つけることに優れています。共感力と協力的アプローチで調和のある結果を生み出します。", traits: ["強い対人スキルと優れた共感力", "合意形成とウィンウィン解決策の発見", "論理的分析と人間的影響のバランス考慮"], careers: "HRマネージャー、カウンセラー、教師、チームリーダー" },
  },
};

const ui = {
  ko: { title: "사고 패턴 테스트", subtitle: "나는 어떻게 생각하는가?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "나의 사고 스타일", traitsLabel: "나의 인지적 강점", careersLabel: "어울리는 직업", restart: "다시 하기", share: "결과 공유", copied: "복사됨!" },
  en: { title: "Thinking Patterns Test", subtitle: "How do I think?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "My Thinking Style", traitsLabel: "My Cognitive Strengths", careersLabel: "Fitting Careers", restart: "Restart", share: "Share Result", copied: "Copied!" },
  ja: { title: "思考パターンテスト", subtitle: "私はどのように考えるか？", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "私の思考スタイル", traitsLabel: "私の認知的強み", careersLabel: "合う職業", restart: "もう一度", share: "結果をシェア", copied: "コピーされました！" },
};

export default function ThinkingPatternsTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = ui[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<ThinkingType, number>>({ analytical: 0, creative: 0, practical: 0, relational: 0 });
  const [result, setResult] = useState<ThinkingType | null>(null);
  const [copied, setCopied] = useState(false);

  function pick(type: ThinkingType) {
    const next = { ...scores, [type]: scores[type] + 1 };
    const total = Object.values(next).reduce((a, b) => a + b, 0);
    if (total < questions.length) {
      setScores(next);
      setTimeout(() => setIdx(total), 280);
    } else {
      setScores(next);
      const winner = (Object.keys(next) as ThinkingType[]).reduce((a, b) => next[a] >= next[b] ? a : b);
      setResult(winner);
    }
  }

  function restart() {
    setIdx(0);
    setScores({ analytical: 0, creative: 0, practical: 0, relational: 0 });
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
    const r = results[result];
    const rd = r[locale];
    const maxScore = Math.max(...Object.values(scores), 1);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 text-center" style={{ background: `linear-gradient(135deg, ${r.color}18, ${r.color}08)`, border: `1px solid ${r.color}30` }}>
          <p className="text-sm font-medium text-gray-500 mb-1">{tx.resultTitle}</p>
          <div className="text-5xl mb-2">{r.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{rd.title}</h2>
          <p className="mt-1 text-sm font-medium" style={{ color: r.color }}>{rd.subtitle}</p>
          <p className="mt-3 text-sm text-gray-600">{rd.description}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">{tx.traitsLabel}</h3>
            <div className="space-y-1">
              {rd.traits.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="flex-shrink-0 font-bold" style={{ color: r.color }}>✓</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700">{tx.careersLabel}</h3>
            <p className="mt-1 text-sm text-gray-600">{rd.careers}</p>
          </div>
          <div>
            <div className="space-y-2">
              {(Object.keys(scores) as ThinkingType[]).map((type) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-lg w-6">{results[type].emoji}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(scores[type] / maxScore) * 100}%`, backgroundColor: results[type].color }} />
                  </div>
                  <span className="text-xs text-gray-400 w-4">{scores[type]}</span>
                </div>
              ))}
            </div>
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
          <div className="h-full rounded-full bg-pink-500 transition-all duration-300" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm text-gray-500">{tx.progress(idx + 1, questions.length)}</span>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-5 text-center text-lg font-medium text-gray-800">{q[locale]}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => pick(opt.type)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-pink-300 hover:bg-pink-50">
              {opt[locale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
