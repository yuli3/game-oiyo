'use client';

import { useState } from "react";

type SupportedLocale = "ko" | "en" | "ja";

interface Props {
  locale?: string;
}

type BlockerCategory = "notification" | "conversation" | "taskSwitching" | "environment";

interface QuestionOption {
  ko: string;
  en: string;
  ja: string;
  score: number;
}

interface Question {
  id: string;
  category: BlockerCategory;
  ko: string;
  en: string;
  ja: string;
  options: QuestionOption[];
}

const questions: Question[] = [
  {
    id: "q1", category: "notification",
    ko: "업무 중 알림(메시지, 이메일 등)이 울릴 때 나는?",
    en: "When a notification (message, email, etc.) goes off during work, I:",
    ja: "作業中に通知（メッセージ、メールなど）が鳴ったとき、私は？",
    options: [
      { ko: "즉시 확인하고 답장한다", en: "Check and reply immediately", ja: "すぐに確認して返信する", score: 9 },
      { ko: "잠깐 확인만 하고 나중에 답장한다", en: "Just check and reply later", ja: "少し確認して後で返信する", score: 6 },
      { ko: "집중 중이면 무시하고 나중에 본다", en: "Ignore if focused and check later", ja: "集中中なら無視して後で確認する", score: 3 },
      { ko: "방해금지 모드로 아예 안 본다", en: "Use do-not-disturb mode and don't look at all", ja: "おやすみモードで全く見ない", score: 1 },
    ],
  },
  {
    id: "q2", category: "notification",
    ko: "하루에 스마트폰을 몇 번이나 확인하나요?",
    en: "How many times a day do you check your smartphone?",
    ja: "1日に何回スマートフォンを確認しますか？",
    options: [
      { ko: "수시로 확인 (50회 이상)", en: "Constantly (50+ times)", ja: "常に確認（50回以上）", score: 10 },
      { ko: "자주 확인 (30-50회)", en: "Often (30-50 times)", ja: "頻繁に（30〜50回）", score: 7 },
      { ko: "가끔 확인 (10-30회)", en: "Sometimes (10-30 times)", ja: "時々（10〜30回）", score: 4 },
      { ko: "필요할 때만 (10회 미만)", en: "Only when needed (under 10 times)", ja: "必要なときだけ（10回未満）", score: 1 },
    ],
  },
  {
    id: "q3", category: "conversation",
    ko: "동료가 갑자기 말을 걸어올 때 나는?",
    en: "When a colleague suddenly starts talking to me, I:",
    ja: "同僚が突然話しかけてきたとき、私は？",
    options: [
      { ko: "하던 일을 멈추고 바로 대화한다", en: "Stop what I'm doing and talk right away", ja: "作業を止めてすぐに話す", score: 8 },
      { ko: "잠깐만 하고 대화에 응한다", en: "Ask for a moment then talk", ja: "少し待ってもらってから話す", score: 6 },
      { ko: "지금 바쁘다고 나중에 얘기하자고 한다", en: "Say I'm busy and talk later", ja: "今忙しいと言って後で話す", score: 3 },
      { ko: "헤드폰으로 말 걸기 어렵게 한다", en: "Wear headphones to make it hard to approach", ja: "ヘッドフォンで話しかけにくくする", score: 1 },
    ],
  },
  {
    id: "q4", category: "conversation",
    ko: "오픈 오피스에서 주변 대화 소리가 들릴 때?",
    en: "When you hear surrounding conversations in an open office:",
    ja: "オープンオフィスで周りの会話が聞こえるとき？",
    options: [
      { ko: "신경 쓰여서 집중이 안 된다", en: "I get distracted and can't concentrate", ja: "気になって集中できない", score: 9 },
      { ko: "가끔 방해되지만 어느 정도 적응했다", en: "Sometimes distracting but I've somewhat adapted", ja: "時々邪魔されるがある程度慣れた", score: 5 },
      { ko: "음악으로 차단한다", en: "Block it with music", ja: "音楽でブロックする", score: 3 },
      { ko: "전혀 신경 안 쓰인다", en: "Not bothered at all", ja: "全く気にならない", score: 1 },
    ],
  },
  {
    id: "q5", category: "taskSwitching",
    ko: "하나의 업무를 하다가 다른 요청이 들어오면?",
    en: "When another request comes in while you're working on a task:",
    ja: "一つの作業中に別の依頼が来たとき？",
    options: [
      { ko: "바로 새 업무로 전환한다", en: "Switch to the new task immediately", ja: "すぐに新しい作業に切り替える", score: 10 },
      { ko: "현재 작업을 대충 마무리하고 전환한다", en: "Roughly finish current task and switch", ja: "現在の作業を大まかに終わらせて切り替える", score: 7 },
      { ko: "현재 작업의 단락을 끝내고 전환한다", en: "Finish current section and switch", ja: "現在の作業の段落を終えてから切り替える", score: 4 },
      { ko: "현재 작업을 완전히 끝낸 후 시작한다", en: "Start only after completely finishing the current task", ja: "現在の作業を完全に終えてから始める", score: 2 },
    ],
  },
  {
    id: "q6", category: "taskSwitching",
    ko: "하루에 얼마나 많은 업무를 동시에 진행하나요?",
    en: "How many tasks do you run simultaneously in a day?",
    ja: "1日に何個の作業を同時に進めますか？",
    options: [
      { ko: "5개 이상 동시 진행", en: "5 or more simultaneously", ja: "5つ以上同時進行", score: 10 },
      { ko: "3-4개 동시 진행", en: "3-4 simultaneously", ja: "3〜4個同時進行", score: 7 },
      { ko: "1-2개 집중", en: "Focus on 1-2", ja: "1〜2個に集中", score: 3 },
      { ko: "한 번에 하나만", en: "Only one at a time", ja: "一度に一つだけ", score: 1 },
    ],
  },
  {
    id: "q7", category: "environment",
    ko: "책상 주변이 어떤 상태인가요?",
    en: "What is the state of your desk area?",
    ja: "デスク周りはどんな状態ですか？",
    options: [
      { ko: "서류, 물건이 어질러져 있다", en: "Papers and items are scattered", ja: "書類や物が散乱している", score: 7 },
      { ko: "필요한 건 있지만 조금 지저분하다", en: "Needed items are there but slightly messy", ja: "必要なものはあるが少し散らかっている", score: 5 },
      { ko: "정리되어 있고 필요한 것만 있다", en: "Organized with only what's needed", ja: "整理されて必要なものだけある", score: 2 },
      { ko: "미니멀하게 아무것도 없다", en: "Minimal — almost nothing", ja: "ミニマルで何もない", score: 1 },
    ],
  },
  {
    id: "q8", category: "environment",
    ko: "회의나 미팅이 하루에 얼마나 자주 있나요?",
    en: "How often do you have meetings in a day?",
    ja: "1日に会議やミーティングはどのくらいありますか？",
    options: [
      { ko: "5개 이상 (거의 종일 회의)", en: "5 or more (almost all day)", ja: "5個以上（ほぼ終日会議）", score: 10 },
      { ko: "3-4개 (하루의 절반)", en: "3-4 (half the day)", ja: "3〜4個（半日）", score: 7 },
      { ko: "1-2개 (적당함)", en: "1-2 (appropriate)", ja: "1〜2個（適度）", score: 3 },
      { ko: "없거나 가끔 (집중 가능)", en: "None or rarely (can focus)", ja: "なしまたはたまに（集中できる）", score: 1 },
    ],
  },
  {
    id: "q9", category: "notification",
    ko: "긴급하지 않은 메일이나 메시지가 왔을 때?",
    en: "When a non-urgent email or message arrives:",
    ja: "緊急でないメールやメッセージが来たとき？",
    options: [
      { ko: "바로 확인하고 처리한다", en: "Check and handle it right away", ja: "すぐに確認して処理する", score: 8 },
      { ko: "확인만 하고 메모해둔다", en: "Just check and make a note", ja: "確認だけしてメモしておく", score: 5 },
      { ko: "정해진 시간에 일괄 처리한다", en: "Handle in batches at set times", ja: "決まった時間にまとめて処理する", score: 2 },
      { ko: "하루 종료 전에 확인한다", en: "Check before the end of the day", ja: "一日の終わりに確認する", score: 1 },
    ],
  },
  {
    id: "q10", category: "taskSwitching",
    ko: "깊은 집중이 필요한 업무를 얼마나 자주 하나요?",
    en: "How often do you do work that requires deep focus?",
    ja: "深い集中が必要な作業をどのくらいの頻度でしますか？",
    options: [
      { ko: "거의 없다 — 항상 분산되어 있다", en: "Rarely — always fragmented", ja: "ほとんどない — 常に分散している", score: 9 },
      { ko: "가끔 — 집중할 시간이 부족하다", en: "Sometimes — not enough time to focus", ja: "時々 — 集中する時間が不足している", score: 7 },
      { ko: "자주 — 시간을 확보하려 노력한다", en: "Often — I try to secure time", ja: "頻繁に — 時間を確保しようとしている", score: 3 },
      { ko: "매일 — 시간 블록을 설정한다", en: "Daily — I set time blocks", ja: "毎日 — タイムブロックを設定する", score: 1 },
    ],
  },
];

