import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2, Share2, Trophy, Sparkles, ScrollText, Wrench, X, ShieldAlert } from 'lucide-react';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';
import { GameContainer } from '../ui/game/GamePrimitives';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { createDeltaLoop, elapsedSeconds } from '../../lib/games/time-contracts';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import { celebrate } from '../../lib/games/celebration';
import {
    createShareCardCanvas,
    copyShareCardToClipboard,
    downloadShareCard,
} from '../../lib/games/share-card';
import { mulberry32 } from '../../lib/games/daily';
import {
    CONFIGS,
    allCaught,
    catchFish as catchFishAt,
    createFishFromSeed,
    formatElapsed,
    stepFish,
    type Difficulty,
    type FishState,
} from '../../lib/games/cat-fishing';
import { CAT_FISHING_KOI, CAT_FISHING_PAW, CAT_FISHING_UI_SPRITES } from '../../lib/games/sprites';
import {
    type CatFishingQuest,
    loadCatFishingQuests,
    saveCatFishingQuests,
} from '../../lib/games/cat-fishing-quests';
import {
    type CatFishingDialogue,
    pickCatFishingDialogue,
} from '../../lib/games/cat-fishing-lore';
import {
    type CatFishingMetaSave,
    type CatUpgradeDef,
    CAT_UPGRADES,
    loadCatFishingMeta,
    saveCatFishingMeta,
    getCatUpgradeCost,
    computeCatFishingModifiers,
} from '../../lib/games/cat-fishing-meta';

const BEST_KEY = 'oiyo-cat-fishing-best';

class CatFishingAudio {
  private ctx: AudioContext | null = null;
  public muted = false;

  constructor(muted = false) {
    this.muted = muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === "undefined") return null;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.ctx && AudioCtx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  playWaterPlop() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playCatchSplash() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.06);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.exponentialRampToValueAtTime(90, now + 0.12);
    gain2.gain.setValueAtTime(0.24, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.12);
  }

  playVictory() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const meowOsc = ctx.createOscillator();
    const meowGain = ctx.createGain();
    meowOsc.type = "triangle";
    meowOsc.frequency.setValueAtTime(420, now);
    meowOsc.frequency.exponentialRampToValueAtTime(780, now + 0.14);
    meowOsc.frequency.exponentialRampToValueAtTime(540, now + 0.38);
    meowGain.gain.setValueAtTime(0.2, now);
    meowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    meowOsc.connect(meowGain).connect(ctx.destination);
    meowOsc.start(now);
    meowOsc.stop(now + 0.38);

    const notes = [659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((f, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(f, now + 0.08 + idx * 0.07);
      g.gain.setValueAtTime(0.2, now + 0.08 + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + idx * 0.07 + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(now + 0.08 + idx * 0.07);
      o.stop(now + 0.08 + idx * 0.07 + 0.22);
    });
  }

  close() {
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close().catch(() => undefined);
    }
    this.ctx = null;
  }
}

function TiltCatDifficultyButton({
  children,
  onClick,
  ariaPressed,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaPressed?: boolean;
  className?: string;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();
  return (
    <button
      type="button"
      aria-pressed={ariaPressed}
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.1);
        MobileHapticsPro.selection();
        onClick();
      }}
      className={`${className ?? ''} will-change-transform transform-(--card-tilt)`}
    >
      {children}
    </button>
  );
}

function TiltCatActionButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();
  return (
    <button
      type="button"
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.12);
        onClick();
      }}
      className={`${className ?? ''} will-change-transform transform-(--card-tilt)`}
    >
      {children}
    </button>
  );
}

