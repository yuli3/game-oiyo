'use client';

import { useState } from 'react';

function formatKRW(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

export default function EarlyRepaymentCalculator() {
  const [loanAmount, setLoanAmount] = useState('300000000');
  const [repayAmount, setRepayAmount] = useState('50000000');
  const [feeRate, setFeeRate] = useState('1.4');
  const [elapsedMonths, setElapsedMonths] = useState('18');
  const [totalMonths, setTotalMonths] = useState('360');
  const [annualRate, setAnnualRate] = useState('4.0');
  const [result, setResult] = useState<{
    feeRateApplied: number;
    fee: number;
    interestSaved: number;
    netBenefit: number;
    breakEven: boolean;
  } | null>(null);

  const calculate = () => {
    const loan = parseFloat(loanAmount.replace(/,/g, ''));
    const repay = parseFloat(repayAmount.replace(/,/g, ''));
    const rate = parseFloat(feeRate) / 100;
    const elapsed = parseInt(elapsedMonths);
    const total = parseInt(totalMonths);
    const ar = parseFloat(annualRate) / 100 / 12;
    if (!loan || !repay || isNaN(rate) || !elapsed || !total) return;

    // 잔여기간 비율에 따른 실효 수수료율
    const remaining = Math.max(0, total - elapsed);
    const feeRateApplied = rate * (remaining / total);
    const fee = repay * feeRateApplied;

    // 조기상환으로 아끼는 이자 (단순 추정)
    const monthlyInterestSaved = repay * ar;
    const interestSaved = monthlyInterestSaved * remaining;
    const netBenefit = interestSaved - fee;

    setResult({ feeRateApplied, fee, interestSaved, netBenefit, breakEven: netBenefit > 0 });
  };

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-xl font-bold text-gray-900">중도상환수수료 계산기</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: '대출 원금 (원)', val: loanAmount, set: setLoanAmount },
          { label: '중도상환 금액 (원)', val: repayAmount, set: setRepayAmount },
          { label: '기본 수수료율 (%)', val: feeRate, set: setFeeRate },
          { label: '현재 경과 개월 수', val: elapsedMonths, set: setElapsedMonths },
          { label: '총 대출 기간 (개월)', val: totalMonths, set: setTotalMonths },
          { label: '대출 연이율 (%)', val: annualRate, set: setAnnualRate },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <input type="number" value={val} onChange={(e) => set(e.target.value)} step="0.1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        ))}
      </div>

      <button onClick={calculate}
        className="mt-5 w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700">
        계산하기
      </button>

      {result && (
        <div className="mt-6 space-y-3">
          <div className={`rounded-xl p-4 ${result.breakEven ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-sm font-semibold text-gray-700">
              {result.breakEven ? '✅ 조기상환이 유리합니다' : '⚠️ 수수료가 이자 절감보다 많습니다'}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              순이익: {result.netBenefit >= 0 ? '+' : ''}{formatKRW(result.netBenefit)}원
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">실효 수수료율</p>
              <p className="text-sm font-bold text-gray-800">{(result.feeRateApplied * 100).toFixed(3)}%</p>
            </div>
            <div className="rounded-xl bg-orange-50 p-3">
              <p className="text-xs text-gray-500">납부 수수료</p>
              <p className="text-sm font-bold text-orange-600">{formatKRW(result.fee)}원</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-xs text-gray-500">절감 이자 (추정)</p>
              <p className="text-sm font-bold text-blue-600">{formatKRW(result.interestSaved)}원</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">* 이자 절감은 원금균등 방식 단순 추정치입니다. 실제 조건은 은행 확인 필수.</p>
        </div>
      )}
    </div>
  );
}
