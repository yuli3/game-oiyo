'use client';

import React, { useState } from 'react';

type IncomeType = 'earned' | 'comprehensive';

interface PensionTaxResult {
  ratePercentage: string;
  pensionRecognized: number;
  irpRecognized: number;
  combinedBase: number;
  refundAmount: number;
}

function calcPensionTax(
  incomeType: IncomeType,
  annualIncome: number,
  pensionSavings: number,
  irpDeposit: number
): PensionTaxResult {
  const isLowIncome =
    incomeType === 'earned' ? annualIncome <= 55_000_000 : annualIncome <= 45_000_000;
  const rate = isLowIncome ? 0.165 : 0.132;
  const ratePercentage = isLowIncome ? '16.5%' : '13.2%';

  const pensionRecognized = Math.min(pensionSavings, 6_000_000);
  const combinedBase = Math.min(pensionRecognized + irpDeposit, 9_000_000);
  const irpRecognized = combinedBase - pensionRecognized;
  const refundAmount = Math.floor(combinedBase * rate);

  return { ratePercentage, pensionRecognized, irpRecognized, combinedBase, refundAmount };
}

const PensionTaxCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const ko = locale === 'ko';

  const [incomeType, setIncomeType] = useState<IncomeType>('earned');
  const [annualIncome, setAnnualIncome] = useState<string>('50000000');
  const [pensionSavings, setPensionSavings] = useState<string>('6000000');
  const [irpDeposit, setIrpDeposit] = useState<string>('3000000');
  const [result, setResult] = useState<PensionTaxResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR') + '원';

  const calculate = () => {
    setError('');
    const income = Number(annualIncome);
    const pension = Number(pensionSavings);
    const irp = Number(irpDeposit);

    if (income < 0 || pension < 0 || irp < 0) {
      setError(ko ? '입력값을 올바르게 확인해 주세요.' : 'Please check your inputs.');
      return;
    }

    setResult(calcPensionTax(incomeType, income, pension, irp));
  };

  const reset = () => {
    setIncomeType('earned');
    setAnnualIncome('50000000');
    setPensionSavings('6000000');
    setIrpDeposit('3000000');
    setResult(null);
    setError('');
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-rose-900 mb-2">
        {ko ? '연금저축 세액공제 계산기' : 'Pension Savings Tax Credit Calculator'}
      </h3>
      <p className="text-sm text-rose-700 mb-6">
        {ko
          ? '연금저축·IRP 납입액에 따른 연말정산 세액공제 환급액을 계산합니다.'
          : 'Calculate your year-end tax credit refund based on pension savings and IRP contributions.'}
      </p>

      <div className="space-y-5">
        {/* Income type toggle */}
        <div className="space-y-1">
          <label className="text-sm font-bold text-rose-800">
            {ko ? '소득 유형' : 'Income Type'}
          </label>
          <div className="flex gap-2">
            {(['earned', 'comprehensive'] as IncomeType[]).map((t) => (
              <button
                key={t}
                onClick={() => setIncomeType(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  incomeType === t
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                }`}
              >
                {t === 'earned'
                  ? (ko ? '근로소득' : 'Earned Income')
                  : (ko ? '종합소득' : 'Comprehensive Income')}
              </button>
            ))}
          </div>
          <p className="text-xs text-rose-500">
            {ko
              ? (incomeType === 'earned' ? '기준: 총급여 5,500만원' : '기준: 종합소득금액 4,500만원')
              : (incomeType === 'earned' ? 'Threshold: ₩55M total salary' : 'Threshold: ₩45M comprehensive income')}
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-rose-800">
            {ko ? (incomeType === 'earned' ? '총급여 (원)' : '종합소득금액 (원)') : 'Annual Income (KRW)'}
          </label>
          <input
            type="number"
            value={annualIncome}
            onChange={(e) => setAnnualIncome(e.target.value)}
            min="0"
            className="w-full p-3 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-rose-800">
              {ko ? '연금저축 납입액 (원)' : 'Pension Savings (KRW)'}
            </label>
            <input
              type="number"
              value={pensionSavings}
              onChange={(e) => setPensionSavings(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none"
            />
            <p className="text-xs text-rose-400">{ko ? '공제한도: 600만원' : 'Limit: ₩6M'}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-rose-800">
              {ko ? 'IRP 납입액 (원)' : 'IRP Contribution (KRW)'}
            </label>
            <input
              type="number"
              value={irpDeposit}
              onChange={(e) => setIrpDeposit(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none"
            />
            <p className="text-xs text-rose-400">{ko ? '합산한도: 900만원' : 'Combined limit: ₩9M'}</p>
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
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors"
          >
            {ko ? '계산하기' : 'Calculate'}
          </button>
          <button
            onClick={reset}
            className="px-5 py-3 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold rounded-xl transition-colors"
          >
            {ko ? '초기화' : 'Reset'}
          </button>
        </div>

        {result && (
          <div className="mt-4 space-y-4" aria-live="polite">
            {/* Refund amount hero */}
            <div className="bg-rose-600 text-white rounded-2xl p-6 text-center">
              <p className="text-sm font-semibold opacity-80 mb-1">
                {ko ? '예상 세액공제 환급액' : 'Estimated Tax Credit Refund'}
              </p>
              <p className="text-3xl font-black">{fmt(result.refundAmount)}</p>
              <p className="text-sm opacity-70 mt-1">
                {ko ? `세액공제율: ${result.ratePercentage}` : `Credit Rate: ${result.ratePercentage}`}
              </p>
            </div>

            {/* Detail cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: ko ? '공제 적용 기준액' : 'Deductible Base', value: fmt(result.combinedBase) },
                { label: ko ? '세액공제율' : 'Credit Rate', value: result.ratePercentage },
                { label: ko ? '연금저축 인정액' : 'Pension Recognized', value: fmt(result.pensionRecognized) },
                { label: ko ? 'IRP 인정액' : 'IRP Recognized', value: fmt(result.irpRecognized) },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl p-3 border border-rose-100">
                  <p className="text-xs text-rose-400 font-semibold mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-rose-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * {ko
          ? '총급여 5,500만원 이하: 16.5%, 초과: 13.2% 세액공제율 적용.'
          : 'Total salary ≤₩55M: 16.5% credit; >₩55M: 13.2% credit.'}
      </p>
    </div>
  );
};

export default PensionTaxCalculator;
