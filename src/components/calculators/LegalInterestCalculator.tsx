'use client';

import React, { useState, useMemo } from 'react';

type RateType = 'civil' | 'commercial' | 'overdue' | 'custom';

interface RateOption {
  id: RateType;
  rate: number;
}

const RATE_OPTIONS: RateOption[] = [
  { id: 'civil', rate: 5 },
  { id: 'commercial', rate: 6 },
  { id: 'overdue', rate: 12 },
  { id: 'custom', rate: 0 },
];

const ko = {
  title: '법정 이자 계산기',
  principalLabel: '원금 (원)',
  startDateLabel: '기산일 (이자 발생 시작일)',
  endDateLabel: '종료일',
  rateLabel: '이자율 유형',
  customRateLabel: '직접 입력 (%)',
  calculate: '계산하기',
  reset: '초기화',
  daysResult: (d: number) => `${d}일 (약 ${(d / 365).toFixed(2)}년)`,
  interestLabel: '발생 이자',
  principalResultLabel: '원금',
  rateResultLabel: '적용 이율',
  totalLabel: '원금+이자 합계',
  error: '원금, 날짜를 올바르게 입력해 주세요.',
  disclaimer: '* 단리 기준. 실제 법원 판결이나 계약 내용에 따라 다를 수 있습니다.',
  rates: {
    civil: { label: '민사 법정이자', desc: '연 5%', rate: 5 },
    commercial: { label: '상사 법정이자', desc: '연 6%', rate: 6 },
    overdue: { label: '연체 법정이자', desc: '연 12%', rate: 12 },
    custom: { label: '직접 입력', desc: '사용자 설정', rate: 0 },
  },
};

const en = {
  title: 'Legal Interest Calculator',
  principalLabel: 'Principal (KRW)',
  startDateLabel: 'Start Date',
  endDateLabel: 'End Date',
  rateLabel: 'Interest Rate Type',
  customRateLabel: 'Custom Rate (%)',
  calculate: 'Calculate',
  reset: 'Reset',
  daysResult: (d: number) => `${d} days (approx. ${(d / 365).toFixed(2)} yrs)`,
  interestLabel: 'Interest Accrued',
  principalResultLabel: 'Principal',
  rateResultLabel: 'Rate Applied',
  totalLabel: 'Principal + Interest',
  error: 'Please enter a valid principal and dates.',
  disclaimer: '* Simple interest basis. Actual amounts may differ based on court rulings or contract terms.',
  rates: {
    civil: { label: 'Civil legal rate', desc: '5% p.a.', rate: 5 },
    commercial: { label: 'Commercial legal rate', desc: '6% p.a.', rate: 6 },
    overdue: { label: 'Overdue legal rate', desc: '12% p.a.', rate: 12 },
    custom: { label: 'Custom', desc: 'User-defined', rate: 0 },
  },
};

const LegalInterestCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = locale === 'ko' ? ko : en;

  const [principal, setPrincipal] = useState<string>('10000000');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [rateType, setRateType] = useState<RateType>('overdue');
  const [customRate, setCustomRate] = useState<string>('12');
  const [error, setError] = useState<string>('');

  interface CalcResult {
    days: number;
    interest: number;
    total: number;
    rate: number;
  }
  const [result, setResult] = useState<CalcResult | null>(null);

  const fmt = (n: number) => Math.floor(n).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US');

  const getRate = () => {
    if (rateType === 'custom') return Number(customRate) || 0;
    return RATE_OPTIONS.find((o) => o.id === rateType)?.rate ?? 12;
  };

  const calculate = () => {
    setError('');
    const P = Number(principal);
    if (!P || P <= 0 || !startDate || !endDate) {
      setError(t.error);
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      setError(t.error);
      return;
    }
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const rate = getRate();
    const interest = P * (rate / 100) * (days / 365);
    setResult({ days, interest, total: P + interest, rate });
  };

  const reset = () => {
    setPrincipal('10000000');
    setStartDate('');
    setEndDate('');
    setRateType('overdue');
    setCustomRate('12');
    setResult(null);
    setError('');
  };

  const liveRate = useMemo(() => getRate(), [rateType, customRate]);

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-amber-900 mb-6">{t.title}</h3>

      <div className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-bold text-amber-800">{t.principalLabel}</label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            min="0"
            className="w-full p-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-amber-800">{t.startDateLabel}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-amber-800">{t.endDateLabel}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-amber-800">{t.rateLabel}</label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(t.rates) as RateType[]).map((id) => (
              <button
                key={id}
                onClick={() => setRateType(id)}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${
                  rateType === id
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 bg-white hover:border-amber-300'
                }`}
              >
                <span className="block text-sm font-bold text-amber-800">
                  {id === 'custom' ? t.rates.custom.desc : t.rates[id].desc}
                </span>
                <span className="block text-xs text-slate-500">{t.rates[id].label}</span>
              </button>
            ))}
          </div>
          {rateType === 'custom' && (
            <div className="space-y-1 mt-2">
              <label className="text-sm font-bold text-amber-800">{t.customRateLabel}</label>
              <input
                type="number"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                min="0"
                step="0.1"
                className="w-full p-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>
          )}
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
            {t.calculate}
          </button>
          <button
            onClick={reset}
            className="px-5 py-3 bg-white border border-amber-300 hover:bg-amber-50 text-amber-700 font-bold rounded-xl transition-colors"
          >
            {t.reset}
          </button>
        </div>

        {result && (
          <div className="mt-4 space-y-4">
            <div className="p-5 bg-amber-600 text-white rounded-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{t.interestLabel}</p>
              <p className="text-3xl font-black">{fmt(result.interest)}{locale === 'ko' ? '원' : ' KRW'}</p>
              <p className="mt-1 text-sm opacity-80">{t.daysResult(result.days)}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t.principalResultLabel, value: fmt(Number(principal)) + (locale === 'ko' ? '원' : '') },
                { label: t.rateResultLabel, value: `${liveRate}%` },
                { label: t.totalLabel, value: fmt(result.total) + (locale === 'ko' ? '원' : '') },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-2xl border border-amber-100 p-4 text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-amber-700">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">{t.disclaimer}</p>
    </div>
  );
};

export default LegalInterestCalculator;
