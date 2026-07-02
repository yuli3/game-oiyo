import React, { useState, useMemo } from 'react';

const questions = [
  { id: "q1", text: "잠들기 직전까지 스마트폰을 확인합니까?", options: ["안 함", "가끔", "자주", "매일", "항상"] },
  { id: "q2", text: "스마트폰이 옆에 없으면 불안함이나 초조함을 느낍니까?", options: ["전혀 아님", "조금", "보통", "심함", "매우 심함"] },
  { id: "q3", text: "알림이 오지 않았는데도 습관적으로 폰을 확인합니까?", options: ["안 함", "가끔", "자주", "매우 자주", "무의식적으로 항상"] },
  { id: "q4", text: "스마트폰 사용 시간 때문에 일상 업무나 공부에 지장이 있습니까?", options: ["없음", "가끔", "자주", "심각함", "매우 심각함"] },
  { id: "q5", text: "대화 중에도 스마트폰을 확인하여 상대방을 불쾌하게 한 적이 있습니까?", options: ["없음", "가끔", "자주", "매우 자주", "습관임"] },
  { id: "q6", text: "스마트폰 사용 시간을 줄이려고 시도했지만 실패한 적이 있습니까?", options: ["없음", "1-2번", "3-5번", "많음", "포기함"] },
];

const DigitalBalanceTest: React.FC = () => {
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [showResults, setShowResults] = useState(false);

    const score = useMemo(() => {
        return Object.values(answers).reduce((acc, curr) => acc + curr, 0);
    }, [answers]);

    const handleSelect = (qId: string, val: number) => {
        setAnswers(prev => ({ ...prev, [qId]: val }));
    };

    const isComplete = Object.keys(answers).length === questions.length;

    const getInterpretation = (s: number) => {
        if (s <= 6) return { title: "디지털 여유로움", color: "text-emerald-500", desc: "당신은 기술을 도구로 완벽하게 통제하고 있습니다. 현재의 균형을 유지하세요." };
        if (s <= 15) return { title: "디지털 주의보", color: "text-amber-500", desc: "조금씩 스마트폰에 의존하기 시작했습니다. 의식적인 스크린 타임 관리가 필요합니다." };
        return { title: "디지털 중독 위험", color: "text-rose-500", desc: "스마트폰이 당신의 일상을 지배하고 있을 가능성이 높습니다. '디지털 디톡스'가 절실한 시점입니다." };
    };

    const interpretation = getInterpretation(score);

    return (
        <div className="not-prose my-12 p-8 bg-slate-50 border border-slate-200 rounded-3xl shadow-lg max-w-2xl mx-auto">
            {!showResults ? (
                <div className="space-y-8">
                    <div className="text-center">
                        <h3 className="text-2xl font-black text-slate-900">나의 디지털 중독 지수 테스트</h3>
                        <p className="text-sm text-slate-500 mt-2">간단한 체크를 통해 나의 디지털 웰빙 상태를 확인하세요.</p>
                    </div>

                    <div className="space-y-8">
                        {questions.map((q, idx) => (
                            <div key={q.id} className="space-y-4">
                                <p className="text-lg font-bold text-slate-800">{idx + 1}. {q.text}</p>
                                <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
                                    {q.options.map((opt, val) => (
                                        <button
                                            key={val}
                                            onClick={() => handleSelect(q.id, val)}
                                            className={`flex-1 py-3 px-2 rounded-xl border transition-all ${
                                                answers[q.id] === val
                                                    ? 'bg-slate-900 border-slate-900 text-white font-bold'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 flex justify-center">
                        <button
                            disabled={!isComplete}
                            onClick={() => setShowResults(true)}
                            className={`px-10 py-4 rounded-full font-bold transition-all ${
                                isComplete 
                                    ? 'bg-black text-white hover:scale-105 shadow-xl' 
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            결과 분석하기
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center space-y-8 py-6 animate-fade-in">
                    <div>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">분석 결과</span>
                        <h3 className={`text-5xl font-black mt-2 ${interpretation.color}`}>{interpretation.title}</h3>
                    </div>

                    <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-inner">
                        <p className="text-slate-700 leading-relaxed font-medium">
                            {interpretation.desc}
                        </p>
                    </div>

                    <div className="bg-slate-900 text-white p-6 rounded-2xl text-left space-y-3">
                        <p className="text-xs font-bold uppercase text-slate-400">오늘부터 실천할 액션 아이템:</p>
                        <ul className="text-sm space-y-2 font-medium">
                            <li>📅 침실에는 스마트폰 들고 들어가지 않기</li>
                            <li>📵 식사 시간에는 폰 멀리 두기</li>
                            <li>🔔 불필요한 푸시 알림 모두 끄기</li>
                        </ul>
                    </div>

                    <button
                        onClick={() => {setAnswers({}); setShowResults(false);}}
                        className="text-slate-400 text-sm hover:text-slate-900 transition-colors"
                    >
                        다시 테스트하기
                    </button>
                </div>
            )}
        </div>
    );
};

export default DigitalBalanceTest;
