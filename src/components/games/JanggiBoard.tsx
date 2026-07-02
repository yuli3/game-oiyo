import React, { useState } from 'react';

// Simplified Janggi Board Initial State (Cho/Han)
const INITIAL_JANGGI = [
  ['r', 'n', 'b', null, 'k', null, 'b', 'n', 'r'],
  [null, null, null, null, null, null, null, null, null],
  [null, 'p', null, null, null, null, null, 'p', null],
  ['s', null, 's', null, 's', null, 's', null, 's'],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  ['S', null, 'S', null, 'S', null, 'S', null, 'S'],
  [null, 'P', null, null, null, null, null, 'P', null],
  [null, null, null, null, null, null, null, null, null],
  ['R', 'N', 'B', null, 'K', null, 'B', 'N', 'R']
];

const JanggiBoard: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "한국의 전략: 장기", turn: "차례", han: "한(漢)", cho: "초(楚)", reset: "판 갈기" },
        en: { title: "Korean Chess: Janggi", turn: "Turn", han: "Han", cho: "Cho", reset: "Reset" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [board, setBoard] = useState(INITIAL_JANGGI);
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [isChoTurn, setIsChoTurn] = useState(true);

    const pieceIcons: Record<string, string> = {
        'r': '車', 'n': '馬', 'b': '象', 'p': '包', 'k': '楚', 's': '卒',
        'R': '車', 'N': '馬', 'B': '象', 'P': '包', 'K': '漢', 'S': '兵'
    };

    const handleSquareClick = (r: number, c: number) => {
        const piece = board[r][c];
        
        if (selected) {
            const [sr, sc] = selected;
            if (sr === r && sc === c) { setSelected(null); return; }
            
            const newBoard = board.map(row => [...row]);
            newBoard[r][c] = newBoard[sr][sc];
            newBoard[sr][sc] = null;
            setBoard(newBoard);
            setSelected(null);
            setIsChoTurn(!isChoTurn);
        } else if (piece) {
            const isCho = piece === piece.toLowerCase();
            if (isCho === isChoTurn) {
                setSelected([r, c]);
            }
        }
    };

    return (
        <div className="not-prose my-12 p-8 bg-[#e8dcc4] border-8 border-[#c4a484] rounded-xl shadow-xl max-w-lg mx-auto overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-black text-stone-800">{t.title}</h3>
                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isChoTurn ? 'text-blue-600' : 'text-red-600'}`}>
                        {isChoTurn ? t.cho : t.han} {t.turn}
                    </p>
                </div>
                <button onClick={() => setBoard(INITIAL_JANGGI)} className="px-4 py-1 bg-stone-800 text-[#e8dcc4] rounded font-bold text-xs uppercase">
                    {t.reset}
                </button>
            </div>

            <div className="relative aspect-[9/10] w-full border-2 border-stone-800 bg-[#f4ebd0]">
                {/* Board Lines (Grid) */}
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-9 pointer-events-none p-[5.5%]">
                    {Array.from({ length: 72 }).map((_, i) => (
                        <div key={i} className="border-r border-b border-stone-800/40" />
                    ))}
                    {/* Palace Lines Simplified */}
                    <div className="absolute top-[10%] left-[33.3%] w-[33.3%] h-[20%] border-2 border-stone-800/20" />
                    <div className="absolute bottom-[10%] left-[33.3%] w-[33.3%] h-[20%] border-2 border-stone-800/20" />
                </div>

                {/* Pieces */}
                <div className="relative grid grid-cols-9 grid-rows-10 w-full h-full">
                    {board.map((row, r) => row.map((piece, c) => (
                        <div 
                            key={`${r}-${c}`} 
                            onClick={() => handleSquareClick(r, c)}
                            className="flex items-center justify-center cursor-pointer p-1"
                        >
                            {piece && (
                                <div className={`w-full aspect-square flex items-center justify-center rounded-full border-2 font-black text-sm sm:text-lg transition-transform ${
                                    selected?.[0] === r && selected?.[1] === c ? 'scale-125 ring-2 ring-primary bg-yellow-100 z-10' : 'bg-[#e8dcc4]'
                                } ${piece === piece.toLowerCase() ? 'text-blue-700 border-blue-700' : 'text-red-700 border-red-700'}`}>
                                    {pieceIcons[piece]}
                                </div>
                            )}
                        </div>
                    )))}
                </div>
            </div>

            <div className="mt-8 flex justify-center gap-8 text-[10px] font-black text-stone-600 uppercase tracking-widest">
                <div className="flex items-center gap-2"><span className="text-blue-600">초(楚)</span> Cho - Blue</div>
                <div className="flex items-center gap-2"><span className="text-red-600">한(漢)</span> Han - Red</div>
            </div>
        </div>
    );
};

export default JanggiBoard;
