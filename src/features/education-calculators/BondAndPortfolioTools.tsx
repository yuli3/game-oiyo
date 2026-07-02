import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import Landmark from 'lucide-react/dist/esm/icons/landmark'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import Info from 'lucide-react/dist/esm/icons/info';

/**
 * Bond Pricing Calculator
 */
export const BondPricer: React.FC = () => {
    const [par, setPar] = useState(10000);
    const [coupon, setCoupon] = useState(5);
    const [yieldRate, setYieldRate] = useState(4);
    const [years, setYears] = useState(3);

    const calculatePrice = () => {
        const c = (par * coupon) / 100;
        const r = yieldRate / 100;
        let price = 0;
        for (let t = 1; t <= years; t++) {
            price += c / Math.pow(1 + r, t);
        }
        price += par / Math.pow(1 + r, years);
        return price;
    };

    const price = calculatePrice();

    return (
        <Card className="p-6 bg-slate-50 border-slate-200 shadow-lg mt-8">
            <div className="flex items-center gap-2 mb-6 border-b pb-4 text-slate-800">
                <Landmark size={20} className="text-amber-600" />
                <h3 className="text-xl font-bold">인터랙티브 채권 가격 계산기</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">액면가 (Par Value)</label>
                            <input type="number" value={par} onChange={e => setPar(Number(e.target.value))} className="w-full p-2 border rounded"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">만기 (Years)</label>
                            <input type="number" value={years} onChange={e => setYears(Number(e.target.value))} className="w-full p-2 border rounded"/>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">표면금리 (Coupon Rate, %)</label>
                        <input type="range" min="0" max="15" step="0.5" value={coupon} onChange={e => setCoupon(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"/>
                        <div className="text-right text-xs font-bold text-amber-600 mt-1">{coupon}%</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">시장요구수익률 (Yield, %)</label>
                        <input type="range" min="0" max="15" step="0.5" value={yieldRate} onChange={e => setYieldRate(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                        <div className="text-right text-xs font-bold text-blue-600 mt-1">{yieldRate}%</div>
                    </div>
                </div>

                <div className="flex flex-col justify-center items-center bg-white rounded-2xl border border-slate-200 p-6 shadow-inner">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">채권 현재 가격 (PV)</span>
                    <div className="text-5xl font-black text-slate-900 font-mono tracking-tighter">
                        ₩{Math.round(price).toLocaleString()}
                    </div>
                    <div className="mt-4 flex gap-2">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${price > par ? 'bg-emerald-100 text-emerald-700' : price < par ? 'bg-rose-100 text-rose-700' : 'bg-slate-100'}`}>
                            {price > par ? '할증 발행 (Premium)' : price < par ? '할인 발행 (Discount)' : '평가 발행 (Par)'}
                        </span>
                    </div>
                </div>
            </div>
        </Card>
    );
};

/**
 * Portfolio Visualizer (Efficient Frontier Concept)
 */
export const PortfolioVisualizer: React.FC = () => {
    // 2-Asset Portfolio (Stock & Bond)
    const stockReturn = 12;
    const stockRisk = 20;
    const bondReturn = 4;
    const bondRisk = 8;
    const correlation = 0.2;

    const data = [];
    for (let w = 0; w <= 1; w += 0.1) {
        const portReturn = w * stockReturn + (1 - w) * bondReturn;
        const portRisk = Math.sqrt(
            Math.pow(w * stockRisk, 2) + 
            Math.pow((1 - w) * bondRisk, 2) + 
            2 * w * (1 - w) * stockRisk * bondRisk * correlation
        );
        data.push({
            risk: Number(portRisk.toFixed(2)),
            return: Number(portReturn.toFixed(2)),
            stockWeight: Math.round(w * 100),
            name: `${Math.round(w * 100)}% 주식`
        });
    }

    return (
        <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
            <div className="flex items-center gap-2 mb-6 border-b pb-4 text-slate-900">
                <TrendingUp size={20} className="text-blue-600" />
                <h3 className="text-xl font-bold">포트폴리오 위험-수익 시각화</h3>
            </div>

            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" dataKey="risk" name="Risk" unit="%" label={{ value: '위험 (표준편차 σ)', position: 'insideBottom', offset: -10 }} stroke="#94a3b8" />
                        <YAxis type="number" dataKey="return" name="Return" unit="%" label={{ value: '기대수익률 (E[R])', angle: -90, position: 'insideLeft' }} stroke="#94a3b8" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Portfolio" data={data} fill="#3b82f6" line shape="circle" animationDuration={500}>
                             <LabelList dataKey="name" position="right" offset={8} style={{ fontSize: '10px', fill: '#64748b' }} />
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-start gap-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                    <b>자산 배분의 마법</b>: 주식과 채권을 섞으면 단순 합계보다 위험(표준편차)이 줄어드는 구간이 발생합니다. 이것이 바로 마코위츠의 현대 포트폴리오 이론이며, 우리가 분산 투자를 해야 하는 수학적 근거입니다.
                </p>
            </div>
        </Card>
    );
};
