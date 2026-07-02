'use client';

import React, { useState, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HeritState {
  totalEstate: number;
  nonTaxable: number;
  debts: number;
  funeralExpense: number;
  hasSpouse: boolean;
  spouseActualAcquisition: number;
  numChildren: number;
  numMinorChildren: number;
  financialAssets: number;
  priorTaxPaid: number;
  shortTermReRedux: number;
  giftTaxPaid: number;
}

// ── Tax calculation helpers ───────────────────────────────────────────────────

function applyProgressiveRate(base: number): { tax: number; breakdown: Array<{ bracket: string; tax: number }> } {
  const brackets = [
    { limit: 100000000, rate: 0.10, label: '1억 이하 (10%)' },
    { limit: 500000000, rate: 0.20, label: '5억 이하 (20%)' },
    { limit: 1000000000, rate: 0.30, label: '10억 이하 (30%)' },
    { limit: 3000000000, rate: 0.40, label: '30억 이하 (40%)' },
    { limit: Infinity, rate: 0.50, label: '30억 초과 (50%)' },
  ];

  let remaining = Math.max(0, base);
  let totalTax = 0;
  let prevLimit = 0;
  const breakdown: Array<{ bracket: string; tax: number }> = [];

  for (const b of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, b.limit === Infinity ? remaining : b.limit - prevLimit);
    const bracketTax = taxable * b.rate;
    if (taxable > 0) {
      breakdown.push({ bracket: b.label, tax: bracketTax });
      totalTax += bracketTax;
    }
    remaining -= taxable;
    prevLimit = b.limit;
  }

  return { tax: totalTax, breakdown };
}

// ── Number field ──────────────────────────────────────────────────────────────

interface NumInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  helper?: string;
}

const NumInput: React.FC<NumInputProps> = ({ label, value, onChange, unit = '만원', helper }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-slate-600">{label}</label>
    {helper && <p className="text-xs text-slate-400">{helper}</p>}
    <div className="flex items-center border border-emerald-200 rounded-xl overflow-hidden">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 px-3 py-2 text-sm focus:outline-none"
        aria-label={label}
      />
      <span className="px-2 text-xs text-slate-500 bg-slate-50 border-l border-emerald-100 py-2">{unit}</span>
    </div>
  </div>
);

const fmt = (n: number) => Math.round(n).toLocaleString();

// ── Main Component ────────────────────────────────────────────────────────────

