import React, { useState, useEffect, useCallback } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const TUBE_CAPACITY = 4;

const WaterSort: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "워터 소트 (Water Sort)", desc: "같은 색깔의 물을 정렬하세요!", reset: "판 갈기", win: "순수하게 정제되었습니다!" },
        en: { title: "Water Sort", desc: "Sort matching colored water into tubes!", reset: "Restart", win: "Purely Purified!" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [tubes, setTubes] = useState<string[][]>([]);
    const [selectedTube, setSelectedTube] = useState<number | null>(null);

    const initGame = useCallback(() => {
        // Simple 5-color setup
        const initialColors = [...COLORS, ...COLORS, ...COLORS, ...COLORS];
        for (let i = initialColors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [initialColors[i], initialColors[j]] = [initialColors[j], initialColors[i]];
        }

        const newTubes: string[][] = [];
        for (let i = 0; i < 5; i++) {
            newTubes.push(initialColors.slice(i * 4, i * 4 + 4));
        }
        newTubes.push([]); // 2 empty tubes for buffer
        newTubes.push([]);
        
        setTubes(newTubes);
        setSelectedTube(null);
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    const handleTubeClick = (index: number) => {
        if (selectedTube === null) {
            if (tubes[index].length > 0) setSelectedTube(index);
        } else {
            if (selectedTube === index) {
                setSelectedTube(null);
                return;
            }

            const fromTube = [...tubes[selectedTube]];
            const toTube = [...tubes[index]];
            const colorToMove = fromTube[fromTube.length - 1];

            const canMove = toTube.length < TUBE_CAPACITY && (toTube.length === 0 || toTube[toTube.length - 1] === colorToMove);

            if (canMove) {
                while (fromTube.length > 0 && fromTube[fromTube.length - 1] === colorToMove && toTube.length < TUBE_CAPACITY) {
                    toTube.push(fromTube.pop()!);
                }
                const newTubes = [...tubes];
                newTubes[selectedTube] = fromTube;
                newTubes[index] = toTube;
                setTubes(newTubes);
            }
            setSelectedTube(null);
        }
    };

    const isWon = tubes.length > 0 && tubes.every(tube => tube.length === 0 || (tube.length === TUBE_CAPACITY && tube.every(c => c === tube[0])));

    return (
        <GameContainer title={t.title} subtitle="Process Refining" onReset={initGame}>
            <div className="flex flex-col items-center">
                <p className="text-sm font-medium text-muted-foreground mb-12 text-center">{t.desc}</p>
                
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-4 mb-12">
                    {tubes.map((tube, i) => (
                        <div 
                            key={i} 
                            onClick={() => handleTubeClick(i)}
                            className={`w-12 h-32 sm:w-14 sm:h-40 border-4 border-muted rounded-b-3xl relative cursor-pointer overflow-hidden transition-all ${
                                selectedTube === i ? 'ring-4 ring-primary ring-offset-4 -translate-y-4' : 'hover:-translate-y-1'
                            }`}
                        >
                            <div className="absolute inset-0 flex flex-col-reverse">
                                {tube.map((color, idx) => (
                                    <div 
                                        key={idx} 
                                        style={{ backgroundColor: color }}
                                        className="w-full h-1/4 animate-in slide-in-from-bottom duration-300"
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {isWon && (
                    <div className="text-center animate-in zoom-in-95">
                        <h4 className="text-2xl font-black text-primary mb-4">{t.win}</h4>
                        <button onClick={initGame} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">PLAY AGAIN</button>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default WaterSort;
