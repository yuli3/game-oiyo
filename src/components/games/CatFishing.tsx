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
    const pondCanvasRef = useRef<HTMLCanvasElement>(null);
    const pointer = useRef({ x: -1000, y: -1000 });
    const seedRef = useRef(1);
    const rngRef = useRef(mulberry32(1));
    const fishRef = useRef(fish);
    fishRef.current = fish;

    const koiImgsRef = useRef<HTMLImageElement[]>([]);
    const pawImgRef = useRef<HTMLImageElement | null>(null);
    const canvasFxRef = useRef<{
        ripples: Array<{ xPct: number; yPct: number; life: number; maxLife: number; rings: number; color: string }>;
        splashes: Array<{ xPct: number; yPct: number; vx: number; vy: number; r: number; life: number; maxLife: number; color: string }>;
        strikes: Array<{ xPct: number; yPct: number; life: number; maxLife: number; angle: number }>;
        floats: Array<{ xPct: number; yPct: number; text: string; life: number; maxLife: number; color: string }>;
    }>({
        ripples: [],
        splashes: [],
        strikes: [],
        floats: [],
    });

    useEffect(() => {
        if (typeof Image === 'undefined') return;
        koiImgsRef.current = CAT_FISHING_KOI.map((src) => {
            const img = new Image();
            img.src = src;
            return img;
        });
        const paw = new Image();
        paw.src = CAT_FISHING_PAW;
        pawImgRef.current = paw;
    }, []);

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

    // Fish swimming movement loop
    useEffect(() => {
        if (won || isFrozen) return;
        const cfg = CONFIGS[difficulty];
        const slowedCfg = { ...cfg, baseSpeed: cfg.baseSpeed * metaMods.catnipSlowMult };
        const loop = createDeltaLoop((deltaSeconds) => {
            const next = fishRef.current.map((f) => stepFish(f, slowedCfg, pointer.current, deltaSeconds * 60, rngRef.current));
            fishRef.current = next;
        });
        loop.start();
        return () => loop.stop();
    }, [difficulty, won, isFrozen, metaMods.catnipSlowMult]);

    // 60fps Canvas Koi Pond Renderer (Water Caustics + Fish + Ripples + Paw Strikes + Splashes)
    useEffect(() => {
        let rafId = 0;
        let lastTime = performance.now();

        const drawFrame = (now: number) => {
            const dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;
            const canvas = pondCanvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const dpr = Math.min(2, window.devicePixelRatio || 1);
                const w = Math.max(1, Math.round(rect.width * dpr));
                const h = Math.max(1, Math.round(rect.height * dpr));
                if (canvas.width !== w || canvas.height !== h) {
                    canvas.width = w;
                    canvas.height = h;
                }
                const ctx = canvas.getContext('2d');
                if (ctx && rect.width > 0 && rect.height > 0) {
                    const cw = rect.width;
                    const ch = rect.height;
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

                    const grad = ctx.createLinearGradient(0, 0, 0, ch);
                    grad.addColorStop(0, isFrozen ? '#0f2942' : '#0b2c3d');
                    grad.addColorStop(0.55, isFrozen ? '#164e63' : '#0f3d52');
                    grad.addColorStop(1, isFrozen ? '#1e3a5f' : '#072230');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, cw, ch);

                    const tSec = now * 0.001;
                    ctx.save();
                    ctx.strokeStyle = isFrozen ? 'rgba(186, 230, 253, 0.14)' : 'rgba(103, 232, 249, 0.10)';
                    ctx.lineWidth = 2;
                    for (let band = 0; band < 4; band++) {
                        ctx.beginPath();
                        const baseY = ch * (0.18 + band * 0.22);
                        for (let x = 0; x <= cw; x += 24) {
                            const y = baseY + Math.sin(x * 0.02 + tSec * 1.4 + band * 1.7) * 10;
                            if (x === 0) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        }
                        ctx.stroke();
                    }
                    ctx.restore();

                    const drawLilyPad = (lx: number, ly: number, radius: number, notchAngle: number) => {
                        ctx.save();
                        ctx.translate(lx, ly);
                        ctx.fillStyle = 'rgba(0,0,0,0.28)';
                        ctx.beginPath();
                        ctx.arc(3, 5, radius, notchAngle + 0.28, notchAngle + Math.PI * 2 - 0.28);
                        ctx.lineTo(3, 5);
                        ctx.closePath();
                        ctx.fill();

                        const padGrad = ctx.createRadialGradient(-radius * 0.2, -radius * 0.2, 2, 0, 0, radius);
                        padGrad.addColorStop(0, '#4ade80');
                        padGrad.addColorStop(1, '#15803d');
                        ctx.fillStyle = padGrad;
                        ctx.beginPath();
                        ctx.arc(0, 0, radius, notchAngle + 0.28, notchAngle + Math.PI * 2 - 0.28);
                        ctx.lineTo(0, 0);
                        ctx.closePath();
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(187, 247, 208, 0.45)';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                        ctx.restore();
                    };
                    drawLilyPad(cw * 0.1, ch * 0.16 + Math.sin(tSec * 1.2) * 2, Math.min(cw, ch) * 0.085, 0.6);
                    drawLilyPad(cw * 0.88, ch * 0.82 + Math.cos(tSec * 1.1) * 2, Math.min(cw, ch) * 0.095, 2.5);

                    const fx = canvasFxRef.current;
                    const nextRipples: typeof fx.ripples = [];
                    for (const r of fx.ripples) {
                        r.life += dt;
                        if (r.life >= r.maxLife) continue;
                        const p = r.life / r.maxLife;
                        const rx = (r.xPct / 100) * cw;
                        const ry = (r.yPct / 100) * ch;
                        for (let ring = 0; ring < r.rings; ring++) {
                            const rp = Math.max(0, p - ring * 0.16);
                            if (rp <= 0) continue;
                            ctx.save();
                            ctx.strokeStyle = r.color;
                            ctx.globalAlpha = (1 - rp) * 0.65;
                            ctx.lineWidth = Math.max(1, 2.5 * (1 - rp));
                            ctx.beginPath();
                            ctx.arc(rx, ry, 8 + rp * 44, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.restore();
                        }
                        nextRipples.push(r);
                    }
                    fx.ripples = nextRipples;

                    for (const f of fishRef.current) {
                        if (f.caught) continue;
                        const fxX = (f.x / 100) * cw;
                        const fxY = (f.y / 100) * ch;
                        const sway = isFrozen ? 0 : Math.sin(tSec * 9 + f.id * 1.7) * 0.08;
                        const angle = Math.atan2(f.vy, f.vx) + sway;
                        const fishSize = Math.max(42, Math.min(60, cw * 0.085));
                        const img = koiImgsRef.current[f.id % Math.max(1, koiImgsRef.current.length)];

                        ctx.save();
                        ctx.translate(fxX + 4, fxY + 8);
                        ctx.rotate(angle);
                        ctx.fillStyle = 'rgba(2, 12, 20, 0.38)';
                        ctx.beginPath();
                        ctx.ellipse(0, 0, fishSize * 0.42, fishSize * 0.2, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();

                        ctx.save();
                        ctx.translate(fxX, fxY);
                        ctx.rotate(angle);
                        if (img && img.complete && img.naturalWidth > 0) {
                            ctx.drawImage(img, -fishSize / 2, -fishSize / 2, fishSize, fishSize);
                        } else {
                            ctx.fillStyle = '#fb923c';
                            ctx.beginPath();
                            ctx.ellipse(0, 0, fishSize * 0.4, fishSize * 0.2, 0, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        if (isFrozen) {
                            ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.arc(0, 0, fishSize * 0.45, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                        ctx.restore();
                    }

                    const nextSplashes: typeof fx.splashes = [];
                    for (const sp of fx.splashes) {
                        sp.life += dt;
                        if (sp.life >= sp.maxLife) continue;
                        sp.vy += 260 * dt;
                        sp.xPct += (sp.vx * dt * 100) / cw;
                        sp.yPct += (sp.vy * dt * 100) / ch;
                        const alpha = 1 - sp.life / sp.maxLife;
                        ctx.save();
                        ctx.globalAlpha = alpha;
                        ctx.fillStyle = sp.color;
                        ctx.beginPath();
                        ctx.arc((sp.xPct / 100) * cw, (sp.yPct / 100) * ch, sp.r, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                        nextSplashes.push(sp);
                    }
                    fx.splashes = nextSplashes;

                    const nextStrikes: typeof fx.strikes = [];
                    for (const st of fx.strikes) {
                        st.life += dt;
                        if (st.life >= st.maxLife) continue;
                        const p = st.life / st.maxLife;
                        const sx = (st.xPct / 100) * cw;
                        const sy = (st.yPct / 100) * ch;
                        const scale = p < 0.25 ? 0.6 + (p / 0.25) * 0.65 : 1.25 - (p - 0.25) * 0.45;
                        const alpha = p > 0.65 ? (1 - p) / 0.35 : 1;
                        ctx.save();
                        ctx.globalAlpha = Math.max(0, alpha);
                        ctx.translate(sx, sy - (1 - Math.min(1, p * 3)) * 28);
                        ctx.rotate(st.angle);
                        ctx.scale(scale, scale);
                        if (pawImgRef.current && pawImgRef.current.complete && pawImgRef.current.naturalWidth > 0) {
                            ctx.drawImage(pawImgRef.current, -28, -28, 56, 56);
                        } else {
                            ctx.fillStyle = '#fef3c7';
                            ctx.beginPath();
                            ctx.arc(0, 0, 18, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.restore();
                        nextStrikes.push(st);
                    }
                    fx.strikes = nextStrikes;

                    const nextFloats: typeof fx.floats = [];
                    for (const fl of fx.floats) {
                        fl.life += dt;
                        if (fl.life >= fl.maxLife) continue;
                        const p = fl.life / fl.maxLife;
                        const x = (fl.xPct / 100) * cw;
                        const y = (fl.yPct / 100) * ch - p * 32;
                        ctx.save();
                        ctx.globalAlpha = 1 - p;
                        ctx.font = '800 13px system-ui, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillStyle = 'rgba(0,0,0,0.55)';
                        ctx.fillText(fl.text, x + 1, y + 1);
                        ctx.fillStyle = fl.color;
                        ctx.fillText(fl.text, x, y);
                        ctx.restore();
                        nextFloats.push(fl);
                    }
                    fx.floats = nextFloats;

                    if (!won && pointer.current.x >= 0 && pointer.current.x <= 100 && pointer.current.y >= 0 && pointer.current.y <= 100) {
                        const px = (pointer.current.x / 100) * cw;
                        const py = (pointer.current.y / 100) * ch;
                        ctx.save();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                        ctx.lineWidth = 1.5;
                        ctx.setLineDash([4, 4]);
                        ctx.beginPath();
                        ctx.arc(px, py, 20, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }
            rafId = window.requestAnimationFrame(drawFrame);
        };

        rafId = window.requestAnimationFrame(drawFrame);
        return () => {
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, [isFrozen, won]);

    const trackPointer = (clientX: number, clientY: number) => {
        const rect = pondCanvasRef.current?.getBoundingClientRect() ?? areaRef.current?.getBoundingClientRect();
        if (!rect) return;
        pointer.current = {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100,
        };
    };

    const spawnPondFx = (xPct: number, yPct: number, isHit: boolean) => {
        const fx = canvasFxRef.current;
        fx.ripples.push({
            xPct,
            yPct,
            life: 0,
            maxLife: isHit ? 0.7 : 0.55,
            rings: isHit ? 3 : 2,
            color: isHit ? '#fde047' : '#bae6fd',
        });
        const dropCount = isHit ? 16 : 7;
        for (let i = 0; i < dropCount; i++) {
            const angle = -Math.PI + Math.random() * Math.PI * 2;
            const spd = (isHit ? 70 : 35) + Math.random() * (isHit ? 120 : 50);
            fx.splashes.push({
                xPct,
                yPct,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - (isHit ? 80 : 35),
                r: isHit ? 2.2 + Math.random() * 2.5 : 1.5 + Math.random() * 1.8,
                life: 0,
                maxLife: 0.35 + Math.random() * 0.25,
                color: i % 3 === 0 ? '#ffffff' : isHit ? '#bae6fd' : '#7dd3fc',
            });
        }
        if (isHit && !prefersReducedMotion) {
            fx.strikes.push({
                xPct,
                yPct,
                life: 0,
                maxLife: 0.45,
                angle: (Math.random() - 0.5) * 0.6,
            });
            fx.floats.push({
                xPct,
                yPct: yPct - 4,
                text: '+1 CAUGHT!',
                life: 0,
                maxLife: 0.65,
                color: '#fde047',
            });
        }
    };

    const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (won) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;
        pointer.current = { x: xPct, y: yPct };

        const hitRadiusPct = 9.5;
        let hitFish: FishState | null = null;
        let bestDist = Infinity;
        for (const f of fishRef.current) {
            if (f.caught) continue;
            const dx = f.x - xPct;
            const dy = (f.y - yPct) * 0.75;
            const d = Math.hypot(dx, dy);
            if (d <= hitRadiusPct && d < bestDist) {
                bestDist = d;
                hitFish = f;
            }
        }

        if (hitFish) {
            catchFishById(hitFish.id);
        } else {
            audio.current?.playWaterPlop();
            spawnPondFx(xPct, yPct, false);
        }
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

    const catchFishById = (id: number) => {
        if (won) return;
        started.current = true;
        if (startedAt.current === null) startedAt.current = performance.now();

        const caughtAt = fishRef.current.find((f) => f.id === id);
        if (caughtAt) {
            spawnPondFx(caughtAt.x, caughtAt.y, true);
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

                {/* 60fps Canvas Koi Pond */}
                <div
                    ref={areaRef}
                    className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-border/80 shadow-inner touch-none select-none"
                    aria-label={t.title}
                >
                    <canvas
                        ref={pondCanvasRef}
                        onPointerDown={handleCanvasPointerDown}
                        onPointerMove={(e) => trackPointer(e.clientX, e.clientY)}
                        onPointerLeave={() => { pointer.current = { x: -1000, y: -1000 }; }}
                        className="block h-full w-full cursor-crosshair touch-none"
                    />

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
