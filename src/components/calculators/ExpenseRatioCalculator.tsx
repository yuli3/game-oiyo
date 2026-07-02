'use client';

import React, { useState } from 'react';

interface ExpenseResult {
  incomeByRate: number;
  incomeByBook: number;
  diff: number;
  betterOption: 'book' | 'estimated';
  shortfall: number;
}

const ExpenseRatioCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const ko = locale === 'ko';

  const [revenue, setRevenue] = useState<string>('50000000');
  const [expenseRate, setExpenseRate] = useState<string>('60');
  const [actualExpenses, setActualExpenses] = useState<string>('10000000');
  const [result, setResult] = useState<ExpenseResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR') + '원';

  const calculate = () => {
    setError('');
    const rev = Number(revenue);
    const rate = Number(expenseRate);
    const actual = Number(actualExpenses);

    if (rev <= 0 || rate < 0 || rate > 100 || actual < 0) {
      setError(ko ? '입력값을 올바르게 확인해 주세요.' : 'Please check your inputs.');
      return;
    }

    const incomeByRate = Math.floor(rev * (1 - rate / 100));
    const incomeByBook = Math.max(0, rev - actual);
    const diff = Math.abs(incomeByRate - incomeByBook);

    let betterOption: 'book' | 'estimated';
    let shortfall = 0;

    if (incomeByBook < incomeByRate) {
      betterOption = 'book';
    } else {
      betterOption = 'estimated';
      const targetExpense = Math.floor(rev * (rate / 100));
      shortfall = Math.max(0, targetExpense - actual);
    }

    setResult({ incomeByRate, incomeByBook, diff, betterOption, shortfall });
  };

  const reset = () => {
    setRevenue('50000000');
    setExpenseRate('60');
    setActualExpenses('10000000');
    setResult(null);
    setError('');
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-lime-50 to-green-50 border border-lime-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-lime-900 mb-2">
        {ko ? '추계 vs 기장 비용 비율 계산기' : 'Estimated vs Bookkeeping Expense Comparison'}
      </h3>
      <p className="text-sm text-lime-700 mb-6">
        {ko
          ? '사업자가 추계신고와 기장신고 중 어느 쪽이 세금 부담이 적은지 비교합니다.'
          : 'Compare taxable income under estimated (standard) expense ratio vs actual bookkeeping.'}
      </p>

      <div className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-bold text-lime-800">
            {ko ? '총 수입 (원)' : 'Total Revenue (KRW)'}
          </label>
          <input
            type="number"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            min="0"
            className="w-full p-3 bg-white border border-lime-200 rounded-xl focus:ring-2 focus:ring-lime-400 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-lime-800">
              {ko ? '표준경비율 (%)' : 'Standard Expense Rate (%)'}
            </label>
            <input
              type="number"
              value={expenseRate}
              onChange={(e) => setExpenseRate(e.target.value)}
              min="0"
              max="100"
              step="0.1"
              className="w-full p-3 bg-white border border-lime-200 rounded-xl focus:ring-2 focus:ring-lime-400 outline-none"
            />
            <p className="text-xs text-lime-600">
              {ko ? '예: 음식점 ~85%, 프리랜서 ~60%' : 'e.g. Restaurant ~85%, Freelancer ~60%'}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-lime-800">
              {ko ? '실제 비용 (원)' : 'Actual Expenses (KRW)'}
            </label>
            <input
              type="number"
              value={actualExpenses}
              onChange={(e) => setActualExpenses(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-lime-200 rounded-xl focus:ring-2 focus:ring-lime-400 outline-none"
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
            className="flex-1 py-3 bg-lime-600 hover:bg-lime-700 text-white font-bold rounded-xl transition-colors"
          >
            {ko ? '비교하기' : 'Compare'}
          </button>
          <button
            onClick={reset}
            className="px-5 py-3 bg-white border border-lime-300 hover:bg-lime-50 text-lime-700 font-bold rounded-xl transition-colors"
          >
            {ko ? '초기화' : 'Reset'}
          </button>
        </div>

        {result && (
          <div className="mt-4 space-y-4" aria-live="polite">
            {/* Verdict */}
            <div className={`rounded-2xl p-5 text-center border-2 ${
              result.betterOption === 'book'
                ? 'bg-emerald-50 border-emerald-400'
                : 'bg-amber-50 border-amber-400'
            }`}>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">
                {ko ? '유리한 방법' : 'Better Option'}
              </p>
              <p className="text-xl font-black">
                {result.betterOption === 'book'
                  ? (ko ? '기장신고가 유리합니다' : 'Bookkeeping is Better')
                  : (ko ? '추계신고가 유리합니다' : 'Estimated Rate is Better')}
              </p>
              <p className="text-sm font-bold mt-1">
                {ko ? `차이: ${fmt(result.diff)}` : `Difference: ${fmt(result.diff)}`}
              </p>
              {result.betterOption === 'estimated' && result.shortfall > 0 && (
                <p className="text-xs text-red-600 font-semibold mt-2">
                  {ko
                    ? `⚠️ 추계 한도에 도달하려면 ${fmt(result.shortfall)} 더 필요합니다.`
                    : `⚠️ Need ${fmt(result.shortfall)} more in expenses to reach the estimated rate limit.`}
                </p>
              )}
            </div>

            {/* Two columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border-2 border-lime-200 p-4 text-center">
                <p className="text-xs font-bold text-lime-600 uppercase tracking-wide mb-2">
                  {ko ? '추계 (표준경비율)' : 'Estimated'}
                </p>
                <p className="text-xs text-gray-500 mb-1">{ko ? '과세소득' : 'Taxable Income'}</p>
                <p className="text-lg font-black text-lime-900">{fmt(result.incomeByRate)}</p>
              </div>
              <div className="bg-white rounded-xl border-2 border-teal-200 p-4 text-center">
                <p className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-2">
                  {ko ? '기장 (실제경비)' : 'Bookkeeping'}
                </p>
                <p className="text-xs text-gray-500 mb-1">{ko ? '과세소득' : 'Taxable Income'}</p>
                <p className="text-lg font-black text-teal-900">{fmt(result.incomeByBook)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * {ko
          ? '과세소득이 낮을수록 납부 세금이 줄어듭니다. 실제 세율 적용은 별도 세무 계산이 필요합니다.'
          : 'Lower taxable income means less tax. Actual tax calculation requires additional steps.'}
      </p>
    </div>
  );
};

export default ExpenseRatioCalculator;
