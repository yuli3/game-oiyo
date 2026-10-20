import type { Category } from "./types";

export const frBank: readonly Category[] = [
  { id: "seasons", name: "Saisons", level: 0, cousin: "weather", lure: "hiver", words: ["printemps", "été", "automne", "hiver"] },
  { id: "colors", name: "Couleurs", level: 0, cousin: "citrus", lure: "jaune", words: ["rouge", "bleu", "jaune", "vert"] },
  { id: "school", name: "Fournitures", level: 0, cousin: "paper", lure: "crayon", words: ["crayon", "gomme", "trousse", "règle"] },
  { id: "balls", name: "Jeux de balle", level: 0, cousin: "racquet", lure: "volley", words: ["football", "basket", "volley", "baseball"] },
  { id: "weather", name: "Tombé du ciel", level: 1, cousin: "seasons", lure: "neige", words: ["pluie", "neige", "grêle", "rosée"] },
  { id: "cardinal", name: "Directions", level: 1, cousin: "seasons", lure: "nord", words: ["est", "ouest", "sud", "nord"] },
  { id: "citrus", name: "Fruits acides", level: 1, cousin: "colors", lure: "citron", words: ["citron", "lime", "yuzu", "pamplemousse"] },
  { id: "kitchen", name: "Casseroles", level: 1, cousin: "drinks", lure: "bouilloire", words: ["marmite", "poêle", "louche", "bouilloire"] },
  { id: "drinks", name: "Boissons chaudes", level: 2, cousin: "grains", lure: "orgeat", words: ["sencha", "cacao", "maté", "orgeat"] },
  { id: "paper", name: "Papier", level: 2, cousin: "school", lure: "cahier", words: ["cahier", "enveloppe", "bloc", "origami"] },
  { id: "planets", name: "Planètes internes", level: 2, cousin: "metals", lure: "mercure", words: ["mercure", "vénus", "mars", "jupiter"] },
  { id: "strings", name: "Cordes frottées", level: 2, cousin: "brass", lure: "harpe", words: ["violon", "alto", "violoncelle", "harpe"] },
  { id: "metals", name: "Métaux", level: 3, cousin: "planets", lure: "or", words: ["or", "argent", "cuivre", "fer"] },
  { id: "grains", name: "Céréales", level: 3, cousin: "drinks", lure: "orge", words: ["riz", "orge", "blé", "haricot"] },
  { id: "racquet", name: "Raquettes", level: 3, cousin: "balls", lure: "pingpong", words: ["tennis", "badminton", "pingpong", "squash"] },
  { id: "brass", name: "Cuivres", level: 3, cousin: "strings", lure: "cor", words: ["trompette", "trombone", "cor", "tuba"] },
];
