import React, { useState, useMemo } from 'react';

function fmt(n: number) {
  return Math.round(n).toLocaleString('ko-KR');
}

interface DeductionItem {
  id: string;
  label: string;
  sublabel: string;
  max: number;
  rate: number; // deduction rate (0–1) applied to the entered amount
  value: string;
}

const INITIAL_DEDUCTIONS: DeductionItem[] = [
  { id: 'insurance', label: '국민연금 보험료', sublabel: '연간 납부액', max: 0, rate: 1, value: '' },
  { id: 'health', label: '건강보험료', sublabel: '연간 납부액 (요양보험 포함)', max: 0, rate: 1, value: '' },
  { id: 'employment', label: '고용보험료', sublabel: '연간 납부액', max: 0, rate: 1, value: '' },
  { id: 'credit', label: '신용카드 등 사용액', sublabel: '연간 총액 (소득공제 한도 내 15–40% 적용)', max: 3000000, rate: 0.15, value: '' },
  { id: 'medical', label: '의료비 세액공제', sublabel: '본인·부양가족 의료비 (총급여 3% 초과분)', max: 7000000, rate: 0.15, value: '' },
  { id: 'education', label: '교육비 세액공제', sublabel: '본인·부양가족 교육비 (15% 세액공제)', max: 9000000, rate: 0.15, value: '' },
  { id: 'donation', label: '기부금 세액공제', sublabel: '법정·지정 기부금 (15–30% 세액공제)', max: 0, rate: 0.15, value: '' },
  { id: 'pension_savings', label: '연금저축·IRP 세액공제', sublabel: '연간 납입액 (400만~900만 원 한도, 13–16.5% 공제)', max: 9000000, rate: 0.165, value: '' },
];

// 소득세 구간 (2024년 기준, 단위: 원)
const TAX_BRACKETS = [
  { limit: 14000000, rate: 0.06, prev: 0, prevTax: 0 },
  { limit: 50000000, rate: 0.15, prev: 14000000, prevTax: 840000 },
  { limit: 88000000, rate: 0.24, prev: 50000000, prevTax: 6240000 },
  { limit: 150000000, rate: 0.35, prev: 88000000, prevTax: 15360000 },
  { limit: 300000000, rate: 0.38, prev: 150000000, prevTax: 37060000 },
  { limit: 500000000, rate: 0.40, prev: 300000000, prevTax: 94060000 },
  { limit: 1000000000, rate: 0.42, prev: 500000000, prevTax: 174060000 },
  { limit: Infinity, rate: 0.45, prev: 1000000000, prevTax: 384060000 },
];

function calcIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  for (const b of TAX_BRACKETS) {
    if (taxableIncome <= b.limit) {
      return b.prevTax + (taxableIncome - b.prev) * b.rate;
    }
  }
  return 0;
}

// 근로소득공제 (소득세법 제47조)
function earnedIncomeDeduction(salary: number): number {
  if (salary <= 5000000) return salary * 0.7;
  if (salary <= 15000000) return 3500000 + (salary - 5000000) * 0.4;
  if (salary <= 45000000) return 7500000 + (salary - 15000000) * 0.15;
  if (salary <= 100000000) return 12000000 + (salary - 45000000) * 0.05;
  return 14750000; // 최대 한도
}

// 기본공제 본인 150만원 + 부양가족 1인당 150만원
function basicDeduction(dependents: number): number {
  return 1500000 * (1 + dependents);
}

