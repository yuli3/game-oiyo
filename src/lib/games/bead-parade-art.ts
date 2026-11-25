/** The bead colours, the flower launcher and the burrow of Bead Parade (shared by the game and its key art). */
import type { PixelArt } from "./pixel-kit";

export const BEAD_COLORS = ["#fa5252", "#fcc419", "#339af0", "#51cf66", "#cc5de8"];

export const LAUNCHER_ART: PixelArt = {
  palette: { p: "#f783ac", d: "#d6336c", y: "#ffd43b", o: "#f59f00", g: "#2f9e44" },
  rows: ["...pp...", ".pppppp.", "ppdyydpp", "pdyoody.", "pdyoodyp", "ppdyydpp", ".pppppp.", "...gg..."],
};
export const BURROW_ART: PixelArt = {
  palette: { b: "#5c3a1e", d: "#2b1a0c", g: "#69db7c" },
  rows: [".gggggg.", "gbbbbbbg", "bbddddbb", "bddddddb", "bddddddb", "bbddddbb", "gbbbbbbg", ".gggggg."],
};
