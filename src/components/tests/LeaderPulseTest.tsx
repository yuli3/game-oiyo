'use client';

import { useState } from "react";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type LeaderStyle = "transformational" | "servant" | "transactional" | "coaching" | "directive";

interface Question {
  ko: string;
  en: string;
  ja: string;
  options: {
    ko: string;
    en: string;
    ja: string;
    type: LeaderStyle;
  }[];
}

const questions: Question[] = [
  {
    ko: "나는 미래에 대한 설득력 있는 비전으로 다른 사람들에게 영감을 준다",
    en: "I inspire others with a compelling vision for the future",
    ja: "未来への説得力あるビジョンで他者にインスピレーションを与える",
    options: [
      { ko: "매우 그렇다 — 비전으로 사람들을 이끈다", en: "Strongly agree — I lead people through vision", ja: "強くそう思う — ビジョンで人々をリードする", type: "transformational" },
      { ko: "그렇다 — 개인의 필요를 우선시한다", en: "Agree — I prioritize individual needs", ja: "そう思う — 個人のニーズを優先する", type: "servant" },
      { ko: "보통이다 — 명확한 기대와 보상에 집중한다", en: "Neutral — I focus on clear expectations and rewards", ja: "普通 — 明確な期待と報酬に集中する", type: "transactional" },
      { ko: "그렇지 않다 — 각 개인의 발전에 집중한다", en: "Disagree — I focus on each individual's development", ja: "そう思わない — 各個人の発展に集中する", type: "coaching" },
    ],
  },
  {
    ko: "팀원이 어려움을 겪을 때 나의 첫 번째 반응은?",
    en: "When a team member is struggling, my first reaction is:",
    ja: "チームメンバーが苦労しているとき、最初の反応は？",
    options: [
      { ko: "팀 비전과 목표를 상기시켜 동기를 부여한다", en: "Remind them of the team vision and goals to motivate", ja: "チームのビジョンと目標を思い出させてモチベートする", type: "transformational" },
      { ko: "그들의 필요를 경청하고 장애물을 제거한다", en: "Listen to their needs and remove obstacles", ja: "ニーズを聞き障害を取り除く", type: "servant" },
      { ko: "명확한 기대치와 성과 기준을 재확인한다", en: "Reaffirm clear expectations and performance standards", ja: "明確な期待値と成果基準を再確認する", type: "transactional" },
      { ko: "강력한 질문으로 스스로 해결책을 찾도록 돕는다", en: "Help them find solutions through powerful questions", ja: "強力な質問で自分で解決策を見つけるよう助ける", type: "coaching" },
    ],
  },
  {
    ko: "팀원들에게 보상을 줄 때 나의 접근 방식은?",
    en: "My approach to rewarding team members is:",
    ja: "チームメンバーへの報酬のアプローチは？",
    options: [
      { ko: "더 의미 있는 임무와 도전을 맡긴다", en: "Assign more meaningful missions and challenges", ja: "より意味のある任務と挑戦を与える", type: "transformational" },
      { ko: "팀에 얼마나 중요했는지 진심으로 표현한다", en: "Sincerely express how important they were to the team", ja: "チームにとってどれほど重要だったか心から伝える", type: "servant" },
      { ko: "구체적인 성과 수치와 보상 기준을 공개한다", en: "Publicize specific performance metrics and reward criteria", ja: "具体的な成果数値と報酬基準を公表する", type: "transactional" },
      { ko: "다음 성장 단계로 나아갈 기회를 제공한다", en: "Provide opportunities to advance to the next growth stage", ja: "次の成長段階に進む機会を提供する", type: "coaching" },
    ],
  },
  {
    ko: "팀의 성과가 기대에 미치지 못할 때 나는?",
    en: "When team performance falls short of expectations, I:",
    ja: "チームの成果が期待に届かないとき、私は？",
    options: [
      { ko: "팀이 왜 존재하는지 다시 이야기하며 재점화한다", en: "Re-ignite by revisiting why the team exists", ja: "チームがなぜ存在するか再び語り再点火する", type: "transformational" },
      { ko: "팀원들의 어려움과 장애물을 찾아 제거한다", en: "Find and remove obstacles and difficulties facing the team", ja: "チームが直面する困難と障害を見つけ除去する", type: "servant" },
      { ko: "구체적인 KPI와 개선 계획을 수립하고 추적한다", en: "Establish specific KPIs and improvement plans and track them", ja: "具体的なKPIと改善計画を策定し追跡する", type: "transactional" },
      { ko: "개인 면담으로 각자의 동기를 재발견하도록 돕는다", en: "Help each person rediscover their motivation through individual meetings", ja: "個別面談で各自の動機を再発見するよう助ける", type: "coaching" },
    ],
  },
  {
    ko: "리더십에서 내가 가장 중요하게 여기는 것은?",
    en: "What I value most in leadership:",
    ja: "リーダーシップで最も重視することは？",
    options: [
      { ko: "사람들에게 영감을 주고 변화를 만드는 것", en: "Inspiring people and creating change", ja: "人々にインスピレーションを与え変化を生み出す", type: "transformational" },
      { ko: "팀원들이 번성하도록 섬기고 장애물을 제거하는 것", en: "Serving team members so they can thrive", ja: "チームメンバーが成長できるよう仕える", type: "servant" },
      { ko: "명확한 기대와 구조를 통해 결과를 달성하는 것", en: "Achieving results through clear expectations and structure", ja: "明確な期待と構造を通じて結果を達成する", type: "transactional" },
      { ko: "사람들의 잠재력을 최대한 발휘하도록 돕는 것", en: "Helping people maximize their potential", ja: "人々が潜在力を最大限に発揮するよう助ける", type: "coaching" },
    ],
  },
  {
    ko: "새 프로젝트를 시작할 때 나는?",
    en: "When starting a new project, I:",
    ja: "新しいプロジェクトを始めるとき、私は？",
    options: [
      { ko: "조직의 큰 변화에 어떻게 기여하는지 설명하고 영감을 준다", en: "Inspire by explaining how it contributes to bigger change", ja: "大きな変化にどう貢献するかを説明しインスピレーションを与える", type: "transformational" },
      { ko: "각 팀원의 강점과 선호에 맞게 역할을 배분한다", en: "Assign roles based on each member's strengths and preferences", ja: "各メンバーの強みと好みに合わせて役割を割り当てる", type: "servant" },
      { ko: "목표, 마감일, 책임자를 명확히 설정하고 모니터링한다", en: "Clearly set goals, deadlines, and accountabilities and monitor", ja: "目標、締め切り、担当者を明確に設定し監視する", type: "directive" },
      { ko: "각 팀원이 이 프로젝트에서 무엇을 배울지 명확히 한다", en: "Clarify what each member will personally learn from this project", ja: "各メンバーがこのプロジェクトで学ぶことを明確にする", type: "coaching" },
    ],
  },
  {
    ko: "팀원이 실수를 했을 때 나는?",
    en: "When a team member makes a mistake, I:",
    ja: "チームメンバーがミスをしたとき、私は？",
    options: [
      { ko: "실수를 성장의 기회로 보고 팀 전체의 학습으로 연결한다", en: "See it as growth opportunity and connect it to team-wide learning", ja: "成長の機会と見てチーム全体の学びにつなげる", type: "transformational" },
      { ko: "상황을 이해하고 그 사람이 회복할 수 있도록 지원한다", en: "Understand the situation and support them in recovering", ja: "状況を理解しその人が立ち直れるよう支援する", type: "servant" },
      { ko: "명확한 피드백과 개선 기준을 제시한다", en: "Provide clear feedback and improvement standards", ja: "明確なフィードバックと改善基準を提示する", type: "directive" },
      { ko: "왜 그런 결정을 했는지 묻고 다음엔 어떻게 다르게 할지 생각하게 한다", en: "Ask why they decided that and help them think about doing it differently", ja: "なぜそう決断したか聞き次はどう違うかを考えさせる", type: "coaching" },
    ],
  },
];

