/**
 * 타자 방어선 (Typing Defense) — an OIYO original typing game.
 * Words drift down toward the village wall; type one and press Enter to pop it.
 * 30 waves in six languages: short words, then longer ones, golden words that slow time,
 * red words that clear the screen, and a proverb boss every tenth wave.
 */
import { mulberry32 } from "./daily";

export const TYPING_SLUG = "typing-defense";
export const WAVE_COUNT = 30;
export const WALL_HP = 5;
export const FIELD_W = 360;
export const FIELD_H = 400;
export const GROUND = FIELD_H - 34;

export type Lang = "ko" | "en" | "ja" | "zh" | "fr" | "es";
export type Kind = "word" | "gold" | "bomb" | "boss";

interface WordBank {
  short: readonly string[];
  mid: readonly string[];
  long: readonly string[];
  boss: readonly string[];
}

export const WORDS: Record<Lang, WordBank> = {
  ko: {
    short: ["사과", "바다", "하늘", "구름", "나무", "노을", "별빛", "우산", "연필", "의자", "시계", "모자", "바람", "햇살", "달빛", "고래", "수박", "기차", "사탕", "편지", "감자", "호박", "단풍", "나비", "다리", "거울", "창문", "공원", "소풍", "김밥", "봄비", "눈꽃"],
    mid: ["무지개", "도서관", "자전거", "눈사람", "고양이", "강아지", "운동장", "지하철", "냉장고", "비행기", "컴퓨터", "손수건", "놀이터", "바닷가", "토마토", "피아노", "할머니", "소나무", "보름달", "숟가락", "젓가락", "돋보기", "우체국", "솜사탕", "해돋이"],
    long: ["해바라기", "산들바람", "별똥별", "무궁화꽃", "크리스마스", "아이스크림", "텔레비전", "오케스트라", "롤러코스터", "겨울방학", "봄나들이", "소나기구름", "눈썰매장", "반딧불이", "단풍나무숲", "고추잠자리"],
    boss: ["천 리 길도 한 걸음부터", "티끌 모아 태산", "가는 말이 고와야 오는 말이 곱다", "낮말은 새가 듣고 밤말은 쥐가 듣는다", "콩 심은 데 콩 나고 팥 심은 데 팥 난다", "세 살 버릇 여든까지 간다"],
  },
  en: {
    short: ["sun", "map", "cat", "owl", "kite", "rain", "leaf", "moon", "star", "boat", "lamp", "frog", "milk", "song", "wind", "snow", "pear", "drum", "bell", "nest", "fern", "rope", "sand", "wave", "corn", "mint", "fox", "jam", "ink", "bee"],
    mid: ["garden", "rocket", "pencil", "candle", "harbor", "violin", "meadow", "puzzle", "turtle", "window", "basket", "lantern", "thunder", "compass", "village", "orchard", "blanket", "pebble", "teapot", "ribbon", "button", "pillow", "rabbit", "spider", "marble"],
    long: ["butterfly", "telescope", "waterfall", "snowflake", "lighthouse", "strawberry", "adventure", "dandelion", "porcupine", "moonlight", "crocodile", "fireworks", "playground", "kangaroo", "pineapple", "watermelon"],
    boss: ["a journey of a thousand miles begins with one step", "slow and steady wins the race", "every cloud has a silver lining", "the early bird catches the worm", "actions speak louder than words", "where there is a will there is a way"],
  },
  ja: {
    short: ["さくら", "うみ", "そら", "くも", "やま", "ほし", "つき", "かさ", "いぬ", "ねこ", "とり", "はな", "かぜ", "ゆき", "あめ", "みず", "いし", "かわ", "もり", "たね", "ふね", "まど", "いす", "ぱん", "おちゃ", "すいか", "ねぎ", "かめ", "たこ", "りす"],
    mid: ["ひまわり", "かみなり", "とけい", "えんぴつ", "でんしゃ", "ゆきだるま", "どんぐり", "おにぎり", "かたつむり", "しゃしん", "たんぽぽ", "あさがお", "ふうせん", "てぶくろ", "めがね", "ぼうし", "きつね", "うさぎ", "とんぼ", "みかん", "こたつ", "おまつり", "すずめ", "ほたる", "にじ"],
    long: ["ちょうちょう", "かいすいよく", "はなびたいかい", "ゆうやけぞら", "おしょうがつ", "もみじがり", "くじらのしお", "ひこうきぐも", "あまのがわ", "ゆきがっせん", "ところてん", "かざぐるま", "ちゃわんむし", "すなどけい", "しゃぼんだま", "てるてるぼうず"],
    boss: ["ちりもつもればやまとなる", "いそがばまわれ", "ななころびやおき", "はなよりだんご", "さるもきからおちる", "いしのうえにもさんねん"],
  },
  zh: {
    short: ["太阳", "月亮", "星星", "白云", "大海", "小鸟", "花朵", "雨伞", "铅笔", "椅子", "苹果", "西瓜", "熊猫", "风筝", "灯笼", "竹子", "茶杯", "小猫", "小狗", "火车", "蝴蝶", "雪花", "彩虹", "树叶", "湖水", "高山", "春风", "秋天", "饺子", "面条"],
    mid: ["图书馆", "自行车", "堆雪人", "向日葵", "游乐场", "冰淇淋", "动物园", "电冰箱", "望远镜", "红灯笼", "小松鼠", "大熊猫", "过山车", "棉花糖", "放风筝", "吃月饼", "看日出", "长颈鹿", "葡萄架", "邮递员", "小金鱼", "萤火虫", "竹蜻蜓", "跳绳子", "冬至夜"],
    long: ["五颜六色", "春暖花开", "万里长城", "一路平安", "风和日丽", "鸟语花香", "热气球升空", "火树银花", "画龙点睛", "井井有条", "天高云淡", "满天繁星", "欢天喜地", "山清水秀", "百花齐放", "千山万水"],
    boss: ["千里之行始于足下", "滴水穿石", "熟能生巧", "一寸光阴一寸金", "三人行必有我师", "积少成多"],
  },
  fr: {
    short: ["lune", "soleil", "chat", "pomme", "mer", "vent", "pluie", "neige", "fleur", "arbre", "livre", "pain", "lait", "nuage", "bateau", "poire", "miel", "loup", "ours", "rose", "sable", "fil", "clef", "lit", "nid", "feu", "riz", "vin", "jus", "bus"],
    mid: ["jardin", "fusée", "crayon", "bougie", "violon", "tortue", "fenêtre", "panier", "lanterne", "tonnerre", "village", "verger", "galet", "théière", "ruban", "bouton", "oreiller", "lapin", "araignée", "étoile", "écharpe", "cerise", "château", "moulin", "phare"],
    long: ["papillon", "télescope", "cascade", "boussole", "fraisier", "aventure", "pissenlit", "crocodile", "feuilletage", "kangourou", "pastèque", "parapluie", "toboggan", "montgolfière", "chocolatier", "bibliothèque"],
    boss: ["petit à petit l'oiseau fait son nid", "qui va piano va sano", "après la pluie le beau temps", "il faut battre le fer quand il est chaud", "les petits ruisseaux font les grandes rivières", "rien ne sert de courir il faut partir à point"],
  },
  es: {
    short: ["sol", "luna", "mar", "gato", "pera", "nube", "flor", "árbol", "libro", "pan", "leche", "lluvia", "nieve", "viento", "barco", "miel", "lobo", "oso", "rosa", "arena", "hilo", "llave", "cama", "nido", "fuego", "arroz", "vino", "jugo", "taza", "pez"],
    mid: ["jardín", "cohete", "lápiz", "vela", "violín", "tortuga", "ventana", "cesta", "farol", "trueno", "pueblo", "huerto", "piedra", "tetera", "cinta", "botón", "almohada", "conejo", "araña", "estrella", "bufanda", "cereza", "castillo", "molino", "faro"],
    long: ["mariposa", "telescopio", "cascada", "brújula", "aventura", "cocodrilo", "canguro", "sandía", "paraguas", "tobogán", "chocolate", "biblioteca", "girasoles", "luciérnaga", "rompecabezas", "fuegos artificiales"],
    boss: ["poco a poco se va lejos", "a quien madruga dios le ayuda", "más vale tarde que nunca", "no hay mal que por bien no venga", "camarón que se duerme se lo lleva la corriente", "en boca cerrada no entran moscas"],
  },
};

