'use client';

import React, { useState, useMemo } from 'react';

// ── Shared helpers ────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const pct = (v: number, total: number) => total === 0 ? 0 : Math.round((v / total) * 100);

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step, onChange, unit = '조원' }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between text-xs">
      <span className="text-slate-600">{label}</span>
      <span className="font-bold text-emerald-700">{fmt(value)} {unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-emerald-600"
      aria-label={label}
    />
    <div className="flex justify-between text-xs text-slate-400">
      <span>{fmt(min)}</span>
      <span>{fmt(max)}</span>
    </div>
  </div>
);

// ── GDP Calculator ────────────────────────────────────────────────────────────

interface GDPState {
  approach: 'expenditure' | 'income' | 'production';
  // Expenditure
  consumption: number;
  investment: number;
  government: number;
  exports: number;
  imports: number;
  // Income
  wages: number;
  interest: number;
  rent: number;
  profit: number;
  // Production
  primarySector: number;
  secondarySector: number;
  tertiarySector: number;
  // Deflator
  showReal: boolean;
  nominalGDP: number;
  deflator: number;
}

export const GDPCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [s, setS] = useState<GDPState>({
    approach: 'expenditure',
    consumption: 1000,
    investment: 500,
    government: 300,
    exports: 700,
    imports: 400,
    wages: 1200,
    interest: 150,
    rent: 200,
    profit: 550,
    primarySector: 100,
    secondarySector: 800,
    tertiarySector: 1300,
    showReal: false,
    nominalGDP: 2100,
    deflator: 110,
  });

  const gdp = useMemo(() => {
    if (s.approach === 'expenditure') return s.consumption + s.investment + s.government + (s.exports - s.imports);
    if (s.approach === 'income') return s.wages + s.interest + s.rent + s.profit;
    return s.primarySector + s.secondarySector + s.tertiarySector;
  }, [s]);

  const realGDP = useMemo(() => (s.nominalGDP / s.deflator) * 100, [s.nominalGDP, s.deflator]);

  const set = (field: keyof GDPState) => (v: number) => setS((prev) => ({ ...prev, [field]: v }));

  const tabs = [
    { key: 'expenditure' as const, ko: '지출접근법', en: 'Expenditure' },
    { key: 'income' as const, ko: '소득접근법', en: 'Income' },
    { key: 'production' as const, ko: '생산접근법', en: 'Production' },
  ];

  const expenditureItems = [
    { label: locale === 'ko' ? '소비 (C)' : 'Consumption (C)', value: s.consumption, onChange: set('consumption') },
    { label: locale === 'ko' ? '투자 (I)' : 'Investment (I)', value: s.investment, onChange: set('investment') },
    { label: locale === 'ko' ? '정부지출 (G)' : 'Government (G)', value: s.government, onChange: set('government') },
    { label: locale === 'ko' ? '수출 (X)' : 'Exports (X)', value: s.exports, onChange: set('exports') },
    { label: locale === 'ko' ? '수입 (M)' : 'Imports (M)', value: s.imports, onChange: set('imports') },
  ];

  const incomeItems = [
    { label: locale === 'ko' ? '임금' : 'Wages', value: s.wages, onChange: set('wages') },
    { label: locale === 'ko' ? '이자' : 'Interest', value: s.interest, onChange: set('interest') },
    { label: locale === 'ko' ? '지대' : 'Rent', value: s.rent, onChange: set('rent') },
    { label: locale === 'ko' ? '이윤' : 'Profit', value: s.profit, onChange: set('profit') },
  ];

  const productionItems = [
    { label: locale === 'ko' ? '1차 산업 (농·임·어업)' : 'Primary (Agri)', value: s.primarySector, onChange: set('primarySector') },
    { label: locale === 'ko' ? '2차 산업 (제조·건설)' : 'Secondary (Mfg)', value: s.secondarySector, onChange: set('secondarySector') },
    { label: locale === 'ko' ? '3차 산업 (서비스)' : 'Tertiary (Services)', value: s.tertiarySector, onChange: set('tertiarySector') },
  ];

  const currentItems = s.approach === 'expenditure' ? expenditureItems : s.approach === 'income' ? incomeItems : productionItems;

  return (
    <div className="bg-white border border-emerald-200 rounded-2xl p-5">
      <h4 className="text-base font-bold text-emerald-900 mb-4">
        {locale === 'ko' ? 'GDP 계산기' : 'GDP Calculator'}
      </h4>

      {/* Approach selector */}
      <div className="flex gap-2 mb-5" role="group" aria-label={locale === 'ko' ? '접근법 선택' : 'Approach selection'}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setS((prev) => ({ ...prev, approach: t.key }))}
            aria-pressed={s.approach === t.key}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
              s.approach === t.key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            {locale === 'ko' ? t.ko : t.en}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-4 mb-5">
        {currentItems.map((item) => (
          <SliderRow
            key={item.label}
            label={item.label}
            value={item.value}
            min={0}
            max={2000}
            step={50}
            onChange={item.onChange}
          />
        ))}
      </div>

      {/* Formula display */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
        <p className="text-xs font-bold text-emerald-700 mb-1">
          {s.approach === 'expenditure'
            ? 'GDP = C + I + G + (X - M)'
            : s.approach === 'income'
            ? locale === 'ko' ? 'GDP = 임금 + 이자 + 지대 + 이윤' : 'GDP = Wages + Interest + Rent + Profit'
            : locale === 'ko' ? 'GDP = 1차 + 2차 + 3차 부가가치' : 'GDP = Primary + Secondary + Tertiary VA'}
        </p>
        <p className="text-2xl font-bold text-emerald-800">
          {fmt(gdp)} {locale === 'ko' ? '조원' : 'T KRW'}
        </p>
      </div>

      {/* Component bars (expenditure approach) */}
      {s.approach === 'expenditure' && gdp > 0 && (
        <div className="space-y-1.5 mb-5">
          {[
            { label: 'C', value: s.consumption, color: 'bg-emerald-400' },
            { label: 'I', value: s.investment, color: 'bg-blue-400' },
            { label: 'G', value: s.government, color: 'bg-amber-400' },
            { label: 'X-M', value: s.exports - s.imports, color: 'bg-rose-400' },
          ].map((bar) => (
            <div key={bar.label} className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 w-8">{bar.label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all ${bar.color}`}
                  style={{ width: `${Math.max(0, pct(bar.value, gdp))}%` }}
                  role="meter"
                  aria-valuenow={bar.value}
                  aria-label={bar.label}
                />
              </div>
              <span className="text-xs text-slate-500 w-12 text-right">{pct(bar.value, gdp)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Real vs Nominal toggle */}
      <div className="border-t border-emerald-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setS((prev) => ({ ...prev, showReal: !prev.showReal }))}
            aria-pressed={s.showReal}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              s.showReal ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200'
            }`}
          >
            {locale === 'ko' ? '실질GDP 계산기' : 'Real GDP Calculator'}
          </button>
        </div>

        {s.showReal && (
          <div className="space-y-3">
            <SliderRow
              label={locale === 'ko' ? '명목GDP' : 'Nominal GDP'}
              value={s.nominalGDP}
              min={100}
              max={5000}
              step={50}
              onChange={set('nominalGDP')}
            />
            <SliderRow
              label={locale === 'ko' ? 'GDP 디플레이터' : 'GDP Deflator'}
              value={s.deflator}
              min={80}
              max={200}
              step={1}
              onChange={set('deflator')}
              unit=""
            />
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 mb-1">
                {locale === 'ko' ? '실질GDP = 명목GDP / 디플레이터 × 100' : 'Real GDP = Nominal GDP / Deflator × 100'}
              </p>
              <p className="text-xl font-bold text-blue-800">
                {fmt(realGDP)} {locale === 'ko' ? '조원' : 'T KRW'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Multiplier Calculator ─────────────────────────────────────────────────────

export const MultiplierCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [mpc, setMpc] = useState(0.8);
  const [deltaG, setDeltaG] = useState(100);

  const multiplier = useMemo(() => 1 / (1 - mpc), [mpc]);
  const deltaY = useMemo(() => multiplier * deltaG, [multiplier, deltaG]);

  // Geometric series — first 6 rounds
  const rounds = useMemo(() => {
    const arr: number[] = [];
    let current = deltaG;
    for (let i = 0; i < 6; i++) {
      arr.push(current);
      current = current * mpc;
    }
    return arr;
  }, [deltaG, mpc]);

  return (
    <div className="bg-white border border-emerald-200 rounded-2xl p-5">
      <h4 className="text-base font-bold text-emerald-900 mb-4">
        {locale === 'ko' ? '케인즈 승수 계산기' : 'Keynesian Multiplier Calculator'}
      </h4>

      <div className="space-y-4 mb-5">
        <SliderRow
          label={locale === 'ko' ? '한계소비성향 (MPC)' : 'Marginal Propensity to Consume (MPC)'}
          value={mpc}
          min={0.1}
          max={0.99}
          step={0.01}
          onChange={setMpc}
          unit=""
        />
        <SliderRow
          label={locale === 'ko' ? '정부지출 변화 ΔG (조원)' : 'Government Spending Change ΔG'}
          value={deltaG}
          min={10}
          max={1000}
          step={10}
          onChange={setDeltaG}
        />
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-xs text-emerald-600 mb-1">
            {locale === 'ko' ? '승수 k = 1/(1-MPC)' : 'Multiplier k = 1/(1-MPC)'}
          </p>
          <p className="text-2xl font-bold text-emerald-800">{fmt(multiplier)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-xs text-blue-600 mb-1">
            {locale === 'ko' ? 'GDP 변화 ΔY = k × ΔG' : 'GDP Change ΔY = k × ΔG'}
          </p>
          <p className="text-2xl font-bold text-blue-800">{fmt(deltaY)} {locale === 'ko' ? '조원' : 'T KRW'}</p>
        </div>
      </div>

      {/* Balanced budget multiplier note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-800">
        <span className="font-bold">{locale === 'ko' ? '균형재정승수: ' : 'Balanced Budget Multiplier: '}</span>
        {locale === 'ko'
          ? '정부지출과 세금을 동일하게 늘리면 승수 = 1 (GDP는 지출 증가분만큼 정확히 증가)'
          : 'When G and T increase equally, the multiplier = 1 (GDP rises exactly by the spending increase)'}
      </div>

      {/* Geometric series visualization */}
      <div>
        <p className="text-xs font-bold text-slate-600 mb-2">
          {locale === 'ko' ? '파급 효과 (라운드별 소비 증가)' : 'Ripple Effect (Consumption increase per round)'}
        </p>
        <div className="space-y-1.5">
          {rounds.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-14">
                {locale === 'ko' ? `${i + 1}라운드` : `Round ${i + 1}`}
              </span>
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${(val / deltaG) * 100}%` }}
                  role="meter"
                  aria-valuenow={val}
                  aria-label={`Round ${i + 1}`}
                />
              </div>
              <span className="text-xs text-slate-600 w-20 text-right">{fmt(val)}</span>
            </div>
          ))}
          <p className="text-xs text-slate-400 text-right">
            {locale === 'ko' ? '(무한 합계 → ΔY)' : '(Infinite sum → ΔY)'}
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Inflation Calculator ──────────────────────────────────────────────────────

