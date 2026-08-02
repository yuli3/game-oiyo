import {describe,expect,it} from 'vitest';
import {createLightUp,hintLightUp,parseLightUp,serializeLightUp,toggleLightUp,undoLightUp} from './light-up';
describe('light up engine',()=>{
 it('rejects walls and accepts legal moves',()=>{const s=createLightUp();expect(toggleLightUp(s,8)).toBe(s);expect(toggleLightUp(s,3).moves).toBe(1);});
 it('solves via deterministic hints',()=>{let s=createLightUp();for(let i=0;i<8;i++)s=hintLightUp(s);expect(s.won).toBe(true);});
 it('undoes and restores replay',()=>{const s=toggleLightUp(createLightUp(2),3);expect(undoLightUp(s).moves).toBe(0);expect(parseLightUp(serializeLightUp(s))).toEqual(s);});
 it('rejects invalid saves',()=>expect(parseLightUp('nope')).toBeNull());
});
