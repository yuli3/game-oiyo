import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

type Locale = 'ko' | 'en';
type HouseType = '1house' | '2house' | '3house_plus';

// 누진세율 (2024, 만원)
const KR_BRACKETS = [
  { min: 0,      max: 1400,    rate: 0.06, deduc: 0     },
  { min: 1400,   max: 5000,    rate: 0.15, deduc: 126   },
  { min: 5000,   max: 8800,    rate: 0.24, deduc: 576   },
  { min: 8800,   max: 15000,   rate: 0.35, deduc: 1544  },
  { min: 15000,  max: 30000,   rate: 0.38, deduc: 1994  },
  { min: 30000,  max: 50000,   rate: 0.40, deduc: 2594  },
  { min: 50000,  max: 100000,  rate: 0.42, deduc: 3594  },
  { min: 100000, max: Infinity, rate: 0.45, deduc: 6594 },
];

function progressiveTax(taxable: number): number {
  if (taxable <= 0) return 0;
  const b = KR_BRACKETS.find(b => taxable > b.min && taxable <= b.max) ?? KR_BRACKETS[KR_BRACKETS.length - 1];
  return Math.max(0, taxable * b.rate - b.deduc);
}

// 단기 세율
function shortTermRate(holdingYears: number): number | null {
  if (holdingYears < 1) return 0.70;
  if (holdingYears < 2) return 0.60;
  return null; // 일반세율
}

// 장기보유특별공제 (일반 — 비1주택)
function ltscGeneral(holdingYears: number): number {
  if (holdingYears < 3) return 0;
  return Math.min(0.30, Math.floor(holdingYears) * 0.02);
}

// 장기보유특별공제 (1세대1주택)
function ltscOneHouse(holdingYears: number, residenceYears: number): number {
  if (holdingYears < 3 || residenceYears < 2) return 0;
  const holdingPart = Math.min(10, Math.floor(holdingYears)) * 0.04;
  const residencePart = Math.min(10, Math.floor(residenceYears)) * 0.04;
  return Math.min(0.80, holdingPart + residencePart);
}

const BASIC_DEDUCTION = 250; // 기본공제 250만원
const NONTAXABLE_THRESHOLD = 120000; // 12억원 (만원 단위)

