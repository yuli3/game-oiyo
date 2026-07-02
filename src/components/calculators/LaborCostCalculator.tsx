'use client';

import React, { useState } from 'react';

// 2024~2025 rates (employer portion)
const RATES = {
  pension: 0.045,        // 국민연금 4.5%
  health: 0.03545,       // 건강보험 3.545%
  longTermCareRatio: 0.1295, // 장기요양 (건보의 12.95%)
  employment: 0.009,     // 고용보험 0.9%
  workComp: 0.015,       // 산재보험 평균 1.5%
  pensionMaxBase: 6170000,
  pensionMinBase: 370000,
};

const ko = {
  title: '인건비 계산기 (4대 보험 + 퇴직금)',
  salaryLabel: '월 급여 (세전)',
  foodLabel: '비과세 식대',
  foodNone: '없음',
  foodInclude: '포함 (20만원)',
  severanceLabel: '퇴직금 적립',
  severanceDesc: '월 급여의 약 8.33%',
  calculate: '계산하기',
  reset: '초기화',
  resultTitle: '월 실부담금 분석',
  salaryPaid: '① 월 급여 (지급액)',
  insurance4: '4대보험 사부담금 합계',
  pension: '국민연금 (4.5%)',
  health: '건강보험 (3.545%)',
  longTerm: '장기요양 (건보의 12.95%)',
  employment: '고용보험 (0.9%)',
  workComp: '산재보험 (1.5% 가정)',
  severance: '② 퇴직금 적립액 (예상)',
  totalCost: '직원 1명 월 실제 비용',
  overhead: (pct: string) => `월급 대비 약 ${pct}% 추가 비용`,
  disclaimer: '* 2024~2025년 기준 추정치입니다. 산재보험은 업종마다 다르며, 실제 비용은 달라질 수 있습니다.',
};

const en = {
  title: 'Labor Cost Calculator (4 Insurances + Severance)',
  salaryLabel: 'Monthly Salary (gross)',
  foodLabel: 'Meal allowance (non-taxable)',
  foodNone: 'None',
  foodInclude: 'Include (₩200,000)',
  severanceLabel: 'Severance accrual',
  severanceDesc: '~8.33% of monthly salary',
  calculate: 'Calculate',
  reset: 'Reset',
  resultTitle: 'Monthly Employer Cost Breakdown',
  salaryPaid: '① Salary Paid',
  insurance4: 'Total 4 Insurances (employer)',
  pension: 'NPS (4.5%)',
  health: 'Health Ins. (3.545%)',
  longTerm: 'LTC (12.95% of Health)',
  employment: 'Employment Ins. (0.9%)',
  workComp: "Worker's Comp (1.5% est.)",
  severance: '② Severance Accrual (est.)',
  totalCost: 'Total Monthly Cost per Employee',
  overhead: (pct: string) => `~${pct}% extra over salary`,
  disclaimer: '* Estimated based on 2024~2025 rates. Industrial accident rates vary by sector.',
};

interface LaborResult {
  pension: number;
  health: number;
  longTerm: number;
  employment: number;
  workComp: number;
  insuranceTotal: number;
  severance: number;
  totalCost: number;
}

const LaborCostCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = locale === 'ko' ? ko : en;

  const [salary, setSalary] = useState<string>('3000000');
  const [foodAllowance, setFoodAllowance] = useState<number>(200000);
  const [includeSeverance, setIncludeSeverance] = useState<boolean>(true);
  const [result, setResult] = useState<LaborResult | null>(null);

  const fmt = (n: number) =>
    Math.floor(n).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US') + (locale === 'ko' ? '원' : '');

  const calculate = () => {
    const monthlySalary = Number(salary);
    if (!monthlySalary || monthlySalary <= 0) return;

    const taxableIncome = Math.max(0, monthlySalary - foodAllowance);
    const pensionBase = Math.min(RATES.pensionMaxBase, Math.max(RATES.pensionMinBase, taxableIncome));

    const p = Math.floor(pensionBase * RATES.pension);
    const h = Math.floor(taxableIncome * RATES.health);
    const l = Math.floor(h * RATES.longTermCareRatio);
    const e = Math.floor(taxableIncome * RATES.employment);
    const w = Math.floor(taxableIncome * RATES.workComp);
    const insuranceTotal = p + h + l + e + w;
    const s = includeSeverance ? Math.floor(monthlySalary / 12) : 0;

    setResult({
      pension: p,
      health: h,
      longTerm: l,
      employment: e,
      workComp: w,
      insuranceTotal,
      severance: s,
      totalCost: monthlySalary + insuranceTotal + s,
    });
  };

  const reset = () => {
    setSalary('3000000');
    setFoodAllowance(200000);
    setIncludeSeverance(true);
    setResult(null);
  };

  const monthlySalaryNum = Number(salary) || 0;

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-teal-900 mb-6">{t.title}</h3>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-teal-800">{t.salaryLabel}</label>
            <input
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-400 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-teal-800">{t.foodLabel}</label>
            <div className="flex gap-2">
              {[0, 200000].map((val) => (
                <button
                  key={val}
                  onClick={() => setFoodAllowance(val)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors border ${
                    foodAllowance === val
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50'
                  }`}
                >
                  {val === 0 ? t.foodNone : t.foodInclude}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white border border-teal-200 rounded-xl">
            <div>
              <p className="text-sm font-bold text-teal-800">{t.severanceLabel}</p>
              <p className="text-xs text-slate-500">{t.severanceDesc}</p>
            </div>
            <button
              onClick={() => setIncludeSeverance((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                includeSeverance ? 'bg-teal-600' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={includeSeverance}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  includeSeverance ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={calculate}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors"
            >
              {t.calculate}
            </button>
            <button
              onClick={reset}
              className="px-5 py-3 bg-white border border-teal-300 hover:bg-teal-50 text-teal-700 font-bold rounded-xl transition-colors"
            >
              {t.reset}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {result ? (
            <>
              <p className="text-sm font-bold text-teal-800">{t.resultTitle}</p>

              <div className="flex justify-between items-center py-2 border-b border-teal-100">
                <span className="text-sm font-bold text-slate-700">{t.salaryPaid}</span>
                <span className="font-bold">{fmt(monthlySalaryNum)}</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-700">{t.insurance4}</span>
                  <span className="font-bold text-teal-700">{fmt(result.insuranceTotal)}</span>
                </div>
                <div className="pl-4 space-y-1 bg-white rounded-xl p-3 border border-teal-100 text-xs">
                  {[
                    { label: t.pension, val: result.pension },
                    { label: t.health, val: result.health },
                    { label: t.longTerm, val: result.longTerm },
                    { label: t.employment, val: result.employment },
                    { label: t.workComp, val: result.workComp },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-slate-600">
                      <span>{row.label}</span>
                      <span>{fmt(row.val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {includeSeverance && (
                <div className="flex justify-between items-center py-2 border-b border-teal-100 text-amber-700">
                  <span className="text-sm font-bold">{t.severance}</span>
                  <span className="font-bold">{fmt(result.severance)}</span>
                </div>
              )}

              <div className="p-5 bg-teal-600 text-white rounded-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{t.totalCost}</p>
                <p className="text-3xl font-black">{fmt(result.totalCost)}</p>
                <p className="mt-1 text-sm opacity-80">
                  {t.overhead(((result.totalCost / monthlySalaryNum - 1) * 100).toFixed(1))}
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-teal-300">
              <p className="text-sm font-bold text-teal-400">
                {locale === 'ko' ? '급여를 입력하고 계산하세요' : 'Enter salary and calculate'}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">{t.disclaimer}</p>
    </div>
  );
};

export default LaborCostCalculator;
