import {describe,it,expect} from 'vitest';
import {advanceLivingMaze as act,createLivingMaze,mazeTile, type MazeState} from './living-maze';
function walkY(s:MazeState,y:number){while(s.player.y!==y)s=act(s,s.player.y>y?'up':'down');return s;}
describe('living maze negotiations',()=>{
 it('allows every personality layout to escape through both negotiated doors',()=>{for(let seed=0;seed<6;seed++){let s=createLivingMaze(seed);for(let i=0;i<2;i++){const g=s.gates[i]!;s=walkY(s,g.y);s=act(s,'observe');expect(s.gates[i]!.known).toBe(true);if(g.need==='light')s=act(s,'offer');else s=act(act(s,'wait'),'wait');expect(s.gates[i]!.open).toBe(true);s=act(act(s,'right'),'right');}s=walkY(s,1);expect(s.phase).toBe('escaped');expect(s.light).toBe(2);expect(act(s,'call')).toBe(s);}});
 it('reveals a need without consuming time or light',()=>{let s=walkY(createLivingMaze(),3);const next=act(s,'observe');expect(next.turns).toBe(s.turns);expect(next.light).toBe(s.light);expect(next.gates[0]!.known).toBe(true);});
 it('blocks walls and closed gates without spending a turn',()=>{const s=createLivingMaze();expect(act(s,'right').player).toEqual(s.player);expect(act(s,'right').turns).toBe(0);expect(mazeTile(s,NaN,1)).toBe('wall');});
 it('requires consecutive quiet and resets patience after moving',()=>{let s=walkY(createLivingMaze(1),1);s=act(s,'wait');s=act(s,'down');s=act(s,'up');s=act(s,'wait');expect(s.gates[0]!.open).toBe(false);s=act(s,'wait');expect(s.gates[0]!.open).toBe(true);});
 it('rejects the wrong offering and cannot spend negative light',()=>{let s=walkY(createLivingMaze(1),1);s=act(act(s,'offer'),'offer');expect(s.light).toBe(0);expect(s.stress).toBe(4);expect(s.gates[0]!.open).toBe(false);expect(act(s,'offer').turns).toBe(s.turns);});
 it('noise recloses doors but never traps the player inside one',()=>{let s=walkY(createLivingMaze(),3);s=act(s,'offer');s=act(s,'right');s=act(s,'call');expect(s.gates[0]!.open).toBe(true);s=act(s,'right');s=act(s,'call');expect(s.gates[0]!.open).toBe(false);expect(s.phase).toBe('overwhelmed');expect(act(s,'wait')).toBe(s);});
 it('expires at the turn limit and normalizes invalid seeds',()=>{let s=createLivingMaze();for(let i=0;i<40;i++)s=act(s,'wait');expect(s.phase).toBe('expired');expect(createLivingMaze(Infinity)).toEqual(createLivingMaze());});
});
