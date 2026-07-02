import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import Scale from 'lucide-react/dist/esm/icons/scale'
import Globe from 'lucide-react/dist/esm/icons/globe'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';

/**
 * Comparative Advantage Calculator
 * Compares 2 countries (A, B) and 2 goods (X, Y)
 * Input: Hours required to produce 1 unit
 */
export const CompAdvantageCalculator: React.FC = () => {
    const [aX, setAX] = useState<number>(1);
    const [aY, setAY] = useState<number>(2);
    const [bX, setBX] = useState<number>(4);
    const [bY, setBY] = useState<number>(5);

    // Opportunity Costs
    // For A, cost of X in terms of Y = aX / aY
    const costAX = aX / aY;
    const costAY = aY / aX;
    const costBX = bX / bY;
    const costBY = bY / bX;

    const advX = costAX < costBX ? 'A' : 'B';
    const advY = costAY < costBY ? 'A' : 'B';

    return (
        <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8 overflow-hidden">
            <div className="flex items-center gap-2 mb-6 text-slate-900 border-b pb-4">
                <Scale className="text-indigo-500" />
                <h3 className="text-xl font-bold">인터랙티브 비교우위 계산기</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="font-bold text-indigo-600 flex items-center gap-2 mb-2">
                        <Globe size={16}/> A국 (Country A)
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">X재 1단위 생산 시간 (h)</label>
                        <input type="number" value={aX} onChange={e => setAX(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded"/>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Y재 1단위 생산 시간 (h)</label>
                        <input type="number" value={aY} onChange={e => setAY(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded"/>
                    </div>
                </div>

                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="font-bold text-emerald-600 flex items-center gap-2 mb-2">
                        <Globe size={16}/> B국 (Country B)
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">X재 1단위 생산 시간 (h)</label>
                        <input type="number" value={bX} onChange={e => setBX(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded"/>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Y재 1단위 생산 시간 (h)</label>
                        <input type="number" value={bY} onChange={e => setBY(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded"/>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">분석 결과: 기회비용 및 비교우위</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                            <span>A국의 X재 기회비용</span>
                            <span className="font-mono text-indigo-400">{costAX.toFixed(2)} Y</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                            <span>B국의 X재 기회비용</span>
                            <span className="font-mono text-emerald-400">{costBX.toFixed(2)} Y</span>
                        </div>
                        <div className={`p-3 rounded-lg flex items-center gap-3 ${advX === 'A' ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-emerald-500/20 border border-emerald-500/30'}`}>
                            <ArrowRight size={14}/>
                            <span className="text-xs font-bold">X재 비교우위: <span className={advX === 'A' ? 'text-indigo-400' : 'text-emerald-400'}>{advX}국</span></span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                            <span>A국 Y재 기회비용</span>
                            <span className="font-mono text-indigo-400">{costAY.toFixed(2)} X</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                            <span>B국 Y재 기회비용</span>
                            <span className="font-mono text-emerald-400">{costBY.toFixed(2)} X</span>
                        </div>
                        <div className={`p-3 rounded-lg flex items-center gap-3 ${advY === 'A' ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-emerald-500/20 border border-emerald-500/30'}`}>
                            <ArrowRight size={14}/>
                            <span className="text-xs font-bold">Y재 비교우위: <span className={advY === 'A' ? 'text-indigo-400' : 'text-emerald-400'}>{advY}국</span></span>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};
