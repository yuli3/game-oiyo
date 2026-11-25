/** The hamster, the cookie, the sparkle and the thorn of Snack Swing (shared by the game and its key art). Pixel sprites. */
import type { PixelArt } from "./pixel-kit";

export const HAMSTER_ART: PixelArt = {
  palette: { o: "#f59f00", l: "#ffd8a8", w: "#ffffff", k: "#212529", p: "#ff8787", r: "#c92a2a" },
  rows: [
    ".oo......oo.",
    "oppo....oppo",
    "oooooooooooo",
    "olllllllllo.",
    "olkwllllwklo",
    "ollllrrlllll",
    "olllrrrrllll",
    "ollllrrlllll",
    ".olllllllllo",
    "..oooooooo..",
  ],
};
export const COOKIE_ART: PixelArt = {
  palette: { c: "#d9a066", d: "#8a5a2b", h: "#f1c27d" },
  rows: ["..cccc..", ".chccdc.", "cchcccdc", "cdcchccc", "ccccdcch", "cchcccdc", ".cdcchc.", "..cccc.."],
};
export const SPARKLE_ART: PixelArt = {
  palette: { y: "#ffd43b", w: "#fff9db" },
  rows: ["...y...", "...y...", "..ywy..", "yywwwyy", "..ywy..", "...y...", "...y..."],
};
export const THORN_ART: PixelArt = {
  palette: { g: "#2b8a3e", d: "#1e5f2c", r: "#e03131" },
  rows: ["...r....", "..gg..r.", "r.gdg.g.", ".gdddgg.", "ggddddgr", ".gdddgg.", "r.gdg.g.", "...g..r."],
};
