/** The magnet robot and the battery of Upside Dash (shared by the game and its key art). 8 × 8 pixel sprites. */
import type { PixelArt } from "./pixel-kit";

export const BOT_ART: PixelArt = {
  palette: { k: "#212529", b: "#4dabf7", l: "#a5d8ff", w: "#f8f9fa", r: "#ff6b6b", m: "#868e96" },
  rows: ["..k..k..", "..r..r..", ".kkkkkk.", "kbwbbwbk", "kbbllbbk", "kbbbbbbk", ".kmkkmk.", ".mm..mm."],
};
export const BATTERY_ART: PixelArt = {
  palette: { k: "#343a40", y: "#ffd43b", g: "#51cf66", w: "#ffffff" },
  rows: ["...kk...", "..kkkk..", "..kwgk..", "..kggk..", "..kggk..", "..kyyk..", "..kyyk..", "..kkkk.."],
};
