'use client';

import React, { useState } from 'react';

interface CompoundResult {
  averageCase: number;
  worstCase: number;
  bestCase: number;
  totalContributed: number;
  totalGrowth: number;
  multiplier: string;
}

const Compound2Calculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const ko = locale === 'ko';

  const [initialInvestment, setInitialInvestment] = useState<string>('1000000');
  const [monthlyContribution, setMonthlyContribution] = useState<string>('100000');
  const [investmentPeriod, setInvestmentPeriod] = useState<string>('10');
  const [interestRate, setInterestRate] = useState<string>('5');
  const [rateRange, setRateRange] = useState<string>('1');
  const [result, setResult] = useState<CompoundResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) =>
    ko
      ? Math.round(n).toLocaleString('ko-KR') + '원'
      : '$' + Math.round(n).toLocaleString('en-US');

  const calcFV = (initInv: number, monthly: number, years: number, annualRate: number): number => {
    const r = annualRate / 100;
    if (r === 0) return initInv + monthly * 12 * years;
    const fvInit = initInv * Math.pow(1 + r, years);
    const fvMonthly = monthly * 12 * ((Math.pow(1 + r, years) - 1) / r);
    return fvInit + fvMonthly;
  };

  const calculate = () => {
    setError('');
    const init = Number(initialInvestment);
    const monthly = Number(monthlyContribution);
    const years = Number(investmentPeriod);
    const rate = Number(interestRate);
    const range = Number(rateRange);

    if (init < 0 || monthly < 0 || years <= 0 || rate < 0) {
      setError(ko ? '입력값을 올바르게 확인해 주세요.' : 'Please check your inputs.');
      return;
    }

    const avgCase = calcFV(init, monthly, years, rate);
    const worstCase = calcFV(init, monthly, years, Math.max(0, rate - range));
    const bestCase = calcFV(init, monthly, years, rate + range);
    const totalContributed = init + monthly * 12 * years;
    const multiplier = totalContributed > 0 ? (avgCase / totalContributed).toFixed(1) : '0';

    setResult({
      averageCase: Math.round(avgCase),
      worstCase: Math.round(worstCase),
      bestCase: Math.round(bestCase),
      totalContributed: Math.round(totalContributed),
      totalGrowth: Math.round(avgCase - totalContributed),
      multiplier,
    });
  };

  const reset = () => {
    setInitialInvestment('1000000');
    setMonthlyContribution('100000');
    setInvestmentPeriod('10');
    setInterestRate('5');
    setRateRange('1');
    setResult(null);
    setError('');
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-violet-900 mb-6">
        {ko ? '복리 수익 시뮬레이터' : 'Compound Interest Simulator'}
      </h3>

      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-violet-800">
              {ko ? '초기 투자금 (원)' : 'Initial Investment (KRW)'}
            </label>
            <input
              type="number"
              value={initialInvestment}
              onChange={(e) => setInitialInvestment(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-violet-800">
              {ko ? '월 추가 납입 (원)' : 'Monthly Contribution (KRW)'}
            </label>
            <input
              type="number"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-violet-800">
              {ko ? '투자 기간 (년)' : 'Investment Period (years)'}
            </label>
            <input
              type="number"
              value={investmentPeriod}
              onChange={(e) => setInvestmentPeriod(e.target.value)}
              min="1"
              max="50"
              className="w-full p-3 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-violet-800">
              {ko ? '연 수익률 (%)' : 'Annual Return (%)'}
            </label>
            <input
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              min="0"
              step="0.1"
              className="w-full p-3 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-bold text-violet-800">
              {ko ? '시나리오 범위 ± (%)' : 'Scenario Range ± (%)'}
            </label>
            <input
              type="number"
              value={rateRange}
              onChange={(e) => setRateRange(e.target.value)}
              min="0"
              step="0.5"
              className="w-full p-3 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={calculate}
            className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors"
          >
            {ko ? '계산하기' : 'Calculate'}
          </button>
          <button
            onClick={reset}
            className="px-5 py-3 bg-white border border-violet-300 hover:bg-violet-50 text-violet-700 font-bold rounded-xl transition-colors"
          >
            {ko ? '초기화' : 'Reset'}
          </button>
        </div>

        {result && (
          <div className="mt-4 space-y-4" aria-live="polite">
            {/* Three scenario cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-red-600 mb-1">
                  {ko ? `최저 (${Number(interestRate) - Number(rateRange)}%)` : `Min (${Number(interestRate) - Number(rateRange)}%)`}
                </p>
                <p className="text-sm font-black text-red-700">{fmt(result.worstCase)}</p>
              </div>
              <div className="bg-violet-100 border border-violet-300 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-violet-700 mb-1">
                  {ko ? `평균 (${interestRate}%)` : `Avg (${interestRate}%)`}
                </p>
                <p className="text-base font-black text-violet-900">{fmt(result.averageCase)}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-green-600 mb-1">
                  {ko ? `최고 (${Number(interestRate) + Number(rateRange)}%)` : `Max (${Number(interestRate) + Number(rateRange)}%)`}
                </p>
                <p className="text-sm font-black text-green-700">{fmt(result.bestCase)}</p>
              </div>
            </div>

            {/* Summary row */}
            <div className="bg-white rounded-xl border border-violet-100 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-violet-600 font-semibold">{ko ? '총 납입액' : 'Total Contributed'}</span>
                <span className="font-bold">{fmt(result.totalContributed)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-violet-600 font-semibold">{ko ? '평균 수익 증가분' : 'Avg Growth'}</span>
                <span className="font-bold text-violet-800">+{fmt(result.totalGrowth)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-violet-100 pt-2">
                <span className="text-violet-600 font-bold">{ko ? '수익 배수 (평균)' : 'Return Multiplier (avg)'}</span>
                <span className="font-black text-violet-900">{result.multiplier}×</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * {ko ? '연 복리 기준이며 세금·수수료는 미반영입니다.' : 'Annual compounding. Taxes and fees not included.'}
      </p>
    </div>
  );
};

export default Compound2Calculator;
