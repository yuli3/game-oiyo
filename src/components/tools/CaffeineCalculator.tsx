import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const CaffeineCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "카페인 반감기 계산기", desc: "섭취한 카페인이 언제쯤 몸 밖으로 배출되는지 예측하여 숙면을 계획합니다.", amount: "섭취량 (mg)", time: "섭취 시각", target: "취짐 시각", result: "취침 시 잔류 카페인", safe: "숙면 가능", danger: "각성 상태", suggestion: "추천 섭취 가이드" },
        en: { title: "Caffeine Half-life", desc: "Predict when caffeine leaves your system to plan for better sleep.", amount: "Amount (mg)", time: "Intake Time", target: "Bedtime", result: "Internal Caffeine at Bedtime", safe: "Safe Sleep", danger: "Alert State", suggestion: "Intake Guide" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [amount, setAmount] = useState(150);
    const [intakeHour, setIntakeHour] = useState(13);
    const [bedHour, setBedHour] = useState(23);

    const HALF_LIFE = 5.7; // Average hours
    const hoursElapsed = (bedHour < intakeHour ? bedHour + 24 : bedHour) - intakeHour;
    const remaining = amount * Math.pow(0.5, hoursElapsed / HALF_LIFE);

    const isAlert = remaining > 50; // Simple threshold (50mg is approx half a coffee)

    return (
        <GameContainer title={t.title} subtitle="Sleep Hygiene Analytics" onReset={() => { setAmount(150); setIntakeHour(13); setBedHour(23); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                         <label className="text-[10px] font-black text-muted-foreground uppercase">{t.amount}</label>
                         <div className="flex flex-wrap gap-2">
                            {[75, 150, 300].map(v => (
                                <button key={v} onClick={() => setAmount(v)} className={`px-4 py-2 rounded-xl border-2 text-xs font-black transition-all ${amount === v ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-muted border-transparent text-muted-foreground'}`}>
                                    {v}mg
                                </button>
                            ))}
                         </div>
                         <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black" />
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.time}</label>
                        <select value={intakeHour} onChange={(e) => setIntakeHour(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black appearance-none outline-none">
                            {Array.from({ length: 24 }).map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                        </select>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.target}</label>
                        <select value={bedHour} onChange={(e) => setBedHour(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black appearance-none outline-none">
                            {Array.from({ length: 24 }).map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                        </select>
                    </div>
                </div>

                <div className={`p-10 rounded-[40px] border-4 transition-all duration-500 text-center space-y-4 shadow-2xl relative overflow-hidden ${isAlert ? 'bg-warning/10 border-warning/30' : 'bg-success/10 border-success/30'}`}>
                    <div className="relative z-10">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isAlert ? 'text-warning' : 'text-success'}`}>{t.result}</p>
                        <h2 className={`text-6xl font-black ${isAlert ? 'text-warning' : 'text-success'}`}>{remaining.toFixed(1)}mg</h2>
                        <div className={`inline-block px-6 py-2 rounded-full font-black text-sm uppercase ${isAlert ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                            {isAlert ? t.danger : t.safe}
                        </div>
                        <p className="mt-6 text-sm font-medium text-muted-foreground max-w-sm mx-auto">
                            {isAlert ? "침대에 누워도 뇌는 깨어있을 가능성이 높습니다. 카페인 농도가 50mg 이상이면 숙면을 방해할 수 있습니다." : "안전권입니다. 카페인이 충분히 배출되어 쾌적한 수면을 기대할 수 있습니다."}
                        </p>
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default CaffeineCalculator;
