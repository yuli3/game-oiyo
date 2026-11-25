/** The monkey, the banana and the vine's leafy knot of Vine Leap (shared by the game and its key art). Pixel sprites. */
import type { PixelArt } from "./pixel-kit";

export const MONKEY_ART: PixelArt = {
  palette: { b: "#8a5a2b", d: "#5c3a1e", f: "#f1c27d", k: "#212529", w: "#ffffff", p: "#ff8787" },
  rows: [
    "..bbbbbb..",
    "fbbbbbbbbf",
    "fbffffffbf",
    ".bfkwfkwb.",
    ".bffffffb.",
    "..fpffpf..",
    "..bffffb..",
    ".bbbbbbbb.",
    "bb.bbbb.bb",
    "...d..d...",
  ],
};
export const BANANA_ART: PixelArt = {
  palette: { y: "#ffd43b", o: "#f59f00", d: "#5c3a1e" },
  rows: [".....d", "....yo", "...yyo", "..yyo.", ".yyo..", "yyo...", "oo...."],
};
export const KNOT_ART: PixelArt = {
  palette: { g: "#40c057", d: "#2b8a3e", l: "#8ce99a" },
  rows: ["..gg..", ".glgg.", "gggdgg", "gdgggg", ".ggdg.", "..gg.."],
};
