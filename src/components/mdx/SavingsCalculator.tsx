'use client';

import { useState } from 'react';

function formatKRW(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

type GoalMode = 'target' | 'monthly';

export default function SavingsCalculator() {
  const [mode, setMode] = useState<GoalMode>('target');
  // Mode: target — "목표 금액을 위해 매달 얼마?"
  // Mode: monthly — "매달 N원 저축하면 N년 후 얼마?"
  const [targetAmount, setTargetAmount] = useState('100000000');
  const [monthlyAmount, setMonthlyAmount] = useState('500000');
  const [annualRate, setAnnualRate] = useState('3.5');
  const [years, setYears] = useState('10');
  const [result, setResult] = useState<{
    label: string;
    main: number;
    totalPrincipal: number;
    totalInterest: number;
    rows: { year: number; balance: number; principal: number; interest: number }[];
  } | null>(null);

  const calculate = () => {
    const r = parseFloat(annualRate) / 100 / 12; // monthly rate
    const n = parseInt(years) * 12;

    if (mode === 'monthly') {
      const monthly = parseFloat(monthlyAmount.replace(/,/g, ''));
      if (!monthly || !r || !n) return;
      // FV of annuity
      const fv = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
      const totalPrincipal = monthly * n;
      const totalInterest = fv - totalPrincipal;
      const rows: { year: number; balance: number; principal: number; interest: number }[] = [];
      let balance = 0;
      let cumPrincipal = 0;
      let cumInterest = 0;
      for (let m = 1; m <= n; m++) {
        balance = (balance + monthly) * (1 + r);
        cumPrincipal += monthly;
        if (m % 12 === 0) {
          cumInterest = balance - cumPrincipal;
          rows.push({ year: m / 12, balance, principal: cumPrincipal, interest: cumInterest });
        }
      }
      setResult({ label: '최종 적립액', main: fv, totalPrincipal, totalInterest, rows });
    } else {
      const target = parseFloat(targetAmount.replace(/,/g, ''));
      if (!target || !r || !n) return;
      // PMT required
      const pmt = r === 0 ? target / n : (target * r) / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
      const totalPrincipal = pmt * n;
      const totalInterest = target - totalPrincipal;
      const rows: { year: number; balance: number; principal: number; interest: number }[] = [];
      let balance = 0;
      let cumPrincipal = 0;
      for (let m = 1; m <= n; m++) {
        balance = (balance + pmt) * (1 + r);
        cumPrincipal += pmt;
        if (m % 12 === 0) {
          const cumInterest = balance - cumPrincipal;
          rows.push({ year: m / 12, balance, principal: cumPrincipal, interest: cumInterest });
        }
      }
      setResult({ label: '월 필요 저축액', main: pmt, totalPrincipal, totalInterest, rows });
    }
  };

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-xl font-bold text-gray-900">저축 목표 계산기</h3>

      <div className="mb-4 flex gap-3">
        <button
          onClick={() => setMode('target')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === 'target' ? 'bg-green-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          목표 금액 달성
        </button>
        <button
          onClick={() => setMode('monthly')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === 'monthly' ? 'bg-green-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          월 저축액 기반
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {mode === 'target' ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">목표 금액 (원)</label>
            <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">월 저축액 (원)</label>
            <input type="number" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">연 이자율 (%)</label>
          <input type="number" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} step="0.1"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">기간 (년)</label>
          <input type="number" value={years} onChange={(e) => setYears(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <button onClick={calculate}
        className="mt-5 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition hover:bg-green-700">
        계산하기
      </button>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-xs text-gray-500">{result.label}</p>
              <p className="text-base font-bold text-green-600">{formatKRW(result.main)}원</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs text-gray-500">총 납입 원금</p>
              <p className="text-base font-bold text-blue-600">{formatKRW(result.totalPrincipal)}원</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-4">
              <p className="text-xs text-gray-500">이자 수익</p>
              <p className="text-base font-bold text-purple-600">{formatKRW(Math.abs(result.totalInterest))}원</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['년차', '누적 원금', '누적 이자', '잔액'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.year} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-700">{row.year}년</td>
                    <td className="px-3 py-2 text-blue-600">{formatKRW(row.principal)}</td>
                    <td className="px-3 py-2 text-purple-600">{formatKRW(row.interest)}</td>
                    <td className="px-3 py-2 font-semibold text-green-600">{formatKRW(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">* 세전 이자 기준. 이자소득세(15.4%) 적용 시 실수령 이자는 줄어듭니다.</p>
        </div>
      )}
    </div>
  );
}
