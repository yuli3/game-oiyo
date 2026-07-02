import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const CaffelatteCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "카페라떼 효과 계산기", desc: "하루 한 잔의 커피값을 아꼈을 때 모이는 놀라운 자산을 시뮬레이션합니다.", daily: "하루 절약 금액 (원)", rate: "예상 투자 수익률 (%)", years: "기간 (년)", total: "총 모인 금액", invest: "원금 합계", profit: "이자 수익" },
        en: { title: "Caffelatte Effect", desc: "Simulation of wealth built by saving a small daily expense.", daily: "Daily Saving Amount", rate: "Expected Return (%)", years: "Period (Years)", total: "Total Wealth", invest: "Total Saved", profit: "Interest Profit" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [daily, setDaily] = useState(5000);
    const [rate, setRate] = useState(6);
    const [years, setYears] = useState(30);

    const monthlySaving = daily * 30.41; // Average month
    const monthlyRate = rate / 100 / 12;
    const totalMonths = years * 12;

    const futureValue = monthlySaving * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
    const totalInvestment = monthlySaving * totalMonths;

    return (
        <GameContainer title={t.title} subtitle="Micro-Saving Compound Power" onReset={() => { setDaily(5000); setRate(6); setYears(30); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-lg mx-auto">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.daily}</label>
                        <input type="number" value={daily} onChange={(e) => setDaily(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.rate}</label>
                        <input type="number" value={rate} step="0.1" onChange={(e) => setRate(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.years}</label>
                        <input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                </div>

                <div className="bg-primary/5 rounded-[40px] p-8 md:p-12 border border-primary/20 relative overflow-hidden text-center space-y-4">
                    <p className="text-xs font-black text-primary uppercase tracking-widest">{years}{locale === 'ko' ? '년 뒤 당신의 빌딩 조각' : ' Years Later Your Wealth'}</p>
                    <h2 className="text-4xl md:text-6xl font-black text-primary">{Math.round(futureValue).toLocaleString()}원</h2>
                    
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-primary/10">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase">{t.invest}</p>
                            <p className="text-sm font-bold">{Math.round(totalInvestment).toLocaleString()}원</p>
                        </div>
                        <div className="text-success">
                            <p className="text-[10px] uppercase">{t.profit}</p>
                            <p className="text-sm font-bold">+{Math.round(futureValue - totalInvestment).toLocaleString()}원</p>
                        </div>
                    </div>
                    {/* Visual bar for focus */}
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-4">
                        <div 
                            style={{ width: `${(totalInvestment / futureValue) * 100}%` }}
                            className="h-full bg-primary"
                        />
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default CaffelatteCalculator;
