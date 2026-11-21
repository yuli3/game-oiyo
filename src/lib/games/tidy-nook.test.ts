import { describe, expect, it } from "vitest";
import { ROOM_COUNT, buildRoom, createBoard, isSolved, normalise, pickUp, placeNear, rotate, rotatePiece, roomStars, sameShape, shapeKey, type Board } from "./tidy-nook";

function solve(index: number): Board {
  const room = buildRoom(index);
  let board = createBoard(room);
  for (const p of room.pieces) {
    const target = normalise(room.solution[p.id]);
    let turns = 0;
    while (shapeKey(board.rotation[p.id]) !== shapeKey(target) && turns < 4) {
      board = rotatePiece(board, p.id);
      turns += 1;
    }
    const [ax, ay] = target[0];
    const minX = Math.min(...room.solution[p.id].map((c) => c[0]));
    const minY = Math.min(...room.solution[p.id].map((c) => c[1]));
    board = placeNear(board, p.id, ax + minX, ay + minY);
  }
  return board;
}

describe("tidy nook rooms", () => {
  it("has 20 rooms that grow", () => {
    expect(ROOM_COUNT).toBe(20);
    const first = buildRoom(0);
    const last = buildRoom(ROOM_COUNT - 1);
    expect(last.w * last.h).toBeGreaterThan(first.w * first.h);
    expect(last.pieces.length).toBeGreaterThan(first.pieces.length);
    expect(buildRoom(7)).toEqual(buildRoom(7));
  });

  it("every room's pieces exactly cover its free cells", () => {
    for (let i = 0; i < ROOM_COUNT; i++) {
      const room = buildRoom(i);
      const cells = new Set<string>();
      for (const [x, y] of room.blocked) cells.add(`b${x},${y}`);
      let total = room.blocked.length;
      for (const p of room.pieces) {
        expect(p.cells.length).toBeGreaterThanOrEqual(1);
        expect(p.cells.length).toBeLessThanOrEqual(4);
        expect(sameShape(p.cells, room.solution[p.id]), `room ${i} piece ${p.id}`).toBe(true);
        for (const [x, y] of room.solution[p.id]) {
          expect(cells.has(`${x},${y}`)).toBe(false);
          cells.add(`${x},${y}`);
        }
        total += p.cells.length;
      }
      expect(total).toBe(room.w * room.h);
    }
  });

  it("every room can be solved by placing pieces one by one", () => {
    for (let i = 0; i < ROOM_COUNT; i++) {
      const board = solve(i);
      expect(isSolved(board), `room ${i + 1}`).toBe(true);
      expect(roomStars(board)).toBe(3);
    }
  });
});

describe("tidy nook moves", () => {
  it("rotates, refuses overlaps and lets you pick a piece back up", () => {
    const room = buildRoom(4);
    let board = createBoard(room);
    const p = room.pieces[0];
    expect(rotate(rotate(rotate(rotate(p.cells))))).toEqual(normalise(p.cells));
    board = placeNear(board, p.id, 0, 0);
    const placedAt = board.placed[p.id];
    if (placedAt) {
      const other = room.pieces[1];
      const [x, y] = placedAt[0];
      const again = placeNear(board, other.id, x, y);
      expect(again.placed[other.id]?.some(([cx, cy]) => placedAt.some(([px, py]) => px === cx && py === cy)) ?? false).toBe(false);
      const up = pickUp(board, x, y);
      expect(up.id).toBe(p.id);
      expect(up.board.placed[p.id]).toBeUndefined();
    }
    expect(isSolved(board)).toBe(false);
  });
});
