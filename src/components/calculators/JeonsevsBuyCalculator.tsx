'use client';

import React, { useState } from 'react';

interface CompResult {
  // 매매
  downPayment: number;
  mortgageInterest: number;
  acquisitionTax: number;
  appreciation: number;
  netBuyCost: number;
  // 전세
  opportunityCost: number;
  totalJeonseCost: number;
  // 비교
  recommendation: 'buy' | 'jeonse';
  difference: number;
  holdingYears: number;
}

function getAcquisitionTaxRate(price: number): number {
  if (price <= 600_000_000) return 0.01;
  if (price <= 900_000_000) return 0.02;
  return 0.03;
}

const JeonsevsBuyCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [purchasePrice, setPurchasePrice] = useState<string>('500000000');
  const [jeonsePrice, setJeonsePrice] = useState<string>('350000000');
  const [mortgageRate, setMortgageRate] = useState<string>('4.0');
  const [holdingYears, setHoldingYears] = useState<string>('5');
  const [appreciationRate, setAppreciationRate] = useState<string>('3.0');
  const [jeonseLoanRate, setJeonseLoanRate] = useState<string>('3.5');
  const [result, setResult] = useState<CompResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

  const calculate = () => {
    setError('');
    const price = Number(purchasePrice);
    const jeonse = Number(jeonsePrice);
    const mRate = Number(mortgageRate) / 100;
    const years = Number(holdingYears);
    const apprRate = Number(appreciationRate) / 100;
    const jLoanRate = Number(jeonseLoanRate) / 100;

    if (price <= 0 || jeonse <= 0 || years <= 0) {
      setError(locale === 'ko' ? '입력값을 올바르게 확인해 주세요.' : 'Please check your inputs.');
      return;
    }

    // 매매 비용
    const ltv = 0.6;
    const downPayment = price * (1 - ltv);
    const loanAmount = price * ltv;
    const mortgageInterest = loanAmount * mRate * years;
    const acquisitionTax = Math.floor(price * getAcquisitionTaxRate(price));
    const appreciation = price * Math.pow(1 + apprRate, years) - price;
    const netBuyCost = downPayment + mortgageInterest + acquisitionTax - appreciation;

    // 전세 비용: 보증금 기회비용 (예금금리 3.5%)
    const savingsRate = jLoanRate;
    const opportunityCost = jeonse * savingsRate * years;
    const totalJeonseCost = opportunityCost;

    const diff = totalJeonseCost - netBuyCost;
    const recommendation: 'buy' | 'jeonse' = diff > 0 ? 'buy' : 'jeonse';

    setResult({
      downPayment,
      mortgageInterest: Math.floor(mortgageInterest),
      acquisitionTax,
      appreciation: Math.floor(appreciation),
      netBuyCost: Math.floor(netBuyCost),
      opportunityCost: Math.floor(opportunityCost),
      totalJeonseCost: Math.floor(totalJeonseCost),
      recommendation,
      difference: Math.floor(Math.abs(diff)),
      holdingYears: years,
    });
  };

  const reset = () => {
    setPurchasePrice('500000000');
    setJeonsePrice('350000000');
    setMortgageRate('4.0');
    setHoldingYears('5');
    setAppreciationRate('3.0');
    setJeonseLoanRate('3.5');
    setResult(null);
    setError('');
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-6">
        {locale === 'ko' ? '전세 vs 매매 비교 계산기' : 'Jeonse vs Buy Calculator'}
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '매매가 (원)' : 'Purchase Price (KRW)'}
            </label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '매매가' : 'Purchase Price'}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '전세가 (원)' : 'Jeonse Deposit (KRW)'}
            </label>
            <input
              type="number"
              value={jeonsePrice}
              onChange={(e) => setJeonsePrice(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '전세가' : 'Jeonse Deposit'}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '대출 금리 (%)' : 'Mortgage Rate (%)'}
            </label>
            <input
              type="number"
              value={mortgageRate}
              onChange={(e) => setMortgageRate(e.target.value)}
              step="0.1"
              min="0"
              max="20"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '대출 금리' : 'Mortgage Rate'}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '거주 기간 (년)' : 'Holding Years'}
            </label>
            <input
              type="number"
              value={holdingYears}
              onChange={(e) => setHoldingYears(e.target.value)}
              min="1"
              max="30"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '거주 기간' : 'Holding Years'}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '집값 상승률 (%)' : 'Appreciation Rate (%)'}
            </label>
            <input
              type="number"
              value={appreciationRate}
              onChange={(e) => setAppreciationRate(e.target.value)}
              step="0.1"
              min="0"
              max="20"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '집값 상승률' : 'Appreciation Rate'}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '보증금 운용 수익률 (%)' : 'Deposit Opportunity Rate (%)'}
            </label>
            <input
              type="number"
              value={jeonseLoanRate}
              onChange={(e) => setJeonseLoanRate(e.target.value)}
              step="0.1"
              min="0"
              max="10"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '보증금 운용 수익률' : 'Deposit Opportunity Rate'}
            />
          </div>
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

        {result && (
          <div className="space-y-4 pt-4">
            <div
              className={`p-6 rounded-2xl text-center border-2 ${
                result.recommendation === 'buy'
                  ? 'bg-emerald-600 border-emerald-700 text-white'
                  : 'bg-blue-600 border-blue-700 text-white'
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">
                {locale === 'ko' ? '추천' : 'Recommendation'}
              </p>
              <p className="text-2xl font-bold">
                {result.recommendation === 'buy'
                  ? (locale === 'ko' ? '매매가 유리합니다' : 'Buying is better')
                  : (locale === 'ko' ? '전세가 유리합니다' : 'Jeonse is better')}
              </p>
              <p className="text-sm opacity-80 mt-1">
                {locale === 'ko'
                  ? `${result.holdingYears}년 기준 약 ${fmt(result.difference)}원 차이`
                  : `About ₩${fmt(result.difference)} difference over ${result.holdingYears} years`}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-emerald-100 space-y-2">
                <p className="text-sm font-bold text-emerald-700 mb-3">
                  {locale === 'ko' ? '매매 총 비용' : 'Buy Total Cost'}
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{locale === 'ko' ? '자기자본(40%)' : 'Down Payment (40%)'}</span>
                  <span className="font-bold">{fmt(result.downPayment)}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{locale === 'ko' ? '대출이자' : 'Mortgage Interest'}</span>
                  <span className="font-bold">{fmt(result.mortgageInterest)}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{locale === 'ko' ? '취득세' : 'Acquisition Tax'}</span>
                  <span className="font-bold">{fmt(result.acquisitionTax)}원</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>{locale === 'ko' ? '집값 상승분' : 'Appreciation'}</span>
                  <span className="font-bold">-{fmt(result.appreciation)}원</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>{locale === 'ko' ? '순 비용' : 'Net Cost'}</span>
                  <span className="text-emerald-700">{fmt(result.netBuyCost)}원</span>
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-blue-100 space-y-2">
                <p className="text-sm font-bold text-blue-700 mb-3">
                  {locale === 'ko' ? '전세 총 비용' : 'Jeonse Total Cost'}
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{locale === 'ko' ? '보증금 기회비용' : 'Opportunity Cost'}</span>
                  <span className="font-bold">{fmt(result.opportunityCost)}원</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold mt-8">
                  <span>{locale === 'ko' ? '순 비용' : 'Net Cost'}</span>
                  <span className="text-blue-700">{fmt(result.totalJeonseCost)}원</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * LTV 60% 기준 계산. 취득세·중개비·수리비 등 제반 비용은 별도이며, 실제 상황과 다를 수 있습니다.
      </p>
    </div>
  );
};

export default JeonsevsBuyCalculator;
