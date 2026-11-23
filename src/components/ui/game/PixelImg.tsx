import { useEffect, useState } from "react";
import { spriteDataUrl, type PixelArt } from "../../../lib/games/pixel-kit";

/**
 * A pixel-kit sprite as an <img>. The data URL is built after mount (the
 * server has no canvas), so the first paint is an empty, sized box.
 */
export default function PixelImg({ art, scale = 4, className = "", alt = "" }: { art: PixelArt; scale?: number; className?: string; alt?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    setSrc(spriteDataUrl(art, scale));
  }, [art, scale]);
  const w = art.rows[0]?.length ?? 0;
  const h = art.rows.length;
  if (!src) return <span aria-hidden={alt ? undefined : true} className={className} />;
  return <img src={src} alt={alt} width={w * scale} height={h * scale} draggable={false} className={`pixelated ${className}`} />;
}

/**
 * Data URLs for a fixed set of sprites, built after mount. Pass a stable
 * (module-level or memoised) record; an empty record comes back on the server.
 */
export function usePixelUrls<K extends string>(arts: Readonly<Record<K, PixelArt>>, scale = 2): Partial<Record<K, string>> {
  const [urls, setUrls] = useState<Partial<Record<K, string>>>({});
  useEffect(() => {
    const next: Partial<Record<K, string>> = {};
    for (const key of Object.keys(arts) as K[]) next[key] = spriteDataUrl(arts[key], scale);
    setUrls(next);
  }, [arts, scale]);
  return urls;
}