const results: Record<LeaderStyle, {
  emoji: string;
  color: string;
  famous: { ko: string; en: string; ja: string };
  ko: { title: string; description: string; strength: string; tip: string };
  en: { title: string; description: string; strength: string; tip: string };
  ja: { title: string; description: string; strength: string; tip: string };
}> = {
  transformational: {
    emoji: "🚀",
    color: "#8b5cf6",
    famous: { ko: "스티브 잡스, 넬슨 만델라", en: "Steve Jobs, Nelson Mandela", ja: "スティーブ・ジョブズ、ネルソン・マンデラ" },
    ko: { title: "변혁적 리더", description: "설득력 있는 비전으로 다른 사람들에게 영감을 주고 동기를 부여합니다. 혁신적인 사고를 장려하며 팀이 더 큰 목적을 이해하도록 돕습니다.", strength: "강력한 비전 제시, 혁신 문화 조성, 영향력 있는 소통", tip: "비전을 실행 가능한 단계로 세분화하는 파트너와 협력하면 최고의 성과를 냅니다." },
    en: { title: "Transformational Leader", description: "You inspire and motivate others with a compelling vision. You encourage innovative thinking and help the team understand a greater purpose.", strength: "Powerful vision, fostering innovation culture, impactful communication", tip: "Partnering with someone who can break vision into executable steps produces the best outcomes." },
    ja: { title: "変革型リーダー", description: "説得力あるビジョンで他者にインスピレーションを与えます。革新的な思考を促し、チームがより大きな目的を理解するよう助けます。", strength: "強力なビジョン提示、革新文化醸成、影響力あるコミュニケーション", tip: "ビジョンを実行可能なステップに細分化できるパートナーと協力すると最高の成果が出ます。" },
  },
  servant: {
    emoji: "🌱",
    color: "#10b981",
    famous: { ko: "사티아 나델라, 허브 켈러허", en: "Satya Nadella, Herb Kelleher", ja: "サティア・ナデラ、ハーブ・ケラー" },
    ko: { title: "서번트 리더", description: "팀원들의 필요와 성장을 자신의 것보다 우선시합니다. 모범을 보이고 사람들이 가치 있게 느끼도록 지원하는 환경을 조성합니다.", strength: "높은 팀 신뢰도, 강한 충성심 형성, 지속 가능한 팀 문화", tip: "섬기는 리더십과 명확한 기대치를 균형 잡아야 합니다." },
    en: { title: "Servant Leader", description: "You prioritize team members' needs and growth over your own. You lead by example and create an environment where people feel valued.", strength: "High team trust, building strong loyalty, sustainable team culture", tip: "Balance servant leadership with clear expectations to maintain performance." },
    ja: { title: "サーバントリーダー", description: "チームメンバーのニーズと成長を自分より優先します。模範を示し、人々が価値を感じる環境を作ります。", strength: "高いチームの信頼、強い忠誠心形成、持続可能なチーム文化", tip: "サーバントリーダーシップと明確な期待のバランスを取ることが大切です。" },
  },
  transactional: {
    emoji: "📊",
    color: "#3b82f6",
    famous: { ko: "잭 웰치, 전 GE CEO", en: "Jack Welch, former GE CEO", ja: "ジャック・ウェルチ、元GE CEO" },
    ko: { title: "거래적 리더", description: "명확한 구조를 만들고 기대치를 설정하며 효과적인 보상 시스템을 구축합니다. 정의된 프로세스를 통해 효율적으로 목표를 달성합니다.", strength: "명확한 기대치 설정, 효과적인 시스템 구축, 일관된 피드백 제공", tip: "더 영감을 주는 요소로 구조화된 접근 방식을 보완해보세요." },
    en: { title: "Transactional Leader", description: "You create clear structure, set expectations, and build effective reward systems. You efficiently achieve goals through well-defined processes.", strength: "Clear expectations, effective systems, consistent feedback", tip: "Complement your structured approach with more inspiring elements." },
    ja: { title: "取引型リーダー", description: "明確な構造を作り、期待を設定し、効果的な報酬システムを構築します。明確なプロセスを通じて効率的に目標を達成します。", strength: "明確な期待設定、効果的なシステム構築、一貫したフィードバック", tip: "より刺激的な要素で構造化されたアプローチを補完しましょう。" },
  },
  coaching: {
    emoji: "🎯",
    color: "#f59e0b",
    famous: { ko: "빌 캠벨 (실리콘밸리의 코치)", en: "Bill Campbell (Coach of Silicon Valley)", ja: "ビル・キャンベル（シリコンバレーのコーチ）" },
    ko: { title: "코칭형 리더", description: "팀원들의 장기적 성장과 잠재력 발현에 집중합니다. 답을 주기보다 질문을 통해 팀원들이 스스로 답을 찾도록 돕습니다.", strength: "팀원 역량 개발, 높은 자율성과 동기, 장기적 팀 성장", tip: "코칭이 적합하지 않은 상황(위기, 신입)을 인식하고 유연하게 전환하세요." },
    en: { title: "Coaching Leader", description: "You focus on long-term growth and potential realization of team members. Rather than giving answers, you help members find answers through questions.", strength: "Team competency development, high autonomy, long-term team growth", tip: "Recognize when coaching isn't appropriate and develop flexibility to shift styles." },
    ja: { title: "コーチング型リーダー", description: "チームメンバーの長期的成長と潜在力の発揮に集中します。答えを与えるのでなく、質問を通じて自ら答えを見つけるよう助けます。", strength: "チーム能力開発、高い自律性、長期的チーム成長", tip: "コーチングが適切でない状況を認識し、柔軟にスタイルを切り替えましょう。" },
  },
  directive: {
    emoji: "⚡",
    color: "#ef4444",
    famous: { ko: "조지 패튼 장군", en: "General George Patton", ja: "ジョージ・パットン将軍" },
    ko: { title: "지시적 리더", description: "명확한 지시를 제공하고 통제력을 유지하며 일관성을 보장합니다. 위기 상황이나 방향이 필요한 팀에서 특히 효과적입니다.", strength: "빠른 결정과 실행, 명확한 기대치, 위기 대응력", tip: "팀원의 역량이 높아질수록 더 많은 자율성을 부여하는 상황적 리더십을 연습하세요." },
    en: { title: "Directive Leader", description: "You provide clear instructions, maintain control, and ensure consistency. Especially effective in crisis situations or with teams that need direction.", strength: "Fast decisions, clear expectations, crisis response", tip: "Practice situational leadership — grant more autonomy as team members grow." },
    ja: { title: "指示型リーダー", description: "明確な指示を提供し、コントロールを維持し、一貫性を保証します。危機状況や方向性が必要なチームで特に効果的です。", strength: "迅速な決定、明確な期待値、危機対応力", tip: "チームメンバーが成長するほど自律性を与える状況対応型リーダーシップを練習しましょう。" },
  },
};

