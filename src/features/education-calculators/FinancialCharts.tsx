import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card } from '@/components/ui/card';

interface CVPChartProps {
    sellingPrice: number;
    variableCost: number;
    fixedCost: number;
    maxVolume?: number;
}

export const CVPChart: React.FC<CVPChartProps> = ({ 
    sellingPrice = 1000, 
    variableCost = 600, 
    fixedCost = 400000,
    maxVolume = 1500
}) => {
    const data = [];
    const step = maxVolume / 10;
    
    for (let q = 0; q <= maxVolume; q += step) {
        data.push({
            volume: q,
            revenue: q * sellingPrice,
            totalCost: fixedCost + (q * variableCost),
            fixedCost: fixedCost
        });
    }

    const bep = Math.ceil(fixedCost / (sellingPrice - variableCost));

    return (
        <Card className="p-6 bg-white border-slate-200 mt-8">
            <h4 className="text-lg font-bold text-slate-900 mb-4 text-center">CVP 분석 시각화: 매출과 총원가의 교차</h4>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="volume" 
                            label={{ value: '판매량(Q)', position: 'insideBottom', offset: -5 }} 
                            stroke="#64748b"
                            fontSize={12}
                        />
                        <YAxis 
                            label={{ value: '금액(원)', angle: -90, position: 'insideLeft' }}
                            stroke="#64748b"
                            fontSize={12}
                            tickFormatter={(value) => `${value/1000}k`}
                        />
                        <Tooltip 
                            formatter={((value: number) => value.toLocaleString() + '원') as any}
                            labelFormatter={(label) => `판매량: ${label}개`}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Legend verticalAlign="top" height={36}/>
                        <ReferenceLine x={bep} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: `BEP: ${bep}`, fill: '#ef4444', fontSize: 12 }} />
                        <Line type="monotone" dataKey="revenue" name="총매출액" stroke="#3b82f6" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="totalCost" name="총원가" stroke="#f59e0b" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="fixedCost" name="고정비" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-4 italic text-center">
                * 파란색 선(매출)과 주황색 선(원가)이 만나는 지점이 손익분기점(BEP)입니다.
            </p>
        </Card>
    );
};
