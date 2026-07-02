'use client';

import { useState } from "react";

interface Props { locale?: string; }

type RiskLevel = "low" | "moderate" | "high" | "critical";

const data = {
  ko: {
    title: "협업 리스크 테스트: 나는 어떤 팀원인가?",
    description: "12개의 질문으로 나의 협업 리스크 패턴을 파악하세요.",
    questions: [
      { id: "q1", text: "동료에게 비판적 피드백을 받을 때 나는?", options: [
        { text: "열린 마음으로 듣고 명확히 하는 질문을 한다", score: 0 },
        { text: "그들의 관점을 인정하고 고려한다", score: 1 },
        { text: "약간 방어적이지만 나중에 처리한다", score: 2 },
        { text: "방어적이 되어 왜 틀렸는지 설명한다", score: 3 },
        { text: "무시하거나 내 일을 이해 못 한다고 생각한다", score: 4 },
      ] },
      { id: "q2", text: "비판적인 댓글을 칭찬보다 오래 기억하는 이유는?", options: [
        { text: "체계적으로 성과를 향상시키기 위해 활용한다", score: 0 },
        { text: "개인적 성찰에 가치 있다고 생각해서", score: 1 },
        { text: "정확성에 대해 약간 불확실해서", score: 2 },
        { text: "신경이 쓰이기 때문에", score: 3 },
        { text: "내 능력에 의문을 품고 집착한다", score: 4 },
      ] },
      { id: "q3", text: "회의에서 동료가 내 아이디어에 공개적으로 반대할 때?", options: [
        { text: "그들의 견해를 존중하고 공개적으로 논의한다", score: 0 },
        { text: "건설적으로 참여하고 의견을 환영한다", score: 1 },
        { text: "더 명확히 설명하려 노력한다", score: 2 },
        { text: "불편하지만 계속 나아가려 한다", score: 3 },
        { text: "좌절감, 당혹감, 혹은 위협감을 느낀다", score: 4 },
      ] },
      { id: "q4", text: "부정적인 피드백을 받으면 나는?", options: [
        { text: "즉시 개선을 위해 행동한다", score: 0 },
        { text: "성찰하고 개선 계획을 세운다", score: 1 },
        { text: "개인적으로 내 관점을 공유한다", score: 2 },
        { text: "걱정을 확인하려 동료들에게 언급한다", score: 3 },
        { text: "여러 사람과 공유하고 원한을 품는다", score: 4 },
      ] },
      { id: "q5", text: "프로젝트나 작업이 잘못되었을 때 나는?", options: [
        { text: "완전한 책임을 지고 해결에 집중한다", score: 0 },
        { text: "내 역할을 인정하고 개선점을 생각한다", score: 1 },
        { text: "맥락과 상황을 설명한다", score: 2 },
        { text: "외부 요인이나 다른 사람을 부분적으로 탓한다", score: 3 },
        { text: "주로 다른 사람이나 외부 환경을 탓한다", score: 4 },
      ] },
      { id: "q6", text: "마감이나 결과물을 약속했을 때 나는?", options: [
        { text: "일관되게 일찍 또는 제때 완수한다", score: 0 },
        { text: "보통 품질 좋게 마감을 맞춘다", score: 1 },
        { text: "가끔 약간의 차이로 마감을 놓친다", score: 2 },
        { text: "자주 연장을 협상한다", score: 3 },
        { text: "과도하게 약속하고 일관되게 날짜를 놓친다", score: 4 },
      ] },
      { id: "q7", text: "누군가 프로젝트에 도움을 요청하면 나는?", options: [
        { text: "내 능력 내에서 열정적으로 돕는다", score: 0 },
        { text: "가능한 한 많이 돕는다", score: 1 },
        { text: "역할에서 기대된다면 돕는다", score: 2 },
        { text: "내 일에 집중하면서 마지못해 돕는다", score: 3 },
        { text: "그들이 보답하거나 빚지면 돕는다", score: 4 },
      ] },
      { id: "q8", text: "팀원이 나에게 자주 요청을 과부하시키면 나는?", options: [
        { text: "내 역량을 명확히 소통하고 협상한다", score: 0 },
        { text: "가용성에 대한 경계를 부드럽게 설정한다", score: 1 },
        { text: "수용하려 하지만 부담을 느낀다", score: 2 },
        { text: "조용히 원망하지만 계속 동의한다", score: 3 },
        { text: "수동적 공격적이 되거나 그들을 피한다", score: 4 },
      ] },
      { id: "q9", text: "매니저가 동의하지 않는 결정을 내릴 때 나는?", options: [
        { text: "전문적으로 지지하고 실행한다", score: 0 },
        { text: "관점을 제공하면서 공손히 실행한다", score: 1 },
        { text: "준수하지만 내심 의심한다", score: 2 },
        { text: "자주 동료들에게 우려를 표현한다", score: 3 },
        { text: "결정을 약화시키거나 우회한다", score: 4 },
      ] },
      { id: "q10", text: "매니저의 주된 동기가 무엇이라고 생각하나요?", options: [
        { text: "나와 팀이 성공하도록 돕는 것", score: 0 },
        { text: "팀의 목표와 복지를 지원하는 것", score: 1 },
        { text: "비즈니스와 팀 필요 사이의 균형", score: 2 },
        { text: "주로 자신의 커리어를 발전시키는 것", score: 3 },
        { text: "팀을 통제하거나 세세하게 관리하는 것", score: 4 },
      ] },
      { id: "q11", text: "매니저의 피드백에 대해 나는 어떻게 생각하나요?", options: [
        { text: "공정하고, 정확하고, 건설적이다", score: 0 },
        { text: "대체로 공정하지만 가끔 편향이 있다", score: 1 },
        { text: "때로 편향되거나 일관성이 없다", score: 2 },
        { text: "종종 불공평하거나 편애에 기반한다", score: 3 },
        { text: "매우 편향되어 실제 성과를 반영하지 않는다", score: 4 },
      ] },
      { id: "q12", text: "매니저는 조직 변화와 결정에 대해 투명한가요?", options: [
        { text: "매우 투명하고 이유를 설명한다", score: 0 },
        { text: "적절한 범위 내에서 대체로 투명하다", score: 1 },
        { text: "어느 정도 투명하지만 세부사항을 숨긴다", score: 2 },
        { text: "드물게 투명하여 추측하게 만든다", score: 3 },
        { text: "변화를 다른 사람을 통해 먼저 듣는다", score: 4 },
      ] },
    ],
    results: {
      low: { emoji: "🌿", title: "저위험 협업자", desc: "피드백을 건설적으로 처리하고, 책임감 있게 헌신하며, 리더십을 신뢰합니다. 탁월한 팀원입니다. 이 강점을 계속 유지하세요." },
      moderate: { emoji: "⚡", title: "보통 수준의 협업 위험", desc: "일부 협업 패턴이 팀 역학에 마찰을 일으킬 수 있습니다. 피드백 수용, 책임감, 또는 리더십 신뢰를 개선하면 더 효과적인 팀원이 될 수 있습니다." },
      high: { emoji: "🔶", title: "높은 협업 위험", desc: "여러 협업 영역에서 리스크가 있습니다. 이러한 패턴은 팀 성과에 영향을 줄 수 있습니다. 자기 인식을 높이고 구체적인 개선 계획을 세워보세요." },
      critical: { emoji: "🔴", title: "심각한 협업 위험", desc: "현재 패턴이 효과적인 협업을 크게 방해하고 있습니다. 전문 코칭이나 직장 상담을 받아보는 것을 강력히 권장합니다." },
    },
    retake: "다시하기", resultLabel: "나의 협업 위험 수준",
  },
  en: {
    title: "Collab Risk Test: What Kind of Teammate Are You?",
    description: "Identify your collaboration risk patterns with 12 questions.",
    questions: [
      { id: "q1", text: "When receiving critical feedback from a colleague, I tend to:", options: [
        { text: "Listen openly and ask clarifying questions", score: 0 },
        { text: "Acknowledge their perspective and consider it", score: 1 },
        { text: "Feel slightly defensive but process it later", score: 2 },
        { text: "Become defensive and explain why they're wrong", score: 3 },
        { text: "Dismiss it or assume they don't understand my work", score: 4 },
      ] },
      { id: "q2", text: "I tend to remember critical comments longer than praise because:", options: [
        { text: "I use them to improve my performance systematically", score: 0 },
        { text: "I find them valuable for personal reflection", score: 1 },
        { text: "I'm somewhat uncertain about their accuracy", score: 2 },
        { text: "They're bothering to think about", score: 3 },
        { text: "I dwell on them and question my competence", score: 4 },
      ] },
      { id: "q3", text: "When a peer publicly disagrees with my idea in a meeting, I:", options: [
        { text: "Respect their view and discuss it openly", score: 0 },
        { text: "Engage constructively and welcome their input", score: 1 },
        { text: "Explain my reasoning more carefully to clarify", score: 2 },
        { text: "Feel uncomfortable but try to move forward", score: 3 },
        { text: "Feel frustrated, embarrassed, or undermined", score: 4 },
      ] },
      { id: "q4", text: "If I receive negative feedback, I'm likely to:", options: [
        { text: "Act on it immediately to improve", score: 0 },
        { text: "Reflect and make an improvement plan", score: 1 },
        { text: "Share my perspective with the person privately", score: 2 },
        { text: "Mention it to colleagues to validate my concerns", score: 3 },
        { text: "Share it with multiple people and hold resentment", score: 4 },
      ] },
      { id: "q5", text: "When a project or task goes wrong, I:", options: [
        { text: "Take full ownership and focus on solutions", score: 0 },
        { text: "Acknowledge my role and what I could improve", score: 1 },
        { text: "Explain the context and circumstances", score: 2 },
        { text: "Partly blame external factors or others involved", score: 3 },
        { text: "Blame others or external circumstances primarily", score: 4 },
      ] },
      { id: "q6", text: "When I commit to a deadline or deliverable, I:", options: [
        { text: "Consistently deliver early or on time", score: 0 },
        { text: "Typically meet the deadline with quality work", score: 1 },
        { text: "Sometimes miss deadlines by small margins", score: 2 },
        { text: "Frequently negotiate extensions", score: 3 },
        { text: "Over-commit and consistently miss dates", score: 4 },
      ] },
      { id: "q7", text: "When someone asks for help on their project, I:", options: [
        { text: "Enthusiastically help within my capacity", score: 0 },
        { text: "Help as much as reasonably possible", score: 1 },
        { text: "Help if it's expected of my role", score: 2 },
        { text: "Reluctantly help while focusing on my work", score: 3 },
        { text: "Help only if they reciprocate or owe me a favor", score: 4 },
      ] },
      { id: "q8", text: "If a team member frequently overloads me with requests, I:", options: [
        { text: "Clearly communicate my capacity and negotiate", score: 0 },
        { text: "Gently set boundaries about my availability", score: 1 },
        { text: "Try to accommodate but feel stretched", score: 2 },
        { text: "Resent it silently but keep agreeing", score: 3 },
        { text: "Become passive-aggressive or avoid them", score: 4 },
      ] },
      { id: "q9", text: "When my manager makes a decision I disagree with, I:", options: [
        { text: "Support and execute it professionally", score: 0 },
        { text: "Execute it respectfully while offering perspective", score: 1 },
        { text: "Comply but privately doubt the decision", score: 2 },
        { text: "Frequently express concerns to colleagues", score: 3 },
        { text: "Undermine the decision or work around it", score: 4 },
      ] },
      { id: "q10", text: "I believe my manager's main motivation is to:", options: [
        { text: "Help me and the team succeed", score: 0 },
        { text: "Support the team's goals and wellbeing", score: 1 },
        { text: "Maintain balance between business and team needs", score: 2 },
        { text: "Advance their own career primarily", score: 3 },
        { text: "Control or micromanage the team", score: 4 },
      ] },
      { id: "q11", text: "Regarding feedback from my manager, I believe:", options: [
        { text: "It's fair, accurate, and constructive", score: 0 },
        { text: "It's mostly fair with occasional bias", score: 1 },
        { text: "It's sometimes biased or inconsistent", score: 2 },
        { text: "It's often unfair or based on favoritism", score: 3 },
        { text: "It's highly biased and doesn't reflect my actual performance", score: 4 },
      ] },
      { id: "q12", text: "My manager is transparent about organizational changes and decisions:", options: [
        { text: "Very transparent and explains the reasoning", score: 0 },
        { text: "Mostly transparent, within appropriate bounds", score: 1 },
        { text: "Somewhat transparent but withholds details", score: 2 },
        { text: "Rarely transparent, leaving me guessing", score: 3 },
        { text: "Not transparent; I learn changes from others first", score: 4 },
      ] },
    ],
    results: {
      low: { emoji: "🌿", title: "Low-Risk Collaborator", desc: "You handle feedback constructively, follow through on commitments, and trust leadership. You're an excellent teammate. Keep up these strengths." },
      moderate: { emoji: "⚡", title: "Moderate Collaboration Risk", desc: "Some collaboration patterns may create friction in team dynamics. Improving your feedback receptivity, accountability, or leadership trust will make you an even more effective team member." },
      high: { emoji: "🔶", title: "High Collaboration Risk", desc: "There are risks in multiple collaboration areas. These patterns may impact team performance. Increase self-awareness and create a concrete improvement plan." },
      critical: { emoji: "🔴", title: "Critical Collaboration Risk", desc: "Current patterns are significantly hindering effective collaboration. Professional coaching or workplace counseling is strongly recommended." },
    },
    retake: "Retake", resultLabel: "Your Collaboration Risk Level",
  },
};

