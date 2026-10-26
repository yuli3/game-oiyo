import { useCallback, useEffect, useRef, useState } from 'react';
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
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';

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

export default function SuikaDrop({ lang = 'ko' }: SuikaDropProps) {
  const locale = resolveLocale(lang);
  const t = COPY[locale];

  const [state, setState] = useState<SuikaState>(() => createInitialSuikaState());
  const stateRef = useRef<SuikaState>(state);
  stateRef.current = state;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastMergeCountRef = useRef(0);

  const playPopSfx = useCallback((freq = 420) => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.65, now + 0.11);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore audio errors
    }
  }, []);

  const handleDrop = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing' || prev.dropCooldown > 0) return prev;
      playPopSfx(260);
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
        if (next.mergesCount > lastMergeCountRef.current) {
          lastMergeCountRef.current = next.mergesCount;
          playPopSfx(360 + next.maxTierReached * 55);
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

          // Warm wooden/cream fruit box background
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

            // Cloud dropper mascot & preview fruit
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

          // Render all active fruits with 3D specular gloss and rotation
          for (const f of cur.fruits) {
            const def = FRUIT_TIERS[f.tier];
            const r = f.radius * f.popScale;
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.angle);

            // Base sphere
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

            // Specular highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
            ctx.beginPath();
            ctx.ellipse(-r * 0.32, -r * 0.32, r * 0.24, r * 0.14, -Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();

            // Emoji icon
            ctx.font = `${Math.max(14, Math.floor(r * 0.9))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(def.emoji, 0, 2);

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
  }, [playPopSfx]);

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

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">🍉 {t.title}</h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            {t.scoreLabel}: {state.score}
          </span>
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            🏆 {t.bestLabel}: {state.bestScore}
          </span>
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            ✨ {t.mergesLabel}: {state.mergesCount}
          </span>
          <button
            type="button"
            disabled={state.shakesLeft <= 0 || state.fruits.length === 0}
            onClick={() => setState((prev) => shakeSuikaContainer(prev))}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-accent disabled:opacity-40"
          >
            🫨 {t.shakeBtn} ({state.shakesLeft})
          </button>
          <button
            type="button"
            onClick={() => {
              lastMergeCountRef.current = 0;
              setState((prev) => createInitialSuikaState(prev.bestScore));
            }}
            className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            {t.newGame}
          </button>
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 p-6 text-center backdrop-blur-xs">
                <h3 className="text-xl font-bold">{t.gameOverTitle}</h3>
                <p className="text-xs text-muted-foreground">{t.gameOverDesc}</p>
                <div className="text-base font-bold">
                  {t.scoreLabel}: {state.score}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    lastMergeCountRef.current = 0;
                    setState((prev) => createInitialSuikaState(prev.bestScore));
                  }}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm"
                >
                  {t.newGame}
                </button>
              </div>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t.controlsHint}</p>
        </div>

        {/* Next Fruit & 10-Stage Evolution Chain */}
        <div className="flex flex-col gap-3 md:col-span-5">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3.5">
            <span className="text-xs font-bold text-muted-foreground">{t.nextLabel}</span>
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className="text-2xl">{FRUIT_TIERS[state.nextTier].emoji}</span>
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
                        ? 'border-primary bg-card font-semibold text-card-foreground'
                        : 'border-border bg-background/50 text-muted-foreground opacity-60'
                    }`}
                  >
                    <span>
                      {ft.emoji} {t.fruits[ft.nameKey]}
                    </span>
                    <span className="text-muted-foreground">+{ft.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
