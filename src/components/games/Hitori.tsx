import React, { useState, useEffect, useCallback } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const SIZE = 5;
type Cell = { value: number; isDark: boolean; isError: boolean };

const Hitori: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "히토리 (Hitori)", desc: "중복된 숫자를 지워 가로세로 유일한 수만 남기세요!", reset: "판 갈기", win: "본질만 남았습니다!" },
        en: { title: "Hitori", desc: "Shade duplicate numbers to leave only unique ones!", reset: "Restart", win: "Only essence remains!" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [grid, setGrid] = useState<Cell[][]>([]);

    const initGame = useCallback(() => {
        const initialValues = [
            [2, 2, 1, 5, 3],
            [2, 3, 1, 4, 5],
            [1, 1, 1, 3, 5],
            [1, 3, 5, 4, 2],
            [5, 4, 3, 2, 1]
        ];

        setGrid(initialValues.map(row => row.map(v => ({ value: v, isDark: false, isError: false }))));
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    const toggleDark = (r: number, c: number) => {
        const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
        newGrid[r][c].isDark = !newGrid[r][c].isDark;
        
        // Simple Duplicate Check (Error Display)
        setGrid(newGrid);
    };

    const isWon = grid.length > 0 && grid.every((row) => {
        const whiteValues = row.filter(c => !c.isDark).map(c => c.value);
        return new Set(whiteValues).size === whiteValues.length;
    }) && Array.from({ length: SIZE }).every((_, c) => {
        const whiteValues = grid.filter(row => !row[c].isDark).map(row => row[c].value);
        return new Set(whiteValues).size === whiteValues.length;
    });

    return (
        <GameContainer title={t.title} subtitle="Subtract to Reveal" onReset={initGame}>
            <div className="flex flex-col items-center">
                <p className="text-sm font-medium text-muted-foreground mb-8 text-center leading-relaxed">
                    {t.desc}<br/>
                    <span className="text-[10px] opacity-60">* 까만 칸끼리는 이웃할 수 없습니다</span>
                </p>

                <div className="bg-muted/30 p-4 rounded-3xl border border-border shadow-inner grid grid-cols-5 gap-1">
                    {grid.map((row, r) => row.map((cell, c) => (
                        <button
                            key={`${r}-${c}`}
                            onClick={() => toggleDark(r, c)}
                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-black text-xl transition-all ${
                                cell.isDark 
                                    ? 'bg-stone-800 text-stone-100 shadow-inner' 
                                    : 'bg-card text-foreground hover:bg-primary/10 shadow-sm border border-border/40'
                            }`}
                        >
                            {cell.value}
                        </button>
                    )))}
                </div>

                {isWon && (
                    <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2">
                        <h4 className="text-2xl font-black text-primary mb-4">{t.win}</h4>
                        <button onClick={initGame} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">NEXT LEVEL</button>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default Hitori;
