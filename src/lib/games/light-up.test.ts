import {describe,expect,it} from 'vitest';
import {createLightUp,explainLightUpHint,hintLightUp,parseLightUp,serializeLightUp,toggleLightUp,undoLightUp} from './light-up';
describe('light up engine',()=>{
 it('rejects walls and accepts legal moves',()=>{const s=createLightUp();expect(toggleLightUp(s,8)).toBe(s);expect(toggleLightUp(s,3).moves).toBe(1);});
 it('gives a non-mutating explanatory hint',()=>{const s=createLightUp(),before=structuredClone(s.bulbs),hint=explainLightUpHint(s),next=hintLightUp(s);expect(hint.reason).toBe('clue');expect(next.hints).toBe(1);expect(next.moves).toBe(0);expect(next.bulbs).toEqual(before);});
 it('undoes and restores replay',()=>{const s=toggleLightUp(createLightUp(2),3);expect(undoLightUp(s).moves).toBe(0);expect(parseLightUp(serializeLightUp(s))).toEqual(s);});
 it('rejects invalid saves',()=>expect(parseLightUp('nope')).toBeNull());
});
