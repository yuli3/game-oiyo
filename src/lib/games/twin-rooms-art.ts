/** The furniture and keepsakes of Twin Rooms, each in two colourways (shared by the game and its key art). 10 × 10. */
import type { PixelArt } from "./pixel-kit";

interface Item { rows: string[]; palettes: [Record<string, string>, Record<string, string>] }

export const ITEMS: Item[] = [
  // 0 lamp
  { rows: ["...aaaa...", "..aaaaaa..", ".aaaaaaaa.", "....kk....", "....kk....", "....kk....", "....kk....", "...kkkk...", "..kkkkkk..", ".........."],
    palettes: [{ a: "#ffd43b", k: "#495057" }, { a: "#74c0fc", k: "#495057" }] },
  // 1 potted plant
  { rows: ["..g..g....", ".ggg.gg.g.", "..ggggggg.", ".gggggg...", "...gggg...", "....g.....", "..pppppp..", "..pppppp..", "...pppp...", ".........."],
    palettes: [{ g: "#40c057", p: "#e8590c" }, { g: "#40c057", p: "#7048e8" }] },
  // 2 cat
  { rows: [".k......k.", ".kk....kk.", ".kkkkkkkk.", ".kwkkkkwk.", ".kkkppkkk.", "..kkkkkk..", ".kkkkkkkk.", ".kkkkkkkkk", ".kkkkkkk.k", ".kk.kk.kk."],
    palettes: [{ k: "#fd7e14", w: "#212529", p: "#ff8787" }, { k: "#495057", w: "#fcc419", p: "#ff8787" }] },
  // 3 wall clock
  { rows: ["..cccccc..", ".cwwwwwwc.", "cwwwkwwwwc", "cwwwkwwwwc", "cwwwkkkwwc", "cwwwwwwwwc", "cwwwwwwwwc", ".cwwwwwwc.", "..cccccc..", ".........."],
    palettes: [{ c: "#e03131", w: "#fff9db", k: "#212529" }, { c: "#2f9e44", w: "#fff9db", k: "#212529" }] },
  // 4 framed picture (a sun over a hill)
  { rows: ["ffffffffff", "fssssssyyf", "fsssssyyyf", "fssssssyyf", "fssgggsssf", "fsgggggssf", "fggggggggf", "ffffffffff", "..........", ".........."],
    palettes: [{ f: "#a0652d", s: "#d0ebff", y: "#ffd43b", g: "#69db7c" }, { f: "#a0652d", s: "#ffe8cc", y: "#ff6b6b", g: "#69db7c" }] },
  // 5 mug
  { rows: ["..........", "...w..w...", "....w..w..", ".mmmmmm...", ".mmmmmmmm.", ".mmhmmm.m.", ".mmhmmmmm.", ".mmmmmm...", "..mmmm....", ".........."],
    palettes: [{ m: "#4dabf7", h: "#e7f5ff", w: "#ced4da" }, { m: "#f783ac", h: "#fff0f6", w: "#ced4da" }] },
  // 6 stack of books
  { rows: ["..........", "..........", "..rrrrrr..", "..rwwwwr..", ".bbbbbbbb.", ".bwwwwwwb.", "..yyyyyyy.", "..ywwwwwy.", ".gggggggg.", ".gwwwwwwg."],
    palettes: [{ r: "#fa5252", b: "#339af0", y: "#fcc419", g: "#51cf66", w: "#f8f9fa" }, { r: "#be4bdb", b: "#339af0", y: "#fcc419", g: "#ff922b", w: "#f8f9fa" }] },
  // 7 chair
  { rows: [".cc.......", ".cc.......", ".cc.......", ".cc.......", ".cccccccc.", ".cccccccc.", ".c......c.", ".c......c.", ".c......c.", ".........."],
    palettes: [{ c: "#8a5a2b" }, { c: "#1c7ed6" }] },
  // 8 teddy bear
  { rows: [".tt....tt.", ".tttttttt.", "..tkttkt..", "..ttnntt..", "...tttt...", ".tttttttt.", "tt.tllt.tt", "...tllt...", "..tt..tt..", ".........."],
    palettes: [{ t: "#c08a4a", k: "#212529", n: "#5c3a1e", l: "#e9c46a" }, { t: "#fcc2d7", k: "#212529", n: "#a61e4d", l: "#fff0f6" }] },
  // 9 rubber duck
  { rows: ["..........", "....yyy...", "...yyyyy..", "...yykyoo.", "...yyyy...", ".y.yyyyy..", ".yyyyyyyy.", ".yyyyyyyy.", "..yyyyyy..", ".........."],
    palettes: [{ y: "#ffd43b", k: "#212529", o: "#f76707" }, { y: "#ffffff", k: "#212529", o: "#f76707" }] },
  // 10 vase of tulips
  { rows: ["..r..r.r..", ".rrr.rrrr.", "..g..g.g..", "...g.gg...", "....ggg...", "...vvvv...", "..vvvvvv..", "..vvhvvv..", "...vvvv...", ".........."],
    palettes: [{ r: "#f03e3e", g: "#2f9e44", v: "#748ffc", h: "#dbe4ff" }, { r: "#fcc419", g: "#2f9e44", v: "#748ffc", h: "#dbe4ff" }] },
  // 11 radio
  { rows: ["......a...", ".....a....", "....a.....", ".rrrrrrrr.", ".rssrrkkr.", ".rssrrkkr.", ".rssrrrrr.", ".rrrrrrrr.", "..r....r..", ".........."],
    palettes: [{ r: "#e8590c", s: "#495057", k: "#ffd43b", a: "#868e96" }, { r: "#12b886", s: "#495057", k: "#ffd43b", a: "#868e96" }] },
];

/** Item i in colourway v, flipped or not, as a sprite. */
const cache = new Map<string, PixelArt>();
export function itemArt(i: number, v: number, flip = false): PixelArt {
  const key = `${i}:${v}:${flip ? 1 : 0}`;
  let art = cache.get(key);
  if (!art) {
    const it = ITEMS[i];
    art = { palette: it.palettes[v], rows: flip ? it.rows.map((r) => r.split("").reverse().join("")) : it.rows };
    cache.set(key, art);
  }
  return art;
}
