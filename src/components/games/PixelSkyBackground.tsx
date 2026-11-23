import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { DataTexture, NearestFilter, RGBAFormat, SRGBColorSpace, type Texture } from "three";
import { backdropPixels, type BackdropSpec } from "../../lib/games/pixel-kit";

/**
 * Sets a three.js scene background to a pixel-art backdrop (dithered sky,
 * stars, hills) from pixel-kit. Replaces flat `<color attach="background">`.
 */
export default function PixelSkyBackground({ spec, width = 160, height = 100 }: { spec: BackdropSpec; width?: number; height?: number }) {
  const scene = useThree((s) => s.scene);
  const texture = useMemo(() => {
    const src = backdropPixels(width, height, spec);
    // DataTexture rows run bottom-up; flip so the sky stays on top.
    const data = new Uint8Array(src.length);
    const row = width * 4;
    for (let y = 0; y < height; y += 1) data.set(src.subarray(y * row, (y + 1) * row), (height - 1 - y) * row);
    const tex = new DataTexture(data, width, height, RGBAFormat);
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
    tex.colorSpace = SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [spec, width, height]);
  useEffect(() => {
    const previous = scene.background;
    scene.background = texture as Texture;
    return () => {
      scene.background = previous;
      texture.dispose();
    };
  }, [scene, texture]);
  return null;
}
