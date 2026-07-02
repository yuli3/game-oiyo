'use client';

import { useState } from "react";

interface Props { locale?: string; }

type SolverStyle = "analytical" | "creative" | "practical" | "collaborative" | "strategic";

const data = {
  ko: {
    title: "문제 해결사 테스트: 나의 문제 해결 스타일은?",
    description: "15개의 질문으로 나만의 문제 해결 방식을 발견하세요.",
    questions: [
      { id: "q1", text: "새로운 문제를 만났을 때 먼저 데이터와 사실을 수집하고 분석한다.", type: "analytical" as SolverStyle },
      { id: "q2", text: "기존에 없던 독창적인 아이디어로 문제를 해결하는 것을 즐긴다.", type: "creative" as SolverStyle },
      { id: "q3", text: "복잡한 이론보다 바로 실행할 수 있는 현실적인 해결책을 선호한다.", type: "practical" as SolverStyle },
      { id: "q4", text: "팀원들과 함께 머리를 맞대고 해결책을 찾는 것이 효과적이다.", type: "collaborative" as SolverStyle },
      { id: "q5", text: "문제의 근본 원인을 파악하고 장기적인 해결책을 세우는 것이 중요하다.", type: "strategic" as SolverStyle },
      { id: "q6", text: "문제를 단계별로 쪼개서 논리적으로 접근하는 방식이 편하다.", type: "analytical" as SolverStyle },
      { id: "q7", text: "브레인스토밍처럼 자유로운 발상에서 최고의 해결책이 나온다고 생각한다.", type: "creative" as SolverStyle },
      { id: "q8", text: "즉시 시도해보고 결과를 보면서 수정하는 방식으로 문제를 해결한다.", type: "practical" as SolverStyle },
      { id: "q9", text: "다양한 관점을 가진 사람들의 의견을 모아 더 나은 답을 찾는다.", type: "collaborative" as SolverStyle },
      { id: "q10", text: "문제 해결 전에 전체적인 큰 그림과 목표를 먼저 설정한다.", type: "strategic" as SolverStyle },
      { id: "q11", text: "숫자와 패턴을 분석하면 대부분의 문제의 답이 보인다.", type: "analytical" as SolverStyle },
      { id: "q12", text: "남들이 생각하지 못한 방법으로 문제를 해결할 때 가장 뿌듯하다.", type: "creative" as SolverStyle },
      { id: "q13", text: "완벽한 계획보다 빠른 실행과 피드백이 더 중요하다.", type: "practical" as SolverStyle },
      { id: "q14", text: "혼자보다 팀이 함께할 때 더 창의적이고 좋은 결과가 나온다.", type: "collaborative" as SolverStyle },
      { id: "q15", text: "눈앞의 문제보다 이 문제가 미칠 영향과 파급 효과를 먼저 생각한다.", type: "strategic" as SolverStyle },
    ],
    options: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    results: {
      analytical: { emoji: "🔬", title: "분석형 해결사 (Analytical Solver)", desc: "당신은 데이터와 논리로 문제를 해결하는 분석가입니다. 패턴을 발견하고 체계적으로 접근하는 능력이 뛰어납니다. 복잡한 문제를 단계별로 분해하여 근거 있는 솔루션을 도출합니다." },
      creative: { emoji: "💡", title: "창의형 해결사 (Creative Solver)", desc: "당신은 독창적인 아이디어로 문제를 해결하는 혁신가입니다. 기존의 틀을 벗어나 새로운 관점에서 접근하며, 예상치 못한 창의적 해결책을 만들어냅니다." },
      practical: { emoji: "🔧", title: "실용형 해결사 (Practical Solver)", desc: "당신은 즉각적인 행동과 실험으로 문제를 해결하는 실행가입니다. 이론보다 현장에서 배우고, 빠른 피드백을 통해 효율적으로 문제를 극복합니다." },
      collaborative: { emoji: "🤝", title: "협력형 해결사 (Collaborative Solver)", desc: "당신은 팀의 집단 지성을 활용하는 협력자입니다. 다양한 관점을 통합하고 사람들의 강점을 조화롭게 결합하여 더 나은 해결책을 만들어냅니다." },
      strategic: { emoji: "♟️", title: "전략형 해결사 (Strategic Solver)", desc: "당신은 큰 그림을 보고 장기적으로 접근하는 전략가입니다. 문제의 근본 원인과 파급 효과를 분석하여 지속 가능하고 종합적인 솔루션을 설계합니다." },
    },
    retake: "다시하기", resultLabel: "나의 문제 해결 스타일",
  },
  en: {
    title: "Problem Solver Test: What's Your Problem-Solving Style?",
    description: "Discover your unique problem-solving approach through 15 questions.",
    questions: [
      { id: "q1", text: "When I encounter a new problem, I first collect and analyze data and facts.", type: "analytical" as SolverStyle },
      { id: "q2", text: "I enjoy solving problems with original ideas that haven't been tried before.", type: "creative" as SolverStyle },
      { id: "q3", text: "I prefer realistic solutions I can act on immediately over complex theories.", type: "practical" as SolverStyle },
      { id: "q4", text: "Brainstorming with team members is the most effective way to find solutions.", type: "collaborative" as SolverStyle },
      { id: "q5", text: "It's important to identify the root cause and develop long-term solutions.", type: "strategic" as SolverStyle },
      { id: "q6", text: "Breaking down problems step by step and approaching them logically feels natural.", type: "analytical" as SolverStyle },
      { id: "q7", text: "I believe the best solutions come from free-flowing brainstorming sessions.", type: "creative" as SolverStyle },
      { id: "q8", text: "I solve problems by trying things immediately and adjusting based on results.", type: "practical" as SolverStyle },
      { id: "q9", text: "I find better answers by gathering perspectives from people with diverse viewpoints.", type: "collaborative" as SolverStyle },
      { id: "q10", text: "Before solving a problem, I set the overall big picture and goals first.", type: "strategic" as SolverStyle },
      { id: "q11", text: "Analyzing numbers and patterns reveals the answer to most problems.", type: "analytical" as SolverStyle },
      { id: "q12", text: "I feel most satisfied when solving problems in ways others haven't thought of.", type: "creative" as SolverStyle },
      { id: "q13", text: "Quick execution and feedback are more important than a perfect plan.", type: "practical" as SolverStyle },
      { id: "q14", text: "Teams produce more creative and better results than working alone.", type: "collaborative" as SolverStyle },
      { id: "q15", text: "Before the immediate problem, I think about its broader impact and ripple effects.", type: "strategic" as SolverStyle },
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      analytical: { emoji: "🔬", title: "Analytical Solver", desc: "You solve problems with data and logic. You excel at identifying patterns and approaching systematically. You break down complex problems step by step to derive evidence-based solutions." },
      creative: { emoji: "💡", title: "Creative Solver", desc: "You're an innovator who solves problems with original ideas. You break from convention and approach from new angles, generating unexpected creative solutions." },
      practical: { emoji: "🔧", title: "Practical Solver", desc: "You're a doer who solves problems through immediate action and experimentation. You learn on the ground rather than in theory and overcome problems efficiently through quick feedback." },
      collaborative: { emoji: "🤝", title: "Collaborative Solver", desc: "You leverage the collective intelligence of a team. You integrate diverse perspectives and harmoniously combine people's strengths to create better solutions." },
      strategic: { emoji: "♟️", title: "Strategic Solver", desc: "You're a strategist who sees the big picture and takes a long-term approach. You analyze root causes and ripple effects to design sustainable and comprehensive solutions." },
    },
    retake: "Retake", resultLabel: "Your Problem-Solving Style",
  },
};

export default function ProblemSolverTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const types: SolverStyle[] = ["analytical", "creative", "practical", "collaborative", "strategic"];
  const scores = Object.fromEntries(types.map((s) => [s, 0])) as Record<SolverStyle, number>;
  t.questions.forEach((q) => { if (answers[q.id]) scores[q.type] += answers[q.id]; });
  const topType = (Object.entries(scores) as [SolverStyle, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[topType];
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
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
          <div className="h-2 bg-orange-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
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
                  className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${answers[q.id] === v + 1 ? "bg-orange-600 border-orange-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-orange-600 text-white hover:bg-orange-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
