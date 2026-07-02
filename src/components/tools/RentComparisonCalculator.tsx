import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const RentComparisonCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "전세 vs 월세 비교 계산기", desc: "주거비용을 기회비용과 금리를 고려하여 객관적으로 비교합니다.", jeonse: "전세 조건", wolse: "월세 조건", deposit: "보증금 (원)", rent: "월세 (원)", rate: "대출/예금 금리 (%)", result: "비교 결과", resultDesc: "월 실질 주거비 차이", jeonseBetter: "전세가 유리", wolseBetter: "월세가 유리" },
        en: { title: "Rent vs Monthly Comparison", desc: "Compare housing costs considering opportunity cost and interest rates.", jeonse: "Jeonse", wolse: "Monthly Rent", deposit: "Deposit", rent: "Monthly Rent", rate: "Interest Rate (%)", result: "Comparison", resultDesc: "Monthly cost difference", jeonseBetter: "Jeonse is Better", wolseBetter: "Monthly is Better" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [jeonseDep, setJeonseDep] = useState(200000000);
    const [wolseDep, setWolseDep] = useState(20000000);
    const [wolseRent, setWolseRent] = useState(1000000);
    const [rate, setRate] = useState(4);

    const jeonseCost = (jeonseDep * (rate / 100)) / 12;
    const wolseCost = ((wolseDep * (rate / 100)) / 12) + wolseRent;

    const diff = Math.abs(jeonseCost - wolseCost);
    const winner = jeonseCost < wolseCost ? t.jeonseBetter : t.wolseBetter;

    return (
        <GameContainer title={t.title} subtitle="Housing Cost Optimization" onReset={() => { setJeonseDep(200000000); setWolseDep(20000000); setWolseRent(1000000); setRate(4); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Jeonse Block */}
                    <div className="p-8 bg-muted/40 rounded-[32px] border border-border space-y-6">
                        <h5 className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t.jeonse}</h5>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black opacity-50 block mb-1">{t.deposit}</label>
                                <input type="number" value={jeonseDep} onChange={(e) => setJeonseDep(Number(e.target.value))} className="w-full p-4 bg-background border border-border rounded-2xl font-black text-md outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black opacity-50 block mb-1">{t.rate}</label>
                                <input type="number" value={rate} step="0.1" onChange={(e) => setRate(Number(e.target.value))} className="w-full p-4 bg-background border border-border rounded-2xl font-black text-md outline-none" />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-border">
                            <p className="text-[10px] text-muted-foreground uppercase">{locale === 'ko' ? '월 기회비용' : 'Monthly Opp. Cost'}</p>
                            <p className="text-xl font-black">₩{Math.round(jeonseCost).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Wolse Block */}
                    <div className="p-8 bg-primary/5 rounded-[32px] border border-primary/20 space-y-6">
                        <h5 className="text-xs font-black text-primary uppercase tracking-widest">{t.wolse}</h5>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-primary/50 block mb-1">{t.deposit}</label>
                                <input type="number" value={wolseDep} onChange={(e) => setWolseDep(Number(e.target.value))} className="w-full p-4 bg-background border border-primary/20 rounded-2xl font-black text-md outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-primary/50 block mb-1">{t.rent}</label>
                                <input type="number" value={wolseRent} onChange={(e) => setWolseRent(Number(e.target.value))} className="w-full p-4 bg-background border border-primary/20 rounded-2xl font-black text-md outline-none" />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-primary/10">
                            <p className="text-[10px] text-primary/60 uppercase">{locale === 'ko' ? '월 총 비용' : 'Monthly Total Cost'}</p>
                            <p className="text-xl font-black text-primary">₩{Math.round(wolseCost).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="p-10 bg-foreground rounded-[40px] text-background text-center animate-in fade-in zoom-in shadow-2xl">
                    <h4 className="text-3xl font-black text-primary mb-2 uppercase">{winner}</h4>
                    <p className="text-xs text-background/50">{t.resultDesc}</p>
                    <div className="mt-6 text-4xl font-black text-background">₩{Math.round(diff).toLocaleString()}</div>
                    <p className="mt-2 text-[10px] text-background/60 uppercase">Per Month</p>
                </div>
            </div>
        </GameContainer>
    );
};

export default RentComparisonCalculator;
