/** The twelve snack tiles of Trio Tray (shared by the game and its key art). 7 × 7 pixel sprites. */
import type { PixelArt } from "./pixel-kit";

const K = "#212529";
export const SNACKS: PixelArt[] = [
  // apple
  { palette: { r: "#e03131", g: "#2f9e44", w: "#ffc9c9", b: "#862e9c", k: K }, rows: ["...g...", "..g....", ".rrrrr.", "rrwrrrr", "rrrrrrr", "rrrrrrr", ".rr.rr."] },
  // cherries
  { palette: { r: "#c92a2a", g: "#2f9e44", w: "#ffa8a8" }, rows: ["....g..", "...g.g.", "..g...g", ".g...rr", "rr..rwr", "rwr.rrr", "rrr...."] },
  // donut
  { palette: { p: "#f783ac", d: "#d9480f", y: "#ffd43b", b: "#74c0fc" }, rows: [".ppppp.", "ppypbpp", "ppd.dpp", "pp...pp", "pbd.dyp", "ppppppp", ".ddddd."] },
  // cupcake
  { palette: { c: "#fff0f6", p: "#f06595", r: "#e03131", b: "#a87545", d: "#7f5539" }, rows: ["...r...", "..ccc..", ".ccccc.", "cpcccpc", ".bdbdb.", ".bdbdb.", "..bbb.."] },
  // sandwich
  { palette: { b: "#e9b872", c: "#ffd43b", g: "#40c057", t: "#fa5252", d: "#b07d3e" }, rows: ["...b...", "..bbb..", ".bbbbb.", "ggggggg", "ttctctt", "bbbbbbb", "ddddddd"] },
  // pear
  { palette: { y: "#c0eb75", g: "#2f9e44", b: "#7f5539", w: "#e9fac8" }, rows: ["...b...", "...yg..", "..yyy..", "..ywy..", ".yyyyy.", ".yyyyy.", "..yyy.."] },
  // watermelon slice
  { palette: { r: "#fa5252", g: "#2b8a3e", w: "#f8f9fa", k: K }, rows: ["rrrrrrr", "rkrrrkr", ".rrrrr.", ".rrkrr.", "..rrr..", "..www..", "...g..."] },
  // cookie
  { palette: { b: "#d9a066", k: "#5c3a1e" }, rows: ["..bbb..", ".bbkbb.", "bkbbbkb", "bbbkbbb", "bkbbbbb", ".bbbkb.", "..bbb.."] },
  // lemon
  { palette: { y: "#fcc419", w: "#fff3bf", g: "#2f9e44" }, rows: ["....g..", "..yyy..", ".ywyyy.", "yyyyyyy", "yyyyyyy", ".yyyyy.", "..yyy.."] },
  // grapes
  { palette: { p: "#7048e8", w: "#b197fc", g: "#2f9e44" }, rows: ["...g...", ".ppgpp.", "pwppwpp", ".ppppp.", "..pwp..", "..ppp..", "...p..."] },
  // lollipop
  { palette: { a: "#22b8cf", b: "#f8f9fa", c: "#e64980", s: "#dee2e6" }, rows: ["..aaa..", ".abcba.", ".acbca.", ".abcba.", "..aaa..", "...s...", "...s..."] },
  // pretzel
  { palette: { b: "#c47d34", w: "#fff4e6" }, rows: [".bb.bb.", "b..b..b", "b.wbw.b", ".b.b.b.", "..b.b..", ".b...b.", "b.....b"] },
];
