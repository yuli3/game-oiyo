'use client';

import { useState } from "react";

interface Props { locale?: string; }

type EnneaType = "perfectionist" | "helper" | "achiever" | "individualist" | "investigator" | "loyalist" | "enthusiast" | "challenger" | "peacemaker";

const data = {
  ko: {
    title: "소울 미러 테스트: 나는 어떤 에니어그램 유형인가?",
    description: "27개의 질문으로 나의 에니어그램 성격 유형을 발견하세요.",
    questions: [
      { id: "q1", text: "나는 완벽을 추구하며, 꼼꼼하고 체계적인 것을 좋아한다.", type: "perfectionist" as EnneaType },
      { id: "q2", text: "나는 다른 사람들을 돕는 데에서 큰 기쁨을 느끼고, 인정받는 것을 좋아한다.", type: "helper" as EnneaType },
      { id: "q3", text: "나는 목표를 달성하고 성공하는 것을 중요하게 생각하며, 효율적으로 일하는 것을 선호한다.", type: "achiever" as EnneaType },
      { id: "q4", text: "나는 독창적이고 개성적인 것을 추구하며, 감성적이고 예술적인 면모를 가지고 있다.", type: "individualist" as EnneaType },
      { id: "q5", text: "나는 지적 호기심이 많고, 새로운 것을 배우고 탐구하는 것을 즐긴다.", type: "investigator" as EnneaType },
      { id: "q6", text: "나는 안전과 안정을 중요하게 생각하며, 위험을 피하고 신중하게 행동하는 편이다.", type: "loyalist" as EnneaType },
      { id: "q7", text: "나는 낙천적이고 긍정적이며, 새로운 경험과 즐거움을 추구한다.", type: "enthusiast" as EnneaType },
      { id: "q8", text: "나는 독립적이고 주도적이며, 강인하고 단호한 면모를 가지고 있다.", type: "challenger" as EnneaType },
      { id: "q9", text: "나는 평화와 조화를 추구하며, 갈등을 피하고 편안한 분위기를 선호한다.", type: "peacemaker" as EnneaType },
      { id: "q10", text: "나는 비판적인 시각으로 세상을 바라보며, 개선할 부분을 찾으려고 한다.", type: "perfectionist" as EnneaType },
      { id: "q11", text: "나는 다른 사람의 필요를 잘 파악하고, 그들을 위해 헌신하는 것을 좋아한다.", type: "helper" as EnneaType },
      { id: "q12", text: "나는 인정받고 존경받는 사람이 되기 위해 노력하며, 경쟁적인 환경에서도 성과를 내려고 한다.", type: "achiever" as EnneaType },
      { id: "q13", text: "나는 평범함보다는 특별하고 독특한 존재가 되기를 원하며, 깊이 있는 감정을 중요하게 생각한다.", type: "individualist" as EnneaType },
      { id: "q14", text: "나는 혼자만의 시간을 통해 에너지를 얻고, 깊이 생각하고 분석하는 것을 즐긴다.", type: "investigator" as EnneaType },
      { id: "q15", text: "나는 불확실한 상황이나 변화를 불안하게 느끼며, 예측 가능하고 안정적인 환경을 선호한다.", type: "loyalist" as EnneaType },
      { id: "q16", text: "나는 틀에 얽매이는 것을 싫어하고 자유로운 분위기를 좋아하며, 즉흥적이고 재미있는 활동을 즐긴다.", type: "enthusiast" as EnneaType },
      { id: "q17", text: "나는 다른 사람에게 지배받거나 통제받는 것을 싫어하며, 스스로 결정하고 행동하는 것을 선호한다.", type: "challenger" as EnneaType },
      { id: "q18", text: "나는 타인과의 관계에서 갈등이 생기는 것을 불편하게 느끼며, 원만하게 해결하려고 노력한다.", type: "peacemaker" as EnneaType },
      { id: "q19", text: "나는 책임감이 강하고, 맡은 일은 완수하려고 노력하며, 약속을 중요하게 생각한다.", type: "perfectionist" as EnneaType },
      { id: "q20", text: "나는 칭찬과 격려에 민감하게 반응하며, 다른 사람들에게 좋은 평가를 받는 것을 중요하게 생각한다.", type: "helper" as EnneaType },
      { id: "q21", text: "나는 효율성을 중요하게 생각하고, 시간 낭비하는 것을 싫어하며, 빠른 속도로 일을 처리하는 것을 선호한다.", type: "achiever" as EnneaType },
      { id: "q22", text: "나는 감정 기복이 있는 편이며, 예술, 음악 등을 통해 감정을 해소한다.", type: "individualist" as EnneaType },
      { id: "q23", text: "나는 새로운 아이디어나 정보를 접했을 때 깊이 파고들어 분석하고 이해하려고 노력한다.", type: "investigator" as EnneaType },
      { id: "q24", text: "나는 최악의 상황에 대비하는 경향이 있으며, 미리 계획을 세우고 준비하는 것을 중요하게 생각한다.", type: "loyalist" as EnneaType },
      { id: "q25", text: "나는 다양한 관심사를 가지고 있으며, 여러 가지 일을 동시에 벌이는 것을 좋아한다.", type: "enthusiast" as EnneaType },
      { id: "q26", text: "나는 부당하다고 생각하는 일에 대해 강하게 반발하며, 정의를 위해 싸우는 것을 두려워하지 않는다.", type: "challenger" as EnneaType },
      { id: "q27", text: "나는 주변 사람들과의 관계를 중요하게 생각하며, 분위기를 부드럽게 만들고 갈등을 중재하려고 노력한다.", type: "peacemaker" as EnneaType },
    ],
    options: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    results: {
      perfectionist: { emoji: "✨", title: "완벽주의자 (Perfectionist)", desc: "원칙적이고 완벽주의적인 성향. 옳고 그름에 대한 기준이 높으며, 세상을 개선하고자 하는 이상주의자입니다. 책임감이 강하고 체계적으로 일을 처리합니다." },
      helper: { emoji: "❤️", title: "조력가 (Helper)", desc: "따뜻하고 인정이 많으며, 다른 사람을 돕는 것을 좋아합니다. 타인에게 필요한 존재가 되고 싶어하며, 공감 능력이 뛰어납니다." },
      achiever: { emoji: "🏆", title: "성취가 (Achiever)", desc: "성공 지향적이고, 효율적이며, 자기 관리에 능합니다. 목표 달성을 위해 노력하며, 적응력이 뛰어나고 자신감 있습니다." },
      individualist: { emoji: "🎭", title: "예술가 (Individualist)", desc: "개성적이고 감성적이며, 창의적인 면모를 지니고 있습니다. 특별하고 독특한 존재가 되기를 원하며, 깊이 있는 감정을 추구합니다." },
      investigator: { emoji: "🔍", title: "사색가 (Investigator)", desc: "지적이고 분석적이며, 독립적인 성향입니다. 지식을 탐구하고 이해하는 것을 즐기며, 혼자만의 시간을 통해 에너지를 얻습니다." },
      loyalist: { emoji: "🛡️", title: "충성가 (Loyalist)", desc: "성실하고 책임감이 강하며, 안전과 안정을 추구합니다. 위험을 회피하고 신중하게 행동하며, 믿을 수 있는 관계를 소중히 여깁니다." },
      enthusiast: { emoji: "🎉", title: "열정가 (Enthusiast)", desc: "낙천적이고 긍정적이며, 활발하고 재미를 추구합니다. 새로운 경험과 가능성을 탐색하며, 자유롭고 즐거운 삶을 지향합니다." },
      challenger: { emoji: "💪", title: "도전자 (Challenger)", desc: "강인하고 주도적이며, 독립적이고 결단력이 있습니다. 자신의 의지를 관철시키고, 세상을 변화시키고자 하는 욕구가 강합니다." },
      peacemaker: { emoji: "☮️", title: "평화주의자 (Peacemaker)", desc: "온화하고 수용적이며, 평화와 조화를 추구합니다. 갈등을 피하고 안정적인 관계를 유지하려고 하며, 다양한 관점을 이해합니다." },
    },
    retake: "다시하기", resultLabel: "나의 에니어그램 유형",
  },
  en: {
    title: "Soul Mirror Test: What's Your Enneagram Type?",
    description: "Discover your Enneagram personality type through 27 questions.",
    questions: [
      { id: "q1", text: "I strive for perfection and enjoy being meticulous and systematic.", type: "perfectionist" as EnneaType },
      { id: "q2", text: "I find great joy in helping others and like being appreciated for it.", type: "helper" as EnneaType },
      { id: "q3", text: "Achieving goals and succeeding is important to me; I prefer to work efficiently.", type: "achiever" as EnneaType },
      { id: "q4", text: "I pursue originality and individuality, and have an emotional, artistic side.", type: "individualist" as EnneaType },
      { id: "q5", text: "I'm intellectually curious and enjoy learning and exploring new things.", type: "investigator" as EnneaType },
      { id: "q6", text: "Safety and stability matter to me; I tend to avoid risks and act cautiously.", type: "loyalist" as EnneaType },
      { id: "q7", text: "I'm optimistic and positive, seeking new experiences and enjoyment.", type: "enthusiast" as EnneaType },
      { id: "q8", text: "I'm independent and proactive, with a strong and decisive nature.", type: "challenger" as EnneaType },
      { id: "q9", text: "I seek peace and harmony, avoiding conflict and preferring a comfortable atmosphere.", type: "peacemaker" as EnneaType },
      { id: "q10", text: "I view the world critically and always look for areas to improve.", type: "perfectionist" as EnneaType },
      { id: "q11", text: "I'm good at identifying others' needs and love dedicating myself to helping them.", type: "helper" as EnneaType },
      { id: "q12", text: "I strive to be recognized and respected, and push to achieve results even in competitive environments.", type: "achiever" as EnneaType },
      { id: "q13", text: "I want to be special and unique rather than ordinary, and value deep emotional experiences.", type: "individualist" as EnneaType },
      { id: "q14", text: "I gain energy from solitude and enjoy deep thinking and analysis.", type: "investigator" as EnneaType },
      { id: "q15", text: "Uncertain situations and change make me anxious; I prefer predictable, stable environments.", type: "loyalist" as EnneaType },
      { id: "q16", text: "I dislike being constrained and enjoy a free atmosphere, spontaneous and fun activities.", type: "enthusiast" as EnneaType },
      { id: "q17", text: "I dislike being dominated or controlled by others and prefer to make my own decisions.", type: "challenger" as EnneaType },
      { id: "q18", text: "Conflict in relationships makes me uncomfortable; I try to resolve things amicably.", type: "peacemaker" as EnneaType },
      { id: "q19", text: "I have a strong sense of responsibility, try to complete what I'm given, and value keeping promises.", type: "perfectionist" as EnneaType },
      { id: "q20", text: "I respond sensitively to praise and encouragement, and care about being well-regarded.", type: "helper" as EnneaType },
      { id: "q21", text: "I value efficiency, dislike wasting time, and prefer getting things done quickly.", type: "achiever" as EnneaType },
      { id: "q22", text: "I have emotional ups and downs and release my feelings through art, music, and similar outlets.", type: "individualist" as EnneaType },
      { id: "q23", text: "When I encounter new ideas or information, I try to dig deep and fully understand them.", type: "investigator" as EnneaType },
      { id: "q24", text: "I tend to prepare for worst-case scenarios and consider advance planning important.", type: "loyalist" as EnneaType },
      { id: "q25", text: "I have diverse interests and enjoy having several projects going at once.", type: "enthusiast" as EnneaType },
      { id: "q26", text: "I strongly push back on things I consider unjust and don't fear fighting for justice.", type: "challenger" as EnneaType },
      { id: "q27", text: "I value relationships with those around me and try to smooth the atmosphere and mediate conflicts.", type: "peacemaker" as EnneaType },
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      perfectionist: { emoji: "✨", title: "Perfectionist", desc: "Principled and perfectionistic with high standards for right and wrong. An idealist who wants to improve the world, with a strong sense of responsibility." },
      helper: { emoji: "❤️", title: "Helper", desc: "Warm and caring, you love helping others and want to be needed. Your empathy is exceptional and you thrive when making a difference in people's lives." },
      achiever: { emoji: "🏆", title: "Achiever", desc: "Success-oriented, efficient, and great at self-management. You work hard toward goals and are highly adaptable and confident." },
      individualist: { emoji: "🎭", title: "Individualist", desc: "Individualistic, emotional, and creative. You desire to be special and unique, and pursue deep emotional experiences and authentic expression." },
      investigator: { emoji: "🔍", title: "Investigator", desc: "Intellectual, analytical, and independent. You enjoy exploring knowledge and understanding, gaining energy through solitude and deep thought." },
      loyalist: { emoji: "🛡️", title: "Loyalist", desc: "Diligent and responsible, seeking safety and stability. You avoid risks and act cautiously, deeply valuing trustworthy relationships." },
      enthusiast: { emoji: "🎉", title: "Enthusiast", desc: "Optimistic, positive, energetic, and fun-seeking. You explore new experiences and possibilities, aiming for a free and enjoyable life." },
      challenger: { emoji: "💪", title: "Challenger", desc: "Strong, proactive, independent, and decisive. You have a powerful desire to assert your will and make an impact on the world." },
      peacemaker: { emoji: "☮️", title: "Peacemaker", desc: "Gentle and accepting, seeking peace and harmony. You avoid conflict, maintain stable relationships, and understand diverse perspectives." },
    },
    retake: "Retake", resultLabel: "Your Enneagram Type",
  },
};

export default function SoulMirrorTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const types: EnneaType[] = ["perfectionist", "helper", "achiever", "individualist", "investigator", "loyalist", "enthusiast", "challenger", "peacemaker"];
  const scores = Object.fromEntries(types.map((s) => [s, 0])) as Record<EnneaType, number>;
  t.questions.forEach((q) => { if (answers[q.id]) scores[q.type] += answers[q.id]; });
  const topType = (Object.entries(scores) as [EnneaType, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[topType];
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
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
          <div className="h-2 bg-slate-600 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
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
                  className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${answers[q.id] === v + 1 ? "bg-slate-700 border-slate-700 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-slate-700 text-white hover:bg-slate-800 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
