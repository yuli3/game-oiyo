import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { getBestForConditions, recordBestForConditions, getDailyStreak, recordDailyWin, type BestConditions, type DailyStreak } from '../../lib/games/records';
import { dayIndex, todayKey, previousDayKey } from '../../lib/games/daily';
import { isSudokuSolved, type SudokuValue } from '../../lib/games/logic-puzzles';
import { findSudokuConflicts, generateSudokuPuzzle, sudokuDailySeed, type SudokuDifficultyId } from '../../lib/games/sudoku';
import {
    clearLegacySudokuSave,
    clearSudokuSaveV2,
    loadSudokuSaveV2,
    restoredSudokuSeconds,
    storeSudokuSaveV2,
    sudokuDifficultyFor,
    type SudokuMode,
} from '../../lib/games/sudoku-save';
import { elapsedSeconds } from '../../lib/games/time-contracts';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const DAILY_GAME_ID = 'sudoku-daily';

function createGenerationSeed(): number {
    return (Date.now() ^ Math.floor(Math.random() * 0x1_0000_0000)) | 0;
}

const Sudoku: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const COPY = {
        ko: { title: "스도쿠 (Sudoku)", desc: "1부터 9까지 겹치지 않게 숫자를 채워보세요!", reset: "새 퍼즐", win: "완벽한 논리력입니다!", time: "시간", best: "최단 기록", row: "행", column: "열", empty: "빈 칸", given: "주어진 숫자", entered: "입력한 숫자", selectedLabel: "선택됨", conflict: "충돌", daily: "📅 오늘의 도전", easy: "초급", medium: "중급", hard: "고급", streak: "연속", newBest: "새 최단 기록!", nextGoal: "다음 목표", clues: "단서" },
        en: { title: "Sudoku", desc: "Fill in numbers 1-9 without overlap!", reset: "New Puzzle", win: "Perfect Logic!", time: "Time", best: "Best Time", row: "row", column: "column", empty: "empty", given: "given", entered: "entered", selectedLabel: "selected", conflict: "conflict", daily: "📅 Daily Challenge", easy: "Easy", medium: "Medium", hard: "Hard", streak: "Streak", newBest: "New best time!", nextGoal: "Next goal", clues: "clues" },
        ja: { title: "数独", desc: "1から9まで重複なく埋めましょう！", reset: "新しいパズル", win: "完璧な論理力です！", time: "時間", best: "最短記録", row: "行", column: "列", empty: "空き", given: "初期数字", entered: "入力数字", selectedLabel: "選択中", conflict: "重複", daily: "📅 デイリー挑戦", easy: "初級", medium: "中級", hard: "上級", streak: "連続", newBest: "新記録！", nextGoal: "次の目標", clues: "ヒント数" },
        zh: { title: "数独", desc: "填入1到9，不重复！", reset: "新谜题", win: "完美的逻辑力！", time: "时间", best: "最快记录", row: "行", column: "列", empty: "空格", given: "给定数字", entered: "输入数字", selectedLabel: "已选择", conflict: "冲突", daily: "📅 每日挑战", easy: "初级", medium: "中级", hard: "高级", streak: "连续", newBest: "新的最快记录！", nextGoal: "下一目标", clues: "线索" },
        fr: { title: "Sudoku", desc: "Remplissez de 1 à 9 sans doublon !", reset: "Nouvelle grille", win: "Logique parfaite !", time: "Temps", best: "Meilleur temps", row: "ligne", column: "colonne", empty: "vide", given: "chiffre donné", entered: "chiffre saisi", selectedLabel: "sélectionnée", conflict: "conflit", daily: "📅 Défi du jour", easy: "Facile", medium: "Moyen", hard: "Difficile", streak: "Série", newBest: "Nouveau meilleur temps !", nextGoal: "Prochain objectif", clues: "indices" },
        es: { title: "Sudoku", desc: "¡Rellena del 1 al 9 sin repetir!", reset: "Nuevo puzle", win: "¡Lógica perfecta!", time: "Tiempo", best: "Mejor tiempo", row: "fila", column: "columna", empty: "vacía", given: "número dado", entered: "número introducido", selectedLabel: "seleccionada", conflict: "conflicto", daily: "📅 Reto diario", easy: "Fácil", medium: "Medio", hard: "Difícil", streak: "Racha", newBest: "¡Nuevo mejor tiempo!", nextGoal: "Siguiente objetivo", clues: "pistas" }
    };
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;

    const [mode, setMode] = useState<SudokuMode>('daily');
    const [dailyDate, setDailyDate] = useState(() => todayKey());
    const [givens, setGivens] = useState<SudokuValue[][]>([]);
    const [grid, setGrid] = useState<SudokuValue[][]>([]);
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [seconds, setSeconds] = useState(0);
    const [bestTime, setBestTime] = useState<number | null>(null);
    const [isNewBest, setIsNewBest] = useState(false);
    const [recorded, setRecorded] = useState(false);
    const [focusIndex, setFocusIndex] = useState(0);
    const [streak, setStreak] = useState<DailyStreak | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const seedRef = useRef(0);
    const startedAt = useRef<number | null>(null);

    const conditionsFor = useCallback((nextMode: SudokuMode, seed: number, date: string): BestConditions => ({
        seed: nextMode === 'daily' ? `daily-${date}` : `free-${seed}`,
        difficulty: sudokuDifficultyFor(nextMode),
        assist: 'none',
    }), []);

    const applyPuzzle = useCallback((nextMode: SudokuMode, seed: number, date: string, entries?: SudokuValue[][], restoredSeconds?: number) => {
        const { givens: puzzleGivens } = generateSudokuPuzzle(sudokuDifficultyFor(nextMode), seed);
        seedRef.current = seed;
        setMode(nextMode);
        setDailyDate(date);
        setGivens(puzzleGivens);
        setGrid(puzzleGivens.map((row, r) => row.map((v, c) => v ?? entries?.[r]?.[c] ?? null)));
        setSelected(null);
        setFocusIndex(0);
        setRecorded(false);
        setIsNewBest(false);
        const startSeconds = restoredSeconds ?? 0;
        setSeconds(startSeconds);
        startedAt.current = startSeconds > 0 || entries?.some((row) => row.some((v) => v !== null))
            ? performance.now() - startSeconds * 1000
            : null;
        setBestTime(getBestForConditions('sudoku', conditionsFor(nextMode, seed, date))?.value ?? null);
    }, [conditionsFor]);

    const initGame = useCallback((nextMode: SudokuMode) => {
        clearSudokuSaveV2();
        const today = todayKey();
        const seed = nextMode === 'daily' ? sudokuDailySeed(dayIndex()) : createGenerationSeed();
        applyPuzzle(nextMode, seed, today);
    }, [applyPuzzle]);

    useEffect(() => {
        const today = todayKey();
        const restored = loadSudokuSaveV2(today);
        if (restored) {
            applyPuzzle(restored.mode, restored.seed, restored.dailyDate, restored.entries, restoredSudokuSeconds(restored));
        } else {
            clearLegacySudokuSave();
            initGame('daily');
        }
        setStreak(getDailyStreak(DAILY_GAME_ID, today, previousDayKey(today)));
        setHydrated(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isWon = grid.length === 9 && isSudokuSolved(grid);

    useEffect(() => {
        if (!hydrated) return;
        if (isWon) { clearSudokuSaveV2(); return; }
        if (grid.length !== 9 || givens.length !== 9) return;
        storeSudokuSaveV2({
            mode,
            dailyDate,
            seed: seedRef.current,
            entries: grid.map((row, r) => row.map((v, c) => givens[r][c] === null ? v : null)),
            seconds,
            savedAtEpochMs: Date.now(),
        });
    }, [dailyDate, givens, grid, hydrated, isWon, mode, seconds]);

    const setNumber = (n: number) => {
        if (!selected || isWon) return;
        const [r, c] = selected;
        if (givens[r]?.[c] !== null) return;
        if (startedAt.current === null) startedAt.current = performance.now();
        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = n === grid[r][c] ? null : n;
        setGrid(newGrid);
    };

    useEffect(() => {
        if (isWon) return;
        const id = setInterval(() => setSeconds(elapsedSeconds(startedAt.current, performance.now())), 100);
        return () => clearInterval(id);
    }, [isWon]);

    useEffect(() => {
        if (isWon && !recorded) {
            setRecorded(true);
            const finalSeconds = Math.max(1, seconds);
            const previousBest = bestTime;
            const next = recordBestForConditions('sudoku', finalSeconds, 'seconds', conditionsFor(mode, seedRef.current, dailyDate)).value;
            setIsNewBest(previousBest === null || finalSeconds < previousBest);
            setBestTime(next);
            if (mode === 'daily') {
                const today = todayKey();
                setStreak(recordDailyWin(DAILY_GAME_ID, today, previousDayKey(today)));
            }
        }
    }, [isWon, recorded, seconds, bestTime, conditionsFor, dailyDate, mode]);

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

    const conflicts = grid.length === 9 ? findSudokuConflicts(grid) : [];
    const solvedToday = streak?.lastWinDate === todayKey();
    const clueCount = givens.flat().filter((v) => v !== null).length;

    return (
        <GameContainer title={t.title} subtitle="Pure Deduction" resetLabel={t.reset} onReset={() => initGame(mode)}>
            <div className="flex flex-col items-center">
                <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5">
                    <button onClick={() => initGame('daily')} aria-pressed={mode === 'daily'}
                        className={`min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === 'daily' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                        {t.daily}{solvedToday ? ' ✓' : ''}
                    </button>
                    {(['easy', 'medium', 'hard'] as SudokuDifficultyId[]).map((id) => (
                        <button key={id} onClick={() => initGame(id)} aria-pressed={mode === id}
                            className={`min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === id ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            {t[id]}
                        </button>
                    ))}
                </div>

                {mode === 'daily' && streak && streak.played > 0 && (
                    <p className="mb-2 text-center text-[11px] font-bold text-muted-foreground">🔥 {t.streak} {streak.currentStreak} · {t.best} {streak.maxStreak}</p>
                )}

                <p className="text-sm font-medium text-muted-foreground mb-2 text-center">{t.desc}</p>
                <div className="mb-6 flex gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>{t.time} {fmt(seconds)}</span>
                    <span>{t.clues} {clueCount}</span>
                    {bestTime !== null && <span>{t.best} {fmt(bestTime)}</span>}
                </div>

                <div className="max-w-full overflow-x-auto pb-1">
                <div className="bg-stone-800 p-1 rounded-sm shadow-2xl grid w-max border-4 border-stone-800" style={{ gridTemplateColumns: 'repeat(9, 2.75rem)' }} role="grid" aria-label={t.title} aria-rowcount={9} aria-colcount={9}>
                    {grid.map((row, r) => row.map((val, c) => {
                        const isSelected = selected?.[0] === r && selected?.[1] === c;
                        const isInit = givens[r]?.[c] !== null;
                        const inConflict = Boolean(conflicts[r]?.[c]);
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
                                aria-label={`${t.row} ${r + 1}, ${t.column} ${c + 1}: ${val === null ? t.empty : `${val}, ${isInit ? t.given : t.entered}`}${inConflict ? `, ${t.conflict}` : ''}${isSelected ? `, ${t.selectedLabel}` : ''}`}
                                className={`h-11 w-11 flex items-center justify-center text-lg sm:text-2xl font-bold transition-all motion-reduce:transition-none focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${borderR} ${borderB} ${
                                    isSelected ? 'bg-primary text-primary-foreground z-10' : isInit ? 'bg-stone-100 text-stone-800' : 'bg-stone-50 text-primary'
                                } ${inConflict && !isSelected ? 'text-destructive underline decoration-2 underline-offset-4' : ''}`}
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
                        <p className="mt-2 text-xs text-muted-foreground">
                            {t.time} {fmt(Math.max(1, seconds))}
                            {bestTime !== null && <> · {isNewBest ? t.newBest : `${t.best} ${fmt(bestTime)}`} · {t.nextGoal}: {fmt(Math.max(1, bestTime - 1))}</>}
                        </p>
                        <button
                            onClick={() => initGame(mode)}
                            className="mt-4 min-h-11 px-8 py-2 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
                        >
                            {t.reset}
                        </button>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default Sudoku;
