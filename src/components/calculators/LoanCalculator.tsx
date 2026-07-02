'use client';

import React, { useState } from 'react';

interface ScheduleRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

interface LoanResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: ScheduleRow[];
}

const LoanCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [loanAmount, setLoanAmount] = useState<string>('300000000');
  const [annualRate, setAnnualRate] = useState<string>('4.5');
  const [termMonths, setTermMonths] = useState<string>('360');
  const [result, setResult] = useState<LoanResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

  const calculate = () => {
    setError('');
    const P = Number(loanAmount);
    const annualRateNum = Number(annualRate);
    const n = Number(termMonths);

    if (P <= 0 || annualRateNum <= 0 || n <= 0) {
      setError(locale === 'ko' ? '입력값을 올바르게 확인해 주세요.' : 'Please check your inputs.');
      return;
    }

    const r = annualRateNum / 100 / 12;
    // 원리금균등상환 공식: P × r(1+r)^n / ((1+r)^n - 1)
    const monthlyPayment = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = monthlyPayment * n;
    const totalInterest = totalPayment - P;

    // 상환 스케줄 (첫 12개월)
    const schedule: ScheduleRow[] = [];
    let balance = P;
    const limit = Math.min(12, n);

    for (let month = 1; month <= limit; month++) {
      const interestPart = balance * r;
      const principalPart = monthlyPayment - interestPart;
      balance -= principalPart;
      schedule.push({
        month,
        payment: Math.round(monthlyPayment),
        principal: Math.round(principalPart),
        interest: Math.round(interestPart),
        balance: Math.max(0, Math.round(balance)),
      });
    }

    setResult({ monthlyPayment, totalPayment, totalInterest, schedule });
  };

  const reset = () => {
    setLoanAmount('300000000');
    setAnnualRate('4.5');
    setTermMonths('360');
    setResult(null);
    setError('');
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-6">
        {locale === 'ko' ? '대출 계산기 (원리금균등상환)' : 'Loan Repayment Calculator'}
      </h3>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '대출금액 (원)' : 'Loan Amount (KRW)'}
            </label>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '대출금액' : 'Loan Amount'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '연이자율 (%)' : 'Annual Interest Rate (%)'}
            </label>
            <input
              type="number"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              step="0.1"
              min="0"
              max="30"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '연이자율' : 'Annual Interest Rate'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '대출기간 (개월)' : 'Loan Term (months)'}
            </label>
            <select
              value={termMonths}
              onChange={(e) => setTermMonths(e.target.value)}
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '대출기간' : 'Loan Term'}
            >
              <option value="120">{locale === 'ko' ? '10년 (120개월)' : '10 years (120m)'}</option>
              <option value="180">{locale === 'ko' ? '15년 (180개월)' : '15 years (180m)'}</option>
              <option value="240">{locale === 'ko' ? '20년 (240개월)' : '20 years (240m)'}</option>
              <option value="300">{locale === 'ko' ? '25년 (300개월)' : '25 years (300m)'}</option>
              <option value="360">{locale === 'ko' ? '30년 (360개월)' : '30 years (360m)'}</option>
              <option value="480">{locale === 'ko' ? '40년 (480개월)' : '40 years (480m)'}</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={calculate}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
              aria-label={locale === 'ko' ? '계산하기' : 'Calculate'}
            >
              {locale === 'ko' ? '계산하기' : 'Calculate'}
            </button>
            <button
              onClick={reset}
              className="px-5 py-3 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl transition-colors"
              aria-label={locale === 'ko' ? '초기화' : 'Reset'}
            >
              {locale === 'ko' ? '초기화' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Results summary */}
        <div className="flex flex-col justify-center space-y-4">
          {result ? (
            <>
              <div className="p-5 bg-emerald-600 text-white rounded-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
                  {locale === 'ko' ? '월 상환액' : 'Monthly Payment'}
                </p>
                <p className="text-4xl font-bold">{fmt(result.monthlyPayment)}원</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">{locale === 'ko' ? '총 상환액' : 'Total Payment'}</p>
                  <p className="text-lg font-bold text-emerald-700">{fmt(result.totalPayment)}원</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">{locale === 'ko' ? '총 이자' : 'Total Interest'}</p>
                  <p className="text-lg font-bold text-amber-600">{fmt(result.totalInterest)}원</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-emerald-300">
              <span className="text-4xl mb-2" aria-hidden="true">🏦</span>
              <p className="text-sm font-bold text-emerald-400">
                {locale === 'ko' ? '정보를 입력하고 계산하세요' : 'Enter info and calculate'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule table */}
      {result && result.schedule.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <h4 className="text-sm font-bold text-emerald-800 mb-3">
            {locale === 'ko' ? '상환 스케줄 (첫 12개월)' : 'Repayment Schedule (First 12 months)'}
          </h4>
          <table className="w-full text-sm border-collapse" aria-label={locale === 'ko' ? '상환 스케줄 표' : 'Repayment schedule table'}>
            <thead>
              <tr className="bg-emerald-100">
                <th className="p-2 text-left font-bold text-emerald-800 rounded-tl-xl">{locale === 'ko' ? '회차' : 'Month'}</th>
                <th className="p-2 text-right font-bold text-emerald-800">{locale === 'ko' ? '월 납입액' : 'Payment'}</th>
                <th className="p-2 text-right font-bold text-emerald-800">{locale === 'ko' ? '원금' : 'Principal'}</th>
                <th className="p-2 text-right font-bold text-emerald-800">{locale === 'ko' ? '이자' : 'Interest'}</th>
                <th className="p-2 text-right font-bold text-emerald-800 rounded-tr-xl">{locale === 'ko' ? '잔금' : 'Balance'}</th>
              </tr>
            </thead>
            <tbody>
              {result.schedule.map((row) => (
                <tr key={row.month} className="border-b border-emerald-100 hover:bg-emerald-50">
                  <td className="p-2 font-bold text-emerald-700">{row.month}</td>
                  <td className="p-2 text-right">{fmt(row.payment)}</td>
                  <td className="p-2 text-right text-emerald-600">{fmt(row.principal)}</td>
                  <td className="p-2 text-right text-amber-600">{fmt(row.interest)}</td>
                  <td className="p-2 text-right">{fmt(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400 text-center">
        * 원리금균등상환 방식 기준. 실제 은행 약정에 따라 다를 수 있으며 중도상환수수료는 미반영입니다.
      </p>
    </div>
  );
};

export default LoanCalculator;
