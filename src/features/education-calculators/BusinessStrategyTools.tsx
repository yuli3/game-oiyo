import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Target from 'lucide-react/dist/esm/icons/target'
import Users from 'lucide-react/dist/esm/icons/users'
import Zap from 'lucide-react/dist/esm/icons/zap'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle'
import Download from 'lucide-react/dist/esm/icons/download';

/**
 * Interactive SWOT Analysis Builder
 */
export const SWOTBuilder: React.FC = () => {
    const [swot, setSwot] = useState({
        S: ["강력한 브랜드 인지도", "고도로 숙련된 인력"],
        W: ["부족한 연구개발 예산", "특정 시장 의존도"],
        O: ["신흥 시장 성장", "경쟁사의 약화"],
        T: ["경기 침체", "강력한 새로운 규제"]
    });

    const [input, setInput] = useState("");
    const [activeTab, setActiveTab] = useState<keyof typeof swot>("S");

    const addItem = () => {
        if (!input) return;
        setSwot({ ...swot, [activeTab]: [...swot[activeTab], input] });
        setInput("");
    };

    const removeItem = (type: keyof typeof swot, index: number) => {
        const newList = [...swot[type]];
        newList.splice(index, 1);
        setSwot({ ...swot, [type]: newList });
    };

    return (
        <Card className="p-8 bg-white border-slate-200 shadow-2xl mt-8">
            <div className="flex items-center justify-between mb-8 border-b pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                    <Target className="text-blue-500" />
                    인터랙티브 SWOT 전략 빌더
                </h3>
            </div>

            <div className="flex gap-2 mb-6">
                {(['S', 'W', 'O', 'T'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        {tab === 'S' ? 'Strengths' : tab === 'W' ? 'Weaknesses' : tab === 'O' ? 'Opportunities' : 'Threats'}
                    </button>
                ))}
            </div>

            <div className="flex gap-2 mb-8">
                <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="항목을 입력하세요..."
                    className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                />
                <Button onClick={addItem} className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6">추가</Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* S */}
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 min-h-[150px]">
                    <div className="flex items-center gap-2 mb-3 text-emerald-700 font-bold text-sm">
                        <Zap size={16} /> 강점 (Strengths)
                    </div>
                    <ul className="space-y-1">
                        {swot.S.map((item, i) => (
                            <li key={i} className="text-xs text-emerald-800 flex justify-between items-center bg-white/50 p-2 rounded-md group">
                                {item}
                                <button onClick={() => removeItem('S', i)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600">×</button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* W */}
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 min-h-[150px]">
                    <div className="flex items-center gap-2 mb-3 text-rose-700 font-bold text-sm">
                        <AlertTriangle size={16} /> 약점 (Weaknesses)
                    </div>
                    <ul className="space-y-1">
                        {swot.W.map((item, i) => (
                            <li key={i} className="text-xs text-rose-800 flex justify-between items-center bg-white/50 p-2 rounded-md group">
                                {item}
                                <button onClick={() => removeItem('W', i)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600">×</button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* O */}
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 min-h-[150px]">
                    <div className="flex items-center gap-2 mb-3 text-blue-700 font-bold text-sm">
                        <TrendingUp size={16} /> 기회 (Opportunities)
                    </div>
                    <ul className="space-y-1">
                        {swot.O.map((item, i) => (
                            <li key={i} className="text-xs text-blue-800 flex justify-between items-center bg-white/50 p-2 rounded-md group">
                                {item}
                                <button onClick={() => removeItem('O', i)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600">×</button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* T */}
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 min-h-[150px]">
                    <div className="flex items-center gap-2 mb-3 text-amber-700 font-bold text-sm">
                        <Users size={16} /> 위협 (Threats)
                    </div>
                    <ul className="space-y-1">
                        {swot.T.map((item, i) => (
                            <li key={i} className="text-xs text-amber-800 flex justify-between items-center bg-white/50 p-2 rounded-md group">
                                {item}
                                <button onClick={() => removeItem('T', i)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600">×</button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <Button variant="outline" size="sm" className="text-xs text-slate-400">
                    <Download size={14} className="mr-2" /> 이미지로 저장 (Coming Soon)
                </Button>
            </div>
        </Card>
    );
};

const TrendingUp = ({ size, className }: any) => (
    <svg 
        width={size} height={size} viewBox="0 0 24 24" fill="none" 
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" 
        strokeLinejoin="round" className={className}
    >
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);
