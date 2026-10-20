import type { Category } from "./types";

export const esBank: readonly Category[] = [
  { id: "seasons", name: "Estaciones", level: 0, cousin: "weather", lure: "invierno", words: ["primavera", "verano", "otoño", "invierno"] },
  { id: "colors", name: "Colores", level: 0, cousin: "citrus", lure: "amarillo", words: ["rojo", "azul", "amarillo", "verde"] },
  { id: "school", name: "Útiles", level: 0, cousin: "paper", lure: "lápiz", words: ["lápiz", "goma", "estuche", "regla"] },
  { id: "balls", name: "Juegos de pelota", level: 0, cousin: "racquet", lure: "vóley", words: ["fútbol", "baloncesto", "vóley", "béisbol"] },
  { id: "weather", name: "Cae del cielo", level: 1, cousin: "seasons", lure: "nieve", words: ["lluvia", "nieve", "granizo", "rocío"] },
  { id: "cardinal", name: "Direcciones", level: 1, cousin: "seasons", lure: "norte", words: ["este", "oeste", "sur", "norte"] },
  { id: "citrus", name: "Frutas ácidas", level: 1, cousin: "colors", lure: "limón", words: ["limón", "lima", "yuzu", "pomelo"] },
  { id: "kitchen", name: "Ollas", level: 1, cousin: "drinks", lure: "tetera", words: ["olla", "sartén", "cucharón", "tetera"] },
  { id: "drinks", name: "Bebidas calientes", level: 2, cousin: "grains", lure: "cebadina", words: ["sencha", "cacao", "mate", "cebadina"] },
  { id: "paper", name: "Papel", level: 2, cousin: "school", lure: "cuaderno", words: ["cuaderno", "carta", "bloc", "origami"] },
  { id: "planets", name: "Planetas interiores", level: 2, cousin: "metals", lure: "mercurio", words: ["mercurio", "venus", "marte", "júpiter"] },
  { id: "strings", name: "Cuerdas frotadas", level: 2, cousin: "brass", lure: "arpa", words: ["violín", "viola", "violonchelo", "arpa"] },
  { id: "metals", name: "Metales", level: 3, cousin: "planets", lure: "oro", words: ["oro", "plata", "cobre", "hierro"] },
  { id: "grains", name: "Cereales", level: 3, cousin: "drinks", lure: "cebada", words: ["arroz", "cebada", "trigo", "frijol"] },
  { id: "racquet", name: "Raquetas", level: 3, cousin: "balls", lure: "pimpón", words: ["tenis", "bádminton", "pimpón", "squash"] },
  { id: "brass", name: "Vientos de metal", level: 3, cousin: "strings", lure: "trompa", words: ["trompeta", "trombón", "trompa", "tuba"] },
];
