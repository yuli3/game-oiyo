'use client';

import React, { useState } from 'react';

interface FireResult {
  fireNumber: number;
  yearsToFire: number;
  fireAge: number;
  alreadyFire: boolean;
  shortfall: number;
}

const FireRetirementCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [currentAge, setCurrentAge] = useState<string>('30');
  const [targetRetireAge, setTargetRetireAge] = useState<string>('50');
  const [currentAssets, setCurrentAssets] = useState<string>('100000000');
  const [monthlySavings, setMonthlySavings] = useState<string>('2000000');
  const [annualReturnRate, setAnnualReturnRate] = useState<string>('7');
  const [annualSpending, setAnnualSpending] = useState<string>('36000000');
  const [result, setResult] = useState<FireResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) => n.toLocaleString('ko-KR');

  const calculate = () => {
    setError('');
    const age = Number(currentAge);
    const retireAge = Number(targetRetireAge);
    const assets = Number(currentAssets);
    const annualSavings = Number(monthlySavings) * 12;
    const roi = Number(annualReturnRate) / 100;
    const spending = Number(annualSpending);

    if (age <= 0 || retireAge <= age || assets < 0 || annualSavings < 0 || spending <= 0 || roi < 0) {
      setError(locale === 'ko' ? '입력값을 올바르게 확인해 주세요.' : 'Please check your inputs.');
      return;
    }

    // 4% Rule: FIRE 필요 자산 = 연간지출 × 25
    const fireNumber = spending * 25;

    if (assets >= fireNumber) {
      setResult({ fireNumber, yearsToFire: 0, fireAge: age, alreadyFire: true, shortfall: 0 });
      return;
    }

    let current = assets;
    let years = 0;
    const r = roi;

    while (current < fireNumber && years < 100) {
      current = current * (1 + r) + annualSavings;
      years++;
    }

    const fireAge = age + years;
    const shortfall = fireAge > retireAge ? fireNumber - (assets * Math.pow(1 + r, retireAge - age) + annualSavings * (Math.pow(1 + r, retireAge - age) - 1) / r) : 0;

    setResult({ fireNumber, yearsToFire: years, fireAge, alreadyFire: false, shortfall: Math.max(0, shortfall) });
  };

  const reset = () => {
    setCurrentAge('30');
    setTargetRetireAge('50');
    setCurrentAssets('100000000');
    setMonthlySavings('2000000');
    setAnnualReturnRate('7');
    setAnnualSpending('36000000');
    setResult(null);
    setError('');
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-6">
        {locale === 'ko' ? 'FIRE 조기 은퇴 계산기' : 'FIRE Retirement Calculator'}
      </h3>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-emerald-800">
                {locale === 'ko' ? '현재 나이' : 'Current Age'}
              </label>
              <input
                type="number"
                value={currentAge}
                onChange={(e) => setCurrentAge(e.target.value)}
                min="1"
                max="80"
                className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
                aria-label={locale === 'ko' ? '현재 나이' : 'Current Age'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-emerald-800">
                {locale === 'ko' ? '목표 은퇴 나이' : 'Target Retire Age'}
              </label>
              <input
                type="number"
                value={targetRetireAge}
                onChange={(e) => setTargetRetireAge(e.target.value)}
                min="1"
                max="80"
                className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
                aria-label={locale === 'ko' ? '목표 은퇴 나이' : 'Target Retire Age'}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '현재 자산 (원)' : 'Current Assets (KRW)'}
            </label>
            <input
              type="number"
              value={currentAssets}
              onChange={(e) => setCurrentAssets(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '현재 자산' : 'Current Assets'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '월 저축액 (원)' : 'Monthly Savings (KRW)'}
            </label>
            <input
              type="number"
              value={monthlySavings}
              onChange={(e) => setMonthlySavings(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '월 저축액' : 'Monthly Savings'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-emerald-800">
                {locale === 'ko' ? '연 수익률 (%)' : 'Annual Return (%)'}
              </label>
              <input
                type="number"
                value={annualReturnRate}
                onChange={(e) => setAnnualReturnRate(e.target.value)}
                step="0.1"
                min="0"
                max="30"
                className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
                aria-label={locale === 'ko' ? '연 수익률' : 'Annual Return Rate'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-emerald-800">
                {locale === 'ko' ? '연 지출액 (원)' : 'Annual Spending (KRW)'}
              </label>
              <input
                type="number"
                value={annualSpending}
                onChange={(e) => setAnnualSpending(e.target.value)}
                min="0"
                className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
                aria-label={locale === 'ko' ? '연 지출액' : 'Annual Spending'}
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
              aria-label={locale === 'ko' ? '다시 계산하기' : 'Reset'}
            >
              {locale === 'ko' ? '초기화' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col justify-center">
          {result ? (
            <div className="space-y-4">
              {result.alreadyFire ? (
                <div className="p-6 bg-emerald-600 text-white rounded-2xl text-center">
                  <div className="text-2xl font-bold mb-2">
                    {locale === 'ko' ? '이미 FIRE 달성!' : 'Already FIRE!'}
                  </div>
                  <p className="text-emerald-100 text-sm">
                    {locale === 'ko' ? '현재 자산으로 조기 은퇴가 가능합니다.' : 'Your assets are sufficient for retirement.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-2xl border border-emerald-100 text-center">
                    <span className="text-xs text-emerald-600 font-bold uppercase tracking-wide block mb-1">
                      {locale === 'ko' ? 'FIRE까지 기간' : 'Years to FIRE'}
                    </span>
                    <span className="text-4xl font-bold text-emerald-700">{result.yearsToFire}</span>
                    <span className="text-sm text-emerald-500 ml-1">{locale === 'ko' ? '년' : 'yrs'}</span>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-emerald-100 text-center">
                    <span className="text-xs text-emerald-600 font-bold uppercase tracking-wide block mb-1">
                      {locale === 'ko' ? '은퇴 예상 나이' : 'FIRE Age'}
                    </span>
                    <span className="text-4xl font-bold text-emerald-700">{result.fireAge}</span>
                    <span className="text-sm text-emerald-500 ml-1">{locale === 'ko' ? '세' : 'yrs old'}</span>
                  </div>
                </div>
              )}

              <div className="p-5 bg-white rounded-2xl border border-emerald-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-slate-500">{locale === 'ko' ? 'FIRE 필요 자산 (4% 룰)' : 'FIRE Number (4% Rule)'}</span>
                </div>
                <div className="text-2xl font-bold text-emerald-700">{fmt(result.fireNumber)}원</div>
                <p className="text-xs text-slate-400 mt-1">
                  {locale === 'ko' ? `연 지출 × 25배 = ${fmt(Number(annualSpending))}원 × 25` : `Annual spending × 25`}
                </p>
              </div>

              {!result.alreadyFire && result.shortfall > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <span className="text-xs text-amber-600 font-bold uppercase tracking-wide block mb-1">
                    {locale === 'ko' ? '목표 나이 기준 부족액' : 'Shortfall at Target Age'}
                  </span>
                  <span className="text-lg font-bold text-amber-700">{fmt(Math.round(result.shortfall))}원</span>
                </div>
              )}

              {!result.alreadyFire && result.fireAge <= Number(targetRetireAge) && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm font-bold">
                  {locale === 'ko'
                    ? `목표 은퇴 나이(${targetRetireAge}세) 이전에 FIRE 달성 가능합니다.`
                    : `You can achieve FIRE before your target age of ${targetRetireAge}.`}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-emerald-300 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <span className="text-3xl" aria-hidden="true">🔥</span>
              </div>
              <p className="text-sm text-emerald-400 font-bold">
                {locale === 'ko' ? '정보를 입력하고 계산하세요' : 'Enter info and calculate'}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * FIRE = Financial Independence, Retire Early. 4% 룰 기준 계산이며 실제 시장 수익률과 다를 수 있습니다.
      </p>
    </div>
  );
};

export default FireRetirementCalculator;
