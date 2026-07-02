'use client';

import React, { useState } from 'react';

interface GiftVsInheritanceResult {
  giftTax: number;
  futureValueGifted: number;
  futureEstateValue: number;
  inheritanceTax: number;
  netInherited: number;
  betterOption: 'gift' | 'inherit';
  diff: number;
}

function calcProgressiveTax(base: number): number {
  if (base <= 0) return 0;
  if (base <= 100_000_000) return Math.floor(base * 0.1);
  if (base <= 500_000_000) return Math.floor(base * 0.2 - 10_000_000);
  if (base <= 1_000_000_000) return Math.floor(base * 0.3 - 60_000_000);
  if (base <= 3_000_000_000) return Math.floor(base * 0.4 - 160_000_000);
  return Math.floor(base * 0.5 - 460_000_000);
}

const GiftVsInheritanceCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const ko = locale === 'ko';

  const [assetValue, setAssetValue] = useState<string>('500000000');
  const [growthRate, setGrowthRate] = useState<string>('4.0');
  const [years, setYears] = useState<string>('10');
  const [result, setResult] = useState<GiftVsInheritanceResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR') + '원';

  const calculate = () => {
    setError('');
    const asset = Number(assetValue);
    const growth = Number(growthRate);
    const yrs = Number(years);

    if (asset <= 0 || growth < 0 || yrs <= 0) {
      setError(ko ? '입력값을 올바르게 확인해 주세요.' : 'Please check your inputs.');
      return;
    }

    // Gift scenario: gift now, pay gift tax, remaining grows for [years]
    const giftDeduction = 50_000_000; // 5,000만원 기본공제
    const giftTaxBase = Math.max(0, asset - giftDeduction);
    const giftTax = calcProgressiveTax(giftTaxBase);
    const netGifted = asset - giftTax;
    const futureValueGifted = Math.floor(netGifted * Math.pow(1 + growth / 100, yrs));

    // Inheritance scenario: asset grows for [years], then pay inheritance tax
    const futureEstateValue = asset * Math.pow(1 + growth / 100, yrs);
    const inheritanceDeduction = 500_000_000; // 5억 일괄공제
    const inheritanceTaxBase = Math.max(0, futureEstateValue - inheritanceDeduction);
    const inheritanceTax = calcProgressiveTax(inheritanceTaxBase);
    const netInherited = Math.floor(futureEstateValue - inheritanceTax);

    const diff = Math.abs(futureValueGifted - netInherited);
    const betterOption: 'gift' | 'inherit' = futureValueGifted > netInherited ? 'gift' : 'inherit';

    setResult({
      giftTax,
      futureValueGifted,
      futureEstateValue: Math.floor(futureEstateValue),
      inheritanceTax,
      netInherited,
      betterOption,
      diff: Math.floor(diff),
    });
  };

  const reset = () => {
    setAssetValue('500000000');
    setGrowthRate('4.0');
    setYears('10');
    setResult(null);
    setError('');
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-amber-900 mb-2">
        {ko ? '증여 vs 상속 비교 계산기' : 'Gift vs Inheritance Comparison'}
      </h3>
      <p className="text-sm text-amber-700 mb-6">
        {ko ? '지금 증여하는 것과 나중에 상속받는 것 중 어느 쪽이 세금을 더 절약할 수 있는지 비교합니다.' : 'Compare whether gifting now or inheriting later results in lower taxes.'}
      </p>

      <div className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-bold text-amber-800">
            {ko ? '현재 자산 가치 (원)' : 'Current Asset Value (KRW)'}
          </label>
          <input
            type="number"
            value={assetValue}
            onChange={(e) => setAssetValue(e.target.value)}
            min="0"
            className="w-full p-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-amber-800">
              {ko ? '연 자산 상승률 (%)' : 'Annual Growth Rate (%)'}
            </label>
            <input
              type="number"
              value={growthRate}
              onChange={(e) => setGrowthRate(e.target.value)}
              min="0"
              step="0.1"
              className="w-full p-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-amber-800">
              {ko ? '기간 (년)' : 'Years'}
            </label>
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              min="1"
              max="50"
              className="w-full p-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
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
            className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors"
          >
            {ko ? '비교하기' : 'Compare'}
          </button>
          <button
            onClick={reset}
            className="px-5 py-3 bg-white border border-amber-300 hover:bg-amber-50 text-amber-700 font-bold rounded-xl transition-colors"
          >
            {ko ? '초기화' : 'Reset'}
          </button>
        </div>

        {result && (
          <div className="mt-4 space-y-4" aria-live="polite">
            {/* Verdict banner */}
            <div className={`rounded-2xl p-5 text-center border-2 ${
              result.betterOption === 'gift'
                ? 'bg-amber-100 border-amber-400'
                : 'bg-emerald-50 border-emerald-400'
            }`}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-60">
                {ko ? '유리한 방법' : 'Better Option'}
              </p>
              <p className="text-xl font-black">
                {result.betterOption === 'gift'
                  ? (ko ? '지금 증여가 유리합니다' : 'Gift Now is Better')
                  : (ko ? '나중에 상속이 유리합니다' : 'Inherit Later is Better')}
              </p>
              <p className="text-sm font-bold mt-1">
                {ko ? `차이: ${fmt(result.diff)}` : `Difference: ${fmt(result.diff)}`}
              </p>
            </div>

            {/* Two scenario cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gift card */}
              <div className={`rounded-xl p-4 border-2 space-y-2 ${
                result.betterOption === 'gift' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'
              }`}>
                <h4 className="text-sm font-black text-amber-700 uppercase tracking-wide">
                  {ko ? '지금 증여' : 'Gift Now'}
                </h4>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>{ko ? '증여세' : 'Gift Tax'}</span>
                    <span className="font-bold text-red-600">-{fmt(result.giftTax)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span>{ko ? `${years}년 후 미래 가치` : `Value after ${years} yrs`}</span>
                    <span className="font-black text-amber-800">{fmt(result.futureValueGifted)}</span>
                  </div>
                </div>
              </div>

              {/* Inheritance card */}
              <div className={`rounded-xl p-4 border-2 space-y-2 ${
                result.betterOption === 'inherit' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'
              }`}>
                <h4 className="text-sm font-black text-emerald-700 uppercase tracking-wide">
                  {ko ? '나중에 상속' : 'Inherit Later'}
                </h4>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>{ko ? '상속세' : 'Inheritance Tax'}</span>
                    <span className="font-bold text-red-600">-{fmt(result.inheritanceTax)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span>{ko ? '세후 수령액' : 'Net Received'}</span>
                    <span className="font-black text-emerald-800">{fmt(result.netInherited)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * {ko
          ? '증여 기본공제 5천만원, 상속 일괄공제 5억원 적용. 단순 시뮬레이션으로 전문가 상담을 권장합니다.'
          : 'Gift deduction ₩50M, Inheritance deduction ₩500M applied. Simplified simulation — consult a tax professional.'}
      </p>
    </div>
  );
};

export default GiftVsInheritanceCalculator;
