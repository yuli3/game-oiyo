import React, { useState, useMemo } from 'react';

function fmt(n: number) {
  return Math.round(n).toLocaleString('ko-KR');
}

// 소득세 구간 (2024년, 단위: 원)
const TAX_BRACKETS = [
  { limit: 14_000_000, rate: 0.06, prev: 0, prevTax: 0 },
  { limit: 50_000_000, rate: 0.15, prev: 14_000_000, prevTax: 840_000 },
  { limit: 88_000_000, rate: 0.24, prev: 50_000_000, prevTax: 6_240_000 },
  { limit: 150_000_000, rate: 0.35, prev: 88_000_000, prevTax: 15_360_000 },
  { limit: 300_000_000, rate: 0.38, prev: 150_000_000, prevTax: 37_060_000 },
  { limit: 500_000_000, rate: 0.40, prev: 300_000_000, prevTax: 94_060_000 },
  { limit: Infinity, rate: 0.42, prev: 500_000_000, prevTax: 174_060_000 },
];

function calcTax(taxable: number): number {
  if (taxable <= 0) return 0;
  for (const b of TAX_BRACKETS) {
    if (taxable <= b.limit) {
      return b.prevTax + (taxable - b.prev) * b.rate;
    }
  }
  return 0;
}

// 단순경비율 (업종별 상이; 기타 사업 대표값 사용)
// 수입금액 2,400만 이하: 단순경비율 적용 가능
const SIMPLE_EXPENSE_RATE = 0.568; // 기타서비스업 기준 (약 56.8%)

