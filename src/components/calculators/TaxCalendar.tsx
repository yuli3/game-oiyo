'use client';

import React, { useState } from 'react';

type JobType = 'employee' | 'self' | 'freelance' | 'corp';

interface TaxEvent {
  month: number;
  name: string;
  nameEn: string;
  relevantTo: JobType[];
  detail: string;
  detailEn: string;
  color: 'emerald' | 'amber' | 'blue' | 'rose';
}

const TAX_EVENTS: TaxEvent[] = [
  // Employee events
  { month: 1, name: '근로소득 지급명세서 제출', nameEn: 'Employment Income Statement', relevantTo: ['employee'], detail: '3월 10일까지 제출', detailEn: 'Submit by Mar 10', color: 'blue' },
  { month: 2, name: '연말정산 환급·추가납부', nameEn: 'Year-end Tax Reconciliation', relevantTo: ['employee'], detail: '급여일에 환급 또는 추가납부', detailEn: 'Refund or payment on payday', color: 'emerald' },
  { month: 5, name: '종합소득세 신고·납부', nameEn: 'Global Income Tax', relevantTo: ['self', 'freelance', 'employee'], detail: '5.1~5.31 신고·납부 (성실신고 6.30)', detailEn: 'May 1–31 (Sincere filers Jun 30)', color: 'amber' },
  { month: 7, name: '재산세 1기분 납부', nameEn: 'Property Tax 1st installment', relevantTo: ['employee', 'self', 'freelance'], detail: '7.16~7.31 납부', detailEn: 'Pay Jul 16–31', color: 'emerald' },
  { month: 8, name: '건강보험료 정산', nameEn: 'Health Insurance Settlement', relevantTo: ['employee'], detail: '전년도 보수 기준 정산', detailEn: 'Based on prior yr salary', color: 'blue' },
  { month: 9, name: '재산세 2기분 납부', nameEn: 'Property Tax 2nd installment', relevantTo: ['employee', 'self', 'freelance'], detail: '9.16~9.30 납부', detailEn: 'Pay Sep 16–30', color: 'emerald' },
  { month: 11, name: '종합부동산세 납부', nameEn: 'Comprehensive Real Estate Tax', relevantTo: ['employee', 'self', 'freelance'], detail: '12.1~12.15 납부', detailEn: 'Pay Dec 1–15', color: 'emerald' },
  { month: 12, name: '연말정산 간소화 자료 수집', nameEn: 'Year-end Tax Data Collection', relevantTo: ['employee'], detail: '소득·세액공제 자료 준비', detailEn: 'Prepare deduction documents', color: 'blue' },

  // Self-employed events
  { month: 1, name: '부가가치세 확정신고 (전년도 2기)', nameEn: 'VAT Final (Prior yr 2nd half)', relevantTo: ['self'], detail: '1.1~1.25 신고·납부', detailEn: 'File & pay Jan 1–25', color: 'rose' },
  { month: 3, name: '법인세 신고·납부', nameEn: 'Corporate Tax Filing', relevantTo: ['self'], detail: '12월 결산법인 3.31 기한', detailEn: 'Dec FY deadline Mar 31', color: 'rose' },
  { month: 4, name: '부가가치세 예정신고 (1기)', nameEn: 'VAT Preliminary (1st half)', relevantTo: ['self', 'freelance'], detail: '4.1~4.25 신고·납부', detailEn: 'File & pay Apr 1–25', color: 'rose' },
  { month: 6, name: '지방소득세 납부', nameEn: 'Local Income Tax', relevantTo: ['self', 'freelance'], detail: '5월 종소세 신고 후 별도 납부', detailEn: 'Separate payment after May filing', color: 'blue' },
  { month: 7, name: '부가가치세 확정신고 (1기)', nameEn: 'VAT Final (1st half)', relevantTo: ['self', 'freelance'], detail: '7.1~7.25 신고·납부', detailEn: 'File & pay Jul 1–25', color: 'rose' },
  { month: 10, name: '부가가치세 예정신고 (2기)', nameEn: 'VAT Preliminary (2nd half)', relevantTo: ['self', 'freelance'], detail: '10.1~10.25 신고·납부', detailEn: 'File & pay Oct 1–25', color: 'rose' },
  { month: 11, name: '종합소득세 중간예납', nameEn: 'Income Tax Prepayment', relevantTo: ['self', 'freelance'], detail: '11.1~11.30 납부', detailEn: 'Pay Nov 1–30', color: 'amber' },

  // Corporation events
  { month: 1, name: '부가가치세 확정신고 (전년도 2기)', nameEn: 'VAT Final (Prior yr 2nd half)', relevantTo: ['corp'], detail: '1.1~1.25 신고·납부', detailEn: 'File & pay Jan 1–25', color: 'rose' },
  { month: 3, name: '법인세 신고·납부 (12월 결산법인)', nameEn: 'Corporate Tax Filing (Dec FY)', relevantTo: ['corp'], detail: '3월 31일 기한', detailEn: 'Deadline Mar 31', color: 'amber' },
  { month: 3, name: '지방소득세 납부 (법인)', nameEn: 'Local Income Tax (Corp)', relevantTo: ['corp'], detail: '법인세 신고 후 4월 30일까지', detailEn: 'By Apr 30 after corp tax filing', color: 'blue' },
  { month: 4, name: '부가가치세 예정신고 (1기)', nameEn: 'VAT Preliminary (1st half)', relevantTo: ['corp'], detail: '4.1~4.25 신고·납부', detailEn: 'File & pay Apr 1–25', color: 'rose' },
  { month: 5, name: '법인 종합소득세 미적용', nameEn: 'No Global Income Tax for Corps', relevantTo: ['corp'], detail: '법인은 종합소득세 적용 대상 아님', detailEn: 'Corporations not subject to global income tax', color: 'emerald' },
  { month: 6, name: '결산 중간배당 (이사회 결의)', nameEn: 'Interim Dividend (Board Resolution)', relevantTo: ['corp'], detail: '이사회 결의 후 주주 지급', detailEn: 'Board approval required before shareholder payment', color: 'blue' },
  { month: 7, name: '부가가치세 확정신고 (1기)', nameEn: 'VAT Final (1st half)', relevantTo: ['corp'], detail: '7.1~7.25 신고·납부', detailEn: 'File & pay Jul 1–25', color: 'rose' },
  { month: 7, name: '재산세 납부 (보유 부동산)', nameEn: 'Property Tax (Real Estate Held)', relevantTo: ['corp'], detail: '7.16~7.31 납부', detailEn: 'Pay Jul 16–31', color: 'emerald' },
  { month: 8, name: '법인 중간예납 (8월 결산법인)', nameEn: 'Corp Tax Prepayment (Aug FY)', relevantTo: ['corp'], detail: '해당 사업연도 6개월분 선납', detailEn: '6-month prepayment for applicable fiscal year', color: 'amber' },
  { month: 9, name: '재산세 2기분 납부', nameEn: 'Property Tax 2nd installment', relevantTo: ['corp'], detail: '9.16~9.30 납부', detailEn: 'Pay Sep 16–30', color: 'emerald' },
  { month: 10, name: '부가가치세 예정신고 (2기)', nameEn: 'VAT Preliminary (2nd half)', relevantTo: ['corp'], detail: '10.1~10.25 신고·납부', detailEn: 'File & pay Oct 1–25', color: 'rose' },
  { month: 11, name: '레저세·담배세 (해당 사업자)', nameEn: 'Leisure Tax / Tobacco Tax', relevantTo: ['corp'], detail: '오락시설·담배 판매 사업자 매월 납부', detailEn: 'Monthly payment for entertainment/tobacco sellers', color: 'blue' },
  { month: 11, name: '개별소비세 (해당 사업자)', nameEn: 'Individual Consumption Tax', relevantTo: ['corp'], detail: '특별소비세 해당 사업자 납부', detailEn: 'Payment for applicable special consumption tax businesses', color: 'blue' },
  { month: 12, name: '결산 준비 · 감사보고서 수령', nameEn: 'Year-end Closing & Audit Report', relevantTo: ['corp'], detail: '외부감사 대상법인 감사보고서 수령', detailEn: 'Receive audit report for externally audited corporations', color: 'emerald' },
];

