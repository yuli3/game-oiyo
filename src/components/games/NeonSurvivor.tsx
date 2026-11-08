import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Sparkles, Shield, Zap, Target, Rocket } from 'lucide-react';
import { celebrate } from "../../lib/games/celebration";
import {
  type NeonSurvivorState,
  type UpgradeCard,
  EVOLUTION_RECIPES,
  UPGRADE_CATALOG,
  createInitialNeonSurvivorState,
  updateNeonSurvivor,
  selectUpgrade,
} from '../../lib/games/neon-survivor';
import {
  loadMetaState,
  saveMetaState,
  purchaseMetaUpgrade,
  META_UPGRADE_DEFS,
  type PlayerMetaState,
} from '../../lib/games/neon-survivor-meta';
import {
  createInitialQuests,
  updateQuestsOnKill,
  updateQuestsOnTime,
  updateQuestsOnEvolution,
  updateQuestsOnBossDefeat,
  type Quest,
} from '../../lib/games/neon-survivor-quests';
import {
  getTriggeredLore,
  type LoreEntry,
} from '../../lib/games/neon-survivor-lore';
import { nativeHaptics } from '../../lib/haptics/native-bridge';
import {
  MobileHapticsPro,
  getSharedAudioContext,
  playProceduralSfx,
  playComboSfx,
} from '../../lib/games/engine-suite-unified';
import type { Locale } from '../../lib/i18n';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { ArcadeTouchControls } from '../ui/game/ArcadeTouchControls';

export interface JoystickVector {
  x: number;
  y: number;
  magnitude: number;
  angle: number;
  knobDistance: number;
}
import { CameraShake2D, HitStopController } from '../../lib/games/game-juice';
import { loadHighScore, saveHighScore } from '../../lib/games/game-save';
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from '../../lib/games/share-card';

interface Props {
  locale?: Locale;
}

interface NeonSurvivorSprites {
  player: HTMLImageElement | null;
  scout: HTMLImageElement | null;
  brute: HTMLImageElement | null;
  boss: HTMLImageElement | null;
  gem: HTMLImageElement | null;
}

const drawRoundRect = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, w, h, r);
  } else {
    c.rect(x, y, w, h);
  }
};

const COPY = {
  ko: {
    title: '네온 서바이버',
    subtitle: '100% 캔버스 기반 네온 로그라이크 서바이벌',
    time: '생존 시간',
    kills: '격추 수',
    score: '점수',
    level: '레벨',
    levelup: '⚡ 시스템 오버클럭 — 업그레이드 선택',
    gameover: '신호 두절 — 기체 파괴',
    restart: '다시 출격 (RETRY)',
    soundOn: '소리 켜기',
    soundOff: '소리 끄기',
    controlsHint: '모바일: 터치 드래그 가상 조이스틱 · PC: WASD / 방향키 이동 (자동 사격)',
    evoGuide: '진화 도감',
    evoGuideDesc: '기본 무기 5레벨 + 보조 장비 1레벨 달성 시 초진화 해금',
    close: '닫기',
    ready: '진화 가능!',
    evolved: '진화 완료',
    hangar: '⚡ 연구소 (격납고)',
    hangarDesc: '모은 네온 코어로 기체 성능을 영구 강화합니다',
    directives: '🎯 지령 (퀘스트)',
    directivesDesc: '전장 목표를 달성하고 네온 코어를 획득하십시오',
    crystals: '네온 코어',
    upgradeSuccess: '강화 완료!',
    maxLevel: '최대 레벨',
    cost: '비용',
  },
  en: {
    title: 'Neon Survivor',
    subtitle: '100% Canvas Horde Survival Roguelite',
    time: 'Time',
    kills: 'Kills',
    score: 'Score',
    level: 'Level',
    levelup: '⚡ System Overclock — Choose Upgrade',
    gameover: 'Signal Lost — Hull Destroyed',
    restart: 'Deploy Again (RETRY)',
    soundOn: 'Unmute',
    soundOff: 'Mute',
    controlsHint: 'Mobile: Touch-drag virtual joystick · PC: WASD / Arrow keys (Auto-attack)',
    evoGuide: 'Evo Guide',
    evoGuideDesc: 'Reach Base Weapon Lv.5 + Support Gear Lv.1 to unlock',
    close: 'Close',
    ready: 'Ready!',
    evolved: 'Evolved',
    hangar: '⚡ Hangar Research',
    hangarDesc: 'Permanently upgrade your ship stats with Neon Crystals',
    directives: '🎯 Directives',
    directivesDesc: 'Complete combat directives to earn permanent crystals',
    crystals: 'Neon Crystals',
    upgradeSuccess: 'Upgraded!',
    maxLevel: 'MAX',
    cost: 'Cost',
  },
  ja: {
    title: 'ネオン・サバイバー',
    subtitle: '100%キャンバス高速ローグライクサバイバル',
    time: '生存時間',
    kills: '撃破数',
    score: 'スコア',
    level: 'レベル',
    levelup: '⚡ システムオーバークロック — アップグレード選択',
    gameover: '通信途絶 — 機体大破',
    restart: '再出撃 (RETRY)',
    soundOn: '消音解除',
    soundOff: '消音',
    controlsHint: 'モバイル: タッチドラッグ仮想ジョイスティック · PC: WASD / 矢印キー移動 (自動射撃)',
    evoGuide: '進化図鑑',
    evoGuideDesc: '基本武器Lv.5＋補助装備Lv.1で超進化解放',
    close: '閉じる',
    ready: '進化可能！',
    evolved: '進化完了',
    hangar: '⚡ 格納庫研究所',
    hangarDesc: 'ネオンクリスタルで機体性能を永続強化',
    directives: '🎯 作戦指令',
    directivesDesc: '作戦目標を達成してクリスタルを獲得',
    crystals: 'ネオンクリスタル',
    upgradeSuccess: '強化完了！',
    maxLevel: '最大',
    cost: '費用',
  },
  zh: {
    title: '霓虹幸存者',
    subtitle: '100% Canvas 无限割草肉鸽幸存者',
    time: '存活时间',
    kills: '击破数',
    score: '分数',
    level: '等级',
    levelup: '⚡ 系统超频 — 选择升级模块',
    gameover: '信号中断 — 机体损毁',
    restart: '重新出击 (RETRY)',
    soundOn: '开启声音',
    soundOff: '静音',
    controlsHint: '手机: 触摸拖动虚拟摇杆 · 电脑: WASD / 方向键移动 (自动攻击)',
    evoGuide: '进化图鉴',
    evoGuideDesc: '基础武器Lv.5 + 辅助装备Lv.1 解锁终极进化',
    close: '关闭',
    ready: '可进化！',
    evolved: '已进化',
    hangar: '⚡ 机库研究所',
    hangarDesc: '使用霓虹核心永久强化机体各项机能',
    directives: '🎯 作战指令',
    directivesDesc: '达成战场目标并获取霓虹核心',
    crystals: '霓虹核心',
    upgradeSuccess: '强化成功！',
    maxLevel: '满级',
    cost: '消耗',
  },
  fr: {
    title: 'Neon Survivor',
    subtitle: 'Jeu de survie en horde 100 % Canvas',
    time: 'Temps',
    kills: 'Ennemis',
    score: 'Score',
    level: 'Niveau',
    levelup: '⚡ Surcadençage — Choisissez une amélioration',
    gameover: 'Signal perdu — Vaisseau détruit',
    restart: 'Redéployer (RETRY)',
    soundOn: 'Activer le son',
    soundOff: 'Couper le son',
    controlsHint: 'Mobile : Joystick virtuel tactile · PC : WASD / Flèches (Tir automatique)',
    evoGuide: 'Guide Évo',
    evoGuideDesc: 'Arme Niv.5 + Équipement Niv.1 pour débloquer',
    close: 'Fermer',
    ready: 'Prêt !',
    evolved: 'Évolué',
    hangar: '⚡ Hangar de Recherche',
    hangarDesc: 'Améliorez définitivement votre vaisseau avec les Cristaux',
    directives: '🎯 Directives',
    directivesDesc: 'Remplissez les objectifs pour gagner des cristaux',
    crystals: 'Cristaux Néon',
    upgradeSuccess: 'Amélioré !',
    maxLevel: 'MAX',
    cost: 'Coût',
  },
  es: {
    title: 'Neon Survivor',
    subtitle: 'Juego de supervivencia de hordas 100% Canvas',
    time: 'Tiempo',
    kills: 'Bajas',
    score: 'Puntos',
    level: 'Nivel',
    levelup: '⚡ Sobrerreloj del sistema — Elige mejora',
    gameover: 'Señal perdida — Casco destruido',
    restart: 'Desplegar de nuevo (RETRY)',
    soundOn: 'Activar sonido',
    soundOff: 'Silenciar',
    controlsHint: 'Móvil: Joystick virtual táctil · PC: WASD / Flechas (Disparo automático)',
    evoGuide: 'Guía Évo',
    evoGuideDesc: 'Arma Nivel 5 + Equipo Nivel 1 para desbloquear',
    close: 'Cerrar',
    ready: '¡Listo!',
    evolved: 'Evolucionado',
    hangar: '⚡ Hangar de Investigación',
    hangarDesc: 'Mejora tu nave de forma permanente con Cristales de Neón',
    directives: '🎯 Directivas',
    directivesDesc: 'Cumple objetivos para ganar cristales permanentes',
    crystals: 'Cristales Neón',
    upgradeSuccess: '¡Mejorado!',
    maxLevel: 'MÁX',
    cost: 'Coste',
  },
};

