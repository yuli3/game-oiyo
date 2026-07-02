'use client';

import React, { useState } from 'react';

interface MortgageResult {
  loanAmount: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  loanToValue: number;
}

const MortgageCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const ko = locale === 'ko';

  const [price, setPrice] = useState<string>('500000000');
  const [downPayment, setDownPayment] = useState<string>('100000000');
  const [interestRate, setInterestRate] = useState<string>('3.5');
  const [loanTermYears, setLoanTermYears] = useState<string>('30');
  const [result, setResult] = useState<MortgageResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) =>
    ko
      ? Math.round(n).toLocaleString('ko-KR') + '원'
      : '$' + Math.round(n).toLocaleString('en-US');

  const calculate = () => {
    setError('');
    const P = Number(price);
    const dp = Number(downPayment);
    const r = Number(interestRate) / 100 / 12;
    const n = Number(loanTermYears) * 12;
    const loanAmount = P - dp;

    if (P <= 0 || dp < 0 || loanAmount <= 0 || Number(interestRate) < 0 || n <= 0) {
      setError(ko ? '입력값을 올바르게 확인해 주세요.' : 'Please check your inputs.');
      return;
    }

    let monthlyPayment: number;
    if (r === 0) {
      monthlyPayment = loanAmount / n;
    } else {
      monthlyPayment = (loanAmount * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
    }

    const totalPayment = monthlyPayment * n;
    const totalInterest = totalPayment - loanAmount;
    const loanToValue = (loanAmount / P) * 100;

    setResult({ loanAmount, monthlyPayment, totalPayment, totalInterest, loanToValue });
  };

  const reset = () => {
    setPrice('500000000');
    setDownPayment('100000000');
    setInterestRate('3.5');
    setLoanTermYears('30');
    setResult(null);
    setError('');
  };

  const principalPct = result
    ? Math.round((result.loanAmount / result.totalPayment) * 100)
    : 0;
  const interestPct = result ? 100 - principalPct : 0;

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-blue-900 mb-6">
        {ko ? '주택담보대출 계산기' : 'Mortgage Calculator'}
      </h3>

      <div className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-bold text-blue-800">
            {ko ? '주택 가격 (원)' : 'Home Price (KRW)'}
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            className="w-full p-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-blue-800">
            {ko ? '계약금 / 자기자본 (원)' : 'Down Payment (KRW)'}
          </label>
          <input
            type="number"
            value={downPayment}
            onChange={(e) => setDownPayment(e.target.value)}
            min="0"
            className="w-full p-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-blue-800">
              {ko ? '연 금리 (%)' : 'Annual Rate (%)'}
            </label>
            <input
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              min="0"
              step="0.1"
              className="w-full p-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-blue-800">
              {ko ? '대출 기간 (년)' : 'Loan Term (years)'}
            </label>
            <input
              type="number"
              value={loanTermYears}
              onChange={(e) => setLoanTermYears(e.target.value)}
              min="1"
              max="50"
              className="w-full p-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
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
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
          >
            {ko ? '계산하기' : 'Calculate'}
          </button>
          <button
            onClick={reset}
            className="px-5 py-3 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 font-bold rounded-xl transition-colors"
          >
            {ko ? '초기화' : 'Reset'}
          </button>
        </div>

        {result && (
          <div className="mt-4 space-y-4">
            <div className="bg-blue-600 text-white rounded-2xl p-5 text-center">
              <p className="text-sm font-semibold opacity-80 mb-1">
                {ko ? '월 상환금' : 'Monthly Payment'}
              </p>
              <p className="text-3xl font-black">{fmt(result.monthlyPayment)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: ko ? '대출 원금' : 'Loan Amount', value: fmt(result.loanAmount) },
                { label: ko ? 'LTV 비율' : 'Loan-to-Value', value: result.loanToValue.toFixed(1) + '%' },
                { label: ko ? '총 이자' : 'Total Interest', value: fmt(result.totalInterest) },
                { label: ko ? '총 상환액' : 'Total Payment', value: fmt(result.totalPayment) },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl p-4 border border-blue-100">
                  <p className="text-xs text-blue-500 font-semibold mb-1">{item.label}</p>
                  <p className="text-base font-bold text-blue-900">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Simple bar breakdown */}
            <div className="bg-white rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-3">
                {ko ? '원금 vs 이자 비율' : 'Principal vs Interest Breakdown'}
              </p>
              <div className="flex rounded-full overflow-hidden h-6 text-xs font-bold">
                <div
                  className="bg-blue-500 flex items-center justify-center text-white transition-all"
                  style={{ width: `${principalPct}%` }}
                >
                  {principalPct}%
                </div>
                <div
                  className="bg-red-400 flex items-center justify-center text-white transition-all"
                  style={{ width: `${interestPct}%` }}
                >
                  {interestPct}%
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-blue-600">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-blue-500" />
                  {ko ? '원금' : 'Principal'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-400" />
                  {ko ? '이자' : 'Interest'}
                </span>
              </div>
            </div>

            {result.loanToValue > 80 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                {ko
                  ? '⚠️ LTV 80% 초과 — 추가 보험(PMI) 또는 금리 우대 조건이 제한될 수 있습니다.'
                  : '⚠️ LTV exceeds 80% — PMI or premium rate conditions may apply.'}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * {ko ? '원리금균등상환 방식 기준입니다.' : 'Based on equal principal+interest (annuity) repayment method.'}
      </p>
    </div>
  );
};

export default MortgageCalculator;
