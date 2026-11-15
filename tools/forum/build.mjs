import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
await build({entryPoints:[fileURLToPath(new URL('./client.js',import.meta.url))],bundle:true,format:'esm',target:['es2022'],minify:true,outfile:fileURLToPath(new URL('../../community/members/app.js',import.meta.url)),legalComments:'eof'});
