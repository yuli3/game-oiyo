/** The marble, the pail and the thumbtack of Chalk Roll (shared by the game and its key art). Pixel sprites. */
import type { PixelArt } from "./pixel-kit";

export const MARBLE_ART: PixelArt = {
  palette: { b: "#1c7ed6", l: "#74c0fc", w: "#ffffff", d: "#1864ab" },
  rows: ["..bbbb..", ".blllbb.", "blwlbbbb", "bllbbbbb", "bbbbbbdb", "bbbbbddb", ".bbbddb.", "..bbbb.."],
};
export const PAIL_ART: PixelArt = {
  palette: { k: "#495057", r: "#fa5252", d: "#c92a2a", w: "#ffe3e3" },
  rows: [
    "k............k",
    ".k..........k.",
    "rrrrrrrrrrrrrr",
    "rwrrrrrrrrrrrr",
    "rwrrrrrrrrrrdr",
    ".rrrrrrrrrrdr.",
    ".rrrrrrrrrrdr.",
    ".rrrrrrrrrrdr.",
    "..rrrrrrrrdr..",
    "..dddddddddd..",
  ],
};
export const TACK_ART: PixelArt = {
  palette: { y: "#fcc419", o: "#e67700", s: "#adb5bd", w: "#fff3bf" },
  rows: ["..yyyy..", ".ywyyyo.", "yywyyyyo", "yyyyyyyo", ".yyyyoo.", "...ss...", "...ss...", "....s..."],
};
