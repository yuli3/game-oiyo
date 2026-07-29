/**
 * WebGL capability probe, extracted from SpatialMemory so every 3D game asks
 * the same question the same way.
 *
 * Every 3D game needs a non-WebGL path — not as a nicety but because the scene
 * chunk is ~900KB and a device that cannot render it must never be made to
 * download it. Call this before mounting a lazily-imported scene.
 */
export function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    // Some hardened browsers throw rather than returning null.
    return false;
  }
}
