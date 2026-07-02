import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Coins from 'lucide-react/dist/esm/icons/coins'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down'
import Target from 'lucide-react/dist/esm/icons/target';

/**
 * CVP Decision Making Game
 * Educational game from ahoxy/education themes
 */
export const CVPGame: React.FC = () => {
    const [price, setPrice] = useState(2000);
    const [vc, setVc] = useState(1200);
    const [fc, setFc] = useState(500000);
    const [sales, setSales] = useState(800);
    
    const [targetProfit] = useState(300000);
    const [isSimulated, setIsSimulated] = useState(false);

    const profit = (price - vc) * sales - fc;
    const bep = Math.ceil(fc / (price - vc));
    const win = profit >= targetProfit;

    const simulate = () => {
        setIsSimulated(true);
    };

    const reset = () => {
        setPrice(2000);
        setVc(1200);
        setFc(500000);
        setSales(800);
        setIsSimulated(false);
    };

    return (
        <Card className="p-8 bg-slate-50 border-slate-200 shadow-2xl mt-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Coins size={120} className="text-amber-300" />
            </div>

            <div className="flex items-center justify-between mb-8 border-b pb-4">
                <div className="flex items-center gap-2">
                    <Target className="text-rose-500" />
                    <h3 className="text-xl font-bold">CVP 경영 시뮬레이션 게임</h3>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-bold">
                    <span className="text-slate-400">목표 이익:</span> ₩{targetProfit.toLocaleString()}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                            <span>판매 가격 (Price)</span>
                            <span className="text-blue-600">₩{price.toLocaleString()}</span>
                        </div>
                        <input type="range" min="1500" max="3000" step="50" value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full accent-blue-600"/>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                            <span>단위당 변동비 (VC)</span>
                            <span className="text-rose-600">₩{vc.toLocaleString()}</span>
                        </div>
                        <input type="range" min="800" max="1500" step="50" value={vc} onChange={e => setVc(Number(e.target.value))} className="w-full accent-rose-600"/>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                            <span>총 고정비 (FC)</span>
                            <span className="text-slate-600">₩{fc.toLocaleString()}</span>
                        </div>
                        <input type="range" min="300000" max="800000" step="10000" value={fc} onChange={e => setFc(Number(e.target.value))} className="w-full accent-slate-600"/>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                            <span>예상 판매량 (Q)</span>
                            <span className="text-emerald-600">{sales} 개</span>
                        </div>
                        <input type="range" min="100" max="2000" step="50" value={sales} onChange={e => setSales(Number(e.target.value))} className="w-full accent-emerald-600"/>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex-1 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">현재 예상 이익</span>
                        <div className={`text-4xl font-black font-mono transition-colors ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {profit >= 0 ? '+' : ''}₩{profit.toLocaleString()}
                        </div>
                        <div className="mt-4 flex flex-col gap-1">
                             <span className="text-xs font-bold text-slate-400">손익분기점(BEP): {bep}개</span>
                             <div className="w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400" style={{ width: `${Math.min(100, (sales / bep) * 100)}%` }} />
                             </div>
                        </div>
                    </div>
                    
                    <Button 
                        onClick={simulate}
                        className={`w-full py-8 text-xl font-bold rounded-2xl shadow-lg transition-all active:scale-95 ${profit >= targetProfit ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}
                    >
                        시뮬레이션 가동
                    </Button>
                </div>
            </div>

            {isSimulated && (
                <div className={`p-6 rounded-2xl animate-in zoom-in duration-300 ${win ? 'bg-emerald-100 border-2 border-emerald-300' : 'bg-rose-100 border-2 border-rose-300'}`}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-full">
                            {win ? <TrendingUp className="text-emerald-500" /> : <TrendingDown className="text-rose-500" />}
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-slate-900">{win ? "목표 이익 달성 성공!" : "이익 미달: 전략 수정 필요"}</h4>
                            <p className="text-sm text-slate-600">
                                {win ? "훌륭한 가격 결정과 원가 관리입니다. 이 전략을 비즈니스에 적용해 보세요." : "가격이 낮거나 고정비가 너무 높습니다. 더 높은 공헌이익이 필요합니다."}
                            </p>
                        </div>
                        <Button variant="ghost" className="ml-auto" onClick={reset}>다시 초기화</Button>
                    </div>
                </div>
            )}
        </Card>
    );
};
