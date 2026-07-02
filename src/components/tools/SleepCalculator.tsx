import React, { useState } from 'react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';

type Mode = 'bedtime' | 'wakeup';
type Chronotype = 'early' | 'normal' | 'late';

const CYCLE_MINUTES = 90;
const FALL_ASLEEP_MINUTES = 14;

const formatTime = (totalMinutes: number): string => {
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    return `${hStr}:${mStr}`;
};

const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
};

const SleepCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const isKo = locale === 'ko';

    const t = {
        title: isKo ? '수면 계산기' : 'Sleep Calculator',
        subtitle: isKo ? '최적 수면 시간' : 'Optimal Sleep',
        desc: isKo
            ? '90분 수면 주기를 기반으로 최적의 기상 시간 또는 취침 시간을 계산합니다.'
            : 'Calculate optimal wake-up or bedtime based on 90-minute sleep cycles.',
        mode: isKo ? '계산 방향' : 'Mode',
        modeBedtime: isKo ? '취침 → 기상' : 'Bedtime → Wake up',
        modeWakeup: isKo ? '기상 → 취침' : 'Wake up → Bedtime',
        bedtime: isKo ? '취침 시각' : 'Bedtime',
        wakeup: isKo ? '기상 시각' : 'Wake-up Time',
        results: isKo ? '권장 시각 (수면 주기 기준)' : 'Recommended Times (by cycle)',
        cycles: isKo ? '주기' : 'cycles',
        hours: isKo ? '시간' : 'h',
        chronotype: isKo ? '수면 유형 (크로노타입)' : 'Chronotype',
        early: isKo ? '아침형 (5–7시 기상)' : 'Morning (5–7am wake)',
        normal: isKo ? '중간형 (7–9시 기상)' : 'Intermediate (7–9am wake)',
        late: isKo ? '저녁형 (9시+ 기상)' : 'Evening (9am+ wake)',
        chronotypeAdvice: {
            early: isKo ? '아침형: 21–22시 취침, 05–06시 기상이 최적입니다.' : 'Morning type: Aim for 9–10pm bedtime, 5–6am wake.',
            normal: isKo ? '중간형: 22–23시 취침, 07–08시 기상이 최적입니다.' : 'Intermediate: Aim for 10–11pm bedtime, 7–8am wake.',
            late: isKo ? '저녁형: 00–01시 취침, 08–09시 기상이 최적입니다.' : 'Evening type: Aim for midnight–1am bedtime, 8–9am wake.',
        },
        sleepDebt: isKo ? '수면 부채 계산기' : 'Sleep Debt Calculator',
        actualSleep: isKo ? '어젯밤 실제 수면 시간 (시간)' : 'Last night actual sleep (hours)',
        debtResult: isKo ? '수면 부채' : 'Sleep Debt',
        none: isKo ? '없음' : 'None',
        fallAsleep: isKo ? '잠들기까지 약 14분 소요 포함' : 'Includes ~14 min to fall asleep',
    };

    type State = {
        mode: Mode;
        time: string;
        chronotype: Chronotype;
        actualSleep: number;
    };

    const [state, setState] = useState<State>({
        mode: 'bedtime',
        time: '23:00',
        chronotype: 'normal',
        actualSleep: 7,
    });

    const { mode, time, chronotype, actualSleep } = state;

    const baseMinutes = timeToMinutes(time);

    // 5 cycles (7.5h), 6 cycles (9h), 7 cycles (10.5h)
    const cycleCounts = [5, 6, 7];
    const results = cycleCounts.map(cycles => {
        const durationMinutes = cycles * CYCLE_MINUTES;
        let targetMinutes: number;
        if (mode === 'bedtime') {
            // bedtime → wake up: add duration + fall asleep time
            targetMinutes = baseMinutes + FALL_ASLEEP_MINUTES + durationMinutes;
        } else {
            // wakeup → bedtime: subtract duration + fall asleep time
            targetMinutes = baseMinutes - FALL_ASLEEP_MINUTES - durationMinutes;
        }
        return {
            cycles,
            hours: durationMinutes / 60,
            time: formatTime(targetMinutes),
        };
    });

    const idealHours = 8;
    const debtHours = Math.max(0, idealHours - actualSleep);

    const handleReset = () => setState({ mode: 'bedtime', time: '23:00', chronotype: 'normal', actualSleep: 7 });

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={handleReset}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>

                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                    <button
                        type="button"
                        onClick={() => setState(prev => ({ ...prev, mode: 'bedtime' }))}
                        className={`flex-1 py-2 rounded-lg font-black text-xs transition-colors ${state.mode === 'bedtime' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        aria-pressed={state.mode === 'bedtime'}
                    >{t.modeBedtime}</button>
                    <button
                        type="button"
                        onClick={() => setState(prev => ({ ...prev, mode: 'wakeup' }))}
                        className={`flex-1 py-2 rounded-lg font-black text-xs transition-colors ${state.mode === 'wakeup' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        aria-pressed={state.mode === 'wakeup'}
                    >{t.modeWakeup}</button>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase">
                        {mode === 'bedtime' ? t.bedtime : t.wakeup}
                    </label>
                    <input
                        type="time"
                        value={state.time}
                        onChange={e => setState(prev => ({ ...prev, time: e.target.value }))}
                        className="w-full p-3 bg-muted/30 rounded-2xl border border-border font-black text-sm"
                        aria-label={mode === 'bedtime' ? t.bedtime : t.wakeup}
                    />
                </div>

                <div className="p-6 bg-foreground rounded-[32px] text-background flex flex-col gap-4 shadow-2xl">
                    <p className="text-[10px] font-black text-background/60 uppercase tracking-widest text-center">{t.results}</p>
                    <div className="grid grid-cols-3 gap-3">
                        {results.map(r => (
                            <div key={r.cycles} className="text-center p-3 bg-foreground/60 rounded-2xl">
                                <p className="text-[9px] font-black text-background/60 uppercase">{r.cycles} {t.cycles}</p>
                                <p className="text-2xl font-black text-primary mt-1">{r.time}</p>
                                <p className="text-[10px] text-background/50 font-bold">{r.hours}{t.hours}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-background/50 text-center">{t.fallAsleep}</p>
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">{t.chronotype}</p>
                    <div className="grid grid-cols-3 gap-2">
                        {(['early', 'normal', 'late'] as Chronotype[]).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setState(prev => ({ ...prev, chronotype: type }))}
                                className={`py-2 px-1 rounded-xl text-[11px] font-black transition-colors ${state.chronotype === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                                aria-pressed={state.chronotype === type}
                            >
                                {type === 'early' ? (isKo ? '아침형' : 'Morning') : type === 'normal' ? (isKo ? '중간형' : 'Intermediate') : (isKo ? '저녁형' : 'Evening')}
                            </button>
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium p-3 bg-muted/40 rounded-2xl">
                        {t.chronotypeAdvice[chronotype]}
                    </p>
                </div>

                <div className="space-y-3 p-5 bg-muted/30 rounded-2xl border border-border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">{t.sleepDebt}</p>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground">{t.actualSleep}</label>
                        <input
                            type="number"
                            value={state.actualSleep}
                            onChange={e => setState(prev => ({ ...prev, actualSleep: Number(e.target.value) }))}
                            className="w-full p-3 bg-background rounded-2xl border border-border font-black text-sm"
                            aria-label={t.actualSleep}
                            min={0}
                            max={24}
                            step={0.5}
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-black text-muted-foreground">{t.debtResult}</span>
                        <span className={`text-xl font-black ${debtHours > 0 ? 'text-destructive' : 'text-success'}`}>
                            {debtHours > 0 ? `-${debtHours.toFixed(1)}h` : t.none}
                        </span>
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default SleepCalculator;
