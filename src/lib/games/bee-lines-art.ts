/** The bee, the flower (in each pair's colour) and the trail colours of Bee Lines (shared by the game and its key art). */
import type { PixelArt } from "./pixel-kit";

/** One colour per pair of flowers, easy to tell apart. */
export const PAIR_COLORS = ["#f03e3e", "#1c7ed6", "#f59f00", "#37b24d", "#ae3ec9", "#f76707", "#0ca678", "#e64980", "#4263eb", "#82c91e", "#868e96"];

export const BEE_ART: PixelArt = {
  palette: { y: "#ffd43b", k: "#212529", w: "#e7f5ff" },
  rows: ["..ww.ww.", "...wwww.", ".yykyyk.", "yykyykyy", ".yykyyk.", "..k..k.."],
};

const flowers = new Map<string, PixelArt>();
/** A flower with petals in `petal`. */
export function flowerArt(petal: string): PixelArt {
  let a = flowers.get(petal);
  if (!a) {
    a = { palette: { p: petal, y: "#ffe066", w: "#ffffff" }, rows: [".pp.pp.", "pwppppp", ".ppyyp.", "ppyyypp", ".pyypp.", "ppppwpp", ".pp.pp."] };
    flowers.set(petal, a);
  }
  return a;
}
