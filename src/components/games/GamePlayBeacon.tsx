import { useEffect } from "react";
import { recordOpened } from "@/lib/games/records";

export default function GamePlayBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    if (slug) recordOpened(slug);
  }, [slug]);
  return null;
}
