// One-phone liar round. The word stays off the screen until the player
// whose turn it is asks to look, so the phone can be passed in a group
// (2026-10-20). Nothing here is a name or an account: the round is only
// a category, one word, and a seat number.
import { mulberry32, shuffle } from "./daily";
import type { Locale } from "../i18n";
import { locales } from "../i18n";

export const GAME_ID = "liar-onephone";
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

export type Phase = "cover" | "peek" | "discuss" | "voteCover" | "vote" | "guess" | "result";
export type Winner = "group" | "liar";
export type Card = "hidden" | "word" | "category" | "choices" | "result";

interface Category {
  id: string;
  label: string;
  words: readonly string[];
}

export interface Round {
  locale: Locale;
  seed: number;
  playerCount: number;
  categoryId: string;
  category: string;
  word: string;
  choices: string[];
  liar: number;
}

export interface Session {
  round: Round;
  phase: Phase;
  cursor: number;
  votes: (number | null)[];
  guess: string | null;
  winner: Winner | null;
}

const BANKS: Record<Locale, readonly Category[]> = {
  ko: [
    cat("meal", "음식", ["김치찌개", "비빔밥", "삼겹살", "냉면", "떡볶이", "김밥", "된장찌개", "갈비"]),
    cat("animal", "동물", ["고양이", "강아지", "토끼", "펭귄", "기린", "코끼리", "사자", "판다"]),
    cat("place", "장소", ["학교", "도서관", "병원", "공항", "해변", "시장", "공원", "지하철"]),
    cat("object", "물건", ["우산", "시계", "안경", "가방", "연필", "거울", "의자", "베개"]),
  ],
  en: [
    cat("meal", "Food", ["soup", "bread", "salad", "pasta", "rice", "cheese", "apple", "honey"]),
    cat("animal", "Animal", ["cat", "dog", "rabbit", "penguin", "giraffe", "elephant", "lion", "panda"]),
    cat("place", "Place", ["school", "library", "hospital", "airport", "beach", "market", "park", "subway"]),
    cat("object", "Object", ["umbrella", "clock", "glasses", "bag", "pencil", "mirror", "chair", "pillow"]),
  ],
  ja: [
    cat("meal", "食べ物", ["すし", "ラーメン", "うどん", "カレー", "おにぎり", "てんぷら", "みそしる", "やきとり"]),
    cat("animal", "動物", ["ねこ", "いぬ", "うさぎ", "ぺんぎん", "きりん", "ぞう", "らいおん", "ぱんだ"]),
    cat("place", "場所", ["がっこう", "としょかん", "びょういん", "くうこう", "かいがん", "いちば", "こうえん", "えき"]),
    cat("object", "道具", ["かさ", "とけい", "めがね", "かばん", "えんぴつ", "かがみ", "いす", "まくら"]),
  ],
  zh: [
    cat("meal", "食物", ["米饭", "面条", "饺子", "包子", "豆腐", "鸡蛋", "苹果", "牛奶"]),
    cat("animal", "动物", ["猫", "狗", "兔子", "企鹅", "长颈鹿", "大象", "狮子", "熊猫"]),
    cat("place", "地点", ["学校", "图书馆", "医院", "机场", "海边", "市场", "公园", "地铁"]),
    cat("object", "物品", ["雨伞", "时钟", "眼镜", "书包", "铅笔", "镜子", "椅子", "枕头"]),
  ],
  fr: [
    cat("meal", "Nourriture", ["soupe", "pain", "salade", "pâtes", "riz", "fromage", "pomme", "miel"]),
    cat("animal", "Animal", ["chat", "chien", "lapin", "manchot", "girafe", "éléphant", "lion", "panda"]),
    cat("place", "Lieu", ["école", "bibliothèque", "hôpital", "aéroport", "plage", "marché", "parc", "métro"]),
    cat("object", "Objet", ["parapluie", "horloge", "lunettes", "sac", "crayon", "miroir", "chaise", "oreiller"]),
  ],
  es: [
    cat("meal", "Comida", ["sopa", "pan", "ensalada", "pasta", "arroz", "queso", "manzana", "miel"]),
    cat("animal", "Animal", ["gato", "perro", "conejo", "pingüino", "jirafa", "elefante", "león", "panda"]),
    cat("place", "Lugar", ["escuela", "biblioteca", "hospital", "aeropuerto", "playa", "mercado", "parque", "metro"]),
    cat("object", "Objeto", ["paraguas", "reloj", "gafas", "bolsa", "lápiz", "espejo", "silla", "almohada"]),
  ],
};

