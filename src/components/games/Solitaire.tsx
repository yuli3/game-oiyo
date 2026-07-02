import React, { useState, useEffect, useCallback } from 'react';
import { GameContainer, PlayingCard } from '../ui/game/GamePrimitives';

type Card = { suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'; value: string; power: number; isRed: boolean; isFaceUp: boolean; id: string };

const Solitaire: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "솔리테어 (Solitaire)", desc: "A부터 K까지 정돈해 보세요!", reset: "판 갈기", score: "완료", win: "정돈 완료! 마음도 한결 가볍네요." },
        en: { title: "Solitaire", desc: "Organize from Ace to King!", reset: "Restart", score: "Done", win: "Sorted! Organized mind." }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [deck, setDeck] = useState<Card[]>([]);
    const [tableau, setTableau] = useState<Card[][]>(Array(7).fill([]));
    const [foundation, setFoundation] = useState<Card[][]>(Array(4).fill([]));
    const [waste, setWaste] = useState<Card[]>([]);

    const initGame = useCallback(() => {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const fullDeck: Card[] = [];
        suits.forEach(s => values.forEach((v, i) => fullDeck.push({ 
            suit: s, value: v, power: i + 1, 
            isRed: s === 'hearts' || s === 'diamonds', 
            isFaceUp: false, id: `${s}-${v}-${Math.random()}` 
        })));
        
        // Shuffle
        for (let i = fullDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
        }

        const newTableau: Card[][] = [];
        let cursor = 0;
        for (let i = 0; i < 7; i++) {
            const stack = fullDeck.slice(cursor, cursor + i + 1);
            stack[stack.length - 1].isFaceUp = true;
            newTableau.push(stack);
            cursor += i + 1;
        }

        setTableau(newTableau);
        setDeck(fullDeck.slice(cursor));
        setWaste([]);
        setFoundation(Array(4).fill([]).map(() => []));
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    const drawCard = () => {
        if (deck.length === 0) {
            setDeck([...waste].reverse().map(c => ({ ...c, isFaceUp: false })));
            setWaste([]);
        } else {
            const card = { ...deck[0], isFaceUp: true };
            setWaste([card, ...waste]);
            setDeck(deck.slice(1));
        }
    };

    const tryMoveToFoundation = (card: Card, sourceStack: { type: 'tableau' | 'waste' | 'foundation', index: number }) => {
        const fIdx = ['hearts', 'diamonds', 'clubs', 'spades'].indexOf(card.suit);
        const targetStack = foundation[fIdx];
        
        const canMove = (targetStack.length === 0 && card.power === 1) || 
                        (targetStack.length > 0 && targetStack[targetStack.length - 1].power === card.power - 1);

        if (canMove) {
            const newFoundation = [...foundation];
            newFoundation[fIdx] = [...targetStack, card];
            setFoundation(newFoundation);

            if (sourceStack.type === 'tableau') {
                const newTableau = [...tableau];
                newTableau[sourceStack.index].pop();
                if (newTableau[sourceStack.index].length > 0) {
                    newTableau[sourceStack.index][newTableau[sourceStack.index].length - 1].isFaceUp = true;
                }
                setTableau(newTableau);
            } else if (sourceStack.type === 'waste') {
                setWaste(waste.slice(1));
            }
            return true;
        }
        return false;
    };

    // Simplified gameplay: Click card to move to Foundation or automatically find best Tableau move
    const handleCardClick = (card: Card, stackInfo: { type: 'tableau' | 'waste', index: number }) => {
        if (!card.isFaceUp) return;
        tryMoveToFoundation(card, stackInfo);
    };

    const isWon = foundation.every(f => f.length === 13);

    return (
        <GameContainer title={t.title} subtitle="Order & Focus" onReset={initGame}>
            <div className="space-y-8">
                {/* Top Section */}
                <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                        {/* Deck */}
                        <div onClick={drawCard} className="relative cursor-pointer">
                            <PlayingCard suit="spades" value="" isFaceUp={false} className="opacity-80" />
                            {deck.length > 0 && <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black">{deck.length}</div>}
                        </div>
                        {/* Waste */}
                        <div className="min-w-[80px]">
                            {waste.length > 0 && <PlayingCard suit={waste[0].suit} value={waste[0].value} onClick={() => handleCardClick(waste[0], { type: 'waste', index: 0 })} />}
                        </div>
                    </div>
                    {/* Foundations */}
                    <div className="flex gap-2">
                        {foundation.map((f, i) => (
                            <div key={i} className="w-16 h-24 sm:w-20 sm:h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center relative">
                                <span className={`absolute opacity-20 text-4xl ${i < 2 ? 'text-destructive' : 'text-foreground'}`}>
                                    {['♥', '♦', '♣', '♠'][i]}
                                </span>
                                {f.length > 0 && <PlayingCard suit={f[f.length - 1].suit} value={f[f.length - 1].value} className="absolute inset-0" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tableau */}
                <div className="flex gap-1 sm:gap-4 justify-between min-h-[400px]">
                    {tableau.map((stack, sIdx) => (
                        <div key={sIdx} className="w-16 sm:w-20 relative flex flex-col">
                            {stack.length === 0 && <div className="w-full h-24 sm:h-32 rounded-xl border border-dashed border-border/40" />}
                            {stack.map((c, cIdx) => (
                                <div 
                                    key={c.id} 
                                    style={{ marginTop: cIdx === 0 ? 0 : -80 }}
                                    className="transition-transform hover:-translate-y-2"
                                >
                                    <PlayingCard 
                                        suit={c.suit} 
                                        value={c.value} 
                                        isFaceUp={c.isFaceUp} 
                                        onClick={() => handleCardClick(c, { type: 'tableau', index: sIdx })} 
                                        className="shadow-md border border-border"
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {isWon && (
                <div className="absolute inset-0 z-30 bg-background/90 backdrop-blur-xl rounded-4xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                    <div className="text-6xl mb-6">🏆</div>
                    <h4 className="text-4xl font-black text-primary mb-4">{t.win}</h4>
                    <button onClick={initGame} className="px-12 py-4 bg-primary text-primary-foreground rounded-full font-black shadow-lg uppercase tracking-widest">{t.reset}</button>
                </div>
            )}
        </GameContainer>
    );
};

export default Solitaire;
