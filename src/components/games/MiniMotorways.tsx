import { useState, useCallback, useEffect } from 'react';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';
import {
  applyAutoHighwayNetworkPreset,
  clickUrbanCell,
  createMiniMotorwaysState,
  stepCommuterTraffic,
  type CommuterColor,
  type MiniMotorwaysState,
} from '../../lib/games/mini-motorways';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { celebrate } from '../../lib/games/celebration';
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from '../../lib/games/share-card';
import { getSpriteUrl, MINI_MOTORWAYS_SPRITES } from '../../lib/games/sprites';
import { Share2, Check, Maximize2, Minimize2 } from 'lucide-react';

function TiltMotorButton({
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

interface Props {
  locale: string;
}

function playMotorwayAudio(type: 'road' | 'dispatch' | 'victory' | 'gridlock') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    if (type === 'road') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'dispatch') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.2);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'gridlock') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'victory') {
      [523.25, 659.25, 783.99].forEach((f, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, now + idx * 0.08);
        g.gain.setValueAtTime(0.12, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        o.connect(g).connect(ctx.destination);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.25);
      });
    }
    setTimeout(() => ctx.close().catch(() => {}), 400);
  } catch {}
}

function TiltMotorwayToolButton({
  isSelected,
  label,
  onClick,
}: {
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      style={
        {
          '--card-tilt': transformCss,
        } as React.CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.15);
        MobileHapticsPro.light();
        onClick();
      }}
      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition will-change-transform transform-(--card-tilt) ${
        isSelected
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-foreground hover:bg-accent'
      }`}
    >
      {label}
    </button>
  );
}

const COLOR_BADGES: Record<CommuterColor, { icon: string; nameKo: string; nameEn: string }> = {
  crimson: { icon: '🟥', nameKo: '크림슨', nameEn: 'Crimson' },
  cobalt: { icon: '🟦', nameKo: '코발트', nameEn: 'Cobalt' },
  amber: { icon: '🟨', nameKo: '앰버', nameEn: 'Amber' },
};

export default function MiniMotorways({ locale }: Props) {
  const isKo = locale === 'ko';
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || 'ko' });
  const [state, setState] = useState<MiniMotorwaysState>(() =>
    createMiniMotorwaysState()
  );
  const [shareCardCopied, setShareCardCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        togglePortal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePortal]);

  const recordArcadePass = (trips: number) => {
    try {
      const dateKey = new Date().toISOString().slice(0, 10);
      const current = loadArcadePassProgress(dateKey);
      const updated = reportMissionProgress(current, 'mini-motorways', trips);
      saveArcadePassProgress(updated);
    } catch {
      // Safe fallback in SSR/test
    }
  };

  const handleShareCard = useCallback(async () => {
    try {
      const isVictory = state.status === 'victory';
      const canvas = createShareCardCanvas({
        title: isKo ? '미니 모터웨이' : 'Mini Motorways',
        subtitle: isVictory
          ? (isKo ? '무정체 도시 교통망 마스터' : 'Zero-Gridlock City Master')
          : (isKo ? `Week ${state.week} 운행 기록` : `Week ${state.week} Transit Record`),
        score: `${state.tripsCompleted} Trips`,
        slug: 'mini-motorways',
        customStats: [
          { label: isKo ? '연결 주택' : 'Houses', value: `${state.connectedHousesCount} / 4` },
          { label: isKo ? '진행 주차' : 'Week', value: `W${state.week}` },
          { label: isKo ? '잔여 도로' : 'Roads Left', value: state.roadTilesLeft },
        ],
      });
      const success = await copyShareCardToClipboard(canvas);
      if (success) {
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2000);
      } else {
        downloadShareCard(canvas, `mini-motorways-${state.tripsCompleted}trips.png`);
      }
    } catch {
      /* best effort */
    }
  }, [isKo, state.connectedHousesCount, state.roadTilesLeft, state.status, state.tripsCompleted, state.week]);

  const handleDispatch = () => {
    const next = stepCommuterTraffic(state);
    if (next.status === 'victory') {
      playMotorwayAudio('victory');
      MobileHapticsPro.success();
      celebrate(containerRef.current, { preset: 'stardust' });
    } else if (next.status === 'gridlock') {
      playMotorwayAudio('gridlock');
      MobileHapticsPro.heavy();
    } else {
      playMotorwayAudio('dispatch');
      MobileHapticsPro.impact();
    }
    setState(next);
    recordArcadePass(next.tripsCompleted);
  };

  const handlePreset = () => {
    playMotorwayAudio('road');
    MobileHapticsPro.success();
    setState(applyAutoHighwayNetworkPreset(state));
  };

  return (
    <div
      ref={containerRef}
      data-game-surface
      className={
        isImmersive
          ? 'fixed inset-0 z-50 w-screen h-dvh bg-background p-3 sm:p-5 overflow-y-auto flex flex-col justify-between m-0 select-none'
          : 'mx-auto max-w-5xl p-4 text-foreground'
      }
    >
      {/* Top Urban Traffic Control HUD */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-secondary-foreground">
            <div className="text-xs text-muted-foreground">
              {isKo ? '누적 통근 차량 (목표 30대)' : 'Commuter Trips (Goal 30)'}
            </div>
            <div className="text-xl font-extrabold text-primary flex items-center gap-1.5">
              <img src={MINI_MOTORWAYS_SPRITES.car} alt="Car" width={20} height={20} className="size-5 object-contain inline-block drop-shadow-xs" />
              <span>{state.tripsCompleted} / {state.tripGoal}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-secondary-foreground">
            <div className="text-xs text-muted-foreground">
              {isKo ? '연결된 주택 / 현재 주차' : 'Connected Houses / Week'}
            </div>
            <div className="text-lg font-bold text-foreground">
              🏠 {state.connectedHousesCount} / 4 · 📅 W{state.week}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background px-3.5 py-2">
            <div className="text-xs text-muted-foreground">
              {isKo ? '보유 도로 / 회전교차로 / 고속도로' : 'Roads / Roundabouts / Motorways'}
            </div>
            <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>🛣️ {state.roadTilesLeft} · 🔄 {state.roundaboutsLeft} · </span>
              <img src={MINI_MOTORWAYS_SPRITES.bridge} alt="Bridge" width={16} height={16} className="size-4 object-contain inline-block drop-shadow-xs" />
              <span>{state.motorwaysLeft}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/prototypes/mini-motorways-unity/index.html"
            className="rounded-xl border border-primary/50 bg-primary/15 px-3 py-2 text-xs font-black text-primary hover:bg-primary/25 transition-colors whitespace-nowrap"
          >
            🛰️ Unity 실시간 에디션
          </a>
          <TiltMotorButton
            onClick={handlePreset}
            className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-accent"
          >
            {isKo ? '⚡ 고속도로망 개통' : '⚡ Load Highway'}
          </TiltMotorButton>
          <TiltMotorButton
            onClick={() => setState(createMiniMotorwaysState())}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent"
          >
            {isKo ? '초기화' : 'Reset'}
          </TiltMotorButton>
          <TiltMotorButton
            onClick={handleShareCard}
            className="p-2 rounded-xl border border-border bg-background hover:bg-muted"
            title="공유 카드"
            ariaLabel="공유 카드"
          >
            {shareCardCopied ? <Check className="size-4 text-success" /> : <Share2 className="size-4" />}
          </TiltMotorButton>
          <TiltMotorButton
            onClick={togglePortal}
            className="p-2 rounded-xl border border-border bg-background hover:bg-muted"
            title={isImmersive ? portalLabels.exit : portalLabels.enter}
            ariaLabel={isImmersive ? portalLabels.exit : portalLabels.enter}
          >
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </TiltMotorButton>
        </div>
      </div>

      {/* Victory / Gridlock Banner */}
      {state.status === 'victory' && (
        <div className="mb-4 rounded-2xl border border-primary bg-primary/10 p-4 text-center flex flex-col items-center justify-center gap-2 shadow-md animate-in fade-in zoom-in-95">
          <img
            src={MINI_MOTORWAYS_SPRITES.trophy}
            alt="Victory Trophy"
            width={80}
            height={80}
            className="size-20 object-contain animate-bounce drop-shadow-xl select-none pointer-events-none"
          />
          <h3 className="text-lg font-extrabold text-primary">
            {isKo
              ? `🏆 누적 ${state.tripsCompleted}대 통근 완료! 무정체 도시 교통망 마스터!`
              : `🏆 ${state.tripsCompleted} Commuter Trips Completed! Zero-Gridlock City Master!`}
          </h3>
        </div>
      )}

      {state.status === 'gridlock' && (
        <div className="mb-4 rounded-2xl border border-destructive bg-destructive/10 p-4 text-center">
          <h3 className="text-lg font-extrabold text-destructive">
            {isKo
              ? '🚨 쇼핑몰 수요 핀 과부하(6/6)로 도심 마비가 발생했습니다!'
              : '🚨 Destination Mall Demand Overflow (6/6) Triggered Urban Gridlock!'}
          </h3>
        </div>
      )}

      {/* Construction Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              {
                id: 'road',
                labelKo: `🛣️ 도로 포설 (${state.roadTilesLeft})`,
                labelEn: `🛣️ Draw Road (${state.roadTilesLeft})`,
              },
              {
                id: 'roundabout',
                labelKo: `🔄 회전교차로 (${state.roundaboutsLeft})`,
                labelEn: `🔄 Roundabout (${state.roundaboutsLeft})`,
              },
              {
                id: 'motorway',
                labelKo: `🌉 고속도로 #1 (${state.motorwaysLeft})`,
                labelEn: `🌉 Motorway #1 (${state.motorwaysLeft})`,
              },
              {
                id: 'erase',
                labelKo: '🗑️ 도로 철거',
                labelEn: '🗑️ Remove Road',
              },
            ] as const
          ).map((tool) => (
            <TiltMotorwayToolButton
              key={tool.id}
              isSelected={state.selectedTool === tool.id}
              label={isKo ? tool.labelKo : tool.labelEn}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  selectedTool: tool.id,
                  pendingMotorwayStart: null,
                }))
              }
            />
          ))}
        </div>

        <TiltMotorButton
          onClick={handleDispatch}
          disabled={state.status !== 'planning'}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-extrabold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-40"
        >
          <img src={MINI_MOTORWAYS_SPRITES.car} alt="Car" width={16} height={16} className="size-4 object-contain inline-block drop-shadow-xs" />
          <span>{isKo ? '주간 통근 차량 출발 (DISPATCH)' : 'DISPATCH RUSH HOUR TRAFFIC'}</span>
        </TiltMotorButton>
      </div>

      {/* 8x6 Urban Grid Canvas */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            {isKo ? '🗺️ 8×6 도심 순환 교통망 그리드' : '🗺️ 8×6 Urban Commuter Grid'}
          </h3>
          {state.motorways.length > 0 && (
            <span className="rounded bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
              🌉{' '}
              {state.motorways
                .map(
                  (m) =>
                    `Motorway #1: [${m.fromRow + 1},${m.fromCol + 1}] ↔ [${m.toRow + 1},${m.toCol + 1}]`
                )
                .join(', ')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-8 gap-2 rounded-xl border border-border bg-background p-3">
          {state.grid.flatMap((row) =>
            row.map((cell) => {
              const colorBadge = cell.color ? COLOR_BADGES[cell.color] : null;
              const isMwEndpoint = state.motorways.some(
                (m) =>
                  (m.fromRow === cell.row && m.fromCol === cell.col) ||
                  (m.toRow === cell.row && m.toCol === cell.col)
              );

              return (
                <button
                  key={`${cell.row}-${cell.col}`}
                  type="button"
                  onClick={() => {
                    playMotorwayAudio('road');
                    MobileHapticsPro.light();
                    setState(clickUrbanCell(state, cell.row, cell.col));
                  }}
                  className={`relative flex min-h-20 flex-col items-center justify-center rounded-xl border p-2 text-center transition ${
                    cell.kind === 'house' || cell.kind === 'mall'
                      ? 'border-primary bg-primary/10'
                      : cell.kind === 'road'
                        ? 'border-border bg-secondary text-secondary-foreground'
                        : 'border-border bg-card hover:bg-accent'
                  }`}
                >
                  {cell.kind === 'house' && colorBadge && (
                    <>
                      <span className="text-xl leading-none">
                        🏠{colorBadge.icon}
                      </span>
                      <span className="mt-1 text-xs font-bold text-foreground">
                        {isKo ? `${colorBadge.nameKo} 주택` : `${colorBadge.nameEn} House`}
                      </span>
                    </>
                  )}

                  {cell.kind === 'mall' && colorBadge && (
                    <>
                      <div className="relative flex items-center justify-center">
                        <img src={MINI_MOTORWAYS_SPRITES.mall} alt="Mall" width={32} height={32} className="size-8 object-contain drop-shadow-xs" />
                        <span className="absolute -top-1 -right-1 text-xs">{colorBadge.icon}</span>
                      </div>
                      <span className="mt-1 text-xs font-bold text-foreground">
                        {isKo ? `${colorBadge.nameKo} 몰` : `${colorBadge.nameEn} Mall`}
                      </span>
                      <span className="mt-0.5 rounded bg-background px-1.5 py-0.5 text-xs font-extrabold text-destructive">
                        📍 {cell.demandPins}/{cell.maxPins}
                      </span>
                    </>
                  )}

                  {cell.kind === 'road' && (
                    <>
                      {isMwEndpoint ? (
                        <img src={MINI_MOTORWAYS_SPRITES.bridge} alt="Bridge" width={28} height={28} className="size-7 object-contain drop-shadow-xs" />
                      ) : (
                        <span className="text-xl leading-none">
                          {cell.hasRoundabout ? '🔄' : '🛣️'}
                        </span>
                      )}
                      <span className="mt-1 text-xs font-semibold">
                        {cell.hasRoundabout
                          ? isKo
                            ? '회전교차로'
                            : 'Roundabout'
                          : isMwEndpoint
                            ? 'Motorway #1'
                            : isKo
                              ? '도로'
                              : 'Road'}
                      </span>
                    </>
                  )}

                  {cell.kind === 'empty' && (
                    <span className="text-xs text-muted-foreground">·</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <p className="mt-3 rounded-xl border border-border bg-secondary p-3 text-xs text-secondary-foreground">
          {isKo ? state.logKo : state.logEn}
        </p>
      </div>
    </div>
  );
}
