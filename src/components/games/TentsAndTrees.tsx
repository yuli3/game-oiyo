import React, { useState, useEffect, useCallback } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const SIZE = 5;
type CellType = 'empty' | 'tree' | 'tent' | 'grass';
type Cell = { type: CellType; isError: boolean };

const TentsAndTrees: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "텐트와 나무", desc: "나무마다 텐트를 하나씩 설치하세요!", reset: "판 갈기", win: "캠핑 준비 완료!" },
        en: { title: "Tents & Trees", desc: "Each tree needs exactly one tent!", reset: "Restart", win: "Camping Ready!" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [grid, setGrid] = useState<Cell[][]>([]);
    const [rowHints, setRowHints] = useState<number[]>([]);
    const [colHints, setColHints] = useState<number[]>([]);

    const initGame = useCallback(() => {
        const trees = [
            [0, 1], [0, 4], [2, 1], [2, 3], [3, 4]
        ];

        const newGrid: Cell[][] = Array(SIZE).fill(null).map(() => 
            Array(SIZE).fill(null).map(() => ({ type: 'empty', isError: false }))
        );

        trees.forEach(([r, c]) => { newGrid[r][c].type = 'tree'; });

        setRowHints([2, 0, 2, 1, 1]);
        setColHints([2, 1, 1, 1, 1]);
        setGrid(newGrid);
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    const handleCellClick = (r: number, c: number) => {
        if (grid[r][c].type === 'tree') return;
        const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
        const types: CellType[] = ['empty', 'tent', 'grass'];
        const currentIdx = types.indexOf(newGrid[r][c].type);
        newGrid[r][c].type = types[(currentIdx + 1) % 3];
        
        // Validation (Simplified)
        setGrid(newGrid);
    };

    const isWon = grid.length > 0 && grid.every((row, r) => {
        const rowTents = row.filter(c => c.type === 'tent').length;
        return rowTents === rowHints[r];
    }) && Array.from({ length: SIZE }).every((_, c) => {
        const colTents = grid.filter(row => row[c].type === 'tent').length;
        return colTents === colHints[c];
    });

    return (
        <GameContainer title={t.title} subtitle="Logical Deployment" onReset={initGame}>
            <div className="flex flex-col items-center">
                <p className="text-sm font-medium text-muted-foreground mb-8 text-center leading-relaxed">
                    {t.desc}<br/>
                    <span className="text-[10px] opacity-60">* 텐트끼리는 이웃할 수 없습니다 (대각선 포함)</span>
                </p>

                <div className="relative inline-block bg-muted/30 p-4 rounded-3xl border border-border shadow-inner">
                    {/* Top Column Hints */}
                    <div className="grid grid-cols-5 gap-1 mb-1 ml-8">
                        {colHints.map((h, i) => (
                            <div key={i} className="w-10 sm:w-12 text-center text-xs font-black text-primary">{h}</div>
                        ))}
                    </div>

                    <div className="flex">
                        {/* Left Row Hints */}
                        <div className="flex flex-col gap-1 mr-1 justify-around">
                            {rowHints.map((h, i) => (
                                <div key={i} className="h-10 sm:h-12 flex items-center justify-center text-xs font-black text-primary w-8">{h}</div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-5 gap-1">
                            {grid.map((row, r) => row.map((cell, c) => (
                                <button
                                    key={`${r}-${c}`}
                                    onClick={() => handleCellClick(r, c)}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-all ${
                                        cell.type === 'tree' ? 'bg-emerald-100 text-emerald-700 cursor-default' :
                                        cell.type === 'tent' ? 'bg-rose-100 text-rose-700 shadow-md transform -translate-y-0.5' :
                                        cell.type === 'grass' ? 'bg-muted/50 text-muted-foreground/30' : 'bg-background hover:bg-muted/20'
                                    } border border-border/40`}
                                >
                                    {cell.type === 'tree' && <span className="text-xl">🌲</span>}
                                    {cell.type === 'tent' && <span className="text-xl">⛺</span>}
                                    {cell.type === 'grass' && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                </button>
                            )))}
                        </div>
                    </div>
                </div>

                {isWon && (
                    <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2">
                        <h4 className="text-2xl font-black text-primary mb-4">{t.win}</h4>
                        <button onClick={initGame} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">NEXT CHALLENGE</button>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default TentsAndTrees;
