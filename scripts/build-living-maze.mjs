import {build} from 'esbuild';
await build({entryPoints:['src/lib/games/living-maze.ts'],bundle:true,format:'esm',outfile:'public/prototypes/living-maze-engine.js'});
