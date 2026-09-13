export const FOLDWORLD_RULESET='foldworld-v1';
export type FoldPoint=Readonly<{x:number;y:number}>;
export type FoldState=Readonly<{player:FoldPoint;parcel:FoldPoint;target:FoldPoint;carrying:boolean;folded:boolean;folds:number;moves:number;phase:'playing'|'delivered';level:number}>;
export type FoldAction='up'|'down'|'left'|'right'|'fold'|'cross';
export const foldWall=(p:FoldPoint)=>!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.x>5||p.y<0||p.y>3||p.x===3;
export function createFoldworld(level=0):FoldState{level=Number.isFinite(level)?Math.abs(Math.trunc(level))%3:0;return {player:{x:0,y:3},parcel:{x:1,y:level},target:{x:5,y:level},carrying:false,folded:false,folds:0,moves:0,phase:'playing',level};}
export function advanceFoldworld(s:FoldState,action:FoldAction):FoldState{
 if(s.phase!=='playing')return s;
 if(action==='fold')return {...s,folded:!s.folded,folds:s.folds+1};
 let p=s.player;
 if(action==='cross'){if(!s.folded)return s;p={x:5-p.x,y:p.y};}
 else{const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[action];if(!d)return s;p={x:p.x+d[0]!,y:p.y+d[1]!};}
 if(foldWall(p))return s;
 const carrying=s.carrying||(p.x===s.parcel.x&&p.y===s.parcel.y);
 return {...s,player:p,carrying,moves:s.moves+1,phase:carrying&&p.x===s.target.x&&p.y===s.target.y?'delivered':'playing'};
}
