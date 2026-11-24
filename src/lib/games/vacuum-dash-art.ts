/** The robot vacuum, the dust and the furniture of Vacuum Dash (shared by the game and its key art). 8 × 8 pixel sprites. */
import type { PixelArt } from "./pixel-kit";

export const ROBOT_ART: PixelArt = {
  palette: { k: "#343a40", g: "#868e96", w: "#f1f3f5", b: "#4dabf7", r: "#ff6b6b" },
  rows: ["..kkkk..", ".kggggk.", "kgwbbwgk", "kgwwwwgk", "kgggrggk", "kgggggk.", ".kggggk.", "..kkkk.."],
};
export const DUST_ART: PixelArt = {
  palette: { d: "#a68b6b", l: "#cbb89d" },
  rows: ["........", "..d.....", ".dld..d.", "..d..dl.", "....d...", ".d...ld.", "...dl...", "........"],
};
export const FURNITURE_ART: PixelArt[] = [
  // a potted plant
  { palette: { g: "#2f9e44", l: "#69db7c", p: "#c2410c", k: "#7c2d12" }, rows: ["..g.lg..", ".lgglgg.", "glggglgl", ".gglggg.", "..gglg..", "..pppp..", "..pkpp..", "...pp..."] },
  // an armchair
  { palette: { c: "#5c7cfa", h: "#91a7ff", k: "#364fc7" }, rows: ["........", ".cccccc.", ".chhhhc.", "cchhhhcc", "cccccccc", "cccccccc", "ck....kc", "........"] },
  // a bookcase
  { palette: { w: "#8a5a2b", r: "#e03131", b: "#1971c2", y: "#fcc419", g: "#2f9e44" }, rows: ["wwwwwwww", "wrbyrgbw", "wrbyrgbw", "wwwwwwww", "wgyrbyrw", "wgyrbyrw", "wwwwwwww", "w......w"] },
  // a cat asleep on a cushion
  { palette: { o: "#fd7e14", h: "#ffc078", c: "#e599f7", k: "#212529" }, rows: ["........", "........", ".o...o..", ".oooooo.", "ohkohkoo", "oooooooo", "cccccccc", ".cccccc."] },
];
