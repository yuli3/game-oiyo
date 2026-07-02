'use client';

import { useState } from "react";

interface Props { locale?: string; }

type BurnoutLevel = "very_low" | "low" | "moderate" | "high" | "very_high";
type Dimension = "exhaustion" | "cynicism" | "efficacy";

const data = {
  ko: {
    title: "번아웃 자가진단: 나의 번아웃 수준은?",
    description: "15개의 질문으로 번아웃 수준을 측정하세요.",
    questions: [
      { id: "q1", text: "나는 업무로 인해 감정적으로 지쳐있다.", dim: "exhaustion" as Dimension, reverse: false },
      { id: "q2", text: "나는 하루 업무가 끝나면 완전히 소진된 느낌이다.", dim: "exhaustion" as Dimension, reverse: false },
      { id: "q3", text: "아침에 일어날 때 피곤하고 또 다른 근무일을 맞이해야 한다는 생각에 지친다.", dim: "exhaustion" as Dimension, reverse: false },
      { id: "q4", text: "나는 업무로 인해 완전히 타버린(burnout) 느낌이다.", dim: "exhaustion" as Dimension, reverse: false },
      { id: "q5", text: "나는 업무에 집중하기가 어렵다.", dim: "exhaustion" as Dimension, reverse: false },
      { id: "q6", text: "이 직장을 시작한 이후로 업무에 대한 흥미가 줄어들었다.", dim: "cynicism" as Dimension, reverse: false },
      { id: "q7", text: "나는 업무에 대한 열정이 식었다.", dim: "cynicism" as Dimension, reverse: false },
      { id: "q8", text: "나는 그냥 내 일만 하고 싶고 귀찮게 하고 싶지 않다.", dim: "cynicism" as Dimension, reverse: false },
      { id: "q9", text: "내 업무가 어떤 기여를 하는지에 대해 점점 더 냉소적으로 변하고 있다.", dim: "cynicism" as Dimension, reverse: false },
      { id: "q10", text: "나는 내 업무의 중요성에 대해 의문을 품는다.", dim: "cynicism" as Dimension, reverse: false },
      { id: "q11", text: "나는 내 업무에서 발생하는 문제들을 효과적으로 해결할 수 있다.", dim: "efficacy" as Dimension, reverse: true },
      { id: "q12", text: "나는 이 조직에 효과적으로 기여하고 있다고 느낀다.", dim: "efficacy" as Dimension, reverse: true },
      { id: "q13", text: "내 생각에 나는 내 직업에 능숙하다.", dim: "efficacy" as Dimension, reverse: true },
      { id: "q14", text: "나는 직장에서 무언가를 성취했을 때 의기양양함을 느낀다.", dim: "efficacy" as Dimension, reverse: true },
      { id: "q15", text: "나는 목표를 향해 일할 때 활력이 넘친다.", dim: "efficacy" as Dimension, reverse: true },
    ],
    options: ["전혀 없음", "드물게", "가끔", "자주", "항상"],
    results: {
      very_low: { emoji: "🌟", title: "매우 낮은 번아웃", desc: "업무 스트레스를 효과적으로 관리하고 있으며, 좋은 경계를 유지하고 있습니다. 현재의 워라밸 전략이 잘 작동하고 있으니 건강한 습관을 계속 유지하세요." },
      low: { emoji: "✨", title: "낮은 번아웃", desc: "대부분의 경우 업무 압박을 효과적으로 처리하고 있지만, 가끔 스트레스를 경험할 수 있습니다. 명확한 워라밸 경계를 계속 설정하고 예방적 자가 관리를 하세요." },
      moderate: { emoji: "⚠️", title: "보통 수준의 번아웃", desc: "일부 번아웃 증상을 경험하고 있으며, 해결하지 않으면 웰빙과 성과에 영향을 미칠 수 있습니다. 스트레스 요인을 파악하고 확고한 경계를 설정해보세요." },
      high: { emoji: "🔥", title: "높은 번아웃", desc: "상당한 번아웃 증상을 경험하고 있습니다. 지원을 요청하고, 업무량을 평가하며, 매일 회복 습관을 실천하고, 신체 건강을 우선시하세요. 필요하다면 휴가를 고려하세요." },
      very_high: { emoji: "🚨", title: "매우 높은 번아웃", desc: "즉각적인 주의가 필요한 심각한 번아웃 증상을 경험하고 있습니다. 의료 전문가와 상담하고, 즉각적인 경계를 설정하고, 휴식과 회복을 최우선으로 하세요." },
    },
    retake: "다시하기", resultLabel: "나의 번아웃 수준",
  },
  en: {
    title: "MindRest Test: What's Your Burnout Level?",
    description: "Measure your burnout level with 15 questions.",
    questions: [
      { id: "q1", text: "I feel emotionally drained from my work.", dim: "exhaustion" as Dimension, reverse: false },
      { id: "q2", text: "I feel completely used up at the end of a workday.", dim: "exhaustion" as Dimension, reverse: false },
      { id: "q3", text: "I feel tired when I get up in the morning and have to face another day at work.", dim: "exhaustion" as Dimension, reverse: false },
      { id: "q4", text: "I feel burned out from my work.", dim: "exhaustion" as Dimension, reverse: false },
      { id: "q5", text: "I have difficulty concentrating on my work.", dim: "exhaustion" as Dimension, reverse: false },
      { id: "q6", text: "I have become less interested in my work since I started this job.", dim: "cynicism" as Dimension, reverse: false },
      { id: "q7", text: "I have become less enthusiastic about my work.", dim: "cynicism" as Dimension, reverse: false },
      { id: "q8", text: "I just want to do my job and not be bothered.", dim: "cynicism" as Dimension, reverse: false },
      { id: "q9", text: "I have become more cynical about whether my work contributes anything.", dim: "cynicism" as Dimension, reverse: false },
      { id: "q10", text: "I doubt the significance of my work.", dim: "cynicism" as Dimension, reverse: false },
      { id: "q11", text: "I can effectively solve the problems that arise in my work.", dim: "efficacy" as Dimension, reverse: true },
      { id: "q12", text: "I feel that I am making an effective contribution to what this organization does.", dim: "efficacy" as Dimension, reverse: true },
      { id: "q13", text: "In my opinion, I am good at my job.", dim: "efficacy" as Dimension, reverse: true },
      { id: "q14", text: "I feel exhilarated when I accomplish something at work.", dim: "efficacy" as Dimension, reverse: true },
      { id: "q15", text: "I feel energized when I am working toward important goals at work.", dim: "efficacy" as Dimension, reverse: true },
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      very_low: { emoji: "🌟", title: "Very Low Burnout", desc: "You're effectively managing work stress and maintaining good boundaries. Your current work-life balance strategies are working well. Keep up your healthy habits." },
      low: { emoji: "✨", title: "Low Burnout", desc: "You're generally handling work pressure effectively but may occasionally experience stress. Continue setting clear work-life boundaries and practice preventive self-care." },
      moderate: { emoji: "⚠️", title: "Moderate Burnout", desc: "You're experiencing some burnout symptoms that could affect your wellbeing and performance if left unaddressed. Identify your stressors and set firm boundaries." },
      high: { emoji: "🔥", title: "High Burnout", desc: "You're experiencing significant burnout symptoms. Seek support, assess your workload, practice daily recovery habits, and prioritize your physical health. Consider taking time off." },
      very_high: { emoji: "🚨", title: "Very High Burnout", desc: "You're experiencing severe burnout that requires immediate attention. Consult a healthcare professional, set immediate boundaries, and prioritize rest and recovery above all." },
    },
    retake: "Retake", resultLabel: "Your Burnout Level",
  },
};

export default function MindRestTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const totalScore = t.questions.reduce((sum, q) => {
    const raw = answers[q.id] ?? 0;
    const score = q.reverse ? 6 - raw : raw;
    return sum + score;
  }, 0);

  const maxScore = t.questions.length * 5;
  const pct = totalScore / maxScore;

  const level: BurnoutLevel =
    pct <= 0.2 ? "very_low" :
    pct <= 0.4 ? "low" :
    pct <= 0.6 ? "moderate" :
    pct <= 0.8 ? "high" :
    "very_high";

  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[level];
    const barPct = Math.round(pct * 100);
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-cyan-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{lang === "ko" ? "번아웃 지수" : "Burnout Index"}</span>
            <span className="font-bold text-cyan-600">{barPct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full">
            <div className="h-3 bg-cyan-500 rounded-full transition-all" style={{ width: `${barPct}%` }} />
          </div>
        </div>
        <div className="p-6 bg-cyan-50 rounded-2xl border border-cyan-100">
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
          <div className="h-2 bg-cyan-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
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
                  className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${answers[q.id] === v + 1 ? "bg-cyan-600 border-cyan-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-cyan-600 text-white hover:bg-cyan-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
