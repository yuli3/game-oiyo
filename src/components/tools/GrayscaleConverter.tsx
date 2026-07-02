import React, { useState, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const GrayscaleConverter: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "흑백 이미지 변환기", upload: "이미지 업로드", download: "다운로드", reset: "초기화", desc: "이미지에서 색을 제거하여 본질적인 형태와 대비를 강조합니다." },
        en: { title: "Grayscale Converter", upload: "Upload Image", download: "Download", reset: "Reset", desc: "Remove color to emphasize the essential forms and contrast." }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [image, setImage] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setImage(event.target?.result as string);
                    processGrayscale(img);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const processGrayscale = (img: HTMLImageElement) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            data[i] = avg;     // R
            data[i + 1] = avg; // G
            data[i + 2] = avg; // B
        }

        ctx.putImageData(imageData, 0, 0);
    };

    const download = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = 'grayscale-image.png';
        link.href = canvas.toDataURL();
        link.click();
    };

    return (
        <GameContainer title={t.title} subtitle="Essential Aesthetics" onReset={() => setImage(null)}>
            <div className="flex flex-col items-center gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">{t.desc}</p>
                
                <div className="w-full aspect-video bg-muted/30 rounded-3xl border-4 border-dashed border-muted flex flex-col items-center justify-center overflow-hidden relative group">
                    {image ? (
                        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain shadow-2xl" />
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-4 hover:scale-105 transition-transform">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-3xl">🖼️</div>
                            <span className="text-xs font-black text-primary uppercase tracking-widest">{t.upload}</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        </label>
                    )}
                </div>

                {image && (
                    <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4">
                        <button onClick={download} className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-black shadow-lg hover:opacity-90">{t.download}</button>
                        <label className="px-8 py-3 bg-muted text-foreground rounded-full font-black cursor-pointer border border-border shadow-sm">
                            {t.upload}
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        </label>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default GrayscaleConverter;
