import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const PetAgeCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "반려동물 나이 계산기", desc: "강아지와 고양이의 나이를 사람의 시간으로 환산하여 생애 주기를 이해합니다.", petType: "반려동물 종류", dog: "강아지", cat: "고양이", age: "반려동물 나이 (세)", size: "강아지 크기", small: "소형견 (-10kg)", mid: "중형견 (10-25kg)", large: "대형견 (25kg+)", result: "사람 나이로 환산하면" },
        en: { title: "Pet Age Converter", desc: "Convert your pet's age to human years to understand their life stage.", petType: "Pet Type", dog: "Dog", cat: "Cat", age: "Pet Age", size: "Dog Size", small: "Small (-10kg)", mid: "Medium", large: "Large (25kg+)", result: "Equivalent Human Age" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [type, setType] = useState<'dog' | 'cat'>('dog');
    const [age, setAge] = useState(3);
    const [size, setSize] = useState<'s' | 'm' | 'l'>('m');

    const calculateAge = () => {
        if (type === 'cat') {
            if (age === 1) return 15;
            if (age === 2) return 24;
            return 24 + (age - 2) * 4;
        } else {
            // Dog logic depends on size
            if (age === 1) return 15;
            if (age === 2) return 24;
            const factor = size === 's' ? 4 : size === 'm' ? 5 : 6;
            return 24 + (age - 2) * factor;
        }
    };

    const humanAge = calculateAge();

    return (
        <GameContainer title={t.title} subtitle="Species Lifecycle Bridge" onReset={() => { setType('dog'); setAge(3); setSize('m'); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex gap-2 p-1 bg-muted rounded-xl">
                            <button onClick={() => setType('dog')} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${type === 'dog' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}>🐶 {t.dog}</button>
                            <button onClick={() => setType('cat')} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${type === 'cat' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}>🐱 {t.cat}</button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase">{t.age}</label>
                            <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black outline-none" />
                        </div>
                    </div>

                    <div className="space-y-6">
                        {type === 'dog' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-right">
                                <label className="text-[10px] font-black text-muted-foreground uppercase">{t.size}</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 's', label: t.small },
                                        { id: 'm', label: t.mid },
                                        { id: 'l', label: t.large }
                                    ].map(s => (
                                        <button 
                                            key={s.id}
                                            onClick={() => setSize(s.id as any)}
                                            className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all ${size === s.id ? 'bg-primary/5 border-primary text-primary' : 'bg-muted/50 border-transparent text-muted-foreground'}`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-10 bg-primary/5 border border-primary/20 rounded-[40px] text-center shadow-2xl animate-in zoom-in-95">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">{t.result}</p>
                    <div className="flex items-center justify-center gap-4">
                        <h2 className="text-6xl font-black text-primary">{humanAge}</h2>
                        <span className="text-2xl font-black text-primary/60">세</span>
                    </div>
                    <p className="mt-6 text-sm font-medium text-muted-foreground">
                        {humanAge >= 60 ? "중장년기에 접어들었습니다. 정기적인 건강 검진이 필요합니다." : humanAge >= 20 ? "청년기입니다. 왕성한 활동을 즐길 시기입니다." : "성장기입니다. 풍부한 영양과 사회화가 중요합니다."}
                    </p>
                </div>
            </div>
        </GameContainer>
    );
};

export default PetAgeCalculator;
