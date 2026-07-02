import React, { useState } from 'react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';

interface Props {
    locale?: 'zh' | 'en';
}

const labels = {
    zh: {
        title: '中国个人所得税计算器 2024',
        desc: '输入月薪，即时计算五险一金及个人所得税（以上海/北京一般费率为参考）。',
        monthlyGross: '月薪税前（元）',
        cityNote: '城市',
        cityShanghai: '上海 / 北京（通用）',
        housingFund: '公积金费率',
        hf7: '7%（最低基准）',
        hf12: '12%（常见企业）',
        cardGross: '税前月薪',
        cardNet: '税后到手',
        cardAnnual: '年度到手（估算）',
        insurance: '五险一金月扣（员工部分）',
        pension: '养老保险 (8%)',
        medical: '医疗保险 (2%)',
        unemployment: '失业保险 (0.5%)',
        housing: '住房公积金',
        totalInsurance: '五险一金合计',
        taxableIncome: '应纳税所得额（月）',
        itMonthly: '个人所得税（月）',
        note: '* 以北京/上海2024年社保费率为基准，基数上限约36,549元/月。个税采用累进税率，年度汇算清缴时可能有退补税。',
    },
    en: {
        title: 'China Income Tax Calculator 2024',
        desc: 'Enter monthly salary to instantly calculate 五险一金 (social insurance) and personal income tax (using Shanghai/Beijing general rates).',
        monthlyGross: 'Monthly Gross Salary (CNY)',
        cityNote: 'City',
        cityShanghai: 'Shanghai / Beijing (general)',
        housingFund: 'Housing Fund Rate',
        hf7: '7% (minimum)',
        hf12: '12% (common)',
        cardGross: 'Monthly Gross',
        cardNet: 'Monthly Net',
        cardAnnual: 'Annual Net (estimate)',
        insurance: 'Social insurance deductions (employee)',
        pension: 'Pension Insurance (8%)',
        medical: 'Medical Insurance (2%)',
        unemployment: 'Unemployment Insurance (0.5%)',
        housing: 'Housing Provident Fund',
        totalInsurance: 'Total insurance',
        taxableIncome: 'Taxable income (monthly)',
        itMonthly: 'Income tax (monthly)',
        note: '* Based on Beijing/Shanghai 2024 social insurance rates with base cap ~36,549 CNY/month. IIT uses progressive rates; annual reconciliation may result in refund or additional payment.',
    },
} as const;

// Social insurance base cap (Shanghai/Beijing 2024 approx)
const SI_BASE_CAP = 36_549;
const SI_BASE_MIN = 5_975; // minimum base (approx 60% of average wage)

// Basic deduction: 5,000 CNY/month
const BASIC_DEDUCTION = 5_000;

// IIT brackets (综合所得 cumulative annual, using monthly quick-calc)
// Taxable = monthly gross - SI employee - 5000 basic deduction
// For monthly payroll withholding (累计预扣):
// We approximate with annual brackets / 12 for monthly display
function calcMonthlyIIT(annualTaxable: number): number {
    if (annualTaxable <= 0) return 0;
    const brackets: [number, number, number][] = [
        // [upper limit, rate, quick deduction]
        [36_000, 0.03, 0],
        [144_000, 0.10, 2_520],
        [300_000, 0.20, 16_920],
        [420_000, 0.25, 31_920],
        [660_000, 0.30, 52_920],
        [960_000, 0.35, 85_920],
        [Infinity, 0.45, 181_920],
    ];
    for (const [limit, rate, quickDed] of brackets) {
        if (annualTaxable <= limit) {
            return Math.max(0, Math.round(annualTaxable * rate - quickDed));
        }
    }
    return 0;
}

const ChinaSalaryCalculator: React.FC<Props> = ({ locale = 'zh' }) => {
    const t = labels[locale === 'en' ? 'en' : 'zh'];

    const [monthlyGross, setMonthlyGross] = useState(15_000);
    const [hfRate, setHfRate] = useState<0.07 | 0.12>(0.12);

    // Social insurance base (capped)
    const siBase = Math.max(SI_BASE_MIN, Math.min(monthlyGross, SI_BASE_CAP));

    const pension     = Math.round(siBase * 0.08);
    const medical     = Math.round(siBase * 0.02);
    const unemployment = Math.round(siBase * 0.005);
    const housing     = Math.round(siBase * hfRate);
    const totalSI     = pension + medical + unemployment + housing;

    // Taxable income: monthly - SI - basic deduction
    const monthlyTaxable = Math.max(0, monthlyGross - totalSI - BASIC_DEDUCTION);
    const annualTaxable  = monthlyTaxable * 12;
    const annualIIT      = calcMonthlyIIT(annualTaxable);
    const monthlyIIT     = Math.round(annualIIT / 12);

    const monthlyNet  = Math.max(0, monthlyGross - totalSI - monthlyIIT);
    const annualNet   = monthlyNet * 12;

    const fmt = (n: number) => `¥${n.toLocaleString('zh-CN')}`;

    const handleReset = () => {
        setMonthlyGross(15_000);
        setHfRate(0.12);
    };

    return (
        <GameContainer title={t.title} subtitle="Net Pay Estimator — China 2024" onReset={handleReset}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.monthlyGross}</label>
                        <input
                            type="number"
                            value={monthlyGross}
                            onChange={(e) => setMonthlyGross(Math.max(0, Number(e.target.value)))}
                            step={1_000}
                            min={0}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                            aria-label={t.monthlyGross}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.housingFund}</label>
                        <select
                            value={hfRate}
                            onChange={(e) => setHfRate(Number(e.target.value) as 0.07 | 0.12)}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                            aria-label={t.housingFund}
                        >
                            <option value={0.07}>{t.hf7}</option>
                            <option value={0.12}>{t.hf12}</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-destructive uppercase tracking-wide">{t.cardGross}</span>
                        <span className="text-2xl font-bold text-destructive">{fmt(monthlyGross)}</span>
                    </div>
                    <div className="rounded-2xl bg-destructive p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-destructive uppercase tracking-wide">{t.cardNet}</span>
                        <span className="text-2xl font-bold text-white">{fmt(monthlyNet)}</span>
                    </div>
                    <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-destructive uppercase tracking-wide">{t.cardAnnual}</span>
                        <span className="text-2xl font-bold text-destructive">{fmt(annualNet)}</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col gap-3">
                    <h4 className="text-sm font-bold text-foreground">{t.insurance}</h4>
                    <div className="flex flex-col gap-2">
                        {[
                            { label: t.pension,      value: pension },
                            { label: t.medical,      value: medical },
                            { label: t.unemployment, value: unemployment },
                            { label: `${t.housing} (${hfRate * 100}%)`, value: housing },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">{label}</span>
                                <span className="font-bold text-foreground">{fmt(value)}</span>
                            </div>
                        ))}
                        <div className="border-t border-border mt-2 pt-2 flex justify-between items-center">
                            <span className="text-sm font-bold text-foreground">{t.totalInsurance}</span>
                            <span className="text-sm font-bold text-destructive">{fmt(totalSI)}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-muted-foreground">{t.taxableIncome}</span>
                        <span className="font-bold text-foreground">{fmt(monthlyTaxable)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-border pt-2">
                        <span className="font-bold text-foreground">{t.itMonthly}</span>
                        <span className="font-bold text-destructive">{fmt(monthlyIIT)}</span>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">{t.note}</p>
            </div>
        </GameContainer>
    );
};

export default ChinaSalaryCalculator;
