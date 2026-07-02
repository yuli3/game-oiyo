import React, { useState, useMemo } from 'react';

const calculatorData = {
  ko: {
    title: "전세 vs 매매 비교 계산기",
    labels: {
      price: "매매가 (억)",
      deposit: "전세금 (억)",
      period: "거주 기간 (년)",
      rate: "대출 금리 (%)",
      appreciation: "연 예상 집값 상승률 (%)",
      calculate: "비교 결과 확인하기"
    },
    results: {
      buyBetter: "매매(내 집 마련)가 더 유리합니다!",
      rentBetter: "전세(임대)가 더 유리합니다!",
      buyScenario: "매매 시나리오",
      rentScenario: "전세 시나리오",
      netProfit: "예상 순익/비용",
      buyDetails: "집값 상승분에서 대출 이자와 세금을 뺀 결과입니다.",
      rentDetails: "보증금 기회비용(연 3.5% 예금 가정)을 고려한 결과입니다."
    }
  },
  en: {
    title: "Rent vs. Buy Calculator",
    labels: {
      price: "Purchase Price (100M KRW)",
      deposit: "Rent Deposit (100M KRW)",
      period: "Period (Years)",
      rate: "Mortgage Rate (%)",
      appreciation: "Est. Annual Growth (%)",
      calculate: "Check Comparison"
    },
    results: {
      buyBetter: "Buying a home is more beneficial!",
      rentBetter: "Renting is more beneficial!",
      buyScenario: "Buying Scenario",
      rentScenario: "Renting Scenario",
      netProfit: "Est. Net Profit/Cost",
      buyDetails: "Calculated based on appreciation minus interest and taxes.",
      rentDetails: "Calculated based on the opportunity cost of the deposit (3.5% interest)."
    }
  }
};

const HomeBuyingCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = calculatorData[locale] || calculatorData.ko;
    const [price, setPrice] = useState(10); // 10억
    const [deposit, setDeposit] = useState(6); // 6억
    const [period, setPeriod] = useState(5); // 5년
    const [rate, setRate] = useState(4); // 4%
    const [appreciation, setAppreciation] = useState(3); // 3%
    const [showResults, setShowResults] = useState(false);

    const calculations = useMemo(() => {
        // Simple Buying Calc
        const totalAppreciation = price * Math.pow(1 + appreciation / 100, period) - price;
        const totalInterest = (price * (rate / 100)) * period; // Simple interest for demo
        const acquisitionTax = price * 0.03; // Simple 3% tax
        const buyNet = (totalAppreciation - totalInterest - acquisitionTax) * 100000000;

        // Simple Renting Calc (Opportunity Cost of Deposit)
        const opportunityCost = -(deposit * Math.pow(1 + 0.035, period) - deposit) * 100000000;

        return { buyNet, rentNet: opportunityCost };
    }, [price, deposit, period, rate, appreciation]);

    const formatWon = (val: number) => {
        return (val / 10000).toLocaleString() + '만원';
    };

    return (
        <div className="not-prose my-12 p-8 bg-slate-50 border border-slate-200 rounded-3xl shadow-xl max-w-2xl mx-auto">
            {!showResults ? (
                <div className="space-y-6">
                    <h3 className="text-2xl font-black text-center text-slate-900 mb-8">{t.title}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500">{t.labels.price}</label>
                            <input type="number" value={price} onChange={(e)=>setPrice(Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500">{t.labels.deposit}</label>
                            <input type="number" value={deposit} onChange={(e)=>setDeposit(Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500">{t.labels.period}</label>
                            <input type="number" value={period} onChange={(e)=>setPeriod(Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-500">{t.labels.rate}</label>
                            <input type="number" step="0.1" value={rate} onChange={(e)=>setRate(Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-500">{t.labels.appreciation}</label>
                        <input type="range" min="-10" max="20" value={appreciation} onChange={(e)=>setAppreciation(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                        <div className="text-right font-bold text-blue-600">{appreciation}%</div>
                    </div>

                    <button 
                        onClick={() => setShowResults(true)}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                    >
                        {t.labels.calculate}
                    </button>
                </div>
            ) : (
                <div className="space-y-8 animate-fade-in">
                    <div className="text-center">
                        <h3 className="text-3xl font-black text-slate-900">
                            {calculations.buyNet > calculations.rentNet ? t.results.buyBetter : t.results.rentBetter}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-white rounded-2xl border border-slate-100">
                            <h4 className="text-xs font-bold text-blue-500 uppercase mb-2">{t.results.buyScenario}</h4>
                            <div className="text-xl font-bold text-slate-900 mb-1">
                                {formatWon(calculations.buyNet)}
                            </div>
                            <p className="text-[10px] text-slate-400">{t.results.buyDetails}</p>
                        </div>
                        <div className="p-6 bg-white rounded-2xl border border-slate-100">
                            <h4 className="text-xs font-bold text-emerald-500 uppercase mb-2">{t.results.rentScenario}</h4>
                            <div className="text-xl font-bold text-slate-900 mb-1">
                                {formatWon(calculations.rentNet)}
                            </div>
                            <p className="text-[10px] text-slate-400">{t.results.rentDetails}</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowResults(false)}
                        className="w-full py-3 border border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-100"
                    >
                        {locale === 'ko' ? '수치 수정하기' : 'Back to Edit'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default HomeBuyingCalculator;
