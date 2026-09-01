import type { Locale } from "../lib/i18n";

export interface GameInsight {
  title: Partial<Record<Locale, string>>;
  paragraphs: Partial<Record<Locale, string[]>>;
}

export const GAME_INSIGHTS: Record<string, GameInsight> = {
  "block-burst": {
    title: { ko: "가로만 보지 말고 세로 기둥을 남긴다", en: "Keep a column climbing while you clear rows" },
    paragraphs: {
      ko: ["가로 8칸을 채우는 편이 쉽지만, 세로 10칸이 동시에 차면 교차 폭발로 점수가 두 배가 됩니다. 한쪽 벽을 높게 쌓아 기둥을 만들고 반대편에서 줄을 지우는 리듬이 안정적입니다.", "하드 드롭은 빠르지만 다음 블록의 자리를 빼앗습니다. 연쇄가 열릴 때만 쓰고, 그 외에는 한 칸씩 내려 모양을 맞추세요."],
      en: ["Filling a row of eight is easier, but a simultaneous full column doubles the burst. Stack one wall as a rising column and clear rows on the opposite side.", "Hard drops are fast and steal the next piece's landing. Use them when a chain is open; otherwise nudge down and fit the shape."],
    },
  },
  "game-2048": {
    title: { ko: "빈칸과 합성의 우선순위", en: "Prioritize space and merges" },
    paragraphs: {
      ko: ["2048의 숫자는 같은 값을 합칠 때마다 두 배가 됩니다. 큰 타일 하나만 좇기보다 작은 타일이 합쳐질 순서를 만들고, 가장 큰 타일은 한쪽 모서리에 고정하는 편이 안정적입니다.", "빈칸은 다음 수를 선택할 수 있는 여유입니다. 당장 점수가 오르는 합성이라도 판 중앙을 막는다면 미루고, 한 방향으로 정돈된 흐름을 유지하세요."],
      en: ["Every merge doubles a tile, but chasing one large number is less reliable than arranging smaller tiles in merge order. Keep the largest tile anchored in one corner.", "Empty cells are decision space. Delay a scoring merge if it blocks the center, and preserve a consistent directional flow."],
    },
  },
  "aim-trainer": {
    title: { ko: "빠른 클릭보다 정확한 반복", en: "Accurate repetition before speed" },
    paragraphs: {
      ko: ["에임 훈련은 반응속도만 재는 게임이 아닙니다. 목표 중앙에서 시선을 떼지 않고 짧고 정확하게 이동한 뒤 클릭하는 동작을 반복해야 실제 정확도가 올라갑니다.", "속도를 억지로 높이면 빗나간 뒤 다시 조준하는 시간이 늘어납니다. 먼저 일정한 정확도를 유지하고, 기록에서 명중률이 무너지지 않는 범위 안에서 속도를 올리세요."],
      en: ["Aim training is not only a reaction test. Accuracy improves by repeating a short, controlled movement to the target center before clicking.", "Forcing speed creates misses and costly corrections. Establish stable accuracy first, then increase pace only while that accuracy holds."],
    },
  },
  blackjack: {
    title: { ko: "확률에 맞춰 손실을 제한하기", en: "Use probability to limit losses" },
    paragraphs: {
      ko: ["블랙잭의 판단은 다음 카드 한 장을 맞히는 일이 아니라, 현재 합계와 딜러의 공개 카드에 따라 장기적으로 손실이 적은 선택을 반복하는 일입니다.", "한 판의 승패는 운에 흔들리지만 같은 조건에서 히트·스탠드 기준을 바꾸지 않으면 결과를 복기할 수 있습니다. 감정적인 베팅 확대는 전략이 아닙니다."],
      en: ["Blackjack is not about predicting the next card. It is about repeatedly choosing the lower-loss action for your total and the dealer's upcard.", "A single hand is noisy, but consistent hit and stand rules make results reviewable. Increasing a wager out of frustration is not strategy."],
    },
  },
  checkers: {
    title: { ko: "잡을 수보다 착지 지점 보기", en: "Evaluate the landing square" },
    paragraphs: {
      ko: ["체커에서는 말을 잡는 순간보다 잡고 난 뒤 어디에 서는지가 중요합니다. 연속 점프를 열어 주는지, 반대로 상대의 강제 잡기에 노출되는지까지 한 묶음으로 계산하세요.", "킹 승격을 서두르되 가장자리에서 말이 고립되지 않게 해야 합니다. 중앙의 연결된 말은 서로의 대각선을 지키며 선택지를 늘립니다."],
      en: ["In Checkers, the landing square can matter more than the capture itself. Calculate whether it opens another jump or exposes the piece to a forced reply.", "Push toward promotion without isolating pieces on the edge. Connected central pieces protect diagonals and preserve options."],
    },
  },
  chess: {
    title: { ko: "기물 가치와 자리의 가치를 함께 보기", en: "Balance material and position" },
    paragraphs: {
      ko: ["체스에서 기물 점수는 교환을 검토하는 출발점일 뿐입니다. 중앙 통제, 킹의 안전, 전개 속도가 나쁘면 기물 하나를 앞서도 주도권을 잃을 수 있습니다.", "좋은 수는 상대의 가장 강한 응수를 견딥니다. 내 계획만 이어 보기보다 후보 수마다 상대가 둘 수 있는 체크·잡기·위협을 먼저 확인하세요."],
      en: ["Piece values are only a starting point for evaluating trades. Poor central control, king safety, or development can erase a material advantage.", "A sound move survives the opponent's strongest reply. For every candidate, check opposing checks, captures, and threats before continuing your plan."],
    },
  },
  "connect-four": {
    title: { ko: "한 줄이 아니라 두 위협 만들기", en: "Create two threats, not one" },
    paragraphs: {
      ko: ["사목은 보이는 세 칸을 막는 게임처럼 보이지만 핵심은 다음 수에 두 곳에서 동시에 완성되는 이중 위협입니다. 가운데 열은 더 많은 연결 방향을 만들기 때문에 초반 가치가 큽니다.", "돌은 아래에서부터 쌓이므로 빈칸 하나만 볼 수 없습니다. 그 칸을 받치는 돌이 상대에게 어떤 승리 칸을 열어 주는지까지 계산하세요."],
      en: ["Connect Four is not only about blocking visible triples. The decisive pattern is a double threat that wins in either of two places next turn, and central columns create more routes.", "Pieces stack from below, so an empty cell cannot be judged alone. Calculate which winning square becomes playable when its supporting piece is added."],
    },
  },
  dominoes: {
    title: { ko: "연결할 숫자와 남길 숫자", en: "Connect now, preserve later" },
    paragraphs: {
      ko: ["도미노에서는 놓을 수 있는 패보다 놓고 난 뒤 이어 갈 수 있는 패가 중요합니다. 손에 많이 남은 숫자를 판의 열린 끝으로 유지하면 다음 차례 선택지가 늘어납니다.", "상대가 특정 숫자를 여러 번 피했다면 그 숫자가 없을 가능성을 기록하세요. 판의 양끝을 그 숫자로 통제하면 상대의 차례를 끊을 수 있습니다."],
      en: ["In Dominoes, the follow-up matters more than the tile that merely fits now. Keep numbers you hold often on an open end to preserve future choices.", "If an opponent repeatedly avoids a number, remember that evidence. Controlling both ends with that number can force a pass."],
    },
  },
  freecell: {
    title: { ko: "빈 셀을 작업 공간으로 쓰기", en: "Treat free cells as workspace" },
    paragraphs: {
      ko: ["프리셀의 빈 셀은 막힌 카드를 잠시 치우는 작업 공간입니다. 네 칸을 모두 채우면 옮길 수 있는 카드 묶음이 급격히 줄어드니, 셀 하나 이상을 남기는 계획이 필요합니다.", "에이스를 바로 올리는 것이 항상 정답은 아닙니다. 아래에서 필요한 낮은 카드를 먼저 빼면 교차 색상 수열을 만들 통로가 사라질 수 있습니다."],
      en: ["Free cells are temporary workspace for exposing blocked cards. Filling all four sharply reduces the sequences you can move, so plan to keep at least one available.", "Sending an ace home immediately is not always correct. Moving low cards too early can remove the bridge needed for alternating-color sequences."],
    },
  },
  gomoku: {
    title: { ko: "돌 하나로 두 방향을 연결하기", en: "Connect two directions with one stone" },
    paragraphs: {
      ko: ["오목은 열린 3과 열린 4를 만들고 막는 싸움입니다. 한 방향의 긴 줄보다 돌 하나가 가로·세로·대각선 두 위협에 동시에 참여하는 교차점을 찾으세요.", "상대 수를 막을 때도 내 돌과 이어지는 칸을 고르면 수비가 곧 공격 준비가 됩니다. 눈앞의 4만 보지 말고 다음 수에 생길 복합 위협을 확인하세요."],
      en: ["Gomoku revolves around creating and stopping open threes and fours. A stone that participates in threats along two directions is stronger than a longer isolated line.", "When defending, prefer a blocking square that also connects your stones. Defense then prepares an attack instead of merely spending a move."],
    },
  },
  "hearts-game": {
    title: { ko: "점수를 피하고 흐름을 넘기기", en: "Pass points and control the lead" },
    paragraphs: {
      ko: ["하트에서는 트릭을 많이 따는 것이 승리가 아닙니다. 높은 카드와 위험한 무늬를 초반에 정리해 벌점 카드가 나온 뒤 선택권을 잃지 않게 하세요.", "어떤 무늬가 없는 상태는 강력한 정보입니다. 그 무늬가 리드될 때 하트나 스페이드 퀸을 버릴 수 있으므로, 패스 단계부터 비울 무늬를 정해 두세요."],
      en: ["In Hearts, taking more tricks is not the goal. Shed dangerous high cards early so you retain choices after penalty cards begin to fall.", "Being void in a suit is powerful information and an escape route. Plan during the pass which suit to empty so later leads let you discard hearts or the queen of spades."],
    },
  },
  "memory-card-game": {
    title: { ko: "위치보다 짝의 관계를 기억하기", en: "Remember pairs as relationships" },
    paragraphs: {
      ko: ["카드를 한 장씩 외우기보다 같은 그림의 두 위치를 관계로 묶어 기억하세요. 새 카드를 열기 전 방금 본 카드와 맞는 위치가 있었는지 잠깐 회상하면 불필요한 뒤집기가 줄어듭니다.", "틀린 시도도 정보입니다. 연속해서 새 카드만 열기보다 이미 본 위치를 주기적으로 다시 떠올리면 작업기억의 부담을 낮출 수 있습니다."],
      en: ["Instead of memorizing cards independently, encode the two locations of a matching image as one relationship. Briefly recall whether the latest card has a known partner before turning another.", "A failed attempt still adds information. Periodically rehearse known positions instead of continuously opening new cards to reduce working-memory load."],
    },
  },
  reversi: {
    title: { ko: "지금의 점유보다 마지막의 선택지", en: "Optimize final options, not current count" },
    paragraphs: {
      ko: ["리버시는 중반의 돌 수가 승패를 말해 주지 않습니다. 상대에게 둘 수 있는 칸을 적게 주고, 뒤집히지 않는 모서리와 가장자리를 확보하는 과정이 더 중요합니다.", "모서리 옆 칸은 상대에게 모서리를 내줄 수 있어 위험합니다. 당장 많이 뒤집는 수보다 다음 차례 상대의 합법 수가 어떻게 바뀌는지 먼저 보세요."],
      en: ["The midgame disc count does not predict the winner in Reversi. Restricting mobility and securing stable corners and edges matters more.", "Squares beside a corner can hand that corner to the opponent. Evaluate how a move changes the opponent's legal replies before choosing the largest immediate flip."],
    },
  },
  "water-sort": {
    title: { ko: "빈 병을 완충 공간으로 남기기", en: "Preserve an empty buffer" },
    paragraphs: {
      ko: ["워터 소트는 같은 색을 모으는 동시에 위에 막힌 색을 꺼내는 순서를 만드는 퍼즐입니다. 빈 병을 아무 색으로 채우기보다 여러 병을 풀 수 있는 임시 공간으로 남겨 두세요.", "한 병을 완성하는 수가 다른 색을 깊이 묻는다면 전체 진행은 오히려 막힐 수 있습니다. 다음 두세 번의 이동 뒤에도 빈 공간이 남는지 확인하세요."],
      en: ["Water Sort is about sequencing access to buried colors as much as grouping identical ones. Keep an empty tube as temporary workspace instead of committing it too early.", "Completing one tube can still block the puzzle if it buries another color. Check whether usable space remains after the next two or three pours."],
    },
  },
  "wheel-spinner": {
    title: { ko: "결정권을 넘기지 않고 선택 부담 줄이기", en: "Reduce choice load without surrendering judgment" },
    paragraphs: {
      ko: ["돌림판은 비슷한 선택지 사이에서 결정을 시작하게 돕는 도구입니다. 결과가 나왔을 때 안도감보다 거부감이 크다면, 그 반응 자체가 선호를 알려 주는 정보입니다.", "건강·돈·안전처럼 결과의 손실이 큰 결정은 무작위로 맡기지 마세요. 먼저 허용 가능한 선택지만 남긴 뒤 가벼운 일상의 순서를 정할 때 사용하세요."],
      en: ["A spinner can start a decision among similarly acceptable options. If the result produces resistance rather than relief, that reaction is useful preference information.", "Do not randomize high-impact health, money, or safety decisions. Filter to acceptable choices first, then use chance only for low-stakes ordering."],
    },
  },
  "tier-list": {
    title: { ko: "기준을 먼저 정하고 등급 나누기", en: "Define criteria before ranking" },
    paragraphs: {
      ko: ["티어 리스트는 항목을 끌어놓는 도구이지만 결과의 품질은 등급 기준에서 결정됩니다. 강함, 재미, 비용처럼 서로 다른 기준을 한 표에 섞지 말고 제목이나 메모에 평가 축을 적으세요.", "경계에 있는 항목부터 비교하면 등급 차이가 선명해집니다. 완성 뒤에는 같은 등급 안에서도 순서가 의미 있는지 확인하고, 의미가 없다면 억지로 줄 세우지 마세요."],
      en: ["A tier list is a drag-and-drop surface, but its quality comes from the ranking criterion. Do not mix strength, enjoyment, and cost in one board without naming the axis.", "Compare borderline items first to clarify tier boundaries. Afterward, decide whether order within a tier means anything instead of forcing a false ranking."],
    },
  },
  wordle: {
    title: { ko: "단어보다 정보량이 큰 첫 수", en: "Open with information, not a guess" },
    paragraphs: {
      ko: ["워들의 첫 단어는 정답을 맞히기보다 자주 쓰이는 모음과 서로 다른 자음을 확인하는 탐색 수입니다. 회색 글자를 다시 쓰지 않고 노란 글자의 새 위치를 시험하면 후보를 빠르게 줄일 수 있습니다.", "초록 글자에만 매달리면 같은 틀의 후보가 많이 남습니다. 가능한 단어들을 떠올린 뒤 그 차이를 가장 많이 가르는 글자를 포함한 수를 고르세요."],
      en: ["A Wordle opener should test common vowels and distinct consonants rather than chase an immediate answer. Avoid gray letters and move yellow letters to new positions.", "Green letters can leave a large family of similar candidates. List plausible words, then choose a guess that separates them with the most informative letters."],
    },
  },
  solitaire: {
    title: { ko: "정돈을 만드는 플레이", en: "Playing toward order" },
    paragraphs: {
      ko: ["솔리테어에서는 눈앞의 카드를 옮기는 것보다 뒤집힌 카드를 드러내는 수가 중요합니다. 숨은 정보를 먼저 여는 선택이 다음 이동 경로를 늘립니다.", "빈 열은 킹과 그 아래 묶음을 옮길 수 있는 귀한 완충 공간입니다. 빈칸을 생겼다고 바로 채우지 말고, 어떤 카드열을 풀어낼지 정한 뒤 사용하세요."],
      en: ["In Solitaire, revealing a face-down card often matters more than making the most obvious move. Opening hidden information creates more routes for later play.", "An empty column is valuable buffer space because it can hold a king-led sequence. Do not fill it automatically; decide which blocked column it should unlock."],
    },
  },
  "tents-and-trees": {
    title: { ko: "제약을 연결해서 푸는 법", en: "Solving connected constraints" },
    paragraphs: {
      ko: ["행이나 열의 텐트 수가 모두 채워지면 나머지 칸은 잔디로 확정됩니다. 한 가지 결론이 주변 후보를 지우는 연쇄를 따라가면 찍지 않고도 판이 좁혀집니다.", "텐트는 나무와 일대일로 짝을 이루고 서로 닿지 않습니다. 텐트를 놓을 수 있는 칸이 하나뿐인 나무부터 찾고, 그 선택이 다른 나무의 유일한 자리를 빼앗지 않는지 확인하세요."],
      en: ["When a row or column has all its tents, every remaining cell there becomes grass. Follow the chain as one conclusion removes nearby candidates, narrowing the board without guessing.", "Each tent pairs with one tree and tents never touch. Start with trees that have only one possible cell, then verify that choice does not steal another tree's only partner."],
    },
  },
  sudoku: {
    title: { ko: "가능성을 쓰기 전에 불가능성을 지우기", en: "Eliminate before you place" },
    paragraphs: {
      ko: ["빈칸에 숫자를 바로 넣기보다 같은 행·열·박스에 이미 있는 숫자를 먼저 지우세요. 후보가 하나만 남은 칸과, 특정 숫자가 들어갈 자리가 한 곳뿐인 구역이 가장 안전한 출발점입니다.", "한 칸의 중복은 전체 해를 무너뜨립니다. 막혔다면 추측을 늘리기보다 최근에 확정한 숫자가 어느 행·열·박스의 후보를 바꿨는지 다시 훑어보세요."],
      en: ["Before placing a digit, eliminate those already present in the same row, column, and box. Cells with one candidate and units with one possible position for a digit are the safest starting points.", "One duplicate breaks the whole solution. When stuck, do not add guesses; revisit how the latest confirmed digit changed candidates in its row, column, and box."],
    },
  },
  minesweeper: {
    title: { ko: "확정 정보와 확률을 구분하기", en: "Separate certainty from probability" },
    paragraphs: {
      ko: ["숫자 하나보다 서로 겹치는 숫자들의 범위를 함께 보세요. 이미 꽂은 깃발 수를 빼면 어느 칸이 반드시 안전하고 어느 칸이 지뢰인지 확정되는 구간이 생깁니다.", "오늘의 도전은 논리만으로 풀리는 판입니다. 막혔을 때는 50대50이라고 단정하기 전에 아직 열지 않은 경계 전체에서 더 많은 제약을 주는 숫자를 찾아보세요."],
      en: ["Read overlapping number regions together instead of treating one clue in isolation. Subtract confirmed flags to find cells that must be safe or must contain mines.", "The daily board is verified solvable by logic. Before calling a position fifty-fifty, scan the full frontier for another number that adds a missing constraint."],
    },
  },
  "light-up": {
    title: { ko: "사각지대 없이 밝히기", en: "Lighting without blind spots" },
    paragraphs: {
      ko: ["전구 하나는 벽을 만날 때까지 네 방향을 밝히지만 다른 전구를 직접 비추면 안 됩니다. 많이 놓는 것보다 적은 전구로 넓은 통로를 밝히는 자리를 먼저 찾으세요.", "숫자 벽 주변의 전구 수가 채워지면 남은 인접 칸에는 전구를 둘 수 없습니다. 반대로 남은 빈칸 수와 필요한 전구 수가 같다면 그 칸들은 모두 확정입니다."],
      en: ["A bulb lights four directions until a wall, but it cannot see another bulb. Look first for positions that illuminate long corridors rather than simply placing more bulbs.", "Once a numbered wall has its required bulbs, its other adjacent cells are forbidden. If its remaining cells equal the number of bulbs still needed, every one of those cells is forced."],
    },
  },
  janggi: {
    title: { ko: "교환과 길을 함께 계산하기", en: "Calculate exchanges and routes" },
    paragraphs: {
      ko: ["차는 직선 돌파, 포는 다른 기물을 넘는 도약, 상과 마는 꺾인 경로를 맡습니다. 잡을 수 있는 말만 보지 말고 다음 수에 열리거나 막히는 길과 궁의 안전을 함께 계산하세요.", "기물을 내주는 교환은 단순한 손해가 아닐 수 있습니다. 상대의 강한 말을 원하는 자리로 끌어내거나 차와 포의 공격선을 여는지까지 봐야 교환의 실제 가치가 드러납니다."],
      en: ["The chariot breaks through straight lines, the cannon jumps screens, and elephant and horse take bent routes. Look beyond the available capture to the lanes opened or closed next turn and the safety of each general.", "Giving up a piece is not automatically a loss. An exchange may lure a strong defender away or open an attacking line for a chariot or cannon; that future position determines its real value."],
    },
  },
};
