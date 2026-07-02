'use client';

import React, { useState } from 'react';

// 2024년 기준 증여세 공제 한도
const GIFT_DEDUCTIONS: Record<string, number> = {
  spouse: 600_000_000,    // 배우자 6억
  lineal_asc: 50_000_000, // 직계존속 5천만
  minor: 20_000_000,      // 미성년 직계비속 2천만
  lineal_desc: 50_000_000,// 직계비속 5천만
  relative: 10_000_000,   // 기타친족 1천만
  other: 0,               // 타인 공제 없음
};

const RELATIONSHIP_LABELS: Record<string, { ko: string; en: string }> = {
  spouse: { ko: '배우자', en: 'Spouse' },
  lineal_asc: { ko: '직계존속 (부모·조부모)', en: 'Parent/Grandparent' },
  minor: { ko: '미성년 직계비속', en: 'Minor Child' },
  lineal_desc: { ko: '직계비속 (성년)', en: 'Adult Child' },
  relative: { ko: '기타친족', en: 'Other Relative' },
  other: { ko: '타인', en: 'Third Party' },
};

// 세율 구간: limit은 누진공제 포함 실효 누진세액
const TAX_BRACKETS = [
  { limit: 100_000_000, rate: 0.1, deduction: 0 },
  { limit: 500_000_000, rate: 0.2, deduction: 10_000_000 },
  { limit: 1_000_000_000, rate: 0.3, deduction: 60_000_000 },
  { limit: 3_000_000_000, rate: 0.4, deduction: 160_000_000 },
  { limit: Infinity, rate: 0.5, deduction: 460_000_000 },
];

interface GiftTaxResult {
  totalGiftAmount: number;
  deduction: number;
  taxableBase: number;
  bracketRate: number;
  giftTax: number;
  localTax: number;
  finalTax: number;
}

const GiftTaxCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [giftAmount, setGiftAmount] = useState<string>('100000000');
  const [pastGifts, setPastGifts] = useState<string>('0');
  const [relationship, setRelationship] = useState<string>('lineal_desc');
  const [result, setResult] = useState<GiftTaxResult | null>(null);
  const [error, setError] = useState<string>('');

  const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

  const calculate = () => {
    setError('');
    const gift = Number(giftAmount);
    const past = Number(pastGifts);

    if (gift < 0 || past < 0) {
      setError(locale === 'ko' ? '금액을 올바르게 입력해 주세요.' : 'Please enter a valid amount.');
      return;
    }

    const totalGiftAmount = gift + past;
    const deduction = GIFT_DEDUCTIONS[relationship] ?? 0;
    const taxableBase = Math.max(0, totalGiftAmount - deduction);

    const bracket = TAX_BRACKETS.find((b) => taxableBase <= b.limit) ?? TAX_BRACKETS[TAX_BRACKETS.length - 1];
    const giftTax = Math.max(0, Math.floor(taxableBase * bracket.rate - bracket.deduction));
    const localTax = Math.floor(giftTax * 0.1); // 지방세 10%
    const finalTax = giftTax + localTax;

    setResult({
      totalGiftAmount,
      deduction,
      taxableBase,
      bracketRate: bracket.rate * 100,
      giftTax,
      localTax,
      finalTax,
    });
  };

  const reset = () => {
    setGiftAmount('100000000');
    setPastGifts('0');
    setRelationship('lineal_desc');
    setResult(null);
    setError('');
  };

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-6">
        {locale === 'ko' ? '증여세 계산기 (2024년 기준)' : 'Gift Tax Calculator (2024 Korea)'}
      </h3>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '증여 금액 (원)' : 'Gift Amount (KRW)'}
            </label>
            <input
              type="number"
              value={giftAmount}
              onChange={(e) => setGiftAmount(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '증여 금액' : 'Gift Amount'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '증여자-수증자 관계' : 'Relationship'}
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '관계' : 'Relationship'}
            >
              {Object.entries(RELATIONSHIP_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {locale === 'ko' ? label.ko : label.en}
                  {' '}({locale === 'ko' ? '공제 ' : 'Deduction '}{fmt(GIFT_DEDUCTIONS[key])}원)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-emerald-800">
              {locale === 'ko' ? '최근 10년 내 이전 증여 합계 (원)' : 'Prior 10-year Gifts (KRW)'}
            </label>
            <input
              type="number"
              value={pastGifts}
              onChange={(e) => setPastGifts(e.target.value)}
              min="0"
              className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
              aria-label={locale === 'ko' ? '이전 증여 합계' : 'Prior gifts'}
            />
            <p className="text-xs text-emerald-500">
              {locale === 'ko' ? '없으면 0 입력' : 'Enter 0 if none'}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={calculate}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
              aria-label={locale === 'ko' ? '계산하기' : 'Calculate'}
            >
              {locale === 'ko' ? '계산하기' : 'Calculate'}
            </button>
            <button
              onClick={reset}
              className="px-5 py-3 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl transition-colors"
              aria-label={locale === 'ko' ? '초기화' : 'Reset'}
            >
              {locale === 'ko' ? '초기화' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col justify-center space-y-4">
          {result ? (
            <>
              <div className="p-6 bg-emerald-600 text-white rounded-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
                  {locale === 'ko' ? '납부할 증여세 (지방세 포함)' : 'Gift Tax Due (incl. Local Tax)'}
                </p>
                <p className="text-4xl font-bold">{fmt(result.finalTax)}원</p>
              </div>

              <div className="space-y-2 p-5 bg-white rounded-2xl border border-emerald-100 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{locale === 'ko' ? '증여 금액 합계' : 'Total Gift'}</span>
                  <span className="font-bold">{fmt(result.totalGiftAmount)}원</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>{locale === 'ko' ? '공제 한도' : 'Deduction'}</span>
                  <span className="font-bold">-{fmt(result.deduction)}원</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-500">{locale === 'ko' ? '과세표준' : 'Taxable Base'}</span>
                  <span className="font-bold">{fmt(result.taxableBase)}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{locale === 'ko' ? '적용 세율' : 'Tax Rate'}</span>
                  <span className="font-bold">{result.bracketRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{locale === 'ko' ? '증여세' : 'Gift Tax'}</span>
                  <span className="font-bold">{fmt(result.giftTax)}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{locale === 'ko' ? '지방세 (10%)' : 'Local Tax (10%)'}</span>
                  <span className="font-bold">{fmt(result.localTax)}원</span>
                </div>
              </div>

              {result.taxableBase === 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm font-bold text-center">
                  {locale === 'ko' ? '공제 한도 이내로 증여세가 없습니다.' : 'No gift tax due — within deduction limit.'}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-emerald-200">
              <span className="text-4xl mb-2" aria-hidden="true">🎁</span>
              <p className="text-sm font-bold text-emerald-300">
                {locale === 'ko' ? '증여 정보를 입력해 주세요' : 'Enter gift details above'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 공제 한도 안내 */}
      <div className="mt-8 p-5 bg-white rounded-2xl border border-emerald-100">
        <p className="text-sm font-bold text-emerald-800 mb-3">
          {locale === 'ko' ? '2024년 증여세 공제 한도 (10년 단위)' : '2024 Gift Tax Deduction Limits (per 10 years)'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {Object.entries(RELATIONSHIP_LABELS).map(([key, label]) => (
            <div key={key} className="flex justify-between p-2 bg-emerald-50 rounded-lg">
              <span className="text-slate-600">{locale === 'ko' ? label.ko : label.en}</span>
              <span className="font-bold text-emerald-700">{(GIFT_DEDUCTIONS[key] / 10000).toLocaleString('ko-KR')}만원</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400 text-center">
        * 2024년 세법 기준. 신고세액공제(3%) 및 할증과세(세대생략 30%)는 미반영. 세무 전문가 상담 권장.
      </p>
    </div>
  );
};

export default GiftTaxCalculator;
