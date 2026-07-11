import React, { useState, useEffect, useCallback } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { getBest, recordBest } from '../../lib/games/records';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const Sudoku: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const COPY = {
        ko: { title: "스도쿠 (Sudoku)", desc: "1부터 9까지 겹치지 않게 숫자를 채워보세요!", reset: "판 갈기", win: "완벽한 논리력입니다!", time: "시간", best: "최단 기록" },
        en: { title: "Sudoku", desc: "Fill in numbers 1-9 without overlap!", reset: "Restart", win: "Perfect Logic!", time: "Time", best: "Best Time" },
        ja: { title: "数独", desc: "1から9まで重複なく埋めましょう！", reset: "新しい盤面", win: "完璧な論理力です！", time: "時間", best: "最短記録" },
        zh: { title: "数独", desc: "填入1到9，不重复！", reset: "换新棋盘", win: "完美的逻辑力！", time: "时间", best: "最快记录" },
        fr: { title: "Sudoku", desc: "Remplissez de 1 à 9 sans doublon !", reset: "Nouvelle grille", win: "Logique parfaite !", time: "Temps", best: "Meilleur temps" },
        es: { title: "Sudoku", desc: "¡Rellena del 1 al 9 sin repetir!", reset: "Nuevo tablero", win: "¡Lógica perfecta!", time: "Tiempo", best: "Mejor tiempo" }
    };
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;

    const [grid, setGrid] = useState<(number | null)[][]>([]);
    const [initial, setInitial] = useState<boolean[][]>([]);
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [seconds, setSeconds] = useState(0);
    const [bestTime, setBestTime] = useState<number | null>(null);
    const [recorded, setRecorded] = useState(false);

    useEffect(() => {
        const existing = getBest('sudoku');
        if (existing) setBestTime(existing.value);
    }, []);

    const initGame = useCallback(() => {
        // A simple pre-defined puzzle for the demo
        const puzzle = [
            [5, 3, null, null, 7, null, null, null, null],
            [6, null, null, 1, 9, 5, null, null, null],
            [null, 9, 8, null, null, null, null, 6, null],
            [8, null, null, null, 6, null, null, null, 3],
            [4, null, null, 8, null, 3, null, null, 1],
            [7, null, null, null, 2, null, null, null, 6],
            [null, 6, null, null, null, null, 2, 8, null],
            [null, null, null, 4, 1, 9, null, null, 5],
            [null, null, null, null, 8, null, null, 7, 9]
        ];

        setGrid(puzzle);
        setInitial(puzzle.map(row => row.map(v => v !== null)));
        setSeconds(0);
        setRecorded(false);
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    const setNumber = (n: number) => {
        if (!selected) return;
        const [r, c] = selected;
        if (initial[r][c]) return;

        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = n === grid[r][c] ? null : n;
        setGrid(newGrid);
    };

    const isWon = grid.length > 0 && grid.every((row) => {
        const set = new Set(row.filter(v => v !== null));
        return set.size === 9; // Simplified check
    });

    useEffect(() => {
        if (isWon) return;
        const id = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [isWon]);

    useEffect(() => {
        if (isWon && !recorded) {
            setRecorded(true);
            setBestTime(recordBest('sudoku', seconds, 'seconds').value);
        }
    }, [isWon, recorded, seconds]);

    return (
        <GameContainer title={t.title} subtitle="Pure Deduction" onReset={initGame}>
            <div className="flex flex-col items-center">
                <p className="text-sm font-medium text-muted-foreground mb-2 text-center">{t.desc}</p>
                <div className="mb-6 flex gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>{t.time} {fmt(seconds)}</span>
                    {bestTime !== null && <span>{t.best} {fmt(bestTime)}</span>}
                </div>

                <div className="bg-stone-800 p-1 rounded-sm shadow-2xl grid grid-cols-9 aspect-square w-full max-w-md border-4 border-stone-800">
                    {grid.map((row, r) => row.map((val, c) => {
                        const isSelected = selected?.[0] === r && selected?.[1] === c;
                        const isInit = initial[r]?.[c];
                        const borderR = (c + 1) % 3 === 0 && c < 8 ? 'border-r-4 border-stone-800' : 'border-r border-stone-100/10';
                        const borderB = (r + 1) % 3 === 0 && r < 8 ? 'border-b-4 border-stone-800' : 'border-b border-stone-100/10';

                        return (
                            <button
                                key={`${r}-${c}`}
                                onClick={() => setSelected([r, c])}
                                className={`flex items-center justify-center text-lg sm:text-2xl font-bold transition-all ${borderR} ${borderB} ${
                                    isSelected ? 'bg-primary text-primary-foreground z-10' : isInit ? 'bg-stone-100 text-stone-800' : 'bg-stone-50 text-primary'
                                }`}
                            >
                                {val}
                            </button>
                        );
                    }))}
                </div>

                {/* Number Pad */}
                <div className="mt-8 grid grid-cols-9 gap-1 sm:gap-2 w-full max-w-md">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <button 
                            key={n}
                            onClick={() => setNumber(n)}
                            className="aspect-square bg-muted hover:bg-primary hover:text-white rounded-lg flex items-center justify-center font-black text-sm sm:text-lg border border-border transition-all shadow-sm"
                        >
                            {n}
                        </button>
                    ))}
                </div>

                {isWon && (
                    <div className="mt-8 text-center animate-in zoom-in-95">
                        <h4 className="text-2xl font-black text-primary">{t.win}</h4>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default Sudoku;
