import React, { useState } from 'react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';

type ActivityLevel = 'low' | 'moderate' | 'high';
type Temperature = 'cool' | 'normal' | 'hot';

const ACTIVITY_BONUS: Record<ActivityLevel, number> = { low: 0, moderate: 350, high: 700 };
const TEMP_BONUS: Record<Temperature, number> = { cool: 0, normal: 150, hot: 350 };

const WaterIntakeCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const isKo = locale === 'ko';

    const t = {
        title: isKo ? '하루 물 섭취량 계산기' : 'Daily Water Intake Calculator',
        subtitle: isKo ? '적정 수분량' : 'Hydration',
        desc: isKo
            ? '체중·활동량·기온을 고려해 오늘 마셔야 할 적정 수분량을 계산합니다.'
            : 'Calculate your optimal daily water intake based on weight, activity level, and temperature.',
        weight: isKo ? '체중 (kg)' : 'Weight (kg)',
        activity: isKo ? '활동 수준' : 'Activity Level',
        activityLow: isKo ? '낮음 (사무직, 운동 없음)' : 'Low (desk job, no exercise)',
        activityModerate: isKo ? '보통 (주 2–3회 운동)' : 'Moderate (2–3 workouts/week)',
        activityHigh: isKo ? '높음 (매일 운동·육체노동)' : 'High (daily exercise or physical work)',
        temperature: isKo ? '현재 기온' : 'Current Temperature',
        tempCool: isKo ? '시원함 (20°C 이하)' : 'Cool (under 20°C)',
        tempNormal: isKo ? '보통 (20–30°C)' : 'Normal (20–30°C)',
        tempHot: isKo ? '더움 (30°C 이상)' : 'Hot (above 30°C)',
        coffee: isKo ? '커피 잔 수 (오늘)' : 'Cups of Coffee Today',
        alcohol: isKo ? '알코올 잔 수 (오늘)' : 'Alcoholic Drinks Today',
        recommended: isKo ? '권장 수분 섭취량' : 'Recommended Daily Water',
        base: isKo ? '기본량' : 'Base',
        activityBonus: isKo ? '활동 추가' : 'Activity Bonus',
        tempBonus: isKo ? '기온 추가' : 'Temperature Bonus',
        dehydration: isKo ? '이뇨 보충' : 'Diuretic Offset',
        total: isKo ? '총 권장량' : 'Total Recommended',
        cups: isKo ? '컵 (250ml 기준)' : 'cups (250ml each)',
        ml: 'ml',
    };

    type State = {
        weight: number;
        activity: ActivityLevel;
        temperature: Temperature;
        coffee: number;
        alcohol: number;
    };

    const [state, setState] = useState<State>({
        weight: 65,
        activity: 'moderate',
        temperature: 'normal',
        coffee: 1,
        alcohol: 0,
    });

    const { weight, activity, temperature, coffee, alcohol } = state;

    const base = weight * 30;
    const activityBonus = ACTIVITY_BONUS[activity];
    const tempBonus = TEMP_BONUS[temperature];
    const diureticOffset = coffee * 150 + alcohol * 200;
    const total = base + activityBonus + tempBonus + diureticOffset;
    const cups = Math.ceil(total / 250);
    const percent = Math.min(100, Math.round((total / 2500) * 100));

    const handleReset = () => setState({ weight: 65, activity: 'moderate', temperature: 'normal', coffee: 1, alcohol: 0 });

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={handleReset}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.weight}</label>
                        <input
                            type="number"
                            value={state.weight}
                            onChange={e => setState(prev => ({ ...prev, weight: Number(e.target.value) }))}
                            className="w-full p-3 bg-muted/30 rounded-2xl border border-border font-black text-sm"
                            aria-label={t.weight}
                            min={20}
                            max={300}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.activity}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['low', 'moderate', 'high'] as ActivityLevel[]).map(level => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setState(prev => ({ ...prev, activity: level }))}
                                    className={`py-2 px-1 rounded-xl text-[11px] font-black transition-colors ${state.activity === level ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                                    aria-pressed={state.activity === level}
                                >
                                    {level === 'low' ? t.activityLow.split(' (')[0] : level === 'moderate' ? t.activityModerate.split(' (')[0] : t.activityHigh.split(' (')[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">{t.temperature}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['cool', 'normal', 'hot'] as Temperature[]).map(temp => (
                                <button
                                    key={temp}
                                    type="button"
                                    onClick={() => setState(prev => ({ ...prev, temperature: temp }))}
                                    className={`py-2 px-1 rounded-xl text-[11px] font-black transition-colors ${state.temperature === temp ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                                    aria-pressed={state.temperature === temp}
                                >
                                    {temp === 'cool' ? t.tempCool.split(' (')[0] : temp === 'normal' ? t.tempNormal.split(' (')[0] : t.tempHot.split(' (')[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase">{t.coffee}</label>
                            <input
                                type="number"
                                value={state.coffee}
                                onChange={e => setState(prev => ({ ...prev, coffee: Number(e.target.value) }))}
                                className="w-full p-3 bg-muted/30 rounded-2xl border border-border font-black text-sm"
                                aria-label={t.coffee}
                                min={0}
                                max={20}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase">{t.alcohol}</label>
                            <input
                                type="number"
                                value={state.alcohol}
                                onChange={e => setState(prev => ({ ...prev, alcohol: Number(e.target.value) }))}
                                className="w-full p-3 bg-muted/30 rounded-2xl border border-border font-black text-sm"
                                aria-label={t.alcohol}
                                min={0}
                                max={20}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-stone-900 rounded-[32px] text-white flex flex-col gap-5 shadow-2xl">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">{t.total}</p>
                        <p className="text-6xl font-black text-blue-400">{Math.round(total)}<span className="text-xl text-stone-400 ml-1">{t.ml}</span></p>
                        <p className="text-sm font-bold text-stone-400 mt-1">{cups} {t.cups}</p>
                    </div>

                    <div className="w-full bg-stone-800 rounded-full h-3 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={t.recommended}>
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500"
                            style={{ width: `${percent}%` }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs border-t border-stone-800 pt-4">
                        <div className="flex justify-between">
                            <span className="text-stone-500">{t.base}</span>
                            <span className="font-black text-stone-300">{Math.round(base)} ml</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-500">{t.activityBonus}</span>
                            <span className="font-black text-emerald-400">+{activityBonus} ml</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-500">{t.tempBonus}</span>
                            <span className="font-black text-amber-400">+{tempBonus} ml</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-500">{t.dehydration}</span>
                            <span className="font-black text-rose-400">+{diureticOffset} ml</span>
                        </div>
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default WaterIntakeCalculator;
