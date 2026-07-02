import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const WheelSpinner: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "행운의 돌림판", spin: "돌리기", reset: "초기화", add: "항목 추가", result: "결과!", placeholder: "메뉴 입력" },
        en: { title: "Lucky wheel", spin: "Spin", reset: "Reset", add: "Add Item", result: "Result!", placeholder: "Enter item" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [items, setItems] = useState<string[]>(['Pizza', 'Burger', 'Sushi', 'Pasta']);
    const [newItem, setNewItem] = useState('');
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState<string | null>(null);

    const spin = () => {
        if (isSpinning || items.length === 0) return;
        setIsSpinning(true);
        setWinner(null);
        
        const extraRotation = Math.floor(Math.random() * 360) + 1440; // 4 full spins + random
        const newRotation = rotation + extraRotation;
        setRotation(newRotation);

        setTimeout(() => {
            setIsSpinning(false);
            const actualRotation = newRotation % 360;
            const sliceSize = 360 / items.length;
            const winningIndex = Math.floor((360 - actualRotation) / sliceSize) % items.length;
            setWinner(items[winningIndex]);
        }, 4000);
    };

    const addItem = () => {
        if (newItem.trim()) {
            setItems([...items, newItem.trim()]);
            setNewItem('');
        }
    };

    return (
        <GameContainer title={t.title} subtitle="Decision Making Assistance" onReset={() => setItems(['Pizza', 'Burger', 'Sushi', 'Pasta'])}>
            <div className="flex flex-col md:flex-row gap-12 items-center">
                {/* Wheel UI */}
                <div className="relative">
                    {/* Fixed Pointer */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10 w-8 h-8 bg-destructive rounded-full flex items-center justify-center shadow-lg border-2 border-background">
                        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-background translate-y-4" />
                    </div>
                    
                    <div 
                        style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 4s cubic-bezier(0.1, 0, 0, 1)' }}
                        className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-8 border-muted shadow-2xl relative overflow-hidden"
                    >
                        {items.map((_, i) => {
                            const angle = 360 / items.length;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        transform: `rotate(${i * angle}deg) skewY(${90 - angle}deg)`,
                                        backgroundColor: `oklch(0.8 0.1 ${150 + i * (30 / items.length)})`
                                    }}
                                    className="absolute top-0 right-0 w-1/2 h-1/2 origin-bottom-left border border-background/20"
                                />
                            );
                        })}
                        {items.map((item, i) => {
                            const angle = 360 / items.length;
                            return (
                                <div 
                                    key={`label-${i}`}
                                    style={{ transform: `rotate(${i * angle + angle/2}deg)` }}
                                    className="absolute inset-0 flex items-start justify-center pt-8 text-[10px] font-black text-foreground/80 uppercase tracking-tighter"
                                >
                                    <span className="rotate-90 origin-center">{item}</span>
                                </div>
                            );
                        })}
                        <div className="absolute inset-0 m-auto w-12 h-12 bg-background rounded-full shadow-inner border-4 border-muted flex items-center justify-center font-black text-xs text-primary">OIYO</div>
                    </div>
                </div>

                {/* Controls Area */}
                <div className="flex-1 space-y-6 w-full">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newItem} 
                            onChange={(e) => setNewItem(e.target.value)}
                            placeholder={t.placeholder}
                            className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                        <button onClick={addItem} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-xs">{t.add}</button>
                    </div>

                    <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2 p-4 bg-muted/20 rounded-2xl border border-dashed border-border">
                        {items.map((item, i) => (
                            <span key={i} className="px-3 py-1 bg-card border border-border rounded-full text-[10px] font-bold text-muted-foreground flex items-center gap-2">
                                {item}
                                <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-destructive hover:scale-125">×</button>
                            </span>
                        ))}
                    </div>

                    <button 
                        onClick={spin}
                        disabled={isSpinning}
                        className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xl shadow-lg hover:opacity-90 active:scale-95 transition-all"
                    >
                        {isSpinning ? 'SPINNING...' : t.spin}
                    </button>

                    {winner && (
                        <div className="text-center animate-bounce">
                            <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">{t.result}</p>
                            <h4 className="text-3xl font-black text-primary uppercase">{winner}</h4>
                        </div>
                    )}
                </div>
            </div>
        </GameContainer>
    );
};

export default WheelSpinner;
