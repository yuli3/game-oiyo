import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import Sliders from 'lucide-react/dist/esm/icons/sliders'
import Activity from 'lucide-react/dist/esm/icons/activity';

/**
 * IS-LM Model Simulator
 * IS: Y = C(Y-T) + I(r) + G
 * LM: M/P = L(Y, r)
 */
export const ISLMSimulator: React.FC = () => {
    // Shifts
    const [gShift, setGShift] = useState<number>(0); // Fiscal policy
    const [mShift, setMShift] = useState<number>(0); // Monetary policy

    const generateData = () => {
        const data = [];
        // Generic Linear Equations for visualization
        // IS: r = (A + G) - bY  (Downward sloping)
        // LM: r = cY - (M/P)    (Upward sloping)
        
        for (let y = 10; y <= 100; y += 5) {
            const is_base = 100 - 0.8 * y;
            const lm_base = 0.5 * y - 10;
            
            data.push({
                y: y,
                is: is_base + Number(gShift),
                lm: lm_base - Number(mShift),
            });
        }
        return data;
    };

    const data = useMemo(() => generateData(), [gShift, mShift]);

    // Equilibrium calculation (Intersection of is = lm)
    // 100 + G - 0.8Y = 0.5Y - (10 + M)
    // 110 + G + M = 1.3Y
    // Y = (110 + G + M) / 1.3
    const eqY = (110 + Number(gShift) + Number(mShift)) / 1.3;
    const eqR = 0.5 * eqY - 10 - Number(mShift);

    return (
        <Card className="p-6 bg-white border-slate-200 shadow-lg mt-8">
            <div className="flex items-center gap-2 mb-6 text-slate-900 border-b pb-4">
                <Activity className="text-rose-500" />
                <h3 className="text-xl font-bold">인터랙티브 IS-LM 모델 시뮬레이터</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="y" 
                                    label={{ value: '국민소득 (Y)', position: 'insideBottom', offset: -10 }} 
                                    stroke="#64748b"
                                    domain={[0, 110]}
                                />
                                <YAxis 
                                    label={{ value: '이자율 (r)', angle: -90, position: 'insideLeft' }} 
                                    stroke="#64748b" 
                                    domain={[0, 100]}
                                />
                                <Tooltip />
                                <Legend verticalAlign="top"/>
                                <Line type="monotone" dataKey="is" name="IS (재화시장)" stroke="#3b82f6" strokeWidth={3} dot={false} animationDuration={300} />
                                <Line type="monotone" dataKey="lm" name="LM (화폐시장)" stroke="#f43f5e" strokeWidth={3} dot={false} animationDuration={300} />
                                <ReferenceDot x={eqY} y={eqR} r={5} fill="#0f172a" stroke="#fff" strokeWidth={2} label={{ position: 'top', value: 'E', fill: '#0f172a', fontWeight: 'bold' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-slate-500 mt-4 text-center">
                        * 재정정책(G)은 IS곡선을, 통화정책(M)은 LM곡선을 이동시킵니다.
                    </p>
                </div>

                <div className="space-y-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Sliders size={14} className="text-blue-500" /> 재정 지출 (G)
                            </label>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${gShift > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200'}`}>
                                {gShift > 0 ? '확장적' : gShift < 0 ? '긴축적' : '기본'}
                            </span>
                        </div>
                        <input 
                            type="range" min="-20" max="20" step="1" 
                            value={gShift} 
                            onChange={(e) => setGShift(Number(e.target.value))}
                            className="w-full accent-blue-600 cursor-pointer"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Sliders size={14} className="text-rose-500" /> 통화 공급 (M)
                            </label>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${mShift > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200'}`}>
                                {mShift > 0 ? '확장적' : mShift < 0 ? '긴축적' : '기본'}
                            </span>
                        </div>
                        <input 
                            type="range" min="-20" max="20" step="1" 
                            value={mShift} 
                            onChange={(e) => setMShift(Number(e.target.value))}
                            className="w-full accent-rose-600 cursor-pointer"
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">균형 분석 (Equilibrium)</div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-600">균형 소득 (Y*)</span>
                                <span className="font-mono font-bold text-slate-900">{eqY.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-600">균형 이자율 (r*)</span>
                                <span className="font-mono font-bold text-slate-900">{eqR.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};
