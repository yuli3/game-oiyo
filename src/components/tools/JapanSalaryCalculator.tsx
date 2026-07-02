import React, { useState } from 'react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';

interface Props {
    locale?: 'ja' | 'en';
}

const labels = {
    ja: {
        title: '日本の給与手取り計算機 2024',
        desc: '所得税・社会保険・住民税を自動計算します（令和6年度）。',
        annualSalary: '年収（円）',
        age40plus: '40歳以上（介護保険の対象）',
        monthlyGross: '月額総支給',
        monthlyNet: '月額手取り',
        annualNet: '年間手取り',
        deductions: '月額控除内訳',
        healthInsurance: '健康保険 (4.985%)',
        longTermCare: '介護保険 (0.91%)',
        pension: '厚生年金 (9.15%)',
        employment: '雇用保険 (0.6%)',
        incomeTax: '所得税（復興税込み）',
        residentTax: '住民税（概算）',
        totalDeduction: '合計控除額',
        note: '※ 所得税は協会けんぽ平均保険料・令和6年度税率をもとにした概算です。実際の納税額は確定申告等で確定します。住民税は前年所得をもとに課税されるため、1年遅れで変動します。',
    },
    en: {
        title: 'Japan Salary Calculator 2024',
        desc: 'Automatically calculate income tax, social insurance, and resident tax (FY2024).',
        annualSalary: 'Annual Salary (¥)',
        age40plus: 'Age 40+ (Long-term care insurance applies)',
        monthlyGross: 'Monthly Gross',
        monthlyNet: 'Monthly Net',
        annualNet: 'Annual Net',
        deductions: 'Monthly Deductions',
        healthInsurance: 'Health Insurance (4.985%)',
        longTermCare: 'Long-term Care Ins. (0.91%)',
        pension: "Employee's Pension (9.15%)",
        employment: 'Employment Insurance (0.6%)',
        incomeTax: 'Income Tax (incl. reconstruction surtax)',
        residentTax: 'Resident Tax (estimate)',
        totalDeduction: 'Total Deductions',
        note: '* Income tax is an estimate based on Kyokai Kenpo average premiums and FY2024 tax rates. Resident tax is based on prior-year income and lags by one year.',
    },
} as const;

/** 給与所得控除 (令和6年度) */
function calcEmploymentIncomeDeduction(annual: number): number {
    if (annual <= 1_625_000) return 550_000;
    if (annual <= 1_800_000) return Math.floor(annual * 0.4 - 100_000);
    if (annual <= 3_600_000) return Math.floor(annual * 0.3 + 80_000);
    if (annual <= 6_600_000) return Math.floor(annual * 0.2 + 440_000);
    if (annual <= 8_500_000) return Math.floor(annual * 0.1 + 1_100_000);
    return 1_950_000;
}

/** 所得税額（基礎控除48万円込み）*/
function calcIncomeTax(taxableIncome: number): number {
    if (taxableIncome <= 0) return 0;
    let base = 0;
    if (taxableIncome <= 1_950_000) {
        base = Math.floor(taxableIncome * 0.05);
    } else if (taxableIncome <= 3_300_000) {
        base = Math.floor(taxableIncome * 0.1 - 97_500);
    } else if (taxableIncome <= 6_950_000) {
        base = Math.floor(taxableIncome * 0.2 - 427_500);
    } else if (taxableIncome <= 9_000_000) {
        base = Math.floor(taxableIncome * 0.23 - 636_000);
    } else if (taxableIncome <= 18_000_000) {
        base = Math.floor(taxableIncome * 0.33 - 1_536_000);
    } else if (taxableIncome <= 40_000_000) {
        base = Math.floor(taxableIncome * 0.4 - 2_796_000);
    } else {
        base = Math.floor(taxableIncome * 0.45 - 4_796_000);
    }
    // 復興特別所得税: 2.1%
    return Math.floor(base * 1.021);
}