export default function NeonSurvivor({ locale = 'ko' }: Props) {
  const t = COPY[locale] ?? COPY.en;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<'briefing' | 'playing'>('briefing');
  const touchOriginRef = useRef<{ id: number; x: number; y: number } | null>(null);

  // Meta Progression State
  const [metaState, setMetaState] = useState<PlayerMetaState>(() => loadMetaState());
  const [showHangar, setShowHangar] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [quests, setQuests] = useState<Quest[]>(() => createInitialQuests());
  const [activeLore, setActiveLore] = useState<LoreEntry | null>(null);
  const triggeredLoreIds = useRef<Set<string>>(new Set());

  const [gameState, setGameState] = useState<NeonSurvivorState>(() =>
    createInitialNeonSurvivorState(metaState.upgrades)
  );
  const [highScore, setHighScore] = useState(() => loadHighScore('neon-survivor', 0));
  const stateRef = useRef<NeonSurvivorState>(gameState);
  stateRef.current = gameState;

  // Evolution Guide Modal State
  const [showEvoGuide, setShowEvoGuide] = useState(false);
  const [isEndless, setIsEndless] = useState(false);
  const showEvoGuideRef = useRef(false);
  const [shareCardCopied, setShareCardCopied] = useState(false);
  useEffect(() => {
    showEvoGuideRef.current = showEvoGuide;
  }, [showEvoGuide]);

  // Sound Synthesizer
  const spritesRef = useRef<NeonSurvivorSprites>({
    player: null,
    scout: null,
    brute: null,
    boss: null,
    gem: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => {
          if (src.endsWith('.webp')) {
            const fallback = new Image();
            fallback.src = src.replace('.webp', '.png');
            fallback.onload = () => resolve(fallback);
          }
        };
      });

    void Promise.all([
      loadImg('/assets/sprites/neon-survivor/player-ship-128.webp').then((img) => {
        spritesRef.current.player = img;
      }),
      loadImg('/assets/sprites/neon-survivor/enemy-scout-128.webp').then((img) => {
        spritesRef.current.scout = img;
      }),
      loadImg('/assets/sprites/neon-survivor/enemy-brute-128.webp').then((img) => {
        spritesRef.current.brute = img;
      }),
      loadImg('/assets/sprites/neon-survivor/enemy-boss-256.webp').then((img) => {
        spritesRef.current.boss = img;
      }),
      loadImg('/assets/sprites/common/gem-blue-64.webp').then((img) => {
        spritesRef.current.gem = img;
      }),
    ]);
  }, []);

  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const getAudioContext = useCallback(() => {
    return getSharedAudioContext();
  }, []);

  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({
    locale,
    onEnter: () => {
      void getAudioContext();
    },
  });

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  }, []);

  const playZapSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playProceduralSfx(ctx, 'laser');
  }, [getAudioContext]);

  const playGemSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playComboSfx(ctx, 'gem', stateRef.current?.player.exp ?? 0);
  }, [getAudioContext]);

  const playLevelUpSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playProceduralSfx(ctx, 'powerup');
  }, [getAudioContext]);

  const playHitSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playProceduralSfx(ctx, 'hit');
  }, [getAudioContext]);

  const playBossSirenSound = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.linearRampToValueAtTime(720, now + 0.2);
    osc.frequency.linearRampToValueAtTime(360, now + 0.4);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }, [getAudioContext]);

  // Input state
  const inputVectorRef = useRef({ x: 0, y: 0 });
  const joystickVectorRef = useRef<JoystickVector>({ x: 0, y: 0, magnitude: 0, angle: 0, knobDistance: 0 });
  const shakeRef = useRef(0);
  const cameraShakeRef = useRef(new CameraShake2D());
  const hitStopRef = useRef(new HitStopController());
  const keysDownRef = useRef<Record<string, boolean>>({});

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Level Up sound and vibration
  const prevLevelRef = useRef(gameState.player.level);
  useEffect(() => {
    if (gameState.player.level > prevLevelRef.current) {
      playLevelUpSound();
      vibrate([40, 40, 80]);
    }
    prevLevelRef.current = gameState.player.level;
  }, [gameState.player.level, playLevelUpSound, vibrate]);

  // Main 120fps Game & Canvas Render Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let bulletSoundCooldown = 0;

    const loop = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (phase !== 'playing') {
        animId = requestAnimationFrame(loop);
        return;
      }

      const { isFrozen, effectiveDt } = hitStopRef.current.update(rawDt);
      cameraShakeRef.current.update(rawDt);

      // 1. Calculate keyboard vector
      let kx = 0;
      let ky = 0;
      if (keysDownRef.current['w'] || keysDownRef.current['arrowup']) ky -= 1;
      if (keysDownRef.current['s'] || keysDownRef.current['arrowdown']) ky += 1;
      if (keysDownRef.current['a'] || keysDownRef.current['arrowleft']) kx -= 1;
      if (keysDownRef.current['d'] || keysDownRef.current['arrowright']) kx += 1;

      // Combine with touch joystick
      let activeX = kx;
      let activeY = ky;
      if (joystickVectorRef.current.magnitude > 0) {
        activeX = joystickVectorRef.current.x;
        activeY = joystickVectorRef.current.y;
      }

      inputVectorRef.current = { x: activeX, y: activeY };

      const dt = effectiveDt;

      // 2. Step game state if not paused and not frozen by hit-stop
      if (!isFrozen && !stateRef.current.gameOver && !stateRef.current.levelUpPending && !showEvoGuideRef.current) {
        const prevHp = stateRef.current.player.hp;
        const prevProjCount = stateRef.current.projectiles.length;
        const prevExp = stateRef.current.player.exp;
        const prevLevelUp = stateRef.current.levelUpPending;
        const prevGameOver = stateRef.current.gameOver;
        const prevKills = stateRef.current.kills;
        const next = updateNeonSurvivor(stateRef.current, effectiveDt, inputVectorRef.current);

        // Sound & FX triggers & CoreHaptics
        if (next.player.hp < prevHp) {
          shakeRef.current = 10;
          cameraShakeRef.current.addTrauma(0.5);
          hitStopRef.current.trigger(0.06);
          playHitSound();
          vibrate([60, 40]);
          nativeHaptics.hit();
        }

        if (next.kills >= prevKills + 5) {
          cameraShakeRef.current.addTrauma(0.35);
          hitStopRef.current.trigger(0.03);
        }

        if (next.player.exp > prevExp) {
          playGemSound();
        }

        if (next.levelUpPending && !prevLevelUp) {
          playLevelUpSound();
          nativeHaptics.levelUp();
          celebrate(canvasRef.current, { preset: "sparks", colors: ['#38bdf8', '#10b981', '#f43f5e', '#fbbf24'], origin: { x: 0.5, y: 0.5 }, scale: 0.8 });
        }

        if (next.recentSupplyJackpot) {
          playLevelUpSound();
          nativeHaptics.chest();
          celebrate(canvasRef.current, { preset: "stardust" });
        }

        if (next.gameOver && !prevGameOver) {
          cameraShakeRef.current.addTrauma(0.7);
          hitStopRef.current.trigger(0.1);
          vibrate([100, 50, 100]);
          nativeHaptics.trigger('error');
          saveHighScore('neon-survivor', next.score);
          if (next.score > highScore) {
            setHighScore(next.score);
          }
          if (next.crystals > 0) {
            setMetaState((prev) => {
              const updated = { ...prev, crystals: prev.crystals + next.crystals };
              saveMetaState(updated);
              return updated;
            });
          }
        }

        if ((next.bossWarningTimer ?? 0) > 0 && (stateRef.current.bossWarningTimer ?? 0) <= 0) {
          playBossSirenSound();
          vibrate([100, 50, 100, 50, 100]);
          nativeHaptics.boss();
        }

        bulletSoundCooldown += dt;
        if (next.projectiles.length > prevProjCount && bulletSoundCooldown > 0.15) {
          bulletSoundCooldown = 0;
          playZapSound();
          nativeHaptics.fire();
        }

        // Quests tracking update
        if (next.kills > prevKills) {
          setQuests((q) => updateQuestsOnKill(q, next.kills - prevKills));
        }
        setQuests((q) => updateQuestsOnTime(q, next.survivalTime));

        // Lore Storyline transmission check
        const loreEntry = getTriggeredLore(next.survivalTime, triggeredLoreIds.current);
        if (loreEntry) {
          triggeredLoreIds.current.add(loreEntry.id);
          setActiveLore(loreEntry);
          setTimeout(() => {
            setActiveLore((cur) => (cur?.id === loreEntry.id ? null : cur));
          }, 5500);
        }

        setGameState(next);
      }

      // 3. Render directly onto Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderCanvas(ctx, canvas, stateRef.current);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playHitSound, playZapSound, playGemSound, playLevelUpSound, vibrate, phase]);

  // Canvas drawing function
  const renderCanvas = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, state: NeonSurvivorState) => {
    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;

    if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
      canvas.width = displayW * dpr;
      canvas.height = displayH * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Camera follow player
    const camX = Math.round(state.player.x - displayW / 2);
    const camY = Math.round(state.player.y - displayH / 2);

    // Apply Screen Shake (Trauma^2 & legacy)
    if (cameraShakeRef.current.trauma > 0) {
      ctx.translate(cameraShakeRef.current.x, cameraShakeRef.current.y);
    } else if (shakeRef.current > 0) {
      const shakeMag = shakeRef.current;
      ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
      shakeRef.current = Math.max(0, shakeRef.current - 0.5);
    }

    // Clear background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, displayW, displayH);

    // Draw Cyber Neon Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 64;
    const startGridX = -((camX % gridSize) + gridSize) % gridSize;
    const startGridY = -((camY % gridSize) + gridSize) % gridSize;

    ctx.beginPath();
    for (let x = startGridX; x < displayW; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, displayH);
    }
    for (let y = startGridY; y < displayH; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(displayW, y);
    }
    ctx.stroke();

    // Arena boundary border
    const arenaScreenLeft = 0 - camX;
    const arenaScreenTop = 0 - camY;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(arenaScreenLeft, arenaScreenTop, state.arenaWidth, state.arenaHeight);

    // Draw Gems
    for (const g of state.gems) {
      const gx = g.x - camX;
      const gy = g.y - camY;
      if (gx < -20 || gx > displayW + 20 || gy < -20 || gy > displayH + 20) continue;

      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(state.survivalTime * 2);
      const gemImg = spritesRef.current.gem;
      if (gemImg) {
        ctx.drawImage(gemImg, -9, -9, 18, 18);
      } else {
        ctx.fillStyle = g.color;
        ctx.shadowColor = g.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw Projectiles
    for (const p of state.projectiles) {
      const px = p.x - camX;
      const py = p.y - camY;
      if (px < -20 || px > displayW + 20 || py < -20 || py > displayH + 20) continue;

      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px, py, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Orbit Blades
    const orbitLevel = state.weapons.orbit;
    if (orbitLevel > 0) {
      const bladeCount = orbitLevel + 1;
      const orbitRadius = 75;
      for (let i = 0; i < bladeCount; i++) {
        const bAngle = state.orbitAngle + (i * Math.PI * 2) / bladeCount;
        const bx = state.player.x + Math.cos(bAngle) * orbitRadius - camX;
        const by = state.player.y + Math.sin(bAngle) * orbitRadius - camY;

        ctx.save();
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(bx, by, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 3-Weapon Synergy Orbiting Aura
    const activeWeaponCount = Object.values(state.weapons).filter(v => (v as number) > 0).length;
    if (activeWeaponCount >= 3) {
      const auraAngle = state.survivalTime * 2.5;
      const auraRadius = 45;
      ctx.save();
      ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(state.player.x - camX, state.player.y - camY, auraRadius, 0, Math.PI * 2);
      ctx.stroke();

      const colors = ["#06b6d4", "#a855f7", "#ec4899"];
      for (let i = 0; i < 3; i++) {
        const angle = auraAngle + (i * Math.PI * 2) / 3;
        const ox = state.player.x + Math.cos(angle) * auraRadius - camX;
        const oy = state.player.y + Math.sin(angle) * auraRadius - camY;
        ctx.fillStyle = colors[i];
        ctx.shadowColor = colors[i];
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ox, oy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw Supply Drop Golden Capsules
    if (state.supplyDrops) {
      for (const drop of state.supplyDrops) {
        const dx = drop.x - camX;
        const dy = drop.y - camY;
        if (dx < -40 || dx > displayW + 40 || dy < -40 || dy > displayH + 40) continue;

        ctx.save();
        // Golden Pulsing Beacons
        const pulseR = drop.radius + Math.sin(drop.beaconPulse) * 8 + 4;
        ctx.strokeStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(dx, dy, pulseR, 0, Math.PI * 2);
        ctx.stroke();

        // Capsule Body
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        drawRoundRect(ctx, dx - 12, dy - 12, 24, 24, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📦', dx, dy + 4);

        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('SUPPLY', dx, dy + 22);
        ctx.restore();
      }
    }

    // Draw Enemies
    for (const e of state.enemies) {
      const ex = e.x - camX;
      const ey = e.y - camY;
      if (ex < -40 || ex > displayW + 40 || ey < -40 || ey > displayH + 40) continue;

      ctx.save();
      ctx.translate(ex, ey);
      ctx.fillStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = e.kind === 'boss' ? 20 : 10;

      if (e.kind === 'scout') {
        const faceAngle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
        ctx.rotate(faceAngle);
        const scoutImg = spritesRef.current.scout;
        if (scoutImg) {
          ctx.rotate(-Math.PI / 2);
          const size = e.radius * 2.6;
          ctx.drawImage(scoutImg, -size / 2, -size / 2, size, size);
        } else {
          ctx.beginPath();
          ctx.moveTo(e.radius * 1.2, 0);
          ctx.lineTo(-e.radius, -e.radius * 0.8);
          ctx.lineTo(-e.radius * 0.5, 0);
          ctx.lineTo(-e.radius, e.radius * 0.8);
          ctx.closePath();
          ctx.fill();
        }
      } else if (e.kind === 'swarmer') {
        // Purple Diamond
        ctx.beginPath();
        ctx.moveTo(0, -e.radius);
        ctx.lineTo(e.radius, 0);
        ctx.lineTo(0, e.radius);
        ctx.lineTo(-e.radius, 0);
        ctx.closePath();
        ctx.fill();
      } else if (e.kind === 'brute') {
        const bruteImg = spritesRef.current.brute;
        if (bruteImg) {
          const faceAngle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
          ctx.rotate(faceAngle - Math.PI / 2);
          const size = e.radius * 2.5;
          ctx.drawImage(bruteImg, -size / 2, -size / 2, size, size);
        } else {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            const hx = Math.cos(a) * e.radius;
            const hy = Math.sin(a) * e.radius;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
        }
      } else if (e.kind === 'boss') {
        if (e.isElite) {
          ctx.beginPath();
          ctx.arc(0, 0, e.radius * 1.35 + Math.sin(state.survivalTime * 8) * 4, 0, Math.PI * 2);
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        const bossImg = spritesRef.current.boss;
        if (bossImg) {
          const size = e.radius * 2.8;
          ctx.drawImage(bossImg, -size / 2, -size / 2, size, size);
        } else {
          ctx.beginPath();
          const points = e.isElite ? 10 : 8;
          for (let i = 0; i < points; i++) {
            const r = i % 2 === 0 ? e.radius : e.radius * 0.6;
            const a = (i * Math.PI * 2) / points + state.survivalTime * (e.isElite ? 1.5 : 1);
            const sx = Math.cos(a) * r;
            const sy = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.fill();
        }

        // Boss Floating HP Bar
        const barW = e.radius * 2;
        const barH = 5;
        const barX = -e.radius;
        const barY = -e.radius - 14;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(barX, barY, barW, barH);
        const ratio = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = e.isElite ? '#c084fc' : '#eab308';
        ctx.fillRect(barX, barY, barW * ratio, barH);

        if (e.bossTitle) {
          ctx.font = 'bold 9px ui-monospace, monospace';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(e.bossTitle, 0, barY - 4);
          ctx.textAlign = 'left';
        }
      }

      // Draw Mutation Auras
      if (e.mutation === 'shielded') {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 7, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.mutation === 'speedster') {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.mutation === 'explosive') {
        const flash = Math.sin(state.survivalTime * 12) > 0;
        ctx.strokeStyle = flash ? '#ef4444' : '#f97316';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Draw Player Ship
    const px = state.player.x - camX;
    const py = state.player.y - camY;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(state.player.facing);

    // Thruster exhaust flame
    const isMoving = Math.hypot(state.player.vx, state.player.vy) > 10;
    if (isMoving) {
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(-16, -5);
      ctx.lineTo(-26 - Math.random() * 8, 0);
      ctx.lineTo(-16, 5);
      ctx.closePath();
      ctx.fill();
    }

    // Main Cyber Ship
    const alpha = state.player.invulnTimer > 0 ? (Math.sin(state.survivalTime * 30) > 0 ? 0.4 : 1.0) : 1.0;
    ctx.globalAlpha = alpha;

    const playerImg = spritesRef.current.player;
    if (playerImg) {
      // Generated pointing upwards (-Y), rotate +90deg to point right (+X)
      ctx.rotate(Math.PI / 2);
      const shipSize = 42;
      ctx.drawImage(playerImg, -shipSize / 2, -shipSize / 2, shipSize, shipSize);
    } else {
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-14, -12);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-14, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit neon core
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(2, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Draw Floating Damage Texts
    for (const t of state.floatingTexts) {
      const tx = t.x - camX;
      const ty = t.y - camY;
      ctx.save();
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 6;
      ctx.fillText(t.text, tx, ty);
      ctx.restore();
    }

    // In-Canvas Cyberpunk HUD
    ctx.save();
    // 1. Top EXP Bar
    const expRatio = Math.min(1, state.player.exp / Math.max(1, state.player.nextExp));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, displayW, 6);
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.fillRect(0, 0, displayW * expRatio, 6);

    // 2. Player Status Badge (Top Left)
    const hudY = 16;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    const badgeW = 165;
    const badgeH = 34;
    ctx.beginPath();
    drawRoundRect(ctx, 16, hudY, badgeW, badgeH, 8);
    ctx.fill();
    ctx.stroke();

    // Level text
    ctx.font = 'bold 13px ui-monospace, monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`LV.${state.player.level}`, 24, hudY + 22);

    // HP Bar inside badge
    const hpX = 66;
    const hpY = hudY + 11;
    const hpW = 100;
    const hpH = 12;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.beginPath();
    drawRoundRect(ctx, hpX, hpY, hpW, hpH, 4);
    ctx.fill();

    const hpRatio = Math.max(0, state.player.hp / state.player.maxHp);
    ctx.fillStyle = state.player.hp < 30 ? '#ef4444' : '#10b981';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    drawRoundRect(ctx, hpX, hpY, hpW * hpRatio, hpH, 4);
    ctx.fill();

    // 3. Time & Kills (Top Center / Right)
    const infoW = 150;
    const infoH = 34;
    const infoX = displayW - 16 - infoW - 56; // leave room for sound button
    if (infoX > 190) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      drawRoundRect(ctx, infoX, hudY, infoW, infoH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 12px ui-monospace, monospace';
      ctx.fillStyle = '#ffffff';
      const timeStr = formatTime(state.survivalTime);
      ctx.fillText(`⏱ ${timeStr}`, infoX + 10, hudY + 22);
      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`💀 ${state.kills}`, infoX + 88, hudY + 22);
    }
    ctx.restore();

    // 4. Elite Boss Warning Siren Overlay & HUD
    if (state.bossWarningTimer && state.bossWarningTimer > 0) {
      const flash = Math.sin(state.survivalTime * 24) > 0;
      if (flash) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(0, 0, displayW, displayH);
      }
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fillRect(0, 56, displayW, 32);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚠️ WARNING: ELITE RAID - ${state.activeBossName ?? 'BOSS'} INCOMING ⚠️`, displayW / 2, 77);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  };

  const handleRestart = useCallback(() => {
    setGameState(createInitialNeonSurvivorState(metaState.upgrades));
  }, [metaState.upgrades]);

  const handleBuyUpgrade = (upgradeId: keyof PlayerMetaState['upgrades']) => {
    const res = purchaseMetaUpgrade(metaState, upgradeId);
    if (res.success) {
      setMetaState(res.newState);
      playLevelUpSound();
      nativeHaptics.levelUp();
    }
  };

  const handleCardClick = (cardId: UpgradeCard['id']) => {
    setGameState((s) => selectUpgrade(s, cardId));
    vibrate(25);
    nativeHaptics.trigger('medium');
    if (cardId === 'hyperBlaster' || cardId === 'aegisShield' || cardId === 'supernovaVortex') {
      nativeHaptics.evolution();
      setQuests((q) => updateQuestsOnEvolution(q));
    }
  };

  // Format survival time MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const handleShareCard = useCallback(async () => {
    try {
      const canvas = createShareCardCanvas({
        title: t.title,
        subtitle: 'ARCADE RAID SURVIVOR',
        score: gameState.score,
        durationSeconds: Math.floor(gameState.survivalTime),
        slug: 'neon-survivor',
        qrUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        customStats: [
          { label: 'KILLS', value: gameState.kills },
          { label: 'LEVEL', value: gameState.player.level },
          { label: 'SURVIVED', value: formatTime(gameState.survivalTime) },
        ],
      });
      const success = await copyShareCardToClipboard(canvas);
      if (success) {
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2500);
      } else {
        downloadShareCard(canvas, `oiyo-survivor-${gameState.score}pts.png`);
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  }, [formatTime, gameState.kills, gameState.player.level, gameState.score, gameState.survivalTime, t.title]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (touchOriginRef.current !== null) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // fallback
    }
    const rect = e.currentTarget.getBoundingClientRect();
    touchOriginRef.current = {
      id: e.pointerId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    nativeHaptics.trigger('light');
    MobileHapticsPro.light();
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!touchOriginRef.current || touchOriginRef.current.id !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    const dx = curX - touchOriginRef.current.x;
    const dy = curY - touchOriginRef.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 8) {
      const maxRadius = 60;
      const norm = Math.min(1.0, dist / maxRadius);
      const angle = Math.atan2(dy, dx);
      joystickVectorRef.current = {
        x: Math.cos(angle) * norm,
        y: Math.sin(angle) * norm,
        magnitude: norm,
        angle,
        knobDistance: Math.min(dist, maxRadius),
      };
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (touchOriginRef.current?.id === e.pointerId) {
      touchOriginRef.current = null;
      joystickVectorRef.current = { x: 0, y: 0, magnitude: 0, angle: 0, knobDistance: 0 };
    }
  };

  return (
    <div
      ref={containerRef}
      data-game-surface
      className={
        isImmersive
          ? "fixed inset-0 z-50 w-screen h-dvh bg-black m-0 p-0 rounded-none border-none select-none touch-none flex items-center justify-center overflow-hidden"
          : "relative w-full h-full min-h-145 max-h-220 rounded-none sm:rounded-2xl overflow-hidden border-x-0 sm:border border-border bg-card shadow-2xl select-none touch-none"
      }
    >
      {phase === 'briefing' ? (
        <div className="relative w-full h-full min-h-125 overflow-y-auto bg-card text-foreground p-6 sm:p-10 flex flex-col justify-between">
          <img
            src="/games/grok-20261106/game-keyart-neon-survivor.webp"
            alt="Neon Survivor Key Art"
            className="absolute inset-0 h-full w-full object-cover opacity-20 filter blur-xs pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30 pointer-events-none" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-2 items-center">
            <div>
              <p className="inline-flex items-center gap-2 font-mono text-xs font-black tracking-widest text-primary">
                <span className="size-2 rounded-full bg-primary animate-ping" />
                SECTOR 0 / CYBERPUNK ROGUELIKE
              </p>
              <h2 className="mt-3 text-4xl sm:text-6xl font-black uppercase leading-tight tracking-tight text-foreground">
                {t.title}
              </h2>
              <p className="mt-4 max-w-xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {locale === 'ko'
                  ? '빛나는 사이버 탄막 속을 돌파하세요. 적 기체를 격추해 네온 크리스탈을 흡수하고, 무기를 진화시켜 섹터 0의 수호자를 격파하세요.'
                  : 'Weave through hyper-dense cybernetic bullet swarms. Absorb neon crystals, evolve legendary weapon recipes, and conquer Sector 0.'}
              </p>

              {/* Status Badges */}
              <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowHangar(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-black text-primary hover:bg-primary/20 transition-colors"
                >
                  <span>💎 {metaState.crystals}</span>
                  <span className="text-muted-foreground">· {t.hangar}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuests(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3.5 py-2 text-xs font-black text-foreground hover:bg-muted transition-colors"
                >
                  <span>🎯 {quests.filter((q) => q.completed).length}/{quests.length}</span>
                  <span className="text-muted-foreground">· {t.directives}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEvoGuide(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2 text-xs font-black text-warning hover:bg-warning/20 transition-colors"
                >
                  <span>⚡ {t.evoGuide}</span>
                </button>
              </div>

              {/* Start Button & High Score */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    nativeHaptics.trigger('heavy');
                    MobileHapticsPro.heavy();
                    setGameState(createInitialNeonSurvivorState(metaState.upgrades));
                    setPhase('playing');
                  }}
                  className="min-h-14 rounded-xl bg-primary px-7 py-3 text-sm font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Zap className="size-5 fill-current" />
                  <span>{locale === 'ko' ? '작전 개시' : 'LAUNCH MISSION'}</span>
                </button>

                <span className="inline-flex items-center gap-1.5 border border-border bg-card/60 px-4 py-3 rounded-xl font-mono text-xs">
                  <Target className="size-4 text-primary" />
                  <span>PB: <strong className="text-foreground">{highScore.toLocaleString()}</strong> PTS</span>
                </span>
              </div>
            </div>

            {/* Right Side: Features */}
            <div className="grid gap-2.5">
              <div className="flex gap-3 border-l-2 border-primary bg-card/60 p-4 backdrop-blur-sm rounded-r-xl border border-border">
                <Rocket className="size-5 shrink-0 text-primary mt-0.5" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                    {locale === 'ko' ? '3대 전설 무기 진화' : '3 Legendary Evolutions'}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-normal">
                    {locale === 'ko'
                      ? '하이퍼 블래스터, 이지스 쉴드, 슈퍼노바 볼텍스를 조합하여 전장을 정복하세요.'
                      : 'Combine Hyper Blaster, Aegis Shield, and Supernova Vortex to conquer the swarm.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 border-l-2 border-secondary-foreground/60 bg-card/60 p-4 backdrop-blur-sm rounded-r-xl border border-border">
                <Shield className="size-5 shrink-0 text-secondary-foreground mt-0.5" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                    {locale === 'ko' ? '영구 강화 연구 격납고' : 'Hangar Meta Upgrades'}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-normal">
                    {locale === 'ko'
                      ? '수집한 네온 크리스탈로 기체 내구도, 공격력, 이동 속도를 영구히 강화하세요.'
                      : 'Permanently boost Max HP, Firepower, and Move Speed with crystals.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 border-l-2 border-warning bg-card/60 p-4 backdrop-blur-sm rounded-r-xl border border-border">
                <Sparkles className="size-5 shrink-0 text-warning mt-0.5" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                    {locale === 'ko' ? '정밀 Taptic CoreHaptics' : 'CoreHaptics Taptic Engine'}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-normal">
                    {locale === 'ko'
                      ? '피격, 보스 등장, 레벨업, 초진화마다 손끝에 전해지는 물리적 진동 체감.'
                      : 'Physical haptic vibrations on every hit, evolution, and boss encounter.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Controls Guide */}
          <div className="relative z-10 mt-6 grid gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <strong className="flex items-center gap-1.5 text-foreground">
                🕹️ DESKTOP CONTROLS
              </strong>
              <span className="text-muted-foreground">
                {locale === 'ko' ? 'WASD / 방향키 이동 · 자동 조준 발사 · 스페이스바 부스트' : 'WASD / Arrow keys to move · Auto-aim · Space to dash'}
              </span>
            </div>
            <div>
              <strong className="flex items-center gap-1.5 text-foreground">
                📱 MOBILE & TOUCH
              </strong>
              <span className="text-muted-foreground">
                {locale === 'ko' ? '터치 D-패드 이동 · DASH 회피 · 화면 어디든 직접 드래그 이동' : 'Touch D-Pad · DASH pill · Fluid 360° screen drag'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* 100% Canvas Surface with direct touch & pointer tracking */}
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        className="w-full h-full block cursor-crosshair touch-none select-none"
      />

      {/* Emberdeep-Grade In-Viewport Mobile Touch Controls */}
      {!gameState.levelUpPending && !gameState.gameOver && (
        <ArcadeTouchControls
          showDPad={true}
          onDirection={(dir, active) => {
            if (!active) {
              joystickVectorRef.current = { x: 0, y: 0, magnitude: 0, angle: 0, knobDistance: 0 };
              return;
            }
            switch (dir) {
              case 'up':
                joystickVectorRef.current = { x: 0, y: -1, magnitude: 1, angle: -Math.PI / 2, knobDistance: 60 };
                break;
              case 'down':
                joystickVectorRef.current = { x: 0, y: 1, magnitude: 1, angle: Math.PI / 2, knobDistance: 60 };
                break;
              case 'left':
                joystickVectorRef.current = { x: -1, y: 0, magnitude: 1, angle: Math.PI, knobDistance: 60 };
                break;
              case 'right':
                joystickVectorRef.current = { x: 1, y: 0, magnitude: 1, angle: 0, knobDistance: 60 };
                break;
            }
          }}
          actions={[
            {
              id: 'dash',
              label: 'DASH',
              variant: 'primary',
              icon: <Zap className="size-4" />,
              onPress: () => {
                nativeHaptics.trigger('medium');
                if (stateRef.current) {
                  const baseSpeed = stateRef.current.player.speed;
                  stateRef.current.player.speed = baseSpeed * 1.75;
                  setTimeout(() => {
                    if (stateRef.current) stateRef.current.player.speed = baseSpeed;
                  }, 350);
                }
              },
            },
            {
              id: 'evo',
              label: 'EVO',
              variant: 'info',
              onPress: () => setShowEvoGuide(true),
            },
          ]}
        />
      )}

      {/* Hologram Storyline Operator Lore Banner */}
      {activeLore && (
        <div className="absolute top-16 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-20 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="rounded-xl border border-primary/50 bg-background/90 backdrop-blur-md p-3 shadow-xl flex items-start gap-2.5">
            <span className="text-xl shrink-0 p-1 rounded-lg bg-primary/20">📡</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs font-black text-primary uppercase tracking-wider mb-0.5">
                <span>{activeLore.sender[locale] ?? activeLore.sender.en}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 font-mono">COMMS</span>
              </div>
              <p className="text-xs text-foreground font-semibold leading-relaxed">
                {activeLore.message[locale] ?? activeLore.message.en}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls: Immersion Portal & Sound Mute Toggle */}
      <div className="absolute top-4 right-4 z-10 pointer-events-auto flex items-center gap-1.5">
        {/* Crystal Inventory Badge */}
        <button
          type="button"
          onClick={() => setShowHangar(true)}
          title={t.hangar}
          className="min-h-11 px-2.5 py-2 rounded-xl border border-chart-4/50 bg-background/80 backdrop-blur-md shadow-xs text-xs font-black text-chart-4 hover:bg-background transition-colors flex items-center gap-1"
        >
          <span>💎</span>
          <span>{metaState.crystals + (gameState.crystals || 0)}</span>
        </button>

        {/* Directives Quests Button */}
        <button
          type="button"
          onClick={() => setShowQuests(true)}
          title={t.directives}
          aria-label={t.directives}
          className="min-h-11 px-2.5 py-2 rounded-xl border border-border bg-background/80 backdrop-blur-md shadow-xs text-xs font-black text-foreground hover:bg-background transition-colors flex items-center gap-1"
        >
          <span>🎯</span>
          <span className="hidden sm:inline">{t.directives}</span>
        </button>

        {/* Active Evolutions Strip */}
        {gameState.evolutions.hyperBlaster && (
          <span className="px-2 py-1 rounded-lg border border-chart-4/60 bg-chart-4/20 text-chart-4 font-black text-xs animate-pulse">
            ⚡ HYPER
          </span>
        )}
        {gameState.evolutions.aegisShield && (
          <span className="px-2 py-1 rounded-lg border border-primary/60 bg-primary/20 text-primary font-black text-xs animate-pulse">
            🛡️ AEGIS
          </span>
        )}
        {gameState.evolutions.supernovaVortex && (
          <span className="px-2 py-1 rounded-lg border border-destructive/60 bg-destructive/20 text-destructive font-black text-xs animate-pulse">
            💥 VORTEX
          </span>
        )}

        <button
          type="button"
          onClick={() => setIsEndless((v) => !v)}
          aria-pressed={isEndless}
          title={isEndless ? "15분 무한 서바이벌 활성화" : "기본 서바이벌 모드"}
          className={`min-h-11 px-3 py-2 rounded-xl border backdrop-blur-md shadow-xs text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1.5 ${isEndless ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-background/80 text-foreground hover:bg-background'}`}
        >
          <span>♾️</span>
          <span className="hidden sm:inline">{isEndless ? "15분 무한" : "엔들리스"}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowEvoGuide((v) => !v)}
          aria-expanded={showEvoGuide}
          aria-label={t.evoGuide}
          title={t.evoGuide}
          className="min-h-11 px-3 py-2 rounded-xl border border-border bg-background/80 backdrop-blur-md shadow-xs text-xs font-black text-foreground hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 flex items-center gap-1.5"
        >
          <span>📖</span>
          <span className="hidden sm:inline">{t.evoGuide}</span>
        </button>

        <button
          type="button"
          onClick={togglePortal}
          aria-pressed={isImmersive}
          aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
          title={isImmersive ? portalLabels.exit : portalLabels.enter}
          className="min-h-11 px-3 py-2 rounded-xl border border-border bg-background/80 backdrop-blur-md shadow-xs text-xs font-black text-foreground hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 flex items-center gap-1.5"
        >
          <span className="text-sm">{isImmersive ? '✕' : '⛶'}</span>
          <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
        </button>

        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-pressed={muted}
          aria-label={muted ? t.soundOn : t.soundOff}
          className="min-h-11 px-3 py-2 rounded-xl border border-border bg-background/80 backdrop-blur-md shadow-xs text-xs font-black text-foreground hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-2 left-4 right-4 pointer-events-none text-center hidden sm:block">
        <span className="text-xs font-semibold text-muted-foreground/80 bg-background/70 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-border/50">
          {t.controlsHint}
        </span>
      </div>

      {/* Level-Up Upgrade Cards Modal */}
      {gameState.levelUpPending && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-4 z-20 animate-in fade-in zoom-in-95 duration-150">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="flex items-center justify-between">
              <div className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                {t.levelup}
              </div>
              <button
                type="button"
                onClick={() => setShowEvoGuide(true)}
                className="px-2.5 py-1.5 rounded-xl border border-border bg-muted/60 hover:bg-muted text-xs font-black text-foreground flex items-center gap-1 transition-colors"
              >
                <span>📖</span>
                <span>{t.evoGuide}</span>
              </button>
            </div>

            <div className="grid gap-2.5">
              {gameState.upgradeChoices.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(card.id)}
                  className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center gap-3.5 shadow-md active:scale-98 ${
                    card.isEvolution
                      ? "border-chart-4/90 bg-chart-4/15 hover:bg-chart-4/25 ring-2 ring-chart-4/50 animate-pulse"
                      : "border-border bg-card/95 hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  <span className={`text-3xl shrink-0 p-2 rounded-xl ${card.isEvolution ? "bg-chart-4/20" : "bg-muted/60"}`}>
                    {card.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm text-foreground flex justify-between items-center">
                      <span className={card.isEvolution ? "text-chart-4 font-black" : ""}>
                        {card.title[locale] ?? card.title.en}
                      </span>
                      <span className={`text-xs font-mono font-black ${card.isEvolution ? "text-chart-4 uppercase" : "text-primary"}`}>
                        {card.isEvolution ? "★EVOLVE★" : `LV.${(gameState.weapons[card.id as keyof typeof gameState.weapons] ?? 0) + 1}`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {card.desc[locale] ?? card.desc.en}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState.gameOver && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-6 z-20 animate-in fade-in zoom-in-95 duration-200">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-2xl text-center space-y-4">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-destructive">
              {t.gameover}
            </div>

            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">{t.time}</span>
                <span className="text-base font-black text-foreground font-mono">
                  {formatTime(gameState.survivalTime)}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">{t.kills}</span>
                <span className="text-base font-black text-primary font-mono">
                  {gameState.kills}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">{t.score}</span>
                <span className="text-base font-black text-foreground font-mono">
                  {gameState.score.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Neon Crystal Reward Banner */}
            <div className="p-3 rounded-xl border border-chart-4/50 bg-chart-4/10 flex items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <span className="text-xl">💎</span>
                <div>
                  <div className="text-xs font-bold text-foreground">{t.crystals} 획득</div>
                  <div className="text-xs text-muted-foreground">누적 보관: {metaState.crystals}개</div>
                </div>
              </div>
              <span className="text-base font-mono font-black text-chart-4">
                +{gameState.crystals || 0}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowHangar(true)}
                className="w-full min-h-11 rounded-xl border border-chart-4/60 bg-chart-4/15 shadow-xs text-xs font-black text-chart-4 hover:bg-chart-4/25 transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chart-4"
              >
                <span>⚡</span>
                <span>{t.hangar}</span>
              </button>

              <button
                type="button"
                onClick={handleShareCard}
                className="w-full min-h-11 rounded-xl border border-primary/40 bg-primary/10 shadow-xs text-xs font-black text-primary hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {shareCardCopied ? <Check className="size-4 text-success" /> : <span>🖼️</span>}
                <span>{shareCardCopied ? '카드 복사됨!' : '카드 공유 2.0'}</span>
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t.restart}
              </button>

              <button
                type="button"
                onClick={() => setPhase('briefing')}
                className="w-full py-3 rounded-xl border border-border bg-muted/60 text-foreground font-bold text-xs hover:bg-muted transition-colors"
              >
                {locale === 'ko' ? '격납고 로비 복귀' : 'RETURN TO BRIEFING'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Evolution Guide Modal */}
      {showEvoGuide && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 z-30 animate-in fade-in zoom-in-95 duration-150">
          <div className="max-w-md w-full max-h-full overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="text-left">
                <div className="text-lg font-black text-foreground flex items-center gap-2">
                  <span>📖</span>
                  <span>{t.evoGuide}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.evoGuideDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEvoGuide(false)}
                className="min-h-11 min-w-11 rounded-xl border border-border bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={t.close}
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              {EVOLUTION_RECIPES.map((recipe) => {
                const baseCard = UPGRADE_CATALOG.find((c) => c.id === recipe.baseWeapon);
                const catCard = UPGRADE_CATALOG.find((c) => c.id === recipe.catalyst);
                const isEvolved = gameState.evolutions[recipe.id];
                const baseLv = gameState.weapons[recipe.baseWeapon] ?? 0;
                const catLv = gameState.weapons[recipe.catalyst] ?? 0;
                const isReady = !isEvolved && baseLv >= recipe.requiredBaseLevel && catLv >= 1;

                return (
                  <div
                    key={recipe.id}
                    className={`p-3.5 rounded-xl border text-left space-y-2.5 transition-all ${
                      isEvolved
                        ? 'border-chart-4/80 bg-chart-4/10'
                        : isReady
                        ? 'border-primary/80 bg-primary/10 ring-1 ring-primary/40'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{recipe.icon}</span>
                        <span className="font-black text-sm text-foreground truncate">
                          {recipe.title[locale] ?? recipe.title.en}
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-black shrink-0 ${
                          isEvolved
                            ? 'bg-chart-4/20 text-chart-4 border border-chart-4/40'
                            : isReady
                            ? 'bg-primary/20 text-primary border border-primary/40 animate-pulse'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {isEvolved ? t.evolved : isReady ? t.ready : `${baseLv}/${recipe.requiredBaseLevel}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <div className="flex-1 p-2 rounded-lg bg-background/80 border border-border flex items-center justify-between min-w-0">
                        <span className="truncate flex items-center gap-1">
                          <span>{baseCard?.icon ?? '⚡'}</span>
                          <span className="truncate">{baseCard?.title[locale] ?? baseCard?.title.en}</span>
                        </span>
                        <span className={`font-mono text-xs font-black shrink-0 ml-1 ${baseLv >= recipe.requiredBaseLevel ? 'text-primary' : 'text-muted-foreground'}`}>
                          LV.{baseLv}/{recipe.requiredBaseLevel}
                        </span>
                      </div>
                      <span className="text-muted-foreground font-black">+</span>
                      <div className="flex-1 p-2 rounded-lg bg-background/80 border border-border flex items-center justify-between min-w-0">
                        <span className="truncate flex items-center gap-1">
                          <span>{catCard?.icon ?? '🛡️'}</span>
                          <span className="truncate">{catCard?.title[locale] ?? catCard?.title.en}</span>
                        </span>
                        <span className={`font-mono text-xs font-black shrink-0 ml-1 ${catLv >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                          LV.{catLv}/1
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {recipe.desc[locale] ?? recipe.desc.en}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowEvoGuide(false)}
              className="w-full py-2.5 rounded-xl border border-border bg-muted/60 hover:bg-muted font-black text-xs text-foreground transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Directives Quests Modal */}
      {showQuests && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 z-30 animate-in fade-in zoom-in-95 duration-150">
          <div className="max-w-md w-full max-h-full overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="text-left">
                <div className="text-lg font-black text-foreground flex items-center gap-2">
                  <span>🎯</span>
                  <span>{t.directives}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.directivesDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuests(false)}
                className="min-h-11 min-w-11 rounded-xl border border-border bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={t.close}
              >
                ✕
              </button>
            </div>

            <div className="grid gap-2.5">
              {quests.map((q) => {
                const ratio = Math.min(1, q.progress / q.target);
                return (
                  <div
                    key={q.id}
                    className={`p-3.5 rounded-xl border text-left space-y-2 transition-all ${
                      q.completed
                        ? 'border-chart-4/80 bg-chart-4/10'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{q.icon}</span>
                        <div>
                          <div className="font-black text-sm text-foreground">
                            {q.title[locale] ?? q.title.en}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {q.desc[locale] ?? q.desc.en}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-black text-chart-4">
                          +💎{q.rewardCrystals}
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-black ${
                            q.completed
                              ? 'bg-chart-4/20 text-chart-4'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {q.completed ? '달성 완료!' : `${q.progress}/${q.target}`}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-background/80 overflow-hidden border border-border/50">
                      <div
                        className={`h-full w-(--p-width) transition-all duration-300 ${q.completed ? 'bg-chart-4' : 'bg-primary'}`}
                        style={{ '--p-width': `${Math.round(ratio * 100)}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowQuests(false)}
              className="w-full py-2.5 rounded-xl border border-border bg-muted/60 hover:bg-muted font-black text-xs text-foreground transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Hangar Permanent Meta Upgrades Modal */}
      {showHangar && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 z-30 animate-in fade-in zoom-in-95 duration-150">
          <div className="max-w-md w-full max-h-full overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="text-left">
                <div className="text-lg font-black text-foreground flex items-center gap-2">
                  <span>⚡</span>
                  <span>{t.hangar}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.hangarDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHangar(false)}
                className="min-h-11 min-w-11 rounded-xl border border-border bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={t.close}
              >
                ✕
              </button>
            </div>

            {/* Crystal Balance Bar */}
            <div className="p-3 rounded-xl border border-chart-4/50 bg-chart-4/15 flex items-center justify-between">
              <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                <span>보유 네온 코어</span>
              </span>
              <span className="text-lg font-mono font-black text-chart-4 flex items-center gap-1">
                <span>💎</span>
                <span>{metaState.crystals}</span>
              </span>
            </div>

            <div className="grid gap-2.5">
              {META_UPGRADE_DEFS.map((def) => {
                const curLvl = metaState.upgrades[def.id];
                const isMax = curLvl >= def.maxLevel;
                const cost = isMax ? 0 : def.costPerLevel[curLvl];
                const canAfford = !isMax && metaState.crystals >= cost;

                return (
                  <div
                    key={def.id}
                    className="p-3.5 rounded-xl border border-border bg-muted/30 text-left space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0 p-1.5 rounded-lg bg-background border border-border">
                          {def.icon}
                        </span>
                        <div>
                          <div className="font-black text-sm text-foreground">
                            {def.name[locale] ?? def.name.en}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {def.desc[locale] ?? def.desc.en}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-black text-primary">
                          LV.{curLvl}/{def.maxLevel}
                        </span>
                      </div>
                    </div>

                    {/* Level Blocks and Buy Button */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: def.maxLevel }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-3.5 h-3.5 rounded-xs border ${
                              idx < curLvl
                                ? 'bg-primary border-primary shadow-xs'
                                : 'bg-background/80 border-border'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={isMax || !canAfford}
                        onClick={() => handleBuyUpgrade(def.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 shadow-xs ${
                          isMax
                            ? 'bg-muted text-muted-foreground cursor-default'
                            : canAfford
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
                            : 'bg-muted text-muted-foreground/60 cursor-not-allowed border border-border'
                        }`}
                      >
                        {isMax ? (
                          <span>{t.maxLevel}</span>
                        ) : (
                          <>
                            <span>💎 {cost}</span>
                            <span>강화</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowHangar(false)}
              className="w-full py-2.5 rounded-xl border border-border bg-muted/60 hover:bg-muted font-black text-xs text-foreground transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
