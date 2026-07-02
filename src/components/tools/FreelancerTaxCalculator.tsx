import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const FreelancerTaxCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "프리랜서 3.3% 세금 계산기", desc: "월 소득에서 3.3% 원천징수 세액을 제외한 실수령액과 종합소득세를 예측합니다.", income: "세전 월 소득 (원)", result: "정산 결과", net: "월 실수령액", tax33: "원천징수 (3.3%)", annual: "예상 종합소득세 (연간)", desc2: "연 소득 2,400만 원 이하 신규 사업자 단순경비율 가정을 기준으로 한 참고용 수치입니다." },
        en: { title: "Freelancer 3.3% Tax", desc: "Calculate your net take-home pay after 3.3% withholding and estimated income tax.", income: "Monthly Gross Income", result: "Tax Summary", net: "Monthly Net Pay", tax33: "Withholding (3.3%)", annual: "Ext. Annual Income Tax", desc2: "Based on simplified expense rules for small businesses. For reference only." }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [income, setIncome] = useState(3000000);

    const tax33 = income * 0.033;
    const netPay = income - tax33;
    
    // Simplified Annual Tax Prediction (Very rough estimation for 5월 종합소득세)
    // Formula: (Annual Income * (1 - ExpenseRatio) - BasicDeduction) * Rate
    const annualIncome = income * 12;
    const taxableIncome = annualIncome * 0.4; // Assume 60% expense
    let estAnnualTax = 0;
    if (taxableIncome <= 14000000) estAnnualTax = taxableIncome * 0.06;
    else if (taxableIncome <= 50000000) estAnnualTax = taxableIncome * 0.15 - 1260000;
    else estAnnualTax = taxableIncome * 0.24 - 5760000;

    const totalWithheld = tax33 * 12;
    const settlement = estAnnualTax - totalWithheld;

    return (
        <GameContainer title={t.title} subtitle="Freelance Economy Analytics" onReset={() => setIncome(3000000)}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-lg mx-auto">{t.desc}</p>
                
                <div className="w-full max-w-sm mx-auto space-y-4">
                    <label className="text-[10px] font-black text-muted-foreground uppercase">{t.income}</label>
                    <input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} className="w-full p-6 bg-muted/30 rounded-[32px] border border-border font-black text-2xl text-center outline-none focus:ring-4 focus:ring-primary/10" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 bg-foreground rounded-[40px] text-background space-y-2 text-center shadow-xl">
                        <p className="text-[10px] font-black text-background/60 uppercase tracking-widest">{t.net}</p>
                        <h2 className="text-3xl font-black text-primary">₩{Math.round(netPay).toLocaleString()}</h2>
                        <p className="text-[10px] text-background/60">-{t.tax33}: ₩{Math.round(tax33).toLocaleString()}</p>
                    </div>
                    <div className="p-8 bg-success/10 border border-success/20 rounded-[40px] space-y-2 text-center">
                        <p className="text-[10px] font-black text-success uppercase tracking-widest">{locale === 'ko' ? '5월 정산 예상' : 'May Settlement'}</p>
                        <h2 className={`text-3xl font-black ${settlement > 0 ? 'text-destructive' : 'text-success'}`}>
                            {settlement > 0 ? `+₩${Math.round(settlement).toLocaleString()}` : `환급 ₩${Math.round(Math.abs(settlement)).toLocaleString()}`}
                        </h2>
                        <p className="text-[10px] text-muted-foreground">{settlement > 0 ? '추가 납부 필요' : '환급 예상'}</p>
                    </div>
                </div>

                <p className="text-[10px] text-center text-muted-foreground italic leading-relaxed">{t.desc2}</p>
            </div>
        </GameContainer>
    );
};

export default FreelancerTaxCalculator;
