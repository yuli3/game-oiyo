import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const SeveranceCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "퇴직금 계산기", desc: "평균 임금과 재직 기간을 바탕으로 예상 퇴직금을 계산합니다. (퇴직소득세 미포함)", join: "입사일", exit: "퇴직일", wage: "월 평균 급여 (원)", bonus: "연간 상여금 (원)", result: "예상 퇴직금 합계", base: "평균 임금 (일)", days: "총 재직 일수", taxDesc: "* 실제 수령액은 퇴직소득세 부과에 따라 달라질 수 있습니다." },
        en: { title: "Severance Pay Calculator", desc: "Estimate your severance pay based on average wage and tenure.", join: "Join Date", exit: "Exit Date", wage: "Avg Monthly Pay", bonus: "Annual Bonus", result: "Total Severance Pay", base: "Avg Daily Wage", days: "Total Tenure Days", taxDesc: "* Actual payout may vary after income tax." }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [joinDate, setJoinDate] = useState('2020-01-01');
    const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
    const [monthlyWage, setMonthlyWage] = useState(4000000);
    const [annualBonus, setAnnualBonus] = useState(10000000);

    const start = new Date(joinDate);
    const end = new Date(exitDate);
    const diffTime = Math.max(0, end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Avg Daily Wage = (Last 3 months total pay + (Annual Bonus + Meal) / 4) / Days in last 3 months
    // Simplified for tool: (Monthly + Bonus/12) / 30
    const avgDailyWage = (monthlyWage + (annualBonus / 12)) / 30;
    const severance = (avgDailyWage * 30 * diffDays) / 365;

    return (
        <GameContainer title={t.title} subtitle="Employment Exit Strategy" onReset={() => { setJoinDate('2020-01-01'); setMonthlyWage(4000000); setAnnualBonus(10000000); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-muted-foreground uppercase">{t.join}</label>
                            <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black" />
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-muted-foreground uppercase">{t.exit}</label>
                            <input type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-muted-foreground uppercase">{t.wage}</label>
                            <input type="number" value={monthlyWage} onChange={(e) => setMonthlyWage(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black" />
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-muted-foreground uppercase">{t.bonus}</label>
                            <input type="number" value={annualBonus} onChange={(e) => setAnnualBonus(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black" />
                        </div>
                    </div>
                </div>

                <div className="p-10 bg-foreground rounded-[40px] text-background animate-in slide-in-from-bottom-6 shadow-2xl relative overflow-hidden">
                    <p className="text-[10px] font-black text-background/60 uppercase tracking-widest text-center mb-4">{t.result}</p>
                    <h2 className="text-5xl font-black text-center text-primary mb-10">₩{Math.round(severance).toLocaleString()}</h2>
                    
                    <div className="grid grid-cols-2 gap-8 border-t border-background/15 pt-8">
                        <div className="text-center">
                            <p className="text-[10px] text-background/60 uppercase mb-1">{t.days}</p>
                            <p className="text-xl font-bold">{diffDays}일</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-background/60 uppercase mb-1">{t.base}</p>
                            <p className="text-xl font-bold">₩{Math.round(avgDailyWage).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                
                <p className="text-xs text-center text-muted-foreground italic">{t.taxDesc}</p>
            </div>
        </GameContainer>
    );
};

export default SeveranceCalculator;