export default function YearEndTaxCalculator() {
  const [salary, setSalary] = useState('');
  const [salaryDisplay, setSalaryDisplay] = useState('');
  const [paidTax, setPaidTax] = useState('');
  const [paidTaxDisplay, setPaidTaxDisplay] = useState('');
  const [dependents, setDependents] = useState(0);
  const [deductions, setDeductions] = useState(INITIAL_DEDUCTIONS);

  const handleSalary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    setSalary(raw);
    const num = parseInt(raw) || 0;
    setSalaryDisplay(num > 0 ? num.toLocaleString('ko-KR') : raw);
  };

  const handlePaidTax = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
    setPaidTax(raw);
    const num = parseInt(raw) || 0;
    setPaidTaxDisplay(num > 0 ? num.toLocaleString('ko-KR') : raw);
  };

  const handleDeduction = (id: string, raw: string) => {
    const cleaned = raw.replace(/,/g, '').replace(/[^0-9]/g, '');
    setDeductions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, value: cleaned } : d))
    );
  };

  const result = useMemo(() => {
    const annualSalary = parseInt(salary) || 0;
    if (annualSalary === 0) return null;

    // 1. 근로소득공제
    const earnedDeduction = earnedIncomeDeduction(annualSalary);
    // 2. 총급여 - 근로소득공제 = 근로소득금액
    const earnedIncome = annualSalary - earnedDeduction;

    // 3. 소득공제 합산 (국민연금·건강보험·고용보험·신용카드)
    const insuranceDeduction =
      (parseInt(deductions.find(d => d.id === 'insurance')?.value || '0') || 0) +
      (parseInt(deductions.find(d => d.id === 'health')?.value || '0') || 0) +
      (parseInt(deductions.find(d => d.id === 'employment')?.value || '0') || 0);

    const creditVal = parseInt(deductions.find(d => d.id === 'credit')?.value || '0') || 0;
    const creditDeduction = Math.min(creditVal * 0.15, 3000000);

    const personalDeduction = basicDeduction(dependents);

    const totalIncomeDeduction = earnedDeduction + insuranceDeduction + creditDeduction + personalDeduction;

    // 4. 과세표준
    const taxableIncome = Math.max(0, annualSalary - totalIncomeDeduction);

    // 5. 산출세액
    const calculatedTax = calcIncomeTax(taxableIncome);

    // 6. 세액공제 합산
    const medicalVal = parseInt(deductions.find(d => d.id === 'medical')?.value || '0') || 0;
    const educationVal = parseInt(deductions.find(d => d.id === 'education')?.value || '0') || 0;
    const donationVal = parseInt(deductions.find(d => d.id === 'donation')?.value || '0') || 0;
    const pensionVal = parseInt(deductions.find(d => d.id === 'pension_savings')?.value || '0') || 0;

    const medicalDeduction = Math.min(Math.max(0, medicalVal - annualSalary * 0.03) * 0.15, 7000000 * 0.15);
    const educationDeduction = Math.min(educationVal * 0.15, 9000000 * 0.15);
    const donationDeduction = Math.min(donationVal * 0.15, calculatedTax);
    const pensionDeduction = Math.min(pensionVal * 0.165, 9000000 * 0.165);

    // 근로소득세액공제 (산출세액 130만 원 이하: 55%, 초과분 30%)
    const earnedTaxCredit = calculatedTax <= 1300000
      ? calculatedTax * 0.55
      : 715000 + (calculatedTax - 1300000) * 0.3;
    const cappedEarnedTaxCredit = Math.min(earnedTaxCredit, 740000);

    const totalTaxCredit = cappedEarnedTaxCredit + medicalDeduction + educationDeduction + donationDeduction + pensionDeduction;

    // 7. 결정세액 (지방소득세 10% 별도)
    const finalTax = Math.max(0, calculatedTax - totalTaxCredit);
    const localTax = finalTax * 0.1;
    const totalFinalTax = finalTax + localTax;

    // 8. 환급 또는 추가 납부
    const alreadyPaid = parseInt(paidTax) || 0;
    const refundOrPay = alreadyPaid - totalFinalTax;

    return {
      annualSalary,
      earnedDeduction,
      earnedIncome,
      totalIncomeDeduction,
      taxableIncome,
      calculatedTax,
      totalTaxCredit,
      finalTax,
      localTax,
      totalFinalTax,
      alreadyPaid,
      refundOrPay,
    };
  }, [salary, paidTax, dependents, deductions]);

  return (
    <div className="not-prose my-8 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💸</span>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">연말정산 간이 계산기</h3>
            <p className="text-emerald-100 text-xs mt-0.5">
              예상 환급액·추가 납부액을 빠르게 추정 (실제와 차이 있을 수 있음)
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 기본 정보 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold mb-1.5">연간 총급여 (원)</label>
            <input
              type="text"
              inputMode="numeric"
              value={salaryDisplay}
              onChange={handleSalary}
              placeholder="예: 50,000,000"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-right font-mono font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">기납부 세액 (원)</label>
            <input
              type="text"
              inputMode="numeric"
              value={paidTaxDisplay}
              onChange={handlePaidTax}
              placeholder="이미 납부한 소득세+지방세"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-right font-mono font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* 부양가족 */}
        <div>
          <label className="block text-sm font-semibold mb-2">부양가족 수 (본인 제외)</label>
          <div className="flex gap-2 flex-wrap">
            {[0, 1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setDependents(n)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  dependents === n
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-border text-muted-foreground hover:border-emerald-400'
                }`}
              >
                {n}명
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            배우자·자녀·부모 등 기본공제 대상 (1인당 연 150만 원 소득공제)
          </p>
        </div>

        {/* 주요 공제 항목 */}
        <div>
          <p className="text-sm font-semibold mb-3 text-foreground">주요 공제 항목 입력 (선택)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {deductions.map((d) => (
              <div key={d.id}>
                <label className="block text-xs font-semibold mb-1 text-foreground">{d.label}</label>
                <p className="text-xs text-muted-foreground mb-1">{d.sublabel}</p>
                <input
                  type="text"
                  inputMode="numeric"
                  value={d.value ? parseInt(d.value).toLocaleString('ko-KR') : ''}
                  onChange={(e) => handleDeduction(d.id, e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-right text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 결과 */}
        {result && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/40 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              계산 결과
            </div>
            <div className="divide-y divide-border/60">
              {[
                { label: '연간 총급여', value: fmt(result.annualSalary), unit: '원' },
                { label: '근로소득공제', value: `− ${fmt(result.earnedDeduction)}`, unit: '원', muted: true },
                { label: '소득공제 합계', value: `− ${fmt(result.totalIncomeDeduction - result.earnedDeduction)}`, unit: '원', muted: true },
                { label: '과세표준', value: fmt(result.taxableIncome), unit: '원', bold: true },
                { label: '산출세액', value: fmt(result.calculatedTax), unit: '원' },
                { label: '세액공제 합계', value: `− ${fmt(result.totalTaxCredit)}`, unit: '원', muted: true },
                { label: '결정세액 (지방세 포함)', value: fmt(result.totalFinalTax), unit: '원', bold: true },
                { label: '기납부세액', value: fmt(result.alreadyPaid), unit: '원', muted: true },
              ].map((row) => (
                <div key={row.label} className={`flex justify-between items-center px-5 py-3 ${row.bold ? 'bg-muted/20' : ''}`}>
                  <span className={`text-sm ${row.muted ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                    {row.label}
                  </span>
                  <span className={`font-mono text-sm ${row.bold ? 'font-bold' : ''}`}>
                    {row.value} {row.unit}
                  </span>
                </div>
              ))}
              {/* 환급/추가납부 */}
              <div className={`flex justify-between items-center px-5 py-4 ${
                result.refundOrPay >= 0
                  ? 'bg-emerald-50'
                  : 'bg-red-50'
              }`}>
                <span className={`font-bold text-base ${result.refundOrPay >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {result.refundOrPay >= 0 ? '예상 환급액' : '예상 추가 납부액'}
                </span>
                <span className={`font-mono font-extrabold text-xl ${result.refundOrPay >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {result.refundOrPay >= 0 ? '+' : ''}{fmt(result.refundOrPay)} 원
                </span>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          ※ 간이 계산 결과입니다. 실제 연말정산은 개인 상황에 따라 달라집니다.
          정확한 계산은 <a href="https://www.hometax.go.kr" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">국세청 홈택스</a>를 이용하세요.
        </p>
      </div>
    </div>
  );
}
