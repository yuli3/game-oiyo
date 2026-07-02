import React, { useState, useMemo } from 'react';

function fmt(n: number) {
  return Math.round(n).toLocaleString('ko-KR');
}

export default function SeveranceCalculator() {
  const [monthlySalary, setMonthlySalary] = useState('');
  const [monthlySalaryDisplay, setMonthlySalaryDisplay] = useState('');
  const [bonus, setBonus] = useState('');
  const [bonusDisplay, setBonusDisplay] = useState('');
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('0');
  const [days, setDays] = useState('0');

  const handleSalary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    setMonthlySalary(raw);
    const n = parseInt(raw) || 0;
    setMonthlySalaryDisplay(n > 0 ? n.toLocaleString('ko-KR') : raw);
  };

  const handleBonus = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    setBonus(raw);
    const n = parseInt(raw) || 0;
    setBonusDisplay(n > 0 ? n.toLocaleString('ko-KR') : raw);
  };

  const result = useMemo(() => {
    const salary = parseInt(monthlySalary) || 0;
    if (salary <= 0) return null;

    const yearsNum = parseInt(years) || 0;
    const monthsNum = parseInt(months) || 0;
    const daysNum = parseInt(days) || 0;
    const annualBonus = parseInt(bonus) || 0;

    // 총 재직일수
    const totalDays = yearsNum * 365 + monthsNum * 30 + daysNum;
    if (totalDays < 365) return { tooShort: true };

    // 평균임금 계산 (퇴직 전 3개월 임금 / 해당 기간 일수)
    // 3개월 = 91.25일 (연평균)
    const threemonthDays = 91.25;
    // 3개월 기본급 + 연간 상여금의 3/12
    const threeMonthWage = salary * 3 + annualBonus * (3 / 12);
    const avgDailyWage = threeMonthWage / threemonthDays;

    // 퇴직금 = 평균임금 × 30일 × (재직일수 / 365)
    const severance = avgDailyWage * 30 * (totalDays / 365);

    // IRP 의무이전 (2022년 이후 300만 원 초과 시 IRP 계좌로만 수령)
    const mustIrp = severance > 3_000_000;

    // 퇴직소득세 (간이 계산 — 실제는 더 복잡)
    // 퇴직소득공제 후 과세
    // 단순화: 퇴직소득세 실효세율 0~6% 수준 (근속연수 공제로 크게 줄어듦)
    const workYears = Math.floor(totalDays / 365);
    // 근속연수공제 (근퇴법)
    let workYearDeduction = 0;
    if (workYears <= 5) workYearDeduction = workYears * 300_000;
    else if (workYears <= 10) workYearDeduction = 1_500_000 + (workYears - 5) * 500_000;
    else if (workYears <= 20) workYearDeduction = 4_000_000 + (workYears - 10) * 800_000;
    else workYearDeduction = 12_000_000 + (workYears - 20) * 1_200_000;

    const taxableRetirement = Math.max(0, severance - workYearDeduction);
    // 환산급여 = 과세퇴직소득 × 12 / 근속연수
    const annualizedIncome = workYears > 0 ? (taxableRetirement * 12) / workYears : 0;
    // 환산급여공제 (환산급여의 40~100%)
    let annualizedDeduction = 0;
    if (annualizedIncome <= 8_000_000) annualizedDeduction = annualizedIncome;
    else if (annualizedIncome <= 70_000_000) annualizedDeduction = 8_000_000 + (annualizedIncome - 8_000_000) * 0.60;
    else if (annualizedIncome <= 100_000_000) annualizedDeduction = 45_200_000 + (annualizedIncome - 70_000_000) * 0.55;
    else annualizedDeduction = 61_700_000 + (annualizedIncome - 100_000_000) * 0.45;

    const taxBase = Math.max(0, annualizedIncome - annualizedDeduction);
    // 세율 적용 후 환산 → 실제 세액
    let taxOnBase = 0;
    if (taxBase <= 14_000_000) taxOnBase = taxBase * 0.06;
    else if (taxBase <= 50_000_000) taxOnBase = 840_000 + (taxBase - 14_000_000) * 0.15;
    else if (taxBase <= 88_000_000) taxOnBase = 6_240_000 + (taxBase - 50_000_000) * 0.24;
    else taxOnBase = 15_360_000 + (taxBase - 88_000_000) * 0.35;

    const retirementTax = workYears > 0 ? Math.round((taxOnBase / 12) * workYears) : 0;
    const localTax = Math.round(retirementTax * 0.1);
    const totalTax = retirementTax + localTax;
    const netSeverance = Math.round(severance) - totalTax;

    return {
      tooShort: false,
      avgDailyWage: Math.round(avgDailyWage),
      severance: Math.round(severance),
      retirementTax,
      localTax,
      totalTax,
      netSeverance,
      mustIrp,
      workYears,
      totalDays,
    };
  }, [monthlySalary, bonus, years, months, days]);

  return (
    <div className="not-prose my-8 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-600 to-teal-500 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📋</span>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">퇴직금 계산기</h3>
            <p className="text-cyan-100 text-xs mt-0.5">평균임금 × 30일 × (재직일수/365) 공식 적용</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-foreground">월 통상임금 (원)</label>
            <div className="relative">
              <input type="text" inputMode="numeric"
                value={monthlySalaryDisplay} onChange={handleSalary}
                placeholder="예: 3,500,000"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-right font-mono font-semibold focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 placeholder:text-muted-foreground/40 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 text-foreground">연간 상여금 합계 (원)</label>
            <div className="relative">
              <input type="text" inputMode="numeric"
                value={bonusDisplay} onChange={handleBonus}
                placeholder="없으면 0"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-right font-mono font-semibold focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 placeholder:text-muted-foreground/40 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-foreground">재직 기간</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '년', value: years, setter: setYears, placeholder: '예: 5' },
              { label: '개월', value: months, setter: setMonths, placeholder: '0~11' },
              { label: '일', value: days, setter: setDays, placeholder: '0~30' },
            ].map((f) => (
              <div key={f.label} className="relative">
                <input type="number" min={0}
                  value={f.value} onChange={(e) => f.setter(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full rounded-xl border border-border bg-background px-3 py-3 pr-8 font-mono font-semibold focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-sm text-right"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {result && (
          result.tooShort ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-800 font-medium">
              ⚠️ 퇴직금은 계속근로기간 1년 이상인 경우에만 발생합니다. (근로기준법 제34조)
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  <div className="flex justify-between items-center px-5 py-3">
                    <span className="text-sm text-muted-foreground">재직 기간</span>
                    <span className="font-mono font-bold">{result.workYears}년 ({(result.totalDays ?? 0).toLocaleString()}일)</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-3">
                    <span className="text-sm text-muted-foreground">1일 평균임금</span>
                    <span className="font-mono">{fmt(result.avgDailyWage ?? 0)} 원</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-3.5 bg-cyan-50/50">
                    <span className="text-sm font-bold text-cyan-800">퇴직금 (세전)</span>
                    <span className="font-mono font-extrabold text-cyan-700 text-xl">{fmt(result.severance ?? 0)} 원</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-3">
                    <span className="text-sm text-muted-foreground">퇴직소득세 + 지방소득세</span>
                    <span className="font-mono text-red-600">- {fmt(result.totalTax ?? 0)} 원</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-3.5 bg-foreground/5">
                    <span className="text-sm font-bold">세후 실수령 퇴직금</span>
                    <span className="font-mono font-extrabold text-xl">{fmt(result.netSeverance ?? 0)} 원</span>
                  </div>
                </div>
              </div>
              {result.mustIrp && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
                  💡 퇴직금 300만 원 초과 시 IRP(개인형 퇴직연금) 계좌로만 수령 가능합니다.
                </div>
              )}
            </div>
          )
        )}

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          ※ 퇴직소득세는 간이 계산입니다. 실제 세액은 근속연수, 임금 변동 이력에 따라 다릅니다.
        </p>
      </div>
    </div>
  );
}
