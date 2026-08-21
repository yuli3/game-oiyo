import { describe,expect,it } from 'vitest';
import { createHitori,explainHitoriHint,hintHitori,hitoriSolution,parseHitori,serializeHitori,toggleHitori,undoHitori } from './hitori';

describe('hitori engine',()=>{
  it('creates deterministic rotated puzzles',()=>{expect(createHitori(0).values).toEqual(createHitori(4).values);expect(createHitori(1).values).not.toEqual(createHitori(0).values);});
  it('reaches the canonical solution',()=>{let s=createHitori(0);hitoriSolution(0).flat().forEach((dark,i)=>{if(dark)s=toggleHitori(s,i);});expect(s.won).toBe(true);});
  it('undoes and gives a non-mutating explanatory hint',()=>{let s=toggleHitori(createHitori(2),0);s=undoHitori(s);expect(s.moves).toBe(0);const before=structuredClone(s.dark),hint=explainHitoriHint(s),next=hintHitori(s);expect(hint.reason).toBe('duplicate');expect(next.hints).toBe(1);expect(next.dark).toEqual(before);expect(next.moves).toBe(0);});
  it('restores a validated replay',()=>{const s=toggleHitori(createHitori(3),7);expect(parseHitori(serializeHitori(s))).toEqual(s);expect(parseHitori('{"v":9}')).toBeNull();});
});
