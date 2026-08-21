export type EnemyKind = "scout" | "stinger" | "warden";
export type EnemyMode = "forming" | "formation" | "diving" | "returning" | "tractor";

export interface FormationSlot {
  x: number;
  y: number;
  row: number;
  column: number;
  kind: EnemyKind;
}

export function formationSlots(wave: number): FormationSlot[] {
  const rows = Math.min(5, 3 + Math.floor(Math.max(1, wave) / 3));
  const columns = 8;
  const slots: FormationSlot[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const kind: EnemyKind = row === 0 && column >= 2 && column <= 5
        ? "warden"
        : row <= 1 ? "stinger" : "scout";
      slots.push({
        x: (column - (columns - 1) / 2) * 1.75,
        y: 5.2 - row * 1.22,
        row,
        column,
        kind,
      });
    }
  }
  return slots;
}

export function divePoint(progress: number, originX: number, targetX: number, side: number) {
  const t = Math.max(0, Math.min(1, progress));
  const arc = Math.sin(t * Math.PI);
  return {
    x: originX * (1 - t) + targetX * t + arc * 5.2 * Math.sign(side || 1),
    y: 5 - t * 13 + Math.sin(t * Math.PI * 2) * 1.1,
    z: arc * 2.4,
  };
}

export function shouldDive(wave: number, elapsedSeconds: number, index: number): boolean {
  const interval = Math.max(1.8, 4.8 - Math.max(1, wave) * 0.16);
  return elapsedSeconds > 2 && Math.floor(elapsedSeconds / interval) % Math.max(2, 5 - Math.floor(wave / 3)) === index % Math.max(2, 5 - Math.floor(wave / 3));
}

export function tractorRadius(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return 0.45 + t * 2.7;
}

export function inTractorBeam(shipX: number, emitterX: number, beamProgress: number): boolean {
  return Math.abs(shipX - emitterX) <= tractorRadius(beamProgress) * 0.72;
}

export function enemyScore(kind: EnemyKind, diving: boolean, chain: number): number {
  const base = kind === "warden" ? 240 : kind === "stinger" ? 130 : 80;
  return Math.round(base * (diving ? 2 : 1) * (1 + Math.min(10, Math.max(0, chain)) * 0.1));
}

export function waveBonus(wave: number, capturedShipRescued: boolean): number {
  return Math.max(1, Math.floor(wave)) * 500 + (capturedShipRescued ? 1_500 : 0);
}

export type NeonReview = "accuracy" | "rescue" | "wave";
export function reviewNeonSortie(result: { accuracy: number; rescues: number; wave: number }): NeonReview {
  if (result.accuracy < 35) return "accuracy";
  if (result.rescues === 0 && result.wave >= 2) return "rescue";
  return "wave";
}

export function nextExtraLifeThreshold(score: number): number {
  return (Math.floor(Math.max(0, score) / 20_000) + 1) * 20_000;
}

export function clampShipX(x: number): number {
  return Math.max(-7.2, Math.min(7.2, x));
}

