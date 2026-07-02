import React, { useState } from 'react';

const laborData = {
  ko: {
    title: "사회 초년생 필수 노동법 체크",
    categories: [
      {
        title: "💰 임금 & 최저임금",
        items: [
          { q: "2025년 최저임금은 얼마인가요?", a: "시급 10,030원입니다. 월 환산액(209시간 기준)은 2,096,270원입니다." },
          { q: "주휴수당은 누구나 받나요?", a: "1주 15시간 이상 근무하고, 소정근로일을 개근했다면 알바생도 받을 수 있습니다." }
        ]
      },
      {
        title: "⏰ 근로시간 & 휴식",
        items: [
          { q: "휴게시간은 의무인가요?", a: "4시간 근무 시 30분, 8시간 근무 시 1시간 이상의 휴게시간을 근무 중에 부여해야 합니다." },
          { q: "야간/연장 근로 수당은요?", a: "상시 5인 이상 사업장이라면 통상임금의 50%를 가산해서 받아야 합니다." }
        ]
      },
      {
        title: "📄 계약 & 권리",
        items: [
          { q: "근로계약서는 언제 쓰나요?", a: "업무 시작 전 반드시 작성하고 교부받아야 합니다. 미작성 시 사장은 벌금을 물게 됩니다." },
          { q: "부당해고를 당했다면?", a: "5인 이상 사업장이라면 노동위원회에 구제 신청을 할 수 있습니다." }
        ]
      }
    ],
    cta: "나의 예상 실수령액 계산해보기"
  },
  en: {
    title: "Essential Labor Laws for New Professionals",
    categories: [
      {
        title: "💰 Wages & Minimum Wage",
        items: [
          { q: "What is the minimum wage?", a: "It varies by region, but check your local labor standards (e.g., FLSA in the US)." },
          { q: "Is overtime pay mandatory?", a: "Yes, generally hours over 40 per week are paid at 1.5x interest in many jurisdictions." }
        ]
      },
      {
        title: "⏰ Hours & Breaks",
        items: [
          { q: "Are breaks required?", a: "Most laws mandate a 30-min break for every 4-6 hours worked. Check your local statutes." },
          { q: "Is 'Crunch' legal?", a: "Work hours are usually capped at 40-52 hours depending on the country to protect health." }
        ]
      },
      {
        title: "📄 Contracts & Rights",
        items: [
          { q: "When should I sign the contract?", a: "Before you start working. Always keep a copy for yourself." },
          { q: "What if I'm treated unfairly?", a: "Document everything and contact your local labor board or union representative." }
        ]
      }
    ],
    cta: "Estimate My Net Pay"
  }
};

const LaborLawQuickCheck: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = laborData[locale] || laborData.ko;
    const [openIdx, setOpenIdx] = useState<string | null>(null);

    return (
        <div className="not-prose my-12 p-8 bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800">
            <h3 className="text-2xl font-black text-center mb-8 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                {t.title}
            </h3>
            
            <div className="space-y-6">
                {t.categories.map((cat, catIdx) => (
                    <div key={catIdx} className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2 border-l-2 border-blue-500">
                            {cat.title}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                            {cat.items.map((item, itemIdx) => {
                                const id = `${catIdx}-${itemIdx}`;
                                return (
                                    <div key={id} className="group">
                                        <button
                                            onClick={() => setOpenIdx(openIdx === id ? null : id)}
                                            className={`w-full text-left p-4 rounded-xl transition-all border ${
                                                openIdx === id 
                                                    ? 'bg-blue-600/20 border-blue-500/50' 
                                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-slate-100">{item.q}</span>
                                                <span className={`transition-transform duration-300 ${openIdx === id ? 'rotate-180' : ''}`}>
                                                    ▼
                                                </span>
                                            </div>
                                            {openIdx === id && (
                                                <p className="mt-3 text-sm text-blue-200 animate-fade-in border-t border-blue-500/20 pt-3">
                                                    💡 {item.a}
                                                </p>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-10 flex justify-center">
                <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full font-bold hover:scale-105 transition-all shadow-lg shadow-blue-500/20">
                    {t.cta}
                </button>
            </div>
        </div>
    );
};

export default LaborLawQuickCheck;
