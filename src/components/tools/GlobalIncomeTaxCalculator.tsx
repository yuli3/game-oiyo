import React, { useState, useMemo } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

interface TaxBracket { min: number; max: number; rate: number }

interface CountryTaxConfig {
  name: Record<Locale, string>;
  flag: string;
  currency: string;
  currencySymbol: string;
  brackets: TaxBracket[]; // in local currency
  standardDeduction: number; // standard deduction in local currency
  socialInsuranceRate: number; // approximate combined rate as decimal
  notes: Record<Locale, string>;
}

// Approximate 2024 brackets (simplified for educational use)
const COUNTRIES: Record<string, CountryTaxConfig> = {
  KR: {
    name: { ko: '🇰🇷 한국', en: '🇰🇷 South Korea', ja: '🇰🇷 韓国', fr: '🇰🇷 Corée du Sud', es: '🇰🇷 Corea del Sur', zh: '🇰🇷 韩国', },
    flag: '🇰🇷', currency: 'KRW', currencySymbol: '₩',
    brackets: [
      { min: 0,          max: 14000000,  rate: 0.06 },
      { min: 14000000,   max: 50000000,  rate: 0.15 },
      { min: 50000000,   max: 88000000,  rate: 0.24 },
      { min: 88000000,   max: 150000000, rate: 0.35 },
      { min: 150000000,  max: 300000000, rate: 0.38 },
      { min: 300000000,  max: 500000000, rate: 0.40 },
      { min: 500000000,  max: 1000000000,rate: 0.42 },
      { min: 1000000000, max: Infinity,  rate: 0.45 },
    ],
    standardDeduction: 1500000,
    socialInsuranceRate: 0.0924, // approx national pension + health
    notes: { ko: '근로소득공제 및 기본공제 적용 전 단순 추정치입니다', en: 'Simplified estimate before employment deductions', ja: '給与所得控除前の簡易試算です', fr: 'Estimation simplifiée avant déductions', es: 'Estimación simplificada antes de deducciones', zh: '扣除薪资所得扣除额前的简单估算', },
  },
  US: {
    name: { ko: '🇺🇸 미국', en: '🇺🇸 United States', ja: '🇺🇸 アメリカ', fr: '🇺🇸 États-Unis', es: '🇺🇸 Estados Unidos', zh: '🇺🇸 美国', },
    flag: '🇺🇸', currency: 'USD', currencySymbol: '$',
    brackets: [
      { min: 0,       max: 11600,  rate: 0.10 },
      { min: 11600,   max: 47150,  rate: 0.12 },
      { min: 47150,   max: 100525, rate: 0.22 },
      { min: 100525,  max: 191950, rate: 0.24 },
      { min: 191950,  max: 243725, rate: 0.32 },
      { min: 243725,  max: 609350, rate: 0.35 },
      { min: 609350,  max: Infinity, rate: 0.37 },
    ],
    standardDeduction: 14600,
    socialInsuranceRate: 0.0765, // FICA (SS + Medicare)
    notes: { ko: '2024년 단일 신고 기준, 주세 제외', en: '2024 single filer; excludes state tax', ja: '2024年シングル申告、州税除く', fr: '2024 déclarant unique, hors impôt d\'état', es: '2024 declarante único, sin impuesto estatal', zh: '2024年单身报税，不含州税', },
  },
  JP: {
    name: { ko: '🇯🇵 일본', en: '🇯🇵 Japan', ja: '🇯🇵 日本', fr: '🇯🇵 Japon', es: '🇯🇵 Japón', zh: '🇯🇵 日本', },
    flag: '🇯🇵', currency: 'JPY', currencySymbol: '¥',
    brackets: [
      { min: 0,         max: 1950000,  rate: 0.05 },
      { min: 1950000,   max: 3300000,  rate: 0.10 },
      { min: 3300000,   max: 6950000,  rate: 0.20 },
      { min: 6950000,   max: 9000000,  rate: 0.23 },
      { min: 9000000,   max: 18000000, rate: 0.33 },
      { min: 18000000,  max: 40000000, rate: 0.40 },
      { min: 40000000,  max: Infinity, rate: 0.45 },
    ],
    standardDeduction: 480000,
    socialInsuranceRate: 0.1515, // approx pension + health + unemployment
    notes: { ko: '2024년 기준, 주민세 별도', en: '2024 rates; local inhabitant tax separate', ja: '2024年基準、住民税別途', fr: '2024, taxe d\'habitation séparée', es: '2024, impuesto de residencia aparte', zh: '2024年，住民税另计', },
  },
  FR: {
    name: { ko: '🇫🇷 프랑스', en: '🇫🇷 France', ja: '🇫🇷 フランス', fr: '🇫🇷 France', es: '🇫🇷 Francia', zh: '🇫🇷 法国', },
    flag: '🇫🇷', currency: 'EUR', currencySymbol: '€',
    brackets: [
      { min: 0,      max: 11294, rate: 0.00 },
      { min: 11294,  max: 28797, rate: 0.11 },
      { min: 28797,  max: 82341, rate: 0.30 },
      { min: 82341,  max: 177106,rate: 0.41 },
      { min: 177106, max: Infinity, rate: 0.45 },
    ],
    standardDeduction: 10000,
    socialInsuranceRate: 0.22, // approx salarié contributions
    notes: { ko: '2024년 기준 단순화 추정치', en: '2024 simplified estimate; actual deductions vary', ja: '2024年単純化試算', fr: '2024, estimation simplifiée', es: '2024, estimación simplificada', zh: '2024年简化估算', },
  },
  ES: {
    name: { ko: '🇪🇸 스페인', en: '🇪🇸 Spain', ja: '🇪🇸 スペイン', fr: '🇪🇸 Espagne', es: '🇪🇸 España', zh: '🇪🇸 西班牙', },
    flag: '🇪🇸', currency: 'EUR', currencySymbol: '€',
    brackets: [
      { min: 0,       max: 12450,  rate: 0.19 },
      { min: 12450,   max: 20200,  rate: 0.24 },
      { min: 20200,   max: 35200,  rate: 0.30 },
      { min: 35200,   max: 60000,  rate: 0.37 },
      { min: 60000,   max: 300000, rate: 0.45 },
      { min: 300000,  max: Infinity, rate: 0.47 },
    ],
    standardDeduction: 5550,
    socialInsuranceRate: 0.0635, // employee contribution approx
    notes: { ko: '2024년 국세 기준', en: '2024 national rate; regional surcharges vary', ja: '2024年国税基準', fr: '2024, taux national; taux régionaux variables', es: '2024, tipo estatal; recargos autonómicos variables', zh: '2024年国税基准，地方税另计', },
  },
  CN: {
    name: { ko: '🇨🇳 중국', en: '🇨🇳 China', ja: '🇨🇳 中国', fr: '🇨🇳 Chine', es: '🇨🇳 China', zh: '🇨🇳 中国', },
    flag: '🇨🇳', currency: 'CNY', currencySymbol: '¥',
    brackets: [
      { min: 0,       max: 36000,  rate: 0.03 },
      { min: 36000,   max: 144000, rate: 0.10 },
      { min: 144000,  max: 300000, rate: 0.20 },
      { min: 300000,  max: 420000, rate: 0.25 },
      { min: 420000,  max: 660000, rate: 0.30 },
      { min: 660000,  max: 960000, rate: 0.35 },
      { min: 960000,  max: Infinity, rate: 0.45 },
    ],
    standardDeduction: 60000, // annual basic deduction
    socialInsuranceRate: 0.1025, // approx employee share
    notes: { ko: '근로소득 기준, 전문항목 공제 전', en: 'Employment income; before special deductions', ja: '給与所得基準、専項控除前', fr: 'Revenus salariaux avant déductions spéciales', es: 'Ingresos laborales antes de deducciones especiales', zh: '薪资所得，扣除专项前', },
  },
  TW: {
    name: { ko: '🇹🇼 대만', en: '🇹🇼 Taiwan', ja: '🇹🇼 台湾', fr: '🇹🇼 Taïwan', es: '🇹🇼 Taiwán', zh: '🇹🇼 台灣', },
    flag: '🇹🇼', currency: 'TWD', currencySymbol: 'NT$',
    brackets: [
      { min: 0,         max: 560000,   rate: 0.05 },
      { min: 560000,    max: 1260000,  rate: 0.12 },
      { min: 1260000,   max: 2520000,  rate: 0.20 },
      { min: 2520000,   max: 4720000,  rate: 0.30 },
      { min: 4720000,   max: Infinity, rate: 0.40 },
    ],
    standardDeduction: 124000,
    socialInsuranceRate: 0.0566,
    notes: { ko: '2024년 기준, 표준공제 적용 전 단순 추정치', en: '2024 rates, simplified before itemized deductions', ja: '2024年基準', fr: '2024, avant déductions détaillées', es: '2024, antes de deducciones detalladas', zh: '2024年，扣除明细前的简易估算', },
  },
};

