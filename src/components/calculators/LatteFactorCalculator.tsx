'use client';

import React, { useState } from 'react';

interface LatteResult {
  monthlySaving: number;
  results: { years: number; principal: number; interest: number; total: number }[];
}

const LatteFactorCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [dailyCost, setDailyCost] = useState<string>('5000');
  const [frequency, setFrequency] = useState<string>('daily');
  const [annualRate, setAnnualRate] = useState<string>('5.0');
  const [result, setResult] = useState<LatteResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

  const getMonthlySavings = (cost: number, freq: string): number => {
    if (freq === 'daily') return cost * 30;
    if (freq === 'weekday') return cost * 21.6;
    if (freq === 'weekly') return cost * 4.3;
    return 0;
  };

  const calculate = () => {
    setError('');
    const cost = Number(dailyCost);
    const rate = Number(annualRate);

    if (cost <= 0 || rate < 0) {
      setError(locale === 'ko' ? '입력값을 올바르게 확인해 주세요.' : 'Please check your inputs.');
      return;
    }

    const monthly = getMonthlySavings(cost, frequency);
    const r = rate / 100 / 12;

    const milestones = [10, 20, 30];
    const results = milestones.map((years) => {
      const n = years * 12;
      let futureValue = 0;
      if (r === 0) {
        futureValue = monthly * n;
      } else {
        futureValue = monthly * (Math.pow(1 + r, n) - 1) / r;
      }
      const principal = monthly * n;
      const interest = futureValue - principal;
      return { years, principal: Math.floor(principal), interest: Math.floor(interest), total: Math.floor(futureValue) };
    });

    setResult({ monthlySaving: Math.floor(monthly), results });
  };

  const reset = () => {
    setDailyCost('5000');
    setFrequency('daily');
    setAnnualRate('5.0');
    setResult(null);
    setError('');
  };

  const goals = [
    { name: locale === 'ko' ? '해외여행 (동남아)' : 'SE Asia Trip', amount: 2000000 },
    { name: locale === 'ko' ? '신형 스마트폰' : 'New Smartphone', amount: 1500000 },
    { name: locale === 'ko' ? '중고차' : 'Used Car', amount: 10000000 },
    { name: locale === 'ko' ? '신차' : 'New Car', amount: 30000000 },
  ];

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-amber-900 mb-6">
        {locale === 'ko' ? '라떼 팩터 계산기' : 'Latte Factor Calculator'}
      </h3>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-amber-800">
              {locale === 'ko' ? '일일 소비 금액 (원)' : 'Daily Expense (KRW)'}
            </label>
            <input
              type="number"
              value={dailyCost}
              onChange={(e) => setDailyCost(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
              aria-label={locale === 'ko' ? '일일 소비 금액' : 'Daily Expense'}
            />
            <p className="text-xs text-amber-500">
              {locale === 'ko' ? '커피, 담배, 간식 등 습관적 소비' : 'Coffee, snacks, tobacco, etc.'}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-amber-800">
              {locale === 'ko' ? '소비 빈도' : 'Frequency'}
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full p-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
              aria-label={locale === 'ko' ? '소비 빈도' : 'Frequency'}
            >
              <option value="daily">{locale === 'ko' ? '매일 (월 30회)' : 'Every day (30x/month)'}</option>
              <option value="weekday">{locale === 'ko' ? '주중만 (월 약 21.6회)' : 'Weekdays only (~21.6x/month)'}</option>
              <option value="weekly">{locale === 'ko' ? '주 1회 (월 약 4.3회)' : 'Once a week (~4.3x/month)'}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-amber-800">
              {locale === 'ko' ? '연 수익률 (%)' : 'Annual Return Rate (%)'}
            </label>
            <input
              type="number"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              step="0.1"
              min="0"
              max="30"
              className="w-full p-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
              aria-label={locale === 'ko' ? '연 수익률' : 'Annual Return Rate'}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={calculate}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors"
              aria-label={locale === 'ko' ? '계산하기' : 'Calculate'}
            >
              {locale === 'ko' ? '계산하기' : 'Calculate'}
            </button>
            <button
              onClick={reset}
              className="px-5 py-3 bg-white border border-amber-300 hover:bg-amber-50 text-amber-700 font-bold rounded-xl transition-colors"
              aria-label={locale === 'ko' ? '초기화' : 'Reset'}
            >
              {locale === 'ko' ? '초기화' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="p-4 bg-white rounded-2xl border border-amber-100">
                <p className="text-xs text-amber-600 font-bold mb-1">
                  {locale === 'ko' ? '절약 시 월 저축 가능액' : 'Monthly Savings if Stopped'}
                </p>
                <p className="text-2xl font-bold text-amber-700">{fmt(result.monthlySaving)}원</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {result.results.map((r) => (
                  <div key={r.years} className="p-4 bg-white rounded-2xl border border-amber-100 text-center">
                    <p className="text-xs text-amber-600 font-bold mb-1">{r.years}{locale === 'ko' ? '년 후' : 'yrs'}</p>
                    <p className="text-xl font-bold text-amber-800">{fmt(r.total)}원</p>
                    <p className="text-xs text-emerald-500 mt-1">+{fmt(r.interest)}원 이자</p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <p className="text-xs font-bold text-amber-700 mb-2">
                  {locale === 'ko' ? '10년 후 달성 가능한 목표' : 'Goals achievable in 10 years'}
                </p>
                <div className="space-y-2">
                  {goals.map((goal) => {
                    const tenYearTotal = result.results.find((r) => r.years === 10)?.total ?? 0;
                    const achievable = tenYearTotal >= goal.amount;
                    return (
                      <div key={goal.name} className="flex justify-between items-center text-sm">
                        <span className={achievable ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          {achievable ? '✓ ' : '○ '}{goal.name}
                        </span>
                        <span className="text-slate-500">{fmt(goal.amount)}원</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-amber-200">
              <span className="text-4xl mb-2" aria-hidden="true">☕</span>
              <p className="text-sm font-bold text-amber-300">
                {locale === 'ko' ? '소비 습관을 입력해보세요' : 'Enter your daily expense'}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * 복리 계산 기준. 세금 및 인플레이션은 미반영입니다.
      </p>
    </div>
  );
};

export default LatteFactorCalculator;
