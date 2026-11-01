import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2, Share2, Check } from 'lucide-react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import { celebrate } from '../../lib/games/celebration';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from '../../lib/games/share-card';
import { getSpriteUrl } from '../../lib/games/sprites';

function TiltLottoButton({
  children,
  onClick,
  className = '',
  disabled = false,
  title,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel || title}
      onClick={() => {
        triggerPop(0.12);
        onClick?.();
      }}
      disabled={disabled}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`touch-manipulation select-none transition-all duration-150 transform-(--card-tilt) will-change-transform ${className}`}
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
    >
      {children}
    </button>
  );
}

const LottoGenerator: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const COPY = {
        ko: { title: "로또 번호 생성기", subtitle: "행운과 통계", gen: "번호 자동 생성", generating: "번호 생성 중…", reset: "초기화", lucky: "오늘의 행운수", desc: "매주 토요일, 당신의 설레임을 응원합니다.", set: "세트", empty: "번호를 생성해 행운수를 확인하세요.", share: "행운 번호 공유", copied: "카드 복사 완료!" },
        en: { title: "Lotto Number Generator", subtitle: "Luck & Statistics", gen: "Generate Numbers", generating: "Generating…", reset: "Reset", lucky: "Your Lucky Numbers", desc: "Wishing you the best luck this week!", set: "Set", empty: "Generate numbers to reveal your lucky picks.", share: "Share Lucky Numbers", copied: "Copied Card!" },
        ja: { title: "ロト番号ジェネレーター", subtitle: "運と統計", gen: "番号を自動生成", generating: "生成中…", reset: "リセット", lucky: "今日のラッキーナンバー", desc: "あなたの幸運を応援します。", set: "セット", empty: "番号を生成してラッキーナンバーを確認しましょう。", share: "幸運のカードを共有", copied: "コピー完了！" },
        zh: { title: "彩票号码生成器", subtitle: "幸运与统计", gen: "自动生成号码", generating: "正在生成…", reset: "重置", lucky: "今日幸运号码", desc: "祝你本周好运连连！", set: "组", empty: "生成号码以查看你的幸运号码。", share: "分享幸运号码", copied: "已复制卡片！" },
        fr: { title: "Générateur de numéros de loto", subtitle: "Chance et statistiques", gen: "Générer les numéros", generating: "Génération…", reset: "Réinitialiser", lucky: "Vos numéros porte-bonheur", desc: "Bonne chance cette semaine !", set: "Série", empty: "Générez des numéros pour découvrir vos choix porte-bonheur.", share: "Partager la carte", copied: "Copié !" },
        es: { title: "Generador de números de lotería", subtitle: "Suerte y estadísticas", gen: "Generar números", generating: "Generando…", reset: "Restablecer", lucky: "Tus números de la suerte", desc: "¡Mucha suerte esta semana!", set: "Serie", empty: "Genera números para revelar tus números de la suerte.", share: "Compartir tarjeta", copied: "¡Copiado!" }
    };
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
    const reducedMotion = usePrefersReducedMotion();
    const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || 'ko' });

    const [numbers, setNumbers] = useState<number[][]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [cardCopied, setCardCopied] = useState(false);

    const [muted, setMuted] = useState(() => {
        if (typeof window === 'undefined') return false;
        try {
            return localStorage.getItem('lotto_generator_sound_muted') === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('lotto_generator_sound_muted', String(muted));
        } catch {
            // SSR-safe fallback
        }
    }, [muted]);

    const audioRef = useRef<AudioContext | null>(null);
    const playTone = useCallback((freq: number, duration = 0.08) => {
        if (muted || typeof window === 'undefined') return;
        try {
            const ctx = audioRef.current ?? new AudioContext();
            audioRef.current = ctx;
            if (ctx.state === 'suspended') void ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch {
            // ignore
        }
    }, [muted]);
    useEffect(() => () => { void audioRef.current?.close(); }, []);

    const generateSet = () => {
        const set = new Set<number>();
        while (set.size < 6) {
            set.add(Math.floor(Math.random() * 45) + 1);
        }
        return Array.from(set).sort((a, b) => a - b);
    };

    const generateAll = useCallback(() => {
        setIsGenerating(true);
        setNumbers([]);
        MobileHapticsPro.selectionClick();
        playTone(440, 0.08);

        const reveal = () => {
            const newSets = Array.from({ length: 5 }).map(() => generateSet());
            setNumbers(newSets);
            setIsGenerating(false);
            MobileHapticsPro.successPattern();
            playTone(880, 0.15);
            celebrate(containerRef.current, { preset: 'stardust' });
        };
        if (reducedMotion) reveal();
        else {
            setTimeout(() => {
                MobileHapticsPro.lightImpact();
                playTone(554, 0.08);
            }, 300);
            setTimeout(() => {
                MobileHapticsPro.mediumImpact();
                playTone(659, 0.08);
            }, 600);
            setTimeout(reveal, 1000);
        }
    }, [reducedMotion, playTone]);

    const handleShareCard = async () => {
        if (numbers.length === 0) return;
        MobileHapticsPro.mediumImpact();
        const firstSet = numbers[0].join('  ');
        const canvas = createShareCardCanvas({
            title: t.title,
            subtitle: t.lucky,
            score: firstSet,
            slug: 'lotto-generator',
            customStats: [
                { label: t.set, value: '5' },
            ],
        });
        const success = await copyShareCardToClipboard(canvas);
        if (success) {
            setCardCopied(true);
            setTimeout(() => setCardCopied(false), 2000);
        } else {
            downloadShareCard(canvas, 'lotto-lucky-numbers.png');
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                void togglePortal();
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                setMuted((v) => !v);
            } else if (e.code === 'Space' || e.key === 'Enter') {
                e.preventDefault();
                if (!isGenerating) generateAll();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePortal, isGenerating, generateAll]);

    const getBallColor = (n: number) => {
        if (n <= 10) return 'bg-amber-400 border-amber-500 text-white';
        if (n <= 20) return 'bg-blue-400 border-blue-500 text-white';
        if (n <= 30) return 'bg-rose-400 border-rose-500 text-white';
        if (n <= 40) return 'bg-slate-400 border-slate-500 text-white';
        return 'bg-emerald-400 border-emerald-500 text-white';
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full transition-all duration-300 ${
                isImmersive ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-y-auto p-4' : ''
            }`}
        >
            <div className="w-full max-w-xl mx-auto mb-2 flex items-center justify-end gap-2 px-1">
                {numbers.length > 0 && (
                    <TiltLottoButton
                        onClick={handleShareCard}
                        className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        ariaLabel={t.share}
                        title={t.share}
                    >
                        {cardCopied ? <Check className="h-4 w-4 text-success" /> : <Share2 className="h-4 w-4 text-primary" />}
                        <span>{cardCopied ? t.copied : t.share}</span>
                    </TiltLottoButton>
                )}
                <TiltLottoButton
                    onClick={() => setMuted((v) => !v)}
                    className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    ariaLabel={muted ? portalLabels.unmute : portalLabels.mute}
                    title={muted ? portalLabels.unmute : portalLabels.mute}
                >
                    {muted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-primary" />}
                    <span className="sr-only">{muted ? portalLabels.unmute : portalLabels.mute}</span>
                </TiltLottoButton>
                <TiltLottoButton
                    onClick={togglePortal}
                    className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    ariaLabel={isImmersive ? portalLabels.exit : portalLabels.enter}
                    title={isImmersive ? portalLabels.exit : portalLabels.enter}
                >
                    {isImmersive ? <Minimize2 className="h-4 w-4 text-primary" /> : <Maximize2 className="h-4 w-4" />}
                    <span className="sr-only">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
                </TiltLottoButton>
            </div>

            <GameContainer title={t.title} subtitle={t.subtitle} onReset={() => setNumbers([])}>
            <div className="space-y-8">
                <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground mb-6 leading-relaxed">{t.desc}</p>
                    <TiltLottoButton
                        onClick={generateAll}
                        disabled={isGenerating}
                        ariaLabel={isGenerating ? t.generating : t.gen}
                        className={`group relative px-12 py-4 bg-primary text-primary-foreground rounded-full font-black text-xl shadow-lg hover:shadow-primary/40 ${!reducedMotion ? 'transition-all overflow-hidden' : ''}`}
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            {isGenerating ? t.generating : t.gen}
                            <span className={`text-2xl ${!reducedMotion ? 'group-hover:rotate-12 transition-transform' : ''}`}>🍀</span>
                        </span>
                        {!reducedMotion && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
                    </TiltLottoButton>
                </div>

                <div className="space-y-4">
                    {numbers.length > 0 ? (
                        numbers.map((set, i) => (
                            <div 
                                key={i} 
                                className={`flex justify-between items-center p-4 bg-muted/40 rounded-2xl border border-border ${!reducedMotion ? 'animate-in slide-in-from-left duration-300' : ''}`}
                            >
                                <span className="text-xs font-black text-muted-foreground uppercase">{i + 1} {t.set}</span>
                                <div className="flex gap-2 sm:gap-4">
                                    {set.map((n, idx) => (
                                        <div 
                                            key={idx}
                                            className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full border-b-4 flex items-center justify-center font-black text-sm sm:text-lg shadow-sm ${getBallColor(n)}`}
                                        >
                                            {n}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border/80 rounded-3xl bg-muted/20">
                            <img
                                src={getSpriteUrl('star', 128)}
                                alt="Lucky Star"
                                width={72}
                                height={72}
                                className="mb-4 drop-shadow-md animate-pulse"
                            />
                            <p className="font-bold text-muted-foreground tracking-wide text-sm">{t.empty}</p>
                        </div>
                    )}
                </div>
            </div>
        </GameContainer>
        </div>
    );
};

export default LottoGenerator;
