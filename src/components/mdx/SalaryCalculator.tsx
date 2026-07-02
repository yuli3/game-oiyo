import React, { useState, useMemo } from 'react';

function fmt(n: number) {
  return Math.round(n).toLocaleString('ko-KR');
}

// 근로소득세 간이세액표 기반 산출 (2024년 기준)
// 단순 계산: 연간 세금 → 월 세금
// 소득세 산출은 근로소득공제 + 소득세 구간 적용
const INCOME_TAX_BRACKETS = [
  { limit: 14_000_000, rate: 0.06, prev: 0, prevTax: 0 },
  { limit: 50_000_000, rate: 0.15, prev: 14_000_000, prevTax: 840_000 },
  { limit: 88_000_000, rate: 0.24, prev: 50_000_000, prevTax: 6_240_000 },
  { limit: 150_000_000, rate: 0.35, prev: 88_000_000, prevTax: 15_360_000 },
  { limit: 300_000_000, rate: 0.38, prev: 150_000_000, prevTax: 37_060_000 },
  { limit: Infinity, rate: 0.40, prev: 300_000_000, prevTax: 94_060_000 },
];

function calcIncomeTax(taxable: number): number {
  if (taxable <= 0) return 0;
  for (const b of INCOME_TAX_BRACKETS) {
    if (taxable <= b.limit) {
      return b.prevTax + (taxable - b.prev) * b.rate;
    }
  }
  return 0;
}

// 근로소득공제 (소득세법 제47조)
function earnedIncomeDeduction(salary: number): number {
  if (salary <= 5_000_000) return salary * 0.7;
  if (salary <= 15_000_000) return 3_500_000 + (salary - 5_000_000) * 0.4;
  if (salary <= 45_000_000) return 7_500_000 + (salary - 15_000_000) * 0.15;
  if (salary <= 100_000_000) return 12_000_000 + (salary - 45_000_000) * 0.05;
  return 14_750_000;
}

export default function SalaryCalculator() {
  const [annualSalary, setAnnualSalary] = useState('');
  const [annualSalaryDisplay, setAnnualSalaryDisplay] = useState('');
  const [dependents, setDependents] = useState('1'); // 본인 포함

  const handleSalary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    setAnnualSalary(raw);
    const num = parseInt(raw) || 0;
    setAnnualSalaryDisplay(num > 0 ? num.toLocaleString('ko-KR') : raw);
  };

  const result = useMemo(() => {
    const total = parseInt(annualSalary) || 0;
    if (total <= 0) return null;

    const dep = Math.max(1, Math.min(10, parseInt(dependents) || 1));
    const monthly = total / 12;

    // 4대보험 (근로자 부담, 2024년 기준)
    const nationalPension = Math.min(monthly, 6_170_000) * 0.045; // 4.5%, 상한 617만
    const healthInsurance = monthly * 0.03545; // 3.545%
    const longTermCare = healthInsurance * 0.1295; // 건강보험료의 12.95%
    const employmentInsurance = monthly * 0.009; // 0.9%

    const totalInsurance = nationalPension + healthInsurance + longTermCare + employmentInsurance;

    // 소득세 계산 (연간)
    const deduction = earnedIncomeDeduction(total);
    const basicDeduction = 1_500_000 * dep; // 기본공제 1인당 150만
    const insuranceDeduction = totalInsurance * 12; // 4대보험 소득공제
    const taxable = Math.max(0, total - deduction - basicDeduction - insuranceDeduction);
    const annualIncomeTax = calcIncomeTax(taxable);
    const monthlyIncomeTax = annualIncomeTax / 12;
    const localTax = monthlyIncomeTax * 0.1; // 지방소득세 10%

    const totalDeductions = totalInsurance + monthlyIncomeTax + localTax;
    const netMonthly = monthly - totalDeductions;
    const netAnnual = netMonthly * 12;

    return {
      monthly: Math.round(monthly),
      nationalPension: Math.round(nationalPension),
      healthInsurance: Math.round(healthInsurance),
      longTermCare: Math.round(longTermCare),
      employmentInsurance: Math.round(employmentInsurance),
      incomeTax: Math.round(monthlyIncomeTax),
      localTax: Math.round(localTax),
      totalDeductions: Math.round(totalDeductions),
      netMonthly: Math.round(netMonthly),
      netAnnual: Math.round(netAnnual),
      effectiveRate: ((totalDeductions / monthly) * 100).toFixed(1),
    };
  }, [annualSalary, dependents]);

  return (
    <div className="not-prose my-8 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💼</span>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">연봉 실수령액 계산기</h3>
            <p className="text-violet-100 text-xs mt-0.5">4대보험·소득세·지방세 차감 후 월 실수령액</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Inputs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-foreground">
              연간 총급여 (원)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={annualSalaryDisplay}
                onChange={handleSalary}
                placeholder="예: 40,000,000"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-right font-mono font-semibold focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground/40 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">원</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 text-foreground">
              공제 대상 가족 수 (본인 포함)
            </label>
            <select
              value={dependents}
              onChange={(e) => setDependents(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-semibold focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-sm"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}명{n === 1 ? ' (본인만)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {/* Monthly breakdown */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-3 bg-muted/30 border-b border-border">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">월 급여 공제 내역</span>
              </div>
              <div className="divide-y divide-border">
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-sm text-muted-foreground">월 총급여</span>
                  <span className="font-mono font-bold">{fmt(result.monthly)} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-2.5">
                  <span className="text-sm text-muted-foreground">국민연금 (4.5%)</span>
                  <span className="font-mono text-red-600">- {fmt(result.nationalPension)} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-2.5">
                  <span className="text-sm text-muted-foreground">건강보험 (3.545%)</span>
                  <span className="font-mono text-red-600">- {fmt(result.healthInsurance)} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-2.5">
                  <span className="text-sm text-muted-foreground">장기요양보험 (건강보험료 × 12.95%)</span>
                  <span className="font-mono text-red-600">- {fmt(result.longTermCare)} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-2.5">
                  <span className="text-sm text-muted-foreground">고용보험 (0.9%)</span>
                  <span className="font-mono text-red-600">- {fmt(result.employmentInsurance)} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-2.5">
                  <span className="text-sm text-muted-foreground">소득세 (간이세액)</span>
                  <span className="font-mono text-red-600">- {fmt(result.incomeTax)} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-2.5">
                  <span className="text-sm text-muted-foreground">지방소득세 (소득세 × 10%)</span>
                  <span className="font-mono text-red-600">- {fmt(result.localTax)} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-3 bg-red-50/50">
                  <span className="text-sm font-semibold text-red-700">총 공제액 (실효세율 {result.effectiveRate}%)</span>
                  <span className="font-mono font-bold text-red-700">- {fmt(result.totalDeductions)} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-4 bg-violet-50/50">
                  <span className="text-sm font-bold text-violet-800">월 실수령액</span>
                  <span className="font-mono font-extrabold text-violet-700 text-xl">{fmt(result.netMonthly)} 원</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50/30 px-5 py-3.5 flex justify-between items-center">
              <span className="text-sm font-bold text-violet-800">연간 실수령액</span>
              <span className="font-mono font-extrabold text-violet-700 text-lg">{fmt(result.netAnnual)} 원</span>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          ※ 2024년 기준 간이세액표 적용. 실제 공제액은 근무 형태, 비과세 항목, 연말정산에 따라 다를 수 있습니다.
        </p>
      </div>
    </div>
  );
}
