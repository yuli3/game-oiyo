import React from 'react';
import { PLAYING_CARD_SPRITES } from '../../../lib/games/sprites';

interface PlayingCardProps {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string | number;
  isFaceUp?: boolean;
  onClick?: () => void;
  className?: string;
}

function SuitPip({ suit, className }: { suit: PlayingCardProps['suit']; className: string }) {
  return <img src={PLAYING_CARD_SPRITES[suit]} alt="" draggable={false} className={`pointer-events-none object-contain ${className}`} />;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({ suit, value, isFaceUp = true, onClick, className = '' }) => {
  const isRed = suit === 'hearts' || suit === 'diamonds';

  // `shrink-0` is load-bearing: these sit in flex rows (hands, tableau piles),
  // and without it the card was squeezed 64px -> 46px on a 375px viewport while
  // the glyphs kept their size, which is what pushed text outside the card.
  const frame = 'shrink-0 w-16 h-24 sm:w-20 sm:h-32 rounded-xl';

  if (!isFaceUp) {
    return (
      <div
        onClick={onClick}
        className={`${frame} overflow-hidden cursor-pointer hover:scale-105 transition-transform ${className}`}
      >
        <img src={PLAYING_CARD_SPRITES.back} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover" />
      </div>
    );
  }

  // Type scale is budgeted against the card box, not chosen by eye. Mobile:
  // 96px tall - 4px border - 12px padding = 80px for three rows, and the rows
  // below total 76px (26 + 24 + 26) with leading-none forced everywhere.
  // Before this, the rows summed to 140px inside a 92px box — a 48px overflow.
  return (
    <div
      onClick={onClick}
      className={`relative ${frame} overflow-hidden shadow-sm flex flex-col justify-between p-1.5 sm:p-2 cursor-pointer hover:-translate-y-1 transition-all ${isRed ? 'text-destructive' : 'text-foreground'} ${className}`}
    >
      <img src={PLAYING_CARD_SPRITES.face} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      <div className="relative z-[1] flex flex-col items-start leading-none">
        <span className="text-base sm:text-xl font-black leading-none">{value}</span>
        <SuitPip suit={suit} className="mt-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3" />
      </div>

      <div className="relative z-[1] flex justify-center items-center">
        <SuitPip suit={suit} className="h-7 w-7 sm:h-9 sm:w-9" />
      </div>

      <div className="relative z-[1] flex flex-col items-end leading-none rotate-180">
        <span className="text-base sm:text-xl font-black leading-none">{value}</span>
        <SuitPip suit={suit} className="mt-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3" />
      </div>
    </div>
  );
};

// ─── Die: shared dice component (real pips for D6, polygon for polyhedral) ───
export type DieType = 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20';

// D6 pip layout on a 3×3 grid (col,row), 0..2
const D6_PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

// Polyhedral outline (SVG polygon points in a 100×100 box)
const POLY: Record<Exclude<DieType, 'D6'>, string> = {
  D4: '50,6 94,88 6,88',
  D8: '50,4 92,50 50,96 8,50',
  D10: '50,4 90,38 74,92 26,92 10,38',
  D12: '50,3 79,15 95,44 85,77 50,95 15,77 5,44 21,15',
  D20: '50,3 88,25 88,68 50,92 12,68 12,25',
};

const DIE_HUE: Record<DieType, string> = {
  D4: '#ef4444', D6: '#1e293b', D8: '#f59e0b', D10: '#10b981', D12: '#6366f1', D20: '#a855f7',
};

export const Die: React.FC<{ type: DieType; value?: number | null; rolling?: boolean; size?: number; onClick?: () => void; className?: string }> = ({ type, value, rolling = false, size = 56, onClick, className = '' }) => {
  const shown = value ?? (type === 'D6' ? 1 : 20);
  const roll = rolling ? 'animate-dice-roll' : '';
  const common = `inline-flex items-center justify-center select-none ${onClick ? 'cursor-pointer' : ''} ${roll} ${className}`;

  if (type === 'D6') {
    const pips = D6_PIPS[Math.min(6, Math.max(1, shown))] ?? D6_PIPS[1];
    return (
      <span onClick={onClick} className={common} style={{ width: size, height: size }} role="img" aria-label={`D6: ${shown}`}>
        <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-md">
          <defs>
            <linearGradient id="d6g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="88" height="88" rx="18" fill="url(#d6g)" stroke="#cbd5e1" strokeWidth="2" />
          {pips.map(([c, r], i) => (
            <circle key={i} cx={26 + c * 24} cy={26 + r * 24} r="8" fill="#1e293b" />
          ))}
        </svg>
      </span>
    );
  }

  const hue = DIE_HUE[type];
  return (
    <span onClick={onClick} className={common} style={{ width: size, height: size }} role="img" aria-label={`${type}: ${shown}`}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-md">
        <polygon points={POLY[type]} fill={hue} stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinejoin="round" />
        <text x="50" y="56" textAnchor="middle" dominantBaseline="middle" fontSize="34" fontWeight="900" fill="#ffffff">{shown}</text>
      </svg>
    </span>
  );
};

export const GameContainer: React.FC<{ title: string; subtitle?: string; resetLabel?: string; onReset?: () => void; children: React.ReactNode }> = ({ title, subtitle, resetLabel = 'RESET', onReset, children }) => {
    return (
        <div className="not-prose my-12 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-2xl font-black text-foreground">{title}</h3>
                    {subtitle && <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">{subtitle}</p>}
                </div>
                {onReset && (
                    <button onClick={onReset} className="min-h-11 px-4 py-2 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 bg-muted hover:bg-accent text-accent-foreground rounded-xl text-xs font-bold transition-all border border-border">
                        {resetLabel}
                    </button>
                )}
            </div>
            {children}
        </div>
    );
};
