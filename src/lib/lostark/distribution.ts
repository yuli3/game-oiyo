// Lost Ark 1-main/3-alt (본1부3) raid "help party" distribution.
// Algorithm ported verbatim from ahoxy components/calculators/q1q3.tsx —
// initial placement (arrangeParty) + fill/balance (distributeCharacters).
// This is a separate tool from the raid bus-fee calculator.

export type RaidType = "1-1" | "1-3";
export type PartySize = "4" | "8" | "16";
type GameResult = string[][];

const DEALER_CHARS = ["ㄷ", "D", "d"];
const SUPPORTER_CHARS = ["ㅍ", "S", "s"];
const MAIN_CHAR_SUFFIX = "(M)";

export const getGameCount = (raidType: RaidType): number =>
  raidType === "1-1" ? 2 : 4;

export const getRequiredSupporters = (partySize: PartySize, raidType: RaidType): number => {
  const players = parseInt(partySize, 10);
  const games = getGameCount(raidType);
  return (players * games) / 4;
};

interface CharacterCounts {
  mainDealer: number[];
  mainSupporter: number[];
  subDealer: number[];
  subSupporter: number[];
}

function countCharacters(result: GameResult): CharacterCounts {
  const counts: CharacterCounts = {
    mainDealer: new Array(result[0].length).fill(0),
    mainSupporter: new Array(result[0].length).fill(0),
    subDealer: new Array(result[0].length).fill(0),
    subSupporter: new Array(result[0].length).fill(0),
  };
  result.forEach((player) => {
    player.forEach((char, gameIndex) => {
      const isMain = char.includes(MAIN_CHAR_SUFFIX);
      const isDealer = DEALER_CHARS.includes(char.charAt(0));
      if (isMain) {
        if (isDealer) counts.mainDealer[gameIndex]++;
        else counts.mainSupporter[gameIndex]++;
      } else {
        if (isDealer) counts.subDealer[gameIndex]++;
        else counts.subSupporter[gameIndex]++;
      }
    });
  });
  return counts;
}

export function calculateSupporterInfo(
  playerInputs: string[],
  partySize: PartySize,
  raidType: RaidType,
) {
  let supporterCount = 0;
  const lines = playerInputs.join("\n").trim().split("\n").filter((l) => l.trim() !== "");
  lines.forEach((line) => {
    line.split("").forEach((char) => {
      if (SUPPORTER_CHARS.includes(char)) supporterCount++;
    });
  });
  const requiredSupporters = getRequiredSupporters(partySize, raidType);
  const difference = supporterCount - requiredSupporters;
  return { supporterCount, requiredSupporters, difference, isDeficient: difference < 0 };
}

function swapCharacters(result: GameResult, player: number, game1: number, game2: number): void {
  [result[player][game1], result[player][game2]] = [result[player][game2], result[player][game1]];
}

function distributeCharacters(result: GameResult, playersData: string[][]): GameResult {
  const games = result[0].length;
  const players = result.length;

  for (let game = 0; game < games; game++) {
    for (let player = 0; player < players; player++) {
      if (result[player][game] === "") {
        const availableChar = playersData[player].find((char) => !result[player].includes(char));
        if (availableChar) result[player][game] = availableChar;
      }
    }
  }

  let iteration = 0;
  const maxIterations = 100;
  while (iteration < maxIterations) {
    iteration++;
    const counts = countCharacters(result);
    const totalSupporters = counts.mainSupporter.map((c, i) => c + counts.subSupporter[i]);
    const mainSupporters = [...counts.mainSupporter];
    const totalMains = counts.mainDealer.map((c, i) => c + counts.mainSupporter[i]);

    const maxSupGame = totalSupporters.indexOf(Math.max(...totalSupporters));
    const minSupGame = totalSupporters.indexOf(Math.min(...totalSupporters));
    const maxMainSupGame = mainSupporters.indexOf(Math.max(...mainSupporters));
    const minMainSupGame = mainSupporters.indexOf(Math.min(...mainSupporters));
    const maxMainsGame = totalMains.indexOf(Math.max(...totalMains));
    const minMainsGame = totalMains.indexOf(Math.min(...totalMains));

    if (
      Math.max(...mainSupporters) - Math.min(...mainSupporters) <= 1 &&
      Math.max(...totalSupporters) - Math.min(...totalSupporters) <= 1 &&
      Math.max(...totalMains) - Math.min(...totalMains) <= 1
    ) {
      break;
    }

    if (Math.max(...mainSupporters) - Math.min(...mainSupporters) > 1) {
      for (let player = 1; player < players; player++) {
        const maxChar = result[player][maxMainSupGame];
        if (SUPPORTER_CHARS.includes(maxChar.charAt(0)) && maxChar.includes(MAIN_CHAR_SUFFIX)) {
          swapCharacters(result, player, maxMainSupGame, minMainSupGame);
          break;
        }
      }
    } else if (Math.max(...totalSupporters) - Math.min(...totalSupporters) > 1) {
      for (let player = 1; player < players; player++) {
        const maxChar = result[player][maxSupGame];
        const minChar = result[player][minSupGame];
        if (
          SUPPORTER_CHARS.includes(maxChar.charAt(0)) &&
          !maxChar.includes(MAIN_CHAR_SUFFIX) &&
          DEALER_CHARS.includes(minChar.charAt(0))
        ) {
          swapCharacters(result, player, maxSupGame, minSupGame);
          break;
        }
      }
    } else if (Math.max(...totalMains) - Math.min(...totalMains) > 1) {
      for (let player = 1; player < players; player++) {
        const maxChar = result[player][maxMainsGame];
        const minChar = result[player][minMainsGame];
        if (
          DEALER_CHARS.includes(maxChar.charAt(0)) &&
          maxChar.includes(MAIN_CHAR_SUFFIX) &&
          DEALER_CHARS.includes(minChar.charAt(0)) &&
          !minChar.includes(MAIN_CHAR_SUFFIX)
        ) {
          swapCharacters(result, player, maxMainsGame, minMainsGame);
          break;
        }
      }
    }
  }
  return result;
}

