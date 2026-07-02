import React, { useState, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const ImageProcessor: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "이미지 압축 및 변환", upload: "이미지 업로드", download: "저장하기", desc: "이미지 용량을 최적화하고 원하는 포맷(WebP, JPEG, PNG)으로 변환합니다.", quality: "압축 품질", format: "변환 포맷", original: "원본", processed: "처리후" },
        en: { title: "Image Optimizer", upload: "Upload Image", download: "Save", desc: "Compress image size and convert between formats (WebP, JPEG, PNG).", quality: "Quality", format: "Format", original: "Original", processed: "Processed" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [image, setImage] = useState<string | null>(null);
    const [quality, setQuality] = useState(80);
    const [format, setFormat] = useState('image/webp');
    const [info, setInfo] = useState({ oldSize: '', newSize: '' });
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setImage(event.target?.result as string);
                    processImage(img, quality, format, file.size);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const processImage = (img: HTMLImageElement, q: number, f: string, oldSize: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const dataUrl = canvas.toDataURL(f, q / 100);
        const newSize = Math.round((dataUrl.length * 3) / 4); // Approx size from base64
        setInfo({ 
            oldSize: (oldSize / 1024).toFixed(1) + ' KB', 
            newSize: (newSize / 1024).toFixed(1) + ' KB' 
        });
    };

    const download = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `optimized-image.${format.split('/')[1]}`;
        link.href = canvas.toDataURL(format, quality / 100);
        link.click();
    };

    return (
        <GameContainer title={t.title} subtitle="Speed & Quality Balance" onReset={() => setImage(null)}>
            <div className="flex flex-col items-center gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">{t.desc}</p>
                
                <div className="w-full flex flex-col md:flex-row gap-8">
                    <div className="flex-1 aspect-square bg-muted/30 rounded-3xl border-4 border-dashed border-muted flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
                        {image ? (
                            <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center gap-4">
                                <div className="p-6 bg-primary/10 rounded-full text-primary text-3xl">📉</div>
                                <span className="text-xs font-black text-primary uppercase tracking-widest">{t.upload}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            </label>
                        )}
                    </div>

                    {image && (
                        <div className="w-full md:w-64 space-y-6 animate-in slide-in-from-right">
                            <div className="space-y-4 p-4 bg-muted/40 rounded-2xl border border-border">
                                <div className="flex justify-between">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase">{t.original}</span>
                                    <span className="text-xs font-bold">{info.oldSize}</span>
                                </div>
                                <div className="flex justify-between text-primary">
                                    <span className="text-[10px] font-black uppercase">{t.processed}</span>
                                    <span className="text-xs font-bold">{info.newSize}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-muted-foreground uppercase">{t.quality}</p>
                                <input type="range" min="1" max="100" value={quality} 
                                    onChange={(e) => {
                                        setQuality(Number(e.target.value));
                                        const img = new Image();
                                        img.onload = () => processImage(img, Number(e.target.value), format, 0); // Logic fix needed for re-calc
                                        img.src = image;
                                    }} 
                                    className="w-full" 
                                />
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-muted-foreground uppercase">{t.format}</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {['image/webp', 'image/jpeg', 'image/png'].map(f => (
                                        <button 
                                            key={f}
                                            onClick={() => setFormat(f)}
                                            className={`py-2 rounded-lg border-2 font-black text-[10px] transition-all ${format === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-transparent text-muted-foreground'}`}
                                        >
                                            {f.split('/')[1].toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={download} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-lg">OPTIMIZE & SAVE</button>
                        </div>
                    )}
                </div>
            </div>
        </GameContainer>
    );
};

export default ImageProcessor;
