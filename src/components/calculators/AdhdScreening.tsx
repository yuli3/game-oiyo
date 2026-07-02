import React, { useState, useMemo } from 'react';

const questions = [
  { id: "q1", text: "어떤 일의 어려운 부분을 다 마친 후에, 그 일을 마무리 짓지 못해 곤란을 겪은 적이 얼마나 자주 있습니까?", threshold: 2 },
  { id: "q2", text: "체계적인 계획이 필요한 일을 해야 할 때, 순서대로 진행하기 어려운 경우가 얼마나 자주 있습니까?", threshold: 2 },
  { id: "q3", text: "약속이나 해야 할 일을 잊어버려 문제가 생긴 적이 얼마나 자주 있습니까?", threshold: 2 },
  { id: "q4", text: "골치 아픈 일을 시작할 때, 가능한 한 피하거나 미루는 경우가 얼마나 자주 있습니까?", threshold: 3 },
  { id: "q5", text: "오래 앉아 있어야 하는 상황에서, 손발을 꼼지락거리거나 들썩거리는 경우가 얼마나 자주 있습니까?", threshold: 2 },
  { id: "q6", text: "마치 모터가 달린 것처럼 과도하게 활동하거나, 가만히 있지 못하는 경우가 얼마나 자주 있습니까?", threshold: 3 },
];

const options = [
  { label: "전혀 없음", value: 0 },
  { label: "드묾", value: 1 },
  { label: "가끔 있음", value: 2 },
  { label: "자주 있음", value: 3 },
  { label: "매우 자주 있음", value: 4 },
];

const AdhdScreening: React.FC = () => {
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [showResults, setShowResults] = useState(false);

    const results = useMemo(() => {
        let score = 0;
        let flags = 0;
        questions.forEach(q => {
            const val = answers[q.id] || 0;
            score += val;
            if (val >= q.threshold) flags++;
        });
        return { score, flags };
    }, [answers]);

    const handleSelect = (qId: string, val: number) => {
        setAnswers(prev => ({ ...prev, [qId]: val }));
    };

    const isComplete = Object.keys(answers).length === questions.length;

    return (
        <div className="not-prose my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto">
            {!showResults ? (
                <div className="space-y-8">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-slate-900">성인 ADHD 자가진단 (ASRS v1.1)</h3>
                        <p className="text-sm text-slate-500 mt-2">지난 6개월 동안의 자신의 상태를 가장 잘 나타내는 항목에 체크해 주세요.</p>
                    </div>

                    <div className="space-y-10">
                        {questions.map((q, idx) => (
                            <div key={q.id} className="space-y-4">
                                <div className="flex gap-4">
                                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">{idx + 1}</span>
                                    <p className="text-lg font-medium text-slate-800 leading-tight">{q.text}</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 ml-12">
                                    {options.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleSelect(q.id, opt.value)}
                                            className={`py-2 px-1 text-xs rounded-lg border transition-all ${
                                                answers[q.id] === opt.value
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex justify-center">
                        <button
                            disabled={!isComplete}
                            onClick={() => setShowResults(true)}
                            className={`px-12 py-4 rounded-2xl font-bold text-lg transition-all ${
                                isComplete 
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' 
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            결과 확인하기
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center space-y-6 py-4 animate-fade-in">
                    <div className="inline-flex p-4 bg-blue-50 rounded-full mb-4">
                        <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    
                    <h3 className="text-3xl font-black text-slate-900">진단 결과</h3>
                    
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="text-sm text-slate-500 uppercase tracking-widest mb-1">주의 필요 지표 (Flags)</div>
                        <div className="text-5xl font-black text-blue-600 mb-2">{results.flags} / 6</div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            {results.flags >= 4 
                                ? "진단 결과, 성인 ADHD일 가능성이 높습니다. 전문의와의 상담을 권장합니다." 
                                : "정상 범위 내에 있습니다. 하지만 일상생활에 큰 불편을 느낀다면 전문가의 도움을 받는 것이 좋습니다."}
                        </p>
                    </div>

                    <div className="text-xs text-slate-400 text-left bg-slate-100 p-4 rounded-xl leading-relaxed">
                        * 본 테스트는 세계보건기구(WHO)의 ASRS v1.1 스크리닝 도구를 기반으로 합니다. 
                        * 6개 문항 중 4개 이상에서 기준치 이상의 점수가 나왔다면, 추가적인 전문적 평가가 필요함을 시사합니다.
                        * 본 진단은 의학적 소견을 대신할 수 없습니다.
                    </div>

                    <button
                        onClick={() => {setAnswers({}); setShowResults(false);}}
                        className="text-blue-600 font-bold hover:underline"
                    >
                        다시 테스트하기
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdhdScreening;
