import type { Category } from "./types";

export const zhBank: readonly Category[] = [
  { id: "seasons", name: "季节", level: 0, cousin: "weather", lure: "冬", words: ["春", "夏", "秋", "冬"] },
  { id: "colors", name: "颜色", level: 0, cousin: "citrus", lure: "黄", words: ["红", "蓝", "黄", "绿"] },
  { id: "school", name: "文具", level: 0, cousin: "paper", lure: "铅笔", words: ["铅笔", "橡皮", "笔袋", "尺子"] },
  { id: "balls", name: "球类", level: 0, cousin: "racquet", lure: "排球", words: ["足球", "篮球", "排球", "棒球"] },
  { id: "weather", name: "从天上落下的", level: 1, cousin: "seasons", lure: "粉雪", words: ["雨", "粉雪", "冰雹", "露水"] },
  { id: "cardinal", name: "方向", level: 1, cousin: "seasons", lure: "北", words: ["东", "西", "南", "北"] },
  { id: "citrus", name: "酸味水果", level: 1, cousin: "colors", lure: "柠檬", words: ["柠檬", "青柠", "柚子", "葡萄柚"] },
  { id: "kitchen", name: "锅具", level: 1, cousin: "drinks", lure: "水壶", words: ["锅", "平底锅", "勺子", "水壶"] },
  { id: "drinks", name: "热饮", level: 2, cousin: "grains", lure: "大麦茶", words: ["煎茶", "可可", "马黛", "大麦茶"] },
  { id: "paper", name: "纸", level: 2, cousin: "school", lure: "笔记本", words: ["笔记本", "信纸", "素描本", "折纸"] },
  { id: "planets", name: "内行星", level: 2, cousin: "metals", lure: "水星", words: ["水星", "金星", "火星", "木星"] },
  { id: "strings", name: "弓弦乐器", level: 2, cousin: "brass", lure: "竖琴", words: ["小提琴", "中提琴", "大提琴", "竖琴"] },
  { id: "metals", name: "金属", level: 3, cousin: "planets", lure: "金", words: ["金", "银", "铜", "铁"] },
  { id: "grains", name: "谷物", level: 3, cousin: "drinks", lure: "大麦", words: ["稻米", "大麦", "小麦", "豆子"] },
  { id: "racquet", name: "球拍运动", level: 3, cousin: "balls", lure: "乒乓球", words: ["网球", "羽毛球", "乒乓球", "壁球"] },
  { id: "brass", name: "铜管乐器", level: 3, cousin: "strings", lure: "圆号", words: ["小号", "长号", "圆号", "大号"] },
];
