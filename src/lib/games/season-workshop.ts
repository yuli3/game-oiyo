/**
 * Season Workshop (절기 공방) — an original idle/incremental game (2026-11-21).
 *
 * Trend basis: idle/incremental games climbed fastest in indie unit sales 2021→2025,
 * and a "strangely simple" idle game topped Valve's Next Fest player list in Oct 2026.
 * Spread hook: addictive number-goes-up, tied to a real calendar: the 24 solar terms
 * (24절기), each with the thing a Korean household traditionally made then —
 * spring couplets at 입춘, soy paste at 우수 … red-bean porridge at 동지.
 *
 * 24 stages = 24 solar terms. Make the term's item (tap + helpers), coins buy upgrades
 * that carry over, and reaching the term's goal opens the next term.
 */

export const WORKSHOP_SLUG = "season-workshop";
export const TERM_COUNT = 24;
export const OFFLINE_CAP_S = 2 * 60 * 60;
export const OFFLINE_RATE = 0.5;

type Names = { ko: string; en: string; ja: string; zh: string; fr: string; es: string };
const n = (ko: string, en: string, ja: string, zh: string, fr: string, es: string): Names => ({ ko, en, ja, zh, fr, es });

export interface SolarTerm {
  id: string;
  /** Usual start date (Gregorian, Korea); actual dates move by a day year to year. */
  month: number;
  day: number;
  name: Names;
  item: Names;
  emoji: string;
  color: string;
}

