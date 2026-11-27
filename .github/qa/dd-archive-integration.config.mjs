import {resolve} from 'node:path';
export default {
 testDir:'.',testMatch:['dd-archive-integration.spec.mjs'],timeout:30000,expect:{timeout:8000},workers:2,
 use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium',headless:true,acceptDownloads:true},
 webServer:{command:'python3 -m http.server 4173 --bind 127.0.0.1 --directory '+resolve(process.cwd()),url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:15000},
 reporter:'list'
};