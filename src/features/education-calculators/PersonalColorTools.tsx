import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Palette from 'lucide-react/dist/esm/icons/palette'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';

/**
 * Simplified Personal Color Mini-Test
 * Ported theme from oiyo.net
 */
export const PersonalColorMiniTest: React.FC = () => {
    const [step, setStep] = useState(0);
    const [scores, setScores] = useState({ warm: 0, cool: 0, light: 0, deep: 0 });
    const [result, setResult] = useState<string | null>(null);

    const questions = [
        {
            q: "피부톤은 어떤 쪽에 가깝나요?",
            options: [
                { text: "노란기가 도는 따뜻한 느낌", type: 'warm' },
                { text: "붉은기가 있거나 창백한 느낌", type: 'cool' }
            ]
        },
        {
            q: "잘 어울리는 액세서리는?",
            options: [
                { text: "골드 (Gold)", type: 'warm' },
                { text: "실버 (Silver)", type: 'cool' }
            ]
        },
        {
            q: "눈동자 색상과 명도는?",
            options: [
                { text: "밝은 갈색 혹은 부드러운 느낌", type: 'light' },
                { text: "진한 갈색 혹은 검은색의 선명한 느낌", type: 'deep' }
            ]
        },
        {
            q: "이미지적으로 본인은?",
            options: [
                { text: "부드럽고 밝은 느낌 (귀여움, 깨끗함)", type: 'light' },
                { text: "묵직하고 강렬한 느낌 (무거움, 시크함)", type: 'deep' }
            ]
        }
    ];

    const handleAnswer = (type: string) => {
        const newScores = { ...scores, [type]: (scores as any)[type] + 1 };
        setScores(newScores);

        if (step < questions.length - 1) {
            setStep(step + 1);
        } else {
            calculateResult(newScores);
        }
    };

    const calculateResult = (finalScores: any) => {
        let season = "";
        const base = finalScores.warm >= finalScores.cool ? "Warm" : "Cool";
        const brightness = finalScores.light >= finalScores.deep ? "Light/Bright" : "Deep/Mute";

        if (base === "Warm") {
            season = brightness === "Light/Bright" ? "Spring (봄 웜)" : "Autumn (가을 웜)";
        } else {
            season = brightness === "Light/Bright" ? "Summer (여름 쿨)" : "Winter (겨울 쿨)";
        }
        setResult(season);
    };

    const reset = () => {
        setStep(0);
        setScores({ warm: 0, cool: 0, light: 0, deep: 0 });
        setResult(null);
    };

    return (
        <Card className="p-8 bg-gradient-to-br from-rose-50 to-indigo-50 border-white shadow-2xl mt-8 min-h-[400px] flex flex-col justify-center">
            {!result ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 mb-4 justify-center">
                        <Palette className="text-rose-400" />
                        <h3 className="text-xl font-bold text-slate-800">나의 퍼스널 컬러 자가진단</h3>
                        <Sparkles className="text-amber-400 w-4 h-4" />
                    </div>

                    <div className="text-center space-y-4">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question {step + 1} of {questions.length}</div>
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-snug">{questions[step].q}</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                        {questions[step].options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => handleAnswer(opt.type)}
                                className="p-5 bg-white hover:bg-rose-50 border-2 border-slate-100 hover:border-rose-200 rounded-2xl text-slate-700 font-bold transition-all text-lg shadow-sm hover:shadow-md active:scale-95"
                            >
                                {opt.text}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center space-y-8 animate-in zoom-in duration-500">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="text-emerald-500 w-10 h-10" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">진단 결과</span>
                        <h4 className="text-4xl font-black text-slate-900 tracking-tight">당신은 <span className="text-rose-500 underline decoration-rose-200">{result}</span> 타입!</h4>
                    </div>
                    
                    <p className="text-slate-500 max-w-sm mx-auto">
                        결과는 간이 테스트용입니다. 더 정확한 분석을 위해 각 타입 가이드를 확인해보세요!
                    </p>

                    <Button onClick={reset} variant="outline" className="rounded-full px-8">테스트 다시하기</Button>
                </div>
            )}
        </Card>
    );
};
