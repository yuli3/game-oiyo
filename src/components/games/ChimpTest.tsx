import React, { useState, useCallback } from 'react';

const ChimpTest: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: {
            title: "침팬지 기억력 테스트",
            desc: "숫자를 순서대로 기억한 뒤, 숫자가 사라지면 순서대로 클릭하세요.",
            start: "테스트 시작",
            level: "레벨",
            score: "점수",
            fail: "테스트 종료!",
            retry: "다시 도전하기",
            success: "통과!",
            next: "다음 레벨로",
            best: "최고 기록"
        },
        en: {
            title: "Chimp Memory Test",
            desc: "Memorize the numbers in order, then click them after they disappear.",
            start: "Start Test",
            level: "Level",
            score: "Score",
            fail: "Game Over!",
            retry: "Try Again",
            success: "Success!",
            next: "Next Level",
            best: "Best Level"
        }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [status, setStatus] = useState<'idle' | 'memorize' | 'recall' | 'result'>('idle');
    const [level, setLevel] = useState(1);
    const [tiles, setTiles] = useState<{ id: number; num: number; x: number; y: number; clicked: boolean }[]>([]);
    const [nextNum, setNextNum] = useState(1);
    const [bestLevel, setBestLevel] = useState(0);

    const initLevel = useCallback((lv: number) => {
        const count = lv + 3;
        const newTiles = [];
        const positions = new Set<string>();

        while (newTiles.length < count) {
            const x = Math.floor(Math.random() * 5); // 5x5 grid
            const y = Math.floor(Math.random() * 5);
            const key = `${x}-${y}`;
            if (!positions.has(key)) {
                positions.add(key);
                newTiles.push({ id: newTiles.length, num: newTiles.length + 1, x, y, clicked: false });
            }
        }
        setTiles(newTiles);
        setNextNum(1);
        setStatus('memorize');
    }, []);

    const handleTileClick = (id: number) => {
        if (status !== 'recall') return;
        
        const tile = tiles.find(t => t.id === id);
        if (!tile || tile.clicked) return;

        if (tile.num === nextNum) {
            const updated = tiles.map(t => t.id === id ? { ...t, clicked: true } : t);
            setTiles(updated);
            if (nextNum === tiles.length) {
                setStatus('result');
                if (level > bestLevel) setBestLevel(level);
            } else {
                setNextNum(nextNum + 1);
            }
        } else {
            setStatus('result');
        }
    };

    return (
        <div className="not-prose my-12 p-8 bg-card text-card-foreground rounded-3xl border border-border shadow-sm max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t.title}</div>
                <div className="flex gap-4">
                    <span className="text-xs">{t.level}: <b className="text-primary">{level}</b></span>
                    <span className="text-xs">{t.best}: <b className="text-chart-2 font-black">{bestLevel}</b></span>
                </div>
            </div>

            {status === 'idle' && (
                <div className="h-80 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center animate-bounce">
                        <span className="text-3xl">🧠</span>
                    </div>
                    <p className="text-muted-foreground px-8 leading-relaxed">{t.desc}</p>
                    <button 
                        onClick={() => initLevel(1)}
                        className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold hover:opacity-90 transition-all scale-110"
                    >
                        {t.start}
                    </button>
                </div>
            )}

            {(status === 'memorize' || status === 'recall') && (
                <div className="relative h-80 w-full bg-muted/40 rounded-2xl border border-border overflow-hidden">
                    {tiles.map(tile => (
                        <button
                            key={tile.id}
                            onClick={() => handleTileClick(tile.id)}
                            disabled={tile.clicked || status === 'memorize'}
                            style={{ 
                                left: `${tile.x * 20 + 2}%`, 
                                top: `${tile.y * 20 + 2}%`,
                                width: '16%',
                                height: '16%'
                            }}
                            className={`absolute flex items-center justify-center rounded-xl font-black text-xl transition-all ${
                                tile.clicked 
                                    ? 'opacity-0 scale-50' 
                                    : status === 'memorize' 
                                        ? 'bg-card text-card-foreground border-2 border-primary shadow-md' 
                                        : 'bg-card text-transparent shadow-sm hover:bg-muted'
                            }`}
                        >
                            {status === 'memorize' ? tile.num : ''}
                        </button>
                    ))}
                    
                    {status === 'memorize' && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-muted">
                            <div className="h-full bg-primary animate-progress-shrink" />
                            <button 
                                onClick={() => setStatus('recall')}
                                className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground rounded-full text-[10px] font-bold shadow-lg"
                            >
                                CLICK TO START
                            </button>
                        </div>
                    )}
                </div>
            )}

            {status === 'result' && (
                <div className="h-80 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
                    {nextNum > tiles.length ? (
                        <>
                            <div className="text-4xl text-primary">🎉</div>
                            <h4 className="text-2xl font-black text-primary">{t.success}</h4>
                            <p className="text-muted-foreground font-medium">Level {level} Completed!</p>
                            <button 
                                onClick={() => { setLevel(level + 1); initLevel(level + 1); }}
                                className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold hover:opacity-90"
                            >
                                {t.next}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="text-4xl text-destructive">💀</div>
                            <h4 className="text-2xl font-black text-destructive">{t.fail}</h4>
                            <p className="text-muted-foreground font-medium">Total Score: {level}</p>
                            <button 
                                onClick={() => { setLevel(1); initLevel(1); }}
                                className="px-10 py-3 bg-destructive text-destructive-foreground rounded-full font-bold hover:opacity-90"
                            >
                                {t.retry}
                            </button>
                        </>
                    )}
                </div>
            )}

            <style>{`
                @keyframes progress-shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .animate-progress-shrink {
                    animation: progress-shrink 5s linear forwards;
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default ChimpTest;
