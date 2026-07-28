import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    type Pet, type MealTime, type ActionName,
    createPet, tick, feed, giveWater, play, clean, heal, petPet, careForEgg,
    takeMeal, completeWalk, isOnCooldown, cooldownRemainingMin,
    currentMealWindow, mealTakenToday, canWalk, WALK_COOLDOWN_HOURS,
} from '../../lib/games/tamagotchi';
import { PetDisplay } from './tamagotchi/PetDisplay';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';

// ─── Tamagotchi — retro virtual pet, ported from ahoxy-legacy ────────────────
// Pixel-sprite pet in an LCD handheld shell. Egg hatches into dog/cat/bird
// (or a hidden dragon), grows through 4 stages, and needs real care: stats
// decay in real time (also while you're away), meals have time-of-day windows,
// walks have a 4-hour cooldown, and neglect is fatal.

const STORE_KEY = 'oiyo-tamagotchi:v1';

const COPY = {
    ko: {
        title: '다마고치', subtitle: 'Retro Virtual Pet',
        namePrompt: '알에게 이름을 지어주세요', nameLabel: '이름', start: '키우기 시작', age: '나이', days: '일',
        hunger: '포만감', thirst: '수분', happiness: '행복', cleanliness: '청결', health: '건강',
        feed: '먹이', water: '물', play: '놀기', clean: '씻기', heal: '치료',
        meals: '오늘의 식사', breakfast: '아침', lunch: '점심', dinner: '저녁', streak: '연속',
        walk: '산책', startWalk: '산책 가기', walkUnavailable: `산책은 ${WALK_COOLDOWN_HOURS}시간마다`, lastWalk: '마지막 산책',
        tapEgg: '알을 톡톡 두드려 주세요', guide: '설명서', newPet: '새로 키우기', confirmReset: '정말 처음부터? (현재 펫은 사라집니다)',
        guideBody: ['알은 하루가 지나면 부화합니다(6시간 이상 돌봤다면 두드려서 조기 부화).', '스탯은 실시간으로 줄어듭니다 — 접속하지 않은 동안에도!', '식사 버튼은 아침 6-10시·점심 11-14시·저녁 17-21시에만 열립니다. 세 끼를 다 챙기면 건강 보너스.', '산책은 4시간마다 가능하고 행복·건강을 크게 올립니다.', '건강이 0이 되거나 너무 나이 들면 펫은 무지개 다리를 건넙니다.', '밤 10시~아침 6시에는 잠들 수 있어요. 자는 동안엔 아무것도 못 합니다.', '펫을 탭하면 쓰다듬기(+행복).'],
        msg: { fed: '냠냠! 맛있게 먹었어요', gave_water: '꿀꺽꿀꺽! 시원해요', played: '신나게 놀았어요!', cleaned: '반짝반짝 깨끗해요', healed: '몸이 나아졌어요', petted: '기분이 좋아요 💗', hatched: '알에서 태어났어요! 🎉', grew_to_child: '어린이로 자랐어요!', grew_to_adult: '어른이 되었어요!', sleeping: '쿨쿨... 잠들었어요', woke_up: '잠에서 깼어요!', egg_cared: '알이 따뜻해졌어요', meal_breakfast: '아침을 먹었어요 🌅', meal_lunch: '점심을 먹었어요 ☀️', meal_dinner: '저녁을 먹었어요 🌙', walked: '즐거운 산책이었어요 🐾', walk_unavailable: '아직 산책할 수 없어요', heal_not_needed: '지금은 건강해요', dead_cant_act: '...', sleeping_cant_act: '자고 있어요...', feed_cooldown: '아직 배불러요', water_cooldown: '목마르지 않아요', play_cooldown: '조금 쉬고 싶어요', clean_cooldown: '이미 깨끗해요', heal_cooldown: '약은 아직이에요', pet_cooldown: '쓰다듬기는 잠시 후에', died_neglect: '돌봄이 부족해 떠났어요... 🌈', died_old_age: '천수를 누리고 떠났어요 🌈' },
    },
    en: {
        title: 'Tamagotchi', subtitle: 'Retro Virtual Pet',
        namePrompt: 'Name your egg', nameLabel: 'Name', start: 'Start Raising', age: 'Age', days: 'days',
        hunger: 'Fullness', thirst: 'Hydration', happiness: 'Happiness', cleanliness: 'Cleanliness', health: 'Health',
        feed: 'Feed', water: 'Water', play: 'Play', clean: 'Clean', heal: 'Heal',
        meals: "Today's Meals", breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', streak: 'Streak',
        walk: 'Walk', startWalk: 'Go for a Walk', walkUnavailable: `Walks every ${WALK_COOLDOWN_HOURS}h`, lastWalk: 'Last walk',
        tapEgg: 'Tap the egg to care for it', guide: 'Guide', newPet: 'New Pet', confirmReset: 'Start over? (Your current pet will be gone)',
        guideBody: ['The egg hatches after a day (tap it after 6+ hours of care to hatch early).', 'Stats decay in real time — even while you are away!', 'Meal buttons open at breakfast 6-10, lunch 11-14, dinner 17-21. All three meals grant a health bonus.', 'Walks are available every 4 hours and boost happiness & health.', 'If health hits 0 or your pet grows too old, it crosses the rainbow bridge.', 'Between 10pm and 6am your pet may fall asleep — nothing works while it sleeps.', 'Tap your pet to give it affection (+happiness).'],
        msg: { fed: 'Yum! That hit the spot', gave_water: 'Gulp gulp! Refreshing', played: 'That was fun!', cleaned: 'Squeaky clean', healed: 'Feeling better now', petted: 'So happy 💗', hatched: 'The egg hatched! 🎉', grew_to_child: 'Grew into a child!', grew_to_adult: 'All grown up!', sleeping: 'Zzz... fell asleep', woke_up: 'Woke up!', egg_cared: 'The egg feels warm', meal_breakfast: 'Had breakfast 🌅', meal_lunch: 'Had lunch ☀️', meal_dinner: 'Had dinner 🌙', walked: 'What a nice walk 🐾', walk_unavailable: "Can't walk yet", heal_not_needed: 'Healthy enough already', dead_cant_act: '...', sleeping_cant_act: 'Sleeping...', feed_cooldown: 'Still full', water_cooldown: 'Not thirsty', play_cooldown: 'Needs a little rest', clean_cooldown: 'Already clean', heal_cooldown: 'No medicine yet', pet_cooldown: 'Petting again soon', died_neglect: 'Passed away from neglect... 🌈', died_old_age: 'Lived a full life 🌈' },
    },
    ja: {
        title: 'たまごっち風ペット', subtitle: 'Retro Virtual Pet',
        namePrompt: 'たまごに名前をつけてね', nameLabel: '名前', start: '育てはじめる', age: '年齢', days: '日',
        hunger: '満腹度', thirst: '水分', happiness: 'ごきげん', cleanliness: '清潔', health: '健康',
        feed: 'ごはん', water: '水', play: '遊ぶ', clean: '洗う', heal: '治療',
        meals: '今日の食事', breakfast: '朝食', lunch: '昼食', dinner: '夕食', streak: '連続',
        walk: '散歩', startWalk: '散歩に行く', walkUnavailable: `散歩は${WALK_COOLDOWN_HOURS}時間ごと`, lastWalk: '前回の散歩',
        tapEgg: 'たまごをトントンしてね', guide: '説明書', newPet: '新しく育てる', confirmReset: '本当に最初から？(今のペットは消えます)',
        guideBody: ['たまごは1日で孵化します(6時間以上お世話したらタップで早期孵化)。', 'ステータスはリアルタイムで減ります — 離れている間も！', '食事ボタンは朝6-10時・昼11-14時・夜17-21時のみ。3食そろえると健康ボーナス。', '散歩は4時間ごと。ごきげんと健康が大きく上がります。', '健康が0になるか年を取りすぎると、虹の橋を渡ります。', '夜10時〜朝6時は眠ることがあります。睡眠中は何もできません。', 'ペットをタップするとなでなで(+ごきげん)。'],
        msg: { fed: 'もぐもぐ！おいしかった', gave_water: 'ごくごく！うるおった', played: 'たのしかった！', cleaned: 'ピカピカきれい', healed: '元気になった', petted: 'うれしい 💗', hatched: 'たまごが孵った！ 🎉', grew_to_child: 'こどもに成長！', grew_to_adult: 'おとなになった！', sleeping: 'すやすや...眠った', woke_up: '目が覚めた！', egg_cared: 'たまごがあたたかい', meal_breakfast: '朝ごはんを食べた 🌅', meal_lunch: '昼ごはんを食べた ☀️', meal_dinner: '晩ごはんを食べた 🌙', walked: 'たのしい散歩だった 🐾', walk_unavailable: 'まだ散歩できない', heal_not_needed: '今は健康です', dead_cant_act: '...', sleeping_cant_act: '眠っています...', feed_cooldown: 'まだ満腹', water_cooldown: 'のどは乾いてない', play_cooldown: '少し休みたい', clean_cooldown: 'もうきれい', heal_cooldown: 'お薬はまだ', pet_cooldown: 'なでなではまた後で', died_neglect: 'お世話が足りず旅立ちました... 🌈', died_old_age: '天寿をまっとうしました 🌈' },
    },
    zh: {
        title: '电子宠物', subtitle: 'Retro Virtual Pet',
        namePrompt: '给蛋起个名字吧', nameLabel: '名字', start: '开始饲养', age: '年龄', days: '天',
        hunger: '饱食度', thirst: '水分', happiness: '快乐', cleanliness: '清洁', health: '健康',
        feed: '喂食', water: '喂水', play: '玩耍', clean: '清洗', heal: '治疗',
        meals: '今日三餐', breakfast: '早餐', lunch: '午餐', dinner: '晚餐', streak: '连续',
        walk: '散步', startWalk: '去散步', walkUnavailable: `每${WALK_COOLDOWN_HOURS}小时可散步`, lastWalk: '上次散步',
        tapEgg: '轻敲蛋来照顾它', guide: '说明书', newPet: '重新饲养', confirmReset: '真的重新开始吗？(当前宠物会消失)',
        guideBody: ['蛋一天后孵化(照顾满6小时后轻敲可提前孵化)。', '数值实时下降——就算你不在也一样！', '用餐按钮仅在早6-10点、午11-14点、晚17-21点开放。三餐齐全有健康加成。', '每4小时可散步一次，大幅提升快乐和健康。', '健康归零或年纪太大时，宠物会跨过彩虹桥。', '晚10点到早6点宠物可能入睡，睡觉时无法互动。', '点击宠物可以抚摸(+快乐)。'],
        msg: { fed: '吧唧吧唧！真好吃', gave_water: '咕咚咕咚！真解渴', played: '玩得真开心！', cleaned: '洗得干干净净', healed: '身体好多了', petted: '好开心 💗', hatched: '蛋孵化了！🎉', grew_to_child: '长成小孩了！', grew_to_adult: '长大成年了！', sleeping: '呼呼...睡着了', woke_up: '醒来了！', egg_cared: '蛋暖暖的', meal_breakfast: '吃了早餐 🌅', meal_lunch: '吃了午餐 ☀️', meal_dinner: '吃了晚餐 🌙', walked: '散步真愉快 🐾', walk_unavailable: '还不能散步', heal_not_needed: '现在很健康', dead_cant_act: '...', sleeping_cant_act: '在睡觉...', feed_cooldown: '还很饱', water_cooldown: '不渴', play_cooldown: '想休息一下', clean_cooldown: '已经很干净', heal_cooldown: '还不能吃药', pet_cooldown: '待会儿再摸摸', died_neglect: '因缺乏照顾离开了... 🌈', died_old_age: '安享天年离开了 🌈' },
    },
    fr: {
        title: 'Tamagotchi', subtitle: 'Retro Virtual Pet',
        namePrompt: 'Donnez un nom à votre œuf', nameLabel: 'Nom', start: 'Commencer', age: 'Âge', days: 'jours',
        hunger: 'Satiété', thirst: 'Hydratation', happiness: 'Bonheur', cleanliness: 'Propreté', health: 'Santé',
        feed: 'Nourrir', water: 'Eau', play: 'Jouer', clean: 'Laver', heal: 'Soigner',
        meals: 'Repas du jour', breakfast: 'Petit-déj', lunch: 'Déjeuner', dinner: 'Dîner', streak: 'Série',
        walk: 'Promenade', startWalk: 'Se promener', walkUnavailable: `Promenade toutes les ${WALK_COOLDOWN_HOURS}h`, lastWalk: 'Dernière promenade',
        tapEgg: "Touchez l'œuf pour en prendre soin", guide: 'Guide', newPet: 'Nouveau compagnon', confirmReset: 'Vraiment recommencer ? (Le compagnon actuel disparaîtra)',
        guideBody: ["L'œuf éclot après un jour (touchez-le après 6h+ de soins pour une éclosion anticipée).", 'Les stats baissent en temps réel — même en votre absence !', 'Les repas ouvrent à 6-10h, 11-14h et 17-21h. Les trois repas donnent un bonus de santé.', 'Les promenades (toutes les 4h) boostent bonheur et santé.', 'Si la santé tombe à 0 ou que votre compagnon vieillit trop, il traverse le pont arc-en-ciel.', 'Entre 22h et 6h, il peut dormir — rien ne fonctionne pendant son sommeil.', 'Touchez-le pour le caresser (+bonheur).'],
        msg: { fed: 'Miam ! Délicieux', gave_water: 'Glou glou ! Rafraîchissant', played: "C'était amusant !", cleaned: 'Tout propre', healed: 'Ça va mieux', petted: 'Trop content 💗', hatched: "L'œuf a éclos ! 🎉", grew_to_child: 'Devenu enfant !', grew_to_adult: 'Devenu adulte !', sleeping: 'Zzz... endormi', woke_up: 'Réveillé !', egg_cared: "L'œuf est tout chaud", meal_breakfast: 'Petit-déjeuner pris 🌅', meal_lunch: 'Déjeuner pris ☀️', meal_dinner: 'Dîner pris 🌙', walked: 'Belle promenade 🐾', walk_unavailable: 'Pas encore de promenade', heal_not_needed: 'Déjà en bonne santé', dead_cant_act: '...', sleeping_cant_act: 'Il dort...', feed_cooldown: 'Encore rassasié', water_cooldown: "Pas soif", play_cooldown: 'Besoin de repos', clean_cooldown: 'Déjà propre', heal_cooldown: 'Pas de médicament pour l\'instant', pet_cooldown: 'Caresses dans un moment', died_neglect: 'Parti par manque de soins... 🌈', died_old_age: 'A vécu une belle vie 🌈' },
    },
    es: {
        title: 'Tamagotchi', subtitle: 'Retro Virtual Pet',
        namePrompt: 'Ponle nombre a tu huevo', nameLabel: 'Nombre', start: 'Empezar a criar', age: 'Edad', days: 'días',
        hunger: 'Saciedad', thirst: 'Hidratación', happiness: 'Felicidad', cleanliness: 'Limpieza', health: 'Salud',
        feed: 'Alimentar', water: 'Agua', play: 'Jugar', clean: 'Lavar', heal: 'Curar',
        meals: 'Comidas de hoy', breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', streak: 'Racha',
        walk: 'Paseo', startWalk: 'Salir a pasear', walkUnavailable: `Paseos cada ${WALK_COOLDOWN_HOURS}h`, lastWalk: 'Último paseo',
        tapEgg: 'Toca el huevo para cuidarlo', guide: 'Guía', newPet: 'Nueva mascota', confirmReset: '¿Empezar de nuevo? (Tu mascota actual desaparecerá)',
        guideBody: ['El huevo eclosiona en un día (tócalo tras 6h+ de cuidados para adelantarlo).', 'Las estadísticas bajan en tiempo real, ¡incluso cuando no estás!', 'Las comidas abren a las 6-10, 11-14 y 17-21. Las tres comidas dan bono de salud.', 'Los paseos (cada 4h) suben mucho la felicidad y la salud.', 'Si la salud llega a 0 o envejece demasiado, cruza el puente del arcoíris.', 'Entre las 22h y las 6h puede dormirse: nada funciona mientras duerme.', 'Toca a tu mascota para acariciarla (+felicidad).'],
        msg: { fed: '¡Ñam! Qué rico', gave_water: '¡Glup glup! Refrescante', played: '¡Qué divertido!', cleaned: 'Reluciente', healed: 'Ya se siente mejor', petted: 'Muy feliz 💗', hatched: '¡El huevo eclosionó! 🎉', grew_to_child: '¡Creció a niño!', grew_to_adult: '¡Ya es adulto!', sleeping: 'Zzz... se durmió', woke_up: '¡Despertó!', egg_cared: 'El huevo está calentito', meal_breakfast: 'Desayunó 🌅', meal_lunch: 'Almorzó ☀️', meal_dinner: 'Cenó 🌙', walked: 'Buen paseo 🐾', walk_unavailable: 'Aún no puede pasear', heal_not_needed: 'Ya está sano', dead_cant_act: '...', sleeping_cant_act: 'Durmiendo...', feed_cooldown: 'Aún está lleno', water_cooldown: 'No tiene sed', play_cooldown: 'Necesita descansar', clean_cooldown: 'Ya está limpio', heal_cooldown: 'Sin medicina todavía', pet_cooldown: 'Caricias en un rato', died_neglect: 'Se fue por falta de cuidados... 🌈', died_old_age: 'Vivió una vida plena 🌈' },
    },
} as const;

