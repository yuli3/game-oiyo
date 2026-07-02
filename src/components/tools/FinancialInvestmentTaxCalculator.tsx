import React, { useState, useMemo } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

// Korean Financial Investment Income Tax (금융투자소득세)
// Rates: domestic stocks/funds: 20% up to ₩300M, 25% above
// Foreign stocks/ETFs: 20% up to ₩300M, 25% above
// Basic deduction: ₩50M for domestic, ₩250M for other
// Loss carry-forward: 5 years

const L: Record<Locale, {
  title: string; subtitle: string;
  domesticGain: string; foreignGain: string; otherGain: string;
  domesticLoss: string; foreignLoss: string;
  carryForward: string; calc: string; reset: string;
  totalGain: string; totalLoss: string; netGain: string;
  deduction: string; taxableIncome: string; taxAmount: string;
  effectiveRate: string; breakdown: string;
  domesticLabel: string; foreignLabel: string; otherLabel: string;
  tier1: string; tier2: string;
  tip: string; tipText: string;
  note: string; wonUnit: string;
  zeroTax: string;
}> = {
  ko: {
    title: '금융투자소득세 계산기',
    subtitle: 'Financial Investment Income Tax (금투세)',
    domesticGain: '국내 주식·펀드 수익 (만원)',
    foreignGain: '해외 주식·ETF 수익 (만원)',
    otherGain: '채권·파생상품 수익 (만원)',
    domesticLoss: '국내 손실 (만원)',
    foreignLoss: '해외 손실 (만원)',
    carryForward: '이월손실금 (만원)',
    calc: '세금 계산',
    reset: '초기화',
    totalGain: '총 수익',
    totalLoss: '총 손실',
    netGain: '순 수익',
    deduction: '기본 공제',
    taxableIncome: '과세표준',
    taxAmount: '납부 세액',
    effectiveRate: '실효 세율',
    breakdown: '세율 구간',
    domesticLabel: '국내 (주식·ETF·펀드)',
    foreignLabel: '해외 (주식·ETF)',
    otherLabel: '채권·파생상품 등',
    tier1: '3억원 이하 (20%)',
    tier2: '3억원 초과 (25%)',
    tip: '💡 금투세 절세 전략',
    tipText: '손실이 있다면 해당 연도에 실현해 이익과 상계하세요. 기본공제(국내 5천만원, 기타 250만원)를 최대한 활용하고, 장기 투자로 절세 효과를 극대화하세요.',
    note: '본 계산기는 2025년 시행 예정 금투세 기준 참고용입니다. 실제 납부세액은 세무사 상담을 권장합니다.',
    wonUnit: '만원',
    zeroTax: '기본공제 범위 내 — 납부세액 없음',
  },
  en: {
    title: 'Korean Financial Investment Tax',
    subtitle: 'Korea Financial Investment Income Tax (금투세) Calculator',
    domesticGain: 'Domestic Stocks/Funds Gain (₩10K)',
    foreignGain: 'Foreign Stocks/ETFs Gain (₩10K)',
    otherGain: 'Bonds/Derivatives Gain (₩10K)',
    domesticLoss: 'Domestic Losses (₩10K)',
    foreignLoss: 'Foreign Losses (₩10K)',
    carryForward: 'Loss Carry-Forward (₩10K)',
    calc: 'Calculate Tax',
    reset: 'Reset',
    totalGain: 'Total Gains',
    totalLoss: 'Total Losses',
    netGain: 'Net Gain',
    deduction: 'Basic Deduction',
    taxableIncome: 'Taxable Income',
    taxAmount: 'Tax Payable',
    effectiveRate: 'Effective Rate',
    breakdown: 'Bracket Breakdown',
    domesticLabel: 'Domestic (Stocks/ETF/Funds)',
    foreignLabel: 'Foreign (Stocks/ETF)',
    otherLabel: 'Bonds/Derivatives',
    tier1: 'Up to ₩300M (20%)',
    tier2: 'Above ₩300M (25%)',
    tip: '💡 Tax Saving Tips',
    tipText: 'Realize losses in the same year to offset gains. Maximize basic deductions (₩50M domestic, ₩2.5M other). Long-term holding maximizes tax efficiency.',
    note: 'This calculator is for reference based on Korea\'s financial investment income tax. Consult a tax professional for actual liability.',
    wonUnit: '₩10K units',
    zeroTax: 'Within basic deduction — no tax payable',
  },
  ja: {
    title: '韓国金融投資所得税計算機',
    subtitle: '금투세（金融投資所得税）試算',
    domesticGain: '国内株式・ファンド収益（万ウォン）',
    foreignGain: '海外株式・ETF収益（万ウォン）',
    otherGain: '債券・デリバティブ収益（万ウォン）',
    domesticLoss: '国内損失（万ウォン）',
    foreignLoss: '海外損失（万ウォン）',
    carryForward: '繰越損失（万ウォン）',
    calc: '税金計算',
    reset: 'リセット',
    totalGain: '総収益',
    totalLoss: '総損失',
    netGain: '純収益',
    deduction: '基本控除',
    taxableIncome: '課税標準',
    taxAmount: '納付税額',
    effectiveRate: '実効税率',
    breakdown: '税率ブラケット',
    domesticLabel: '国内（株式・ETF・ファンド）',
    foreignLabel: '海外（株式・ETF）',
    otherLabel: '債券・デリバティブ',
    tier1: '3億ウォン以下（20%）',
    tier2: '3億ウォン超（25%）',
    tip: '💡 節税のヒント',
    tipText: '損失がある場合は同年に実現して利益と相殺してください。基本控除（国内5千万ウォン、その他250万ウォン）を最大限活用してください。',
    note: 'この計算機は参考用です。実際の納税額は税理士にご相談ください。',
    wonUnit: '万ウォン',
    zeroTax: '基本控除内 — 納付税額なし',
  },
  fr: {
    title: 'Calculateur Impôt Investissement Coréen',
    subtitle: 'Impôt sur les revenus d\'investissement financier (금투세)',
    domesticGain: 'Gains actions/fonds coréens (10K₩)',
    foreignGain: 'Gains actions/ETF étrangers (10K₩)',
    otherGain: 'Gains obligations/dérivés (10K₩)',
    domesticLoss: 'Pertes domestiques (10K₩)',
    foreignLoss: 'Pertes étrangères (10K₩)',
    carryForward: 'Report de pertes (10K₩)',
    calc: 'Calculer',
    reset: 'Réinitialiser',
    totalGain: 'Gains totaux',
    totalLoss: 'Pertes totales',
    netGain: 'Gain net',
    deduction: 'Déduction de base',
    taxableIncome: 'Revenu imposable',
    taxAmount: 'Impôt à payer',
    effectiveRate: 'Taux effectif',
    breakdown: 'Détail des tranches',
    domesticLabel: 'Domestique (actions/ETF/fonds)',
    foreignLabel: 'Étranger (actions/ETF)',
    otherLabel: 'Obligations/dérivés',
    tier1: "Jusqu'à 300M₩ (20%)",
    tier2: 'Au-dessus de 300M₩ (25%)',
    tip: '💡 Conseils fiscaux',
    tipText: "Réalisez les pertes pour compenser les gains. Maximisez les déductions de base.",
    note: "Calculateur de référence. Consultez un conseiller fiscal pour votre situation.",
    wonUnit: 'unités 10K₩',
    zeroTax: 'Dans la déduction de base — pas d\'impôt',
  },
  es: {
    title: 'Calculadora Impuesto Inversión Coreano',
    subtitle: 'Impuesto sobre ingresos de inversión financiera (금투세)',
    domesticGain: 'Ganancias acciones/fondos coreanos (10K₩)',
    foreignGain: 'Ganancias acciones/ETF extranjeros (10K₩)',
    otherGain: 'Ganancias bonos/derivados (10K₩)',
    domesticLoss: 'Pérdidas domésticas (10K₩)',
    foreignLoss: 'Pérdidas extranjeras (10K₩)',
    carryForward: 'Pérdidas arrastradas (10K₩)',
    calc: 'Calcular',
    reset: 'Restablecer',
    totalGain: 'Ganancias totales',
    totalLoss: 'Pérdidas totales',
    netGain: 'Ganancia neta',
    deduction: 'Deducción básica',
    taxableIncome: 'Base imponible',
    taxAmount: 'Impuesto a pagar',
    effectiveRate: 'Tipo efectivo',
    breakdown: 'Desglose de tramos',
    domesticLabel: 'Doméstico (acciones/ETF/fondos)',
    foreignLabel: 'Extranjero (acciones/ETF)',
    otherLabel: 'Bonos/derivados',
    tier1: 'Hasta 300M₩ (20%)',
    tier2: 'Por encima de 300M₩ (25%)',
    tip: '💡 Consejos fiscales',
    tipText: 'Realice pérdidas para compensar ganancias. Maximice las deducciones básicas.',
    note: 'Calculadora de referencia. Consulte a un asesor fiscal.',
    wonUnit: 'unidades 10K₩',
    zeroTax: 'Dentro de la deducción básica — sin impuesto',
  },
  zh: {
    title: '韩国金融投资所得税计算器',
    subtitle: '금투세（金融投资所得税）试算',
    domesticGain: '国内股票·基金收益（万韩元）',
    foreignGain: '海外股票·ETF收益（万韩元）',
    otherGain: '债券·衍生品收益（万韩元）',
    domesticLoss: '国内损失（万韩元）',
    foreignLoss: '海外损失（万韩元）',
    carryForward: '亏损结转（万韩元）',
    calc: '计算税金',
    reset: '重置',
    totalGain: '总收益',
    totalLoss: '总损失',
    netGain: '净收益',
    deduction: '基本扣除',
    taxableIncome: '应税所得',
    taxAmount: '应缴税额',
    effectiveRate: '实际税率',
    breakdown: '税率级距',
    domesticLabel: '国内（股票·ETF·基金）',
    foreignLabel: '海外（股票·ETF）',
    otherLabel: '债券·衍生品',
    tier1: '3亿韩元以下（20%）',
    tier2: '3亿韩元以上（25%）',
    tip: '💡 节税策略',
    tipText: '有亏损时在同年实现以抵消收益。最大限度利用基本扣除（国内5千万、其他250万）。',
    note: '本计算器仅供参考。实际纳税额请咨询税务专业人士。',
    wonUnit: '万韩元',
    zeroTax: '在基本扣除范围内 — 无需纳税',
  },
};

