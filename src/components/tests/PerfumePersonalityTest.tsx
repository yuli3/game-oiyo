'use client';

import { useState } from "react";

interface Props { locale?: string; }

type ScentType = "floral" | "woody" | "fresh" | "oriental";

const data = {
  ko: {
    title: "향수 퍼스낼리티 테스트: 나의 향수 성격은?",
    description: "12개의 질문으로 나의 향기 취향과 감각 성격을 발견하세요.",
    questions: [
      { id: "q1", text: "자연 속에서 가장 좋아하는 향은 꽃밭의 달콤한 향이다.", type: "floral" as ScentType },
      { id: "q2", text: "숲 속 나무 냄새나 흙 내음 같은 자연적이고 깊은 향에 끌린다.", type: "woody" as ScentType },
      { id: "q3", text: "상쾌하고 가벼운 시트러스나 민트 향을 선호한다.", type: "fresh" as ScentType },
      { id: "q4", text: "따뜻하고 이국적인 향신료나 바닐라 같은 깊은 향에 매력을 느낀다.", type: "oriental" as ScentType },
      { id: "q5", text: "장미나 재스민 같은 클래식한 플로럴 향의 향수를 좋아한다.", type: "floral" as ScentType },
      { id: "q6", text: "나무, 머스크, 앰버 같은 무게감 있는 베이스 향을 선호한다.", type: "woody" as ScentType },
      { id: "q7", text: "상큼하고 깨끗한 느낌의 향수가 나의 일상과 잘 어울린다.", type: "fresh" as ScentType },
      { id: "q8", text: "향수에서 관능적이고 미스터리한 느낌이 나는 것을 좋아한다.", type: "oriental" as ScentType },
      { id: "q9", text: "봄여름에는 화사하고 꽃 향기 나는 향수를 쓰고 싶다.", type: "floral" as ScentType },
      { id: "q10", text: "야외 활동이나 스포츠 후에는 시원하고 상쾌한 향이 잘 어울린다.", type: "fresh" as ScentType },
      { id: "q11", text: "가을겨울에는 따뜻하고 깊은 우드 계열의 향수가 좋다.", type: "woody" as ScentType },
      { id: "q12", text: "특별한 날에는 독특하고 기억에 남는 오리엔탈 향수를 고른다.", type: "oriental" as ScentType },
    ],
    options: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    results: {
      floral: { emoji: "🌸", title: "플로럴 로맨티스트 (Floral Romanticist)", desc: "당신은 꽃처럼 아름답고 감성적인 향기를 가진 사람입니다. 로맨틱하고 따뜻한 성격으로 주변 사람들을 편안하게 만드는 능력이 있습니다. 장미, 피오니, 재스민 계열이 잘 어울립니다." },
      woody: { emoji: "🌲", title: "우디 어스 소울 (Woody Earth Soul)", desc: "당신은 대지처럼 안정적이고 깊은 내면의 힘을 가진 사람입니다. 진정성과 자연스러움을 중시하며 신뢰감을 줍니다. 샌달우드, 시더, 베티버 계열이 당신의 개성을 살려줍니다." },
      fresh: { emoji: "💨", title: "프레시 프리 스피릿 (Fresh Free Spirit)", desc: "당신은 청명하고 활기찬 에너지로 가득한 자유로운 영혼입니다. 깨끗하고 솔직한 성격으로 언제나 상쾌한 인상을 줍니다. 시트러스, 아쿠아틱, 그린 계열이 잘 맞습니다." },
      oriental: { emoji: "✨", title: "오리엔탈 미스틱 (Oriental Mystic)", desc: "당신은 깊고 관능적인 매력으로 사람들을 끌어당기는 신비로운 존재입니다. 독특한 미적 감각과 이국적인 취향이 당신을 특별하게 만듭니다. 바닐라, 앰버, 우드 스파이시 계열이 어울립니다." },
    },
    retake: "다시하기", resultLabel: "나의 향수 성격",
  },
  en: {
    title: "Perfume Personality Test: What's Your Fragrance Personality?",
    description: "Discover your scent preference and sensory personality through 12 questions.",
    questions: [
      { id: "q1", text: "My favorite natural scent is the sweet fragrance of a flower field.", type: "floral" as ScentType },
      { id: "q2", text: "I'm drawn to the deep, natural scent of forest wood or earth.", type: "woody" as ScentType },
      { id: "q3", text: "I prefer fresh and light citrus or mint fragrances.", type: "fresh" as ScentType },
      { id: "q4", text: "I find warm, exotic spices or vanilla-like deep scents appealing.", type: "oriental" as ScentType },
      { id: "q5", text: "I love classic floral fragrances like rose or jasmine.", type: "floral" as ScentType },
      { id: "q6", text: "I prefer weighty base notes like wood, musk, and amber.", type: "woody" as ScentType },
      { id: "q7", text: "Fresh and clean-smelling perfumes suit my daily life well.", type: "fresh" as ScentType },
      { id: "q8", text: "I like perfumes that feel sensual and mysterious.", type: "oriental" as ScentType },
      { id: "q9", text: "In spring and summer, I want to wear bright, floral fragrances.", type: "floral" as ScentType },
      { id: "q10", text: "After outdoor activities or sports, a cool and fresh scent suits me well.", type: "fresh" as ScentType },
      { id: "q11", text: "In fall and winter, I prefer warm and deep woody fragrances.", type: "woody" as ScentType },
      { id: "q12", text: "For special occasions, I choose a unique and memorable oriental perfume.", type: "oriental" as ScentType },
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      floral: { emoji: "🌸", title: "Floral Romanticist", desc: "You have a fragrant personality as beautiful and emotional as flowers. Your romantic and warm nature puts people at ease. Rose, peony, and jasmine families suit you perfectly." },
      woody: { emoji: "🌲", title: "Woody Earth Soul", desc: "You have a stable, grounded personality with deep inner strength like the earth. You value authenticity and naturalness, radiating trustworthiness. Sandalwood, cedar, and vetiver families highlight your character." },
      fresh: { emoji: "💨", title: "Fresh Free Spirit", desc: "You are a free spirit filled with clear and vibrant energy. Your clean and honest personality always makes a refreshing impression. Citrus, aquatic, and green families suit you well." },
      oriental: { emoji: "✨", title: "Oriental Mystic", desc: "You are a mysterious presence who draws people in with deep and sensual allure. Your unique aesthetic sense and exotic tastes make you special. Vanilla, amber, and woody spicy families suit you." },
    },
    retake: "Retake", resultLabel: "Your Fragrance Personality",
  },
};

export default function PerfumePersonalityTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const types: ScentType[] = ["floral", "woody", "fresh", "oriental"];
  const scores = Object.fromEntries(types.map((s) => [s, 0])) as Record<ScentType, number>;
  t.questions.forEach((q) => { if (answers[q.id]) scores[q.type] += answers[q.id]; });
  const topType = (Object.entries(scores) as [ScentType, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
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