export const TERMS: SolarTerm[] = [
  { id: "ipchun", month: 2, day: 4, emoji: "🧧", color: "#e63946", name: n("입춘", "Start of Spring", "立春", "立春", "Début du printemps", "Inicio de la primavera"), item: n("입춘첩", "Spring couplets", "立春の札", "立春帖", "Calligraphies du printemps", "Caligrafías de primavera") },
  { id: "usu", month: 2, day: 19, emoji: "🫙", color: "#8d6e63", name: n("우수", "Rain Water", "雨水", "雨水", "Eau de pluie", "Agua de lluvia"), item: n("된장 독", "Soy paste jars", "味噌の甕", "大酱坛", "Jarres de pâte de soja", "Tinajas de pasta de soja") },
  { id: "gyeongchip", month: 3, day: 5, emoji: "🐸", color: "#6a994e", name: n("경칩", "Awakening of Insects", "啓蟄", "惊蛰", "Réveil des insectes", "Despertar de los insectos"), item: n("고로쇠 수액", "Maple sap", "イタヤカエデの樹液", "枫树汁", "Sève d'érable", "Savia de arce") },
  { id: "chunbun", month: 3, day: 20, emoji: "🌱", color: "#90be6d", name: n("춘분", "Spring Equinox", "春分", "春分", "Équinoxe de printemps", "Equinoccio de primavera"), item: n("씨앗 봉투", "Seed packets", "種袋", "种子袋", "Sachets de graines", "Sobres de semillas") },
  { id: "cheongmyeong", month: 4, day: 5, emoji: "🌳", color: "#43aa8b", name: n("청명", "Clear and Bright", "清明", "清明", "Clair et lumineux", "Claro y brillante"), item: n("묘목", "Saplings", "苗木", "树苗", "Jeunes arbres", "Plantones") },
  { id: "gogu", month: 4, day: 20, emoji: "🍵", color: "#52b788", name: n("곡우", "Grain Rain", "穀雨", "谷雨", "Pluie des céréales", "Lluvia de granos"), item: n("우전 녹차", "First-flush green tea", "一番茶", "雨前绿茶", "Thé vert de première cueillette", "Té verde de primera cosecha") },
  { id: "ipha", month: 5, day: 5, emoji: "🌾", color: "#74c69d", name: n("입하", "Start of Summer", "立夏", "立夏", "Début de l'été", "Inicio del verano"), item: n("모판", "Rice seedling trays", "苗代", "秧盘", "Plateaux de semis de riz", "Bandejas de plantones de arroz") },
  { id: "soman", month: 5, day: 21, emoji: "🌿", color: "#b5a33a", name: n("소만", "Grain Buds", "小満", "小满", "Petite plénitude", "Pequeña plenitud"), item: n("보리 단", "Barley sheaves", "麦の束", "大麦捆", "Gerbes d'orge", "Gavillas de cebada") },
  { id: "mangjong", month: 6, day: 6, emoji: "🧺", color: "#99582a", name: n("망종", "Grain in Ear", "芒種", "芒种", "Épis barbus", "Espigas"), item: n("모내기 모", "Rice transplants", "田植えの苗", "插秧苗", "Plants de riz repiqués", "Plantas de arroz trasplantadas") },
  { id: "haji", month: 6, day: 21, emoji: "🥔", color: "#bc6c25", name: n("하지", "Summer Solstice", "夏至", "夏至", "Solstice d'été", "Solsticio de verano"), item: n("햇감자", "New potatoes", "新じゃが", "新土豆", "Pommes de terre nouvelles", "Patatas nuevas") },
  { id: "soseo", month: 7, day: 7, emoji: "🪭", color: "#219ebc", name: n("소서", "Minor Heat", "小暑", "小暑", "Petite chaleur", "Calor menor"), item: n("합죽선", "Folding fans", "扇子", "折扇", "Éventails pliants", "Abanicos plegables") },
  { id: "daeseo", month: 7, day: 23, emoji: "🍉", color: "#ef476f", name: n("대서", "Major Heat", "大暑", "大暑", "Grande chaleur", "Calor mayor"), item: n("수박화채", "Watermelon punch", "スイカのポンチ", "西瓜花菜", "Punch à la pastèque", "Ponche de sandía") },
  { id: "ipchu", month: 8, day: 7, emoji: "🌶️", color: "#d62828", name: n("입추", "Start of Autumn", "立秋", "立秋", "Début de l'automne", "Inicio del otoño"), item: n("말린 고추", "Dried red peppers", "干し唐辛子", "晒干辣椒", "Piments séchés", "Pimientos secos") },
  { id: "cheoseo", month: 8, day: 23, emoji: "📚", color: "#457b9d", name: n("처서", "End of Heat", "処暑", "处暑", "Fin de la chaleur", "Fin del calor"), item: n("볕에 말린 책", "Sun-aired books", "虫干しの本", "晒书", "Livres aérés au soleil", "Libros aireados al sol") },
  { id: "baengno", month: 9, day: 7, emoji: "🍇", color: "#6d597a", name: n("백로", "White Dew", "白露", "白露", "Rosée blanche", "Rocío blanco"), item: n("포도 송이", "Grape bunches", "ぶどうの房", "葡萄串", "Grappes de raisin", "Racimos de uva") },
  { id: "chubun", month: 9, day: 23, emoji: "🍚", color: "#e9c46a", name: n("추분", "Autumn Equinox", "秋分", "秋分", "Équinoxe d'automne", "Equinoccio de otoño"), item: n("햅쌀", "New-crop rice", "新米", "新米", "Riz nouveau", "Arroz nuevo") },
  { id: "hallo", month: 10, day: 8, emoji: "🌼", color: "#f4a261", name: n("한로", "Cold Dew", "寒露", "寒露", "Rosée froide", "Rocío frío"), item: n("국화전", "Chrysanthemum pancakes", "菊の花餅", "菊花煎饼", "Galettes aux chrysanthèmes", "Tortitas de crisantemo") },
  { id: "sanggang", month: 10, day: 23, emoji: "🍊", color: "#e76f51", name: n("상강", "Frost Descent", "霜降", "霜降", "Descente du givre", "Descenso de la escarcha"), item: n("곶감", "Dried persimmons", "干し柿", "柿饼", "Kakis séchés", "Caquis secos") },
  { id: "ipdong", month: 11, day: 7, emoji: "🥬", color: "#2a9d8f", name: n("입동", "Start of Winter", "立冬", "立冬", "Début de l'hiver", "Inicio del invierno"), item: n("김장 김치", "Winter kimchi", "キムジャンのキムチ", "过冬泡菜", "Kimchi d'hiver", "Kimchi de invierno") },
  { id: "soseol", month: 11, day: 22, emoji: "🫘", color: "#a68a64", name: n("소설", "Minor Snow", "小雪", "小雪", "Petite neige", "Nieve menor"), item: n("메주", "Soybean blocks", "メジュ（味噌玉）", "酱曲块", "Blocs de soja", "Bloques de soja") },
  { id: "daeseol", month: 12, day: 7, emoji: "🍠", color: "#9c6644", name: n("대설", "Major Snow", "大雪", "大雪", "Grande neige", "Nieve mayor"), item: n("군고구마", "Roasted sweet potatoes", "焼き芋", "烤红薯", "Patates douces rôties", "Batatas asadas") },
  { id: "dongji", month: 12, day: 21, emoji: "🥣", color: "#9d0208", name: n("동지", "Winter Solstice", "冬至", "冬至", "Solstice d'hiver", "Solsticio de invierno"), item: n("팥죽", "Red-bean porridge", "小豆粥", "红豆粥", "Bouillie de haricots rouges", "Gachas de judías rojas") },
  { id: "sohan", month: 1, day: 5, emoji: "🪁", color: "#4361ee", name: n("소한", "Minor Cold", "小寒", "小寒", "Petit froid", "Frío menor"), item: n("방패연", "Shield kites", "盾凧", "盾形风筝", "Cerfs-volants bouclier", "Cometas de escudo") },
  { id: "daehan", month: 1, day: 20, emoji: "🧶", color: "#3a0ca3", name: n("대한", "Major Cold", "大寒", "大寒", "Grand froid", "Frío mayor"), item: n("털 버선", "Wool socks", "毛の足袋", "毛线袜", "Chaussettes en laine", "Calcetines de lana") },
];

export const DONGJI_INDEX = TERMS.findIndex((t) => t.id === "dongji");