// Korean 금투세 rules (2025 implementation plan)
// Domestic stocks/ETF/funds: basic deduction ₩50M (5000만원)
// Foreign stocks/ETF/bonds/derivatives: basic deduction ₩2.5M (250만원)
// After combining into total:
//   - up to ₩300M (3억): 20%
//   - above ₩300M: 25%
// Loss carry-forward: 5 years
// Losses offset gains within same year first

const DOMESTIC_DEDUCTION = 5000;  // 5000만원
const OTHER_DEDUCTION = 250;       // 250만원
const TIER1_THRESHOLD = 30000;    // 3억원 in 만원
const TIER1_RATE = 0.20;
const TIER2_RATE = 0.25;

function calcKoreanFinTax(
  domesticGain: number,
  foreignGain: number,
  otherGain: number,
  domesticLoss: number,
  foreignLoss: number,
  carryForward: number
): {
  totalGain: number;
  totalLoss: number;
  netGain: number;
  domesticDeduction: number;
  otherDeduction: number;
  taxableIncome: number;
  tier1Tax: number;
  tier2Tax: number;
  totalTax: number;
  effectiveRate: number;
} {
  // Net within each bucket
  const domesticNet = Math.max(0, domesticGain - domesticLoss);
  const otherNet = Math.max(0, foreignGain + otherGain - foreignLoss);

  // Apply deductions
  const domesticAfterDeduction = Math.max(0, domesticNet - DOMESTIC_DEDUCTION);
  const otherAfterDeduction = Math.max(0, otherNet - OTHER_DEDUCTION);

  const totalGain = domesticGain + foreignGain + otherGain;
  const totalLoss = domesticLoss + foreignLoss;
  const netGain = domesticAfterDeduction + otherAfterDeduction;

  // Apply carry-forward loss
  const taxableIncome = Math.max(0, netGain - carryForward);

  // Progressive tax
  let tier1Tax = 0;
  let tier2Tax = 0;
  if (taxableIncome > 0) {
    const tier1Base = Math.min(taxableIncome, TIER1_THRESHOLD);
    const tier2Base = Math.max(0, taxableIncome - TIER1_THRESHOLD);
    tier1Tax = tier1Base * TIER1_RATE;
    tier2Tax = tier2Base * TIER2_RATE;
  }

  const totalTax = tier1Tax + tier2Tax;
  const grossGain = domesticGain + foreignGain + otherGain;
  const effectiveRate = grossGain > 0 ? totalTax / grossGain : 0;

  return {
    totalGain,
    totalLoss,
    netGain: domesticNet + otherNet,
    domesticDeduction: Math.min(domesticNet, DOMESTIC_DEDUCTION),
    otherDeduction: Math.min(otherNet, OTHER_DEDUCTION),
    taxableIncome,
    tier1Tax,
    tier2Tax,
    totalTax,
    effectiveRate,
  };
}

