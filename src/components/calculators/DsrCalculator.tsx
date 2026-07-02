import React, { useState, useEffect } from 'react';

const DsrCalculator: React.FC = () => {
    const [income, setIncome] = useState<number>(60000000);
    const [existingDebt, setExistingDebt] = useState<number>(10000000);
    const [newLoan, setNewLoan] = useState<number>(300000000);
    const [interestRate, setInterestRate] = useState<number>(4.5);
    const [loanTerm, setLoanTerm] = useState<number>(40);
    const [dsr, setDsr] = useState<number>(0);
    const [maxLoan, setMaxLoan] = useState<number>(0);

    const calculateDsr = () => {
        // Simple PMT calculation for new loan
        const monthlyRate = interestRate / 100 / 12;
        const totalMonths = loanTerm * 12;
        
        const monthlyPayment = (newLoan * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
        const annualNewPayment = monthlyPayment * 12;
        
        const totalAnnualDebt = existingDebt + annualNewPayment;
        const calculatedDsr = (totalAnnualDebt / income) * 100;
        setDsr(calculatedDsr);

        // Calculate max loan for 40% DSR
        const maxAnnualPayment = income * 0.4 - existingDebt;
        if (maxAnnualPayment > 0) {
            const calculatedMaxLoan = (maxAnnualPayment / 12) * (Math.pow(1 + monthlyRate, totalMonths) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, totalMonths));
            setMaxLoan(calculatedMaxLoan);
        } else {
            setMaxLoan(0);
        }
    };

    useEffect(() => {
        calculateDsr();
    }, [income, existingDebt, newLoan, interestRate, loanTerm]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
    };

    return (
        <div className="not-prose my-12 p-8 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-3xl shadow-xl">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Inputs */}
                <div className="flex-1 space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">대출 정보 입력</h3>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">연간 총소득 (백만원)</label>
                        <input 
                            type="range" min="10000000" max="200000000" step="1000000"
                            value={income} onChange={(e) => setIncome(Number(e.target.value))}
                            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-lg font-bold text-blue-600">
                            <span>{income / 10000}만원</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">기존 대출 연간 원리금 상환액 (만원)</label>
                        <input 
                            type="number" value={existingDebt / 10000} 
                            onChange={(e) => setExistingDebt(Number(e.target.value) * 10000)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">신규 대출 희망 금액 (백만원)</label>
                        <input 
                            type="range" min="10000000" max="1000000000" step="10000000"
                            value={newLoan} onChange={(e) => setNewLoan(Number(e.target.value))}
                            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="text-lg font-bold text-blue-600">{newLoan / 10000}만원</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600">금리 (%)</label>
                            <input 
                                type="number" step="0.1" value={interestRate} 
                                onChange={(e) => setInterestRate(Number(e.target.value))}
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600">기간 (년)</label>
                            <select 
                                value={loanTerm} onChange={(e) => setLoanTerm(Number(e.target.value))}
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value={10}>10년</option>
                                <option value={20}>20년</option>
                                <option value={30}>30년</option>
                                <option value={40}>40년</option>
                                <option value={50}>50년</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 p-6 bg-white rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="mb-6">
                        <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">나의 DSR 지수</span>
                        <div className={`text-6xl font-black mt-2 ${dsr > 40 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {dsr.toFixed(1)}%
                        </div>
                    </div>

                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-8 relative">
                        <div 
                            className={`h-full transition-all duration-500 ${dsr > 40 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(dsr, 100)}%` }}
                        />
                        <div className="absolute left-[40%] top-0 w-1 h-full bg-slate-900/50 z-10" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 w-full">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-xs text-slate-500 block mb-1">DSR 40% 기준 대출 가능 최대 금액</span>
                            <span className="text-xl font-bold text-blue-600">
                                {maxLoan > 0 ? formatCurrency(Math.floor(maxLoan / 10000) * 10000) : '0원'}
                            </span>
                        </div>
                        
                        {dsr > 40 ? (
                            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium">
                                ⚠️ 현재 규제 한도(40%)를 초과하였습니다. 대출 기간을 늘리거나 기존 대출을 상환하는 전략이 필요합니다.
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-medium">
                                ✅ 규제 한도 내에 있습니다. 안정적인 대출 실행이 가능합니다.
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-8 text-[10px] text-slate-400 text-center uppercase tracking-tighter">
                * 위 계산 결과는 참고용이며 실제 은행의 심사 기준과 다를 수 있습니다. (스트레스 DSR 미반영)
            </div>
        </div>
    );
};

export default DsrCalculator;
