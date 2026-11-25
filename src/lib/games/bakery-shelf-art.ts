/** The eight breads of Bakery Shelf (shared by the game and its key art). Pixel sprites, 10 × 10. */
import type { PixelArt } from "./pixel-kit";

export const BREAD_ART: PixelArt[] = [
  // croissant
  {
    palette: { o: "#e8a33d", l: "#ffd27a", d: "#a8621a" },
    rows: ["..........", "..........", "...oooo...", ".oolllloo.", "olldlldllo", "olldlldllo", ".odooood..", "..d....d..", "..........", ".........."],
  },
  // baguette
  {
    palette: { o: "#d9963f", l: "#f4c77b", d: "#9c5f1f" },
    rows: [".........o", "........ol", ".......oll", "......oldo", ".....olloo", "....oldlo.", "...olloo..", "..oldlo...", ".olloo....", "oooo......"],
  },
  // pink doughnut
  {
    palette: { p: "#ff8fb1", w: "#fff0f5", b: "#c98a4b", y: "#ffe066", c: "#4dabf7" },
    rows: ["..bbbbbb..", ".bppppppb.", "bppwpcpppb", "bpypbbpwpb", "bppb..bppb", "bpcb..bypb", "bpppbbpppb", "bpwpppcppb", ".bppppppb.", "..bbbbbb.."],
  },
  // pretzel
  {
    palette: { o: "#8a4b1c", s: "#ffffff" },
    rows: ["..........", ".oo....oo.", "o..o..o..o", "o..soos..o", "o...oo...o", ".o.o..o.o.", "..o.s..o..", "..o....o..", "...oooo...", ".........."],
  },
  // cupcake with a cherry
  {
    palette: { r: "#e03131", w: "#fff5f5", p: "#fcc2d7", b: "#74c0fc", d: "#1c7ed6" },
    rows: ["....r.....", "...rr.....", "..wwwww...", ".wpwpwpw..", "wppppppppw", "bdbdbdbdbd", ".bdbdbdbd.", ".bdbdbdbd.", "..bdbdbd..", ".........."],
  },
  // melon bun
  {
    palette: { g: "#94d82d", l: "#d8f5a2", d: "#5c940d" },
    rows: ["..........", "...gggg...", ".gglgglgg.", "gldgldgldg", "gggggggggg", "gldgldgldg", "gggggggggg", ".gdggdggd.", "..gggggg..", ".........."],
  },
  // chocolate chip cookie
  {
    palette: { c: "#e0a96d", d: "#5c3a1e", h: "#f3d19c" },
    rows: ["..........", "...cccc...", ".cchccdcc.", ".cdccchcc.", "ccchcdcccc", "cdcccchcdc", ".ccdhccc..", ".chccdcc..", "...cccc...", ".........."],
  },
  // blueberry tart
  {
    palette: { t: "#d9a066", b: "#5f3dc4", l: "#9775fa", w: "#ffffff" },
    rows: ["..........", "..........", "..........", ".tttttttt.", "tbblbbwbbt", "tbbbblbbbt", "tlbbbbblbt", ".tttttttt.", "..tttttt..", ".........."],
  },
];
