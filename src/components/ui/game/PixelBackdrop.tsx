import { useEffect, useRef } from "react";
import { drawBackdrop, type BackdropSpec } from "../../../lib/games/pixel-kit";

/** A pixel-kit backdrop that fills its positioned parent and redraws on resize. */
export default function PixelBackdrop({ spec, px = 4, className = "" }: { spec: BackdropSpec; px?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
      const ctx = canvas.getContext("2d");
      if (ctx) drawBackdrop(ctx, canvas.width, canvas.height, spec, px);
    };
    paint();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(paint);
    ro?.observe(canvas);
    return () => ro?.disconnect();
  }, [spec, px]);
  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 size-full ${className}`} />;
}
