'use client';

import { useState } from "react";

interface Props { locale?: string; }

type ScoreLevel = "expert" | "proficient" | "developing" | "beginner";

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  explanation: string;
}

const data = {
  ko: {
    title: "비판적 사고력 테스트: 나의 논리 수준은?",
    description: "10개의 논리 문제로 비판적 사고 능력을 측정하세요.",
    questions: [
      { id: "q1", text: "전제 1: 모든 고양이는 포유류이다.\n전제 2: 모든 포유류는 척추동물이다.\n반드시 참인 결론은?", options: [
        { id: "a", text: "모든 척추동물은 고양이이다.", isCorrect: false },
        { id: "b", text: "모든 고양이는 척추동물이다.", isCorrect: true },
        { id: "c", text: "일부 척추동물은 고양이이다.", isCorrect: false },
        { id: "d", text: "일부 고양이는 척추동물이 아니다.", isCorrect: false },
      ], explanation: "삼단논법: 고양이 ⊂ 포유류 ⊂ 척추동물이므로, 모든 고양이는 척추동물입니다." },
      { id: "q2", text: "'우리 학교 학생들은 모두 스마트폰 중독이야. 왜냐하면 내가 아는 학생들 대부분이 쉬는 시간마다 스마트폰만 보고 있거든.' 이 주장의 논리적 오류는?", options: [
        { id: "a", text: "흑백논리의 오류", isCorrect: false },
        { id: "b", text: "인신공격의 오류", isCorrect: false },
        { id: "c", text: "성급한 일반화의 오류", isCorrect: true },
        { id: "d", text: "피장파장의 오류", isCorrect: false },
      ], explanation: "일부 학생들의 관찰로 전체를 단정 짓는 성급한 일반화의 오류입니다." },
      { id: "q3", text: "'최근 연구에 따르면 커피를 마시면 심장병 위험이 50% 감소한다.' 이 주장을 비판적으로 평가하기 위해 가장 중요한 질문은?", options: [
        { id: "a", text: "누가 이 연구에 자금을 지원했는가?", isCorrect: false },
        { id: "b", text: "연구에 몇 명이 참여했으며 그들은 누구였는가?", isCorrect: true },
        { id: "c", text: "이 연구는 동료 심사를 거친 학술지에 게재되었는가?", isCorrect: false },
        { id: "d", text: "연구자들은 스스로 커피를 마시는가?", isCorrect: false },
      ], explanation: "표본 크기와 대표성이 '50% 감소'라는 주장의 신뢰성을 평가하는 데 핵심입니다." },
      { id: "q4", text: "새 빨간 차를 구입한 후, 갑자기 도로에 빨간 차가 많다는 것을 알아차립니다. 이는 어떤 인지 편향의 예입니까?", options: [
        { id: "a", text: "확증 편향", isCorrect: false },
        { id: "b", text: "빈도 착각(바더-마인호프 현상)", isCorrect: true },
        { id: "c", text: "정박 효과", isCorrect: false },
        { id: "d", text: "사후 확신 편향", isCorrect: false },
      ], explanation: "방금 알아차린 것이 갑자기 어디에나 나타나는 것처럼 느껴지는 빈도 착각입니다." },
      { id: "q5", text: "'지난 겨울에 기록적인 추위가 있었는데 지구 온난화가 어떻게 사실일 수 있지?' 이 진술에 포함된 오류는?", options: [
        { id: "a", text: "권위에 호소하는 오류", isCorrect: false },
        { id: "b", text: "허수아비 논증", isCorrect: false },
        { id: "c", text: "일화적 증거의 오류", isCorrect: true },
        { id: "d", text: "감정에 호소하는 오류", isCorrect: false },
      ], explanation: "단일 날씨 사건으로 장기적 기후 추세를 반박하는 일화적 증거의 오류입니다." },
      { id: "q6", text: "모든 A는 B이고, 일부 B는 C라면, 다음 중 반드시 참인 것은?", options: [
        { id: "a", text: "모든 A는 C이다", isCorrect: false },
        { id: "b", text: "일부 A는 C이다", isCorrect: false },
        { id: "c", text: "A는 C가 아니다", isCorrect: false },
        { id: "d", text: "위의 어떤 것도 확실하게 결정할 수 없다", isCorrect: true },
      ], explanation: "A와 C의 관계는 추가 정보 없이는 확정할 수 없습니다." },
      { id: "q7", text: "다이어트 약이 '상당한 체중 감량'으로 이어진다고 주장합니다. 이 주장을 평가하는 데 가장 중요한 정보는?", options: [
        { id: "a", text: "얼마나 많은 유명인이 제품을 홍보하는지", isCorrect: false },
        { id: "b", text: "구체적인 체중 감량 양과 위약 그룹과 비교한 결과", isCorrect: true },
        { id: "c", text: "회사가 사업을 운영한 기간", isCorrect: false },
        { id: "d", text: "경쟁사와 비교한 가격", isCorrect: false },
      ], explanation: "대조군과의 비교만이 효과가 실제인지 확인할 수 있습니다." },
      { id: "q8", text: "투자한 주식이 하락했지만 '이미 많이 투자했으니 포기할 수 없어'라며 보유합니다. 이는 어떤 인지 편향입니까?", options: [
        { id: "a", text: "매몰 비용 오류", isCorrect: true },
        { id: "b", text: "도박사의 오류", isCorrect: false },
        { id: "c", text: "낙관주의 편향", isCorrect: false },
        { id: "d", text: "더닝-크루거 효과", isCorrect: false },
      ], explanation: "회수 불가능한 과거 투자에 근거해 비합리적 결정을 내리는 매몰 비용 오류입니다." },
      { id: "q9", text: "'내 상대는 대중교통 지원을 늘리고 싶어합니다. 히틀러도 나치 독일에서 고속도로를 건설했습니다. 그런 위험한 생각을 지지하겠습니까?' 이것은 어떤 오류입니까?", options: [
        { id: "a", text: "인신공격의 오류", isCorrect: false },
        { id: "b", text: "거짓 등가", isCorrect: false },
        { id: "c", text: "연좌제의 오류", isCorrect: true },
        { id: "d", text: "미끄러운 경사길의 오류", isCorrect: false },
      ], explanation: "아이디어 자체의 장점이 아닌 부정적 인물과의 연관으로 신뢰성을 떨어뜨리는 연좌제의 오류입니다." },
      { id: "q10", text: "'내가 그렇게 말했으니까 너는 대학에서 의학을 공부해야 해.' 이 진술은 어떤 오류를 보여줍니까?", options: [
        { id: "a", text: "권위에 호소하는 오류", isCorrect: true },
        { id: "b", text: "순환 논법", isCorrect: false },
        { id: "c", text: "거짓 이분법", isCorrect: false },
        { id: "d", text: "논점 일탈의 오류", isCorrect: false },
      ], explanation: "실질적 이유 없이 권위만을 근거로 주장하는 권위에 호소하는 오류입니다." },
    ] as Question[],
    results: {
      expert: { emoji: "🧠", title: "비판적 사고 전문가", desc: "뛰어난 논리적 추론 능력을 갖추고 있습니다. 복잡한 논증을 쉽게 분석하고 인지 편향을 명확히 식별합니다. 이 능력을 주변 사람들과 나눠보세요." },
      proficient: { emoji: "🔍", title: "능숙한 분석가", desc: "탄탄한 비판적 사고 능력을 가지고 있습니다. 대부분의 논리적 오류를 인식하지만 가끔 놓치는 부분이 있습니다. 지속적인 연습으로 더욱 발전할 수 있습니다." },
      developing: { emoji: "📚", title: "성장 중인 사상가", desc: "기본적인 논리 개념은 이해하고 있지만 더 깊은 훈련이 필요합니다. 논리학과 인지 편향에 관한 책을 읽으며 사고력을 키워보세요." },
      beginner: { emoji: "🌱", title: "비판적 사고 초보자", desc: "비판적 사고의 여정을 막 시작했습니다. 논리적 오류와 인지 편향에 대해 배우면 일상의 판단력이 크게 향상됩니다. 꾸준한 학습을 권장합니다." },
    },
    retake: "다시하기", resultLabel: "나의 비판적 사고력 수준",
    correct: "정답!", wrong: "오답",
  },
  en: {
    title: "Critical Thinking: What's Your Critical Thinking Level?",
    description: "Measure your critical thinking ability with 10 logic questions.",
    questions: [
      { id: "q1", text: "Premise 1: All cats are mammals.\nPremise 2: All mammals are vertebrates.\nWhich conclusion must be true?", options: [
        { id: "a", text: "All vertebrates are cats.", isCorrect: false },
        { id: "b", text: "All cats are vertebrates.", isCorrect: true },
        { id: "c", text: "Some vertebrates are cats.", isCorrect: false },
        { id: "d", text: "Some cats are not vertebrates.", isCorrect: false },
      ], explanation: "Syllogism: cats ⊂ mammals ⊂ vertebrates, therefore all cats must be vertebrates." },
      { id: "q2", text: "'All students at our school are addicted to smartphones because most of the students I know are always on their phones during breaks.' What logical fallacy is this?", options: [
        { id: "a", text: "Black and white fallacy", isCorrect: false },
        { id: "b", text: "Ad hominem fallacy", isCorrect: false },
        { id: "c", text: "Hasty generalization fallacy", isCorrect: true },
        { id: "d", text: "Tu quoque fallacy", isCorrect: false },
      ], explanation: "Drawing a conclusion about all students based on limited observation is a hasty generalization." },
      { id: "q3", text: "'A recent study shows drinking coffee reduces heart disease risk by 50%.' What's the most important question to critically evaluate this claim?", options: [
        { id: "a", text: "Who funded the study?", isCorrect: false },
        { id: "b", text: "How many people participated and who were they?", isCorrect: true },
        { id: "c", text: "Was it published in a peer-reviewed journal?", isCorrect: false },
        { id: "d", text: "Do the researchers drink coffee themselves?", isCorrect: false },
      ], explanation: "Sample size and representativeness are key to evaluating the '50% reduction' claim." },
      { id: "q4", text: "After buying a new red car, you suddenly notice many red cars on the road. This is an example of which cognitive bias?", options: [
        { id: "a", text: "Confirmation bias", isCorrect: false },
        { id: "b", text: "Frequency illusion (Baader-Meinhof phenomenon)", isCorrect: true },
        { id: "c", text: "Anchoring bias", isCorrect: false },
        { id: "d", text: "Hindsight bias", isCorrect: false },
      ], explanation: "Something you just noticed suddenly seems to appear everywhere — the frequency illusion." },
      { id: "q5", text: "'How can global warming be real if we had record cold temperatures last winter?' What fallacy does this contain?", options: [
        { id: "a", text: "Appeal to authority", isCorrect: false },
        { id: "b", text: "Straw man argument", isCorrect: false },
        { id: "c", text: "Anecdotal evidence fallacy", isCorrect: true },
        { id: "d", text: "Appeal to emotion", isCorrect: false },
      ], explanation: "Using a single local weather event to challenge a global long-term climate trend is anecdotal evidence." },
      { id: "q6", text: "If all A are B, and some B are C, which of the following must be true?", options: [
        { id: "a", text: "All A are C", isCorrect: false },
        { id: "b", text: "Some A are C", isCorrect: false },
        { id: "c", text: "No A are C", isCorrect: false },
        { id: "d", text: "None of the above can be determined with certainty", isCorrect: true },
      ], explanation: "Without additional information, the relationship between A and C cannot be definitively determined." },
      { id: "q7", text: "A company claims its diet pill leads to 'significant weight loss.' What information is most important to evaluate this?", options: [
        { id: "a", text: "How many celebrities endorse the product", isCorrect: false },
        { id: "b", text: "The specific amount of weight loss compared to a placebo group", isCorrect: true },
        { id: "c", text: "How long the company has been in business", isCorrect: false },
        { id: "d", text: "The price compared to competitors", isCorrect: false },
      ], explanation: "Only comparison with a control group can determine if the weight loss is real or due to other factors." },
      { id: "q8", text: "You hold a losing stock because 'I've already invested so much, I can't give up now.' Which cognitive bias is this?", options: [
        { id: "a", text: "Sunk cost fallacy", isCorrect: true },
        { id: "b", text: "Gambler's fallacy", isCorrect: false },
        { id: "c", text: "Optimism bias", isCorrect: false },
        { id: "d", text: "Dunning-Kruger effect", isCorrect: false },
      ], explanation: "Making decisions based on irrecoverable past investments rather than rational future evaluation is the sunk cost fallacy." },
      { id: "q9", text: "'My opponent wants more public transportation funding. Hitler built highways in Nazi Germany. Do you really want to support such dangerous ideas?' What fallacy is this?", options: [
        { id: "a", text: "Ad hominem fallacy", isCorrect: false },
        { id: "b", text: "False equivalence", isCorrect: false },
        { id: "c", text: "Guilt by association fallacy", isCorrect: true },
        { id: "d", text: "Slippery slope fallacy", isCorrect: false },
      ], explanation: "Rejecting an idea by associating it with a negative figure without addressing its merits is guilt by association." },
      { id: "q10", text: "A parent tells their child: 'You need to study medicine in college because I said so.' What fallacy does this demonstrate?", options: [
        { id: "a", text: "Appeal to authority", isCorrect: true },
        { id: "b", text: "Circular reasoning", isCorrect: false },
        { id: "c", text: "False dilemma", isCorrect: false },
        { id: "d", text: "Red herring fallacy", isCorrect: false },
      ], explanation: "Using authority position as the sole justification without providing substantive reasons is an appeal to authority." },
    ] as Question[],
    results: {
      expert: { emoji: "🧠", title: "Critical Thinking Expert", desc: "You have outstanding logical reasoning abilities. You easily analyze complex arguments and clearly identify cognitive biases. Share this skill with those around you." },
      proficient: { emoji: "🔍", title: "Proficient Analyst", desc: "You have solid critical thinking skills. You recognize most logical fallacies but occasionally miss some. Continued practice will take you even further." },
      developing: { emoji: "📚", title: "Developing Thinker", desc: "You understand basic logic concepts but need deeper training. Reading about logical fallacies and cognitive biases will significantly sharpen your thinking." },
      beginner: { emoji: "🌱", title: "Critical Thinking Beginner", desc: "You've just started your critical thinking journey. Learning about logical fallacies and cognitive biases will greatly improve your everyday judgment. Keep learning!" },
    },
    retake: "Retake", resultLabel: "Your Critical Thinking Level",
    correct: "Correct!", wrong: "Wrong",
  },
};

