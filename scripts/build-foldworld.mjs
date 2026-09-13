import {build} from 'esbuild';
await build({entryPoints:['src/lib/games/foldworld-delivery.ts'],bundle:true,format:'esm',outfile:'public/prototypes/foldworld-delivery-engine.js'});
