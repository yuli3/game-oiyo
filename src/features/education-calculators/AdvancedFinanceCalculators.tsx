import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import Landmark from 'lucide-react/dist/esm/icons/landmark';

/**
 * CAPM (Capital Asset Pricing Model) Calculator
 * Ke = Rf + Beta * (Rm - Rf)
 */
export const CAPMCalculator: React.FC = () => {
    const [rf, setRf] = useState<number>(3.5);
    const [beta, setBeta] = useState<number>(1.2);
    const [rm, setRm] = useState<number>(10);

    const ke = rf + beta * (rm - rf);

    return (
        <Card className="p-6 bg-slate-900 border-slate-800 text-white shadow-xl mt-8">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                <TrendingUp className="text-blue-400" />
                <h3 className="text-xl font-bold font-heading">CAPM (자본자산가격모형) 계산기</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">무위험수익률 (Rf, %)</label>
                        <input type="number" value={rf} onChange={e => setRf(Number(e.target.value))} className="w-full bg-slate-800 border-slate-700 p-2 rounded text-white font-mono"/>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">베타 (Beta, β)</label>
                        <input type="number" value={beta} onChange={e => setBeta(Number(e.target.value))} className="w-full bg-slate-800 border-slate-700 p-2 rounded text-white font-mono"/>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">시장기대수익률 (Rm, %)</label>
                        <input type="number" value={rm} onChange={e => setRm(Number(e.target.value))} className="w-full bg-slate-800 border-slate-700 p-2 rounded text-white font-mono"/>
                    </div>
                </div>

                <div className="flex flex-col justify-center items-center bg-blue-500/5 rounded-2xl border border-blue-500/20 p-6">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">자기자본비용 (Ke)</span>
                    <div className="text-5xl font-black text-white font-mono">
                        {ke.toFixed(2)}%
                    </div>
                    <div className="mt-4 text-[10px] text-slate-500 text-center">
                        Ke = {rf}% + {beta} × ({rm}% - {rf}%)
                    </div>
                </div>
            </div>
        </Card>
    );
};

/**
 * WACC (Weighted Average Cost of Capital) Calculator
 */
export const WACCCalculator: React.FC = () => {
    const [equity, setEquity] = useState<number>(600);
    const [debt, setDebt] = useState<number>(400);
    const [ke, setKe] = useState<number>(12);
    const [kd, setKd] = useState<number>(5);
    const [tax, setTax] = useState<number>(20);

    const total = equity + debt;
    const wacc = (equity / total) * ke + (debt / total) * kd * (1 - tax / 100);

    return (
        <Card className="p-6 bg-slate-900 border-slate-800 text-white shadow-xl mt-8">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                <Landmark className="text-emerald-400" />
                <h3 className="text-xl font-bold font-heading">WACC (가중평균자본비용) 계산기</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-slate-500 font-black">자기자본 (E)</label>
                            <input type="number" value={equity} onChange={e => setEquity(Number(e.target.value))} className="w-full bg-slate-800 border-slate-700 p-2 rounded text-sm"/>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 font-black">타인자본 (D)</label>
                            <input type="number" value={debt} onChange={e => setDebt(Number(e.target.value))} className="w-full bg-slate-800 border-slate-700 p-2 rounded text-sm"/>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-black">자기자본비용 (Ke, %)</label>
                        <input type="number" value={ke} onChange={e => setKe(Number(e.target.value))} className="w-full bg-slate-800 border-slate-700 p-2 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-black">세전 부채비용 (Kd, %)</label>
                        <input type="number" value={kd} onChange={e => setKd(Number(e.target.value))} className="w-full bg-slate-800 border-slate-700 p-2 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-black">법인세율 (Tax, %)</label>
                        <input type="number" value={tax} onChange={e => setTax(Number(e.target.value))} className="w-full bg-slate-800 border-slate-700 p-2 rounded text-sm"/>
                    </div>
                </div>

                <div className="flex flex-col justify-center items-center bg-emerald-500/5 rounded-2xl border border-emerald-500/20 p-6">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">가중평균자본비용 (WACC)</span>
                    <div className="text-5xl font-black text-white font-mono">
                        {wacc.toFixed(2)}%
                    </div>
                    <div className="mt-4 text-[10px] text-slate-500 text-center leading-relaxed">
                        부채비율: {(debt/total*100).toFixed(1)}% | 자기자본비율: {(equity/total*100).toFixed(1)}%
                    </div>
                </div>
            </div>
        </Card>
    );
};
