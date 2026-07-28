export function elapsedGameMilliseconds(startedAt: number | null, now: number): number {
  return startedAt === null ? 0 : Math.max(0, now - startedAt);
}

export function displayedGameSeconds(startedAt: number | null, now: number): number {
  return Math.floor(elapsedGameMilliseconds(startedAt, now) / 1000);
}

export function recordedGameSeconds(startedAt: number | null, now: number): number {
  return Math.max(1, Math.ceil(elapsedGameMilliseconds(startedAt, now) / 1000));
}
