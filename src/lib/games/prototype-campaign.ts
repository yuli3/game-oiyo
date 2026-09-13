export interface CampaignStore {getItem(key:string):string|null;setItem(key:string,value:string):void;}
export type CampaignScores = Partial<Record<0|1|2,number>>;
const key=(game:string)=>`oiyo:campaign:${game}:v1`;
export function readCampaign(storage:CampaignStore|undefined,game:string):CampaignScores {
 try{const data:unknown=JSON.parse(storage?.getItem(key(game))??'null');if(!data||typeof data!=='object'||Array.isArray(data))return {};const out:CampaignScores={};for(const id of [0,1,2] as const){const n=(data as Record<string,unknown>)[id];if(typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=10000)out[id]=n;}return out;}catch{return {};}
}
export function saveCampaign(storage:CampaignStore|undefined,game:string,mission:number,score:number):boolean {
 if(!storage||![0,1,2].includes(mission)||!Number.isInteger(score)||score<0||score>10000)return false;
 try{const scores=readCampaign(storage,game),id=mission as 0|1|2;scores[id]=Math.max(scores[id]??0,score);storage.setItem(key(game),JSON.stringify(scores));return true;}catch{return false;}
}
