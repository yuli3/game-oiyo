import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const SalaryCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: {
            title: "연봉 실수령액 계산기",
            desc: "세금과 4대보험 공제 후 실제 수령액을 계산합니다.",
            annualSalary: "연봉 (원)",
            calcBtn: "계산하기",
            monthlyGross: "월 세전 급여",
            monthlyNet: "월 실수령액",
            annualNet: "연 실수령액",
            deductions: "월 공제 내역",
            nationalPension: "국민연금 (4.5%)",
            healthInsurance: "건강보험 (3.545%)",
            longTermCare: "장기요양 (0.4591%)",
            employmentInsurance: "고용보험 (0.9%)",
            incomeTax: "근로소득세",
            localTax: "지방소득세",
            totalDeduction: "총 공제액",
            note: "* 근로소득세는 간이세액표 기준 추정치입니다. 실제 납부액은 연말정산 후 확정됩니다.",
        },
        en: {
            title: "Salary Net Pay Calculator",
            desc: "Calculate your actual take-home pay after taxes and social insurance deductions.",
            annualSalary: "Annual Salary (KRW)",
            calcBtn: "Calculate",
            monthlyGross: "Monthly Gross",
            monthlyNet: "Monthly Net Pay",
            annualNet: "Annual Net Pay",
            deductions: "Monthly Deductions",
            nationalPension: "National Pension (4.5%)",
            healthInsurance: "Health Insurance (3.545%)",
            longTermCare: "Long-term Care (0.4591%)",
            employmentInsurance: "Employment Insurance (0.9%)",
            incomeTax: "Income Tax",
            localTax: "Local Income Tax",
            totalDeduction: "Total Deductions",
            note: "* Income tax is estimated based on simplified withholding table. Actual amount is finalized after year-end settlement.",
        },
    }[locale === 'ko' ? 'ko' : 'en'];

    const [annualSalary, setAnnualSalary] = useState(40000000);

    const monthlyGross = annualSalary / 12;

    // 4대보험 (employee portion)
    const nationalPension = Math.floor(monthlyGross * 0.045);
    const healthInsurance = Math.floor(monthlyGross * 0.03545);
    const longTermCare = Math.floor(healthInsurance * 0.1295); // 12.95% of health insurance premium
    const employmentInsurance = Math.floor(monthlyGross * 0.009);

    // Income tax — simplified progressive bracket on annual basis
    const calcIncomeTax = (annual: number): number => {
        // Simplified: deduct 4대보험 annual from gross first
        const annualInsurance = (nationalPension + healthInsurance + longTermCare + employmentInsurance) * 12;
        const taxableIncome = Math.max(0, annual - annualInsurance - 1500000); // 근로소득공제 simplified

        if (taxableIncome <= 12000000) return Math.floor((taxableIncome * 0.06) / 12);
        if (taxableIncome <= 46000000) return Math.floor(((720000 + (taxableIncome - 12000000) * 0.15)) / 12);
        if (taxableIncome <= 88000000) return Math.floor(((5820000 + (taxableIncome - 46000000) * 0.24)) / 12);
        if (taxableIncome <= 150000000) return Math.floor(((15900000 + (taxableIncome - 88000000) * 0.35)) / 12);
        return Math.floor(((37600000 + (taxableIncome - 150000000) * 0.38)) / 12);
    };

    const monthlyIncomeTax = calcIncomeTax(annualSalary);
    const monthlyLocalTax = Math.floor(monthlyIncomeTax * 0.1);

    const totalMonthlyDeduction = nationalPension + healthInsurance + longTermCare + employmentInsurance + monthlyIncomeTax + monthlyLocalTax;
    const monthlyNet = Math.floor(monthlyGross - totalMonthlyDeduction);
    const annualNet = monthlyNet * 12;

    const fmt = (n: number) => n.toLocaleString('ko-KR');

    const handleReset = () => setAnnualSalary(40000000);

    return (
        <GameContainer title={t.title} subtitle="Net Pay Estimator" onReset={handleReset}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>

                <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold text-foreground">{t.annualSalary}</label>
                    <input
                        type="number"
                        value={annualSalary}
                        onChange={(e) => setAnnualSalary(Math.max(0, Number(e.target.value)))}
                        step={1000000}
                        min={0}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-success/30"
                        aria-label={t.annualSalary}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-success/10 border border-success/30 p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-success uppercase tracking-wide">{t.monthlyGross}</span>
                        <span className="text-2xl font-bold text-success">₩{fmt(Math.floor(monthlyGross))}</span>
                    </div>
                    <div className="rounded-2xl bg-success p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-success uppercase tracking-wide">{t.monthlyNet}</span>
                        <span className="text-2xl font-bold text-white">₩{fmt(monthlyNet)}</span>
                    </div>
                    <div className="rounded-2xl bg-success/10 border border-success/30 p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-success uppercase tracking-wide">{t.annualNet}</span>
                        <span className="text-2xl font-bold text-success">₩{fmt(annualNet)}</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col gap-3">
                    <h4 className="text-sm font-bold text-foreground">{t.deductions}</h4>
                    <div className="flex flex-col gap-2">
                        {[
                            { label: t.nationalPension, value: nationalPension },
                            { label: t.healthInsurance, value: healthInsurance },
                            { label: t.longTermCare, value: longTermCare },
                            { label: t.employmentInsurance, value: employmentInsurance },
                            { label: t.incomeTax, value: monthlyIncomeTax },
                            { label: t.localTax, value: monthlyLocalTax },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">{label}</span>
                                <span className="font-bold text-foreground">₩{fmt(value)}</span>
                            </div>
                        ))}
                        <div className="border-t border-border mt-2 pt-2 flex justify-between items-center">
                            <span className="text-sm font-bold text-foreground">{t.totalDeduction}</span>
                            <span className="text-sm font-bold text-destructive">₩{fmt(totalMonthlyDeduction)}</span>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">{t.note}</p>
            </div>
        </GameContainer>
    );
};

export default SalaryCalculator;
