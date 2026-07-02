'use client';

import React, { useState } from 'react';

interface WeddingResult {
  totalAssets: number;
  totalCost: number;
  giftRevenue: number;
  weddingBalance: number;
  netWorth: number;
}

const ko = {
  title: '결혼 비용 플래너',
  sectionAssets: '양가 자산',
  myAssets: '나의 자산 (원)',
  partnerAssets: '파트너 자산 (원)',
  sectionWedding: '결혼 비용',
  guestCount: '하객 수 (명)',
  giftAvg: '인당 평균 축의금 (원)',
  mealCost: '1인당 식사비 (원)',
  venueCost: '예식장 대관료 (원)',
  suduCost: '스드메 비용 (원)',
  honeymoonCost: '신혼여행 비용 (원)',
  calculate: '계산하기',
  reset: '초기화',
  resultTitle: '결혼 재무 결과',
  netWorth: '결혼 후 순자산',
  totalAssets: '합산 자산',
  totalCost: '총 결혼 비용',
  giftRevenue: '총 축의금 수입',
  balance: '결혼 수지',
  positiveTip: (amount: string) => `축의금이 결혼 비용을 ${amount}원 초과합니다. 재무적으로 여유가 있습니다.`,
  negativeTip: (amount: string) => `결혼 비용이 축의금보다 ${amount}원 많습니다. 이 금액을 자산에서 충당해야 합니다.`,
  disclaimer: '* 예상 비용입니다. 실제 비용은 계약 내용에 따라 달라질 수 있습니다.',
};

const en = {
  title: 'Wedding Budget Planner',
  sectionAssets: 'Combined Assets',
  myAssets: 'My Assets (KRW)',
  partnerAssets: "Partner's Assets (KRW)",
  sectionWedding: 'Wedding Costs',
  guestCount: 'Guest Count',
  giftAvg: 'Avg. Gift per Guest (KRW)',
  mealCost: 'Meal Cost per Guest (KRW)',
  venueCost: 'Venue Fee (KRW)',
  suduCost: 'Photo/Dress/Makeup (KRW)',
  honeymoonCost: 'Honeymoon (KRW)',
  calculate: 'Calculate',
  reset: 'Reset',
  resultTitle: 'Wedding Financial Summary',
  netWorth: 'Post-Wedding Net Worth',
  totalAssets: 'Total Assets',
  totalCost: 'Total Wedding Cost',
  giftRevenue: 'Total Gift Revenue',
  balance: 'Wedding Balance',
  positiveTip: (amount: string) => `Gifts exceed costs by ${amount} KRW. You're in a positive position financially.`,
  negativeTip: (amount: string) => `Costs exceed gifts by ${amount} KRW. This amount needs to come from your assets.`,
  disclaimer: '* Estimated costs. Actual costs may vary based on contracts.',
};

const WeddingPlanningCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = locale === 'ko' ? ko : en;

  const [myAssets, setMyAssets] = useState<string>('');
  const [partnerAssets, setPartnerAssets] = useState<string>('');
  const [guestCount, setGuestCount] = useState<string>('200');
  const [giftAvg, setGiftAvg] = useState<string>('100000');
  const [mealCost, setMealCost] = useState<string>('60000');
  const [venueCost, setVenueCost] = useState<string>('3000000');
  const [suduCost, setSuduCost] = useState<string>('3000000');
  const [honeymoonCost, setHoneymoonCost] = useState<string>('5000000');
  const [result, setResult] = useState<WeddingResult | null>(null);

  const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US');

  const calculate = () => {
    const asset1 = Number(myAssets) || 0;
    const asset2 = Number(partnerAssets) || 0;
    const guests = Number(guestCount) || 0;
    const meal = Number(mealCost) || 0;
    const venue = Number(venueCost) || 0;
    const sdu = Number(suduCost) || 0;
    const honey = Number(honeymoonCost) || 0;
    const gift = Number(giftAvg) || 0;

    const totalAssets = asset1 + asset2;
    const totalCost = guests * meal + venue + sdu + honey;
    const giftRevenue = guests * gift;
    const weddingBalance = giftRevenue - totalCost;
    const netWorth = totalAssets + weddingBalance;

    setResult({ totalAssets, totalCost, giftRevenue, weddingBalance, netWorth });
  };

  const reset = () => {
    setMyAssets('');
    setPartnerAssets('');
    setGuestCount('200');
    setGiftAvg('100000');
    setMealCost('60000');
    setVenueCost('3000000');
    setSuduCost('3000000');
    setHoneymoonCost('5000000');
    setResult(null);
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-pink-900 mb-6">{t.title}</h3>

      <div className="space-y-5">
        {/* Assets */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-pink-500 mb-3">{t.sectionAssets}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t.myAssets, value: myAssets, setter: setMyAssets },
              { label: t.partnerAssets, value: partnerAssets, setter: setPartnerAssets },
            ].map((f) => (
              <div key={f.label} className="space-y-1">
                <label className="text-xs font-bold text-pink-800">{f.label}</label>
                <input
                  type="number"
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  min="0"
                  placeholder="0"
                  className="w-full p-3 bg-white border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Wedding Costs */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-pink-500 mb-3">{t.sectionWedding}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t.guestCount, value: guestCount, setter: setGuestCount },
              { label: t.giftAvg, value: giftAvg, setter: setGiftAvg },
              { label: t.mealCost, value: mealCost, setter: setMealCost },
              { label: t.venueCost, value: venueCost, setter: setVenueCost },
              { label: t.suduCost, value: suduCost, setter: setSuduCost },
              { label: t.honeymoonCost, value: honeymoonCost, setter: setHoneymoonCost },
            ].map((f) => (
              <div key={f.label} className="space-y-1">
                <label className="text-xs font-bold text-pink-800">{f.label}</label>
                <input
                  type="number"
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  min="0"
                  className="w-full p-3 bg-white border border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-400 outline-none text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={calculate}
            className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition-colors"
          >
            {t.calculate}
          </button>
          <button
            onClick={reset}
            className="px-5 py-3 bg-white border border-pink-300 hover:bg-pink-50 text-pink-700 font-bold rounded-xl transition-colors"
          >
            {t.reset}
          </button>
        </div>

        {result && (
          <div className="mt-2 space-y-4">
            <div className="p-5 bg-pink-600 text-white rounded-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{t.netWorth}</p>
              <p className="text-3xl font-black">{fmt(result.netWorth)}{locale === 'ko' ? '원' : ' KRW'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t.totalAssets, value: fmt(result.totalAssets), color: 'text-pink-700' },
                { label: t.totalCost, value: `-${fmt(result.totalCost)}`, color: 'text-red-600' },
                { label: t.giftRevenue, value: `+${fmt(result.giftRevenue)}`, color: 'text-emerald-600' },
                {
                  label: t.balance,
                  value: `${result.weddingBalance >= 0 ? '+' : '-'}${fmt(result.weddingBalance)}`,
                  color: result.weddingBalance >= 0 ? 'text-emerald-600' : 'text-red-600',
                },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-2xl border border-pink-100 p-4 text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">{item.label}</p>
                  <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div
              className={`p-4 rounded-2xl text-sm ${
                result.weddingBalance >= 0
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {result.weddingBalance >= 0
                ? t.positiveTip(fmt(result.weddingBalance))
                : t.negativeTip(fmt(result.weddingBalance))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">{t.disclaimer}</p>
    </div>
  );
};

export default WeddingPlanningCalculator;
