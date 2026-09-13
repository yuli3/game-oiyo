import {describe,it,expect} from 'vitest';
import {readCampaign,saveCampaign,type CampaignStore} from './prototype-campaign';
describe('isolated prototype campaign records',()=>{
 it('keeps only the best score per mission and isolates games',()=>{const map=new Map<string,string>();const s={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);}};saveCampaign(s,'whale',0,600);saveCampaign(s,'whale',0,400);saveCampaign(s,'whale',1,300);saveCampaign(s,'disaster',0,100);expect(readCampaign(s,'whale')).toEqual({0:600,1:300});expect(readCampaign(s,'disaster')).toEqual({0:100});});
 it('rejects corrupted values and unsafe mission keys',()=>{const s={getItem:()=>'{"0":null,"1":500,"2":-2,"3":900}',setItem:()=>{}};expect(readCampaign(s,'whale')).toEqual({1:500});expect(saveCampaign(s,'whale',NaN,2)).toBe(false);expect(saveCampaign(s,'whale',0,Infinity)).toBe(false);});
 it('survives denied or absent browser storage',()=>{const s:CampaignStore={getItem(){throw Error('denied');},setItem(){throw Error('quota');}};expect(readCampaign(s,'whale')).toEqual({});expect(saveCampaign(s,'whale',0,100)).toBe(false);expect(saveCampaign(undefined,'whale',0,100)).toBe(false);});
});
