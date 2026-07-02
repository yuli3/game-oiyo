'use client';

import { useState } from "react";

interface Props { locale?: string; }

type HormoneType = "dopamine" | "serotonin" | "testosterone" | "estrogen" | "endorphin" | "oxytocin" | "cortisol";

const data = {
  ko: {
    title: "호르몬 성격 테스트: 나를 움직이는 호르몬은?",
    description: "14개의 질문으로 나의 주도적 호르몬 유형을 알아보세요.",
    questions: [
      { id: "q1", text: "나는 종종 새로운 경험을 찾고 새로운 활동에 흥분한다.", type: "dopamine" as HormoneType },
      { id: "q2", text: "나는 작업을 완료하거나 목표를 달성할 때 강한 성취감을 느낀다.", type: "dopamine" as HormoneType },
      { id: "q3", text: "나는 구조화된 일상과 정리된 환경을 선호한다.", type: "serotonin" as HormoneType },
      { id: "q4", text: "나는 일반적으로 내 삶에 만족하고 행복하다.", type: "serotonin" as HormoneType },
      { id: "q5", text: "나는 경쟁을 즐기고 종종 최고가 되기 위해 노력한다.", type: "testosterone" as HormoneType },
      { id: "q6", text: "나는 책임을 맡고 그룹을 위한 결정을 내리는 것이 편안하다.", type: "testosterone" as HormoneType },
      { id: "q7", text: "나는 다른 사람들이 어떻게 느끼는지 쉽게 감지하고 공감할 수 있다.", type: "estrogen" as HormoneType },
      { id: "q8", text: "나는 깊은 정서적 연결과 의미 있는 관계를 중요시한다.", type: "estrogen" as HormoneType },
      { id: "q9", text: "나는 목표를 달성하기 위해 신체적 불편함이나 통증을 견딜 수 있다.", type: "endorphin" as HormoneType },
      { id: "q10", text: "나는 격렬한 신체 활동이나 운동 후에 자연스러운 행복감을 느낀다.", type: "endorphin" as HormoneType },
      { id: "q11", text: "나는 다른 사람들을 돕거나 그들의 행복에 기여할 때 가장 충만함을 느낀다.", type: "oxytocin" as HormoneType },
      { id: "q12", text: "나의 관계에서 신체적 접촉과 친밀함은 중요하다.", type: "oxytocin" as HormoneType },
      { id: "q13", text: "나는 잠재적인 문제나 잘못될 수 있는 일에 대해 걱정하는 경향이 있다.", type: "cortisol" as HormoneType },
      { id: "q14", text: "나는 새롭거나 불확실한 상황에서 종종 경계하고 주의한다.", type: "cortisol" as HormoneType },
    ],
    options: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    results: {
      dopamine: { emoji: "🎯", title: "도파민 유형 (Dopamine)", desc: "당신은 호기심, 흥분, 새로운 경험 추구에 의해 움직입니다. 뇌의 보상 시스템이 매우 활발하여 성취와 인정에 의해 동기부여됩니다." },
      serotonin: { emoji: "☯️", title: "세로토닌 유형 (Serotonin)", desc: "당신은 안정, 일상, 조화를 중요시합니다. 균형 잡힌 성격으로 대부분의 상황에서 침착하고 만족스러운 상태를 유지합니다." },
      testosterone: { emoji: "🏆", title: "테스토스테론 유형 (Testosterone)", desc: "당신은 본래 자기주장이 강하고, 경쟁적이며, 결단력이 있습니다. 책임을 맡는 것을 즐기며 목표를 달성하기 위해 위험을 감수하는 것을 두려워하지 않습니다." },
      estrogen: { emoji: "💗", title: "에스트로겐 유형 (Estrogen)", desc: "당신은 매우 공감적이고 정서적으로 지능적입니다. 다른 사람들과의 깊은 연결을 중요시하며 주변 사람들의 감정과 필요에 자연스럽게 맞춰져 있습니다." },
      endorphin: { emoji: "🏃", title: "엔도르핀 유형 (Endorphin)", desc: "당신은 회복력이 강하고 높은 통증 역치를 가지고 있습니다. 신체 활동에서 기쁨을 찾고 도전을 극복하는 자연스러운 능력이 있습니다." },
      oxytocin: { emoji: "🤗", title: "옥시토신 유형 (Oxytocin)", desc: "당신은 자연스럽게 깊은 유대와 연결을 형성하는 데 끌립니다. 관계를 육성하는 데서 성취감을 찾고 종종 그룹을 하나로 묶는 역할을 합니다." },
      cortisol: { emoji: "🔍", title: "코르티솔 유형 (Cortisol)", desc: "당신은 매우 경계하고 주의 깊으며, 잠재적인 문제를 예상하는 자연스러운 능력이 있습니다. 계획과 준비에 탁월합니다." },
    },
    retake: "다시하기", resultLabel: "나의 주도 호르몬 유형",
  },
  en: {
    title: "Hormone Personality Test: What Hormone Drives You?",
    description: "Find your dominant hormone type with 14 questions.",
    questions: [
      { id: "q1", text: "I often seek new experiences and get excited about novel activities.", type: "dopamine" as HormoneType },
      { id: "q2", text: "I feel a strong sense of accomplishment when I complete tasks or achieve goals.", type: "dopamine" as HormoneType },
      { id: "q3", text: "I prefer having a structured routine and organized environment.", type: "serotonin" as HormoneType },
      { id: "q4", text: "I generally feel content and satisfied with my life.", type: "serotonin" as HormoneType },
      { id: "q5", text: "I enjoy competition and often strive to be the best.", type: "testosterone" as HormoneType },
      { id: "q6", text: "I'm comfortable taking charge and making decisions for a group.", type: "testosterone" as HormoneType },
      { id: "q7", text: "I can easily sense how others are feeling and empathize with them.", type: "estrogen" as HormoneType },
      { id: "q8", text: "I value deep emotional connections and meaningful relationships.", type: "estrogen" as HormoneType },
      { id: "q9", text: "I can push through physical discomfort or pain to achieve my goals.", type: "endorphin" as HormoneType },
      { id: "q10", text: "I feel a natural high after intense physical activity or exercise.", type: "endorphin" as HormoneType },
      { id: "q11", text: "I feel most fulfilled when I'm helping others or contributing to their wellbeing.", type: "oxytocin" as HormoneType },
      { id: "q12", text: "Physical touch and closeness are important to me in my relationships.", type: "oxytocin" as HormoneType },
      { id: "q13", text: "I tend to worry about potential problems or what might go wrong.", type: "cortisol" as HormoneType },
      { id: "q14", text: "I'm often alert and vigilant in new or uncertain situations.", type: "cortisol" as HormoneType },
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      dopamine: { emoji: "🎯", title: "Dopamine Type", desc: "You're driven by curiosity, excitement, and the pursuit of new experiences. Your brain's reward system is highly active, making you motivated by achievement and recognition." },
      serotonin: { emoji: "☯️", title: "Serotonin Type", desc: "You value stability, routine, and harmony. Your balanced nature helps you stay calm and content in most situations." },
      testosterone: { emoji: "🏆", title: "Testosterone Type", desc: "You're naturally assertive, competitive, and decisive. You enjoy taking charge and aren't afraid to take risks to achieve your goals." },
      estrogen: { emoji: "💗", title: "Estrogen Type", desc: "You're highly empathetic and emotionally intelligent. You value deep connections with others and are naturally attuned to the feelings and needs of those around you." },
      endorphin: { emoji: "🏃", title: "Endorphin Type", desc: "You're resilient and have a high pain threshold, both physically and emotionally. You find joy in physical activity and have a natural ability to overcome challenges." },
      oxytocin: { emoji: "🤗", title: "Oxytocin Type", desc: "You're naturally drawn to forming deep bonds and connections. You find fulfillment in nurturing relationships and are often the glue that holds groups together." },
      cortisol: { emoji: "🔍", title: "Cortisol Type", desc: "You're highly alert and vigilant, with a natural ability to anticipate potential problems. You excel at planning and preparation." },
    },
    retake: "Retake", resultLabel: "Your Dominant Hormone Type",
  },
};

export default function HormonesTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const hormoneTypes: HormoneType[] = ["dopamine", "serotonin", "testosterone", "estrogen", "endorphin", "oxytocin", "cortisol"];
  const scores = Object.fromEntries(hormoneTypes.map((h) => [h, 0])) as Record<HormoneType, number>;

  t.questions.forEach((q) => {
    if (answers[q.id]) scores[q.type] += answers[q.id];
  });

  const topType = (Object.entries(scores) as [HormoneType, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[topType];
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-purple-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100">
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
          <div className="h-2 bg-purple-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
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
                  className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${answers[q.id] === v + 1 ? "bg-purple-600 border-purple-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-purple-600 text-white hover:bg-purple-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
