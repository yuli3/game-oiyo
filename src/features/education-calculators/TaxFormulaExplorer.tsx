import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';

// ── Types ─────────────────────────────────────────────────────────────────────

type TaxTab = 0 | 1 | 2 | 3 | 4 | 5;

// ── Shared input/display primitives ───────────────────────────────────────────

interface InputRowProps {
  label: string;
  sublabel?: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  readOnly?: boolean;
  highlight?: boolean;
  negative?: boolean;
}

const InputRow: React.FC<InputRowProps> = ({
  label, sublabel, value, onChange, unit = '만원',
  readOnly = false, highlight = false, negative = false,
}) => (
  <div className={`flex items-center gap-2 py-2 border-b border-emerald-50 ${highlight ? 'bg-emerald-50 rounded-xl px-2 -mx-2' : ''}`}>
    <div className="flex-1 min-w-0">
      <span className="text-xs font-bold text-slate-700">{negative && <span className="text-rose-500 mr-1">−</span>}{label}</span>
      {sublabel && <p className="text-[10px] text-slate-400 mt-0.5">{sublabel}</p>}
    </div>
    <div className="flex items-center gap-1 shrink-0">
      {readOnly ? (
        <span className={`w-28 text-right text-sm font-bold pr-1 ${highlight ? 'text-emerald-700' : 'text-slate-700'}`}>
          {value.toLocaleString()}
        </span>
      ) : (
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-28 text-right text-sm bg-white border border-emerald-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          aria-label={label}
        />
      )}
      <span className="text-[10px] text-slate-400 w-8">{unit}</span>
    </div>
  </div>
);

