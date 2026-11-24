/** The fruit and the bee of Juice Swipe (shared by the game and its key art). 8 × 8 pixel sprites. */
import type { PixelArt } from "./pixel-kit";

export const FRUIT_ART: PixelArt[] = [
  // orange
  { palette: { o: "#fd7e14", h: "#ffc078", g: "#2f9e44" }, rows: ["...gg...", "..oooo..", ".ohoooo.", "ohoooooo", "oooooooo", "oooooooo", ".oooooo.", "..oooo.."] },
  // apple
  { palette: { r: "#e03131", h: "#ff8787", g: "#2f9e44", b: "#5c3a1e" }, rows: ["...bg...", ".rr.rrr.", "rhrrrrrr", "rhrrrrrr", "rrrrrrrr", "rrrrrrrr", ".rrrrrr.", "..rr.rr."] },
  // kiwi (cut face)
  { palette: { b: "#8a5a2b", g: "#82c91e", w: "#f4fce3", k: "#212529" }, rows: ["..bbbb..", ".bggggb.", "bggkggkb", "bgkwwggb", "bggwwkgb", "bgkggggb", ".bggkgb.", "..bbbb.."] },
  // lemon
  { palette: { y: "#fcc419", h: "#fff3bf", g: "#2f9e44" }, rows: ["......g.", "..yyyy..", ".yhyyyy.", "yhyyyyyy", "yyyyyyyy", ".yyyyyy.", "..yyyy..", "........"] },
  // grapes
  { palette: { p: "#7048e8", h: "#b197fc", g: "#2f9e44" }, rows: ["...g....", "..gpp...", ".phppp..", "ppppphp.", ".pphppp.", "..pppp..", "...pp...", "........"] },
  // peach
  { palette: { p: "#ff8787", y: "#ffc9c9", g: "#2f9e44" }, rows: ["....gg..", "..pp.p..", ".pyppppp", "pyyppppp", "ppppppp.", "ppppppp.", ".ppppp..", "..ppp..."] },
];
export const BEE_ART: PixelArt = { palette: { y: "#fcc419", k: "#212529", w: "#e7f5ff" }, rows: ["..ww.ww.", "..wwwww.", ".kyykyy.", "kyykyykk", "kyykyykk", ".kyykyy.", "..k..k..", "........"] };
