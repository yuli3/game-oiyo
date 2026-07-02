'use client';

import { useState } from "react";

interface Props { locale?: string; }

type AnxietyLevel = "very_low" | "low" | "moderate" | "high" | "very_high";

const data = {
  ko: {
    title: "건강 불안 테스트: 나의 건강 걱정 수준은?",
    description: "10개의 질문으로 건강 불안 수준을 측정하세요.",
    questions: [
      { id: "q1", text: "심각한 질병에 걸릴까 봐 걱정하는 빈도는?", reverse: false },
      { id: "q2", text: "신체에 새로운 증상이나 감각이 느껴질 때 얼마나 빨리 심각하게 생각하나요?", reverse: false },
      { id: "q3", text: "건강 정보를 온라인에서 얼마나 자주 검색하나요?", reverse: false },
      { id: "q4", text: "신체 증상이 삶을 즐기는 것을 방해하는 빈도는?", reverse: false },
      { id: "q5", text: "의사에게 건강에 대한 안심을 구하는 빈도는?", reverse: false },
      { id: "q6", text: "몸에서 질병의 징후를 확인하는 빈도는?", reverse: false },
      { id: "q7", text: "의사가 이상 없다고 할 때 안심이 되나요?", reverse: true },
      { id: "q8", text: "건강 걱정이 수면에 영향을 주는 빈도는?", reverse: false },
      { id: "q9", text: "건강에 대한 걱정으로 활동을 피하는 빈도는?", reverse: false },
      { id: "q10", text: "건강에 대해 최악의 시나리오를 상상하는 빈도는?", reverse: false },
    ],
    options: ["전혀 없음", "드물게", "가끔", "자주", "항상"],
    results: {
      very_low: { emoji: "🌈", title: "매우 낮은 건강 불안", desc: "건강에 대해 균형 잡힌 시각을 갖고 있습니다. 일반적인 신체 감각과 잠재적 건강 문제를 잘 구별하며, 건강 걱정이 일상생활을 방해하지 않습니다." },
      low: { emoji: "🌤️", title: "낮은 건강 불안", desc: "가끔 건강 걱정을 할 수 있지만 일상적 기능이나 감정적 웰빙에 크게 영향을 미치지 않습니다. 대체로 건강 걱정을 관점에서 처리하고 넘어갑니다." },
      moderate: { emoji: "⛅", title: "보통 수준의 건강 불안", desc: "평균보다 건강 문제에 대해 더 많이 걱정하는 편이며, 가끔 일상 활동을 방해할 수 있습니다. 마음 챙김 명상과 인터넷 건강 검색 제한이 도움이 될 수 있습니다." },
      high: { emoji: "🌧️", title: "높은 건강 불안", desc: "건강 걱정이 자주 생각을 차지하고 감정적 웰빙과 일상에 크게 영향을 줍니다. 인지행동요법이나 정신 건강 전문가 상담을 고려해보세요." },
      very_high: { emoji: "⛈️", title: "매우 높은 건강 불안", desc: "건강 걱정이 삶의 질에 상당한 영향을 미치고 있습니다. 건강 불안 전문 정신 건강 전문가의 도움을 받는 것을 강력히 권장합니다." },
    },
    retake: "다시하기", resultLabel: "나의 건강 불안 수준",
  },
  en: {
    title: "Health Anxiety Test: What's Your Health Anxiety Level?",
    description: "Measure your health anxiety level with 10 questions.",
    questions: [
      { id: "q1", text: "How often do you worry about having a serious illness?", reverse: false },
      { id: "q2", text: "When you notice a new bodily sensation, how quickly do you think it might be serious?", reverse: false },
      { id: "q3", text: "How much time do you spend researching health information online?", reverse: false },
      { id: "q4", text: "How often do physical symptoms interfere with your ability to enjoy life?", reverse: false },
      { id: "q5", text: "How frequently do you seek reassurance from doctors about your health?", reverse: false },
      { id: "q6", text: "How often do you check your body for signs of illness?", reverse: false },
      { id: "q7", text: "When a doctor tells you nothing is wrong, how reassured do you feel?", reverse: true },
      { id: "q8", text: "How much do health worries affect your sleep?", reverse: false },
      { id: "q9", text: "How often do you avoid activities due to health concerns?", reverse: false },
      { id: "q10", text: "How often do you imagine the worst possible health scenario?", reverse: false },
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      very_low: { emoji: "🌈", title: "Very Low Health Anxiety", desc: "You have a balanced perspective on health concerns. You can distinguish between normal bodily sensations and potential health issues, and health worries don't interfere with your daily life." },
      low: { emoji: "🌤️", title: "Low Health Anxiety", desc: "You may occasionally have health concerns, but they don't significantly impact your daily functioning or emotional well-being. You're generally able to put health worries in perspective." },
      moderate: { emoji: "⛅", title: "Moderate Health Anxiety", desc: "You worry about health issues more than average, and these concerns may occasionally interfere with your activities. Mindfulness meditation and limiting health searches can help." },
      high: { emoji: "🌧️", title: "High Health Anxiety", desc: "Health concerns frequently occupy your thoughts and significantly impact your emotional well-being. Consider cognitive-behavioral therapy or consultation with a mental health professional." },
      very_high: { emoji: "⛈️", title: "Very High Health Anxiety", desc: "Health concerns are significantly impacting your quality of life. Seeking help from a mental health professional who specializes in health anxiety is strongly recommended." },
    },
    retake: "Retake", resultLabel: "Your Health Anxiety Level",
  },
};

export default function MindEaseTest({ locale: localeProp }: Props) {
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

  const level: AnxietyLevel =
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
        <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{lang === "ko" ? "불안 지수" : "Anxiety Index"}</span>
            <span className="font-bold text-indigo-600">{barPct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full">
            <div className="h-3 bg-indigo-500 rounded-full transition-all" style={{ width: `${barPct}%` }} />
          </div>
        </div>
        <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
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
          <div className="h-2 bg-indigo-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
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
                  className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${answers[q.id] === v + 1 ? "bg-indigo-600 border-indigo-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
