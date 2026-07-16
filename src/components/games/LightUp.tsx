import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { evaluateAkari } from '../../lib/games/logic-puzzles';

const SIZE = 7;
type Cell = { type: 'white' | 'black'; count?: number; hasBulb: boolean; isLit: boolean; isError: boolean };

const LightUp: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const COPY = {
        ko: { title: "라이트업 (Akari)", desc: "모든 흰 칸을 밝히고 숫자만큼 전구를 붙이세요. 전구끼리는 서로 비추면 안 됩니다.", reset: "판 갈기", win: "세상이 밝아졌습니다!", again: "다시 하기", row: "행", column: "열", wall: "벽", bulb: "전구", lit: "밝음", unlit: "어두움", error: "규칙 충돌" },
        en: { title: "Light Up (Akari)", desc: "Light every white cell, match each numbered wall, and never let bulbs see each other.", reset: "Restart", win: "The world is bright!", again: "Play again", row: "row", column: "column", wall: "wall", bulb: "bulb", lit: "lit", unlit: "unlit", error: "rule conflict" },
        ja: { title: "美術館（ライトアップ）", desc: "すべての白マスを照らし、数字どおりに電球を置きます。電球同士を照らしてはいけません。", reset: "新しい盤面", win: "世界が明るくなりました！", again: "もう一度", row: "行", column: "列", wall: "壁", bulb: "電球", lit: "点灯", unlit: "未点灯", error: "ルール違反" },
        zh: { title: "点灯（Akari）", desc: "点亮所有白格，使数字墙周围的灯数相符，灯泡之间不能互相照射。", reset: "换新棋盘", win: "世界亮起来了！", again: "再玩一次", row: "行", column: "列", wall: "墙", bulb: "灯泡", lit: "已点亮", unlit: "未点亮", error: "规则冲突" },
        fr: { title: "Light Up (Akari)", desc: "Éclairez chaque case blanche, respectez les murs numérotés et ne laissez jamais deux ampoules se voir.", reset: "Nouvelle grille", win: "Le monde s'illumine !", again: "Rejouer", row: "ligne", column: "colonne", wall: "mur", bulb: "ampoule", lit: "éclairée", unlit: "éteinte", error: "conflit de règle" },
        es: { title: "Light Up (Akari)", desc: "Ilumina cada casilla blanca, respeta los muros numerados y evita que dos bombillas se vean.", reset: "Nuevo tablero", win: "¡El mundo se iluminó!", again: "Jugar de nuevo", row: "fila", column: "columna", wall: "muro", bulb: "bombilla", lit: "iluminada", unlit: "apagada", error: "conflicto de regla" }
    };
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;

    const [grid, setGrid] = useState<Cell[][]>([]);
    const [activeCell, setActiveCell] = useState(0);
    const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
    
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
        setActiveCell(0);
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    const updateLighting = (currentGrid: Cell[][]) => {
        const spec = currentGrid.map((row) => row.map((cell) => cell.type === 'black' ? cell.count ?? 0 : null));
        const bulbs = currentGrid.map((row) => row.map((cell) => cell.hasBulb));
        const result = evaluateAkari(spec, bulbs);
        return currentGrid.map((row, r) => row.map((cell, c) => ({
            ...cell,
            isLit: result.lit[r][c],
            isError: cell.type === 'black' ? result.clueErrors[r][c] : result.bulbErrors[r][c],
        })));
    };

    const toggleBulb = (r: number, c: number) => {
        if (grid[r][c].type === 'black') return;
        const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
        newGrid[r][c].hasBulb = !newGrid[r][c].hasBulb;
        setGrid(updateLighting(newGrid));
    };

    const isWon = grid.length > 0 && grid.every(row => row.every(cell => (cell.type === 'black') || cell.isLit)) && 
                 grid.every(row => row.every(cell => !cell.isError));

    const moveFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        const row = Math.floor(index / SIZE), column = index % SIZE;
        let next = index;
        if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * SIZE + column;
        else if (event.key === 'ArrowDown') next = Math.min(SIZE - 1, row + 1) * SIZE + column;
        else if (event.key === 'ArrowLeft') next = row * SIZE + Math.max(0, column - 1);
        else if (event.key === 'ArrowRight') next = row * SIZE + Math.min(SIZE - 1, column + 1);
        else if (event.key === 'Home') next = row * SIZE;
        else if (event.key === 'End') next = row * SIZE + SIZE - 1;
        else return;
        event.preventDefault();
        if (grid[Math.floor(next / SIZE)]?.[next % SIZE]?.type === 'black') return;
        setActiveCell(next);
        cellRefs.current[next]?.focus();
    };

    return (
        <GameContainer title={t.title} subtitle="Logic & Illumination" resetLabel={t.reset} onReset={initGame}>
            <p className="text-sm font-medium text-muted-foreground mb-8 text-center">{t.desc}</p>
            
            <div className="overflow-x-auto pb-1">
            <div className="grid gap-1 bg-muted/30 p-2 rounded-2xl border border-border w-max mx-auto" style={{ gridTemplateColumns: `repeat(${SIZE}, 2.75rem)` }} role="grid" aria-label={t.title} aria-rowcount={SIZE} aria-colcount={SIZE}>
                {grid.map((row, r) => row.map((cell, c) => {
                    const index = r * SIZE + c;
                    const label = `${t.row} ${r + 1}, ${t.column} ${c + 1}: ${cell.type === 'black' ? `${t.wall}${cell.count !== undefined ? ` ${cell.count}` : ''}` : cell.hasBulb ? t.bulb : cell.isLit ? t.lit : t.unlit}${cell.isError ? `, ${t.error}` : ''}`;
                    if (cell.type === 'black') return (
                        <div key={`${r}-${c}`} role="gridcell" aria-label={label} className={`relative h-11 w-11 rounded-md flex items-center justify-center bg-stone-800 text-white shadow-sm border border-border/20 ${cell.isError ? 'ring-2 ring-destructive' : ''}`}>
                            {cell.count !== undefined && <span className={`text-xs font-black ${cell.isError ? 'text-destructive' : ''}`}>{cell.count}</span>}
                        </div>
                    );
                    return (
                        <button
                            key={`${r}-${c}`}
                            ref={(node) => { cellRefs.current[index] = node; }}
                            type="button"
                            role="gridcell"
                            onClick={() => toggleBulb(r, c)}
                            onFocus={() => setActiveCell(index)}
                            onKeyDown={(event) => moveFocus(event, index)}
                            tabIndex={activeCell === index ? 0 : -1}
                            aria-pressed={cell.hasBulb}
                            aria-label={label}
                            className={`relative h-11 w-11 rounded-md flex items-center justify-center transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                                cell.hasBulb ? cell.isError ? 'bg-destructive' : 'bg-primary' : cell.isLit ? 'bg-primary/20' : 'bg-background'
                            } shadow-sm border border-border/20`}
                        >
                            {cell.hasBulb && <span className="text-xl sm:text-2xl drop-shadow-md">💡</span>}
                            {cell.isLit && !cell.hasBulb && <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />}
                        </button>
                    );
                }))}
            </div>
            </div>

            {isWon && (
                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none" role="status" aria-live="polite">
                    <h4 className="text-2xl font-black text-primary mb-4">{t.win}</h4>
                    <button onClick={initGame} className="min-h-11 px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">{t.again}</button>
                </div>
            )}
        </GameContainer>
    );
};

export default LightUp;