const L: Record<Locale, {
  title: string; subtitle: string;
  acquisitionPrice: string; transferPrice: string; expenses: string;
  holdingYears: string; residenceYears: string;
  houseType: string; house1: string; house2: string; house3: string;
  isAdjusted: string;
  gain: string; ltsc: string; ltscLabel: string; basicDeduction: string;
  taxableIncome: string; taxRate: string; capitalGainsTax: string;
  localTax: string; totalTax: string; netProfit: string; afterTaxProfit: string;
  nonTaxable: string; shortTermNote: string;
  calcBreakdown: string; won: string; note: string;
  effectiveRate: string; taxBurden: string;
  forcedShortTerm: string;
  ltscNone: string;
}> = {
  ko: {
    title: '양도소득세 계산기',
    subtitle: 'Capital Gains Tax (Real Estate)',
    acquisitionPrice: '취득가액 (만원)',
    transferPrice: '양도가액 (만원)',
    expenses: '필요경비 (만원)',
    holdingYears: '보유기간 (년)',
    residenceYears: '거주기간 (년)',
    houseType: '주택 유형',
    house1: '1세대 1주택',
    house2: '1세대 2주택',
    house3: '3주택 이상',
    isAdjusted: '조정대상지역',
    gain: '양도차익',
    ltsc: '장기보유특별공제',
    ltscLabel: '장특공제율',
    basicDeduction: '기본공제 (250만원)',
    taxableIncome: '과세표준',
    taxRate: '적용 세율',
    capitalGainsTax: '양도소득세',
    localTax: '지방소득세 (10%)',
    totalTax: '총 납부 세액',
    netProfit: '세전 양도차익',
    afterTaxProfit: '세후 실수익',
    nonTaxable: '1세대1주택 비과세 적용',
    shortTermNote: '단기 보유 중과 세율 적용',
    calcBreakdown: '계산 내역',
    won: '만원',
    note: '2023.05.10 이후 조정대상지역 다주택자 중과세율 한시 배제 기준 적용. 실제 세액은 개인 공제 상황·세무사 확인 필요.',
    effectiveRate: '실효세율',
    taxBurden: '세부담률',
    forcedShortTerm: '보유기간 2년 미만 — 단기 중과',
    ltscNone: '장기보유특별공제 미적용',
  },
  en: {
    title: 'Real Estate Capital Gains Tax',
    subtitle: 'Korea Capital Gains Tax Calculator',
    acquisitionPrice: 'Acquisition Price (₩10K)',
    transferPrice: 'Transfer Price (₩10K)',
    expenses: 'Necessary Expenses (₩10K)',
    holdingYears: 'Holding Period (years)',
    residenceYears: 'Residence Period (years)',
    houseType: 'Property Type',
    house1: '1 Household / 1 House',
    house2: '1 Household / 2 Houses',
    house3: '3+ Houses',
    isAdjusted: 'Regulated Area',
    gain: 'Capital Gain',
    ltsc: 'Long-Term Holding Deduction',
    ltscLabel: 'LTSC Rate',
    basicDeduction: 'Basic Deduction (₩2.5M)',
    taxableIncome: 'Taxable Income',
    taxRate: 'Applied Tax Rate',
    capitalGainsTax: 'Capital Gains Tax',
    localTax: 'Local Income Tax (10%)',
    totalTax: 'Total Tax Payable',
    netProfit: 'Gross Gain',
    afterTaxProfit: 'After-Tax Gain',
    nonTaxable: 'Tax-exempt (1 household/1 house)',
    shortTermNote: 'Short-term holding rate applied',
    calcBreakdown: 'Calculation Breakdown',
    won: '₩10K',
    note: 'Based on suspended heavy tax rules for multi-home owners post 2023.05.10. Consult a tax professional for your actual liability.',
    effectiveRate: 'Effective Rate',
    taxBurden: 'Tax Burden',
    forcedShortTerm: 'Holding < 2 years — short-term heavy rate',
    ltscNone: 'No long-term deduction',
  },
};

function fmt(n: number) { return Math.round(n).toLocaleString(); }

