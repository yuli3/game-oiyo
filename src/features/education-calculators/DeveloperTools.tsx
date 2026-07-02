import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import ArrowLeftRight from 'lucide-react/dist/esm/icons/arrow-left-right'
import Code from 'lucide-react/dist/esm/icons/code'
import Copy from 'lucide-react/dist/esm/icons/copy';

/**
 * Designer & Developer Unit Converter
 * Pure Utility - Traffic Magnet
 */
export const DeveloperUnitConverter: React.FC = () => {
    // PX to REM
    const [px, setPx] = useState<number>(16);
    const [base, setBase] = useState<number>(16);
    const rem = px / base;

    // HEX to RGB
    const [hex, setHex] = useState("#3b82f6");

    const hexToRgb = (h: string) => {
        let r: any = 0, g: any = 0, b: any = 0;
        if (h.length === 4) {
            r = "0x" + h[1] + h[1];
            g = "0x" + h[2] + h[2];
            b = "0x" + h[3] + h[3];
        } else if (h.length === 7) {
            r = "0x" + h[1] + h[2];
            g = "0x" + h[3] + h[4];
            b = "0x" + h[5] + h[6];
        }
        return `rgb(${+r}, ${+g}, ${+b})`;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <Card className="p-8 bg-slate-950 border-slate-800 text-white shadow-2xl mt-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Code size={100} />
            </div>

            <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-4 relative z-10">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                    <ArrowLeftRight size={18} className="text-white" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">개발자 & 디자이너 유틸리티</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                {/* PX to REM */}
                <div className="space-y-4 p-6 bg-slate-900 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">PX to REM Converter</span>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Pixel (px)</label>
                                <input 
                                    type="number" value={px} onChange={e => setPx(Number(e.target.value))} 
                                    className="w-full bg-slate-800 border-slate-700 p-3 rounded-xl text-white font-mono text-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Base (px)</label>
                                <input 
                                    type="number" value={base} onChange={e => setBase(Number(e.target.value))} 
                                    className="w-full bg-slate-800 border-slate-700 p-3 rounded-xl text-white font-mono text-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl flex items-center justify-between border border-white/5 group">
                            <div className="text-3xl font-black text-blue-400 font-mono tracking-tighter">
                                {rem.toFixed(3)}rem
                            </div>
                            <button onClick={() => copyToClipboard(`${rem.toFixed(3)}rem`)} className="p-2 hover:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                <Copy size={16} className="text-slate-500 hover:text-white" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* HEX to RGB */}
                <div className="space-y-4 p-6 bg-slate-900 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Color Converter (HEX to RGB)</span>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">HEX Color</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" value={hex} onChange={e => setHex(e.target.value)} 
                                    className="flex-1 bg-slate-800 border-slate-700 p-3 rounded-xl text-white font-mono text-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div 
                                    style={{ backgroundColor: hex }}
                                    className="w-12 h-13 rounded-xl border border-white/20 shadow-inner"
                                />
                            </div>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl flex items-center justify-between border border-white/5 group">
                            <div className="text-xl font-black text-emerald-400 font-mono">
                                {hexToRgb(hex)}
                            </div>
                            <button onClick={() => copyToClipboard(hexToRgb(hex))} className="p-2 hover:bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                <Copy size={16} className="text-slate-500 hover:text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 text-center">
                <p className="text-[10px] text-slate-600 font-mono">
                    * 이 도구는 ahoxy-nextjs의 유틸리티 라이브러리를 기반으로 blog-oiyo용으로 최적화되었습니다.
                </p>
            </div>
        </Card>
    );
};
