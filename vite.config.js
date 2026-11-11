import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 개발 중에는 /api 를 온라인 서버(npm run server)로 넘긴다.
  server: { proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } } },
})
