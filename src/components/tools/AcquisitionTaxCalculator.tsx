import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const AcquisitionTaxCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "부동산 취득세 계산기", desc: "주택 매수 시 발생하는 취득세와 지방교육세 등을 미리 계산합니다.", price: "매수 가액 (원)", area: "전용 면적 (㎡)", result: "총 납부 세액", tax: "취득세", edu: "지방교육세", rural: "농어촌특별세" },
        en: { title: "Real Estate Acquisition Tax", desc: "Calculate acquisition tax and local education tax for home buyers.", price: "Purchase Price", area: "Area (sqm)", result: "Total Tax", tax: "Acquisition Tax", edu: "Education Tax", rural: "Rural Dev. Tax" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [price, setPrice] = useState(600000000);
    const [area, setArea] = useState(84);

    // Simplified 2024 KR Tax Table
    let taxRate = 0.01;
    if (price > 900000000) taxRate = 0.03;
    else if (price > 600000000) taxRate = ((price * 2) / 300000000 - 3) / 100;

    const acquisitionTax = price * taxRate;
    const eduTax = acquisitionTax * 0.1;
    const ruralTax = area > 85 ? price * 0.002 : 0;
    const total = acquisitionTax + eduTax + ruralTax;

    return (
        <GameContainer title={t.title} subtitle="Home Buying Prep" onReset={() => { setPrice(600000000); setArea(84); }}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.price}</label>
                        <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.area}</label>
                        <input type="number" value={area} onChange={(e) => setArea(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                </div>

                <div className="bg-foreground rounded-[32px] p-8 text-background animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-black text-background/60 uppercase">{t.result}</span>
                        <h4 className="text-2xl font-black text-primary">₩{Math.round(total).toLocaleString()}</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-t border-background/15 pt-6">
                        <div className="text-center">
                            <p className="text-[10px] text-background/60 uppercase">{t.tax}</p>
                            <p className="text-xs font-bold">₩{Math.round(acquisitionTax).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-background/60 uppercase">{t.edu}</p>
                            <p className="text-xs font-bold">₩{Math.round(eduTax).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-background/60 uppercase">{t.rural}</p>
                            <p className="text-xs font-bold">₩{Math.round(ruralTax).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default AcquisitionTaxCalculator;
