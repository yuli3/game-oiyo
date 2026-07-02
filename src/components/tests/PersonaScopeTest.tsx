'use client';

import { useState } from "react";

interface Props { locale?: string; }

type BigFiveFactor = "openness" | "conscientiousness" | "extraversion" | "agreeableness" | "neuroticism";

const data = {
  ko: {
    title: "퍼스나스코프: 나의 성격 유형은?",
    description: "10개의 질문으로 빅 파이브 성격 요인을 알아보세요.",
    questions: [
      { id: "q1", text: "나는 새로운 아이디어와 개념에 관심이 많다.", factor: "openness" as BigFiveFactor, reverse: false },
      { id: "q2", text: "나는 예술, 음악, 문학을 즐긴다.", factor: "openness" as BigFiveFactor, reverse: false },
      { id: "q3", text: "나는 계획을 세우고 그것을 철저히 실행한다.", factor: "conscientiousness" as BigFiveFactor, reverse: false },
      { id: "q4", text: "나는 체계적으로 일하고 마감일을 잘 지킨다.", factor: "conscientiousness" as BigFiveFactor, reverse: false },
      { id: "q5", text: "나는 파티나 모임에서 활발하게 활동한다.", factor: "extraversion" as BigFiveFactor, reverse: false },
      { id: "q6", text: "나는 사람들과 어울리는 것에서 에너지를 얻는다.", factor: "extraversion" as BigFiveFactor, reverse: false },
      { id: "q7", text: "나는 다른 사람들의 감정을 잘 이해하고 배려한다.", factor: "agreeableness" as BigFiveFactor, reverse: false },
      { id: "q8", text: "나는 갈등보다 협력을 선호하며 타협을 잘 한다.", factor: "agreeableness" as BigFiveFactor, reverse: false },
      { id: "q9", text: "나는 스트레스 상황에서 쉽게 불안해진다.", factor: "neuroticism" as BigFiveFactor, reverse: false },
      { id: "q10", text: "나는 기분 변화가 잦고 감정 조절이 어렵다고 느낀다.", factor: "neuroticism" as BigFiveFactor, reverse: false },
    ],
    options: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    factors: {
      openness: { emoji: "🌈", name: "개방성", high: "새로운 경험과 아이디어에 호기심이 많고 창의적입니다.", low: "친숙한 것을 선호하고 실용적이며 현실적입니다." },
      conscientiousness: { emoji: "📋", name: "성실성", high: "체계적이고 목표 지향적이며 신뢰할 수 있습니다.", low: "유연하고 즉흥적이며 자유로운 방식을 선호합니다." },
      extraversion: { emoji: "🎉", name: "외향성", high: "사교적이고 활발하며 사람들과 어울리는 것을 즐깁니다.", low: "사색적이고 독립적이며 조용한 환경을 선호합니다." },
      agreeableness: { emoji: "🤝", name: "친화성", high: "배려심이 깊고 협력적이며 타인을 신뢰합니다.", low: "독립적이고 비판적이며 자신의 이익을 적극적으로 추구합니다." },
      neuroticism: { emoji: "🌊", name: "신경증", high: "감정적으로 민감하고 스트레스에 취약한 편입니다.", low: "감정적으로 안정되어 있고 스트레스에 잘 대처합니다." },
    },
    retake: "다시하기", resultLabel: "나의 성격 프로파일",
    highLabel: "높음", lowLabel: "낮음",
  },
  en: {
    title: "PersonaScope: What's Your Personality Profile?",
    description: "Explore your Big Five personality factors with 10 questions.",
    questions: [
      { id: "q1", text: "I am curious about new ideas and concepts.", factor: "openness" as BigFiveFactor, reverse: false },
      { id: "q2", text: "I enjoy art, music, and literature.", factor: "openness" as BigFiveFactor, reverse: false },
      { id: "q3", text: "I make plans and carry them out thoroughly.", factor: "conscientiousness" as BigFiveFactor, reverse: false },
      { id: "q4", text: "I work systematically and meet deadlines.", factor: "conscientiousness" as BigFiveFactor, reverse: false },
      { id: "q5", text: "I am lively and active at parties or social gatherings.", factor: "extraversion" as BigFiveFactor, reverse: false },
      { id: "q6", text: "I get energy from being around people.", factor: "extraversion" as BigFiveFactor, reverse: false },
      { id: "q7", text: "I understand and care about others' feelings.", factor: "agreeableness" as BigFiveFactor, reverse: false },
      { id: "q8", text: "I prefer cooperation over conflict and make compromises easily.", factor: "agreeableness" as BigFiveFactor, reverse: false },
      { id: "q9", text: "I become anxious easily in stressful situations.", factor: "neuroticism" as BigFiveFactor, reverse: false },
      { id: "q10", text: "I experience frequent mood swings and find emotion regulation difficult.", factor: "neuroticism" as BigFiveFactor, reverse: false },
    ],
    options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    factors: {
      openness: { emoji: "🌈", name: "Openness", high: "You're curious, imaginative, and drawn to new ideas and experiences.", low: "You prefer familiar routines and take a practical, down-to-earth approach." },
      conscientiousness: { emoji: "📋", name: "Conscientiousness", high: "You're organized, goal-oriented, and highly dependable.", low: "You're flexible and spontaneous, preferring a free-flowing approach." },
      extraversion: { emoji: "🎉", name: "Extraversion", high: "You're sociable and energetic, and you thrive in social settings.", low: "You're reflective and independent, preferring quiet environments." },
      agreeableness: { emoji: "🤝", name: "Agreeableness", high: "You're compassionate, cooperative, and trusting toward others.", low: "You're independent and competitive, actively pursuing your own interests." },
      neuroticism: { emoji: "🌊", name: "Neuroticism", high: "You're emotionally sensitive and can be vulnerable to stress.", low: "You're emotionally stable and handle stress with ease." },
    },
    retake: "Retake", resultLabel: "Your Personality Profile",
    highLabel: "High", lowLabel: "Low",
  },
};

