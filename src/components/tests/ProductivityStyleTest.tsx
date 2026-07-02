'use client';

import { useState } from "react";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type ProductivityType = "deepwork" | "multitasker" | "collaborator" | "flexible";

interface Question {
  ko: string;
  en: string;
  ja: string;
  options: {
    ko: string;
    en: string;
    ja: string;
    type: ProductivityType;
  }[];
}

const questions: Question[] = [
  {
    ko: "업무 중 알림이 울릴 때 나는?",
    en: "When a notification goes off during work, I:",
    ja: "作業中に通知が来たとき、私は？",
    options: [
      { ko: "무시하고 나중에 몰아서 확인한다 — 방해받기 싫다", en: "Ignore it and check later in batch — I hate interruptions", ja: "無視して後でまとめて確認する — 邪魔されたくない", type: "deepwork" },
      { ko: "빠르게 확인하고 다른 업무로 넘어간다", en: "Quickly check and move to another task", ja: "素早く確認して別の作業へ移る", type: "multitasker" },
      { ko: "동료의 연락이면 바로 응답한다 — 협업이 중요하다", en: "Reply immediately if from a colleague — collaboration matters", ja: "同僚からなら即返信 — コラボが大事", type: "collaborator" },
      { ko: "상황에 따라 다르게 대응한다", en: "Respond differently depending on the situation", ja: "状況によって対応を変える", type: "flexible" },
    ],
  },
  {
    ko: "최고의 성과를 내는 환경은?",
    en: "The environment where I do my best work:",
    ja: "最高のパフォーマンスを発揮できる環境は？",
    options: [
      { ko: "방해받지 않는 조용한 공간에서 긴 시간 집중", en: "Quiet space with no interruptions for long focus blocks", ja: "邪魔されない静かな空間で長時間集中", type: "deepwork" },
      { ko: "여러 화면과 다양한 도구가 있는 역동적인 공간", en: "Dynamic space with multiple screens and varied tools", ja: "複数の画面と多様なツールがある動的な空間", type: "multitasker" },
      { ko: "팀원들과 함께 브레인스토밍할 수 있는 협업 공간", en: "Collaborative space where I can brainstorm with teammates", ja: "チームメンバーとブレインストーミングできる共同作業空間", type: "collaborator" },
      { ko: "카페, 도서관 등 장소를 바꿔가며 작업한다", en: "I change locations — cafes, libraries, wherever", ja: "カフェ、図書館など場所を変えながら作業する", type: "flexible" },
    ],
  },
  {
    ko: "프로젝트를 시작할 때 나는?",
    en: "When starting a project, I:",
    ja: "プロジェクトを始めるとき、私は？",
    options: [
      { ko: "먼저 깊이 있는 리서치와 분석에 전용 시간을 확보한다", en: "First secure dedicated time for deep research and analysis", ja: "まず深いリサーチと分析のための専用時間を確保する", type: "deepwork" },
      { ko: "여러 하위 작업을 동시에 시작하고 진행 상황을 추적한다", en: "Start multiple subtasks simultaneously and track progress", ja: "複数のサブタスクを同時に開始し進捗を追跡する", type: "multitasker" },
      { ko: "팀원들과 킥오프 미팅을 열어 함께 계획을 세운다", en: "Hold a kickoff meeting with teammates to plan together", ja: "チームメンバーとキックオフミーティングを開き共に計画する", type: "collaborator" },
      { ko: "큰 그림만 잡고 상황에 따라 유연하게 진행한다", en: "Grasp the big picture and proceed flexibly as situations unfold", ja: "大きな絵だけ把握し状況に応じて柔軟に進める", type: "flexible" },
    ],
  },
  {
    ko: "업무에서 가장 큰 에너지를 얻는 순간은?",
    en: "The moment I get the most energy from work:",
    ja: "仕事から最も大きなエネルギーを得る瞬間は？",
    options: [
      { ko: "몰입 상태(플로우)에서 복잡한 문제를 완전히 해결했을 때", en: "When I completely solve a complex problem in a flow state", ja: "フロー状態で複雑な問題を完全に解決したとき", type: "deepwork" },
      { ko: "여러 프로젝트를 효율적으로 동시에 진행할 때", en: "When I efficiently run multiple projects simultaneously", ja: "複数のプロジェクトを効率的に同時進行させたとき", type: "multitasker" },
      { ko: "팀과의 협업으로 혼자서는 불가능한 결과를 만들었을 때", en: "When collaboration produces results impossible alone", ja: "チームとの協力で一人では不可能な結果を生み出したとき", type: "collaborator" },
      { ko: "예상치 못한 상황에서도 유연하게 대처하여 성공했을 때", en: "When I succeed by adapting flexibly to unexpected situations", ja: "予想外の状況でも柔軟に対処して成功したとき", type: "flexible" },
    ],
  },
  {
    ko: "일정 관리 방식은?",
    en: "My approach to scheduling:",
    ja: "スケジュール管理の方法は？",
    options: [
      { ko: "시간 블록을 설정하고 깊은 집중 시간을 보호한다", en: "Set time blocks and protect deep focus time", ja: "タイムブロックを設定し深い集中時間を守る", type: "deepwork" },
      { ko: "짧은 세션들로 여러 업무를 번갈아 처리한다", en: "Alternate between multiple tasks in short sessions", ja: "短いセッションで複数の作業を交互に処理する", type: "multitasker" },
      { ko: "팀 회의와 협업 시간을 중심으로 일정을 짠다", en: "Build my schedule around team meetings and collaboration", ja: "チームミーティングと協力時間を中心にスケジュールを組む", type: "collaborator" },
      { ko: "그날의 에너지와 상황에 따라 즉흥적으로 조정한다", en: "Adjust spontaneously based on my energy and situation each day", ja: "その日のエネルギーと状況に応じて即興で調整する", type: "flexible" },
    ],
  },
  {
    ko: "새로운 아이디어는 어디서 가장 많이 나오나요?",
    en: "Where do most of my new ideas come from?",
    ja: "新しいアイデアはどこから最も多く生まれますか？",
    options: [
      { ko: "혼자 깊이 생각하거나 독서할 때", en: "When thinking deeply alone or reading", ja: "一人で深く考えているときや読書しているとき", type: "deepwork" },
      { ko: "여러 프로젝트 사이를 오가다가 연결 고리를 발견할 때", en: "When I notice connections while switching between projects", ja: "プロジェクト間を行き来しながら繋がりを発見したとき", type: "multitasker" },
      { ko: "팀 브레인스토밍이나 대화를 통해", en: "Through team brainstorming or conversations", ja: "チームブレインストーミングや会話を通じて", type: "collaborator" },
      { ko: "산책하거나 환경을 바꿀 때 갑자기 떠오른다", en: "Suddenly appear when walking or changing environments", ja: "散歩したり環境を変えたりしたとき突然浮かぶ", type: "flexible" },
    ],
  },
];

