import {describe,it,expect} from 'vitest';
import {advanceFoldworld as act,createFoldworld} from './foldworld-delivery';
describe('foldworld delivery',()=>{
 it('cannot cross an unfolded sheet or walk through the divider',()=>{let s=createFoldworld();expect(act(s,'cross')).toBe(s);s=act(act(s,'right'),'right');expect(act(s,'right')).toBe(s);});
 it('rejects folding across onto a blocked tile',()=>{let s=act(act(createFoldworld(),'right'),'right');s=act(s,'fold');expect(act(s,'cross')).toBe(s);});
 it('delivers every parcel with one fold',()=>{for(let level=0;level<3;level++){let s=createFoldworld(level);for(let y=3;y>level;y--)s=act(s,'up');s=act(s,'right');expect(s.carrying).toBe(true);s=act(s,'fold');s=act(s,'cross');s=act(s,'right');expect(s.phase).toBe('delivered');expect(s.folds).toBe(1);expect(act(s,'fold')).toBe(s);}});
 it('does not count a wall bump as a move',()=>{const s=createFoldworld();expect(act(s,'down')).toBe(s);expect(createFoldworld(NaN)).toEqual(createFoldworld(0));});
});
