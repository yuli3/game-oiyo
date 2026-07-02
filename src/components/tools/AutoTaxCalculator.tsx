import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const AutoTaxCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "자동차세 계산기", desc: "배기량과 연식을 기준으로 연간 자동차세를 계산하고 연납 할인 혜택을 확인합니다.", cc: "배기량 (cc)", year: "자동차 등록 연도", type: "차종 구분", car: "승용차", van: "승합차", result: "연간 자동차세 합계", base: "자동차세", edu: "지방교육세 (30%)", discount: "연납 할인(1월 기준)" },
        en: { title: "Auto Tax Calculator", desc: "Calculate annual car tax based on engine size and age with prepayment discounts.", cc: "Displacement (cc)", year: "Registration Year", type: "Vehicle Type", car: "Passenger Car", van: "Van/Truck", result: "Total Annual Tax", base: "Base Tax", edu: "Education Tax (30%)", discount: "Prepayment Discount" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [cc, setCc] = useState(2000);
    const [regYear, setRegYear] = useState(new Date().getFullYear());
    
    // Logic: cc * rate + 30% education tax - age discount (5% from 3rd year, max 50%)
    const currentYear = new Date().getFullYear();
    const age = Math.max(0, currentYear - regYear);
    const ageDiscountRate = age <= 2 ? 0 : Math.min(0.5, (age - 2) * 0.05);

    let perCc = 0;
    if (cc <= 1000) perCc = 80;
    else if (cc <= 1600) perCc = 140;
    else perCc = 200;

    const baseTax = (cc * perCc) * (1 - ageDiscountRate);
    const eduTax = baseTax * 0.3;
    const total = baseTax + eduTax;
    const janDiscount = total * 0.045; // 2024 standard is decreasing annually

    return (
        <GameContainer title={t.title} subtitle="Vehicle Ownership Analytics" onReset={() => { setCc(2000); setRegYear(new Date().getFullYear()); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.cc}</label>
                        <input type="number" value={cc} onChange={(e) => setCc(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none" />
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.year}</label>
                        <select value={regYear} onChange={(e) => setRegYear(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black outline-none appearance-none">
                            {Array.from({ length: 30 }).map((_, i) => {
                                const y = currentYear - i;
                                return <option key={y} value={y}>{y}년</option>;
                            })}
                        </select>
                    </div>
                </div>

                <div className="p-10 bg-foreground rounded-[40px] text-background shadow-2xl animate-in zoom-in-95">
                    <div className="text-center mb-8">
                        <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-2">{t.result}</p>
                        <h2 className="text-5xl font-black text-primary">₩{Math.round(total).toLocaleString()}</h2>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 border-t border-background/15 pt-8">
                        <div className="text-center">
                            <p className="text-[10px] text-background/60 uppercase">{t.base}</p>
                            <p className="text-sm font-bold">₩{Math.round(baseTax).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-background/60 uppercase">{t.edu}</p>
                            <p className="text-sm font-bold">₩{Math.round(eduTax).toLocaleString()}</p>
                        </div>
                        <div className="text-center text-success">
                            <p className="text-[10px] uppercase font-black">{t.discount}</p>
                            <p className="text-sm font-bold">-₩{Math.round(janDiscount).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default AutoTaxCalculator;
