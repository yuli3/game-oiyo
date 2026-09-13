import {build} from 'esbuild';
await build({entryPoints:['src/lib/games/rumor-network.ts'],bundle:true,format:'esm',outfile:'public/prototypes/rumor-network-engine.js'});