const FACTORS: BigFiveFactor[] = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"];

export default function PersonaScopeTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const factorScores = Object.fromEntries(FACTORS.map((f) => [f, 0])) as Record<BigFiveFactor, number>;
  const factorCounts = Object.fromEntries(FACTORS.map((f) => [f, 0])) as Record<BigFiveFactor, number>;
  t.questions.forEach((q) => {
    if (answers[q.id]) {
      const raw = answers[q.id];
      const score = q.reverse ? 6 - raw : raw;
      factorScores[q.factor] += score;
      factorCounts[q.factor] += 1;
    }
  });

  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <p className="text-xs font-bold text-lime-500 uppercase tracking-widest">{t.resultLabel}</p>
          <h3 className="text-2xl font-black text-slate-900 mt-2">🔭</h3>
        </div>
        <div className="space-y-4">
          {FACTORS.map((f) => {
            const info = t.factors[f];
            const count = factorCounts[f] || 1;
            const pct = Math.round(((factorScores[f] / (count * 5)) * 100));
            const isHigh = pct >= 60;
            return (
              <div key={f} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{info.emoji} {info.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isHigh ? "bg-lime-100 text-lime-700" : "bg-slate-100 text-slate-500"}`}>
                    {isHigh ? t.highLabel : t.lowLabel} {pct}%
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full">
                  <div className="h-2.5 bg-lime-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{isHigh ? info.high : info.low}</p>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center pt-2">
          <button onClick={() => { setAnswers({}); setPhase("quiz"); }} className="text-slate-400 text-sm hover:underline">{t.retake}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-black text-slate-900">{t.title}</h3>
        <p className="text-sm text-slate-500 mt-2">{t.description}</p>
        <div className="mt-3 h-2 bg-slate-100 rounded-full">
          <div className="h-2 bg-lime-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
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
                  className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${answers[q.id] === v + 1 ? "bg-lime-600 border-lime-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-lime-600 text-white hover:bg-lime-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
