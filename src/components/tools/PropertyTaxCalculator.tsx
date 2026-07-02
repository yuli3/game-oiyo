import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const PropertyTaxCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "재산세 & 보유세 계산기", desc: "공시가격을 기준으로 아파트 등의 재산세와 지방교육세를 시뮬레이션합니다.", value: "공시 가격 (원)", ratio: "공정시장가액비율 (%)", result: "예상 재산세 합계", tax: "재산세액", edu: "지방교육세", city: "도시계획세", desc2: "* 1주택자 특례 세율 등이 적용되지 않은 일반 과세 기준입니다." },
        en: { title: "Property Tax Calculator", desc: "Estimate property and local education taxes based on official value.", value: "Official Value", ratio: "Fair Market Value Ratio (%)", result: "Total Property Tax", tax: "Base Tax", edu: "Education Tax", city: "Urban Tax", desc2: "* Based on general tax rates without special exemptions." }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [value, setValue] = useState(600000000);
    const [ratio, setRatio] = useState(60);

    const baseValue = value * (ratio / 100);
    
    // Simplified KR Property Tax Brackets
    let baseTax = 0;
    if (baseValue <= 60000000) baseTax = baseValue * 0.001;
    else if (baseValue <= 150000000) baseTax = 60000 + (baseValue - 60000000) * 0.0015;
    else if (baseValue <= 300000000) baseTax = 195000 + (baseValue - 150000000) * 0.0025;
    else baseTax = 570000 + (baseValue - 300000000) * 0.004;

    const cityTax = baseValue * 0.0014;
    const eduTax = baseTax * 0.2;
    const total = baseTax + cityTax + eduTax;

    return (
        <GameContainer title={t.title} subtitle="Asset Ownership Analytics" onReset={() => { setValue(600000000); setRatio(60); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.value}</label>
                        <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full p-6 bg-muted/30 rounded-[32px] border border-border font-black text-xl outline-none" />
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.ratio}</label>
                        <div className="flex items-center gap-4">
                            <input type="range" min="40" max="100" value={ratio} onChange={(e) => setRatio(Number(e.target.value))} className="flex-1" />
                            <span className="text-lg font-black text-primary">{ratio}%</span>
                        </div>
                    </div>
                </div>

                <div className="p-10 bg-foreground rounded-[40px] text-background shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                    <div className="text-center mb-8 relative z-10">
                        <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-2">{t.result}</p>
                        <h2 className="text-5xl font-black text-primary">₩{Math.round(total).toLocaleString()}</h2>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 border-t border-background/15 pt-8 relative z-10">
                        <div className="text-center">
                            <p className="text-[10px] text-background/60 uppercase">{t.tax}</p>
                            <p className="text-sm font-bold">₩{Math.round(baseTax).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-background/60 uppercase">{t.city}</p>
                            <p className="text-sm font-bold">₩{Math.round(cityTax).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-background/60 uppercase">{t.edu}</p>
                            <p className="text-sm font-bold">₩{Math.round(eduTax).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                </div>
                
                <p className="text-xs text-center text-muted-foreground italic">{t.desc2}</p>
            </div>
        </GameContainer>
    );
};

export default PropertyTaxCalculator;
