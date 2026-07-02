'use client';

import React, { useState } from 'react';

type TabId = 'wedding' | 'education' | 'jeonse';

/* ---- Wedding tab ---- */
interface WeddingResult {
  totalAsset: number;
  netStart: number;
  isHighAsset: boolean;
}

/* ---- Education tab ---- */
interface EducationResult {
  futureCost: number;
  monthlySave: number;
}

/* ---- Jeonse tab ---- */
interface JeonseResult {
  ratio: number;
  isSafe: boolean;
}

const ko = {
  title: '생애 설계 계산기',
  tabs: { wedding: '결혼 비용', education: '교육 자금', jeonse: '전세 보호금' },
  // wedding
  weddingTitle: '결혼 비용 시뮬레이터',
  myAsset: '나의 자산 (원)',
  partnerAsset: '파트너 자산 (원)',
  weddingCost: '결혼 비용 (원)',
  housingCost: '신혼집 비용 (원)',
  simulate: '시뮬레이션',
  totalAsset: '합산 자산',
  netStart: '결혼 후 순자산',
  highAssetWarning: '자산 규모가 크므로 증여세 등 세무 상담을 권장합니다.',
  highAssetOk: '신혼 출발 자산이 양호합니다.',
  // education
  educationTitle: '교육 자금 계산기',
  currentCostLabel: '현재 연간 교육비 (원)',
  yearsUntilLabel: '자녀 대학 입학까지 (년)',
  inflationLabel: '교육비 인상률 (%)',
  durationLabel: '대학 재학 기간 (년)',
  futureCostLabel: '미래 예상 교육비 합계',
  monthlySaveLabel: '월 적립 필요액 (연 5% 가정)',
  educationTip: '교육비 인플레이션을 고려해 일찍 적립할수록 월 부담이 줄어듭니다.',
  // jeonse
  jeonseTitle: '전세 보증금 안전도 확인',
  housePriceLabel: '주택 가격 (원)',
  housePriceNote: '공시지가 또는 실거래가 기준',
  depositLabel: '전세 보증금 (원)',
  seniorDebtLabel: '선순위 채권 합계 (원)',
  checkBtn: '안전성 확인',
  debtRatio: '채무 부담 비율',
  safe: '안전',
  unsafe: '위험',
  safeReason: (r: number) => `(보증금+선순위채권)/시세 = ${r}%로 90% 이하입니다. 비교적 안전한 전세입니다.`,
  unsafeReason: (r: number) => `(보증금+선순위채권)/시세 = ${r}%로 90%를 초과합니다. HUG 전세보증 가입이 어려울 수 있습니다.`,
  jeonseTip: 'HUG 전세보증보험 기준 90% 이내 권장',
  calculate: '계산하기',
  reset: '초기화',
  disclaimer: '* 참고용 계산기입니다. 실제 계약 전 전문가 상담을 권장합니다.',
};

const en = {
  title: 'Life Planning Calculator',
  tabs: { wedding: 'Wedding', education: 'Education Fund', jeonse: 'Jeonse Safety' },
  // wedding
  weddingTitle: 'Wedding Budget Simulator',
  myAsset: 'My Assets (KRW)',
  partnerAsset: "Partner's Assets (KRW)",
  weddingCost: 'Wedding Costs (KRW)',
  housingCost: 'Housing Costs (KRW)',
  simulate: 'Simulate',
  totalAsset: 'Combined Assets',
  netStart: 'Net Worth After Wedding',
  highAssetWarning: 'Assets are significant — consult a tax advisor regarding gift tax, etc.',
  highAssetOk: 'Your post-wedding starting net worth looks healthy.',
  // education
  educationTitle: 'Education Fund Calculator',
  currentCostLabel: 'Current Annual Education Cost (KRW)',
  yearsUntilLabel: 'Years Until College',
  inflationLabel: 'Cost Inflation Rate (%)',
  durationLabel: 'College Duration (years)',
  futureCostLabel: 'Estimated Future Total Cost',
  monthlySaveLabel: 'Monthly Savings Needed (5% return assumed)',
  educationTip: 'The earlier you start saving, the lower your monthly contribution.',
  // jeonse
  jeonseTitle: 'Jeonse Deposit Safety Check',
  housePriceLabel: 'Property Value (KRW)',
  housePriceNote: 'Based on assessed or market price',
  depositLabel: 'Jeonse Deposit (KRW)',
  seniorDebtLabel: 'Senior Debt Total (KRW)',
  checkBtn: 'Check Safety',
  debtRatio: 'Debt-to-Value Ratio',
  safe: 'Safe',
  unsafe: 'Risky',
  safeReason: (r: number) => `(Deposit+Senior Debt)/Value = ${r}% ≤ 90%. Relatively safe jeonse.`,
  unsafeReason: (r: number) => `(Deposit+Senior Debt)/Value = ${r}% > 90%. HUG insurance may be unavailable.`,
  jeonseTip: 'Recommended ≤ 90% based on HUG Jeonse insurance guidelines',
  calculate: 'Calculate',
  reset: 'Reset',
  disclaimer: '* For reference only. Consult a professional before signing any contract.',
};

const LifePlanningCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = locale === 'ko' ? ko : en;

  const [activeTab, setActiveTab] = useState<TabId>('wedding');

  // Wedding state
  const [myAsset, setMyAsset] = useState<string>('');
  const [partnerAsset, setPartnerAsset] = useState<string>('');
  const [weddingCost, setWeddingCost] = useState<string>('');
  const [housingCost, setHousingCost] = useState<string>('');
  const [weddingResult, setWeddingResult] = useState<WeddingResult | null>(null);

  // Education state
  const [currentCost, setCurrentCost] = useState<string>('10000000');
  const [yearsUntil, setYearsUntil] = useState<string>('10');
  const [inflation, setInflation] = useState<string>('3.0');
  const [duration, setDuration] = useState<string>('4');
  const [eduResult, setEduResult] = useState<EducationResult | null>(null);

  // Jeonse state
  const [housePrice, setHousePrice] = useState<string>('');
  const [deposit, setDeposit] = useState<string>('');
  const [seniorDebt, setSeniorDebt] = useState<string>('');
  const [jeonseResult, setJeonseResult] = useState<JeonseResult | null>(null);

  const fmt = (n: number) => Math.round(n).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US');

  const calculateWedding = () => {
    const totalAsset = (Number(myAsset) || 0) + (Number(partnerAsset) || 0);
    const netStart = totalAsset - (Number(weddingCost) || 0) - (Number(housingCost) || 0);
    setWeddingResult({ totalAsset, netStart, isHighAsset: totalAsset > 500000000 });
  };

  const calculateEducation = () => {
    const cc = Number(currentCost) || 0;
    const y = Number(yearsUntil) || 0;
    const r = Number(inflation) || 0;
    const d = Number(duration) || 4;
    let totalFutureCost = 0;
    for (let i = 0; i < d; i++) {
      totalFutureCost += cc * Math.pow(1 + r / 100, y + i);
    }
    const monthlyRate = 0.05 / 12;
    const totalMonths = y * 12;
    let monthlySave = 0;
    if (monthlyRate > 0 && totalMonths > 0) {
      monthlySave = totalFutureCost * (monthlyRate / (Math.pow(1 + monthlyRate, totalMonths) - 1));
    } else if (totalMonths > 0) {
      monthlySave = totalFutureCost / totalMonths;
    }
    setEduResult({ futureCost: totalFutureCost, monthlySave });
  };

  const calculateJeonse = () => {
    const hp = Number(housePrice) || 0;
    if (hp <= 0) return;
    const total = (Number(deposit) || 0) + (Number(seniorDebt) || 0);
    const ratio = parseFloat(((total / hp) * 100).toFixed(2));
    setJeonseResult({ ratio, isSafe: ratio <= 90 });
  };

  const resetAll = () => {
    setMyAsset('');
    setPartnerAsset('');
    setWeddingCost('');
    setHousingCost('');
    setWeddingResult(null);
    setCurrentCost('10000000');
    setYearsUntil('10');
    setInflation('3.0');
    setDuration('4');
    setEduResult(null);
    setHousePrice('');
    setDeposit('');
    setSeniorDebt('');
    setJeonseResult(null);
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-rose-900 mb-6">{t.title}</h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-rose-100 rounded-2xl p-1">
        {(Object.entries(t.tabs) as [TabId, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === id
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-rose-500 hover:text-rose-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Wedding Tab */}
      {activeTab === 'wedding' && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-rose-700">{t.weddingTitle}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t.myAsset, value: myAsset, setter: setMyAsset },
              { label: t.partnerAsset, value: partnerAsset, setter: setPartnerAsset },
              { label: t.weddingCost, value: weddingCost, setter: setWeddingCost },
              { label: t.housingCost, value: housingCost, setter: setHousingCost },
            ].map((f) => (
              <div key={f.label} className="space-y-1">
                <label className="text-xs font-bold text-rose-800">{f.label}</label>
                <input
                  type="number"
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  min="0"
                  placeholder="0"
                  className="w-full p-3 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none text-sm"
                />
              </div>
            ))}
          </div>
          <button
            onClick={calculateWedding}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors"
          >
            {t.simulate}
          </button>
          {weddingResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-rose-100 p-4 text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">{t.totalAsset}</p>
                  <p className="text-lg font-bold text-rose-700">{fmt(weddingResult.totalAsset)}{locale === 'ko' ? '원' : ''}</p>
                </div>
                <div className="bg-white rounded-2xl border border-rose-100 p-4 text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">{t.netStart}</p>
                  <p className={`text-lg font-bold ${weddingResult.netStart < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {fmt(weddingResult.netStart)}{locale === 'ko' ? '원' : ''}
                  </p>
                </div>
              </div>
              <div className={`p-4 rounded-2xl text-sm ${weddingResult.isHighAsset ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
                {weddingResult.isHighAsset ? t.highAssetWarning : t.highAssetOk}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Education Tab */}
      {activeTab === 'education' && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-rose-700">{t.educationTitle}</p>
          <div className="space-y-1">
            <label className="text-sm font-bold text-rose-800">{t.currentCostLabel}</label>
            <input
              type="number"
              value={currentCost}
              onChange={(e) => setCurrentCost(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t.yearsUntilLabel, value: yearsUntil, setter: setYearsUntil },
              { label: t.inflationLabel, value: inflation, setter: setInflation },
              { label: t.durationLabel, value: duration, setter: setDuration },
            ].map((f) => (
              <div key={f.label} className="space-y-1">
                <label className="text-xs font-bold text-rose-800">{f.label}</label>
                <input
                  type="number"
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-full p-3 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none text-sm"
                />
              </div>
            ))}
          </div>
          <button
            onClick={calculateEducation}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors"
          >
            {t.calculate}
          </button>
          {eduResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-rose-100 p-4 text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">{t.futureCostLabel}</p>
                  <p className="text-sm font-bold text-rose-700">{fmt(eduResult.futureCost)}{locale === 'ko' ? '원' : ''}</p>
                </div>
                <div className="bg-white rounded-2xl border border-rose-100 p-4 text-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">{t.monthlySaveLabel}</p>
                  <p className="text-sm font-bold text-emerald-600">{fmt(eduResult.monthlySave)}{locale === 'ko' ? '원' : ''}</p>
                </div>
              </div>
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3">{t.educationTip}</p>
            </div>
          )}
        </div>
      )}

      {/* Jeonse Tab */}
      {activeTab === 'jeonse' && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-rose-700">{t.jeonseTitle}</p>
          <div className="space-y-1">
            <label className="text-sm font-bold text-rose-800">{t.housePriceLabel}</label>
            <input
              type="number"
              value={housePrice}
              onChange={(e) => setHousePrice(e.target.value)}
              min="0"
              placeholder="0"
              className="w-full p-3 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none"
            />
            <p className="text-xs text-slate-400">{t.housePriceNote}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t.depositLabel, value: deposit, setter: setDeposit },
              { label: t.seniorDebtLabel, value: seniorDebt, setter: setSeniorDebt },
            ].map((f) => (
              <div key={f.label} className="space-y-1">
                <label className="text-xs font-bold text-rose-800">{f.label}</label>
                <input
                  type="number"
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  min="0"
                  placeholder="0"
                  className="w-full p-3 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none text-sm"
                />
              </div>
            ))}
          </div>
          <button
            onClick={calculateJeonse}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors"
          >
            {t.checkBtn}
          </button>
          {jeonseResult && (
            <div className="space-y-3">
              <div className="text-center p-5 bg-white rounded-2xl border border-rose-100">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">{t.debtRatio}</p>
                <p className={`text-4xl font-black ${jeonseResult.isSafe ? 'text-emerald-600' : 'text-red-600'}`}>
                  {jeonseResult.ratio}%
                </p>
              </div>
              <div className={`p-4 rounded-2xl text-sm ${jeonseResult.isSafe ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                <p className="font-bold mb-1">{jeonseResult.isSafe ? t.safe : t.unsafe}</p>
                <p>{jeonseResult.isSafe ? t.safeReason(jeonseResult.ratio) : t.unsafeReason(jeonseResult.ratio)}</p>
              </div>
              <p className="text-xs text-slate-400 text-center">{t.jeonseTip}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={resetAll}
          className="w-full py-2 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold rounded-xl transition-colors text-sm"
        >
          {t.reset}
        </button>
      </div>

      <p className="mt-4 text-xs text-slate-400 text-center">{t.disclaimer}</p>
    </div>
  );
};

export default LifePlanningCalculator;
