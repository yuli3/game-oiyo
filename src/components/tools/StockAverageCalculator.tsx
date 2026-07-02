import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const StockAverageCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "주식 물타기 계산기", desc: "추가 매수 후의 평균 단가를 계산하여 탈출 전략을 세웁니다.", current: "현재 보유", add: "추가 매수", price: "단가 (원)", quantity: "수량 (주)", result: "최종 결과", avg: "최종 평단가", totalQty: "총 보유 수량", totalAmt: "총 매수 금액" },
        en: { title: "Stock Averaging Calculator", desc: "Calculate your new average price after buying more shares.", current: "Current Holding", add: "Additional Buy", price: "Price", quantity: "Quantity", result: "Result", avg: "New Avg Price", totalQty: "Total Quantity", totalAmt: "Total Investment" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [currentPrice, setCurrentPrice] = useState(10000);
    const [currentQty, setCurrentQty] = useState(100);
    const [addPrice, setAddPrice] = useState(8000);
    const [addQty, setAddQty] = useState(100);

    const totalCost = (currentPrice * currentQty) + (addPrice * addQty);
    const totalQuantity = currentQty + addQty;
    const newAverage = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    return (
        <GameContainer title={t.title} subtitle="Strategic Averaging Analytics" onReset={() => { setCurrentPrice(10000); setCurrentQty(100); setAddPrice(8000); setAddQty(100); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Current Block */}
                    <div className="p-6 bg-muted/40 rounded-3xl border border-border space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-destructive/40" />
                            <h5 className="text-xs font-black text-muted-foreground uppercase">{t.current}</h5>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black opacity-50 block mb-1">{t.price}</label>
                                <input type="number" value={currentPrice} onChange={(e) => setCurrentPrice(Number(e.target.value))} className="w-full p-3 bg-background border border-border rounded-xl font-black outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black opacity-50 block mb-1">{t.quantity}</label>
                                <input type="number" value={currentQty} onChange={(e) => setCurrentQty(Number(e.target.value))} className="w-full p-3 bg-background border border-border rounded-xl font-black outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                        </div>
                    </div>

                    {/* Add Block */}
                    <div className="p-6 bg-primary/5 rounded-3xl border border-primary/20 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            <h5 className="text-xs font-black text-primary uppercase">{t.add}</h5>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black text-primary/50 block mb-1">{t.price}</label>
                                <input type="number" value={addPrice} onChange={(e) => setAddPrice(Number(e.target.value))} className="w-full p-3 bg-background border border-primary/20 rounded-xl font-black outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-primary/50 block mb-1">{t.quantity}</label>
                                <input type="number" value={addQty} onChange={(e) => setAddQty(Number(e.target.value))} className="w-full p-3 bg-background border border-primary/20 rounded-xl font-black outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Result Area */}
                <div className="p-8 bg-foreground rounded-[40px] text-background animate-in zoom-in-95">
                    <p className="text-[10px] font-black text-background/60 uppercase tracking-widest text-center mb-2">{t.result}</p>
                    <div className="text-center mb-8">
                        <p className="text-[10px] text-background/50 uppercase mb-1">{t.avg}</p>
                        <h4 className="text-4xl font-black text-primary">₩{Math.round(newAverage).toLocaleString()}</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 border-t border-background/15 pt-6">
                        <div className="text-center">
                            <p className="text-[10px] text-background/60 uppercase">{t.totalQty}</p>
                            <p className="text-sm font-bold">{totalQuantity}주</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-background/60 uppercase">{t.totalAmt}</p>
                            <p className="text-sm font-bold">₩{totalCost.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default StockAverageCalculator;
