import React, { useState, useMemo } from 'react';

function fmt(n: number) {
  return Math.round(n).toLocaleString('ko-KR');
}

function parseNum(v: string): number {
  return parseFloat(v.replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0;
}

// 국민연금 예상 수령액 계산 (간략화)
// 기본연금액 = (A + B) × (1 + 0.05n) × P/20
// A: 전체 가입자 평균 소득월액 (2024 기준 약 286만 원)
// B: 가입자 본인 평균 소득월액
// n: 20년 초과 가입 연수
// P: 가입 기간(년)

const AVG_NATIONAL_INCOME = 2_866_000; // 2024년 기준 A값 (원)
const EMPLOYEE_RATE = 0.045;

export default function PensionCalculator() {
  const [salary, setSalary] = useState('');
  const [salaryDisplay, setSalaryDisplay] = useState('');
  const [years, setYears] = useState('20');
  const [startAge, setStartAge] = useState('27');

  const handleSalary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    setSalary(raw);
    const num = parseInt(raw) || 0;
    setSalaryDisplay(num > 0 ? num.toLocaleString('ko-KR') : raw);
  };

  const result = useMemo(() => {
    const monthlyIncome = parseNum(salary);
    const yearsNum = Math.max(1, Math.min(40, parseInt(years) || 20));
    const startAgeNum = Math.max(18, Math.min(59, parseInt(startAge) || 27));

    if (monthlyIncome <= 0) return null;

    // 가입 기간 가중치 (P/20)
    const periodFactor = yearsNum / 20;

    // 20년 초과 가입 연수
    const extraYears = Math.max(0, yearsNum - 20);

    // 기본연금액 = (A + B) × (1 + 0.05n) × P/20
    // P가 10년 미만이면 수령 불가
    const A = AVG_NATIONAL_INCOME;
    const B = monthlyIncome; // 단순화: 평균 소득 = 현재 소득
    const basicPension = (A + B) / 2 * (1 + 0.05 * extraYears) * periodFactor;

    // 예상 수령 나이: 1969년생 이후 = 65세
    const receiveAge = 65;
    const retireAge = startAgeNum + yearsNum;

    // 월 납부액 (근로자 부담)
    const monthlyContribution = Math.round(monthlyIncome * EMPLOYEE_RATE);

    // 총 납부액 (근로자분)
    const totalContribution = monthlyContribution * yearsNum * 12;

    // 예상 수령 기간: 기대수명 83세 기준
    const receiveYears = Math.max(1, 83 - receiveAge);
    const totalExpectedBenefit = Math.round(basicPension) * 12 * receiveYears;

    return {
      monthlyPension: Math.round(basicPension),
      monthlyContribution,
      totalContribution,
      retireAge: Math.min(retireAge, 59),
      receiveAge,
      receiveYears,
      totalExpectedBenefit,
      yearsNum,
    };
  }, [salary, years, startAge]);

  return (
    <div className="not-prose my-8 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏦</span>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">국민연금 예상 수령액 계산기</h3>
            <p className="text-emerald-100 text-xs mt-0.5">소득월액과 가입 기간으로 예상 연금액 계산</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Inputs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="block text-sm font-semibold mb-1.5 text-foreground">
              월 소득액 (원)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={salaryDisplay}
                onChange={handleSalary}
                placeholder="예: 3,500,000"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-right font-mono font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-muted-foreground/40 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">원</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 text-foreground">
              예상 가입 기간 (년)
            </label>
            <input
              type="number"
              min={10}
              max={40}
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">최소 10년 이상 가입해야 수령 가능</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 text-foreground">
              가입 시작 나이
            </label>
            <input
              type="number"
              min={18}
              max={59}
              value={startAge}
              onChange={(e) => setStartAge(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
            />
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
              <div className="divide-y divide-emerald-100">
                <div className="flex justify-between items-center px-5 py-3.5">
                  <span className="text-sm text-muted-foreground font-medium">월 납부 보험료 (근로자 부담 4.5%)</span>
                  <span className="font-mono font-bold text-foreground">{fmt(result.monthlyContribution)} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-3.5">
                  <span className="text-sm text-muted-foreground font-medium">총 납부 보험료 ({result.yearsNum}년 근로자분)</span>
                  <span className="font-mono font-bold text-foreground">{fmt(result.totalContribution)} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-3.5 bg-emerald-100/50">
                  <span className="text-sm font-bold text-emerald-800">예상 월 연금액 (65세부터)</span>
                  <span className="font-mono font-extrabold text-emerald-700 text-xl">{fmt(result.monthlyPension)} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-3.5">
                  <span className="text-sm text-muted-foreground font-medium">예상 총 수령액 (기대수명 83세 기준)</span>
                  <span className="font-mono font-bold text-foreground">{fmt(result.totalExpectedBenefit)} 원</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 text-xs text-center">
              <div className="flex-1 rounded-lg bg-muted/40 px-3 py-2">
                <div className="font-bold text-foreground">수령 시작</div>
                <div className="text-muted-foreground mt-0.5">{result.receiveAge}세</div>
              </div>
              <div className="flex-1 rounded-lg bg-muted/40 px-3 py-2">
                <div className="font-bold text-foreground">수령 기간</div>
                <div className="text-muted-foreground mt-0.5">약 {result.receiveYears}년</div>
              </div>
              <div className="flex-1 rounded-lg bg-muted/40 px-3 py-2">
                <div className="font-bold text-foreground">가입 기간</div>
                <div className="text-muted-foreground mt-0.5">{result.yearsNum}년</div>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          ※ 이 계산기는 <strong>2024년 기준 국민연금 공식</strong>을 간략화하여 계산합니다.{' '}
          <span className="text-emerald-600">실제 수령액은 국민연금공단 홈페이지의 내 연금 알아보기를 이용하세요.</span>
        </p>
      </div>
    </div>
  );
}
