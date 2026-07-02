'use client';

import React, { useState, useMemo } from 'react';

const BASIC_DEDUCTION = 2_500_000;
const TAX_RATE = 0.22; // 20% + 2% local

type Strategy = 'HARVEST_LOSS' | 'COST_UP' | 'NONE';

interface OverseasResult {
  realizedGain: number;
  currentTax: number;
  strategy: Strategy;
  targetAmount: number;
  taxSaving: number;
  deductionUsed: number;
  deductionLimit: number;
}

function calcOverseas(realizedGain: number): OverseasResult {
  const currentTaxable = Math.max(0, realizedGain - BASIC_DEDUCTION);
  const currentTax = Math.floor(currentTaxable * TAX_RATE);

  let strategy: Strategy = 'NONE';
  let targetAmount = 0;
  let taxSaving = 0;

  if (realizedGain > BASIC_DEDUCTION) {
    strategy = 'HARVEST_LOSS';
    targetAmount = realizedGain - BASIC_DEDUCTION;
    taxSaving = Math.floor(targetAmount * TAX_RATE);
  } else if (realizedGain < BASIC_DEDUCTION) {
    strategy = 'COST_UP';
    targetAmount = BASIC_DEDUCTION - realizedGain;
    taxSaving = 0;
  }

  return {
    realizedGain,
    currentTax,
    strategy,
    targetAmount,
    taxSaving,
    deductionUsed: Math.min(realizedGain, BASIC_DEDUCTION),
    deductionLimit: BASIC_DEDUCTION,
  };
}

const OverseasStockSaverCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const ko = locale === 'ko';

  const [realizedGain, setRealizedGain] = useState<string>('3500000');
  const [calculated, setCalculated] = useState<boolean>(false);

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR') + '원';

  const result = useMemo<OverseasResult>(() => calcOverseas(Number(realizedGain) || 0), [realizedGain]);

  const progressPct = Math.min(100, (result.deductionUsed / BASIC_DEDUCTION) * 100);

  const strategyBg =
    result.strategy === 'HARVEST_LOSS'
      ? 'bg-red-50 border-red-300'
      : result.strategy === 'COST_UP'
      ? 'bg-green-50 border-green-300'
      : 'bg-blue-50 border-blue-300';

  const strategyText =
    result.strategy === 'HARVEST_LOSS'
      ? 'text-red-700'
      : result.strategy === 'COST_UP'
      ? 'text-green-700'
      : 'text-blue-700';

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-slate-50 to-gray-100 border border-slate-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {ko ? '해외주식 절세 전략 계산기' : 'Overseas Stock Tax Saver'}
      </h3>
      <p className="text-sm text-slate-600 mb-6">
        {ko
          ? '연간 실현 수익이 250만원 기준을 넘는지 확인하고 최적 절세 전략을 알아보세요.'
          : 'Check if your annual realized gains exceed the ₩2.5M deduction limit and find your tax strategy.'}
      </p>

      <div className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-800">
            {ko ? '올해 실현 수익 (원)' : 'YTD Realized Gain (KRW)'}
          </label>
          <input
            type="number"
            value={realizedGain}
            onChange={(e) => { setRealizedGain(e.target.value); setCalculated(false); }}
            min="0"
            step="100000"
            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none"
          />
        </div>

        {/* Deduction progress bar — always visible */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>{ko ? '기본공제 사용량' : 'Deduction Usage'}</span>
            <span>{fmt(result.deductionUsed)} / {fmt(result.deductionLimit)}</span>
          </div>
          <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressPct >= 100 ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 text-right">{progressPct.toFixed(1)}%</p>
        </div>

        <button
          onClick={() => setCalculated(true)}
          className="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors"
        >
          {ko ? '전략 확인하기' : 'Check Strategy'}
        </button>

        {calculated && (
          <div className="mt-4 space-y-4" aria-live="polite">
            {/* Current tax */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                {ko ? '현재 납부 예상 세금' : 'Estimated Tax (now)'}
              </span>
              <span className="text-xl font-black text-red-600">{fmt(result.currentTax)}</span>
            </div>

            {/* Strategy card */}
            <div className={`rounded-xl border-2 p-5 space-y-3 ${strategyBg}`}>
              <p className={`text-base font-black ${strategyText}`}>
                {result.strategy === 'HARVEST_LOSS' && (ko ? '손실 매도 전략 권장' : 'Loss Harvesting Recommended')}
                {result.strategy === 'COST_UP' && (ko ? '추가 수익 실현 전략 권장' : 'Cost-Up (Gain Harvesting) Recommended')}
                {result.strategy === 'NONE' && (ko ? '공제 한도와 동일 — 현상 유지 최적' : 'At deduction limit — no action needed')}
              </p>

              {result.strategy === 'HARVEST_LOSS' && (
                <div className="space-y-1">
                  <p className="text-sm text-red-700">
                    {ko
                      ? `${fmt(result.targetAmount)} 만큼 손실 종목을 매도하면 250만원까지 수익을 낮출 수 있습니다.`
                      : `Selling ${fmt(result.targetAmount)} in losing positions brings your gain down to ₩2.5M.`}
                  </p>
                  <p className="text-sm font-bold text-red-600">
                    {ko ? `절세 금액: ${fmt(result.taxSaving)}` : `Tax Saved: ${fmt(result.taxSaving)}`}
                  </p>
                </div>
              )}

              {result.strategy === 'COST_UP' && (
                <p className="text-sm text-green-700">
                  {ko
                    ? `비과세 한도 ${fmt(result.deductionLimit)} 중 ${fmt(result.deductionLimit - result.deductionUsed)} 여유가 있습니다. 이익 종목을 매도해 기준가를 높이세요.`
                    : `You have ${fmt(result.deductionLimit - result.deductionUsed)} of tax-free room left. Consider selling gaining positions to reset cost basis.`}
                </p>
              )}

              {result.strategy === 'NONE' && (
                <p className="text-sm text-blue-700">
                  {ko ? '현재 실현 수익이 기본공제 한도와 거의 일치합니다.' : 'Your realized gain is right at the deduction limit.'}
                </p>
              )}
            </div>

            {/* Summary bars */}
            {result.strategy === 'HARVEST_LOSS' && result.taxSaving > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  {ko ? '전략 실행 전 vs 후' : 'Before vs After Strategy'}
                </p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1 text-center">
                    <div
                      className="bg-red-400 rounded-t-md mx-auto"
                      style={{ height: '60px', width: '100%' }}
                    />
                    <p className="text-xs text-red-600 font-bold">{ko ? '전' : 'Before'}</p>
                    <p className="text-xs font-semibold">{fmt(result.currentTax)}</p>
                  </div>
                  <div className="flex-1 space-y-1 text-center">
                    <div
                      className="bg-blue-400 rounded-t-md mx-auto"
                      style={{ height: `${Math.max(4, 60 - (result.taxSaving / result.currentTax) * 60)}px`, width: '100%' }}
                    />
                    <p className="text-xs text-blue-600 font-bold">{ko ? '후' : 'After'}</p>
                    <p className="text-xs font-semibold">{fmt(Math.max(0, result.currentTax - result.taxSaving))}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        * {ko
          ? '세율 22% (양도소득세 20% + 지방소득세 2%) 적용. 기본공제 250만원.'
          : 'Tax rate: 22% (20% capital gains + 2% local). Annual deduction: ₩2.5M.'}
      </p>
    </div>
  );
};

export default OverseasStockSaverCalculator;
