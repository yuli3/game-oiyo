import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Zap from 'lucide-react/dist/esm/icons/zap'
import Keyboard from 'lucide-react/dist/esm/icons/keyboard'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import Trophy from 'lucide-react/dist/esm/icons/trophy';

/**
 * Premium Typing Speed Test
 * Traffic Magnet tool from ahoxy themes
 */
export const TypingSpeedTest: React.FC = () => {
    const textToType = "성공적인 삶을 위한 가장 중요한 기술은 끊임없이 배우고 적응하는 능력입니다. 우리는 매일 새로운 정보를 접하며 변화하는 세상 속에서 자신만의 길을 찾아나가야 합니다.";
    const [inputValue, setInputValue] = useState("");
    const [startTime, setStartTime] = useState<number | null>(null);
    const [wpm, setWpm] = useState(0);
    const [accuracy, setAccuracy] = useState(100);
    const [isFinished, setIsFinished] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (inputValue.length > 0 && !startTime) {
            setStartTime(Date.now());
        }

        if (inputValue === textToType) {
            finishTest();
        }

        // Calculate Accuracy
        let errors = 0;
        for (let i = 0; i < inputValue.length; i++) {
            if (inputValue[i] !== textToType[i]) errors++;
        }
        setAccuracy(Math.max(0, Math.round(((inputValue.length - errors) / inputValue.length) * 100)) || 100);
        
        // Live WPM
        if (startTime && !isFinished) {
            const timeElapsed = (Date.now() - startTime) / 60000; // in minutes
            const wordsTyped = inputValue.length / 5;
            setWpm(Math.round(wordsTyped / timeElapsed));
        }
    }, [inputValue]);

    const finishTest = () => {
        setIsFinished(true);
        if (startTime) {
            const totalTime = (Date.now() - startTime) / 60000;
            setWpm(Math.round((textToType.length / 5) / totalTime));
        }
    };

    const reset = () => {
        setInputValue("");
        setStartTime(null);
        setWpm(0);
        setAccuracy(100);
        setIsFinished(false);
    };

    return (
        <Card className="p-8 bg-slate-950 border-slate-800 text-white shadow-2xl mt-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Keyboard size={120} />
            </div>

            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <Zap className="text-yellow-400 fill-yellow-400" />
                    <h3 className="text-xl font-black italic tracking-tighter">타이핑 속도 테스트</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={reset} className="text-slate-400 hover:text-white">
                    <RefreshCw size={16} className="mr-2" /> 초기화
                </Button>
            </div>

            <div className="space-y-6 relative z-10">
                <div className="p-6 bg-slate-900/50 rounded-2xl border border-white/5 text-lg leading-relaxed font-medium select-none">
                    {textToType.split("").map((char, i) => {
                        let color = "text-slate-500";
                        if (i < inputValue.length) {
                            color = inputValue[i] === char ? "text-emerald-400" : "text-rose-500 underline decoration-2";
                        }
                        return <span key={i} className={color}>{char}</span>;
                    })}
                </div>

                <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => !isFinished && setInputValue(e.target.value)}
                    disabled={isFinished}
                    placeholder="위의 문장을 따라 적어보세요..."
                    className="w-full h-24 bg-slate-900 border-2 border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl p-4 text-white resize-none transition-all placeholder:text-slate-700 outline-none"
                    autoFocus
                />

                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-900 rounded-xl border border-white/5 text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">현재 속도 (WPM)</div>
                        <div className="text-3xl font-black text-blue-400 font-mono">{wpm}</div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-xl border border-white/5 text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">정확도 (ACC)</div>
                        <div className="text-3xl font-black text-emerald-400 font-mono">{accuracy}%</div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-xl border border-white/5 text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">경과 시간</div>
                        <div className="text-3xl font-black text-amber-400 font-mono">
                            {startTime ? Math.round((Date.now() - (startTime || 0)) / 1000) : 0}s
                        </div>
                    </div>
                </div>

                {isFinished && (
                    <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-center animate-in zoom-in">
                        <Trophy className="mx-auto mb-2 text-yellow-300" size={32} />
                        <h4 className="text-xl font-bold mb-1">테스트 완료!</h4>
                        <p className="text-blue-100 text-sm">기록: {wpm} WPM | 정확도 {accuracy}%</p>
                        <Button onClick={reset} className="mt-4 bg-white text-blue-600 hover:bg-slate-100 font-bold px-8 rounded-full">다시 도전</Button>
                    </div>
                )}
            </div>
        </Card>
    );
};

