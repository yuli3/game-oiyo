'use client';

import React, { useState } from 'react';

interface StockResult {
  newAvg: number;
  totalShares: number;
  totalInvested: number;
  reductionRate: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPct: number;
}

const ko = {
  title: '주식 수익률 계산기 (물타기 포함)',
  currentHoldings: '현재 보유 현황',
  currentShares: '보유 주수',
  currentAvg: '평균 매수가',
  newPurchase: '추가 매수',
  buyShares: '추가 매수 주수',
  buyPrice: '추가 매수 단가',
  currentPrice: '현재 주가 (수익률 계산용)',
  calculate: '계산하기',
  reset: '초기화',
  resultNewAvg: '새 평균단가',
  totalShares: '총 보유 주수',
  totalInvested: '총 투자금',
  improvement: '개선',
  currentValue: '평가금액',
  unrealizedPnl: '미실현 손익',
  disclaimer: '* 거래 수수료 및 세금은 반영되지 않습니다.',
};

const en = {
  title: 'Stock Yield Calculator (incl. averaging down)',
  currentHoldings: 'Current Holdings',
  currentShares: 'Shares held',
  currentAvg: 'Average cost price',
  newPurchase: 'New Purchase',
  buyShares: 'Shares to buy',
  buyPrice: 'Buy price',
  currentPrice: 'Current price (for P&L)',
  calculate: 'Calculate',
  reset: 'Reset',
  resultNewAvg: 'New avg. cost',
  totalShares: 'Total shares',
  totalInvested: 'Total invested',
  improvement: 'improvement',
  currentValue: 'Market value',
  unrealizedPnl: 'Unrealized P&L',
  disclaimer: '* Transaction fees and taxes are not included.',
};

const StockYieldCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = locale === 'ko' ? ko : en;

  const [currentShares, setCurrentShares] = useState<string>('');
  const [currentAvg, setCurrentAvg] = useState<string>('');
  const [buyShares, setBuyShares] = useState<string>('');
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [result, setResult] = useState<StockResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) =>
    Math.abs(n) >= 100000000
      ? (n / 100000000).toFixed(2) + (locale === 'ko' ? '억' : 'B')
      : Math.round(n).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US');

  const calculate = () => {
    setError('');
    const cShares = parseFloat(currentShares) || 0;
    const cAvg = parseFloat(currentAvg) || 0;
    const bShares = parseFloat(buyShares) || 0;
    const bPrice = parseFloat(buyPrice) || 0;
    const cPrice = parseFloat(currentPrice) || 0;

    if ((cShares === 0 && bShares === 0) || (cShares > 0 && cAvg <= 0)) {
      setError(
        locale === 'ko'
          ? '보유 주수와 평균 매수가를 올바르게 입력해 주세요.'
          : 'Please enter valid holdings data.'
      );
      return;
    }

    const currentTotal = cShares * cAvg;
    const buyTotal = bShares * bPrice;
    const totalShares = cShares + bShares;
    const totalInvested = currentTotal + buyTotal;
    const newAvg = totalShares > 0 ? totalInvested / totalShares : 0;
    const reductionRate = cAvg > 0 && newAvg < cAvg ? ((cAvg - newAvg) / cAvg) * 100 : 0;

    const evalPrice = cPrice > 0 ? cPrice : newAvg;
    const currentValue = totalShares * evalPrice;
    const unrealizedPnl = currentValue - totalInvested;
    const unrealizedPct = totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : 0;

    setResult({ newAvg, totalShares, totalInvested, reductionRate, currentValue, unrealizedPnl, unrealizedPct });
  };

  const reset = () => {
    setCurrentShares('');
    setCurrentAvg('');
    setBuyShares('');
    setBuyPrice('');
    setCurrentPrice('');
    setResult(null);
    setError('');
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-violet-900 mb-6">{t.title}</h3>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-500">{t.currentHoldings}</p>
          <div className="space-y-1">
            <label className="text-sm font-bold text-violet-800">{t.currentShares}</label>
            <input
              type="number"
              value={currentShares}
              onChange={(e) => setCurrentShares(e.target.value)}
              min="0"
              placeholder="0"
              className="w-full p-3 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-violet-800">{t.currentAvg}</label>
            <input
              type="number"
              value={currentAvg}
              onChange={(e) => setCurrentAvg(e.target.value)}
              min="0"
              placeholder="0"
              className="w-full p-3 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-violet-500 pt-2">{t.newPurchase}</p>
          <div className="space-y-1">
            <label className="text-sm font-bold text-violet-800">{t.buyShares}</label>
            <input
              type="number"
              value={buyShares}
              onChange={(e) => setBuyShares(e.target.value)}
              min="0"
              placeholder="0"
              className="w-full p-3 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-violet-800">{t.buyPrice}</label>
            <input
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              min="0"
              placeholder="0"
              className="w-full p-3 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-violet-800">{t.currentPrice}</label>
            <input
              type="number"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              min="0"
              placeholder="0"
              className="w-full p-3 bg-white border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-400 outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={calculate}
              className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors"
            >
              {t.calculate}
            </button>
            <button
              onClick={reset}
              className="px-5 py-3 bg-white border border-violet-300 hover:bg-violet-50 text-violet-700 font-bold rounded-xl transition-colors"
            >
              {t.reset}
            </button>
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-4">
          {result ? (
            <>
              <div className="p-5 bg-violet-600 text-white rounded-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{t.resultNewAvg}</p>
                <p className="text-3xl font-black">{result.newAvg.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 0 })}</p>
                {result.reductionRate > 0 && (
                  <p className="mt-1 text-sm font-semibold opacity-90">
                    -{result.reductionRate.toFixed(2)}% {t.improvement}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: t.totalShares, value: result.totalShares.toLocaleString() },
                  { label: t.totalInvested, value: fmt(result.totalInvested) },
                  {
                    label: t.currentValue,
                    value: fmt(result.currentValue),
                  },
                  {
                    label: t.unrealizedPnl,
                    value: `${result.unrealizedPnl >= 0 ? '+' : ''}${fmt(result.unrealizedPnl)} (${result.unrealizedPct >= 0 ? '+' : ''}${result.unrealizedPct.toFixed(2)}%)`,
                    colorClass: result.unrealizedPnl >= 0 ? 'text-emerald-600' : 'text-red-600',
                  },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-2xl border border-violet-100 p-4 text-center">
                    <p className="text-xs text-slate-500 font-bold mb-1">{item.label}</p>
                    <p className={`text-sm font-bold ${item.colorClass ?? 'text-violet-700'}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-violet-300">
              <p className="text-sm font-bold text-violet-400">
                {locale === 'ko' ? '정보를 입력하고 계산하세요' : 'Enter info and calculate'}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">{t.disclaimer}</p>
    </div>
  );
};

export default StockYieldCalculator;
