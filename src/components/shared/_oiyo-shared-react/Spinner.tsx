/**
 * Spinner — canonical shared component (SSOT: /coding/shared/components-react).
 * Synced into each repo by shared/sync-react.sh. Do NOT edit synced copies.
 *
 * React counterpart of Spinner.astro, for use inside client-side islands
 * (e.g. inside a button disabled by useThrottle's `isThrottling`).
 * CSS-only (Tailwind's animate-spin) — no icon library dependency.
 * No repo-local imports (e.g. no `cn()` util) — portable as-is.
 */
interface SpinnerProps {
  size?: "lg" | "md" | "sm";
  className?: string;
  label?: string;
}

const SIZES: Record<string, string> = {
  lg: "h-10 w-10 border-[3px]",
  md: "h-6 w-6 border-2",
  sm: "h-4 w-4 border-2",
};

export function Spinner({ size = "md", className = "", label = "Loading" }: SpinnerProps) {
  return (
    <span
      className={[
        "inline-block animate-spin rounded-full border-current border-t-transparent text-primary",
        SIZES[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-label={label}
    />
  );
}