export const InflationCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [baseYear, setBaseYear] = useState(2020);
  const [compareYear, setCompareYear] = useState(2025);
  const [baseCPI, setBaseCPI] = useState(100);
  const [compareCPI, setCompareCPI] = useState(115);
  const [nominalIncome, setNominalIncome] = useState(5000);
  const [nominalRate, setNominalRate] = useState(5);
  const [expectedInflation, setExpectedInflation] = useState(2.5);

  const inflationRate = useMemo(
    () => ((compareCPI - baseCPI) / baseCPI) * 100,
    [baseCPI, compareCPI]
  );
  const realIncome = useMemo(
    () => (nominalIncome / compareCPI) * baseCPI,
    [nominalIncome, baseCPI, compareCPI]
  );
  const purchasingPowerChange = useMemo(
    () => ((realIncome - nominalIncome) / nominalIncome) * 100,
    [realIncome, nominalIncome]
  );
  const realRate = useMemo(
    () => nominalRate - expectedInflation,
    [nominalRate, expectedInflation]
  );

  return (
    <div className="bg-white border border-emerald-200 rounded-2xl p-5">
      <h4 className="text-base font-bold text-emerald-900 mb-4">
        {locale === 'ko' ? '인플레이션 계산기' : 'Inflation Calculator'}
      </h4>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: locale === 'ko' ? '기준년도' : 'Base Year', value: baseYear, set: setBaseYear, min: 2000, max: 2030, step: 1 },
          { label: locale === 'ko' ? '비교년도' : 'Compare Year', value: compareYear, set: setCompareYear, min: 2000, max: 2030, step: 1 },
          { label: locale === 'ko' ? '기준년 CPI' : 'Base CPI', value: baseCPI, set: setBaseCPI, min: 50, max: 200, step: 1 },
          { label: locale === 'ko' ? '비교년 CPI' : 'Compare CPI', value: compareCPI, set: setCompareCPI, min: 50, max: 200, step: 1 },
        ].map(({ label, value, set, min, max, step }) => (
          <div key={label}>
            <label className="block text-xs text-slate-500 mb-1">{label}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => set(parseFloat(e.target.value) || 0)}
              min={min}
              max={max}
              step={step}
              className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-label={label}
            />
          </div>
        ))}
      </div>

      <SliderRow
        label={locale === 'ko' ? `명목소득 (${baseYear}년 기준, 만원)` : `Nominal Income (base ${baseYear}, 10K KRW)`}
        value={nominalIncome}
        min={1000}
        max={20000}
        step={100}
        onChange={setNominalIncome}
        unit={locale === 'ko' ? '만원' : '10K'}
      />

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-5">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-xs text-emerald-600 mb-1">
            {locale === 'ko' ? '인플레이션율' : 'Inflation Rate'}
          </p>
          <p className={`text-xl font-bold ${inflationRate > 0 ? 'text-rose-600' : 'text-blue-600'}`}>
            {fmt(inflationRate)}%
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-xs text-blue-600 mb-1">
            {locale === 'ko' ? '실질소득' : 'Real Income'}
          </p>
          <p className="text-xl font-bold text-blue-800">
            {fmt(realIncome)} {locale === 'ko' ? '만원' : '10K'}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-xs text-amber-600 mb-1">
            {locale === 'ko' ? '구매력 변화' : 'Purchasing Power Change'}
          </p>
          <p className={`text-xl font-bold ${purchasingPowerChange < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {fmt(purchasingPowerChange)}%
          </p>
        </div>
      </div>

      {/* Fisher equation */}
      <div className="border-t border-emerald-100 pt-4">
        <p className="text-xs font-bold text-emerald-700 mb-3">
          {locale === 'ko' ? '피셔 방정식 (Fisher Equation)' : 'Fisher Equation'}
        </p>
        <div className="space-y-3">
          <SliderRow
            label={locale === 'ko' ? '명목이자율 (%)' : 'Nominal Interest Rate (%)'}
            value={nominalRate}
            min={0}
            max={20}
            step={0.1}
            onChange={setNominalRate}
            unit="%"
          />
          <SliderRow
            label={locale === 'ko' ? '기대인플레이션율 (%)' : 'Expected Inflation Rate (%)'}
            value={expectedInflation}
            min={-2}
            max={15}
            step={0.1}
            onChange={setExpectedInflation}
            unit="%"
          />
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-xs font-bold text-emerald-700 mb-1">
              {locale === 'ko' ? '실질이자율 = 명목이자율 − 기대인플레이션율' : 'Real Rate = Nominal Rate − Expected Inflation'}
            </p>
            <p className={`text-2xl font-bold ${realRate < 0 ? 'text-rose-600' : 'text-emerald-800'}`}>
              {fmt(realRate)}%
            </p>
            {realRate < 0 && (
              <p className="text-xs text-rose-600 mt-1">
                {locale === 'ko' ? '음의 실질이자율: 인플레이션이 명목이자율보다 높습니다.' : 'Negative real rate: inflation exceeds the nominal rate.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Wrapper for standalone page ───────────────────────────────────────────────

type MacroTab = 'gdp' | 'multiplier' | 'inflation';

export const MacroCalculators: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [activeTab, setActiveTab] = useState<MacroTab>('gdp');

  const tabs: Array<{ key: MacroTab; ko: string; en: string }> = [
    { key: 'gdp', ko: 'GDP 계산기', en: 'GDP' },
    { key: 'multiplier', ko: '승수 계산기', en: 'Multiplier' },
    { key: 'inflation', ko: '인플레이션', en: 'Inflation' },
  ];

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-2">
        {locale === 'ko' ? '거시경제 계산기' : 'Macroeconomics Calculator'}
      </h3>
      <p className="text-sm text-emerald-600 mb-6">
        {locale === 'ko'
          ? 'GDP 접근법별 계산, 케인즈 승수, 인플레이션·피셔 방정식을 대화형으로 탐구하세요.'
          : 'Explore GDP approaches, the Keynesian multiplier, and inflation/Fisher equation interactively.'}
      </p>

      {/* Tab selector */}
      <div className="flex gap-2 mb-6" role="tablist" aria-label={locale === 'ko' ? '계산기 선택' : 'Calculator selection'}>
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
              activeTab === t.key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            {locale === 'ko' ? t.ko : t.en}
          </button>
        ))}
      </div>

      {activeTab === 'gdp' && <GDPCalculator locale={locale} />}
      {activeTab === 'multiplier' && <MultiplierCalculator locale={locale} />}
      {activeTab === 'inflation' && <InflationCalculator locale={locale} />}
    </div>
  );
};

export default MacroCalculators;
