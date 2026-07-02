import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';

type Locale = 'ko' | 'en';

// Korean 종합소득세 누진세율 (2024, 만원 단위)
const KR_BRACKETS = [
  { min: 0,      max: 1400,    rate: 0.06, deduc: 0     },
  { min: 1400,   max: 5000,    rate: 0.15, deduc: 126   },
  { min: 5000,   max: 8800,    rate: 0.24, deduc: 576   },
  { min: 8800,   max: 15000,   rate: 0.35, deduc: 1544  },
  { min: 15000,  max: 30000,   rate: 0.38, deduc: 1994  },
  { min: 30000,  max: 50000,   rate: 0.40, deduc: 2594  },
  { min: 50000,  max: 100000,  rate: 0.42, deduc: 3594  },
  { min: 100000, max: Infinity, rate: 0.45, deduc: 6594 },
];

// 근로소득공제 (만원)
function calcEmploymentDeduction(income: number): number {
  if (income <= 0)    return 0;
  if (income <= 500)  return income * 0.70;
  if (income <= 1500) return 350  + (income - 500)  * 0.40;
  if (income <= 4500) return 750  + (income - 1500) * 0.15;
  if (income <= 10000) return 1200 + (income - 4500) * 0.05;
  return 2000;
}

// 누진세액 계산 (과세표준 기준, 만원)
function progressiveTax(taxable: number): number {
  if (taxable <= 0) return 0;
  const b = KR_BRACKETS.find(b => taxable > b.min && taxable <= b.max) ?? KR_BRACKETS[KR_BRACKETS.length - 1];
  return Math.max(0, taxable * b.rate - b.deduc);
}

// 한계세율 구간 라벨
function marginalRate(taxable: number): string {
  const b = KR_BRACKETS.find(b => taxable > b.min && taxable <= b.max) ?? KR_BRACKETS[KR_BRACKETS.length - 1];
  return `${(b.rate * 100).toFixed(0)}%`;
}

const L: Record<Locale, {
  title: string; subtitle: string;
  financialIncome: string; employmentIncome: string; businessIncome: string;
  separate: string; comprehensive: string;
  separateTax: string; comprehensiveTax: string;
  separateRate: string; marginalRateLabel: string;
  verdict: string; verdictSep: string; verdictComp: string; verdictForced: string;
  threshold: string; overThreshold: string; underThreshold: string;
  taxComparison: string; won: string; diff: string;
  note: string; basicDeduction: string;
  empDeduction: string; taxableBase: string;
  localTax: string;
}> = {
  ko: {
    title: '분리과세 vs 종합과세 유불리 계산기',
    subtitle: 'Separate Tax vs. Comprehensive Tax Comparison',
    financialIncome: '금융소득 합계 (이자+배당, 만원)',
    employmentIncome: '근로소득 (만원)',
    businessIncome: '사업·기타소득 (만원)',
    separate: '분리과세',
    comprehensive: '종합과세',
    separateTax: '분리과세 세액',
    comprehensiveTax: '종합과세 추가세액',
    separateRate: '분리과세율 15.4%',
    marginalRateLabel: '금융소득 한계세율',
    verdict: '판정',
    verdictSep: '분리과세가 유리합니다',
    verdictComp: '종합과세가 유리합니다',
    verdictForced: '금융소득 2,000만원 이하: 분리과세 자동 적용 (선택 불가)',
    threshold: '2,000만원 기준',
    overThreshold: '금융소득이 2,000만원을 초과하므로 금융소득종합과세 의무 적용됩니다.',
    underThreshold: '금융소득이 2,000만원 이하이므로 분리과세(15.4%)가 자동 적용됩니다.',
    taxComparison: '세액 비교',
    won: '만원',
    diff: '차이',
    note: '근로소득공제, 기본공제(본인 150만원) 적용 기준입니다. 각종 추가공제·세액공제는 반영되지 않으므로 실제 세액은 세무사 상담을 권장합니다.',
    basicDeduction: '기본공제(본인)',
    empDeduction: '근로소득공제',
    taxableBase: '종합소득 과세표준',
    localTax: '지방소득세 포함',
  },
  en: {
    title: 'Separate vs. Comprehensive Tax Calculator',
    subtitle: 'Korea Financial Income Tax Comparison',
    financialIncome: 'Financial Income (interest+dividends, ₩10K)',
    employmentIncome: 'Employment Income (₩10K)',
    businessIncome: 'Business/Other Income (₩10K)',
    separate: 'Separate Tax',
    comprehensive: 'Comprehensive Tax',
    separateTax: 'Separate Tax Amount',
    comprehensiveTax: 'Comprehensive Tax (incremental)',
    separateRate: 'Flat Rate 15.4%',
    marginalRateLabel: 'Marginal Rate on Financial Income',
    verdict: 'Verdict',
    verdictSep: 'Separate taxation is more advantageous',
    verdictComp: 'Comprehensive taxation is more advantageous',
    verdictForced: 'Financial income ≤ ₩20M: separate tax automatically applies',
    threshold: '₩20M threshold',
    overThreshold: 'Financial income exceeds ₩20M — comprehensive taxation is mandatory.',
    underThreshold: 'Financial income is ≤ ₩20M — separate tax (15.4%) applies automatically.',
    taxComparison: 'Tax Comparison',
    won: '₩10K',
    diff: 'Difference',
    note: 'Includes employment income deduction and basic personal deduction (₩1.5M). Additional deductions/credits are not reflected.',
    basicDeduction: 'Basic Deduction',
    empDeduction: 'Employment Deduction',
    taxableBase: 'Taxable Income',
    localTax: 'incl. local tax',
  },
};

