import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const YearEndSettlementCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: {
            title: "연말정산 환급 예측기",
            desc: "주요 공제 항목을 입력해 예상 환급액 또는 추가 납부 세액을 계산합니다.",
            grossSalary: "연봉 (원)",
            dependents: "부양가족 수 (본인 포함)",
            insurancePremium: "보험료 납부액 (연, 원)",
            creditCardTotal: "신용카드 사용액 (연, 원)",
            debitCardTotal: "체크카드·현금영수증 (연, 원)",
            pensionSavings: "연금저축·IRP 납입액 (연, 원)",
            medicalExpenses: "의료비 (연, 원)",
            alreadyWithheld: "이미 납부한 근로소득세 (연, 원)",
            calcBtn: "연말정산 계산",
            result: "예상 결과",
            totalIncomeTax: "산출 소득세",
            totalDeduction: "세액공제 합계",
            finalTax: "결정 세액",
            alreadyPaid: "기납부 세액",
            refund: "환급 예상액",
            additionalTax: "추가 납부 예상액",
            breakdown: "공제 내역",
            personalDeduction: "인적공제",
            insuranceDeduction: "보험료 세액공제 (12%)",
            creditCardDeduction: "신용카드 소득공제",
            pensionDeduction: "연금저축 세액공제",
            medicalDeduction: "의료비 세액공제",
            note: "* 간이 계산 기준이며 실제 연말정산 결과와 차이가 있을 수 있습니다. 국세청 홈택스를 통해 정확한 계산을 권장합니다.",
        },
        en: {
            title: "Year-End Tax Settlement Estimator",
            desc: "Enter key deduction items to estimate your expected tax refund or additional payment.",
            grossSalary: "Annual Gross Salary (KRW)",
            dependents: "Dependents (incl. yourself)",
            insurancePremium: "Insurance Premiums (annual, KRW)",
            creditCardTotal: "Credit Card Spending (annual, KRW)",
            debitCardTotal: "Debit Card / Cash Receipts (annual, KRW)",
            pensionSavings: "Pension Savings / IRP (annual, KRW)",
            medicalExpenses: "Medical Expenses (annual, KRW)",
            alreadyWithheld: "Withheld Income Tax (annual, KRW)",
            calcBtn: "Calculate Settlement",
            result: "Estimated Result",
            totalIncomeTax: "Calculated Income Tax",
            totalDeduction: "Total Tax Credits",
            finalTax: "Final Tax Due",
            alreadyPaid: "Already Withheld",
            refund: "Estimated Refund",
            additionalTax: "Additional Tax Due",
            breakdown: "Deduction Breakdown",
            personalDeduction: "Personal Deduction",
            insuranceDeduction: "Insurance Tax Credit (12%)",
            creditCardDeduction: "Credit Card Income Deduction",
            pensionDeduction: "Pension Savings Tax Credit",
            medicalDeduction: "Medical Expense Tax Credit",
            note: "* This is a simplified estimate. Actual results may vary. Use NTS Hometax for accurate calculations.",
        },
    }[locale === 'ko' ? 'ko' : 'en'];

    const [grossSalary, setGrossSalary] = useState(50000000);
    const [dependents, setDependents] = useState(1);
    const [insurancePremium, setInsurancePremium] = useState(1200000);
    const [creditCardTotal, setCreditCardTotal] = useState(10000000);
    const [debitCardTotal, setDebitCardTotal] = useState(5000000);
    const [pensionSavings, setPensionSavings] = useState(3000000);
    const [medicalExpenses, setMedicalExpenses] = useState(1000000);
    const [alreadyWithheld, setAlreadyWithheld] = useState(2000000);

    const fmt = (n: number) => Math.abs(Math.round(n)).toLocaleString('ko-KR');

    // Step 1: 근로소득공제
    const earnedIncomeDeduction = (() => {
        if (grossSalary <= 5000000) return grossSalary * 0.70;
        if (grossSalary <= 15000000) return 3500000 + (grossSalary - 5000000) * 0.40;
        if (grossSalary <= 45000000) return 7500000 + (grossSalary - 15000000) * 0.15;
        if (grossSalary <= 100000000) return 12000000 + (grossSalary - 45000000) * 0.05;
        return 14750000; // max
    })();

    // Step 2: 종합소득금액
    const totalIncome = Math.max(0, grossSalary - earnedIncomeDeduction);

    // Step 3: 인적공제 (150만원 × 인원)
    const personalDeductionAmt = dependents * 1500000;

    // Step 4: 과세표준
    const taxBase = Math.max(0, totalIncome - personalDeductionAmt);

    // Step 5: 산출세액 (누진)
    const calcTax = (base: number): number => {
        if (base <= 14000000) return base * 0.06;
        if (base <= 50000000) return 840000 + (base - 14000000) * 0.15;
        if (base <= 88000000) return 6240000 + (base - 50000000) * 0.24;
        if (base <= 150000000) return 15360000 + (base - 88000000) * 0.35;
        if (base <= 300000000) return 37060000 + (base - 150000000) * 0.38;
        return 94060000 + (base - 300000000) * 0.40;
    };
    const calculatedTax = calcTax(taxBase);

    // Step 6: 세액공제
    // 보험료 세액공제: 납입액 × 12% (한도 100만원)
    const insuranceCredit = Math.min(insurancePremium * 0.12, 1000000);

    // 신용카드 소득공제 → 세액공제로 단순화
    // 공제 대상: 총급여 25% 초과분, 신용카드 15%, 체크카드 30%
    const threshold = grossSalary * 0.25;
    const totalCardSpend = creditCardTotal + debitCardTotal;
    const overThreshold = Math.max(0, totalCardSpend - threshold);
    // Simplified: all excess at average rate (credit first)
    const creditCardOverThreshold = Math.max(0, creditCardTotal - Math.max(0, threshold - debitCardTotal));
    const debitCardOverThreshold = Math.min(debitCardTotal, overThreshold);
    const cardDeductionIncome = Math.min(
        creditCardOverThreshold * 0.15 + debitCardOverThreshold * 0.30,
        Math.min(grossSalary * 0.20, 3000000) // simplified limit
    );
    const cardCreditAtRate = calculatedTax > 0 ? Math.floor(cardDeductionIncome * (calculatedTax / Math.max(1, taxBase))) : 0;

    // 연금저축 세액공제: 13.2% (총급여 5500만원 이하) / 16.5% (이하 4000만원)
    const pensionRate = grossSalary <= 40000000 ? 0.165 : grossSalary <= 55000000 ? 0.165 : 0.132;
    const pensionCredit = Math.min(pensionSavings, 6000000) * pensionRate;

    // 의료비 세액공제: 총급여 3% 초과분 × 15%
    const medicalThreshold = grossSalary * 0.03;
    const medicalDeductible = Math.max(0, medicalExpenses - medicalThreshold);
    const medicalCredit = medicalDeductible * 0.15;

    const totalCredits = insuranceCredit + cardCreditAtRate + pensionCredit + medicalCredit;

    // Final tax
    const finalTax = Math.max(0, calculatedTax - totalCredits);

    // Refund or additional payment
    const diff = alreadyWithheld - finalTax;
    const isRefund = diff >= 0;

    const handleReset = () => {
        setGrossSalary(50000000);
        setDependents(1);
        setInsurancePremium(1200000);
        setCreditCardTotal(10000000);
        setDebitCardTotal(5000000);
        setPensionSavings(3000000);
        setMedicalExpenses(1000000);
        setAlreadyWithheld(2000000);
    };

    const inputClass = "w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-success/30";

    return (
        <GameContainer title={t.title} subtitle="Year-End Tax Settlement" onReset={handleReset}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.grossSalary}</label>
                        <input type="number" value={grossSalary} onChange={(e) => setGrossSalary(Math.max(0, Number(e.target.value)))} step={1000000} min={0} className={inputClass} aria-label={t.grossSalary} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.dependents}</label>
                        <input type="number" value={dependents} onChange={(e) => setDependents(Math.max(1, Math.min(10, Number(e.target.value))))} step={1} min={1} max={10} className={inputClass} aria-label={t.dependents} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.insurancePremium}</label>
                        <input type="number" value={insurancePremium} onChange={(e) => setInsurancePremium(Math.max(0, Number(e.target.value)))} step={100000} min={0} className={inputClass} aria-label={t.insurancePremium} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.medicalExpenses}</label>
                        <input type="number" value={medicalExpenses} onChange={(e) => setMedicalExpenses(Math.max(0, Number(e.target.value)))} step={100000} min={0} className={inputClass} aria-label={t.medicalExpenses} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.creditCardTotal}</label>
                        <input type="number" value={creditCardTotal} onChange={(e) => setCreditCardTotal(Math.max(0, Number(e.target.value)))} step={500000} min={0} className={inputClass} aria-label={t.creditCardTotal} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.debitCardTotal}</label>
                        <input type="number" value={debitCardTotal} onChange={(e) => setDebitCardTotal(Math.max(0, Number(e.target.value)))} step={500000} min={0} className={inputClass} aria-label={t.debitCardTotal} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.pensionSavings}</label>
                        <input type="number" value={pensionSavings} onChange={(e) => setPensionSavings(Math.max(0, Number(e.target.value)))} step={100000} min={0} className={inputClass} aria-label={t.pensionSavings} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.alreadyWithheld}</label>
                        <input type="number" value={alreadyWithheld} onChange={(e) => setAlreadyWithheld(Math.max(0, Number(e.target.value)))} step={100000} min={0} className={inputClass} aria-label={t.alreadyWithheld} />
                    </div>
                </div>

                {/* Result summary */}
                <div className={`rounded-2xl p-6 border-2 text-center ${isRefund ? 'bg-success/10 border-success' : 'bg-warning/10 border-warning'}`}>
                    <p className="text-sm font-bold uppercase tracking-wide mb-2 ${isRefund ? 'text-success' : 'text-warning'}">
                        {isRefund ? t.refund : t.additionalTax}
                    </p>
                    <p className={`text-4xl font-bold ${isRefund ? 'text-success' : 'text-warning'}`}>
                        {isRefund ? '+' : '-'}₩{fmt(Math.abs(diff))}
                    </p>
                </div>

                {/* Breakdown */}
                <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col gap-3">
                    <h4 className="text-sm font-bold text-foreground">{t.breakdown}</h4>
                    {[
                        { label: t.totalIncomeTax, value: `₩${fmt(calculatedTax)}` },
                        { label: t.personalDeduction, value: `-₩${fmt(personalDeductionAmt)}` },
                        { label: t.insuranceDeduction, value: `-₩${fmt(insuranceCredit)}` },
                        { label: t.creditCardDeduction, value: `-₩${fmt(cardCreditAtRate)}` },
                        { label: t.pensionDeduction, value: `-₩${fmt(pensionCredit)}` },
                        { label: t.medicalDeduction, value: `-₩${fmt(medicalCredit)}` },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground font-medium">{label}</span>
                            <span className="font-bold text-foreground">{value}</span>
                        </div>
                    ))}
                    <div className="border-t border-border mt-1 pt-3 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-foreground">{t.finalTax}</span>
                            <span className="text-sm font-bold text-foreground">₩{fmt(finalTax)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-muted-foreground">{t.alreadyPaid}</span>
                            <span className="text-sm font-bold text-foreground">₩{fmt(alreadyWithheld)}</span>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">{t.note}</p>
            </div>
        </GameContainer>
    );
};

export default YearEndSettlementCalculator;
