type Point = { x: number; y: number };

export function movePuzzleTile(board: number[], tileIdx: number, size: number) {
    const empty = board.indexOf(0);
    const [tileRow, tileColumn] = [Math.floor(tileIdx / size), tileIdx % size];
    const [emptyRow, emptyColumn] = [Math.floor(empty / size), empty % size];
    if (Math.abs(tileRow - emptyRow) + Math.abs(tileColumn - emptyColumn) !== 1) {
        return { board, moved: false, solved: false };
    }

    const next = [...board];
    next[empty] = next[tileIdx];
    next[tileIdx] = 0;
    return {
        board: next,
        moved: true,
        solved: next.every((value, index) => value === (index + 1) % next.length),
    };
}

export function moveSnake(snake: Point[], direction: Point, food: Point, gridSize: number) {
    const head = snake[0];
    const newHead = { x: head.x + direction.x, y: head.y + direction.y };
    const collided = newHead.x < 0
        || newHead.x >= gridSize
        || newHead.y < 0
        || newHead.y >= gridSize
        || snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y);
    if (collided) return { snake, outcome: 'collision' as const };

    const next = [newHead, ...snake];
    if (newHead.x === food.x && newHead.y === food.y) {
        return { snake: next, outcome: 'ate' as const };
    }
    next.pop();
    return { snake: next, outcome: 'moved' as const };
}

export function resolveWhack<T extends 'mole' | 'bomb'>(
    cells: Array<T | null>,
    index: number,
    score: number,
) {
    const target = cells[index];
    if (!target) return { cells, score, hit: false };

    const next = [...cells];
    next[index] = null;
    return {
        cells: next,
        score: target === 'mole' ? score + 1 : Math.max(0, score - 2),
        hit: true,
    };
}
