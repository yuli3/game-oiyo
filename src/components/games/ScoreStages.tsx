import { useEffect, useState } from "react";
import StageBar from "./StageBar";
import { loadClearedStages, markStageCleared, nextOpenStage } from "@/lib/games/stage-progress";

const GOAL_LABEL: Record<string, string> = {
  ko: "목표",
  en: "Goal",
  ja: "目標",
  zh: "目标",
  fr: "Objectif",
  es: "Meta",
};

interface Props {
  slug: string;
  /** Ascending score targets, one per stage (stage range 10-50). */
  targets: readonly number[];
  score: number;
  locale: string;
  /** When false the bar still shows, but this run's score does not clear stages (e.g. a separate rule mode). */
  track?: boolean;
}

/**
 * Score-milestone stages for score-attack games: stage N clears the first time a run reaches targets[N].
 * Progress is kept per game in the same store as hand-made puzzle stages.
 */
export default function ScoreStages({ slug, targets, score, locale, track = true }: Props) {
  const count = targets.length;
  const [cleared, setCleared] = useState<number[]>([]);
  const [goal, setGoal] = useState(0);
  useEffect(() => {
    const list = loadClearedStages(slug, count);
    setCleared(list);
    setGoal(nextOpenStage(list, count));
  }, [slug, count]);
  useEffect(() => {
    if (!track) return;
    const reached = targets.reduce((n, target, i) => (score >= target ? i + 1 : n), 0);
    const fresh = Array.from({ length: reached }, (_, i) => i).filter((i) => !cleared.includes(i));
    if (fresh.length === 0) return;
    let list = cleared;
    for (const i of fresh) list = markStageCleared(slug, i, count);
    setCleared(list);
    if (goal < reached) setGoal(Math.min(reached, count - 1));
  }, [score, track, targets, cleared, slug, count, goal]);
  const target = targets[goal] ?? 0;
  const pct = target > 0 ? Math.min(100, (score / target) * 100) : 0;
  return (
    <div className="mt-3 mb-1 space-y-1.5 px-1" data-score-stages>
      <StageBar count={count} current={goal} cleared={cleared} locale={locale} onSelect={setGoal} />
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground tabular-nums">
        <span>{GOAL_LABEL[locale] ?? GOAL_LABEL.en} {target.toLocaleString()}</span>
        <span>{Math.min(score, target).toLocaleString()} / {target.toLocaleString()}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full border border-border/40 bg-muted">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
