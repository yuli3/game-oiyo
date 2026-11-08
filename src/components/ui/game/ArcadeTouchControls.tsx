import React, { useCallback, useRef } from 'react';
import { nativeHaptics } from '../../../lib/haptics/native-bridge';
import { MobileHapticsPro } from '../../../lib/games/engine-suite-unified';

export interface ActionButtonDef {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'warning' | 'info' | 'destructive' | 'muted';
  onPress: () => void;
  onRelease?: () => void;
  icon?: React.ReactNode;
  size?: 'normal' | 'large';
  ariaLabel?: string;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface ArcadeTouchControlsProps {
  onDirection?: (dir: Direction, active: boolean) => void;
  showDPad?: boolean;
  dPadMode?: '4-way' | 'horizontal-only' | 'vertical-only';
  actions?: ActionButtonDef[];
  className?: string;
}

export function ArcadeTouchControls({
  onDirection,
  showDPad = true,
  dPadMode = '4-way',
  actions = [],
  className = '',
}: ArcadeTouchControlsProps) {
  const activePointers = useRef<Map<number, string>>(new Map());

  const handlePointerDown = useCallback(
    (key: string, onPress: () => void) =>
      (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
          activePointers.current.set(e.pointerId, key);
        } catch {
          // fallback for environments without pointer capture
        }
        nativeHaptics.trigger('light');
        MobileHapticsPro.light();
        onPress();
      },
    []
  );

