export default {
 testDir: '.',
 testMatch: ['browser.spec.mjs'],
 timeout: 30000,
 expect: {timeout: 8000},
 retries: 1,
 use: {
  baseURL: 'http://127.0.0.1:4173',
  browserName: 'chromium',
  headless: true,
  acceptDownloads: true
 },
 webServer: {
  command: 'python3 -m http.server 4173 --directory ..',
  url: 'http://127.0.0.1:4173',
  reuseExistingServer: false,
  timeout: 15000
 },
 reporter: 'list'
};
