export function elapsedGameMilliseconds(startedAt: number | null, now: number): number {
  return startedAt === null ? 0 : Math.max(0, now - startedAt);
}

export function displayedGameSeconds(startedAt: number | null, now: number): number {
  return Math.floor(elapsedGameMilliseconds(startedAt, now) / 1000);
}

export function recordedGameSeconds(startedAt: number | null, now: number): number {
  return Math.max(1, Math.ceil(elapsedGameMilliseconds(startedAt, now) / 1000));
}

export function restoredElapsedMilliseconds(elapsedMs: number, savedAtEpochMs: number, nowEpochMs: number): number {
  if (![elapsedMs, savedAtEpochMs, nowEpochMs].every(Number.isFinite) || elapsedMs < 0) return 0;
  return Math.max(0, elapsedMs) + Math.max(0, nowEpochMs - savedAtEpochMs);
}
