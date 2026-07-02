import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

type Locale = 'ko' | 'en';

// 누진세율 (2024, 만원)
const KR_BRACKETS = [
  { min: 0,      max: 1400,    rate: 0.06, deduc: 0,    label: '6%'  },
  { min: 1400,   max: 5000,    rate: 0.15, deduc: 126,  label: '15%' },
  { min: 5000,   max: 8800,    rate: 0.24, deduc: 576,  label: '24%' },
  { min: 8800,   max: 15000,   rate: 0.35, deduc: 1544, label: '35%' },
  { min: 15000,  max: 30000,   rate: 0.38, deduc: 1994, label: '38%' },
  { min: 30000,  max: 50000,   rate: 0.40, deduc: 2594, label: '40%' },
  { min: 50000,  max: 100000,  rate: 0.42, deduc: 3594, label: '42%' },
  { min: 100000, max: Infinity, rate: 0.45, deduc: 6594, label: '45%' },
];

function progressiveTax(taxable: number): { tax: number; bracket: typeof KR_BRACKETS[0] } {
  if (taxable <= 0) return { tax: 0, bracket: KR_BRACKETS[0] };
  const b = KR_BRACKETS.find(b => taxable > b.min && taxable <= b.max) ?? KR_BRACKETS[KR_BRACKETS.length - 1];
  return { tax: Math.max(0, taxable * b.rate - b.deduc), bracket: b };
}

// 근로소득공제
function calcEmploymentDeduction(income: number): number {
  if (income <= 0)    return 0;
  if (income <= 500)  return income * 0.70;
  if (income <= 1500) return 350  + (income - 500)  * 0.40;
  if (income <= 4500) return 750  + (income - 1500) * 0.15;
  if (income <= 10000) return 1200 + (income - 4500) * 0.05;
  return 2000;
}

// 사업소득공제 (단순경비율 기준 근사치 — 계산기 목적상 단순화)
function calcBusinessDeduction(income: number): number {
  return income * 0.30; // rough 30% expense ratio for simplicity
}

const BRACKET_COLORS = [
  '#86efac', '#4ade80', '#22c55e', '#16a34a',
  '#15803d', '#166534', '#14532d', '#052e16',
];

const L: Record<Locale, {
  title: string; subtitle: string;
  employment: string; business: string; financial: string; other: string;
  employDeduction: string; businessDeduction: string;
  basicDeduction: string; totalDeductions: string;
  grossIncome: string; taxableIncome: string;
  incomeTax: string; localTax: string; totalTax: string;
  effectiveRate: string; marginalRate: string;
  bracketChart: string; won: string;
  note: string;
}> = {
  ko: {
    title: '종합소득세 간편 계산기',
    subtitle: 'Comprehensive Income Tax (Korea)',
    employment: '근로소득 (만원)',
    business: '사업소득 (만원)',
    financial: '금융소득 (이자+배당, 만원)',
    other: '기타소득 (만원)',
    employDeduction: '근로소득공제',
    businessDeduction: '사업소득공제 (단순경비)',
    basicDeduction: '기본공제 (본인 150만원)',
    totalDeductions: '총 공제액',
    grossIncome: '총 소득',
    taxableIncome: '과세표준',
    incomeTax: '소득세',
    localTax: '지방소득세 (10%)',
    totalTax: '총 세액',
    effectiveRate: '실효세율',
    marginalRate: '한계세율',
    bracketChart: '세율 구간별 세액',
    won: '만원',
    note: '근로소득공제·기본공제(본인 150만원)·사업소득 단순경비(30%) 적용 간편 계산기입니다. 실제 세액은 추가 공제·세액공제에 따라 달라지므로 세무사 상담을 권장합니다.',
  },
  en: {
    title: 'Comprehensive Income Tax Calculator',
    subtitle: 'Korea综합所得税 Simple Calculator',
    employment: 'Employment Income (₩10K)',
    business: 'Business Income (₩10K)',
    financial: 'Financial Income (interest+dividends, ₩10K)',
    other: 'Other Income (₩10K)',
    employDeduction: 'Employment Deduction',
    businessDeduction: 'Business Expense Deduction (30%)',
    basicDeduction: 'Basic Personal Deduction',
    totalDeductions: 'Total Deductions',
    grossIncome: 'Gross Income',
    taxableIncome: 'Taxable Income',
    incomeTax: 'Income Tax',
    localTax: 'Local Tax (10%)',
    totalTax: 'Total Tax',
    effectiveRate: 'Effective Rate',
    marginalRate: 'Marginal Rate',
    bracketChart: 'Tax by Bracket',
    won: '₩10K',
    note: 'Simplified calculation with employment deduction, basic deduction (₩1.5M), and 30% business expense deduction. Actual tax may differ due to additional credits.',
  },
};

