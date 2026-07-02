'use client';

import { useState } from "react";

interface Props { locale?: string; }

type MeetingStyleType = "rapid-fire" | "strategic" | "facilitator" | "listener" | "minimalist" | "diplomat";

interface Scores { ideaSpeed: number; timing: number; feedbackStyle: number; }

const data = {
  ko: {
    title: "회의 생존 스타일 테스트: 나는 어떤 유형?",
    description: "10개의 질문으로 나의 회의 참여 스타일을 알아보세요.",
    questions: [
      {
        id: "q1", text: "회의가 시작되고 안건이 나왔을 때 나는?",
        options: [
          { text: "바로 떠오르는 아이디어를 말한다", scores: { ideaSpeed: 5, timing: -2, feedbackStyle: 0 } },
          { text: "다른 사람들 의견을 듣고 나서 발언한다", scores: { ideaSpeed: -3, timing: 4, feedbackStyle: 2 } },
          { text: "분위기를 파악한 후 적절한 타이밍에 말한다", scores: { ideaSpeed: 0, timing: 5, feedbackStyle: 3 } },
          { text: "꼭 필요한 경우에만 핵심만 짧게 말한다", scores: { ideaSpeed: -4, timing: 3, feedbackStyle: 1 } },
        ],
      },
      {
        id: "q2", text: "동료가 제안한 아이디어에 문제가 보일 때 나는?",
        options: [
          { text: "바로 문제점을 지적하고 대안을 제시한다", scores: { ideaSpeed: 4, timing: -3, feedbackStyle: -4 } },
          { text: "\"좋은데 이 부분은 어떨까?\"라며 부드럽게 제안한다", scores: { ideaSpeed: 1, timing: 2, feedbackStyle: 5 } },
          { text: "일단 듣고, 나중에 1:1로 따로 얘기한다", scores: { ideaSpeed: -2, timing: 5, feedbackStyle: 4 } },
          { text: "다른 사람이 지적하기를 기다린다", scores: { ideaSpeed: -5, timing: -2, feedbackStyle: 0 } },
        ],
      },
      {
        id: "q3", text: "회의 중 침묵이 길어질 때 나는?",
        options: [
          { text: "답답해서 내가 먼저 말을 꺼낸다", scores: { ideaSpeed: 5, timing: -4, feedbackStyle: 0 } },
          { text: "\"다들 어떻게 생각하세요?\"라며 질문을 던진다", scores: { ideaSpeed: 2, timing: 3, feedbackStyle: 4 } },
          { text: "침묵도 필요하다고 생각하며 기다린다", scores: { ideaSpeed: -3, timing: 5, feedbackStyle: 2 } },
          { text: "누군가 말하기를 기다리며 생각을 정리한다", scores: { ideaSpeed: -2, timing: 1, feedbackStyle: 1 } },
        ],
      },
      {
        id: "q4", text: "브레인스토밍 회의에서 나는?",
        options: [
          { text: "떠오르는 대로 계속 아이디어를 쏟아낸다", scores: { ideaSpeed: 5, timing: -1, feedbackStyle: -2 } },
          { text: "다른 사람 아이디어를 발전시켜 제안한다", scores: { ideaSpeed: 3, timing: 3, feedbackStyle: 4 } },
          { text: "듣기만 하다가 가끔 핵심 질문을 던진다", scores: { ideaSpeed: -4, timing: 4, feedbackStyle: 2 } },
          { text: "정리가 필요할 때 요약해서 말한다", scores: { ideaSpeed: -1, timing: 5, feedbackStyle: 3 } },
        ],
      },
      {
        id: "q5", text: "상사가 내 의견과 다른 결정을 내릴 때 나는?",
        options: [
          { text: "바로 \"그런데 이건 어떨까요?\"라며 재반박한다", scores: { ideaSpeed: 4, timing: -5, feedbackStyle: -3 } },
          { text: "\"그 방향도 좋지만 이것도 고려해보면...\"이라고 말한다", scores: { ideaSpeed: 2, timing: 2, feedbackStyle: 4 } },
          { text: "회의 후 따로 시간을 내서 의견을 전달한다", scores: { ideaSpeed: -2, timing: 5, feedbackStyle: 5 } },
          { text: "일단 따르고, 결과를 보며 다음에 제안한다", scores: { ideaSpeed: -4, timing: 3, feedbackStyle: 2 } },
        ],
      },
      {
        id: "q6", text: "회의 중 갑자기 내 의견을 물어볼 때 나는?",
        options: [
          { text: "준비 안 했어도 일단 말을 시작한다", scores: { ideaSpeed: 5, timing: -3, feedbackStyle: -1 } },
          { text: "\"잠깐만요\" 하고 생각을 정리한 뒤 답한다", scores: { ideaSpeed: -1, timing: 4, feedbackStyle: 2 } },
          { text: "다른 사람 의견에 동의하며 보충 설명한다", scores: { ideaSpeed: 1, timing: 2, feedbackStyle: 4 } },
          { text: "\"아직 정리가 안 됐는데 나중에 말씀드려도 될까요?\"", scores: { ideaSpeed: -5, timing: 5, feedbackStyle: 3 } },
        ],
      },
      {
        id: "q7", text: "두 동료가 회의에서 의견 충돌할 때 나는?",
        options: [
          { text: "내 생각을 말하며 한쪽 편을 든다", scores: { ideaSpeed: 3, timing: -2, feedbackStyle: -3 } },
          { text: "\"둘 다 맞는 말 같은데 이렇게 합치면 어떨까?\"", scores: { ideaSpeed: 2, timing: 4, feedbackStyle: 5 } },
          { text: "지켜보다가 정리가 필요할 때 개입한다", scores: { ideaSpeed: -2, timing: 5, feedbackStyle: 3 } },
          { text: "조용히 듣고만 있는다", scores: { ideaSpeed: -5, timing: -3, feedbackStyle: 0 } },
        ],
      },
      {
        id: "q8", text: "온라인 회의에서 나는?",
        options: [
          { text: "마이크 켜고 활발하게 참여한다", scores: { ideaSpeed: 4, timing: -1, feedbackStyle: 1 } },
          { text: "채팅으로 의견을 전달하는 게 편하다", scores: { ideaSpeed: -2, timing: 3, feedbackStyle: 2 } },
          { text: "듣다가 질문 있으면 손들기 버튼 누른다", scores: { ideaSpeed: -3, timing: 4, feedbackStyle: 3 } },
          { text: "카메라 끄고 듣기만 한다", scores: { ideaSpeed: -5, timing: -4, feedbackStyle: -1 } },
        ],
      },
      {
        id: "q9", text: "회의 결론이 애매하게 끝날 것 같을 때 나는?",
        options: [
          { text: "\"그래서 결론이 뭐죠?\"라고 바로 묻는다", scores: { ideaSpeed: 4, timing: -2, feedbackStyle: -2 } },
          { text: "\"그럼 이렇게 정리하면 될까요?\"라며 요약한다", scores: { ideaSpeed: 2, timing: 4, feedbackStyle: 4 } },
          { text: "회의록 작성자에게 정리를 맡긴다", scores: { ideaSpeed: -2, timing: 2, feedbackStyle: 1 } },
          { text: "끝나고 팀장에게 따로 물어본다", scores: { ideaSpeed: -3, timing: 3, feedbackStyle: 3 } },
        ],
      },
      {
        id: "q10", text: "회의가 주제에서 벗어나고 있을 때 나는?",
        options: [
          { text: "\"잠깐, 원래 주제로 돌아가죠\"라고 말한다", scores: { ideaSpeed: 3, timing: -1, feedbackStyle: -2 } },
          { text: "\"이 얘기도 중요한데, 원래 주제는...\"이라고 유도한다", scores: { ideaSpeed: 1, timing: 4, feedbackStyle: 5 } },
          { text: "진행자가 알아서 하겠지 하고 기다린다", scores: { ideaSpeed: -3, timing: 2, feedbackStyle: 1 } },
          { text: "딴 생각하다가 본론으로 돌아오면 집중한다", scores: { ideaSpeed: -4, timing: -2, feedbackStyle: 0 } },
        ],
      },
    ],
    results: {
      "rapid-fire": { emoji: "🔥", title: "기관총형", desc: "떠오르는 즉시 쏟아내는 아이디어 제조기입니다. 브레인스토밍의 엔진 역할을 하며 회의 분위기를 활성화합니다. 3초 룰을 실천하고 다른 사람 의견도 경청하면 더욱 빛날 수 있어요." },
      strategic: { emoji: "🎯", title: "전략가형", desc: "타이밍을 읽고 효과적으로 발언하는 전술가입니다. 회의 효율성을 극대화하며 설득력 있는 의견을 제시합니다. 완벽한 타이밍만 기다리지 말고 80%에서 발언해보세요." },
      facilitator: { emoji: "🤝", title: "조율자형", desc: "분위기를 읽고 팀을 하나로 묶는 중재자입니다. 다양한 의견을 통합하고 갈등을 해소하는 능력이 뛰어납니다. 중재하면서도 나의 의견을 명확히 표현하는 연습을 해보세요." },
      listener: { emoji: "👂", title: "경청자형", desc: "듣고, 정리하고, 핵심을 짚는 분석가입니다. 깊이 있는 통찰력으로 회의 내용을 정확히 이해합니다. 완벽히 정리되지 않더라도 중간에 의견을 공유하는 연습을 해보세요." },
      minimalist: { emoji: "💎", title: "미니멀형", desc: "필요할 때만 핵심을 찌르는 저격수입니다. 간결하고 명료한 커뮤니케이션으로 발언의 무게감을 만듭니다. 브레인스토밍에서는 가벼운 참여도 중요하다는 것을 기억하세요." },
      diplomat: { emoji: "🕊️", title: "외교관형", desc: "부드럽고 신중한 피드백의 달인입니다. 팀 내 갈등을 최소화하고 협업 분위기를 조성합니다. 때로는 부드러움보다 명확함이 더 도움이 될 수 있습니다." },
    },
    retake: "다시하기", resultLabel: "나의 회의 스타일",
  },
  en: {
    title: "Meeting Style Test: What's Your Meeting Personality?",
    description: "Discover your meeting participation style with 10 questions.",
    questions: [
      {
        id: "q1", text: "When the meeting starts and an agenda item comes up, you:",
        options: [
          { text: "Immediately share whatever idea comes to mind", scores: { ideaSpeed: 5, timing: -2, feedbackStyle: 0 } },
          { text: "Listen to others first, then speak up", scores: { ideaSpeed: -3, timing: 4, feedbackStyle: 2 } },
          { text: "Read the room and speak at the right moment", scores: { ideaSpeed: 0, timing: 5, feedbackStyle: 3 } },
          { text: "Only speak when absolutely necessary, and briefly", scores: { ideaSpeed: -4, timing: 3, feedbackStyle: 1 } },
        ],
      },
      {
        id: "q2", text: "When you spot a problem with a colleague's idea, you:",
        options: [
          { text: "Point out the issue immediately and offer an alternative", scores: { ideaSpeed: 4, timing: -3, feedbackStyle: -4 } },
          { text: "Gently suggest \"That's great, but what about this part?\"", scores: { ideaSpeed: 1, timing: 2, feedbackStyle: 5 } },
          { text: "Listen for now, then bring it up in a 1-on-1 later", scores: { ideaSpeed: -2, timing: 5, feedbackStyle: 4 } },
          { text: "Wait for someone else to point it out", scores: { ideaSpeed: -5, timing: -2, feedbackStyle: 0 } },
        ],
      },
      {
        id: "q3", text: "When there's a long silence in the meeting, you:",
        options: [
          { text: "Feel antsy and break the silence yourself", scores: { ideaSpeed: 5, timing: -4, feedbackStyle: 0 } },
          { text: "Ask \"What does everyone think?\"", scores: { ideaSpeed: 2, timing: 3, feedbackStyle: 4 } },
          { text: "Think silence is fine and wait it out", scores: { ideaSpeed: -3, timing: 5, feedbackStyle: 2 } },
          { text: "Wait for someone else while gathering your thoughts", scores: { ideaSpeed: -2, timing: 1, feedbackStyle: 1 } },
        ],
      },
      {
        id: "q4", text: "During a brainstorming session, you:",
        options: [
          { text: "Keep throwing out ideas as fast as they come", scores: { ideaSpeed: 5, timing: -1, feedbackStyle: -2 } },
          { text: "Build on others' ideas and propose improvements", scores: { ideaSpeed: 3, timing: 3, feedbackStyle: 4 } },
          { text: "Mostly listen and occasionally ask key questions", scores: { ideaSpeed: -4, timing: 4, feedbackStyle: 2 } },
          { text: "Speak up when the discussion needs organizing", scores: { ideaSpeed: -1, timing: 5, feedbackStyle: 3 } },
        ],
      },
      {
        id: "q5", text: "When your manager makes a decision you disagree with, you:",
        options: [
          { text: "Immediately push back with \"But what about this?\"", scores: { ideaSpeed: 4, timing: -5, feedbackStyle: -3 } },
          { text: "Say \"That direction works too, but have you considered...\"", scores: { ideaSpeed: 2, timing: 2, feedbackStyle: 4 } },
          { text: "Schedule a separate time after the meeting to share your view", scores: { ideaSpeed: -2, timing: 5, feedbackStyle: 5 } },
          { text: "Go along for now and raise it next time if results are bad", scores: { ideaSpeed: -4, timing: 3, feedbackStyle: 2 } },
        ],
      },
      {
        id: "q6", text: "When you're suddenly asked for your opinion mid-meeting, you:",
        options: [
          { text: "Start talking even if unprepared", scores: { ideaSpeed: 5, timing: -3, feedbackStyle: -1 } },
          { text: "Ask for a moment, collect your thoughts, then respond", scores: { ideaSpeed: -1, timing: 4, feedbackStyle: 2 } },
          { text: "Agree with someone and add supplemental thoughts", scores: { ideaSpeed: 1, timing: 2, feedbackStyle: 4 } },
          { text: "Ask if you can share later when you've had time to think", scores: { ideaSpeed: -5, timing: 5, feedbackStyle: 3 } },
        ],
      },
      {
        id: "q7", text: "When two colleagues clash in a meeting, you:",
        options: [
          { text: "Share your opinion and take a side", scores: { ideaSpeed: 3, timing: -2, feedbackStyle: -3 } },
          { text: "\"Both points are valid — what if we combined them?\"", scores: { ideaSpeed: 2, timing: 4, feedbackStyle: 5 } },
          { text: "Watch and step in only when synthesis is needed", scores: { ideaSpeed: -2, timing: 5, feedbackStyle: 3 } },
          { text: "Stay quiet and just listen", scores: { ideaSpeed: -5, timing: -3, feedbackStyle: 0 } },
        ],
      },
      {
        id: "q8", text: "During an online meeting, you:",
        options: [
          { text: "Keep the mic on and participate actively", scores: { ideaSpeed: 4, timing: -1, feedbackStyle: 1 } },
          { text: "Prefer typing your thoughts in the chat", scores: { ideaSpeed: -2, timing: 3, feedbackStyle: 2 } },
          { text: "Listen and use the raise-hand feature when you have a question", scores: { ideaSpeed: -3, timing: 4, feedbackStyle: 3 } },
          { text: "Turn off camera and just listen", scores: { ideaSpeed: -5, timing: -4, feedbackStyle: -1 } },
        ],
      },
      {
        id: "q9", text: "When a meeting looks like it's ending without a clear conclusion, you:",
        options: [
          { text: "Directly ask \"So what's the conclusion?\"", scores: { ideaSpeed: 4, timing: -2, feedbackStyle: -2 } },
          { text: "Offer to summarize: \"Shall we wrap up like this?\"", scores: { ideaSpeed: 2, timing: 4, feedbackStyle: 4 } },
          { text: "Leave the summary to whoever takes meeting notes", scores: { ideaSpeed: -2, timing: 2, feedbackStyle: 1 } },
          { text: "Follow up with the manager separately after the meeting", scores: { ideaSpeed: -3, timing: 3, feedbackStyle: 3 } },
        ],
      },
      {
        id: "q10", text: "When the meeting drifts off-topic, you:",
        options: [
          { text: "Say \"Let's get back to the original topic\"", scores: { ideaSpeed: 3, timing: -1, feedbackStyle: -2 } },
          { text: "Steer it back: \"This is important too, but the main topic was...\"", scores: { ideaSpeed: 1, timing: 4, feedbackStyle: 5 } },
          { text: "Trust the facilitator to handle it and wait", scores: { ideaSpeed: -3, timing: 2, feedbackStyle: 1 } },
          { text: "Zone out and refocus when they get back on track", scores: { ideaSpeed: -4, timing: -2, feedbackStyle: 0 } },
        ],
      },
    ],
    results: {
      "rapid-fire": { emoji: "🔥", title: "Rapid-Fire", desc: "You're an idea machine who speaks as fast as thoughts come. You energize brainstorming sessions and keep meetings moving. Practice the 3-second rule and give others room to contribute." },
      strategic: { emoji: "🎯", title: "Strategic", desc: "You read the room and speak at exactly the right moment. You maximize meeting efficiency and deliver persuasive points. Try not to wait for the perfect moment — 80% timing is good enough." },
      facilitator: { emoji: "🤝", title: "Facilitator", desc: "You read the mood and bring the team together. You excel at synthesizing ideas and resolving conflict. While facilitating, remember to voice your own opinions clearly too." },
      listener: { emoji: "👂", title: "Listener", desc: "You listen, organize, and cut to the core. Your deep analytical insight ensures accurate understanding of discussions. Practice sharing half-formed thoughts — you don't need to be fully ready." },
      minimalist: { emoji: "💎", title: "Minimalist", desc: "You speak rarely but with precision and weight. Your concise communication maximizes efficiency. Remember that in brainstorming, light participation still counts — not every comment needs to be perfect." },
      diplomat: { emoji: "🕊️", title: "Diplomat", desc: "You're a master of thoughtful, considerate feedback. You minimize conflict and foster collaborative energy. Sometimes clarity is more helpful than softness — practice direct statements too." },
    },
    retake: "Retake", resultLabel: "Your Meeting Style",
  },
};

