import React, { useState, useMemo } from 'react';

function fmt(n: number) {
  return Math.round(n).toLocaleString('ko-KR');
}

// 양도소득세 기본세율 (2024년, 단위: 원)
const TAX_BRACKETS = [
  { limit: 14_000_000, rate: 0.06, prev: 0, prevTax: 0 },
  { limit: 50_000_000, rate: 0.15, prev: 14_000_000, prevTax: 840_000 },
  { limit: 88_000_000, rate: 0.24, prev: 50_000_000, prevTax: 6_240_000 },
  { limit: 150_000_000, rate: 0.35, prev: 88_000_000, prevTax: 15_360_000 },
  { limit: 300_000_000, rate: 0.38, prev: 150_000_000, prevTax: 37_060_000 },
  { limit: 500_000_000, rate: 0.40, prev: 300_000_000, prevTax: 94_060_000 },
  { limit: Infinity, rate: 0.42, prev: 500_000_000, prevTax: 174_060_000 },
];

function calcTax(taxable: number): number {
  if (taxable <= 0) return 0;
  for (const b of TAX_BRACKETS) {
    if (taxable <= b.limit) return b.prevTax + (taxable - b.prev) * b.rate;
  }
  return 0;
}

// 장기보유특별공제율 (1세대 1주택, 거주 요건 충족)
const LONG_TERM_DEDUCTION: Record<number, number> = {
  2: 0.08, 3: 0.12, 4: 0.16, 5: 0.20,
  6: 0.24, 7: 0.28, 8: 0.32, 9: 0.36,
  10: 0.40,
};

function getLongTermRate(holdYears: number, isOneHousehold: boolean): number {
  if (holdYears < 2) return 0;
  const capped = Math.min(holdYears, 10);
  if (isOneHousehold) {
    // 1세대 1주택: 보유 4%/거주 4% 각각 → 최대 80%
    return Math.min(capped * 0.08, 0.80);
  }
  // 일반: 보유 2% → 최대 30%
  const rate = LONG_TERM_DEDUCTION[capped] ?? 0.40;
  return Math.min(rate * 0.5, 0.30);
}

type AssetType = 'house' | 'land' | 'stock';