const results: Record<ProductivityType, {
  emoji: string;
  color: string;
  ko: { title: string; subtitle: string; description: string; traits: string[] };
  en: { title: string; subtitle: string; description: string; traits: string[] };
  ja: { title: string; subtitle: string; description: string; traits: string[] };
}> = {
  deepwork: {
    emoji: "🎯",
    color: "#6366f1",
    ko: { title: "몰입형 전사", subtitle: "집중력의 대가", description: "방해받지 않는 긴 시간 동안 집중할 때 최상의 성과를 냅니다. 복잡한 문제를 깊이 파고들 때 최고의 역량을 발휘합니다. 알림은 당신의 적이며, 플로우 상태는 당신의 초능력입니다.", traits: ["방해 요소가 최소화된 환경에서 최고 효율", "높은 인지력이 필요한 복잡한 업무를 위해 전용 시간 블록 활용", "단일 업무에 대한 지속적이고 집중적인 몰입으로 성과 달성"] },
    en: { title: "Deep Work Warrior", subtitle: "Master of Focus", description: "You perform at your best when you can focus for long uninterrupted blocks. You excel at diving deep into complex problems. Notifications are your enemy and flow state is your superpower.", traits: ["Peak efficiency in environments with minimal distractions", "Uses dedicated time blocks for complex tasks requiring high cognition", "Achieves results through sustained, intense focus on a single task"] },
    ja: { title: "没入型ウォリアー", subtitle: "集中の達人", description: "邪魔されない長い時間集中できるとき最高のパフォーマンスを発揮します。複雑な問題に深く入り込むとき最高の能力を発揮します。通知はあなたの敵で、フロー状態はあなたの超能力です。", traits: ["妨害要素が最小化された環境で最高効率", "高い認知力が必要な複雑な作業のための専用タイムブロック活用", "単一タスクへの持続的な集中でパフォーマンス達成"] },
  },
  multitasker: {
    emoji: "🎪",
    color: "#f59e0b",
    ko: { title: "멀티태스킹 달인", subtitle: "맥락 전환의 귀재", description: "다양한 업무를 동시에 처리하며 활력을 얻습니다. 한 번에 여러 가지 일을 관리하는 데 능숙하며 역동적인 환경을 좋아합니다.", traits: ["여러 프로젝트와 우선순위를 동시에 관리하는 데 탁월함", "다양성과 각기 다른 업무 유형 간의 전환을 통해 활력을 얻음", "다양한 책임이 부여되는 역동적인 환경에서 최고의 역량 발휘"] },
    en: { title: "Multitasking Maven", subtitle: "Context Switching Genius", description: "You thrive by handling multiple tasks simultaneously. You are skilled at managing many things at once and love dynamic environments.", traits: ["Excellent at managing multiple projects and priorities simultaneously", "Energized by variety and switching between different task types", "Performs best in dynamic environments with diverse responsibilities"] },
    ja: { title: "マルチタスクの達人", subtitle: "コンテキスト切替の天才", description: "複数のタスクを同時に処理することで活力を得ます。一度に多くのことを管理するのが得意で、動的な環境が好きです。", traits: ["複数のプロジェクトと優先事項を同時に管理するのに優れている", "多様性と異なるタスクタイプの切り替えからエネルギーを得る", "多様な責任が与えられる動的な環境で最高のパフォーマンス"] },
  },
  collaborator: {
    emoji: "🤝",
    color: "#10b981",
    ko: { title: "소셜 협업가", subtitle: "최강의 팀 플레이어", description: "다른 사람들과 함께 일할 때 최고의 성과를 냅니다. 브레인스토밍 세션은 당신에게 에너지를 주며, 공동의 목표에서 동기를 얻습니다.", traits: ["협업 세션을 통해 최고의 아이디어와 에너지를 얻음", "그룹 브레인스토밍과 팀 단위 문제 해결을 선호함", "공동의 목표와 팀워크를 통해 강한 의욕과 책임감을 느낌"] },
    en: { title: "Social Collaborator", subtitle: "Ultimate Team Player", description: "You perform at your best when working with others. Brainstorming sessions energize you, and shared goals motivate you.", traits: ["Gets best ideas and energy through collaborative sessions", "Prefers group brainstorming and team-based problem solving", "Feels strong motivation and accountability through shared goals"] },
    ja: { title: "ソーシャルコラボレーター", subtitle: "最強のチームプレイヤー", description: "他の人と一緒に作業するとき最高のパフォーマンスを発揮します。ブレインストーミングセッションはエネルギーを与え、共通の目標が動機になります。", traits: ["協力セッションで最高のアイデアとエネルギーを得る", "グループブレインストーミングとチームベースの問題解決を好む", "共通の目標とチームワークで強いモチベーションと責任感を感じる"] },
  },
  flexible: {
    emoji: "🌊",
    color: "#06b6d4",
    ko: { title: "유연한 적응가", subtitle: "흐름의 마스터", description: "어떤 상황에서도 잘 적응하며 즉흥성을 즐깁니다. 자신의 에너지 레벨과 상황 변화에 맞춰 유연하게 일하는 것을 선호합니다.", traits: ["변하는 우선순위와 예상치 못한 업무에 매끄럽게 적응함", "경직된 일정보다 자연스러운 에너지 리듬에 맞춰 업무 수행", "모호한 상황에 유연하며 다양한 접근 방식을 시도하는 것을 즐김"] },
    en: { title: "Flexible Adapter", subtitle: "Master of Flow", description: "You adapt well to any situation and enjoy improvising. You prefer to work flexibly according to your energy levels and changing circumstances.", traits: ["Smoothly adapts to shifting priorities and unexpected tasks", "Works according to natural energy rhythms rather than rigid schedules", "Comfortable with ambiguity and enjoys trying different approaches"] },
    ja: { title: "フレキシブルアダプター", subtitle: "フローのマスター", description: "どんな状況にもうまく適応し即興を楽しみます。エネルギーレベルと変化する状況に合わせて柔軟に働くことを好みます。", traits: ["変化する優先事項と予期しないタスクにスムーズに適応する", "硬直したスケジュールよりも自然なエネルギーリズムに従って作業", "曖昧さに柔軟で様々なアプローチを試みることを楽しむ"] },
  },
};

