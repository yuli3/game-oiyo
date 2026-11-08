import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Moon, Sun } from 'lucide-react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { celebrate } from '../../lib/games/celebration';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';
import { useAudioContext } from '../../lib/games/use-audio-context';
import { playProceduralSfx } from '../../lib/games/audio-mixer';
import { explainDotPetAction, type DotPetAction } from '../../lib/games/dot-pet';
import { DOT_PET_SPRITES, DOT_PET_UI_SPRITES } from '../../lib/games/sprites';
import { DotPetCanvas } from './DotPetCanvas';

function TiltPetButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();
  return (
    <button
      type="button"
      disabled={disabled}
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.2);
        onClick();
      }}
      className={`will-change-transform transform-(--card-tilt) ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

// ─── Dot Pet — virtual pet, ported from ahoxy-legacy ─────────────────────────
// Pick a pet, keep it fed/happy/rested; stats decay over time (including while
// you're away, via lastInteraction) and XP grows it through four stages.

const PET_TYPES = ['normal', 'water', 'fire', 'plant'] as const;
type PetType = (typeof PET_TYPES)[number];
const STAGES = ['baby', 'child', 'teen', 'adult'] as const;
type Stage = (typeof STAGES)[number];

interface Pet {
    type: PetType;
    stage: Stage;
    happiness: number;
    hunger: number;
    energy: number;
    experience: number;
    lastInteraction: number;
}

const STORE_KEY = 'oiyo-dot-pet:v1';

const COPY = {
    ko: {
        title: '픽셀 펫 키우기', subtitle: 'Dot Pet', choose: '어떤 펫을 키울까요?',
        types: { normal: '병아리', water: '물방울', fire: '불꽃이', plant: '새싹이' },
        typeDesc: { normal: '평범하지만 씩씩해요', water: '시원한 물의 친구', fire: '뜨거운 열정파', plant: '무럭무럭 자라요' },
        stages: { baby: '아기', child: '어린이', teen: '청소년', adult: '어른' },
        happiness: '행복', hunger: '포만감', energy: '에너지', xp: '경험치',
        feed: '먹이 주기', play: '놀아주기', rest: '재우기',
        resetAsk: '정말 새로 시작할까요?', reset: '새 펫 입양', confirm: '확인',
        grown: '성장했어요!', tip: '스탯은 시간이 지나면 줄어들어요. 자리를 비워도요!',
        full: '이미 배불러요', tired: '너무 지쳤어요', rested: '이미 푹 쉬었어요',
    },
    en: {
        title: 'Dot Pet', subtitle: 'Dot Pet', choose: 'Choose your pet',
        types: { normal: 'Chick', water: 'Droplet', fire: 'Ember', plant: 'Sprout' },
        typeDesc: { normal: 'Plain but plucky', water: 'A cool water friend', fire: 'A fiery spirit', plant: 'Grows and grows' },
        stages: { baby: 'Baby', child: 'Child', teen: 'Teen', adult: 'Adult' },
        happiness: 'Happiness', hunger: 'Fullness', energy: 'Energy', xp: 'XP',
        feed: 'Feed', play: 'Play', rest: 'Rest',
        resetAsk: 'Really start over?', reset: 'Adopt New Pet', confirm: 'Confirm',
        grown: 'Your pet grew up!', tip: 'Stats decay over time — even while you are away!',
        full: 'Already full', tired: 'Too tired', rested: 'Already rested',
    },
    ja: {
        title: 'ドットペット育成', subtitle: 'Dot Pet', choose: 'どのペットを育てる？',
        types: { normal: 'ひよこ', water: 'しずく', fire: 'ほのお', plant: 'めばえ' },
        typeDesc: { normal: '普通だけど元気', water: '涼しい水の友だち', fire: '熱い情熱家', plant: 'ぐんぐん育つ' },
        stages: { baby: '赤ちゃん', child: 'こども', teen: '思春期', adult: 'おとな' },
        happiness: 'ごきげん', hunger: '満腹度', energy: '元気',
        xp: '経験値', feed: 'ごはん', play: '遊ぶ', rest: '寝かせる',
        resetAsk: '本当に最初から？', reset: '新しいペット', confirm: '確認',
        grown: '成長しました！', tip: 'ステータスは時間とともに減ります。離れている間も！',
        full: 'もうお腹いっぱい', tired: '疲れすぎ', rested: 'もう十分休んだ',
    },
    zh: {
        title: '像素宠物', subtitle: 'Dot Pet', choose: '选择你的宠物',
        types: { normal: '小鸡', water: '水滴', fire: '火苗', plant: '嫩芽' },
        typeDesc: { normal: '平凡但有活力', water: '清凉的水之友', fire: '火热的家伙', plant: '茁壮成长' },
        stages: { baby: '幼年', child: '儿童', teen: '少年', adult: '成年' },
        happiness: '快乐', hunger: '饱食度', energy: '精力', xp: '经验',
        feed: '喂食', play: '玩耍', rest: '休息',
        resetAsk: '真的要重新开始吗？', reset: '领养新宠物', confirm: '确认',
        grown: '宠物成长了！', tip: '数值会随时间下降——就算你不在也一样！',
        full: '已经吃饱了', tired: '太累了', rested: '已经休息过了',
    },
    fr: {
        title: 'Dot Pet', subtitle: 'Dot Pet', choose: 'Choisissez votre compagnon',
        types: { normal: 'Poussin', water: 'Goutte', fire: 'Flammy', plant: 'Pousse' },
        typeDesc: { normal: 'Simple mais courageux', water: "Un ami d'eau fraîche", fire: 'Un esprit ardent', plant: 'Pousse sans arrêt' },
        stages: { baby: 'Bébé', child: 'Enfant', teen: 'Ado', adult: 'Adulte' },
        happiness: 'Bonheur', hunger: 'Satiété', energy: 'Énergie', xp: 'XP',
        feed: 'Nourrir', play: 'Jouer', rest: 'Coucher',
        resetAsk: 'Vraiment recommencer ?', reset: 'Nouveau compagnon', confirm: 'Confirmer',
        grown: 'Votre compagnon a grandi !', tip: 'Les stats baissent avec le temps — même en votre absence !',
        full: 'Déjà rassasié', tired: 'Trop fatigué', rested: 'Déjà reposé',
    },
    es: {
        title: 'Dot Pet', subtitle: 'Dot Pet', choose: 'Elige tu mascota',
        types: { normal: 'Pollito', water: 'Gotita', fire: 'Llamita', plant: 'Brote' },
        typeDesc: { normal: 'Sencillo pero valiente', water: 'Un amigo de agua fresca', fire: 'Un espíritu ardiente', plant: 'Crece sin parar' },
        stages: { baby: 'Bebé', child: 'Niño', teen: 'Adolescente', adult: 'Adulto' },
        happiness: 'Felicidad', hunger: 'Saciedad', energy: 'Energía', xp: 'XP',
        feed: 'Alimentar', play: 'Jugar', rest: 'Dormir',
        resetAsk: '¿Empezar de nuevo?', reset: 'Adoptar otra mascota', confirm: 'Confirmar',
        grown: '¡Tu mascota creció!', tip: 'Las estadísticas bajan con el tiempo, ¡incluso si no estás!',
        full: 'Ya está lleno', tired: 'Demasiado cansado', rested: 'Ya descansó',
    },
} as const;

function loadPet(): Pet | null {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw) return null;
        const pet = JSON.parse(raw) as Pet;
        if (!pet || !PET_TYPES.includes(pet.type)) return null;
        // offline decay: ~10 points per hour away, capped
        const hours = (Date.now() - pet.lastInteraction) / 3_600_000;
        const decay = Math.min(Math.floor(hours * 10), 60);
        if (decay > 0) {
            pet.happiness = Math.max(0, pet.happiness - decay);
            pet.hunger = Math.max(0, pet.hunger - decay);
            pet.energy = Math.max(0, pet.energy - decay);
            pet.lastInteraction = Date.now();
        }
        return pet;
    } catch { return null; }
}

function savePet(pet: Pet | null) {
    try {
        if (pet) localStorage.setItem(STORE_KEY, JSON.stringify(pet));
        else localStorage.removeItem(STORE_KEY);
    } catch { /* ignore */ }
}

const StatBar: React.FC<{ label: string; icon: string; value: number; max?: number }> = ({ label, icon, value, max = 100 }) => (
    <div className="flex items-center gap-3">
        <span className="w-24 shrink-0 text-xs font-bold text-muted-foreground">{icon} {label}</span>
        <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
            <div
                className={`h-full rounded-full transition-all w-(--stat-pct) ${value / max > 0.5 ? 'bg-success' : value / max > 0.2 ? 'bg-warning' : 'bg-destructive'}`}
                style={{
                    '--stat-pct': `${Math.min(100, (value / max) * 100)}%`,
                } as React.CSSProperties}
            />
        </div>
        <span className="w-8 text-right text-xs font-black text-foreground">{value}</span>
    </div>
);

const DotPet: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || 'ko' });

    const [pet, setPet] = useState<Pet | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [grewUp, setGrewUp] = useState(false);
    const [isSleeping, setIsSleeping] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const grewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const getAudioContext = useAudioContext();
    const playSfx = useCallback((cue: "coin" | "jump" | "move" | "win" | "fail" | "success") => {
        playProceduralSfx(getAudioContext(), cue);
    }, [getAudioContext]);

    useEffect(() => {
        setPet(loadPet());
        setLoaded(true);
        return () => { if (grewTimer.current) clearTimeout(grewTimer.current); };
    }, []);

    useEffect(() => { if (loaded) savePet(pet); }, [pet, loaded]);

    // slow decay while the page is open (1 point / 30s)
    useEffect(() => {
        if (!pet) return;
        const id = setInterval(() => {
            setPet((p) => p && ({
                ...p,
                happiness: Math.max(0, p.happiness - 1),
                hunger: Math.max(0, p.hunger - 1),
                energy: Math.max(0, p.energy - 1),
                lastInteraction: Date.now(),
            }));
        }, 30_000);
        return () => clearInterval(id);
    }, [pet !== null]); // eslint-disable-line react-hooks/exhaustive-deps

    const update = useCallback((delta: Partial<Pet>, xp: number) => {
        setPet((p) => {
            if (!p) return p;
            let next: Pet = { ...p, ...delta, experience: p.experience + xp, lastInteraction: Date.now() };
            const stageIdx = STAGES.indexOf(next.stage);
            const threshold = (stageIdx + 1) * 100;
            if (stageIdx < STAGES.length - 1 && next.experience >= threshold) {
                next = { ...next, stage: STAGES[stageIdx + 1], experience: next.experience - threshold };
                setGrewUp(true);
                MobileHapticsPro.success();
                playSfx('win');
                if (containerRef.current) celebrate(containerRef.current, { preset: "stardust" });
                if (grewTimer.current) clearTimeout(grewTimer.current);
                grewTimer.current = setTimeout(() => setGrewUp(false), 2500);
            }
            return next;
        });
    }, [containerRef, playSfx]);

    const feed = () => {
        MobileHapticsPro.light();
        playSfx('coin');
        pet && care('feed', { hunger: Math.min(100, pet.hunger + 20), energy: Math.min(100, pet.energy + 5) }, 5);
    };
    const play = () => {
        MobileHapticsPro.medium();
        playSfx('jump');
        pet && care('play', { happiness: Math.min(100, pet.happiness + 20), hunger: Math.max(0, pet.hunger - 10), energy: Math.max(0, pet.energy - 15) }, 10);
    };
    const rest = () => {
        MobileHapticsPro.selection();
        playSfx('move');
        pet && care('rest', { energy: Math.min(100, pet.energy + 30), happiness: Math.max(0, pet.happiness - 5) }, 3);
    };

    const handlePetStroke = () => {
        if (!pet) return;
        if (isSleeping) {
            setIsSleeping(false);
            setNotice(null);
        }
        care('play', { happiness: Math.min(100, pet.happiness + 2), energy: Math.max(0, pet.energy - 0.5) }, 1);
    };

    const toggleSleep = () => {
        setIsSleeping((prev) => {
            const next = !prev;
            if (next) {
                rest();
            }
            return next;
        });
    };

    const care = (action: DotPetAction, delta: Partial<Pet>, xp: number) => {
        if (!pet) return;
        const reason = explainDotPetAction(pet, action);
        if (reason) {
            MobileHapticsPro.warning();
            playSfx('fail');
            setNotice(t[reason]);
            return;
        }
        setNotice(null);
        update(delta, xp);
    };

    const adopt = (type: PetType) => {
        MobileHapticsPro.selection();
        playSfx('success');
        setPet({ type, stage: 'baby', happiness: 80, hunger: 80, energy: 80, experience: 0, lastInteraction: Date.now() });
        setConfirmReset(false);
    };

    if (!loaded) return null;

    if (!pet) {
        return (
            <div
                ref={containerRef}
                className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-4" : "relative"}
            >
                <div className="mb-2 flex justify-end">
                    <button
                        type="button"
                        onClick={togglePortal}
                        className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted"
                        aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
                    >
                        {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                        <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
                    </button>
                </div>
                <GameContainer title={t.title} subtitle={t.subtitle}>
                    <h4 className="text-center text-lg font-black text-foreground mb-6">{t.choose}</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {PET_TYPES.map((type) => (
                            <TiltPetButton
                                key={type}
                                onClick={() => adopt(type)}
                                className="p-5 rounded-2xl border-2 border-border bg-card hover:border-primary transition-all text-center space-y-2 shadow-sm"
                            >
                                <img src={DOT_PET_SPRITES[type].baby} alt="" draggable={false} className="mx-auto h-16 w-16 object-contain" />
                                <div className="font-black text-foreground">{t.types[type]}</div>
                                <div className="text-xs text-muted-foreground">{t.typeDesc[type]}</div>
                            </TiltPetButton>
                        ))}
                    </div>
                </GameContainer>
            </div>
        );
    }

    const stageIdx = STAGES.indexOf(pet.stage);
    const xpMax = (stageIdx + 1) * 100;

    return (
        <div
            ref={containerRef}
            className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-4" : "relative"}
        >
            <div className="mb-2 flex justify-end">
                <button
                    type="button"
                    onClick={togglePortal}
                    className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted"
                    aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
                >
                    {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                    <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
                </button>
            </div>
            <GameContainer title={t.title} subtitle={t.subtitle}>
                {/* Pet Stage Header with Sleep Mode Toggle */}
                <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                        {t.stages[pet.stage]} · {t.types[pet.type]}
                    </span>
                    <button
                        type="button"
                        onClick={toggleSleep}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border transition-all ${
                            isSleeping
                                ? 'bg-secondary text-primary border-primary shadow-sm'
                                : 'bg-card text-foreground border-border hover:border-primary'
                        }`}
                        aria-pressed={isSleeping}
                    >
                        {isSleeping ? <Sun className="size-3.5 text-warning" /> : <Moon className="size-3.5 text-primary" />}
                        <span>{isSleeping ? '깨우기' : '재우기 (수면 모드)'}</span>
                    </button>
                </div>

                {/* 2D Tactile Canvas Arena */}
                <DotPetCanvas
                    petType={pet.type}
                    stage={pet.stage}
                    happiness={pet.happiness}
                    hunger={pet.hunger}
                    energy={pet.energy}
                    isSleeping={isSleeping}
                    onPetStroke={handlePetStroke}
                    onFeedDrop={feed}
                    onPlayFetch={play}
                    getAudioContext={getAudioContext}
                    className="mb-4"
                />

                {/* Growth Alert */}
                {grewUp && (
                    <div className="mb-4 inline-flex w-full items-center justify-center gap-1.5 px-4 py-2 bg-success text-success-foreground rounded-2xl text-sm font-black shadow-lg animate-fade-up motion-reduce:animate-none" role="status">
                        <img src={DOT_PET_UI_SPRITES.trophy} alt="" aria-hidden="true" className="size-5 object-contain" />
                        <span>✨ {t.grown}</span>
                    </div>
                )}

                {/* Stats */}
                <div className="space-y-3 mb-6 p-4 rounded-2xl bg-card border border-border/60 shadow-xs">
                    <StatBar label={t.happiness} icon="💗" value={pet.happiness} />
                    <StatBar label={t.hunger} icon="🍚" value={pet.hunger} />
                    <StatBar label={t.energy} icon="⚡" value={pet.energy} />
                    <StatBar label={t.xp} icon="⭐" value={pet.experience} max={xpMax} />
                </div>

                {notice && <p className="mb-4 text-center text-xs font-bold text-warning" role="status">{notice}</p>}

                {/* Reset */}
                <div className="mt-6 text-center">
                    {confirmReset ? (
                        <span className="inline-flex items-center gap-2 text-xs">
                            <span className="font-bold text-muted-foreground">{t.resetAsk}</span>
                            <button onClick={() => { setPet(null); savePet(null); setConfirmReset(false); }} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground font-bold">{t.confirm}</button>
                            <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground font-bold border border-border">✕</button>
                        </span>
                    ) : (
                        <button onClick={() => setConfirmReset(true)} className="text-xs font-bold text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2">
                            {t.reset}
                        </button>
                    )}
                </div>

                <p className="mt-4 text-center text-xs text-muted-foreground">{t.tip}</p>
            </GameContainer>
        </div>
    );
};

export default DotPet;
