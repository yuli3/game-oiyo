import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CONTAINER_HEIGHT,
  CONTAINER_WIDTH,
  createInitialSuikaState,
  DEADLINE_Y,
  dropSuikaFruit,
  FRUIT_TIERS,
  moveSuikaDropper,
  shakeSuikaContainer,
  stepSuikaPhysics,
  type SuikaState,
} from '../../lib/games/suika-drop';
import {
  INITIAL_SUIKA_QUESTS,
  type SuikaQuest,
} from '../../lib/games/suika-drop-quests';
import {
  pickSuikaDialogue,
  type SuikaDialogue,
  type SuikaTrigger,
} from '../../lib/games/suika-drop-lore';
import {
  SUIKA_UPGRADES,
  loadSuikaMeta,
  saveSuikaMeta,
  computeSuikaModifiers,
  getSuikaUpgradeCost,
  type SuikaMetaSave,
} from '../../lib/games/suika-drop-meta';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { celebrate } from '../../lib/games/celebration';
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from '../../lib/games/share-card';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';
import { SUIKA_FRUIT_SPRITES, SUIKA_DROP_UI_SPRITES } from '../../lib/games/sprites';
import {
  Maximize2,
  Minimize2,
  Share2,
  Check,
  ScrollText,
  Wrench,
  X,
  Droplets,
  Sparkles,
} from 'lucide-react';

function TiltSuikaButton({
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
      className={`transition-all duration-150 transform-(--card-tilt) will-change-transform ${className}`}
      style={{ '--card-tilt': transformCss || 'none' } as React.CSSProperties}
    >
      {children}
    </button>
  );
}

interface SuikaDropProps {
  lang?: string;
}

type LocaleCode = 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'fr';

const COPY: Record<
  LocaleCode,
  {
    title: string;
    subtitle: string;
    scoreLabel: string;
    bestLabel: string;
    mergesLabel: string;
    nextLabel: string;
    shakeBtn: string;
    newGame: string;
    evolutionRing: string;
    controlsHint: string;
    gameOverTitle: string;
    gameOverDesc: string;
    fruits: Record<string, string>;
  }
