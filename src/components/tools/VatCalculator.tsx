import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

type Direction = 'inclusive' | 'exclusive';
type Mode = 'simple' | 'quarterly';

const VatCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: {
            title: "부가가치세 계산기",
            desc: "VAT 포함/제외 금액을 계산하고, 사업자의 분기 VAT 납부 예상액을 추정합니다.",
            modeSimple: "VAT 포함/제외 계산",
            modeQuarterly: "분기 VAT 예상액",
            amount: "금액 (원)",
            dirInclusive: "VAT 포함 금액 입력",
            dirExclusive: "VAT 제외 금액 입력",
            vatRate: "VAT 세율",
            supplyValue: "공급가액 (VAT 제외)",
            vatAmount: "VAT 금액",
            totalAmount: "VAT 포함 금액",
            quarterlyRevenue: "분기 매출액 (원)",
            inputTaxCredit: "매입세액 (원)",
            vatPayable: "납부할 VAT",
            vatRefund: "환급 VAT",
            quarterlyNote: "* 예정신고 기준 간이 계산입니다. 실제 신고 시 정확한 세무 처리가 필요합니다.",
            note: "* 한국 부가가치세율은 표준 10%입니다. 영세율·면세 품목은 별도 확인하세요.",
        },
        en: {
            title: "VAT Calculator",
            desc: "Calculate VAT-inclusive/exclusive amounts and estimate quarterly VAT payable for businesses.",
            modeSimple: "VAT Inclusion/Exclusion",
            modeQuarterly: "Quarterly VAT Estimate",
            amount: "Amount (KRW)",
            dirInclusive: "Enter VAT-inclusive amount",
            dirExclusive: "Enter VAT-exclusive amount",
            vatRate: "VAT Rate",
            supplyValue: "Supply Value (ex-VAT)",
            vatAmount: "VAT Amount",
            totalAmount: "VAT-inclusive Amount",
            quarterlyRevenue: "Quarterly Revenue (KRW)",
            inputTaxCredit: "Input Tax Credit (KRW)",
            vatPayable: "VAT Payable",
            vatRefund: "VAT Refund",
            quarterlyNote: "* This is a simplified preliminary estimate. Accurate tax filing is required.",
            note: "* Korea's standard VAT rate is 10%. Zero-rated and exempt items are handled separately.",
        },
    }[locale === 'ko' ? 'ko' : 'en'];

    const [mode, setMode] = useState<Mode>('simple');
    const [amount, setAmount] = useState(110000);
    const [direction, setDirection] = useState<Direction>('inclusive');
    const [vatRate] = useState(10);
    const [quarterlyRevenue, setQuarterlyRevenue] = useState(30000000);
    const [inputTaxCredit, setInputTaxCredit] = useState(1000000);

    const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

    // Simple calculation
    const supplyValue = direction === 'inclusive'
        ? Math.floor(amount / (1 + vatRate / 100))
        : amount;
    const vatAmount = direction === 'inclusive'
        ? amount - supplyValue
        : Math.floor(amount * vatRate / 100);
    const totalAmount = direction === 'inclusive'
        ? amount
        : amount + vatAmount;

    // Quarterly VAT
    const outputTax = Math.floor(quarterlyRevenue * (vatRate / 100));
    const netVat = outputTax - inputTaxCredit;
    const vatPayable = Math.max(0, netVat);
    const vatRefund = Math.max(0, -netVat);

    const handleReset = () => {
        setMode('simple');
        setAmount(110000);
        setDirection('inclusive');
        setQuarterlyRevenue(30000000);
        setInputTaxCredit(1000000);
    };

    return (
        <GameContainer title={t.title} subtitle="VAT Calculator" onReset={handleReset}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>

                {/* Mode switcher */}
                <div className="grid grid-cols-2 gap-2">
                    {(['simple', 'quarterly'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`rounded-xl py-2 text-sm font-bold border transition-all ${mode === m ? 'bg-success text-white border-success' : 'bg-background text-foreground border-border hover:border-success'}`}
                            aria-pressed={mode === m}
                            aria-label={m === 'simple' ? t.modeSimple : t.modeQuarterly}
                        >
                            {m === 'simple' ? t.modeSimple : t.modeQuarterly}
                        </button>
                    ))}
                </div>

                {mode === 'simple' && (
                    <>
                        {/* Direction selector */}
                        <div className="grid grid-cols-2 gap-2">
                            {(['inclusive', 'exclusive'] as const).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDirection(d)}
                                    className={`rounded-xl py-2 text-sm font-bold border transition-all ${direction === d ? 'bg-success/15 text-success border-success' : 'bg-background text-muted-foreground border-border hover:border-success/40'}`}
                                    aria-pressed={direction === d}
                                    aria-label={d === 'inclusive' ? t.dirInclusive : t.dirExclusive}
                                >
                                    {d === 'inclusive' ? t.dirInclusive : t.dirExclusive}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-foreground">{t.amount} (VAT {vatRate}%)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                                step={1000}
                                min={0}
                                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-success/30"
                                aria-label={t.amount}
                            />
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col gap-3">
                            {[
                                { label: t.supplyValue, value: `₩${fmt(supplyValue)}`, em: false },
                                { label: t.vatAmount, value: `₩${fmt(vatAmount)}`, em: false },
                                { label: t.totalAmount, value: `₩${fmt(totalAmount)}`, em: true },
                            ].map(({ label, value, em }) => (
                                <div key={label} className={`flex justify-between items-center ${em ? 'border-t border-border pt-3 mt-1' : ''}`}>
                                    <span className={`text-sm font-${em ? 'bold' : 'medium'} ${em ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                                    <span className={`font-bold ${em ? 'text-lg text-success' : 'text-foreground'}`}>{value}</span>
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-muted-foreground text-center">{t.note}</p>
                    </>
                )}

                {mode === 'quarterly' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-foreground">{t.quarterlyRevenue}</label>
                                <input
                                    type="number"
                                    value={quarterlyRevenue}
                                    onChange={(e) => setQuarterlyRevenue(Math.max(0, Number(e.target.value)))}
                                    step={1000000}
                                    min={0}
                                    className="rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-success/30"
                                    aria-label={t.quarterlyRevenue}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-foreground">{t.inputTaxCredit}</label>
                                <input
                                    type="number"
                                    value={inputTaxCredit}
                                    onChange={(e) => setInputTaxCredit(Math.max(0, Number(e.target.value)))}
                                    step={100000}
                                    min={0}
                                    className="rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-success/30"
                                    aria-label={t.inputTaxCredit}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`rounded-2xl p-5 flex flex-col gap-1 ${vatPayable > 0 ? 'bg-warning/10 border border-warning/30' : 'bg-muted/30 border border-border'}`}>
                                <span className="text-xs font-bold uppercase tracking-wide text-warning">{t.vatPayable}</span>
                                <span className="text-2xl font-bold text-warning">₩{fmt(vatPayable)}</span>
                            </div>
                            <div className={`rounded-2xl p-5 flex flex-col gap-1 ${vatRefund > 0 ? 'bg-success/10 border border-success/30' : 'bg-muted/30 border border-border'}`}>
                                <span className="text-xs font-bold uppercase tracking-wide text-success">{t.vatRefund}</span>
                                <span className="text-2xl font-bold text-success">₩{fmt(vatRefund)}</span>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">{t.quarterlyNote}</p>
                    </>
                )}
            </div>
        </GameContainer>
    );
};

export default VatCalculator;
