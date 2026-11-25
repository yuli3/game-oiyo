/** The frog (its body takes the colour it eats) and the lily pad of Lily Loop (shared by the game and its key art). */
import type { PixelArt } from "./pixel-kit";

/** The frog, with its body left as `c` for the colour it eats. */
export function frogArt(body: string): PixelArt {
  return {
    palette: { c: body, w: "#ffffff", k: "#212529", d: "#00000033", p: "#ff8787" },
    rows: [
      ".ww....ww.",
      "wkwc..cwkw",
      "cwwccccwwc",
      "cccccccccc",
      "cpccccccpc",
      ".ckkkkkkc.",
      "..cccccc..",
      ".cc.dd.cc.",
    ],
  };
}
export const PAD_ART: PixelArt = {
  palette: { g: "#69db7c", d: "#2f9e44", l: "#b2f2bb" },
  rows: ["..gggggg..", ".gglggggg.", "gglgggg.gg", "gggggg..dg", "ggggggd..g", ".gggggggg.", "..dddddd.."],
};
