import { useEffect } from "react";
import { recordAchievementEvent, recordOpened } from "@/lib/games/records";

export default function GamePlayBeacon({ slug, prototype = false }: { slug: string; prototype?: boolean }) {
  useEffect(() => {
    if (slug) recordOpened(slug);
    if (!slug || !prototype) return;

    const iframe = document.querySelector<HTMLIFrameElement>(`[data-release-shell="${CSS.escape(slug)}"] iframe`);
    if (!iframe) return;

    let played = false;
    const markPlayed = () => {
      if (played) return;
      played = true;
      recordAchievementEvent(slug, "played");
    };
    const detach = () => {
      try {
        iframe.contentWindow?.removeEventListener("pointerdown", markPlayed);
        iframe.contentWindow?.removeEventListener("keydown", markPlayed);
      } catch {}
    };
    const attach = () => {
      detach();
      try {
        iframe.contentWindow?.addEventListener("pointerdown", markPlayed, { once: true });
        iframe.contentWindow?.addEventListener("keydown", markPlayed, { once: true });
      } catch {}
    };

    iframe.addEventListener("load", attach);
    attach();
    return () => {
      iframe.removeEventListener("load", attach);
      detach();
    };
  }, [prototype, slug]);
  return null;
}
