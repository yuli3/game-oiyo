import { type ReactNode, useEffect, useState, useRef } from "react";
import { MobileHapticsPro } from "../../../lib/games/engine-suite-unified";

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
 * Unified semantic telemetry tile with spring squash-and-stretch pulse on value change.
 * Follows shadcn/ui semantic tokens with zero layout shift.
 */
export function GameStatTile({
  label,
  value,
  icon,
  highlight = false,
  className = "",
}: GameStatTileProps) {
  const [bounced, setBounced] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setBounced(true);
    MobileHapticsPro.lightImpact();
    const timer = setTimeout(() => setBounced(false), 240);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div
      className={`rounded-2xl border border-border bg-background p-2.5 transition-all duration-200 ${
        bounced ? "scale-105 shadow-sm -translate-y-0.5" : "scale-100"
      } ${highlight ? "ring-1 ring-primary/40" : ""} ${className}`}
    >
      <div className="text-xs font-semibold text-muted-foreground truncate flex items-center gap-1">
        {icon && <span aria-hidden="true">{icon}</span>}
        <span>{label}</span>
      </div>
      <div
        className={`mt-1 text-sm font-black truncate transition-colors duration-200 ${
          highlight ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
