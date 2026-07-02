'use client';

import { useState } from "react";

interface Props { locale?: string; }

type ColorType = "visual-artist" | "color-harmonizer" | "contrast-seeker" | "intuitive-colorist";

const data = {
  ko: {
    title: "컬러 인식 테스트: 나의 색채 감각 유형은?",
    description: "12개의 색채 관련 질문으로 나의 컬러 인식 유형을 알아보세요.",
    questions: [
      { id: "q1", text: "방 인테리어를 고를 때 나는 주로 어떻게 하는가?", type: "color-harmonizer" as ColorType },
      { id: "q2", text: "전시회나 미술관에서 색채를 주로 어떻게 감상하는가?", type: "visual-artist" as ColorType },
      { id: "q3", text: "옷을 고를 때 나의 기준은 무엇인가?", type: "intuitive-colorist" as ColorType },
      { id: "q4", text: "사진을 찍을 때 가장 신경 쓰는 요소는?", type: "contrast-seeker" as ColorType },
      { id: "q5", text: "자연 속에서 특히 눈에 띄는 색은?", type: "visual-artist" as ColorType },
      { id: "q6", text: "친구가 옷 색상 조합을 물어본다. 나는?", type: "color-harmonizer" as ColorType },
      { id: "q7", text: "새로운 브랜드의 로고를 처음 봤을 때 가장 먼저 느끼는 것은?", type: "intuitive-colorist" as ColorType },
      { id: "q8", text: "강렬한 색 대비가 있는 작품을 봤을 때 나의 반응은?", type: "contrast-seeker" as ColorType },
      { id: "q9", text: "감정이 가라앉을 때 나를 위로하는 색은 어떤 계열인가?", type: "intuitive-colorist" as ColorType },
      { id: "q10", text: "봄 정원을 배경으로 사진을 찍는다. 나는 무엇을 강조하는가?", type: "visual-artist" as ColorType },
      { id: "q11", text: "새로운 공간(카페, 숙소 등)에 들어갔을 때 나는?", type: "color-harmonizer" as ColorType },
      { id: "q12", text: "그래픽 디자인 작업에서 색을 사용한다면?", type: "contrast-seeker" as ColorType },
    ],
    options: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    results: {
      "visual-artist": { emoji: "🎨", title: "비주얼 아티스트형", desc: "당신은 색채를 예술적 언어로 사용합니다. 미묘한 색감 차이를 감지하고 색이 가진 감정적 깊이를 탐구하는 것을 즐깁니다. 창작 활동에서 색채가 핵심 표현 수단이 됩니다." },
      "color-harmonizer": { emoji: "🌈", title: "컬러 하모나이저형", desc: "당신은 색의 조화와 균형을 본능적으로 감지합니다. 공간, 의상, 디자인에서 서로 어우러지는 색 조합을 찾아내는 능력이 뛰어나며, 주변 환경을 아름답게 만드는 감각을 가졌습니다." },
      "contrast-seeker": { emoji: "⚡", title: "콘트라스트 시커형", desc: "당신은 강렬한 대비와 선명한 경계에서 에너지를 얻습니다. 흑과 백, 보색 대비 같은 극명한 색채 조합에 끌리며, 시각적 임팩트를 중시하는 뚜렷한 미적 감각을 가졌습니다." },
      "intuitive-colorist": { emoji: "✨", title: "인튜이티브 컬러리스트형", desc: "당신은 색채를 감정과 직관으로 경험합니다. 이론보다는 느낌으로 색을 선택하며, 색이 만드는 분위기와 감정적 공명에 민감합니다. 색에서 깊은 개인적 의미를 찾는 감성형입니다." },
    },
    retake: "다시하기", resultLabel: "나의 색채 감각 유형",
  },
  en: {
    title: "Color Recognition Test: What's Your Color Sensitivity Type?",
    description: "Find out your color perception type through 12 color-related questions.",
    questions: [
      { id: "q1", text: "When choosing room décor, what do I typically do?", type: "color-harmonizer" as ColorType },
      { id: "q2", text: "How do I appreciate color at exhibitions or galleries?", type: "visual-artist" as ColorType },
      { id: "q3", text: "What is my main criteria when choosing clothes?", type: "intuitive-colorist" as ColorType },
      { id: "q4", text: "What do I pay most attention to when taking photos?", type: "contrast-seeker" as ColorType },
      { id: "q5", text: "Which colors in nature particularly catch my eye?", type: "visual-artist" as ColorType },
      { id: "q6", text: "A friend asks for advice on color combinations for an outfit. I:", type: "color-harmonizer" as ColorType },
      { id: "q7", text: "When I see a new brand's logo for the first time, what do I notice first?", type: "intuitive-colorist" as ColorType },
      { id: "q8", text: "My reaction when I see artwork with strong color contrast is:", type: "contrast-seeker" as ColorType },
      { id: "q9", text: "What color family comforts me when my emotions are low?", type: "intuitive-colorist" as ColorType },
      { id: "q10", text: "Taking a photo in a spring garden, what do I emphasize?", type: "visual-artist" as ColorType },
      { id: "q11", text: "When entering a new space (café, accommodation, etc.), I:", type: "color-harmonizer" as ColorType },
      { id: "q12", text: "If I were using color in a graphic design project:", type: "contrast-seeker" as ColorType },
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      "visual-artist": { emoji: "🎨", title: "Visual Artist", desc: "You use color as an artistic language. You enjoy detecting subtle color differences and exploring the emotional depth that colors hold. Color becomes the key expressive medium in your creative activities." },
      "color-harmonizer": { emoji: "🌈", title: "Color Harmonizer", desc: "You instinctively sense color harmony and balance. You excel at finding color combinations that work together in spaces, outfits, and design, with a talent for making your surroundings beautiful." },
      "contrast-seeker": { emoji: "⚡", title: "Contrast Seeker", desc: "You draw energy from intense contrast and sharp edges. You're drawn to striking color combinations like black-and-white or complementary contrasts, and have a strong aesthetic sense that values visual impact." },
      "intuitive-colorist": { emoji: "✨", title: "Intuitive Colorist", desc: "You experience color through emotion and intuition. You choose colors by feeling rather than theory, and are sensitive to the atmosphere and emotional resonance that colors create. You find deep personal meaning in color." },
    },
    retake: "Retake", resultLabel: "Your Color Sensitivity Type",
  },
};

export default function ColorRecognitionTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const types: ColorType[] = ["visual-artist", "color-harmonizer", "contrast-seeker", "intuitive-colorist"];
  const scores = Object.fromEntries(types.map((s) => [s, 0])) as Record<ColorType, number>;
  t.questions.forEach((q) => { if (answers[q.id]) scores[q.type] += answers[q.id]; });
  const topType = (Object.entries(scores) as [ColorType, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[topType];
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-fuchsia-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="p-6 bg-fuchsia-50 rounded-2xl border border-fuchsia-100">
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
          <div className="h-2 bg-fuchsia-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
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
                  className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${answers[q.id] === v + 1 ? "bg-fuchsia-600 border-fuchsia-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-fuchsia-600 text-white hover:bg-fuchsia-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
