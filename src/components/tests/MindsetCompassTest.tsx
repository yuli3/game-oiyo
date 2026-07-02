'use client';

import { useState } from "react";

interface Props { locale?: string; }

type MindsetLevel = "growth" | "fixed";

const data = {
  ko: {
    title: "마인드셋 나침반 테스트: 나는 성장형인가, 고정형인가?",
    description: "10개의 질문으로 나의 마인드셋 유형을 알아보세요.",
    questions: [
      {
        id: "q1",
        text: "어려운 도전에 직면했을 때, 나는 일반적으로:",
        options: [
          { text: "가능하면 피한다", value: 1 },
          { text: "불안하지만 시도한다", value: 2 },
          { text: "배울 기회로 본다", value: 3 },
          { text: "도전에 흥미를 느낀다", value: 4 },
        ],
      },
      {
        id: "q2",
        text: "비판적인 피드백을 받았을 때, 나는 보통:",
        options: [
          { text: "개인적으로 받아들이고 방어적이 된다", value: 1 },
          { text: "마지못해 받아들인다", value: 2 },
          { text: "신중하게 고려한다", value: 3 },
          { text: "적극적으로 더 많은 세부 정보를 구한다", value: 4 },
        ],
      },
      {
        id: "q3",
        text: "나는 내 능력과 지능이:",
        options: [
          { text: "대부분 타고난 것이라고 믿는다", value: 1 },
          { text: "어느 정도 변할 수 있다고 생각한다", value: 2 },
          { text: "확실히 발전 가능하다고 믿는다", value: 3 },
          { text: "매우 가변적이라고 생각한다", value: 4 },
        ],
      },
      {
        id: "q4",
        text: "나보다 더 능숙한 사람을 볼 때, 나는 주로:",
        options: [
          { text: "위협받거나 부적절하다고 느낀다", value: 1 },
          { text: "나 자신을 불리하게 비교한다", value: 2 },
          { text: "영감을 받는다", value: 3 },
          { text: "배움의 기회를 찾는다", value: 4 },
        ],
      },
      {
        id: "q5",
        text: "목표를 추구하는 과정에서 장애물을 만났을 때, 나는 일반적으로:",
        options: [
          { text: "포기하고 다른 것으로 넘어간다", value: 1 },
          { text: "지속하지만 쉽게 좌절한다", value: 2 },
          { text: "다양한 접근 방식을 시도한다", value: 3 },
          { text: "과정의 일부로 본다", value: 4 },
        ],
      },
      {
        id: "q6",
        text: "내가 어려워한 일에서 다른 사람이 성공했을 때, 나는 보통:",
        options: [
          { text: "질투나 원망을 느낀다", value: 1 },
          { text: "내 능력에 대해 낙담한다", value: 2 },
          { text: "그들의 접근 방식에 대해 궁금해한다", value: 3 },
          { text: "그들에게서 배우도록 영감을 받는다", value: 4 },
        ],
      },
      {
        id: "q7",
        text: "새로운 기술을 개발할 때, 나는 다음과 같이 믿는다:",
        options: [
          { text: "타고난 재능이 가장 중요하다", value: 1 },
          { text: "노력은 도움이 되지만 한계가 있다", value: 2 },
          { text: "일관된 연습이 핵심이다", value: 3 },
          { text: "전략적 노력과 끈기가 능력을 변화시킨다", value: 4 },
        ],
      },
      {
        id: "q8",
        text: "새롭고 어려운 것을 배울 때, 나는 일반적으로:",
        options: [
          { text: "빨리 좌절한다", value: 1 },
          { text: "무능해 보일까 걱정한다", value: 2 },
          { text: "향상 과정에 집중한다", value: 3 },
          { text: "학습의 일부로 혼란을 받아들인다", value: 4 },
        ],
      },
      {
        id: "q9",
        text: "중요한 실수를 했을 때, 나는 보통:",
        options: [
          { text: "당황하고 숨기고 싶어한다", value: 1 },
          { text: "인정하지만 나쁜 기분이 든다", value: 2 },
          { text: "무엇이 잘못되었는지 이해하려고 노력한다", value: 3 },
          { text: "가치 있는 학습 기회로 본다", value: 4 },
        ],
      },
      {
        id: "q10",
        text: "나는 내 성장과 성취 잠재력이:",
        options: [
          { text: "대부분 미리 결정되어 있다고 믿는다", value: 1 },
          { text: "한계 내에서 다소 유연하다고 생각한다", value: 2 },
          { text: "헌신으로 확장 가능하다고 믿는다", value: 3 },
          { text: "사실상 무제한이라고 생각한다", value: 4 },
        ],
      },
    ],
    results: {
      growth: { emoji: "🌱", title: "성장형 마인드셋 (Growth Mindset)", desc: "당신은 능력과 지능이 노력으로 발전할 수 있다고 믿습니다. 도전을 기회로 보고, 실패에서 배우며, 피드백을 성장의 도구로 활용합니다. 이 마인드셋이 장기적인 성공의 핵심입니다." },
      fixed: { emoji: "🔒", title: "고정형 마인드셋 (Fixed Mindset)", desc: "당신은 현재 능력과 재능이 고정되어 있다고 여기는 경향이 있습니다. 도전을 피하거나 쉽게 포기할 수 있습니다. 하지만 마인드셋은 바꿀 수 있습니다. 작은 도전부터 시작해 성장형 사고를 연습해보세요." },
    },
    retake: "다시하기", resultLabel: "나의 마인드셋 유형",
  },
  en: {
    title: "Mindset Compass Test: Are You Growth or Fixed Mindset?",
    description: "Discover your mindset type through 10 questions.",
    questions: [
      {
        id: "q1",
        text: "When facing a difficult challenge, I typically:",
        options: [
          { text: "Avoid it if possible", value: 1 },
          { text: "Try, but feel anxious", value: 2 },
          { text: "See it as a learning opportunity", value: 3 },
          { text: "Find the challenge exciting", value: 4 },
        ],
      },
      {
        id: "q2",
        text: "When I receive critical feedback, I usually:",
        options: [
          { text: "Take it personally and get defensive", value: 1 },
          { text: "Accept it reluctantly", value: 2 },
          { text: "Consider it carefully", value: 3 },
          { text: "Actively seek more details", value: 4 },
        ],
      },
      {
        id: "q3",
        text: "I believe my abilities and intelligence are:",
        options: [
          { text: "Mostly innate and fixed", value: 1 },
          { text: "Somewhat changeable", value: 2 },
          { text: "Definitely developable", value: 3 },
          { text: "Highly variable with effort", value: 4 },
        ],
      },
      {
        id: "q4",
        text: "When I see someone more skilled than me, I mainly:",
        options: [
          { text: "Feel threatened or inadequate", value: 1 },
          { text: "Compare myself unfavorably", value: 2 },
          { text: "Feel inspired", value: 3 },
          { text: "Look for opportunities to learn from them", value: 4 },
        ],
      },
      {
        id: "q5",
        text: "When I encounter obstacles while pursuing a goal, I typically:",
        options: [
          { text: "Give up and move on to something else", value: 1 },
          { text: "Persist, but get frustrated easily", value: 2 },
          { text: "Try different approaches", value: 3 },
          { text: "See it as part of the process", value: 4 },
        ],
      },
      {
        id: "q6",
        text: "When someone else succeeds at something I struggled with, I usually:",
        options: [
          { text: "Feel envious or resentful", value: 1 },
          { text: "Feel discouraged about my own abilities", value: 2 },
          { text: "Feel curious about their approach", value: 3 },
          { text: "Feel inspired to learn from them", value: 4 },
        ],
      },
      {
        id: "q7",
        text: "When developing a new skill, I believe:",
        options: [
          { text: "Natural talent is what matters most", value: 1 },
          { text: "Effort helps but has limits", value: 2 },
          { text: "Consistent practice is key", value: 3 },
          { text: "Strategic effort and persistence transform ability", value: 4 },
        ],
      },
      {
        id: "q8",
        text: "When learning something new and difficult, I generally:",
        options: [
          { text: "Get frustrated quickly", value: 1 },
          { text: "Worry about looking incompetent", value: 2 },
          { text: "Focus on the improvement process", value: 3 },
          { text: "Embrace confusion as part of learning", value: 4 },
        ],
      },
      {
        id: "q9",
        text: "When I make an important mistake, I usually:",
        options: [
          { text: "Feel embarrassed and want to hide it", value: 1 },
          { text: "Admit it but feel bad", value: 2 },
          { text: "Try to understand what went wrong", value: 3 },
          { text: "See it as a valuable learning opportunity", value: 4 },
        ],
      },
      {
        id: "q10",
        text: "I believe my potential for growth and achievement is:",
        options: [
          { text: "Mostly predetermined", value: 1 },
          { text: "Somewhat flexible within limits", value: 2 },
          { text: "Expandable with commitment", value: 3 },
          { text: "Virtually unlimited", value: 4 },
        ],
      },
    ],
    results: {
      growth: { emoji: "🌱", title: "Growth Mindset", desc: "You believe abilities and intelligence can be developed through effort. You see challenges as opportunities, learn from failure, and use feedback as a growth tool. This mindset is key to long-term success." },
      fixed: { emoji: "🔒", title: "Fixed Mindset", desc: "You tend to see your current abilities and talents as fixed. You may avoid challenges or give up easily. But mindsets can change! Start with small challenges and practice growth-oriented thinking." },
    },
    retake: "Retake", resultLabel: "Your Mindset Type",
  },
};

export default function MindsetCompassTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0);
  const maxScore = t.questions.length * 4;
  const pct = totalScore / maxScore;
  const level: MindsetLevel = pct >= 0.5 ? "growth" : "fixed";
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
            <span>{lang === "ko" ? "성장형 지수" : "Growth Index"}</span>
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
            <div className="space-y-2">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                  className={`w-full text-left py-2 px-3 text-sm rounded-lg border transition-all ${answers[q.id] === opt.value ? "bg-indigo-600 border-indigo-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                >
                  {opt.text}
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