const COUNTRY_CODES = ['KR', 'US', 'JP', 'FR', 'ES', 'CN', 'TW'] as const;
type CountryCode = typeof COUNTRY_CODES[number];

function calcTax(grossIncome: number, config: CountryTaxConfig): {
  taxableIncome: number;
  incomeTax: number;
  socialInsurance: number;
  totalTax: number;
  netIncome: number;
  effectiveRate: number;
  marginalRate: number;
  bracketBreakdown: Array<{ range: string; rate: number; tax: number }>;
} {
  const taxableIncome = Math.max(0, grossIncome - config.standardDeduction);
  const socialInsurance = grossIncome * config.socialInsuranceRate;

  let incomeTax = 0;
  const bracketBreakdown: Array<{ range: string; rate: number; tax: number }> = [];
  let marginalRate = 0;

  for (const bracket of config.brackets) {
    if (taxableIncome <= bracket.min) break;
    const taxable = Math.min(taxableIncome, bracket.max) - bracket.min;
    const tax = taxable * bracket.rate;
    incomeTax += tax;
    marginalRate = bracket.rate;
    bracketBreakdown.push({
      range: `${bracket.min.toLocaleString()} – ${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString()}`,
      rate: bracket.rate,
      tax,
    });
  }

  const totalTax = incomeTax + socialInsurance;
  const netIncome = grossIncome - totalTax;
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;

  return { taxableIncome, incomeTax, socialInsurance, totalTax, netIncome, effectiveRate, marginalRate, bracketBreakdown };
}

