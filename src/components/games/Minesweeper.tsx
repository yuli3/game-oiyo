import React, { useState, useEffect, useCallback } from 'react';

type Cell = { x: number; y: number; isMine: boolean; isRevealed: boolean; isFlagged: boolean; neighborMines: number };

const Minesweeper: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "지뢰찾기", mines: "남은 지뢰", time: "시간", over: "폭발! 게임 종료", win: "모든 지뢰를 찾았습니다!", reset: "새 게임" },
        en: { title: "Minesweeper", mines: "Mines", time: "Time", over: "BOOM! Game Over", win: "You Win!", reset: "New Game" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const SIZE = 10;
    const MINE_COUNT = 10;

    const [board, setBoard] = useState<Cell[][]>([]);
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
    const [timer, setTimer] = useState(0);

    const initBoard = useCallback(() => {
        const newBoard: Cell[][] = Array(SIZE).fill(null).map((_, y) => 
            Array(SIZE).fill(null).map((_, x) => ({ x, y, isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0 }))
        );

        // Place mines
        let placed = 0;
        while (placed < MINE_COUNT) {
            const rx = Math.floor(Math.random() * SIZE);
            const ry = Math.floor(Math.random() * SIZE);
            if (!newBoard[ry][rx].isMine) {
                newBoard[ry][rx].isMine = true;
                placed++;
            }
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
        setBoard(newBoard);
        setStatus('playing');
        setTimer(0);
    }, []);

    useEffect(() => { initBoard(); }, [initBoard]);

    useEffect(() => {
        if (status !== 'playing') return;
        const interval = setInterval(() => setTimer(s => s + 1), 1000);
        return () => clearInterval(interval);
    }, [status]);

    const reveal = (x: number, y: number) => {
        if (status !== 'playing' || board[y][x].isRevealed || board[y][x].isFlagged) return;

        const newBoard = [...board.map(row => [...row])];
        if (newBoard[y][x].isMine) {
            setStatus('lost');
            // Reveal all mines
            newBoard.forEach(row => row.forEach(cell => { if (cell.isMine) cell.isRevealed = true; }));
        } else {
            const queue = [[x, y]];
            while (queue.length > 0) {
                const [cx, cy] = queue.shift()!;
                if (newBoard[cy][cx].isRevealed) continue;
                newBoard[cy][cx].isRevealed = true;
                if (newBoard[cy][cx].neighborMines === 0) {
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const ny = cy + dy, nx = cx + dx;
                            if (ny >= 0 && ny < SIZE && nx >= 0 && nx < SIZE && !newBoard[ny][nx].isRevealed) queue.push([nx, ny]);
                        }
                    }
                }
            }
            // Check win
            const hiddenSafe = newBoard.flat().filter(c => !c.isMine && !c.isRevealed).length;
            if (hiddenSafe === 0) setStatus('won');
        }
        setBoard(newBoard);
    };

    const toggleFlag = (e: React.MouseEvent, x: number, y: number) => {
        e.preventDefault();
        if (status !== 'playing' || board[y][x].isRevealed) return;
        const newBoard = [...board.map(row => [...row])];
        newBoard[y][x].isFlagged = !newBoard[y][x].isFlagged;
        setBoard(newBoard);
    };

    const flaggedCount = board.flat().filter(c => c.isFlagged).length;

    return (
        <div className="not-prose my-12 p-8 bg-card border border-border rounded-3xl shadow-sm max-w-sm mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div className="px-3 py-1 bg-muted rounded-lg text-xs font-black text-muted-foreground">🚩 {MINE_COUNT - flaggedCount}</div>
                <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full group cursor-pointer" onClick={initBoard}>
                    <span className="text-xl group-active:rotate-180 transition-transform">😊</span>
                </div>
                <div className="px-3 py-1 bg-muted rounded-lg text-xs font-black text-muted-foreground">⏱️ {timer}s</div>
            </div>

            <div className={`grid grid-cols-10 gap-1 bg-muted/30 p-2 rounded-xl border border-border`}>
                {board.flat().map((cell, i) => (
                    <button
                        key={i}
                        onClick={() => reveal(cell.x, cell.y)}
                        onContextMenu={(e) => toggleFlag(e, cell.x, cell.y)}
                        className={`aspect-square rounded-sm flex items-center justify-center font-black text-sm transition-all ${
                            cell.isRevealed 
                                ? cell.isMine ? 'bg-destructive text-destructive-foreground' : 'bg-background text-primary'
                                : 'bg-primary/20 hover:bg-primary/30 border-b-2 border-primary/40'
                        }`}
                    >
                        {cell.isRevealed 
                            ? cell.isMine ? '💣' : (cell.neighborMines || '') 
                            : cell.isFlagged ? '🚩' : ''}
                    </button>
                ))}
            </div>

            {status !== 'playing' && (
                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2">
                    <p className={`text-lg font-black ${status === 'won' ? 'text-primary' : 'text-destructive'}`}>
                        {status === 'won' ? t.win : t.over}
                    </p>
                    <button 
                        onClick={initBoard}
                        className="mt-4 px-8 py-2 bg-primary text-primary-foreground rounded-full font-bold shadow-lg"
                    >
                        {t.reset}
                    </button>
                </div>
            )}
        </div>
    );
};

export default Minesweeper;
