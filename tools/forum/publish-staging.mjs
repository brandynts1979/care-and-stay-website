import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),out=join(root,'forum-dist');
await mkdir(out,{recursive:true});
for(const folder of ['community','stay-culture-journal'])await cp(join(root,folder),join(out,folder),{recursive:true});
for(const file of ['styles.css'])await cp(join(root,file),join(out,file));
await cp(join(root,'community/index.html'),join(out,'index.html'));
async function mark(dir){for(const f of await readdir(dir,{withFileTypes:true})){const p=join(dir,f.name);if(f.isDirectory())await mark(p);else if(f.name.endsWith('.html')){let s=await readFile(p,'utf8');s=s.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>').replace('<body>','<body><div class="announcement">Community staging · Testing only · Use fictional information</div>');s=s.replaceAll('href="/client-portal/"','href="https://mycareandstay.com/client-portal/"').replaceAll('href="/stay-culture-snapshot/"','href="https://mycareandstay.com/stay-culture-snapshot/"');await writeFile(p,s);}}}
await mark(out);
const configPath=join(out,'community/members/config.json');
const config=JSON.parse(await readFile(configPath,'utf8'));
config.enabled=true; // Staging sign-in only; database discussion gate remains authoritative.
await writeFile(configPath,JSON.stringify(config,null,2)+'\n');
await writeFile(join(out,'robots.txt'),'User-agent: *\nDisallow: /\n');
console.log('Prepared community-only staging assets in forum-dist; staging sign-in enabled; discussion access remains controlled by the database.');
