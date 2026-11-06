import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root="games/grok-20261106";
const manifest=JSON.parse(readFileSync(`public/${root}/manifest.json`,'utf8'));
function walk(p){return readdirSync(p,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(p+'/'+x.name):x.name.endsWith('.html')?[p+'/'+x.name]:[])}
const found=new Set();
for(const file of walk('dist')){
 const html=readFileSync(file,'utf8');
 for(const asset of manifest.assets)if(html.includes(asset.path))found.add(asset.id);
}
for(const asset of manifest.assets){
 assert.equal(createHash('sha256').update(readFileSync('public'+asset.path)).digest('hex'),asset.sha256);
 assert(found.has(asset.id),`No generated HTML references ${asset.id}`);
}
console.log(`PASS: ${found.size} referenced assets and output hashes`);
