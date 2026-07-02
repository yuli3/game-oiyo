import React, { useState, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const ImageDegrader: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "이미지 열화기 (빈티지 짤방)", upload: "이미지 업로드", download: "저장하기", desc: "이미지를 의도적으로 손상시켜 20년 된 인터넷 짤방 같은 노스탤지어를 연출합니다.", intensity: "열화 강도" },
        en: { title: "Image Degrader (Retro Meme)", upload: "Upload Image", download: "Save", desc: "Intentionally degrade images to create that 20-year-old internet meme aesthetic.", intensity: "Degrade Intensity" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [image, setImage] = useState<string | null>(null);
    const [intensity, setIntensity] = useState(50);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setImage(event.target?.result as string);
                    applyDegradation(img, intensity);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const applyDegradation = (img: HTMLImageElement, level: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;

        // Step 1: Draw original
        ctx.drawImage(img, 0, 0);

        // Step 2: Recursive JPEG compression simulation
        // The "meme" look comes from low quality re-saving
        const quality = 1 - (level / 100);
        let dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.01, quality));
        
        const lowResImg = new Image();
        lowResImg.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Add a bit of noise or blur if intensity is high
            ctx.filter = `contrast(${100 + level/2}%) brightness(${100 + level/5}%) blur(${level/100}px)`;
            ctx.drawImage(lowResImg, 0, 0);
            ctx.filter = 'none';
        };
        lowResImg.src = dataUrl;
    };

    const download = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = 'classic-meme.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.1);
        link.click();
    };

    return (
        <GameContainer title={t.title} subtitle="Internet Archaeology" onReset={() => setImage(null)}>
            <div className="flex flex-col items-center gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">{t.desc}</p>
                
                <div className="w-full aspect-video bg-warning/10 rounded-3xl border-4 border-dashed border-warning/30 flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
                    {image ? (
                        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain pixelated" style={{ imageRendering: 'pixelated' }} />
                    ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-4 group">
                            <div className="text-6xl group-hover:rotate-12 transition-transform">💾</div>
                            <span className="text-xs font-black text-warning/60 uppercase tracking-widest">{t.upload}</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        </label>
                    )}
                </div>

                {image && (
                    <div className="w-full space-y-6">
                        <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-2xl border border-border">
                            <span className="text-[10px] font-black text-muted-foreground uppercase">{t.intensity}</span>
                            <input 
                                type="range" min="0" max="100" value={intensity} 
                                onChange={(e) => {
                                    setIntensity(Number(e.target.value));
                                    const img = new Image();
                                    img.onload = () => applyDegradation(img, Number(e.target.value));
                                    img.src = image;
                                }} 
                                className="flex-1" 
                            />
                            <span className="text-xs font-black text-primary">{intensity}%</span>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={download} className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-lg">SAVE AS JPEG</button>
                            <label className="px-8 py-4 bg-muted text-foreground rounded-2xl font-black cursor-pointer border border-border shadow-sm">
                                {t.upload}
                                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default ImageDegrader;