const categoryInfo: Record<BlockerCategory, {
  emoji: string;
  color: string;
  ko: { title: string; action: string };
  en: { title: string; action: string };
  ja: { title: string; action: string };
}> = {
  notification: { emoji: "🔔", color: "#ef4444", ko: { title: "알림 방해", action: "방해금지 모드 활성화 및 알림 정리" }, en: { title: "Notification Distraction", action: "Activate do-not-disturb and clean up notifications" }, ja: { title: "通知の妨害", action: "おやすみモードを有効にして通知を整理する" } },
  conversation: { emoji: "💬", color: "#f59e0b", ko: { title: "대화/소음 방해", action: "집중 시간대 설정 및 팀 공유" }, en: { title: "Conversation/Noise", action: "Set focused hours and share with team" }, ja: { title: "会話/騒音の妨害", action: "集中時間帯を設定してチームと共有する" } },
  taskSwitching: { emoji: "🔀", color: "#8b5cf6", ko: { title: "업무 전환 방해", action: "타임블로킹 및 우선순위 관리" }, en: { title: "Task Switching", action: "Time-blocking and priority management" }, ja: { title: "タスク切り替えの妨害", action: "タイムブロッキングと優先順位管理" } },
  environment: { emoji: "🏢", color: "#06b6d4", ko: { title: "환경 방해", action: "물리적 환경 개선 및 불필요한 회의 제거" }, en: { title: "Environment", action: "Improve physical environment and cut unnecessary meetings" }, ja: { title: "環境の妨害", action: "物理的環境の改善と不要な会議の削減" } },
};

