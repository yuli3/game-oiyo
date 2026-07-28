import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { getBestForConditions, recordBestForConditions, type BestConditions } from '../../lib/games/records';
import { isSudokuSolved } from '../../lib/games/logic-puzzles';
import { SUDOKU_DEMO_PUZZLE, clearSudokuSave, loadSudokuSave, storeSudokuSave } from '../../lib/games/active-game-save';
import { elapsedSeconds } from '../../lib/games/time-contracts';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const SUDOKU_CONDITIONS: BestConditions = { seed: 'classic-demo-v1', difficulty: 'standard', assist: 'none' };

const Sudoku: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const COPY = {
        ko: { title: "스도쿠 (Sudoku)", desc: "1부터 9까지 겹치지 않게 숫자를 채워보세요!", reset: "판 갈기", win: "완벽한 논리력입니다!", time: "시간", best: "최단 기록", row: "행", column: "열", empty: "빈 칸", given: "주어진 숫자", entered: "입력한 숫자", selectedLabel: "선택됨" },
        en: { title: "Sudoku", desc: "Fill in numbers 1-9 without overlap!", reset: "Restart", win: "Perfect Logic!", time: "Time", best: "Best Time", row: "row", column: "column", empty: "empty", given: "given", entered: "entered", selectedLabel: "selected" },
        ja: { title: "数独", desc: "1から9まで重複なく埋めましょう！", reset: "新しい盤面", win: "完璧な論理力です！", time: "時間", best: "最短記録", row: "行", column: "列", empty: "空き", given: "初期数字", entered: "入力数字", selectedLabel: "選択中" },
        zh: { title: "数独", desc: "填入1到9，不重复！", reset: "换新棋盘", win: "完美的逻辑力！", time: "时间", best: "最快记录", row: "行", column: "列", empty: "空格", given: "给定数字", entered: "输入数字", selectedLabel: "已选择" },
        fr: { title: "Sudoku", desc: "Remplissez de 1 à 9 sans doublon !", reset: "Nouvelle grille", win: "Logique parfaite !", time: "Temps", best: "Meilleur temps", row: "ligne", column: "colonne", empty: "vide", given: "chiffre donné", entered: "chiffre saisi", selectedLabel: "sélectionnée" },
        es: { title: "Sudoku", desc: "¡Rellena del 1 al 9 sin repetir!", reset: "Nuevo tablero", win: "¡Lógica perfecta!", time: "Tiempo", best: "Mejor tiempo", row: "fila", column: "columna", empty: "vacía", given: "número dado", entered: "número introducido", selectedLabel: "seleccionada" }
    };
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;

    const [grid, setGrid] = useState<(number | null)[][]>([]);
    const [initial, setInitial] = useState<boolean[][]>([]);
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [seconds, setSeconds] = useState(0);
    const [bestTime, setBestTime] = useState<number | null>(null);
    const [recorded, setRecorded] = useState(false);
    const [focusIndex, setFocusIndex] = useState(0);
    const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const startedAt = useRef<number | null>(null);

    useEffect(() => {
        const existing = getBestForConditions('sudoku', SUDOKU_CONDITIONS);
        if (existing) setBestTime(existing.value);
    }, []);

    const initGame = useCallback(() => {
        clearSudokuSave();
        setGrid(SUDOKU_DEMO_PUZZLE);
        setInitial(SUDOKU_DEMO_PUZZLE.map(row => row.map(v => v !== null)));
        setSeconds(0);
        startedAt.current = null;
        setRecorded(false);
        setSelected(null);
        setFocusIndex(0);
    }, []);

    useEffect(() => {
        const restored = loadSudokuSave();
        if (restored) {
            setGrid(restored.grid);
            setInitial(restored.grid.map((row, r) => row.map((_, c) => SUDOKU_DEMO_PUZZLE[r][c] !== null)));
            setSeconds(restored.seconds);
            setRecorded(false);
            setSelected(null);
            setFocusIndex(0);
        } else {
            initGame();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setNumber = (n: number) => {
        if (!selected) return;
        const [r, c] = selected;
        if (initial[r][c]) return;

        if (startedAt.current === null) startedAt.current = performance.now();
        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = n === grid[r][c] ? null : n;
        setGrid(newGrid);
    };

    const isWon = isSudokuSolved(grid);

    useEffect(() => {
        if (isWon) return;
        const id = setInterval(() => setSeconds(elapsedSeconds(startedAt.current, performance.now())), 100);
        return () => clearInterval(id);
    }, [isWon]);

    useEffect(() => {
        if (isWon && !recorded) {
            setRecorded(true);
            setBestTime(recordBestForConditions('sudoku', Math.max(1, seconds), 'seconds', SUDOKU_CONDITIONS).value);
        }
    }, [isWon, recorded, seconds]);

    useEffect(() => {
        if (isWon) { clearSudokuSave(); return; }
        if (grid.length === 9) storeSudokuSave(grid, seconds);
    }, [grid, seconds, isWon]);

    const moveFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        const row = Math.floor(index / 9), column = index % 9;
        let next = index;
        if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * 9 + column;
        else if (event.key === 'ArrowDown') next = Math.min(8, row + 1) * 9 + column;
        else if (event.key === 'ArrowLeft') next = row * 9 + Math.max(0, column - 1);
        else if (event.key === 'ArrowRight') next = row * 9 + Math.min(8, column + 1);
        else if (event.key === 'Home') next = row * 9;
        else if (event.key === 'End') next = row * 9 + 8;
        else return;
        event.preventDefault();
        setFocusIndex(next);
        cellRefs.current[next]?.focus();
    };

    return (
        <GameContainer title={t.title} subtitle="Pure Deduction" resetLabel={t.reset} onReset={initGame}>
            <div className="flex flex-col items-center">
                <p className="text-sm font-medium text-muted-foreground mb-2 text-center">{t.desc}</p>
                <div className="mb-6 flex gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>{t.time} {fmt(seconds)}</span>
                    {bestTime !== null && <span>{t.best} {fmt(bestTime)}</span>}
                </div>

                <div className="max-w-full overflow-x-auto pb-1">
                <div className="bg-stone-800 p-1 rounded-sm shadow-2xl grid w-max border-4 border-stone-800" style={{ gridTemplateColumns: 'repeat(9, 2.75rem)' }} role="grid" aria-label={t.title} aria-rowcount={9} aria-colcount={9}>
                    {grid.map((row, r) => row.map((val, c) => {
                        const isSelected = selected?.[0] === r && selected?.[1] === c;
                        const isInit = initial[r]?.[c];
                        const borderR = (c + 1) % 3 === 0 && c < 8 ? 'border-r-4 border-stone-800' : 'border-r border-stone-100/10';
                        const borderB = (r + 1) % 3 === 0 && r < 8 ? 'border-b-4 border-stone-800' : 'border-b border-stone-100/10';

                        return (
                            <button
                                key={`${r}-${c}`}
                                ref={(node) => { cellRefs.current[r * 9 + c] = node; }}
                                type="button"
                                role="gridcell"
                                onClick={() => { setSelected([r, c]); setFocusIndex(r * 9 + c); }}
                                onFocus={() => setFocusIndex(r * 9 + c)}
                                onKeyDown={(event) => moveFocus(event, r * 9 + c)}
                                tabIndex={focusIndex === r * 9 + c ? 0 : -1}
                                aria-selected={isSelected}
                                aria-rowindex={r + 1}
                                aria-colindex={c + 1}
                                aria-label={`${t.row} ${r + 1}, ${t.column} ${c + 1}: ${val === null ? t.empty : `${val}, ${isInit ? t.given : t.entered}`}${isSelected ? `, ${t.selectedLabel}` : ''}`}
                                className={`h-11 w-11 flex items-center justify-center text-lg sm:text-2xl font-bold transition-all motion-reduce:transition-none focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${borderR} ${borderB} ${
                                    isSelected ? 'bg-primary text-primary-foreground z-10' : isInit ? 'bg-stone-100 text-stone-800' : 'bg-stone-50 text-primary'
                                }`}
                            >
                                {val}
                            </button>
                        );
                    }))}
                </div>
                </div>

                {/* Number Pad */}
                <div className="mt-8 grid grid-cols-9 gap-1 sm:gap-2 w-full max-w-md">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <button 
                            key={n}
                            onClick={() => setNumber(n)}
                            aria-label={String(n)}
                            className="min-h-11 min-w-11 aspect-square bg-muted hover:bg-primary hover:text-white rounded-lg flex items-center justify-center font-black text-sm sm:text-lg border border-border transition-all motion-reduce:transition-none shadow-sm"
                        >
                            {n}
                        </button>
                    ))}
                </div>

                {isWon && (
                    <div className="mt-8 text-center animate-in zoom-in-95 motion-reduce:animate-none" role="status" aria-live="polite">
                        <h4 className="text-2xl font-black text-primary">{t.win}</h4>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default Sudoku;
