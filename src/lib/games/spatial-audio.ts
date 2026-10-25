/**
 * spatial-audio.ts
 *
 * 2D Stereo Panning Spatial Audio Engine for Web Audio API.
 * Maps horizontal viewport coordinates [0, width] to stereo pan [-1, +1]
 * with graceful fallback for environments lacking StereoPannerNode.
 */

export function calculatePanFromX(x: number, arenaWidth: number): number {
  if (arenaWidth <= 0) return 0;
  const clampedX = Math.max(0, Math.min(arenaWidth, x));
  const pan = (clampedX / arenaWidth) * 2 - 1;
  // Round to 3 decimal places for stability
  return Math.round(pan * 1000) / 1000;
}

export function playSpatialTone(
  ctx: AudioContext | null,
  frequency: number,
  options: {
    duration?: number;
    type?: OscillatorType;
    volume?: number;
    x?: number;
    arenaWidth?: number;
  } = {}
): boolean {
  if (!ctx || ctx.state === "suspended") return false;

  const duration = options.duration ?? 0.08;
  const type = options.type ?? "sine";
  const volume = options.volume ?? 0.04;
  const x = options.x ?? (options.arenaWidth ? options.arenaWidth / 2 : 0);
  const arenaWidth = options.arenaWidth ?? 1;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    const panValue = calculatePanFromX(x, arenaWidth);

    // Use StereoPannerNode if supported by browser/AudioContext
    if (typeof ctx.createStereoPanner === "function") {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panValue, ctx.currentTime);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);
    } else {
      osc.connect(gain);
      gain.connect(ctx.destination);
    }

    osc.start();
    osc.stop(ctx.currentTime + duration);
    return true;
  } catch {
    return false;
  }
}