export default function CritiQuestTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const correctCount = t.questions.filter((q) => {
    const correct = q.options.find((o) => o.isCorrect);
    return correct && answers[q.id] === correct.id;
  }).length;

  const isComplete = Object.keys(answers).length === t.questions.length;
  const pct = isComplete ? correctCount / t.questions.length : 0;

  const level: ScoreLevel =
    pct >= 0.9 ? "expert" :
    pct >= 0.7 ? "proficient" :
    pct >= 0.5 ? "developing" :
    "beginner";

  if (phase === "result") {
    const r = t.results[level];
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{lang === "ko" ? "정답률" : "Score"}</span>
            <span className="font-bold text-rose-600">{correctCount} / {t.questions.length}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full">
            <div className="h-3 bg-rose-500 rounded-full transition-all" style={{ width: `${Math.round(pct * 100)}%` }} />
          </div>
        </div>
        <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100">
          <p className="text-slate-700 text-base leading-relaxed">{r.desc}</p>
        </div>
        <button onClick={() => { setAnswers({}); setRevealed({}); setPhase("quiz"); }} className="text-slate-400 text-sm hover:underline">{t.retake}</button>
      </div>
    );
  }

  return (
    <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-black text-slate-900">{t.title}</h3>
        <p className="text-sm text-slate-500 mt-2">{t.description}</p>
        <div className="mt-3 h-2 bg-slate-100 rounded-full">
          <div className="h-2 bg-rose-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="space-y-8">
        {t.questions.map((q, i) => {
          const selected = answers[q.id];
          const isRevealed = revealed[q.id];
          return (
            <div key={q.id} className="space-y-3">
              <p className="font-semibold text-slate-800 leading-snug whitespace-pre-line">{i + 1}. {q.text}</p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt) => {
                  let cls = "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100";
                  if (selected === opt.id) {
                    cls = isRevealed
                      ? opt.isCorrect
                        ? "bg-green-500 border-green-500 text-white font-bold"
                        : "bg-red-500 border-red-500 text-white font-bold"
                      : "bg-rose-500 border-rose-500 text-white font-bold shadow-md";
                  } else if (isRevealed && opt.isCorrect) {
                    cls = "bg-green-100 border-green-400 text-green-800";
                  }
                  return (
                    <button
                      key={opt.id}
                      disabled={isRevealed}
                      onClick={() => {
                        setAnswers((prev) => ({ ...prev, [q.id]: opt.id }));
                        setRevealed((prev) => ({ ...prev, [q.id]: true }));
                      }}
                      className={`py-3 px-4 text-sm rounded-xl border transition-all text-left ${cls}`}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>
              {isRevealed && (
                <div className="text-xs p-3 bg-slate-100 rounded-lg text-slate-600">
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-center pt-4">
        <button
          disabled={!isComplete}
          onClick={() => setPhase("result")}
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-rose-500 text-white hover:bg-rose-600 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