export default function CollabRiskTest({ locale: localeProp }: Props) {
  const lang = (localeProp === "en" ? "en" : "ko") as "ko" | "en";
  const t = data[lang];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");

  const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0);
  const maxScore = t.questions.length * 4;
  const pct = totalScore / maxScore;

  const level: RiskLevel =
    pct <= 0.2 ? "low" :
    pct <= 0.45 ? "moderate" :
    pct <= 0.7 ? "high" :
    "critical";

  const isComplete = Object.keys(answers).length === t.questions.length;

  if (phase === "result") {
    const r = t.results[level];
    const barPct = Math.round((1 - pct) * 100);
    return (
      <div className="not-prose my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">{t.resultLabel}</p>
        <div className="text-6xl">{r.emoji}</div>
        <h3 className="text-3xl font-black text-slate-900">{r.title}</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{lang === "ko" ? "협업 건강 지수" : "Collaboration Health"}</span>
            <span className="font-bold text-orange-600">{barPct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full">
            <div className="h-3 bg-orange-500 rounded-full transition-all" style={{ width: `${barPct}%` }} />
          </div>
        </div>
        <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
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
          <div className="h-2 bg-orange-500 rounded-full transition-all" style={{ width: `${(Object.keys(answers).length / t.questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="space-y-8">
        {t.questions.map((q, i) => (
          <div key={q.id} className="space-y-3">
            <p className="font-semibold text-slate-800 leading-snug">{i + 1}. {q.text}</p>
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt) => (
                <button
                  key={opt.score}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.score }))}
                  className={`py-3 px-4 text-sm rounded-xl border transition-all text-left ${answers[q.id] === opt.score ? "bg-orange-500 border-orange-500 text-white font-bold shadow-md" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
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
          className={`px-10 py-3 rounded-2xl font-bold text-base transition-all ${isComplete ? "bg-orange-500 text-white hover:bg-orange-600 shadow-lg" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          {lang === "ko" ? "결과 보기" : "See Results"}
        </button>
      </div>
    </div>
  );
}