const L: Record<Locale, {
  title: string; subtitle: string; country: string; grossIncome: string;
  calc: string; incomeTax: string; socialInsurance: string; totalTax: string;
  netIncome: string; effectiveRate: string; marginalRate: string;
  taxableIncome: string; brackets: string; disclaimer: string;
  monthly: string;
}> = {
  ko: { title: '글로벌 소득세 계산기', subtitle: 'Global Income Tax Calculator', country: '국가', grossIncome: '연간 총소득', calc: '계산하기', incomeTax: '소득세', socialInsurance: '4대보험 (추정)', totalTax: '총 세금·공과금', netIncome: '실수령 연봉', effectiveRate: '실효 세율', marginalRate: '한계 세율', taxableIncome: '과세 소득', brackets: '세율 구간 상세', disclaimer: '실제 세금은 개인 공제, 가족 상황 등에 따라 다를 수 있습니다.', monthly: '월 실수령' },
  en: { title: 'Global Income Tax Calculator', subtitle: 'Compare tax across 7 countries', country: 'Country', grossIncome: 'Annual Gross Income', calc: 'Calculate', incomeTax: 'Income Tax', socialInsurance: 'Social Insurance (est.)', totalTax: 'Total Tax & Contributions', netIncome: 'Net Annual Income', effectiveRate: 'Effective Rate', marginalRate: 'Marginal Rate', taxableIncome: 'Taxable Income', brackets: 'Tax Bracket Breakdown', disclaimer: 'Actual tax varies by personal deductions, family situation, etc.', monthly: 'Monthly Net' },
  ja: { title: 'グローバル所得税計算機', subtitle: '7カ国の税金比較', country: '国', grossIncome: '年間総収入', calc: '計算する', incomeTax: '所得税', socialInsurance: '社会保険料（概算）', totalTax: '税金・社会保険合計', netIncome: '年間手取り', effectiveRate: '実効税率', marginalRate: '限界税率', taxableIncome: '課税所得', brackets: '税率ブラケット詳細', disclaimer: '実際の税金は個人控除・家族状況等により異なります。', monthly: '月手取り' },
  fr: { title: 'Calculateur Impôt Mondial', subtitle: 'Comparer la fiscalité dans 7 pays', country: 'Pays', grossIncome: 'Revenu Brut Annuel', calc: 'Calculer', incomeTax: 'Impôt sur le revenu', socialInsurance: 'Cotisations sociales (est.)', totalTax: 'Total impôts et cotisations', netIncome: 'Revenu Net Annuel', effectiveRate: 'Taux effectif', marginalRate: 'Taux marginal', taxableIncome: 'Revenu imposable', brackets: 'Détail des tranches', disclaimer: "L'impôt réel varie selon les déductions personnelles et la situation familiale.", monthly: 'Net mensuel' },
  es: { title: 'Calculadora Global de IRPF', subtitle: 'Compara impuestos en 7 países', country: 'País', grossIncome: 'Ingresos Brutos Anuales', calc: 'Calcular', incomeTax: 'IRPF', socialInsurance: 'Seguridad Social (est.)', totalTax: 'Total impuestos y SS', netIncome: 'Renta Neta Anual', effectiveRate: 'Tipo efectivo', marginalRate: 'Tipo marginal', taxableIncome: 'Base imponible', brackets: 'Desglose de tramos', disclaimer: 'El impuesto real varía según deducciones personales y situación familiar.', monthly: 'Neto mensual' },
  zh: { title: '全球所得税计算器', subtitle: '7个国家税率比较', country: '国家', grossIncome: '年度税前收入', calc: '计算', incomeTax: '所得税', socialInsurance: '社会保险（估算）', totalTax: '税金及保险合计', netIncome: '年度实得收入', effectiveRate: '实际税率', marginalRate: '边际税率', taxableIncome: '应税收入', brackets: '税率级距明细', disclaimer: '实际税金因个人扣除、家庭状况等而异。', monthly: '月实得' },
};

