import React, { useState, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const ImageCropper: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "이미지 비율 크로퍼", upload: "이미지 업로드", download: "크롭 및 다운로드", desc: "표준 화면비(3:2, 16:9, 1:1)에 맞춰 이미지를 정교하게 잘라냅니다.", ratio: "비율 선택" },
        en: { title: "Image Cropper", upload: "Upload Image", download: "Crop & Download", desc: "Crop images to standard aspect ratios like 3:2, 16:9, and 1:1.", ratio: "Select Ratio" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [image, setImage] = useState<string | null>(null);
    const [ratio, setRatio] = useState<number>(1.5); // 3:2
    const [cropPos, setCropPos] = useState({ x: 50, y: 50 }); // Percentage
    const imgRef = useRef<HTMLImageElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setImage(URL.createObjectURL(file));
    };

    const downloadCrop = () => {
        const img = imgRef.current;
        if (!img) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let targetWidth, targetHeight;
        if (img.naturalWidth / img.naturalHeight > ratio) {
            targetHeight = img.naturalHeight;
            targetWidth = targetHeight * ratio;
        } else {
            targetWidth = img.naturalWidth;
            targetHeight = targetWidth / ratio;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const startX = (img.naturalWidth - targetWidth) * (cropPos.x / 100);
        const startY = (img.naturalHeight - targetHeight) * (cropPos.y / 100);

        ctx.drawImage(img, startX, startY, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
        
        const link = document.createElement('a');
        link.download = `cropped-${ratio.toFixed(2)}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    return (
        <GameContainer title={t.title} subtitle="Framing Perfection" onReset={() => setImage(null)}>
            <div className="flex flex-col items-center gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">{t.desc}</p>
                
                <div className="w-full flex flex-col md:flex-row gap-8">
                    {/* Preview Area */}
                    <div className="flex-1 aspect-square bg-muted/30 rounded-3xl border-4 border-dashed border-muted flex flex-col items-center justify-center overflow-hidden relative shadow-inner group">
                        {image ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-muted">
                                <img ref={imgRef} src={image} alt="Original" className="max-w-full max-h-full transition-opacity opacity-40" />
                                {/* Dynamic Crop Box Overlay */}
                                <div 
                                    style={{ 
                                        aspectRatio: ratio,
                                        width: '80%',
                                        maxHeight: '80%',
                                        position: 'absolute',
                                        border: '4px solid white',
                                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                                        zIndex: 10
                                    }}
                                    className="pointer-events-none"
                                >
                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                                        {Array(9).fill(0).map((_, i) => <div key={i} className="border-[0.5px] border-white/30" />)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center gap-4">
                                <div className="p-6 bg-primary/10 rounded-full text-primary text-4xl">📐</div>
                                <span className="text-xs font-black text-primary uppercase tracking-widest">{t.upload}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            </label>
                        )}
                    </div>

                    {/* Controls Card */}
                    {image && (
                        <div className="w-full md:w-64 space-y-6 animate-in slide-in-from-right">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-muted-foreground uppercase">{t.ratio}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: '3:2', val: 1.5 },
                                        { label: '16:9', val: 1.777 },
                                        { label: '1:1', val: 1 },
                                        { label: '4:3', val: 1.333 }
                                    ].map(r => (
                                        <button 
                                            key={r.label}
                                            onClick={() => setRatio(r.val)}
                                            className={`p-3 rounded-xl border-2 font-black text-xs transition-all ${ratio === r.val ? 'bg-primary text-primary-foreground border-primary shadow-lg' : 'bg-muted border-transparent text-muted-foreground'}`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-muted-foreground uppercase">FOCUS POINT</p>
                                <div className="space-y-2">
                                    <input type="range" min="0" max="100" value={cropPos.x} onChange={(e) => setCropPos({...cropPos, x: Number(e.target.value)})} className="w-full" />
                                    <input type="range" min="0" max="100" value={cropPos.y} onChange={(e) => setCropPos({...cropPos, y: Number(e.target.value)})} className="w-full" />
                                </div>
                            </div>

                            <button onClick={downloadCrop} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-lg hover:scale-[1.02] transition-transform">
                                {t.download}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </GameContainer>
    );
};

export default ImageCropper;
