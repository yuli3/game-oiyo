/** The pearls, the chili flake and the pin knob of Boba Pins (shared by the game and its key art). Pixel sprites. */
import type { PixelArt } from "./pixel-kit";

export const PEARL_BROWN_ART: PixelArt = {
  palette: { b: "#5c3a1e", l: "#9c6b3f", h: "#e6c49a" },
  rows: [".bbb.", "bhlbb", "blbbb", "bbbbb", ".bbb."],
};
export const PEARL_WHITE_ART: PixelArt = {
  palette: { w: "#f1f3f5", s: "#ced4da", h: "#ffffff" },
  rows: [".www.", "whwws", "wwwws", "wwwss", ".sss."],
};
export const CHILI_ART: PixelArt = {
  palette: { r: "#e03131", d: "#a51111", g: "#2f9e44" },
  rows: ["...g.", "..rg.", ".rrr.", "rrrd.", ".rd.."],
};
export const KNOB_ART: PixelArt = {
  palette: { y: "#fcc419", o: "#e67700", w: "#fff3bf" },
  rows: [".yyy.", "ywyyo", "yyyyo", "yyyoo", ".ooo."],
};