function calculateStyle(scores: Scores): MeetingStyleType {
  const { ideaSpeed, timing, feedbackStyle } = scores;
  if (ideaSpeed > 15 && timing < 10) return "rapid-fire";
  if (timing > 20 && ideaSpeed > 5 && ideaSpeed < 20) return "strategic";
  if (feedbackStyle > 20 && timing > 15) return "facilitator";
  if (ideaSpeed < 0 && timing > 15) return "listener";
  if (ideaSpeed < 0 && timing < 15 && feedbackStyle < 15) return "minimalist";
  if (feedbackStyle > 15 && timing > 10) return "diplomat";
  const maxScore = Math.max(ideaSpeed, timing, feedbackStyle);
  if (maxScore === ideaSpeed) return "rapid-fire";
  if (maxScore === timing) return "strategic";
  return "diplomat";
}

export default function MeetingStyleTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, Scores>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const totalScores: Scores = Object.values(answers).reduce(
    (acc, s) => ({ ideaSpeed: acc.ideaSpeed + s.ideaSpeed, timing: acc.timing + s.timing, feedbackStyle: acc.feedbackStyle + s.feedbackStyle }),
    { ideaSpeed: 0, timing: 0, feedbackStyle: 0 }
  );

  const styleType = calculateStyle(totalScores);
  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[styleType];
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
            <div className="space-y-2">
              {q.options.map((opt, v) => {
                const isSelected = answers[q.id] !== undefined && JSON.stringify(answers[q.id]) === JSON.stringify(opt.scores);
                return (
                  <button
                    key={v}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.scores }))}
                    className={`w-full text-left py-2 px-4 text-sm rounded-xl border transition-all ${isSelected ? "bg-violet-600 border-violet-600 text-white font-semibold shadow-md" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                  >
                    {opt.text}
                  </button>
                );
              })}
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
