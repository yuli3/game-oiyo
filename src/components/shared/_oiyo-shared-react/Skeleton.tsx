/**
 * Skeleton — canonical shared component (SSOT: /coding/shared/components-react).
 * Synced into each repo by shared/sync-react.sh. Do NOT edit synced copies.
 *
 * React counterpart of Skeleton.astro, for use inside client-side islands
 * (e.g. alongside useThrottle while a submit/calculation is in flight).
 * Preset shapes reuse the `.oiyo-shimmer` utility class defined once in each
 * repo's global.css, so the animation matches the Astro version exactly.
 * No repo-local imports (e.g. no `cn()` util) — portable as-is.
 */
interface SkeletonProps {
  variant?: "avatar" | "button" | "card" | "text";
  className?: string;
}

const VARIANTS: Record<string, string> = {
  avatar: "h-12 w-12 rounded-full",
  button: "h-10 w-24 rounded-md",
  card: "h-48 w-full rounded-xl",
  text: "h-4 w-full rounded-md",
};

export function Skeleton({ variant = "text", className = "" }: SkeletonProps) {
  return (
    <div className={["oiyo-shimmer bg-muted", VARIANTS[variant], className].filter(Boolean).join(" ")} />
  );
}
