import {build} from 'esbuild';
await build({entryPoints:['src/lib/games/prototype-campaign.ts'],bundle:true,format:'esm',outfile:'public/prototypes/prototype-campaign.js'});