export default function FreelancerTaxCalculator() {
  const [income, setIncome] = useState('');
  const [incomeDisplay, setIncomeDisplay] = useState('');
  const [expenseMode, setExpenseMode] = useState<'simple' | 'actual'>('simple');
  const [actualExpense, setActualExpense] = useState('');
  const [actualExpenseDisplay, setActualExpenseDisplay] = useState('');
  const [withheld, setWithheld] = useState('');
  const [withheldDisplay, setWithheldDisplay] = useState('');

  const handleIncome = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    setIncome(raw);
    const n = parseInt(raw) || 0;
    setIncomeDisplay(n > 0 ? n.toLocaleString('ko-KR') : raw);
  };

  const handleExpense = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    setActualExpense(raw);
    const n = parseInt(raw) || 0;
    setActualExpenseDisplay(n > 0 ? n.toLocaleString('ko-KR') : raw);
  };

  const handleWithheld = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    setWithheld(raw);
    const n = parseInt(raw) || 0;
    setWithheldDisplay(n > 0 ? n.toLocaleString('ko-KR') : raw);
  };

  const result = useMemo(() => {
    const totalIncome = parseInt(income) || 0;
    if (totalIncome <= 0) return null;

    const withheldTax = parseInt(withheld) || Math.round(totalIncome * 0.033); // 기본 3.3%

    // 경비 계산
    const expense =
      expenseMode === 'simple'
        ? Math.round(totalIncome * SIMPLE_EXPENSE_RATE)
        : (parseInt(actualExpense) || 0);

    const netIncome = Math.max(0, totalIncome - expense);

    // 소득공제: 기본공제(본인) 150만 + 국민건강보험(지역가입자 추정)
    // 간이화: 기본공제 150만, 국민연금(지역) 수입 × 4.5%, 건강보험 추정
    const nationalPensionDeduction = Math.min(netIncome * 0.045, 277_650 * 12);
    const basicDeduction = 1_500_000;
    const totalDeduction = nationalPensionDeduction + basicDeduction;

    const taxable = Math.max(0, netIncome - totalDeduction);
    const incomeTax = calcTax(taxable);
    const localTax = Math.round(incomeTax * 0.1);
    const totalTax = incomeTax + localTax;

    // 납부/환급
    const diff = totalTax - withheldTax;

    return {
      totalIncome,
      expense,
      expenseRate: ((expense / totalIncome) * 100).toFixed(1),
      netIncome,
      taxable,
      incomeTax: Math.round(incomeTax),
      localTax,
      totalTax: Math.round(totalTax),
      withheldTax,
      diff: Math.round(diff),
      effectiveRate: ((totalTax / totalIncome) * 100).toFixed(1),
    };
  }, [income, expenseMode, actualExpense, withheld]);

  const isSimple = expenseMode === 'simple';

  return (
    <div className="not-prose my-8 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧑‍💻</span>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">프리랜서 종합소득세 계산기</h3>
            <p className="text-orange-100 text-xs mt-0.5">연간 수입·경비·기납부세액으로 납부/환급액 계산</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Income */}
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-foreground">연간 총수입 (원)</label>
          <div className="relative">
            <input
              type="text" inputMode="numeric"
              value={incomeDisplay} onChange={handleIncome}
              placeholder="예: 50,000,000"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-right font-mono font-semibold focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 placeholder:text-muted-foreground/40 text-sm"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
          </div>
        </div>

        {/* Expense mode */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-foreground">경비 산정 방식</label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
            {(['simple', 'actual'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setExpenseMode(m)}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                  expenseMode === m
                    ? 'bg-white shadow text-orange-700'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div>{m === 'simple' ? '단순경비율' : '실제경비 입력'}</div>
                <div className="text-xs font-normal opacity-70 mt-0.5">
                  {m === 'simple' ? `약 56.8% 자동 적용` : '직접 경비 금액 입력'}
                </div>
              </button>
            ))}
          </div>

          {!isSimple && (
            <div className="mt-3 relative">
              <input
                type="text" inputMode="numeric"
                value={actualExpenseDisplay} onChange={handleExpense}
                placeholder="연간 실제 경비 (원)"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-right font-mono font-semibold focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 placeholder:text-muted-foreground/40 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
            </div>
          )}
        </div>

        {/* Withheld */}
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-foreground">
            기납부세액 (원천징수액, 원) — <span className="font-normal text-muted-foreground">수입 × 3.3% 또는 실제 원천징수액</span>
          </label>
          <div className="relative">
            <input
              type="text" inputMode="numeric"
              value={withheldDisplay} onChange={handleWithheld}
              placeholder="비워두면 수입의 3.3%로 자동 계산"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-right font-mono font-semibold focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 placeholder:text-muted-foreground/40 text-sm"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-muted-foreground">총수입</span>
                <span className="font-mono font-bold">{fmt(result.totalIncome)} 원</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-muted-foreground">경비 ({result.expenseRate}%)</span>
                <span className="font-mono text-muted-foreground">- {fmt(result.expense)} 원</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3 bg-muted/20">
                <span className="text-sm font-semibold">사업소득금액</span>
                <span className="font-mono font-bold">{fmt(result.netIncome)} 원</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-muted-foreground">과세표준 (소득공제 차감 후)</span>
                <span className="font-mono">{fmt(result.taxable)} 원</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-muted-foreground">종합소득세 (산출세액)</span>
                <span className="font-mono font-bold text-red-600">{fmt(result.incomeTax)} 원</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-muted-foreground">지방소득세 (소득세 × 10%)</span>
                <span className="font-mono text-red-600">{fmt(result.localTax)} 원</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3 bg-muted/20">
                <span className="text-sm font-semibold">결정세액 합계 (실효세율 {result.effectiveRate}%)</span>
                <span className="font-mono font-bold">{fmt(result.totalTax)} 원</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-muted-foreground">기납부세액 (원천징수)</span>
                <span className="font-mono">- {fmt(result.withheldTax)} 원</span>
              </div>
              <div className={`flex justify-between items-center px-5 py-4 ${
                result.diff > 0
                  ? 'bg-red-50/50'
                  : 'bg-emerald-50/50'
              }`}>
                <span className={`text-sm font-bold ${result.diff > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {result.diff > 0 ? '추가 납부액' : '환급 예상액'}
                </span>
                <span className={`font-mono font-extrabold text-xl ${result.diff > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {result.diff > 0 ? '' : '+ '}{fmt(Math.abs(result.diff))} 원
                </span>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          ※ 단순경비율은 업종에 따라 다릅니다. 이 계산기는 기타서비스업 기준(56.8%)을 적용합니다.{' '}
          <span className="text-orange-600">정확한 세액은 국세청 홈택스에서 확인하세요.</span>
        </p>
      </div>
    </div>
  );
}
