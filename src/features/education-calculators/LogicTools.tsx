import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import Table from 'lucide-react/dist/esm/icons/table'
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'
import Info from 'lucide-react/dist/esm/icons/info';

/**
 * Basic Truth Table Generator for A and B
 */
export const TruthTableGenerator: React.FC = () => {
    const [expression, setExpression] = useState("and"); // and, or, arrow, bi

    const getResult = (a: boolean, b: boolean) => {
        switch (expression) {
            case "and": return a && b;
            case "or": return a || b;
            case "arrow": return !a || b; // A -> B is ~A v B
            case "bi": return a === b;
            default: return false;
        }
    };

    const rows = [
        { a: true, b: true },
        { a: true, b: false },
        { a: false, b: true },
        { a: false, b: false }
    ];

    return (
        <Card className="p-6 bg-slate-900 border-slate-800 text-white shadow-2xl mt-8">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                <Table className="text-emerald-400" />
                <h3 className="text-xl font-bold">인터랙티브 진리표 생성기</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">연결사 선택</span>
                    <button 
                        onClick={() => setExpression("and")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${expression === "and" ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        그리고 (∧)
                    </button>
                    <button 
                        onClick={() => setExpression("or")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${expression === "or" ? 'bg-blue-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        또는 (∨)
                    </button>
                    <button 
                        onClick={() => setExpression("arrow")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${expression === "arrow" ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        조건문 (→)
                    </button>
                    <button 
                        onClick={() => setExpression("bi")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${expression === "bi" ? 'bg-purple-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        쌍조건문 (↔)
                    </button>
                </div>

                <div className="md:col-span-3">
                    <div className="overflow-hidden rounded-xl border border-slate-800">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50">
                                    <th className="p-4 text-slate-400 font-bold border-b border-slate-800">A</th>
                                    <th className="p-4 text-slate-400 font-bold border-b border-slate-800">B</th>
                                    <th className="p-4 bg-slate-700/30 text-white font-black border-b border-slate-800">
                                        결과 {expression === "and" ? '(A ∧ B)' : expression === "or" ? '(A ∨ B)' : expression === "arrow" ? '(A → B)' : '(A ↔ B)'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => {
                                    const res = getResult(row.a, row.b);
                                    return (
                                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                            <td className="p-4 font-mono">{row.a ? 'T' : 'F'}</td>
                                            <td className="p-4 font-mono">{row.b ? 'T' : 'F'}</td>
                                            <td className={`p-4 font-mono font-bold ${res ? 'text-emerald-400' : 'text-rose-500'}`}>
                                                <div className="flex items-center gap-2">
                                                    {res ? <Check size={14}/> : <X size={14}/>}
                                                    {res ? 'TRUE' : 'FALSE'}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex items-start gap-2 text-slate-500 text-xs italic bg-slate-800/30 p-3 rounded-lg">
                        <Info size={14} className="mt-0.5 flex-shrink-0" />
                        <p>
                            {expression === "arrow" && "조건문(A → B)은 전건(A)이 참이고 후건(B)이 거짓인 단 하나의 경우에만 거짓이 됩니다."}
                            {expression === "and" && "연언(A ∧ B)은 두 명제가 모두 참일 때만 참입니다."}
                            {expression === "or" && "선언(A ∨ B)은 적어도 하나가 참이면 참입니다."}
                            {expression === "bi" && "쌍조건문(A ↔ B)은 두 명제의 진리값이 일치할 때만 참입니다."}
                        </p>
                    </div>
                </div>
            </div>
        </Card>
    );
};
