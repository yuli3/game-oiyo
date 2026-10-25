/**
 * @file gomoku-tsumego.ts
 * @description Pillar 2: Gomoku Daily Tsumego (묘수풀이) Puzzle Engine.
 * Curated daily endgame tactical challenges where Black must find the decisive winning move sequence.
 */

export interface TsumegoStone {
  index: number;
  player: 1 | 2; // 1 = Black (Player), 2 = White (AI)
}

export interface TsumegoPuzzle {
  id: string;
  title: string;
  hint: string;
  description: string;
  initialStones: TsumegoStone[];
  /** Sequence of correct move indices Black must play */
  winningMoves: number[];
  /** Optional AI countermoves played after Black's moves (except final winning move) */
  aiResponses?: number[];
}

export const TSUMEGO_PUZZLES: TsumegoPuzzle[] = [
  {
    id: "tsumego-01-open-four",
    title: "1수 필승: 열린 4(Open Four)",
    hint: "양쪽이 열린 4를 만들어 백이 한쪽을 막아도 다음 수에 승리하세요.",
    description: "흑 3개가 나란히 있습니다. 열린 4를 완성하는 급소를 찾으세요.",
    initialStones: [
      { index: 112, player: 1 }, // H8
      { index: 113, player: 1 }, // H9
      { index: 114, player: 1 }, // H10
      { index: 97, player: 2 },
      { index: 129, player: 2 },
    ],
    winningMoves: [111], // H7 completes open four (or 115)
  },
  {
    id: "tsumego-02-double-three",
    title: "쌍삼(3-3) 공격 클라이맥스",
    hint: "가로와 세로가 교차하는 중심점을 찾아 동시 3목을 형성하세요.",
    description: "백의 수비를 뚫고 두 개의 3을 동시에 열어 승기를 잡으세요.",
    initialStones: [
      { index: 111, player: 1 },
      { index: 113, player: 1 },
      { index: 82, player: 1 },
      { index: 142, player: 1 },
      { index: 110, player: 2 },
      { index: 114, player: 2 },
    ],
    winningMoves: [112], // Intersection creating double three
  },
  {
    id: "tsumego-03-four-three",
    title: "사삼(4-3) 필승 연결",
    hint: "4를 만들어 백의 응수를 강제한 후 3으로 필승 국면을 굳히세요.",
    description: "한 수로 4와 3을 동시에 형성하는 전형적인 오목 필승 공격입니다.",
    initialStones: [
      { index: 96, player: 1 },
      { index: 97, player: 1 },
      { index: 98, player: 1 }, // row 6
      { index: 84, player: 1 },
      { index: 114, player: 1 }, // col 9
      { index: 95, player: 2 },
      { index: 100, player: 2 },
    ],
    winningMoves: [99], // (6, 9) forms 4 horizontal & 3 vertical
  },
  {
    id: "tsumego-04-diagonal-rush",
    title: "대각선 급소 타격",
    hint: "보이지 않는 대각선 4목을 완성하여 즉시 5목으로 연결하세요.",
    description: "대각선으로 뻗어나가는 흑의 돌들을 하나로 꿰뚫는 급소입니다.",
    initialStones: [
      { index: 64, player: 1 },
      { index: 80, player: 1 },
      { index: 96, player: 1 },
      { index: 128, player: 1 },
      { index: 65, player: 2 },
      { index: 81, player: 2 },
    ],
    winningMoves: [112], // (7, 7) completes diagonal five
  },
];

/**
 * Returns deterministic daily tsumego puzzle based on date string.
 */
export function getDailyTsumego(dateStr?: string): TsumegoPuzzle {
  if (!dateStr) {
    const now = new Date();
    dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }

  const index = hash % TSUMEGO_PUZZLES.length;
  return TSUMEGO_PUZZLES[index] ?? TSUMEGO_PUZZLES[0];
}

/**
 * Validates player's move in the Tsumego challenge.
 */
export function evaluateTsumegoMove(
  puzzle: TsumegoPuzzle,
  stepIndex: number,
  moveIndex: number
): { isCorrect: boolean; isComplete: boolean; aiCounterMove?: number } {
  const expected = puzzle.winningMoves[stepIndex];
  if (moveIndex !== expected) {
    return { isCorrect: false, isComplete: false };
  }

  const isComplete = stepIndex >= puzzle.winningMoves.length - 1;
  const aiCounterMove = !isComplete && puzzle.aiResponses
    ? puzzle.aiResponses[stepIndex]
    : undefined;

  return { isCorrect: true, isComplete, aiCounterMove };
}