export interface Falling {
  id: number;
  text: string;
  kind: Kind;
  x: number;
  y: number;
  speed: number; // px per second
  spawnAt: number; // seconds into the wave
  spawned: boolean;
}

export interface TypingState {
  wave: number; // 0-based
  lang: Lang;
  time: number;
  words: Falling[];
  hp: number;
  score: number;
  combo: number;
  bestCombo: number;
  typedChars: number;
  slowUntil: number;
  status: "play" | "won" | "lost";
}

export function isBossWave(wave: number): boolean {
  return wave % 10 === 9;
}

/** Folds case and (for Latin scripts) accents so "fusee" pops "fusée". */
export function normalise(text: string, lang: Lang): string {
  const t = text.normalize("NFC").trim().replace(/\s+/g, " ");
  if (lang === "ko" || lang === "ja" || lang === "zh") return t;
  return t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function pickFrom(list: readonly string[], rng: () => number, used: Set<string>): string {
  for (let k = 0; k < 8; k++) {
    const w = list[Math.floor(rng() * list.length)];
    if (!used.has(w)) { used.add(w); return w; }
  }
  return list[Math.floor(rng() * list.length)];
}

function measure(text: string, lang: Lang): number {
  const wide = lang === "ko" || lang === "ja" || lang === "zh";
  return [...text].length * (wide ? 15 : 9) + 16;
}

export function createWave(wave: number, lang: Lang, seed = wave * 7919 + 17): TypingState {
  const w = Math.max(0, Math.min(WAVE_COUNT - 1, wave));
  const rng = mulberry32(seed);
  const bank = WORDS[lang] ?? WORDS.en;
  const used = new Set<string>();
  const words: Falling[] = [];
  const tier = w % 10; // 0..9 within the decade
  const decade = Math.floor(w / 10); // 0..2
  const count = 8 + tier + decade * 2;
  const baseSpeed = 22 + tier * 2.2 + decade * 7;
  const gap = Math.max(1.05, 2.6 - tier * 0.12 - decade * 0.3);
  let t = 0.6;
  for (let i = 0; i < count; i++) {
    const r = rng();
    const pool = decade === 0 ? (r < 0.75 ? bank.short : bank.mid) : decade === 1 ? (r < 0.4 ? bank.short : r < 0.85 ? bank.mid : bank.long) : (r < 0.25 ? bank.short : r < 0.65 ? bank.mid : bank.long);
    const text = pickFrom(pool, rng, used);
    let kind: Kind = "word";
    if (w >= 5 && i > 2 && rng() < 0.08) kind = "gold";
    else if (w >= 5 && i > 3 && rng() < 0.06) kind = "bomb";
    const width = measure(text, lang);
    words.push({ id: i, text, kind, x: 6 + rng() * Math.max(1, FIELD_W - width - 12), y: -10, speed: baseSpeed * (0.85 + rng() * 0.3), spawnAt: t, spawned: false });
    t += gap * (0.7 + rng() * 0.6);
  }
  if (isBossWave(w)) {
    const phrase = bank.boss[(decade * 2 + Math.floor(rng() * 2)) % bank.boss.length];
    words.push({ id: count, text: phrase, kind: "boss", x: 8, y: -10, speed: 6 + decade * 1.5, spawnAt: 1.5, spawned: false });
  }
  return { wave: w, lang, time: 0, words, hp: WALL_HP, score: 0, combo: 0, bestCombo: 0, typedChars: 0, slowUntil: -1, status: "play" };
}

export function wordWidth(f: Falling, lang: Lang): number {
  return f.kind === "boss" ? FIELD_W - 16 : measure(f.text, lang);
}

/** Advances time. Words that reach the wall are removed and cost a heart (the boss costs three). */
export function step(s: TypingState, dt: number): TypingState {
  if (s.status !== "play") return s;
  const time = s.time + dt;
  const slow = time < s.slowUntil ? 0.4 : 1;
  let hp = s.hp;
  let combo = s.combo;
  const words: Falling[] = [];
  for (const f of s.words) {
    if (!f.spawned && time >= f.spawnAt) { words.push({ ...f, spawned: true }); continue; }
    if (!f.spawned) { words.push(f); continue; }
    const y = f.y + f.speed * slow * dt;
    if (y >= GROUND - 10) {
      hp -= f.kind === "boss" ? 3 : 1;
      combo = 0;
      continue;
    }
    words.push({ ...f, y });
  }
  let status: TypingState["status"] = "play";
  if (hp <= 0) status = "lost";
  else if (words.length === 0) status = "won";
  return { ...s, time, words, hp: Math.max(0, hp), combo, status };
}

export interface SubmitResult {
  state: TypingState;
  hit: Falling | null;
  cleared: Falling[];
}

/** Pops the lowest on-screen word that matches the typed text. */
export function submit(s: TypingState, typed: string): SubmitResult {
  if (s.status !== "play") return { state: s, hit: null, cleared: [] };
  const want = normalise(typed, s.lang);
  if (!want) return { state: s, hit: null, cleared: [] };
  const candidates = s.words.filter((f) => f.spawned && normalise(f.text, s.lang) === want).sort((a, b) => b.y - a.y);
  const hit = candidates[0] ?? null;
  if (!hit) return { state: { ...s, combo: 0 }, hit: null, cleared: [] };
  let words = s.words.filter((f) => f.id !== hit.id);
  let cleared: Falling[] = [];
  if (hit.kind === "bomb") {
    cleared = words.filter((f) => f.spawned && f.kind !== "boss");
    words = words.filter((f) => !f.spawned || f.kind === "boss");
  }
  const combo = s.combo + 1;
  const chars = [...hit.text].length + cleared.reduce((a, f) => a + [...f.text].length, 0);
  const mult = 1 + Math.min(combo, 20) * 0.1;
  const score = s.score + Math.round(chars * 10 * mult) + (hit.kind === "boss" ? 500 : 0);
  const slowUntil = hit.kind === "gold" ? s.time + 5 : s.slowUntil;
  const status = words.length === 0 ? "won" : "play";
  return {
    state: { ...s, words, combo, bestCombo: Math.max(s.bestCombo, combo), score: status === "won" ? score + s.hp * 100 : score, typedChars: s.typedChars + chars, slowUntil, status },
    hit,
    cleared,
  };
}

export function starsFor(s: TypingState): number {
  if (s.status !== "won") return 0;
  if (s.hp >= WALL_HP) return 3;
  if (s.hp >= 3) return 2;
  return 1;
}

/** Characters per minute for the result screen. */
export function cpm(s: TypingState): number {
  return s.time > 0 ? Math.round((s.typedChars / s.time) * 60) : 0;
}
