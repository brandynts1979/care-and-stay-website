export default {
 testDir: '.', testMatch: ['dd-expired-privacy.spec.mjs'], timeout: 20000, expect:{timeout:8000},
 use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium',headless:true},
 webServer:{command:'python3 -m http.server 4173 --bind 127.0.0.1 --directory ../../dd-caregiver-dev',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:15000},
 reporter:'list'
};