const RealEstateCapitalGainsTaxCalc: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
  const t = L[locale] ?? L.ko;

  const [acquisitionPrice, setAcquisitionPrice] = useState(50000);
  const [transferPrice, setTransferPrice] = useState(80000);
  const [expenses, setExpenses] = useState(1000);
  const [holdingYears, setHoldingYears] = useState(5);
  const [residenceYears, setResidenceYears] = useState(3);
  const [houseType, setHouseType] = useState<HouseType>('1house');
  const [isAdjusted, setIsAdjusted] = useState(false);

  const result = useMemo(() => {
    const rawGain = transferPrice - acquisitionPrice - expenses;
    if (rawGain <= 0) {
      return { gain: rawGain, ltscRate: 0, ltscAmount: 0, afterLtsc: 0, basicDed: 0, taxableIncome: 0, capitalGainsTax: 0, localTax: 0, totalTax: 0, afterTaxProfit: rawGain, effectiveRate: 0, isNonTaxable: false, shortTermRate: null, chartData: [], ltscLabel: t.ltscNone };
    }

    // 1세대1주택 비과세 여부 판정
    const isOneHouse = houseType === '1house';
    const meetsNonTaxable = isOneHouse && holdingYears >= 2 && (!isAdjusted || residenceYears >= 2);
    const underThreshold = transferPrice <= NONTAXABLE_THRESHOLD;
    const isNonTaxable = meetsNonTaxable && underThreshold;

    if (isNonTaxable) {
      const afterTaxProfit = transferPrice - acquisitionPrice - expenses;
      return { gain: rawGain, ltscRate: 0, ltscAmount: 0, afterLtsc: rawGain, basicDed: 0, taxableIncome: 0, capitalGainsTax: 0, localTax: 0, totalTax: 0, afterTaxProfit, effectiveRate: 0, isNonTaxable: true, shortTermRate: null, chartData: [], ltscLabel: '비과세' };
    }

    // 12억 초과 1주택: 초과분만 과세
    let taxableGain = rawGain;
    if (meetsNonTaxable && transferPrice > NONTAXABLE_THRESHOLD) {
      taxableGain = rawGain * (transferPrice - NONTAXABLE_THRESHOLD) / transferPrice;
    }

    // 단기 보유 세율
    const stRate = shortTermRate(holdingYears);

    // 장기보유특별공제
    let ltscRate = 0;
    let ltscLabel = t.ltscNone;
    if (stRate === null) {
      if (isOneHouse && holdingYears >= 3 && residenceYears >= 2) {
        ltscRate = ltscOneHouse(holdingYears, residenceYears);
        ltscLabel = `보유 ${Math.min(10, Math.floor(holdingYears))}년×4% + 거주 ${Math.min(10, Math.floor(residenceYears))}년×4%`;
      } else if (!isOneHouse || (isOneHouse && (holdingYears < 3 || residenceYears < 2))) {
        // 다주택 or 1주택 요건 미달: 조정지역 다주택은 장특공제 없음
        if (isAdjusted && houseType !== '1house') {
          ltscRate = 0;
          ltscLabel = t.ltscNone;
        } else {
          ltscRate = ltscGeneral(holdingYears);
          ltscLabel = ltscRate > 0 ? `보유 ${Math.floor(holdingYears)}년 × 2%` : t.ltscNone;
        }
      }
    }

    const ltscAmount = taxableGain * ltscRate;
    const afterLtsc = taxableGain - ltscAmount;
    const basicDed = Math.min(afterLtsc, BASIC_DEDUCTION);
    const taxableIncome = Math.max(0, afterLtsc - basicDed);

    let capitalGainsTax: number;
    if (stRate !== null) {
      capitalGainsTax = taxableIncome * stRate;
    } else {
      capitalGainsTax = progressiveTax(taxableIncome);
    }

    const localTax = capitalGainsTax * 0.10;
    const totalTax = capitalGainsTax + localTax;
    const afterTaxProfit = rawGain - totalTax;
    const effectiveRate = rawGain > 0 ? totalTax / rawGain : 0;

    const chartData = [
      { name: '세후 수익', value: Math.round(afterTaxProfit), fill: '#22c55e' },
      { name: '총 세액', value: Math.round(totalTax), fill: '#ef4444' },
    ];

    return {
      gain: rawGain, taxableGain, ltscRate, ltscAmount, ltscLabel, afterLtsc, basicDed, taxableIncome,
      capitalGainsTax, localTax, totalTax, afterTaxProfit, effectiveRate, isNonTaxable: false,
      shortTermRate: stRate, chartData,
    };
  }, [acquisitionPrice, transferPrice, expenses, holdingYears, residenceYears, houseType, isAdjusted, t.ltscNone]);

  const houseOptions: { value: HouseType; label: string }[] = [
    { value: '1house', label: t.house1 },
    { value: '2house', label: t.house2 },
    { value: '3house_plus', label: t.house3 },
  ];

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Inputs */}
      <div className="space-y-3 mb-6">
        {[
          { label: t.acquisitionPrice, value: acquisitionPrice, setter: setAcquisitionPrice },
          { label: t.transferPrice, value: transferPrice, setter: setTransferPrice },
          { label: t.expenses, value: expenses, setter: setExpenses },
          { label: t.holdingYears, value: holdingYears, setter: setHoldingYears },
          { label: t.residenceYears, value: residenceYears, setter: setResidenceYears },
        ].map(({ label, value, setter }) => (
          <div key={label} className="grid grid-cols-2 gap-3 items-center">
            <label className="text-xs font-bold">{label}</label>
            <input
              type="number" min={0} value={value}
              onChange={e => setter(Number(e.target.value))}
              className="px-4 py-2 rounded-xl border border-border bg-muted/20 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary text-right"
            />
          </div>
        ))}

        {/* House type */}
        <div className="grid grid-cols-2 gap-3 items-center">
          <label className="text-xs font-bold">{t.houseType}</label>
          <select
            value={houseType}
            onChange={e => setHouseType(e.target.value as HouseType)}
            className="px-4 py-2 rounded-xl border border-border bg-muted/20 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {houseOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Adjusted area toggle */}
        <div className="flex items-center justify-between py-2 px-1">
          <label className="text-xs font-bold">{t.isAdjusted}</label>
          <button
            onClick={() => setIsAdjusted(v => !v)}
            className={`w-12 h-6 rounded-full transition-colors relative ${isAdjusted ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isAdjusted ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Non-taxable banner */}
      {result.isNonTaxable && (
        <div className="p-5 rounded-2xl bg-success/10 border border-success/30 mb-6 text-center">
          <p className="text-2xl font-black text-success">✓ {t.nonTaxable}</p>
          <p className="text-sm text-success/80 mt-1">납부 세액 없음</p>
        </div>
      )}

      {/* Short-term warning */}
      {result.shortTermRate !== null && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 mb-4 text-xs font-bold text-destructive">
          ⚠ {t.forcedShortTerm} — {(result.shortTermRate * 100).toFixed(0)}%
        </div>
      )}

      {!result.isNonTaxable && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="col-span-3 sm:col-span-1 p-5 rounded-2xl bg-destructive/10 border border-destructive/30 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.totalTax}</p>
              <p className="text-2xl font-black text-destructive tabular-nums">{fmt(result.totalTax ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">{t.won}</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.effectiveRate}</p>
              <p className="text-xl font-black text-destructive">{((result.effectiveRate ?? 0) * 100).toFixed(1)}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.afterTaxProfit}</p>
              <p className="text-xl font-black text-success tabular-nums">{fmt(result.afterTaxProfit ?? 0)}</p>
            </div>
          </div>

          {/* Bar chart */}
          {(result.chartData?.length ?? 0) > 0 && (
            <div className="mb-6">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={result.chartData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip
                    formatter={((v: number) => [`${fmt(v)} ${t.won}`, '']) as any}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={40}>
                    {result.chartData!.map(entry => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Calculation trace */}
          <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2 mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{t.calcBreakdown}</p>
            {[
              { label: t.gain, value: result.gain ?? 0 },
              { label: `${t.ltsc} (${result.ltscLabel})`, value: -(result.ltscAmount ?? 0), skip: (result.ltscAmount ?? 0) === 0 },
              { label: t.basicDeduction, value: -(result.basicDed ?? 0) },
              { label: t.taxableIncome, value: result.taxableIncome ?? 0, bold: true },
              { label: t.capitalGainsTax, value: result.capitalGainsTax ?? 0 },
              { label: t.localTax, value: result.localTax ?? 0 },
            ].filter(r => !r.skip).map(({ label, value, bold }) => (
              <div key={label} className={`flex justify-between text-sm py-1 border-b border-border/40 last:border-0 ${bold ? 'font-black' : ''}`}>
                <span className="text-muted-foreground text-xs">{label}</span>
                <span className={`tabular-nums text-xs font-bold ${value < 0 ? 'text-success' : ''}`}>
                  {value < 0 ? '−' : ''}{fmt(Math.abs(value))} {t.won}
                </span>
              </div>
            ))}
            <div className="flex justify-between font-black text-sm pt-1 border-t border-border">
              <span>{t.totalTax}</span>
              <span className="tabular-nums text-destructive">{fmt(result.totalTax ?? 0)} {t.won}</span>
            </div>
          </div>
        </>
      )}

      <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{t.note}</p>
    </div>
  );
};

export default RealEstateCapitalGainsTaxCalc;