// Default incomes per country to make the initial state useful
const DEFAULT_INCOME: Record<CountryCode, number> = {
  KR: 60000000,
  US: 80000,
  JP: 6000000,
  FR: 45000,
  ES: 35000,
  CN: 300000,
  TW: 1000000,
};

function fmtNum(n: number, sym: string): string {
  if (Math.abs(n) >= 1000000) return `${sym}${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${sym}${(n / 1000).toFixed(0)}K`;
  return `${sym}${n.toFixed(0)}`;
}

const GlobalIncomeTaxCalculator: React.FC<{ locale?: Locale }> = ({ locale = 'en' }) => {
  const t = L[locale] ?? L.en;
  const [country, setCountry] = useState<CountryCode>('KR');
  const [income, setIncome] = useState<number>(DEFAULT_INCOME['KR']);
  const [showBrackets, setShowBrackets] = useState(false);

  const config = COUNTRIES[country];

  const result = useMemo(() => calcTax(income, config), [income, config]);

  const handleCountryChange = (c: CountryCode) => {
    setCountry(c);
    setIncome(DEFAULT_INCOME[c]);
  };

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Country selector */}
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">{t.country}</p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {COUNTRY_CODES.map(code => (
            <button
              key={code}
              onClick={() => handleCountryChange(code)}
              className={`py-2 px-1 rounded-xl text-xs font-black border-2 transition-all ${country === code ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
            >
              {COUNTRIES[code].flag}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm font-bold">{config.name[locale]}</p>
      </div>

      {/* Income input */}
      <div className="mb-6">
        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-2">
          {t.grossIncome} ({config.currency})
        </label>
        <div className="flex gap-2 items-center">
          <span className="text-lg font-black text-muted-foreground">{config.currencySymbol}</span>
          <input
            type="number"
            min={0}
            value={income}
            onChange={e => setIncome(Number(e.target.value))}
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/20 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary text-right"
          />
        </div>
      </div>

      {/* Results */}
      {income > 0 && (
        <div className="space-y-4">
          {/* Key numbers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-success/10 border border-success/30 col-span-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.netIncome}</p>
              <p className="text-4xl font-black text-success">{fmtNum(result.netIncome, config.currencySymbol)}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.monthly}: {fmtNum(result.netIncome / 12, config.currencySymbol)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/20 border border-border">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.effectiveRate}</p>
              <p className="text-2xl font-black text-destructive">{(result.effectiveRate * 100).toFixed(1)}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/20 border border-border">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.marginalRate}</p>
              <p className="text-2xl font-black">{(result.marginalRate * 100).toFixed(0)}%</p>
            </div>
          </div>

          {/* Tax breakdown */}
          <div className="space-y-2 p-4 rounded-2xl bg-muted/20 border border-border">
            {[
              { label: t.taxableIncome, value: fmtNum(result.taxableIncome, config.currencySymbol), sub: true },
              { label: t.incomeTax, value: fmtNum(result.incomeTax, config.currencySymbol), sub: true },
              { label: t.socialInsurance, value: fmtNum(result.socialInsurance, config.currencySymbol), sub: true },
              { label: t.totalTax, value: fmtNum(result.totalTax, config.currencySymbol), sub: false },
            ].map(({ label, value, sub }) => (
              <div key={label} className={`flex justify-between text-sm py-1.5 ${sub ? 'border-b border-border/40' : 'font-black'}`}>
                <span className={sub ? 'text-muted-foreground' : ''}>{label}</span>
                <span className={`tabular-nums ${!sub ? 'text-destructive' : ''}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Visual bar */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1">
              <span>Tax {(result.effectiveRate * 100).toFixed(1)}%</span>
              <span>Net {((1 - result.effectiveRate) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-4 rounded-full bg-success/15 overflow-hidden">
              <div
                className="h-full bg-destructive/40 rounded-full transition-all duration-700"
                style={{ width: `${result.effectiveRate * 100}%` }}
              />
            </div>
          </div>

          {/* Bracket toggle */}
          <button
            onClick={() => setShowBrackets(b => !b)}
            className="w-full py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-accent transition-colors"
          >
            {showBrackets ? '▲' : '▼'} {t.brackets}
          </button>

          {showBrackets && (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left p-3 font-black text-muted-foreground">Range ({config.currency})</th>
                    <th className="text-right p-3 font-black text-muted-foreground">Rate</th>
                    <th className="text-right p-3 font-black text-muted-foreground">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {result.bracketBreakdown.map((b, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="p-3 tabular-nums text-muted-foreground">{b.range}</td>
                      <td className="p-3 text-right font-bold">{(b.rate * 100).toFixed(0)}%</td>
                      <td className="p-3 text-right tabular-nums font-bold text-destructive">{fmtNum(b.tax, config.currencySymbol)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Note */}
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{t.disclaimer} {config.notes[locale]}</p>
        </div>
      )}
    </div>
  );
};

export default GlobalIncomeTaxCalculator;