function loadPet(): Pet | null {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw) return null;
        const pet = JSON.parse(raw) as Pet;
        return pet && pet.name ? pet : null;
    } catch { return null; }
}

const StatBar: React.FC<{ label: string; icon: string; value: number }> = ({ label, icon, value }) => (
    <div className="space-y-0.5">
        <div className="flex items-center gap-1 text-[10px] tama-pixel-text text-foreground">
            <span aria-hidden="true">{icon}</span><span>{label}</span>
            <span className="ml-auto font-black">{Math.round(value)}</span>
        </div>
        <div className="h-2 border-2 border-border bg-background overflow-hidden" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
            <div className="h-full tama-progress-fill transition-all" style={{ width: `${value}%` }} />
        </div>
    </div>
);

const Tamagotchi: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const reducedMotion = usePrefersReducedMotion();

    const [pet, setPet] = useState<Pet | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showMsg = useCallback((key: string | null) => {
        if (!key) return;
        setMessage(key);
        if (msgTimer.current) clearTimeout(msgTimer.current);
        msgTimer.current = setTimeout(() => setMessage(null), 3000);
    }, []);

    // load + offline catch-up
    useEffect(() => {
        const stored = loadPet();
        if (stored) {
            const { pet: caught, message: m } = tick(stored);
            setPet(caught);
            showMsg(m);
        }
        setLoaded(true);
        return () => {
            if (msgTimer.current) clearTimeout(msgTimer.current);
            if (actionTimer.current) clearTimeout(actionTimer.current);
        };
    }, [showMsg]);

    // persist
    useEffect(() => {
        if (!loaded) return;
        try {
            if (pet) localStorage.setItem(STORE_KEY, JSON.stringify(pet));
        } catch { /* ignore */ }
    }, [pet, loaded]);

    // minute tick
    useEffect(() => {
        if (!pet) return;
        const id = setInterval(() => {
            setPet((p) => {
                if (!p) return p;
                const { pet: next, message: m } = tick(p);
                showMsg(m);
                return next;
            });
        }, 60000);
        return () => clearInterval(id);
    }, [pet !== null, showMsg]); // eslint-disable-line react-hooks/exhaustive-deps

    /** Run an action, show its message, and settle the state back after 2s. */
    const act = useCallback((fn: (p: Pet) => { pet: Pet; message: string; ok: boolean }) => {
        setPet((p) => {
            if (!p) return p;
            const { pet: next, message: m, ok } = fn(p);
            showMsg(m);
            if (ok && next.state !== p.state) {
                if (actionTimer.current) clearTimeout(actionTimer.current);
                actionTimer.current = setTimeout(() => {
                    setPet((cur) => cur && ['feeding', 'drinking', 'playing', 'cleaning', 'healing', 'walking'].includes(cur.state)
                        ? { ...cur, state: cur.happiness > 80 ? 'happy' : 'normal' }
                        : cur);
                }, 2500);
            }
            return next;
        });
    }, [showMsg]);

    const startPet = () => {
        const name = nameInput.trim();
        if (!name) return;
        const fresh = createPet(name);
        setPet(fresh);
        setNameInput('');
        showMsg('egg_cared');
    };

    if (!loaded) return null;

    // ── naming screen ──
    if (!pet) {
        return (
            <div className="not-prose my-12 mx-auto max-w-md">
                <TamaShell title={t.title}>
                    <div className="flex flex-col items-center justify-center gap-4 py-12">
                        <div className="text-5xl tama-egg-wobble">🥚</div>
                        <p className="tama-pixel-text text-sm text-foreground">{t.namePrompt}</p>
                        <input
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value.slice(0, 12))}
                            onKeyDown={(e) => e.key === 'Enter' && startPet()}
                            aria-label={t.nameLabel}
                            className="px-4 py-2 border-2 border-border bg-background tama-pixel-text text-center text-foreground focus:outline-none focus:border-primary"
                        />
                        <button onClick={startPet} disabled={!nameInput.trim()} className="tama-button px-6 py-2 text-xs disabled:opacity-40">
                            {t.start}
                        </button>
                    </div>
                </TamaShell>
            </div>
        );
    }

    const mealWindow = currentMealWindow();
    const alive = pet.state !== 'dead';
    const asleep = pet.state === 'sleeping';
    const meals: MealTime[] = ['breakfast', 'lunch', 'dinner'];

    const ActionBtn: React.FC<{ action: ActionName; icon: string; label: string; onClick: () => void; extraDisabled?: boolean }> =
        ({ action, icon, label, onClick, extraDisabled }) => {
            const onCd = isOnCooldown(pet, action);
            const disabled = onCd || asleep || !alive || !!extraDisabled;
            return (
                <button onClick={onClick} disabled={disabled} className={`tama-button relative flex flex-col items-center gap-0.5 py-1.5 px-1 text-[10px] ${disabled ? 'opacity-50' : ''}`}>
                    <span aria-hidden="true">{icon}</span>
                    <span className="tama-pixel-text">{label}</span>
                    {onCd && (
                        <span className="absolute -top-2 -right-1 bg-destructive text-destructive-foreground rounded-full min-w-5 h-5 px-0.5 flex items-center justify-center text-[9px] font-black">
                            {cooldownRemainingMin(pet, action)}
                        </span>
                    )}
                </button>
            );
        };

    return (
        <div className="not-prose my-12 mx-auto max-w-md">
            <TamaShell
                title={t.title}
                headerLeft={`${t.age}: ${pet.age} ${t.days}`}
                headerRight={pet.name}
                onGuide={() => setShowGuide((v) => !v)}
            >
                {/* message line (fixed height, no layout shift) */}
                <div className="h-8 mb-2 flex items-center justify-center" role="status" aria-live="polite">
                    {message && (
                        <span className="tama-pixel-text text-xs bg-background/80 px-3 py-1 rounded">
                            {(t.msg as Record<string, string>)[message] ?? message}
                        </span>
                    )}
                </div>

                {/* pet stage */}
                <div className="flex flex-col items-center justify-center h-48 mb-3">
                    <div className="scale-150">
                        <PetDisplay
                            pet={pet}
                            onPet={() => act((p) => (p.stage === 'egg' ? careForEgg(p) : petPet(p)))}
                        />
                    </div>
                    {pet.stage === 'egg' && <p className="tama-pixel-text text-[10px] mt-4 text-muted-foreground">{t.tapEgg}</p>}
                </div>

                {/* stats */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-4">
                    <StatBar label={t.hunger} icon="🍚" value={pet.hunger} />
                    <StatBar label={t.thirst} icon="💧" value={pet.thirst} />
                    <StatBar label={t.happiness} icon="💗" value={pet.happiness} />
                    <StatBar label={t.cleanliness} icon="🫧" value={pet.cleanliness} />
                </div>
                <div className="mb-4"><StatBar label={t.health} icon="➕" value={pet.health} /></div>

                {pet.stage !== 'egg' && alive && (
                    <>
                        {/* meal tracker */}
                        <div className="mb-3 border-2 border-border bg-background/50 p-2">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="tama-pixel-text text-[10px] font-black">{t.meals}</span>
                                {pet.mealStatus.streak > 0 && (
                                    <span className="tama-pixel-text text-[10px] text-primary">🔥 {t.streak} {pet.mealStatus.streak}</span>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                {meals.map((m) => {
                                    const taken = mealTakenToday(pet, m);
                                    const available = mealWindow === m && !taken && !asleep;
                                    return (
                                        <button
                                            key={m}
                                            onClick={() => available && act((p) => takeMeal(p, m))}
                                            disabled={!available}
                                            className={`tama-button py-1 text-[10px] tama-pixel-text ${taken ? 'opacity-70' : available ? (reducedMotion ? 'ring-2 ring-primary' : 'animate-pulse') : 'opacity-40'}`}
                                        >
                                            {taken ? '✅ ' : ''}{t[m]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* walking tracker */}
                        <div className="mb-3 border-2 border-border bg-background/50 p-2 flex items-center justify-between gap-2">
                            <div className="tama-pixel-text text-[10px]">
                                <div className="font-black">🐾 {t.walk}</div>
                                {pet.lastWalkTime && (
                                    <div className="text-muted-foreground">{t.lastWalk}: {new Date(pet.lastWalkTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                )}
                            </div>
                            <button
                                onClick={() => act(completeWalk)}
                                disabled={!canWalk(pet) || asleep}
                                className={`tama-button px-3 py-1.5 text-[10px] tama-pixel-text ${!canWalk(pet) || asleep ? 'opacity-40' : ''}`}
                            >
                                {canWalk(pet) ? t.startWalk : t.walkUnavailable}
                            </button>
                        </div>

                        {/* actions */}
                        <div className="grid grid-cols-5 gap-1.5">
                            <ActionBtn action="feed" icon="🍚" label={t.feed} onClick={() => act(feed)} />
                            <ActionBtn action="water" icon="💧" label={t.water} onClick={() => act(giveWater)} />
                            <ActionBtn action="play" icon="🎾" label={t.play} onClick={() => act(play)} />
                            <ActionBtn action="clean" icon="🫧" label={t.clean} onClick={() => act(clean)} />
                            <ActionBtn action="heal" icon="➕" label={t.heal} onClick={() => act(heal)} extraDisabled={pet.health > 70} />
                        </div>
                    </>
                )}

                {/* guide */}
                {showGuide && (
                    <ul className="mt-4 space-y-1 text-[10px] tama-pixel-text text-muted-foreground list-disc pl-4">
                        {t.guideBody.map((line, i) => <li key={i}>{line}</li>)}
                    </ul>
                )}

                {/* reset / new pet */}
                {(!alive || confirmReset) ? (
                    <div className="mt-4 text-center space-x-2">
                        {confirmReset && <span className="tama-pixel-text text-[10px] text-muted-foreground">{t.confirmReset}</span>}
                        <button
                            onClick={() => { setPet(null); setConfirmReset(false); try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ } }}
                            className="tama-button px-4 py-1.5 text-[10px] tama-pixel-text"
                        >
                            {t.newPet}
                        </button>
                        {confirmReset && (
                            <button onClick={() => setConfirmReset(false)} className="tama-button px-3 py-1.5 text-[10px]">✕</button>
                        )}
                    </div>
                ) : (
                    <div className="mt-4 text-center">
                        <button onClick={() => setConfirmReset(true)} className="text-[9px] tama-pixel-text text-muted-foreground hover:text-destructive underline underline-offset-2">
                            {t.newPet}
                        </button>
                    </div>
                )}
            </TamaShell>

            <style>{`
                .tama-pixel-text { font-family: "Courier New", monospace; letter-spacing: 0.5px; text-shadow: 1px 1px 0 rgba(0,0,0,0.12); }
                .tama-device { box-shadow: 0 10px 20px rgba(0,0,0,0.2), 0 6px 6px rgba(0,0,0,0.25); transform: perspective(800px) rotateX(4deg); }
                .tama-lcd { box-shadow: inset 0 0 10px rgba(0,0,0,0.3); position: relative; }
                .tama-lcd::before { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.03), rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px); pointer-events: none; z-index: 30; }
                .tama-button { background: var(--color-secondary); border: 2px solid var(--color-border); border-bottom-width: 4px; border-right-width: 4px; color: var(--color-foreground); box-shadow: inset 1px 1px 0 rgba(255,255,255,0.5); transition: all 0.1s; }
                .tama-button:not(:disabled):hover { filter: brightness(0.97); }
                .tama-button:not(:disabled):active { transform: translate(2px, 2px); border-bottom-width: 2px; border-right-width: 2px; }
                .tama-progress-fill { background: repeating-linear-gradient(45deg, #4a9e5a, #4a9e5a 5px, #3d8a4d 5px, #3d8a4d 10px); }
                @keyframes tama-wobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }
                .tama-egg-wobble { animation: ${reducedMotion ? 'none' : 'tama-wobble 2s ease-in-out infinite'}; }
                @keyframes tama-float-up { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-20px) scale(0.5); opacity: 0; } }
                .tama-sleep-z { animation: ${reducedMotion ? 'none' : 'tama-float-up 2s infinite'}; }
                .tama-sleep-z:nth-child(2) { animation-delay: 0.5s; }
                .tama-sleep-z:nth-child(3) { animation-delay: 1s; }
            `}</style>
        </div>
    );
};

// Retro handheld shell around the LCD screen
const TamaShell: React.FC<{
    title: string; headerLeft?: string; headerRight?: string; onGuide?: () => void; children: React.ReactNode;
}> = ({ title, headerLeft, headerRight, onGuide, children }) => (
    <div className="tama-device border-8 border-border rounded-3xl bg-secondary overflow-hidden">
        <div className="bg-muted px-3 py-2 flex justify-between items-center">
            <span className="tama-pixel-text text-[10px] text-foreground">{headerLeft ?? title}</span>
            <span className="tama-pixel-text text-[10px] font-black text-foreground">{headerRight ?? ''}</span>
            {onGuide ? (
                <button onClick={onGuide} aria-label="guide" className="w-5 h-5 rounded-full bg-secondary border border-border text-[10px] font-black text-foreground">?</button>
            ) : <span className="w-5" />}
        </div>
        <div className="tama-lcd bg-muted/70 p-4 min-h-[420px]">{children}</div>
        <div className="bg-muted p-2 flex justify-between items-center">
            <div className="flex gap-2">
                <span className="w-3.5 h-3.5 bg-destructive rounded-full inline-block" />
                <span className="w-3.5 h-3.5 bg-primary rounded-full inline-block" />
            </div>
            <div className="flex gap-2">
                <span className="w-7 h-3.5 bg-secondary rounded inline-block" />
                <span className="w-7 h-3.5 bg-secondary rounded inline-block" />
            </div>
        </div>
    </div>
);

export default Tamagotchi;
