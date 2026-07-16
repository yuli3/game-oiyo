import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer, PlayingCard } from '../ui/game/GamePrimitives';
import {
    dealerShouldHit,
    evaluateBlackjackHand,
    isNaturalBlackjack,
    settleBlackjack,
    shuffleBlackjackDeck,
    type BlackjackCard as Card,
} from '../../lib/games/blackjack';

const Blackjack: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const COPY = {
        ko: { title: "블랙잭 (Blackjack)", hit: "카드 받기(Hit)", stand: "멈추기(Stand)", reset: "새 게임", score: "합계", bust: "버스트! (21 초과)", win: "승리!", lost: "패배!", push: "무승부", dealer: "딜러", player: "나" },
        en: { title: "Blackjack", hit: "Hit", stand: "Stand", reset: "New Game", score: "Score", bust: "Bust!", win: "You Win!", lost: "You Lost!", push: "Push", dealer: "Dealer", player: "You" },
        ja: { title: "ブラックジャック", hit: "ヒット", stand: "スタンド", reset: "新しいゲーム", score: "合計", bust: "バースト！(21超過)", win: "勝利！", lost: "敗北！", push: "引き分け", dealer: "ディーラー", player: "あなた" },
        zh: { title: "二十一点", hit: "要牌", stand: "停牌", reset: "新游戏", score: "点数", bust: "爆牌！(超过21)", win: "你赢了！", lost: "你输了！", push: "平局", dealer: "庄家", player: "你" },
        fr: { title: "Blackjack", hit: "Tirer", stand: "Rester", reset: "Nouvelle partie", score: "Total", bust: "Brûlé ! (plus de 21)", win: "Gagné !", lost: "Perdu !", push: "Égalité", dealer: "Croupier", player: "Vous" },
        es: { title: "Blackjack", hit: "Pedir", stand: "Plantarse", reset: "Nueva partida", score: "Total", bust: "¡Te pasaste! (más de 21)", win: "¡Ganaste!", lost: "¡Perdiste!", push: "Empate", dealer: "Crupier", player: "Tú" }
    };
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;

    const [deck, setDeck] = useState<Card[]>([]);
    const [playerHand, setPlayerHand] = useState<Card[]>([]);
    const [dealerHand, setDealerHand] = useState<Card[]>([]);
    const [status, setStatus] = useState<'betting' | 'playing' | 'dealerTurn' | 'result'>('betting');
    const [message, setMessage] = useState('');
    const gameGeneration = useRef(0);

    const createDeck = () => {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const newDeck: Card[] = [];
        suits.forEach(s => values.forEach((v, i) => newDeck.push({ suit: s, value: v, power: i === 0 ? 11 : (i >= 9 ? 10 : i + 1) })));
        return shuffleBlackjackDeck(newDeck);
    };

    const calculateScore = (hand: Card[]) => evaluateBlackjackHand(hand).total;

    const initGame = useCallback(() => {
        gameGeneration.current += 1;
        const newDeck = createDeck();
        const nextPlayer = [newDeck[0], newDeck[1]];
        const nextDealer = [newDeck[2], newDeck[3]];
        setPlayerHand(nextPlayer);
        setDealerHand(nextDealer);
        setDeck(newDeck.slice(4));
        if (isNaturalBlackjack(nextPlayer) || isNaturalBlackjack(nextDealer)) {
            setStatus('result');
            setMessage(settleBlackjack(nextPlayer, nextDealer));
        } else {
            setStatus('playing');
            setMessage('');
        }
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    const hit = () => {
        if (status !== 'playing') return;
        const newCard = deck[0];
        const newHand = [...playerHand, newCard];
        setPlayerHand(newHand);
        setDeck(deck.slice(1));
        
        if (calculateScore(newHand) > 21) {
            setStatus('result');
            setMessage('lost');
        }
    };

    const stand = () => {
        if (status !== 'playing') return;
        setStatus('dealerTurn');
    };

    useEffect(() => {
        if (status !== 'dealerTurn') return;

        const generation = gameGeneration.current;
        let currentDealerHand = [...dealerHand];
        let currentDeck = [...deck];
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let cancelled = false;

        const isCurrentGame = () => !cancelled && gameGeneration.current === generation;
        const playDealer = () => {
            if (!isCurrentGame()) return;
            if (dealerShouldHit(currentDealerHand) && currentDeck.length > 0) {
                currentDealerHand = [...currentDealerHand, currentDeck[0]];
                currentDeck = currentDeck.slice(1);
                setDealerHand(currentDealerHand);
                setDeck(currentDeck);
                timeoutId = setTimeout(playDealer, 600);
                return;
            }

            setMessage(settleBlackjack(playerHand, currentDealerHand));
            setStatus('result');
        };

        playDealer();
        return () => {
            cancelled = true;
            if (timeoutId !== undefined) clearTimeout(timeoutId);
        };
    }, [status]);

    return (
        <GameContainer title={t.title} subtitle="Probability & Risk" onReset={initGame}>
            <div className="space-y-12">
                {/* Dealer Area */}
                <div className="text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">{t.dealer} {status === 'result' ? `(${calculateScore(dealerHand)})` : ''}</p>
                    <div className="flex justify-center -space-x-8">
                        {dealerHand.map((c, i) => (
                            <PlayingCard 
                                key={i} 
                                suit={c.suit} 
                                value={c.value} 
                                isFaceUp={i === 0 || status === 'result' || status === 'dealerTurn'} 
                                className="shadow-lg border-2 border-primary/20"
                            />
                        ))}
                    </div>
                </div>

                {/* Info Display */}
                <div className="h-12 flex items-center justify-center">
                    {message && (
                        <div className={`px-8 py-2 rounded-full font-black text-lg shadow-sm animate-in zoom-in-95 ${message === 'win' ? 'bg-primary text-primary-foreground' : message === 'lost' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {t[message as keyof typeof t]}
                        </div>
                    )}
                </div>

                {/* Player Area */}
                <div className="text-center">
                    <div className="flex justify-center -space-x-8 mb-4">
                        {playerHand.map((c, i) => (
                            <PlayingCard 
                                key={i} 
                                suit={c.suit} 
                                value={c.value} 
                                className="shadow-lg border-2 border-primary"
                            />
                        ))}
                    </div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">{t.player} ({calculateScore(playerHand)})</p>
                    
                    <div className="flex justify-center gap-4">
                        {status === 'playing' ? (
                            <>
                                <button onClick={hit} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-black shadow-lg hover:opacity-90">{t.hit}</button>
                                <button onClick={stand} className="px-10 py-3 bg-muted text-foreground rounded-full font-black shadow-sm border border-border">{t.stand}</button>
                            </>
                        ) : (
                            <button onClick={initGame} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-black shadow-lg">{t.reset}</button>
                        )}
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default Blackjack;