const COPY = {
    ko: { title: '고양이 낚시', subtitle: 'Cat Fishing 3D', normal: '보통', hard: '어려움', hell: '헬', caught: '잡은 물고기', time: '시간', best: '최단 기록', win: '다 잡았어요! 🐱', winSub: '오늘 밤 고양이들은 비단잉어 만찬이에요.', hintNormal: '물고기를 탭해서 냥젤리 펀치로 낚아채세요!', hintHard: '조심! 다가가면 파닥거리며 도망가요!', hintHell: '초고속 잉어떼 모드!', again: '다시 하기', same: '같은 연못', sound: '소리', rankS: '👑 전설의 낚시왕 냥이', rankA: '🐟 노련한 강태공 냥이', rankB: '🐾 호기심 많은 아기냥', rankC: '💤 느긋한 낮잠냥' },
    en: { title: 'Cat Fishing', subtitle: 'Cat Fishing 3D', normal: 'Normal', hard: 'Hard', hell: 'Hell', caught: 'Caught', time: 'Time', best: 'Best', win: "Caught 'em all! 🐱", winSub: 'Your kitties feast on 3D Koi tonight.', hintNormal: 'Tap the fish to strike with cat paws!', hintHard: 'Watch out! They dart away!', hintHell: 'Super speed school mode!', again: 'Play Again', same: 'Same pond', sound: 'Sound', rankS: '👑 Master Angler Cat', rankA: '🐟 Expert Fisher Kitty', rankB: '🐾 Playful Kitten', rankC: '💤 Sleepy Cat' },
    ja: { title: 'ねこ釣り 3D', subtitle: 'Cat Fishing 3D', normal: 'ふつう', hard: 'むずかしい', hell: '地獄', caught: '釣った魚', time: '時間', best: '最短記録', win: '全部釣った！ 🐱', winSub: '今夜は猫たちのごちそうです。', hintNormal: '魚をタップして肉球で捕まえよう！', hintHard: '注意！近づくと逃げます！', hintHell: '超高速モード！', again: 'もう一度', same: '同じ池', sound: '音', rankS: '👑 伝説の釣り職人猫', rankA: '🐟 ベテラン太公望猫', rankB: '🐾 好奇心旺盛な子猫', rankC: '💤 お昼寝猫' },
    zh: { title: '猫咪钓鱼 3D', subtitle: 'Cat Fishing 3D', normal: '普通', hard: '困难', hell: '地狱', caught: '已捕获', time: '时间', best: '最快记录', win: '全抓到了！🐱', winSub: '今晚猫咪们有锦鲤大餐了。', hintNormal: '轻触水面用猫爪捞鱼！', hintHard: '小心！游动极快会逃跑！', hintHell: '超高速模式！', again: '再玩一次', same: '同一池塘', sound: '声音', rankS: '👑 钓鱼王者猫', rankA: '🐟 熟练渔夫猫', rankB: '🐾 好奇小猫咪', rankC: '💤 懒洋洋午睡猫' },
    fr: { title: 'Pêche au chat 3D', subtitle: 'Cat Fishing 3D', normal: 'Normal', hard: 'Difficile', hell: 'Enfer', caught: 'Attrapés', time: 'Temps', best: 'Record', win: 'Tous attrapés ! 🐱', winSub: 'Vos chats festoient ce soir.', hintNormal: 'Touchez les poissons pour les attraper !', hintHard: 'Attention ! Ils fuient !', hintHell: 'Mode super vitesse !', again: 'Rejouer', same: 'Même étang', sound: 'Son', rankS: '👑 Roi Pêcheur Félin', rankA: '🐟 Pêcheur Expert', rankB: '🐾 Chaton Joueur', rankC: '💤 Chat Endormi' },
    es: { title: 'Pesca gatuna 3D', subtitle: 'Cat Fishing 3D', normal: 'Normal', hard: 'Difícil', hell: 'Infierno', caught: 'Atrapados', time: 'Tiempo', best: 'Récord', win: '¡Todos atrapados! 🐱', winSub: 'Tus gatitos festejan esta noche.', hintNormal: '¡Toca los peces para atraparlos!', hintHard: '¡Cuidado! ¡Se escapan!', hintHell: '¡Modo super velocidad!', again: 'Jugar otra vez', same: 'Mismo estanque', sound: 'Sonido', rankS: '👑 Gato Pescador Maestro', rankA: '🐟 Gato Experto', rankB: '🐾 Gatito Curioso', rankC: '💤 Gato Perezoso' },
} as const;

