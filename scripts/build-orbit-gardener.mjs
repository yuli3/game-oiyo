import {build} from 'esbuild';
await build({entryPoints:['src/lib/games/orbit-gardener.ts'],bundle:true,format:'esm',outfile:'public/prototypes/orbit-gardener-engine.js'});
