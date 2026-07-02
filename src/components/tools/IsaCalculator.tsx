import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const IsaCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "ISA(개인종합자산관리계좌) 계산기", desc: "일반 계좌 대비 ISA 계좌의 절세 혜택을 계산합니다.", profit: "투자 수익 (원)", type: "ISA 유형", general: "일반형 (200만 비과세)", farmer: "서민/농어민형 (400만 비과세)", result: "절세 효과 분석", tax: "예상 세금", save: "절세액", baseRate: "일반 세율 (15.4%)", isaRate: "ISA 분리과세 (9.9%)" },
        en: { title: "ISA (Savings Account) Calculator", desc: "Calculate the tax benefits of ISA vs. general investment accounts.", profit: "Total Profit", type: "Account Type", general: "General (2M Free)", farmer: "Farmer/Lower Income (4M Free)", result: "Tax Benefit Analysis", tax: "Estimated Tax", save: "Saved Amount", baseRate: "General Tax (15.4%)", isaRate: "ISA Tax (9.9%)" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [profit, setProfit] = useState(10000000);
    const [isaType, setIsaType] = useState<'general' | 'farmer'>('general');

    const limit = isaType === 'general' ? 2000000 : 4000000;
    
    // General Account Tax: 15.4% flat
    const generalTax = profit * 0.154;

    // ISA Tax: (Profit - Limit) * 9.9%
    const isaTax = profit > limit ? (profit - limit) * 0.099 : 0;
    
    const savedAmount = generalTax - isaTax;

    return (
        <GameContainer title={t.title} subtitle="Strategic Tax Optimization" onReset={() => { setProfit(10000000); setIsaType('general'); }}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.profit}</label>
                        <input type="number" value={profit} onChange={(e) => setProfit(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-xl outline-none" />
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.type}</label>
                        <div className="grid grid-cols-1 gap-2">
                            <button onClick={() => setIsaType('general')} className={`p-4 rounded-2xl border-2 text-left text-xs font-bold transition-all ${isaType === 'general' ? 'bg-primary/5 border-primary text-primary' : 'bg-muted/30 border-transparent text-muted-foreground'}`}>{t.general}</button>
                            <button onClick={() => setIsaType('farmer')} className={`p-4 rounded-2xl border-2 text-left text-xs font-bold transition-all ${isaType === 'farmer' ? 'bg-primary/5 border-primary text-primary' : 'bg-muted/30 border-transparent text-muted-foreground'}`}>{t.farmer}</button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-8 bg-muted/40 rounded-[32px] border border-border space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase">{t.baseRate}</p>
                        <h4 className="text-2xl font-black">₩{Math.round(generalTax).toLocaleString()}</h4>
                    </div>
                    <div className="p-8 bg-success/10 border border-success/20 rounded-[32px] space-y-2 animate-in slide-in-from-bottom-4">
                        <p className="text-[10px] font-black text-success uppercase">ISA {t.tax}</p>
                        <h4 className="text-2xl font-black text-success">₩{Math.round(isaTax).toLocaleString()}</h4>
                    </div>
                </div>

                <div className="p-10 bg-primary rounded-[40px] text-primary-foreground text-center shadow-2xl relative overflow-hidden group">
                    <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">{t.save}</p>
                    <h2 className="text-5xl font-black">₩{Math.round(savedAmount).toLocaleString()}</h2>
                    <p className="mt-4 text-xs font-medium opacity-70">ISA 계좌를 이용하면 이만큼의 수익을 더 지킬 수 있습니다.</p>
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                </div>
            </div>
        </GameContainer>
    );
};

export default IsaCalculator;
