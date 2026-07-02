import React, { useState, useEffect, useCallback } from 'react';
import { GameContainer, PlayingCard } from '../ui/game/GamePrimitives';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

type Card = { suit: typeof SUITS[number]; value: string; power: number };

const HeartsGame: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "하트 (Hearts)", desc: "하트와 스페이드 퀸을 피하세요!", player: "나", cpu: "경쟁자", score: "벌점", reset: "다시 시작", win: "최고! 리스크를 피했습니다.", lost: "아뿔싸! 벌점이 많네요." },
        en: { title: "Hearts Card Game", desc: "Avoid Hearts and the Queen of Spades!", player: "You", cpu: "CPUs", score: "Penalty", reset: "Restart", win: "Great! Risk avoided.", lost: "Oops! High penalty." }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [deck, setDeck] = useState<Card[]>([]);
    const [hand, setHand] = useState<Card[]>([]);
    const [played, setPlayed] = useState<(Card | null)[]>([]); // Table state
    const [penalty, setPenalty] = useState(0);
    const [round, setRound] = useState(0);

    const initGame = useCallback(() => {
        const fullDeck: Card[] = [];
        SUITS.forEach(s => VALUES.forEach((v, i) => fullDeck.push({ suit: s, value: v, power: i })));
        
        // Shuffle
        for (let i = fullDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
        }

        setDeck(fullDeck.slice(13)); // Remaining for CPUs (simplified)
        setHand(fullDeck.slice(0, 13).sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.power - b.power));
        setPlayed([]);
        setPenalty(0);
        setRound(1);
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    const playCard = (card: Card) => {
        if (played.length > 0) return; // Prevent double play

        // Simulation: Player plays, 3 CPUs play random higher/lower cards
        const table: Card[] = [card];
        for (let i = 0; i < 3; i++) {
            table.push(deck[Math.floor(Math.random() * deck.length)]);
        }

        setPlayed(table);

        // Calculate Penalty for this trick
        let pScore = 0;
        table.forEach(c => {
            if (c.suit === 'hearts') pScore += 1;
            if (c.suit === 'spades' && c.value === 'Q') pScore += 13;
        });

        // Simplified: If you played the highest card of the led suit, you take the penalty
        // In real Hearts, it's more complex, but for a blog demo, this is enough.
        const highestOfLed = [...table].sort((a, b) => b.power - a.power)[0];
        if (highestOfLed === table[0]) {
            setPenalty(prev => prev + pScore);
        }

        setHand(prev => prev.filter(c => c !== card));
        
        setTimeout(() => {
            setPlayed([]);
            setRound(prev => prev + 1);
        }, 2000);
    };

    return (
        <GameContainer title={t.title} subtitle="Risk Distribution" onReset={initGame}>
            <div className="flex justify-between items-center mb-10">
                <p className="text-sm font-medium text-muted-foreground">{t.desc}</p>
                <div className="px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-2xl">
                    <span className="text-xs font-black text-destructive uppercase">{t.score}: {penalty}</span>
                </div>
            </div>

            {/* Table Area */}
            <div className="h-64 bg-chart-1/20 rounded-3xl border border-dashed border-chart-1/30 relative flex items-center justify-center gap-4 mb-10 overflow-hidden">
                {played.length > 0 ? (
                    played.map((c, i) => (
                        <div key={i} className={`animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[${i*100}ms]`}>
                            {c && <PlayingCard suit={c.suit} value={c.value} className={i !== 0 ? 'scale-75 opacity-70' : ''} />}
                        </div>
                    ))
                ) : (
                    <div className="text-center text-chart-1/40">
                        <div className="text-4xl mb-2">♠️</div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Select a card to play</p>
                    </div>
                )}
            </div>

            {/* Hand Area */}
            <div className="relative">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-4 text-center tracking-[0.3em]">Your Hand ({14 - round} cards left)</p>
                <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
                    {hand.map((c, i) => (
                        <PlayingCard 
                            key={i} 
                            suit={c.suit} 
                            value={c.value} 
                            onClick={() => playCard(c)}
                            className="hover:scale-110 active:scale-95 origin-bottom transition-all"
                        />
                    ))}
                </div>
            </div>

            {round > 13 && (
                <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-md rounded-4xl flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in-95">
                    <h4 className={`text-4xl font-black mb-4 ${penalty < 10 ? 'text-primary' : 'text-destructive'}`}>
                        {penalty < 10 ? t.win : t.lost}
                    </h4>
                    <p className="text-lg font-bold text-muted-foreground mb-8 italic">Total Penalty: {penalty}</p>
                    <button onClick={initGame} className="px-12 py-4 bg-primary text-primary-foreground rounded-full font-black shadow-lg">
                        {t.reset}
                    </button>
                </div>
            )}
        </GameContainer>
    );
};

export default HeartsGame;