const THRESHOLD = 2000; // 2,000만원
const SEPARATE_RATE = 0.154; // 14% + 1.4% 지방세

function fmt(n: number) { return Math.round(n).toLocaleString(); }

const SeparateVsComprehensiveTaxCalc: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
  const t = L[locale] ?? L.ko;

  const [financialIncome, setFinancialIncome] = useState(3000);
  const [employmentIncome, setEmploymentIncome] = useState(5000);
  const [businessIncome, setBusinessIncome] = useState(0);

  const result = useMemo(() => {
    // 분리과세 세액
    const separateTax = financialIncome * SEPARATE_RATE;

    // 기타 종합소득 공제 계산
    const empDeduction = calcEmploymentDeduction(employmentIncome);
    const basicDeduction = 150; // 기본공제 본인
    const otherTaxable = Math.max(0, employmentIncome - empDeduction + businessIncome - basicDeduction);

    // 기타소득만의 종합소득세
    const taxOnOther = progressiveTax(otherTaxable) * 1.1; // 지방세 포함

    // 기타소득 + 금융소득 합산 종합소득세
    const totalTaxable = Math.max(0, otherTaxable + financialIncome);
    const taxOnTotal = progressiveTax(totalTaxable) * 1.1;

    // 금융소득에 대한 추가 종합세 (incremental)
    const comprehensiveTaxOnFinancial = taxOnTotal - taxOnOther;

    const isMandatorySeparate = financialIncome <= THRESHOLD;
    const separateSaves = separateTax < comprehensiveTaxOnFinancial;
    const saving = Math.abs(separateTax - comprehensiveTaxOnFinancial);

    const margRate = marginalRate(totalTaxable);

    const chartData = [
      { name: t.separate, tax: Math.round(separateTax), fill: '#3b82f6' },
      { name: t.comprehensive, tax: Math.round(comprehensiveTaxOnFinancial), fill: '#f97316' },
    ];

    return {
      separateTax,
      comprehensiveTaxOnFinancial,
      otherTaxable,
      totalTaxable,
      empDeduction,
      isMandatorySeparate,
      separateSaves,
      saving,
      margRate,
      chartData,
    };
  }, [financialIncome, employmentIncome, businessIncome, t.separate, t.comprehensive]);

  const inputFields = [
    { label: t.financialIncome, value: financialIncome, setter: setFinancialIncome, accent: true },
    { label: t.employmentIncome, value: employmentIncome, setter: setEmploymentIncome, accent: false },
    { label: t.businessIncome, value: businessIncome, setter: setBusinessIncome, accent: false },
  ];

  const favorable = result.isMandatorySeparate
    ? 'forced-separate'
    : result.separateSaves ? 'separate' : 'comprehensive';

  const verdictColor = favorable === 'comprehensive' ? 'text-warning' : 'text-info';
  const verdictBg = favorable === 'comprehensive'
    ? 'bg-warning/10 border-warning/30'
    : 'bg-info/10 border-info/30';

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Inputs */}
      <div className="space-y-3 mb-8">
        {inputFields.map(({ label, value, setter, accent }) => (
          <div key={label} className="grid grid-cols-2 gap-3 items-center">
            <label className={`text-xs font-bold ${accent ? 'text-primary' : 'text-foreground'}`}>{label}</label>
            <input
              type="number"
              min={0}
              value={value}
              onChange={e => setter(Number(e.target.value))}
              className="px-4 py-2 rounded-xl border border-border bg-muted/20 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary text-right"
            />
          </div>
        ))}
      </div>

      {/* Threshold notice */}
      <div className={`p-3 rounded-xl mb-6 text-xs font-medium border ${
        financialIncome <= THRESHOLD
          ? 'bg-success/10 border-success/30 text-success'
          : 'bg-destructive/10 border-destructive/30 text-destructive'
      }`}>
        <span className="font-black">{t.threshold}:</span>{' '}
        {financialIncome <= THRESHOLD ? t.underThreshold : t.overThreshold}
      </div>

      {/* Bar chart */}
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{t.taxComparison}</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={result.chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={((value: number) => [`${fmt(value)} ${t.won}`, '']) as any}
              contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', fontSize: '12px' }}
            />
            <Bar dataKey="tax" radius={[8, 8, 0, 0]} maxBarSize={100}>
              {result.chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="tax"
                position="top"
                formatter={((v: number) => `${fmt(v)} ${t.won}`) as any}
                style={{ fontSize: '11px', fontWeight: 800 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-info/10 border border-info/30">
          <p className="text-[9px] font-black uppercase tracking-widest text-info mb-1">{t.separateTax}</p>
          <p className="text-2xl font-black text-info tabular-nums">{fmt(result.separateTax)}</p>
          <p className="text-[10px] text-info">{t.separateRate} · {t.won}</p>
        </div>
        <div className="p-4 rounded-2xl bg-warning/10 border border-warning/30">
          <p className="text-[9px] font-black uppercase tracking-widest text-warning mb-1">{t.comprehensiveTax}</p>
          <p className="text-2xl font-black text-warning tabular-nums">{fmt(result.comprehensiveTaxOnFinancial)}</p>
          <p className="text-[10px] text-warning">{t.marginalRateLabel}: {result.margRate} · {t.won}</p>
        </div>
      </div>

      {/* Calculation trace */}
      <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2 mb-6 text-sm">
        {[
          { label: t.employmentIncome, value: employmentIncome },
          { label: t.empDeduction, value: -result.empDeduction },
          { label: t.basicDeduction, value: -150 },
          { label: `+ ${t.financialIncome}`, value: financialIncome },
          { label: t.taxableBase, value: result.totalTaxable },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between py-0.5 border-b border-border/30 last:border-0 last:font-black">
            <span className="text-muted-foreground text-xs">{label}</span>
            <span className="tabular-nums text-xs font-bold">{value >= 0 ? '' : '−'}{fmt(Math.abs(value))} {t.won}</span>
          </div>
        ))}
      </div>

      {/* Verdict */}
      <div className={`p-5 rounded-2xl border ${verdictBg}`}>
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">{t.verdict}</p>
        <p className={`text-lg font-black ${verdictColor}`}>
          {favorable === 'forced-separate'
            ? t.verdictForced
            : favorable === 'separate'
            ? `✓ ${t.verdictSep}`
            : `✓ ${t.verdictComp}`}
        </p>
        {favorable !== 'forced-separate' && (
          <p className="text-xs text-muted-foreground mt-1">
            {t.diff}: {fmt(result.saving)} {t.won}
          </p>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/60 leading-relaxed mt-4">{t.note}</p>
    </div>
  );
};

export default SeparateVsComprehensiveTaxCalc;