> = {
  ko: {
    title: '수박 머지 3D 물리',
    subtitle: '같은 단계 과일을 부딪혀 체리(🍒)부터 대왕 수박(🍉)까지 연쇄 진화시키세요!',
    scoreLabel: '점수',
    bestLabel: '최고 점수',
    mergesLabel: '합성 횟수',
    nextLabel: '다음 과일',
    shakeBtn: '상자 흔들기',
    newGame: '새 게임',
    evolutionRing: '진화 단계 (🍒 → 🍉)',
    controlsHint: '마우스/터치로 위치 조준 후 클릭(또는 스페이스바)하여 과일 투하',
    gameOverTitle: '상자가 넘쳤습니다!',
    gameOverDesc: '과일이 상단 데드라인을 넘어 게임이 종료되었습니다.',
    fruits: {
      cherry: '체리',
      strawberry: '딸기',
      grape: '포도',
      dekopon: '한라봉',
      persimmon: '단감',
      apple: '사과',
      pear: '배',
      peach: '복숭아',
      pineapple: '파인애플',
      watermelon: '수박',
    },
  },
  en: {
    title: 'Suika Fruit Drop Physics',
    subtitle: 'Drop and collide matching fruits to evolve from Cherry (🍒) to Giant Watermelon (🍉)!',
    scoreLabel: 'Score',
    bestLabel: 'Best',
    mergesLabel: 'Merges',
    nextLabel: 'Next',
    shakeBtn: 'Shake Box',
    newGame: 'New Game',
    evolutionRing: 'Evolution Chain (🍒 → 🍉)',
    controlsHint: 'Move pointer to aim and click/tap (or Spacebar) to drop fruit',
    gameOverTitle: 'Container Overfilled!',
    gameOverDesc: 'Fruits stacked above the top deadline line.',
    fruits: {
      cherry: 'Cherry',
      strawberry: 'Strawberry',
      grape: 'Grape',
      dekopon: 'Dekopon',
      persimmon: 'Persimmon',
      apple: 'Apple',
      pear: 'Pear',
      peach: 'Peach',
      pineapple: 'Pineapple',
      watermelon: 'Watermelon',
    },
  },
  ja: {
    title: 'スイカマージ 3D物理',
    subtitle: '同じフルーツをぶつけてサクランボ(🍒)から巨大スイカ(🍉)へ進化させよう！',
    scoreLabel: 'スコア',
    bestLabel: 'ベスト',
    mergesLabel: '合体数',
    nextLabel: 'ネクスト',
    shakeBtn: '箱を揺らす',
    newGame: 'リトライ',
    evolutionRing: '進化チャート (🍒 → 🍉)',
    controlsHint: 'マウス・タッチで位置を合わせてクリック（またはスペースキー）で落下',
    gameOverTitle: '箱から溢れました！',
    gameOverDesc: '上部のデッドラインを超えたためゲームオーバーです。',
    fruits: {
      cherry: 'サクランボ',
      strawberry: 'イチゴ',
      grape: 'ブドウ',
      dekopon: 'デコポン',
      persimmon: 'カキ',
      apple: 'リンゴ',
      pear: 'ナシ',
      peach: 'モモ',
      pineapple: 'パイナップル',
      watermelon: 'スイカ',
    },
  },
  zh: {
    title: '合成大西瓜 3D物理',
    subtitle: '投落相同水果碰撞融合，从樱桃(🍒)一路进化合成超级大西瓜(🍉)！',
    scoreLabel: '得分',
    bestLabel: '最高分',
    mergesLabel: '合成数',
    nextLabel: '下一个',
    shakeBtn: '摇晃果箱',
    newGame: '新游戏',
    evolutionRing: '进化链 (🍒 → 🍉)',
    controlsHint: '移动鼠标或手指瞄准落点，点击（或按空格键）投下水果',
    gameOverTitle: '果箱溢出！',
    gameOverDesc: '水果堆积超过顶部警戒线，本局结束。',
    fruits: {
      cherry: '樱桃',
      strawberry: '草莓',
      grape: '葡萄',
      dekopon: '柑橘',
      persimmon: '柿子',
      apple: '苹果',
      pear: '香梨',
      peach: '水蜜桃',
      pineapple: '菠萝',
      watermelon: '大西瓜',
    },
  },
  es: {
    title: 'Suika Fruit Drop Physics',
    subtitle: '¡Suelta y combina frutas iguales desde la Cereza (🍒) hasta la Sandía Gigante (🍉)!',
    scoreLabel: 'Puntos',
    bestLabel: 'Récord',
    mergesLabel: 'Fusiones',
    nextLabel: 'Siguiente',
    shakeBtn: 'Agitar Caja',
    newGame: 'Nueva Partida',
    evolutionRing: 'Cadena de Evolución (🍒 → 🍉)',
    controlsHint: 'Mueve el puntero para apuntar y haz clic (o Espacio) para soltar',
    gameOverTitle: '¡Caja Desbordada!',
    gameOverDesc: 'Las frutas superaron la línea límite superior.',
    fruits: {
      cherry: 'Cereza',
      strawberry: 'Fresa',
      grape: 'Uva',
      dekopon: 'Mandarina',
      persimmon: 'Caqui',
      apple: 'Manzana',
      pear: 'Pera',
      peach: 'Melocotón',
      pineapple: 'Piña',
      watermelon: 'Sandía',
    },
  },
  fr: {
    title: 'Suika Fruit Drop Physics',
    subtitle: 'Faites tomber et fusionner les fruits identiques de la Cerise (🍒) à la Pastèque Géante (🍉) !',
    scoreLabel: 'Score',
    bestLabel: 'Record',
    mergesLabel: 'Fusions',
    nextLabel: 'Suivant',
    shakeBtn: 'Secouer',
    newGame: 'Nouvelle Partie',
    evolutionRing: 'Chaîne d’Évolution (🍒 → 🍉)',
    controlsHint: 'Déplacez le curseur pour viser et cliquez (ou Espace) pour lâcher',
    gameOverTitle: 'Boîte Débordée !',
    gameOverDesc: 'Les fruits ont dépassé la ligne limite supérieure.',
    fruits: {
      cherry: 'Cerise',
      strawberry: 'Fraise',
      grape: 'Raisin',
      dekopon: 'Mandarine',
      persimmon: 'Kaki',
      apple: 'Pomme',
      pear: 'Poire',
      peach: 'Pêche',
      pineapple: 'Ananas',
      watermelon: 'Pastèque',
    },
  },
};