export const InheritanceTaxCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [s, setS] = useState<HeritState>({
    totalEstate: 200000,       // 20억 만원 단위
    nonTaxable: 500,           // 500만원
    debts: 5000,               // 5천만원
    funeralExpense: 1000,      // 1천만원 (default/max 1500)
    hasSpouse: true,
    spouseActualAcquisition: 50000, // 5억
    numChildren: 2,
    numMinorChildren: 0,
    financialAssets: 10000,    // 1억
    priorTaxPaid: 0,
    shortTermReRedux: 0,
    giftTaxPaid: 0,
  });

  const set = (field: keyof HeritState) => (v: number | boolean) =>
    setS((prev) => ({ ...prev, [field]: v }));

  const calc = useMemo(() => {
    // All values in 만원 → convert to 원 for calc
    const W = 10000; // multiplier: 만원 → 원

    const totalEstate = s.totalEstate * W;
    const nonTaxable = s.nonTaxable * W;
    const debts = s.debts * W;
    const funeralExpense = Math.min(s.funeralExpense, 1500) * W; // cap at 1500만원
    const financialAssets = s.financialAssets * W;

    // Step 1: 상속세 과세가액
    const taxableEstate = Math.max(0, totalEstate - nonTaxable - debts - funeralExpense);

    // Step 2: 상속공제 계산

    // 기초공제
    const basicDeduction = 2000000; // 200만원

    // 배우자공제
    const spouseAcquisition = s.spouseActualAcquisition * W;
    let spouseDeduction = 0;
    if (s.hasSpouse) {
      // min(실제취득액, 30억), 최소 5억 보장
      spouseDeduction = Math.max(500000000, Math.min(spouseAcquisition, 3000000000));
    }

    // 자녀공제: 5000만원 × n
    const childrenDeduction = s.numChildren * 50000000;

    // 미성년자공제: (19 - 나이) × 1000만원 — simplified: 1000만원/인으로 대리
    const minorDeduction = s.numMinorChildren * 10000000;

    // 개별공제 합계
    const individualDeduction = basicDeduction + spouseDeduction + childrenDeduction + minorDeduction;

    // 일괄공제: 5억
    const lumpSumDeduction = 500000000;

    // 더 큰 쪽 선택 (단, 배우자 있으면 배우자공제 포함한 개별공제 사용)
    const appliedDeduction = Math.max(individualDeduction, lumpSumDeduction);
    const usesLumpSum = lumpSumDeduction > individualDeduction;

    // 금융재산상속공제: 금융재산 × 20%, max 2억
    const financialDeduction = Math.min(financialAssets * 0.2, 200000000);

    // 총 공제
    const totalDeduction = appliedDeduction + financialDeduction;

    // Step 3: 과세표준
    const taxBase = Math.max(0, taxableEstate - totalDeduction);

    // Step 4: 누진세율 적용
    const { tax: grossTax, breakdown } = applyProgressiveRate(taxBase);

    // Step 5: 세액공제
    const taxCredits =
      (s.priorTaxPaid + s.shortTermReRedux + s.giftTaxPaid) * W;

    // Step 6: 납부세액
    const finalTax = Math.max(0, grossTax - taxCredits);

    return {
      taxableEstate,
      basicDeduction,
      spouseDeduction,
      childrenDeduction,
      minorDeduction,
      individualDeduction,
      lumpSumDeduction,
      appliedDeduction,
      usesLumpSum,
      financialDeduction,
      totalDeduction,
      taxBase,
      grossTax,
      breakdown,
      taxCredits,
      finalTax,
    };
  }, [s]);

  const LabelValue: React.FC<{ label: string; value: number; highlight?: boolean; indent?: boolean }> = ({ label, value, highlight = false, indent = false }) => (
    <div className={`flex justify-between items-center py-1.5 border-b border-emerald-100 ${highlight ? 'bg-emerald-50 rounded-lg px-2' : ''} ${indent ? 'pl-4' : ''}`}>
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>
        {fmt(value)}만원
      </span>
    </div>
  );

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-2">
        {locale === 'ko' ? '상속세 계산기' : 'Inheritance Tax Calculator'}
      </h3>
      <p className="text-sm text-emerald-600 mb-6">
        {locale === 'ko'
          ? '2024년 기준 상속세를 단계별로 계산합니다. (단위: 만원)'
          : 'Calculate Korean inheritance tax step by step. (Unit: 10,000 KRW)'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="space-y-4">
          <div className="bg-white border border-emerald-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-emerald-800 mb-3">
              {locale === 'ko' ? '재산 현황 (만원)' : 'Estate Information (10K KRW)'}
            </p>
            <div className="space-y-3">
              <NumInput label={locale === 'ko' ? '총 상속재산' : 'Total Estate'} value={s.totalEstate} onChange={set('totalEstate')} />
              <NumInput label={locale === 'ko' ? '비과세재산 (생활용품 등)' : 'Non-Taxable Assets'} value={s.nonTaxable} onChange={set('nonTaxable')} />
              <NumInput label={locale === 'ko' ? '채무' : 'Debts'} value={s.debts} onChange={set('debts')} />
              <NumInput
                label={locale === 'ko' ? '장례비용 (최대 1,500만원)' : 'Funeral Expenses (max 15M)'}
                value={s.funeralExpense}
                onChange={set('funeralExpense')}
                helper={locale === 'ko' ? '기본 1,000만원, 최대 1,500만원' : 'Default 10M, max 15M KRW'}
              />
              <NumInput label={locale === 'ko' ? '금융재산' : 'Financial Assets'} value={s.financialAssets} onChange={set('financialAssets')} />
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-emerald-800 mb-3">
              {locale === 'ko' ? '상속인 구성' : 'Heirs Composition'}
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600" htmlFor="has-spouse">
                  {locale === 'ko' ? '배우자 있음' : 'Has Spouse'}
                </label>
                <input
                  id="has-spouse"
                  type="checkbox"
                  checked={s.hasSpouse}
                  onChange={(e) => setS((prev) => ({ ...prev, hasSpouse: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-600"
                  aria-label={locale === 'ko' ? '배우자 있음' : 'Has spouse'}
                />
              </div>
              {s.hasSpouse && (
                <NumInput
                  label={locale === 'ko' ? '배우자 실제취득액' : 'Spouse Actual Acquisition'}
                  value={s.spouseActualAcquisition}
                  helper={locale === 'ko' ? '최소 5억 공제 보장, 최대 30억' : 'Min 500M guaranteed, max 3B'}
                  onChange={set('spouseActualAcquisition')}
                />
              )}
              <NumInput label={locale === 'ko' ? '자녀 수' : '# Children'} value={s.numChildren} onChange={set('numChildren')} unit={locale === 'ko' ? '명' : 'ppl'} />
              <NumInput label={locale === 'ko' ? '미성년 자녀 수' : '# Minor Children'} value={s.numMinorChildren} onChange={set('numMinorChildren')} unit={locale === 'ko' ? '명' : 'ppl'} />
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-emerald-800 mb-3">
              {locale === 'ko' ? '세액공제 (만원)' : 'Tax Credits (10K KRW)'}
            </p>
            <div className="space-y-3">
              <NumInput label={locale === 'ko' ? '기납부세액' : 'Prior Tax Paid'} value={s.priorTaxPaid} onChange={set('priorTaxPaid')} />
              <NumInput label={locale === 'ko' ? '단기재상속세액공제' : 'Short-Term Rededuciton'} value={s.shortTermReRedux} onChange={set('shortTermReRedux')} />
              <NumInput label={locale === 'ko' ? '증여세액공제' : 'Gift Tax Credit'} value={s.giftTaxPaid} onChange={set('giftTaxPaid')} />
            </div>
          </div>
        </div>

        {/* Result panel */}
        <div className="space-y-4">
          <div className="bg-white border border-emerald-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-emerald-800 mb-3">
              {locale === 'ko' ? '단계별 계산' : 'Step-by-Step Calculation'}
            </p>
            <div className="space-y-0.5">
              <LabelValue label={locale === 'ko' ? '① 총 상속재산' : '① Total Estate'} value={s.totalEstate} />
              <LabelValue label={locale === 'ko' ? '   비과세재산' : '   Non-Taxable'} value={-s.nonTaxable} indent />
              <LabelValue label={locale === 'ko' ? '   채무' : '   Debts'} value={-s.debts} indent />
              <LabelValue label={locale === 'ko' ? '   장례비용' : '   Funeral'} value={-Math.min(s.funeralExpense, 1500)} indent />
              <LabelValue label={locale === 'ko' ? '② 과세가액' : '② Taxable Estate'} value={calc.taxableEstate / 10000} highlight />

              <div className="pt-2">
                <p className="text-xs font-bold text-slate-500 mb-1">
                  {locale === 'ko' ? '③ 상속공제' : '③ Deductions'}
                </p>
                {s.hasSpouse && (
                  <LabelValue label={locale === 'ko' ? '   배우자공제' : '   Spouse Deduction'} value={calc.spouseDeduction / 10000} indent />
                )}
                <LabelValue label={locale === 'ko' ? '   자녀공제' : '   Children Deduction'} value={calc.childrenDeduction / 10000} indent />
                {s.numMinorChildren > 0 && (
                  <LabelValue label={locale === 'ko' ? '   미성년자공제' : '   Minor Deduction'} value={calc.minorDeduction / 10000} indent />
                )}
                <LabelValue label={locale === 'ko' ? '   기초공제' : '   Basic Deduction'} value={calc.basicDeduction / 10000} indent />
                <div className={`flex justify-between items-center py-1 px-2 rounded-lg text-xs ${calc.usesLumpSum ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  <span>
                    {calc.usesLumpSum
                      ? locale === 'ko' ? '일괄공제 선택 (5억 > 개별공제)' : 'Lump-sum (500M > individual)'
                      : locale === 'ko' ? '개별공제 선택 (개별공제 > 5억)' : 'Individual (> 500M lump-sum)'}
                  </span>
                  <span className="font-bold">{fmt(calc.appliedDeduction / 10000)}만원</span>
                </div>
                <LabelValue label={locale === 'ko' ? '   금융재산공제' : '   Financial Asset Deduction'} value={calc.financialDeduction / 10000} indent />
              </div>

              <LabelValue label={locale === 'ko' ? '④ 과세표준' : '④ Tax Base'} value={calc.taxBase / 10000} highlight />
            </div>
          </div>

          {/* Progressive tax breakdown */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-emerald-800 mb-3">
              {locale === 'ko' ? '누진세율 적용' : 'Progressive Tax Rate Application'}
            </p>
            {calc.breakdown.length === 0 ? (
              <p className="text-sm text-slate-400">{locale === 'ko' ? '과세표준 0원' : 'Tax base: 0'}</p>
            ) : (
              <div className="space-y-1">
                {calc.breakdown.map((b, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-100">
                    <span className="text-slate-600">{locale === 'ko' ? b.bracket : b.bracket}</span>
                    <span className="font-bold text-slate-800">{fmt(b.tax / 10000)}만원</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex justify-between text-sm font-bold py-2 bg-emerald-50 rounded-xl px-3">
              <span className="text-emerald-800">{locale === 'ko' ? '⑤ 산출세액' : '⑤ Gross Tax'}</span>
              <span className="text-emerald-800">{fmt(calc.grossTax / 10000)}만원</span>
            </div>
          </div>

          {/* Final tax */}
          <div className="bg-emerald-100 border border-emerald-300 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-emerald-700">{locale === 'ko' ? '세액공제' : 'Tax Credits'}</span>
              <span className="text-sm font-bold text-emerald-700">
                -{fmt((s.priorTaxPaid + s.shortTermReRedux + s.giftTaxPaid))}만원
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-emerald-900">
                {locale === 'ko' ? '⑥ 최종 납부세액' : '⑥ Final Tax Payable'}
              </span>
              <span className="text-2xl font-bold text-emerald-900">
                {fmt(calc.finalTax / 10000)}만원
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">
            * 2024년 기준 개략 계산. 실제 신고는 세무사와 상담하세요.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InheritanceTaxCalculator;
