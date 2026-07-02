'use client';

import { useState } from "react";

interface Props { locale?: string; }

type ToneType = "sharp" | "avoidant" | "friendly" | "neutral";

const data = {
  ko: {
    title: "말투 분석 테스트: 나의 커뮤니케이션 유형은?",
    description: "10가지 직장 내 시나리오로 나의 말투 유형을 진단해보세요.",
    questions: [
      {
        id: "q1",
        text: "동료가 회의 자료를 잘못 준비했다. 당신은 어떻게 말하는가?",
        options: [
          { text: "이게 왜 이렇게 됐어요? 다시 제대로 해주세요.", type: "sharp" as ToneType },
          { text: "음... 혹시 가능하다면 조금 수정해 주실 수 있을까요?", type: "avoidant" as ToneType },
          { text: "수고했어요! 여기 몇 가지 수정하면 더 좋아질 것 같아요.", type: "friendly" as ToneType },
          { text: "이 부분과 저 부분이 기준과 다르네요. 이렇게 수정해 주세요.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q2",
        text: "회의 중 상사가 비현실적인 마감을 요구한다. 당신은?",
        options: [
          { text: "그건 불가능합니다. 일정을 다시 논의해야 합니다.", type: "sharp" as ToneType },
          { text: "네, 최대한 해볼게요... (사실 걱정이 되지만 말 못함)", type: "avoidant" as ToneType },
          { text: "열심히 해볼게요! 혹시 우선순위를 같이 봐주실 수 있나요?", type: "friendly" as ToneType },
          { text: "현재 리소스 기준으로는 3일이 더 필요합니다. 조율이 가능할까요?", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q3",
        text: "동료가 자꾸 내 업무에 개입한다. 당신은?",
        options: [
          { text: "이건 제 담당이에요. 관여하지 마세요.", type: "sharp" as ToneType },
          { text: "아, 네... 그래도 제가 할 수 있어요... 아마도요.", type: "avoidant" as ToneType },
          { text: "감사해요! 지금은 혼자 해볼게요. 필요하면 연락할게요.", type: "friendly" as ToneType },
          { text: "현재 제가 담당하고 있으니, 이슈가 생기면 알려주세요.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q4",
        text: "팀원의 아이디어가 실현 불가능하다고 생각된다. 당신은?",
        options: [
          { text: "그건 안 돼요. 현실적으로 생각해봐요.", type: "sharp" as ToneType },
          { text: "아, 좋은 것 같은데요... 제 생각엔 좀 어려울 수도 있을 것 같아서요...", type: "avoidant" as ToneType },
          { text: "아이디어 좋은데요! 기술적인 부분에서 도전이 있을 것 같아요. 같이 해결책 찾아봐요!", type: "friendly" as ToneType },
          { text: "이 접근 방식에는 구현 상 제약이 있습니다. 대안을 검토해 봅시다.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q5",
        text: "클라이언트가 계약 범위 밖의 작업을 요청한다. 당신은?",
        options: [
          { text: "그건 계약 범위 밖입니다. 추가 비용이 발생합니다.", type: "sharp" as ToneType },
          { text: "네, 음... 일단 해보긴 할게요... 근데 좀 어렵긴 한데요...", type: "avoidant" as ToneType },
          { text: "요청 감사해요! 현재 범위 밖이지만, 어떻게 도울 수 있는지 방법 찾아볼게요.", type: "friendly" as ToneType },
          { text: "현재 계약 범위와 다릅니다. 추가 범위에 대한 견적을 드릴 수 있습니다.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q6",
        text: "회의가 계속 주제를 벗어나고 있다. 당신은?",
        options: [
          { text: "잠깐, 지금 우리가 왜 이 얘기를 하는 거죠?", type: "sharp" as ToneType },
          { text: "아... 저도 좀 헷갈리긴 하는데, 뭐 괜찮아요...", type: "avoidant" as ToneType },
          { text: "잠깐만요! 원래 주제로 돌아가면 어떨까요? 다들 바쁘시니까요.", type: "friendly" as ToneType },
          { text: "현재 안건에서 벗어난 것 같습니다. 원래 주제로 복귀하는 것을 제안합니다.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q7",
        text: "내 실수로 프로젝트에 문제가 생겼다. 당신은?",
        options: [
          { text: "제 실수입니다. 바로 수정하겠습니다. 원인은 나중에 분석하죠.", type: "sharp" as ToneType },
          { text: "죄송합니다, 정말 죄송해요... 제가 너무 모자란 것 같아요...", type: "avoidant" as ToneType },
          { text: "제가 실수했어요, 정말 미안합니다! 지금 바로 고치고 앞으로 더 조심할게요.", type: "friendly" as ToneType },
          { text: "제 실수로 발생한 문제입니다. 원인을 파악하고 즉시 수정하겠습니다.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q8",
        text: "동료가 내 작업에 대해 비판적인 피드백을 준다. 당신은?",
        options: [
          { text: "그 피드백은 제 접근 방식과 다릅니다. 근거를 설명해주세요.", type: "sharp" as ToneType },
          { text: "아, 네... 그렇군요... 제가 잘못한 건지도 모르겠어요...", type: "avoidant" as ToneType },
          { text: "피드백 감사해요! 더 자세히 설명해 줄 수 있어요? 같이 개선해봐요.", type: "friendly" as ToneType },
          { text: "피드백 감사합니다. 구체적으로 어떤 부분이 문제인지 알 수 있을까요?", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q9",
        text: "팀원이 약속한 기한을 또 지키지 못했다. 당신은?",
        options: [
          { text: "이번이 세 번째예요. 왜 계속 기한을 못 지키는 건가요?", type: "sharp" as ToneType },
          { text: "아, 괜찮아요... 바빠서 그랬겠죠... 제가 좀 기다릴게요...", type: "avoidant" as ToneType },
          { text: "많이 바빴지? 다음엔 어렵겠다 싶으면 미리 알려줘. 같이 조율해보자.", type: "friendly" as ToneType },
          { text: "기한이 세 번 연속 지켜지지 않았습니다. 원인과 대책을 논의합시다.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q10",
        text: "중요한 결정에서 내 의견이 무시당했다고 느낀다. 당신은?",
        options: [
          { text: "제 의견을 왜 반영하지 않은 건가요? 설명해주세요.", type: "sharp" as ToneType },
          { text: "뭐, 다들 그렇게 결정했다면... 제 의견이 맞는지도 모르겠고요...", type: "avoidant" as ToneType },
          { text: "제 생각도 공유하고 싶었는데, 다음 회의 때 한 번 이야기해도 될까요?", type: "friendly" as ToneType },
          { text: "제 분석 결과를 공유하지 못했습니다. 재검토할 기회를 요청합니다.", type: "neutral" as ToneType },
        ],
      },
    ],
    results: {
      sharp: { emoji: "⚡", title: "날카로운 직설형", desc: "당신은 생각을 직접적으로 표현하며 효율을 중시합니다. 빠른 결단과 명확한 의사소통이 강점이지만, 상대방이 날카롭게 느낄 수 있습니다. 메시지 전달 전 상대방의 감정을 한 번 더 고려해 보세요." },
      avoidant: { emoji: "🌿", title: "회피형 완충형", desc: "당신은 갈등을 피하고 상대방의 기분을 우선시하는 성향입니다. 배려심이 깊지만, 정작 중요한 메시지가 전달되지 못할 수 있습니다. 조금 더 자신의 의견을 명확히 표현하는 연습을 해보세요." },
      friendly: { emoji: "🌸", title: "친화적 관계형", desc: "당신은 따뜻하고 긍정적인 방식으로 소통합니다. 관계를 중시하고 상대방을 배려하면서도 의견을 전달하는 균형 잡힌 스타일입니다. 이 강점을 잘 살려 팀의 분위기 메이커가 되어보세요." },
      neutral: { emoji: "📊", title: "중립적 분석형", desc: "당신은 논리적이고 사실에 기반한 소통을 선호합니다. 명확하고 체계적인 메시지 전달이 강점이지만, 때로는 감정적인 연결이 부족하게 느껴질 수 있습니다. 데이터와 공감을 함께 활용해 보세요." },
    },
    retake: "다시하기", resultLabel: "나의 말투 유형",
  },
  en: {
    title: "Tone Analysis Test: What's Your Communication Style?",
    description: "Diagnose your communication tone type through 10 workplace scenarios.",
    questions: [
      {
        id: "q1",
        text: "A colleague prepared meeting materials incorrectly. What do you say?",
        options: [
          { text: "Why is this like this? Please redo it properly.", type: "sharp" as ToneType },
          { text: "Um... if possible, could you maybe make some changes?", type: "avoidant" as ToneType },
          { text: "Good effort! I think tweaking a few things here will make it even better.", type: "friendly" as ToneType },
          { text: "These sections don't match the standard. Please update them like this.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q2",
        text: "Your manager demands an unrealistic deadline in a meeting. What do you do?",
        options: [
          { text: "That's impossible. We need to renegotiate the timeline.", type: "sharp" as ToneType },
          { text: "Sure, I'll try my best... (though I'm worried but can't say so)", type: "avoidant" as ToneType },
          { text: "I'll do my best! Could we review priorities together?", type: "friendly" as ToneType },
          { text: "Based on current resources, we need 3 more days. Can we adjust?", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q3",
        text: "A colleague keeps interfering with your work. What do you say?",
        options: [
          { text: "This is my responsibility. Please don't interfere.", type: "sharp" as ToneType },
          { text: "Oh, it's okay... I can handle it... I think...", type: "avoidant" as ToneType },
          { text: "Thanks! I'll handle this for now. I'll reach out if I need help.", type: "friendly" as ToneType },
          { text: "I'm currently in charge of this. Please let me know if any issues arise.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q4",
        text: "You think a team member's idea is unrealistic. What do you say?",
        options: [
          { text: "That won't work. Let's think realistically.", type: "sharp" as ToneType },
          { text: "Oh, it sounds good... I just think it might be a bit difficult...", type: "avoidant" as ToneType },
          { text: "Great idea! There might be some technical challenges. Let's find solutions together!", type: "friendly" as ToneType },
          { text: "This approach has implementation constraints. Let's evaluate alternatives.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q5",
        text: "A client requests work outside the contract scope. What do you say?",
        options: [
          { text: "That's outside the contract scope. Additional costs will apply.", type: "sharp" as ToneType },
          { text: "Okay, um... I'll try... though it's a bit difficult...", type: "avoidant" as ToneType },
          { text: "Thanks for the request! It's outside our current scope, but let me find a way to help.", type: "friendly" as ToneType },
          { text: "This differs from the current contract scope. I can provide a quote for additional work.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q6",
        text: "The meeting keeps going off-topic. What do you do?",
        options: [
          { text: "Hold on — why are we talking about this?", type: "sharp" as ToneType },
          { text: "Oh... I'm a bit confused too, but it's okay...", type: "avoidant" as ToneType },
          { text: "Quick pause! How about we get back to the main topic? Everyone's busy.", type: "friendly" as ToneType },
          { text: "We seem to have drifted from the agenda. I suggest we return to the original topic.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q7",
        text: "Your mistake caused a problem in the project. What do you say?",
        options: [
          { text: "That was my mistake. I'll fix it immediately. Let's analyze the cause later.", type: "sharp" as ToneType },
          { text: "I'm so sorry... I think I'm just not good enough...", type: "avoidant" as ToneType },
          { text: "I made a mistake — I'm really sorry! I'll fix it right now and be more careful going forward.", type: "friendly" as ToneType },
          { text: "This issue was caused by my error. I'll identify the cause and correct it immediately.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q8",
        text: "A colleague gives you critical feedback about your work. What do you say?",
        options: [
          { text: "That feedback differs from my approach. Please explain your reasoning.", type: "sharp" as ToneType },
          { text: "Oh, I see... Maybe I was wrong... I'm not sure...", type: "avoidant" as ToneType },
          { text: "Thanks for the feedback! Can you explain more? Let's improve it together.", type: "friendly" as ToneType },
          { text: "Thank you for the feedback. Could you specify which parts are problematic?", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q9",
        text: "A team member misses a deadline again. What do you say?",
        options: [
          { text: "This is the third time. Why do you keep missing deadlines?", type: "sharp" as ToneType },
          { text: "Oh, it's fine... You must have been busy... I'll just wait longer...", type: "avoidant" as ToneType },
          { text: "Were you really swamped? Next time, let me know in advance if it's tight — we'll work it out.", type: "friendly" as ToneType },
          { text: "This is the third consecutive missed deadline. Let's discuss the cause and a plan.", type: "neutral" as ToneType },
        ],
      },
      {
        id: "q10",
        text: "You feel your opinion was ignored in an important decision. What do you do?",
        options: [
          { text: "Why wasn't my opinion reflected? Please explain.", type: "sharp" as ToneType },
          { text: "Well, if everyone decided that way... I'm not even sure I'm right...", type: "avoidant" as ToneType },
          { text: "I wanted to share my thoughts too — could I bring it up at the next meeting?", type: "friendly" as ToneType },
          { text: "I wasn't able to share my analysis. I'd like to request an opportunity to revisit this.", type: "neutral" as ToneType },
        ],
      },
    ],
    results: {
      sharp: { emoji: "⚡", title: "Sharp & Direct", desc: "You express thoughts directly and value efficiency. Quick decisions and clear communication are your strengths, but others may find you cutting. Consider the recipient's emotional state before delivering a message." },
      avoidant: { emoji: "🌿", title: "Avoidant & Buffered", desc: "You prioritize avoiding conflict and keeping others comfortable. Your consideration runs deep, but critical messages may not get through. Practice expressing your views more clearly." },
      friendly: { emoji: "🌸", title: "Friendly & Relational", desc: "You communicate in a warm, positive way. You strike a balanced style — valuing relationships and caring for others while still getting your message across. Use this strength to be the team's atmosphere maker." },
      neutral: { emoji: "📊", title: "Neutral & Analytical", desc: "You prefer logical, fact-based communication. Clear and systematic messaging is your strength, but sometimes the emotional connection can feel lacking. Try pairing data with empathy." },
    },
    retake: "Retake", resultLabel: "Your Communication Tone",
  },
};

export default function ToneAnalysisTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, ToneType>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const types: ToneType[] = ["sharp", "avoidant", "friendly", "neutral"];
  const scores = Object.fromEntries(types.map((s) => [s, 0])) as Record<ToneType, number>;
  Object.values(answers).forEach((type) => { scores[type] += 1; });
  const topType = (Object.entries(scores) as [ToneType, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[topType];
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100">
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
          <div className="h-2 bg-rose-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="space-y-8">
        {t.questions.map((q, i) => (
          <div key={q.id} className="space-y-3">
            <p className="font-semibold text-slate-800 leading-snug">{i + 1}. {q.text}</p>
            <div className="space-y-2">
              {q.options.map((opt, v) => (
                <button
                  key={v}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.type }))}
                  className={`w-full text-left py-2 px-3 text-sm rounded-lg border transition-all ${answers[q.id] === opt.type ? "bg-rose-600 border-rose-600 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-rose-600 text-white hover:bg-rose-700 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
