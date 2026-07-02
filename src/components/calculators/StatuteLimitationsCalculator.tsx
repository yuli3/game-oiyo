'use client';

import React, { useState } from 'react';

type ClaimType = 'civil_general' | 'commercial' | 'wage' | 'short_3yr' | 'short_1yr' | 'tort_know' | 'tort_occur';

interface ClaimOption {
  value: ClaimType;
  years: number;
}

interface CalcResult {
  expiryDate: Date;
  isExpired: boolean;
  remainingDays: number;
  claimLabel: string;
  lawRef: string;
  description: string;
}

const CLAIM_OPTIONS: ClaimOption[] = [
  { value: 'civil_general', years: 10 },
  { value: 'commercial', years: 5 },
  { value: 'wage', years: 3 },
  { value: 'short_3yr', years: 3 },
  { value: 'short_1yr', years: 1 },
  { value: 'tort_know', years: 3 },
  { value: 'tort_occur', years: 10 },
];

const ko = {
  title: '소멸시효 계산기',
  claimTypeLabel: '청구 유형',
  claimTypePlaceholder: '유형을 선택하세요',
  baseDateLabel: '기산일 (사건/인지 날짜)',
  calculate: '계산하기',
  reset: '초기화',
  resultTitle: '소멸시효 만료일',
  expired: '시효 만료됨',
  remaining: (days: number) => `${days}일 남음`,
  lawRefLabel: '관련 법조항',
  descLabel: '설명',
  errorSelect: '청구 유형과 기산일을 입력해 주세요.',
  disclaimer: '※ 본 계산기는 참고용이며, 법적 효력이 없습니다. 실제 소멸시효는 구체적 사실관계에 따라 다를 수 있습니다.',
  types: {
    civil_general: '일반 민사채권 (10년)',
    commercial: '상사채권 (5년)',
    wage: '임금채권 (3년)',
    short_3yr: '단기시효 3년 (이자·임료·의료비 등)',
    short_1yr: '단기시효 1년 (음식·숙박비 등)',
    tort_know: '불법행위 — 손해·가해자 인지 후 (3년)',
    tort_occur: '불법행위 — 행위 발생 기준 (10년)',
  },
  lawRefs: {
    civil_general: '민법 제162조 제1항',
    commercial: '상법 제64조',
    wage: '근로기준법 제49조',
    short_3yr: '민법 제163조',
    short_1yr: '민법 제164조',
    tort_know: '민법 제766조 제1항',
    tort_occur: '민법 제766조 제2항',
  },
  descriptions: {
    civil_general: '일반적인 민사 채권의 소멸시효는 10년입니다.',
    commercial: '상행위로 인한 채권의 소멸시효는 5년입니다.',
    wage: '임금·퇴직금 등 근로관계 채권의 소멸시효는 3년입니다.',
    short_3yr: '이자·임료·의사·변호사 보수 등의 소멸시효는 3년입니다.',
    short_1yr: '음식점·숙박업·소매 대금 채권의 소멸시효는 1년입니다.',
    tort_know: '불법행위로 인한 손해 및 가해자를 안 날로부터 3년입니다.',
    tort_occur: '불법행위가 발생한 날로부터 10년 내에 청구해야 합니다.',
  },
};

