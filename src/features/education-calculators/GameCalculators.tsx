import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Dice5 from 'lucide-react/dist/esm/icons/dice-5'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import Zap from 'lucide-react/dist/esm/icons/zap';

/**
 * Lost Ark Style Faceting Simulator
 * Theme from ahoxy.com
 */
export const StoneSimulator: React.FC = () => {
  const [successChance, setSuccessChance] = useState<number>(75);
  const [history, setHistory] = useState<{ success: boolean; chance: number }[]>([]);

  const attempt = () => {
    const isSuccess = Math.random() * 100 < successChance;
    setHistory([...history, { success: isSuccess, chance: successChance }]);
    
    // Update chance logic: Success -> -10% (min 25), Fail -> +10% (max 75)
    if (isSuccess) {
      setSuccessChance(Math.max(25, successChance - 10));
    } else {
      setSuccessChance(Math.min(75, successChance + 10));
    }
  };

  const reset = () => {
    setSuccessChance(75);
    setHistory([]);
  };

  return (
    <Card className="p-6 bg-slate-950 border-slate-800 text-slate-100 shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Dice5 size={120} />
      </div>

      <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Zap className="text-yellow-400 fill-yellow-400" />
          <h3 className="text-xl font-bold italic tracking-tighter">세공 확률 시뮬레이터</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="text-slate-400 hover:text-white">
          <RefreshCw size={16} className="mr-2" /> 초기화
        </Button>
      </div>

      <div className="flex flex-col items-center gap-8 relative z-10">
        <div className="text-center">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest block mb-2">현재 성공 확률</span>
            <div className="text-6xl font-black font-mono text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]">
                {successChance}%
            </div>
        </div>

        <Button 
            onClick={attempt}
            className="w-full max-w-xs py-8 text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all active:scale-95"
        >
            확률 도전
        </Button>

        <div className="w-full">
            <span className="text-xs font-bold text-slate-500 uppercase mb-3 block">최근 이력 (최대 10개)</span>
            <div className="flex gap-2 flex-wrap min-h-12 items-center justify-center p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                {history.slice(-10).map((h, i) => (
                    <div 
                        key={i} 
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                            h.success ? 'bg-blue-500 text-white animate-in zoom-in' : 'bg-slate-700 text-slate-400'
                        }`}
                        title={`Chance was: ${h.chance}%`}
                    >
                        {h.success ? '●' : '○'}
                    </div>
                ))}
                {history.length === 0 && <span className="text-slate-600 italic text-sm">도전 결과가 여기에 표시됩니다.</span>}
            </div>
        </div>

        <p className="text-[10px] text-slate-600 text-center">
            * 이 도구는 ahoxy.com의 시뮬레이션 알고리즘을 체험용으로 blog-oiyo로 포팅한 것입니다.
        </p>
      </div>
    </Card>
  );
};
