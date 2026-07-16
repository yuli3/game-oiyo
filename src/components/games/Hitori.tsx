import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { validateHitori } from '../../lib/games/logic-puzzles';

type Cell = { value: number; isDark: boolean; isError: boolean };

const Hitori: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const COPY = {
        ko: { title: "히토리 (Hitori)", desc: "중복된 숫자를 지워 가로세로 유일한 수만 남기세요!", rule: "검은 칸은 맞닿지 않고, 흰 칸은 하나로 이어져야 합니다.", reset: "판 갈기", win: "본질만 남았습니다!", next: "다음 판", row: "행", column: "열", shaded: "검게 칠함", open: "흰 칸" },
        en: { title: "Hitori", desc: "Shade duplicate numbers to leave only unique ones!", rule: "Black cells cannot touch, and every white cell must stay connected.", reset: "Restart", win: "Only essence remains!", next: "Next grid", row: "row", column: "column", shaded: "shaded", open: "white" },
        ja: { title: "ひとりにしてくれ", desc: "重複した数字を消して、縦横で唯一の数字だけ残しましょう！", rule: "黒マスは隣接せず、白マスはすべてつながる必要があります。", reset: "新しい盤面", win: "本質だけが残りました！", next: "次の盤面", row: "行", column: "列", shaded: "黒マス", open: "白マス" },
        zh: { title: "数壹（Hitori）", desc: "涂掉重复的数字，让每行每列只留唯一数字！", rule: "黑格不能相邻，所有白格必须连通。", reset: "换新棋盘", win: "只留下了精华！", next: "下一盘", row: "行", column: "列", shaded: "黑格", open: "白格" },
        fr: { title: "Hitori", desc: "Noircissez les doublons pour ne garder que des chiffres uniques !", rule: "Les cases noires ne se touchent pas et toutes les blanches restent reliées.", reset: "Nouvelle grille", win: "Il ne reste que l'essentiel !", next: "Grille suivante", row: "ligne", column: "colonne", shaded: "noire", open: "blanche" },
        es: { title: "Hitori", desc: "¡Sombrea los números repetidos y deja solo los únicos!", rule: "Las casillas negras no se tocan y todas las blancas deben quedar conectadas.", reset: "Nuevo tablero", win: "¡Solo queda la esencia!", next: "Siguiente tablero", row: "fila", column: "columna", shaded: "negra", open: "blanca" }
    };
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;

    const [grid, setGrid] = useState<Cell[][]>([]);
    const [activeCell, setActiveCell] = useState(0);
    const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const initGame = useCallback(() => {
        const initialValues = [
            [2, 2, 1, 5, 3],
            [2, 3, 1, 4, 5],
            [1, 1, 1, 3, 5],
            [1, 3, 5, 4, 2],
            [5, 4, 3, 2, 1]
        ];

        setGrid(initialValues.map(row => row.map(v => ({ value: v, isDark: false, isError: false }))));
        setActiveCell(0);
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    const toggleDark = (r: number, c: number) => {
        const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
        newGrid[r][c].isDark = !newGrid[r][c].isDark;
        
        // Simple Duplicate Check (Error Display)
        setGrid(newGrid);
    };

    const validation = validateHitori(
        grid.map((row) => row.map((cell) => cell.value)),
        grid.map((row) => row.map((cell) => cell.isDark)),
    );
    const isWon = validation.valid;

    const moveFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        const row = Math.floor(index / 5), column = index % 5;
        let next = index;
        if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * 5 + column;
        else if (event.key === 'ArrowDown') next = Math.min(4, row + 1) * 5 + column;
        else if (event.key === 'ArrowLeft') next = row * 5 + Math.max(0, column - 1);
        else if (event.key === 'ArrowRight') next = row * 5 + Math.min(4, column + 1);
        else if (event.key === 'Home') next = row * 5;
        else if (event.key === 'End') next = row * 5 + 4;
        else return;
        event.preventDefault();
        setActiveCell(next);
        cellRefs.current[next]?.focus();
    };

    return (
        <GameContainer title={t.title} subtitle="Subtract to Reveal" resetLabel={t.reset} onReset={initGame}>
            <div className="flex flex-col items-center">
                <p className="text-sm font-medium text-muted-foreground mb-8 text-center leading-relaxed">
                    {t.desc}<br/>
                    <span className="text-[10px] opacity-60">{t.rule}</span>
                </p>

                <div className="bg-muted/30 p-4 rounded-3xl border border-border shadow-inner grid grid-cols-5 gap-1" role="grid" aria-label={t.title} aria-rowcount={5} aria-colcount={5}>
                    {grid.map((row, r) => row.map((cell, c) => (
                        <button
                            key={`${r}-${c}`}
                            ref={(node) => { cellRefs.current[r * 5 + c] = node; }}
                            type="button"
                            role="gridcell"
                            onClick={() => toggleDark(r, c)}
                            onFocus={() => setActiveCell(r * 5 + c)}
                            onKeyDown={(event) => moveFocus(event, r * 5 + c)}
                            tabIndex={activeCell === r * 5 + c ? 0 : -1}
                            aria-pressed={cell.isDark}
                            aria-rowindex={r + 1}
                            aria-colindex={c + 1}
                            aria-label={`${t.row} ${r + 1}, ${t.column} ${c + 1}: ${cell.value}, ${cell.isDark ? t.shaded : t.open}`}
                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-black text-xl transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
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
                    <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none" role="status" aria-live="polite">
                        <h4 className="text-2xl font-black text-primary mb-4">{t.win}</h4>
                        <button onClick={initGame} className="min-h-11 px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">{t.next}</button>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default Hitori;