/** Which solar term a calendar date falls in (by usual start dates). */
export function termForDate(date: Date): number {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const key = m * 100 + d;
  // Walk the year from 소한 (Jan) in calendar order.
  const ordered = TERMS.map((t, i) => ({ i, key: t.month * 100 + t.day })).sort((a, b) => a.key - b.key);
  let found = ordered[ordered.length - 1].i; // before 소한 → still 동지 from last year
  for (const o of ordered) if (key >= o.key) found = o.i;
  return found;
}

export function termGoal(term: number): number {
  return Math.round(60 * Math.pow(1.6, term));
}
export function itemPrice(term: number): number {
  return 1 + Math.floor(term / 4);
}

export type UpgradeId = "tool" | "helper" | "stove";
export const HELPER_RATE = 0.4; // items per second per helper, before stove

export interface Workshop {
  term: number;
  made: number; // items of the current term
  coins: number;
  tool: number;
  helpers: number;
  stove: number;
  totalMade: number;
  lastSeen: number; // epoch ms, for offline progress
}

export function createWorkshop(now = 0): Workshop {
  return { term: 0, made: 0, coins: 0, tool: 0, helpers: 0, stove: 0, totalMade: 0, lastSeen: now };
}

export function stoveMultiplier(w: Workshop): number {
  return Math.pow(1.5, w.stove);
}
export function tapPower(w: Workshop): number {
  return (1 + w.tool * 2) * stoveMultiplier(w);
}
export function autoRate(w: Workshop): number {
  return w.helpers * HELPER_RATE * stoveMultiplier(w) * (1 + w.tool * 0.25);
}

export function upgradeCost(w: Workshop, id: UpgradeId): number {
  if (id === "tool") return Math.round(15 * Math.pow(2.1, w.tool));
  if (id === "helper") return Math.round(25 * Math.pow(1.32, w.helpers));
  return Math.round(500 * Math.pow(5, w.stove));
}

export function buyUpgrade(w: Workshop, id: UpgradeId): Workshop {
  const cost = upgradeCost(w, id);
  if (w.coins < cost) return w;
  const next = { ...w, coins: w.coins - cost };
  if (id === "tool") next.tool += 1;
  else if (id === "helper") next.helpers += 1;
  else next.stove += 1;
  return next;
}

function addItems(w: Workshop, amount: number): Workshop {
  if (amount <= 0 || termDone(w)) return w;
  const room = termGoal(w.term) - w.made;
  const made = Math.min(amount, room);
  return { ...w, made: w.made + made, totalMade: w.totalMade + made, coins: w.coins + made * itemPrice(w.term) };
}

export function tap(w: Workshop): Workshop {
  return addItems(w, tapPower(w));
}

export function tick(w: Workshop, seconds: number): Workshop {
  return addItems(w, autoRate(w) * Math.max(0, seconds));
}

export function termDone(w: Workshop): boolean {
  return w.made >= termGoal(w.term);
}

/** After a term's goal: move to the next term (or stay on the last one). */
export function nextTerm(w: Workshop): Workshop {
  if (!termDone(w)) return w;
  return { ...w, term: Math.min(TERM_COUNT - 1, w.term + 1), made: 0 };
}

/** Coins and items earned while the tab was closed: half speed, at most two hours. */
export function applyOffline(w: Workshop, now: number): { workshop: Workshop; seconds: number; earned: number } {
  const seconds = Math.min(OFFLINE_CAP_S, Math.max(0, (now - w.lastSeen) / 1000));
  if (!w.lastSeen || seconds < 30) return { workshop: { ...w, lastSeen: now }, seconds: 0, earned: 0 };
  const before = w.made;
  const after = tick(w, seconds * OFFLINE_RATE);
  return { workshop: { ...after, lastSeen: now }, seconds, earned: after.made - before };
}

const SAVE_KEY = "oiyo:season-workshop:v1";
const isNum = (v: unknown, min = 0) => typeof v === "number" && Number.isFinite(v) && v >= min;
export function loadWorkshop(now: number): Workshop {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null") as Partial<Workshop> | null;
    if (raw && isNum(raw.term) && raw.term! < TERM_COUNT && Number.isInteger(raw.term) && isNum(raw.made) && isNum(raw.coins) && isNum(raw.tool) && isNum(raw.helpers) && isNum(raw.stove) && isNum(raw.totalMade) && isNum(raw.lastSeen)) {
      return raw as Workshop;
    }
  } catch {
    /* fall through */
  }
  return createWorkshop(now);
}
export function saveWorkshop(w: Workshop): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(w));
  } catch {
    /* best-effort */
  }
}

/** Test/autopilot helper: buys whatever upgrade adds the most output per coin. */
export function bestUpgrade(w: Workshop, tapsPerSecond: number): UpgradeId | null {
  const base = tapPower(w) * tapsPerSecond + autoRate(w);
  let best: UpgradeId | null = null;
  let bestValue = 0;
  for (const id of ["tool", "helper", "stove"] as UpgradeId[]) {
    const cost = upgradeCost(w, id);
    if (cost > w.coins) continue;
    const after = buyUpgrade(w, id);
    const gain = tapPower(after) * tapsPerSecond + autoRate(after) - base;
    if (gain / cost > bestValue) {
      bestValue = gain / cost;
      best = id;
    }
  }
  return best;
}
