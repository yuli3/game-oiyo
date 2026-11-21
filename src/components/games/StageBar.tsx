import { STAGE_LABEL } from "@/lib/games/stage-progress";

interface Props {
  count: number;
  current: number;
  cleared: readonly number[];
  locale: string;
  onSelect: (index: number) => void;
}

/**
 * Row of numbered stage buttons for hand-made puzzle lists (stage range 10-50).
 * Every stage stays open, so a stuck player can skip ahead; cleared ones get a check.
 */
export default function StageBar({ count, current, cleared, locale, onSelect }: Props) {
  const label = STAGE_LABEL[locale] ?? STAGE_LABEL.en;
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1.5" data-stage-bar>
      <span className="mr-1 text-xs font-bold text-muted-foreground tabular-nums">
        {label} {current + 1} / {count}
      </span>
      {Array.from({ length: count }, (_, i) => {
        const done = cleared.includes(i);
        const active = i === current;
        return (
          <button
            key={i}
            type="button"
            aria-current={active ? "step" : undefined}
            aria-label={`${label} ${i + 1}${done ? " ✓" : ""}`}
            onClick={() => onSelect(i)}
            className={`min-h-11 min-w-11 rounded-lg border text-xs font-bold tabular-nums transition ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : done
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {done && !active ? "✓" : i + 1}
          </button>
        );
      })}
    </nav>
  );
}
