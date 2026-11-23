import { useEffect, useRef } from "react";
import { drawBackdrop, drawSprite } from "../../lib/games/pixel-kit";
import { FLAME_A, FLAME_B, KITCHEN_WALL, SKILLET, STEAK_BY_HEAT } from "../../lib/games/pixel-sprites";

const PX = 3;

/**
 * The pixel stove behind Chef Physics: flames follow the heat bin, steam
 * follows moisture, the steak browns with heat and splits once cut.
 * Purely visual; the rules live in lib/games/chef-physics.
 */
export default function ChefStove({ heat, moisture, cut, still }: { heat: number; moisture: number; cut: boolean; still: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const state = useRef({ heat, moisture, cut });
  state.current = { heat, moisture, cut };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let raf = 0;
    let disposed = false;
    const paint = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const { heat: hb, moisture: mb, cut: isCut } = state.current;
      drawBackdrop(ctx, w, h, KITCHEN_WALL, PX);
      const cx = Math.round(w / 2 / PX) * PX;
      const counterY = h - 11 * PX;
      // Counter and stove body.
      ctx.fillStyle = "#57534e";
      ctx.fillRect(0, counterY, w, h - counterY);
      ctx.fillStyle = "#a8a29e";
      ctx.fillRect(0, counterY, w, PX);
      ctx.fillStyle = "#292524";
      ctx.fillRect(cx - 30 * PX, counterY + 3 * PX, 60 * PX, 6 * PX);
      for (let k = 0; k < 3; k += 1) {
        const kx = cx - 20 * PX + k * 20 * PX;
        ctx.fillStyle = k <= hb - 1 || (k === 0 && hb > 0) ? "#f97316" : "#78716c";
        ctx.fillRect(kx - PX, counterY + 5 * PX, 3 * PX, 2 * PX);
      }
      // Burner grate.
      const grateY = counterY - 3 * PX;
      ctx.fillStyle = "#1c1917";
      ctx.fillRect(cx - 18 * PX, grateY, 36 * PX, PX);
      for (let g = -18; g <= 17; g += 6) ctx.fillRect(cx + g * PX, grateY, PX, 3 * PX);
      // Flames: none, low ring, or tall roar.
      const t = still ? 0 : now / 1000;
      if (hb > 0) {
        const count = hb === 1 ? 3 : 5;
        for (let f = 0; f < count; f += 1) {
          const fx = cx + (f - (count - 1) / 2) * 6 * PX;
          const flick = Math.floor(t * 8 + f) % 2;
          const scale = hb === 1 ? 2 : 3;
          drawSprite(ctx, flick ? FLAME_A : FLAME_B, fx, grateY - 4 * scale + PX, { scale, center: true, alpha: 0.95 });
        }
      }
      // Skillet sits on the grate; the steak sits in it.
      const panY = grateY - (hb === 2 ? 14 : 10) * PX;
      drawSprite(ctx, SKILLET, cx + 5 * PX, panY, { scale: PX, center: true });
      const steak = STEAK_BY_HEAT[Math.max(0, Math.min(2, hb))];
      const steakY = panY - 4 * PX;
      if (!isCut) {
        drawSprite(ctx, steak, cx - 2 * PX, steakY, { scale: PX, center: true });
      } else {
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.beginPath();
          const half = 7 * PX;
          ctx.rect(side < 0 ? cx - 2 * PX - half : cx - 2 * PX, steakY - 6 * PX, half, 12 * PX);
          ctx.clip();
          drawSprite(ctx, steak, cx - 2 * PX + side * 3 * PX, steakY, { scale: PX, center: true });
          ctx.restore();
        }
      }
      // Steam rises with moisture; smoke curls off a scorching pan.
      const puffs = mb * 4 + (hb === 2 && mb === 0 ? 3 : 0);
      for (let p = 0; p < puffs; p += 1) {
        const life = (t * 0.6 + p / Math.max(1, puffs)) % 1;
        const px = cx - 2 * PX + Math.round(Math.sin(p * 2.3 + t * 2) * 6 + (p % 4) * 3 - 5) * PX;
        const py = steakY - 5 * PX - Math.round(life * 22) * PX;
        ctx.globalAlpha = (1 - life) * 0.75;
        ctx.fillStyle = mb === 0 ? "#57534e" : "#94a3b8";
        const size = life < 0.5 ? 2 : 3;
        ctx.fillRect(px, py, size * PX, size * PX);
      }
      ctx.globalAlpha = 1;
    };
    const loop = (now: number) => {
      if (disposed) return;
      paint(now);
      if (!still) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, [still, heat, moisture, cut]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />;
}