const ui = {
  ko: { title: "생산성 유형 테스트", subtitle: "나는 어떻게 일할 때 최고인가?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "나의 생산성 스타일", traitsLabel: "나의 업무 특성", restart: "다시 하기", share: "결과 공유", copied: "복사됨!" },
  en: { title: "Productivity Style Test", subtitle: "When am I at my best?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "My Productivity Style", traitsLabel: "My Work Traits", restart: "Restart", share: "Share Result", copied: "Copied!" },
  ja: { title: "生産性スタイルテスト", subtitle: "どのように働くとき最高か？", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "私の生産性スタイル", traitsLabel: "私の仕事の特性", restart: "もう一度", share: "結果をシェア", copied: "コピーされました！" },
};

export default function ProductivityStyleTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = ui[locale];

  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<ProductivityType, number>>({ deepwork: 0, multitasker: 0, collaborator: 0, flexible: 0 });
  const [result, setResult] = useState<ProductivityType | null>(null);
  const [copied, setCopied] = useState(false);

  function pick(type: ProductivityType) {
    const next = { ...scores, [type]: scores[type] + 1 };
    const total = Object.values(next).reduce((a, b) => a + b, 0);
    if (total < questions.length) {
      setScores(next);
      setTimeout(() => setIdx(total), 280);
    } else {
      setScores(next);
      const winner = (Object.keys(next) as ProductivityType[]).reduce((a, b) => next[a] >= next[b] ? a : b);
      setResult(winner);
    }
  }

  function restart() {
    setIdx(0);
    setScores({ deepwork: 0, multitasker: 0, collaborator: 0, flexible: 0 });
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

    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-6 text-center" style={{ background: `linear-gradient(135deg, ${r.color}18, ${r.color}08)`, border: `1px solid ${r.color}30` }}>
          <p className="text-sm font-medium text-gray-500 mb-1">{tx.resultTitle}</p>
          <div className="text-5xl mb-2">{r.emoji}</div>
          <h2 className="text-2xl font-bold text-gray-900">{rd.title}</h2>
          <p className="mt-1 text-sm font-medium" style={{ color: r.color }}>{rd.subtitle}</p>
          <p className="mt-3 text-sm text-gray-600">{rd.description}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-700">{tx.traitsLabel}</h3>
          <div className="space-y-2">
            {rd.traits.map((trait, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="flex-shrink-0 font-bold" style={{ color: r.color }}>✦</span>
                <span>{trait}</span>
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
          <div className="h-full rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm text-gray-500">{tx.progress(idx + 1, questions.length)}</span>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-5 text-center text-lg font-medium text-gray-800">{q[locale]}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => pick(opt.type)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50">
              {opt[locale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
