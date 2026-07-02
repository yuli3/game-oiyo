'use client';

import React, { useState, useEffect, useCallback } from 'react';

// 연금저축 세액공제 한도: 600만원, IRP 포함 합산 900만원
const MAX_PENSION = 6_000_000;
const MAX_TOTAL = 9_000_000;

interface PensionResult {
  rate: number;
  recognizedPension: number;
  recognizedIrp: number;
  totalRecognized: number;
  taxRefund: number;
  maxRefund: number;
  achievementPct: number;
  totalRetirementAsset: number;
  monthlyRetirementIncome: number;
  tip: string;
}

const PensionOptimizerCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [currentAge, setCurrentAge] = useState<string>('35');
  const [nationalPension, setNationalPension] = useState<string>('1000000');
  const [irpBalance, setIrpBalance] = useState<string>('50000000');
  const [pensionMonthly, setPensionMonthly] = useState<string>('400000');
  const [irpMonthly, setIrpMonthly] = useState<string>('200000');
  const [income, setIncome] = useState<string>('50000000');
  const [lifeExpectancy, setLifeExpectancy] = useState<string>('83');
  const [result, setResult] = useState<PensionResult | null>(null);

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

  const calculate = useCallback(() => {
    const age = Number(currentAge);
    const natPension = Number(nationalPension);
    const irpBal = Number(irpBalance);
    const pensionAnnual = Number(pensionMonthly) * 12;
    const irpAnnual = Number(irpMonthly) * 12;
    const inc = Number(income);
    const lifeExp = Number(lifeExpectancy);

    if (age <= 0 || inc <= 0) return;

    // 세액공제율
    const rate = inc <= 55_000_000 ? 16.5 : 13.2;
    const recognizedPension = Math.min(pensionAnnual, MAX_PENSION);
    const recognizedIrp = Math.min(irpAnnual, Math.max(0, MAX_TOTAL - recognizedPension));
    const totalRecognized = recognizedPension + recognizedIrp;
    const taxRefund = Math.floor(totalRecognized * (rate / 100));
    const maxRefund = Math.floor(MAX_TOTAL * (rate / 100));
    const achievementPct = maxRefund > 0 ? Math.round((taxRefund / maxRefund) * 100) : 0;

    // 은퇴 후 자산 추정 (6% 수익률, 65세 은퇴 가정)
    const retireAge = 65;
    const yearsToRetire = Math.max(0, retireAge - age);
    const r = 0.06;
    const irpFv = irpBal * Math.pow(1 + r, yearsToRetire) + (irpAnnual + pensionAnnual) * (Math.pow(1 + r, yearsToRetire) - 1) / r;
    const totalRetirementAsset = Math.floor(irpFv);

    // 은퇴 후 월 소득
    const retirementYears = Math.max(1, lifeExp - retireAge);
    const monthlyFromIrp = totalRetirementAsset / (retirementYears * 12);
    const monthlyRetirementIncome = Math.floor(monthlyFromIrp + natPension);

    // 팁
    let tip = '';
    const missing = MAX_TOTAL - (pensionAnnual + irpAnnual);
    if (missing > 0) {
      tip = locale === 'ko'
        ? `IRP에 연 ${fmt(missing)}원을 더 납입하면 최대 환급액을 받을 수 있습니다.`
        : `Add ₩${fmt(missing)}/yr to IRP to maximize your tax credit.`;
    } else if (pensionAnnual > MAX_PENSION) {
      tip = locale === 'ko'
        ? `연금저축 한도(600만원)를 초과했습니다. 초과분은 IRP로 이관하는 것이 유리합니다.`
        : `Pension savings exceed the ₩6M limit. Consider moving the excess to IRP.`;
    } else {
      tip = locale === 'ko'
        ? `세액공제 한도를 꽉 채우셨습니다. 최대 혜택을 받고 있습니다.`
        : `You're maximizing your tax credit benefits. `;
    }

    setResult({
      rate,
      recognizedPension,
      recognizedIrp,
      totalRecognized,
      taxRefund,
      maxRefund,
      achievementPct,
      totalRetirementAsset,
      monthlyRetirementIncome,
      tip,
    });
  }, [currentAge, nationalPension, irpBalance, pensionMonthly, irpMonthly, income, lifeExpectancy, locale]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  const reset = () => {
    setCurrentAge('35');
    setNationalPension('1000000');
    setIrpBalance('50000000');
    setPensionMonthly('400000');
    setIrpMonthly('200000');
    setIncome('50000000');
    setLifeExpectancy('83');
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-6">
        {locale === 'ko' ? '연금 최적화 계산기' : 'Pension Optimizer'}
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
                min="18"
                max="64"
                className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
                aria-label={locale === 'ko' ? '현재 나이' : 'Current Age'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-emerald-800">
                {locale === 'ko' ? '기대수명' : 'Life Expectancy'}
              </label>
              <input
                type="number"
                value={lifeExpectancy}
                onChange={(e) => setLifeExpectancy(e.target.value)}
                min="65"
                max="100"
                className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
                aria-label={locale === 'ko' ? '기대수명' : 'Life Expectancy'}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '연간 총소득 (원)' : 'Annual Income (KRW)'}
            </label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '연간 총소득' : 'Annual Income'}
            />
            {result && (
              <p className="text-xs text-emerald-600 font-bold">
                {locale === 'ko' ? `적용 세액공제율: ${result.rate}%` : `Tax credit rate: ${result.rate}%`}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '국민연금 예상 수령액 (월, 원)' : 'Expected National Pension (monthly, KRW)'}
            </label>
            <input
              type="number"
              value={nationalPension}
              onChange={(e) => setNationalPension(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '국민연금 예상 수령액' : 'National Pension'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? 'IRP·퇴직연금 현재 잔액 (원)' : 'IRP/Retirement Fund Balance (KRW)'}
            </label>
            <input
              type="number"
              value={irpBalance}
              onChange={(e) => setIrpBalance(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? 'IRP 잔액' : 'IRP Balance'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-emerald-800">
                {locale === 'ko' ? '연금저축 월납입 (원)' : 'Pension Savings/mo (KRW)'}
              </label>
              <input
                type="number"
                value={pensionMonthly}
                onChange={(e) => setPensionMonthly(e.target.value)}
                min="0"
                className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
                aria-label={locale === 'ko' ? '연금저축 월납입' : 'Pension Savings monthly'}
              />
              <p className="text-xs text-emerald-500">
                {locale === 'ko' ? '연 한도 600만원' : 'Annual limit ₩6M'}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-emerald-800">
                {locale === 'ko' ? 'IRP 월납입 (원)' : 'IRP monthly (KRW)'}
              </label>
              <input
                type="number"
                value={irpMonthly}
                onChange={(e) => setIrpMonthly(e.target.value)}
                min="0"
                className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
                aria-label={locale === 'ko' ? 'IRP 월납입' : 'IRP monthly'}
              />
              <p className="text-xs text-emerald-500">
                {locale === 'ko' ? '합산 한도 900만원' : 'Combined limit ₩9M'}
              </p>
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full py-2 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl transition-colors text-sm"
            aria-label={locale === 'ko' ? '초기화' : 'Reset'}
          >
            {locale === 'ko' ? '다시 계산하기' : 'Reset'}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="p-6 bg-emerald-600 text-white rounded-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
                  {locale === 'ko' ? '예상 연말정산 환급액' : 'Expected Tax Refund'}
                </p>
                <p className="text-4xl font-bold">{fmt(result.taxRefund)}원</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs opacity-80 mb-1">
                    <span>{locale === 'ko' ? '세액공제 달성도' : 'Achievement'}</span>
                    <span>{result.achievementPct}%</span>
                  </div>
                  <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${result.achievementPct}%` }}
                      role="progressbar"
                      aria-valuenow={result.achievementPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <p className="text-xs opacity-60 mt-1">
                    {locale === 'ko' ? `최대 가능 환급액: ${fmt(result.maxRefund)}원` : `Max possible: ₩${fmt(result.maxRefund)}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">
                    {locale === 'ko' ? '은퇴 후 월 예상 소득' : 'Monthly Income at Retire'}
                  </p>
                  <p className="text-xl font-bold text-emerald-700">{fmt(result.monthlyRetirementIncome)}원</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-emerald-100 text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">
                    {locale === 'ko' ? '65세 시점 총 노후 자산' : 'Retirement Assets at 65'}
                  </p>
                  <p className="text-xl font-bold text-emerald-700">{fmt(result.totalRetirementAsset)}원</p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-800 font-bold">
                {result.tip}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-emerald-200">
              <span className="text-4xl mb-2" aria-hidden="true">💰</span>
              <p className="text-sm font-bold text-emerald-300">
                {locale === 'ko' ? '정보를 입력하면 자동으로 계산됩니다' : 'Results update automatically'}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * 65세 은퇴, 연 6% 수익률 가정. 실제 연금 수령액은 운용 성과에 따라 달라집니다. 세무 전문가 상담 권장.
      </p>
    </div>
  );
};

export default PensionOptimizerCalculator;
