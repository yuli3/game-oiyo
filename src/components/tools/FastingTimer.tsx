import React, { useState, useEffect } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const FastingTimer: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "간헐적 단식 타이머", desc: "단식과 식사 주기를 관리하여 대사 건강을 개선합니다.", start: "단식 시작", end: "단식 종료", status: "상태", fasting: "단식 중", eating: "식사 가능", target: "목표 시간", progress: "진행 상황", reset: "초기화" },
        en: { title: "Fasting Timer", desc: "Manage fasting and eating windows to improve metabolic health.", start: "Start Fasting", end: "End Fasting", status: "Status", fasting: "Fasting", eating: "Eating Window", target: "Target Hours", progress: "Progress", reset: "Reset" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [isFasting, setIsFasting] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [targetHours, setTargetHours] = useState(16);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isFasting && startTime) {
            interval = setInterval(() => {
                setElapsed(Date.now() - startTime);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isFasting, startTime]);

    const formatTime = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const progress = Math.min((elapsed / (targetHours * 3600000)) * 100, 100);

    return (
        <GameContainer title={t.title} subtitle="Metabolic Health Assistant" onReset={() => { setIsFasting(false); setStartTime(null); setElapsed(0); }}>
            <div className="flex flex-col items-center gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">{t.desc}</p>
                
                <div className="flex gap-4 p-1 bg-muted rounded-2xl w-full max-w-sm">
                    {[12, 16, 18, 20].map(h => (
                        <button key={h} onClick={() => setTargetHours(h)} className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${targetHours === h ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}>{h}H</button>
                    ))}
                </div>

                <div className="relative w-64 h-64 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="128" cy="128" r="110" className="stroke-muted fill-none stroke-[12]" />
                        <circle 
                            cx="128" cy="128" r="110" 
                            className={`fill-none stroke-[12] transition-all duration-1000 ${isFasting ? 'stroke-primary' : 'stroke-success'}`}
                            strokeDasharray={2 * Math.PI * 110}
                            strokeDashoffset={2 * Math.PI * 110 * (1 - progress / 100)}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="text-center z-10">
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">{isFasting ? t.fasting : t.eating}</p>
                        <h2 className="text-4xl font-black tabular-nums">{formatTime(elapsed)}</h2>
                        <p className="text-[10px] text-muted-foreground mt-2">GOAL: {targetHours} HOURS</p>
                    </div>
                </div>

                <button 
                    onClick={() => {
                        if (isFasting) {
                            setIsFasting(false);
                            setStartTime(null);
                        } else {
                            setIsFasting(true);
                            setStartTime(Date.now());
                        }
                    }}
                    className={`w-full max-w-sm py-4 rounded-3xl font-black text-lg shadow-lg active:scale-95 transition-all ${isFasting ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}
                >
                    {isFasting ? t.end : t.start}
                </button>
            </div>
        </GameContainer>
    );
};

export default FastingTimer;
