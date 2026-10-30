import type { ReactNode } from "react";

export interface GameStatTileProps {
  label: string;
  value: ReactNode;
  icon?: string;
  highlight?: boolean;
  className?: string;
}

/**
 * GameStatTile
 *
 * Unified semantic telemetry tile following shadcn/ui design tokens.
 * Replaces repetitive inline `rounded-2xl border border-border bg-background p-2.5` patterns.
 */
export function GameStatTile({
  label,
  value,
  icon,
  highlight = false,
  className = "",
}: GameStatTileProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-background p-2.5 transition-colors ${
        highlight ? "ring-1 ring-primary/40" : ""
      } ${className}`}
    >
      <div className="text-xs font-semibold text-muted-foreground truncate flex items-center gap-1">
        {icon && <span aria-hidden="true">{icon}</span>}
        <span>{label}</span>
      </div>
      <div
        className={`mt-1 text-sm font-black truncate ${
          highlight ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
