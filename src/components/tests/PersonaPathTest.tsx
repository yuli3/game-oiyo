'use client';

import { useState } from "react";

interface Props { locale?: string; }

type MbtiDim = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

const data = {
  ko: {
    title: "페르소나 패스 테스트: 나의 성격 유형은?",
    description: "20개의 질문으로 MBTI 기반 나의 성격 차원을 알아보세요.",
    questions: [
      { id: "q1", text: "나는 많은 사람들과 어울릴 때 에너지가 충전된다.", type: "E" as MbtiDim },
      { id: "q2", text: "나는 혼자만의 시간을 통해 에너지를 회복한다.", type: "I" as MbtiDim },
      { id: "q3", text: "나는 구체적인 사실과 실제 경험에 주목한다.", type: "S" as MbtiDim },
      { id: "q4", text: "나는 큰 그림과 미래의 가능성에 집중한다.", type: "N" as MbtiDim },
      { id: "q5", text: "나는 결정을 내릴 때 논리와 분석을 우선시한다.", type: "T" as MbtiDim },
      { id: "q6", text: "나는 결정을 내릴 때 감정과 관계를 중시한다.", type: "F" as MbtiDim },
      { id: "q7", text: "나는 계획을 세우고 체계적으로 일을 처리하는 것을 선호한다.", type: "J" as MbtiDim },
      { id: "q8", text: "나는 유연하게 상황에 맞춰 행동하는 것을 선호한다.", type: "P" as MbtiDim },
      { id: "q9", text: "사람들과 이야기하면서 생각을 정리하는 편이다.", type: "E" as MbtiDim },
      { id: "q10", text: "생각을 충분히 정리한 후에 말하는 편이다.", type: "I" as MbtiDim },
      { id: "q11", text: "현재 상황에 집중하고 실용적인 해결책을 찾는다.", type: "S" as MbtiDim },
      { id: "q12", text: "새로운 아이디어와 패턴을 탐구하는 것을 즐긴다.", type: "N" as MbtiDim },
      { id: "q13", text: "공정성과 객관적인 기준이 중요하다.", type: "T" as MbtiDim },
      { id: "q14", text: "상대방의 감정을 배려하는 것이 매우 중요하다.", type: "F" as MbtiDim },
      { id: "q15", text: "마감 전에 미리 완료하는 것이 편안하다.", type: "J" as MbtiDim },
      { id: "q16", text: "영감이 생길 때까지 기다렸다가 집중적으로 작업한다.", type: "P" as MbtiDim },
      { id: "q17", text: "새로운 사람을 만나는 것이 자연스럽고 즐겁다.", type: "E" as MbtiDim },
      { id: "q18", text: "깊은 관계를 가진 소수의 친구를 더 선호한다.", type: "I" as MbtiDim },
      { id: "q19", text: "규칙과 체계를 따르는 것이 안정적이고 편하다.", type: "J" as MbtiDim },
      { id: "q20", text: "규칙보다는 상황에 따라 유연하게 대처한다.", type: "P" as MbtiDim },
    ],
    options: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    results: {
      E: { emoji: "🗣️", title: "외향형 (Extrovert)", desc: "사람들과의 교류에서 에너지를 얻는 외향적인 성격입니다. 활발하고 표현력이 풍부하며, 다양한 사회적 상황에서 빛을 발합니다." },
      I: { emoji: "🧘", title: "내향형 (Introvert)", desc: "혼자만의 시간에서 에너지를 회복하는 내향적인 성격입니다. 깊이 있는 사고와 집중력이 뛰어나며, 의미 있는 대화를 선호합니다." },
      S: { emoji: "📊", title: "감각형 (Sensing)", desc: "현실적이고 실용적인 성격으로 구체적인 사실과 경험을 중시합니다. 세심한 관찰력과 현재에 집중하는 능력이 강점입니다." },
      N: { emoji: "💭", title: "직관형 (Intuitive)", desc: "미래 지향적이고 창의적인 성격으로 아이디어와 가능성을 탐구합니다. 큰 그림을 보는 능력과 혁신적 사고가 강점입니다." },
      T: { emoji: "⚖️", title: "사고형 (Thinking)", desc: "논리적이고 분석적인 성격으로 객관적인 기준에 따라 결정을 내립니다. 공정성과 효율성을 중시하는 문제 해결사입니다." },
      F: { emoji: "💝", title: "감정형 (Feeling)", desc: "공감 능력이 뛰어나고 관계 지향적인 성격입니다. 타인의 감정에 민감하고 조화로운 관계를 만드는 것을 중요하게 여깁니다." },
      J: { emoji: "📋", title: "판단형 (Judging)", desc: "계획적이고 체계적인 성격으로 결정을 빠르게 내리고 실행합니다. 조직적이고 목표 지향적인 삶의 방식을 선호합니다." },
      P: { emoji: "🔄", title: "인식형 (Perceiving)", desc: "유연하고 적응력 있는 성격으로 상황에 맞게 자유롭게 대처합니다. 자발적이고 다양한 가능성을 열어두는 삶의 방식을 즐깁니다." },
    },
    retake: "다시하기", resultLabel: "나의 우세한 성격 차원",
  },
  en: {
    title: "Persona Path Test: What's Your Personality Type?",
    description: "Explore your MBTI-based personality dimensions through 20 questions.",
    questions: [
      { id: "q1", text: "I feel energized when socializing with many people.", type: "E" as MbtiDim },
      { id: "q2", text: "I recharge my energy through alone time.", type: "I" as MbtiDim },
      { id: "q3", text: "I pay attention to concrete facts and real experiences.", type: "S" as MbtiDim },
      { id: "q4", text: "I focus on the big picture and future possibilities.", type: "N" as MbtiDim },
      { id: "q5", text: "I prioritize logic and analysis when making decisions.", type: "T" as MbtiDim },
      { id: "q6", text: "I give weight to emotions and relationships when deciding.", type: "F" as MbtiDim },
      { id: "q7", text: "I prefer making plans and handling things systematically.", type: "J" as MbtiDim },
      { id: "q8", text: "I prefer to flexibly adapt to situations as they come.", type: "P" as MbtiDim },
      { id: "q9", text: "I tend to organize my thoughts by talking things through with others.", type: "E" as MbtiDim },
      { id: "q10", text: "I prefer to fully organize my thoughts before speaking.", type: "I" as MbtiDim },
      { id: "q11", text: "I focus on the present and look for practical solutions.", type: "S" as MbtiDim },
      { id: "q12", text: "I enjoy exploring new ideas and patterns.", type: "N" as MbtiDim },
      { id: "q13", text: "Fairness and objective criteria are important to me.", type: "T" as MbtiDim },
      { id: "q14", text: "Considering others' feelings is very important to me.", type: "F" as MbtiDim },
      { id: "q15", text: "I feel comfortable finishing tasks well before the deadline.", type: "J" as MbtiDim },
      { id: "q16", text: "I wait for inspiration and then work in concentrated bursts.", type: "P" as MbtiDim },
      { id: "q17", text: "Meeting new people comes naturally and is enjoyable for me.", type: "E" as MbtiDim },
      { id: "q18", text: "I prefer a few close friendships over many acquaintances.", type: "I" as MbtiDim },
      { id: "q19", text: "Following rules and systems feels stable and comfortable.", type: "J" as MbtiDim },
      { id: "q20", text: "I adapt flexibly to situations rather than following rigid rules.", type: "P" as MbtiDim },
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      E: { emoji: "🗣️", title: "Extrovert", desc: "You gain energy from interactions with people. Lively and expressive, you shine in a variety of social situations." },
      I: { emoji: "🧘", title: "Introvert", desc: "You recharge through alone time. Your deep thinking and concentration are outstanding, and you prefer meaningful conversations." },
      S: { emoji: "📊", title: "Sensing", desc: "Realistic and practical, you value concrete facts and experience. Your careful observation and ability to focus on the present are strengths." },
      N: { emoji: "💭", title: "Intuitive", desc: "Future-oriented and creative, you explore ideas and possibilities. Your ability to see the big picture and innovative thinking are strengths." },
      T: { emoji: "⚖️", title: "Thinking", desc: "Logical and analytical, you make decisions based on objective standards. You're a problem-solver who values fairness and efficiency." },
      F: { emoji: "💝", title: "Feeling", desc: "Empathetic and relationship-oriented, you're sensitive to others' emotions and prioritize creating harmonious connections." },
      J: { emoji: "📋", title: "Judging", desc: "Organized and systematic, you make decisions quickly and execute them. You prefer a structured, goal-oriented way of life." },
      P: { emoji: "🔄", title: "Perceiving", desc: "Flexible and adaptable, you handle situations with freedom. You enjoy a spontaneous lifestyle that keeps possibilities open." },
    },
    retake: "Retake", resultLabel: "Your Dominant Personality Dimension",
  },
};

export default function PersonaPathTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const dims: MbtiDim[] = ["E", "I", "S", "N", "T", "F", "J", "P"];
  const scores = Object.fromEntries(dims.map((s) => [s, 0])) as Record<MbtiDim, number>;
  t.questions.forEach((q) => { if (answers[q.id]) scores[q.type] += answers[q.id]; });
  const topDim = (Object.entries(scores) as [MbtiDim, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[topDim];
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-violet-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="p-6 bg-violet-50 rounded-2xl border border-violet-100">
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
          <div className="h-2 bg-violet-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
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
                  className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${answers[q.id] === v + 1 ? "bg-violet-600 border-violet-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-violet-600 text-white hover:bg-violet-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
