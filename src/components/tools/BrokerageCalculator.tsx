import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const BrokerageCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "부동산 중개수수료 계산기", desc: "주택 매매 및 전/월세 계약 시 발생하는 중개 보수를 미리 확인합니다.", type: "거래 종류", buy: "매매/교환", rent: "전/월세", price: "거래 금액 (원)", result: "최대 중개 보수", rate: "상한 요율", vat: "부가세 별도" },
        en: { title: "Real Estate Brokerage Fee", desc: "Check the maximum brokerage fee for real estate transactions.", type: "Transaction Type", buy: "Buy/Sell", rent: "Lease/Rent", price: "Transaction Amount", result: "Max Fee", rate: "Cap Rate", vat: "VAT excluded" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [type, setType] = useState<'buy' | 'rent'>('buy');
    const [price, setPrice] = useState(500000000);

    // Simplified KR 2024 Brokerage Fee Logic
    let rate = 0.004;
    let limit = Infinity;

    if (type === 'buy') {
        if (price < 50000000) { rate = 0.006; limit = 250000; }
        else if (price < 200000000) { rate = 0.005; limit = 800000; }
        else if (price < 900000000) { rate = 0.004; }
        else if (price < 1200000000) { rate = 0.005; }
        else { rate = 0.007; }
    } else {
        if (price < 50000000) { rate = 0.005; limit = 200000; }
        else if (price < 100000000) { rate = 0.004; limit = 300000; }
        else if (price < 600000000) { rate = 0.003; }
        else if (price < 1200000000) { rate = 0.004; }
        else { rate = 0.006; }
    }

    const fee = Math.min(price * rate, limit);

    return (
        <GameContainer title={t.title} subtitle="Smart Trading Tools" onReset={() => { setType('buy'); setPrice(500000000); }}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="flex gap-4 p-1 bg-muted rounded-2xl border border-border">
                    <button 
                        onClick={() => setType('buy')}
                        className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${type === 'buy' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                    >
                        {t.buy}
                    </button>
                    <button 
                        onClick={() => setType('rent')}
                        className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${type === 'rent' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                    >
                        {t.rent}
                    </button>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black text-muted-foreground uppercase">{t.price}</label>
                    <input 
                        type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                <div className="p-8 bg-foreground rounded-[32px] text-background text-center animate-in slide-in-from-bottom-6">
                    <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-2">{t.result}</p>
                    <h4 className="text-4xl font-black text-primary">₩{Math.round(fee).toLocaleString()}</h4>
                    <div className="flex justify-center gap-6 mt-6 border-t border-background/15 pt-6">
                        <p className="text-[10px] text-background/60 uppercase">{t.rate}: {(rate * 100).toFixed(1)}%</p>
                        <p className="text-[10px] text-background/60 uppercase">{t.vat}</p>
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default BrokerageCalculator;
