import React, { useState, useEffect, useCallback } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

type Cell = { x: number; y: number; isMine: boolean; isRevealed: boolean; isFlagged: boolean; neighborMines: number };

const SIZE = 10;
const MINE_COUNT = 10;
const BEST_KEY = 'oiyo-minesweeper-best';

const COPY = {
    ko: { title: "지뢰찾기", subtitle: "Logic Sweep", mines: "남은 지뢰", time: "시간", over: "폭발! 게임 종료", win: "모든 지뢰를 찾았습니다!", reset: "새 게임", dig: "파기", flag: "깃발", best: "최단 기록", hint: "모바일: 깃발 모드 전환 · PC: 우클릭 깃발" },
    en: { title: "Minesweeper", subtitle: "Logic Sweep", mines: "Mines", time: "Time", over: "BOOM! Game Over", win: "You Win!", reset: "New Game", dig: "Dig", flag: "Flag", best: "Best Time", hint: "Mobile: toggle flag mode · PC: right-click to flag" },
    ja: { title: "マインスイーパー", subtitle: "Logic Sweep", mines: "残り地雷", time: "時間", over: "ドカン！ゲーム終了", win: "すべての地雷を見つけました！", reset: "新しいゲーム", dig: "掘る", flag: "旗", best: "最短記録", hint: "モバイル: 旗モード切替 · PC: 右クリックで旗" },
    zh: { title: "扫雷", subtitle: "Logic Sweep", mines: "剩余地雷", time: "时间", over: "爆炸！游戏结束", win: "找到了所有地雷！", reset: "新游戏", dig: "挖开", flag: "插旗", best: "最快记录", hint: "手机: 切换插旗模式 · 电脑: 右键插旗" },
    fr: { title: "Démineur", subtitle: "Logic Sweep", mines: "Mines", time: "Temps", over: "BOUM ! Partie terminée", win: "Toutes les mines trouvées !", reset: "Nouvelle partie", dig: "Creuser", flag: "Drapeau", best: "Meilleur temps", hint: "Mobile : mode drapeau · PC : clic droit" },
    es: { title: "Buscaminas", subtitle: "Logic Sweep", mines: "Minas", time: "Tiempo", over: "¡BUM! Fin del juego", win: "¡Encontraste todas las minas!", reset: "Nueva partida", dig: "Cavar", flag: "Bandera", best: "Mejor tiempo", hint: "Móvil: modo bandera · PC: clic derecho" },
} as const;

// Classic minesweeper number colors mapped to design tokens
const NUM_COLORS: Record<number, string> = {
    1: 'text-chart-2',
    2: 'text-primary',
    3: 'text-destructive',
    4: 'text-chart-4',
    5: 'text-chart-5',
    6: 'text-chart-1',
    7: 'text-foreground',
    8: 'text-muted-foreground',
};

