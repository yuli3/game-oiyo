'use client';

import { useState } from "react";

interface Props { locale?: string; }

type PerfType = "selfOriented" | "otherOriented" | "sociallyPrescribed" | "adaptiveStriver";

const data = {
  ko: {
    title: "퍼펙트스코프 테스트: 나의 완벽주의 유형은?",
    description: "15개의 질문으로 나만의 완벽주의 패턴을 발견해보세요.",
    questions: [
      { id: "q1", text: "나는 내 자신에게 매우 높은 기준을 세우고, 그것을 달성하지 못하면 실망한다.", type: "selfOriented" as PerfType },
      { id: "q2", text: "내가 하는 일에서 실수를 하면 오랫동안 그 실수에 대해 생각한다.", type: "selfOriented" as PerfType },
      { id: "q3", text: "나는 일을 시작하기 전에 완벽하게 계획을 세워야 마음이 편하다.", type: "selfOriented" as PerfType },
      { id: "q4", text: "나는 다른 사람들이 일을 제대로 하지 않을 때 짜증이 난다.", type: "otherOriented" as PerfType },
      { id: "q5", text: "내 주변 사람들이 최선을 다하지 않는 것 같으면 불편하다.", type: "otherOriented" as PerfType },
      { id: "q6", text: "나는 다른 사람들에게도 높은 기준을 요구하는 편이다.", type: "otherOriented" as PerfType },
      { id: "q7", text: "다른 사람들이 나에게 높은 기대를 가지고 있다고 느낀다.", type: "sociallyPrescribed" as PerfType },
      { id: "q8", text: "나는 주변 사람들을 실망시키지 않기 위해 완벽해야 한다는 압박을 느낀다.", type: "sociallyPrescribed" as PerfType },
      { id: "q9", text: "사람들이 내 실수를 알게 되면 나를 무능하다고 볼 것이라고 걱정한다.", type: "sociallyPrescribed" as PerfType },
      { id: "q10", text: "나는 높은 목표를 세우고 그것을 달성하는 과정 자체를 즐긴다.", type: "adaptiveStriver" as PerfType },
      { id: "q11", text: "실수는 성장의 기회라고 생각하며, 크게 자책하지 않는 편이다.", type: "adaptiveStriver" as PerfType },
      { id: "q12", text: "나는 완벽함보다는 지속적인 개선을 목표로 한다.", type: "adaptiveStriver" as PerfType },
      { id: "q13", text: "결과가 기대에 미치지 못해도 노력 자체에 의미를 둔다.", type: "adaptiveStriver" as PerfType },
      { id: "q14", text: "나는 어려운 과제에서 성취감을 느끼며, 실패를 두려워하지 않는다.", type: "adaptiveStriver" as PerfType },
      { id: "q15", text: "높은 기준을 가지되, 자신에게 너무 가혹하지 않으려고 노력한다.", type: "adaptiveStriver" as PerfType },
    ],
    options: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    results: {
      selfOriented: { emoji: "🎯", title: "자기 지향형 완벽주의", desc: "당신은 스스로에게 매우 높은 기준을 세우고 그것을 달성하려고 합니다. 자기 동기부여가 강하지만, 자책이 심해질 수 있습니다. 완벽함보다 성장과 과정에 집중하면 더 건강한 완벽주의를 실천할 수 있습니다." },
      otherOriented: { emoji: "👥", title: "타인 지향형 완벽주의", desc: "당신은 다른 사람들에게도 높은 기준을 요구하는 경향이 있습니다. 팀을 이끌거나 품질을 관리하는 데 강점이 있지만, 관계에 긴장을 줄 수 있습니다. 사람마다 다른 방식이 있음을 인정하는 연습이 도움이 됩니다." },
      sociallyPrescribed: { emoji: "👁️", title: "사회적 처방형 완벽주의", desc: "당신은 타인의 기대에 부응하기 위해 완벽해야 한다는 압박을 느낍니다. 이 유형은 불안과 번아웃 위험이 높습니다. 타인의 평가보다 자신의 가치와 기준을 우선시하는 연습이 필요합니다." },
      adaptiveStriver: { emoji: "🌱", title: "적응적 성취형", desc: "당신은 높은 기준을 추구하면서도 과정을 즐기고 실패에서 배우는 건강한 완벽주의를 보입니다. 이 균형 잡힌 접근 방식은 지속 가능한 성공과 웰빙의 기반이 됩니다. 이 강점을 계속 발전시켜 나가세요." },
    },
    retake: "다시하기", resultLabel: "나의 완벽주의 유형",
  },
  en: {
    title: "PerfectScope Test: What's Your Perfectionism Type?",
    description: "Discover your unique perfectionism pattern through 15 questions.",
    questions: [
      { id: "q1", text: "I set very high standards for myself and feel disappointed when I don't meet them.", type: "selfOriented" as PerfType },
      { id: "q2", text: "When I make a mistake, I think about it for a long time afterward.", type: "selfOriented" as PerfType },
      { id: "q3", text: "I feel more at ease when I've planned everything perfectly before starting.", type: "selfOriented" as PerfType },
      { id: "q4", text: "I get irritated when others don't do things properly.", type: "otherOriented" as PerfType },
      { id: "q5", text: "I feel uncomfortable when people around me don't seem to be giving their best.", type: "otherOriented" as PerfType },
      { id: "q6", text: "I tend to hold others to high standards as well.", type: "otherOriented" as PerfType },
      { id: "q7", text: "I feel that others have high expectations of me.", type: "sociallyPrescribed" as PerfType },
      { id: "q8", text: "I feel pressured to be perfect so I don't disappoint the people around me.", type: "sociallyPrescribed" as PerfType },
      { id: "q9", text: "I worry that if people see my mistakes, they'll think I'm incompetent.", type: "sociallyPrescribed" as PerfType },
      { id: "q10", text: "I set ambitious goals and enjoy the process of working toward them.", type: "adaptiveStriver" as PerfType },
      { id: "q11", text: "I see mistakes as growth opportunities and don't tend to beat myself up much.", type: "adaptiveStriver" as PerfType },
      { id: "q12", text: "I aim for continuous improvement rather than perfection.", type: "adaptiveStriver" as PerfType },
      { id: "q13", text: "Even when results fall short of expectations, I find meaning in the effort itself.", type: "adaptiveStriver" as PerfType },
      { id: "q14", text: "I find a sense of achievement in difficult tasks and don't fear failure.", type: "adaptiveStriver" as PerfType },
      { id: "q15", text: "I try to maintain high standards without being too harsh on myself.", type: "adaptiveStriver" as PerfType },
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      selfOriented: { emoji: "🎯", title: "Self-Oriented Perfectionist", desc: "You set very high standards for yourself and strive to meet them. Your self-motivation is strong, but self-criticism can intensify. Focusing on growth and process rather than perfection leads to a healthier approach." },
      otherOriented: { emoji: "👥", title: "Other-Oriented Perfectionist", desc: "You tend to demand high standards from others as well. You have strengths in leading teams and managing quality, but this can create relational tension. Practicing acceptance that people work differently can help." },
      sociallyPrescribed: { emoji: "👁️", title: "Socially Prescribed Perfectionist", desc: "You feel pressured to be perfect to meet others' expectations. This type carries higher risks of anxiety and burnout. Practicing prioritizing your own values over others' evaluations is essential." },
      adaptiveStriver: { emoji: "🌱", title: "Adaptive Striver", desc: "You pursue high standards while enjoying the process and learning from failure — a healthy form of perfectionism. This balanced approach is the foundation for sustainable success and well-being. Keep developing this strength." },
    },
    retake: "Retake", resultLabel: "Your Perfectionism Type",
  },
};

export default function PerfectScopeTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const types: PerfType[] = ["selfOriented", "otherOriented", "sociallyPrescribed", "adaptiveStriver"];
  const scores = Object.fromEntries(types.map((s) => [s, 0])) as Record<PerfType, number>;
  t.questions.forEach((q) => { if (answers[q.id]) scores[q.type] += answers[q.id]; });
  const topType = (Object.entries(scores) as [PerfType, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[topType];
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
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
          <div className="h-2 bg-amber-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
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
                  className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${answers[q.id] === v + 1 ? "bg-amber-600 border-amber-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-amber-600 text-white hover:bg-amber-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
