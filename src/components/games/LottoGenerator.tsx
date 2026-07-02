import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const LottoGenerator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "로또 번호 생성기", gen: "번호 자동 생성", reset: "초기화", lucky: "오늘의 행운수", desc: "매주 토요일, 당신의 설레임을 응원합니다." },
        en: { title: "Lotto Number Generator", gen: "Generate Numbers", lucky: "Your Lucky Numbers", desc: "Wishing you the best luck this week!" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [numbers, setNumbers] = useState<number[][]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateSet = () => {
        const set = new Set<number>();
        while (set.size < 6) {
            set.add(Math.floor(Math.random() * 45) + 1);
        }
        return Array.from(set).sort((a, b) => a - b);
    };

    const generateAll = () => {
        setIsGenerating(true);
        setNumbers([]);
        
        setTimeout(() => {
            const newSets = Array.from({ length: 5 }).map(() => generateSet());
            setNumbers(newSets);
            setIsGenerating(false);
        }, 1200);
    };

    const getBallColor = (n: number) => {
        if (n <= 10) return 'bg-amber-400 border-amber-500 text-white';
        if (n <= 20) return 'bg-blue-400 border-blue-500 text-white';
        if (n <= 30) return 'bg-rose-400 border-rose-500 text-white';
        if (n <= 40) return 'bg-slate-400 border-slate-500 text-white';
        return 'bg-emerald-400 border-emerald-500 text-white';
    };

    return (
        <GameContainer title={t.title} subtitle="Luck & Statistics" onReset={() => setNumbers([])}>
            <div className="space-y-8">
                <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground mb-6 leading-relaxed">{t.desc}</p>
                    <button 
                        onClick={generateAll}
                        disabled={isGenerating}
                        className="group relative px-12 py-4 bg-primary text-primary-foreground rounded-full font-black text-xl shadow-lg hover:shadow-primary/40 transition-all overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            {isGenerating ? 'GENERATING...' : t.gen}
                            <span className="text-2xl group-hover:rotate-12 transition-transform">🍀</span>
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </button>
                </div>

                <div className="space-y-4">
                    {numbers.length > 0 ? (
                        numbers.map((set, i) => (
                            <div 
                                key={i} 
                                className="flex justify-between items-center p-4 bg-muted/40 rounded-2xl border border-border animate-in slide-in-from-left duration-300"
                                style={{ animationDelay: `${i * 150}ms` }}
                            >
                                <span className="text-[10px] font-black text-muted-foreground uppercase">{i + 1} SET</span>
                                <div className="flex gap-2 sm:gap-4">
                                    {set.map((n, idx) => (
                                        <div 
                                            key={idx}
                                            className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full border-b-4 flex items-center justify-center font-black text-sm sm:text-lg shadow-sm ${getBallColor(n)}`}
                                        >
                                            {n}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center border-4 border-dashed border-muted rounded-3xl opacity-20">
                            <span className="text-6xl mb-4">🎰</span>
                            <p className="font-black uppercase tracking-widest">Click to reveal your future</p>
                        </div>
                    )}
                </div>
            </div>
        </GameContainer>
    );
};

export default LottoGenerator;
