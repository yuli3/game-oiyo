import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import Calculator from 'lucide-react/dist/esm/icons/calculator'
import Target from 'lucide-react/dist/esm/icons/target';

/**
 * CVP (Cost-Volume-Profit) Calculator
 * Useful for Cost Accounting (원가회계)
 */
export const CVPCalculator: React.FC = () => {
  const [sellingPrice, setSellingPrice] = useState<number>(1000);
  const [variableCost, setVariableCost] = useState<number>(600);
  const [fixedCost, setFixedCost] = useState<number>(400000);

  const contributionMargin = sellingPrice - variableCost;
  const breakEvenPoint = contributionMargin > 0 ? Math.ceil(fixedCost / contributionMargin) : 0;
  const contributionMarginRatio = (contributionMargin / sellingPrice) * 100;

  return (
    <Card className="p-6 bg-slate-900 border-slate-800 text-slate-100 shadow-xl">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
        <Calculator className="text-blue-400 w-6 h-6" />
        <h3 className="text-xl font-bold">CVP (손익분기점) 계산기</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">단위당 판매가격 (P)</label>
            <input 
              type="number" 
              value={sellingPrice} 
              onChange={(e) => setSellingPrice(Number(e.target.value))}
              className="w-full bg-slate-800 border-slate-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">단위당 변동원가 (VC)</label>
            <input 
              type="number" 
              value={variableCost} 
              onChange={(e) => setVariableCost(Number(e.target.value))}
              className="w-full bg-slate-800 border-slate-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">총 고정원가 (FC)</label>
            <input 
              type="number" 
              value={fixedCost} 
              onChange={(e) => setFixedCost(Number(e.target.value))}
              className="w-full bg-slate-800 border-slate-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col justify-center gap-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">단위당 공헌이익</span>
            <span className="text-xl font-mono text-emerald-400">{contributionMargin.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">공헌이익률</span>
            <span>{contributionMarginRatio.toFixed(1)}%</span>
          </div>
          <div className="h-px bg-slate-700 my-2" />
          <div className="flex flex-col gap-1 items-center py-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <span className="text-blue-400 text-sm font-bold flex items-center gap-1">
              <Target size={14} /> 손익분기점 판매량
            </span>
            <span className="text-3xl font-bold font-mono text-white">
              {breakEvenPoint.toLocaleString()} <span className="text-lg font-normal text-slate-400 italic">units</span>
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * NPV (Net Present Value) Calculator
 * Essential for Financial Management (재무관리)
 */
export const NPVCalculator: React.FC = () => {
    const [initialInvestment, setInitialInvestment] = useState<number>(1000000);
    const [cashFlows, setCashFlows] = useState<string>("300000, 400000, 400000, 400000");
    const [discountRate, setDiscountRate] = useState<number>(10);

    const calculateNPV = () => {
        const flows = cashFlows.split(',').map(s => Number(s.trim()));
        let npv = -initialInvestment;
        flows.forEach((cf, t) => {
            npv += cf / Math.pow(1 + discountRate / 100, t + 1);
        });
        return npv;
    };

    const npv = useMemo(() => calculateNPV(), [initialInvestment, cashFlows, discountRate]);

    return (
        <Card className="p-6 bg-slate-900 border-slate-800 text-slate-100 shadow-xl mt-8">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                <TrendingUp className="text-purple-400 w-6 h-6" />
                <h3 className="text-xl font-bold">NPV (순현재가치) 계산기</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">초기 투자액 (I0)</label>
                        <input 
                            type="number" 
                            value={initialInvestment} 
                            onChange={(e) => setInitialInvestment(Number(e.target.value))}
                            className="w-full bg-slate-800 border-slate-700 rounded-md px-3 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">할인율 (r, %)</label>
                        <input 
                            type="number" 
                            value={discountRate} 
                            onChange={(e) => setDiscountRate(Number(e.target.value))}
                            className="w-full bg-slate-800 border-slate-700 rounded-md px-3 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">연도별 현금흐름 (콤마로 구분)</label>
                        <textarea 
                            value={cashFlows} 
                            onChange={(e) => setCashFlows(e.target.value)}
                            className="w-full bg-slate-800 border-slate-700 rounded-md px-3 py-2 text-white h-24 font-mono text-sm"
                        />
                    </div>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col justify-center gap-4">
                    <div className="flex flex-col gap-2 items-center py-6 bg-purple-500/10 rounded-lg border border-purple-500/30">
                        <span className="text-purple-400 text-sm font-bold">결과: 순현재가치 (NPV)</span>
                        <span className={`text-4xl font-bold font-mono ${npv >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {Math.round(npv).toLocaleString()}원
                        </span>
                        <div className="mt-4 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-700 text-slate-300">
                             {npv >= 0 ? '수락 (NPV > 0)' : '기각 (NPV < 0)'}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};
