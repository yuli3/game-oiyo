import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const Base64Converter: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "이미지 Base64 변환기", upload: "이미지 선택", desc: "이미지를 텍스트 데이터(Base64)로 변환하여 코드에 직접 삽입할 수 있게 합니다.", copy: "코드 복사", data: "Data URI 형식", raw: "순수 Base64" },
        en: { title: "Image to Base64", upload: "Select Image", desc: "Convert images to Base64 strings to embed them directly in your code.", copy: "Copy Code", data: "Data URI", raw: "Raw Base64" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [base64, setBase64] = useState('');
    const [rawBase64, setRawBase64] = useState('');
    const [preview, setPreview] = useState<string | null>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreview(URL.createObjectURL(file));
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                setBase64(result);
                setRawBase64(result.split(',')[1]);
            };
            reader.readAsDataURL(file);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    return (
        <GameContainer title={t.title} subtitle="Binary to Text Serialization" onReset={() => { setBase64(''); setPreview(null); }}>
            <div className="flex flex-col items-center gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">{t.desc}</p>
                
                <div className="w-full flex flex-col lg:flex-row gap-8 items-start">
                    <div className="w-full lg:w-48 aspect-square bg-muted/30 rounded-3xl border-4 border-dashed border-muted flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
                        {preview ? (
                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center gap-4">
                                <div className="p-4 bg-primary/10 rounded-full text-primary text-2xl">🧬</div>
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{t.upload}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            </label>
                        )}
                    </div>

                    <div className="flex-1 w-full space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-muted-foreground uppercase">{t.data}</span>
                                <button onClick={() => copyToClipboard(base64)} className="text-[10px] font-black text-primary hover:underline">{t.copy}</button>
                            </div>
                            <textarea 
                                readOnly 
                                value={base64} 
                                className="w-full h-24 bg-muted/20 p-3 rounded-xl border border-border text-[10px] font-mono break-all outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-muted-foreground uppercase">{t.raw}</span>
                                <button onClick={() => copyToClipboard(rawBase64)} className="text-[10px] font-black text-primary hover:underline">{t.copy}</button>
                            </div>
                            <textarea 
                                readOnly 
                                value={rawBase64} 
                                className="w-full h-24 bg-muted/20 p-3 rounded-xl border border-border text-[10px] font-mono break-all outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>

                {preview && (
                    <label className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-black cursor-pointer shadow-lg outline-none active:scale-95 transition-all">
                        {t.upload}
                        <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                    </label>
                )}
            </div>
        </GameContainer>
    );
};

export default Base64Converter;