function fmt(n: number) { return Math.round(n).toLocaleString(); }

const ComprehensiveIncomeTaxCalc: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
  const t = L[locale] ?? L.ko;

  const [employment, setEmployment] = useState(5000);
  const [business, setBusiness] = useState(0);
  const [financial, setFinancial] = useState(500);
  const [other, setOther] = useState(0);

  const result = useMemo(() => {
    const empDed = calcEmploymentDeduction(employment);
    const bizDed = calcBusinessDeduction(business);
    const basicDed = 150;

    const grossIncome = employment + business + financial + other;
    const totalDed = empDed + bizDed + basicDed;
    const taxableIncome = Math.max(0, grossIncome - totalDed);

    const { tax: incomeTax, bracket } = progressiveTax(taxableIncome);
    const localTax = incomeTax * 0.10;
    const totalTax = incomeTax + localTax;
    const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;

    // Build bracket breakdown for chart
    const chartData = KR_BRACKETS.map((b, i) => {
      const lower = b.min;
      const upper = Math.min(taxableIncome, b.max === Infinity ? taxableIncome : b.max);
      if (upper <= lower) return null;
      const rangeIncome = upper - lower;
      const tax = rangeIncome * b.rate;
      return { name: b.label, income: Math.round(rangeIncome), tax: Math.round(tax), fill: BRACKET_COLORS[i] };
    }).filter(Boolean) as { name: string; income: number; tax: number; fill: string }[];

    return { empDed, bizDed, basicDed, grossIncome, totalDed, taxableIncome, incomeTax, localTax, totalTax, effectiveRate, bracket, chartData };
  }, [employment, business, financial, other]);

  const inputFields = [
    { label: t.employment, value: employment, setter: setEmployment },
    { label: t.business, value: business, setter: setBusiness },
    { label: t.financial, value: financial, setter: setFinancial },
    { label: t.other, value: other, setter: setOther },
  ];

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Inputs */}
      <div className="space-y-3 mb-8">
        {inputFields.map(({ label, value, setter }) => (
          <div key={label} className="grid grid-cols-2 gap-3 items-center">
            <label className="text-xs font-bold">{label}</label>
            <input
              type="number" min={0} value={value}
              onChange={e => setter(Number(e.target.value))}
              className="px-4 py-2 rounded-xl border border-border bg-muted/20 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary text-right"
            />
          </div>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="col-span-3 sm:col-span-1 p-5 rounded-2xl bg-destructive/10 border border-destructive/30 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.totalTax}</p>
          <p className="text-2xl font-black text-destructive tabular-nums">{fmt(result.totalTax)}</p>
          <p className="text-[10px] text-muted-foreground">{t.won}</p>
        </div>
        <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.effectiveRate}</p>
          <p className="text-xl font-black text-destructive">{(result.effectiveRate * 100).toFixed(1)}%</p>
        </div>
        <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.marginalRate}</p>
          <p className="text-xl font-black">{result.bracket.label}</p>
        </div>
      </div>

      {/* Bracket chart */}
      {result.chartData.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{t.bracketChart}</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={result.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={((v: number) => [`${fmt(v)} ${t.won}`, '']) as any}
                contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', fontSize: '12px' }}
              />
              <Bar dataKey="tax" radius={[6, 6, 0, 0]} maxBarSize={80}>
                {result.chartData.map(entry => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Deduction trace */}
      <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2 mb-4">
        {[
          { label: t.grossIncome, value: result.grossIncome },
          { label: t.employDeduction, value: -result.empDed, skip: result.empDed === 0 },
          { label: t.businessDeduction, value: -result.bizDed, skip: result.bizDed === 0 },
          { label: t.basicDeduction, value: -result.basicDed },
        ].filter(r => !r.skip).map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm py-0.5 border-b border-border/30 last:border-0">
            <span className="text-muted-foreground text-xs">{label}</span>
            <span className={`tabular-nums text-xs font-bold ${value < 0 ? 'text-success' : ''}`}>
              {value < 0 ? '−' : ''}{fmt(Math.abs(value))} {t.won}
            </span>
          </div>
        ))}
        <div className="flex justify-between font-black text-sm pt-1 border-t border-border">
          <span>{t.taxableIncome}</span>
          <span className="tabular-nums">{fmt(result.taxableIncome)} {t.won}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground text-xs">{t.incomeTax}</span>
          <span className="tabular-nums text-xs font-bold">{fmt(result.incomeTax)} {t.won}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground text-xs">{t.localTax}</span>
          <span className="tabular-nums text-xs font-bold">{fmt(result.localTax)} {t.won}</span>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{t.note}</p>
    </div>
  );
};

export default ComprehensiveIncomeTaxCalc;