function arrangeParty(playersData: string[][], games: number, raidType: RaidType, partySize: PartySize): GameResult {
  const result: GameResult = Array(playersData.length).fill(null).map(() => Array(games).fill(""));
  const players = playersData.length;
  for (let i = 0; i < players; i++) {
    let targetGame: number;
    if (raidType === "1-3") {
      if (partySize === "16") targetGame = Math.floor(i / 4);
      else if (partySize === "8") targetGame = Math.floor(i / 2) % games;
      else targetGame = i % games;
    } else {
      if (partySize === "16") targetGame = Math.floor(i / 8);
      else if (partySize === "8") targetGame = Math.floor(i / 4);
      else targetGame = Math.floor(i / 2);
    }
    result[i][targetGame] = playersData[i][0];
  }
  return distributeCharacters([...result], playersData);
}

export interface DistributionOutput {
  result: GameResult | null;
  error: "count" | "invalid" | null;
  errorDetail?: { expected?: number; actual?: number; lines?: string };
}

export function generateDistribution(
  playerInputs: string[],
  raidType: RaidType,
  partySize: PartySize,
): DistributionOutput {
  const games = getGameCount(raidType);
  const lines = playerInputs.join("\n").trim().split("\n").filter((l) => l.trim() !== "");
  const expectedPlayers = parseInt(partySize, 10);

  if (lines.length !== expectedPlayers) {
    return { result: null, error: "count", errorDetail: { expected: expectedPlayers, actual: lines.length } };
  }

  const invalidLines = lines
    .map((line, idx) => {
      const chars = line.split("");
      const isValid =
        chars.length === games &&
        chars.every((char) => DEALER_CHARS.includes(char) || SUPPORTER_CHARS.includes(char));
      return isValid ? null : idx + 1;
    })
    .filter((idx): idx is number => idx !== null);

  if (invalidLines.length > 0) {
    return { result: null, error: "invalid", errorDetail: { lines: invalidLines.join(", ") } };
  }

  const playersData = lines.map((line) =>
    line.split("").map((char, index) => `${char}${index === 0 ? MAIN_CHAR_SUFFIX : `(${index})`}`),
  );
  return { result: arrangeParty(playersData, games, raidType, partySize), error: null };
}

// Strip internal tags for display: "ㄷ(M)" -> "ㄷ", "ㅍ(2)" -> "ㅍ".
export function cleanChar(text: string): string {
  return text.replaceAll(MAIN_CHAR_SUFFIX, "").replace(/\([0-9]+\)/g, "");
}

export function isMainChar(text: string): boolean {
  return text.includes(MAIN_CHAR_SUFFIX);
}

export function isDealerChar(text: string): boolean {
  return DEALER_CHARS.includes(text.charAt(0));
}

export function generateRoomCode() {
  return {
    roomCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    password: Math.floor(1000 + Math.random() * 9000).toString(),
  };
}
