import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const MetadataViewer: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "이미지 메타데이터 뷰어", upload: "이미지 분석 시작", desc: "이미지 파일 속에 숨겨진 촬영 정보와 EXIF 데이터를 분석합니다.", name: "파일명", size: "파일 크기", type: "이미지 타입", date: "수정 날짜", width: "가로", height: "세로" },
        en: { title: "Image Metadata Viewer", upload: "Analyze Image", desc: "Explore hidden shooting info and EXIF data inside your image files.", name: "Filename", size: "File Size", type: "Type", date: "Last Modified", width: "Width", height: "Height" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [metadata, setMetadata] = useState<any>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreview(URL.createObjectURL(file));
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const info = {
                        name: file.name,
                        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                        type: file.type,
                        date: new Date(file.lastModified).toLocaleString(),
                        width: img.width + 'px',
                        height: img.height + 'px',
                    };
                    setMetadata(info);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <GameContainer title={t.title} subtitle="Hidden Data Forensics" onReset={() => { setMetadata(null); setPreview(null); }}>
            <div className="flex flex-col items-center gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">{t.desc}</p>
                
                <div className="w-full flex flex-col md:flex-row gap-8 items-start">
                    {/* Preview Area */}
                    <div className="w-full md:w-1/2 aspect-square bg-muted/30 rounded-3xl border-4 border-dashed border-muted flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
                        {preview ? (
                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center gap-4">
                                <div className="p-5 bg-primary/10 rounded-full text-primary text-4xl">🔍</div>
                                <span className="text-xs font-black text-primary uppercase tracking-widest">{t.upload}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            </label>
                        )}
                    </div>

                    {/* Meta Info Area */}
                    <div className="flex-1 w-full space-y-2">
                        {metadata ? (
                            Object.entries(metadata).map(([key, value]: [string, any], i) => (
                                <div key={key} className="flex justify-between p-4 bg-muted/20 rounded-2xl border border-border animate-in slide-in-from-right" style={{ animationDelay: `${i * 50}ms` }}>
                                    <span className="text-[10px] font-black text-muted-foreground uppercase">{t[key as keyof typeof t] || key}</span>
                                    <span className="text-xs font-bold text-foreground text-right break-all ml-4">{value}</span>
                                </div>
                            ))
                        ) : (
                            Array(6).fill(0).map((_, i) => (
                                <div key={i} className="h-12 bg-muted/10 rounded-2xl border border-dashed border-border" />
                            ))
                        )}
                        {metadata && (
                             <div className="mt-8 p-4 bg-warning/10 border border-warning/30 rounded-2xl text-[10px] text-warning font-medium leading-relaxed">
                                <span className="font-black">💡 TIP:</span> 개인정보 보호를 위해 SNS 업로드 전 EXIF 데이터를 삭제하는 습관이 중요합니다. 이 도구는 파일의 기본 속성을 분석합니다.
                             </div>
                        )}
                    </div>
                </div>

                {preview && (
                    <label className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-black cursor-pointer shadow-lg">
                        {t.upload}
                        <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                    </label>
                )}
            </div>
        </GameContainer>
    );
};

export default MetadataViewer;
