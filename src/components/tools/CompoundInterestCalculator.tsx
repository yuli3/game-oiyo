import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const CompoundInterestCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "복리 이자 계산기", desc: "이자에 이자가 붙는 마법, 눈덩이처럼 불어나는 자산의 속도를 계산합니다.", principal: "초기 투자금 (원)", monthly: "매월 추가 적립 (원)", rate: "연 수익률 (%)", years: "투자 기간 (년)", total: "최종 평가 금액", invest: "총 투자 원금", profit: "총 수익금" },
        en: { title: "Compound Interest", desc: "Experience the magic where interest earns interest. Graph the snowball effect of your wealth.", principal: "Initial Deposit", monthly: "Monthly Contribution", rate: "Annual Rate (%)", years: "Years", total: "Final Balance", invest: "Total Principal", profit: "Total Interest" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [principal, setPrincipal] = useState(10000000);
    const [monthly, setMonthly] = useState(1000000);
    const [rate, setRate] = useState(7);
    const [years, setYears] = useState(20);

    const r = rate / 100 / 12;
    const n = years * 12;
    
    // FV = P(1 + r)^n + PMT [ ((1 + r)^n - 1) / r ]
    const futureValue = principal * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
    const totalInvested = principal + monthly * n;

    return (
        <GameContainer title={t.title} subtitle="Exponential Growth Dynamics" onReset={() => { setPrincipal(10000000); setMonthly(1000000); setRate(7); setYears(20); }}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.principal}</label>
                        <input type="number" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-sm outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.monthly}</label>
                        <input type="number" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-sm outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.rate}</label>
                        <input type="number" value={rate} step="0.1" onChange={(e) => setRate(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-sm outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.years}</label>
                        <input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-sm outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                </div>

                <div className="p-8 bg-foreground rounded-[40px] text-background shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-background/50 uppercase tracking-widest text-center mb-2">{years}년 뒤 예상 자산</p>
                        <h4 className="text-3xl md:text-5xl font-black text-primary text-center leading-tight">₩{Math.round(futureValue).toLocaleString()}</h4>
                        
                        <div className="grid grid-cols-2 gap-8 mt-8 border-t border-background/15 pt-8">
                            <div className="text-center">
                                <p className="text-[10px] text-background/60 uppercase mb-1">{t.invest}</p>
                                <p className="text-lg font-bold">₩{Math.round(totalInvested).toLocaleString()}</p>
                            </div>
                            <div className="text-center text-success">
                                <p className="text-[10px] uppercase mb-1">{t.profit}</p>
                                <p className="text-lg font-bold">+₩{Math.round(futureValue - totalInvested).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    {/* Decorative curve background */}
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
                </div>
            </div>
        </GameContainer>
    );
};

export default CompoundInterestCalculator;
