import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import ArrowLeftRight from 'lucide-react/dist/esm/icons/arrow-left-right'
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';

/**
 * Standard Costing Variance Analysis Simulator
 */
export const VarianceAnalysis: React.FC = () => {
    const [aq, setAq] = useState<number>(1000); // Actual Quantity
    const [ap, setAp] = useState<number>(12);   // Actual Price
    const [sq, setSq] = useState<number>(950);  // Standard Quantity
    const [sp, setSp] = useState<number>(10);   // Standard Price

    const actualCost = aq * ap;
    const splitPoint = aq * sp;
    const standardCost = sq * sp;

    const priceVariance = splitPoint - actualCost; // SP*AQ - AP*AQ = (SP-AP)*AQ
    const efficiencyVariance = standardCost - splitPoint; // SP*SQ - SP*AQ = SP*(SQ-AQ)
    const totalVariance = standardCost - actualCost;

    const formatVar = (v: number) => {
        if (v === 0) return { text: "일치", color: "text-slate-400" };
        return v > 0 
            ? { text: `₩${Math.abs(v).toLocaleString()} 유리(F)`, color: "text-emerald-400" } 
            : { text: `₩${Math.abs(v).toLocaleString()} 불리(U)`, color: "text-rose-500" };
    };

    const pVar = formatVar(priceVariance);
    const eVar = formatVar(efficiencyVariance);
    const tVar = formatVar(totalVariance);

    return (
        <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8 overflow-hidden">
            <div className="flex items-center gap-2 mb-6 text-slate-900 border-b pb-4">
                <ArrowLeftRight className="text-blue-500" />
                <h3 className="text-xl font-bold">원가 차이 분석(Variance Analysis) 시뮬레이터</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4 p-4 bg-blue-50/30 rounded-xl border border-blue-100">
                    <span className="text-xs font-bold text-blue-600 uppercase">실제 데이터 (Actual)</span>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 block mb-1">실제 투입량 (AQ)</label>
                            <input type="number" value={aq} onChange={e => setAq(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded text-sm"/>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 block mb-1">실제 가격 (AP)</label>
                            <input type="number" value={ap} onChange={e => setAp(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded text-sm"/>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 p-4 bg-emerald-50/30 rounded-xl border border-emerald-100">
                    <span className="text-xs font-bold text-emerald-600 uppercase">표준 데이터 (Standard)</span>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-500 block mb-1">표준 허용량 (SQ)</label>
                            <input type="number" value={sq} onChange={e => setSq(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded text-sm"/>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 block mb-1">표준 가격 (SP)</label>
                            <input type="number" value={sp} onChange={e => setSp(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded text-sm"/>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative pt-10 pb-6 hidden md:block">
                <div className="flex justify-between text-center px-4">
                    <div className="w-1/3">
                        <div className="text-xs font-bold text-slate-500 mb-1">실제 원가</div>
                        <div className="text-sm font-bold text-slate-900 mb-2">AQ × AP</div>
                        <div className="p-3 bg-slate-100 rounded-lg font-mono text-sm leading-tight">₩{actualCost.toLocaleString()}</div>
                    </div>
                    <div className="w-1/3">
                        <div className="text-xs font-bold text-slate-500 mb-1">분리점 (Shadow)</div>
                        <div className="text-sm font-bold text-slate-900 mb-2">AQ × SP</div>
                        <div className="p-3 bg-slate-100 rounded-lg font-mono text-sm leading-tight">₩{splitPoint.toLocaleString()}</div>
                    </div>
                    <div className="w-1/3">
                        <div className="text-xs font-bold text-slate-500 mb-1">표준 원가</div>
                        <div className="text-sm font-bold text-slate-900 mb-2">SQ × SP</div>
                        <div className="p-3 bg-slate-100 rounded-lg font-mono text-sm leading-tight">₩{standardCost.toLocaleString()}</div>
                    </div>
                </div>

                {/* Variance Labels */}
                <div className="absolute top-24 left-[16.6%] right-[50%] h-px bg-slate-200 flex justify-center">
                    <div className={`mt-2 text-xs font-bold px-2 py-0.5 rounded-full bg-white border ${pVar.color.replace('text-', 'border-').replace('-400', '-200') + ' ' + pVar.color}`}>
                        가격 차이: {pVar.text}
                    </div>
                </div>
                <div className="absolute top-24 left-[50%] right-[16.6%] h-px bg-slate-200 flex justify-center">
                    <div className={`mt-2 text-xs font-bold px-2 py-0.5 rounded-full bg-white border ${eVar.color.replace('text-', 'border-').replace('-400', '-200') + ' ' + eVar.color}`}>
                        능률 차이: {eVar.text}
                    </div>
                </div>
            </div>

            <div className="mt-12 bg-slate-900 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <AlertCircle size={16}/>
                    <span className="text-xs font-bold uppercase tracking-widest">분석 리포트 (Total Variance)</span>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left">
                        <span className="text-3xl font-black font-mono">총 원가 차이: {tVar.text}</span>
                        <p className="text-xs text-slate-500">
                            표준 원가(₩{standardCost.toLocaleString()}) 대비 실제 지출액의 차이입니다.
                        </p>
                    </div>
                    <div className="px-6 py-3 bg-slate-800 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-4">
                           {totalVariance >= 0 ? <TrendingDown className="text-emerald-400"/> : <TrendingUp className="text-rose-500"/>}
                           <span className="text-sm font-bold">{totalVariance >= 0 ? "목표 원가 절감 달성!" : "원가 초과 발생 (집중 관리 필요)"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};