const Minesweeper: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;

    const [board, setBoard] = useState<Cell[][]>([]);
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
    const [timer, setTimer] = useState(0);
    const [flagMode, setFlagMode] = useState(false);
    const [firstClick, setFirstClick] = useState(true);
    const [bestTime, setBestTime] = useState<number | null>(null);

    const buildBoard = useCallback((safeX: number = -1, safeY: number = -1): Cell[][] => {
        const newBoard: Cell[][] = Array(SIZE).fill(null).map((_, y) =>
            Array(SIZE).fill(null).map((_, x) => ({ x, y, isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0 }))
        );

        // Place mines — keep the first-clicked cell and its neighbors safe
        let placed = 0;
        while (placed < MINE_COUNT) {
            const rx = Math.floor(Math.random() * SIZE);
            const ry = Math.floor(Math.random() * SIZE);
            if (newBoard[ry][rx].isMine) continue;
            if (safeX >= 0 && Math.abs(rx - safeX) <= 1 && Math.abs(ry - safeY) <= 1) continue;
            newBoard[ry][rx].isMine = true;
            placed++;
        }

        // Calculate neighbors
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                if (newBoard[y][x].isMine) continue;
                let count = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const ny = y + dy, nx = x + dx;
                        if (ny >= 0 && ny < SIZE && nx >= 0 && nx < SIZE && newBoard[ny][nx].isMine) count++;
                    }
                }
                newBoard[y][x].neighborMines = count;
            }
        }
        return newBoard;
    }, []);

    const initBoard = useCallback(() => {
        setBoard(buildBoard());
        setStatus('playing');
        setTimer(0);
        setFirstClick(true);
        setFlagMode(false);
    }, [buildBoard]);

    useEffect(() => {
        initBoard();
        try {
            const stored = Number(localStorage.getItem(BEST_KEY));
            if (Number.isFinite(stored) && stored > 0) setBestTime(stored);
        } catch { /* ignore */ }
    }, [initBoard]);

    useEffect(() => {
        if (status !== 'playing') return;
        const interval = setInterval(() => setTimer((s) => s + 1), 1000);
        return () => clearInterval(interval);
    }, [status]);

    const floodReveal = (b: Cell[][], x: number, y: number) => {
        const queue = [[x, y]];
        while (queue.length > 0) {
            const [cx, cy] = queue.shift()!;
            if (b[cy][cx].isRevealed || b[cy][cx].isFlagged) continue;
            b[cy][cx].isRevealed = true;
            if (b[cy][cx].neighborMines === 0) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const ny = cy + dy, nx = cx + dx;
                        if (ny >= 0 && ny < SIZE && nx >= 0 && nx < SIZE && !b[ny][nx].isRevealed) queue.push([nx, ny]);
                    }
                }
            }
        }
    };

    const reveal = (x: number, y: number) => {
        if (status !== 'playing') return;

        // First click is always safe: build the board around it
        let base = board;
        if (firstClick) {
            base = buildBoard(x, y);
            setFirstClick(false);
        }
        if (base[y][x].isRevealed || base[y][x].isFlagged) { if (base !== board) setBoard(base); return; }

        const newBoard = base.map((row) => row.map((c) => ({ ...c })));
        if (newBoard[y][x].isMine) {
            setStatus('lost');
            newBoard.forEach((row) => row.forEach((cell) => { if (cell.isMine) cell.isRevealed = true; }));
        } else {
            floodReveal(newBoard, x, y);
            const hiddenSafe = newBoard.flat().filter((c) => !c.isMine && !c.isRevealed).length;
            if (hiddenSafe === 0) {
                setStatus('won');
                if (bestTime === null || timer < bestTime) {
                    setBestTime(timer);
                    try { localStorage.setItem(BEST_KEY, String(timer)); } catch { /* ignore */ }
                }
            }
        }
        setBoard(newBoard);
    };

    const toggleFlag = (x: number, y: number) => {
        if (status !== 'playing' || board[y]?.[x]?.isRevealed) return;
        setBoard((prev) => prev.map((row) => row.map((c) =>
            c.x === x && c.y === y ? { ...c, isFlagged: !c.isFlagged } : c
        )));
    };

    const handleCellClick = (x: number, y: number) => {
        if (flagMode) toggleFlag(x, y);
        else reveal(x, y);
    };

    const handleContextMenu = (e: React.MouseEvent, x: number, y: number) => {
        e.preventDefault();
        toggleFlag(x, y);
    };

    const flaggedCount = board.flat().filter((c) => c.isFlagged).length;

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={initBoard}>
            <div className="flex justify-between items-center mb-4 gap-2">
                <div className="px-3 py-1.5 bg-muted rounded-lg text-xs font-black text-muted-foreground" aria-label={t.mines}>🚩 {MINE_COUNT - flaggedCount}</div>
                <button
                    onClick={() => setFlagMode((f) => !f)}
                    aria-pressed={flagMode}
                    aria-label={flagMode ? t.flag : t.dig}
                    className={`px-4 py-1.5 rounded-full text-xs font-black border transition-all ${
                        flagMode
                            ? 'bg-chart-2/15 text-chart-2 border-chart-2/40'
                            : 'bg-muted text-muted-foreground border-border'
                    }`}
                >
                    {flagMode ? `🚩 ${t.flag}` : `⛏️ ${t.dig}`}
                </button>
                <div className="px-3 py-1.5 bg-muted rounded-lg text-xs font-black text-muted-foreground" aria-label={t.time}>⏱️ {timer}s</div>
            </div>

            <div className="grid grid-cols-10 gap-1 bg-muted/30 p-2 rounded-xl border border-border" role="grid" aria-label={t.title}>
                {board.flat().map((cell, i) => (
                    <button
                        key={i}
                        onClick={() => handleCellClick(cell.x, cell.y)}
                        onContextMenu={(e) => handleContextMenu(e, cell.x, cell.y)}
                        disabled={status !== 'playing'}
                        aria-label={cell.isRevealed ? (cell.isMine ? 'mine' : String(cell.neighborMines)) : (cell.isFlagged ? 'flag' : 'hidden')}
                        className={`aspect-square rounded-sm flex items-center justify-center font-black text-sm transition-all ${
                            cell.isRevealed
                                ? cell.isMine ? 'bg-destructive text-destructive-foreground' : 'bg-background'
                                : 'bg-primary/20 hover:bg-primary/30 active:scale-95 border-b-2 border-primary/40'
                        }`}
                    >
                        {cell.isRevealed
                            ? cell.isMine ? '💣' : (cell.neighborMines > 0
                                ? <span className={NUM_COLORS[cell.neighborMines] ?? 'text-primary'}>{cell.neighborMines}</span>
                                : '')
                            : cell.isFlagged ? '🚩' : ''}
                    </button>
                ))}
            </div>

            {status !== 'playing' ? (
                <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-2" role="status" aria-live="polite">
                    <p className={`text-lg font-black ${status === 'won' ? 'text-primary' : 'text-destructive'}`}>
                        {status === 'won' ? t.win : t.over}
                    </p>
                    {status === 'won' && bestTime !== null && (
                        <p className="text-xs text-muted-foreground mt-1">{t.best}: {bestTime}s</p>
                    )}
                    <button
                        onClick={initBoard}
                        className="mt-4 px-8 py-2 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
                    >
                        {t.reset}
                    </button>
                </div>
            ) : (
                <p className="mt-4 text-center text-[10px] text-muted-foreground font-medium">{t.hint}</p>
            )}
        </GameContainer>
    );
};

export default Minesweeper;
