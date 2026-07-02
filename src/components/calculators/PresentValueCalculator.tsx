'use client';

import React, { useState, useEffect } from 'react';

type Method = 'compound' | 'hoffman';

interface PVResult {
  presentValue: number;
  coefficient: number;
  totalScheduled: number;
}

function calcCoefficient(method: Method, durationMonths: number, annualRate: number): number {
  const r = annualRate / 100;
  if (method === 'compound') {
    const i = r / 12;
    if (i === 0) return durationMonths;
    return (1 - Math.pow(1 + i, -durationMonths)) / i;
  } else {
    // Hoffman (simple interest discount) — used in Korean courts
    let total = 0;
    for (let k = 1; k <= durationMonths; k++) {
      total += 1 / (1 + r * (k / 12));
    }
    return total;
  }
}

const PresentValueCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const ko = locale === 'ko';

  const [monthlyPayment, setMonthlyPayment] = useState<string>('1000000');
  const [durationMonths, setDurationMonths] = useState<string>('120');
  const [annualRate, setAnnualRate] = useState<string>('5');
  const [method, setMethod] = useState<Method>('compound');
  const [result, setResult] = useState<PVResult | null>(null);

  const fmt = (n: number) =>
    Math.floor(n).toLocaleString('ko-KR') + '원';

  // Auto-calculate on input change
  useEffect(() => {
    const payment = Number(monthlyPayment);
    const months = Number(durationMonths);
    const rate = Number(annualRate);
    if (payment <= 0 || months <= 0 || rate < 0) {
      setResult(null);
      return;
    }
    const coeff = calcCoefficient(method, months, rate);
    setResult({
      presentValue: payment * coeff,
      coefficient: coeff,
      totalScheduled: payment * months,
    });
  }, [monthlyPayment, durationMonths, annualRate, method]);

  const durationPresets = [
    { label: ko ? '5년' : '5 yr', value: '60' },
    { label: ko ? '10년' : '10 yr', value: '120' },
    { label: ko ? '20년' : '20 yr', value: '240' },
  ];

  const currentYear = new Date().getFullYear();
  const endYear = currentYear + Math.floor(Number(durationMonths) / 12);

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-indigo-900 mb-2">
        {ko ? '연금 현재가치 계산기' : 'Present Value (Annuity) Calculator'}
      </h3>
      <p className="text-sm text-indigo-700 mb-6">
        {ko
          ? '미래에 받을 연금·손해배상액의 현재 가치를 라이프니츠(복리) 또는 호프만(단리) 방식으로 계산합니다.'
          : 'Calculate the present value of future periodic payments using compound (Leibniz) or simple interest (Hoffman) discounting.'}
      </p>

      <div className="space-y-5">
        {/* Method toggle */}
        <div className="space-y-1">
          <label className="text-sm font-bold text-indigo-800">
            {ko ? '할인 방식' : 'Discount Method'}
          </label>
          <div className="flex gap-2">
            {(['compound', 'hoffman'] as Method[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  method === m
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                {m === 'compound'
                  ? (ko ? '라이프니츠 (복리)' : 'Leibniz (Compound)')
                  : (ko ? '호프만 (단리)' : 'Hoffman (Simple)')}
              </button>
            ))}
          </div>
          <p className="text-xs text-indigo-500">
            {method === 'compound'
              ? (ko ? '금융·보험 분야에서 주로 사용' : 'Commonly used in finance and insurance')
              : (ko ? '한국 법원 손해배상 산정 기준' : 'Used in Korean court damage calculations')}
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-indigo-800">
            {ko ? '월 수령액 (원)' : 'Monthly Payment (KRW)'}
          </label>
          <input
            type="number"
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            min="0"
            className="w-full p-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-indigo-800">
            {ko ? `수령 기간 (개월) — ${currentYear} ~ ${endYear}년` : `Duration (months) — ${currentYear} to ${endYear}`}
          </label>
          <div className="flex gap-2 mb-2">
            {durationPresets.map((p) => (
              <button
                key={p.value}
                onClick={() => setDurationMonths(p.value)}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                  durationMonths === p.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={durationMonths}
            onChange={(e) => setDurationMonths(e.target.value)}
            min="1"
            className="w-full p-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-indigo-800">
            {ko ? '연 할인율 (%)' : 'Annual Discount Rate (%)'}
          </label>
          <input
            type="number"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
            min="0"
            step="0.1"
            className="w-full p-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />
          <p className="text-xs text-indigo-400">
            {ko ? '법원 기준 5% 적용' : 'Korean court standard: 5%'}
          </p>
        </div>

        {result && (
          <div className="mt-4 space-y-4" aria-live="polite" aria-atomic="true">
            {/* PV hero */}
            <div className="bg-indigo-600 text-white rounded-2xl p-6 text-center">
              <p className="text-sm font-semibold opacity-80 mb-1">
                {ko ? '현재 가치 (PV)' : 'Present Value (PV)'}
              </p>
              <p className="text-3xl font-black">{fmt(result.presentValue)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: ko ? '총 예정 수령액' : 'Total Scheduled', value: fmt(result.totalScheduled) },
                { label: ko ? `할인계수 (${method === 'compound' ? '라이프니츠' : '호프만'})` : `Coefficient (${method})`, value: result.coefficient.toFixed(4) },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl p-3 border border-indigo-100">
                  <p className="text-xs text-indigo-400 font-semibold mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-indigo-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * {ko
          ? '라이프니츠: PV = PMT × [(1 - (1+i)^-n) / i]  |  호프만: PV = Σ PMT / (1 + r × k/12)'
          : 'Leibniz: PV = PMT × [(1 - (1+i)^-n) / i]  |  Hoffman: PV = Σ PMT / (1 + r × k/12)'}
      </p>
    </div>
  );
};

export default PresentValueCalculator;