const ui = {
  ko: { title: "집중력 방해 요인 테스트", subtitle: "무엇이 나의 포커스를 막는가?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "나의 집중 방해 분석 결과", topBlockersLabel: "즉시 개선해야 할 방해 요소", actionPlanLabel: "개선 액션 플랜", restart: "다시 분석하기", share: "결과 공유", copied: "복사됨!", scoreLabel: "카테고리별 방해 점수" },
  en: { title: "Focus Blocker Test", subtitle: "What's blocking my focus?", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "My Focus Blocker Analysis", topBlockersLabel: "Top Blockers to Address", actionPlanLabel: "Action Plan", restart: "Analyze Again", share: "Share Result", copied: "Copied!", scoreLabel: "Blocker Score by Category" },
  ja: { title: "集中力妨害要因テスト", subtitle: "何が私のフォーカスを妨げているか？", progress: (c: number, t: number) => `${c} / ${t}`, resultTitle: "私の集中妨害分析結果", topBlockersLabel: "すぐに改善すべき妨害要素", actionPlanLabel: "改善アクションプラン", restart: "再度分析する", share: "結果をシェア", copied: "コピーされました！", scoreLabel: "カテゴリ別妨害スコア" },
};

export default function FocusBlockerTest({ locale: localeProp }: Props) {
  const lp = (localeProp ?? "en").toLowerCase();
  const locale: SupportedLocale = (["ko", "en", "ja"].includes(lp) ? lp : "en") as SupportedLocale;
  const tx = ui[locale];

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<{ category: BlockerCategory; score: number }[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);

  function pick(category: BlockerCategory, score: number) {
    const next = [...answers, { category, score }];
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
    if (navigator.share) {
      await navigator.share({ title: tx.title, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (showResult) {
    const catScores: Record<BlockerCategory, number> = { notification: 0, conversation: 0, taskSwitching: 0, environment: 0 };
    const catCounts: Record<BlockerCategory, number> = { notification: 0, conversation: 0, taskSwitching: 0, environment: 0 };
    answers.forEach(({ category, score }) => { catScores[category] += score; catCounts[category]++; });
    const catAvg: Record<BlockerCategory, number> = {
      notification: catCounts.notification > 0 ? catScores.notification / catCounts.notification : 0,
      conversation: catCounts.conversation > 0 ? catScores.conversation / catCounts.conversation : 0,
      taskSwitching: catCounts.taskSwitching > 0 ? catScores.taskSwitching / catCounts.taskSwitching : 0,
      environment: catCounts.environment > 0 ? catScores.environment / catCounts.environment : 0,
    };
    const sorted = (Object.keys(catAvg) as BlockerCategory[]).sort((a, b) => catAvg[b] - catAvg[a]);
    const maxScore = Math.max(...Object.values(catAvg), 1);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-6 text-center">
          <p className="text-sm font-medium text-orange-600 mb-1">{tx.resultTitle}</p>
          <div className="text-5xl mb-2">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900">{categoryInfo[sorted[0]][locale].title}</h2>
          <p className="mt-2 text-sm text-gray-600">{locale === "ko" ? "가장 큰 방해 요소" : locale === "ja" ? "最大の妨害要素" : "Your biggest blocker"}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-700">{tx.scoreLabel}</h3>
          <div className="space-y-3">
            {sorted.map((cat) => {
              const ci = categoryInfo[cat];
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{ci.emoji} {ci[locale].title}</span>
                    <span className="text-xs text-gray-400">{Math.round((catAvg[cat] / 10) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(catAvg[cat] / maxScore) * 100}%`, backgroundColor: ci.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-700">{tx.actionPlanLabel}</h3>
          <div className="space-y-2">
            {sorted.slice(0, 3).map((cat, rank) => {
              const ci = categoryInfo[cat];
              return (
                <div key={cat} className="flex items-start gap-3 rounded-lg p-3" style={{ backgroundColor: `${ci.color}10` }}>
                  <span className="flex-shrink-0 font-bold text-sm" style={{ color: ci.color }}>#{rank + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{ci.emoji} {ci[locale].title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{ci[locale].action}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={restart} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50">{tx.restart}</button>
          <button onClick={share} className="flex-1 rounded-xl py-3 text-sm font-medium text-white transition bg-orange-500 hover:bg-orange-600">{copied ? tx.copied : tx.share}</button>
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
          <div className="h-full rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="text-sm text-gray-500">{tx.progress(idx + 1, questions.length)}</span>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-5 text-center text-lg font-medium text-gray-800">{q[locale]}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => pick(q.category, opt.score)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-orange-300 hover:bg-orange-50">
              {opt[locale]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