function fmt(n: number): string {
  return n.toLocaleString();
}

const FinancialInvestmentTaxCalculator: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
  const t = L[locale] ?? L.ko;
  const [domesticGain, setDomesticGain] = useState(8000);
  const [foreignGain, setForeignGain] = useState(2000);
  const [otherGain, setOtherGain] = useState(0);
  const [domesticLoss, setDomesticLoss] = useState(1000);
  const [foreignLoss, setForeignLoss] = useState(0);
  const [carryForward, setCarryForward] = useState(0);

  const result = useMemo(() =>
    calcKoreanFinTax(domesticGain, foreignGain, otherGain, domesticLoss, foreignLoss, carryForward),
    [domesticGain, foreignGain, otherGain, domesticLoss, foreignLoss, carryForward]
  );

  const reset = () => {
    setDomesticGain(8000); setForeignGain(2000); setOtherGain(0);
    setDomesticLoss(1000); setForeignLoss(0); setCarryForward(0);
  };

  const inputFields = [
    { label: t.domesticGain, value: domesticGain, setter: setDomesticGain, positive: true },
    { label: t.foreignGain, value: foreignGain, setter: setForeignGain, positive: true },
    { label: t.otherGain, value: otherGain, setter: setOtherGain, positive: true },
    { label: t.domesticLoss, value: domesticLoss, setter: setDomesticLoss, positive: false },
    { label: t.foreignLoss, value: foreignLoss, setter: setForeignLoss, positive: false },
    { label: t.carryForward, value: carryForward, setter: setCarryForward, positive: false },
  ];

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Inputs */}
      <div className="space-y-3 mb-6">
        {inputFields.map(({ label, value, setter, positive }) => (
          <div key={label} className="grid grid-cols-2 gap-3 items-center">
            <label className={`text-xs font-bold ${positive ? 'text-foreground' : 'text-destructive/80'}`}>{label}</label>
            <input
              type="number"
              min={0}
              value={value}
              onChange={e => setter(Number(e.target.value))}
              className="px-4 py-2 rounded-xl border border-border bg-muted/20 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary text-right"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-8">
        <button onClick={() => {}} className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-colors">
          {t.calc}
        </button>
        <button onClick={reset} className="px-5 py-3 rounded-2xl border border-border bg-muted/20 font-bold text-sm hover:bg-accent transition-colors">
          {t.reset}
        </button>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Tax amount hero */}
        {result.totalTax === 0 ? (
          <div className="p-6 rounded-2xl bg-success/10 border border-success/30 text-center">
            <p className="text-2xl font-black text-success">✓ {t.zeroTax}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1 p-5 rounded-2xl bg-destructive/10 border border-destructive/30 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.taxAmount}</p>
              <p className="text-3xl font-black text-destructive">{fmt(result.totalTax)}</p>
              <p className="text-[10px] text-muted-foreground">{t.wonUnit}</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.effectiveRate}</p>
              <p className="text-xl font-black text-destructive">{(result.effectiveRate * 100).toFixed(1)}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.taxableIncome}</p>
              <p className="text-xl font-black">{fmt(result.taxableIncome)}</p>
            </div>
          </div>
        )}

        {/* Calculation trace */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-2">
          {[
            { label: t.totalGain, value: result.totalGain, color: 'text-foreground' },
            { label: t.totalLoss, value: -result.totalLoss, color: 'text-destructive' },
            { label: `${t.deduction} (${t.domesticLabel})`, value: -result.domesticDeduction, color: 'text-success' },
            { label: `${t.deduction} (${t.otherLabel})`, value: -result.otherDeduction, color: 'text-success' },
            { label: carryForward > 0 ? t.carryForward : '', value: -carryForward, color: 'text-success', skip: carryForward === 0 },
          ].filter(r => !r.skip).map(({ label, value, color }) => (
            <div key={label} className="flex justify-between text-sm py-1 border-b border-border/40 last:border-0">
              <span className="text-muted-foreground">{label}</span>
              <span className={`font-bold tabular-nums ${color}`}>
                {value >= 0 ? '' : '−'}{fmt(Math.abs(value))} {t.wonUnit}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-black pt-1">
            <span>{t.taxableIncome}</span>
            <span className="tabular-nums">{fmt(result.taxableIncome)} {t.wonUnit}</span>
          </div>
        </div>

        {/* Bracket breakdown */}
        {result.taxableIncome > 0 && (
          <div className="p-4 rounded-2xl bg-muted/20 border border-border">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{t.breakdown}</p>
            {[
              { label: t.tier1, amount: Math.min(result.taxableIncome, TIER1_THRESHOLD), rate: TIER1_RATE, tax: result.tier1Tax },
              ...(result.taxableIncome > TIER1_THRESHOLD ? [{ label: t.tier2, amount: result.taxableIncome - TIER1_THRESHOLD, rate: TIER2_RATE, tax: result.tier2Tax }] : []),
            ].map(({ label, amount, rate, tax }) => (
              <div key={label} className="flex justify-between text-xs py-2 border-b border-border/40 last:border-0">
                <div>
                  <span className="font-bold">{label}</span>
                  <span className="text-muted-foreground ml-2">{fmt(amount)} × {(rate * 100).toFixed(0)}%</span>
                </div>
                <span className="font-black text-destructive tabular-nums">{fmt(tax)} {t.wonUnit}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tip */}
        <div className="p-4 rounded-2xl bg-info/10 border border-info/30">
          <p className="text-xs font-black mb-1">{t.tip}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{t.tipText}</p>
        </div>

        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{t.note}</p>
      </div>
    </div>
  );
};

export default FinancialInvestmentTaxCalculator;