const ui = {
  ko: { title: "리더십 진단 테스트", subtitle: "나의 리더십 유형은?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "나의 리더십 스타일", famousLabel: "대표 사례", strength: "주요 강점", tip: "개발 팁", restart: "다시 하기", share: "결과 공유", copied: "복사됨!", scoreLabel: "스타일별 점수" },
  en: { title: "Leader Pulse Test", subtitle: "What is my leadership type?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "My Leadership Style", famousLabel: "Famous Examples", strength: "Key Strengths", tip: "Development Tip", restart: "Restart", share: "Share Result", copied: "Copied!", scoreLabel: "Score by Style" },
  ja: { title: "リーダーシップ診断テスト", subtitle: "私のリーダーシップタイプは？", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "私のリーダーシップスタイル", famousLabel: "代表的な例", strength: "主要な強み", tip: "開発のヒント", restart: "もう一度", share: "結果をシェア", copied: "コピーされました！", scoreLabel: "スタイル別スコア" },
};

export default function LeaderPulseTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = ui[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<LeaderStyle, number>>({ transformational: 0, servant: 0, transactional: 0, coaching: 0, directive: 0 });
  const [result, setResult] = useState<LeaderStyle | null>(null);
  const [copied, setCopied] = useState(false);

  function pick(type: LeaderStyle) {
    const next = { ...scores, [type]: scores[type] + 1 };
    const total = Object.values(next).reduce((a, b) => a + b, 0);
    if (total < questions.length) {
      setScores(next);
      setTimeout(() => setIdx(total), 280);
    } else {
      setScores(next);
      const winner = (Object.keys(next) as LeaderStyle[]).reduce((a, b) => next[a] >= next[b] ? a : b);
      setResult(winner);
    }
  }

  function restart() {
    setIdx(0);
    setScores({ transformational: 0, servant: 0, transactional: 0, coaching: 0, directive: 0 });
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
    const maxScore = Math.max(...Object.values(scores));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 text-center" style={{ background: `linear-gradient(135deg, ${r.color}18, ${r.color}08)`, border: `1px solid ${r.color}30` }}>
          <p className="text-sm font-medium text-gray-500 mb-1">{tx.resultTitle}</p>
          <div className="text-5xl mb-2">{r.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{rd.title}</h2>
          <p className="mt-1 text-sm" style={{ color: r.color }}>{tx.famousLabel}: {r.famous[locale]}</p>
          <p className="mt-3 text-sm text-gray-600">{rd.description}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
          <div>
            <h3 className="font-semibold text-green-700">✅ {tx.strength}</h3>
            <p className="mt-1 text-sm text-gray-600">{rd.strength}</p>
          </div>
          <div className="rounded-lg p-4" style={{ background: `${r.color}10` }}>
            <h3 className="font-semibold" style={{ color: r.color }}>💡 {tx.tip}</h3>
            <p className="mt-1 text-sm text-gray-700">{rd.tip}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-700">{tx.scoreLabel}</h3>
          <div className="space-y-2">
            {(Object.entries(scores) as [LeaderStyle, number][]).map(([style, score]) => (
              <div key={style} className="flex items-center gap-3">
                <span className="w-28 text-xs text-gray-600 truncate">{results[style][locale].title}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${maxScore > 0 ? (score / maxScore) * 100 : 0}%`, backgroundColor: results[style].color }} />
                </div>
                <span className="text-xs text-gray-500 w-4">{score}</span>
              </div>
            ))}
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
          <div className="h-full rounded-full bg-violet-500 transition-all duration-300" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm text-gray-500">{tx.progress(idx + 1, questions.length)}</span>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-5 text-center text-lg font-medium text-gray-800">{q[locale]}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => pick(opt.type)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-violet-300 hover:bg-violet-50">
              {opt[locale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
