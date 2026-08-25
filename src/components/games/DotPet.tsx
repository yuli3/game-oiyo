import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { explainDotPetAction, type DotPetAction } from '../../lib/games/dot-pet';
import { DOT_PET_SPRITES } from '../../lib/games/sprites';

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
        grown: '성장했습니다!', tip: '스탯은 시간이 지나면 줄어들어요. 자리를 비워도요!',
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
                className={`h-full rounded-full transition-all ${value / max > 0.5 ? 'bg-success' : value / max > 0.2 ? 'bg-warning' : 'bg-destructive'}`}
                style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
            />
        </div>
        <span className="w-8 text-right text-xs font-black text-foreground">{value}</span>
    </div>
);

const DotPet: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;

    const [pet, setPet] = useState<Pet | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [grewUp, setGrewUp] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const grewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
                if (grewTimer.current) clearTimeout(grewTimer.current);
                grewTimer.current = setTimeout(() => setGrewUp(false), 2500);
            }
            return next;
        });
    }, []);

    const feed = () => pet && care('feed', { hunger: Math.min(100, pet.hunger + 20), energy: Math.min(100, pet.energy + 5) }, 5);
    const play = () => pet && care('play', { happiness: Math.min(100, pet.happiness + 20), hunger: Math.max(0, pet.hunger - 10), energy: Math.max(0, pet.energy - 15) }, 10);
    const rest = () => pet && care('rest', { energy: Math.min(100, pet.energy + 30), happiness: Math.max(0, pet.happiness - 5) }, 3);

    const care = (action: DotPetAction, delta: Partial<Pet>, xp: number) => {
        if (!pet) return;
        const reason = explainDotPetAction(pet, action);
        if (reason) { setNotice(t[reason]); return; }
        setNotice(null);
        update(delta, xp);
    };

    const adopt = (type: PetType) => {
        setPet({ type, stage: 'baby', happiness: 80, hunger: 80, energy: 80, experience: 0, lastInteraction: Date.now() });
        setConfirmReset(false);
    };

    if (!loaded) return null;

    if (!pet) {
        return (
            <GameContainer title={t.title} subtitle={t.subtitle}>
                <h4 className="text-center text-lg font-black text-foreground mb-6">{t.choose}</h4>
                <div className="grid grid-cols-2 gap-3">
                    {PET_TYPES.map((type) => (
                        <button
                            key={type}
                            onClick={() => adopt(type)}
                            className="p-5 rounded-2xl border-2 border-border bg-card hover:border-primary hover:-translate-y-0.5 transition-all text-center space-y-2"
                        >
                            <img src={DOT_PET_SPRITES[type][0]} alt="" draggable={false} className="mx-auto h-16 w-16 object-contain" />
                            <div className="font-black text-foreground">{t.types[type]}</div>
                            <div className="text-[10px] text-muted-foreground">{t.typeDesc[type]}</div>
                        </button>
                    ))}
                </div>
            </GameContainer>
        );
    }

    const stageIdx = STAGES.indexOf(pet.stage);
    const xpMax = (stageIdx + 1) * 100;
    const petSprite = DOT_PET_SPRITES[pet.type][stageIdx];
    const mood = pet.happiness > 50 && pet.hunger > 30 ? '' : pet.hunger <= 30 ? '💦' : '💧';
    const spriteSize = ['h-16 w-16', 'h-20 w-20', 'h-24 w-24', 'h-28 w-28'][stageIdx];

    return (
        <GameContainer title={t.title} subtitle={t.subtitle}>
            {/* Pet stage area */}
            <div className="relative min-h-[220px] rounded-2xl border-2 border-primary/30 bg-gradient-to-b from-muted/20 to-muted/60 flex flex-col items-center justify-center mb-6 overflow-hidden">
                <div className={`${spriteSize} relative animate-bounce motion-reduce:animate-none`} role="img" aria-label={t.types[pet.type]}>
                    <img src={petSprite} alt="" draggable={false} className="h-full w-full object-contain" />
                    {mood && <span className="absolute -right-2 -top-1 text-xl">{mood}</span>}
                </div>
                <div className="absolute bottom-3 text-[10px] font-black text-muted-foreground bg-background/70 px-3 py-1 rounded-full uppercase tracking-widest">
                    {t.stages[pet.stage]} · {t.types[pet.type]}
                </div>
                {grewUp && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-success text-success-foreground rounded-full text-xs font-black shadow-lg animate-fade-up motion-reduce:animate-none" role="status">
                        ✨ {t.grown}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="space-y-3 mb-6">
                <StatBar label={t.happiness} icon="💗" value={pet.happiness} />
                <StatBar label={t.hunger} icon="🍚" value={pet.hunger} />
                <StatBar label={t.energy} icon="⚡" value={pet.energy} />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <button type="button" onClick={feed} className="py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:opacity-90 transition-all active:scale-95">
                    🍚 {t.feed}
                </button>
                <button type="button" onClick={play} className="py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:opacity-90 transition-all active:scale-95">
                    🎮 {t.play}
                </button>
                <button type="button" onClick={rest} className="py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:opacity-90 transition-all active:scale-95">
                    🛏️ {t.rest}
                </button>
            </div>
            {notice && <p className="mb-4 text-center text-xs font-bold text-amber-700" role="status">{notice}</p>}

            {/* XP */}
            <StatBar label={t.xp} icon="⭐" value={pet.experience} max={xpMax} />

            {/* Reset */}
            <div className="mt-6 text-center">
                {confirmReset ? (
                    <span className="inline-flex items-center gap-2 text-xs">
                        <span className="font-bold text-muted-foreground">{t.resetAsk}</span>
                        <button onClick={() => { setPet(null); savePet(null); setConfirmReset(false); }} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground font-bold">{t.confirm}</button>
                        <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground font-bold border border-border">✕</button>
                    </span>
                ) : (
                    <button onClick={() => setConfirmReset(true)} className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2">
                        {t.reset}
                    </button>
                )}
            </div>

            <p className="mt-4 text-center text-[10px] text-muted-foreground">{t.tip}</p>
        </GameContainer>
    );
};

export default DotPet;