/**
 * Prisoner's Dilemma Simulator
 */
export const PrisonersDilemma: React.FC = () => {
    const [playerScore, setPlayerScore] = useState(0);
    const [aiScore, setAiScore] = useState(0);
    const [history, setHistory] = useState<{player: string, ai: string, result: string}[]>([]);
    const [strategy, setStrategy] = useState("TitForTat");

    const play = (playerChoice: "Cooperate" | "Defect") => {
        // AI Strategy
        let aiChoice: "Cooperate" | "Defect" = "Cooperate";
        if (strategy === "AlwaysDefect") aiChoice = "Defect";
        if (strategy === "TitForTat") {
            aiChoice = history.length > 0 ? (history[history.length - 1].player as any) : "Cooperate";
        }
        if (strategy === "Random") aiChoice = Math.random() > 0.5 ? "Cooperate" : "Defect";

        let pGain = 0;
        let aGain = 0;
        let result = "";

        if (playerChoice === "Cooperate" && aiChoice === "Cooperate") {
            pGain = 3; aGain = 3; result = "양측 협력: 평화로운 보상";
        } else if (playerChoice === "Cooperate" && aiChoice === "Defect") {
            pGain = 0; aGain = 5; result = "배신 발생: AI의 일방적 이득";
        } else if (playerChoice === "Defect" && aiChoice === "Cooperate") {
            pGain = 5; aGain = 0; result = "배신 발생: 플레이어의 일방적 이득";
        } else {
            pGain = 1; aGain = 1; result = "양측 배신: 공멸의 길";
        }

        setPlayerScore(prev => prev + pGain);
        setAiScore(prev => prev + aGain);
        setHistory([...history, { player: playerChoice, ai: aiChoice, result }]);
    };

    const reset = () => {
        setPlayerScore(0);
        setAiScore(0);
        setHistory([]);
    };

    return (
        <Card className="p-8 bg-white border-slate-200 shadow-xl mt-8">
            <div className="flex items-center justify-between mb-8 border-b pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="p-1 px-2 bg-slate-900 text-white rounded text-sm">GAME THEORY</span>
                    죄수의 딜레마 게임
                </h3>
                <select 
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="p-2 border rounded text-xs font-bold"
                >
                    <option value="TitForTat">AI: Tit-for-tat (눈에는 눈)</option>
                    <option value="AlwaysDefect">AI: Always Defect (항상 배신)</option>
                    <option value="Random">AI: Random (무작위)</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 text-center">
                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                    <div className="text-xs font-bold text-blue-400 mb-2">플레이어 점수</div>
                    <div className="text-4xl font-black text-blue-600">{playerScore}</div>
                </div>
                <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100">
                    <div className="text-xs font-bold text-rose-400 mb-2">AI 점수</div>
                    <div className="text-4xl font-black text-rose-600">{aiScore}</div>
                </div>
            </div>

            <div className="flex gap-4 justify-center mb-10">
                <Button 
                    onClick={() => play("Cooperate")}
                    className="flex-1 py-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-lg border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 transition-all"
                >
                    <div className="flex flex-col gap-1">
                        <span className="text-2xl font-black">협력 (Cooperate)</span>
                        <span className="text-[10px] opacity-80">둘 다 협력하면 각자 +3점</span>
                    </div>
                </Button>
                <Button 
                    onClick={() => play("Defect")}
                    className="flex-1 py-10 bg-slate-800 hover:bg-slate-950 text-white rounded-2xl shadow-lg border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all"
                >
                    <div className="flex flex-col gap-1">
                        <span className="text-2xl font-black">배신 (Defect)</span>
                        <span className="text-[10px] opacity-80">홀로 배신하면 나만 +5점</span>
                    </div>
                </Button>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {history.slice().reverse().map((h, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-xs">
                        <div className="flex gap-4 font-bold">
                            <span className={h.player === "Cooperate" ? "text-emerald-500" : "text-slate-900"}>YOU: {h.player}</span>
                            <span className={h.ai === "Cooperate" ? "text-emerald-500" : "text-rose-500"}>AI: {h.ai}</span>
                        </div>
                        <span className="text-slate-400 italic">{h.result}</span>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-center">
                 <Button variant="ghost" size="sm" onClick={reset} className="text-slate-400">초기화</Button>
            </div>
        </Card>
    );
};
