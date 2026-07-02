import React from 'react';

interface PlayingCardProps {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string | number;
  isFaceUp?: boolean;
  onClick?: () => void;
  className?: string;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({ suit, value, isFaceUp = true, onClick, className = '' }) => {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const suitIcons = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };

  if (!isFaceUp) {
    return (
      <div 
        onClick={onClick}
        className={`w-16 h-24 sm:w-20 sm:h-32 bg-primary/20 border-2 border-primary/40 rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform ${className}`}
      >
        <div className="w-12 h-20 sm:w-14 sm:h-24 border border-primary/20 rounded-lg flex items-center justify-center">
            <span className="text-primary/40 font-black text-2xl">OIYO</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`relative w-16 h-24 sm:w-20 sm:h-32 bg-card border-2 border-border rounded-xl shadow-sm flex flex-col justify-between p-2 cursor-pointer hover:border-primary hover:-translate-y-1 transition-all ${isRed ? 'text-destructive' : 'text-foreground'} ${className}`}
    >
      <div className="flex flex-col items-start leading-none">
        <span className="text-lg sm:text-xl font-black">{value}</span>
        <span className="text-sm">{suitIcons[suit]}</span>
      </div>
      
      <div className="flex justify-center items-center">
        <span className="text-3xl sm:text-4xl">{suitIcons[suit]}</span>
      </div>
      
      <div className="flex flex-col items-end leading-none rotate-180">
        <span className="text-lg sm:text-xl font-black">{value}</span>
        <span className="text-sm">{suitIcons[suit]}</span>
      </div>
    </div>
  );
};

export const GameContainer: React.FC<{ title: string; subtitle?: string; onReset?: () => void; children: React.ReactNode }> = ({ title, subtitle, onReset, children }) => {
    return (
        <div className="not-prose my-12 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-2xl font-black text-foreground">{title}</h3>
                    {subtitle && <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">{subtitle}</p>}
                </div>
                {onReset && (
                    <button onClick={onReset} className="px-4 py-2 bg-muted hover:bg-accent text-accent-foreground rounded-xl text-xs font-bold transition-all border border-border">
                        RESET
                    </button>
                )}
            </div>
            {children}
        </div>
    );
};