export default function CapitalGainsTaxCalculator() {
  const [salePrice, setSalePrice] = useState('');
  const [salePriceDisplay, setSalePriceDisplay] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyPriceDisplay, setBuyPriceDisplay] = useState('');
  const [expenses, setExpenses] = useState('');
  const [expensesDisplay, setExpensesDisplay] = useState('');
  const [holdYears, setHoldYears] = useState('3');
  const [assetType, setAssetType] = useState<AssetType>('house');
  const [isOneHousehold, setIsOneHousehold] = useState(false);
  const [isExempt, setIsExempt] = useState(false);

  const mkHandler = (setter: (v: string) => void, displaySetter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
      setter(raw);
      const n = parseInt(raw) || 0;
      displaySetter(n > 0 ? n.toLocaleString('ko-KR') : raw);
    };

  const result = useMemo(() => {
    const sale = parseInt(salePrice) || 0;
    const buy = parseInt(buyPrice) || 0;
    if (sale <= 0 || buy <= 0) return null;

    const exp = parseInt(expenses) || 0;
    const holdYearsNum = parseInt(holdYears) || 0;

    // 1세대 1주택 비과세 조건: 보유 2년 이상, 실거래가 12억 이하
    if (isExempt && isOneHousehold && sale <= 1_200_000_000 && holdYearsNum >= 2) {
      return { exempt: true };
    }

    // 양도차익
    const transferGain = Math.max(0, sale - buy - exp);

    // 장기보유특별공제
    const longTermRate = getLongTermRate(holdYearsNum, isOneHousehold && assetType === 'house');
    const longTermDeduction = Math.round(transferGain * longTermRate);

    // 양도소득금액
    const capitalGain = Math.max(0, transferGain - longTermDeduction);

    // 기본공제 250만 원
    const basicDeduction = 2_500_000;
    const taxBase = Math.max(0, capitalGain - basicDeduction);

    // 단기 중과 (1년 미만: 70%, 1~2년: 60%, 조정대상지역 다주택자: +10/20%p)
    let rate = 0;
    let isHeavyTax = false;
    if (assetType === 'stock') {
      // 주식: 대주주 기준 및 상장/비상장 구분 (간이)
      rate = 0.22; // 양도소득세 20% + 지방세 2%
    } else if (holdYearsNum < 1) {
      rate = 0.77; // 70% + 지방소득세 7%
      isHeavyTax = true;
    } else if (holdYearsNum < 2) {
      rate = 0.66; // 60% + 지방소득세 6%
      isHeavyTax = true;
    } else {
      // 기본세율
      const baseTax = calcTax(taxBase);
      const localTax = Math.round(baseTax * 0.1);
      return {
        exempt: false,
        transferGain,
        longTermDeduction,
        longTermRate,
        capitalGain,
        taxBase,
        baseTax: Math.round(baseTax),
        localTax,
        totalTax: Math.round(baseTax) + localTax,
        effectiveRate: taxBase > 0 ? ((baseTax / sale) * 100).toFixed(1) : '0.0',
        isHeavyTax: false,
        isStock: false,
      };
    }

    // 단기/주식 단일세율
    const totalTax = Math.round(taxBase * rate);
    return {
      exempt: false,
      transferGain,
      longTermDeduction,
      longTermRate,
      capitalGain,
      taxBase,
      baseTax: totalTax,
      localTax: 0,
      totalTax,
      effectiveRate: sale > 0 ? ((totalTax / sale) * 100).toFixed(1) : '0.0',
      isHeavyTax,
      isStock: assetType === 'stock',
    };
  }, [salePrice, buyPrice, expenses, holdYears, assetType, isOneHousehold, isExempt]);

  const ASSET_TYPES: { key: AssetType; label: string }[] = [
    { key: 'house', label: '주택' },
    { key: 'land', label: '토지' },
    { key: 'stock', label: '주식' },
  ];

  return (
    <div className="not-prose my-8 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">양도소득세 계산기</h3>
            <p className="text-rose-100 text-xs mt-0.5">양도차익 · 장기보유특별공제 · 결정세액 계산</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Asset type */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-foreground">자산 유형</label>
          <div className="grid grid-cols-3 gap-2">
            {ASSET_TYPES.map((t) => (
              <button key={t.key} onClick={() => setAssetType(t.key)}
                className={`rounded-xl py-2.5 text-sm font-semibold border transition-all ${
                  assetType === t.key
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-border text-muted-foreground hover:border-rose-300'
                }`}>{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price inputs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: '양도가액 (팔 때)', val: salePriceDisplay, handler: mkHandler(setSalePrice, setSalePriceDisplay) },
            { label: '취득가액 (살 때)', val: buyPriceDisplay, handler: mkHandler(setBuyPrice, setBuyPriceDisplay) },
            { label: '필요경비 (중개료+취득세 등)', val: expensesDisplay, handler: mkHandler(setExpenses, setExpensesDisplay) },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-xs font-semibold mb-1.5 text-foreground">{f.label}</label>
              <div className="relative">
                <input type="text" inputMode="numeric" value={f.val} onChange={f.handler}
                  placeholder="원"
                  className="w-full rounded-xl border border-border bg-background px-3 py-3 text-right font-mono font-semibold focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 placeholder:text-muted-foreground/40 text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
              </div>
            </div>
          ))}
        </div>

        {/* Hold years */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1.5 text-foreground">보유 기간 (년)</label>
            <input type="number" min={0} max={30} value={holdYears} onChange={(e) => setHoldYears(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono font-semibold focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-sm"
            />
          </div>
          {assetType === 'house' && (
            <div className="flex-1 space-y-2 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isOneHousehold} onChange={(e) => setIsOneHousehold(e.target.checked)}
                  className="rounded border-border" />
                <span className="text-sm font-medium">1세대 1주택</span>
              </label>
              {isOneHousehold && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isExempt} onChange={(e) => setIsExempt(e.target.checked)}
                    className="rounded border-border" />
                  <span className="text-sm font-medium">비과세 확인 (실거래가 12억↓)</span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          result.exempt ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-center">
              <div className="text-2xl font-extrabold text-emerald-700">비과세</div>
              <div className="text-sm text-emerald-600 mt-1">1세대 1주택 비과세 요건 충족 (실거래가 12억 이하, 보유 2년 이상)</div>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="divide-y divide-border">
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-sm text-muted-foreground">양도차익</span>
                  <span className="font-mono font-bold">{fmt(result.transferGain ?? 0)} 원</span>
                </div>
                {(result.longTermDeduction ?? 0) > 0 && (
                  <div className="flex justify-between items-center px-5 py-3">
                    <span className="text-sm text-muted-foreground">
                      장기보유특별공제 ({((result.longTermRate ?? 0) * 100).toFixed(0)}%)
                    </span>
                    <span className="font-mono text-emerald-600">- {fmt(result.longTermDeduction ?? 0)} 원</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-sm text-muted-foreground">양도소득금액</span>
                  <span className="font-mono">{fmt(result.capitalGain ?? 0)} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-sm text-muted-foreground">기본공제 (250만 원)</span>
                  <span className="font-mono text-emerald-600">- {result.isStock ? '0' : '2,500,000'} 원</span>
                </div>
                <div className="flex justify-between items-center px-5 py-3 bg-muted/20">
                  <span className="text-sm font-semibold">과세표준</span>
                  <span className="font-mono font-bold">{fmt(result.taxBase ?? 0)} 원</span>
                </div>
                {result.isHeavyTax && (
                  <div className="px-5 py-2 bg-red-50/50">
                    <span className="text-xs text-red-600 font-semibold">⚠️ 보유기간 {parseInt(holdYears)}년 미만 — 단기 중과세율 적용</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-5 py-3.5 bg-red-50/50">
                  <span className="text-sm font-bold text-red-800">
                    납부할 양도소득세+지방세 (실효세율 {result.effectiveRate}%)
                  </span>
                  <span className="font-mono font-extrabold text-rose-700 text-xl">{fmt(result.totalTax ?? 0)} 원</span>
                </div>
              </div>
            </div>
          )
        )}

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          ※ 다주택자 중과, 조정대상지역 여부는 반영되지 않습니다.{' '}
          <span className="text-rose-600">실제 세액은 세무사 상담 또는 국세청 양도소득세 신고 시스템을 이용하세요.</span>
        </p>
      </div>
    </div>
  );
}
