import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './test/ui',
  timeout: 20000,
  use: {
    baseURL: 'http://127.0.0.1:1421',
    viewport: { width: 1160, height: 820 },
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1421 --mode test --force',
    url: 'http://127.0.0.1:1421',
    reuseExistingServer: false,
  },
})
