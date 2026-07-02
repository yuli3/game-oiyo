'use client';

import { useState } from "react";

interface Props { locale?: string; }

type AttachmentType = "secure" | "anxious" | "avoidant" | "fearful";

const data = {
  ko: {
    title: "애착 유형 테스트: 나의 관계 패턴은?",
    description: "12개의 질문으로 나의 애착 유형을 알아보세요.",
    questions: [
      { id: "q1", text: "나는 다른 사람들과 정서적으로 가까워지는 것이 쉽다고 느낀다.", type: "secure" as AttachmentType },
      { id: "q2", text: "나는 다른 사람에게 의지하고 그들이 나에게 의지하는 것이 편안하다.", type: "secure" as AttachmentType },
      { id: "q3", text: "나는 혼자 있거나 다른 사람들이 나를 받아들이지 않는 것에 대해 걱정하지 않는다.", type: "secure" as AttachmentType },
      { id: "q4", text: "나는 다른 사람들이 내가 그들을 생각하는 만큼 나를 생각하지 않을까 걱정한다.", type: "anxious" as AttachmentType },
      { id: "q5", text: "나는 종종 내 파트너가 정말로 나를 사랑하지 않거나 나와 함께 있지 않을까 걱정한다.", type: "anxious" as AttachmentType },
      { id: "q6", text: "나는 다른 사람들과 매우 가까워지고 싶어하며, 이것이 때때로 그들을 겁먹게 한다.", type: "anxious" as AttachmentType },
      { id: "q7", text: "나는 내 깊은 감정을 다른 사람들에게 보여주지 않는 것을 선호한다.", type: "avoidant" as AttachmentType },
      { id: "q8", text: "나는 가까운 정서적 관계 없이도 편안함을 느낀다.", type: "avoidant" as AttachmentType },
      { id: "q9", text: "독립적이고 자급자족하는 느낌을 갖는 것이 나에게 매우 중요하다.", type: "avoidant" as AttachmentType },
      { id: "q10", text: "나는 정서적으로 가까운 관계를 원하지만, 다른 사람들을 완전히 신뢰하는 것이 어렵다고 느낀다.", type: "fearful" as AttachmentType },
      { id: "q11", text: "나는 다른 사람들과 너무 가까워지면 상처받을까 봐 걱정한다.", type: "fearful" as AttachmentType },
      { id: "q12", text: "나는 다른 사람들과 가까워지는 것이 불편하지만, 가까운 관계가 없는 것에 대해서도 걱정한다.", type: "fearful" as AttachmentType },
    ],
    options: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    results: {
      secure: { emoji: "💚", title: "안정형 애착", desc: "친밀함과 독립성에 편안함을 느낍니다. 다른 사람들을 신뢰하고 혼자 있는 것을 두려워하지 않으며, 관계에서 건강한 균형을 유지합니다." },
      anxious: { emoji: "💛", title: "불안-몰두형 애착", desc: "가까운 관계를 원하지만 종종 거부나 버림받는 것에 대해 걱정합니다. 파트너로부터 높은 수준의 친밀감과 확인을 추구하는 경향이 있습니다." },
      avoidant: { emoji: "💙", title: "회피형 애착", desc: "독립성과 자급자족을 중요시합니다. 다른 사람에게 의존하거나 감정을 드러내는 것에 불편함을 느끼는 경향이 있습니다." },
      fearful: { emoji: "💜", title: "두려움-회피형 애착", desc: "가까운 관계를 원하지만 다른 사람들을 완전히 신뢰하거나 의존하는 것이 어렵습니다. 친밀함을 원하지만 상처받을 것이 두렵습니다." },
    },
    retake: "다시하기", resultLabel: "나의 애착 유형",
  },
  en: {
    title: "Bond Insight Test: What's Your Attachment Style?",
    description: "Discover your attachment style with 12 questions.",
    questions: [
      { id: "q1", text: "I find it easy to get emotionally close to others.", type: "secure" as AttachmentType },
      { id: "q2", text: "I'm comfortable depending on others and having them depend on me.", type: "secure" as AttachmentType },
      { id: "q3", text: "I don't worry about being alone or others not accepting me.", type: "secure" as AttachmentType },
      { id: "q4", text: "I worry that others don't think about me as much as I think about them.", type: "anxious" as AttachmentType },
      { id: "q5", text: "I often worry that my partner doesn't really love me or won't want to stay with me.", type: "anxious" as AttachmentType },
      { id: "q6", text: "I want to be very close to others, and this sometimes scares people away.", type: "anxious" as AttachmentType },
      { id: "q7", text: "I prefer not to show others my deep feelings.", type: "avoidant" as AttachmentType },
      { id: "q8", text: "I feel comfortable without close emotional relationships.", type: "avoidant" as AttachmentType },
      { id: "q9", text: "Being independent and self-sufficient is very important to me.", type: "avoidant" as AttachmentType },
      { id: "q10", text: "I want emotionally close relationships but find it hard to fully trust others.", type: "fearful" as AttachmentType },
      { id: "q11", text: "I worry that I'll be hurt if I let myself get too close to others.", type: "fearful" as AttachmentType },
      { id: "q12", text: "I'm uncomfortable getting close to others, but I also worry about being without close relationships.", type: "fearful" as AttachmentType },
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      secure: { emoji: "💚", title: "Secure Attachment", desc: "You're comfortable with both intimacy and independence. You trust others and aren't afraid of being alone. Your relationships tend to be stable and satisfying." },
      anxious: { emoji: "💛", title: "Anxious-Preoccupied Attachment", desc: "You want close relationships but often worry about rejection or abandonment. You tend to seek high levels of closeness and reassurance from partners." },
      avoidant: { emoji: "💙", title: "Dismissive-Avoidant Attachment", desc: "You value independence and self-sufficiency. You may feel uncomfortable depending on others or revealing your emotions." },
      fearful: { emoji: "💜", title: "Fearful-Avoidant Attachment", desc: "You want close relationships but find it hard to fully trust or depend on others. You desire intimacy but fear getting hurt." },
    },
    retake: "Retake", resultLabel: "Your Attachment Style",
  },
};

export default function BondInsightTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const attachmentTypes: AttachmentType[] = ["secure", "anxious", "avoidant", "fearful"];
  const scores = Object.fromEntries(attachmentTypes.map((a) => [a, 0])) as Record<AttachmentType, number>;

  t.questions.forEach((q) => {
    if (answers[q.id]) scores[q.type] += answers[q.id];
  });

  const topType = (Object.entries(scores) as [AttachmentType, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[topType];
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-pink-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="p-6 bg-pink-50 rounded-2xl border border-pink-100">
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
          <div className="h-2 bg-pink-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
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
                  className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${answers[q.id] === v + 1 ? "bg-pink-600 border-pink-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-pink-600 text-white hover:bg-pink-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
