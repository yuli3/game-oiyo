'use client';

import { useState } from 'react';

function formatKRW(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

export default function InflationCalculator() {
  const [amount, setAmount] = useState('10000000');
  const [inflationRate, setInflationRate] = useState('3');
  const [years, setYears] = useState('20');
  const [mode, setMode] = useState<'future' | 'today'>('future');

  const [result, setResult] = useState<{
    adjusted: number;
    lost: number;
    lostPct: number;
    rows: { year: number; value: number; purchasingPower: number }[];
  } | null>(null);

  const calculate = () => {
    const a = parseFloat(amount.replace(/,/g, ''));
    const r = parseFloat(inflationRate) / 100;
    const n = parseInt(years);
    if (!a || isNaN(r) || !n) return;

    const rows: { year: number; value: number; purchasingPower: number }[] = [];

    for (let y = 1; y <= n; y++) {
      if (mode === 'future') {
        // How much does today's money lose value?
        const pp = a / Math.pow(1 + r, y);
        rows.push({ year: y, value: a, purchasingPower: pp });
      } else {
        // How much do we need in future to match today's value?
        const fv = a * Math.pow(1 + r, y);
        rows.push({ year: y, value: fv, purchasingPower: a });
      }
    }

    const last = rows[rows.length - 1];
    if (mode === 'future') {
      setResult({ adjusted: last.purchasingPower, lost: a - last.purchasingPower, lostPct: ((a - last.purchasingPower) / a) * 100, rows });
    } else {
      setResult({ adjusted: last.value, lost: last.value - a, lostPct: ((last.value - a) / a) * 100, rows });
    }
  };

  const displayRows = result ? result.rows.filter((_, i) => i % Math.max(1, Math.floor(result.rows.length / 10)) === 0 || i === result.rows.length - 1) : [];

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-xl font-bold text-gray-900">인플레이션 구매력 계산기</h3>

      <div className="mb-4 flex gap-3">
        <button
          onClick={() => setMode('future')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === 'future' ? 'bg-red-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          현재 돈의 미래 가치
        </button>
        <button
          onClick={() => setMode('today')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === 'today' ? 'bg-red-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          미래에 필요한 금액
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {mode === 'future' ? '현재 금액 (원)' : '오늘 기준 금액 (원)'}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            연 인플레이션율 (%)
          </label>
          <input
            type="number"
            value={inflationRate}
            onChange={(e) => setInflationRate(e.target.value)}
            step="0.1"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            기간 (년)
          </label>
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        onClick={calculate}
        className="mt-5 w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        계산하기
      </button>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">현재 금액</p>
              <p className="text-base font-bold text-gray-700">{formatKRW(parseFloat(amount.replace(/,/g, '')))}원</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-xs text-gray-500">
                {mode === 'future' ? `${years}년 후 구매력` : `${years}년 후 필요 금액`}
              </p>
              <p className="text-base font-bold text-red-600">{formatKRW(result.adjusted)}원</p>
            </div>
            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-xs text-gray-500">
                {mode === 'future' ? '구매력 손실' : '추가 필요 금액'}
              </p>
              <p className="text-base font-bold text-orange-600">
                {formatKRW(result.lost)}원 ({result.lostPct.toFixed(1)}%)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">년도</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    {mode === 'future' ? '실질 구매력' : '필요 금액'}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">변화율</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => {
                  const base = parseFloat(amount.replace(/,/g, ''));
                  const val = mode === 'future' ? row.purchasingPower : row.value;
                  const pct = ((val - base) / base * 100);
                  return (
                    <tr key={row.year} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-700">{row.year}년 후</td>
                      <td className="px-3 py-2 text-gray-900">{formatKRW(val)}원</td>
                      <td className={`px-3 py-2 ${pct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            * 한국 평균 물가상승률은 2010~2023년 기준 약 2~3%입니다. 참고용으로만 사용하세요.
          </p>
        </div>
      )}
    </div>
  );
}
