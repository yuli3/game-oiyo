'use client';

import { useState } from "react";

interface Props { locale?: string; }

type PersonalityDim = "EI" | "SN" | "TF" | "JP";
type DimValue = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

interface Question {
  id: string;
  text: string;
  optionA: { text: string; value: DimValue };
  optionB: { text: string; value: DimValue };
  dim: PersonalityDim;
}

const data = {
  ko: {
    title: "인사이트퀘스트: 나의 성격 유형은?",
    description: "8개의 질문으로 나의 MBTI 기반 성격 유형을 알아보세요.",
    questions: [
      { id: "q1", text: "일반적으로 에너지를 어떻게 충전하나요?", optionA: { text: "친구들과 시간을 보내고 사교활동하기", value: "E" as DimValue }, optionB: { text: "혼자 생각하거나 조용한 시간 보내기", value: "I" as DimValue }, dim: "EI" as PersonalityDim },
      { id: "q2", text: "문제를 해결할 때, 어떤 방식을 선호하나요?", optionA: { text: "구체적인 사실과 검증된 방법에 집중하기", value: "S" as DimValue }, optionB: { text: "새로운 가능성과 이론적 개념 탐색하기", value: "N" as DimValue }, dim: "SN" as PersonalityDim },
      { id: "q3", text: "결정을 내릴 때, 일반적으로 어떻게 하나요?", optionA: { text: "논리적으로 분석하고 모든 결과를 고려하기", value: "T" as DimValue }, optionB: { text: "사람들과 그들의 감정에 어떤 영향을 미치는지 고려하기", value: "F" as DimValue }, dim: "TF" as PersonalityDim },
      { id: "q4", text: "삶을 어떻게 조직하는 것을 선호하나요?", optionA: { text: "구조, 계획 및 명확한 일정으로", value: "J" as DimValue }, optionB: { text: "유연성, 즉흥성 및 적응성으로", value: "P" as DimValue }, dim: "JP" as PersonalityDim },
      { id: "q5", text: "파티에서 당신은 더 자주:", optionA: { text: "여러 다른 사람들과 대화하고 새로운 연결을 만들기", value: "E" as DimValue }, optionB: { text: "아는 몇 명의 사람들과 더 깊은 대화 나누기", value: "I" as DimValue }, dim: "EI" as PersonalityDim },
      { id: "q6", text: "어떤 문장이 당신을 더 잘 설명하나요?", optionA: { text: "세부 사항과 실용적인 문제에 집중해요", value: "S" as DimValue }, optionB: { text: "큰 그림과 미래 가능성에 집중해요", value: "N" as DimValue }, dim: "SN" as PersonalityDim },
      { id: "q7", text: "갈등이 있을 때, 당신은 주로:", optionA: { text: "가장 공정하고 논리적인 해결책을 찾기", value: "T" as DimValue }, optionB: { text: "모든 사람의 감정을 고려하고 조화를 추구하기", value: "F" as DimValue }, dim: "TF" as PersonalityDim },
      { id: "q8", text: "당신은 어떤 것을 선호하나요?", optionA: { text: "일이 결정되고 정리되는 것", value: "J" as DimValue }, optionB: { text: "가능한 한 오래 선택의 여지를 열어두는 것", value: "P" as DimValue }, dim: "JP" as PersonalityDim },
    ] as Question[],
    results: {
      INTJ: { emoji: "🏛️", title: "INTJ — 전략가", desc: "독립적이고 결단력 있는 전략적 사상가입니다. 복잡한 시스템을 이해하고 장기 계획을 실행하는 데 탁월합니다." },
      INTP: { emoji: "🔬", title: "INTP — 논리술사", desc: "논리와 창의성을 결합하는 독창적인 사상가입니다. 아이디어와 이론을 탐구하는 것을 즐깁니다." },
      ENTJ: { emoji: "⚡", title: "ENTJ — 지휘관", desc: "자연스러운 리더로서 결단력 있고 전략적입니다. 목표를 설정하고 팀을 이끌어 달성하는 데 뛰어납니다." },
      ENTP: { emoji: "🎭", title: "ENTP — 발명가", desc: "창의적이고 도전적인 사상가입니다. 새로운 아이디어와 논쟁을 즐기며 혁신을 추구합니다." },
      INFJ: { emoji: "🌿", title: "INFJ — 옹호자", desc: "이상주의적이고 공감 능력이 강한 통찰력 있는 비전가입니다. 다른 사람을 돕고 세상을 더 나은 곳으로 만들고자 합니다." },
      INFP: { emoji: "🌸", title: "INFP — 중재자", desc: "이상주의적이고 공감 능력이 강한 자유로운 정신의 소유자입니다. 진정성과 의미를 추구합니다." },
      ENFJ: { emoji: "🌟", title: "ENFJ — 주인공", desc: "카리스마 있고 영감을 주는 리더입니다. 사람들을 동기 부여하고 단결시키는 데 탁월합니다." },
      ENFP: { emoji: "🎨", title: "ENFP — 활동가", desc: "열정적이고 창의적인 자유로운 정신의 소유자입니다. 새로운 가능성을 탐색하고 사람들을 연결하는 것을 즐깁니다." },
      ISTJ: { emoji: "🛡️", title: "ISTJ — 현실주의자", desc: "실용적이고 신뢰할 수 있는 사실에 기반한 사상가입니다. 책임감이 강하고 헌신적입니다." },
      ISTP: { emoji: "🔧", title: "ISTP — 장인", desc: "실용적이고 창의적인 문제 해결사입니다. 어떻게 작동하는지 이해하고 효율적인 해결책을 찾는 데 탁월합니다." },
      ESTJ: { emoji: "⚖️", title: "ESTJ — 경영자", desc: "체계적이고 실용적인 관리자입니다. 규칙과 전통을 소중히 여기며 질서를 유지하는 데 뛰어납니다." },
      ESTP: { emoji: "🚀", title: "ESTP — 기업가", desc: "에너지 넘치고 지각력 있는 행동가입니다. 현재 순간을 살고 즉각적인 결과를 추구합니다." },
      ISFJ: { emoji: "🏠", title: "ISFJ — 수호자", desc: "헌신적이고 따뜻한 수호자입니다. 다른 사람들을 보호하고 지원하는 것을 즐깁니다." },
      ISFP: { emoji: "🎵", title: "ISFP — 모험가", desc: "유연하고 매력적인 예술가입니다. 아름다움과 조화를 추구하며 현재 순간에 집중합니다." },
      ESFJ: { emoji: "💛", title: "ESFJ — 집정관", desc: "배려하고 사교적인 협력자입니다. 다른 사람들의 필요를 우선시하고 조화를 유지하는 데 탁월합니다." },
      ESFP: { emoji: "🎉", title: "ESFP — 연예인", desc: "즉흥적이고 에너지 넘치는 연예인입니다. 사람들과 함께하고 현재의 즐거움을 추구합니다." },
    } as Record<string, { emoji: string; title: string; desc: string }>,
    retake: "다시하기", resultLabel: "나의 성격 유형",
  },
  en: {
    title: "InsightQuest: What's Your Personality Type?",
    description: "Discover your MBTI-based personality type with 8 questions.",
    questions: [
      { id: "q1", text: "How do you typically recharge your energy?", optionA: { text: "Spending time with friends and socializing", value: "E" as DimValue }, optionB: { text: "Quiet time alone with your thoughts", value: "I" as DimValue }, dim: "EI" as PersonalityDim },
      { id: "q2", text: "When solving problems, which approach do you prefer?", optionA: { text: "Focus on concrete facts and proven methods", value: "S" as DimValue }, optionB: { text: "Explore new possibilities and theoretical concepts", value: "N" as DimValue }, dim: "SN" as PersonalityDim },
      { id: "q3", text: "When making decisions, you generally:", optionA: { text: "Analyze logically and consider all outcomes", value: "T" as DimValue }, optionB: { text: "Consider how it affects people and their feelings", value: "F" as DimValue }, dim: "TF" as PersonalityDim },
      { id: "q4", text: "How do you prefer to organize your life?", optionA: { text: "With structure, plans, and clear schedules", value: "J" as DimValue }, optionB: { text: "With flexibility, spontaneity, and adaptability", value: "P" as DimValue }, dim: "JP" as PersonalityDim },
      { id: "q5", text: "At a party, you more often:", optionA: { text: "Talk to many different people and make new connections", value: "E" as DimValue }, optionB: { text: "Have deeper conversations with a few people you know", value: "I" as DimValue }, dim: "EI" as PersonalityDim },
      { id: "q6", text: "Which sentence describes you better?", optionA: { text: "I focus on details and practical matters", value: "S" as DimValue }, optionB: { text: "I focus on the big picture and future possibilities", value: "N" as DimValue }, dim: "SN" as PersonalityDim },
      { id: "q7", text: "When there's a conflict, you mainly:", optionA: { text: "Find the most fair and logical solution", value: "T" as DimValue }, optionB: { text: "Consider everyone's feelings and seek harmony", value: "F" as DimValue }, dim: "TF" as PersonalityDim },
      { id: "q8", text: "What do you prefer?", optionA: { text: "Things to be decided and settled", value: "J" as DimValue }, optionB: { text: "Keeping options open as long as possible", value: "P" as DimValue }, dim: "JP" as PersonalityDim },
    ] as Question[],
    results: {
      INTJ: { emoji: "🏛️", title: "INTJ — Architect", desc: "An independent and decisive strategic thinker. You excel at understanding complex systems and executing long-term plans." },
      INTP: { emoji: "🔬", title: "INTP — Logician", desc: "An original thinker who combines logic and creativity. You enjoy exploring ideas and theories." },
      ENTJ: { emoji: "⚡", title: "ENTJ — Commander", desc: "A natural leader who is decisive and strategic. You excel at setting goals and leading teams to achieve them." },
      ENTP: { emoji: "🎭", title: "ENTP — Debater", desc: "A creative and challenging thinker. You enjoy new ideas and debates and pursue innovation." },
      INFJ: { emoji: "🌿", title: "INFJ — Advocate", desc: "An idealistic, insightful visionary with strong empathy. You want to help others and make the world a better place." },
      INFP: { emoji: "🌸", title: "INFP — Mediator", desc: "An idealistic free spirit with strong empathy. You seek authenticity and meaning." },
      ENFJ: { emoji: "🌟", title: "ENFJ — Protagonist", desc: "A charismatic and inspiring leader. You excel at motivating and uniting people." },
      ENFP: { emoji: "🎨", title: "ENFP — Campaigner", desc: "An enthusiastic and creative free spirit. You enjoy exploring new possibilities and connecting with people." },
      ISTJ: { emoji: "🛡️", title: "ISTJ — Logistician", desc: "A practical and reliable fact-based thinker. You have a strong sense of responsibility and dedication." },
      ISTP: { emoji: "🔧", title: "ISTP — Virtuoso", desc: "A practical and creative problem solver. You excel at understanding how things work and finding efficient solutions." },
      ESTJ: { emoji: "⚖️", title: "ESTJ — Executive", desc: "A systematic and practical administrator. You value rules and traditions and excel at maintaining order." },
      ESTP: { emoji: "🚀", title: "ESTP — Entrepreneur", desc: "An energetic and perceptive action-taker. You live in the present moment and pursue immediate results." },
      ISFJ: { emoji: "🏠", title: "ISFJ — Defender", desc: "A dedicated and warm protector. You enjoy protecting and supporting others." },
      ISFP: { emoji: "🎵", title: "ISFP — Adventurer", desc: "A flexible and charming artist. You seek beauty and harmony and focus on the present moment." },
      ESFJ: { emoji: "💛", title: "ESFJ — Consul", desc: "A caring and sociable collaborator. You prioritize others' needs and excel at maintaining harmony." },
      ESFP: { emoji: "🎉", title: "ESFP — Entertainer", desc: "A spontaneous and energetic entertainer. You love being with people and seeking present-moment joy." },
    } as Record<string, { emoji: string; title: string; desc: string }>,
    retake: "Retake", resultLabel: "Your Personality Type",
  },
};