export function CatFishing({ locale = 'ko' }: { locale?: string }) {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const prefersReducedMotion = usePrefersReducedMotion();
    const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || 'ko' });

    const [difficulty, setDifficulty] = useState<Difficulty>('normal');
    const [fish, setFish] = useState<FishState[]>([]);
    const [seconds, setSeconds] = useState(0);
    const [best, setBest] = useState<Record<string, number>>({});
    const [muted, setMuted] = useState(() => {
        if (typeof window === 'undefined') return false;
        try {
            return localStorage.getItem('cat_fishing_sound_muted') === 'true';
        } catch {
            return false;
        }
    });

    // 6대 상용 심화 시스템 상태 (퀘스트, 로어, 메타 강화, 얼음 레이저)
    const [quests, setQuests] = useState<CatFishingQuest[]>(loadCatFishingQuests);
    const [metaSave, setMetaSave] = useState<CatFishingMetaSave>(loadCatFishingMeta);
    const metaMods = useMemo(() => computeCatFishingModifiers(metaSave), [metaSave]);
    const [freezeChargesRemaining, setFreezeChargesRemaining] = useState<number>(() => metaMods.freezeCharges);
    const [isFrozen, setIsFrozen] = useState(false);
    const [loreDialogue, setLoreDialogue] = useState<CatFishingDialogue>(() => pickCatFishingDialogue("pond_start"));
    const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
    const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

    // 퀘스트 진척도 갱신
    const updateQuestProgress = useCallback((questId: string, delta: number, isAbsolute = false) => {
        setQuests((prev) => {
            const next = prev.map((q) => {
                if (q.id !== questId) return q;
                const newProg = isAbsolute ? delta : q.progress + delta;
                return {
                    ...q,
                    progress: Math.min(q.maxProgress, Math.max(q.progress, newProg)),
                };
            });
            saveCatFishingQuests(next);
            return next;
        });
    }, []);

    // 퀘스트 보상 수령
    const handleClaimQuest = useCallback((questId: string) => {
        const q = quests.find((item) => item.id === questId);
        if (!q || q.isClaimed || q.progress < q.maxProgress) return;

        setQuests((prev) => {
            const next = prev.map((item) => (item.id === questId ? { ...item, isClaimed: true } : item));
            saveCatFishingQuests(next);
            return next;
        });

        setMetaSave((prev) => {
            const next = {
                ...prev,
                walletChuru: prev.walletChuru + q.rewardChuru,
            };
            saveCatFishingMeta(next);
            return next;
        });

        MobileHapticsPro.success();
    }, [quests]);

    // 연구소 영구 업그레이드
    const handleBuyUpgrade = useCallback((upgradeId: string) => {
        const def = CAT_UPGRADES.find((u) => u.id === upgradeId);
        if (!def) return;
        const currentLv = metaSave.upgradeLevels[upgradeId] || 0;
        if (currentLv >= def.maxLevel) return;
        const cost = getCatUpgradeCost(def, currentLv);
        if (metaSave.walletChuru < cost) return;

        setMetaSave((prev) => {
            const next = {
                ...prev,
                walletChuru: prev.walletChuru - cost,
                upgradeLevels: {
                    ...prev.upgradeLevels,
                    [upgradeId]: currentLv + 1,
                },
            };
            saveCatFishingMeta(next);
            return next;
        });

        MobileHapticsPro.medium();
    }, [metaSave]);

    // 얼음 레이저 포인터 발동 (모든 물고기 3초간 정지)
    const handleFreezeLaser = useCallback(() => {
        if (freezeChargesRemaining <= 0 || isFrozen) return;
        setFreezeChargesRemaining((prev) => prev - 1);
        setIsFrozen(true);
        MobileHapticsPro.heavy();
        if (containerRef?.current) {
            celebrate(containerRef.current, { preset: "shards", scale: 1.2 });
        }
        setTimeout(() => {
            setIsFrozen(false);
        }, 3000);
    }, [freezeChargesRemaining, isFrozen, containerRef]);

    useEffect(() => {
        try {
            localStorage.setItem('cat_fishing_sound_muted', String(muted));
        } catch {}
    }, [muted]);

    const audio = useRef<CatFishingAudio | null>(null);
    useEffect(() => {
        audio.current = new CatFishingAudio(muted);
        return () => {
            audio.current?.close();
            audio.current = null;
        };
    }, []);
    useEffect(() => {
        if (audio.current) audio.current.muted = muted;
    }, [muted]);

    const started = useRef(false);
    const startedAt = useRef<number | null>(null);
    const areaRef = useRef<HTMLDivElement>(null);
    const pointer = useRef({ x: -1000, y: -1000 });
    const seedRef = useRef(1);
    const rngRef = useRef(mulberry32(1));
    const fishRef = useRef(fish);
    fishRef.current = fish;
    const fishNodes = useRef(new Map<number, HTMLButtonElement>());

    // Visual ripple and paw strike particles
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
    const [strikes, setStrikes] = useState<{ id: number; x: number; y: number }[]>([]);
    const fxId = useRef(0);

    const remaining = fish.filter((f) => !f.caught).length;
    const won = fish.length > 0 && remaining === 0;

    useEffect(() => {
        const seed = typeof crypto !== 'undefined' ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now();
        seedRef.current = seed;
        rngRef.current = mulberry32(seed);
        setFish(createFishFromSeed(CONFIGS.normal.fishCount, CONFIGS.normal.baseSpeed, seed));
        try {
            const stored = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
            if (stored && typeof stored === 'object') setBest(stored);
        } catch {}
    }, []);

    // Timer loop
    useEffect(() => {
        if (won || !started.current) return;
        const id = setInterval(() => setSeconds(elapsedSeconds(startedAt.current, performance.now())), 100);
        return () => clearInterval(id);
    }, [won, remaining]);

    // Fish swimming movement loop with heading rotation
    useEffect(() => {
        if (won || isFrozen) return;
        const cfg = CONFIGS[difficulty];
        const slowedCfg = { ...cfg, baseSpeed: cfg.baseSpeed * metaMods.catnipSlowMult };
        const loop = createDeltaLoop((deltaSeconds) => {
            const next = fishRef.current.map((f) => stepFish(f, slowedCfg, pointer.current, deltaSeconds * 60, rngRef.current));
            fishRef.current = next;
            for (const f of next) {
                const node = fishNodes.current.get(f.id);
                if (!node || f.caught) continue;
                node.style.left = `${f.x}%`;
                node.style.top = `${f.y}%`;
                // Natural swimming orientation based on velocity
                const angle = Math.atan2(f.vy, f.vx) * (180 / Math.PI);
                node.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
            }
        });
        loop.start();
        return () => loop.stop();
    }, [difficulty, won, isFrozen, metaMods.catnipSlowMult]);

    const trackPointer = (clientX: number, clientY: number) => {
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return;
        pointer.current = {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100,
        };
    };

    const handlePondTap = (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        audio.current?.playWaterPlop();
        const rid = fxId.current++;
        setRipples((prev) => [...prev, { id: rid, x, y }]);
        setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== rid)), 650);
    };

    const [shareCardCopied, setShareCardCopied] = useState(false);

    const getRankTitle = (sec: number) => {
        if (sec < 9) return t.rankS;
        if (sec < 16) return t.rankA;
        if (sec < 26) return t.rankB;
        return t.rankC;
    };

    const handleShareCard = useCallback(async () => {
        try {
            const canvas = createShareCardCanvas({
                title: t.title,
                subtitle: `${t.win} · ${getRankTitle(seconds)}`,
                score: formatElapsed(seconds),
                slug: 'cat-fishing',
                customStats: [
                    { label: 'DIFFICULTY', value: t[difficulty] },
                    { label: 'FISH', value: `${CONFIGS[difficulty].fishCount}` },
                    { label: 'BEST', value: best[difficulty] !== undefined ? formatElapsed(best[difficulty]) : formatElapsed(seconds) },
                ],
            });
            const success = await copyShareCardToClipboard(canvas);
            if (success) {
                setShareCardCopied(true);
                setTimeout(() => setShareCardCopied(false), 2000);
            } else {
                downloadShareCard(canvas, `cat-fishing-${difficulty}.png`);
            }
        } catch {}
    }, [best, difficulty, seconds, t]);

    const catchFish = (id: number, e: React.PointerEvent) => {
        e.stopPropagation();
        if (won) return;
        started.current = true;
        if (startedAt.current === null) startedAt.current = performance.now();

        const caughtAt = fishRef.current.find((f) => f.id === id);
        if (caughtAt && !prefersReducedMotion) {
            const sid = fxId.current++;
            setStrikes((prev) => [...prev, { id: sid, x: caughtAt.x, y: caughtAt.y }]);
            setTimeout(() => setStrikes((prev) => prev.filter((s) => s.id !== sid)), 550);
        }

        // 6대 심화 시스템: 퀘스트 & 츄르 재화 적립
        updateQuestProgress("quest_first_catch", 1, false);
        updateQuestProgress("quest_grand_master", 1, false);
        const churuGained = Math.round(15 * metaMods.churuYieldMult);
        setMetaSave((s) => {
            const nextSave = {
                ...s,
                walletChuru: s.walletChuru + churuGained,
                totalFishCaught: s.totalFishCaught + 1,
            };
            saveCatFishingMeta(nextSave);
            return nextSave;
        });

        setFish((prev) => {
            const next = catchFishAt(prev, id);
            if (allCaught(next)) {
                MobileHapticsPro.success();
                audio.current?.playVictory();
                if (containerRef.current) {
                    celebrate(containerRef.current, { preset: "stardust" });
                }

                // 승리 퀘스트 판정
                if (seconds <= 12) {
                    updateQuestProgress("quest_speed_paws", 1, true);
                }
                if (difficulty === "hard" || difficulty === "hell") {
                    updateQuestProgress("quest_hard_tangle", 1, true);
                }
                setLoreDialogue(pickCatFishingDialogue("pond_cleared"));

                const bonusChuru = Math.round(50 * metaMods.victoryBonusMult);
                setMetaSave((s) => {
                    const nextSave = {
                        ...s,
                        walletChuru: s.walletChuru + bonusChuru,
                        totalPondsCleared: s.totalPondsCleared + 1,
                    };
                    saveCatFishingMeta(nextSave);
                    return nextSave;
                });

                setBest((b) => {
                    if (b[difficulty] !== undefined && b[difficulty] <= seconds) return b;
                    const nb = { ...b, [difficulty]: seconds };
                    try { localStorage.setItem(BEST_KEY, JSON.stringify(nb)); } catch {}
                    return nb;
                });
            } else {
                MobileHapticsPro.heavy();
                audio.current?.playCatchSplash();
                setLoreDialogue(pickCatFishingDialogue("paw_catch"));
            }
            return next;
        });
    };

    const restart = useCallback((diff: Difficulty = difficulty, seedOverride?: number) => {
        const cfg = CONFIGS[diff];
        const seed = seedOverride ?? (typeof crypto !== 'undefined' ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now());
        seedRef.current = seed;
        rngRef.current = mulberry32(seed);
        setDifficulty(diff);
        setFish(createFishFromSeed(cfg.fishCount, cfg.baseSpeed, seed));
        setSeconds(0);
        started.current = false;
        startedAt.current = null;
        setFreezeChargesRemaining(metaMods.freezeCharges);
        setIsFrozen(false);
        setLoreDialogue(pickCatFishingDialogue("pond_start"));
    }, [difficulty, metaMods.freezeCharges]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                void togglePortal();
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                setMuted((v) => !v);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePortal]);

    const hint = difficulty === 'normal' ? t.hintNormal : difficulty === 'hard' ? t.hintHard : t.hintHell;

    return (
        <div
            ref={containerRef}
            className={`relative w-full transition-all duration-300 ${
                isImmersive ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-y-auto p-4' : ''
            }`}
        >
            {/* 상단 통신 대사 HUD 바 */}
            <div className="w-full max-w-xl mx-auto mb-2 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs">
                <span className="text-base select-none" aria-hidden="true">
                    {loreDialogue.avatar}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-primary">{loreDialogue.name[locale] || loreDialogue.name.ko}</span>
                        <span className="text-muted-foreground text-xs opacity-75">
                            • {loreDialogue.title[locale] || loreDialogue.title.ko}
                        </span>
                    </div>
                    <p className="truncate text-foreground text-xs">{loreDialogue.text[locale] || loreDialogue.text.ko}</p>
                </div>
            </div>

            <div className="w-full max-w-xl mx-auto mb-2 flex flex-wrap items-center justify-end gap-1.5 px-1">
                {/* 비상 얼음 레이저 버튼 */}
                {freezeChargesRemaining > 0 && !won && (
                    <button
                        type="button"
                        onClick={handleFreezeLaser}
                        disabled={isFrozen}
                        className={`flex min-h-11 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                            isFrozen
                                ? "border-chart-4 bg-chart-4/20 text-chart-4"
                                : "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                        }`}
                        title="Freeze Laser (3s pause)"
                    >
                        <ShieldAlert className="h-4 w-4" />
                        <span>{isFrozen ? "빙결 중!" : `얼음 (${freezeChargesRemaining})`}</span>
                    </button>
                )}

                {/* 퀘스트 지령 버튼 */}
                <button
                    type="button"
                    onClick={() => setIsQuestModalOpen(true)}
                    className="relative flex min-h-11 items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted"
                    title="Quests"
                >
                    <ScrollText className="h-4 w-4 text-primary" />
                    <span className="hidden sm:inline">퀘스트</span>
                    {quests.some((q) => !q.isClaimed && q.progress >= q.maxProgress) && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chart-5 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                        </span>
                    )}
                </button>

                {/* 냥이 낚시터 연구소 버튼 */}
                <button
                    type="button"
                    onClick={() => setIsMetaModalOpen(true)}
                    className="flex min-h-11 items-center gap-1 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs font-bold text-warning hover:bg-warning/20"
                    title="Upgrades"
                >
                    <Wrench className="h-4 w-4 text-warning" />
                    <span>🐟 {metaSave.walletChuru}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setMuted((v) => !v)}
                    className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={muted ? portalLabels.unmute : portalLabels.mute}
                    title={muted ? portalLabels.unmute : portalLabels.mute}
                >
                    {muted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-primary" />}
                    <span className="sr-only">{muted ? portalLabels.unmute : portalLabels.mute}</span>
                </button>
                <button
                    type="button"
                    onClick={togglePortal}
                    className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
                    title={isImmersive ? portalLabels.exit : portalLabels.enter}
                >
                    {isImmersive ? <Minimize2 className="h-4 w-4 text-primary" /> : <Maximize2 className="h-4 w-4" />}
                    <span className="sr-only">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
                </button>
            </div>

            <GameContainer title={t.title} subtitle={t.subtitle} onReset={() => restart()}>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <div className="inline-flex gap-1">
                        {(['normal', 'hard', 'hell'] as Difficulty[]).map((d) => (
                            <TiltCatDifficultyButton
                                key={d}
                                onClick={() => restart(d)}
                                ariaPressed={difficulty === d}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${difficulty === d ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}
                            >
                                {t[d]}
                            </TiltCatDifficultyButton>
                        ))}
                    </div>
                    <div className="ml-auto flex gap-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <span>🐟 {CONFIGS[difficulty].fishCount - remaining}/{CONFIGS[difficulty].fishCount}</span>
                        <span>{t.time}: {formatElapsed(seconds)}</span>
                        {best[difficulty] !== undefined && <span>{t.best}: {formatElapsed(best[difficulty])}</span>}
                    </div>
                </div>

                {/* 2.5D Tranquil Koi Pond with Caustics & Water Ripples */}
                <div
                    ref={areaRef}
                    onPointerDown={handlePondTap}
                    onMouseMove={(e) => trackPointer(e.clientX, e.clientY)}
                    onTouchMove={(e) => trackPointer(e.touches[0].clientX, e.touches[0].clientY)}
                    className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-border/80 bg-gradient-to-b from-accent-foreground/20 via-primary/10 to-accent-foreground/30 shadow-inner cursor-crosshair touch-none select-none"
                    aria-label={t.title}
                >
                    {/* Water Caustics Shimmer Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-screen bg-primary/10 animate-pulse" />

                    {/* Lily Pads Water Decorations */}
                    <div className="absolute top-8 left-6 w-14 h-14 rounded-full bg-primary/25 border-2 border-primary/30 pointer-events-none opacity-60 flex items-center justify-center">
                      <div className="w-1.5 h-6 bg-background/40 transform rotate-45" />
                    </div>
                    <div className="absolute bottom-10 right-8 w-16 h-16 rounded-full bg-primary/25 border-2 border-primary/30 pointer-events-none opacity-60 flex items-center justify-center">
                      <div className="w-2 h-7 bg-background/40 transform -rotate-12" />
                    </div>

                    {/* 3D Fish with Velocity Rotation */}
                    {fish.map((f) => !f.caught && (
                        <button
                            key={f.id}
                            ref={(node) => {
                                if (node) fishNodes.current.set(f.id, node);
                                else fishNodes.current.delete(f.id);
                            }}
                            onPointerDown={(e) => catchFish(f.id, e)}
                            aria-label="catch fish"
                            className="absolute flex min-h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center cursor-pointer transition-transform hover:scale-115 active:scale-95 will-change-transform z-10"
                            style={{
                                left: `${f.x}%`,
                                top: `${f.y}%`,
                                transform: `translate(-50%,-50%) rotate(${Math.atan2(f.vy, f.vx) * (180 / Math.PI)}deg)`,
                            }}
                        >
                            <img
                                src={CAT_FISHING_KOI[f.id % CAT_FISHING_KOI.length]}
                                alt="Koi"
                                draggable={false}
                                className="h-12 w-12 object-contain pointer-events-none select-none drop-shadow-md"
                            />
                        </button>
                    ))}

                    {/* Water Ripples */}
                    {ripples.map((r) => (
                        <span
                            key={r.id}
                            aria-hidden="true"
                            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/60 animate-ping w-12 h-12"
                            style={{ left: `${r.x}%`, top: `${r.y}%` }}
                        />
                    ))}

                    {/* 3D Cat Paw Strike Effect */}
                    {strikes.map((s) => (
                        <div
                            key={s.id}
                            aria-hidden="true"
                            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center animate-in zoom-in-75 fade-out duration-500"
                            style={{ left: `${s.x}%`, top: `${s.y}%` }}
                        >
                            <img
                                src={CAT_FISHING_PAW}
                                alt="Paw"
                                className="w-14 h-14 object-contain drop-shadow-xl animate-bounce"
                            />
                            <span className="text-xs font-black text-warning bg-card/90 px-2 py-0.5 rounded-full border border-border shadow-sm mt-1">
                                +1 CAUGHT!
                            </span>
                        </div>
                    ))}

                    {/* Victory Overlay with Cat Master Rank */}
                    {won && (
                        <div
                            className={`absolute inset-0 z-30 bg-background/85 backdrop-blur-md flex flex-col items-center justify-center gap-2 p-6 text-center ${prefersReducedMotion ? '' : 'animate-in fade-in zoom-in-95'}`}
                            role="status"
                            aria-live="polite"
                        >
                            <div className="flex items-center justify-center gap-3 mb-1">
                                <img
                                    src={CAT_FISHING_UI_SPRITES.bobber}
                                    alt="Catnip Bobber"
                                    width={38}
                                    height={38}
                                    className="drop-shadow-sm opacity-90"
                                />
                                <div className="size-16 flex items-center justify-center rounded-2xl bg-primary/20 p-2 shadow-lg">
                                    <img
                                        src={CAT_FISHING_UI_SPRITES.trophy}
                                        alt="Cat Fishing Trophy"
                                        className="size-12 object-contain animate-bounce"
                                        draggable={false}
                                    />
                                </div>
                                <img
                                    src={CAT_FISHING_UI_SPRITES.fish}
                                    alt="Salmon Catch"
                                    width={38}
                                    height={38}
                                    className="drop-shadow-sm opacity-90"
                                />
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black text-primary">{t.win}</h3>
                            <p className="text-sm text-muted-foreground">{t.winSub}</p>
                            
                            {/* Rank Badge */}
                            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-black text-sm my-1">
                                <Trophy className="w-4 h-4 text-warning" />
                                <span>{getRankTitle(seconds)}</span>
                            </div>

                            <p className="text-sm font-bold text-foreground">
                                {t.time}: <span className="font-mono text-lg font-black text-primary">{formatElapsed(seconds)}</span>
                            </p>

                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <TiltCatActionButton
                                    onClick={() => restart()}
                                    className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity text-sm"
                                >
                                    {t.again}
                                </TiltCatActionButton>
                                <TiltCatActionButton
                                    onClick={() => restart(difficulty, seedRef.current)}
                                    className="px-6 py-3 rounded-full border border-border bg-card text-foreground font-bold hover:bg-muted text-sm"
                                >
                                    {t.same}
                                </TiltCatActionButton>
                                <button
                                    type="button"
                                    onClick={handleShareCard}
                                    className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full border border-border bg-card font-bold text-foreground shadow-sm hover:bg-muted text-sm"
                                >
                                    <Share2 className="size-4" />
                                    <span>{shareCardCopied ? (locale === 'ko' ? '복사 완료!' : 'Copied!') : (locale === 'ko' ? '결과 공유' : 'Share Card')}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <p className="mt-3 text-center text-xs text-muted-foreground font-medium">{hint}</p>
            </GameContainer>

            {/* 퀘스트 지령 모달 */}
            {isQuestModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <ScrollText className="h-5 w-5 text-primary" />
                                <h3 className="text-base font-black">냥이 낚시터 일일 의뢰서</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsQuestModalOpen(false)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="my-4 flex flex-col gap-3">
                            {quests.map((q) => {
                                const canClaim = !q.isClaimed && q.progress >= q.maxProgress;
                                return (
                                    <div
                                        key={q.id}
                                        className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3"
                                    >
                                        <div className="flex-1 pr-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-foreground">{q.title[locale] || q.title.ko}</span>
                                                <span className="text-xs font-bold text-warning">+{q.rewardChuru} 🐟</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">{q.desc[locale] || q.desc.ko}</p>
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary transition-all duration-300 w-(--prog-pct)"
                                                        style={{ "--prog-pct": `${Math.min(100, (q.progress / q.maxProgress) * 100)}%` } as React.CSSProperties}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    {q.progress}/{q.maxProgress}
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            {q.isClaimed ? (
                                                <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                                                    수령 완료
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={!canClaim}
                                                    onClick={() => handleClaimQuest(q.id)}
                                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                                        canClaim
                                                            ? "bg-primary text-primary-foreground shadow hover:opacity-90"
                                                            : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                                                    }`}
                                                >
                                                    보상 수령
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* 냥이 낚시터 5대 영구 강화 모달 */}
            {isMetaModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Wrench className="h-5 w-5 text-warning" />
                                <h3 className="text-base font-black">나비 선장의 낚시터 연구소</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 rounded-lg border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
                                    <span>🐟 {metaSave.walletChuru}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsMetaModalOpen(false)}
                                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="my-4 flex max-h-96 flex-col gap-2.5 overflow-y-auto pr-1">
                            {CAT_UPGRADES.map((upg) => {
                                const currentLv = metaSave.upgradeLevels[upg.id] || 0;
                                const isMax = currentLv >= upg.maxLevel;
                                const cost = getCatUpgradeCost(upg, currentLv);
                                const canAfford = !isMax && metaSave.walletChuru >= cost;

                                return (
                                    <div
                                        key={upg.id}
                                        className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl select-none" aria-hidden="true">{upg.icon}</span>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-foreground">{upg.name[locale] || upg.name.ko}</span>
                                                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-semibold text-muted-foreground">
                                                        Lv.{currentLv}/{upg.maxLevel}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">{upg.desc[locale] || upg.desc.ko}</p>
                                            </div>
                                        </div>

                                        <div>
                                            {isMax ? (
                                                <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
                                                    MAX
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={!canAfford}
                                                    onClick={() => handleBuyUpgrade(upg.id)}
                                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 ${
                                                        canAfford
                                                            ? "bg-warning text-warning-foreground shadow hover:opacity-90"
                                                            : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                                                    }`}
                                                >
                                                    <span>강화</span>
                                                    <span className="font-mono">({cost}🐟)</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CatFishing;
