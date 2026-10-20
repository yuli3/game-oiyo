import type { Category } from "./types";

export const enBank: readonly Category[] = [
  { id: "seasons", name: "Seasons", level: 0, cousin: "weather", lure: "winter", words: ["spring", "summer", "autumn", "winter"] },
  { id: "colors", name: "Colors", level: 0, cousin: "citrus", lure: "yellow", words: ["red", "blue", "yellow", "green"] },
  { id: "school", name: "School tools", level: 0, cousin: "paper", lure: "pencil", words: ["pencil", "eraser", "case", "ruler"] },
  { id: "balls", name: "Ball games", level: 0, cousin: "racquet", lure: "volleyball", words: ["football", "basketball", "volleyball", "baseball"] },
  { id: "weather", name: "From the sky", level: 1, cousin: "seasons", lure: "snowfall", words: ["rain", "snowfall", "hail", "dew"] },
  { id: "cardinal", name: "Directions", level: 1, cousin: "seasons", lure: "north", words: ["east", "west", "south", "north"] },
  { id: "citrus", name: "Sour fruit", level: 1, cousin: "colors", lure: "lemon", words: ["lemon", "lime", "yuzu", "grapefruit"] },
  { id: "kitchen", name: "Pots", level: 1, cousin: "drinks", lure: "kettle", words: ["pot", "pan", "ladle", "kettle"] },
  { id: "drinks", name: "Warm drinks", level: 2, cousin: "grains", lure: "barleytea", words: ["sencha", "cocoa", "mate", "barleytea"] },
  { id: "paper", name: "Paper", level: 2, cousin: "school", lure: "notebook", words: ["notebook", "stationery", "sketchpad", "origami"] },
  { id: "planets", name: "Inner planets", level: 2, cousin: "metals", lure: "mercury", words: ["mercury", "venus", "mars", "jupiter"] },
  { id: "strings", name: "Bowed strings", level: 2, cousin: "brass", lure: "harp", words: ["violin", "viola", "cello", "harp"] },
  { id: "metals", name: "Metals", level: 3, cousin: "planets", lure: "gold", words: ["gold", "silver", "copper", "iron"] },
  { id: "grains", name: "Grains", level: 3, cousin: "drinks", lure: "barley", words: ["rice", "barley", "wheat", "bean"] },
  { id: "racquet", name: "Racket games", level: 3, cousin: "balls", lure: "pingpong", words: ["tennis", "badminton", "pingpong", "squash"] },
  { id: "brass", name: "Brass", level: 3, cousin: "strings", lure: "horn", words: ["trumpet", "trombone", "horn", "tuba"] },
];