  const handlePointerUp = useCallback(
    (onRelease?: () => void) =>
      (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
          activePointers.current.delete(e.pointerId);
        } catch {
          // fallback
        }
        onRelease?.();
      },
    []
  );

  const handleDirectionPress = useCallback(
    (dir: Direction) => {
      onDirection?.(dir, true);
    },
    [onDirection]
  );

  const handleDirectionRelease = useCallback(
    (dir: Direction) => {
      onDirection?.(dir, false);
    },
    [onDirection]
  );

  const getActionVariantClass = (variant?: ActionButtonDef['variant']) => {
    switch (variant) {
      case 'warning':
        return 'bg-warning text-warning-foreground border-warning shadow-md';
      case 'info':
        return 'bg-info text-info-foreground border-info/40 shadow-md';
      case 'destructive':
        return 'bg-destructive text-destructive-foreground border-destructive/40 shadow-md';
      case 'secondary':
        return 'bg-secondary text-secondary-foreground border-border shadow-xs';
      case 'muted':
        return 'bg-muted text-muted-foreground border-border shadow-xs';
      case 'primary':
      default:
        return 'bg-primary text-primary-foreground border-primary/40 shadow-md';
    }
  };

  return (
    <div
      className={`pointer-events-none absolute bottom-4 left-3 right-3 flex touch-none select-none items-end justify-between gap-2 md:pointer-fine:hidden z-20 ${className}`}
      aria-label="Mobile Touch Game Controls"
    >
      {/* Directional Cluster (Emberdeep D-Pad Pattern) */}
      {showDPad && onDirection && (
        <div className="pointer-events-auto select-none touch-none">
          {dPadMode === 'horizontal-only' ? (
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Move Left"
                onPointerDown={handlePointerDown('left', () => handleDirectionPress('left'))}
                onPointerUp={handlePointerUp(() => handleDirectionRelease('left'))}
                onPointerCancel={handlePointerUp(() => handleDirectionRelease('left'))}
                className="size-13 rounded-xl bg-black/80 font-black text-white border border-white/20 active:bg-white/20 active:scale-95 flex items-center justify-center text-xl shadow-lg transition-transform"
              >
                ◀
              </button>
              <button
                type="button"
                aria-label="Move Right"
                onPointerDown={handlePointerDown('right', () => handleDirectionPress('right'))}
                onPointerUp={handlePointerUp(() => handleDirectionRelease('right'))}
                onPointerCancel={handlePointerUp(() => handleDirectionRelease('right'))}
                className="size-13 rounded-xl bg-black/80 font-black text-white border border-white/20 active:bg-white/20 active:scale-95 flex items-center justify-center text-xl shadow-lg transition-transform"
              >
                ▶
              </button>
            </div>
          ) : dPadMode === 'vertical-only' ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                aria-label="Move Up"
                onPointerDown={handlePointerDown('up', () => handleDirectionPress('up'))}
                onPointerUp={handlePointerUp(() => handleDirectionRelease('up'))}
                onPointerCancel={handlePointerUp(() => handleDirectionRelease('up'))}
                className="size-13 rounded-xl bg-black/80 font-black text-white border border-white/20 active:bg-white/20 active:scale-95 flex items-center justify-center text-xl shadow-lg transition-transform"
              >
                ▲
              </button>
              <button
                type="button"
                aria-label="Move Down"
                onPointerDown={handlePointerDown('down', () => handleDirectionPress('down'))}
                onPointerUp={handlePointerUp(() => handleDirectionRelease('down'))}
                onPointerCancel={handlePointerUp(() => handleDirectionRelease('down'))}
                className="size-13 rounded-xl bg-black/80 font-black text-white border border-white/20 active:bg-white/20 active:scale-95 flex items-center justify-center text-xl shadow-lg transition-transform"
              >
                ▼
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              <span />
              <button
                type="button"
                aria-label="Move Up"
                onPointerDown={handlePointerDown('up', () => handleDirectionPress('up'))}
                onPointerUp={handlePointerUp(() => handleDirectionRelease('up'))}
                onPointerCancel={handlePointerUp(() => handleDirectionRelease('up'))}
                className="size-12 rounded-lg bg-black/80 font-black text-white border border-white/25 active:bg-white/25 active:scale-95 flex items-center justify-center text-lg shadow-md transition-transform"
              >
                ▲
              </button>
              <span />
              <button
                type="button"
                aria-label="Move Left"
                onPointerDown={handlePointerDown('left', () => handleDirectionPress('left'))}
                onPointerUp={handlePointerUp(() => handleDirectionRelease('left'))}
                onPointerCancel={handlePointerUp(() => handleDirectionRelease('left'))}
                className="size-12 rounded-lg bg-black/80 font-black text-white border border-white/25 active:bg-white/25 active:scale-95 flex items-center justify-center text-lg shadow-md transition-transform"
              >
                ◀
              </button>
              <button
                type="button"
                aria-label="Move Down"
                onPointerDown={handlePointerDown('down', () => handleDirectionPress('down'))}
                onPointerUp={handlePointerUp(() => handleDirectionRelease('down'))}
                onPointerCancel={handlePointerUp(() => handleDirectionRelease('down'))}
                className="size-12 rounded-lg bg-black/80 font-black text-white border border-white/25 active:bg-white/25 active:scale-95 flex items-center justify-center text-lg shadow-md transition-transform"
              >
                ▼
              </button>
              <button
                type="button"
                aria-label="Move Right"
                onPointerDown={handlePointerDown('right', () => handleDirectionPress('right'))}
                onPointerUp={handlePointerUp(() => handleDirectionRelease('right'))}
                onPointerCancel={handlePointerUp(() => handleDirectionRelease('right'))}
                className="size-12 rounded-lg bg-black/80 font-black text-white border border-white/25 active:bg-white/25 active:scale-95 flex items-center justify-center text-lg shadow-md transition-transform"
              >
                ▶
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Pills Cluster */}
      {actions.length > 0 && (
        <div className="pointer-events-auto flex items-end gap-2 text-xs font-black select-none touch-none">
          {actions.map((act) => {
            const isLarge = act.size === 'large' || actions.length <= 2;
            return (
              <button
                key={act.id}
                type="button"
                aria-label={act.ariaLabel || act.label}
                onPointerDown={handlePointerDown(act.id, act.onPress)}
                onPointerUp={handlePointerUp(act.onRelease)}
                onPointerCancel={handlePointerUp(act.onRelease)}
                className={`${
                  isLarge ? 'h-14 min-w-16 px-4' : 'h-12 min-w-14 px-3'
                } rounded-full border flex items-center justify-center gap-1.5 active:scale-95 transition-transform ${getActionVariantClass(
                  act.variant
                )}`}
              >
                {act.icon}
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ArcadeTouchControls;