function cat(id: string, label: string, words: readonly string[]): Category {
  return { id, label, words };
}

function assertBanks(): void {
  for (const locale of locales) {
    const categories = BANKS[locale];
    if (!categories?.length) throw new Error(`liar bank missing ${locale}`);
    for (const category of categories) {
      if (new Set(category.words).size !== category.words.length) throw new Error(`liar duplicate ${locale}`);
      if (category.words.includes(category.label)) throw new Error(`liar label is a word ${locale}`);
    }
  }
}

assertBanks();

export function categoriesFor(locale: Locale): readonly Category[] {
  return BANKS[locale];
}

export function createRound(seed: number, playerCount: number, locale: Locale): Round {
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new Error("liar player count");
  }
  const rng = mulberry32(seed >>> 0);
  const categories = BANKS[locale];
  const category = categories[Math.floor(rng() * categories.length)];
  const word = category.words[Math.floor(rng() * category.words.length)];
  const choices = shuffle(category.words, rng);
  const liar = Math.floor(rng() * playerCount);
  return { locale, seed, playerCount, categoryId: category.id, category: category.label, word, choices, liar };
}

export function startSession(round: Round): Session {
  return {
    round,
    phase: "cover",
    cursor: 0,
    votes: Array.from({ length: round.playerCount }, () => null),
    guess: null,
    winner: null,
  };
}

/** What the screen may show. A cover never returns the secret word. */
export function visibleCard(session: Session): Card {
  if (session.phase === "peek") return session.cursor === session.round.liar ? "category" : "word";
  if (session.phase === "guess") return "choices";
  if (session.phase === "result") return "result";
  return "hidden";
}

export function revealedWord(session: Session): string | null {
  if (session.phase === "peek" && session.cursor !== session.round.liar) return session.round.word;
  if (session.phase === "result") return session.round.word;
  return null;
}

export function ready(session: Session): Session {
  if (session.phase === "cover") return { ...session, phase: "peek" };
  if (session.phase === "voteCover") return { ...session, phase: "vote" };
  return session;
}

export function hide(session: Session): Session {
  if (session.phase !== "peek") return session;
  const next = session.cursor + 1;
  if (next >= session.round.playerCount) return { ...session, phase: "discuss", cursor: 0 };
  return { ...session, phase: "cover", cursor: next };
}

export function beginVote(session: Session): Session {
  if (session.phase !== "discuss") return session;
  return { ...session, phase: "voteCover", cursor: 0 };
}

function resolveVotes(session: Session): Session {
  const tally = new Array<number>(session.round.playerCount).fill(0);
  for (const vote of session.votes) {
    if (vote !== null) tally[vote] += 1;
  }
  let top = -1;
  const leaders: number[] = [];
  tally.forEach((count, index) => {
    if (count > top) {
      top = count;
      leaders.splice(0, leaders.length, index);
    } else if (count === top) leaders.push(index);
  });
  if (leaders.length === 1 && leaders[0] === session.round.liar) return { ...session, phase: "guess" };
  return { ...session, phase: "result", winner: "liar" };
}

export function castVote(session: Session, target: number): Session {
  if (session.phase !== "vote") return session;
  if (!Number.isInteger(target) || target < 0 || target >= session.round.playerCount) return session;
  const votes = session.votes.slice();
  votes[session.cursor] = target;
  const next = session.cursor + 1;
  if (next < session.round.playerCount) return { ...session, votes, phase: "voteCover", cursor: next };
  return resolveVotes({ ...session, votes });
}

export function guessWord(session: Session, word: string): Session {
  if (session.phase !== "guess") return session;
  if (!session.round.choices.includes(word)) return session;
  return { ...session, phase: "result", guess: word, winner: word === session.round.word ? "liar" : "group" };
}
