import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

type AssetType = 'realestate' | 'domestic_stock' | 'foreign_stock';

const CapitalGainsTaxCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: {
            title: "양도소득세 계산기",
            desc: "부동산·주식 매도 시 예상 양도소득세를 계산합니다.",
            assetType: "자산 유형",
            realestate: "부동산",
            domesticStock: "국내주식",
            foreignStock: "해외주식",
            acquisitionPrice: "취득가액 (원)",
            transferPrice: "양도가액 (원)",
            holdingYears: "보유 기간 (년)",
            isAdjustedArea: "조정대상지역 여부",
            houseCount: "주택 보유 수",
            house1: "1주택",
            house2: "2주택",
            house3plus: "3주택 이상",
            gainAmount: "양도차익",
            basicDeduction: "기본공제 (250만원)",
            longTermDeduction: "장기보유특별공제",
            taxableIncome: "과세표준",
            taxRate: "적용 세율",
            capitalGainsTax: "양도소득세",
            localTax: "지방소득세 (10%)",
            totalTax: "총 납부세액",
            profitBeforeTax: "세전 수익",
            profitAfterTax: "세후 수익",
            note: "* 간이 계산 기준이며 실제 세액은 국세청 확인 또는 세무사 상담을 권장합니다.",
            stockNote: "* 2025년 기준: 국내주식 소액주주 상장주식은 비과세. 금투세 시행 전 기준 적용.",
            foreignStockNote: "* 해외주식: 연간 양도차익 250만원 초과분에 대해 22% (지방세 포함) 적용.",
        },
        en: {
            title: "Capital Gains Tax Calculator",
            desc: "Calculate estimated capital gains tax on real estate and stock sales.",
            assetType: "Asset Type",
            realestate: "Real Estate",
            domesticStock: "Domestic Stock",
            foreignStock: "Foreign Stock",
            acquisitionPrice: "Acquisition Price (KRW)",
            transferPrice: "Transfer Price (KRW)",
            holdingYears: "Holding Period (years)",
            isAdjustedArea: "Adjusted Tax Area",
            houseCount: "Number of Houses",
            house1: "1 House",
            house2: "2 Houses",
            house3plus: "3+ Houses",
            gainAmount: "Capital Gain",
            basicDeduction: "Basic Deduction (2.5M KRW)",
            longTermDeduction: "Long-term Holding Deduction",
            taxableIncome: "Taxable Income",
            taxRate: "Tax Rate Applied",
            capitalGainsTax: "Capital Gains Tax",
            localTax: "Local Tax (10%)",
            totalTax: "Total Tax",
            profitBeforeTax: "Pre-tax Profit",
            profitAfterTax: "Post-tax Profit",
            note: "* This is a simplified estimate. Consult the NTS or a tax professional for accuracy.",
            stockNote: "* 2025: Domestic listed stocks (minority shareholders) are tax-exempt under current rules.",
            foreignStockNote: "* Foreign stocks: 22% (including local tax) on gains exceeding 2.5M KRW annually.",
        },
    }[locale === 'ko' ? 'ko' : 'en'];

    const [assetType, setAssetType] = useState<AssetType>('realestate');
    const [acquisitionPrice, setAcquisitionPrice] = useState(300000000);
    const [transferPrice, setTransferPrice] = useState(500000000);
    const [holdingYears, setHoldingYears] = useState(3);
    const [isAdjustedArea, setIsAdjustedArea] = useState(false);
    const [houseCount, setHouseCount] = useState<1 | 2 | 3>(1);

    const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');

    const gain = Math.max(0, transferPrice - acquisitionPrice);

    // Real estate tax rate calculation
    const getRealEstateTaxRate = (): number => {
        if (holdingYears < 1) return 0.77;
        if (holdingYears < 2) return 0.66;
        if (houseCount === 3) return isAdjustedArea ? 0.77 : 0.66;
        if (houseCount === 2) return isAdjustedArea ? 0.66 : 0.55;
        // 1주택 일반
        if (holdingYears >= 2) {
            // progressive: same as general income tax
            return 0; // signals progressive
        }
        return 0.66;
    };

    const getProgressiveTax = (taxable: number): number => {
        if (taxable <= 12000000) return taxable * 0.06;
        if (taxable <= 46000000) return 720000 + (taxable - 12000000) * 0.15;
        if (taxable <= 88000000) return 5820000 + (taxable - 46000000) * 0.24;
        if (taxable <= 150000000) return 15900000 + (taxable - 88000000) * 0.35;
        if (taxable <= 300000000) return 37600000 + (taxable - 150000000) * 0.38;
        if (taxable <= 500000000) return 94600000 + (taxable - 300000000) * 0.40;
        return 174600000 + (taxable - 500000000) * 0.42;
    };

    // Long-term holding deduction for real estate (1주택 일반)
    const getLongTermDeductionRate = (): number => {
        if (assetType !== 'realestate' || houseCount !== 1) return 0;
        if (holdingYears < 3) return 0;
        if (holdingYears < 4) return 0.12;
        if (holdingYears < 5) return 0.16;
        if (holdingYears < 6) return 0.20;
        if (holdingYears < 7) return 0.24;
        if (holdingYears < 8) return 0.28;
        if (holdingYears < 9) return 0.32;
        if (holdingYears < 10) return 0.36;
        return 0.40; // max 10 years → 40%
    };

    let capitalGainsTax = 0;
    let taxableIncome = 0;
    let longTermDeductionAmt = 0;
    let taxRateLabel = '';
    let basicDeduction = 0;
    let isExempt = false;
    let noteKey: 'note' | 'stockNote' | 'foreignStockNote' = 'note';

    if (assetType === 'domestic_stock') {
        isExempt = true;
        noteKey = 'stockNote';
    } else if (assetType === 'foreign_stock') {
        basicDeduction = 2500000;
        taxableIncome = Math.max(0, gain - basicDeduction);
        capitalGainsTax = Math.floor(taxableIncome * 0.20); // 20% + 10% local = 22% total
        taxRateLabel = '20%';
        noteKey = 'foreignStockNote';
    } else {
        // real estate
        basicDeduction = 2500000;
        const taxRate = getRealEstateTaxRate();
        longTermDeductionAmt = houseCount === 1 && holdingYears >= 2 ? Math.floor(gain * getLongTermDeductionRate()) : 0;
        const gainAfterLongTerm = Math.max(0, gain - longTermDeductionAmt);
        taxableIncome = Math.max(0, gainAfterLongTerm - basicDeduction);

        if (taxRate === 0) {
            // progressive
            capitalGainsTax = Math.floor(getProgressiveTax(taxableIncome));
            taxRateLabel = locale === 'ko' ? '누진세율' : 'Progressive';
        } else {
            capitalGainsTax = Math.floor(taxableIncome * taxRate);
            taxRateLabel = `${Math.round(taxRate * 100)}%`;
        }
        noteKey = 'note';
    }

    const localTax = Math.floor(capitalGainsTax * 0.1);
    const totalTax = capitalGainsTax + localTax;
    const profitAfterTax = gain - totalTax;

    const handleReset = () => {
        setAssetType('realestate');
        setAcquisitionPrice(300000000);
        setTransferPrice(500000000);
        setHoldingYears(3);
        setIsAdjustedArea(false);
        setHouseCount(1);
    };

    return (
        <GameContainer title={t.title} subtitle="Capital Gains Tax Estimator" onReset={handleReset}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>

                {/* Asset type selector */}
                <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold text-foreground">{t.assetType}</label>
                    <div className="grid grid-cols-3 gap-2">
                        {([['realestate', t.realestate], ['domestic_stock', t.domesticStock], ['foreign_stock', t.foreignStock]] as const).map(([val, label]) => (
                            <button
                                key={val}
                                onClick={() => setAssetType(val)}
                                className={`rounded-xl py-2 text-sm font-bold border transition-all ${assetType === val ? 'bg-success text-white border-success' : 'bg-background text-foreground border-border hover:border-success'}`}
                                aria-pressed={assetType === val}
                                aria-label={label}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.acquisitionPrice}</label>
                        <input
                            type="number"
                            value={acquisitionPrice}
                            onChange={(e) => setAcquisitionPrice(Math.max(0, Number(e.target.value)))}
                            step={10000000}
                            min={0}
                            className="rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-success/30"
                            aria-label={t.acquisitionPrice}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.transferPrice}</label>
                        <input
                            type="number"
                            value={transferPrice}
                            onChange={(e) => setTransferPrice(Math.max(0, Number(e.target.value)))}
                            step={10000000}
                            min={0}
                            className="rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-success/30"
                            aria-label={t.transferPrice}
                        />
                    </div>
                </div>

                {assetType !== 'domestic_stock' && (
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.holdingYears}</label>
                        <input
                            type="number"
                            value={holdingYears}
                            onChange={(e) => setHoldingYears(Math.max(0, Math.min(30, Number(e.target.value))))}
                            step={1}
                            min={0}
                            max={30}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-success/30"
                            aria-label={t.holdingYears}
                        />
                    </div>
                )}

                {assetType === 'realestate' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-foreground">{t.houseCount}</label>
                            <div className="grid grid-cols-3 gap-2">
                                {([1, 2, 3] as const).map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => setHouseCount(n)}
                                        className={`rounded-xl py-2 text-sm font-bold border transition-all ${houseCount === n ? 'bg-success text-white border-success' : 'bg-background text-foreground border-border hover:border-success'}`}
                                        aria-pressed={houseCount === n}
                                        aria-label={n === 1 ? t.house1 : n === 2 ? t.house2 : t.house3plus}
                                    >
                                        {n === 1 ? t.house1 : n === 2 ? t.house2 : t.house3plus}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-foreground">{t.isAdjustedArea}</label>
                            <button
                                onClick={() => setIsAdjustedArea((v) => !v)}
                                className={`rounded-xl py-3 text-sm font-bold border transition-all ${isAdjustedArea ? 'bg-warning text-white border-warning' : 'bg-background text-foreground border-border hover:border-success'}`}
                                aria-pressed={isAdjustedArea}
                                aria-label={t.isAdjustedArea}
                            >
                                {isAdjustedArea ? (locale === 'ko' ? '조정대상지역' : 'Adjusted Area') : (locale === 'ko' ? '일반지역' : 'General Area')}
                            </button>
                        </div>
                    </div>
                )}

                {isExempt ? (
                    <div className="rounded-2xl bg-success/10 border border-success/30 p-6 text-center">
                        <p className="text-success font-bold text-base">{t[noteKey]}</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col gap-3">
                        {[
                            { label: t.gainAmount, value: `₩${fmt(gain)}`, highlight: false },
                            ...(assetType === 'realestate' && longTermDeductionAmt > 0 ? [{ label: t.longTermDeduction, value: `-₩${fmt(longTermDeductionAmt)}`, highlight: false }] : []),
                            { label: t.basicDeduction, value: `-₩${fmt(basicDeduction)}`, highlight: false },
                            { label: t.taxableIncome, value: `₩${fmt(taxableIncome)}`, highlight: false },
                            { label: t.taxRate, value: taxRateLabel, highlight: false },
                            { label: t.capitalGainsTax, value: `₩${fmt(capitalGainsTax)}`, highlight: false },
                            { label: t.localTax, value: `₩${fmt(localTax)}`, highlight: false },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">{label}</span>
                                <span className="font-bold text-foreground">{value}</span>
                            </div>
                        ))}
                        <div className="border-t border-border mt-2 pt-3 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-destructive">{t.totalTax}</span>
                                <span className="text-base font-bold text-destructive">₩{fmt(totalTax)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-success">{t.profitAfterTax}</span>
                                <span className="text-base font-bold text-success">₩{fmt(profitAfterTax)}</span>
                            </div>
                        </div>
                    </div>
                )}

                <p className="text-xs text-muted-foreground text-center">{t[noteKey]}</p>
            </div>
        </GameContainer>
    );
};

export default CapitalGainsTaxCalculator;
