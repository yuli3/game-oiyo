'use client';

import React, { useState } from 'react';

// ISA constants
const ISA_MAX_ANNUAL = 20_000_000;
const ISA_TAX_FREE_GENERAL = 2_000_000;
const ISA_TAX_FREE_SEOMIN = 4_000_000;
const ISA_SEPARATOR_TAX_RATE = 0.099;

// Pension constants
const PENSION_MAX_DEDUCTION = 9_000_000;
const PENSION_DEDUCTION_HIGH = 0.132;
const PENSION_DEDUCTION_LOW = 0.165;
const PENSION_INCOME_THRESHOLD = 55_000_000;
const PENSION_TAX_RATE = 0.038;

type IsaType = 'general' | 'seomin';

interface IsaResult {
  totalInvested: number;
  projectedReturn: number;
  taxFreeBenefit: number;
  separatorTax: number;
  netBenefit: number;
  finalAmount: number;
}

interface PensionResult {
  totalInvested: number;
  projectedReturn: number;
  taxDeduction: number;
  pensionTax: number;
  netBenefit: number;
  finalAmount: number;
}

interface CalcResult {
  isa: IsaResult;
  pension: PensionResult;
}

function doCalc(
  annualInvestment: number,
  years: number,
  expectedReturn: number,
  annualIncome: number,
  isaType: IsaType
): CalcResult | null {
  if (annualInvestment <= 0 || years <= 0) return null;
  const rate = expectedReturn / 100;

  // ISA
  const isaAnnual = Math.min(annualInvestment, ISA_MAX_ANNUAL);
  const isaTotal = isaAnnual * years;
  let isaFV = 0;
  for (let i = 0; i < years; i++) {
    isaFV += isaAnnual * Math.pow(1 + rate, years - i);
  }
  const isaReturn = Math.floor(isaFV - isaTotal);
  const taxFreeLimit = isaType === 'seomin' ? ISA_TAX_FREE_SEOMIN : ISA_TAX_FREE_GENERAL;
  const taxableReturn = Math.max(0, isaReturn - taxFreeLimit);
  const isaTaxFreeBenefit = Math.floor(Math.min(isaReturn, taxFreeLimit) * 0.154);
  const isaSeparatorTax = Math.floor(taxableReturn * ISA_SEPARATOR_TAX_RATE);
  const isaSeparatorBenefit = Math.floor(taxableReturn * (0.154 - ISA_SEPARATOR_TAX_RATE));
  const isaNetBenefit = isaTaxFreeBenefit + isaSeparatorBenefit;
  const isaFinalAmount = Math.floor(isaTotal + isaReturn - isaSeparatorTax);

  // Pension
  const pensionAnnual = Math.min(annualInvestment, PENSION_MAX_DEDUCTION);
  const pensionTotal = pensionAnnual * years;
  let pensionFV = 0;
  for (let i = 0; i < years; i++) {
    pensionFV += pensionAnnual * Math.pow(1 + rate, years - i);
  }
  const pensionReturn = Math.floor(pensionFV - pensionTotal);
  const deductionRate = annualIncome <= PENSION_INCOME_THRESHOLD ? PENSION_DEDUCTION_LOW : PENSION_DEDUCTION_HIGH;
  const annualDeduction = Math.floor(pensionAnnual * deductionRate);
  const totalDeduction = annualDeduction * years;
  const pensionTax = Math.floor((pensionTotal + pensionReturn) * PENSION_TAX_RATE);
  const pensionNetBenefit = totalDeduction - pensionTax;
  const pensionFinalAmount = Math.floor(pensionTotal + pensionReturn - pensionTax + totalDeduction);

  return {
    isa: {
      totalInvested: isaTotal,
      projectedReturn: isaReturn,
      taxFreeBenefit: isaNetBenefit,
      separatorTax: isaSeparatorTax,
      netBenefit: isaNetBenefit,
      finalAmount: isaFinalAmount,
    },
    pension: {
      totalInvested: pensionTotal,
      projectedReturn: pensionReturn,
      taxDeduction: totalDeduction,
      pensionTax,
      netBenefit: pensionNetBenefit,
      finalAmount: pensionFinalAmount,
    },
  };
}

const IsaVsPensionCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const ko = locale === 'ko';

  const [annualInvestment, setAnnualInvestment] = useState<string>('9000000');
  const [annualIncome, setAnnualIncome] = useState<string>('50000000');
  const [years, setYears] = useState<string>('10');
  const [expectedReturn, setExpectedReturn] = useState<string>('6');
  const [isaType, setIsaType] = useState<IsaType>('general');
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR') + '원';

  const calculate = () => {
    setError('');
    const inv = Number(annualInvestment);
    const inc = Number(annualIncome);
    const yrs = Number(years);
    const ret = Number(expectedReturn);
    if (inv <= 0 || yrs <= 0 || ret < 0 || inc < 0) {
      setError(ko ? '입력값을 올바르게 확인해 주세요.' : 'Please check your inputs.');
      return;
    }
    const r = doCalc(inv, yrs, ret, inc, isaType);
    if (!r) {
      setError(ko ? '계산 오류가 발생했습니다.' : 'Calculation error.');
      return;
    }
    setResult(r);
  };

  const reset = () => {
    setAnnualInvestment('9000000');
    setAnnualIncome('50000000');
    setYears('10');
    setExpectedReturn('6');
    setIsaType('general');
    setResult(null);
    setError('');
  };

  const yearOptions = ['3', '5', '10', '20', '30'];

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-sky-900 mb-2">
        {ko ? 'ISA vs 연금저축 비교 계산기' : 'ISA vs Pension Savings Comparison'}
      </h3>
      <p className="text-sm text-sky-700 mb-6">
        {ko ? 'ISA와 연금저축·IRP 중 세제 혜택이 더 큰 상품을 비교합니다.' : 'Compare tax benefits between ISA and pension savings (IRP) accounts.'}
      </p>

      <div className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-bold text-sky-800">
            {ko ? '연 납입액 (원)' : 'Annual Investment (KRW)'}
          </label>
          <input
            type="number"
            value={annualInvestment}
            onChange={(e) => setAnnualInvestment(e.target.value)}
            min="0"
            className="w-full p-3 bg-white border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-sky-800">
            {ko ? '연 총급여 (원, 세액공제율 기준)' : 'Annual Income (KRW, for tax rate)'}
          </label>
          <input
            type="number"
            value={annualIncome}
            onChange={(e) => setAnnualIncome(e.target.value)}
            min="0"
            className="w-full p-3 bg-white border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-sky-800">
              {ko ? '기간 (년)' : 'Period (years)'}
            </label>
            <div className="flex gap-1 flex-wrap">
              {yearOptions.map((y) => (
                <button
                  key={y}
                  onClick={() => setYears(y)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    years === y
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  {y}{ko ? '년' : 'yr'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-sky-800">
              {ko ? '연 수익률 (%)' : 'Expected Return (%)'}
            </label>
            <input
              type="number"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(e.target.value)}
              min="0"
              step="0.1"
              className="w-full p-3 bg-white border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-sky-800">
            {ko ? 'ISA 유형' : 'ISA Type'}
          </label>
          <div className="flex gap-2">
            {(['general', 'seomin'] as IsaType[]).map((t) => (
              <button
                key={t}
                onClick={() => setIsaType(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  isaType === t
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-50'
                }`}
              >
                {t === 'general'
                  ? (ko ? '일반형 (비과세 200만)' : 'General (₩2M tax-free)')
                  : (ko ? '서민형 (비과세 400만)' : 'Low-Income (₩4M tax-free)')}
              </button>
            ))}
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
            className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-colors"
          >
            {ko ? '비교하기' : 'Compare'}
          </button>
          <button
            onClick={reset}
            className="px-5 py-3 bg-white border border-sky-300 hover:bg-sky-50 text-sky-700 font-bold rounded-xl transition-colors"
          >
            {ko ? '초기화' : 'Reset'}
          </button>
        </div>

        {result && (
          <div className="mt-4 space-y-4" aria-live="polite">
            {/* ISA Card */}
            <div className="bg-white rounded-2xl border-2 border-sky-200 p-5 space-y-3">
              <h4 className="text-base font-black text-sky-700 text-center">ISA</h4>
              <div className="text-center">
                <p className="text-xs text-sky-500 font-semibold">{ko ? '최종 수령액' : 'Final Amount'}</p>
                <p className="text-2xl font-black text-sky-900">{fmt(result.isa.finalAmount)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: ko ? '납입 원금' : 'Total Invested', value: fmt(result.isa.totalInvested) },
                  { label: ko ? '예상 수익' : 'Projected Return', value: fmt(result.isa.projectedReturn) },
                  { label: ko ? '절세 혜택' : 'Tax Benefit', value: '+' + fmt(result.isa.taxFreeBenefit), cls: 'text-sky-700' },
                  { label: ko ? '분리과세' : 'Separator Tax', value: '-' + fmt(result.isa.separatorTax), cls: 'text-red-600' },
                ].map((item) => (
                  <div key={item.label} className="bg-sky-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-sky-400 font-semibold mb-0.5">{item.label}</p>
                    <p className={`text-xs font-bold ${item.cls ?? 'text-sky-900'}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pension Card */}
            <div className="bg-white rounded-2xl border-2 border-indigo-200 p-5 space-y-3">
              <h4 className="text-base font-black text-indigo-700 text-center">
                {ko ? '연금저축+IRP' : 'Pension Savings + IRP'}
              </h4>
              <div className="text-center">
                <p className="text-xs text-indigo-500 font-semibold">{ko ? '최종 수령액' : 'Final Amount'}</p>
                <p className="text-2xl font-black text-indigo-900">{fmt(result.pension.finalAmount)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: ko ? '납입 원금' : 'Total Invested', value: fmt(result.pension.totalInvested) },
                  { label: ko ? '예상 수익' : 'Projected Return', value: fmt(result.pension.projectedReturn) },
                  { label: ko ? '세액공제 합계' : 'Tax Deduction', value: '+' + fmt(result.pension.taxDeduction), cls: 'text-indigo-700' },
                  { label: ko ? '연금소득세' : 'Pension Income Tax', value: '-' + fmt(result.pension.pensionTax), cls: 'text-red-600' },
                ].map((item) => (
                  <div key={item.label} className="bg-indigo-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-indigo-400 font-semibold mb-0.5">{item.label}</p>
                    <p className={`text-xs font-bold ${item.cls ?? 'text-indigo-900'}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Net benefit comparison */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3 text-center">
                {ko ? '순 절세 혜택 비교' : 'Net Tax Benefit Comparison'}
              </p>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs text-sky-500">ISA</p>
                  <p className="text-lg font-black text-sky-700">{fmt(result.isa.netBenefit)}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-500">{ko ? '연금저축' : 'Pension'}</p>
                  <p className="text-lg font-black text-indigo-700">{fmt(result.pension.netBenefit)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * {ko
          ? '단순 시뮬레이션입니다. 실제 세제는 변경될 수 있으니 전문가 상담을 권장합니다.'
          : 'Simplified simulation. Tax rules may change — consult a professional.'}
      </p>
    </div>
  );
};

export default IsaVsPensionCalculator;
