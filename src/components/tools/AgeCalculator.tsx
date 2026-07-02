import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const AgeCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "나이 & 출생 연도 계산기", desc: "출생일을 기준으로 만나이, 연나이, 띠를 계산하며 주요 생애 이벤트를 예측합니다.", birth: "생년월일", result: "분석 결과", intlAge: "만 나이", yearAge: "연 나이", zodiac: "띠", event: "생애 주요 마일스톤" },
        en: { title: "Age & Birth Year Calculator", desc: "Calculate international age, zodiac signs, and key life milestones based on your birth date.", birth: "Date of Birth", result: "Analysis", intlAge: "International Age", yearAge: "Year Age", zodiac: "Zodiac", event: "Life Milestones" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [birth, setBirth] = useState<string>('1990-01-01');

    const birthDate = new Date(birth);
    const today = new Date();
    
    // International Age
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    // Year Age (Korean traditional for some contexts)
    const yearAge = today.getFullYear() - birthDate.getFullYear();

    // Zodiac (Chinese)
    const zodiacs = ["원숭이", "닭", "개", "돼지", "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양"];
    const zodiac = zodiacs[birthDate.getFullYear() % 12];

    return (
        <GameContainer title={t.title} subtitle="Temporal Identity Bridge" onReset={() => setBirth('1990-01-01')}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md mx-auto">{t.desc}</p>
                
                <div className="w-full max-w-sm mx-auto space-y-4">
                    <label className="text-[10px] font-black text-muted-foreground uppercase">{t.birth}</label>
                    <input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className="w-full p-6 bg-muted/30 rounded-[32px] border border-border font-black text-2xl text-center outline-none focus:ring-4 focus:ring-primary/10" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-8 bg-foreground rounded-[40px] text-background text-center shadow-xl flex flex-col justify-center">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">{t.intlAge}</p>
                        <h2 className="text-6xl font-black">{age}</h2>
                        <p className="text-xs text-background/60 mt-2">표준 법적 나이</p>
                    </div>
                    
                    <div className="p-8 bg-muted/30 rounded-[40px] flex flex-col justify-center gap-6">
                        <div className="flex justify-between items-center border-b border-border pb-4">
                            <span className="text-[10px] font-black text-muted-foreground uppercase">{t.yearAge}</span>
                            <span className="text-lg font-bold">{yearAge}세</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-muted-foreground uppercase">{t.zodiac}</span>
                            <span className="text-lg font-bold">{zodiac}띠</span>
                        </div>
                    </div>

                    <div className="p-8 bg-primary/5 border border-primary/20 rounded-[40px] flex flex-col justify-center space-y-4">
                        <p className="text-[10px] font-black text-primary uppercase">{t.event}</p>
                        <div className="space-y-4">
                            <div className="flex gap-4 items-center">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary text-xs font-black">100</div>
                                <p className="text-xs font-bold">100세: {birthDate.getFullYear() + 100}년</p>
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary text-xs font-black">환갑</div>
                                <p className="text-xs font-bold">61세: {birthDate.getFullYear() + 60}년</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default AgeCalculator;