export default function InsightQuestTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, DimValue>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const getPersonalityType = (): string => {
    const dims: Record<PersonalityDim, [DimValue, DimValue]> = {
      EI: ["E", "I"], SN: ["S", "N"], TF: ["T", "F"], JP: ["J", "P"],
    };
    return (["EI", "SN", "TF", "JP"] as PersonalityDim[]).map((dim) => {
      const dimQs = t.questions.filter((q) => q.dim === dim);
      const aCount = dimQs.filter((q) => answers[q.id] === dims[dim][0]).length;
      const bCount = dimQs.filter((q) => answers[q.id] === dims[dim][1]).length;
      return aCount >= bCount ? dims[dim][0] : dims[dim][1];
    }).join("");
  };

  const isComplete = Object.keys(answers).length === t.questions.length;
  const personalityType = isComplete ? getPersonalityType() : "";

  if (phase === "result" && isComplete) {
    const r = t.results[personalityType] ?? t.results["INFP"];
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
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
          <div className="h-2 bg-amber-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="space-y-8">
        {t.questions.map((q, i) => (
          <div key={q.id} className="space-y-3">
            <p className="font-semibold text-slate-800 leading-snug">{i + 1}. {q.text}</p>
            <div className="grid grid-cols-1 gap-2">
              {([q.optionA, q.optionB] as { text: string; value: DimValue }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                  className={`py-3 px-4 text-sm rounded-xl border transition-all text-left ${answers[q.id] === opt.value ? "bg-amber-500 border-amber-500 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-amber-500 text-white hover:bg-amber-600 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
