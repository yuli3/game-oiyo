import type { Category } from "./types";

export const jaBank: readonly Category[] = [
  { id: "seasons", name: "季節", level: 0, cousin: "weather", lure: "冬", words: ["春", "夏", "秋", "冬"] },
  { id: "colors", name: "色", level: 0, cousin: "citrus", lure: "黄", words: ["赤", "青", "黄", "緑"] },
  { id: "school", name: "学用品", level: 0, cousin: "paper", lure: "鉛筆", words: ["鉛筆", "消しゴム", "筆箱", "定規"] },
  { id: "balls", name: "球技", level: 0, cousin: "racquet", lure: "バレー", words: ["サッカー", "バスケ", "バレー", "野球"] },
  { id: "weather", name: "空から降るもの", level: 1, cousin: "seasons", lure: "粉雪", words: ["雨", "粉雪", "雹", "露"] },
  { id: "cardinal", name: "方角", level: 1, cousin: "seasons", lure: "北", words: ["東", "西", "南", "北"] },
  { id: "citrus", name: "酸っぱい果実", level: 1, cousin: "colors", lure: "レモン", words: ["レモン", "ライム", "ゆず", "グレープフルーツ"] },
  { id: "kitchen", name: "鍋もの", level: 1, cousin: "drinks", lure: "やかん", words: ["鍋", "フライパン", "おたま", "やかん"] },
  { id: "drinks", name: "温かい飲み物", level: 2, cousin: "grains", lure: "麦茶", words: ["煎茶", "ココア", "マテ", "麦茶"] },
  { id: "paper", name: "紙", level: 2, cousin: "school", lure: "ノート", words: ["ノート", "便箋", "スケッチブック", "折り紙"] },
  { id: "planets", name: "内側の惑星", level: 2, cousin: "metals", lure: "水星", words: ["水星", "金星", "火星", "木星"] },
  { id: "strings", name: "擦弦楽器", level: 2, cousin: "brass", lure: "ハープ", words: ["バイオリン", "ビオラ", "チェロ", "ハープ"] },
  { id: "metals", name: "金属", level: 3, cousin: "planets", lure: "金", words: ["金", "銀", "銅", "鉄"] },
  { id: "grains", name: "穀物", level: 3, cousin: "drinks", lure: "大麦", words: ["米", "大麦", "小麦", "豆"] },
  { id: "racquet", name: "ラケット競技", level: 3, cousin: "balls", lure: "卓球", words: ["テニス", "バドミントン", "卓球", "スカッシュ"] },
  { id: "brass", name: "金管楽器", level: 3, cousin: "strings", lure: "ホルン", words: ["トランペット", "トロンボーン", "ホルン", "チューバ"] },
];
