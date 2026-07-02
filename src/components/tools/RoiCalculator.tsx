import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const RoiCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "ROI(투자 수익률) 계산기", desc: "투입 비용 대비 창출된 수익을 분석하여 투자의 효율성을 평가합니다.", cost: "투자 비용 (원)", gain: "총 회수 금액 (원)", result: "투자 결과 분석", roi: "수익률 (ROI)", profit: "순수익", payperiod: "회수 배수", desc2: "ROI가 0% 이상이면 수익, 0% 이하면 손실입니다." },
        en: { title: "ROI Calculator", desc: "Analyze the efficiency of an investment by comparing costs to gains.", cost: "Total Cost", gain: "Total Return", result: "Investment Analysis", roi: "Return on Investment", profit: "Net Profit", payperiod: "Multiplier", desc2: "A positive ROI indicates a gain, negative indicates a loss." }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [cost, setCost] = useState(10000000);
    const [gain, setGain] = useState(15000000);

    const profit = gain - cost;
    const roi = cost > 0 ? (profit / cost) * 100 : 0;
    const multiplier = cost > 0 ? (gain / cost) : 0;

    return (
        <GameContainer title={t.title} subtitle="Efficiency Measurement Monitor" onReset={() => { setCost(10000000); setGain(15000000); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md mx-auto">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.cost}</label>
                        <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none" />
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.gain}</label>
                        <input type="number" value={gain} onChange={(e) => setGain(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none" />
                    </div>
                </div>

                <div className="p-10 bg-foreground rounded-[40px] text-background shadow-2xl relative overflow-hidden text-center">
                    <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-4">{t.roi}</p>
                    <h2 className={`text-6xl font-black mb-8 ${roi >=0 ? 'text-primary' : 'text-destructive'}`}>
                        {roi.toFixed(1)}%
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-8 border-t border-background/15 pt-8">
                        <div>
                            <p className="text-[10px] text-background/60 uppercase mb-1">{t.profit}</p>
                            <p className={`text-xl font-bold ${profit >=0 ? 'text-background' : 'text-destructive'}`}>₩{Math.round(profit).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-background/60 uppercase mb-1">{t.payperiod}</p>
                            <p className="text-xl font-bold text-background">{multiplier.toFixed(2)}x</p>
                        </div>
                    </div>
                </div>
                
                <p className="text-xs text-center text-muted-foreground italic">{t.desc2}</p>
            </div>
        </GameContainer>
    );
};

export default RoiCalculator;
