import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const AsciiArtGenerator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "아스키 아트 생성기", upload: "이미지 선택", desc: "이미지를 텍스트 캐릭터로 변환하여 디지털 노스탤지어를 연출합니다.", copy: "텍스트 복사" },
        en: { title: "ASCII Art Generator", upload: "Select Image", desc: "Convert images to text characters for a digital nostalgia vibe.", copy: "Copy Text" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [ascii, setAscii] = useState('');
    const [fontSize, setFontSize] = useState(8);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => processAscii(img);
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const processAscii = (img: HTMLImageElement) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = 80; // ASCII width
        const height = (img.height / img.width) * width * 0.5; // Adj for char aspect
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const pixels = ctx.getImageData(0, 0, width, height).data;
        const chars = "@%#*+=-:. ";
        let result = "";

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
                const avg = (r + g + b) / 3;
                const char = chars[Math.floor((avg / 255) * (chars.length - 1))];
                result += char;
            }
            result += "\n";
        }
        setAscii(result);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(ascii);
        alert('ASCII art copied!');
    };

    return (
        <GameContainer title={t.title} subtitle="Digital Nostalgia" onReset={() => setAscii('')}>
            <div className="flex flex-col items-center gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">{t.desc}</p>
                
                <div className="w-full bg-foreground rounded-3xl p-6 shadow-2xl overflow-hidden relative group border-4 border-background/15">
                    {ascii ? (
                        <pre 
                            style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize}px` }} 
                            className="text-background font-mono whitespace-pre overflow-x-auto leading-none tracking-tighter"
                        >
                            {ascii}
                        </pre>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center h-64 gap-4">
                            <div className="text-background/60 text-6xl">#</div>
                            <span className="text-xs font-black text-background/60 uppercase tracking-widest">{t.upload}</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        </label>
                    )}
                </div>

                {ascii && (
                    <div className="flex gap-4 w-full">
                        <div className="flex-1 flex items-center gap-2 p-2 bg-muted rounded-xl">
                            <span className="text-[10px] font-black text-muted-foreground ml-2">SIZE</span>
                            <input type="range" min="4" max="16" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="flex-1" />
                        </div>
                        <button onClick={copyToClipboard} className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-black shadow-lg">{t.copy}</button>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default AsciiArtGenerator;
