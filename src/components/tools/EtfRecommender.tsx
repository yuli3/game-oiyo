import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const EtfRecommender: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "글로벌 ETF 추천 (투자 성향 분석)", desc: "간단한 설문을 통해 당신에게 최적화된 글로벌 자산 배분 전략을 제시합니다.", quiz: "투자 성향 퀴즈", result: "추천 포트폴리오", reset: "다시 진단하기", q1: "투자의 목적은 무엇인가요?", q2: "자산이 20% 하락한다면?", a1_1: "원금 보전", a1_2: "균형 잡힌 성장", a1_3: "공격적 수익", a2_1: "즉시 매도", a2_2: "지켜본다", a2_3: "추가 매수" },
        en: { title: "Global ETF Recommender", desc: "Get an optimized asset allocation strategy based on your investment propensity.", quiz: "Propensity Quiz", result: "Recommended Portfolio", reset: "Retake Quiz", q1: "What is your main goal?", q2: "If your asset drops 20%?", a1_1: "Capital Preservation", a1_2: "Balanced Growth", a1_3: "Aggressive Profit", a2_1: "Sell Immediately", a2_2: "Wait and see", a2_3: "Buy more" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [step, setStep] = useState(0);
    const [score, setScore] = useState(0);

    const questions = [
        { q: t.q1, options: [{ l: t.a1_1, s: 1 }, { l: t.a1_2, s: 3 }, { l: t.a1_3, s: 5 }] },
        { q: t.q2, options: [{ l: t.a2_1, s: 1 }, { l: t.a2_2, s: 3 }, { l: t.a2_3, s: 5 }] }
    ];

    const getRecommendation = () => {
        if (score <= 4) return { 
            type: locale === 'ko' ? '안정 추구형' : 'Passive', 
            desc: "원금을 지키며 인플레이션 수준의 수익을 추구합니다.",
            etfs: [{ n: 'SHV', w: 40 }, { n: 'AGG', w: 40 }, { n: 'VT', w: 20 }] 
        };
        if (score <= 7) return { 
            type: locale === 'ko' ? '위험 중립형' : 'Balanced', 
            desc: "변동성을 감내하며 시장 평균 수익을 목표로 합니다.",
            etfs: [{ n: 'IVV', w: 40 }, { n: 'VEA', w: 30 }, { n: 'BND', w: 30 }] 
        };
        return { 
            type: locale === 'ko' ? '적극 투자형' : 'Aggressive', 
            desc: "단기 변동성을 즐기며 시장을 상회하는 수익을 추구합니다.",
            etfs: [{ n: 'QQQ', w: 50 }, { n: 'SOXX', w: 20 }, { n: 'VUG', w: 30 }] 
        };
    };

    const rec = getRecommendation();

    return (
        <GameContainer title={t.title} subtitle="Strategic Asset Allocation" onReset={() => { setStep(0); setScore(0); }}>
            <div className="flex flex-col items-center gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">{t.desc}</p>
                
                {step < questions.length ? (
                    <div className="w-full max-w-sm space-y-6 animate-in slide-in-from-right">
                        <div className="bg-muted/30 p-8 rounded-3xl border border-border">
                            <h5 className="text-xl font-black mb-8 leading-tight">{questions[step].q}</h5>
                            <div className="space-y-3">
                                {questions[step].options.map((o, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => { setScore(score + o.s); setStep(step + 1); }}
                                        className="w-full p-4 bg-background border border-border rounded-2xl text-sm font-bold hover:bg-primary hover:text-background transition-all text-left flex justify-between group"
                                    >
                                        {o.l}
                                        <span className="opacity-0 group-hover:opacity-100">→</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">Question {step + 1} / {questions.length}</div>
                    </div>
                ) : (
                    <div className="w-full max-w-xl animate-in zoom-in-95">
                        <div className="p-10 bg-foreground rounded-[40px] text-background text-center shadow-2xl relative overflow-hidden">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">{t.result}</p>
                            <h4 className="text-4xl font-black mb-4">{rec.type}</h4>
                            <p className="text-sm text-background/50 mb-10">{rec.desc}</p>
                            
                            <div className="grid grid-cols-3 gap-4">
                                {rec.etfs.map((e, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="relative h-24 flex items-end justify-center">
                                            <div style={{ height: `${e.w}%` }} className="w-12 bg-primary rounded-t-lg transition-all duration-1000" />
                                        </div>
                                        <p className="text-lg font-black">{e.n}</p>
                                        <p className="text-[10px] text-background/60">{e.w}%</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default EtfRecommender;
