'use client';

import { useState } from "react";

interface Props { locale?: string; }

type MentalState = "lightness" | "resistance" | "lethargy" | "escape";

interface QuestionOption {
  text: string;
  scores: { lightness: number; resistance: number; lethargy: number; escape: number };
}

interface Question {
  id: string;
  type: "morning" | "evening";
  text: string;
  options: QuestionOption[];
}

const data = {
  ko: {
    title: "출퇴근 멘탈 기온 테스트",
    description: "10개의 질문으로 나의 출퇴근길 심리 온도를 측정하세요.",
    questions: [
      { id: "q1", type: "morning" as const, text: "아침에 알람이 울릴 때 제일 먼저 드는 생각은?", options: [
        { text: "오늘도 화이팅! 일어나자", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "아... 일어나야 하는데...", scores: { lightness: 0, resistance: 7, lethargy: 5, escape: 0 } },
        { text: "5분만... 더...", scores: { lightness: 0, resistance: 3, lethargy: 10, escape: 0 } },
        { text: "오늘 안 가면 안 될까?", scores: { lightness: 0, resistance: 2, lethargy: 3, escape: 10 } },
      ] },
      { id: "q2", type: "morning" as const, text: "출근 준비를 하면서 기분은?", options: [
        { text: "오늘 할 일을 생각하며 준비한다", scores: { lightness: 9, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "기계적으로 루틴대로 움직인다", scores: { lightness: 2, resistance: 5, lethargy: 6, escape: 0 } },
        { text: "몸이 무겁고 움직이기 싫다", scores: { lightness: 0, resistance: 3, lethargy: 10, escape: 2 } },
        { text: "가고 싶지 않다는 생각뿐이다", scores: { lightness: 0, resistance: 4, lethargy: 4, escape: 9 } },
      ] },
      { id: "q3", type: "morning" as const, text: "출근길에 당신의 모습은?", options: [
        { text: "음악 듣거나 뉴스 보며 활기차게", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "멍하니 창밖을 보거나 핸드폰만", scores: { lightness: 1, resistance: 6, lethargy: 7, escape: 1 } },
        { text: "눈을 감고 조금이라도 더 쉬려고", scores: { lightness: 0, resistance: 2, lethargy: 10, escape: 0 } },
        { text: "도착하는 게 두렵고 불안하다", scores: { lightness: 0, resistance: 5, lethargy: 3, escape: 10 } },
      ] },
      { id: "q4", type: "morning" as const, text: "회사 건물이 보일 때 드는 감정은?", options: [
        { text: "이제 시작이다! 어떤 일이 있을까", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "아... 도착했구나... 하는 체념", scores: { lightness: 0, resistance: 8, lethargy: 5, escape: 0 } },
        { text: "발걸음이 무겁고 천천히 걷게 됨", scores: { lightness: 0, resistance: 4, lethargy: 9, escape: 2 } },
        { text: "지금이라도 돌아가고 싶다", scores: { lightness: 0, resistance: 2, lethargy: 2, escape: 10 } },
      ] },
      { id: "q5", type: "morning" as const, text: "사무실 문을 열고 들어갈 때 기분은?", options: [
        { text: "동료들에게 인사하며 자리로", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "조용히 자리에 앉아 컴퓨터를 켠다", scores: { lightness: 2, resistance: 7, lethargy: 6, escape: 0 } },
        { text: "한숨이 나오고 의자에 푹 앉는다", scores: { lightness: 0, resistance: 3, lethargy: 10, escape: 1 } },
        { text: "여기 있고 싶지 않다는 생각", scores: { lightness: 0, resistance: 2, lethargy: 3, escape: 10 } },
      ] },
      { id: "q6", type: "evening" as const, text: "퇴근 시간이 되었을 때 기분은?", options: [
        { text: "오늘도 수고했어! 집에 가자", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "드디어... 끝났다...", scores: { lightness: 3, resistance: 7, lethargy: 5, escape: 0 } },
        { text: "몸도 마음도 지쳐서 녹초", scores: { lightness: 0, resistance: 2, lethargy: 10, escape: 1 } },
        { text: "해방됐다! 도망쳐야지", scores: { lightness: 2, resistance: 0, lethargy: 0, escape: 10 } },
      ] },
      { id: "q7", type: "evening" as const, text: "퇴근길에 당신의 모습은?", options: [
        { text: "저녁 계획을 생각하며 활기차게", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "오늘 있었던 일을 곱씹으며 이동", scores: { lightness: 1, resistance: 8, lethargy: 4, escape: 0 } },
        { text: "아무 생각 없이 기계적으로 이동", scores: { lightness: 0, resistance: 3, lethargy: 10, escape: 0 } },
        { text: "빨리 벗어나고 싶어서 서두른다", scores: { lightness: 0, resistance: 1, lethargy: 1, escape: 10 } },
      ] },
      { id: "q8", type: "evening" as const, text: "집에 도착했을 때 제일 먼저 하는 행동은?", options: [
        { text: "씻고 저녁 먹고 여가 활동", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "일단 소파에 앉아서 휴식", scores: { lightness: 3, resistance: 6, lethargy: 7, escape: 0 } },
        { text: "침대에 쓰러져서 움직이지 않음", scores: { lightness: 0, resistance: 2, lethargy: 10, escape: 0 } },
        { text: "술이나 게임으로 현실 회피", scores: { lightness: 0, resistance: 1, lethargy: 2, escape: 10 } },
      ] },
      { id: "q9", type: "evening" as const, text: "저녁 시간을 보내면서 드는 생각은?", options: [
        { text: "오늘 하루 잘 보냈어, 내일도 잘하자", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "내일이 걱정되고 불안하다", scores: { lightness: 0, resistance: 9, lethargy: 3, escape: 2 } },
        { text: "아무것도 하기 싫고 그냥 있고 싶다", scores: { lightness: 0, resistance: 2, lethargy: 10, escape: 0 } },
        { text: "이 생활에서 벗어나고 싶다", scores: { lightness: 0, resistance: 3, lethargy: 1, escape: 10 } },
      ] },
      { id: "q10", type: "evening" as const, text: "잠들기 전 마지막 생각은?", options: [
        { text: "내일이 기대된다", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "내일도 이렇게 버텨야 하나...", scores: { lightness: 0, resistance: 10, lethargy: 5, escape: 0 } },
        { text: "자고 싶지 않다... 아침이 오기 싫다", scores: { lightness: 0, resistance: 5, lethargy: 8, escape: 3 } },
        { text: "이 모든 걸 그만두고 싶다", scores: { lightness: 0, resistance: 2, lethargy: 2, escape: 10 } },
      ] },
    ] as Question[],
    results: {
      lightness: { emoji: "🌟", title: "가벼운 상태", desc: "긍정적이고 활기찬 에너지가 넘칩니다. 출퇴근길이 비교적 가볍게 느껴지고, 업무와 일상의 균형이 잘 잡혀 있습니다. 지금의 건강한 루틴을 유지하세요." },
      resistance: { emoji: "😤", title: "저항하는 상태", desc: "버티고 있지만 체념적인 에너지 상태입니다. 출근할 때마다 심리적 저항감이 있지만 아직 포기하지 않았습니다. 작은 성취감을 찾고 퇴근 후 완전한 단절 시간을 가져보세요." },
      lethargy: { emoji: "😴", title: "무기력한 상태", desc: "지치고 에너지가 소진된 상태입니다. 모든 일이 과도한 에너지 소모로 느껴지고 집중력이 저하되어 있습니다. 즉시 휴식과 회복 시간이 필요하며 전문가 상담도 고려해보세요." },
      escape: { emoji: "🏃", title: "도피하는 상태", desc: "현재 상황을 회피하고 벗어나고 싶은 상태입니다. 변화의 필요성을 명확히 인식하고 있습니다. 도피 욕구의 근본 원인을 파악하고 실제로 변화 가능한 것부터 시도해보세요." },
    },
    retake: "다시하기", resultLabel: "나의 출퇴근 멘탈 상태",
  },
  en: {
    title: "Commute Mental Temperature Test",
    description: "Measure your commute mental temperature with 10 questions.",
    questions: [
      { id: "q1", type: "morning" as const, text: "What's the first thing that comes to mind when your alarm goes off?", options: [
        { text: "Let's go, today will be great!", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "Ugh, I have to get up...", scores: { lightness: 0, resistance: 7, lethargy: 5, escape: 0 } },
        { text: "Just 5 more minutes...", scores: { lightness: 0, resistance: 3, lethargy: 10, escape: 0 } },
        { text: "Can I just not go today?", scores: { lightness: 0, resistance: 2, lethargy: 3, escape: 10 } },
      ] },
      { id: "q2", type: "morning" as const, text: "How do you feel while getting ready for work?", options: [
        { text: "Thinking about what I'll accomplish today", scores: { lightness: 9, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "Moving mechanically through my routine", scores: { lightness: 2, resistance: 5, lethargy: 6, escape: 0 } },
        { text: "My body feels heavy and I don't want to move", scores: { lightness: 0, resistance: 3, lethargy: 10, escape: 2 } },
        { text: "All I can think is that I don't want to go", scores: { lightness: 0, resistance: 4, lethargy: 4, escape: 9 } },
      ] },
      { id: "q3", type: "morning" as const, text: "What are you like during your morning commute?", options: [
        { text: "Energetically listening to music or catching up on news", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "Staring blankly out the window or scrolling my phone", scores: { lightness: 1, resistance: 6, lethargy: 7, escape: 1 } },
        { text: "Trying to squeeze in a bit more rest with my eyes closed", scores: { lightness: 0, resistance: 2, lethargy: 10, escape: 0 } },
        { text: "Feeling anxious and dreading my arrival", scores: { lightness: 0, resistance: 5, lethargy: 3, escape: 10 } },
      ] },
      { id: "q4", type: "morning" as const, text: "How do you feel when the office building comes into view?", options: [
        { text: "Here we go! I wonder what today will bring", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "A resigned feeling of 'well, I'm here'", scores: { lightness: 0, resistance: 8, lethargy: 5, escape: 0 } },
        { text: "My steps get heavier and I slow down", scores: { lightness: 0, resistance: 4, lethargy: 9, escape: 2 } },
        { text: "I want to turn around even now", scores: { lightness: 0, resistance: 2, lethargy: 2, escape: 10 } },
      ] },
      { id: "q5", type: "morning" as const, text: "How do you feel walking through the office door?", options: [
        { text: "Greeting colleagues and heading to my desk", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "Quietly sitting down and turning on my computer", scores: { lightness: 2, resistance: 7, lethargy: 6, escape: 0 } },
        { text: "Sighing and sinking into my chair", scores: { lightness: 0, resistance: 3, lethargy: 10, escape: 1 } },
        { text: "Thinking about how much I don't want to be here", scores: { lightness: 0, resistance: 2, lethargy: 3, escape: 10 } },
      ] },
      { id: "q6", type: "evening" as const, text: "How do you feel when it's finally time to leave?", options: [
        { text: "Great work today, time to go home!", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "Finally... it's over...", scores: { lightness: 3, resistance: 7, lethargy: 5, escape: 0 } },
        { text: "Completely drained, body and mind", scores: { lightness: 0, resistance: 2, lethargy: 10, escape: 1 } },
        { text: "I'm free! Time to escape!", scores: { lightness: 2, resistance: 0, lethargy: 0, escape: 10 } },
      ] },
      { id: "q7", type: "evening" as const, text: "What are you like during your evening commute?", options: [
        { text: "Energetically thinking about my evening plans", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "Replaying what happened today in my mind", scores: { lightness: 1, resistance: 8, lethargy: 4, escape: 0 } },
        { text: "Moving mechanically with nothing on my mind", scores: { lightness: 0, resistance: 3, lethargy: 10, escape: 0 } },
        { text: "Rushing because I just want to get away", scores: { lightness: 0, resistance: 1, lethargy: 1, escape: 10 } },
      ] },
      { id: "q8", type: "evening" as const, text: "What's the first thing you do when you get home?", options: [
        { text: "Freshen up, have dinner, and enjoy some leisure", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "Sit on the couch and rest for a bit", scores: { lightness: 3, resistance: 6, lethargy: 7, escape: 0 } },
        { text: "Collapse on the bed and not move", scores: { lightness: 0, resistance: 2, lethargy: 10, escape: 0 } },
        { text: "Escape with alcohol or games", scores: { lightness: 0, resistance: 1, lethargy: 2, escape: 10 } },
      ] },
      { id: "q9", type: "evening" as const, text: "What thoughts come up during your evening?", options: [
        { text: "Today was good, I'll do well tomorrow too", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "I'm worried and anxious about tomorrow", scores: { lightness: 0, resistance: 9, lethargy: 3, escape: 2 } },
        { text: "I don't want to do anything, just exist", scores: { lightness: 0, resistance: 2, lethargy: 10, escape: 0 } },
        { text: "I want to escape this whole life", scores: { lightness: 0, resistance: 3, lethargy: 1, escape: 10 } },
      ] },
      { id: "q10", type: "evening" as const, text: "What's your last thought before falling asleep?", options: [
        { text: "I'm looking forward to tomorrow", scores: { lightness: 10, resistance: 0, lethargy: 0, escape: 0 } },
        { text: "Do I have to endure another day like this...", scores: { lightness: 0, resistance: 10, lethargy: 5, escape: 0 } },
        { text: "I don't want to sleep... I don't want morning to come", scores: { lightness: 0, resistance: 5, lethargy: 8, escape: 3 } },
        { text: "I want to quit everything", scores: { lightness: 0, resistance: 2, lethargy: 2, escape: 10 } },
      ] },
    ] as Question[],
    results: {
      lightness: { emoji: "🌟", title: "Light & Energized", desc: "You have positive, vibrant energy. Your commute feels relatively light and your work-life balance is well maintained. Keep up your healthy routines." },
      resistance: { emoji: "😤", title: "Resistant but Holding On", desc: "You're enduring with a resigned energy. There's psychological resistance on your way to work but you haven't given up. Try to find small wins and create full mental disconnect time after work." },
      lethargy: { emoji: "😴", title: "Lethargic & Drained", desc: "You're exhausted and depleted. Everything feels like it takes too much energy and your concentration is low. You urgently need rest and recovery time — consider professional consultation." },
      escape: { emoji: "🏃", title: "Escape Mode", desc: "You want to avoid and break free from your current situation. You clearly recognize the need for change. Identify the root cause of your escape urge and try making changes in areas you actually can." },
    },
    retake: "Retake", resultLabel: "Your Commute Mental State",
  },
};

export default function CommuteMentalTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, { lightness: number; resistance: number; lethargy: number; escape: number }>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const totalScores = Object.values(answers).reduce(
    (acc, s) => ({
      lightness: acc.lightness + s.lightness,
      resistance: acc.resistance + s.resistance,
      lethargy: acc.lethargy + s.lethargy,
      escape: acc.escape + s.escape,
    }),
    { lightness: 0, resistance: 0, lethargy: 0, escape: 0 }
  );

  const topState = (Object.entries(totalScores) as [MentalState, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[topState];
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-teal-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="p-6 bg-teal-50 rounded-2xl border border-teal-100">
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
          <div className="h-2 bg-teal-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="space-y-8">
        {t.questions.map((q, i) => (
          <div key={q.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-teal-50 text-teal-600 font-semibold">
                {q.type === "morning" ? (lang === "ko" ? "🌅 아침" : "🌅 Morning") : (lang === "ko" ? "🌆 저녁" : "🌆 Evening")}
              </span>
            </div>
            <p className="font-semibold text-slate-800 leading-snug">{i + 1}. {q.text}</p>
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.scores }))}
                  className={`py-3 px-4 text-sm rounded-xl border transition-all text-left ${JSON.stringify(answers[q.id]) === JSON.stringify(opt.scores) ? "bg-teal-500 border-teal-500 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-teal-500 text-white hover:bg-teal-600 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
