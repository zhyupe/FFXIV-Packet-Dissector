import { defineConfig } from 'vite'
export default defineConfig(({mode}) => ({
  cacheDir: mode === 'test' ? 'node_modules/.vite-test' : 'node_modules/.vite',
  clearScreen: false,
  server: { host: '127.0.0.1', port: 1420, strictPort: true },
  build: { target: 'es2022' },
}))
