import React, { useState, useEffect, useCallback } from 'react';
import { GameContainer, PlayingCard } from '../ui/game/GamePrimitives';

type Card = { suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'; value: string; power: number; isRed: boolean; id: string };

const FreeCell: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "프리셀 (FreeCell)", desc: "빈 공간을 활용해 모든 카드를 정리하세요!", reset: "다시 시작", win: "완벽한 알고리즘! 성공입니다." },
        en: { title: "FreeCell", desc: "Use the free cells to organize all cards!", reset: "Restart", win: "Perfect Algorithm! Victory." }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [tableau, setTableau] = useState<Card[][]>(Array(8).fill([]));
    const [freeCells, setFreeCells] = useState<(Card | null)[]>(Array(4).fill(null));
    const [foundation, setFoundation] = useState<Card[][]>(Array(4).fill([]));

    const initGame = useCallback(() => {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const fullDeck: Card[] = [];
        suits.forEach(s => values.forEach((v, i) => fullDeck.push({ 
            suit: s, value: v, power: i + 1, 
            isRed: s === 'hearts' || s === 'diamonds', 
            id: `${s}-${v}-${Math.random()}` 
        })));
        
        // Shuffle
        for (let i = fullDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
        }

        const newTableau: Card[][] = Array(8).fill([]).map(() => []);
        fullDeck.forEach((card, i) => newTableau[i % 8].push(card));

        setTableau(newTableau);
        setFreeCells(Array(4).fill(null));
        setFoundation(Array(4).fill([]).map(() => []));
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    const tryMoveToFoundation = (card: Card, source: { type: 'tableau' | 'free', index: number }) => {
        const fIdx = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(card.suit);
        const targetStack = foundation[fIdx];
        
        const canMove = (targetStack.length === 0 && card.power === 1) || 
                        (targetStack.length > 0 && targetStack[targetStack.length - 1].power === card.power - 1);

        if (canMove) {
            const newFoundation = [...foundation];
            newFoundation[fIdx] = [...targetStack, card];
            setFoundation(newFoundation);

            if (source.type === 'tableau') {
                const newTableau = [...tableau];
                newTableau[source.index].pop();
                setTableau(newTableau);
            } else {
                const newFree = [...freeCells];
                newFree[source.index] = null;
                setFreeCells(newFree);
            }
            return true;
        }
        return false;
    };

    const tryMoveToFreeCell = (card: Card, sourceIndex: number) => {
        const emptyIdx = freeCells.indexOf(null);
        if (emptyIdx !== -1) {
            const newFree = [...freeCells];
            newFree[emptyIdx] = card;
            setFreeCells(newFree);

            const newTableau = [...tableau];
            newTableau[sourceIndex].pop();
            setTableau(newTableau);
            return true;
        }
        return false;
    };

    const handleCardClick = (card: Card, source: { type: 'tableau' | 'free', index: number }) => {
        // Priority 1: Foundation
        if (tryMoveToFoundation(card, source)) return;
        
        // Priority 2: Free Cell (if from tableau)
        if (source.type === 'tableau') {
            tryMoveToFreeCell(card, source.index);
        } else {
            // Priority 3: Try to move back to tableau (simplified logic skipped)
        }
    };

    const isWon = foundation.every(f => f.length === 13);

    return (
        <GameContainer title={t.title} subtitle="Asset Allocation" onReset={initGame}>
            <div className="space-y-8">
                {/* Top: FreeCells & Foundation */}
                <div className="flex justify-between">
                    <div className="flex gap-2">
                        {freeCells.map((c, i) => (
                            <div key={i} className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center relative bg-muted/20">
                                {c && <PlayingCard suit={c.suit} value={c.value} onClick={() => handleCardClick(c, { type: 'free', index: i })} className="absolute inset-0" />}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {foundation.map((f, i) => (
                            <div key={i} className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center relative">
                                <span className={`absolute opacity-20 text-3xl ${i < 2 ? 'text-destructive' : 'text-foreground'}`}>
                                    {['♥', '♦', '♣', '♠'][i]}
                                </span>
                                {f.length > 0 && <PlayingCard suit={f[f.length - 1].suit} value={f[f.length - 1].value} className="absolute inset-0" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tableau */}
                <div className="grid grid-cols-8 gap-1 sm:gap-2 justify-between min-h-[400px]">
                    {tableau.map((stack, sIdx) => (
                        <div key={sIdx} className="relative flex flex-col">
                            {stack.map((c, cIdx) => (
                                <div 
                                    key={c.id} 
                                    style={{ marginTop: cIdx === 0 ? 0 : -65 }}
                                    className="z-10"
                                >
                                    <PlayingCard 
                                        suit={c.suit} 
                                        value={c.value} 
                                        onClick={cIdx === stack.length - 1 ? () => handleCardClick(c, { type: 'tableau', index: sIdx }) : undefined} 
                                        className={`shadow-md border border-border ${cIdx === stack.length - 1 ? 'hover:-translate-y-2 cursor-pointer' : 'opacity-90'}`}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {isWon && (
                <div className="absolute inset-0 z-30 bg-background/90 backdrop-blur-xl rounded-4xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                    <h4 className="text-4xl font-black text-primary mb-4">{t.win}</h4>
                    <button onClick={initGame} className="px-12 py-4 bg-primary text-primary-foreground rounded-full font-black shadow-lg">RESTART</button>
                </div>
            )}
        </GameContainer>
    );
};

export default FreeCell;
