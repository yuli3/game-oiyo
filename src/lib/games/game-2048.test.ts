import{describe,expect,it}from"vitest";import{canMove2048,createGame2048,moveGame2048,restoreGame2048,undoGame2048,type Game2048State}from"./game-2048";const state=(board:(number|null)[]):Game2048State=>({board,score:0,status:"playing",rng:1,moves:0,lastGain:0,history:[]});
describe("2048 engine",()=>{
  it("creates deterministic two-tile openings",()=>{expect(createGame2048(42)).toEqual(createGame2048(42));expect(createGame2048(42).board.filter(Boolean)).toHaveLength(2)});
  it("merges each tile once and scores",()=>{const s=state([2,2,2,2,...Array(12).fill(null)]);const n=moveGame2048(s,"left");expect(n.board.slice(0,2)).toEqual([4,4]);expect(n.score).toBe(8);expect(s.score).toBe(0)});
  it("rejects no-op moves without spawning",()=>{const s=state([2,4,null,null,...Array(12).fill(null)]);expect(moveGame2048(s,"left")).toBe(s)});
  it("detects dead boards and validates restore",()=>{const dead=Array.from({length:16},(_,i)=>i%2===Math.floor(i/4)%2?2:4);expect(canMove2048(dead)).toBe(false);expect(restoreGame2048(dead,0)).toBeNull();expect(restoreGame2048([2,4,...Array(14).fill(null)],0)).not.toBeNull()});
  it("supports all directions",()=>{const board=[2,null,null,null,2,null,null,null,...Array(8).fill(null)];expect(moveGame2048(state(board),"up").board[0]).toBe(4);expect(moveGame2048(state(board),"down").board[12]).toBe(4)});
  it("records move history and allows clean 1-step undo",()=>{
    const initial = createGame2048(123);
    const moved = moveGame2048(initial, "down");
    expect(moved.moves).toBe(1);
    expect(moved.history?.length).toBe(1);
    const undone = undoGame2048(moved);
    expect(undone.board).toEqual(initial.board);
    expect(undone.score).toBe(initial.score);
    expect(undone.moves).toBe(0);
    expect(undone.history?.length).toBe(0);
    // Undo on empty history is no-op
    expect(undoGame2048(undone)).toBe(undone);
  });
});
