'use client';

import { useState } from 'react';

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

function fmtPct(n: number): string {
  return n.toFixed(2);
}

export default function ROICalculator() {
  const [mode, setMode] = useState<'simple' | 'annualized'>('simple');
  const [initialInvestment, setInitialInvestment] = useState('10000000');
  const [finalValue, setFinalValue] = useState('13000000');
  const [additionalCost, setAdditionalCost] = useState('0');
  const [years, setYears] = useState('3');

  const [result, setResult] = useState<{
    gain: number;
    roi: number;
    annualizedROI: number;
    totalReturn: number;
  } | null>(null);

  const calculate = () => {
    const initial = parseFloat(initialInvestment.replace(/,/g, '')) || 0;
    const final = parseFloat(finalValue.replace(/,/g, '')) || 0;
    const cost = parseFloat(additionalCost.replace(/,/g, '')) || 0;
    const yrs = parseFloat(years) || 1;

    const totalCost = initial + cost;
    const gain = final - totalCost;
    const roi = totalCost > 0 ? (gain / totalCost) * 100 : 0;
    const annualizedROI = totalCost > 0 ? (Math.pow(final / totalCost, 1 / yrs) - 1) * 100 : 0;
    const totalReturn = final - initial;

    setResult({ gain, roi, annualizedROI, totalReturn });
  };

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xl font-bold text-gray-900">투자 수익률(ROI) 계산기</h3>

      <div className="mb-5 flex gap-2">
        {(['simple', 'annualized'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === m
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {m === 'simple' ? '단순 ROI' : '연환산 수익률(CAGR)'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: '초기 투자금 (원)', value: initialInvestment, setter: setInitialInvestment },
          { label: '최종 평가액 (원)', value: finalValue, setter: setFinalValue },
          { label: '추가 비용 (수수료·세금 등, 원)', value: additionalCost, setter: setAdditionalCost },
          ...(mode === 'annualized'
            ? [{ label: '보유 기간 (년)', value: years, setter: setYears }]
            : []),
        ].map(({ label, value, setter }) => (
          <div key={label}>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      <button
        onClick={calculate}
        className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
      >
        수익률 계산하기
      </button>

      {result && (
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: '순손익',
                value: `${result.gain >= 0 ? '+' : ''}${fmt(result.gain)}원`,
                color: result.gain >= 0 ? 'text-blue-600' : 'text-red-600',
              },
              {
                label: 'ROI',
                value: `${result.roi >= 0 ? '+' : ''}${fmtPct(result.roi)}%`,
                color: result.roi >= 0 ? 'text-green-600' : 'text-red-600',
              },
              {
                label: '연환산 수익률 (CAGR)',
                value: `${result.annualizedROI >= 0 ? '+' : ''}${fmtPct(result.annualizedROI)}%/년`,
                color:
                  result.annualizedROI >= 0 ? 'text-indigo-600' : 'text-red-600',
              },
              {
                label: '총 수익금',
                value: `${result.totalReturn >= 0 ? '+' : ''}${fmt(result.totalReturn)}원`,
                color:
                  result.totalReturn >= 0 ? 'text-purple-600' : 'text-red-600',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            * ROI = (최종평가액 - 총투자비용) / 총투자비용 × 100 | CAGR = (최종/초기)^(1/기간) - 1
          </p>
        </div>
      )}
    </div>
  );
}