const JapanSalaryCalculator: React.FC<Props> = ({ locale = 'ja' }) => {
    const t = labels[locale === 'ja' ? 'ja' : 'en'];

    const [annualSalary, setAnnualSalary] = useState(5_000_000);
    const [age40plus, setAge40plus] = useState(false);

    const monthlyGross = Math.floor(annualSalary / 12);

    // 社会保険料（協会けんぽ平均、月額標準報酬 = 月額総支給で近似）
    const healthIns = Math.floor(monthlyGross * 0.04985);
    const longTermCareIns = age40plus ? Math.floor(monthlyGross * 0.0091) : 0;
    const pensionIns = Math.floor(monthlyGross * 0.0915);
    const employmentIns = Math.floor(monthlyGross * 0.006);

    const annualSocialIns = (healthIns + longTermCareIns + pensionIns + employmentIns) * 12;

    // 給与所得控除
    const employmentDeduction = calcEmploymentIncomeDeduction(annualSalary);

    // 基礎控除（所得2400万円以下）
    const basicDeduction = annualSalary <= 24_000_000 ? 480_000 : 0;

    // 課税所得 = 年収 - 給与所得控除 - 社会保険料 - 基礎控除
    const taxableIncome = Math.max(0, annualSalary - employmentDeduction - annualSocialIns - basicDeduction);

    // 所得税（月割り）
    const annualIncomeTax = calcIncomeTax(taxableIncome);
    const monthlyIncomeTax = Math.floor(annualIncomeTax / 12);

    // 住民税: 10% + 均等割5,000円/年
    const annualResidentTax = Math.floor(taxableIncome * 0.1) + 5_000;
    const monthlyResidentTax = Math.floor(annualResidentTax / 12);

    const totalMonthlyDeduction =
        healthIns + longTermCareIns + pensionIns + employmentIns + monthlyIncomeTax + monthlyResidentTax;

    const monthlyNet = Math.max(0, monthlyGross - totalMonthlyDeduction);
    const annualNet = monthlyNet * 12;

    const fmt = (n: number) => n.toLocaleString('ja-JP');
    const fmtMan = (n: number) => {
        const man = Math.floor(n / 10_000);
        return man > 0 ? `${man.toLocaleString('ja-JP')}万${(n % 10_000).toLocaleString('ja-JP')}円` : `${n.toLocaleString('ja-JP')}円`;
    };

    const handleReset = () => {
        setAnnualSalary(5_000_000);
        setAge40plus(false);
    };

    const deductionRows = [
        { label: t.healthInsurance, value: healthIns },
        ...(age40plus ? [{ label: t.longTermCare, value: longTermCareIns }] : []),
        { label: t.pension, value: pensionIns },
        { label: t.employment, value: employmentIns },
        { label: t.incomeTax, value: monthlyIncomeTax },
        { label: t.residentTax, value: monthlyResidentTax },
    ];

    return (
        <GameContainer title={t.title} subtitle="Net Pay Estimator — Japan 2024" onReset={handleReset}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.annualSalary}</label>
                        <input
                            type="number"
                            value={annualSalary}
                            onChange={(e) => setAnnualSalary(Math.max(0, Number(e.target.value)))}
                            step={100_000}
                            min={0}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-success/30"
                            aria-label={t.annualSalary}
                        />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={age40plus}
                            onChange={(e) => setAge40plus(e.target.checked)}
                            className="w-4 h-4 rounded accent-success"
                            aria-label={t.age40plus}
                        />
                        <span className="text-sm font-medium text-foreground">{t.age40plus}</span>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-success/10 border border-success/30 p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-success uppercase tracking-wide">{t.monthlyGross}</span>
                        <span className="text-2xl font-bold text-success">¥{fmt(monthlyGross)}</span>
                    </div>
                    <div className="rounded-2xl bg-success p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-success uppercase tracking-wide">{t.monthlyNet}</span>
                        <span className="text-2xl font-bold text-white">¥{fmt(monthlyNet)}</span>
                    </div>
                    <div className="rounded-2xl bg-success/10 border border-success/30 p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-success uppercase tracking-wide">{t.annualNet}</span>
                        <span className="text-xl font-bold text-success">{fmtMan(annualNet)}</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col gap-3">
                    <h4 className="text-sm font-bold text-foreground">{t.deductions}</h4>
                    <div className="flex flex-col gap-2">
                        {deductionRows.map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">{label}</span>
                                <span className="font-bold text-foreground">¥{fmt(value)}</span>
                            </div>
                        ))}
                        <div className="border-t border-border mt-2 pt-2 flex justify-between items-center">
                            <span className="text-sm font-bold text-foreground">{t.totalDeduction}</span>
                            <span className="text-sm font-bold text-destructive">¥{fmt(totalMonthlyDeduction)}</span>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">{t.note}</p>
            </div>
        </GameContainer>
    );
};

export default JapanSalaryCalculator;
