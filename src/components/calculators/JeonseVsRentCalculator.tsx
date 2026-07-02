'use client';

import React, { useState } from 'react';

interface JeonseVsRentResult {
  jeonseCost: number;
  rentCost: number;
  diff: number;
  cheaper: 'jeonse' | 'rent';
  loanInterest: number;
  oppCostJeonse: number;
  oppCostRent: number;
}

const ko = {
  title: '전세 vs 월세 비교 계산기',
  optionA: '전세',
  optionB: '월세',
  jeonseDeposit: '전세 보증금 (원)',
  loanAmount: '전세 대출금 (원)',
  loanRate: '대출 금리 (%)',
  monthlyRent: '월세 금액 (원)',
  monthlyRentDeposit: '월세 보증금 (원)',
  depositInterestRate: '기회비용 이율 (%) — 예금 금리 기준',
  calculate: '비교 계산하기',
  reset: '초기화',
  jeonseCost: '전세 월 실질비용',
  rentCost: '월세 월 실질비용',
  diff: '차액',
  jeonseCheaper: (amount: string) => `전세가 월 ${amount}원 저렴`,
  rentCheaper: (amount: string) => `월세가 월 ${amount}원 저렴`,
  loanInterest: '대출이자',
  oppCostJeonse: '기회비용 (전세)',
  oppCostRent: '기회비용 (월세 보증금)',
  perMonth: '원/월',
  faqTitle: '계산 방법',
  faqOppCost: '기회비용이란?',
  faqOppCostDesc: '전세 보증금 또는 월세 보증금을 다른 곳에 투자했을 때 얻을 수 있는 수익을 비용으로 봅니다.',
  disclaimer: '* 실제 비용은 금리 변동, 유지비, 거래비용 등에 따라 달라질 수 있습니다.',
};

const en = {
  title: 'Jeonse vs Monthly Rent Calculator',
  optionA: 'Jeonse (전세)',
  optionB: 'Monthly Rent (월세)',
  jeonseDeposit: 'Jeonse Deposit (KRW)',
  loanAmount: 'Jeonse Loan (KRW)',
  loanRate: 'Loan Rate (%)',
  monthlyRent: 'Monthly Rent (KRW)',
  monthlyRentDeposit: 'Rent Deposit (KRW)',
  depositInterestRate: 'Opportunity Cost Rate (%) — savings rate',
  calculate: 'Compare',
  reset: 'Reset',
  jeonseCost: 'Jeonse Monthly Cost',
  rentCost: 'Rent Monthly Cost',
  diff: 'Difference',
  jeonseCheaper: (amount: string) => `Jeonse is ${amount} KRW/mo cheaper`,
  rentCheaper: (amount: string) => `Monthly rent is ${amount} KRW/mo cheaper`,
  loanInterest: 'Loan interest',
  oppCostJeonse: 'Opp. cost (jeonse)',
  oppCostRent: 'Opp. cost (rent deposit)',
  perMonth: 'KRW/mo',
  faqTitle: 'How It Works',
  faqOppCost: 'What is opportunity cost?',
  faqOppCostDesc:
    'The return you could have earned if your deposit were invested elsewhere is treated as a cost of holding that deposit.',
  disclaimer: '* Actual costs may vary with interest rate changes, maintenance, and transaction costs.',
};

const JeonseVsRentCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = locale === 'ko' ? ko : en;

  const [jeonseDeposit, setJeonseDeposit] = useState<string>('200000000');
  const [loanAmount, setLoanAmount] = useState<string>('160000000');
  const [loanRate, setLoanRate] = useState<string>('4.0');
  const [monthlyRent, setMonthlyRent] = useState<string>('800000');
  const [monthlyRentDeposit, setMonthlyRentDeposit] = useState<string>('20000000');
  const [depositInterestRate, setDepositInterestRate] = useState<string>('3.0');
  const [result, setResult] = useState<JeonseVsRentResult | null>(null);

  const fmt = (n: number) => Math.floor(Math.abs(n)).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US');

  const calculate = () => {
    const jd = Number(jeonseDeposit) || 0;
    const la = Number(loanAmount) || 0;
    const lr = Number(loanRate) || 0;
    const mr = Number(monthlyRent) || 0;
    const mrd = Number(monthlyRentDeposit) || 0;
    const dir = Number(depositInterestRate) || 0;

    const loanInterest = (la * (lr / 100)) / 12;
    const personalCashJeonse = jd - la;
    const oppCostJeonse = (personalCashJeonse * (dir / 100)) / 12;
    const totalJeonseCost = loanInterest + oppCostJeonse;

    const oppCostRent = (mrd * (dir / 100)) / 12;
    const totalRentCost = mr + oppCostRent;

    const diff = Math.abs(totalJeonseCost - totalRentCost);
    const cheaper: 'jeonse' | 'rent' = totalJeonseCost < totalRentCost ? 'jeonse' : 'rent';

    setResult({
      jeonseCost: Math.floor(totalJeonseCost),
      rentCost: Math.floor(totalRentCost),
      diff: Math.floor(diff),
      cheaper,
      loanInterest: Math.floor(loanInterest),
      oppCostJeonse: Math.floor(oppCostJeonse),
      oppCostRent: Math.floor(oppCostRent),
    });
  };

  const reset = () => {
    setJeonseDeposit('200000000');
    setLoanAmount('160000000');
    setLoanRate('4.0');
    setMonthlyRent('800000');
    setMonthlyRentDeposit('20000000');
    setDepositInterestRate('3.0');
    setResult(null);
  };

  const fieldClass =
    'w-full p-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none text-sm';

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-blue-900 mb-6">{t.title}</h3>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-5">
          {/* Jeonse */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{t.optionA}</p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-800">{t.jeonseDeposit}</label>
              <input type="number" value={jeonseDeposit} onChange={(e) => setJeonseDeposit(e.target.value)} min="0" className={fieldClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-blue-800">{t.loanAmount}</label>
                <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} min="0" className={fieldClass} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-blue-800">{t.loanRate}</label>
                <input type="number" value={loanRate} onChange={(e) => setLoanRate(e.target.value)} step="0.1" min="0" className={fieldClass} />
              </div>
            </div>
          </div>

          {/* Monthly rent */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">{t.optionB}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-orange-800">{t.monthlyRent}</label>
                <input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} min="0" className="w-full p-3 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-orange-800">{t.monthlyRentDeposit}</label>
                <input type="number" value={monthlyRentDeposit} onChange={(e) => setMonthlyRentDeposit(e.target.value)} min="0" className="w-full p-3 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-blue-800">{t.depositInterestRate}</label>
            <input type="number" value={depositInterestRate} onChange={(e) => setDepositInterestRate(e.target.value)} step="0.1" min="0" className={fieldClass} />
          </div>

          <div className="flex gap-3">
            <button onClick={calculate} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
              {t.calculate}
            </button>
            <button onClick={reset} className="px-5 py-3 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 font-bold rounded-xl transition-colors">
              {t.reset}
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="flex flex-col justify-center space-y-4">
          {result ? (
            <>
              <div className={`p-5 rounded-2xl text-white text-center ${result.cheaper === 'jeonse' ? 'bg-blue-600' : 'bg-orange-500'}`}>
                <p className="text-sm font-bold">
                  {result.cheaper === 'jeonse' ? t.jeonseCheaper(fmt(result.diff)) : t.rentCheaper(fmt(result.diff))}
                </p>
              </div>

              {/* Jeonse breakdown */}
              <div className="bg-white rounded-2xl border-2 border-blue-200 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{t.optionA}</p>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-slate-500">{t.jeonseCost}</span>
                  <span className="text-xl font-black text-blue-700">{fmt(result.jeonseCost)} {t.perMonth}</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1 pl-2">
                  <div className="flex justify-between"><span>{t.loanInterest}</span><span>{fmt(result.loanInterest)}</span></div>
                  <div className="flex justify-between"><span>{t.oppCostJeonse}</span><span>{fmt(result.oppCostJeonse)}</span></div>
                </div>
              </div>

              {/* Rent breakdown */}
              <div className="bg-white rounded-2xl border-2 border-orange-200 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-600">{t.optionB}</p>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-slate-500">{t.rentCost}</span>
                  <span className="text-xl font-black text-orange-600">{fmt(result.rentCost)} {t.perMonth}</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1 pl-2">
                  <div className="flex justify-between"><span>{locale === 'ko' ? '월세' : 'Rent'}</span><span>{fmt(Number(monthlyRent))}</span></div>
                  <div className="flex justify-between"><span>{t.oppCostRent}</span><span>{fmt(result.oppCostRent)}</span></div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-blue-200 border-2 border-dashed border-blue-200 rounded-2xl">
              <p className="text-sm font-bold text-blue-400">
                {locale === 'ko' ? '정보를 입력하고 비교하세요' : 'Enter info and compare'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-sm">
        <p className="font-bold text-slate-700">{t.faqTitle}</p>
        <div>
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">{t.faqOppCost}</p>
          <p className="text-xs text-slate-500 mt-1">{t.faqOppCostDesc}</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400 text-center">{t.disclaimer}</p>
    </div>
  );
};

export default JeonseVsRentCalculator;
