import React, { useState, useEffect } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const MeetingCostCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "회의 비용 계산기", desc: "시간은 돈입니다. 참석 인원과 평균 시급을 바탕으로 현재 실시간으로 타오르고 있는 회의 비용을 계산합니다.", count: "참석 인원 (명)", wage: "평균 시급 (원)", start: "회의 시작", stop: "회의 종료", status: "현재 손실액", perSec: "초당 비용", efficiency: "의사결정 효율" },
        en: { title: "Meeting Cost Timer", desc: "Time is money. Calculate the real-time cost of your meeting based on participants' hourly rates.", count: "Participants", wage: "Avg Hourly Rate", start: "Start Meeting", stop: "Stop Meeting", status: "Current Loss", perSec: "Cost per Sec", efficiency: "Decision efficiency" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [participants, setParticipants] = useState(5);
    const [avgWage, setAvgWage] = useState(50000);
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedSec, setElapsedSec] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning) {
            interval = setInterval(() => {
                setElapsedSec(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    const totalCost = (participants * avgWage / 3600) * elapsedSec;
    const costPerSec = (participants * avgWage / 3600);

    return (
        <GameContainer title={t.title} subtitle="Corporate Efficiency Analytics" onReset={() => { setIsRunning(false); setElapsedSec(0); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md mx-auto">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.count}</label>
                        <input type="number" value={participants} onChange={(e) => setParticipants(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.wage}</label>
                        <input type="number" value={avgWage} onChange={(e) => setAvgWage(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black outline-none" />
                    </div>
                </div>

                <div className="p-10 bg-foreground rounded-[40px] text-background text-center shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">{t.status}</p>
                        <h2 className="text-5xl md:text-6xl font-black tabular-nums">₩{Math.round(totalCost).toLocaleString()}</h2>
                        <div className="mt-8 flex justify-center gap-12 border-t border-background/15 pt-8">
                            <div>
                                <p className="text-[10px] text-background/60 uppercase mb-1">Time</p>
                                <p className="text-lg font-bold tabular-nums">{Math.floor(elapsedSec / 60)}분 {elapsedSec % 60}초</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-background/60 uppercase mb-1">{t.perSec}</p>
                                <p className="text-lg font-bold text-destructive">₩{costPerSec.toFixed(0)}</p>
                            </div>
                        </div>
                    </div>
                    {/* Animated background loss fire effect */}
                    {isRunning && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-primary animate-pulse shadow-[0_0_20px_rgba(132,204,22,0.5)]" />
                    )}
                </div>

                <button 
                    onClick={() => setIsRunning(!isRunning)}
                    className={`w-full py-5 rounded-[32px] font-black text-xl shadow-lg transition-all active:scale-95 ${isRunning ? 'bg-destructive text-background' : 'bg-primary text-primary-foreground'}`}
                >
                    {isRunning ? t.stop : t.start}
                </button>
            </div>
        </GameContainer>
    );
};

export default MeetingCostCalculator;
