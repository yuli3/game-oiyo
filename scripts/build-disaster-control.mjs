import {build} from 'esbuild';
await build({entryPoints:['src/lib/games/disaster-control.ts'],bundle:true,format:'esm',outfile:'public/prototypes/disaster-control-engine.js'});
