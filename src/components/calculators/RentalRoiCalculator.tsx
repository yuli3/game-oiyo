'use client';

import React, { useState } from 'react';

interface RentalResult {
  actualInvestment: number;
  monthlyInterestCost: number;
  monthlyNet: number;
  annualNet: number;
  annualInterest: number;
  roi: number;
}

const RentalRoiCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const ko = locale === 'ko';

  const [purchasePrice, setPurchasePrice] = useState<string>('300000000');
  const [deposit, setDeposit] = useState<string>('20000000');
  const [monthlyRent, setMonthlyRent] = useState<string>('1000000');
  const [loanAmount, setLoanAmount] = useState<string>('150000000');
  const [loanRate, setLoanRate] = useState<string>('4.5');
  const [result, setResult] = useState<RentalResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR') + '원';

  const calculate = () => {
    setError('');
    const price = Number(purchasePrice);
    const dep = Number(deposit);
    const rent = Number(monthlyRent);
    const loan = Number(loanAmount);
    const rate = Number(loanRate);

    if (price <= 0 || dep < 0 || rent < 0 || loan < 0 || rate < 0) {
      setError(ko ? '입력값을 올바르게 확인해 주세요.' : 'Please check your inputs.');
      return;
    }

    const actualInvestment = price - loan - dep;
    const annualInterest = loan * (rate / 100);
    const monthlyInterestCost = annualInterest / 12;
    const monthlyNet = rent - monthlyInterestCost;
    const annualNet = monthlyNet * 12;

    let roi = 0;
    if (actualInvestment > 0) {
      roi = (annualNet / actualInvestment) * 100;
    } else if (actualInvestment <= 0) {
      roi = 999.99;
    }

    setResult({ actualInvestment, monthlyInterestCost, monthlyNet, annualNet, annualInterest, roi });
  };

  const reset = () => {
    setPurchasePrice('300000000');
    setDeposit('20000000');
    setMonthlyRent('1000000');
    setLoanAmount('150000000');
    setLoanRate('4.5');
    setResult(null);
    setError('');
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-orange-900 mb-2">
        {ko ? '임대수익률 계산기' : 'Rental ROI Calculator'}
      </h3>
      <p className="text-sm text-orange-700 mb-6">
        {ko
          ? '매수가, 대출, 임대보증금을 바탕으로 실투자 대비 임대수익률을 계산합니다.'
          : 'Calculate rental ROI based on purchase price, loan amount, and deposit.'}
      </p>

      <div className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-bold text-orange-800">
            {ko ? '매수 가격 (원)' : 'Purchase Price (KRW)'}
          </label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            min="0"
            className="w-full p-3 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-orange-800">
              {ko ? '임대 보증금 (원)' : 'Security Deposit (KRW)'}
            </label>
            <input
              type="number"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-orange-800">
              {ko ? '월 임대료 (원)' : 'Monthly Rent (KRW)'}
            </label>
            <input
              type="number"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
            />
          </div>
        </div>

        <div className="bg-orange-100 rounded-xl p-4 space-y-4">
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">
            {ko ? '대출 정보' : 'Financing Details'}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-orange-800">
                {ko ? '대출금액 (원)' : 'Loan Amount (KRW)'}
              </label>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                min="0"
                className="w-full p-3 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-orange-800">
                {ko ? '대출 금리 (%)' : 'Loan Rate (%)'}
              </label>
              <input
                type="number"
                value={loanRate}
                onChange={(e) => setLoanRate(e.target.value)}
                min="0"
                step="0.1"
                className="w-full p-3 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>
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
            className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors"
          >
            {ko ? '계산하기' : 'Calculate'}
          </button>
          <button
            onClick={reset}
            className="px-5 py-3 bg-white border border-orange-300 hover:bg-orange-50 text-orange-700 font-bold rounded-xl transition-colors"
          >
            {ko ? '초기화' : 'Reset'}
          </button>
        </div>

        {result && (
          <div className="mt-4 space-y-4" aria-live="polite">
            {/* ROI hero */}
            <div className="bg-orange-600 text-white rounded-2xl p-6 text-center">
              <p className="text-sm font-semibold opacity-80 mb-1">
                {ko ? '임대수익률 (연)' : 'Annual Rental ROI'}
              </p>
              <p className="text-4xl font-black">
                {result.roi > 900 ? '∞' : result.roi.toFixed(2)}%
              </p>
              {result.actualInvestment <= 0 && (
                <p className="text-xs opacity-70 mt-1">
                  {ko ? '실투자금이 0 이하 — 레버리지 무한대' : 'Actual investment ≤ 0 — infinite leverage'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: ko ? '실투자금' : 'Actual Investment', value: fmt(result.actualInvestment), color: 'text-orange-900' },
                { label: ko ? '월 순수익' : 'Monthly Net Income', value: (result.monthlyNet >= 0 ? '+' : '') + fmt(result.monthlyNet), color: result.monthlyNet >= 0 ? 'text-green-700' : 'text-red-600' },
                { label: ko ? '연 순수익' : 'Annual Net Income', value: (result.annualNet >= 0 ? '+' : '') + fmt(result.annualNet), color: result.annualNet >= 0 ? 'text-green-700' : 'text-red-600' },
                { label: ko ? '월 이자 비용' : 'Monthly Interest Cost', value: '-' + fmt(result.monthlyInterestCost), color: 'text-red-600' },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl p-3 border border-orange-100">
                  <p className="text-xs text-orange-400 font-semibold mb-1">{item.label}</p>
                  <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {result.monthlyNet < 0 && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                {ko
                  ? '⚠️ 월 임대료가 이자보다 낮아 매월 손실이 발생합니다.'
                  : '⚠️ Monthly rent is less than interest cost — negative cash flow each month.'}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * {ko
          ? '실투자금 = 매수가 - 대출금 - 임대보증금. 세금·공실·수리비는 미포함입니다.'
          : 'Actual investment = purchase price – loan – deposit. Tax, vacancy, and repair costs not included.'}
      </p>
    </div>
  );
};

export default RentalRoiCalculator;
