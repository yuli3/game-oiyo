import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { DataTexture, Material, Mesh, MeshLambertMaterial, MeshStandardMaterial, NearestFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace } from "three";
import { mulberry } from "../../lib/games/pixel-kit";

/** Canvas DPR for the pixel-art 3D look: render small, upscale with `pixelated`. */
export const PIXEL_SCENE_DPR = 0.45;

const SIZE = 16;

/** A tileable 16x16 dithered stone texture (grey levels, darker grout edge). Pure. */
export function pixelSurfacePixels(seed = 7): Uint8Array {
  const rand = mulberry(seed);
  const out = new Uint8Array(SIZE * SIZE * 4);
  const levels = [206, 222, 236, 248];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const grout = x === 0 || y === 0;
      const bevel = x === SIZE - 1 || y === SIZE - 1;
      const v = grout ? 168 : bevel ? 196 : levels[Math.floor(rand() * levels.length)];
      const i = (y * SIZE + x) * 4;
      out[i] = v;
      out[i + 1] = v;
      out[i + 2] = v;
      out[i + 3] = 255;
    }
  }
  return out;
}

/**
 * Gives every lit, untextured mesh in the scene a dithered pixel surface and
 * flat shading, so primitive pillars and boards read as pixel-art blocks.
 * New meshes are picked up on a slow poll; set `userData.noPixel` to opt out.
 */
export default function PixelMaterials({ repeat = 2 }: { repeat?: number }) {
  const scene = useThree((s) => s.scene);
  const texture = useMemo(() => {
    const tex = new DataTexture(pixelSurfacePixels(), SIZE, SIZE, RGBAFormat);
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.colorSpace = SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [repeat]);

  const apply = useMemo(
    () => () => {
      scene.traverse((obj) => {
        if (!(obj instanceof Mesh) || obj.userData.noPixel) return;
        const list: Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of list) {
          if (mat.userData.pixelated) continue;
          mat.userData.pixelated = true;
          if ((mat instanceof MeshStandardMaterial || mat instanceof MeshLambertMaterial) && !mat.map && !mat.transparent) {
            mat.map = texture;
            mat.flatShading = true;
            mat.needsUpdate = true;
          }
        }
      });
    },
    [scene, texture],
  );

  useEffect(() => {
    apply();
    return () => texture.dispose();
  }, [apply, texture]);

  let tick = 0;
  useFrame(() => {
    tick += 1;
    if (tick % 30 === 0) apply();
  });
  return null;
}
