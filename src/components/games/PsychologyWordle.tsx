import React, { useState } from 'react';

const PsychologyWordle: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const isKo = locale === 'ko';
    const targetWord = isKo ? '감정' : 'BRAIN';
    const wordLen = targetWord.length;
    const maxGuesses = 6;

    const [guesses, setGuesses] = useState<string[]>([]);
    const [currentGuess, setCurrentGuess] = useState('');
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

    const t = {
        ko: { title: "심리학 워들", desc: "심리학 관련 단어를 맞춰보세요 (2글자)", won: "천재시군요!", lost: "아쉽네요. 정답은:", playAgain: "다시 하기" },
        en: { title: "Psycho Wordle", desc: "Guess the psychology term (5 letters)", won: "You're a Genius!", lost: "Too bad. The word was:", playAgain: "Play Again" }
    }[isKo ? 'ko' : 'en'];

    const handleInput = (char: string) => {
        if (status !== 'playing') return;
        if (currentGuess.length < wordLen) {
            setCurrentGuess(prev => prev + char);
        }
    };

    const handleBackspace = () => {
        setCurrentGuess(prev => prev.slice(0, -1));
    };

    const handleSubmit = () => {
        if (currentGuess.length !== wordLen) return;
        
        const newGuesses = [...guesses, currentGuess];
        setGuesses(newGuesses);
        setCurrentGuess('');

        if (currentGuess === targetWord) {
            setStatus('won');
        } else if (newGuesses.length >= maxGuesses) {
            setStatus('lost');
        }
    };

    const getKeys = () => {
        if (isKo) return 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ'.split('');
        return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    };

    const getStatusColor = (char: string, index: number, guess: string) => {
        if (guess[index] === targetWord[index]) return 'bg-primary text-primary-foreground border-primary';
        if (targetWord.includes(char)) return 'bg-chart-1 text-foreground border-chart-1';
        return 'bg-muted text-muted-foreground border-muted';
    };

    return (
        <div className="not-prose my-12 p-8 bg-card border border-border rounded-3xl shadow-sm max-w-sm mx-auto">
            <h3 className="text-xl font-black text-center text-foreground mb-2">{t.title}</h3>
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest mb-8">{t.desc}</p>

            <div className="grid gap-2 mb-8">
                {Array.from({ length: maxGuesses }).map((_, i) => {
                    const guess = guesses[i] || (i === guesses.length ? currentGuess : '');
                    const isSubmitted = i < guesses.length;
                    
                    return (
                        <div key={i} className="flex justify-center gap-2">
                            {Array.from({ length: wordLen }).map((_, j) => {
                                const char = guess[j] || '';
                                return (
                                    <div 
                                        key={j} 
                                        className={`w-12 h-12 flex items-center justify-center rounded-xl font-black text-xl border-2 transition-all ${
                                            isSubmitted 
                                                ? getStatusColor(char, j, guess)
                                                : char ? 'border-primary text-foreground' : 'border-muted text-muted-foreground'
                                        }`}
                                    >
                                        {char}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {status === 'playing' ? (
                <div className="flex flex-wrap justify-center gap-1">
                    {getKeys().map(key => (
                        <button 
                            key={key}
                            onClick={() => handleInput(key)}
                            className="px-2 py-2 bg-muted text-foreground rounded-lg text-xs font-bold hover:bg-accent active:scale-90 transition-all border border-border"
                        >
                            {key}
                        </button>
                    ))}
                    <button onClick={handleBackspace} className="px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-bold border border-border">DEL</button>
                    <button onClick={handleSubmit} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold shadow-sm">ENTER</button>
                </div>
            ) : (
                <div className="text-center animate-fade-in">
                    <p className="text-lg font-bold text-foreground mb-4">{status === 'won' ? t.won : `${t.lost} ${targetWord}`}</p>
                    <button 
                        onClick={() => { setGuesses([]); setStatus('playing'); }}
                        className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg"
                    >
                        {t.playAgain}
                    </button>
                </div>
            )}
        </div>
    );
};

export default PsychologyWordle;
