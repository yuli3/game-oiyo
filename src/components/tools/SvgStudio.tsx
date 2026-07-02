import React, { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { GameContainer } from '../ui/game/GamePrimitives';

const DEFAULT_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" stroke="#84cc16" stroke-width="4" fill="#a3e635" />
</svg>`;

const SvgStudio: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "SVG 스튜디오", desc: "SVG 코드를 편집하고 즉시 확인합니다. 선명한 벡터 그래픽의 마법을 경험하세요.", copy: "코드 복사", download: "파일 저장", editor: "SVG 코드 에디터", preview: "실시간 미리보기" },
        en: { title: "SVG Studio", desc: "Edit and preview SVG code instantly. Experience the magic of crisp vector graphics.", copy: "Copy Code", download: "Save as File", editor: "SVG Code Editor", preview: "Live Preview" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [code, setCode] = useState(DEFAULT_SVG);
    const safeHtml = useMemo(() =>
      typeof window !== 'undefined'
        ? DOMPurify.sanitize(code, { USE_PROFILES: { svg: true, svgFilters: true } })
        : '',
    [code]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        alert('SVG code copied!');
    };

    const downloadFile = () => {
        const blob = new Blob([code], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'oiyo-vector.svg';
        link.href = url;
        link.click();
    };

    return (
        <GameContainer title={t.title} subtitle="Infinite Resolution Analytics" onReset={() => setCode(DEFAULT_SVG)}>
            <div className="flex flex-col items-center gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center max-w-md">{t.desc}</p>
                
                <div className="w-full flex flex-col lg:flex-row gap-8 items-stretch">
                    {/* Editor Area */}
                    <div className="flex-1 space-y-3">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.editor}</p>
                        <textarea 
                            value={code} 
                            onChange={(e) => setCode(e.target.value)}
                            spellCheck={false}
                            className="w-full h-80 bg-foreground text-success font-mono text-xs p-6 rounded-3xl border-4 border-background/15 focus:ring-4 focus:ring-success/30 outline-none shadow-inner"
                        />
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 space-y-3">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.preview}</p>
                        <div className="w-full h-80 bg-card rounded-3xl border border-border shadow-sm flex items-center justify-center p-8 overflow-hidden relative group">
                            <div 
                                className="max-w-full max-h-full flex items-center justify-center"
                                dangerouslySetInnerHTML={{ __html: safeHtml }}
                            />
                            {/* Grid Overlay for feel */}
                            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 w-full justify-center">
                    <button onClick={copyToClipboard} className="px-10 py-3 bg-muted text-foreground rounded-full font-black border border-border hover:bg-muted/80 transition-colors">{t.copy}</button>
                    <button onClick={downloadFile} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-black shadow-lg hover:opacity-90 transition-opacity">{t.download}</button>
                </div>
            </div>
        </GameContainer>
    );
};

export default SvgStudio;