const en = {
  title: 'Statute of Limitations Calculator',
  claimTypeLabel: 'Claim Type',
  claimTypePlaceholder: 'Select a type',
  baseDateLabel: 'Base Date (incident/knowledge date)',
  calculate: 'Calculate',
  reset: 'Reset',
  resultTitle: 'Limitation Expiry Date',
  expired: 'Limitation period expired',
  remaining: (days: number) => `${days} days remaining`,
  lawRefLabel: 'Legal Reference',
  descLabel: 'Description',
  errorSelect: 'Please select a claim type and enter a base date.',
  disclaimer: '* This calculator is for reference only and has no legal effect. Actual limitations may vary based on specific facts.',
  types: {
    civil_general: 'General Civil Claim (10 years)',
    commercial: 'Commercial Claim (5 years)',
    wage: 'Wage Claim (3 years)',
    short_3yr: 'Short — 3 years (interest, rent, medical fees etc.)',
    short_1yr: 'Short — 1 year (food, lodging etc.)',
    tort_know: 'Tort — from date of knowledge (3 years)',
    tort_occur: 'Tort — from date of occurrence (10 years)',
  },
  lawRefs: {
    civil_general: 'Civil Act Art. 162(1)',
    commercial: 'Commercial Act Art. 64',
    wage: 'Labor Standards Act Art. 49',
    short_3yr: 'Civil Act Art. 163',
    short_1yr: 'Civil Act Art. 164',
    tort_know: 'Civil Act Art. 766(1)',
    tort_occur: 'Civil Act Art. 766(2)',
  },
  descriptions: {
    civil_general: 'General civil claims expire after 10 years.',
    commercial: 'Claims arising from commercial acts expire after 5 years.',
    wage: 'Wage and severance claims expire after 3 years.',
    short_3yr: 'Claims for interest, rent, and professional fees expire after 3 years.',
    short_1yr: 'Claims for food, lodging, and retail expire after 1 year.',
    tort_know: '3 years from the date the victim knew of the damage and the tortfeasor.',
    tort_occur: 'Must be filed within 10 years from the date the tortious act occurred.',
  },
};

const StatuteLimitationsCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = locale === 'ko' ? ko : en;

  const [claimType, setClaimType] = useState<ClaimType | ''>('');
  const [baseDate, setBaseDate] = useState<string>('');
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string>('');

  const calculate = () => {
    setError('');
    if (!claimType || !baseDate) {
      setError(t.errorSelect);
      return;
    }

    const option = CLAIM_OPTIONS.find((o) => o.value === claimType);
    if (!option) return;

    const base = new Date(baseDate);
    const expiry = new Date(base);
    expiry.setFullYear(expiry.getFullYear() + option.years);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const diffMs = expiry.getTime() - today.getTime();
    const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isExpired = remainingDays < 0;

    setResult({
      expiryDate: expiry,
      isExpired,
      remainingDays,
      claimLabel: t.types[claimType],
      lawRef: t.lawRefs[claimType],
      description: t.descriptions[claimType],
    });
  };

  const reset = () => {
    setClaimType('');
    setBaseDate('');
    setResult(null);
    setError('');
  };

  const fmtDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-slate-50 to-indigo-50 border border-slate-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-slate-900 mb-6">{t.title}</h3>

      <div className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">{t.claimTypeLabel}</label>
          <select
            value={claimType}
            onChange={(e) => setClaimType(e.target.value as ClaimType | '')}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
          >
            <option value="">{t.claimTypePlaceholder}</option>
            {CLAIM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t.types[opt.value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-slate-700">{t.baseDateLabel}</label>
          <input
            type="date"
            value={baseDate}
            onChange={(e) => setBaseDate(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={calculate}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
          >
            {t.calculate}
          </button>
          <button
            onClick={reset}
            className="px-5 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors"
          >
            {t.reset}
          </button>
        </div>

        {result && (
          <div className="mt-4 space-y-4">
            <div
              className={`p-5 rounded-2xl text-center ${
                result.isExpired ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{t.resultTitle}</p>
              <p className="text-3xl font-black">{fmtDate(result.expiryDate)}</p>
              <p className="mt-2 text-sm font-semibold">
                {result.isExpired
                  ? t.expired
                  : t.remaining(result.remainingDays)}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{t.lawRefLabel}</p>
                <p className="text-sm font-semibold text-slate-800">{result.lawRef}</p>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{t.descLabel}</p>
                <p className="text-sm text-slate-700">{result.description}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">{t.disclaimer}</p>
    </div>
  );
};

export default StatuteLimitationsCalculator;
