import {build} from 'esbuild';
await build({entryPoints:['src/lib/games/echo-shift-client.ts'],bundle:true,format:'esm',minify:true,outfile:'public/prototypes/echo-shift-client.js'});
