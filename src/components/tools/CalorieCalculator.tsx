import React, { useState } from 'react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';

type Gender = 'm' | 'f';
type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

const ACTIVITY_MULTIPLIERS: Record<Activity, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
};

const CalorieCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const isKo = locale === 'ko';

    const t = {
        title: isKo ? '하루 칼로리 계산기' : 'Daily Calorie Calculator',
        subtitle: 'BMR · TDEE',
        desc: isKo
            ? 'Mifflin-St Jeor 공식으로 기초대사량(BMR)과 총 에너지 소비량(TDEE)을 계산합니다.'
            : 'Calculate your Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE) using the Mifflin-St Jeor formula.',
        gender: isKo ? '성별' : 'Gender',
        male: isKo ? '남성' : 'Male',
        female: isKo ? '여성' : 'Female',
        age: isKo ? '나이 (세)' : 'Age',
        height: isKo ? '키 (cm)' : 'Height (cm)',
        weight: isKo ? '몸무게 (kg)' : 'Weight (kg)',
        activity: isKo ? '활동 수준' : 'Activity Level',
        activityLevels: {
            sedentary: isKo ? '비활동적 (운동 없음)' : 'Sedentary (no exercise)',
            light: isKo ? '가벼운 활동 (주 1–3회)' : 'Light (1–3 days/week)',
            moderate: isKo ? '보통 활동 (주 3–5회)' : 'Moderate (3–5 days/week)',
            active: isKo ? '활발한 활동 (주 6–7회)' : 'Active (6–7 days/week)',
            very_active: isKo ? '매우 활발 (운동+육체노동)' : 'Very Active (hard exercise + physical job)',
        },
        bmr: isKo ? '기초대사량 (BMR)' : 'BMR',
        tdee: isKo ? '총 에너지 소비량 (TDEE)' : 'TDEE',
        loss: isKo ? '체중 감량' : 'Weight Loss',
        maintenance: isKo ? '체중 유지' : 'Maintenance',
        gain: isKo ? '체중 증량' : 'Weight Gain',
        macros: isKo ? '권장 매크로 (TDEE 기준)' : 'Recommended Macros (based on TDEE)',
        protein: isKo ? '단백질 30%' : 'Protein 30%',
        carbs: isKo ? '탄수화물 40%' : 'Carbs 40%',
        fat: isKo ? '지방 30%' : 'Fat 30%',
        kcal: 'kcal',
        g: 'g',
    };

    type State = {
        gender: Gender;
        age: number;
        height: number;
        weight: number;
        activity: Activity;
    };

    const [state, setState] = useState<State>({
        gender: 'm',
        age: 30,
        height: 175,
        weight: 70,
        activity: 'moderate',
    });

    const { gender, age, height, weight, activity } = state;

    // Mifflin-St Jeor
    const bmr = gender === 'm'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    const tdee = bmr * ACTIVITY_MULTIPLIERS[activity];
    const lossKcal = tdee - 500;
    const gainKcal = tdee + 500;

    // Macros (protein: 4kcal/g, carbs: 4kcal/g, fat: 9kcal/g)
    const proteinG = (tdee * 0.30 / 4).toFixed(0);
    const carbsG = (tdee * 0.40 / 4).toFixed(0);
    const fatG = (tdee * 0.30 / 9).toFixed(0);

    const handleReset = () => setState({ gender: 'm', age: 30, height: 175, weight: 70, activity: 'moderate' });

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={handleReset}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>

                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                    <button
                        type="button"
                        onClick={() => setState(prev => ({ ...prev, gender: 'm' }))}
                        className={`flex-1 py-2 rounded-lg font-black text-xs transition-colors ${state.gender === 'm' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        aria-pressed={state.gender === 'm'}
                        aria-label={t.male}
                    >{t.male}</button>
                    <button
                        type="button"
                        onClick={() => setState(prev => ({ ...prev, gender: 'f' }))}
                        className={`flex-1 py-2 rounded-lg font-black text-xs transition-colors ${state.gender === 'f' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                        aria-pressed={state.gender === 'f'}
                        aria-label={t.female}
                    >{t.female}</button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    {([
                        ['age', t.age],
                        ['height', t.height],
                        ['weight', t.weight],
                    ] as [keyof State, string][]).map(([field, label]) => (
                        <div key={field} className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase">{label}</label>
                            <input
                                type="number"
                                value={state[field] as number}
                                onChange={e => setState(prev => ({ ...prev, [field]: Number(e.target.value) }))}
                                className="w-full p-3 bg-muted/30 rounded-2xl border border-border font-black text-sm"
                                aria-label={label}
                            />
                        </div>
                    ))}
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase">{t.activity}</label>
                    <select
                        value={state.activity}
                        onChange={e => setState(prev => ({ ...prev, activity: e.target.value as Activity }))}
                        className="w-full p-3 bg-muted/30 rounded-2xl border border-border font-black text-sm appearance-none cursor-pointer"
                        aria-label={t.activity}
                    >
                        {(Object.keys(ACTIVITY_MULTIPLIERS) as Activity[]).map(key => (
                            <option key={key} value={key}>{t.activityLevels[key]}</option>
                        ))}
                    </select>
                </div>

                <div className="p-8 bg-foreground rounded-[32px] text-background flex flex-col gap-6 shadow-2xl">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-around">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-background/60 uppercase tracking-widest">{t.bmr}</p>
                            <p className="text-3xl font-black text-background">{Math.round(bmr)} <span className="text-base text-background/50">{t.kcal}</span></p>
                        </div>
                        <div className="w-px h-12 bg-foreground hidden sm:block" />
                        <div className="text-center">
                            <p className="text-[10px] font-black text-background/60 uppercase tracking-widest">{t.tdee}</p>
                            <p className="text-4xl font-black text-primary">{Math.round(tdee)} <span className="text-base text-background/50">{t.kcal}</span></p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 border-t border-background/15 pt-5">
                        <div className="text-center p-3 bg-foreground/50 rounded-2xl">
                            <p className="text-[9px] font-black text-background/60 uppercase tracking-widest mb-1">{t.loss}</p>
                            <p className="text-xl font-black text-destructive">{Math.round(lossKcal)}</p>
                            <p className="text-[9px] text-background/60">{t.kcal}</p>
                        </div>
                        <div className="text-center p-3 bg-success/40 rounded-2xl ring-1 ring-success/30">
                            <p className="text-[9px] font-black text-background/60 uppercase tracking-widest mb-1">{t.maintenance}</p>
                            <p className="text-xl font-black text-success">{Math.round(tdee)}</p>
                            <p className="text-[9px] text-background/60">{t.kcal}</p>
                        </div>
                        <div className="text-center p-3 bg-foreground/50 rounded-2xl">
                            <p className="text-[9px] font-black text-background/60 uppercase tracking-widest mb-1">{t.gain}</p>
                            <p className="text-xl font-black text-warning">{Math.round(gainKcal)}</p>
                            <p className="text-[9px] text-background/60">{t.kcal}</p>
                        </div>
                    </div>
                    <div className="border-t border-background/15 pt-4">
                        <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-3 text-center">{t.macros}</p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-xs font-black text-info">{t.protein}</p>
                                <p className="text-lg font-black text-background">{proteinG}{t.g}</p>
                            </div>
                            <div>
                                <p className="text-xs font-black text-warning">{t.carbs}</p>
                                <p className="text-lg font-black text-background">{carbsG}{t.g}</p>
                            </div>
                            <div>
                                <p className="text-xs font-black text-destructive">{t.fat}</p>
                                <p className="text-lg font-black text-background">{fatG}{t.g}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default CalorieCalculator;
