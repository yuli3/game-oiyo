/**
 * @file seed-challenge.ts
 * @description Pillar 3: Retention & Viral Seed Challenge Engine.
 * Provides deterministic PRNG seeding, challenge URL serialization, 6-language invite copy,
 * and competitive outcome evaluation between friends playing the identical puzzle seed.
 */

export interface BuildChallengeOptions {
  baseUrl?: string;
  locale?: string;
  slug: string;
  seed: number;
  score?: number;
}

export interface ParsedChallenge {
  isChallenge: boolean;
  seed: number;
  seedCode: string;
  challengerScore?: number;
}

export interface ChallengeCopyOptions {
  locale?: string;
  gameTitle: string;
  score?: number;
  url: string;
}

export interface ChallengeEvaluation {
  outcome: "win" | "lose" | "tie" | "solo";
  diff: number;
}

/**
 * Encodes an unsigned integer seed into a clean uppercase base36 string.
 */
export function encodeSeed(seed: number): string {
  const safeSeed = Math.max(0, Math.floor(Math.abs(seed))) >>> 0;
  return safeSeed.toString(36).toUpperCase();
}

/**
 * Decodes a base36 string back into an unsigned integer seed.
 * Falls back to a deterministic hash if input is malformed.
 */
export function decodeSeed(code: string): number {
  if (!code || typeof code !== "string") {
    return 1;
  }
  const clean = code.trim().toLowerCase();
  const parsed = parseInt(clean, 36);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed >>> 0;
  }
  // Deterministic fallback hash
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

/**
 * Builds a deterministic challenge URL with seed and optional score parameters.
 */
export function buildChallengeUrl(options: BuildChallengeOptions): string {
  const { baseUrl = "", locale = "ko", slug, seed, score } = options;
  const encodedSeed = encodeSeed(seed);
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const path = `${cleanBase}/${locale}/games/${slug}`;

  const params = new URLSearchParams();
  params.set("seed", encodedSeed);
  if (score !== undefined && Number.isFinite(score)) {
    params.set("challenge", String(Math.floor(score)));
  }

  return `${path}?${params.toString()}`;
}

/**
 * Parses URL query parameters to extract seed and challenger score.
 */
export function parseChallengeUrl(
  searchParams: URLSearchParams | string
): ParsedChallenge {
  const params =
    typeof searchParams === "string"
      ? new URLSearchParams(searchParams)
      : searchParams;

  const rawSeed = params.get("seed");
  const rawChallenge = params.get("challenge");

  if (!rawSeed) {
    return {
      isChallenge: false,
      seed: 1,
      seedCode: "",
    };
  }

  const seed = decodeSeed(rawSeed);
  let challengerScore: number | undefined;

  if (rawChallenge) {
    const num = Number(rawChallenge);
    if (Number.isFinite(num) && num >= 0) {
      challengerScore = Math.floor(num);
    }
  }

  return {
    isChallenge: true,
    seed,
    seedCode: rawSeed.toUpperCase(),
    challengerScore,
  };
}

const COPY_TEMPLATES: Record<
  string,
  {
    withScore: (title: string, score: number, url: string) => string;
    withoutScore: (title: string, url: string) => string;
  }
> = {
  ko: {
    withScore: (title, score, url) =>
      `🎮 [OIYO 게임 도전장] '${title}'에서 ${score.toLocaleString()}점을 달성했어요! 똑같은 시드에서 저를 이길 수 있을까요?\n\n👉 도전하기: ${url}`,
    withoutScore: (title, url) =>
      `🎮 [OIYO 게임 도전장] '${title}' 동일한 시드 대결에 초대합니다! 과연 누가 더 높은 점수를 낼까요?\n\n👉 대결하기: ${url}`,
  },
  en: {
    withScore: (title, score, url) =>
      `🎮 [OIYO Arcade Challenge] I scored ${score.toLocaleString()} pts in '${title}'! Can you beat my score on the exact same seed?\n\n👉 Accept Challenge: ${url}`,
    withoutScore: (title, url) =>
      `🎮 [OIYO Arcade Challenge] You are challenged to a 1v1 match in '${title}' with the exact same seed!\n\n👉 Play Seed: ${url}`,
  },
  ja: {
    withScore: (title, score, url) =>
      `🎮 [OIYO アーケード挑戦状] 『${title}』で ${score.toLocaleString()} 点を達成しました！同じシード盤面で勝てますか？\n\n👉 挑戦する: ${url}`,
    withoutScore: (title, url) =>
      `🎮 [OIYO アーケード挑戦状] 『${title}』同じシードでスコア対決！\n\n👉 プレイする: ${url}`,
  },
  zh: {
    withScore: (title, score, url) =>
      `🎮 [OIYO 街机挑战信] 我在《${title}》中取得了 ${score.toLocaleString()} 分！在完全相同的种子下你能超越我吗？\n\n👉 接受挑战: ${url}`,
    withoutScore: (title, url) =>
      `🎮 [OIYO 街机挑战信] 邀请你进行《${title}》相同种子对决！\n\n👉 点击应战: ${url}`,
  },
  fr: {
    withScore: (title, score, url) =>
      `🎮 [Défi Arcade OIYO] J'ai obtenu ${score.toLocaleString()} pts dans '${title}' ! Peux-tu faire mieux sur la même graine ?\n\n👉 Relever le défi : ${url}`,
    withoutScore: (title, url) =>
      `🎮 [Défi Arcade OIYO] Défi 1 contre 1 sur '${title}' avec la même graine !\n\n👉 Jouer : ${url}`,
  },
  es: {
    withScore: (title, score, url) =>
      `🎮 [Desafío Arcade OIYO] ¡Conseguí ${score.toLocaleString()} pts en '${title}'! ¿Puedes superarme con la misma semilla?\n\n👉 Aceptar desafío: ${url}`,
    withoutScore: (title, url) =>
      `🎮 [Desafío Arcade OIYO] ¡Te desafío a una partida 1v1 en '${title}' con la misma semilla!\n\n👉 Jugar ahora: ${url}`,
  },
};

/**
 * Generates an invite message with score and challenge URL across 6 languages.
 */
export function generateChallengeCopy(options: ChallengeCopyOptions): string {
  const { locale = "en", gameTitle, score, url } = options;
  const tmpl = COPY_TEMPLATES[locale] ?? COPY_TEMPLATES.en;

  if (score !== undefined && Number.isFinite(score)) {
    return tmpl.withScore(gameTitle, Math.floor(score), url);
  }
  return tmpl.withoutScore(gameTitle, url);
}

/**
 * Evaluates the outcome between the player and their challenger rival.
 */
export function evaluateChallengeResult(
  playerScore: number,
  challengerScore?: number
): ChallengeEvaluation {
  if (challengerScore === undefined || !Number.isFinite(challengerScore)) {
    return { outcome: "solo", diff: 0 };
  }

  const diff = playerScore - challengerScore;
  if (diff > 0) {
    return { outcome: "win", diff };
  }
  if (diff < 0) {
    return { outcome: "lose", diff };
  }
  return { outcome: "tie", diff: 0 };
}
