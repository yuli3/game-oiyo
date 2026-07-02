'use client';

import { useState } from 'react';

type RepaymentType = 'equal-principal' | 'equal-payment' | 'bullet';

const REPAYMENT_LABELS: Record<RepaymentType, string> = {
  'equal-principal': '원금균등',
  'equal-payment': '원리금균등',
  bullet: '만기일시',
};

function formatKRW(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

interface ScheduleRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

function calcEqualPrincipal(principal: number, monthlyRate: number, months: number): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const monthlyPrincipal = principal / months;
  let balance = principal;
  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate;
    const payment = monthlyPrincipal + interest;
    balance -= monthlyPrincipal;
    rows.push({ month: i, payment, principal: monthlyPrincipal, interest, balance: Math.max(0, balance) });
  }
  return rows;
}

function calcEqualPayment(principal: number, monthlyRate: number, months: number): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const payment =
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);
  let balance = principal;
  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate;
    const principalPart = payment - interest;
    balance -= principalPart;
    rows.push({ month: i, payment, principal: principalPart, interest, balance: Math.max(0, balance) });
  }
  return rows;
}

function calcBullet(principal: number, monthlyRate: number, months: number): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const monthlyInterest = principal * monthlyRate;
  for (let i = 1; i <= months; i++) {
    const isLast = i === months;
    rows.push({
      month: i,
      payment: isLast ? principal + monthlyInterest : monthlyInterest,
      principal: isLast ? principal : 0,
      interest: monthlyInterest,
      balance: isLast ? 0 : principal,
    });
  }
  return rows;
}

export default function LoanCalculator() {
  const [principal, setPrincipal] = useState('100000000');
  const [annualRate, setAnnualRate] = useState('4.5');
  const [years, setYears] = useState('20');
  const [repaymentType, setRepaymentType] = useState<RepaymentType>('equal-payment');
  const [showFull, setShowFull] = useState(false);
  const [result, setResult] = useState<ScheduleRow[] | null>(null);

  const calculate = () => {
    const p = parseFloat(principal.replace(/,/g, ''));
    const r = parseFloat(annualRate) / 100 / 12;
    const n = parseInt(years) * 12;
    if (!p || !r || !n || p <= 0 || n <= 0) return;

    let rows: ScheduleRow[];
    if (repaymentType === 'equal-principal') rows = calcEqualPrincipal(p, r, n);
    else if (repaymentType === 'equal-payment') rows = calcEqualPayment(p, r, n);
    else rows = calcBullet(p, r, n);

    setResult(rows);
    setShowFull(false);
  };

  const totalInterest = result ? result.reduce((s, r) => s + r.interest, 0) : 0;
  const totalPayment = result ? result.reduce((s, r) => s + r.payment, 0) : 0;
  const firstPayment = result ? result[0].payment : 0;
  const displayRows = result ? (showFull ? result : result.slice(0, 12)) : [];

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-xl font-bold text-gray-900">대출 이자 계산기</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            대출금액 (원)
          </label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="100000000"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            연이율 (%)
          </label>
          <input
            type="number"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
            step="0.1"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="4.5"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            대출 기간 (년)
          </label>
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            상환 방식
          </label>
          <select
            value={repaymentType}
            onChange={(e) => setRepaymentType(e.target.value as RepaymentType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {(Object.keys(REPAYMENT_LABELS) as RepaymentType[]).map((k) => (
              <option key={k} value={k}>{REPAYMENT_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={calculate}
        className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        계산하기
      </button>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs text-gray-500">첫 달 납입액</p>
              <p className="text-lg font-bold text-blue-600">{formatKRW(firstPayment)}원</p>
            </div>
            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-xs text-gray-500">총 이자</p>
              <p className="text-lg font-bold text-orange-600">{formatKRW(totalInterest)}원</p>
            </div>
            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-xs text-gray-500">총 상환액</p>
              <p className="text-lg font-bold text-green-600">{formatKRW(totalPayment)}원</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['회차', '월 납입액', '원금', '이자', '잔금'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => (
                  <tr key={row.month} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-600">{row.month}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{formatKRW(row.payment)}</td>
                    <td className="px-3 py-2 text-blue-600">{formatKRW(row.principal)}</td>
                    <td className="px-3 py-2 text-orange-600">{formatKRW(row.interest)}</td>
                    <td className="px-3 py-2 text-gray-600">{formatKRW(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.length > 12 && (
            <button
              onClick={() => setShowFull((f) => !f)}
              className="w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              {showFull ? '접기 ▲' : `전체 ${result.length}회 보기 ▼`}
            </button>
          )}

          <p className="text-xs text-gray-400">
            * 실제 대출 조건(우대금리, 중도상환수수료 등)에 따라 결과가 달라질 수 있습니다. 참고용으로만 활용하세요.
          </p>
        </div>
      )}
    </div>
  );
}