const MONTH_NAMES_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const COLOR_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
  blue: 'bg-blue-50 border-blue-200 text-blue-800',
  rose: 'bg-rose-50 border-rose-200 text-rose-800',
};

const COLOR_DOT: Record<string, string> = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  rose: 'bg-rose-500',
};

const JOB_LABELS: Record<JobType, { ko: string; en: string }> = {
  employee: { ko: '직장인', en: 'Employee' },
  self: { ko: '자영업자', en: 'Self-Employed' },
  freelance: { ko: '프리랜서', en: 'Freelancer' },
  corp: { ko: '법인', en: 'Corporation' },
};

const JOB_DESCRIPTIONS: Record<JobType, { ko: string; en: string }> = {
  employee: { ko: '근로소득세·4대보험 중심', en: 'Employment income tax & 4 major insurances' },
  self: { ko: '부가세·종합소득세 중심', en: 'VAT & global income tax focus' },
  freelance: { ko: '3.3% 원천징수·종합소득세', en: '3.3% withholding & global income tax' },
  corp: { ko: '법인세·부가세·지방소득세', en: 'Corporate tax, VAT & local income tax' },
};

const TaxCalendar: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [jobType, setJobType] = useState<JobType>('employee');

  const currentMonth = new Date().getMonth() + 1;

  const filtered = TAX_EVENTS.filter((e) => e.relevantTo.includes(jobType));

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-2">
        {locale === 'ko' ? '세금 납부 캘린더' : 'Tax Payment Calendar'}
      </h3>
      <p className="text-sm text-emerald-600 mb-6">
        {locale === 'ko' ? '직종을 선택하면 해당하는 세금 일정을 확인할 수 있습니다.' : 'Select your job type to see your relevant tax deadlines.'}
      </p>

      {/* Job type selector */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4"
        role="group"
        aria-label={locale === 'ko' ? '직종 선택' : 'Job type selection'}
      >
        {(Object.keys(JOB_LABELS) as JobType[]).map((type) => (
          <button
            key={type}
            onClick={() => setJobType(type)}
            className={`py-3 rounded-xl text-sm font-bold transition-colors border ${
              jobType === type
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            }`}
            aria-pressed={jobType === type}
          >
            {locale === 'ko' ? JOB_LABELS[type].ko : JOB_LABELS[type].en}
          </button>
        ))}
      </div>

      {/* Description panel */}
      <div className="mb-6 px-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm text-emerald-700">
        <span className="font-bold mr-2">{locale === 'ko' ? JOB_LABELS[jobType].ko : JOB_LABELS[jobType].en}:</span>
        <span>{locale === 'ko' ? JOB_DESCRIPTIONS[jobType].ko : JOB_DESCRIPTIONS[jobType].en}</span>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const monthEvents = filtered.filter((e) => e.month === month);
          const isCurrentMonth = month === currentMonth;

          return (
            <div
              key={month}
              className={`p-4 rounded-2xl border ${
                isCurrentMonth
                  ? 'border-emerald-400 bg-white shadow-md'
                  : 'border-emerald-100 bg-white'
              }`}
              aria-label={`${locale === 'ko' ? MONTH_NAMES_KO[month - 1] : MONTH_NAMES_EN[month - 1]} ${locale === 'ko' ? '세금 일정' : 'tax events'}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-sm font-bold ${isCurrentMonth ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {locale === 'ko' ? MONTH_NAMES_KO[month - 1] : MONTH_NAMES_EN[month - 1]}
                </span>
                {isCurrentMonth && (
                  <span className="text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    {locale === 'ko' ? '이번 달' : 'This Month'}
                  </span>
                )}
              </div>

              {monthEvents.length === 0 ? (
                <p className="text-xs text-slate-300">{locale === 'ko' ? '해당 없음' : 'No events'}</p>
              ) : (
                <div className="space-y-2">
                  {monthEvents.map((event, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-xl border text-xs ${COLOR_CLASSES[event.color]}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${COLOR_DOT[event.color]}`} aria-hidden="true" />
                        <span className="font-bold">{locale === 'ko' ? event.name : event.nameEn}</span>
                      </div>
                      <p className="opacity-70 pl-3">{locale === 'ko' ? event.detail : event.detailEn}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${COLOR_DOT.rose}`} aria-hidden="true" />
          <span className="text-slate-600">{locale === 'ko' ? '부가가치세/법인세' : 'VAT/Corporate'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${COLOR_DOT.amber}`} aria-hidden="true" />
          <span className="text-slate-600">{locale === 'ko' ? '소득세' : 'Income Tax'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${COLOR_DOT.emerald}`} aria-hidden="true" />
          <span className="text-slate-600">{locale === 'ko' ? '재산·기타' : 'Property/Other'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${COLOR_DOT.blue}`} aria-hidden="true" />
          <span className="text-slate-600">{locale === 'ko' ? '4대보험·지방세·기타' : '4 Insurances/Local/Other'}</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400 text-center">
        * 2025년 기준. 납부 기한이 공휴일인 경우 다음 영업일로 이월됩니다.
      </p>
    </div>
  );
};

export default TaxCalendar;
