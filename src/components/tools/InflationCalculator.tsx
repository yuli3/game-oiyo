import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const InflationCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "화폐 가치 계산기 (인플레이션)", desc: "시간이 흐름에 따라 변하는 화폐의 실질 가치를 계산합니다.", amount: "현재 금액 (원)", rate: "예상 물가 상승률 (%)", years: "기간 (년)", result1: "년 뒤의 실질 가치는", result2: "현재 가치를 유지하려면 필요한 금액", calc: "계산하기" },
        en: { title: "Inflation Calculator", desc: "Calculate the real value of money over time.", amount: "Amount", rate: "Inflation Rate (%)", years: "Period (Years)", result1: "Real value after years", result2: "Amount needed to maintain value", calc: "Calculate" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [amount, setAmount] = useState(1000000);
    const [rate, setRate] = useState(3);
    const [years, setYears] = useState(10);

    const futureValue = amount / Math.pow(1 + rate/100, years);
    const neededAmount = amount * Math.pow(1 + rate/100, years);

    return (
        <GameContainer title={t.title} subtitle="Purchasing Power Analytics" onReset={() => { setAmount(1000000); setRate(3); setYears(10); }}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.amount}</label>
                        <input 
                            type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.rate}</label>
                        <input 
                            type="number" value={rate} step="0.1" onChange={(e) => setRate(Number(e.target.value))}
                            className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.years}</label>
                        <input 
                            type="number" value={years} onChange={(e) => setYears(Number(e.target.value))}
                            className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-3xl space-y-2 animate-in slide-in-from-bottom-4">
                        <p className="text-[10px] font-black text-destructive uppercase">{years}{t.result1}</p>
                        <h4 className="text-2xl font-black text-destructive">{Math.round(futureValue).toLocaleString()}원</h4>
                        <p className="text-[10px] text-destructive">물가 상승으로 인해 구매력이 {Math.round((1 - futureValue/amount)*100)}% 하락합니다.</p>
                    </div>
                    <div className="p-6 bg-success/10 border border-success/20 rounded-3xl space-y-2 animate-in slide-in-from-bottom-4 delay-100">
                        <p className="text-[10px] font-black text-success uppercase">{t.result2}</p>
                        <h4 className="text-2xl font-black text-success">{Math.round(neededAmount).toLocaleString()}원</h4>
                        <p className="text-[10px] text-success">현재와 같은 생활 수준을 위해 필요한 미래 자산입니다.</p>
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default InflationCalculator;
