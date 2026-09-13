import {readFile,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
await build({entryPoints:['src/lib/games/whale-city.ts'],bundle:true,format:'esm',outfile:'public/prototypes/whale-city-engine.js'});
await build({entryPoints:['src/lib/games/whale-city-scene.ts'],bundle:true,format:'esm',minify:true,outfile:'public/prototypes/whale-city-scene.js'});

// Normalize whitespace in bundled GLSL source without changing shader tokens.
const output='public/prototypes/whale-city-scene.js';
await writeFile(output,(await readFile(output,'utf8')).replace(/[ \t]+$/gm,'').replace(/^ +(?=\t)/gm,''));
