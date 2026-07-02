import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import Target from 'lucide-react/dist/esm/icons/target'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import { CVPChart } from "@/features/education-calculators/FinancialCharts";

/**
 * CVP Light Lab (Education Magazine)
 * Focused on break-even intuition with live chart
 */
export const CVPLab: React.FC = () => {
  const [sellingPrice, setSellingPrice] = useState<number>(1200);
  const [variableCost, setVariableCost] = useState<number>(700);
  const [fixedCost, setFixedCost] = useState<number>(500000);

  const contributionMargin = sellingPrice - variableCost;
  const breakEvenPoint = useMemo(() => {
    if (contributionMargin <= 0) return 0;
    return Math.ceil(fixedCost / contributionMargin);
  }, [contributionMargin, fixedCost]);

  const contributionMarginRatio = useMemo(() => {
    if (sellingPrice <= 0) return 0;
    return (contributionMargin / sellingPrice) * 100;
  }, [contributionMargin, sellingPrice]);

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      <div className="flex items-center gap-2 mb-6 text-slate-900 border-b pb-4">
        <Target className="text-emerald-500" />
        <h3 className="text-xl font-bold">CVP 손익분기점 라보</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4 lg:col-span-1">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <label className="text-xs font-bold text-slate-500 block mb-2">단위당 판매가격 (P)</label>
            <input
              type="number"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
            />
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <label className="text-xs font-bold text-slate-500 block mb-2">단위당 변동원가 (VC)</label>
            <input
              type="number"
              value={variableCost}
              onChange={(e) => setVariableCost(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
            />
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <label className="text-xs font-bold text-slate-500 block mb-2">총 고정원가 (FC)</label>
            <input
              type="number"
              value={fixedCost}
              onChange={(e) => setFixedCost(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
            />
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3">
              핵심 지표
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">단위당 공헌이익</span>
                <span className="font-mono font-bold text-slate-900">
                  {contributionMargin.toLocaleString()}원
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">공헌이익률</span>
                <span className="font-mono font-bold text-slate-900">
                  {contributionMarginRatio.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">손익분기 판매량</span>
                <span className="font-mono font-bold text-emerald-600">
                  {breakEvenPoint.toLocaleString()} units
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            <TrendingUp className="text-emerald-500" size={14} /> 손익분기점 시각화
          </div>
          <CVPChart
            sellingPrice={sellingPrice}
            variableCost={variableCost}
            fixedCost={fixedCost}
            maxVolume={Math.max(1200, breakEvenPoint * 1.6)}
          />
        </div>
      </div>
    </Card>
  );
};

/**
 * Sampling Error Lab (Statistics Magazine)
 * Demonstrates how sample size affects estimate stability
 */
export const SamplingErrorLab: React.FC = () => {
  const [populationRate, setPopulationRate] = useState<number>(55);
  const [sampleSize, setSampleSize] = useState<number>(30);
  const [trials, setTrials] = useState<number>(50);

  const results = useMemo(() => {
    const p = populationRate / 100;
    const sampleResults: number[] = [];
    for (let t = 0; t < trials; t += 1) {
      let success = 0;
      for (let i = 0; i < sampleSize; i += 1) {
        if (Math.random() < p) success += 1;
      }
      sampleResults.push((success / sampleSize) * 100);
    }
    return sampleResults;
  }, [populationRate, sampleSize, trials]);

  const avg = useMemo(() => {
    if (!results.length) return 0;
    return results.reduce((acc, v) => acc + v, 0) / results.length;
  }, [results]);

  const spread = useMemo(() => {
    if (!results.length) return 0;
    const variance =
      results.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / results.length;
    return Math.sqrt(variance);
  }, [results, avg]);

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      <div className="flex items-center gap-2 mb-6 text-slate-900 border-b pb-4">
        <Target className="text-indigo-500" />
        <h3 className="text-xl font-bold">표본오차 실험실</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4 lg:col-span-1">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <label className="text-xs font-bold text-slate-500 block mb-2">모집단 비율 (예: 찬성률, %)</label>
            <input
              type="number"
              value={populationRate}
              onChange={(e) => setPopulationRate(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
            />
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <label className="text-xs font-bold text-slate-500 block mb-2">표본 크기 (n)</label>
            <input
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
            />
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <label className="text-xs font-bold text-slate-500 block mb-2">반복 횟수</label>
            <input
              type="number"
              value={trials}
              onChange={(e) => setTrials(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
            />
          </div>
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3">
              결과 요약
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">평균 추정치</span>
                <span className="font-mono font-bold text-slate-900">
                  {avg.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">변동성 (표준편차)</span>
                <span className="font-mono font-bold text-indigo-600">
                  {spread.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            표본별 추정치 분포
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {results.map((value, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-white px-2 py-3 text-center text-sm font-bold text-slate-700"
              >
                {value.toFixed(0)}%
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4 italic">
            * 표본 크기가 커질수록 평균은 안정되고 변동성이 줄어듭니다.
          </p>
        </div>
      </div>
    </Card>
  );
};
