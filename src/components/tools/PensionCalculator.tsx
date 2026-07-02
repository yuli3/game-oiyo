import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const PensionCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "연금저축/IRP 세액공제 계산기", desc: "13월의 월급을 결정하는 연금 계좌 세액공제 한도와 혜택을 계산합니다.", income: "총 급여액 (원)", amount: "연간 납입액 (원)", result: "예상 세액공제액", rate: "세액공제율", limit: "최대 공제 한도", desc2: "연말정산 시 돌려받는 예상 환급금입니다." },
        en: { title: "Pension/IRP Tax Credit", desc: "Calculate your tax refund based on pension savings contributions.", income: "Annual Salary", amount: "Annual Contribution", result: "Estimated Tax Refund", rate: "Credit Rate", limit: "Max Limit", desc2: "This is the estimated refund you'll receive." }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [salary, setSalary] = useState(50000000);
    const [amount, setAmount] = useState(9000000);

    const isLowIncome = salary <= 55000000;
    const creditRate = isLowIncome ? 0.165 : 0.132;
    const limit = 9000000; // Unified 9M limit for 2024
    
    const effectiveAmount = Math.min(amount, limit);
    const refund = effectiveAmount * creditRate;

    return (
        <GameContainer title={t.title} subtitle="13th Month Bonus Planner" onReset={() => { setSalary(50000000); setAmount(9000000); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-lg mx-auto">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-muted-foreground uppercase">{t.income}</label>
                            <input type="number" value={salary} onChange={(e) => setSalary(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black" />
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-muted-foreground uppercase">{t.amount}</label>
                            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black" />
                        </div>
                    </div>

                    <div className="bg-foreground rounded-[32px] p-8 text-background flex flex-col justify-center animate-in slide-in-from-right">
                        <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-2">{t.result}</p>
                        <h2 className="text-4xl font-black text-primary mb-6">₩{Math.round(refund).toLocaleString()}</h2>
                        
                        <div className="space-y-3 border-t border-background/15 pt-6">
                            <div className="flex justify-between">
                                <span className="text-[10px] text-background/60 uppercase">{t.rate}</span>
                                <span className="text-xs font-bold text-success">{(creditRate * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[10px] text-background/60 uppercase">{t.limit}</span>
                                <span className="text-xs font-bold">₩{limit.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <p className="text-xs text-center text-muted-foreground italic">{t.desc2}</p>
            </div>
        </GameContainer>
    );
};

export default PensionCalculator;
