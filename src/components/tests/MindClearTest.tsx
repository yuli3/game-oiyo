'use client';

import { useState } from "react";

interface Props { locale?: string; }

type ClarityLevel = "crystal" | "focused" | "foggy" | "overloaded";

const data = {
  ko: {
    title: "마음 명확도 테스트: 내 마음은 얼마나 맑은가?",
    description: "10개의 질문으로 현재 정신적 명확도와 인지 부하 수준을 측정합니다.",
    questions: [
      { id: "q1", text: "아침에 일어났을 때 오늘 해야 할 일이 선명하게 떠오른다.", reverse: false },
      { id: "q2", text: "하나의 생각에서 다른 생각으로 자주 뛰어다닌다.", reverse: true },
      { id: "q3", text: "대화 중 상대방의 말을 처음부터 끝까지 잘 집중해서 듣는다.", reverse: false },
      { id: "q4", text: "머릿속에 처리되지 않은 걱정이나 미결 사항이 많이 쌓여 있다.", reverse: true },
      { id: "q5", text: "중요한 결정을 내릴 때 무엇을 원하는지 분명히 안다.", reverse: false },
      { id: "q6", text: "간단한 일도 시작하기가 버겁게 느껴질 때가 있다.", reverse: true },
      { id: "q7", text: "하루 일과를 마치고 나면 성취감이 든다.", reverse: false },
      { id: "q8", text: "생각이 많아서 잠들기 어려운 날이 자주 있다.", reverse: true },
      { id: "q9", text: "지금 이 순간에 집중하는 것이 자연스럽다.", reverse: false },
      { id: "q10", text: "해야 할 일들이 머릿속에서 충돌하는 느낌이 든다.", reverse: true },
    ],
    options: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    results: {
      crystal: { emoji: "💎", title: "수정처럼 맑은 마음 (Crystal Clear)", desc: "현재 정신적 명확도가 매우 높습니다. 생각이 잘 정리되어 있고 집중력과 결정력이 좋습니다. 지금의 루틴을 유지하세요." },
      focused: { emoji: "🔆", title: "집중된 마음 (Focused)", desc: "대체로 명확하지만 가끔 흐릿해지는 순간이 있습니다. 짧은 마음 정리 시간(일기, 명상)으로 더 선명해질 수 있습니다." },
      foggy: { emoji: "🌫️", title: "안개 낀 마음 (Foggy)", desc: "처리되지 않은 생각들이 명확도를 흐리고 있습니다. 할 일 목록 작성, 디지털 디톡스, 충분한 수면이 도움이 됩니다." },
      overloaded: { emoji: "⚡", title: "과부하 상태 (Overloaded)", desc: "현재 인지 부하가 매우 높습니다. 즉시 중요한 것 3가지만 남기고 나머지를 내려놓는 연습이 필요합니다." },
    },
    retake: "다시하기", resultLabel: "나의 마음 명확도",
  },
  en: {
    title: "Mind Clear Test: How Clear Is Your Mind?",
    description: "Measure your current mental clarity and cognitive load with 10 questions.",
    questions: [
      { id: "q1", text: "When I wake up, I have a clear picture of what I need to do today.", reverse: false },
      { id: "q2", text: "My thoughts frequently jump from one thing to another.", reverse: true },
      { id: "q3", text: "During conversations, I can focus on what the other person is saying from start to finish.", reverse: false },
      { id: "q4", text: "There are many unprocessed worries or unfinished tasks piling up in my head.", reverse: true },
      { id: "q5", text: "When making important decisions, I clearly know what I want.", reverse: false },
      { id: "q6", text: "Even simple tasks sometimes feel overwhelming to start.", reverse: true },
      { id: "q7", text: "At the end of the day, I feel a sense of accomplishment.", reverse: false },
      { id: "q8", text: "I often have trouble falling asleep because my mind is too active.", reverse: true },
      { id: "q9", text: "Focusing on the present moment comes naturally to me.", reverse: false },
      { id: "q10", text: "The things I need to do feel like they're colliding in my head.", reverse: true },
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      crystal: { emoji: "💎", title: "Crystal Clear", desc: "Your mental clarity is very high right now. Your thoughts are well-organized and you have good focus and decisiveness. Keep your current routine." },
      focused: { emoji: "🔆", title: "Focused", desc: "Generally clear, but occasionally cloudy. Short mind-clearing sessions (journaling, meditation) can sharpen your clarity." },
      foggy: { emoji: "🌫️", title: "Foggy", desc: "Unprocessed thoughts are clouding your clarity. Writing to-do lists, digital detoxes, and sufficient sleep will help." },
      overloaded: { emoji: "⚡", title: "Overloaded", desc: "Your cognitive load is very high. Practice keeping only the 3 most important things and letting the rest go." },
    },
    retake: "Retake", resultLabel: "Your Mind Clarity Level",
  },
};

export default function MindClearTest({ locale: localeProp }: Props) {
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

  const level: ClarityLevel =
    pct >= 0.8 ? "crystal" :
    pct >= 0.6 ? "focused" :
    pct >= 0.4 ? "foggy" :
    "overloaded";

  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[level];
    const barPct = Math.round(pct * 100);
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-sky-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{lang === "ko" ? "명확도 지수" : "Clarity Index"}</span>
            <span className="font-bold text-sky-600">{barPct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full">
            <div className="h-3 bg-sky-500 rounded-full transition-all" style={{ width: `${barPct}%` }} />
          </div>
        </div>
        <div className="p-6 bg-sky-50 rounded-2xl border border-sky-100">
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
          <div className="h-2 bg-sky-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
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
                  className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${answers[q.id] === v + 1 ? "bg-sky-600 border-sky-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-sky-600 text-white hover:bg-sky-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
