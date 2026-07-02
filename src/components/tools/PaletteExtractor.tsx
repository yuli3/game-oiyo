import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const PaletteExtractor: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "색상 팔레트 추출기", upload: "이미지 업로드", desc: "이미지에서 추출한 자연스러운 색 조합은 디자인의 가장 훌륭한 참고서가 됩니다.", hex: "HEX 복사" },
        en: { title: "Color Palette Extractor", upload: "Upload Image", desc: "Discover natural color combinations from your photos.", hex: "Copy HEX" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [image, setImage] = useState<string | null>(null);
    const [palette, setPalette] = useState<string[]>([]);
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setImage(event.target?.result as string);
                    extractColors(img);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const extractColors = (img: HTMLImageElement) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 50; // Downscale for faster processing
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = ctx.getImageData(0, 0, 50, 50).data;
        const colorCounts: Record<string, number> = {};

        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i], g = imageData[i+1], b = imageData[i+2];
            // Quantize colors slightly
            const qr = Math.round(r / 16) * 16;
            const qg = Math.round(g / 16) * 16;
            const qb = Math.round(b / 16) * 16;
            const hex = `#${((1 << 24) + (qr << 16) + (qg << 8) + qb).toString(16).slice(1)}`;
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }

        const sortedColors = Object.entries(colorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(entry => entry[0]);

        setPalette(sortedColors);
    };

    const copyToClipboard = (hex: string) => {
        navigator.clipboard.writeText(hex);
        alert(`${hex} copied!`);
    };

    return (
        <GameContainer title={t.title} subtitle="Nature's Color Theory" onReset={() => { setImage(null); setPalette([]); }}>
            <div className="flex flex-col items-center gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">{t.desc}</p>
                
                <div className="flex flex-col lg:flex-row gap-10 w-full items-center lg:items-start text-center">
                    <div className="w-full lg:w-1/2 aspect-square bg-muted/30 rounded-3xl border-4 border-dashed border-muted flex flex-col items-center justify-center overflow-hidden relative">
                        {image ? (
                            <img src={image} alt="Uploaded" className="w-full h-full object-cover" />
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center gap-4">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-3xl">🎨</div>
                                <span className="text-xs font-black text-primary uppercase tracking-widest">{t.upload}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            </label>
                        )}
                    </div>

                    <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 gap-6">
                        {palette.length > 0 ? palette.map((hex, i) => (
                            <div key={i} className="flex flex-col items-center gap-3 animate-in zoom-in-95" style={{ animationDelay: `${i * 100}ms` }}>
                                <div 
                                    style={{ backgroundColor: hex }}
                                    className="w-full aspect-square rounded-2xl shadow-lg border border-border/50"
                                />
                                <button 
                                    onClick={() => copyToClipboard(hex)}
                                    className="px-2 py-1 bg-muted rounded-md text-[10px] font-black text-muted-foreground uppercase hover:bg-primary hover:text-white transition-colors"
                                >
                                    {hex}
                                </button>
                            </div>
                        )) : (
                            Array(6).fill(0).map((_, i) => (
                                <div key={i} className="aspect-square bg-muted/40 rounded-2xl border border-dashed border-border" />
                            ))
                        )}
                    </div>
                </div>

                {image && (
                    <label className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-black cursor-pointer shadow-lg">
                        {t.upload}
                        <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                    </label>
                )}
            </div>
        </GameContainer>
    );
};

export default PaletteExtractor;
