import React, { useState, useMemo } from 'react';

const quizData = {
  ko: {
    title: "투자 DNA 테스트: 나의 자산 관리 성향은?",
    description: "10개의 질문을 통해 당신이 저축가, 소비가, 투자자, 아니면 미니멀리스트인지 확인해보세요.",
    questions: [
      { id: "q1", text: "나는 다른 지출을 하기 전에 항상 일정 금액을 먼저 저축한다.", type: "saver" },
      { id: "q2", text: "저축 계좌 잔고가 낮아지면 불안함을 느낀다.", type: "saver" },
      { id: "q3", text: "마음에 드는 물건을 발견하면 즉흥적으로 구매한다.", type: "spender" },
      { id: "q4", text: "미래를 위해 저축하는 것보다 현재의 경험과 즐거움을 우선시한다.", type: "spender" },
      { id: "q5", text: "주식, 부동산 또는 기타 자산에 대해 적극적으로 조사하고 투자한다.", type: "investor" },
      { id: "q6", text: "나는 돈을 장기적인 부를 쌓기 위한 도구로 본다.", type: "investor" },
      { id: "q7", text: "잠재적인 수익을 위해 계산된 금융 위험을 감수하는 것이 편안하다.", type: "investor" },
      { id: "q8", text: "저렴한 물건을 많이 갖기보다 고품질의 물건을 소수 소유하는 것을 선호한다.", type: "minimalist" },
      { id: "q9", text: "정기적으로 물건을 정리하고 불필요한 소유물이 쌓이는 것을 피한다.", type: "minimalist" },
      { id: "q10", text: "적게 소유하고 지출을 최소화하는 삶에서 자유를 느낀다.", type: "minimalist" }
    ],
    options: ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"],
    results: {
      investor: { title: "📈 투자자 (Investor)", desc: "돈이 일하게 만드는 전략가. 복리의 힘을 믿고 장기 부를 쌓는 데 집중합니다." },
      minimalist: { title: "🌿 미니멀리스트 (Minimalist)", desc: "소유보다 존재를 중시하는 자유주의자. 불필요한 지출을 줄여 평온을 찾습니다." },
      saver: { title: "🏦 저축가 (Saver)", desc: "안전이 최우선인 수호자. 튼튼한 비상금과 예산 관리에서 평온을 얻습니다." },
      spender: { title: "🛍️ 소비가 (Spender)", desc: "현재의 행복을 아는 낭만가. 돈은 경험과 추억을 위해 존재한다고 믿습니다." }
    }
  },
  en: {
    title: "Investment DNA Test: What's Your Wealth Style?",
    description: "Discover if you're a Saver, Spender, Investor, or Minimalist in 10 questions.",
    questions: [
      { id: "q1", text: "I always save a set amount before spending on anything else.", type: "saver" },
      { id: "q2", text: "I feel anxious when my savings balance gets low.", type: "saver" },
      { id: "q3", text: "I buy things impulsively when I see something I like.", type: "spender" },
      { id: "q4", text: "I prioritize current experiences over saving for the distant future.", type: "spender" },
      { id: "q5", text: "I actively research and invest in stocks, real estate, or other assets.", type: "investor" },
      { id: "q6", text: "I see money as a tool for building long-term wealth.", type: "investor" },
      { id: "q7", text: "I'm comfortable taking calculated risks for potential gains.", type: "investor" },
      { id: "q8", text: "I prefer owning fewer high-quality items over many cheap ones.", type: "minimalist" },
      { id: "q9", text: "I regularly declutter and avoid accumulating unnecessary possessions.", type: "minimalist" },
      { id: "q10", text: "I feel free by owning less and minimizing my expenses.", type: "minimalist" }
    ],
    options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
    results: {
      investor: { title: "📈 Investor", desc: "A strategist making money work for you. You focus on long-term wealth and compound interest." },
      minimalist: { title: "🌿 Minimalist", desc: "A freedom-seeker valuing existence over possession. You find peace by reducing clutter." },
      saver: { title: "🏦 Saver", desc: "A guardian of security. You gain peace from a robust emergency fund and budgeting." },
      spender: { title: "🛍️ Spender", desc: "A romantic living for now. You believe money exists for experiences and memories." }
    }
  }
};

const InvestmentPersonalityTest: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = quizData[locale] || quizData.ko;
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [showResults, setShowResults] = useState(false);

    const resultType = useMemo(() => {
        const scores: Record<string, number> = { saver: 0, spender: 0, investor: 0, minimalist: 0 };
        t.questions.forEach((q) => {
            const val = answers[q.id] || 0;
            // @ts-ignore
            scores[q.type] += val;
        });
        
        let maxType = 'saver';
        let maxVal = -1;
        for (const [type, val] of Object.entries(scores)) {
            if (val > maxVal) {
                maxVal = val;
                maxType = type;
            }
        }
        return maxType;
    }, [answers]);

    const isComplete = Object.keys(answers).length === t.questions.length;

    return (
        <div className="not-prose my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto">
            {!showResults ? (
                <div className="space-y-6">
                    <div className="text-center mb-10">
                        <h3 className="text-2xl font-black text-slate-900">{t.title}</h3>
                        <p className="text-sm text-slate-500 mt-2">{t.description}</p>
                    </div>

                    <div className="space-y-10">
                        {t.questions.map((q, idx) => (
                            <div key={q.id} className="space-y-4">
                                <p className="text-lg font-bold text-slate-800 leading-tight">{idx + 1}. {q.text}</p>
                                <div className="grid grid-cols-5 gap-1">
                                    {t.options.map((opt, val) => (
                                        <button
                                            key={val}
                                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: val + 1 }))}
                                            className={`py-2 px-1 text-[10px] rounded-lg border transition-all ${
                                                answers[q.id] === val + 1
                                                    ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-md'
                                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 flex justify-center">
                        <button
                            disabled={!isComplete}
                            onClick={() => setShowResults(true)}
                            className={`px-12 py-4 rounded-2xl font-bold text-lg transition-all ${
                                isComplete 
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl' 
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {locale === 'ko' ? '결과 보기' : 'Show Result'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center space-y-8 py-6 animate-fade-in">
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{locale === 'ko' ? '당신의 투자 DNA' : 'Your Investment DNA'}</span>
                        {/* @ts-ignore */}
                        <h3 className="text-4xl font-black text-slate-900">{t.results[resultType].title}</h3>
                    </div>

                    <div className="p-8 bg-indigo-50 rounded-3xl border border-indigo-100">
                        {/* @ts-ignore */}
                        <p className="text-slate-700 text-lg leading-relaxed">{t.results[resultType].desc}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:scale-[1.02] transition-transform">
                           {locale === 'ko' ? '상세 레포트 다운로드' : 'Download Detailed Report'}
                        </button>
                        <button 
                            onClick={() => {setAnswers({}); setShowResults(false);}}
                            className="text-slate-400 text-sm hover:underline"
                        >
                            {locale === 'ko' ? '테스트 다시하기' : 'Retake Test'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvestmentPersonalityTest;