function resolveLocale(lang?: string): LocaleCode {
  const code = (lang || 'ko').slice(0, 2).toLowerCase() as LocaleCode;
  return COPY[code] ? code : 'ko';
}

export function SuikaDrop({ lang = 'ko' }: SuikaDropProps) {
  const locale = resolveLocale(lang);
  const t = COPY[locale];

  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as any });

  // 1. 영구 세이브 로드 및 모디파이어 산출
  const [metaSave, setMetaSave] = useState<SuikaMetaSave>(() => loadSuikaMeta());
  const modifiers = computeSuikaModifiers(metaSave);

  // 2. 초기 게임 상태
  const [state, setState] = useState<SuikaState>(() => createInitialSuikaState(0, modifiers));
  const stateRef = useRef<SuikaState>(state);
  stateRef.current = state;

  // 3. 퀘스트 지령
  const [quests, setQuests] = useState<SuikaQuest[]>(() => INITIAL_SUIKA_QUESTS);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);

  // 4. 과수원 연구소 모달
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

  // 5. 로어 통신 대사
  const [currentDialogue, setCurrentDialogue] = useState<SuikaDialogue>(() =>
    pickSuikaDialogue('game_start')
  );

  const [isCopied, setIsCopied] = useState(false);
  const celebratedWatermelonRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastMergeCountRef = useRef(0);
  const fruitImgsRef = useRef<Map<number, HTMLImageElement>>(new Map());

  // 이미지 프리로드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const map = new Map<number, HTMLImageElement>();
    Object.entries(SUIKA_FRUIT_SPRITES).forEach(([tierStr, src]) => {
      const tier = Number(tierStr);
      const img = new Image();
      img.src = src;
      map.set(tier, img);
    });
    fruitImgsRef.current = map;
  }, []);

  // 메타 세이브 동기화
  const updateMetaSave = useCallback((updater: (prev: SuikaMetaSave) => SuikaMetaSave) => {
    setMetaSave((prev) => {
      const next = updater(prev);
      saveSuikaMeta(next);
      return next;
    });
  }, []);

  const triggerDialogue = useCallback((trigger: SuikaTrigger) => {
    setCurrentDialogue(pickSuikaDialogue(trigger));
  }, []);

  // 퀘스트 진행도 갱신
  const checkQuestProgress = useCallback((nextState: SuikaState) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.isClaimed) return q;
        let newProg = q.progress;
        if (q.id === 'quest_first_merge') {
          newProg = Math.min(q.maxProgress, nextState.mergesCount);
        } else if (q.id === 'quest_combo_chain') {
          newProg = Math.max(newProg, nextState.comboCount);
        } else if (q.id === 'quest_big_watermelon') {
          newProg = Math.min(q.maxProgress, nextState.maxTierReached >= 9 ? 1 : 0);
        } else if (q.id === 'quest_high_score') {
          newProg = Math.min(q.maxProgress, nextState.score);
        }
        return { ...q, progress: newProg };
      })
    );
  }, []);

  const handleClaimQuest = (questId: string) => {
    const q = quests.find((item) => item.id === questId);
    if (!q || q.isClaimed || q.progress < q.maxProgress) return;

    setQuests((prev) =>
      prev.map((item) => (item.id === questId ? { ...item, isClaimed: true } : item))
    );
    updateMetaSave((prev) => ({
      ...prev,
      walletJuice: prev.walletJuice + q.rewardJuice,
    }));
    MobileHapticsPro.mediumImpact();
  };

  const handleBuyUpgrade = (upgradeId: string) => {
    const def = SUIKA_UPGRADES.find((u) => u.id === upgradeId);
    if (!def) return;
    const curLv = metaSave.upgradeLevels[upgradeId] || 0;
    if (curLv >= def.maxLevel) return;

    const cost = getSuikaUpgradeCost(def, curLv);
    if (metaSave.walletJuice < cost) return;

    updateMetaSave((prev) => ({
      ...prev,
      walletJuice: prev.walletJuice - cost,
      upgradeLevels: {
        ...prev.upgradeLevels,
        [upgradeId]: curLv + 1,
      },
    }));
    MobileHapticsPro.mediumImpact();
  };

  const handleShareScore = useCallback(async () => {
    MobileHapticsPro.mediumImpact();
    try {
      const topFruit = FRUIT_TIERS[state.maxTierReached]?.emoji || '🍒';
      const canvas = await createShareCardCanvas({
        title: t.title,
        slug: 'suika-drop',
        score: `${state.score} (${t.mergesLabel} ${state.mergesCount})`,
        subtitle: `${topFruit} ${t.fruits[FRUIT_TIERS[state.maxTierReached]?.nameKey || 'cherry']} 달성!`,
      });
      const copied = await copyShareCardToClipboard(canvas);
      if (copied) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        downloadShareCard(canvas, 'suika-drop-score.png');
      }
    } catch {
      // fallback
    }
  }, [state.maxTierReached, state.score, state.mergesCount, t]);

  const playPopSfx = useCallback((tier = 0) => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 1046.5];
      const baseFreq = PENTATONIC[Math.min(tier, PENTATONIC.length - 1)] || 330;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

      gain1.gain.setValueAtTime(0.24, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 2.76, now);

      gain2.gain.setValueAtTime(0.12, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.17);
      osc2.stop(now + 0.17);
    } catch {
      // Ignore audio errors
    }
  }, []);

  const handleDrop = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing' || prev.dropCooldown > 0) return prev;
      playPopSfx(prev.currentTier);
      MobileHapticsPro.lightImpact();
      return dropSuikaFruit(prev);
    });
  }, [playPopSfx]);

  // 60fps Physics + Canvas Loop
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      setState((prev) => {
        const next = stepSuikaPhysics(prev, dt);
        if (prev.status === 'playing' && next.status === 'gameover') {
          MobileHapticsPro.warningPattern();
          triggerDialogue('game_over');
        } else if (next.overfillTimer > 1.2 && prev.overfillTimer <= 1.2) {
          triggerDialogue('overfill_danger');
        }

        if (next.mergesCount > lastMergeCountRef.current) {
          lastMergeCountRef.current = next.mergesCount;
          playPopSfx(next.maxTierReached);
          checkQuestProgress(next);

          // 착즙 즙을 지갑에 누적
          const juiceDelta = next.juiceEarned - prev.juiceEarned;
          if (juiceDelta > 0) {
            updateMetaSave((m) => ({
              ...m,
              walletJuice: m.walletJuice + juiceDelta,
              totalMerges: m.totalMerges + 1,
            }));
          }

          if (next.maxTierReached >= 9) {
            MobileHapticsPro.heavyImpact();
            triggerDialogue('watermelon_made');
            if (!celebratedWatermelonRef.current) {
              celebratedWatermelonRef.current = true;
              celebrate(containerRef.current, { preset: 'sparks' });
              updateMetaSave((m) => ({
                ...m,
                totalWatermelons: m.totalWatermelons + 1,
              }));
            }
          } else {
            triggerDialogue('merge_success');
            if (next.maxTierReached >= 5) {
              MobileHapticsPro.mediumImpact();
            } else {
              MobileHapticsPro.lightImpact();
            }
          }

          const dateKey = new Date().toISOString().slice(0, 10);
          const progress = loadArcadePassProgress(dateKey);
          saveArcadePassProgress(
            reportMissionProgress(progress, 'suika-drop', next.mergesCount)
          );
        }
        return next;
      });

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const cur = stateRef.current;
          ctx.clearRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT);

          // Background
          const grad = ctx.createLinearGradient(0, 0, 0, CONTAINER_HEIGHT);
          grad.addColorStop(0, '#fffbeb');
          grad.addColorStop(1, '#fef3c7');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, CONTAINER_WIDTH, CONTAINER_HEIGHT);

          // Container border walls
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 8;
          ctx.strokeRect(4, DEADLINE_Y, CONTAINER_WIDTH - 8, CONTAINER_HEIGHT - DEADLINE_Y - 4);

          // Deadline warning dashed line
          ctx.save();
          ctx.strokeStyle = cur.overfillTimer > 0.2 ? '#ef4444' : '#f59e0b';
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(8, DEADLINE_Y);
          ctx.lineTo(CONTAINER_WIDTH - 8, DEADLINE_Y);
          ctx.stroke();
          ctx.restore();

          // Dropper preview & vertical guide line
          if (cur.status === 'playing' && cur.dropCooldown <= 0) {
            const dropDef = FRUIT_TIERS[cur.currentTier];
            ctx.save();
            ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(cur.dropperX, DEADLINE_Y - 18);
            ctx.lineTo(cur.dropperX, CONTAINER_HEIGHT - 10);
            ctx.stroke();
            ctx.restore();

            const dropSprite = fruitImgsRef.current.get(cur.currentTier);
            if (dropSprite && dropSprite.complete) {
              const d = dropDef.radius * 2.25;
              ctx.drawImage(dropSprite, cur.dropperX - d / 2, DEADLINE_Y - 24 - d / 2, d, d);
            } else {
              ctx.fillStyle = dropDef.color;
              ctx.beginPath();
              ctx.arc(cur.dropperX, DEADLINE_Y - 24, dropDef.radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = dropDef.rimColor;
              ctx.lineWidth = 2.5;
              ctx.stroke();
              ctx.font = `${Math.max(14, Math.floor(dropDef.radius * 0.95))}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(dropDef.emoji, cur.dropperX, DEADLINE_Y - 24);
            }
          }

          // Render all active fruits with 3D specular gloss & special aura
          for (const f of cur.fruits) {
            const def = FRUIT_TIERS[f.tier];
            const r = f.radius * f.popScale;
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.angle);

            // Subtle drop shadow under fruit
            ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.beginPath();
            ctx.ellipse(0, r * 0.15, r * 0.95, r * 0.85, 0, 0, Math.PI * 2);
            ctx.fill();

            // Special Joker or Bomb Aura
            if (f.specialType === 'joker_rainbow') {
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
              ctx.stroke();
            } else if (f.specialType === 'bomb_pineapple') {
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
              ctx.stroke();
            }

            const spriteImg = fruitImgsRef.current.get(f.tier);
            if (spriteImg && spriteImg.complete) {
              const drawD = r * 2.2;
              ctx.drawImage(spriteImg, -drawD / 2, -drawD / 2, drawD, drawD);
            } else {
              const sphereGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
              sphereGrad.addColorStop(0, '#ffffff');
              sphereGrad.addColorStop(0.28, def.color);
              sphereGrad.addColorStop(1, def.rimColor);
              ctx.fillStyle = sphereGrad;
              ctx.beginPath();
              ctx.arc(0, 0, r, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = def.rimColor;
              ctx.lineWidth = 2.5;
              ctx.stroke();

              ctx.font = `${Math.max(14, Math.floor(r * 0.9))}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(def.emoji, 0, 2);
            }

            // Special emoji tag overlay
            if (f.specialType === 'joker_rainbow') {
              ctx.font = '16px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('🌈', 0, -r * 0.6);
            } else if (f.specialType === 'bomb_pineapple') {
              ctx.font = '16px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('💣', 0, -r * 0.6);
            }

            ctx.restore();
          }

          // Render Merge Pop Shockwave Bursts
          for (const b of cur.bursts) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, b.alpha);
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#7c2d12';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(b.text, b.x, b.y - b.radius * 0.5);
            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [playPopSfx, checkQuestProgress, triggerDialogue, updateMetaSave]);

  // Keyboard support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.status !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setState((prev) => moveSuikaDropper(prev, prev.dropperX - 18));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setState((prev) => moveSuikaDropper(prev, prev.dropperX + 18));
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleDrop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDrop]);

  const updatePointerX = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CONTAINER_WIDTH / rect.width;
    const x = (clientX - rect.left) * scaleX;
    setState((prev) => moveSuikaDropper(prev, x));
  };

  const unclaimedQuestsCount = quests.filter((q) => !q.isClaimed && q.progress >= q.maxProgress).length;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm transition-all ${
        isImmersive ? 'fixed inset-0 z-50 overflow-y-auto rounded-none w-screen h-screen bg-background' : ''
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-1.5">
            <span>🍉 {t.title}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              PRO 6-SYSTEM
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {/* 퀘스트 지령 버튼 */}
          <TiltSuikaButton
            onClick={() => setIsQuestModalOpen(true)}
            className="relative flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-accent"
          >
            <ScrollText className="h-4 w-4 text-primary" />
            <span>과수원 지령</span>
            {unclaimedQuestsCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground animate-pulse">
                {unclaimedQuestsCount}
              </span>
            )}
          </TiltSuikaButton>

          {/* 과수원 연구소 버튼 */}
          <TiltSuikaButton
            onClick={() => setIsMetaModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-accent"
          >
            <Wrench className="h-4 w-4 text-warning" />
            <span>과수원 강화</span>
          </TiltSuikaButton>

          {/* 과일 즙 재화 배지 */}
          <div className="flex items-center gap-1 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">
            <Droplets className="h-3.5 w-3.5" />
            <span>{metaSave.walletJuice} 즙</span>
          </div>

          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            {t.scoreLabel}: {state.score}
          </span>
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            🏆 {t.bestLabel}: {state.bestScore}
          </span>
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            ✨ {t.mergesLabel}: {state.mergesCount}
          </span>

          <TiltSuikaButton
            disabled={state.shakesLeft <= 0 || state.fruits.length === 0}
            onClick={() => {
              MobileHapticsPro.mediumImpact();
              setState((prev) => shakeSuikaContainer(prev));
            }}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-accent disabled:opacity-40"
          >
            🫨 {t.shakeBtn} ({state.shakesLeft})
          </TiltSuikaButton>

          <TiltSuikaButton
            onClick={() => {
              lastMergeCountRef.current = 0;
              celebratedWatermelonRef.current = false;
              setState((prev) => createInitialSuikaState(prev.bestScore, modifiers));
            }}
            className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            {t.newGame}
          </TiltSuikaButton>

          <TiltSuikaButton
            onClick={handleShareScore}
            title={locale === 'ko' ? '기록 공유' : 'Share Score'}
            className="rounded-lg border border-border bg-background p-1 text-foreground transition hover:bg-accent"
          >
            {isCopied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
          </TiltSuikaButton>

          <TiltSuikaButton
            onClick={togglePortal}
            title={isImmersive ? '창모드로 복귀' : '100dvh 전체화면 몰입'}
            className="rounded-lg border border-border bg-background p-1 text-foreground transition hover:bg-accent"
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </TiltSuikaButton>
        </div>
      </div>

      {/* 스토리 로어 통신 HUD */}
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card border border-primary/30 text-2xl shadow-xs">
          {currentDialogue.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-primary">{currentDialogue.name.ko}</span>
            <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-semibold text-primary">
              {currentDialogue.title.ko}
            </span>
          </div>
          <p className="text-xs text-foreground mt-0.5 line-clamp-2">
            "{currentDialogue.text.ko}"
          </p>
        </div>
      </div>

      {/* Main Arena + Evolution Sidebar */}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-12">
        <div className="flex flex-col items-center md:col-span-7">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-background shadow-inner">
            <canvas
              ref={canvasRef}
              width={CONTAINER_WIDTH}
              height={CONTAINER_HEIGHT}
              onPointerMove={(e) => updatePointerX(e.clientX)}
              onPointerDown={(e) => {
                updatePointerX(e.clientX);
                handleDrop();
              }}
              className="block h-auto w-full max-w-sm cursor-pointer touch-none select-none"
            />
            {state.status === 'gameover' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 p-6 text-center backdrop-blur-xs z-10 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <img
                    src={SUIKA_DROP_UI_SPRITES.melon}
                    alt="Melon"
                    width={36}
                    height={36}
                    className="drop-shadow-sm opacity-90"
                  />
                  <div className="relative flex size-20 items-center justify-center rounded-3xl bg-primary/20 p-2 border border-primary/40 shadow-xl">
                    <img
                      src={SUIKA_DROP_UI_SPRITES.trophy}
                      alt="Suika Merge Trophy"
                      className="size-14 object-contain animate-bounce"
                      draggable={false}
                    />
                  </div>
                  <img
                    src={SUIKA_DROP_UI_SPRITES.watermelon}
                    alt="Giant Watermelon"
                    width={36}
                    height={36}
                    className="drop-shadow-sm opacity-90"
                  />
                </div>
                <h3 className="text-xl font-bold">{t.gameOverTitle}</h3>
                <p className="text-xs text-muted-foreground">{t.gameOverDesc}</p>
                <div className="text-base font-bold text-primary">
                  {t.scoreLabel}: {state.score}
                </div>
                <div className="flex items-center gap-2">
                  <TiltSuikaButton
                    onClick={handleShareScore}
                    className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground shadow-sm transition hover:bg-accent"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
                    <span>{isCopied ? '복사됨!' : '점수 공유'}</span>
                  </TiltSuikaButton>
                  <TiltSuikaButton
                    onClick={() => {
                      lastMergeCountRef.current = 0;
                      celebratedWatermelonRef.current = false;
                      setState((prev) => createInitialSuikaState(prev.bestScore, modifiers));
                    }}
                    className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm"
                  >
                    {t.newGame}
                  </TiltSuikaButton>
                </div>
              </div>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t.controlsHint}</p>
        </div>

        {/* Next Fruit & 10-Stage Evolution Chain */}
        <div className="flex flex-col gap-3 md:col-span-5">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3.5">
            <span className="text-xs font-bold text-muted-foreground">{t.nextLabel}</span>
            <div className="flex items-center gap-2.5 text-sm font-bold">
              {SUIKA_FRUIT_SPRITES[state.nextTier] ? (
                <img
                  src={SUIKA_FRUIT_SPRITES[state.nextTier]}
                  alt={t.fruits[FRUIT_TIERS[state.nextTier].nameKey]}
                  className="size-7 object-contain"
                  draggable={false}
                />
              ) : (
                <span className="text-2xl">{FRUIT_TIERS[state.nextTier].emoji}</span>
              )}
              <span>{t.fruits[FRUIT_TIERS[state.nextTier].nameKey]}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3.5">
            <h3 className="text-xs font-bold text-muted-foreground">{t.evolutionRing}</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {FRUIT_TIERS.map((ft) => {
                const unlocked = state.maxTierReached >= ft.tier;
                return (
                  <div
                    key={ft.tier}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs ${
                      unlocked
                        ? 'border-primary bg-card font-semibold text-card-foreground shadow-xs'
                        : 'border-border bg-background/50 text-muted-foreground opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {SUIKA_FRUIT_SPRITES[ft.tier] ? (
                        <img
                          src={SUIKA_FRUIT_SPRITES[ft.tier]}
                          alt={t.fruits[ft.nameKey]}
                          className="size-4 shrink-0 object-contain"
                          draggable={false}
                        />
                      ) : (
                        <span>{ft.emoji}</span>
                      )}
                      <span className="truncate">{t.fruits[ft.nameKey]}</span>
                    </div>
                    <span className="text-muted-foreground text-xs shrink-0">+{ft.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 퀘스트 지령 모달 */}
      {isQuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" />
                <h3 className="text-base font-black">과수원 수확 지령서</h3>
              </div>
              <TiltSuikaButton
                onClick={() => setIsQuestModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </TiltSuikaButton>
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
                        <span className="text-xs font-bold text-foreground">{q.title.ko}</span>
                        <span className="text-xs font-bold text-warning">+{q.rewardJuice} 즙</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{q.desc.ko}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300 w-(--prog-pct)"
                            style={{ '--prog-pct': `${Math.min(100, (q.progress / q.maxProgress) * 100)}%` } as React.CSSProperties}
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
                        <TiltSuikaButton
                          disabled={!canClaim}
                          onClick={() => handleClaimQuest(q.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            canClaim
                              ? 'bg-primary text-primary-foreground shadow hover:opacity-90'
                              : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                          }`}
                        >
                          보상 수령
                        </TiltSuikaButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 과수원 5대 영구 강화 모달 */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-warning" />
                <h3 className="text-base font-black">포모도르의 과수원 연구소</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-lg border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
                  <Droplets className="h-3.5 w-3.5" />
                  <span>{metaSave.walletJuice} 즙</span>
                </div>
                <TiltSuikaButton
                  onClick={() => setIsMetaModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </TiltSuikaButton>
              </div>
            </div>

            <div className="my-4 flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
              {SUIKA_UPGRADES.map((def) => {
                const curLv = metaSave.upgradeLevels[def.id] || 0;
                const isMax = curLv >= def.maxLevel;
                const cost = getSuikaUpgradeCost(def, curLv);
                const canAfford = !isMax && metaSave.walletJuice >= cost;

                return (
                  <div
                    key={def.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-card border border-border text-xl">
                        {def.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{def.name.ko}</span>
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                            LV {curLv} / {def.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{def.desc.ko}</p>
                      </div>
                    </div>

                    <div>
                      {isMax ? (
                        <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                          MAX
                        </span>
                      ) : (
                        <TiltSuikaButton
                          disabled={!canAfford}
                          onClick={() => handleBuyUpgrade(def.id)}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                            canAfford
                              ? 'bg-warning text-warning-foreground shadow hover:opacity-90'
                              : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <Droplets className="h-3.5 w-3.5" />
                          <span>{cost} 즙</span>
                        </TiltSuikaButton>
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

export default SuikaDrop;
