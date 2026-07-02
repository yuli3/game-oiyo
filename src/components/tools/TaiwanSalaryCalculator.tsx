import React, { useState } from 'react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';

interface Props {
    locale?: 'zh' | 'en';
}

const labels = {
    zh: {
        title: '台湾薪资试算表 2024',
        desc: '输入月薪，试算劳保、健保及所得税后实际到手金额（2024年费率）。',
        monthlyGross: '月薪税前（新台币）',
        dependents: '扶养人数（含本人）',
        cardGross: '月薪税前',
        cardNet: '月薪税后到手',
        cardAnnual: '年薪到手（估算）',
        deductions: '月扣款明细',
        laborIns: '劳保费（员工自付 2.508%）',
        nhiIns: '健保费（员工自付 1.551%）',
        totalIns: '保费合计',
        incomeTax: '所得税（月估算）',
        note: '* 劳保投保薪资上限45,800元，健保上限219,500元。所得税以年度综合所得税试算（含标准扣除额12.4万、薪资特扣额20.7万及免税额9.2万/人）。',
    },
    en: {
        title: 'Taiwan Salary Calculator 2024',
        desc: 'Enter monthly salary to estimate take-home pay after labor insurance, NHI, and income tax (2024 rates).',
        monthlyGross: 'Monthly Gross Salary (NTD)',
        dependents: 'Dependents (including yourself)',
        cardGross: 'Monthly Gross',
        cardNet: 'Monthly Net',
        cardAnnual: 'Annual Net (estimate)',
        deductions: 'Monthly deductions',
        laborIns: 'Labor Insurance (employee 2.508%)',
        nhiIns: 'NHI (employee 1.551%)',
        totalIns: 'Total insurance',
        incomeTax: 'Income tax (monthly estimate)',
        note: '* Labor insurance cap: 45,800 NTD; NHI cap: 219,500 NTD. Income tax estimated via annual comprehensive income calculation (standard deduction 124,000 + salary deduction 207,000 + personal exemption 92,000/person).',
    },
} as const;

// Labor Insurance: employee pays 20% of 12.54% = 2.508%, capped at 45,800 NTD/month
const LI_CAP = 45_800;
const LI_RATE = 0.02508;

// NHI: employee pays 30% of 5.17% = 1.551%, capped at 219,500 NTD/month
const NHI_CAP = 219_500;
const NHI_RATE = 0.01551;

// Income tax brackets 2024 (annual)
// Standard deduction (single/per household filing separately): 124,000
// Salary special deduction: 207,000
// Personal exemption: 92,000 per person
const STANDARD_DEDUCTION = 124_000;
const SALARY_DEDUCTION   = 207_000;
const PERSONAL_EXEMPTION = 92_000;

function calcAnnualTax(annualGross: number, dependents: number): number {
    const totalDeduction =
        STANDARD_DEDUCTION +
        SALARY_DEDUCTION +
        PERSONAL_EXEMPTION * dependents;

    const taxableIncome = Math.max(0, annualGross - totalDeduction);

    const brackets: [number, number][] = [
        [560_000, 0.05],
        [1_260_000 - 560_000, 0.12],
        [2_520_000 - 1_260_000, 0.20],
        [4_720_000 - 2_520_000, 0.30],
    ];

    let tax = 0;
    let remaining = taxableIncome;
    for (const [limit, rate] of brackets) {
        if (remaining <= 0) break;
        const taxable = Math.min(remaining, limit);
        tax += taxable * rate;
        remaining -= taxable;
    }
    if (remaining > 0) tax += remaining * 0.40;

    return Math.round(Math.max(0, tax));
}

const TaiwanSalaryCalculator: React.FC<Props> = ({ locale = 'zh' }) => {
    const t = labels[locale === 'en' ? 'en' : 'zh'];

    const [monthlyGross, setMonthlyGross] = useState(50_000);
    const [dependents, setDependents] = useState(1);

    // Labor Insurance
    const liBase = Math.min(monthlyGross, LI_CAP);
    const laborIns = Math.round(liBase * LI_RATE);

    // NHI
    const nhiBase = Math.min(monthlyGross, NHI_CAP);
    const nhiIns = Math.round(nhiBase * NHI_RATE);

    const totalIns = laborIns + nhiIns;

    // Income tax (annual estimate, divided monthly)
    const annualTax    = calcAnnualTax(monthlyGross * 12, dependents);
    const monthlyTax   = Math.round(annualTax / 12);

    const monthlyNet = Math.max(0, monthlyGross - totalIns - monthlyTax);
    const annualNet  = monthlyNet * 12;

    const fmt = (n: number) => `NT$${n.toLocaleString('zh-TW')}`;

    const handleReset = () => {
        setMonthlyGross(50_000);
        setDependents(1);
    };

    return (
        <GameContainer title={t.title} subtitle="Net Pay Estimator — Taiwan 2024" onReset={handleReset}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.monthlyGross}</label>
                        <input
                            type="number"
                            value={monthlyGross}
                            onChange={(e) => setMonthlyGross(Math.max(0, Number(e.target.value)))}
                            step={5_000}
                            min={0}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-info/30"
                            aria-label={t.monthlyGross}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.dependents}</label>
                        <input
                            type="number"
                            value={dependents}
                            onChange={(e) => setDependents(Math.max(1, Math.min(10, Number(e.target.value))))}
                            step={1}
                            min={1}
                            max={10}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-info/30"
                            aria-label={t.dependents}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-info/10 border border-info/30 p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-info uppercase tracking-wide">{t.cardGross}</span>
                        <span className="text-2xl font-bold text-info">{fmt(monthlyGross)}</span>
                    </div>
                    <div className="rounded-2xl bg-info p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-info uppercase tracking-wide">{t.cardNet}</span>
                        <span className="text-2xl font-bold text-white">{fmt(monthlyNet)}</span>
                    </div>
                    <div className="rounded-2xl bg-info/10 border border-info/30 p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-info uppercase tracking-wide">{t.cardAnnual}</span>
                        <span className="text-2xl font-bold text-info">{fmt(annualNet)}</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col gap-3">
                    <h4 className="text-sm font-bold text-foreground">{t.deductions}</h4>
                    <div className="flex flex-col gap-2">
                        {[
                            { label: t.laborIns, value: laborIns },
                            { label: t.nhiIns,   value: nhiIns },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">{label}</span>
                                <span className="font-bold text-foreground">{fmt(value)}</span>
                            </div>
                        ))}
                        <div className="border-t border-border mt-2 pt-2 flex justify-between items-center">
                            <span className="text-sm font-bold text-foreground">{t.totalIns}</span>
                            <span className="text-sm font-bold text-destructive">{fmt(totalIns)}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm border-t border-border pt-2">
                        <span className="font-bold text-foreground">{t.incomeTax}</span>
                        <span className="font-bold text-destructive">{fmt(monthlyTax)}</span>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">{t.note}</p>
            </div>
        </GameContainer>
    );
};

export default TaiwanSalaryCalculator;
