'use client';

import { useState } from "react";

interface Props { locale?: string; }

type Strength = "creator" | "analyzer" | "connector" | "achiever" | "healer" | "leader";

const data = {
  ko: {
    title: "강점 발견 테스트: 나의 숨겨진 강점은?",
    description: "12개의 상황 질문으로 당신의 핵심 강점 유형을 발견하세요.",
    questions: [
      { id: "q1", text: "새로운 아이디어나 방법을 떠올릴 때 가장 에너지가 넘친다.", type: "creator" as Strength },
      { id: "q2", text: "복잡한 문제를 데이터와 논리로 분석하는 것이 즐겁다.", type: "analyzer" as Strength },
      { id: "q3", text: "사람들이 연결되고 협력하도록 돕는 역할이 자연스럽다.", type: "connector" as Strength },
      { id: "q4", text: "목표를 세우고 끝까지 완수하는 것에서 만족을 느낀다.", type: "achiever" as Strength },
      { id: "q5", text: "누군가 힘들어할 때 먼저 감지하고 위로를 건넨다.", type: "healer" as Strength },
      { id: "q6", text: "그룹이 나아갈 방향을 제시하는 것이 편안하다.", type: "leader" as Strength },
      { id: "q7", text: "기존 방식보다 더 나은 방법을 항상 탐색한다.", type: "creator" as Strength },
      { id: "q8", text: "정보를 수집하고 패턴을 찾아내는 것이 자연스럽다.", type: "analyzer" as Strength },
      { id: "q9", text: "다양한 배경의 사람들과 쉽게 친해진다.", type: "connector" as Strength },
      { id: "q10", text: "마감과 책임감이 나를 더 집중하게 만든다.", type: "achiever" as Strength },
      { id: "q11", text: "타인의 감정 변화를 빠르게 알아채는 편이다.", type: "healer" as Strength },
      { id: "q12", text: "팀이 어려울 때 앞에 나서서 결정을 내린다.", type: "leader" as Strength },
    ],
    options: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    results: {
      creator: { emoji: "🎨", title: "창조자 (Creator)", desc: "새로운 아이디어와 독창적인 해결책을 만드는 것이 당신의 본질입니다. 변화와 혁신의 씨앗을 뿌리는 사람입니다." },
      analyzer: { emoji: "🔍", title: "분석자 (Analyzer)", desc: "데이터와 논리로 문제의 본질을 꿰뚫는 능력을 가졌습니다. 복잡한 것을 단순하게 만드는 귀재입니다." },
      connector: { emoji: "🤝", title: "연결자 (Connector)", desc: "사람과 아이디어를 연결하는 타고난 네트워커입니다. 당신이 있는 곳에서 협력이 일어납니다." },
      achiever: { emoji: "🏆", title: "실행자 (Achiever)", desc: "목표를 향해 끊임없이 나아가는 추진력의 소유자입니다. 계획을 현실로 만드는 것이 강점입니다." },
      healer: { emoji: "💚", title: "치유자 (Healer)", desc: "타인의 고통에 공감하고 회복을 돕는 깊은 인간미를 가졌습니다. 당신 곁에 있으면 마음이 편안해집니다." },
      leader: { emoji: "⭐", title: "리더 (Leader)", desc: "방향을 제시하고 사람들을 이끄는 자연스러운 리더십을 가졌습니다. 위기에서 빛나는 사람입니다." },
    },
    retake: "다시하기", resultLabel: "나의 핵심 강점",
  },
  en: {
    title: "Strengths Discovery Test: What's Your Hidden Strength?",
    description: "Discover your core strength type through 12 situational questions.",
    questions: [
      { id: "q1", text: "I feel most energized when coming up with new ideas or approaches.", type: "creator" as Strength },
      { id: "q2", text: "I enjoy analyzing complex problems using data and logic.", type: "analyzer" as Strength },
      { id: "q3", text: "Helping people connect and collaborate comes naturally to me.", type: "connector" as Strength },
      { id: "q4", text: "I find deep satisfaction in setting goals and seeing them through.", type: "achiever" as Strength },
      { id: "q5", text: "I sense when someone is struggling and naturally offer comfort.", type: "healer" as Strength },
      { id: "q6", text: "I feel comfortable pointing a group in the right direction.", type: "leader" as Strength },
      { id: "q7", text: "I'm always looking for better ways to do things.", type: "creator" as Strength },
      { id: "q8", text: "Gathering information and finding patterns is second nature to me.", type: "analyzer" as Strength },
      { id: "q9", text: "I make friends easily with people from different backgrounds.", type: "connector" as Strength },
      { id: "q10", text: "Deadlines and responsibility make me more focused.", type: "achiever" as Strength },
      { id: "q11", text: "I quickly notice emotional shifts in others.", type: "healer" as Strength },
      { id: "q12", text: "When a team is in trouble, I step up and make decisions.", type: "leader" as Strength },
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      creator: { emoji: "🎨", title: "Creator", desc: "Generating new ideas and original solutions is your essence. You are the seed of change and innovation." },
      analyzer: { emoji: "🔍", title: "Analyzer", desc: "You have the ability to pierce through the core of problems with data and logic. A master at simplifying the complex." },
      connector: { emoji: "🤝", title: "Connector", desc: "You're a born networker who connects people and ideas. Collaboration happens wherever you are." },
      achiever: { emoji: "🏆", title: "Achiever", desc: "You possess the drive to relentlessly move toward goals. Your strength is turning plans into reality." },
      healer: { emoji: "💚", title: "Healer", desc: "You have deep humanity — empathizing with others' pain and helping them recover. You bring comfort." },
      leader: { emoji: "⭐", title: "Leader", desc: "You have a natural leadership that sets direction and guides people. You shine brightest in a crisis." },
    },
    retake: "Retake", resultLabel: "Your Core Strength",
  },
};

export default function StrengthSageTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const scores = Object.fromEntries(
    (["creator", "analyzer", "connector", "achiever", "healer", "leader"] as Strength[]).map((s) => [s, 0])
  ) as Record<Strength, number>;

  t.questions.forEach((q) => {
    if (answers[q.id]) scores[q.type] += answers[q.id];
  });

  const topStrength = (Object.entries(scores) as [Strength, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[topStrength];
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
          <p className="text-slate-700 text-base leading-relaxed">{r.desc}</p>
        </div>
        <button onClick={() => { setAnswers({}); setPhase("quiz"); }} className="text-slate-400 text-sm hover:underline">{t.retake}</button>
      </div>
    );
  }

  return (
    <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-black text-slate-900">{t.title}</h3>
        <p className="text-sm text-slate-500 mt-2">{t.description}</p>
        <div className="mt-3 h-2 bg-slate-100 rounded-full">
          <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="space-y-8">
        {t.questions.map((q, i) => (
          <div key={q.id} className="space-y-3">
            <p className="font-semibold text-slate-800 leading-snug">{i + 1}. {q.text}</p>
            <div className="grid grid-cols-5 gap-1">
              {t.options.map((opt, v) => (
                <button
                  key={v}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: v + 1 }))}
                  className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${answers[q.id] === v + 1 ? "bg-emerald-600 border-emerald-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center pt-4">
        <button
          disabled={!isComplete}
          onClick={() => setPhase("result")}
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
