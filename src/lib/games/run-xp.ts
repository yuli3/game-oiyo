// Pays Arcade Pass XP (+25 win / +10 play), daily check-in and mission progress for every
// finished run any game saves to the shared records store. Before this only the few
// games on GameShell paid XP. Installed once per page by GamePlayBeacon.
import { loadArcadePassProgress, processMatchCompletion } from "./arcade-pass";
import { previousDayKey, todayKey } from "./daily";
import { RUN_RECORDED_EVENT, type RunRecordedDetail } from "./records";

export function payRunXp(detail: RunRecordedDetail, now: Date = new Date()) {
  const today = todayKey(now);
  const progressValue = typeof detail.value === "number" && detail.value > 0 ? detail.value : 1;
  return processMatchCompletion(loadArcadePassProgress(today), {
    gameSlug: detail.game,
    progressValue,
    won: detail.won,
    today,
    previousDay: previousDayKey(today),
    now: now.getTime(),
  });
}

let installed = false;

export function installRunXp(): () => void {
  if (installed || typeof window === "undefined") return () => {};
  installed = true;
  const onRun = (event: Event) => {
    const detail = (event as CustomEvent<RunRecordedDetail>).detail;
    if (!detail || typeof detail.game !== "string" || !detail.game) return;
    try {
      payRunXp(detail);
    } catch {
      /* XP is a bonus; never break the game over it */
    }
  };
  window.addEventListener(RUN_RECORDED_EVENT, onRun);
  return () => {
    window.removeEventListener(RUN_RECORDED_EVENT, onRun);
    installed = false;
  };
}
