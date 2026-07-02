import React, { useState, useEffect, useCallback } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

type Domino = { left: number; right: number; id: number };

const Dominoes: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "도미노 (Dominoes)", turn: "차례", player: "나", cpu: "경쟁자", win: "승리!", over: "게임 종료", reset: "새 판", draw: "가져오기" },
        en: { title: "Dominoes", turn: "Turn", player: "You", cpu: "CPU", win: "Wins!", over: "Game Over", reset: "New Game", draw: "Draw" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [deck, setDeck] = useState<Domino[]>([]);
    const [hand, setHand] = useState<Domino[]>([]);
    const [board, setBoard] = useState<Domino[]>([]);
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [winner, setWinner] = useState<string | null>(null);

    const initGame = useCallback(() => {
        const fullDeck: Domino[] = [];
        let id = 0;
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                fullDeck.push({ left: i, right: j, id: id++ });
            }
        }
        
        // Shuffle
        for (let i = fullDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
        }

        setHand(fullDeck.slice(0, 7));
        setDeck(fullDeck.slice(14)); // Simplified for CPU
        setBoard([fullDeck[13]]); // Initial piece
        setIsPlayerTurn(true);
        setWinner(null);
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    const playDomino = (domino: Domino) => {
        if (!isPlayerTurn || winner) return;

        const leftEnd = board[0].left;
        const rightEnd = board[board.length - 1].right;

        let newBoard = [...board];
        let played = false;

        if (domino.right === leftEnd) {
            newBoard = [domino, ...board];
            played = true;
        } else if (domino.left === leftEnd) {
            newBoard = [{ left: domino.right, right: domino.left, id: domino.id }, ...board];
            played = true;
        } else if (domino.left === rightEnd) {
            newBoard = [...board, domino];
            played = true;
        } else if (domino.right === rightEnd) {
            newBoard = [...board, { left: domino.right, right: domino.left, id: domino.id }];
            played = true;
        }

        if (played) {
            setBoard(newBoard);
            const newHand = hand.filter(d => d.id !== domino.id);
            setHand(newHand);
            if (newHand.length === 0) setWinner(t.player);
            else setIsPlayerTurn(false);
        }
    };

    useEffect(() => {
        if (!isPlayerTurn && !winner) {
            setTimeout(() => {
                // Simplified CPU Logic: Play first valid move
                const leftEnd = board[0].left;
                const rightEnd = board[board.length - 1].right;
                // CPU uses deck in this simplified demo
                const cpuHand = deck.slice(0, 5); // Peek some
                const move = cpuHand.find(d => d.left === leftEnd || d.right === leftEnd || d.left === rightEnd || d.right === rightEnd);

                if (move) {
                    if (move.right === leftEnd) setBoard([move, ...board]);
                    else if (move.left === leftEnd) setBoard([{ left: move.right, right: move.left, id: move.id }, ...board]);
                    else if (move.left === rightEnd) setBoard([...board, move]);
                    else setBoard([...board, { left: move.right, right: move.left, id: move.id }]);
                    setDeck(deck.filter(d => d.id !== move.id));
                }

                setIsPlayerTurn(true);
            }, 1500);
        }
    }, [isPlayerTurn, winner, board, deck, t.player]);

    const renderPip = (n: number) => {
        const positions = [
            [], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]
        ];
        return (
            <div className="grid grid-cols-3 grid-rows-3 w-6 h-6 gap-0.5">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className={`rounded-full ${positions[n].includes(i) ? 'bg-foreground' : 'bg-transparent'}`} />
                ))}
            </div>
        );
    };

    return (
        <GameContainer title={t.title} subtitle="Seamless Connectivity" onReset={initGame}>
            <div className="flex justify-between items-center mb-10">
                <div className={`px-4 py-2 rounded-2xl border ${isPlayerTurn ? 'bg-primary/10 border-primary' : 'bg-muted border-transparent opacity-50'}`}>
                    <span className="text-xs font-black uppercase tracking-widest">{isPlayerTurn ? t.player : t.cpu} {t.turn}</span>
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase">
                    Deck: {deck.length} remaining
                </div>
            </div>

            {/* Domino Board */}
            <div className="h-48 bg-muted/40 rounded-3xl border border-border flex items-center justify-center p-4 overflow-x-auto gap-1 shadow-inner mb-10 scrolling-touch">
                {board.map((d) => (
                    <div key={d.id} className="flex flex-shrink-0 bg-card border border-border rounded-md shadow-sm divide-x divide-border">
                        <div className="p-1">{renderPip(d.left)}</div>
                        <div className="p-1">{renderPip(d.right)}</div>
                    </div>
                ))}
            </div>

            {/* Hand Area */}
            <div className="space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase text-center tracking-widest">Your Tiles</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {hand.map(d => (
                        <button 
                            key={d.id} 
                            onClick={() => playDomino(d)}
                            className="bg-card border-2 border-border rounded-lg shadow-sm flex flex-col divide-y divide-border hover:border-primary hover:-translate-y-1 transition-all active:scale-95"
                        >
                            <div className="p-2 sm:p-3">{renderPip(d.left)}</div>
                            <div className="p-2 sm:p-3">{renderPip(d.right)}</div>
                        </button>
                    ))}
                </div>
            </div>

            {winner && (
                <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-md rounded-4xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                    <h4 className="text-4xl font-black text-primary mb-4">{winner} {t.win}</h4>
                    <button onClick={initGame} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">
                        {t.reset}
                    </button>
                </div>
            )}
        </GameContainer>
    );
};

export default Dominoes;
