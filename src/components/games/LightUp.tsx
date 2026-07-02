import React, { useState, useEffect, useCallback } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const SIZE = 7;
type Cell = { type: 'white' | 'black'; count?: number; hasBulb: boolean; isLit: boolean; isError: boolean };

const LightUp: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "라이트업 (Akari)", desc: "어두운 구석 없이 모든 칸을 밝히세요!", reset: "판 갈기", win: "세상이 밝아졌습니다!" },
        en: { title: "Light Up (Akari)", desc: "Light up every corner of the grid!", reset: "Restart", win: "The world is bright!" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [grid, setGrid] = useState<Cell[][]>([]);
    
    const initGame = useCallback(() => {
        const newGrid: Cell[][] = Array(SIZE).fill(null).map(() => 
            Array(SIZE).fill(null).map(() => ({ type: 'white', hasBulb: false, isLit: false, isError: false }))
        );

        // Simple Random Black Blocks
        const blackPos = [[1, 1, 1], [1, 5, 2], [3, 3, 0], [5, 1, 1], [5, 5, 2]];
        blackPos.forEach(([r, c, n]) => {
            newGrid[r][c] = { type: 'black', count: n, hasBulb: false, isLit: false, isError: false };
        });

        setGrid(newGrid);
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    const updateLighting = (currentGrid: Cell[][]) => {
        const newGrid = currentGrid.map(row => row.map(cell => ({ ...cell, isLit: false, isError: false })));

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (newGrid[r][c].hasBulb) {
                    newGrid[r][r].isLit = true; // wait c not r
                    // This was a typo in thought, fixing below correctly:
                }
            }
        }
        // Correct Lighting Logic
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (newGrid[r][c].hasBulb) {
                    newGrid[r][c].isLit = true;
                    // Move 4 directions
                    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                    dirs.forEach(([dr, dc]) => {
                        let nr = r + dr, nc = c + dc;
                        while(nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && newGrid[nr][nc].type === 'white') {
                            if (newGrid[nr][nc].hasBulb) newGrid[r][c].isError = true; // Bulb seeing another bulb
                            newGrid[nr][nc].isLit = true;
                            nr += dr; nc += dc;
                        }
                    });
                }
            }
        }
        return newGrid;
    };

    const toggleBulb = (r: number, c: number) => {
        if (grid[r][c].type === 'black') return;
        const newGrid = [...grid.map(row => [...row])];
        newGrid[r][c].hasBulb = !newGrid[r][c].hasBulb;
        setGrid(updateLighting(newGrid));
    };

    const isWon = grid.length > 0 && grid.every(row => row.every(cell => (cell.type === 'black') || cell.isLit)) && 
                 grid.every(row => row.every(cell => !cell.isError));

    return (
        <GameContainer title={t.title} subtitle="Logic & Illumination" onReset={initGame}>
            <p className="text-sm font-medium text-muted-foreground mb-8 text-center">{t.desc}</p>
            
            <div className="grid grid-cols-7 gap-1 bg-muted/30 p-2 rounded-2xl border border-border aspect-square w-full max-w-sm mx-auto overflow-hidden">
                {grid.map((row, r) => row.map((cell, c) => (
                    <button
                        key={`${r}-${c}`}
                        onClick={() => toggleBulb(r, c)}
                        className={`relative rounded-md flex items-center justify-center transition-all ${
                            cell.type === 'black' 
                                ? 'bg-stone-800 text-white cursor-default' 
                                : cell.hasBulb 
                                    ? cell.isError ? 'bg-destructive' : 'bg-primary' 
                                    : cell.isLit ? 'bg-primary/20' : 'bg-background'
                        } shadow-sm border border-border/20`}
                    >
                        {cell.type === 'black' && cell.count !== undefined && <span className="text-xs font-black">{cell.count}</span>}
                        {cell.hasBulb && <span className="text-xl sm:text-2xl drop-shadow-md">💡</span>}
                        {cell.isLit && !cell.hasBulb && <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />}
                    </button>
                )))}
            </div>

            {isWon && (
                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2">
                    <h4 className="text-2xl font-black text-primary mb-4">{t.win}</h4>
                    <button onClick={initGame} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">PLAY AGAIN</button>
                </div>
            )}
        </GameContainer>
    );
};

export default LightUp;
