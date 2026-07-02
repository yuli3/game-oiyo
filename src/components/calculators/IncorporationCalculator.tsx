'use client';

import React, { useState } from 'react';

interface IncorporationResult {
  indTaxBase: number;
  totalIndTax: number;
  corpTaxBase: number;
  corpTax: number;
  salaryTax: number;
  totalCorpSideTax: number;
  betterOption: 'corporation' | 'individual';
  diff: number;
  indEffective: number;
  corpEffective: number;
}

const ko = {
  title: '개인사업자 vs 법인 절세 계산기',
  revenueLabel: '연 매출액 (원)',
  expensesLabel: '연 비용 (원)',
  founderSalaryLabel: '법인 대표이사 급여 (연간, 원)',
  calculate: '계산하기',
  reset: '초기화',
  resultTitle: '세금 비교 결과',
  individual: '개인사업자',
  corporation: '법인',
  totalTax: '총 세금 부담',
  taxBase: '과세표준',
  effectiveRate: '실효세율',
  corpBetter: (amount: string) => `법인이 연 ${amount}원 절세 유리`,
  indBetter: (amount: string) => `개인사업자가 연 ${amount}원 절세 유리`,
  tip: '* 법인세+대표급여세 합산. 사회보험료, 회계·세무 비용 등은 미반영입니다.',
  entityTypesTitle: '법인 형태 안내',
  entities: [
    { title: '합명회사', desc: '무한책임사원만으로 구성. 개인과 유사한 책임 구조.' },
    { title: '합자회사', desc: '무한책임사원과 유한책임사원으로 구성.' },
    { title: '유한회사', desc: '사원 수 50인 이하, 소규모 폐쇄법인에 적합.' },
    { title: '주식회사', desc: '주식 발행 가능. 투자 유치 및 IPO에 유리한 일반적 형태.' },
  ],
  disclaimer: '* 2024년 세율 기준 추정치입니다. 실제 세금은 공제항목에 따라 다릅니다.',
};

const en = {
  title: 'Sole Proprietor vs Corporation Tax Calculator',
  revenueLabel: 'Annual Revenue (KRW)',
  expensesLabel: 'Annual Expenses (KRW)',
  founderSalaryLabel: "Founder's Annual Salary in Corp. (KRW)",
  calculate: 'Calculate',
  reset: 'Reset',
  resultTitle: 'Tax Comparison',
  individual: 'Sole Proprietor',
  corporation: 'Corporation',
  totalTax: 'Total Tax Burden',
  taxBase: 'Taxable Income',
  effectiveRate: 'Effective Rate',
  corpBetter: (amount: string) => `Corporation saves ${amount} KRW/yr`,
  indBetter: (amount: string) => `Sole proprietor saves ${amount} KRW/yr`,
  tip: '* Corp tax + founder salary tax combined. Social insurance, accounting fees not included.',
  entityTypesTitle: 'Corporate Entity Types',
  entities: [
    { title: 'General Partnership (합명회사)', desc: 'All partners have unlimited liability, similar to sole proprietorship.' },
    { title: 'Limited Partnership (합자회사)', desc: 'Has both unlimited and limited liability partners.' },
    { title: 'LLC (유한회사)', desc: 'Up to 50 members. Suitable for small closed corporations.' },
    { title: 'Stock Corp. (주식회사)', desc: 'Can issue shares. Best for investment and IPO.' },
  ],
  disclaimer: '* Estimated based on 2024 tax rates. Actual tax depends on deductions.',
};

// Korean income tax brackets (including 10% local income tax)
function calcIncomeTax(taxBase: number): number {
  let tax = 0;
  if (taxBase <= 14000000) tax = taxBase * 0.06;
  else if (taxBase <= 50000000) tax = taxBase * 0.15 - 1260000;
  else if (taxBase <= 88000000) tax = taxBase * 0.24 - 5760000;
  else if (taxBase <= 150000000) tax = taxBase * 0.35 - 15440000;
  else if (taxBase <= 300000000) tax = taxBase * 0.38 - 19940000;
  else if (taxBase <= 500000000) tax = taxBase * 0.40 - 25940000;
  else if (taxBase <= 1000000000) tax = taxBase * 0.42 - 35940000;
  else tax = taxBase * 0.45 - 65940000;
  return tax * 1.1; // +10% local income tax
}

function calcCorpTax(taxBase: number): number {
  let tax = 0;
  if (taxBase <= 200000000) tax = taxBase * 0.09;
  else if (taxBase <= 20000000000) tax = taxBase * 0.19 - 20000000;
  else tax = taxBase * 0.21 - 425000000;
  return tax * 1.1; // +10% local corporate tax
}

function calcSalaryDeduction(salary: number): number {
  let ded = 0;
  if (salary <= 5000000) ded = salary * 0.7;
  else if (salary <= 15000000) ded = 3500000 + (salary - 5000000) * 0.4;
  else if (salary <= 45000000) ded = 7500000 + (salary - 15000000) * 0.15;
  else if (salary <= 100000000) ded = 12000000 + (salary - 45000000) * 0.05;
  else ded = 14750000 + (salary - 100000000) * 0.02;
  return Math.min(ded, 20000000);
}

const IncorporationCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = locale === 'ko' ? ko : en;

  const [revenue, setRevenue] = useState<string>('300000000');
  const [expenses, setExpenses] = useState<string>('100000000');
  const [founderSalary, setFounderSalary] = useState<string>('60000000');
  const [result, setResult] = useState<IncorporationResult | null>(null);

  const fmt = (n: number) => Math.floor(Math.abs(n)).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US');

  const calculate = () => {
    const rev = Number(revenue) || 0;
    const exp = Number(expenses) || 0;
    const sal = Number(founderSalary) || 0;

    // Individual
    const indTaxBase = Math.max(0, rev - exp);
    const totalIndTax = Math.floor(calcIncomeTax(indTaxBase));

    // Corporation
    const corpTaxBase = Math.max(0, rev - exp - sal);
    const corpTaxRaw = Math.floor(calcCorpTax(corpTaxBase));

    const salaryDeduction = calcSalaryDeduction(sal);
    const salaryTaxBase = Math.max(0, sal - salaryDeduction - 1500000);
    const salaryTaxRaw = Math.floor(calcIncomeTax(salaryTaxBase));

    const totalCorpSideTax = corpTaxRaw + salaryTaxRaw;
    const diff = Math.abs(totalIndTax - totalCorpSideTax);
    const betterOption: 'corporation' | 'individual' =
      totalIndTax > totalCorpSideTax ? 'corporation' : 'individual';

    const indEffective = indTaxBase > 0 ? (totalIndTax / indTaxBase) * 100 : 0;
    const corpEffective = rev - exp > 0 ? (totalCorpSideTax / (rev - exp)) * 100 : 0;

    setResult({
      indTaxBase,
      totalIndTax,
      corpTaxBase,
      corpTax: corpTaxRaw,
      salaryTax: salaryTaxRaw,
      totalCorpSideTax,
      betterOption,
      diff: Math.floor(diff),
      indEffective,
      corpEffective,
    });
  };

  const reset = () => {
    setRevenue('300000000');
    setExpenses('100000000');
    setFounderSalary('60000000');
    setResult(null);
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-slate-900 mb-6">{t.title}</h3>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">{t.revenueLabel}</label>
            <input
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">{t.expensesLabel}</label>
            <input
              type="number"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">{t.founderSalaryLabel}</label>
            <input
              type="number"
              value={founderSalary}
              onChange={(e) => setFounderSalary(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={calculate}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors"
            >
              {t.calculate}
            </button>
            <button
              onClick={reset}
              className="px-5 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors"
            >
              {t.reset}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col justify-center space-y-4">
          {result ? (
            <>
              <div
                className={`p-5 rounded-2xl text-center ${
                  result.betterOption === 'corporation'
                    ? 'bg-blue-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                <p className="text-sm font-bold">
                  {result.betterOption === 'corporation'
                    ? t.corpBetter(fmt(result.diff))
                    : t.indBetter(fmt(result.diff))}
                </p>
              </div>

              {/* Individual */}
              <div className={`bg-white rounded-2xl border-2 p-4 space-y-2 ${result.betterOption === 'individual' ? 'border-rose-400' : 'border-slate-100'}`}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.individual}</p>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">{t.taxBase}</span>
                  <span className="text-xs font-bold">{fmt(result.indTaxBase)}{locale === 'ko' ? '원' : ''}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-slate-600">{t.totalTax}</span>
                  <span className="text-xl font-black text-slate-800">{fmt(result.totalIndTax)}{locale === 'ko' ? '원' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">{t.effectiveRate}</span>
                  <span className="text-xs font-bold text-rose-600">{result.indEffective.toFixed(1)}%</span>
                </div>
              </div>

              {/* Corporation */}
              <div className={`bg-white rounded-2xl border-2 p-4 space-y-2 ${result.betterOption === 'corporation' ? 'border-blue-400' : 'border-slate-100'}`}>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{t.corporation}</p>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">{t.taxBase}</span>
                  <span className="text-xs font-bold">{fmt(result.corpTaxBase)}{locale === 'ko' ? '원' : ''}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-slate-600">{t.totalTax}</span>
                  <span className="text-xl font-black text-blue-700">{fmt(result.totalCorpSideTax)}{locale === 'ko' ? '원' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">{t.effectiveRate}</span>
                  <span className="text-xs font-bold text-blue-600">{result.corpEffective.toFixed(1)}%</span>
                </div>
                <div className="text-xs text-slate-400 pl-2 space-y-0.5">
                  <div className="flex justify-between"><span>{locale === 'ko' ? '법인세' : 'Corp. tax'}</span><span>{fmt(result.corpTax)}</span></div>
                  <div className="flex justify-between"><span>{locale === 'ko' ? '대표 급여세' : 'Salary tax'}</span><span>{fmt(result.salaryTax)}</span></div>
                </div>
              </div>

              <p className="text-xs text-slate-400">{t.tip}</p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-200 rounded-2xl text-slate-300">
              <p className="text-sm font-bold text-slate-400">
                {locale === 'ko' ? '정보를 입력하고 계산하세요' : 'Enter info and calculate'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Entity types FAQ */}
      <div className="mt-6 p-5 bg-slate-100 rounded-2xl space-y-3">
        <p className="text-sm font-bold text-slate-700">{t.entityTypesTitle}</p>
        <div className="grid gap-3">
          {t.entities.map((e) => (
            <div key={e.title}>
              <p className="text-xs font-bold text-slate-600">{e.title}</p>
              <p className="text-xs text-slate-400">{e.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400 text-center">{t.disclaimer}</p>
    </div>
  );
};

export default IncorporationCalculator;
