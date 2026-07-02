'use client';

import React, { useState, useMemo } from 'react';

// ── Shared helpers ────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 0 });

interface NumFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}

const NumField: React.FC<NumFieldProps> = ({ label, value, onChange, unit = '원' }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-slate-600">{label}</label>
    <div className="flex items-center border border-emerald-200 rounded-xl overflow-hidden">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 px-3 py-2 text-sm focus:outline-none"
        aria-label={label}
      />
      {unit && <span className="px-2 text-xs text-slate-500 bg-slate-50 border-l border-emerald-100 py-2">{unit}</span>}
    </div>
  </div>
);

interface ResultRowProps {
  label: string;
  value: number;
  highlight?: boolean;
  unit?: string;
}

const ResultRow: React.FC<ResultRowProps> = ({ label, value, highlight = false, unit = '원' }) => (
  <div className={`flex justify-between items-center py-2 border-b border-emerald-100 ${highlight ? 'bg-emerald-50 rounded-lg px-2' : ''}`}>
    <span className="text-sm text-slate-600">{label}</span>
    <span className={`text-sm font-bold ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>
      {fmt(value)} {unit}
    </span>
  </div>
);

// ── Tab 1: Traditional Costing ────────────────────────────────────────────────

const TraditionalCosting: React.FC<{ locale: 'ko' | 'en' }> = ({ locale }) => {
  const [dm, setDm] = useState(500000);
  const [dl, setDl] = useState(300000);
  const [ohRate, setOhRate] = useState(150);
  const [units, setUnits] = useState(100);

  const overhead = useMemo(() => dl * (ohRate / 100), [dl, ohRate]);
  const primeCost = useMemo(() => dm + dl, [dm, dl]);
  const conversionCost = useMemo(() => dl + overhead, [dl, overhead]);
  const totalCost = useMemo(() => dm + dl + overhead, [dm, dl, overhead]);
  const unitCost = useMemo(() => (units > 0 ? totalCost / units : 0), [totalCost, units]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumField label={locale === 'ko' ? '직접재료비 (DM)' : 'Direct Materials (DM)'} value={dm} onChange={setDm} />
        <NumField label={locale === 'ko' ? '직접노무비 (DL)' : 'Direct Labor (DL)'} value={dl} onChange={setDl} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-600">
            {locale === 'ko' ? '제조간접비율 (직접노무비 대비 %)' : 'Overhead Rate (% of DL)'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={ohRate}
              onChange={(e) => setOhRate(parseInt(e.target.value))}
              className="flex-1 accent-emerald-600"
              aria-label={locale === 'ko' ? '제조간접비율' : 'Overhead rate'}
            />
            <span className="text-sm font-bold text-emerald-700 w-16 text-right">{ohRate}%</span>
          </div>
        </div>
        <NumField label={locale === 'ko' ? '생산량 (단위)' : 'Units Produced'} value={units} onChange={setUnits} unit={locale === 'ko' ? '개' : 'units'} />
      </div>

      <div className="bg-white border border-emerald-200 rounded-2xl p-4">
        <p className="text-sm font-bold text-emerald-800 mb-3">
          {locale === 'ko' ? '원가 계산 결과' : 'Cost Calculation Results'}
        </p>
        <div className="space-y-0.5">
          <ResultRow label={locale === 'ko' ? '직접재료비' : 'Direct Materials'} value={dm} />
          <ResultRow label={locale === 'ko' ? '직접노무비' : 'Direct Labor'} value={dl} />
          <ResultRow label={locale === 'ko' ? '제조간접비' : 'Manufacturing Overhead'} value={overhead} />
          <ResultRow label={locale === 'ko' ? '주요원가 (DM + DL)' : 'Prime Cost (DM + DL)'} value={primeCost} />
          <ResultRow label={locale === 'ko' ? '가공원가 (DL + OH)' : 'Conversion Cost (DL + OH)'} value={conversionCost} />
          <ResultRow label={locale === 'ko' ? '총제조원가' : 'Total Manufacturing Cost'} value={totalCost} highlight />
          <ResultRow label={locale === 'ko' ? '단위당 원가' : 'Unit Cost'} value={unitCost} highlight />
        </div>
      </div>
    </div>
  );
};

// ── Tab 2: ABC Costing ────────────────────────────────────────────────────────

const ABCCosting: React.FC<{ locale: 'ko' | 'en' }> = ({ locale }) => {
  // Cost pools
  const [setupCost, setSetupCost] = useState(2000000);
  const [machineCost, setMachineCost] = useState(3000000);
  // Product A
  const [aUnits, setAUnits] = useState(200);
  const [aSetups, setASetups] = useState(10);
  const [aMachineHrs, setAMachineHrs] = useState(100);
  const [aDM, setADM] = useState(500000);
  const [aDL, setADL] = useState(300000);
  // Product B
  const [bUnits, setBUnits] = useState(100);
  const [bSetups, setBSetups] = useState(40);
  const [bMachineHrs, setBMachineHrs] = useState(200);
  const [bDM, setBDM] = useState(800000);
  const [bDL, setBDL] = useState(400000);

  const totalSetups = aSetups + bSetups;
  const totalMachineHrs = aMachineHrs + bMachineHrs;
  const totalOH = setupCost + machineCost;

  const setupRate = totalSetups > 0 ? setupCost / totalSetups : 0;
  const machineRate = totalMachineHrs > 0 ? machineCost / totalMachineHrs : 0;

  const aOH_ABC = aSetups * setupRate + aMachineHrs * machineRate;
  const bOH_ABC = bSetups * setupRate + bMachineHrs * machineRate;

  const aTotal = aDM + aDL + aOH_ABC;
  const bTotal = bDM + bDL + bOH_ABC;

  const aUnitCost_ABC = aUnits > 0 ? aTotal / aUnits : 0;
  const bUnitCost_ABC = bUnits > 0 ? bTotal / bUnits : 0;

  // Traditional comparison
  const totalDL = aDL + bDL;
  const tradRate = totalDL > 0 ? totalOH / totalDL : 0;
  const aOH_Trad = aDL * tradRate;
  const bOH_Trad = bDL * tradRate;
  const aUnitCost_Trad = aUnits > 0 ? (aDM + aDL + aOH_Trad) / aUnits : 0;
  const bUnitCost_Trad = bUnits > 0 ? (bDM + bDL + bOH_Trad) / bUnits : 0;

  return (
    <div className="space-y-6">
      {/* Cost pools */}
      <div>
        <p className="text-sm font-bold text-emerald-800 mb-3">
          {locale === 'ko' ? '원가 집합 (Cost Pools)' : 'Cost Pools'}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <NumField label={locale === 'ko' ? '셋업 비용 풀' : 'Setup Cost Pool'} value={setupCost} onChange={setSetupCost} />
          <NumField label={locale === 'ko' ? '기계 비용 풀' : 'Machine Cost Pool'} value={machineCost} onChange={setMachineCost} />
        </div>
      </div>

      {/* Products */}
      {[
        {
          name: locale === 'ko' ? '제품 A' : 'Product A',
          units: aUnits, setUnits: setAUnits,
          setups: aSetups, setSetups: setASetups,
          machineHrs: aMachineHrs, setMachineHrs: setAMachineHrs,
          dm: aDM, setDM: setADM,
          dl: aDL, setDL: setADL,
          oh_abc: aOH_ABC, unitCost_abc: aUnitCost_ABC,
          oh_trad: aOH_Trad, unitCost_trad: aUnitCost_Trad,
        },
        {
          name: locale === 'ko' ? '제품 B' : 'Product B',
          units: bUnits, setUnits: setBUnits,
          setups: bSetups, setSetups: setBSetups,
          machineHrs: bMachineHrs, setMachineHrs: setBMachineHrs,
          dm: bDM, setDM: setBDM,
          dl: bDL, setDL: setBDL,
          oh_abc: bOH_ABC, unitCost_abc: bUnitCost_ABC,
          oh_trad: bOH_Trad, unitCost_trad: bUnitCost_Trad,
        },
      ].map((p) => (
        <div key={p.name} className="bg-white border border-emerald-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-emerald-800 mb-3">{p.name}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <NumField label={locale === 'ko' ? '생산량' : 'Units'} value={p.units} onChange={p.setUnits} unit={locale === 'ko' ? '개' : 'units'} />
            <NumField label={locale === 'ko' ? '셋업 횟수' : '# Setups'} value={p.setups} onChange={p.setSetups} unit={locale === 'ko' ? '회' : 'setups'} />
            <NumField label={locale === 'ko' ? '기계시간' : 'Machine Hrs'} value={p.machineHrs} onChange={p.setMachineHrs} unit={locale === 'ko' ? '시간' : 'hrs'} />
            <NumField label={locale === 'ko' ? '직접재료비' : 'Direct Materials'} value={p.dm} onChange={p.setDM} />
            <NumField label={locale === 'ko' ? '직접노무비' : 'Direct Labor'} value={p.dl} onChange={p.setDL} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs font-bold text-emerald-700 mb-1">
                {locale === 'ko' ? 'ABC 배부액' : 'ABC OH'}
              </p>
              <p className="text-base font-bold text-emerald-800">{fmt(p.oh_abc)}</p>
              <p className="text-xs text-emerald-600">
                {locale === 'ko' ? `단위원가: ${fmt(p.unitCost_abc)}원` : `Unit: ₩${fmt(p.unitCost_abc)}`}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 mb-1">
                {locale === 'ko' ? '전통방식 배부액' : 'Trad OH'}
              </p>
              <p className="text-base font-bold text-blue-800">{fmt(p.oh_trad)}</p>
              <p className="text-xs text-blue-600">
                {locale === 'ko' ? `단위원가: ${fmt(p.unitCost_trad)}원` : `Unit: ₩${fmt(p.unitCost_trad)}`}
              </p>
            </div>
          </div>
        </div>
      ))}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        <span className="font-bold">{locale === 'ko' ? 'ABC 핵심: ' : 'ABC Key: '}</span>
        {locale === 'ko'
          ? '복잡한 제품(셋업 많음)은 전통방식 대비 ABC에서 더 높은 원가가 배부됩니다.'
          : 'Complex products (more setups) receive higher cost allocation under ABC vs traditional.'}
      </div>
    </div>
  );
};

// ── Tab 3: BEP + Target Profit ────────────────────────────────────────────────

const BEPAnalysis: React.FC<{ locale: 'ko' | 'en' }> = ({ locale }) => {
  const [fixedCost, setFixedCost] = useState(5000000);
  const [vcPerUnit, setVcPerUnit] = useState(3000);
  const [spPerUnit, setSpPerUnit] = useState(5000);
  const [currentSales, setCurrentSales] = useState(2000);
  const [targetProfit, setTargetProfit] = useState(2000000);

  const cm = useMemo(() => spPerUnit - vcPerUnit, [spPerUnit, vcPerUnit]);
  const cmRatio = useMemo(() => (spPerUnit > 0 ? cm / spPerUnit : 0), [cm, spPerUnit]);
  const bepUnits = useMemo(() => (cm > 0 ? fixedCost / cm : 0), [fixedCost, cm]);
  const bepRevenue = useMemo(() => bepUnits * spPerUnit, [bepUnits, spPerUnit]);
  const targetUnits = useMemo(() => (cm > 0 ? (fixedCost + targetProfit) / cm : 0), [fixedCost, targetProfit, cm]);
  const safetyMargin = useMemo(() => currentSales - bepUnits, [currentSales, bepUnits]);
  const safetyMarginPct = useMemo(() => (currentSales > 0 ? (safetyMargin / currentSales) * 100 : 0), [safetyMargin, currentSales]);
  const operatingIncome = useMemo(() => (currentSales * cm) - fixedCost, [currentSales, cm, fixedCost]);
  const totalCM = useMemo(() => currentSales * cm, [currentSales, cm]);
  const operatingLeverage = useMemo(() => (operatingIncome !== 0 ? totalCM / operatingIncome : 0), [totalCM, operatingIncome]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumField label={locale === 'ko' ? '고정원가 (FC)' : 'Fixed Cost (FC)'} value={fixedCost} onChange={setFixedCost} />
        <NumField label={locale === 'ko' ? '단위당 변동원가 (VC)' : 'Variable Cost per Unit (VC)'} value={vcPerUnit} onChange={setVcPerUnit} />
        <NumField label={locale === 'ko' ? '단위당 판매가격 (SP)' : 'Selling Price per Unit (SP)'} value={spPerUnit} onChange={setSpPerUnit} />
        <NumField label={locale === 'ko' ? '현재 판매량 (단위)' : 'Current Sales Volume (units)'} value={currentSales} onChange={setCurrentSales} unit={locale === 'ko' ? '개' : 'units'} />
        <NumField label={locale === 'ko' ? '목표이익' : 'Target Profit'} value={targetProfit} onChange={setTargetProfit} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            title: locale === 'ko' ? '손익분기점 분석' : 'Break-Even Analysis',
            rows: [
              { label: locale === 'ko' ? '단위당 공헌이익 (CM)' : 'Contribution Margin/Unit', value: cm },
              { label: locale === 'ko' ? '공헌이익률' : 'CM Ratio', value: cmRatio * 100, suffix: '%' },
              { label: locale === 'ko' ? 'BEP (단위)' : 'BEP (units)', value: bepUnits, suffix: locale === 'ko' ? '개' : 'units' },
              { label: locale === 'ko' ? 'BEP (매출액)' : 'BEP (revenue)', value: bepRevenue },
            ],
            color: 'emerald',
          },
          {
            title: locale === 'ko' ? '목표이익 & 안전한계' : 'Target Profit & Safety Margin',
            rows: [
              { label: locale === 'ko' ? '목표이익 달성 판매량' : 'Target Units', value: targetUnits, suffix: locale === 'ko' ? '개' : 'units' },
              { label: locale === 'ko' ? '안전한계 (단위)' : 'Safety Margin (units)', value: safetyMargin },
              { label: locale === 'ko' ? '안전한계율' : 'Safety Margin %', value: safetyMarginPct, suffix: '%' },
              { label: locale === 'ko' ? '영업레버리지도' : 'Operating Leverage', value: operatingLeverage, suffix: 'x' },
            ],
            color: 'blue',
          },
        ].map((panel) => (
          <div key={panel.title} className={`bg-white border border-${panel.color}-200 rounded-2xl p-4`}>
            <p className={`text-sm font-bold text-${panel.color}-800 mb-3`}>{panel.title}</p>
            <div className="space-y-0.5">
              {panel.rows.map((row) => (
                <div key={row.label} className="flex justify-between py-1.5 border-b border-slate-100 text-sm">
                  <span className="text-slate-600">{row.label}</span>
                  <span className={`font-bold text-${panel.color}-700`}>
                    {'suffix' in row && row.suffix && row.suffix !== '원'
                      ? `${fmt(row.value)} ${row.suffix}`
                      : `${fmt(row.value)}원`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Visual BEP */}
      {bepUnits > 0 && currentSales > 0 && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-600 mb-3">
            {locale === 'ko' ? '손익분기 구간 시각화' : 'Break-Even Visualization'}
          </p>
          <div className="relative h-8 bg-rose-100 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-emerald-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, (currentSales / Math.max(currentSales, bepUnits * 1.5)) * 100)}%` }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-slate-600"
              style={{ left: `${Math.min(100, (bepUnits / Math.max(currentSales, bepUnits * 1.5)) * 100)}%` }}
              aria-label="Break-even point"
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0</span>
            <span className="font-bold text-slate-700">
              BEP: {fmt(bepUnits)}{locale === 'ko' ? '개' : ' units'}
            </span>
            <span>{locale === 'ko' ? '현재' : 'Current'}: {fmt(currentSales)}{locale === 'ko' ? '개' : ' units'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Wrapper ──────────────────────────────────────────────────────────────

type CostTab = 'traditional' | 'abc' | 'bep';

export const CostAccountingSimulator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const [activeTab, setActiveTab] = useState<CostTab>('traditional');

  const tabs: Array<{ key: CostTab; ko: string; en: string }> = [
    { key: 'traditional', ko: '전통적 원가계산', en: 'Traditional' },
    { key: 'abc', ko: 'ABC 원가계산', en: 'ABC Costing' },
    { key: 'bep', ko: '손익분기점', en: 'BEP Analysis' },
  ];

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-2">
        {locale === 'ko' ? '원가계산 시스템' : 'Cost Accounting Simulator'}
      </h3>
      <p className="text-sm text-emerald-600 mb-6">
        {locale === 'ko'
          ? '전통적 원가계산, 활동기준원가계산(ABC), 손익분기점 분석을 직접 실습하세요.'
          : 'Practice traditional costing, ABC costing, and break-even analysis interactively.'}
      </p>

      <div className="flex gap-2 mb-6" role="tablist" aria-label={locale === 'ko' ? '원가계산 방법 선택' : 'Costing method selection'}>
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
              activeTab === t.key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            {locale === 'ko' ? t.ko : t.en}
          </button>
        ))}
      </div>

      {activeTab === 'traditional' && <TraditionalCosting locale={locale} />}
      {activeTab === 'abc' && <ABCCosting locale={locale} />}
      {activeTab === 'bep' && <BEPAnalysis locale={locale} />}
    </div>
  );
};

export default CostAccountingSimulator;
