import React, { useRef, useEffect, useState, useCallback } from "react";
import { computeIntegerPixelScale, type PixelViewportFit } from "../../../lib/games/pixel-engine";

export interface RetroPixelViewportProps {
  nativeWidth: number;
  nativeHeight: number;
  onRender: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  onPixelPointerDown?: (nativeX: number, nativeY: number, event: React.PointerEvent) => void;
  onPixelPointerMove?: (nativeX: number, nativeY: number, event: React.PointerEvent) => void;
  onPixelPointerUp?: (event: React.PointerEvent) => void;
  showScanlines?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * RetroPixelViewport — Hardware-accelerated integer-scaled viewport for 8-bit/16-bit dot games.
 * 
 * Automatically scales low-res canvas (e.g. 160x144, 256x240, 320x180) to fill the parent container
 * using crisp nearest-neighbor integer scaling (1x, 2x, 3x, 4x...) without sub-pixel blur.
 * Also maps touch/mouse coordinates back to native game coordinates.
 */
export const RetroPixelViewport: React.FC<RetroPixelViewportProps> = ({
  nativeWidth,
  nativeHeight,
  onRender,
  onPixelPointerDown,
  onPixelPointerMove,
  onPixelPointerUp,
  showScanlines = false,
  className = "",
  style,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fit, setFit] = useState<PixelViewportFit>({
    width: nativeWidth,
    height: nativeHeight,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const updateFit = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;
    const nextFit = computeIntegerPixelScale(clientWidth, clientHeight, nativeWidth, nativeHeight);
    setFit(nextFit);
  }, [nativeWidth, nativeHeight]);

  useEffect(() => {
    updateFit();
    window.addEventListener("resize", updateFit);
    return () => window.removeEventListener("resize", updateFit);
  }, [updateFit]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    onRender(ctx, nativeWidth, nativeHeight);
  });

  const mapToNative = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas || fit.scale <= 0) return null;
      const rect = canvas.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const nativeX = Math.floor(relX / fit.scale);
      const nativeY = Math.floor(relY / fit.scale);
      if (nativeX < 0 || nativeX >= nativeWidth || nativeY < 0 || nativeY >= nativeHeight) {
        return null;
      }
      return { x: nativeX, y: nativeY };
    },
    [fit.scale, nativeWidth, nativeHeight]
  );

  return (
    <div
      ref={containerRef}
      style={style}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-black select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={nativeWidth}
        height={nativeHeight}
        style={{
          '--canvas-w': `${fit.width}px`,
          '--canvas-h': `${fit.height}px`,
          '--pixel-render': 'pixelated',
        } as React.CSSProperties}
        onPointerDown={(e) => {
          const pt = mapToNative(e.clientX, e.clientY);
          if (pt && onPixelPointerDown) onPixelPointerDown(pt.x, pt.y, e);
        }}
        onPointerMove={(e) => {
          const pt = mapToNative(e.clientX, e.clientY);
          if (pt && onPixelPointerMove) onPixelPointerMove(pt.x, pt.y, e);
        }}
        onPointerUp={(e) => {
          if (onPixelPointerUp) onPixelPointerUp(e);
        }}
        className="block touch-none w-(--canvas-w) h-(--canvas-h)"
      />

      {showScanlines ? (
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full opacity-35">
          <defs>
            <pattern id="retro-scanlines" width="100%" height="4" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="100%" y2="0" stroke="currentColor" className="text-black/40" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#retro-scanlines)" />
        </svg>
      ) : null}
    </div>
  );
};
