import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";

/* A short recorded clip of a mode being played, shown next to that mode's description.
 * The file is requested only when the clip mounts (the player picked the mode), plays once,
 * muted, and then offers a replay. With Reduce Motion on it waits for the button.
 * Clips are produced by coding/scripts/motion (2026-10-07). */

interface Props {
  src: string;
  poster: string;
  width: number;
  height: number;
  label: string;
  replay: string;
}

export default function UsageClip({ src, poster, width, height, label, replay }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [idle, setIdle] = useState(true);

  const start = () => {
    const video = videoRef.current;
    if (!video) return;
    setIdle(false);
    video.currentTime = 0;
    // A refused play (data saver, low power mode) leaves the poster and the button.
    void video.play().catch(() => setIdle(true));
  };

  useEffect(() => {
    if (!reducedMotion) start();
    // Runs once per mount: picking the mode is what asks for the clip.
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-2xl border border-border bg-card">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        width={width}
        height={height}
        muted
        playsInline
        preload="none"
        aria-label={label}
        onEnded={() => setIdle(true)}
        className="block h-auto w-full"
      />
      {idle && (
        <button
          type="button"
          onClick={start}
          className="absolute bottom-3 right-3 min-h-11 rounded-full border border-border bg-card px-4 text-sm font-bold text-foreground shadow-sm"
        >
          {replay}
        </button>
      )}
    </div>
  );
}
