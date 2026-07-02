import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const HeightPredictor: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "자녀 예상 키 계산기", desc: "부모님의 키를 바탕으로 유전적 예상 키를 계산합니다. (타너 공식 기반)", dad: "아빠 키 (cm)", mom: "엄마 키 (cm)", gender: "자녀 성별", boy: "아들", girl: "딸", result: "유전적 예상 키", desc2: "오차 범위는 ±5cm이며 후천적 요인(영양, 운동)이 20-30%를 결정합니다." },
        en: { title: "Target Height Predictor", desc: "Estimate your child's target height based on parental data (Tanner Formula).", dad: "Father's Height (cm)", mom: "Mother's Height (cm)", gender: "Child's Gender", boy: "Boy", girl: "Girl", result: "Target Height", desc2: "Margin of error is ±5cm. Nutrition and exercise decide 20-30% of actual height." }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [dadHeight, setDadHeight] = useState(175);
    const [momHeight, setMomHeight] = useState(160);
    const [gender, setGender] = useState<'b' | 'g'>('b');

    const predictedHeight = gender === 'b' 
        ? (dadHeight + momHeight + 13) / 2
        : (dadHeight + momHeight - 13) / 2;

    return (
        <GameContainer title={t.title} subtitle="Genetic Growth Analytics" onReset={() => { setDadHeight(175); setMomHeight(160); setGender('b'); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md mx-auto">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex gap-2 p-1 bg-muted rounded-xl">
                            <button onClick={() => setGender('b')} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${gender === 'b' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}>👦 {t.boy}</button>
                            <button onClick={() => setGender('g')} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${gender === 'g' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}>👧 {t.girl}</button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase">{t.dad}</label>
                            <input type="number" value={dadHeight} onChange={(e) => setDadHeight(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black outline-none" />
                        </div>
                    </div>

                    <div className="space-y-6 flex flex-col justify-end">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase">{t.mom}</label>
                            <input type="number" value={momHeight} onChange={(e) => setMomHeight(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black outline-none" />
                        </div>
                    </div>
                </div>

                <div className="relative p-10 bg-primary/5 border border-primary/20 rounded-[40px] text-center shadow-2xl animate-in zoom-in-95 group overflow-hidden">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">{t.result}</p>
                    <div className="flex items-center justify-center gap-4">
                        <h2 className="text-7xl font-black text-primary">{predictedHeight.toFixed(1)}</h2>
                        <span className="text-2xl font-black text-primary/60">cm</span>
                    </div>
                    
                    {/* Visual ruler-like element */}
                    <div className="mt-8 h-4 w-full bg-muted/30 rounded-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-primary/40" style={{ width: `${(predictedHeight / 210) * 100}%` }} />
                        <div className="absolute top-0 right-0 h-full w-px bg-muted-foreground" style={{ left: '80%' }} /> {/* 170cm mark approx */}
                    </div>
                </div>

                <p className="text-xs text-center text-muted-foreground italic leading-relaxed px-4">{t.desc2}</p>
            </div>
        </GameContainer>
    );
};

export default HeightPredictor;