// Arrow divider between formula steps
const StepArrow: React.FC = () => (
  <div className="flex items-center justify-center my-1" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-emerald-400">
      <path d="M8 2v10M4 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

interface FormulaBoxProps {
  label: string;
  value: number;
  unit?: string;
  isResult?: boolean;
  note?: string;
}

const FormulaBox: React.FC<FormulaBoxProps> = ({ label, value, unit = '만원', isResult = false, note }) => (
  <div className={`rounded-xl px-4 py-2 border ${isResult ? 'bg-emerald-600 border-emerald-700' : 'bg-slate-50 border-slate-200'}`}>
    <div className="flex items-center justify-between">
      <span className={`text-xs font-bold ${isResult ? 'text-emerald-100' : 'text-slate-500'}`}>{label}</span>
      <span className={`text-sm font-bold tabular-nums ${isResult ? 'text-white' : 'text-slate-800'}`}>
        {value.toLocaleString()} {unit}
      </span>
    </div>
    {note && <p className={`text-[10px] mt-0.5 ${isResult ? 'text-emerald-200' : 'text-slate-400'}`}>{note}</p>}
  </div>
);

// Tax rate table display
interface TaxBracketRowProps { range: string; rate: string; deduction: string; active: boolean; }
const TaxBracketRow: React.FC<TaxBracketRowProps> = ({ range, rate, deduction, active }) => (
  <tr className={active ? 'bg-emerald-50 font-bold' : ''}>
    <td className="text-xs px-2 py-1.5 border-b border-slate-100">{range}</td>
    <td className="text-xs px-2 py-1.5 border-b border-slate-100 text-center font-bold text-emerald-700">{rate}</td>
    <td className="text-xs px-2 py-1.5 border-b border-slate-100 text-right">{deduction}</td>
  </tr>
);

interface TabButtonProps { active: boolean; onClick: () => void; children: React.ReactNode; }
const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
      active ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
    }`}
    aria-selected={active}
    role="tab"
  >
    {children}
  </button>
);

const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mt-4 mb-2">{text}</p>
);

// ── Income Tax (소득세) ────────────────────────────────────────────────────────

const incomeTaxBrackets = [
  { max: 1400,   rate: 0.06, deduction: 0 },
  { max: 5000,   rate: 0.15, deduction: 126 },
  { max: 8800,   rate: 0.24, deduction: 576 },
  { max: 15000,  rate: 0.35, deduction: 1544 },
  { max: 30000,  rate: 0.38, deduction: 1994 },
  { max: 50000,  rate: 0.40, deduction: 2594 },
  { max: 100000, rate: 0.42, deduction: 3594 },
  { max: Infinity, rate: 0.45, deduction: 6594 },
];

function calcIncomeTax(taxableIncome: number): { tax: number; rate: number; deduction: number; bracketIdx: number } {
  if (taxableIncome <= 0) return { tax: 0, rate: 0.06, deduction: 0, bracketIdx: 0 };
  const idx = incomeTaxBrackets.findIndex(b => taxableIncome <= b.max);
  const safeIdx = idx === -1 ? incomeTaxBrackets.length - 1 : idx;
  const { rate, deduction } = incomeTaxBrackets[safeIdx];
  return { tax: Math.max(taxableIncome * rate - deduction, 0), rate, deduction, bracketIdx: safeIdx };
}

const IncomeTaxTab: React.FC = () => {
  const [grossIncome, setGrossIncome] = useState(5000);
  const [laborDeduction, setLaborDeduction] = useState(1000);
  const [personalDeduction, setPersonalDeduction] = useState(500);
  const [taxCredit, setTaxCredit] = useState(100);

  const taxableIncome = Math.max(grossIncome - laborDeduction, 0);
  const taxBase = Math.max(taxableIncome - personalDeduction, 0);
  const { tax: calculatedTax, rate, deduction, bracketIdx } = useMemo(() => calcIncomeTax(taxBase), [taxBase]);
  const finalTax = Math.max(calculatedTax - taxCredit, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <SectionLabel text="입력값" />
        <InputRow label="총수입금액 (근로·사업소득)" value={grossIncome} onChange={setGrossIncome} />
        <InputRow label="필요경비 또는 근로소득공제" value={laborDeduction} onChange={setLaborDeduction} negative />
        <InputRow label="소득공제 (인적·특별공제)" value={personalDeduction} onChange={setPersonalDeduction} negative />
        <InputRow label="세액공제" value={taxCredit} onChange={setTaxCredit} negative />

        <SectionLabel text="세율 구간 (2024년 기준)" />
        <table className="w-full text-xs border-collapse border border-slate-200 rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-slate-100">
              <th className="text-left px-2 py-1.5 text-[10px] font-bold text-slate-500">과세표준 구간</th>
              <th className="text-center px-2 py-1.5 text-[10px] font-bold text-slate-500">세율</th>
              <th className="text-right px-2 py-1.5 text-[10px] font-bold text-slate-500">누진공제</th>
            </tr>
          </thead>
          <tbody>
            {[
              { range: '1,400만 이하', rate: '6%', deduction: '0' },
              { range: '1,400만 ~ 5,000만', rate: '15%', deduction: '126만' },
              { range: '5,000만 ~ 8,800만', rate: '24%', deduction: '576만' },
              { range: '8,800만 ~ 1.5억', rate: '35%', deduction: '1,544만' },
              { range: '1.5억 ~ 3억', rate: '38%', deduction: '1,994만' },
              { range: '3억 ~ 5억', rate: '40%', deduction: '2,594만' },
              { range: '5억 ~ 10억', rate: '42%', deduction: '3,594만' },
              { range: '10억 초과', rate: '45%', deduction: '6,594만' },
            ].map((row, i) => (
              <TaxBracketRow key={i} range={row.range} rate={row.rate} deduction={row.deduction} active={i === bracketIdx} />
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <SectionLabel text="계산 단계" />
        <FormulaBox label="총수입금액" value={grossIncome} />
        <StepArrow />
        <FormulaBox label="소득금액 (공제 후)" value={taxableIncome} note={`근로소득공제 ${laborDeduction.toLocaleString()}만원 차감`} />
        <StepArrow />
        <FormulaBox label="과세표준" value={taxBase} note={`소득공제 ${personalDeduction.toLocaleString()}만원 차감`} />
        <StepArrow />
        <FormulaBox label={`산출세액 (${(rate * 100).toFixed(0)}% - 누진공제 ${deduction.toLocaleString()}만)`} value={Math.round(calculatedTax)} note="과세표준 × 세율 − 누진공제액" />
        <StepArrow />
        <FormulaBox label="결정세액 (최종 납부세액)" value={Math.round(finalTax)} isResult note={`세액공제 ${taxCredit.toLocaleString()}만원 차감`} />

        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <p className="text-[10px] font-bold text-amber-700 mb-1">주의사항</p>
          <ul className="text-[10px] text-amber-600 space-y-0.5 list-disc list-inside">
            <li>지방소득세(결정세액의 10%)는 별도 납부</li>
            <li>원천징수된 세금은 기납부세액으로 공제</li>
            <li>종합소득세 확정신고: 매년 5월 말</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ── Corporate Tax (법인세) ────────────────────────────────────────────────────

const corpTaxBrackets = [
  { max: 20000,   rate: 0.09, deduction: 0 },
  { max: 2000000, rate: 0.19, deduction: 2000 },
  { max: 30000000, rate: 0.21, deduction: 42000 },
  { max: Infinity, rate: 0.24, deduction: 942000 },
];

function calcCorpTax(base: number): { tax: number; rate: number; bracketIdx: number } {
  if (base <= 0) return { tax: 0, rate: 0.09, bracketIdx: 0 };
  const idx = corpTaxBrackets.findIndex(b => base <= b.max);
  const safeIdx = idx === -1 ? corpTaxBrackets.length - 1 : idx;
  const { rate, deduction } = corpTaxBrackets[safeIdx];
  return { tax: Math.max(base * rate - deduction, 0), rate, bracketIdx: safeIdx };
}

const CorporateTaxTab: React.FC = () => {
  const [netIncome, setNetIncome] = useState(50000);
  const [taxAdjustment, setTaxAdjustment] = useState(5000);
  const [lossCarryforward, setLossCarryforward] = useState(0);
  const [taxCreditExemption, setTaxCreditExemption] = useState(2000);

  const annualIncome = netIncome + taxAdjustment;
  const taxBase = Math.max(annualIncome - lossCarryforward, 0);
  const { tax: calculatedTax, rate, bracketIdx } = useMemo(() => calcCorpTax(taxBase), [taxBase]);
  const finalTax = Math.max(calculatedTax - taxCreditExemption, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <SectionLabel text="입력값" />
        <InputRow label="당기순이익 (결산서 기준)" value={netIncome} onChange={setNetIncome} />
        <InputRow label="세무조정 (+는 가산, -는 차감)" value={taxAdjustment} onChange={setTaxAdjustment} sublabel="손금불산입 + 익금산입 등" />
        <InputRow label="이월결손금" value={lossCarryforward} onChange={setLossCarryforward} negative sublabel="최대 10년간 공제 가능" />
        <InputRow label="세액공제·감면" value={taxCreditExemption} onChange={setTaxCreditExemption} negative />

        <SectionLabel text="법인세율 구간" />
        <table className="w-full text-xs border-collapse border border-slate-200 rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-slate-100">
              <th className="text-left px-2 py-1.5 text-[10px] font-bold text-slate-500">과세표준 구간</th>
              <th className="text-center px-2 py-1.5 text-[10px] font-bold text-slate-500">세율</th>
            </tr>
          </thead>
          <tbody>
            {[
              { range: '2억 이하', rate: '9%' },
              { range: '2억 ~ 200억', rate: '19%' },
              { range: '200억 ~ 3,000억', rate: '21%' },
              { range: '3,000억 초과', rate: '24%' },
            ].map((row, i) => (
              <tr key={i} className={i === bracketIdx ? 'bg-emerald-50 font-bold' : ''}>
                <td className="text-xs px-2 py-1.5 border-b border-slate-100">{row.range}</td>
                <td className="text-xs px-2 py-1.5 border-b border-slate-100 text-center font-bold text-emerald-700">{row.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <SectionLabel text="계산 단계" />
        <FormulaBox label="당기순이익" value={netIncome} />
        <StepArrow />
        <FormulaBox label="각 사업연도 소득 (세무조정 후)" value={annualIncome} note="결산서 순이익 + 세무조정" />
        <StepArrow />
        <FormulaBox label="과세표준 (이월결손금 차감)" value={taxBase} note={`이월결손금 ${lossCarryforward.toLocaleString()}만원 공제`} />
        <StepArrow />
        <FormulaBox label={`산출세액 (세율 ${(rate * 100).toFixed(0)}%)`} value={Math.round(calculatedTax)} />
        <StepArrow />
        <FormulaBox label="결정세액" value={Math.round(finalTax)} isResult note={`세액공제·감면 ${taxCreditExemption.toLocaleString()}만원`} />

        <div className="mt-4 rounded-xl bg-sky-50 border border-sky-200 p-3">
          <p className="text-[10px] font-bold text-sky-700 mb-1">참고사항</p>
          <ul className="text-[10px] text-sky-600 space-y-0.5 list-disc list-inside">
            <li>법인세 신고: 사업연도 종료 후 3개월 내</li>
            <li>중간예납: 사업연도 개시 후 6개월 내</li>
            <li>지방소득세 별도 (법인세의 10%)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ── VAT (부가가치세) ──────────────────────────────────────────────────────────

const VATTab: React.FC = () => {
  const [taxBase, setTaxBase] = useState(100000);
  const [inputVAT, setInputVAT] = useState(7000);
  const [additionalDeduction, setAdditionalDeduction] = useState(0);
  const [isSimplified, setIsSimplified] = useState(false);
  const [simplifiedRate, setSimplifiedRate] = useState(15);

  const outputVAT = taxBase * 0.10;
  const vatPayable = isSimplified
    ? Math.max(taxBase * (simplifiedRate / 1000), 0)
    : Math.max(outputVAT - inputVAT - additionalDeduction, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <SectionLabel text="과세 유형" />
        <div className="flex gap-2 mb-4">
          {[false, true].map(simplified => (
            <button
              key={String(simplified)}
              onClick={() => setIsSimplified(simplified)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isSimplified === simplified
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
              }`}
              aria-pressed={isSimplified === simplified}
            >
              {simplified ? '간이과세자' : '일반과세자'}
            </button>
          ))}
        </div>

        <InputRow label="과세표준 (공급가액 합계)" value={taxBase} onChange={setTaxBase} />
        {!isSimplified ? (
          <>
            <InputRow label="매입세액 공제" value={inputVAT} onChange={setInputVAT} negative sublabel="세금계산서 수취분" />
            <InputRow label="기타 공제 (신용카드 등)" value={additionalDeduction} onChange={setAdditionalDeduction} negative />
          </>
        ) : (
          <InputRow label="업종별 부가가치율 (‰)" value={simplifiedRate} onChange={setSimplifiedRate} unit="‰" sublabel="업종마다 다름 (예: 소매 15‰)" />
        )}

        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[10px] font-bold text-slate-500 mb-1">일반과세자 vs 간이과세자</p>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-slate-400 font-bold">
                <th className="text-left pb-1">구분</th>
                <th className="text-center pb-1">일반과세자</th>
                <th className="text-center pb-1">간이과세자</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['연매출 기준', '8,000만원 이상', '8,000만원 미만'],
                ['세율', '10%', '업종별 부가가치율'],
                ['세금계산서', '발행 가능', '영수증만'],
                ['매입세액', '전액 공제', '제한적 공제'],
              ].map(([item, gen, simp]) => (
                <tr key={item}>
                  <td className="py-0.5 text-slate-500">{item}</td>
                  <td className="py-0.5 text-center text-emerald-700">{gen}</td>
                  <td className="py-0.5 text-center text-sky-700">{simp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <SectionLabel text="계산 단계" />
        <FormulaBox label="과세표준 (공급가액)" value={taxBase} />
        <StepArrow />
        <FormulaBox label="매출세액 (× 10%)" value={Math.round(outputVAT)} note="공급가액의 10%" />
        {!isSimplified && (
          <>
            <StepArrow />
            <FormulaBox label={`매입세액 공제 (${inputVAT.toLocaleString()}만)`} value={Math.round(outputVAT - inputVAT)} note="매출세액 − 매입세액" />
          </>
        )}
        <StepArrow />
        <FormulaBox label="납부세액" value={Math.round(vatPayable)} isResult
          note={isSimplified ? `간이: 공급가액 × ${simplifiedRate}‰` : '매출세액 − 매입세액 − 공제'} />

        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <p className="text-[10px] font-bold text-amber-700 mb-1">신고 일정</p>
          <ul className="text-[10px] text-amber-600 space-y-0.5 list-disc list-inside">
            <li>1기 확정: 7월 25일까지 (1월~6월)</li>
            <li>2기 확정: 1월 25일까지 (7월~12월)</li>
            <li>간이과세자: 연 1회 (1월 25일)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ── Capital Gains Tax (양도소득세) ────────────────────────────────────────────

const CapitalGainsTaxTab: React.FC = () => {
  const [salePrice, setSalePrice] = useState(80000);
  const [acquisitionPrice, setAcquisitionPrice] = useState(50000);
  const [necessaryExpenses, setNecessaryExpenses] = useState(1000);
  const [holdingYears, setHoldingYears] = useState(4);
  const [isAdjustedArea, setIsAdjustedArea] = useState(false);

  const capitalGain = Math.max(salePrice - acquisitionPrice - necessaryExpenses, 0);

  // 장기보유특별공제 (3년이상, 2년 이상 보유, 비조정지역)
  const longTermDeductionRate = !isAdjustedArea && holdingYears >= 3
    ? Math.min((holdingYears - 2) * 0.02, 0.30)
    : 0;
  const longTermDeduction = Math.round(capitalGain * longTermDeductionRate);

  const basicDeduction = 250; // 기본공제 250만원
  const taxBase = Math.max(capitalGain - longTermDeduction - basicDeduction, 0);

  // 세율 결정
  let taxRate: number;
  let taxRateLabel: string;
  if (holdingYears < 1) {
    taxRate = 0.70; taxRateLabel = '70% (1년 미만)';
  } else if (holdingYears < 2) {
    taxRate = 0.60; taxRateLabel = '60% (1~2년)';
  } else {
    // 일반세율 (누진세)
    const { rate } = calcIncomeTax(taxBase);
    taxRate = rate;
    taxRateLabel = `${(rate * 100).toFixed(0)}% (일반세율 적용)`;
    if (isAdjustedArea && holdingYears < 2) {
      taxRate = 0.60; taxRateLabel = '60% (조정지역 1~2년)';
    }
  }

  const tax = Math.round(taxBase * taxRate);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <SectionLabel text="입력값" />
        <InputRow label="양도가액 (매도가)" value={salePrice} onChange={setSalePrice} />
        <InputRow label="취득가액 (매수가)" value={acquisitionPrice} onChange={setAcquisitionPrice} negative />
        <InputRow label="필요경비 (취득·양도 비용)" value={necessaryExpenses} onChange={setNecessaryExpenses} negative />
        <InputRow label="보유 기간 (년)" value={holdingYears} onChange={setHoldingYears} unit="년" />

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setIsAdjustedArea(false)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${!isAdjustedArea ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}
            aria-pressed={!isAdjustedArea}
          >
            비조정지역
          </button>
          <button
            onClick={() => setIsAdjustedArea(true)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${isAdjustedArea ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'}`}
            aria-pressed={isAdjustedArea}
          >
            조정대상지역
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[10px] font-bold text-slate-500 mb-1">장기보유특별공제율 (비조정지역)</p>
          <p className="text-[10px] text-slate-500">3년 이상 보유 시 (보유연수−2) × 2%, 최대 30%</p>
          <p className="text-[10px] text-emerald-700 font-bold mt-1">현재 공제율: {(longTermDeductionRate * 100).toFixed(0)}%</p>
        </div>
      </div>

      <div>
        <SectionLabel text="계산 단계" />
        <FormulaBox label="양도차익" value={capitalGain} note={`${salePrice.toLocaleString()} − ${acquisitionPrice.toLocaleString()} − ${necessaryExpenses.toLocaleString()}만`} />
        <StepArrow />
        <FormulaBox label={`장기보유특별공제 (−${(longTermDeductionRate * 100).toFixed(0)}%)`} value={capitalGain - longTermDeduction} note={`공제액: ${longTermDeduction.toLocaleString()}만원`} />
        <StepArrow />
        <FormulaBox label="기본공제 250만원 차감 후 과세표준" value={taxBase} />
        <StepArrow />
        <FormulaBox label={`납부세액 (세율: ${taxRateLabel})`} value={tax} isResult />

        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <p className="text-[10px] font-bold text-amber-700 mb-1">주의사항</p>
          <ul className="text-[10px] text-amber-600 space-y-0.5 list-disc list-inside">
            <li>1세대 1주택 비과세: 2년 이상 보유 (시세 12억 이하)</li>
            <li>지방소득세 추가 10%</li>
            <li>양도일이 속한 달의 말일부터 2개월 내 신고</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ── Inheritance Tax (상속세) ──────────────────────────────────────────────────

const inheritanceTaxBrackets = [
  { max: 10000, rate: 0.10, deduction: 0 },
  { max: 50000, rate: 0.20, deduction: 1000 },
  { max: 100000, rate: 0.30, deduction: 6000 },
  { max: 300000, rate: 0.40, deduction: 16000 },
  { max: Infinity, rate: 0.50, deduction: 46000 },
];

function calcInheritanceTax(base: number) {
  if (base <= 0) return { tax: 0, rate: 0.10, bracketIdx: 0 };
  const idx = inheritanceTaxBrackets.findIndex(b => base <= b.max);
  const safeIdx = idx === -1 ? inheritanceTaxBrackets.length - 1 : idx;
  const { rate, deduction } = inheritanceTaxBrackets[safeIdx];
  return { tax: Math.max(base * rate - deduction, 0), rate, bracketIdx: safeIdx };
}

const InheritanceTaxTab: React.FC = () => {
  const [totalEstate, setTotalEstate] = useState(200000);
  const [taxExemptLiabilities, setTaxExemptLiabilities] = useState(10000);
  const [hasSpouse, setHasSpouse] = useState(true);
  const [spouseDeduction, setSpouseDeduction] = useState(100000);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [taxCredit, setTaxCredit] = useState(1000);

  const lumpSumDeduction = 50000; // 일괄공제 5억
  const basicDeduction = 20000; // 기초공제 2억
  const effectiveSpouseDeduction = hasSpouse ? spouseDeduction : 0;
  const totalDeduction = Math.max(lumpSumDeduction, basicDeduction + effectiveSpouseDeduction) + otherDeductions;

  const taxableEstate = Math.max(totalEstate - taxExemptLiabilities, 0);
  const taxBase = Math.max(taxableEstate - totalDeduction, 0);
  const { tax: calculatedTax, rate } = useMemo(() => calcInheritanceTax(taxBase), [taxBase]);
  const finalTax = Math.max(calculatedTax - taxCredit, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <SectionLabel text="입력값" />
        <InputRow label="총 상속재산가액" value={totalEstate} onChange={setTotalEstate} />
        <InputRow label="비과세·채무·공과금" value={taxExemptLiabilities} onChange={setTaxExemptLiabilities} negative />
        <div className="flex items-center gap-2 py-2 border-b border-emerald-50">
          <span className="flex-1 text-xs font-bold text-slate-700">배우자 공제 적용</span>
          <button
            onClick={() => setHasSpouse(!hasSpouse)}
            className={`px-3 py-1 text-xs font-bold rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${hasSpouse ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
            aria-pressed={hasSpouse}
          >
            {hasSpouse ? '적용' : '미적용'}
          </button>
        </div>
        {hasSpouse && <InputRow label="배우자 공제액" value={spouseDeduction} onChange={setSpouseDeduction} sublabel="실제 취득재산 한도, 최대 30억" />}
        <InputRow label="기타 공제" value={otherDeductions} onChange={setOtherDeductions} negative />
        <InputRow label="세액공제" value={taxCredit} onChange={setTaxCredit} negative />
      </div>

      <div>
        <SectionLabel text="계산 단계" />
        <FormulaBox label="총 상속재산가액" value={totalEstate} />
        <StepArrow />
        <FormulaBox label="상속세 과세가액" value={taxableEstate} note="비과세·채무 차감 후" />
        <StepArrow />
        <FormulaBox label={`과세표준 (공제 적용)`} value={taxBase}
          note={`일괄공제 5억 또는 기초+배우자 공제 적용`} />
        <StepArrow />
        <FormulaBox label={`산출세액 (세율 ${(rate * 100).toFixed(0)}%)`} value={Math.round(calculatedTax)} />
        <StepArrow />
        <FormulaBox label="납부세액" value={Math.round(finalTax)} isResult />

        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[10px] font-bold text-slate-500 mb-1">상속세 세율 구간</p>
          {[
            ['1억 이하', '10%'], ['1억~5억', '20%'], ['5억~10억', '30%'],
            ['10억~30억', '40%'], ['30억 초과', '50%'],
          ].map(([range, rate]) => (
            <div key={range} className="flex justify-between text-[10px] py-0.5">
              <span className="text-slate-500">{range}</span>
              <span className="font-bold text-emerald-700">{rate}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Gift Tax (증여세) ────────────────────────────────────────────────────────

const GiftTaxTab: React.FC = () => {
  const [giftAmount, setGiftAmount] = useState(80000);
  const [relationship, setRelationship] = useState<'spouse' | 'adult_child' | 'minor_child' | 'other'>('adult_child');
  const [taxCredit, setTaxCredit] = useState(300);

  const deductionMap: Record<string, { amount: number; label: string }> = {
    spouse:      { amount: 60000, label: '배우자 공제 6억' },
    adult_child: { amount: 5000,  label: '직계존비속(성인) 5천만' },
    minor_child: { amount: 2000,  label: '직계존비속(미성년) 2천만' },
    other:       { amount: 1000,  label: '기타 친족 1천만' },
  };

  const { amount: deductionAmount, label: deductionLabel } = deductionMap[relationship];
  const taxBase = Math.max(giftAmount - deductionAmount, 0);
  const { tax: calculatedTax, rate } = useMemo(() => calcInheritanceTax(taxBase), [taxBase]);
  const finalTax = Math.max(calculatedTax - taxCredit, 0);

  const relationshipOptions: Array<{ value: string; label: string }> = [
    { value: 'spouse', label: '배우자' },
    { value: 'adult_child', label: '직계(성인)' },
    { value: 'minor_child', label: '직계(미성년)' },
    { value: 'other', label: '기타 친족' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <SectionLabel text="입력값" />
        <InputRow label="증여재산가액" value={giftAmount} onChange={setGiftAmount} />

        <SectionLabel text="수증자와 관계" />
        <div className="grid grid-cols-2 gap-2 mb-3">
          {relationshipOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setRelationship(opt.value as typeof relationship)}
              className={`py-1.5 text-xs font-bold rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                relationship === opt.value
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
              }`}
              aria-pressed={relationship === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <InputRow label="세액공제" value={taxCredit} onChange={setTaxCredit} negative />

        <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
          <p className="text-[10px] font-bold text-emerald-700 mb-1">증여재산 공제 한도 (10년 통산)</p>
          {Object.entries(deductionMap).map(([key, val]) => (
            <div key={key} className={`flex justify-between text-[10px] py-0.5 ${relationship === key ? 'font-bold text-emerald-700' : 'text-slate-500'}`}>
              <span>{val.label.split(' ')[0]}</span>
              <span>{val.label.split(' ')[1]}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel text="계산 단계" />
        <FormulaBox label="증여재산가액" value={giftAmount} />
        <StepArrow />
        <FormulaBox label={`증여재산공제 (${deductionLabel})`} value={giftAmount - deductionAmount} note={`10년간 ${deductionAmount.toLocaleString()}만원까지 공제`} />
        <StepArrow />
        <FormulaBox label="과세표준" value={taxBase} />
        <StepArrow />
        <FormulaBox label={`산출세액 (세율 ${(rate * 100).toFixed(0)}%)`} value={Math.round(calculatedTax)} />
        <StepArrow />
        <FormulaBox label="납부세액" value={Math.round(finalTax)} isResult />

        <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <p className="text-[10px] font-bold text-amber-700 mb-1">절세 포인트</p>
          <ul className="text-[10px] text-amber-600 space-y-0.5 list-disc list-inside">
            <li>공제 한도는 10년간 누계 — 분산 증여가 유리</li>
            <li>신고기한: 증여받은 달 말일부터 3개월</li>
            <li>사전증여는 상속세 합산 과세(10년) 주의</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const TAB_LABELS: Array<{ short: string; full: string }> = [
  { short: '소득세', full: '소득세 (종합)' },
  { short: '법인세', full: '법인세' },
  { short: '부가세', full: '부가가치세' },
  { short: '양도세', full: '양도소득세' },
  { short: '상속세', full: '상속세' },
  { short: '증여세', full: '증여세' },
];

export const TaxFormulaExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TaxTab>(0);

  return (
    <Card className="bg-white border border-emerald-100 shadow-xl rounded-2xl overflow-hidden mt-8">
      <div className="bg-emerald-700 px-6 py-5">
        <h3 className="text-lg font-bold text-white">세법 계산 산식 인터랙티브</h3>
        <p className="text-xs text-emerald-200 mt-1">6대 세목 공식을 직접 입력하며 계산 구조를 확인하세요</p>
      </div>

      <div className="flex gap-1.5 flex-wrap px-6 pt-4 pb-0" role="tablist" aria-label="세목 탭">
        {TAB_LABELS.map((tab, i) => (
          <TabButton key={tab.short} active={activeTab === i} onClick={() => setActiveTab(i as TaxTab)}>
            {tab.short}
          </TabButton>
        ))}
      </div>

      <div className="px-6 pb-6 pt-4">
        <h4 className="text-sm font-bold text-slate-700 mb-1">{TAB_LABELS[activeTab].full} 계산 구조</h4>
        <p className="text-[10px] text-slate-400 mb-4">금액 단위: 만원 / 값을 수정하면 결과가 즉시 업데이트됩니다</p>

        {activeTab === 0 && <IncomeTaxTab />}
        {activeTab === 1 && <CorporateTaxTab />}
        {activeTab === 2 && <VATTab />}
        {activeTab === 3 && <CapitalGainsTaxTab />}
        {activeTab === 4 && <InheritanceTaxTab />}
        {activeTab === 5 && <GiftTaxTab />}
      </div>
    </Card>
  );
};
