import React, { useState, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const DogVisionSimulator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "강아지가 보는 세상", upload: "이미지 업로드", desc: "반려견이 인지하는 색상 스펙트럼(이색형 색각)으로 세상을 재구성합니다.", compare: "원본과 비교", original: "원본", dog: "강아지 시선" },
        en: { title: "Dog Vision Simulator", upload: "Upload Image", desc: "Reconstruct the world through a dog's color spectrum (Dichromacy).", compare: "Compare", original: "Original", dog: "Dog's View" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [image, setImage] = useState<string | null>(null);
    const [isOriginal, setIsOriginal] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setImage(event.target?.result as string);
                    applyDogVision(img);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const applyDogVision = (img: HTMLImageElement) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Simplified Dichromacy Matrix for Dogs (similar to Protanopia)
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            
            // Dog vision transform (Approximate)
            data[i] = 0.625 * r + 0.375 * g; // R'
            data[i+1] = 0.7 * r + 0.3 * g;  // G'
            data[i+2] = 0.3 * g + 0.7 * b;  // B'
        }

        ctx.putImageData(imageData, 0, 0);
    };

    return (
        <GameContainer title={t.title} subtitle="Perspective Shift" onReset={() => setImage(null)}>
            <div className="flex flex-col items-center gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">{t.desc}</p>
                
                <div className="w-full aspect-video bg-muted/40 rounded-3xl border-4 border-dashed border-muted flex flex-col items-center justify-center overflow-hidden relative group">
                    {image ? (
                        <>
                            {isOriginal ? (
                                <img src={image} className="max-w-full max-h-full object-contain" alt="Original" />
                            ) : (
                                <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
                            )}
                            <div className="absolute top-4 right-4 bg-background/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">
                                {isOriginal ? t.original : t.dog}
                            </div>
                        </>
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-4">
                            <div className="p-6 bg-primary/10 rounded-full text-4xl">🐶</div>
                            <span className="text-xs font-black text-primary uppercase tracking-widest">{t.upload}</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        </label>
                    )}
                </div>

                {image && (
                    <div className="flex gap-4">
                        <button 
                            onMouseDown={() => setIsOriginal(true)}
                            onMouseUp={() => setIsOriginal(false)}
                            onTouchStart={() => setIsOriginal(true)}
                            onTouchEnd={() => setIsOriginal(false)}
                            className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-black shadow-lg active:scale-95 transition-all select-none"
                        >
                            {t.compare}
                        </button>
                        <label className="px-10 py-3 bg-muted text-foreground rounded-full font-black cursor-pointer shadow-sm border border-border">
                            {t.upload}
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        </label>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default DogVisionSimulator;
