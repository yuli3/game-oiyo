import React, { useState } from 'react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';

type Gender = 'm' | 'f';

const BodyFatCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const isKo = locale === 'ko';

    const t = {
        title: isKo ? '체지방률 계산기 (해군 공식)' : 'Body Fat Calculator (Navy Method)',
        subtitle: 'Navy Method',
        desc: isKo
            ? '목둘레·허리둘레·엉덩이둘레를 측정해 정확한 체지방률을 계산합니다.'
            : 'Measure neck, waist, and hip circumferences for an accurate body fat estimate.',
        gender: isKo ? '성별' : 'Gender',
        male: isKo ? '남성' : 'Male',
        female: isKo ? '여성' : 'Female',
        height: isKo ? '키 (cm)' : 'Height (cm)',
        weight: isKo ? '몸무게 (kg)' : 'Weight (kg)',
        waist: isKo ? '허리둘레 (cm)' : 'Waist (cm)',
        neck: isKo ? '목둘레 (cm)' : 'Neck (cm)',
        hip: isKo ? '엉덩이둘레 (cm, 여성)' : 'Hip (cm, female)',
        bodyFat: isKo ? '체지방률' : 'Body Fat %',
        fatMass: isKo ? '체지방량' : 'Fat Mass',
        leanMass: isKo ? '제지방량' : 'Lean Mass',
        idealWeight: isKo ? '이상적 체중 범위' : 'Ideal Weight Range',
        category: isKo ? '체지방 등급' : 'Fat Category',
        essential: isKo ? '필수 지방' : 'Essential',
        athlete: isKo ? '운동선수' : 'Athlete',
        fitness: isKo ? '피트니스' : 'Fitness',
        acceptable: isKo ? '보통' : 'Acceptable',
        obese: isKo ? '비만' : 'Obese',
    };

    type State = {
        gender: Gender;
        height: number;
        weight: number;
        waist: number;
        neck: number;
        hip: number;
    };

    const [state, setState] = useState<State>({
        gender: 'm',
        height: 175,
        weight: 70,
        waist: 82,
        neck: 37,
        hip: 95,
    });

    const set = (field: keyof State) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setState(prev => ({ ...prev, [field]: field === 'gender' ? e.target.value as Gender : Number(e.target.value) }));

    const { gender, height, weight, waist, neck, hip } = state;

    // Navy Method
    const bodyFat = gender === 'm'
        ? 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76
        : 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387;

    const clamped = Math.max(1, Math.min(60, bodyFat));
    const fatMass = (weight * clamped) / 100;
    const leanMass = weight - fatMass;

    // Ideal weight (BMI 18.5–24.9)
    const h2 = Math.pow(height / 100, 2);
    const idealMin = (18.5 * h2).toFixed(1);
    const idealMax = (24.9 * h2).toFixed(1);

    const getCategory = (bf: number) => {
        if (gender === 'm') {
            if (bf < 6) return { label: t.essential, color: 'text-info' };
            if (bf < 14) return { label: t.athlete, color: 'text-success' };
            if (bf < 18) return { label: t.fitness, color: 'text-success' };
            if (bf < 25) return { label: t.acceptable, color: 'text-warning' };
            return { label: t.obese, color: 'text-destructive' };
        } else {
            if (bf < 14) return { label: t.essential, color: 'text-info' };
            if (bf < 21) return { label: t.athlete, color: 'text-success' };
            if (bf < 25) return { label: t.fitness, color: 'text-success' };
            if (bf < 32) return { label: t.acceptable, color: 'text-warning' };
            return { label: t.obese, color: 'text-destructive' };
        }
    };

    const cat = getCategory(clamped);

    const handleReset = () => setState({ gender: 'm', height: 175, weight: 70, waist: 82, neck: 37, hip: 95 });

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

                <div className="grid grid-cols-2 gap-4">
                    {([
                        ['height', t.height],
                        ['weight', t.weight],
                        ['waist', t.waist],
                        ['neck', t.neck],
                        ...(state.gender === 'f' ? [['hip', t.hip] as [keyof State, string]] : []),
                    ] as [keyof State, string][]).map(([field, label]) => (
                        <div key={field} className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase">{label}</label>
                            <input
                                type="number"
                                value={state[field] as number}
                                onChange={set(field)}
                                className="w-full p-3 bg-muted/30 rounded-2xl border border-border font-black text-sm"
                                aria-label={label}
                            />
                        </div>
                    ))}
                </div>

                <div className="p-8 bg-foreground rounded-[32px] text-background flex flex-col gap-6 shadow-2xl">
                    <div className="flex flex-col sm:flex-row gap-6 items-center justify-around">
                        <div className="text-center space-y-1">
                            <p className="text-[10px] font-black text-background/60 uppercase tracking-widest">{t.bodyFat}</p>
                            <p className={`text-5xl font-black ${cat.color}`}>{clamped.toFixed(1)}%</p>
                            <p className={`text-sm font-bold ${cat.color}`}>{cat.label}</p>
                        </div>
                        <div className="w-px h-16 bg-foreground hidden sm:block" />
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-[10px] font-black text-background/60 uppercase tracking-widest">{t.fatMass}</p>
                                <p className="text-2xl font-black text-warning">{fatMass.toFixed(1)} kg</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-background/60 uppercase tracking-widest">{t.leanMass}</p>
                                <p className="text-2xl font-black text-success">{leanMass.toFixed(1)} kg</p>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-background/15 pt-4 text-center">
                        <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-1">{t.idealWeight}</p>
                        <p className="text-lg font-black text-background">{idealMin} — {idealMax} kg</p>
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default BodyFatCalculator;
